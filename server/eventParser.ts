/**
 * Calendar Event Parser
 * Parses Google Calendar events from Building Knowledge calendar to extract:
 * - Job type (pre_drywall, final, final_special, etc.)
 * - Builder identification and matching
 * - Confidence scores for matches
 */

import type { Builder } from '@shared/schema';
import { serverLogger } from './logger';

export interface ParsedEventResult {
  parsedBuilderName: string | null;
  parsedBuilderId: string | null;
  parsedJobType: 'pre_drywall' | 'final' | 'final_special' | 'multifamily' | 'other';
  confidenceScore: number; // 0-100
}

/**
 * Parse a calendar event to extract builder and job type information
 * @param eventTitle The event title from Google Calendar (e.g., "MI SV2", "MI Test - Spec")
 * @param eventDescription Optional event description
 * @param builders List of all builders with their abbreviations
 * @returns Parsed event information with confidence score
 */
export function parseCalendarEvent(
  eventTitle: string,
  eventDescription: string | null | undefined,
  builders: Builder[]
): ParsedEventResult {
  const result: ParsedEventResult = {
    parsedBuilderName: null,
    parsedBuilderId: null,
    parsedJobType: 'other',
    confidenceScore: 0,
  };

  if (!eventTitle) {
    serverLogger.warn('[EventParser] Empty event title provided');
    return result;
  }

  const titleLower = eventTitle.toLowerCase().trim();
  const descriptionLower = (eventDescription || '').toLowerCase().trim();
  const combinedText = `${titleLower} ${descriptionLower}`;

  serverLogger.debug('[EventParser] Parsing event:', { 
    title: eventTitle, 
    description: eventDescription?.substring(0, 100) 
  });

  // Parse job type from title
  result.parsedJobType = parseJobType(titleLower);

  // Match builder using abbreviations
  const builderMatch = matchBuilder(titleLower, builders);
  
  if (builderMatch) {
    result.parsedBuilderName = builderMatch.builderName;
    result.parsedBuilderId = builderMatch.builderId;
    result.confidenceScore = builderMatch.confidence;

    serverLogger.info('[EventParser] Successfully matched builder:', {
      title: eventTitle,
      matchedBuilder: builderMatch.builderName,
      jobType: result.parsedJobType,
      confidence: builderMatch.confidence,
    });
  } else {
    // Try to extract a builder name even without a match
    result.parsedBuilderName = extractBuilderNameFromTitle(eventTitle);
    
    serverLogger.warn('[EventParser] No builder match found:', {
      title: eventTitle,
      extractedName: result.parsedBuilderName,
    });
  }

  return result;
}

/**
 * Parse job type from event title
 * Priority order:
 * 1. "SV2" → pre_drywall
 * 2. "Test - Spec" or "Test-Spec" → final_special
 * 3. "Test" → final
 * 4. "Multifamily" or "MF" → multifamily
 * 5. Otherwise → other
 */
function parseJobType(
  titleLower: string
): 'pre_drywall' | 'final' | 'final_special' | 'multifamily' | 'other' {
  // Check for SV2 (pre-drywall)
  if (titleLower.includes('sv2') || titleLower.includes('sv 2')) {
    return 'pre_drywall';
  }

  // Check for Test - Spec (final special)
  if (
    titleLower.includes('test - spec') ||
    titleLower.includes('test-spec') ||
    titleLower.includes('test spec')
  ) {
    return 'final_special';
  }

  // Check for Test (final)
  if (titleLower.includes('test')) {
    return 'final';
  }

  // Check for multifamily
  if (
    titleLower.includes('multifamily') ||
    titleLower.includes('multi-family') ||
    titleLower.includes('multi family') ||
    /\bmf\b/.test(titleLower) // Word boundary to avoid matching "mfg"
  ) {
    return 'multifamily';
  }

  return 'other';
}

/**
 * Match builder against abbreviations
 * Returns the best match with confidence score
 */
function matchBuilder(
  titleLower: string,
  builders: Builder[]
): { builderName: string; builderId: string; confidence: number } | null {
  let bestMatch: { builderName: string; builderId: string; confidence: number } | null = null;

  for (const builder of builders) {
    if (!builder.abbreviations || builder.abbreviations.length === 0) {
      continue;
    }

    for (const abbr of builder.abbreviations) {
      const abbrLower = abbr.toLowerCase().trim();
      if (!abbrLower) continue;

      // Check for exact match (as a word or standalone)
      // Use word boundaries to match "MI" but not "MIght"
      const exactPattern = new RegExp(`\\b${escapeRegex(abbrLower)}\\b`, 'i');
      if (exactPattern.test(titleLower)) {
        const confidence = 95;
        
        // Keep the best match (highest confidence)
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            builderName: builder.companyName || builder.name,
            builderId: builder.id,
            confidence,
          };
        }
      }
      // Check for partial match (abbreviation is contained in title)
      else if (titleLower.includes(abbrLower)) {
        const confidence = 70;
        
        // Only update if this is better than current match
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            builderName: builder.companyName || builder.name,
            builderId: builder.id,
            confidence,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Extract builder name from title when no match is found
 * Usually the first part before " -" or first word
 */
function extractBuilderNameFromTitle(title: string): string | null {
  const trimmed = title.trim();
  
  // Try to get text before " -"
  const dashSplit = trimmed.split(' -');
  if (dashSplit.length > 1 && dashSplit[0].trim().length > 0) {
    return dashSplit[0].trim();
  }

  // Try to get first word or first two words
  const words = trimmed.split(/\s+/);
  if (words.length === 0) return null;
  
  // Return first word if it's at least 2 characters
  if (words[0].length >= 2) {
    // If there's a second word and first word is short (like "M/I"), combine them
    if (words.length > 1 && words[0].length <= 4) {
      return `${words[0]} ${words[1]}`;
    }
    return words[0];
  }

  return null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Test the event parser with sample data
 * Useful for debugging and validation
 */
export function testEventParser(builders: Builder[]) {
  const testCases = [
    { title: 'MI SV2', expectedType: 'pre_drywall', expectedBuilder: 'M/I Homes' },
    { title: 'MI Test', expectedType: 'final', expectedBuilder: 'M/I Homes' },
    { title: 'MI Test - Spec', expectedType: 'final_special', expectedBuilder: 'M/I Homes' },
    { title: 'M/I Homes SV2', expectedType: 'pre_drywall', expectedBuilder: 'M/I Homes' },
    { title: 'Unknown Builder Test', expectedType: 'final', expectedBuilder: null },
  ];

  serverLogger.info('[EventParser] Running test cases...');

  for (const testCase of testCases) {
    const result = parseCalendarEvent(testCase.title, null, builders);
    serverLogger.info('[EventParser] Test case:', {
      title: testCase.title,
      expectedType: testCase.expectedType,
      actualType: result.parsedJobType,
      expectedBuilder: testCase.expectedBuilder,
      actualBuilder: result.parsedBuilderName,
      confidence: result.confidenceScore,
      passed: 
        result.parsedJobType === testCase.expectedType &&
        (!testCase.expectedBuilder || result.parsedBuilderName?.includes(testCase.expectedBuilder.split(' ')[0])),
    });
  }
}
