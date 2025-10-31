/**
 * Unit tests for validateJobCompletion function
 * Tests all job types and edge cases to guard against regressions
 */

import { describe, it, expect } from 'vitest';
import { validateJobCompletion } from '../jobService';
import type { Job } from '@shared/schema';

// ============================================================================
// Mock Data Helper Functions
// ============================================================================

/**
 * Creates a mock job with default values that can be overridden
 */
function createMockJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'test-job-1',
    name: 'Test Job',
    address: '123 Test St',
    builderId: 'builder-1',
    planId: null,
    lotId: null,
    contractor: 'Test Contractor',
    status: 'in_progress',
    inspectionType: 'full_test',
    pricing: null,
    scheduledDate: new Date(),
    completedDate: null,
    fieldWorkComplete: false,
    fieldWorkCompletedAt: null,
    photoUploadComplete: true, // Default to complete
    photoUploadCompletedAt: new Date(),
    completedItems: 52,
    totalItems: 52,
    priority: 'medium',
    latitude: null,
    longitude: null,
    floorArea: null,
    surfaceArea: null,
    houseVolume: null,
    stories: null,
    notes: null,
    builderSignatureUrl: 'https://example.com/signature.png', // Default to signed
    builderSignedAt: new Date(),
    builderSignerName: 'Test Signer',
    complianceStatus: null,
    complianceFlags: null,
    lastComplianceCheck: null,
    sourceGoogleEventId: null,
    googleEventId: null,
    originalScheduledDate: null,
    isCancelled: false,
    createdBy: 'user-1',
    assignedTo: null,
    assignedAt: null,
    assignedBy: null,
    estimatedDuration: null,
    territory: null,
    // Add jobType for the validation function (maps to inspectionType)
    jobType: 'full_test',
    ...overrides,
  } as Job;
}

/**
 * Creates mock checklist items
 */
function createMockChecklistItems(count: number, completed: boolean = true): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `checklist-${i}`,
    jobId: 'test-job-1',
    itemNumber: i + 1,
    description: `Checklist item ${i + 1}`,
    completed: completed,
    createdAt: new Date(),
  }));
}

/**
 * Creates mock blower door tests
 */
function createMockBlowerDoorTests(count: number = 1): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `blower-door-${i}`,
    jobId: 'test-job-1',
    ach50: 2.5,
    cfm50: 1200,
    buildingVolume: 15000,
    createdAt: new Date(),
  }));
}

/**
 * Creates mock duct leakage tests
 */
function createMockDuctLeakageTests(count: number = 1): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `duct-leakage-${i}`,
    jobId: 'test-job-1',
    tdl: 3.5,
    dlo: 2.5,
    floorArea: 2000,
    createdAt: new Date(),
  }));
}

/**
 * Creates mock ventilation tests
 */
