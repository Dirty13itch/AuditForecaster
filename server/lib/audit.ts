/**
 * Audit Logging Helpers
 * 
 * Provides immutable audit trail for all mutations in the system.
 * Every create, update, delete operation should log an audit entry.
 * 
 * @module server/lib/audit
 */

import { db } from '../db';
import { auditLogs } from '@shared/schema';
import type { Request } from 'express';

/**
 * Audit action types
 * 
 * Extended November 3, 2025 to support Tier-3 observability (calendar, testing, tax credits)
 */
export type AuditAction =
  // Core CRUD operations
  | 'create'      // Entity creation
  | 'update'      // Entity modification
  | 'delete'      // Entity removal
  
  // Authentication actions
  | 'login'       // User sign-in
  | 'logout'      // User sign-out
  
  // Workflow actions
  | 'approve'     // Approval granted (QA scores, tax credit docs, builders)
  | 'reject'      // Approval denied (QA scores, pending events)
  | 'assign'      // Resource assignment (jobs to inspectors, events to jobs)
  | 'complete'    // Task completion (checklist items, requirements)
  
  // Data operations
  | 'export'      // Data export (reports, certifications)
  | 'import'      // Data import (calendar events, test results)
  
  // Tier-3 operations (added Nov 3, 2025)
  | 'sync'        // Calendar sync operations (Google Calendar ↔ schedule events)
  | 'convert'     // Entity conversion (calendar event → job)
  | 'submit'      // Formal submission (tax credit project for certification)
  | 'recalculate' // Recomputation (test results, compliance scores)
  | 'verify';     // Verification confirmation (requirements, certifications)

/**
 * Entity reference format: {entityType}:{entityId}
 * e.g., "job:abc123", "photo:def456", "report:ghi789"
 */
export type EntityRef = string;

/**
 * Audit log entry properties
 */
export interface AuditLogEntry {
  actorId: string;        // User ID performing the action
  action: AuditAction;    // What action was performed
  entityRef: EntityRef;   // Entity reference (type:id)
  before?: object;        // State before mutation (updates/deletes)
  after?: object;         // State after mutation (creates/updates)
  metadata?: object;      // Additional context
  corrId: string;         // Correlation ID from request
  ipAddress?: string;     // Client IP address
  userAgent?: string;     // Client user agent
  ts: number;             // Unix timestamp (milliseconds)
}

/**
 * Extended Request type with correlation ID
 */
export interface AuditRequest extends Request {
  correlationId?: string;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Create an audit log entry
 * 
 * @example
 * ```typescript
 * await createAuditLog({
 *   actorId: req.user.id,
 *   action: 'create',
 *   entityRef: `job:${job.id}`,
 *   after: job,
 *   corrId: req.correlationId,
 *   ipAddress: req.ip,
 *   userAgent: req.get('user-agent')
 * });
 * ```
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      entityRef: entry.entityRef,
      before: entry.before || null,
      after: entry.after || null,
      metadata: entry.metadata || null,
      corrId: entry.corrId,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      ts: entry.ts,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break business logic
    console.error('Failed to create audit log entry', {
      error: error instanceof Error ? error.message : String(error),
      entry,
    });
  }
}

/**
 * Log a create action
 */
