// Job-Type-Specific Workflow Templates
// Defines complete workflows for each inspection type including steps, required tests, and guidance

import type { ChecklistTemplate } from './checklistTemplates';
import {
  PRE_DRYWALL_TEMPLATE,
  FINAL_TESTING_TEMPLATE,
  BLOWER_DOOR_ONLY_TEMPLATE,
  DUCT_BLASTER_ONLY_TEMPLATE,
  BLOWER_DOOR_RETEST_TEMPLATE,
  INFRARED_IMAGING_TEMPLATE,
  MULTIFAMILY_PROJECT_TEMPLATE,
} from './checklistTemplates';

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

export interface WorkflowStep {
  stepNumber: number;
  name: string;
  description: string;
  required: boolean;
  navigationTarget?: string; // Route to navigate to (e.g., "/blower-door-test")
  estimatedMinutes?: number;
}

export interface RequiredTest {
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

export interface WorkflowTemplate {
  jobType: JobType;
  displayName: string;
  description: string;
  checklistTemplate: ChecklistTemplate;
  steps: WorkflowStep[];
  requiredTests: RequiredTest[];
  estimatedDuration: number; // Total minutes
  requiredPhotos: string[]; // Photo tag categories that are required
  completionRequirements: {
    allChecklistItemsCompleted: boolean;
    allRequiredTestsCompleted: boolean;
    builderSignatureRequired: boolean;
    photoUploadRequired: boolean;
  };
  guidanceNotes?: string; // Field inspector guidance
}

// ============================================================================
// PRE-DRYWALL (SV2) - Site Visit 2
// ============================================================================
export const SV2_WORKFLOW: WorkflowTemplate = {
  jobType: "sv2",
  displayName: "Pre-Drywall Inspection (SV2)",
  description: "Inspection before drywall installation focusing on air sealing, insulation, and rough mechanicals",
  checklistTemplate: PRE_DRYWALL_TEMPLATE,
  steps: [
    {
      stepNumber: 1,
      name: "Site Arrival & Safety",
      description: "Arrive on site, check in with builder, review safety conditions",
      required: true,
      estimatedMinutes: 5,
    },
    {
      stepNumber: 2,
      name: "Foundation & Framing Review",
      description: "Check foundation, framing, band joist sealing",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 3,
      name: "Air Sealing Inspection",
      description: "Critical: Verify all air sealing at top plates, bottom plates, penetrations, windows/doors",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 4,
      name: "Insulation Inspection",
      description: "Verify insulation R-values, coverage, Grade I installation (no gaps/voids)",
      required: true,
      estimatedMinutes: 25,
    },
    {
      stepNumber: 5,
      name: "HVAC & Ductwork",
      description: "Check rough ductwork, verify sealing with mastic, proper sizing",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 6,
      name: "Photo Documentation",
      description: "Upload all required photos (air sealing, insulation, ductwork)",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 7,
      name: "Builder Review & Signature",
      description: "Review findings with builder, obtain signature",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [], // NO testing at pre-drywall stage
  estimatedDuration: 110, // ~2 hours
  requiredPhotos: ["Air Sealing", "Insulation", "Ductwork", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: false, // No tests required
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Focus on air sealing and insulation - these can't be verified after drywall! Take comprehensive photos.",
};

// ============================================================================
// FULL TEST - Final Inspection with All Testing
// ============================================================================
export const FULL_TEST_WORKFLOW: WorkflowTemplate = {
  jobType: "full_test",
  displayName: "Final Testing (Complete)",
  description: "Comprehensive final inspection with blower door, duct leakage, and ventilation testing",
  checklistTemplate: FINAL_TESTING_TEMPLATE,
  steps: [
    {
      stepNumber: 1,
      name: "Pre-Test Preparation",
      description: "Close all windows/doors, seal HVAC, review equipment calibration",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Visual Inspection Checklist",
      description: "Complete visual inspection checklist items",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 3,
      name: "Blower Door Test",
      description: "Perform multi-point blower door test, calculate ACH50",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 4,
      name: "Duct Leakage Test",
      description: "Measure Total Duct Leakage (TDL) and Duct Leakage to Outside (DLO)",
      required: true,
      navigationTarget: "/duct-leakage-test",
      estimatedMinutes: 40,
    },
    {
      stepNumber: 5,
      name: "Ventilation Test",
      description: "ASHRAE 62.2 whole-house ventilation compliance",
      required: true,
      navigationTarget: "/ventilation-test",
      estimatedMinutes: 30,
    },
    {
      stepNumber: 6,
      name: "Equipment Documentation",
      description: "Photo all equipment data plates (HVAC, water heater, ventilation)",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 7,
      name: "Compliance Review",
      description: "Review all test results for code compliance",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 8,
      name: "Builder Review & Signature",
      description: "Review results with builder, obtain signature",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Test",
      description: "ACH50 must be ≤3.0 per Minnesota 2020 Energy Code",
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
      description: "TDL ≤4.0 CFM25/100sqft, DLO ≤3.0 CFM25/100sqft",
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
      description: "ASHRAE 62.2 compliance verification",
      navigationTarget: "/ventilation-test",
    },
  ],
  estimatedDuration: 190, // ~3 hours
  requiredPhotos: ["Equipment", "Test Setup", "Data Plate", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Complete all three tests. If blower door or duct leakage fails, schedule retest.",
};

// ============================================================================
// CODE BDOOR - Code Inspection + Blower Door
// ============================================================================
export const CODE_BDOOR_WORKFLOW: WorkflowTemplate = {
  jobType: "code_bdoor",
  displayName: "Code Inspection + Blower Door",
  description: "Code compliance inspection with blower door test only",
  checklistTemplate: FINAL_TESTING_TEMPLATE, // Use final testing checklist minus duct items
  steps: [
    {
      stepNumber: 1,
      name: "Code Compliance Review",
      description: "Visual inspection for code compliance items",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 2,
      name: "Blower Door Test",
      description: "Perform blower door test, calculate ACH50",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 3,
      name: "Documentation & Signature",
      description: "Complete documentation, obtain builder signature",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Test",
      description: "ACH50 must be ≤3.0 per code requirements",
      navigationTarget: "/blower-door-test",
      complianceThreshold: {
        metric: "ach50",
        threshold: 3.0,
        operator: "<=",
      },
    },
  ],
  estimatedDuration: 90, // ~1.5 hours
  requiredPhotos: ["Test Setup", "Equipment", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// ROUGH DUCT - Rough Duct Inspection
// ============================================================================
export const ROUGH_DUCT_WORKFLOW: WorkflowTemplate = {
  jobType: "rough_duct",
  displayName: "Rough Duct Inspection",
  description: "Ductwork inspection before burial in insulation",
  checklistTemplate: {
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
  steps: [
    {
      stepNumber: 1,
      name: "Duct Layout Review",
      description: "Verify ductwork layout, sizing, and locations",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 2,
      name: "Sealing Inspection",
      description: "Critical: Verify mastic sealing on all joints before insulation burial",
      required: true,
      estimatedMinutes: 25,
    },
    {
      stepNumber: 3,
      name: "Support & Installation",
      description: "Check proper support, no kinks, proper extension",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 4,
      name: "Photo Documentation",
      description: "Comprehensive photos of sealing, layout, and installation",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 5,
      name: "Builder Review",
      description: "Review findings, obtain signature",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [], // No testing at rough stage
  estimatedDuration: 80, // ~1.5 hours
  requiredPhotos: ["Ductwork", "Sealing", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: false,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Duct sealing is critical - can't be verified after insulation burial. Document thoroughly.",
};

// ============================================================================
// BLOWER DOOR RETEST - Retest Only
// ============================================================================
export const BDOOR_RETEST_WORKFLOW: WorkflowTemplate = {
  jobType: "bdoor_retest",
  displayName: "Blower Door Retest",
  description: "Streamlined retest after failed initial blower door test",
  checklistTemplate: BLOWER_DOOR_RETEST_TEMPLATE,
  steps: [
    {
      stepNumber: 1,
      name: "Review Previous Results",
      description: "Review original test failure, document repairs made",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 2,
      name: "Perform Retest",
      description: "Blower door retest to verify repairs",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 45,
    },
    {
      stepNumber: 3,
      name: "Compare & Document",
      description: "Compare to original results, document improvement",
      required: true,
      estimatedMinutes: 10,
    },
    {
      stepNumber: 4,
      name: "Builder Signature",
      description: "Obtain signature on retest results",
      required: true,
      estimatedMinutes: 5,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Retest",
      description: "ACH50 must be ≤3.0 to pass",
      navigationTarget: "/blower-door-test",
      complianceThreshold: {
        metric: "ach50",
        threshold: 3.0,
        operator: "<=",
      },
    },
  ],
  estimatedDuration: 70, // ~1 hour
  requiredPhotos: ["Test Setup", "Repairs", "Equipment"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: false, // Not critical for retest
  },
  guidanceNotes: "Document what repairs were made between original test and retest. Show previous results for comparison.",
};

// ============================================================================
// MULTIFAMILY
// ============================================================================
export const MULTIFAMILY_WORKFLOW: WorkflowTemplate = {
  jobType: "multifamily",
  displayName: "Multifamily Unit Testing",
  description: "Testing for multifamily residential units",
  checklistTemplate: MULTIFAMILY_PROJECT_TEMPLATE,
  steps: [
    {
      stepNumber: 1,
      name: "Unit Identification",
      description: "Record building, floor, unit number, and sampling status",
      required: true,
      estimatedMinutes: 5,
    },
    {
      stepNumber: 2,
      name: "Party Wall Inspection",
      description: "Check air sealing between units and to corridors",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 3,
      name: "Blower Door Test",
      description: "Test this specific unit for air tightness",
      required: true,
      navigationTarget: "/blower-door-test",
      estimatedMinutes: 40,
    },
    {
      stepNumber: 4,
      name: "HVAC & Ventilation",
      description: "Verify HVAC and ventilation for unit",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 5,
      name: "Documentation",
      description: "Complete documentation and builder signature",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Unit Blower Door Test",
      description: "Per multifamily requirements",
      navigationTarget: "/blower-door-test",
    },
  ],
  estimatedDuration: 90,
  requiredPhotos: ["Party Wall", "Equipment", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// ENERGY STAR
// ============================================================================
export const ENERGY_STAR_WORKFLOW: WorkflowTemplate = {
  jobType: "energy_star",
  displayName: "Energy Star Certification",
  description: "Energy Star certification inspection and testing",
  checklistTemplate: FINAL_TESTING_TEMPLATE, // Use comprehensive final testing
  steps: [
    {
      stepNumber: 1,
      name: "Energy Star Requirements Review",
      description: "Review Energy Star specific requirements for this home",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Visual Inspection",
      description: "Complete comprehensive visual inspection",
      required: true,
      estimatedMinutes: 30,
    },
    {
      stepNumber: 3,
      name: "Performance Testing",
      description: "Blower door, duct leakage, and ventilation tests",
      required: true,
      estimatedMinutes: 120,
    },
    {
      stepNumber: 4,
      name: "Energy Star Documentation",
      description: "Complete Energy Star specific documentation and certification forms",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 5,
      name: "Builder Signature & Certification",
      description: "Obtain builder signature and submit certification",
      required: true,
      estimatedMinutes: 15,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Blower Door Test",
      description: "Must meet Energy Star air leakage requirements",
      navigationTarget: "/blower-door-test",
    },
    {
      testType: "duct_leakage",
      name: "Duct Leakage Test",
      description: "Must meet Energy Star duct leakage requirements",
      navigationTarget: "/duct-leakage-test",
    },
    {
      testType: "ventilation",
      name: "Ventilation Test",
      description: "ASHRAE 62.2 compliance required for Energy Star",
      navigationTarget: "/ventilation-test",
    },
  ],
  estimatedDuration: 200, // ~3.5 hours
  requiredPhotos: ["Equipment", "Test Setup", "Data Plate", "Energy Star Label", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
  guidanceNotes: "Energy Star requires all three tests and comprehensive documentation.",
};

// ============================================================================
// REHAB
// ============================================================================
export const REHAB_WORKFLOW: WorkflowTemplate = {
  jobType: "rehab",
  displayName: "Rehabilitation Inspection",
  description: "Inspection for rehabilitation/retrofit projects",
  checklistTemplate: FINAL_TESTING_TEMPLATE, // Use final testing as base
  steps: [
    {
      stepNumber: 1,
      name: "Pre-Retrofit Documentation",
      description: "Document existing conditions before work",
      required: true,
      estimatedMinutes: 20,
    },
    {
      stepNumber: 2,
      name: "Retrofit Work Review",
      description: "Review completed retrofit work (insulation, air sealing, HVAC)",
      required: true,
      estimatedMinutes: 40,
    },
    {
      stepNumber: 3,
      name: "Performance Testing",
      description: "Test to verify improvements",
      required: true,
      estimatedMinutes: 90,
    },
    {
      stepNumber: 4,
      name: "Documentation & Signature",
      description: "Document improvements, obtain signature",
      required: true,
      estimatedMinutes: 20,
    },
  ],
  requiredTests: [
    {
      testType: "blower_door",
      name: "Post-Retrofit Blower Door Test",
      description: "Verify air sealing improvements",
      navigationTarget: "/blower-door-test",
    },
  ],
  estimatedDuration: 170,
  requiredPhotos: ["Before", "After", "Equipment", "General"],
  completionRequirements: {
    allChecklistItemsCompleted: true,
    allRequiredTestsCompleted: true,
    builderSignatureRequired: true,
    photoUploadRequired: true,
  },
};

// ============================================================================
// OTHER - Generic/Custom
// ============================================================================
export const OTHER_WORKFLOW: WorkflowTemplate = {
  jobType: "other",
  displayName: "Custom Inspection",
  description: "Generic inspection workflow for custom or undefined job types",
  checklistTemplate: FINAL_TESTING_TEMPLATE, // Use final testing as default
  steps: [
    {
      stepNumber: 1,
      name: "Site Arrival & Review",
      description: "Review scope of work with builder",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 2,
      name: "Inspection",
      description: "Complete inspection per scope",
      required: true,
      estimatedMinutes: 60,
    },
    {
      stepNumber: 3,
      name: "Documentation",
      description: "Photo documentation and notes",
      required: true,
      estimatedMinutes: 15,
    },
    {
      stepNumber: 4,
      name: "Builder Review & Signature",
      description: "Review findings and obtain signature",
      required: true,
      estimatedMinutes: 10,
    },
  ],
  requiredTests: [],
  estimatedDuration: 100,
  requiredPhotos: ["General"],
  completionRequirements: {
    allChecklistItemsCompleted: false, // Flexible for custom jobs
    allRequiredTestsCompleted: false,
    builderSignatureRequired: true,
    photoUploadRequired: false,
  },
};

// ============================================================================
// Workflow Registry - Maps job types to templates
// ============================================================================
export const WORKFLOW_TEMPLATES: Record<JobType, WorkflowTemplate> = {
  sv2: SV2_WORKFLOW,
  full_test: FULL_TEST_WORKFLOW,
  code_bdoor: CODE_BDOOR_WORKFLOW,
  rough_duct: ROUGH_DUCT_WORKFLOW,
  rehab: REHAB_WORKFLOW,
  bdoor_retest: BDOOR_RETEST_WORKFLOW,
  multifamily: MULTIFAMILY_WORKFLOW,
  energy_star: ENERGY_STAR_WORKFLOW,
  other: OTHER_WORKFLOW,
};

/**
 * Get workflow template for a job type
 */
export function getWorkflowTemplate(jobType: JobType): WorkflowTemplate {
  return WORKFLOW_TEMPLATES[jobType] || OTHER_WORKFLOW;
}

/**
 * Get checklist template for a job type (for backwards compatibility)
 */
export function getChecklistForJobType(jobType: JobType): ChecklistTemplate {
  const workflow = getWorkflowTemplate(jobType);
  return workflow.checklistTemplate;
}

/**
 * Check if a job type requires specific test
 */
export function requiresTest(jobType: JobType, testType: "blower_door" | "duct_leakage" | "ventilation"): boolean {
  const workflow = getWorkflowTemplate(jobType);
  return workflow.requiredTests.some(test => test.testType === testType);
}

/**
 * Get required tests for a job type
 */
export function getRequiredTests(jobType: JobType): RequiredTest[] {
  const workflow = getWorkflowTemplate(jobType);
  return workflow.requiredTests;
}

/**
 * Get current workflow step based on completion status
 */
export function getCurrentStep(
  jobType: JobType,
  checklistProgress: { completed: number; total: number },
  testsCompleted: Set<string>
): WorkflowStep | null {
  const workflow = getWorkflowTemplate(jobType);
  
  // Find first incomplete step
  for (const step of workflow.steps) {
    // Simple heuristic: if checklist not done, we're in inspection phase
    if (step.name.toLowerCase().includes('checklist') || 
        step.name.toLowerCase().includes('inspection') ||
        step.name.toLowerCase().includes('review')) {
      if (checklistProgress.completed < checklistProgress.total) {
        return step;
      }
    }
    
    // Check if this is a test step that's not completed
    if (step.navigationTarget?.includes('test')) {
      const testType = step.navigationTarget.includes('blower') ? 'blower_door' :
                      step.navigationTarget.includes('duct') ? 'duct_leakage' :
                      step.navigationTarget.includes('ventilation') ? 'ventilation' : null;
      
      if (testType && !testsCompleted.has(testType)) {
        return step;
      }
    }
  }
  
  // All steps complete, return last step (signature/completion)
  return workflow.steps[workflow.steps.length - 1];
}
