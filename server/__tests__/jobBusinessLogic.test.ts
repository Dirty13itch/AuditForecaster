/**
 * Jobs Business Logic - Comprehensive Unit Tests
 * 
 * Tests all job-related business logic including:
 * - Status transitions
 * - Date validations
 * - Field validations
 * - Compliance status aggregation
 * - Job creation logic
 * - Job update logic
 * 
 * Coverage: 50+ test cases
 */

import { describe, it, expect } from 'vitest';
import {
  validateJobStatusTransition,
  validateJobDates,
  validateJobFields,
  aggregateComplianceStatus,
  validateJobCreation,
  validateJobUpdate,
  type JobStatus,
  type ComplianceTests,
} from '../jobService';
import type { Job, InsertJob } from '@shared/schema';

describe('Jobs Business Logic', () => {
  // ============================================================================
  // 1. JOB STATUS TRANSITIONS (18 test cases)
  // ============================================================================
  describe('Status Transitions', () => {
    it('allows valid transition from pending to scheduled', () => {
      const result = validateJobStatusTransition('pending', 'scheduled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from scheduled to in_progress', () => {
      const result = validateJobStatusTransition('scheduled', 'in_progress');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from in_progress to completed', () => {
      const result = validateJobStatusTransition('in_progress', 'completed');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from in_progress to review', () => {
      const result = validateJobStatusTransition('in_progress', 'review');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from completed to review (compliance failure scenario)', () => {
      const result = validateJobStatusTransition('completed', 'review');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from review to in_progress (after fixes)', () => {
      const result = validateJobStatusTransition('review', 'in_progress');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows valid transition from review to completed (after approval)', () => {
      const result = validateJobStatusTransition('review', 'completed');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancellation from pending status', () => {
      const result = validateJobStatusTransition('pending', 'cancelled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancellation from scheduled status', () => {
      const result = validateJobStatusTransition('scheduled', 'cancelled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancellation from in_progress status', () => {
      const result = validateJobStatusTransition('in_progress', 'cancelled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancellation from completed status', () => {
      const result = validateJobStatusTransition('completed', 'cancelled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows cancellation from review status', () => {
      const result = validateJobStatusTransition('review', 'cancelled');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('prevents invalid transition from pending to completed', () => {
      const result = validateJobStatusTransition('pending', 'completed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
      expect(result.error).toContain('pending');
      expect(result.error).toContain('completed');
    });

    it('prevents invalid transition from pending to in_progress', () => {
      const result = validateJobStatusTransition('pending', 'in_progress');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('prevents invalid transition from scheduled to completed', () => {
      const result = validateJobStatusTransition('scheduled', 'completed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('prevents any transition from cancelled (terminal state)', () => {
      const result = validateJobStatusTransition('cancelled', 'in_progress');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('allows same-status transition (no-op)', () => {
      const statuses: JobStatus[] = ['pending', 'scheduled', 'in_progress', 'completed', 'review', 'cancelled'];
      statuses.forEach(status => {
        const result = validateJobStatusTransition(status, status);
        expect(result.valid).toBe(true);
      });
    });

    it('prevents invalid transition from cancelled to completed', () => {
      const result = validateJobStatusTransition('cancelled', 'completed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  // ============================================================================
  // 2. DATE VALIDATIONS (14 test cases)
  // ============================================================================
  describe('Date Validations', () => {
    it('prevents scheduledDate in the past when creating new job', () => {
      const pastDate = new Date('2020-01-01');
      const result = validateJobDates({ 
        scheduledDate: pastDate,
        isNewJob: true 
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be in the past');
    });

    it('allows scheduledDate today when creating new job', () => {
      const today = new Date();
      const result = validateJobDates({ 
        scheduledDate: today,
        isNewJob: true 
      });
      expect(result.valid).toBe(true);
    });

    it('allows scheduledDate in future when creating new job', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const result = validateJobDates({ 
        scheduledDate: futureDate,
        isNewJob: true 
      });
      expect(result.valid).toBe(true);
    });

    it('allows scheduledDate in past for existing jobs (reschedules)', () => {
      const pastDate = new Date('2020-01-01');
      const result = validateJobDates({ 
        scheduledDate: pastDate,
        isNewJob: false 
      });
      expect(result.valid).toBe(true);
    });

    it('prevents completedDate before scheduledDate', () => {
      const scheduledDate = new Date('2025-12-01');
      const completedDate = new Date('2025-11-01');
      const result = validateJobDates({ 
        scheduledDate, 
        completedDate,
        status: 'completed'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be before scheduled date');
    });

    it('allows completedDate same as scheduledDate', () => {
      const sameDate = new Date('2025-12-01');
      const result = validateJobDates({ 
        scheduledDate: sameDate, 
        completedDate: sameDate,
        status: 'completed'
      });
      expect(result.valid).toBe(true);
    });

    it('allows completedDate after scheduledDate', () => {
      const scheduledDate = new Date('2025-12-01');
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        scheduledDate, 
        completedDate,
        status: 'completed'
      });
      expect(result.valid).toBe(true);
    });

    it('prevents completedDate when status is pending', () => {
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        completedDate,
        status: 'pending'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only be set when status is');
      expect(result.error).toContain('pending');
    });

    it('prevents completedDate when status is scheduled', () => {
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        completedDate,
        status: 'scheduled'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only be set when status is');
    });

    it('prevents completedDate when status is in_progress', () => {
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        completedDate,
        status: 'in_progress'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only be set when status is');
    });

    it('allows completedDate when status is completed', () => {
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        completedDate,
        status: 'completed'
      });
      expect(result.valid).toBe(true);
    });

    it('allows completedDate when status is review', () => {
      const completedDate = new Date('2025-12-05');
      const result = validateJobDates({ 
        completedDate,
        status: 'review'
      });
      expect(result.valid).toBe(true);
    });

    it('allows null dates', () => {
      const result = validateJobDates({ 
        scheduledDate: null,
        completedDate: null
      });
      expect(result.valid).toBe(true);
    });

    it('allows undefined dates', () => {
      const result = validateJobDates({});
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // 3. JOB FIELD VALIDATIONS (12 test cases)
  // ============================================================================
  describe('Field Validations', () => {
    it('validates required field: name', () => {
      const result = validateJobFields({ name: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('validates required field: address', () => {
      const result = validateJobFields({ address: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('address is required');
    });

    it('validates required field: builderId', () => {
      const result = validateJobFields({ builderId: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Builder ID is required');
    });

    it('validates required field: contractor', () => {
      const result = validateJobFields({ contractor: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Contractor is required');
    });

    it('validates required field: inspectionType', () => {
      const result = validateJobFields({ inspectionType: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Inspection type is required');
    });

    it('validates address must include street number', () => {
      const result = validateJobFields({ address: 'Main Street' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must include a street number');
    });

    it('accepts valid address with street number', () => {
      const result = validateJobFields({ address: '123 Main Street, Minneapolis, MN 55401' });
      expect(result.valid).toBe(true);
    });

    it('validates inspectionType must be valid enum value', () => {
      const result = validateJobFields({ inspectionType: 'InvalidType' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid inspection type');
    });

    it('accepts valid inspection types', () => {
      const validTypes = ['Rough', 'Final', 'Insulation', 'HVAC', 'Blower Door', 'Duct Leakage', 'Ventilation', 'Re-inspection', 'Other'];
      validTypes.forEach(type => {
        const result = validateJobFields({ inspectionType: type });
        expect(result.valid).toBe(true);
      });
    });

    it('validates notes field length limit', () => {
      const longNotes = 'x'.repeat(5001);
      const result = validateJobFields({ notes: longNotes });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 5000 characters');
    });

    it('validates name field length limit', () => {
      const longName = 'x'.repeat(256);
      const result = validateJobFields({ name: longName });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 255 characters');
    });

    it('validates address field length limit', () => {
      const longAddress = 'x'.repeat(501);
      const result = validateJobFields({ address: longAddress });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 500 characters');
    });
  });

  // ============================================================================
  // 4. COMPLIANCE STATUS AGGREGATION (12 test cases)
  // ============================================================================
  describe('Compliance Status Aggregation', () => {
    it('sets compliance to pending when no tests completed', () => {
      const tests: ComplianceTests = { 
        blowerDoor: null, 
        ductLeakage: null, 
        ventilation: null 
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('pending');
    });

    it('sets compliance to compliant when all tests pass', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: true },
        ventilation: { compliant: true }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('compliant');
    });

    it('sets compliance to non_compliant when blower door fails', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: false },
        ductLeakage: { compliant: true },
        ventilation: { compliant: true }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('sets compliance to non_compliant when duct leakage fails', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: false },
        ventilation: { compliant: true }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('sets compliance to non_compliant when ventilation fails', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: true },
        ventilation: { compliant: false }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('sets compliance to non_compliant when multiple tests fail', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: false },
        ductLeakage: { compliant: false },
        ventilation: { compliant: true }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('sets compliance to non_compliant when all tests fail', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: false },
        ductLeakage: { compliant: false },
        ventilation: { compliant: false }
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('sets compliance to pending when only one test completed and passing', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: null,
        ventilation: null
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('pending');
    });

    it('sets compliance to pending when two tests completed and passing', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: true },
        ventilation: null
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('pending');
    });

    it('sets compliance to non_compliant even with incomplete tests if any fail', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: false },
        ductLeakage: null,
        ventilation: null
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('handles mixed scenario: one pass, one fail, one pending', () => {
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: false },
        ventilation: null
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('non_compliant');
    });

    it('handles edge case: all tests pending (null)', () => {
      const tests: ComplianceTests = {
        blowerDoor: null,
        ductLeakage: null,
        ventilation: null
      };
      const result = aggregateComplianceStatus(tests);
      expect(result).toBe('pending');
    });
  });

  // ============================================================================
  // 5. JOB CREATION LOGIC (8 test cases)
  // ============================================================================
  describe('Job Creation Logic', () => {
    const validJobData: Partial<InsertJob> = {
      name: 'New Construction - Lot 42',
      address: '123 Oak Street, Minneapolis, MN 55401',
      contractor: 'Pulte Homes',
      builderId: 'builder-123',
      inspectionType: 'Final',
      status: 'pending',
    };

    it('validates successful job creation with all required fields', () => {
      const result = validateJobCreation(validJobData);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects job creation with missing name', () => {
      const invalidData = { ...validJobData };
      delete invalidData.name;
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: name');
    });

    it('rejects job creation with missing address', () => {
      const invalidData = { ...validJobData };
      delete invalidData.address;
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: address');
    });

    it('rejects job creation with missing contractor', () => {
      const invalidData = { ...validJobData };
      delete invalidData.contractor;
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: contractor');
    });

    it('rejects job creation with missing inspectionType', () => {
      const invalidData = { ...validJobData };
      delete invalidData.inspectionType;
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field: inspectionType');
    });

    it('rejects job creation with invalid status', () => {
      const invalidData = { ...validJobData, status: 'invalid-status' as any };
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('rejects job creation with scheduled date in past', () => {
      const pastDate = new Date('2020-01-01');
      const invalidData = { ...validJobData, scheduledDate: pastDate };
      const result = validateJobCreation(invalidData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be in the past');
    });

    it('accepts job creation with optional fields', () => {
      const extendedData = {
        ...validJobData,
        notes: 'Special instructions for this inspection',
        scheduledDate: new Date('2025-12-15'),
        priority: 'high' as const,
      };
      const result = validateJobCreation(extendedData);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // 6. JOB UPDATE LOGIC (8 test cases)
  // ============================================================================
  describe('Job Update Logic', () => {
    const currentJob: Job = {
      id: 'job-123',
      name: 'Existing Job',
      address: '456 Pine Street, Minneapolis, MN 55402',
      contractor: 'M/I Homes',
      builderId: 'builder-456',
      status: 'scheduled',
      inspectionType: 'Final',
      scheduledDate: new Date('2025-12-15'),
      completedDate: null,
      completedItems: 0,
      totalItems: 52,
      priority: 'medium',
      latitude: null,
      longitude: null,
      floorArea: null,
      surfaceArea: null,
      houseVolume: null,
      stories: null,
      notes: null,
      builderSignatureUrl: null,
      builderSignedAt: null,
      builderSignerName: null,
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
      planId: null,
      lotId: null,
      pricing: null,
    };

    it('allows updating single field (notes)', () => {
      const updates = { notes: 'Updated inspection notes' };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(true);
    });

    it('allows updating multiple fields', () => {
      const updates = {
        notes: 'Updated notes',
        priority: 'high' as const,
        estimatedDuration: 120,
      };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(true);
    });

    it('allows valid status transition in update', () => {
      const updates = { status: 'in_progress' as JobStatus };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(true);
    });

    it('prevents invalid status transition in update', () => {
      const updates = { status: 'completed' as JobStatus };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('prevents updating job ID', () => {
      const updates = { id: 'different-job-id' };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot update job ID');
    });

    it('validates date constraints when updating dates', () => {
      // Use a job in 'in_progress' status which can transition to 'completed'
      const jobInProgress = { ...currentJob, status: 'in_progress' as JobStatus };
      const updates = {
        completedDate: new Date('2025-12-10'), // Before scheduled date (Dec 15)
        status: 'completed' as JobStatus,
      };
      const result = validateJobUpdate(jobInProgress, updates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be before scheduled date');
    });

    it('validates field constraints when updating fields', () => {
      const updates = {
        inspectionType: 'InvalidType',
      };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid inspection type');
    });

    it('allows no-op update (same values)', () => {
      const updates = {
        status: 'scheduled' as JobStatus,
        name: 'Existing Job',
      };
      const result = validateJobUpdate(currentJob, updates);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // ADDITIONAL EDGE CASES AND INTEGRATION SCENARIOS (2 test cases)
  // ============================================================================
  describe('Edge Cases and Integration', () => {
    it('handles complete job lifecycle validation', () => {
      // Test a complete workflow from creation to completion
      const newJob: Partial<InsertJob> = {
        name: 'Complete Lifecycle Test',
        address: '789 Elm Street, Minneapolis, MN 55403',
        contractor: 'Lennar Homes',
        builderId: 'builder-789',
        inspectionType: 'Final',
        status: 'pending',
        scheduledDate: new Date('2025-12-20'),
      };

      // Validate creation
      const createResult = validateJobCreation(newJob);
      expect(createResult.valid).toBe(true);

      // Simulate transitions: pending → scheduled → in_progress → completed
      const transition1 = validateJobStatusTransition('pending', 'scheduled');
      expect(transition1.valid).toBe(true);

      const transition2 = validateJobStatusTransition('scheduled', 'in_progress');
      expect(transition2.valid).toBe(true);

      const transition3 = validateJobStatusTransition('in_progress', 'completed');
      expect(transition3.valid).toBe(true);

      // Validate completion with date
      const completionDate = new Date('2025-12-21');
      const dateValidation = validateJobDates({
        scheduledDate: newJob.scheduledDate,
        completedDate: completionDate,
        status: 'completed',
      });
      expect(dateValidation.valid).toBe(true);
    });

    it('handles compliance failure triggering review status', () => {
      // Test scenario: completed job with failing compliance goes to review
      const completedJob: Job = {
        id: 'job-compliance-test',
        name: 'Compliance Test Job',
        address: '321 Birch Avenue, St. Paul, MN 55104',
        contractor: 'DR Horton',
        builderId: 'builder-321',
        status: 'completed',
        inspectionType: 'Final',
        scheduledDate: new Date('2025-11-20'),
        completedDate: new Date('2025-11-21'),
        completedItems: 52,
        totalItems: 52,
        priority: 'high',
        latitude: null,
        longitude: null,
        floorArea: null,
        surfaceArea: null,
        houseVolume: null,
        stories: null,
        notes: null,
        builderSignatureUrl: null,
        builderSignedAt: null,
        builderSignerName: null,
        complianceStatus: 'non_compliant',
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
        planId: null,
        lotId: null,
        pricing: null,
      };

      // Validate transition from completed to review
      const reviewTransition = validateJobStatusTransition('completed', 'review');
      expect(reviewTransition.valid).toBe(true);

      // Validate the update
      const updates = { status: 'review' as JobStatus };
      const updateResult = validateJobUpdate(completedJob, updates);
      expect(updateResult.valid).toBe(true);

      // Verify compliance status shows non-compliant
      const tests: ComplianceTests = {
        blowerDoor: { compliant: true },
        ductLeakage: { compliant: false }, // Failed test
        ventilation: { compliant: true },
      };
      const complianceResult = aggregateComplianceStatus(tests);
      expect(complianceResult).toBe('non_compliant');
    });
  });
});
