/**
 * Enhanced Calendar Event Parser
 * Parses Google Calendar events from Building Knowledge calendar to extract:
 * - Job type (sv2, full_test, code_bdoor, rough_duct, rehab, bdoor_retest, multifamily, energy_star)
 * - Builder identification using smart abbreviation matching
 * - Confidence scores for all matches
 */

import type { Builder } from '@shared/schema';
import { serverLogger } from './logger';
import { KNOWN_BUILDERS, JOB_TYPE_PATTERNS, type BuilderAbbreviationConfig } from './builderAbbreviations';

export interface ParsedEventResult {
  parsedBuilderName: string | null;
  parsedBuilderId: string | null;
  parsedJobType: 'sv2' | 'full_test' | 'code_bdoor' | 'rough_duct' | 'rehab' | 'bdoor_retest' | 'multifamily' | 'energy_star' | 'other';
  confidenceScore: number; // 0-100
  matchedAbbreviation?: string;
  isNewBuilder?: boolean; // True if builder name extracted but not matched
}

/**
 * Parse a calendar event to extract builder and job type information with smart matching
 * 
 * @param eventTitle The event title from Google Calendar (e.g., "MI SV2", "MI Test - Spec")
 * @param eventDescription Optional event description
 * @param builders List of all builders from database with their abbreviations
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
    isNewBuilder: false,
  };

  if (!eventTitle) {
    serverLogger.warn('[EventParser] Empty event title provided');
    return result;
  }

  const titleLower = eventTitle.toLowerCase().trim();
  const descriptionLower = (eventDescription || '').toLowerCase().trim();

  serverLogger.debug('[EventParser] Parsing event:', { 
    title: eventTitle, 
    description: eventDescription?.substring(0, 100) 
  });

  // Parse job type from title
  const jobTypeResult = parseJobType(titleLower);
  result.parsedJobType = jobTypeResult.type;

  // Match builder using smart abbreviation matching
  const builderMatch = matchBuilderSmart(titleLower, builders);
  
  if (builderMatch) {
    result.parsedBuilderName = builderMatch.builderName;
    result.parsedBuilderId = builderMatch.builderId;
    result.confidenceScore = calculateOverallConfidence(builderMatch.confidence, jobTypeResult.confidence);
    result.matchedAbbreviation = builderMatch.matchedAbbreviation;

    serverLogger.info('[EventParser] Successfully matched builder:', {
      title: eventTitle,
      matchedBuilder: builderMatch.builderName,
      abbreviation: builderMatch.matchedAbbreviation,
      jobType: result.parsedJobType,
      builderConfidence: builderMatch.confidence,
      jobTypeConfidence: jobTypeResult.confidence,
      overallConfidence: result.confidenceScore,
    });
  } else {
    // Try to extract a builder name even without a database match
    const extractedName = extractBuilderNameFromTitle(eventTitle);
    if (extractedName) {
      result.parsedBuilderName = extractedName;
      result.isNewBuilder = true;
      result.confidenceScore = Math.min(30, jobTypeResult.confidence); // Low confidence for unknown builders
      
      serverLogger.warn('[EventParser] No builder match found - extracted name:', {
        title: eventTitle,
        extractedName,
        jobType: result.parsedJobType,
        confidence: result.confidenceScore,
      });
    }
  }

  return result;
}

/**
 * Parse job type from event title using all 8 supported types
 */
function parseJobType(
  titleLower: string
): { type: ParsedEventResult['parsedJobType']; confidence: number } {
  for (const jobPattern of JOB_TYPE_PATTERNS) {
    for (const pattern of jobPattern.patterns) {
      // Check for whole word match or contained match
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i');
      if (wordBoundaryRegex.test(titleLower) || titleLower.includes(pattern)) {
        return {
          type: jobPattern.type,
          confidence: jobPattern.confidence,
        };
      }
    }
  }

  return { type: 'other', confidence: 0 };
}

/**
 * Smart builder matching using both database builders and known builder abbreviations
 * - First tries to match against database builders with their abbreviations
 * - Then tries to match against the known builder configuration
 * - Returns best match with highest confidence
 */
