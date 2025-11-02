import { serverLogger } from './logger';
import type { Request, Response, NextFunction } from 'express';

// Log security-relevant events
export function securityAuditLog(event: string, details: Record<string, any>) {
  serverLogger.warn(`[SECURITY AUDIT] ${event}`, details);
}

// Middleware to log failed authentication attempts
export function logFailedAuth(req: Request, res: Response, next: NextFunction) {
  const originalStatus = res.status;
  
  res.status = function(code: number) {
    if (code === 401 || code === 403) {
      securityAuditLog('Failed authentication/authorization', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: code
      });
    }
    return originalStatus.call(this, code);
  };
  
  next();
}
