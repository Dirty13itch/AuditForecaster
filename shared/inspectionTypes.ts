/**
 * Inspection Type Mapping
 * 
 * Maps database enum values to human-readable labels for display in the UI.
 * The enum values match the schema definition in shared/schema.ts.
 * 
 * Database enum values: ["sv2", "full_test", "code_bdoor", "rough_duct", "rehab", "bdoor_retest", "multifamily", "energy_star", "other"]
 */

export const INSPECTION_TYPE_OPTIONS = [
  { value: 'rough_duct', label: 'Pre-Drywall Inspection' },
  { value: 'full_test', label: 'Final Testing' },
  { value: 'code_bdoor', label: 'Blower Door Only' },
  { value: 'sv2', label: 'Duct Blaster Only' },
  { value: 'bdoor_retest', label: 'Blower Door Retest' },
  { value: 'rehab', label: 'Infrared Imaging' },
  { value: 'multifamily', label: 'Multifamily Project' },
  { value: 'energy_star', label: 'Energy Star' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Legacy Inspection Type Mapping
 * 
 * Comprehensive mapping of ALL legacy inspection type variants to current enum values.
 * Handles short codes, full labels, snake_case, and various historical naming conventions.
 * All keys are lowercase for case-insensitive matching.
 * 
 * Current enum values: ["sv2", "full_test", "code_bdoor", "rough_duct", "rehab", "bdoor_retest", "multifamily", "energy_star", "other"]
 */
const LEGACY_INSPECTION_TYPE_MAP: Record<string, string> = {
  // === Short codes (legacy) ===
  'final': 'full_test',
  'rough': 'rough_duct',
  'duct_test': 'sv2',
  'final_special': 'full_test',
  
  // === Full labels (all lowercase variations) ===
  'final testing': 'full_test',
  'pre-drywall': 'rough_duct',
  'pre drywall': 'rough_duct',
  'pre-drywall inspection': 'rough_duct',
  'pre drywall inspection': 'rough_duct',
  'blower door only': 'code_bdoor',
  'code blower door': 'code_bdoor',
  'duct blaster only': 'sv2',
  'duct blaster': 'sv2',
  'duct testing': 'sv2',
  'blower door retest': 'bdoor_retest',
  'infrared imaging': 'rehab',
  'multifamily project': 'multifamily',
  'energy star': 'energy_star',
  
  // === Snake_case variations ===
  'pre_drywall': 'rough_duct',
  'blower_door_only': 'code_bdoor',
  'code_blower_door': 'code_bdoor',
  'duct_blaster_only': 'sv2',
  'duct_blaster': 'sv2',
  'duct_testing': 'sv2',
  'blower_door_retest': 'bdoor_retest',
  'infrared_imaging': 'rehab',
  'multifamily_project': 'multifamily',
  
  // === Current enum values (identity mapping) ===
  'sv2': 'sv2',
  'full_test': 'full_test',
  'code_bdoor': 'code_bdoor',
  'rough_duct': 'rough_duct',
  'bdoor_retest': 'bdoor_retest',
  'rehab': 'rehab',
  'multifamily': 'multifamily',
  'energy_star': 'energy_star',
  'other': 'other',
};

/**
 * Normalize inspection type value from legacy to current enum
 * 
 * Converts legacy inspection type labels to current enum values for backward compatibility.
 * If the value is already a current enum value, it returns it unchanged.
 * If no mapping exists, returns the original value.
 * 
 * @param value - Legacy or current inspection type value
 * @returns Normalized current enum value
 */
export function normalizeInspectionType(value: string): string {
  const normalized = LEGACY_INSPECTION_TYPE_MAP[value.toLowerCase()];
  return normalized || value;
}

/**
 * Get human-readable label from enum value
 * 
 * Automatically normalizes legacy values before looking up the label.
 */
export function getInspectionTypeLabel(value: string): string {
  const normalizedValue = normalizeInspectionType(value);
  const option = INSPECTION_TYPE_OPTIONS.find(opt => opt.value === normalizedValue);
  return option?.label || value;
}

/**
 * Get enum value from human-readable label
 */
export function getInspectionTypeValue(label: string): string {
  const option = INSPECTION_TYPE_OPTIONS.find(opt => opt.label === label);
  return option?.value || label;
}

/**
 * Get default pricing for an inspection type (by enum value)
 */
export function getDefaultPricing(inspectionTypeValue: string): number | undefined {
  const pricingMap: Record<string, number> = {
    'rough_duct': 100,
    'full_test': 350,
    'code_bdoor': 200,
    'sv2': 200,
    'bdoor_retest': 200,
  };
  return pricingMap[inspectionTypeValue];
}
