import { PhotoTag } from './photoTags';

/**
 * Photo interface for tag analysis
 * Only includes the fields needed for tag suggestion logic
 */
export interface Photo {
  tags?: string[] | null;
}

/**
 * Mapping of inspection types to contextually relevant photo tags
 * 
 * This mapping provides intelligent tag suggestions based on the type of inspection
 * being performed, helping inspectors quickly categorize photos with the most
 * appropriate tags for their current work context.
 */
export const INSPECTION_TAG_MAPPING: Record<string, readonly PhotoTag[]> = {
  'Pre-Drywall Inspection': [
    'insulation',
    'thermal-bypass',
    'air-sealing',
    'attic',
    'minor',
  ],
  'Final Testing': [
    'passed',
    'failed',
    'needs-review',
    'ventilation',
    'minor',
  ],
  'Blower Door Only': [
    'air-sealing',
    'thermal-bypass',
    'needs-review',
    'minor',
  ],
  'Duct Blaster Only': [
    'duct-leakage',
    'mechanical-room',
    'needs-review',
    'minor',
  ],
  'Blower Door Retest': [
    'fixed',
    'air-sealing',
    'passed',
    'failed',
  ],
  'Infrared Imaging': [
    'thermal-bypass',
    'insulation',
    'moisture',
    'critical',
  ],
  'Multifamily Project': [
    'insulation',
    'air-sealing',
    'passed',
    'failed',
  ],
  'Other': [
    'minor',
    'needs-review',
  ],
} as const;

/**
 * Get suggested tags based on the inspection type
 * 
 * This function provides context-aware tag suggestions based on the type of inspection
 * being performed. It returns a predefined set of tags that are most relevant to the
 * inspection type, making it faster for inspectors to tag photos in the field.
 * 
 * @param inspectionType - The type of inspection (e.g., "Pre-Drywall Inspection", "Final Testing")
 * @param recentTags - Optional array of recently used tags for additional context (currently unused, reserved for future enhancement)
 * @returns Array of suggested PhotoTags for the inspection type
 * 
 * @example
 * ```typescript
 * const tags = getSuggestedTags("Pre-Drywall Inspection");
 * // Returns: ['insulation', 'thermal-bypass', 'air-sealing', 'attic', 'minor']
 * ```
 */
export function getSuggestedTags(
  inspectionType: string,
  recentTags?: string[]
): PhotoTag[] {
  const mapping = INSPECTION_TAG_MAPPING[inspectionType];
  
  if (mapping) {
    return [...mapping];
  }
  
  // Default to "Other" inspection type suggestions if no match found
  return [...INSPECTION_TAG_MAPPING['Other']];
}

/**
 * Analyze recent photos to find the most frequently used tags
 * 
 * This function analyzes a collection of photos to determine which tags have been
 * used most frequently. This helps surface tags that the inspector is actively
 * using in their current workflow, providing personalized suggestions.
 * 
 * @param recentPhotos - Array of photos with tags to analyze
 * @param limit - Maximum number of most-used tags to return (default: 5)
 * @returns Array of PhotoTags ordered by frequency of use (most frequent first)
 * 
 * @example
 * ```typescript
 * const photos = [
 *   { tags: ['insulation', 'attic'] },
 *   { tags: ['insulation', 'thermal-bypass'] },
 *   { tags: ['attic'] }
 * ];
 * const mostUsed = getMostUsedTags(photos, 3);
 * // Returns: ['insulation', 'attic', 'thermal-bypass'] (ordered by frequency)
 * ```
 */
export function getMostUsedTags(
  recentPhotos: Photo[],
  limit: number = 5
): PhotoTag[] {
  const tagFrequency = new Map<string, number>();
  
  // Count tag occurrences across all recent photos
  for (const photo of recentPhotos) {
    if (!photo.tags || !Array.isArray(photo.tags)) {
      continue;
    }
    
    for (const tag of photo.tags) {
      const currentCount = tagFrequency.get(tag) || 0;
      tagFrequency.set(tag, currentCount + 1);
    }
  }
  
  // Sort tags by frequency (descending) and return top N
  return Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag as PhotoTag);
}

/**
 * Combine inspection-based tag suggestions with recently used tags
 * 
 * This function implements a smart merging strategy that prioritizes recently used tags
 * while ensuring inspection-specific suggestions are also available. This provides
 * the best of both worlds: personalized suggestions based on current usage patterns
 * combined with contextually relevant tags for the inspection type.
 * 
 * Strategy:
 * 1. Recent tags appear first (inspector's current workflow)
 * 2. Inspection-suggested tags fill remaining slots
 * 3. Duplicates are removed
 * 4. Result is limited to maxTags
 * 
 * @param suggestedTags - Tags suggested based on inspection type
 * @param recentTags - Tags recently used by the inspector
 * @param maxTags - Maximum number of combined tags to return (default: 8)
 * @returns Array of PhotoTags combining both sources, prioritizing recent usage
 * 
 * @example
 * ```typescript
 * const suggested = ['insulation', 'thermal-bypass', 'air-sealing', 'attic'];
 * const recent = ['moisture', 'critical', 'insulation'];
 * const combined = combineTagSuggestions(suggested, recent, 5);
 * // Returns: ['moisture', 'critical', 'insulation', 'thermal-bypass', 'air-sealing']
 * // Note: 'moisture' and 'critical' from recent come first
 * // 'insulation' appears only once (deduplicated)
 * // Remaining slots filled from suggested tags
 * ```
 */
export function combineTagSuggestions(
  suggestedTags: PhotoTag[],
  recentTags: PhotoTag[],
  maxTags: number = 8
): PhotoTag[] {
  const combined: PhotoTag[] = [];
  const seen = new Set<PhotoTag>();
  
  // Add recent tags first (prioritize inspector's current usage pattern)
  for (const tag of recentTags) {
    if (!seen.has(tag) && combined.length < maxTags) {
      combined.push(tag);
      seen.add(tag);
    }
  }
  
  // Fill remaining slots with inspection-suggested tags
  for (const tag of suggestedTags) {
    if (!seen.has(tag) && combined.length < maxTags) {
      combined.push(tag);
      seen.add(tag);
    }
  }
  
  return combined;
}
