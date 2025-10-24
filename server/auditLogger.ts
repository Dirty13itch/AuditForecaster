import type { InsertAuditLog } from '@shared/schema';
import type { Request } from 'express';
import { serverLogger } from './logger';
import type { IStorage } from './storage';

interface AuditLogData {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
}

export async function createAuditLog(
  req: Request,
  data: AuditLogData,
  storage: IStorage
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    await storage.createAuditLog({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      changesJson: data.changes || null,
      ipAddress,
      userAgent,
      metadata: data.metadata || null,
    });

    serverLogger.info('Audit log created', {
      action: data.action,
      resourceType: data.resourceType,
      userId: data.userId,
    });
  } catch (error) {
    serverLogger.error('Failed to create audit log', { error, data });
  }
}