function matchBuilderSmart(
  titleLower: string,
  builders: Builder[]
): { builderName: string; builderId: string; confidence: number; matchedAbbreviation: string } | null {
  let bestMatch: { builderName: string; builderId: string; confidence: number; matchedAbbreviation: string } | null = null;

  // First pass: Match against database builders with their abbreviations
  for (const builder of builders) {
    if (!builder.abbreviations || builder.abbreviations.length === 0) {
      continue;
    }

    for (const abbr of builder.abbreviations) {
      const abbrLower = abbr.toLowerCase().trim();
      if (!abbrLower) continue;

      const matchConfidence = calculateAbbreviationMatch(titleLower, abbrLower);
      
      if (matchConfidence > 0 && (!bestMatch || matchConfidence > bestMatch.confidence)) {
        bestMatch = {
          builderName: builder.companyName || builder.name,
          builderId: builder.id,
          confidence: matchConfidence,
          matchedAbbreviation: abbr,
        };
      }
    }
  }

  // Second pass: Match against known builders configuration (for builders not yet in database)
  for (const knownBuilder of KNOWN_BUILDERS) {
    // Skip if we already have a high-confidence database match
    if (bestMatch && bestMatch.confidence >= 95) {
      break;
    }

    // Check abbreviations
    for (const abbr of knownBuilder.abbreviations) {
      const abbrLower = abbr.toLowerCase().trim();
      const matchConfidence = calculateAbbreviationMatch(titleLower, abbrLower);
      
      if (matchConfidence > 0 && (!bestMatch || matchConfidence > bestMatch.confidence)) {
        // Find or create this builder in database
        const dbBuilder = findBuilderByName(builders, knownBuilder.builderName);
        
        if (dbBuilder) {
          bestMatch = {
            builderName: dbBuilder.companyName || dbBuilder.name,
            builderId: dbBuilder.id,
            confidence: matchConfidence,
            matchedAbbreviation: abbr,
          };
        } else {
          // Builder exists in known list but not in database - flag as new
          bestMatch = {
            builderName: knownBuilder.builderName,
            builderId: '', // Empty ID indicates new builder
            confidence: Math.min(matchConfidence, 80), // Cap confidence for non-DB builders
            matchedAbbreviation: abbr,
          };
        }
      }
    }

    // Check aliases
    if (knownBuilder.aliases) {
      for (const alias of knownBuilder.aliases) {
        const aliasLower = alias.toLowerCase().trim();
        const matchConfidence = calculateAbbreviationMatch(titleLower, aliasLower);
        
        if (matchConfidence > 0 && (!bestMatch || matchConfidence > bestMatch.confidence)) {
          const dbBuilder = findBuilderByName(builders, knownBuilder.builderName);
          
          if (dbBuilder) {
            bestMatch = {
              builderName: dbBuilder.companyName || dbBuilder.name,
              builderId: dbBuilder.id,
              confidence: Math.min(matchConfidence, 85), // Slightly lower confidence for alias matches
              matchedAbbreviation: alias,
            };
          }
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate match confidence for an abbreviation
 * Returns 0-100 score based on match quality
 */
function calculateAbbreviationMatch(titleLower: string, abbrLower: string): number {
  // Exact whole word match - highest confidence
  const exactPattern = new RegExp(`\\b${escapeRegex(abbrLower)}\\b`, 'i');
  if (exactPattern.test(titleLower)) {
    return 95;
  }

  // Match at start of title - very high confidence
  if (titleLower.startsWith(abbrLower + ' ') || titleLower.startsWith(abbrLower + '-')) {
    return 90;
  }

  // Contains abbreviation with word-like boundaries - high confidence
  if (titleLower.includes(' ' + abbrLower + ' ') || 
      titleLower.includes('-' + abbrLower + ' ') ||
      titleLower.includes(' ' + abbrLower + '-')) {
    return 85;
  }

  // Simple contains - medium confidence
  if (titleLower.includes(abbrLower)) {
    return 70;
  }

  // Fuzzy match for similar strings (e.g., "MI" in "MIght" - avoid this)
  // Return 0 for no match
  return 0;
}

/**
 * Find builder in database by name (exact or fuzzy match)
 */
function findBuilderByName(builders: Builder[], targetName: string): Builder | null {
  const targetLower = targetName.toLowerCase().trim();
  
  // First try exact match on companyName
  for (const builder of builders) {
    if (builder.companyName?.toLowerCase().trim() === targetLower) {
      return builder;
    }
  }

  // Then try exact match on name
  for (const builder of builders) {
    if (builder.name?.toLowerCase().trim() === targetLower) {
      return builder;
    }
  }

  // Finally try contains match
  for (const builder of builders) {
    const companyLower = (builder.companyName || '').toLowerCase().trim();
    const nameLower = (builder.name || '').toLowerCase().trim();
    
    if (companyLower.includes(targetLower) || targetLower.includes(companyLower)) {
      return builder;
    }
    if (nameLower.includes(targetLower) || targetLower.includes(nameLower)) {
      return builder;
    }
  }

  return null;
}

/**
 * Calculate overall confidence score combining builder match and job type match
 */
function calculateOverallConfidence(builderConfidence: number, jobTypeConfidence: number): number {
  // Weighted average: builder is more important (70%) than job type (30%)
  const weighted = (builderConfidence * 0.7) + (jobTypeConfidence * 0.3);
  return Math.round(weighted);
}

/**
 * Extract builder name from title when no match is found
 * Usually the first part before " -" or first word(s)
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
 * Get display name for a job type
 */
export function getJobTypeDisplayName(jobType: ParsedEventResult['parsedJobType']): string {
  const displayNames: Record<ParsedEventResult['parsedJobType'], string> = {
    sv2: 'SV2 (Pre-Drywall)',
    full_test: 'Full Test',
    code_bdoor: 'Code Blower Door',
    rough_duct: 'Rough Duct',
    rehab: 'Rehab',
    bdoor_retest: 'Blower Door Retest',
    multifamily: 'Multi-Family',
    energy_star: 'Energy Star',
    other: 'Other',
  };
  
  return displayNames[jobType] || 'Unknown';
}

/**
 * Test the event parser with sample data
 * Useful for debugging and validation
 */
export function testEventParser(builders: Builder[]) {
  const testCases = [
    { title: 'MI SV2', expectedType: 'sv2', expectedBuilder: 'M/I Homes' },
    { title: 'MI Test', expectedType: 'full_test', expectedBuilder: 'M/I Homes' },
    { title: 'MI Test - Spec', expectedType: 'full_test', expectedBuilder: 'M/I Homes' },
    { title: 'M/I Homes SV2', expectedType: 'sv2', expectedBuilder: 'M/I Homes' },
    { title: 'PRG Full Test', expectedType: 'full_test', expectedBuilder: 'PRG' },
    { title: 'Heath Code BDoor', expectedType: 'code_bdoor', expectedBuilder: 'Heath Allen' },
    { title: 'Unknown Builder Test', expectedType: 'full_test', expectedBuilder: null },
    { title: 'MI Bloor Retest', expectedType: 'bdoor_retest', expectedBuilder: 'M/I Homes' },
    { title: 'Prairie Rehab Project', expectedType: 'rehab', expectedBuilder: 'Prairie Homes' },
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
