// Predefined checklist templates for different inspection types

export interface ChecklistTemplate {
  inspectionType: string;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  itemNumber: number;
  title: string;
  photoRequired: boolean;
  defaultNotes?: string;
}

export const PRE_DRYWALL_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Pre-Drywall Inspection",
  items: [
    {
      itemNumber: 1,
      title: "Insulation - Attic: R-49 minimum, full coverage, no gaps",
      photoRequired: true,
      defaultNotes: "Climate Zone 6 requires R-49 attic insulation. Verify proper coverage at eaves and penetrations.",
    },
    {
      itemNumber: 2,
      title: "Insulation - Walls: R-20 cavity + R-5 continuous, Grade I installation",
      photoRequired: true,
      defaultNotes: "Check for full cavity fill, no gaps/voids/compression. Verify continuous insulation on exterior.",
    },
    {
      itemNumber: 3,
      title: "Insulation - Floors: R-30 minimum, properly supported and sealed",
      photoRequired: true,
      defaultNotes: "Floor insulation must be in full contact with subfloor. Check band joist insulation.",
    },
    {
      itemNumber: 4,
      title: "Insulation - Basement Walls: R-15 minimum (if applicable)",
      photoRequired: true,
      defaultNotes: "Verify basement wall insulation extends to footer or slab edge.",
    },
    {
      itemNumber: 5,
      title: "Vapor Barrier: Class I or II, 6-inch overlaps, taped seams, interior side",
      photoRequired: true,
      defaultNotes: "Poly must be on warm side (interior). All seams overlapped 6\" minimum and taped. No tears or gaps.",
    },
    {
      itemNumber: 6,
      title: "Air Sealing - Top Plates: All penetrations sealed with foam or caulk",
      photoRequired: true,
      defaultNotes: "Seal all top plate penetrations before insulation. Check electrical, plumbing, HVAC pass-throughs.",
    },
    {
      itemNumber: 7,
      title: "Air Sealing - Bottom Plates: Sill gasket and rim joist sealed",
      photoRequired: true,
      defaultNotes: "Verify sill gasket under bottom plate. Seal rim joist to foundation with foam or caulk.",
    },
    {
      itemNumber: 8,
      title: "Air Sealing - Windows & Doors: Rough openings sealed with low-expansion foam",
      photoRequired: true,
      defaultNotes: "Check all window/door rough openings are sealed before trimming. No gaps visible.",
    },
    {
      itemNumber: 9,
      title: "Air Sealing - Penetrations: All electrical, plumbing, HVAC sealed",
      photoRequired: true,
      defaultNotes: "Seal wire/pipe penetrations through plates and exterior walls. No daylight visible.",
    },
    {
      itemNumber: 10,
      title: "Air Sealing - Band Joist: Fully sealed and insulated to R-30",
      photoRequired: true,
      defaultNotes: "Band joist is major leakage area. Must be fully sealed and insulated before drywall.",
    },
    {
      itemNumber: 11,
      title: "Air Sealing - Electrical Boxes: Gaskets or sealed to drywall",
      photoRequired: true,
      defaultNotes: "Verify boxes on exterior walls have gaskets or are sealed airtight to drywall.",
    },
    {
      itemNumber: 12,
      title: "Duct Sealing: All joints and seams sealed with mastic before burial",
      photoRequired: true,
      defaultNotes: "Ducts in unconditioned space must be sealed with mastic (not tape) before insulation burial.",
    },
    {
      itemNumber: 13,
      title: "HVAC Rough-in: Properly sized, supported, and located in conditioned space",
      photoRequired: true,
      defaultNotes: "Verify ductwork is in conditioned space where possible. Check proper sizing and support.",
    },
    {
      itemNumber: 14,
      title: "Attic Access: Weather-stripped and insulated to R-49",
      photoRequired: true,
      defaultNotes: "Attic hatch must have gasket/weather-stripping and insulation matching attic R-value.",
    },
    {
      itemNumber: 15,
      title: "Garage-to-House: Fire-rated drywall, sealed air barrier, proper door",
      photoRequired: true,
      defaultNotes: "Verify fire-rated drywall on garage side. Seal all penetrations. Self-closing door required.",
    },
    {
      itemNumber: 16,
      title: "Recessed Lights: IC-AT rated, sealed to ceiling plane",
      photoRequired: true,
      defaultNotes: "Lights in insulated ceiling must be IC-AT rated and sealed airtight to drywall.",
    },
    {
      itemNumber: 17,
      title: "Fireplace/Chimney: Combustion air sealed, proper clearances maintained",
      photoRequired: false,
      defaultNotes: "Direct-vent or sealed combustion only. Verify proper insulation clearances around flue.",
    },
    {
      itemNumber: 18,
      title: "General Notes: Overall workmanship, code compliance, installer certifications",
      photoRequired: false,
      defaultNotes: "Document overall quality, any deficiencies found, and installer certifications if applicable.",
    },
  ],
};

