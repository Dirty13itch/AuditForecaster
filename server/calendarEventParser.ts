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
}

/**
 * Inspection type keywords and their variations
 */
const INSPECTION_TYPE_PATTERNS = [
  { type: 'Full Test', patterns: ['test', 'test - spec', 'full test'], confidence: 100 },
  { type: 'SV2', patterns: ['sv2', 's.v.2', 's v 2'], confidence: 100 },
  { type: 'Pre-Drywall', patterns: ['pre-drywall', 'predrywall', 'pre drywall'], confidence: 90 },
  { type: 'Final', patterns: ['final', 'final inspection'], confidence: 95 },
  { type: 'Rough', patterns: ['rough', 'rough-in'], confidence: 90 },
];

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
  const result: ParsedEvent = {
    builderId: null,
    builderName: null,
    inspectionType: null,
    confidence: 0,
    rawTitle: title,
    parsedBuilderAbbreviation: null,
    parsedInspectionKeyword: null,
  };

  // Clean and normalize title
  const normalizedTitle = title.trim().toLowerCase();
  
  if (!normalizedTitle) {
    return result;
  }

  // Step 1: Extract builder abbreviation (first token before space or dash)
  const firstTokenMatch = normalizedTitle.match(/^([a-z0-9./]+)/i);
  if (!firstTokenMatch) {
    serverLogger.debug('[Parser] No builder abbreviation found in title:', title);
    return result;
  }

  const potentialAbbreviation = firstTokenMatch[1];
  result.parsedBuilderAbbreviation = potentialAbbreviation;

  // Step 2: Look up builder from abbreviations table
  const abbreviations = await storage.getBuilderAbbreviations();
  let builderMatch = abbreviations.find(
    (abbr) => abbr.abbreviation.toLowerCase() === potentialAbbreviation
  );

  // Try fuzzy matching if exact match fails
  if (!builderMatch) {
    builderMatch = abbreviations.find((abbr) => {
      const abbrLower = abbr.abbreviation.toLowerCase();
      return (
        abbrLower.includes(potentialAbbreviation) ||
        potentialAbbreviation.includes(abbrLower) ||
        levenshteinDistance(abbrLower, potentialAbbreviation) <= 2
      );
    });
  }

  if (builderMatch) {
    result.builderId = builderMatch.builderId;
    
    // Get builder details
    const builder = await storage.getBuilderById(builderMatch.builderId);
    if (builder) {
      result.builderName = builder.companyName;
    }

    // Confidence boost for builder match
    const isExactMatch = builderMatch.abbreviation.toLowerCase() === potentialAbbreviation;
    result.confidence += isExactMatch ? 50 : 30;
  } else {
    serverLogger.debug('[Parser] No builder found for abbreviation:', potentialAbbreviation);
  }

  // Step 3: Extract inspection type from remaining title
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

  // Step 4: Adjust confidence based on overall match quality
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

  serverLogger.debug('[Parser] Parsed event:', {
    title,
    builder: result.builderName,
    inspectionType: result.inspectionType,
    confidence: result.confidence,
  });

  return result;
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
  const results: ParsedEvent[] = [];
  
  for (const title of titles) {
    const parsed = await parseCalendarEvent(storage, title);
    results.push(parsed);
  }
  
  return results;
}
