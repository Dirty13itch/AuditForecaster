/**
 * Job Business Logic Service
 * 
 * Contains validation and business logic for job management
 * including status transitions, date validations, and field validations
 */

import type { Job, InsertJob } from "@shared/schema";
import { serverLogger } from "./logger";
import { getWorkflowTemplate, type JobType } from '@shared/workflowTemplates';

// Job status type from schema
export type JobStatus = 'scheduled' | 'done' | 'failed' | 'reschedule' | 'cancelled';

// Validation result type
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Test result types for compliance aggregation
export interface TestResult {
  compliant: boolean;
}

export interface ComplianceTests {
  blowerDoor: TestResult | null;
  ductLeakage: TestResult | null;
  ventilation: TestResult | null;
}

/**
 * Status Transition Validation
 * 
 * Valid transitions:
 * - scheduled → done (job completed successfully)
 * - scheduled → failed (job failed or needs rework)
 * - scheduled → reschedule (job needs to be rescheduled)
 * - scheduled → cancelled (job cancelled)
 * - done → reschedule (completed job needs to be redone)
 * - failed → reschedule (failed job gets rescheduled)
 * - reschedule → scheduled (rescheduled job becomes scheduled again)
 * - cancelled is terminal (cannot transition from cancelled)
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  scheduled: ['done', 'failed', 'reschedule', 'cancelled'],
  done: ['reschedule'], // Can reschedule completed jobs
  failed: ['reschedule'], // Can reschedule failed jobs
  reschedule: ['scheduled'], // Rescheduled becomes scheduled again
  cancelled: [], // Terminal state - cannot transition from cancelled
};

/**
 * Validates a job status transition
 */
