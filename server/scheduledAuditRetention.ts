import cron from 'node-cron';
import { db } from './db';
import { auditLogs } from '@shared/schema';
import { lt, count, inArray } from 'drizzle-orm';
import { serverLogger } from './logger';
import { backgroundJobTracker } from './backgroundJobTracker';

// Configuration from environment
const AUDIT_RETENTION_ENABLED = process.env.AUDIT_RETENTION_ENABLED !== 'false';
const AUDIT_RETENTION_SCHEDULE = process.env.AUDIT_RETENTION_SCHEDULE || '0 2 * * *'; // 2 AM daily
const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '180');
const AUDIT_RETENTION_DRY_RUN = process.env.AUDIT_RETENTION_DRY_RUN === 'true';
const AUDIT_RETENTION_BATCH_SIZE = parseInt(process.env.AUDIT_RETENTION_BATCH_SIZE || '1000');

/**
 * Automated audit log retention job
 * Deletes audit logs older than configured retention period (default: 180 days)
 * to prevent unbounded database growth
 * 
 * Configuration via environment variables:
 * - AUDIT_RETENTION_ENABLED: Enable/disable the job (default: true)
 * - AUDIT_RETENTION_SCHEDULE: Cron schedule (default: '0 2 * * *' - 2 AM daily)
 * - AUDIT_RETENTION_DAYS: Days to retain logs (default: 180)
 * - AUDIT_RETENTION_DRY_RUN: Test mode without deleting (default: false)
 * - AUDIT_RETENTION_BATCH_SIZE: Max records per run (default: 1000)
 */
export async function startScheduledAuditRetention() {
  if (!AUDIT_RETENTION_ENABLED) {
    serverLogger.info('[AuditRetention] Audit log retention is disabled (AUDIT_RETENTION_ENABLED=false)');
    return;
  }

  // Register the job with background job tracker
  await backgroundJobTracker.registerJob({
    jobName: 'audit_retention',
    displayName: 'Audit Log Retention',
    description: `Deletes audit logs older than ${AUDIT_RETENTION_DAYS} days`,
    schedule: AUDIT_RETENTION_SCHEDULE,
    enabled: AUDIT_RETENTION_ENABLED,
  });

  cron.schedule(AUDIT_RETENTION_SCHEDULE, async () => {
    serverLogger.info('[AuditRetention] Running automated audit log retention job');
    
    await backgroundJobTracker.executeJob('audit_retention', async () => {
      try {
        // Calculate cutoff timestamp (180 days ago in Unix milliseconds)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - AUDIT_RETENTION_DAYS);
        const cutoffTs = cutoffDate.getTime();

        // Safety check: ensure cutoff is at least 7 days old
        // This prevents accidental deletion of recent data due to misconfiguration
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (cutoffTs > sevenDaysAgo) {
          serverLogger.error('[AuditRetention] Safety check failed: cutoff date too recent', {
            cutoffDate: cutoffDate.toISOString(),
            cutoffTs,
            sevenDaysAgo,
            retentionDays: AUDIT_RETENTION_DAYS,
          });
          return;
        }

        serverLogger.info('[AuditRetention] Starting retention cleanup', {
          cutoffDate: cutoffDate.toISOString(),
          cutoffTs,
          retentionDays: AUDIT_RETENTION_DAYS,
          dryRun: AUDIT_RETENTION_DRY_RUN,
          batchSize: AUDIT_RETENTION_BATCH_SIZE,
        });

        if (AUDIT_RETENTION_DRY_RUN) {
          // Show how many records would be deleted in first batch
          const firstBatch = await db
            .select({ id: auditLogs.id })
            .from(auditLogs)
            .where(lt(auditLogs.ts, cutoffTs))
            .orderBy(auditLogs.ts)
            .limit(AUDIT_RETENTION_BATCH_SIZE);
          
          // Count total records that match criteria
          const totalResult = await db
            .select({ count: count() })
            .from(auditLogs)
            .where(lt(auditLogs.ts, cutoffTs));
          
          serverLogger.info('[AuditRetention] DRY RUN: Would delete records in batches', {
            totalCount: totalResult[0]?.count || 0,
            firstBatchSize: firstBatch.length,
            batchSize: AUDIT_RETENTION_BATCH_SIZE,
            cutoffDate: cutoffDate.toISOString(),
            cutoffTs,
          });
          return;
        }

        // Delete old records in batches
        let totalDeleted = 0;
        let batchDeleted = 0;

        do {
          // Find IDs of next batch to delete
          const idsToDelete = await db
            .select({ id: auditLogs.id })
            .from(auditLogs)
            .where(lt(auditLogs.ts, cutoffTs))
            .orderBy(auditLogs.ts) // Delete oldest first
            .limit(AUDIT_RETENTION_BATCH_SIZE);

          if (idsToDelete.length === 0) {
            break;
          }

          // Delete this batch
          await db
            .delete(auditLogs)
            .where(inArray(auditLogs.id, idsToDelete.map(r => r.id)));

          batchDeleted = idsToDelete.length;
          totalDeleted += batchDeleted;

          serverLogger.info('[AuditRetention] Deleted batch', {
            batchSize: batchDeleted,
            totalDeleted,
          });

          // Continue until we deleted fewer than batch size (meaning no more records)
        } while (batchDeleted >= AUDIT_RETENTION_BATCH_SIZE);

        serverLogger.info('[AuditRetention] Completed audit log retention', {
          totalDeleted,
          cutoffDate: cutoffDate.toISOString(),
          cutoffTs,
          retentionDays: AUDIT_RETENTION_DAYS,
        });
        
      } catch (error) {
        serverLogger.error('[AuditRetention] Failed to execute retention cleanup', { error });
        throw error;
      }
    });
  });

  serverLogger.info('[AuditRetention] Scheduled audit log retention', {
    schedule: AUDIT_RETENTION_SCHEDULE,
    retentionDays: AUDIT_RETENTION_DAYS,
    dryRun: AUDIT_RETENTION_DRY_RUN,
    batchSize: AUDIT_RETENTION_BATCH_SIZE,
  });
}
