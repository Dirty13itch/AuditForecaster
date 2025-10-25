import { nanoid } from 'nanoid';
import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from '../logger';

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to generate and attach correlation IDs to all requests
 * - Generates unique correlation ID for each request using nanoid
 * - Attaches to req.correlationId for use in logging
 * - Adds X-Correlation-ID header to responses
 * - Logs request start and end with correlation ID
 * - Tracks request duration
 * - Includes user ID if authenticated
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate unique correlation ID
  const correlationId = nanoid(12);
  req.correlationId = correlationId;
  req.startTime = Date.now();
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Extract user ID if authenticated
  const userId = (req as any).user?.claims?.sub || 'anonymous';
  
  // Log request start
  serverLogger.info(`[Request Start] ${req.method} ${req.path}`, {
    correlationId,
    method: req.method,
    path: req.path,
    userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    serverLogger[logLevel](`[Request End] ${req.method} ${req.path} ${res.statusCode}`, {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId,
    });
  });
  
  next();
}

/**
 * Helper function to get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}

/**
 * Helper function to log auth events with correlation ID
 */
export function logAuthEvent(
  req: Request,
  event: string,
  details?: Record<string, any>
) {
  const correlationId = getCorrelationId(req);
  const userId = (req as any).user?.claims?.sub || 'anonymous';
  
  serverLogger.info(`[Auth] ${event}`, {
    correlationId,
    userId,
    ...details,
  });
}

/**
 * Helper function to log auth errors with correlation ID
 */
export function logAuthError(
  req: Request,
  error: string,
  details?: Record<string, any>
) {
  const correlationId = getCorrelationId(req);
  const userId = (req as any).user?.claims?.sub || 'anonymous';
  
  serverLogger.error(`[Auth Error] ${error}`, {
    correlationId,
    userId,
    ...details,
  });
}
