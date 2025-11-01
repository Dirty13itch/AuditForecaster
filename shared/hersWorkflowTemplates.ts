// HERS-Specific Workflow Templates for Energy Auditing
// Implements all 9 requested job types for production readiness

import type { ChecklistTemplate } from './checklistTemplates';

export type HERSJobType = 
  | "qa_rough"           // HERS/QA Rough Inspection
  | "qa_final"           // HERS/QA Final Inspection  
  | "hers_blower_door"   // HERS Blower Door Test Only
  | "hers_duct_leakage"  // HERS Duct Leakage Test Only
  | "hers_ventilation"   // HERS Ventilation Test Only
  | "mf_rough"           // Multifamily Rough Inspection
  | "mf_final"           // Multifamily Final Inspection
  | "compliance_review"  // Compliance Review
  | "other";             // Other/Custom

export interface HERSWorkflowStep {
  stepNumber: number;
  name: string;
  description: string;
  required: boolean;
  navigationTarget?: string;
  estimatedMinutes?: number;
}

export interface HERSRequiredTest {
  testType: "blower_door" | "duct_leakage" | "ventilation";
  name: string;
  description: string;
  navigationTarget: string;
  complianceThreshold?: {
    metric: string;
    threshold: number;
    operator: "<=" | "<" | ">=" | ">" | "=";
  };
}

export interface HERSWorkflowTemplate {
  jobType: HERSJobType;
  displayName: string;
  description: string;
  checklistTemplate: ChecklistTemplate;
  steps: HERSWorkflowStep[];
  requiredTests: HERSRequiredTest[];
  estimatedDuration: number;
  requiredPhotos: string[];
  completionRequirements: {
    allChecklistItemsCompleted: boolean;
    allRequiredTestsCompleted: boolean;
    builderSignatureRequired: boolean;
    photoUploadRequired: boolean;
  };
  guidanceNotes?: string;
}

// ============================================================================
// QA_ROUGH - HERS/QA Rough Inspection
// ============================================================================
export const QA_ROUGH_CHECKLIST: ChecklistTemplate = {
  inspectionType: "HERS/QA Rough Inspection",
  items: [
    { itemNumber: 1, title: "Foundation: Verify proper insulation and moisture barrier", photoRequired: true },
    { itemNumber: 2, title: "Framing: Check framing quality and alignment", photoRequired: true },
    { itemNumber: 3, title: "Air Sealing - Bottom Plates: Sill gasket and rim joist sealed", photoRequired: true },
    { itemNumber: 4, title: "Air Sealing - Top Plates: All penetrations sealed", photoRequired: true },
    { itemNumber: 5, title: "Air Sealing - Windows/Doors: Rough openings sealed", photoRequired: true },
    { itemNumber: 6, title: "Insulation - Walls: Verify R-value and proper installation", photoRequired: true },
    { itemNumber: 7, title: "Insulation - Attic: Full coverage, no gaps or voids", photoRequired: true },
    { itemNumber: 8, title: "Insulation - Floors: Check band joist insulation", photoRequired: true },
    { itemNumber: 9, title: "HVAC Rough-in: Ductwork layout and sealing", photoRequired: true },
    { itemNumber: 10, title: "Plumbing Penetrations: All sealed properly", photoRequired: true },
    { itemNumber: 11, title: "Electrical Penetrations: All sealed properly", photoRequired: true },
    { itemNumber: 12, title: "Vapor Barrier: Proper installation and sealing", photoRequired: true },
    { itemNumber: 13, title: "Overall Quality Assessment", photoRequired: false },
  ],
};

