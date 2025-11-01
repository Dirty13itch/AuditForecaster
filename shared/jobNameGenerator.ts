import { format } from "date-fns";

/**
 * Job type abbreviations for auto-generated job names
 * Supports fuzzy matching to handle variations in calendar event titles
 */
const JOB_TYPE_ABBREVIATIONS: Record<string, string> = {
  // Pre-Drywall Inspection
  "pre-drywall inspection": "PreDry",
  "pre drywall": "PreDry",
  "predrywall": "PreDry",
  "pdw": "PreDry",
  "sv2": "PreDry", // Smart detection pattern for M/I Homes

  // Final Testing
  "final testing": "Final",
  "final test": "Final",
  "final": "Final",
  "test": "Final", // Smart detection pattern

  // Blower Door Only
  "blower door only": "Bdoor",
  "blower door": "Bdoor",
  "bdoor": "Bdoor",
  "bd": "Bdoor",

  // Duct Blaster Only
  "duct blaster only": "Duct",
  "duct blaster": "Duct",
  "duct": "Duct",
  "db": "Duct",

  // Blower Door Retest
  "blower door retest": "Retest",
  "retest": "Retest",
  "re-test": "Retest",

  // Infrared Imaging
  "infrared imaging": "IR",
  "infrared": "IR",
  "thermal": "IR",
  "ir": "IR",

  // Multifamily Project
  "multifamily project": "Multifamily",
  "multifamily": "Multifamily",
  "multi-family": "Multifamily",
  "multi family": "Multifamily",

  // Other
  "other": "Other",
};

/**
 * Extract job type abbreviation from inspection type using fuzzy matching
 * @param inspectionType - The inspection type enum value (e.g., "full_test") or label
 * @returns Abbreviated job type (e.g., "Final", "PreDry", "Bdoor")
 */
export function getJobTypeAbbreviation(inspectionType: string): string {
  if (!inspectionType) {
    return "Job";
  }

  // Import getInspectionTypeLabel to convert enum values to labels
  // If it's an enum value, convert to label first for abbreviation lookup
  let labelToUse = inspectionType;
  
  // Check if this looks like an enum value (contains underscore, all lowercase)
  if (inspectionType.includes('_') || /^[a-z0-9_]+$/.test(inspectionType)) {
    // Try to import and use getInspectionTypeLabel
    // For now, map common enum values to labels
    const enumToLabel: Record<string, string> = {
      'rough_duct': 'Pre-Drywall Inspection',
      'full_test': 'Final Testing',
      'code_bdoor': 'Blower Door Only',
      'sv2': 'Duct Blaster Only',
      'bdoor_retest': 'Blower Door Retest',
      'rehab': 'Infrared Imaging',
      'multifamily': 'Multifamily Project',
      'energy_star': 'Energy Star',
      'other': 'Other',
    };
    labelToUse = enumToLabel[inspectionType] || inspectionType;
  }

  const normalized = labelToUse.toLowerCase().trim();

  // Direct match
  if (JOB_TYPE_ABBREVIATIONS[normalized]) {
    return JOB_TYPE_ABBREVIATIONS[normalized];
  }

  // Fuzzy matching - check if any key is contained in the inspection type
  for (const [key, abbrev] of Object.entries(JOB_TYPE_ABBREVIATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return abbrev;
    }
  }

  // Fallback to original inspection type (truncated if too long)
  return labelToUse.length > 12
    ? labelToUse.substring(0, 12)
    : labelToUse;
}

/**
 * Generate auto-formatted job name
 * Format: MM-DD-YY_Type Address, City ST
 * @param date - Date to use for the job (scheduled date or today)
 * @param inspectionType - Type of inspection
 * @param address - Full address string
 * @returns Formatted job name (e.g., "01-23-25_Final 123 Main St, Dayton MN")
 */
export function generateJobName(
  date: Date | null | undefined,
  inspectionType: string,
  address: string
): string {
  // Use provided date or fallback to today
  const jobDate = date || new Date();

  // Format date as MM-DD-YY
  const dateStr = format(jobDate, "MM-dd-yy");

  // Get abbreviated job type
  const typeAbbrev = getJobTypeAbbreviation(inspectionType);

  // Clean up address - ensure it's not too long
  const cleanAddress = address.trim();

  // Combine: MM-DD-YY_Type Address
  return `${dateStr}_${typeAbbrev} ${cleanAddress}`;
}

/**
 * Detect inspection type from calendar event title using smart patterns
 * @param title - Calendar event title
 * @returns Detected inspection type enum value (e.g., "full_test") or empty string
 */
export function detectInspectionTypeFromTitle(title: string): string {
  if (!title) {
    return "";
  }

  const normalized = title.toLowerCase().trim();

  // Pattern matching for M/I Homes calendar events
  // Returns enum values to match database schema
  if (normalized.includes("sv2")) {
    return "rough_duct"; // Pre-Drywall Inspection
  }

  if (normalized.includes("test") && !normalized.includes("retest")) {
    return "full_test"; // Final Testing
  }

  if (normalized.includes("retest") || normalized.includes("re-test")) {
    return "bdoor_retest"; // Blower Door Retest
  }

  if (normalized.includes("blower door") || normalized.includes("bdoor") || normalized.includes("bd")) {
    return "code_bdoor"; // Blower Door Only
  }

  if (normalized.includes("duct blaster") || normalized.includes("duct") || normalized.includes("db")) {
    return "sv2"; // Duct Blaster Only
  }

  if (normalized.includes("infrared") || normalized.includes("thermal") || normalized.includes("ir")) {
    return "rehab"; // Infrared Imaging
  }

  if (normalized.includes("multifamily") || normalized.includes("multi-family") || normalized.includes("multi family")) {
    return "multifamily"; // Multifamily Project
  }

  return "";
}