export const FINAL_TESTING_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Final Testing",
  items: [
    {
      itemNumber: 1,
      title: "Pre-Test Prep: All windows and doors closed, HVAC sealed",
      photoRequired: false,
    },
    {
      itemNumber: 2,
      title: "Equipment Setup: Blower door properly installed and sealed",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Equipment Calibration: Verify recent calibration dates",
      photoRequired: false,
      defaultNotes: "Last calibration date: ",
    },
    {
      itemNumber: 4,
      title: "Baseline Pressure: Record baseline house pressure",
      photoRequired: false,
    },
    {
      itemNumber: 5,
      title: "Blower Door Test: Depressurize to -50 Pa and record CFM50",
      photoRequired: true,
    },
    {
      itemNumber: 6,
      title: "ACH50 Calculation: Calculate and verify ACH50 value",
      photoRequired: false,
    },
    {
      itemNumber: 7,
      title: "Duct Blaster Setup: Install duct blaster and seal registers",
      photoRequired: true,
    },
    {
      itemNumber: 8,
      title: "Total Duct Leakage (TDL): Pressurize to 25 Pa and record CFM25",
      photoRequired: true,
    },
    {
      itemNumber: 9,
      title: "Duct Leakage to Outside (DLO): Test with house depressurized",
      photoRequired: true,
    },
    {
      itemNumber: 10,
      title: "Visual Inspection: Check for obvious air leaks (thermal camera if available)",
      photoRequired: false,
    },
    {
      itemNumber: 11,
      title: "HVAC Equipment: Record model numbers and serial numbers",
      photoRequired: true,
    },
    {
      itemNumber: 12,
      title: "Compliance Check: Verify all results meet code requirements",
      photoRequired: false,
    },
    {
      itemNumber: 13,
      title: "Builder Signature: Obtain signature for test results",
      photoRequired: false,
    },
    {
      itemNumber: 14,
      title: "Final Notes: Document any issues or recommendations",
      photoRequired: false,
    },
  ],
};

export const BLOWER_DOOR_ONLY_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Blower Door Only",
  items: [
    {
      itemNumber: 1,
      title: "Pre-Test Prep: All windows and doors closed",
      photoRequired: false,
    },
    {
      itemNumber: 2,
      title: "Equipment Setup: Blower door properly installed",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Baseline Pressure: Record baseline house pressure",
      photoRequired: false,
    },
    {
      itemNumber: 4,
      title: "Blower Door Test: Depressurize to -50 Pa and record CFM50",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "ACH50 Calculation: Calculate and record ACH50 value",
      photoRequired: false,
    },
    {
      itemNumber: 6,
      title: "Results Documentation: Photo of blower door gauge readings",
      photoRequired: true,
    },
  ],
};

export const DUCT_BLASTER_ONLY_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Duct Blaster Only",
  items: [
    {
      itemNumber: 1,
      title: "Equipment Setup: Install duct blaster and seal all registers",
      photoRequired: true,
    },
    {
      itemNumber: 2,
      title: "Total Duct Leakage (TDL): Pressurize to 25 Pa and record CFM25",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Duct Leakage to Outside (DLO): Test with house depressurized",
      photoRequired: true,
    },
    {
      itemNumber: 4,
      title: "Equipment Documentation: Photo of duct blaster gauge",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "HVAC Information: Record equipment model and serial numbers",
      photoRequired: false,
    },
  ],
};

export const BLOWER_DOOR_RETEST_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Blower Door Retest",
  items: [
    {
      itemNumber: 1,
      title: "Review Previous Test: Note previous CFM50 and ACH50 values",
      photoRequired: false,
      defaultNotes: "Previous test date and results: ",
    },
    {
      itemNumber: 2,
      title: "Identify Repairs: Document what was corrected since last test",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Pre-Test Prep: All windows and doors closed",
      photoRequired: false,
    },
    {
      itemNumber: 4,
      title: "Equipment Setup: Blower door properly installed",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "Retest: Depressurize to -50 Pa and record new CFM50",
      photoRequired: true,
    },
    {
      itemNumber: 6,
      title: "Compare Results: Calculate improvement from previous test",
      photoRequired: false,
    },
    {
      itemNumber: 7,
      title: "Pass/Fail: Verify new results meet code requirements",
      photoRequired: false,
    },
  ],
};

export const INFRARED_IMAGING_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Infrared Imaging",
  items: [
    {
      itemNumber: 1,
      title: "Setup Conditions: Establish temperature differential (min 20°F)",
      photoRequired: false,
    },
    {
      itemNumber: 2,
      title: "Attic: Thermal scan for insulation gaps and air leakage",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Exterior Walls: Scan for thermal bridging and missing insulation",
      photoRequired: true,
    },
    {
      itemNumber: 4,
      title: "Windows and Doors: Check for air leakage around openings",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "Electrical Boxes: Scan for air leakage",
      photoRequired: true,
    },
    {
      itemNumber: 6,
      title: "HVAC Ducts: Check for leakage in accessible areas",
      photoRequired: true,
    },
    {
      itemNumber: 7,
      title: "Basement/Crawlspace: Scan for moisture and air leakage",
      photoRequired: true,
    },
    {
      itemNumber: 8,
      title: "Document Findings: Label and annotate all thermal images",
      photoRequired: true,
    },
  ],
};

