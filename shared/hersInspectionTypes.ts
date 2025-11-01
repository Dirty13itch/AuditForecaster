/**
 * HERS Inspection Type Mapping
 * 
 * Production-ready mappings for all 9 requested job types.
 * Maps database enum values to human-readable labels for display in the UI.
 */

import type { HERSJobType } from './hersWorkflowTemplates';

// Complete list of all job types (HERS + Legacy)
export type AllJobTypes = HERSJobType | "sv2" | "full_test" | "code_bdoor" | "rough_duct" | "rehab" | "bdoor_retest" | "multifamily" | "energy_star";

/**
 * HERS Job Type Options - Primary set for production use
 */
export const HERS_INSPECTION_TYPE_OPTIONS = [
  { value: 'qa_rough', label: 'HERS/QA Rough Inspection' },
  { value: 'qa_final', label: 'HERS/QA Final Inspection' },
  { value: 'hers_blower_door', label: 'HERS Blower Door Test' },
  { value: 'hers_duct_leakage', label: 'HERS Duct Leakage Test' },
  { value: 'hers_ventilation', label: 'HERS Ventilation Test' },
  { value: 'mf_rough', label: 'Multifamily Rough' },
  { value: 'mf_final', label: 'Multifamily Final' },
  { value: 'compliance_review', label: 'Compliance Review' },
  { value: 'other', label: 'Other/Custom' },
] as const;

/**
 * Legacy Job Type Options - Kept for backward compatibility
 */
export const LEGACY_INSPECTION_TYPE_OPTIONS = [
  { value: 'sv2', label: 'Pre-Drywall (SV2)' },
  { value: 'full_test', label: 'Final Testing (Complete)' },
  { value: 'code_bdoor', label: 'Code + Blower Door' },
  { value: 'rough_duct', label: 'Rough Duct Inspection' },
  { value: 'rehab', label: 'Rehabilitation' },
  { value: 'bdoor_retest', label: 'Blower Door Retest' },
  { value: 'multifamily', label: 'Multifamily (Legacy)' },
  { value: 'energy_star', label: 'Energy Star' },
] as const;

/**
 * Combined inspection type options for UI dropdowns
 */
export const ALL_INSPECTION_TYPE_OPTIONS = [
  ...HERS_INSPECTION_TYPE_OPTIONS,
  { value: 'divider', label: '--- Legacy Types ---', disabled: true },
  ...LEGACY_INSPECTION_TYPE_OPTIONS,
];

/**
 * Job Type Display Names - Maps all job types to display labels
 */
export const JOB_TYPE_DISPLAY_NAMES: Record<AllJobTypes, string> = {
  // HERS Job Types
  'qa_rough': 'HERS/QA Rough Inspection',
  'qa_final': 'HERS/QA Final Inspection',
  'hers_blower_door': 'HERS Blower Door Test',
  'hers_duct_leakage': 'HERS Duct Leakage Test',
  'hers_ventilation': 'HERS Ventilation Test',
  'mf_rough': 'Multifamily Rough',
  'mf_final': 'Multifamily Final',
  'compliance_review': 'Compliance Review',
  'other': 'Other/Custom',
  
  // Legacy Job Types
  'sv2': 'Pre-Drywall (SV2)',
  'full_test': 'Final Testing (Complete)',
  'code_bdoor': 'Code + Blower Door',
  'rough_duct': 'Rough Duct Inspection',
  'rehab': 'Rehabilitation',
  'bdoor_retest': 'Blower Door Retest',
  'multifamily': 'Multifamily (Legacy)',
  'energy_star': 'Energy Star',
};

/**
 * Job Type Short Names - Abbreviated display names for mobile/compact views
 */
export const JOB_TYPE_SHORT_NAMES: Record<AllJobTypes, string> = {
  // HERS Job Types
  'qa_rough': 'QA Rough',
  'qa_final': 'QA Final',
  'hers_blower_door': 'Blower Door',
  'hers_duct_leakage': 'Duct Test',
  'hers_ventilation': 'Ventilation',
  'mf_rough': 'MF Rough',
  'mf_final': 'MF Final',
  'compliance_review': 'Compliance',
  'other': 'Other',
  
  // Legacy Job Types
  'sv2': 'SV2',
  'full_test': 'Final Test',
  'code_bdoor': 'Code BD',
  'rough_duct': 'Rough Duct',
  'rehab': 'Rehab',
  'bdoor_retest': 'BD Retest',
  'multifamily': 'Multifamily',
  'energy_star': 'E-Star',
};

