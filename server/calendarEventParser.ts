import { serverLogger } from "./logger";
import type { IStorage } from "./storage";

/**
 * Parsed calendar event result with confidence scoring
 */
export interface ParsedEvent {
  builderId: string | null;
  builderName: string | null;
  inspectionType: string | null;
  confidence: number; // 0-100
  rawTitle: string;
  parsedBuilderAbbreviation: string | null;
  parsedInspectionKeyword: string | null;
  parsedAddress: string | null;
  urgencyLevel: "low" | "medium" | "high" | "urgent";
  suggestedInspectorId?: string | null;
  estimatedDuration?: number; // in minutes
}

/**
 * Inspection type keywords and their variations
 */
const INSPECTION_TYPE_PATTERNS = [
  { type: 'Full Test', patterns: ['test', 'test - spec', 'full test', 'blower door'], confidence: 100, duration: 120 },
  { type: 'SV2', patterns: ['sv2', 's.v.2', 's v 2', 'stage 2'], confidence: 100, duration: 90 },
  { type: 'Pre-Drywall', patterns: ['pre-drywall', 'predrywall', 'pre drywall', 'insulation'], confidence: 90, duration: 60 },
  { type: 'Final', patterns: ['final', 'final inspection', 'walk-through'], confidence: 95, duration: 90 },
  { type: 'Rough', patterns: ['rough', 'rough-in', 'rough inspection'], confidence: 90, duration: 60 },
  { type: 'Frame', patterns: ['frame', 'framing', 'structural'], confidence: 85, duration: 60 },
  { type: 'Foundation', patterns: ['foundation', 'footer', 'footing'], confidence: 85, duration: 45 },
];

// Urgency keywords
const URGENCY_KEYWORDS = {
  urgent: ['urgent', 'asap', 'rush', 'emergency', 'critical', 'immediate'],
  high: ['priority', 'important', 'expedite', 'fast track'],
  medium: ['soon', 'next week', 'scheduled'],
  low: ['when available', 'flexible', 'anytime']
};

/**
 * Maximum title length for logging (to prevent log bloat)
 */
const MAX_TITLE_LOG_LENGTH = 100;

/**
 * Maximum title length considered valid (very long titles are suspicious)
 */
const MAX_TITLE_LENGTH = 1000;

/**
 * Helper function to create an empty result with confidence=0
 */
function createEmptyResult(title: string): ParsedEvent {
  return {
    builderId: null,
    builderName: null,
    inspectionType: null,
    confidence: 0,
    rawTitle: title,
    parsedBuilderAbbreviation: null,
    parsedInspectionKeyword: null,
  };
}

/**
 * Helper function to truncate title for logging
 */
function truncateTitle(title: string): string {
  if (typeof title !== 'string') {
    return String(title).substring(0, MAX_TITLE_LOG_LENGTH);
  }
  return title.length > MAX_TITLE_LOG_LENGTH 
    ? title.substring(0, MAX_TITLE_LOG_LENGTH) + '...' 
    : title;
}

/**
 * Parses a calendar event title to extract builder and inspection type
 * 
 * Expected format: [Builder Abbreviation] [Job Type] - [Details]
 * Examples:
 *   "MI Test - Spec" → M/I Homes, Full Test
 *   "MI SV2" → M/I Homes, SV2
 *   "M/I Full Test - 123 Main St" → M/I Homes, Full Test
 * 
 * Confidence Scoring:
 *   100: Exact match on builder abbreviation + inspection type
 *   80-99: Fuzzy match on builder + exact inspection type
 *   60-79: Exact builder + fuzzy inspection OR fuzzy both
 *   < 60: No clear match - requires manual review
 */