export const QA_ROUGH_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "qa_rough",
  displayName: "HERS/QA Rough Inspection",
  description: "Quality assurance inspection during rough construction phase",
  checklistTemplate: QA_ROUGH_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Site Arrival & Safety Check",
      description: "Check in with builder, review safety conditions",
      required: true,
      estimatedMinutes: 5,
    },
    {
      stepNumber: 2,
      name: "Foundation & Framing Review",
      description: "Inspect foundation and framing quality",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 3,
      name: "Air Sealing Verification",
      description: "Critical: Verify all air sealing before insulation",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 4,
      name: "Insulation Inspection",
      description: "Check R-values and installation quality",
      required: true,
      estimatedMinutes: 25,
    },
    {
      stepNumber: 5,
      name: "HVAC & Mechanical",
      description: "Review ductwork and mechanical systems",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 6,
      name: "Photo Documentation",
      description: "Capture all required photos",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 7,
      name: "QA Report & Builder Review",
      description: "Complete QA report and review with builder",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [],
  estimatedDuration: 130,
  requiredPhotos: ["Foundation", "Framing", "Air Sealing", "Insulation", "HVAC", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Focus on items that cannot be verified after drywall installation.",
};

// ============================================================================
// QA_FINAL - HERS/QA Final Inspection
// ============================================================================
export const QA_FINAL_CHECKLIST: ChecklistTemplate = {
  inspectionType: "HERS/QA Final Inspection",
  items: [
    { itemNumber: 1, title: "Visual Inspection: Overall construction quality", photoRequired: false },
    { itemNumber: 2, title: "HVAC Equipment: Model/serial numbers documented", photoRequired: true },
    { itemNumber: 3, title: "Water Heater: Type and efficiency documented", photoRequired: true },
    { itemNumber: 4, title: "Windows: U-factor and SHGC verified", photoRequired: true },
    { itemNumber: 5, title: "Insulation Certificate: Posted and accurate", photoRequired: true },
    { itemNumber: 6, title: "Ventilation System: Installed and operational", photoRequired: false },
    { itemNumber: 7, title: "Lighting: High-efficiency fixtures installed", photoRequired: false },
    { itemNumber: 8, title: "Appliances: ENERGY STAR where required", photoRequired: true },
    { itemNumber: 9, title: "Air Sealing: Visual verification of completion", photoRequired: false },
    { itemNumber: 10, title: "Test Results Review: All tests passed", photoRequired: false },
  ],
};

export const QA_FINAL_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "qa_final",
  displayName: "HERS/QA Final Inspection",
  description: "Final quality assurance inspection with comprehensive testing",
  checklistTemplate: QA_FINAL_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Pre-Test Preparation",
      description: "Prepare home for testing",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Visual Inspection",
      description: "Complete visual inspection checklist",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 3,
      name: "Blower Door Test",
      description: "Perform air leakage test",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 4,
      name: "Duct Leakage Test",
      description: "Test duct system leakage",
      required: true,
      navigationTarget: "/duct-leakage-test",
      estimatedMinutes: 40,
    },
    {
      stepNumber: 5,
      name: "Ventilation Test",
      description: "Verify ventilation compliance",
      required: true,
      navigationTarget: "/ventilation-test",
      estimatedMinutes: 30,
    },
    {
      stepNumber: 6,
      name: "Equipment Documentation",
      description: "Document all equipment data",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 7,
      name: "QA Report Generation",
      description: "Generate final QA report",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Test",
      description: "ACH50 must be ≤3.0",
      navigationTarget: "/blower-door-test",
      complianceThreshold: {
        metric: "ach50",
        threshold: 3.0,
        operator: "<=",
      },
    },
    {
      testType: "duct_leakage",
      name: "Duct Leakage Test",
      description: "TDL ≤4.0 CFM25/100sqft",
      navigationTarget: "/duct-leakage-test",
      complianceThreshold: {
        metric: "tdl",
        threshold: 4.0,
        operator: "<=",
      },
    },
    {
      testType: "ventilation",
      name: "Ventilation Test",
      description: "ASHRAE 62.2 compliance",
      navigationTarget: "/ventilation-test",
    },
  ],
  estimatedDuration: 190,
  requiredPhotos: ["Equipment", "Test Setup", "Data Plates", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "All tests must pass for QA approval.",
};