/**
 * Job Type Categories - Groups job types for filtering
 */
export const JOB_TYPE_CATEGORIES = {
  'Quality Assurance': ['qa_rough', 'qa_final'],
  'Performance Testing': ['hers_blower_door', 'hers_duct_leakage', 'hers_ventilation'],
  'Multifamily': ['mf_rough', 'mf_final'],
  'Compliance': ['compliance_review'],
  'Other': ['other'],
  'Legacy': ['sv2', 'full_test', 'code_bdoor', 'rough_duct', 'rehab', 'bdoor_retest', 'multifamily', 'energy_star'],
} as const;

/**
 * Test Requirements by Job Type
 */
export const JOB_TYPE_TEST_REQUIREMENTS: Record<AllJobTypes, string[]> = {
  // HERS Job Types
  'qa_rough': [],
  'qa_final': ['blower_door', 'duct_leakage', 'ventilation'],
  'hers_blower_door': ['blower_door'],
  'hers_duct_leakage': ['duct_leakage'],
  'hers_ventilation': ['ventilation'],
  'mf_rough': [],
  'mf_final': ['blower_door', 'ventilation'],
  'compliance_review': [],
  'other': [],
  
  // Legacy Job Types
  'sv2': [],
  'full_test': ['blower_door', 'duct_leakage', 'ventilation'],
  'code_bdoor': ['blower_door'],
  'rough_duct': [],
  'rehab': ['blower_door'],
  'bdoor_retest': ['blower_door'],
  'multifamily': ['blower_door'],
  'energy_star': ['blower_door', 'duct_leakage', 'ventilation'],
};

/**
 * Get display name for a job type
 */
export function getJobTypeDisplayName(jobType: string): string {
  return JOB_TYPE_DISPLAY_NAMES[jobType as AllJobTypes] || jobType;
}

/**
 * Get short name for a job type
 */
export function getJobTypeShortName(jobType: string): string {
  return JOB_TYPE_SHORT_NAMES[jobType as AllJobTypes] || jobType;
}

/**
 * Get required tests for a job type
 */
export function getRequiredTests(jobType: string): string[] {
  return JOB_TYPE_TEST_REQUIREMENTS[jobType as AllJobTypes] || [];
}

/**
 * Check if a job type is a HERS type
 */
export function isHERSJobType(jobType: string): boolean {
  return HERS_INSPECTION_TYPE_OPTIONS.some(opt => opt.value === jobType);
}

/**
 * Check if a job type is a legacy type
 */
export function isLegacyJobType(jobType: string): boolean {
  return LEGACY_INSPECTION_TYPE_OPTIONS.some(opt => opt.value === jobType);
}

/**
 * Default pricing by job type
 */
export const JOB_TYPE_PRICING: Record<AllJobTypes, number> = {
  // HERS Job Types
  'qa_rough': 150,
  'qa_final': 400,
  'hers_blower_door': 200,
  'hers_duct_leakage': 200,
  'hers_ventilation': 150,
  'mf_rough': 125,
  'mf_final': 350,
  'compliance_review': 100,
  'other': 200,
  
  // Legacy Job Types
  'sv2': 100,
  'full_test': 350,
  'code_bdoor': 200,
  'rough_duct': 100,
  'rehab': 250,
  'bdoor_retest': 200,
  'multifamily': 300,
  'energy_star': 450,
};

/**
 * Get default pricing for a job type
 */
export function getDefaultPricing(jobType: string): number {
  return JOB_TYPE_PRICING[jobType as AllJobTypes] || 200;
}

/**
 * Migration mapping from old job types to new HERS types
 * Use this when migrating existing data
 */
export const MIGRATION_MAPPING: Record<string, HERSJobType> = {
  // Direct mappings
  'rough': 'qa_rough',
  'final': 'qa_final',
  'blower_door': 'hers_blower_door',
  'duct_leakage': 'hers_duct_leakage',
  'ventilation': 'hers_ventilation',
  
  // Legacy mappings
  'sv2': 'qa_rough',
  'full_test': 'qa_final',
  'code_bdoor': 'hers_blower_door',
  'rough_duct': 'qa_rough',
  'bdoor_retest': 'hers_blower_door',
  'multifamily': 'mf_final',
  'energy_star': 'qa_final',
  'rehab': 'other',
};

/**
 * Migrate a legacy job type to HERS type
 */
export function migrateJobType(legacyType: string): HERSJobType {
  return MIGRATION_MAPPING[legacyType] || 'other';
}