export async function parseCalendarEvent(
  storage: IStorage,
  title: string
): Promise<ParsedEvent> {
  // Input validation - storage parameter
  if (!storage) {
    serverLogger.error('[Parser] Storage instance not provided');
    return createEmptyResult('');
  }

  // Input validation - title parameter
  if (title === null || title === undefined) {
    serverLogger.error('[Parser] Title is null or undefined');
    return createEmptyResult('');
  }

  // Handle non-string titles
  if (typeof title !== 'string') {
    serverLogger.error('[Parser] Title is not a string:', {
      type: typeof title,
      value: truncateTitle(String(title)),
    });
    return createEmptyResult(String(title));
  }

  // Check for empty or whitespace-only strings
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    serverLogger.error('[Parser] Title is empty or whitespace-only');
    return createEmptyResult(title);
  }

  // Handle very long titles (potential data corruption or attack)
  if (title.length > MAX_TITLE_LENGTH) {
    serverLogger.error('[Parser] Title exceeds maximum length:', {
      length: title.length,
      maxLength: MAX_TITLE_LENGTH,
      title: truncateTitle(title),
    });
    return createEmptyResult(title);
  }

  const result: ParsedEvent = createEmptyResult(title);

  try {
    // Clean and normalize title - handle special characters gracefully
    let normalizedTitle: string;
    try {
      normalizedTitle = trimmedTitle.toLowerCase();
    } catch (error: any) {
      serverLogger.error('[Parser] Failed to normalize title:', {
        error: error.message,
        title: truncateTitle(title),
      });
      return result;
    }

    // Check if title has any alphanumeric characters
    const hasAlphaNumeric = /[a-z0-9]/i.test(normalizedTitle);
    if (!hasAlphaNumeric) {
      serverLogger.error('[Parser] Title contains no alphanumeric characters:', {
        title: truncateTitle(title),
      });
      return result;
    }

    // Step 1: Extract builder abbreviation (first token before space or dash)
    const firstTokenMatch = normalizedTitle.match(/^([a-z0-9./]+)/i);
    if (!firstTokenMatch) {
      serverLogger.debug('[Parser] No builder abbreviation found in title:', truncateTitle(title));
      return result;
    }

    const potentialAbbreviation = firstTokenMatch[1];
    result.parsedBuilderAbbreviation = potentialAbbreviation;

    // Step 2: Look up builder from abbreviations table
    let abbreviations: any[];
    try {
      abbreviations = await storage.getBuilderAbbreviations();

      // Validate abbreviations data
      if (!Array.isArray(abbreviations)) {
        serverLogger.error('[Parser] Invalid abbreviations data returned from storage:', {
          type: typeof abbreviations,
          title: truncateTitle(title),
        });
        return result;
      }

      // Handle null/undefined abbreviations
      if (abbreviations === null || abbreviations === undefined) {
        serverLogger.error('[Parser] Abbreviations data is null or undefined:', {
          title: truncateTitle(title),
        });
        return result;
      }
    } catch (dbError: any) {
      serverLogger.error('[Parser] Database lookup failed for builder abbreviations:', {
        error: dbError.message,
        stack: dbError.stack,
        title: truncateTitle(title),
      });
      return result; // Return confidence=0
    }

    let builderMatch = abbreviations.find(
      (abbr) => {
        // Validate abbreviation object structure
        if (!abbr || typeof abbr.abbreviation !== 'string' || !abbr.builderId) {
          serverLogger.error('[Parser] Malformed abbreviation data:', {
            abbreviation: abbr,
            title: truncateTitle(title),
          });
          return false;
        }
        return abbr.abbreviation.toLowerCase() === potentialAbbreviation;
      }
    );

    // Try fuzzy matching if exact match fails
    if (!builderMatch) {
      builderMatch = abbreviations.find((abbr) => {
        // Validate abbreviation object structure
        if (!abbr || typeof abbr.abbreviation !== 'string' || !abbr.builderId) {
          return false;
        }

        try {
          const abbrLower = abbr.abbreviation.toLowerCase();
          return (
            abbrLower.includes(potentialAbbreviation) ||
            potentialAbbreviation.includes(abbrLower) ||
            levenshteinDistance(abbrLower, potentialAbbreviation) <= 2
          );
        } catch (error: any) {
          serverLogger.error('[Parser] Error during fuzzy matching:', {
            error: error.message,
            abbreviation: abbr.abbreviation,
            title: truncateTitle(title),
          });
          return false;
        }
      });
    }

    if (builderMatch) {
      result.builderId = builderMatch.builderId;
      
      // Get builder details
      try {
        const builder = await storage.getBuilder(builderMatch.builderId);
        
        // Handle null builder lookup
        if (builder === null || builder === undefined) {
          serverLogger.error('[Parser] Builder lookup returned null:', {
            builderId: builderMatch.builderId,
            title: truncateTitle(title),
          });
        } else {
          // Validate builder object has required fields
          if (!builder.companyName) {
            serverLogger.error('[Parser] Builder object missing companyName field:', {
              builderId: builderMatch.builderId,
              builder: builder,
              title: truncateTitle(title),
            });
          } else {
            result.builderName = builder.companyName;
          }
        }
      } catch (dbError: any) {
        serverLogger.error('[Parser] Database lookup failed for builder details:', {
          error: dbError.message,
          stack: dbError.stack,
          builderId: builderMatch.builderId,
          title: truncateTitle(title),
        });
        // Continue processing even if builder details lookup fails
      }

      // Confidence boost for builder match
      try {
        const isExactMatch = builderMatch.abbreviation.toLowerCase() === potentialAbbreviation;
        result.confidence += isExactMatch ? 50 : 30;
      } catch (error: any) {
        serverLogger.error('[Parser] Error calculating builder match confidence:', {
          error: error.message,
          title: truncateTitle(title),
        });
      }
    } else {
      serverLogger.debug('[Parser] No builder found for abbreviation:', potentialAbbreviation);
    }

    // Step 3: Extract inspection type from remaining title
    try {
      const remainingTitle = normalizedTitle.substring(potentialAbbreviation.length).trim();
      
      for (const inspectionType of INSPECTION_TYPE_PATTERNS) {
        for (const pattern of inspectionType.patterns) {
          if (remainingTitle.includes(pattern)) {
            result.inspectionType = inspectionType.type;
            result.parsedInspectionKeyword = pattern;
            result.confidence += Math.min(inspectionType.confidence / 2, 50); // Max 50 points for inspection type
            break;
          }
        }
        if (result.inspectionType) break;
      }
    } catch (error: any) {
      serverLogger.error('[Parser] Error extracting inspection type:', {
        error: error.message,
        title: truncateTitle(title),
      });
    }

    // Step 4: Adjust confidence based on overall match quality
    try {
      if (result.builderId && result.inspectionType) {
        // Both found - good parse
        result.confidence = Math.min(result.confidence, 100);
      } else if (result.builderId || result.inspectionType) {
        // Only one found - partial match
        result.confidence = Math.min(result.confidence, 70);
      } else {
        // Nothing found - very low confidence
        result.confidence = Math.min(result.confidence, 30);
      }
    } catch (error: any) {
      serverLogger.error('[Parser] Error adjusting confidence score:', {
        error: error.message,
        title: truncateTitle(title),
      });
    }

    serverLogger.debug('[Parser] Parsed event:', {
      title: truncateTitle(title),
      builder: result.builderName,
      inspectionType: result.inspectionType,
      confidence: result.confidence,
    });

    return result;

  } catch (error: any) {
    serverLogger.error('[Parser] Unexpected error during parsing:', {
      error: error.message,
      stack: error.stack,
      title: truncateTitle(title),
    });
    return result; // Return confidence=0
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of builder abbreviations
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Batch parse multiple calendar events
 */
export async function parseCalendarEvents(
  storage: IStorage,
  titles: string[]
): Promise<ParsedEvent[]> {
  // Input validation - storage parameter
  if (!storage) {
    serverLogger.error('[Parser] Storage instance not provided to batch parse');
    return [];
  }

  // Input validation - titles parameter
  if (!Array.isArray(titles)) {
    serverLogger.error('[Parser] Invalid titles array provided to batch parse:', {
      type: typeof titles,
      value: titles,
    });
    return [];
  }

  if (titles === null || titles === undefined) {
    serverLogger.error('[Parser] Titles array is null or undefined');
    return [];
  }

  const results: ParsedEvent[] = [];
  
  for (let i = 0; i < titles.length; i++) {
    try {
      const parsed = await parseCalendarEvent(storage, titles[i]);
      results.push(parsed);
    } catch (error: any) {
      serverLogger.error('[Parser] Batch parse error at index', i, ':', {
        error: error.message,
        stack: error.stack,
        title: titles[i] ? truncateTitle(titles[i]) : 'undefined',
      });
      // Push empty result for failed parse to maintain index consistency
      results.push(createEmptyResult(titles[i] || ''));
    }
  }
  
  return results;
}
