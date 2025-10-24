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
      title: "Insulation - Attic: Proper coverage and R-value",
      photoRequired: true,
    },
    {
      itemNumber: 2,
      title: "Insulation - Walls: Full cavity coverage, no gaps or voids",
      photoRequired: true,
    },
    {
      itemNumber: 3,
      title: "Insulation - Floor/Band Joists: Properly installed and sealed",
      photoRequired: true,
    },
    {
      itemNumber: 4,
      title: "Air Sealing - Top plates: All penetrations sealed",
      photoRequired: true,
    },
    {
      itemNumber: 5,
      title: "Air Sealing - Electrical boxes: All boxes sealed to drywall",
      photoRequired: true,
    },
    {
      itemNumber: 6,
      title: "Air Sealing - Windows and doors: Rough openings properly sealed",
      photoRequired: true,
    },
    {
      itemNumber: 7,
      title: "Air Sealing - Penetrations: All plumbing, electrical, HVAC penetrations sealed",
      photoRequired: true,
    },
    {
      itemNumber: 8,
      title: "Vapor Barrier: Properly installed with overlaps and sealed",
      photoRequired: true,
    },
    {
      itemNumber: 9,
      title: "HVAC Rough-in: Ductwork properly sized and supported",
      photoRequired: true,
    },
    {
      itemNumber: 10,
      title: "HVAC Rough-in: Supply and return ducts properly sealed at connections",
      photoRequired: true,
    },
    {
      itemNumber: 11,
      title: "Fireplace/Chimney: Proper air sealing and insulation",
      photoRequired: false,
    },
    {
      itemNumber: 12,
      title: "Recessed Lights: IC-rated and properly air sealed",
      photoRequired: false,
    },
    {
      itemNumber: 13,
      title: "Attic Access: Weather-stripped and insulated",
      photoRequired: true,
    },
    {
      itemNumber: 14,
      title: "Garage-to-House: Proper air barrier and fire blocking",
      photoRequired: true,
    },
    {
      itemNumber: 15,
      title: "General Notes: Overall workmanship and code compliance",
      photoRequired: false,
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

// Map inspection types to templates
export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  "Pre-Drywall Inspection": PRE_DRYWALL_TEMPLATE,
  "Final Testing": FINAL_TESTING_TEMPLATE,
  "Blower Door Only": BLOWER_DOOR_ONLY_TEMPLATE,
  "Duct Blaster Only": DUCT_BLASTER_ONLY_TEMPLATE,
  "Blower Door Retest": BLOWER_DOOR_RETEST_TEMPLATE,
  "Infrared Imaging": INFRARED_IMAGING_TEMPLATE,
  "Multifamily Project": MULTIFAMILY_PROJECT_TEMPLATE,
};

export function getTemplateForInspectionType(inspectionType: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES[inspectionType];
}
