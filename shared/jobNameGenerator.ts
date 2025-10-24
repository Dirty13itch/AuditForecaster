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
 * @param inspectionType - The inspection type string
 * @returns Abbreviated job type (e.g., "Final", "PreDry", "Bdoor")
 */
export function getJobTypeAbbreviation(inspectionType: string): string {
  if (!inspectionType) {
    return "Job";
  }

  const normalized = inspectionType.toLowerCase().trim();

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
  return inspectionType.length > 12
    ? inspectionType.substring(0, 12)
    : inspectionType;
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
 * @returns Detected inspection type or empty string
 */
export function detectInspectionTypeFromTitle(title: string): string {
  if (!title) {
    return "";
  }

  const normalized = title.toLowerCase().trim();

  // Pattern matching for M/I Homes calendar events
  if (normalized.includes("sv2")) {
    return "Pre-Drywall Inspection";
  }

  if (normalized.includes("test") && !normalized.includes("retest")) {
    return "Final Testing";
  }

  if (normalized.includes("retest") || normalized.includes("re-test")) {
    return "Blower Door Retest";
  }

  if (normalized.includes("blower door") || normalized.includes("bdoor") || normalized.includes("bd")) {
    return "Blower Door Only";
  }

  if (normalized.includes("duct blaster") || normalized.includes("duct") || normalized.includes("db")) {
    return "Duct Blaster Only";
  }

  if (normalized.includes("infrared") || normalized.includes("thermal") || normalized.includes("ir")) {
    return "Infrared Imaging";
  }

  if (normalized.includes("multifamily") || normalized.includes("multi-family") || normalized.includes("multi family")) {
    return "Multifamily Project";
  }

  return "";
}