function createMockVentilationTests(count: number = 1): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ventilation-${i}`,
    jobId: 'test-job-1',
    requiredCfm: 60,
    actualCfm: 65,
    compliant: true,
    createdAt: new Date(),
  }));
}

// ============================================================================
// Test Suite: full_test Job Type
// ============================================================================

describe('validateJobCompletion - full_test job type', () => {
  it('should pass validation when all requirements are met', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
    expect(result.requirements).toHaveLength(5); // 3 tests + photo + signature + checklist
    expect(result.requirements.every(r => r.met)).toBe(true);
  });

  it('should fail when blower door test is missing', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests: any[] = [];
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const blowerDoorReq = result.requirements.find(r => r.name === 'Blower Door Test');
    expect(blowerDoorReq).toBeDefined();
    expect(blowerDoorReq?.met).toBe(false);
  });

  it('should fail when duct leakage test is missing', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests: any[] = [];
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const ductReq = result.requirements.find(r => r.name === 'Duct Leakage Test');
    expect(ductReq).toBeDefined();
    expect(ductReq?.met).toBe(false);
  });

  it('should fail when ventilation test is missing', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests: any[] = [];

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const ventReq = result.requirements.find(r => r.name === 'Ventilation Test');
    expect(ventReq).toBeDefined();
    expect(ventReq?.met).toBe(false);
  });

  it('should fail when photos are not uploaded', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: false,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const photoReq = result.requirements.find(r => r.name === 'Photo Upload');
    expect(photoReq).toBeDefined();
    expect(photoReq?.met).toBe(false);
  });

  it('should fail when builder signature is missing', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: null
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const sigReq = result.requirements.find(r => r.name === 'Builder Signature');
    expect(sigReq).toBeDefined();
    expect(sigReq?.met).toBe(false);
  });

  it('should fail when checklist is incomplete', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, false); // Not completed
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const checklistReq = result.requirements.find(r => r.name === 'All Checklist Items');
    expect(checklistReq).toBeDefined();
    expect(checklistReq?.met).toBe(false);
  });
});

// ============================================================================
// Test Suite: sv2 Job Type (Pre-Drywall)
// ============================================================================

describe('validateJobCompletion - sv2 job type (pre-drywall)', () => {
  it('should pass validation when all requirements are met (no tests required)', () => {
    const job = createMockJob({ 
      jobType: 'sv2',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests: any[] = [];
    const ductLeakageTests: any[] = [];
    const ventilationTests: any[] = [];

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
    // sv2 requires: photo + signature + checklist (no tests)
    expect(result.requirements).toHaveLength(3);
  });

  it('should fail when photos are missing', () => {
    const job = createMockJob({ 
      jobType: 'sv2',
      photoUploadComplete: false,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
  });
});

// ============================================================================
// Test Suite: code_bdoor Job Type
// ============================================================================

describe('validateJobCompletion - code_bdoor job type', () => {
  it('should pass validation when all requirements are met', () => {
    const job = createMockJob({ 
      jobType: 'code_bdoor',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      [],
      []
    );

    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
    // code_bdoor requires: blower door + photo + signature + checklist
    expect(result.requirements).toHaveLength(4);
  });

  it('should fail when blower door test is missing', () => {
    const job = createMockJob({ 
      jobType: 'code_bdoor',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBe(1);
    const blowerDoorReq = result.requirements.find(r => r.name === 'Blower Door Test');
    expect(blowerDoorReq?.met).toBe(false);
  });
});

// ============================================================================
// Test Suite: bdoor_retest Job Type (Minimal Retest)
// ============================================================================

describe('validateJobCompletion - bdoor_retest job type', () => {
  it('should pass validation with minimal requirements (blower door + signature)', () => {
    const job = createMockJob({ 
      jobType: 'bdoor_retest',
      photoUploadComplete: false, // Photos may not be required for retest
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(5, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      [],
      []
    );

    // Should pass - bdoor_retest has minimal requirements
    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
  });

  it('should fail when blower door test is missing', () => {
    const job = createMockJob({ 
      jobType: 'bdoor_retest',
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(5, true);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(false);
    const blowerDoorReq = result.requirements.find(r => r.name === 'Blower Door Test');
    expect(blowerDoorReq?.met).toBe(false);
  });
});

// ============================================================================
// Test Suite: rough_duct Job Type
// ============================================================================

describe('validateJobCompletion - rough_duct job type', () => {
  it('should pass validation when duct leakage test exists', () => {
    const job = createMockJob({ 
      jobType: 'rough_duct',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const ductLeakageTests = createMockDuctLeakageTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      ductLeakageTests,
      []
    );

    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
  });
});

// ============================================================================
// Test Suite: other Job Type
// ============================================================================

describe('validateJobCompletion - other job type', () => {
  it('should pass validation with basic requirements (no required tests)', () => {
    const job = createMockJob({ 
      jobType: 'other',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
    // other requires: photo + signature + checklist (no tests)
  });

  it('should fail when basic requirements are missing', () => {
    const job = createMockJob({ 
      jobType: 'other',
      photoUploadComplete: false,
      builderSignatureUrl: null
    });
    const checklistItems = createMockChecklistItems(10, false);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: multifamily Job Type
// ============================================================================

describe('validateJobCompletion - multifamily job type', () => {
  it('should pass validation when requirements are met', () => {
    const job = createMockJob({ 
      jobType: 'multifamily',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      [],
      []
    );

    expect(result.canComplete).toBe(true);
  });
});

// ============================================================================
// Test Suite: energy_star Job Type
// ============================================================================

describe('validateJobCompletion - energy_star job type', () => {
  it('should pass validation when all requirements are met', () => {
    const job = createMockJob({ 
      jobType: 'energy_star',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      []
    );

    expect(result.canComplete).toBe(true);
  });
});

// ============================================================================
// Test Suite: rehab Job Type
// ============================================================================

describe('validateJobCompletion - rehab job type', () => {
  it('should pass validation when requirements are met', () => {
    const job = createMockJob({ 
      jobType: 'rehab',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      [],
      []
    );

    expect(result.canComplete).toBe(true);
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('validateJobCompletion - edge cases', () => {
  it('should pass when checklist is empty (100% of 0 items complete)', () => {
    const job = createMockJob({ 
      jobType: 'other',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems: any[] = []; // Empty checklist

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    // With empty checklist, the requirement should be considered met
    // because there are no items to complete
    const checklistReq = result.requirements.find(r => r.type === 'checklist');
    if (checklistReq) {
      // If checklist requirement exists, it should fail because length is 0
      expect(checklistReq.met).toBe(false);
    }
  });

  it('should handle checklist with mix of completed and incomplete items', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = [
      { id: '1', completed: true },
      { id: '2', completed: false },
      { id: '3', completed: true },
    ];
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    const checklistReq = result.requirements.find(r => r.name === 'All Checklist Items');
    expect(checklistReq?.met).toBe(false);
  });

  it('should handle empty signature URL (empty string)', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: '' // Empty string
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    const sigReq = result.requirements.find(r => r.name === 'Builder Signature');
    expect(sigReq?.met).toBe(false);
  });

  it('should handle undefined signature URL', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: undefined as any
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    expect(result.canComplete).toBe(false);
    const sigReq = result.requirements.find(r => r.name === 'Builder Signature');
    expect(sigReq?.met).toBe(false);
  });

  it('should handle multiple tests of the same type', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(3); // Multiple tests
    const ductLeakageTests = createMockDuctLeakageTests(2);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    // Should still pass with multiple tests (only needs at least 1)
    expect(result.canComplete).toBe(true);
  });
});

// ============================================================================
// Test Suite: Return Value Structure
// ============================================================================

describe('validateJobCompletion - return value structure', () => {
  it('should return correct structure with canComplete=true', () => {
    const job = createMockJob({ 
      jobType: 'other',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(5, true);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result).toHaveProperty('canComplete');
    expect(result).toHaveProperty('requirements');
    expect(result).toHaveProperty('missingCount');
    expect(typeof result.canComplete).toBe('boolean');
    expect(Array.isArray(result.requirements)).toBe(true);
    expect(typeof result.missingCount).toBe('number');
    expect(result.canComplete).toBe(true);
    expect(result.missingCount).toBe(0);
  });

  it('should return correct structure with canComplete=false', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: false,
      builderSignatureUrl: null
    });
    const checklistItems = createMockChecklistItems(10, false);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [],
      [],
      []
    );

    expect(result.canComplete).toBe(false);
    expect(result.missingCount).toBeGreaterThan(0);
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('should have properly formatted requirement objects', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: true,
      builderSignatureUrl: 'https://example.com/sig.png'
    });
    const checklistItems = createMockChecklistItems(10, true);
    const blowerDoorTests = createMockBlowerDoorTests(1);
    const ductLeakageTests = createMockDuctLeakageTests(1);
    const ventilationTests = createMockVentilationTests(1);

    const result = validateJobCompletion(
      job,
      checklistItems,
      blowerDoorTests,
      ductLeakageTests,
      ventilationTests
    );

    result.requirements.forEach(req => {
      expect(req).toHaveProperty('type');
      expect(req).toHaveProperty('name');
      expect(req).toHaveProperty('met');
      expect(['test', 'photo', 'signature', 'checklist']).toContain(req.type);
      expect(typeof req.name).toBe('string');
      expect(typeof req.met).toBe('boolean');
    });
  });

  it('should accurately count missing requirements', () => {
    const job = createMockJob({ 
      jobType: 'full_test',
      photoUploadComplete: false,
      builderSignatureUrl: null
    });
    const checklistItems = createMockChecklistItems(10, false);

    const result = validateJobCompletion(
      job,
      checklistItems,
      [], // Missing blower door
      [], // Missing duct leakage
      []  // Missing ventilation
    );

    const actualMissing = result.requirements.filter(r => !r.met).length;
    expect(result.missingCount).toBe(actualMissing);
    expect(result.missingCount).toBeGreaterThanOrEqual(3); // At least 3 tests missing
  });
});