export async function logCreate(params: {
  req: AuditRequest;
  entityType: string;
  entityId: string;
  after: object;
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log create action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: 'create',
    entityRef: `${params.entityType}:${params.entityId}`,
    after: params.after,
    metadata: params.metadata,
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log an update action
 */
export async function logUpdate(params: {
  req: AuditRequest;
  entityType: string;
  entityId: string;
  before: object;
  after: object;
  changedFields?: string[];
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log update action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: 'update',
    entityRef: `${params.entityType}:${params.entityId}`,
    before: params.before,
    after: params.after,
    metadata: {
      ...params.metadata,
      changedFields: params.changedFields,
    },
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log a delete action
 */
export async function logDelete(params: {
  req: AuditRequest;
  entityType: string;
  entityId: string;
  before: object;
  reason?: string;
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log delete action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: 'delete',
    entityRef: `${params.entityType}:${params.entityId}`,
    before: params.before,
    metadata: {
      ...params.metadata,
      reason: params.reason,
    },
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log a login action
 */
export async function logLogin(params: {
  req: AuditRequest;
  userId: string;
  provider: string;
  isFirstLogin: boolean;
  metadata?: object;
}): Promise<void> {
  await createAuditLog({
    actorId: params.userId,
    action: 'login',
    entityRef: `user:${params.userId}`,
    after: {
      provider: params.provider,
      isFirstLogin: params.isFirstLogin,
    },
    metadata: params.metadata,
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log a logout action
 */
export async function logLogout(params: {
  req: AuditRequest;
  userId: string;
  sessionDuration?: number;
  metadata?: object;
}): Promise<void> {
  await createAuditLog({
    actorId: params.userId,
    action: 'logout',
    entityRef: `user:${params.userId}`,
    metadata: {
      ...params.metadata,
      sessionDuration: params.sessionDuration,
    },
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log an export action
 */
export async function logExport(params: {
  req: AuditRequest;
  exportType: string;
  recordCount: number;
  format: string;
  filters?: object;
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log export action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: 'export',
    entityRef: `export:${params.exportType}`,
    after: {
      recordCount: params.recordCount,
      format: params.format,
      filters: params.filters,
    },
    metadata: params.metadata,
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log an import action
 */
export async function logImport(params: {
  req: AuditRequest;
  importType: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log import action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: 'import',
    entityRef: `import:${params.importType}`,
    after: {
      recordCount: params.recordCount,
      successCount: params.successCount,
      errorCount: params.errorCount,
      errors: params.errors,
    },
    metadata: params.metadata,
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Log a custom action
 * 
 * Use this for workflow actions beyond basic CRUD (approve, reject, assign, complete, sync, etc.)
 * 
 * @example
 * ```typescript
 * // QA Score approval
 * await logCustomAction({
 *   req,
 *   action: 'approve',
 *   entityType: 'qa_inspection_score',
 *   entityId: scoreId,
 *   after: { reviewStatus: 'approved', reviewedBy: req.user.id }
 * });
 * 
 * // Calendar event sync
 * await logCustomAction({
 *   req,
 *   action: 'sync',
 *   entityType: 'schedule_event',
 *   entityId: eventId,
 *   after: { googleCalendarEventId: 'abc123', lastSyncedAt: new Date() },
 *   metadata: { calendarId: 'primary' }
 * });
 * 
 * // Tax credit project submission
 * await logCustomAction({
 *   req,
 *   action: 'submit',
 *   entityType: 'tax_credit_project',
 *   entityId: projectId,
 *   after: { status: 'submitted', submittedAt: new Date() },
 *   metadata: { certificationBody: 'RESNET' }
 * });
 * 
 * // Test result recalculation
 * await logCustomAction({
 *   req,
 *   action: 'recalculate',
 *   entityType: 'blower_door_test',
 *   entityId: testId,
 *   before: { ach50: 2.8, meetsCode: false },
 *   after: { ach50: 2.6, meetsCode: true },
 *   metadata: { reason: 'altitude_correction' }
 * });
 * ```
 */
export async function logCustomAction(params: {
  req: AuditRequest;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: object;
  after?: object;
  metadata?: object;
}): Promise<void> {
  if (!params.req.user?.id) {
    console.warn('Attempted to log custom action without user ID');
    return;
  }

  await createAuditLog({
    actorId: params.req.user.id,
    action: params.action,
    entityRef: `${params.entityType}:${params.entityId}`,
    before: params.before,
    after: params.after,
    metadata: params.metadata,
    corrId: params.req.correlationId || crypto.randomUUID(),
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    ts: Date.now(),
  });
}

/**
 * Helper to extract changed fields between before and after
 */
export function getChangedFields(before: object, after: object): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (JSON.stringify(before[key as keyof typeof before]) !== JSON.stringify(after[key as keyof typeof after])) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Helper to create entity reference
 */
export function createEntityRef(entityType: string, entityId: string): EntityRef {
  return `${entityType}:${entityId}`;
}

/**
 * Helper to parse entity reference
 */
export function parseEntityRef(entityRef: EntityRef): { type: string; id: string } | null {
  const parts = entityRef.split(':');
  if (parts.length !== 2) return null;
  
  return {
    type: parts[0],
    id: parts[1],
  };
}

/**
 * Sanitize sensitive fields before logging
 * 
 * Removes passwords, tokens, API keys, SSNs, credit cards, etc.
 */
export function sanitizeForAudit(data: object): object {
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'ssn',
    'creditCard',
    'cvv',
    'pin',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field as keyof typeof sanitized] = '[REDACTED]' as any;
    }
  }

  return sanitized;
}

/**
 * Get audit trail for an entity
 * 
 * Returns all audit log entries for a specific entity
 */
export async function getAuditTrail(params: {
  entityType: string;
  entityId: string;
  limit?: number;
}): Promise<any[]> {
  const entityRef = createEntityRef(params.entityType, params.entityId);
  
  const results = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.entityRef, entityRef))
    .orderBy(desc(auditLogs.ts))
    .limit(params.limit || 100);

  return results;
}

/**
 * Get audit trail for a user
 * 
 * Returns all actions performed by a specific user
 */
export async function getUserAuditTrail(params: {
  userId: string;
  limit?: number;
  action?: AuditAction;
}): Promise<any[]> {
  let query = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.actorId, params.userId));

  if (params.action) {
    query = query.where(eq(auditLogs.action, params.action));
  }

  const results = await query
    .orderBy(desc(auditLogs.ts))
    .limit(params.limit || 100);

  return results;
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(params: {
  limit?: number;
  action?: AuditAction;
  since?: number; // Unix timestamp
}): Promise<any[]> {
  let query = db.select().from(auditLogs);

  if (params.action) {
    query = query.where(eq(auditLogs.action, params.action));
  }

  if (params.since) {
    query = query.where(gte(auditLogs.ts, params.since));
  }

  const results = await query
    .orderBy(desc(auditLogs.ts))
    .limit(params.limit || 100);

  return results;
}

// Import necessary operators
import { eq, desc, gte } from 'drizzle-orm';
