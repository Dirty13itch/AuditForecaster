import type { IStorage } from './storage';
import type { BuilderAgreement } from '@shared/schema';

/**
 * Validate geographic hierarchy - ensure lot belongs to development
 */
export async function validateLotBelongsToDevelopment(
  storage: IStorage,
  lotId: string,
  developmentId: string
): Promise<{ valid: boolean; error?: string }> {
  const lot = await storage.getLot(lotId);
  if (!lot) return { valid: false, error: 'Lot not found' };
  if (lot.developmentId !== developmentId) {
    return { valid: false, error: 'Lot does not belong to this development' };
  }
  return { valid: true };
}

/**
 * Validate job belongs to lot
 */
export async function validateJobBelongsToLot(
  storage: IStorage,
  jobId: string,
  lotId: string
): Promise<{ valid: boolean; error?: string }> {
  const job = await storage.getJob(jobId);
  if (!job) return { valid: false, error: 'Job not found' };
  if (job.lotId !== lotId) {
    return { valid: false, error: 'Job does not belong to this lot' };
  }
  return { valid: true };
}

/**
 * Get agreement expiration status with categorized alerts
 */
export function categorizeAgreementExpiration(agreement: BuilderAgreement): {
  category: 'critical' | 'warning' | 'notice' | 'ok';
  daysUntilExpiration: number;
  message: string;
} {
  if (!agreement.endDate) {
    return {
      category: 'ok',
      daysUntilExpiration: Infinity,
      message: 'No expiration date set'
    };
  }

  const now = new Date();
  const endDate = new Date(agreement.endDate);
  const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    return {
      category: 'critical',
      daysUntilExpiration,
      message: `Expired ${Math.abs(daysUntilExpiration)} days ago`
    };
  } else if (daysUntilExpiration <= 30) {
    return {
      category: 'critical',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days - URGENT renewal needed`
    };
  } else if (daysUntilExpiration <= 60) {
    return {
      category: 'warning',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days - Renewal recommended`
    };
  } else if (daysUntilExpiration <= 90) {
    return {
      category: 'notice',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days`
    };
  } else {
    return {
      category: 'ok',
      daysUntilExpiration,
      message: `Expires in ${daysUntilExpiration} days`
    };
  }
}

/**
 * Validate contact role
 */
export function validateContactRole(role: string): { valid: boolean; error?: string } {
  const validRoles = ['superintendent', 'project_manager', 'owner', 'estimator', 'office_manager', 'other'];
  if (!validRoles.includes(role)) {
    return {
      valid: false,
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    };
  }
  return { valid: true };
}