export function validateJobStatusTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus
): ValidationResult {
  // Allow same status (no-op)
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (allowedTransitions.includes(newStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
  };
}

/**
 * Date Validation
 */
export interface JobDates {
  scheduledDate?: Date | null;
  completedDate?: Date | null;
  status?: JobStatus;
  isNewJob?: boolean;
}

/**
 * Validates job dates
 */
export function validateJobDates(dates: JobDates): ValidationResult {
  const { scheduledDate, completedDate, status, isNewJob = false } = dates;

  // Scheduled date validation
  if (scheduledDate) {
    // For new jobs, scheduled date cannot be in the past (allow same day)
    if (isNewJob) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const schedDate = new Date(scheduledDate);
      schedDate.setHours(0, 0, 0, 0);

      if (schedDate < today) {
        return {
          valid: false,
          error: 'Scheduled date cannot be in the past',
        };
      }
    }
  }

  // Completed date validation
  if (completedDate) {
    // Completed date can only be set when status is done or failed
    if (status && status !== 'done' && status !== 'failed') {
      return {
        valid: false,
        error: `Completed date can only be set when status is 'done' or 'failed', not '${status}'`,
      };
    }

    // Completed date cannot be before scheduled date
    if (scheduledDate) {
      const schedDate = new Date(scheduledDate);
      schedDate.setHours(0, 0, 0, 0);
      const compDate = new Date(completedDate);
      compDate.setHours(0, 0, 0, 0);

      if (compDate < schedDate) {
        return {
          valid: false,
          error: 'Completed date cannot be before scheduled date',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Field Validation
 */
export interface JobFields {
  name?: string;
  address?: string;
  builderId?: string;
  inspectionType?: string;
  notes?: string;
  contractor?: string;
}

const VALID_INSPECTION_TYPES = [
  'Rough',
  'Final',
  'Insulation',
  'HVAC',
  'Blower Door',
  'Duct Leakage',
  'Ventilation',
  'Re-inspection',
  'Other',
];

const MAX_NOTES_LENGTH = 5000;
const MAX_NAME_LENGTH = 255;
const MAX_ADDRESS_LENGTH = 500;

/**
 * Validates job fields
 */
export function validateJobFields(fields: JobFields): ValidationResult {
  // Name validation
  if (fields.name !== undefined) {
    if (!fields.name || fields.name.trim().length === 0) {
      return {
        valid: false,
        error: 'Job name is required',
      };
    }
    if (fields.name.length > MAX_NAME_LENGTH) {
      return {
        valid: false,
        error: `Job name cannot exceed ${MAX_NAME_LENGTH} characters`,
      };
    }
  }

  // Address validation
  if (fields.address !== undefined) {
    if (!fields.address || fields.address.trim().length === 0) {
      return {
        valid: false,
        error: 'Job address is required',
      };
    }
    if (fields.address.length > MAX_ADDRESS_LENGTH) {
      return {
        valid: false,
        error: `Job address cannot exceed ${MAX_ADDRESS_LENGTH} characters`,
      };
    }
    // Basic address format check - should have at least a number and street
    const addressPattern = /\d+.+/;
    if (!addressPattern.test(fields.address.trim())) {
      return {
        valid: false,
        error: 'Address must include a street number',
      };
    }
  }

  // Builder ID validation (basic check that it's not empty)
  if (fields.builderId !== undefined) {
    if (!fields.builderId || fields.builderId.trim().length === 0) {
      return {
        valid: false,
        error: 'Builder ID is required',
      };
    }
  }

  // Contractor validation
  if (fields.contractor !== undefined) {
    if (!fields.contractor || fields.contractor.trim().length === 0) {
      return {
        valid: false,
        error: 'Contractor is required',
      };
    }
  }

  // Inspection type validation
  if (fields.inspectionType !== undefined) {
    if (!fields.inspectionType || fields.inspectionType.trim().length === 0) {
      return {
        valid: false,
        error: 'Inspection type is required',
      };
    }
    if (!VALID_INSPECTION_TYPES.includes(fields.inspectionType)) {
      return {
        valid: false,
        error: `Invalid inspection type. Must be one of: ${VALID_INSPECTION_TYPES.join(', ')}`,
      };
    }
  }

  // Notes validation
  if (fields.notes !== undefined && fields.notes !== null) {
    if (fields.notes.length > MAX_NOTES_LENGTH) {
      return {
        valid: false,
        error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Compliance Status Aggregation
 * 
 * Determines overall compliance status based on individual test results
 */
export function aggregateComplianceStatus(tests: ComplianceTests): 'pending' | 'compliant' | 'non_compliant' {
  const { blowerDoor, ductLeakage, ventilation } = tests;

  // If no tests have been completed, status is pending
  if (!blowerDoor && !ductLeakage && !ventilation) {
    return 'pending';
  }

  // If any test is non-compliant, overall status is non-compliant
  if (blowerDoor && !blowerDoor.compliant) {
    return 'non_compliant';
  }
  if (ductLeakage && !ductLeakage.compliant) {
    return 'non_compliant';
  }
  if (ventilation && !ventilation.compliant) {
    return 'non_compliant';
  }

  // If all completed tests are compliant, but not all tests are done, status is pending
  const completedTests = [blowerDoor, ductLeakage, ventilation].filter(t => t !== null).length;
  if (completedTests < 3) {
    return 'pending';
  }

  // All tests completed and all are compliant
  return 'compliant';
}

/**
 * Job Creation Validation
 * 
 * Validates all required fields for creating a new job
 */
export function validateJobCreation(job: Partial<InsertJob>): ValidationResult {
  // Required fields check
  const requiredFields = ['name', 'address', 'contractor', 'inspectionType'];
  
  for (const field of requiredFields) {
    if (!job[field as keyof InsertJob]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`,
      };
    }
  }

  // Validate individual fields
  const fieldValidation = validateJobFields({
    name: job.name,
    address: job.address,
    builderId: job.builderId,
    inspectionType: job.inspectionType,
    notes: job.notes,
    contractor: job.contractor,
  });

  if (!fieldValidation.valid) {
    return fieldValidation;
  }

  // Validate dates if provided
  const dateValidation = validateJobDates({
    scheduledDate: job.scheduledDate,
    completedDate: job.completedDate,
    status: (job.status as JobStatus) || 'scheduled',
    isNewJob: true,
  });

  if (!dateValidation.valid) {
    return dateValidation;
  }

  // Validate status if provided
  if (job.status) {
    const validStatuses: JobStatus[] = ['scheduled', 'done', 'failed', 'reschedule', 'cancelled'];
    if (!validStatuses.includes(job.status as JobStatus)) {
      return {
        valid: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Completion Requirement Type
 * Represents a single requirement for job completion
 */
export interface CompletionRequirement {
  type: 'test' | 'photo' | 'signature' | 'checklist';
  name: string;
  met: boolean;
}

/**
 * Completion Validation Result
 * Contains overall validation status and detailed requirements
 */
export interface CompletionValidation {
  canComplete: boolean;
  requirements: CompletionRequirement[];
  missingCount: number;
}

/**
 * Validates that a job meets all workflow requirements before completion
 * Returns detailed validation with list of missing requirements
 * 
 * @param job - The job being validated for completion
 * @param checklistItems - Array of checklist items with completed status
 * @param blowerDoorTests - Array of blower door test records
 * @param ductLeakageTests - Array of duct leakage test records
 * @param ventilationTests - Array of ventilation test records
 * @returns CompletionValidation with canComplete status and detailed requirements
 */
export function validateJobCompletion(
  job: Job,
  checklistItems: any[],
  blowerDoorTests: any[],
  ductLeakageTests: any[],
  ventilationTests: any[]
): CompletionValidation {
  const requirements: CompletionRequirement[] = [];
  
  // Get workflow template for this job type
  // Map job.jobType to WorkflowTemplate JobType - default to 'other' if not found
  const jobTypeMapping: Record<string, JobType> = {
    'sv2': 'sv2',
    'full_test': 'full_test',
    'code_bdoor': 'code_bdoor',
    'rough_duct': 'rough_duct',
    'rehab': 'rehab',
    'bdoor_retest': 'bdoor_retest',
    'multifamily': 'multifamily',
    'energy_star': 'energy_star',
  };
  
  const mappedJobType = jobTypeMapping[job.jobType || ''] || 'other';
  const template = getWorkflowTemplate(mappedJobType);
  const { completionRequirements, requiredTests } = template;

  // Check required tests
  if (completionRequirements.allRequiredTestsCompleted) {
    // Check for blower door test
    const needsBlowerDoor = requiredTests.some(t => t.testType === 'blower_door');
    if (needsBlowerDoor) {
      const hasBlowerDoor = blowerDoorTests.length > 0;
      requirements.push({
        type: 'test',
        name: 'Blower Door Test',
        met: hasBlowerDoor,
      });
    }

    // Check for duct leakage test
    const needsDuctLeakage = requiredTests.some(t => t.testType === 'duct_leakage');
    if (needsDuctLeakage) {
      const hasDuctLeakage = ductLeakageTests.length > 0;
      requirements.push({
        type: 'test',
        name: 'Duct Leakage Test',
        met: hasDuctLeakage,
      });
    }

    // Check for ventilation test
    const needsVentilation = requiredTests.some(t => t.testType === 'ventilation');
    if (needsVentilation) {
      const hasVentilation = ventilationTests.length > 0;
      requirements.push({
        type: 'test',
        name: 'Ventilation Test',
        met: hasVentilation,
      });
    }
  }

  // Check photo upload requirement
  if (completionRequirements.photoUploadRequired) {
    const photosMet = job.photoUploadComplete === true;
    requirements.push({
      type: 'photo',
      name: 'Photo Upload',
      met: photosMet,
    });
  }

  // Check builder signature requirement
  if (completionRequirements.builderSignatureRequired) {
    const signatureMet = job.builderSignatureUrl !== null && job.builderSignatureUrl !== undefined && job.builderSignatureUrl.length > 0;
    requirements.push({
      type: 'signature',
      name: 'Builder Signature',
      met: signatureMet,
    });
  }

  // Check checklist items completion
  if (completionRequirements.allChecklistItemsCompleted) {
    const allChecklistComplete = checklistItems.length > 0 && checklistItems.every(item => item.completed === true);
    requirements.push({
      type: 'checklist',
      name: 'All Checklist Items',
      met: allChecklistComplete,
    });
  }

  // Calculate results
  const missingCount = requirements.filter(r => !r.met).length;
  const canComplete = missingCount === 0;

  return {
    canComplete,
    requirements,
    missingCount,
  };
}

/**
 * Job Update Validation
 * 
 * Validates job updates including status transitions and workflow completion requirements
 * 
 * @param currentJob - The existing job record
 * @param updates - The proposed updates
 * @param completionData - Optional data required for completion validation (required when transitioning to 'completed')
 */
export function validateJobUpdate(
  currentJob: Job,
  updates: Partial<Job>,
  completionData?: {
    checklistItems: any[];
    blowerDoorTests: any[];
    ductLeakageTests: any[];
    ventilationTests: any[];
  }
): ValidationResult {
  // Cannot update ID
  if (updates.id && updates.id !== currentJob.id) {
    return {
      valid: false,
      error: 'Cannot update job ID',
    };
  }

  // Validate status transition if status is being updated
  if (updates.status && updates.status !== currentJob.status) {
    // CRITICAL: Prevent reverting done jobs back to in-progress
    // Done jobs should only be able to transition to 'failed' or 'cancelled'
    if (currentJob.status === 'done' && 
        updates.status !== 'done' && 
        updates.status !== 'failed' && 
        updates.status !== 'cancelled') {
      return {
        valid: false,
        error: 'Cannot revert a completed job to in-progress status. If changes are needed, please contact an administrator or transition to failed status.',
      };
    }
    
    const transitionValidation = validateJobStatusTransition(
      currentJob.status as JobStatus,
      updates.status as JobStatus
    );
    if (!transitionValidation.valid) {
      return transitionValidation;
    }

    // Validate workflow completion requirements when transitioning to 'done'
    if (updates.status === 'done' && completionData) {
      const mergedJob = { ...currentJob, ...updates };
      const completionValidation = validateJobCompletion(
        mergedJob,
        completionData.checklistItems,
        completionData.blowerDoorTests,
        completionData.ductLeakageTests,
        completionData.ventilationTests
      );

      if (!completionValidation.canComplete) {
        const missingItems = completionValidation.requirements
          .filter(r => !r.met)
          .map(r => r.name)
          .join(', ');
        
        return {
          valid: false,
          error: `Cannot complete job. Missing requirements: ${missingItems}. Please complete all required items before marking the job as complete.`,
        };
      }
    }
  }

  // Validate fields if they're being updated
  if (updates.name || updates.address || updates.builderId || updates.inspectionType || updates.notes || updates.contractor) {
    const fieldValidation = validateJobFields({
      name: updates.name,
      address: updates.address,
      builderId: updates.builderId,
      inspectionType: updates.inspectionType,
      notes: updates.notes,
      contractor: updates.contractor,
    });
    if (!fieldValidation.valid) {
      return fieldValidation;
    }
  }

  // Validate dates if they're being updated
  if (updates.scheduledDate !== undefined || updates.completedDate !== undefined) {
    const dateValidation = validateJobDates({
      scheduledDate: updates.scheduledDate !== undefined ? updates.scheduledDate : currentJob.scheduledDate,
      completedDate: updates.completedDate !== undefined ? updates.completedDate : currentJob.completedDate,
      status: (updates.status as JobStatus) || (currentJob.status as JobStatus),
      isNewJob: false,
    });
    if (!dateValidation.valid) {
      return dateValidation;
    }
  }

  return { valid: true };
}
