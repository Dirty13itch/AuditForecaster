import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to generate or extract correlation IDs for request tracing
 * 
 * AAA Blueprint Observability: Enables end-to-end request correlation between
 * client analytics events and server audit logs
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if client sent a correlation ID
  const clientCorrId = req.headers['x-correlation-id'] as string;
  
  // Generate new ID if not provided
  const corrId = clientCorrId || nanoid();
  
  // Attach to request object
  req.correlationId = corrId;
  
  // Return in response headers for client-side debugging
  res.setHeader('X-Correlation-ID', corrId);
  
  next();
}

/**
 * Get correlation ID from request context
 * Used by audit log and analytics event emitters
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}