export const MULTIFAMILY_PROJECT_TEMPLATE: ChecklistTemplate = {
  inspectionType: "Multifamily Project",
  items: [
    {
      itemNumber: 1,
      title: "Unit Identification: Record building, floor, and unit number",
      photoRequired: false,
    },
    {
      itemNumber: 2,
      title: "Blower Door Test: CFM50 and ACH50 for this unit",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Party Wall Air Sealing: Check sealing between units",
      photoRequired: true,
    },
    {
      itemNumber: 4,
      title: "Corridor Air Sealing: Check sealing to common areas",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "HVAC System: Type and configuration for this unit",
      photoRequired: false,
    },
    {
      itemNumber: 6,
      title: "Ventilation: Verify ventilation system operation",
      photoRequired: false,
    },
    {
      itemNumber: 7,
      title: "Sampling Notes: Document if this is a sample unit",
      photoRequired: false,
    },
  ],
};

// Job type enum matching database
export type JobType = 
  | "sv2"           // Pre-Drywall (Site Visit 2)
  | "full_test"     // Final Testing with all tests
  | "code_bdoor"    // Code inspection + blower door
  | "rough_duct"    // Rough duct inspection
  | "rehab"         // Rehabilitation inspection
  | "bdoor_retest"  // Blower door retest only
  | "multifamily"   // Multifamily units
  | "energy_star"   // Energy Star certification
  | "other";        // Other/custom

// Map inspection types to templates (legacy support)
export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  "Pre-Drywall Inspection": PRE_DRYWALL_TEMPLATE,
  "Final Testing": FINAL_TESTING_TEMPLATE,
  "Blower Door Only": BLOWER_DOOR_ONLY_TEMPLATE,
  "Duct Blaster Only": DUCT_BLASTER_ONLY_TEMPLATE,
  "Blower Door Retest": BLOWER_DOOR_RETEST_TEMPLATE,
  "Infrared Imaging": INFRARED_IMAGING_TEMPLATE,
  "Multifamily Project": MULTIFAMILY_PROJECT_TEMPLATE,
};

// Map job types (database enum) to checklist templates
export const JOB_TYPE_TO_TEMPLATE: Record<JobType, ChecklistTemplate> = {
  sv2: PRE_DRYWALL_TEMPLATE,
  full_test: FINAL_TESTING_TEMPLATE,
  code_bdoor: FINAL_TESTING_TEMPLATE, // Use final testing checklist
  rough_duct: {
    inspectionType: "Rough Duct Inspection",
    items: [
      { itemNumber: 1, title: "Duct Layout: Verify layout matches plans, proper sizing", photoRequired: true },
      { itemNumber: 2, title: "Duct Material: Check material type and condition", photoRequired: true },
      { itemNumber: 3, title: "Duct Sealing: All joints sealed with mastic (not tape)", photoRequired: true, defaultNotes: "Mastic required on all joints and seams before insulation" },
      { itemNumber: 4, title: "Duct Support: Properly supported every 4-6 feet", photoRequired: true },
      { itemNumber: 5, title: "Register Boots: Sealed to framing or drywall", photoRequired: true },
      { itemNumber: 6, title: "Return Air: Properly sized and sealed", photoRequired: true },
      { itemNumber: 7, title: "Flex Duct: No kinks, proper extension, supported", photoRequired: true },
      { itemNumber: 8, title: "Insulation: Ducts in unconditioned space to be insulated R-8 minimum", photoRequired: true },
      { itemNumber: 9, title: "Plenums: Properly sealed and insulated", photoRequired: false },
      { itemNumber: 10, title: "Overall Quality: Workmanship and code compliance", photoRequired: false },
    ],
  },
  rehab: FINAL_TESTING_TEMPLATE, // Use final testing checklist for rehab
  bdoor_retest: BLOWER_DOOR_RETEST_TEMPLATE,
  multifamily: MULTIFAMILY_PROJECT_TEMPLATE,
  energy_star: FINAL_TESTING_TEMPLATE, // Energy Star uses comprehensive final testing
  other: FINAL_TESTING_TEMPLATE, // Default to final testing for custom jobs
};

export function getTemplateForInspectionType(inspectionType: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES[inspectionType];
}

/**
 * Get checklist template for a job type (database enum)
 * This is the primary function to use for checklist generation
 */
export function getTemplateForJobType(jobType: JobType): ChecklistTemplate {
  return JOB_TYPE_TO_TEMPLATE[jobType] || FINAL_TESTING_TEMPLATE;
}
