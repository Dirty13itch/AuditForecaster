/**
 * Builder Abbreviations Configuration
 * Maps builder names to their common abbreviations used in calendar events
 */

export interface BuilderAbbreviationConfig {
  builderName: string;
  abbreviations: string[]; // Common abbreviations, from most common to least
  aliases?: string[]; // Alternative names
}

/**
 * Comprehensive list of 55 known builders with their abbreviations
 * Ordered by frequency (most common first)
 */
export const KNOWN_BUILDERS: BuilderAbbreviationConfig[] = [
  {
    builderName: "M/I Homes",
    abbreviations: ["MI", "M/I", "MIH", "M I"],
    aliases: ["MI Homes", "M/I Home", "M&I Homes"],
  },
  {
    builderName: "PRG",
    abbreviations: ["PRG"],
    aliases: ["P.R.G."],
  },
  {
    builderName: "Heath Allen",
    abbreviations: ["Heath", "HA", "Heath Allen"],
    aliases: ["Heath Alan"],
  },
  {
    builderName: "Prairie Homes",
    abbreviations: ["Prairie", "PH", "Prairie Homes"],
    aliases: [],
  },
  {
    builderName: "David Weekley",
    abbreviations: ["DW", "Weekley", "David Weekley"],
    aliases: ["D Weekley", "D.W."],
  },
  {
    builderName: "ADOR",
    abbreviations: ["ADOR"],
    aliases: [],
  },
  {
    builderName: "Amani",
    abbreviations: ["Amani"],
    aliases: [],
  },
  {
    builderName: "Anchor",
    abbreviations: ["Anchor"],
    aliases: [],
  },
  {
    builderName: "Anderson Reda",
    abbreviations: ["Anderson", "AR", "Anderson Reda"],
    aliases: ["Anderson-Reda"],
  },
  {
    builderName: "Aspect",
    abbreviations: ["Aspect"],
    aliases: [],
  },
  {
    builderName: "Axiom",
    abbreviations: ["Axiom"],
    aliases: [],
  },
  {
    builderName: "Christian",
    abbreviations: ["Christian"],
    aliases: [],
  },
  {
    builderName: "City Homes",
    abbreviations: ["City", "CH", "City Homes"],
    aliases: [],
  },
  {
    builderName: "DesLauriers and Sons",
    abbreviations: ["DesLauriers", "DLS", "Des Lauriers"],
    aliases: ["DesLauriers & Sons", "Des Lauriers and Sons"],
  },
  {
    builderName: "Edgerton & Co.",
    abbreviations: ["Edgerton", "E&C", "Edgerton Co"],
    aliases: ["Edgerton and Co", "Edgerton and Company"],
  },
  {
    builderName: "EPS",
    abbreviations: ["EPS"],
    aliases: ["E.P.S."],
  },
  {
    builderName: "Fenstra",
    abbreviations: ["Fenstra"],
    aliases: [],
  },
  {
    builderName: "Garret",
    abbreviations: ["Garret"],
    aliases: ["Garrett"],
  },
  {
    builderName: "GMHC",
    abbreviations: ["GMHC"],
    aliases: ["G.M.H.C."],
  },
  {
    builderName: "Green Halo",
    abbreviations: ["Green Halo", "GH"],
    aliases: ["Green-Halo"],
  },
  {
    builderName: "Greg's Hardware",
    abbreviations: ["Greg's", "GH", "Gregs Hardware"],
    aliases: ["Greg Hardware", "Gregs"],
  },
  {
    builderName: "Highmark",
    abbreviations: ["Highmark", "HM"],
    aliases: [],
  },
  {
    builderName: "Jim Miles",
    abbreviations: ["Jim Miles", "JM", "Miles"],
    aliases: [],
  },
  {
    builderName: "Joe Donahue Construction",
    abbreviations: ["Joe Donahue", "JD", "Donahue"],
    aliases: ["J Donahue", "Joe D"],
  },
  {
    builderName: "JP Remodeling",
    abbreviations: ["JP", "JPR", "JP Remodeling"],
    aliases: ["J.P. Remodeling"],
  },
  {
    builderName: "KB Mechanical",
    abbreviations: ["KB", "KBM", "KB Mech"],
    aliases: ["KB Mechanical"],
  },
  {
    builderName: "Kevin Palmer",
    abbreviations: ["Kevin", "KP", "Palmer"],
    aliases: ["K Palmer"],
  },
  {
    builderName: "Kraemer",
    abbreviations: ["Kraemer"],
    aliases: ["Kramer"],
  },
  {
    builderName: "Kyle Hoef",
    abbreviations: ["Kyle", "KH", "Hoef"],
    aliases: ["Kyle H"],
  },
  {
    builderName: "L. Cramer",
    abbreviations: ["Cramer", "LC", "L Cramer"],
    aliases: ["L. Cramer"],
  },
  {
    builderName: "Lake Country",
    abbreviations: ["Lake", "LC", "Lake Country"],
    aliases: [],
  },
  {
    builderName: "Lewis Heating",
    abbreviations: ["Lewis", "LH", "Lewis Heating"],
    aliases: [],
  },
  {
    builderName: "Luis Barba",
    abbreviations: ["Luis", "LB", "Barba"],
    aliases: ["Luis B"],
  },
  {
    builderName: "Lutz Construction",
    abbreviations: ["Lutz", "LC", "Lutz Construction"],
    aliases: [],
  },
  {
    builderName: "M&D Plumbing/Heating",
    abbreviations: ["M&D", "MD", "M and D"],
    aliases: ["M&D Plumbing", "M&D Heating"],
  },
  {
    builderName: "Merab Realty",
    abbreviations: ["Merab", "MR", "Merab Realty"],
    aliases: [],
  },
  {
    builderName: "Metro",
    abbreviations: ["Metro"],
    aliases: [],
  },
  {
    builderName: "Midland Unico",
    abbreviations: ["Midland", "MU", "Midland Unico"],
    aliases: ["Midland-Unico"],
  },
  {
    builderName: "MJL",
    abbreviations: ["MJL"],
    aliases: ["M.J.L."],
  },
  {
    builderName: "MN Mechanical",
    abbreviations: ["MN Mech", "MNM", "MN Mechanical"],
    aliases: ["Minnesota Mechanical"],
  },
  {
    builderName: "Multifamily",
    abbreviations: ["Multifamily", "MF", "Multi"],
    aliases: ["Multi-family", "Multi Family"],
  },
  {
    builderName: "NeighborWorks",
    abbreviations: ["NeighborWorks", "NW", "Neighbor"],
    aliases: ["Neighbor Works"],
  },
  {
    builderName: "Newco Homes",
    abbreviations: ["Newco", "NH", "Newco Homes"],
    aliases: [],
  },
  {
    builderName: "Parent",
    abbreviations: ["Parent"],
    aliases: [],
  },
  {
    builderName: "Reuter Walton",
    abbreviations: ["Reuter", "RW", "Reuter Walton"],
    aliases: ["Reuter-Walton"],
  },
  {
    builderName: "Scott Schmidt Construction",
    abbreviations: ["Scott Schmidt", "SS", "Schmidt"],
    aliases: ["S Schmidt", "Scott S"],
  },
  {
    builderName: "Sergey",
    abbreviations: ["Sergey"],
    aliases: [],
  },
  {
    builderName: "Stonewood",
    abbreviations: ["Stonewood", "SW"],
    aliases: [],
  },
  {
    builderName: "SWMHP",
    abbreviations: ["SWMHP"],
    aliases: ["S.W.M.H.P."],
  },
  {
    builderName: "TC Habitat",
    abbreviations: ["TC Habitat", "TCH", "TC"],
    aliases: ["Twin Cities Habitat"],
  },
  {
    builderName: "Trellis-Treehouse",
    abbreviations: ["Trellis", "Treehouse", "Trellis-Treehouse"],
    aliases: ["Trellis Treehouse"],
  },
  {
    builderName: "Urban Homeworks",
    abbreviations: ["Urban", "UH", "Urban Homeworks"],
    aliases: ["Urban Home Works"],
  },
  {
    builderName: "West Metro Mech",
    abbreviations: ["West Metro", "WMM", "West Metro Mech"],
    aliases: ["West Metro Mechanical"],
  },
  {
    builderName: "Yard Homes",
    abbreviations: ["Yard", "YH", "Yard Homes"],
    aliases: [],
  },
];

