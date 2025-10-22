/**
 * Predefined tag taxonomy for energy audit field inspections
 */

// Tag Categories
export const TAG_CATEGORIES = {
  INSPECTION: 'inspection',
  STATUS: 'status',
  PRIORITY: 'priority',
  LOCATION: 'location',
} as const;

// Tag Definitions
export const INSPECTION_TAGS = [
  'thermal-bypass',
  'insulation',
  'duct-leakage',
  'air-sealing',
  'ventilation',
  'moisture',
] as const;

export const STATUS_TAGS = [
  'passed',
  'failed',
  'needs-review',
  'fixed',
] as const;

export const PRIORITY_TAGS = [
  'critical',
  'major',
  'minor',
] as const;

export const LOCATION_TAGS = [
  'attic',
  'basement',
  'crawlspace',
  'exterior',
  'mechanical-room',
] as const;

// All valid tags combined
export const ALL_TAGS = [
  ...INSPECTION_TAGS,
  ...STATUS_TAGS,
  ...PRIORITY_TAGS,
  ...LOCATION_TAGS,
] as const;

// Types
export type InspectionTag = typeof INSPECTION_TAGS[number];
export type StatusTag = typeof STATUS_TAGS[number];
export type PriorityTag = typeof PRIORITY_TAGS[number];
export type LocationTag = typeof LOCATION_TAGS[number];
export type PhotoTag = typeof ALL_TAGS[number];
export type TagCategory = typeof TAG_CATEGORIES[keyof typeof TAG_CATEGORIES];

// Tag Display Configuration
export interface TagConfig {
  label: string;
  color: string;
  category: TagCategory;
}

export const TAG_CONFIGS: Record<PhotoTag, TagConfig> = {
  // Inspection Types - Blue
  'thermal-bypass': {
    label: 'Thermal Bypass',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  'insulation': {
    label: 'Insulation',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  'duct-leakage': {
    label: 'Duct Leakage',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  'air-sealing': {
    label: 'Air Sealing',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  'ventilation': {
    label: 'Ventilation',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  'moisture': {
    label: 'Moisture',
    color: 'bg-blue-500 text-white',
    category: TAG_CATEGORIES.INSPECTION,
  },
  
  // Status Tags - Green/Red/Yellow
  'passed': {
    label: 'Passed',
    color: 'bg-green-600 text-white',
    category: TAG_CATEGORIES.STATUS,
  },
  'failed': {
    label: 'Failed',
    color: 'bg-red-600 text-white',
    category: TAG_CATEGORIES.STATUS,
  },
  'needs-review': {
    label: 'Needs Review',
    color: 'bg-yellow-500 text-white',
    category: TAG_CATEGORIES.STATUS,
  },
  'fixed': {
    label: 'Fixed',
    color: 'bg-green-600 text-white',
    category: TAG_CATEGORIES.STATUS,
  },
  
  // Priority Tags - Red/Orange/Gray
  'critical': {
    label: 'Critical',
    color: 'bg-red-600 text-white',
    category: TAG_CATEGORIES.PRIORITY,
  },
  'major': {
    label: 'Major',
    color: 'bg-orange-500 text-white',
    category: TAG_CATEGORIES.PRIORITY,
  },
  'minor': {
    label: 'Minor',
    color: 'bg-gray-500 text-white',
    category: TAG_CATEGORIES.PRIORITY,
  },
  
  // Location Tags - Purple
  'attic': {
    label: 'Attic',
    color: 'bg-purple-600 text-white',
    category: TAG_CATEGORIES.LOCATION,
  },
  'basement': {
    label: 'Basement',
    color: 'bg-purple-600 text-white',
    category: TAG_CATEGORIES.LOCATION,
  },
  'crawlspace': {
    label: 'Crawlspace',
    color: 'bg-purple-600 text-white',
    category: TAG_CATEGORIES.LOCATION,
  },
  'exterior': {
    label: 'Exterior',
    color: 'bg-purple-600 text-white',
    category: TAG_CATEGORIES.LOCATION,
  },
  'mechanical-room': {
    label: 'Mechanical Room',
    color: 'bg-purple-600 text-white',
    category: TAG_CATEGORIES.LOCATION,
  },
};

// Helper Functions
export function getTagConfig(tag: string): TagConfig | undefined {
  return TAG_CONFIGS[tag as PhotoTag];
}

export function getTagsByCategory(category: TagCategory): readonly PhotoTag[] {
  switch (category) {
    case TAG_CATEGORIES.INSPECTION:
      return INSPECTION_TAGS;
    case TAG_CATEGORIES.STATUS:
      return STATUS_TAGS;
    case TAG_CATEGORIES.PRIORITY:
      return PRIORITY_TAGS;
    case TAG_CATEGORIES.LOCATION:
      return LOCATION_TAGS;
    default:
      return [];
  }
}

export function getCategoryLabel(category: TagCategory): string {
  switch (category) {
    case TAG_CATEGORIES.INSPECTION:
      return 'Inspection Types';
    case TAG_CATEGORIES.STATUS:
      return 'Status';
    case TAG_CATEGORIES.PRIORITY:
      return 'Priority';
    case TAG_CATEGORIES.LOCATION:
      return 'Location';
    default:
      return '';
  }
}