// ============================================================================
// HERS_BLOWER_DOOR - Standalone Blower Door Test
// ============================================================================
export const HERS_BLOWER_DOOR_CHECKLIST: ChecklistTemplate = {
  inspectionType: "HERS Blower Door Test",
  items: [
    { itemNumber: 1, title: "House Preparation: All windows/doors closed", photoRequired: false },
    { itemNumber: 2, title: "Equipment Setup: Blower door installed correctly", photoRequired: true },
    { itemNumber: 3, title: "Equipment Calibration: Verify calibration date", photoRequired: false },
    { itemNumber: 4, title: "Multi-point Test: Perform at multiple pressures", photoRequired: true },
    { itemNumber: 5, title: "Results Documentation: Record CFM50 and ACH50", photoRequired: true },
    { itemNumber: 6, title: "Compliance Check: Verify ACH50 ≤ 3.0", photoRequired: false },
  ],
};

export const HERS_BLOWER_DOOR_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "hers_blower_door",
  displayName: "HERS Blower Door Test",
  description: "Standalone blower door test for air leakage measurement",
  checklistTemplate: HERS_BLOWER_DOOR_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Test Preparation",
      description: "Prepare house for testing",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Perform Blower Door Test",
      description: "Complete multi-point test",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 3,
      name: "Results & Compliance",
      description: "Document results and verify compliance",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Test",
      description: "ACH50 must be ≤3.0",
      navigationTarget: "/blower-door-test",
      complianceThreshold: {
        metric: "ach50",
        threshold: 3.0,
        operator: "<=",
      },
    },
  ],
  estimatedDuration: 70,
  requiredPhotos: ["Test Setup", "Equipment", "Results"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// HERS_DUCT_LEAKAGE - Standalone Duct Leakage Test
// ============================================================================
export const HERS_DUCT_LEAKAGE_CHECKLIST: ChecklistTemplate = {
  inspectionType: "HERS Duct Leakage Test",
  items: [
    { itemNumber: 1, title: "System Preparation: Seal all registers", photoRequired: true },
    { itemNumber: 2, title: "Equipment Setup: Duct blaster installed", photoRequired: true },
    { itemNumber: 3, title: "Total Duct Leakage: Measure at 25 Pa", photoRequired: true },
    { itemNumber: 4, title: "Duct Leakage to Outside: With house depressurized", photoRequired: true },
    { itemNumber: 5, title: "Compliance Check: TDL ≤4.0, DLO ≤3.0", photoRequired: false },
  ],
};

export const HERS_DUCT_LEAKAGE_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "hers_duct_leakage",
  displayName: "HERS Duct Leakage Test",
  description: "Standalone duct leakage test for duct system evaluation",
  checklistTemplate: HERS_DUCT_LEAKAGE_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Test Preparation",
      description: "Prepare duct system for testing",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Perform Duct Test",
      description: "Complete TDL and DLO tests",
      required: true,
      navigationTarget: "/duct-leakage-test",
      estimatedMinutes: 40,
    },
    {
      stepNumber: 3,
      name: "Results & Compliance",
      description: "Document results and verify compliance",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [
    {
      testType: "duct_leakage",
      name: "Duct Leakage Test",
      description: "TDL ≤4.0, DLO ≤3.0 CFM25/100sqft",
      navigationTarget: "/duct-leakage-test",
      complianceThreshold: {
        metric: "tdl",
        threshold: 4.0,
        operator: "<=",
      },
    },
  ],
  estimatedDuration: 65,
  requiredPhotos: ["Test Setup", "Equipment", "Results"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// HERS_VENTILATION - Standalone Ventilation Test
// ============================================================================
export const HERS_VENTILATION_CHECKLIST: ChecklistTemplate = {
  inspectionType: "HERS Ventilation Test",
  items: [
    { itemNumber: 1, title: "System Identification: Document ventilation type", photoRequired: true },
    { itemNumber: 2, title: "Kitchen Exhaust: Measure CFM", photoRequired: false },
    { itemNumber: 3, title: "Bathroom Exhaust: Measure CFM", photoRequired: false },
    { itemNumber: 4, title: "Whole-House Ventilation: Verify operation", photoRequired: true },
    { itemNumber: 5, title: "ASHRAE 62.2 Compliance: Calculate requirements", photoRequired: false },
  ],
};

export const HERS_VENTILATION_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "hers_ventilation",
  displayName: "HERS Ventilation Test",
  description: "Standalone ventilation test for ASHRAE 62.2 compliance",
  checklistTemplate: HERS_VENTILATION_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "System Review",
      description: "Identify ventilation systems",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 2,
      name: "Perform Ventilation Test",
      description: "Measure all ventilation flows",
      required: true,
      navigationTarget: "/ventilation-test",
      estimatedMinutes: 30,
    },
    {
      stepNumber: 3,
      name: "Compliance Calculation",
      description: "Verify ASHRAE 62.2 compliance",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [
    {
      testType: "ventilation",
      name: "Ventilation Test",
      description: "ASHRAE 62.2 compliance",
      navigationTarget: "/ventilation-test",
    },
  ],
  estimatedDuration: 50,
  requiredPhotos: ["Equipment", "Ventilation Systems"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// MF_ROUGH - Multifamily Rough Inspection
// ============================================================================
export const MF_ROUGH_CHECKLIST: ChecklistTemplate = {
  inspectionType: "Multifamily Rough Inspection",
  items: [
    { itemNumber: 1, title: "Unit Identification: Building/floor/unit number", photoRequired: false },
    { itemNumber: 2, title: "Party Wall Air Sealing: Between units", photoRequired: true },
    { itemNumber: 3, title: "Corridor Air Sealing: To common areas", photoRequired: true },
    { itemNumber: 4, title: "Fire Stopping: All penetrations sealed", photoRequired: true },
    { itemNumber: 5, title: "Sound Attenuation: Between units", photoRequired: false },
    { itemNumber: 6, title: "Individual HVAC: Verify separate systems", photoRequired: true },
    { itemNumber: 7, title: "Plumbing Chases: Properly sealed", photoRequired: true },
    { itemNumber: 8, title: "Electrical Chases: Properly sealed", photoRequired: true },
  ],
};

export const MF_ROUGH_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "mf_rough",
  displayName: "Multifamily Rough Inspection",
  description: "Rough inspection for multifamily units focusing on compartmentalization",
  checklistTemplate: MF_ROUGH_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Unit Documentation",
      description: "Record unit details and location",
      required: true,
      estimatedMinutes: 5,
    },
    {
      stepNumber: 2,
      name: "Compartmentalization Review",
      description: "Inspect air sealing between units",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 3,
      name: "Fire/Sound Inspection",
      description: "Check fire stopping and sound attenuation",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 4,
      name: "Photo Documentation",
      description: "Document all critical areas",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [],
  estimatedDuration: 70,
  requiredPhotos: ["Party Walls", "Corridors", "Penetrations", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Focus on compartmentalization and fire safety.",
};

// ============================================================================
// MF_FINAL - Multifamily Final Inspection
// ============================================================================
export const MF_FINAL_CHECKLIST: ChecklistTemplate = {
  inspectionType: "Multifamily Final Inspection",
  items: [
    { itemNumber: 1, title: "Unit Identification: Confirm unit details", photoRequired: false },
    { itemNumber: 2, title: "Compartmentalization Test: Unit isolation verified", photoRequired: true },
    { itemNumber: 3, title: "Individual HVAC: System operational", photoRequired: false },
    { itemNumber: 4, title: "Ventilation: Unit ventilation adequate", photoRequired: false },
    { itemNumber: 5, title: "Test Results: All tests passed", photoRequired: false },
  ],
};

export const MF_FINAL_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "mf_final",
  displayName: "Multifamily Final Inspection",
  description: "Final inspection and testing for multifamily units",
  checklistTemplate: MF_FINAL_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Unit Setup",
      description: "Prepare unit for testing",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 2,
      name: "Compartmentalization Test",
      description: "Test air leakage to adjacent units",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 3,
      name: "Ventilation Verification",
      description: "Test unit ventilation system",
      required: true,
      navigationTarget: "/ventilation-test",
      estimatedMinutes: 20,
    },
    {
      stepNumber: 4,
      name: "Documentation",
      description: "Complete unit documentation",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Compartmentalization Test",
      description: "Unit air leakage test",
      navigationTarget: "/blower-door-test",
    },
    {
      testType: "ventilation",
      name: "Unit Ventilation",
      description: "Individual unit ventilation",
      navigationTarget: "/ventilation-test",
    },
  ],
  estimatedDuration: 90,
  requiredPhotos: ["Test Setup", "Equipment", "Results"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// COMPLIANCE_REVIEW - Compliance Review Only
// ============================================================================
export const COMPLIANCE_REVIEW_CHECKLIST: ChecklistTemplate = {
  inspectionType: "Compliance Review",
  items: [
    { itemNumber: 1, title: "Energy Code Compliance: Review all documentation", photoRequired: false },
    { itemNumber: 2, title: "Test Results: Verify all tests pass", photoRequired: false },
    { itemNumber: 3, title: "Equipment Specifications: Meet requirements", photoRequired: true },
    { itemNumber: 4, title: "Insulation Certificate: Accurate and complete", photoRequired: true },
    { itemNumber: 5, title: "Ventilation Compliance: ASHRAE 62.2 met", photoRequired: false },
    { itemNumber: 6, title: "Overall Compliance Assessment", photoRequired: false },
  ],
};

export const COMPLIANCE_REVIEW_WORKFLOW: HERSWorkflowTemplate = {
  jobType: "compliance_review",
  displayName: "Compliance Review",
  description: "Desktop review of compliance documentation and test results",
  checklistTemplate: COMPLIANCE_REVIEW_CHECKLIST,
  steps: [
    {
      stepNumber: 1,
      name: "Document Review",
      description: "Review all submitted documentation",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 2,
      name: "Test Results Analysis",
      description: "Verify all test results meet code",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 3,
      name: "Compliance Determination",
      description: "Make final compliance determination",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [],
  estimatedDuration: 60,
  requiredPhotos: ["Documentation"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: false,
    builderSignatureRequired: false,
    photoUploadRequired: false,
  },
  guidanceNotes: "Review only - no field testing required.",
};

// ============================================================================
// Workflow Registry
// ============================================================================
export const HERS_WORKFLOW_TEMPLATES: Record<HERSJobType, HERSWorkflowTemplate> = {
  qa_rough: QA_ROUGH_WORKFLOW,
  qa_final: QA_FINAL_WORKFLOW,
  hers_blower_door: HERS_BLOWER_DOOR_WORKFLOW,
  hers_duct_leakage: HERS_DUCT_LEAKAGE_WORKFLOW,
  hers_ventilation: HERS_VENTILATION_WORKFLOW,
  mf_rough: MF_ROUGH_WORKFLOW,
  mf_final: MF_FINAL_WORKFLOW,
  compliance_review: COMPLIANCE_REVIEW_WORKFLOW,
  other: {
    jobType: "other",
    displayName: "Custom Inspection",
    description: "Custom inspection workflow",
    checklistTemplate: {
      inspectionType: "Custom Inspection",
      items: [
        { itemNumber: 1, title: "Custom inspection item", photoRequired: false },
      ],
    },
    steps: [
      {
        stepNumber: 1,
        name: "Custom Inspection",
        description: "Perform custom inspection",
        required: true,
        estimatedMinutes: 60,
      },
    ],
    requiredTests: [],
    estimatedDuration: 60,
    requiredPhotos: ["General"],
    completionRequirements: {
      allChecklistItemsCompleted: false,
      allRequiredTestsCompleted: false,
      builderSignatureRequired: true,
      photoUploadRequired: false,
    },
  },
};

export function getHERSWorkflowTemplate(jobType: HERSJobType): HERSWorkflowTemplate {
  return HERS_WORKFLOW_TEMPLATES[jobType] || HERS_WORKFLOW_TEMPLATES.other;
}