/**
 * Job type patterns for calendar event parsing
 */
export interface JobTypePattern {
  type: "sv2" | "full_test" | "code_bdoor" | "rough_duct" | "rehab" | "bdoor_retest" | "multifamily" | "energy_star";
  patterns: string[];
  confidence: number;
}

export const JOB_TYPE_PATTERNS: JobTypePattern[] = [
  {
    type: "sv2",
    patterns: ["sv2", "sv 2", "s.v.2", "pre-dry", "predry", "pre dry", "stage 2"],
    confidence: 100,
  },
  {
    type: "full_test",
    patterns: ["test", "full test", "test-spec", "test - spec", "test spec", "final test"],
    confidence: 100,
  },
  {
    type: "code_bdoor",
    patterns: ["code bdoor", "code blower", "blower door only", "bdoor only", "bd only"],
    confidence: 100,
  },
  {
    type: "rough_duct",
    patterns: ["rough duct", "duct rough", "rough-in duct", "duct rough-in"],
    confidence: 100,
  },
  {
    type: "rehab",
    patterns: ["rehab", "rehabilitation", "retrofit"],
    confidence: 100,
  },
  {
    type: "bdoor_retest",
    patterns: ["retest", "re-test", "blower retest", "bdoor retest", "failed retest"],
    confidence: 100,
  },
  {
    type: "multifamily",
    patterns: ["multifamily", "multi-family", "multi family", "mf", "apartment"],
    confidence: 100,
  },
  {
    type: "energy_star",
    patterns: ["energy star", "energystar", "e-star", "estar"],
    confidence: 100,
  },
];
