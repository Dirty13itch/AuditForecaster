import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger";
import type { Request, Response, NextFunction } from "express";

const sentryLog = logger.child({ context: 'Sentry' });
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

let sentryEnabled = false;

export function initSentry() {
  if (!SENTRY_DSN) {
    sentryLog.warn('SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    enabled: NODE_ENV === 'production',
    
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    beforeSend(event, hint) {
      // Add custom context from error properties
      if (hint.originalException && typeof hint.originalException === 'object') {
        const error = hint.originalException as any;
        
        // Add job context if available
        if (error.jobId) {
          event.tags = { ...event.tags, jobId: error.jobId };
          event.contexts = {
            ...event.contexts,
            job: {
              id: error.jobId,
              inspectionType: error.inspectionType || 'unknown',
              status: error.jobStatus || 'unknown'
            }
          };
        }
        
        // Add builder context if available
        if (error.builderId) {
          event.tags = { ...event.tags, builderId: error.builderId };
          event.contexts = {
            ...event.contexts,
            builder: {
              id: error.builderId,
              name: error.builderName || 'unknown'
            }
          };
        }
      }
      
      if (NODE_ENV === 'development') {
        sentryLog.debug('Would send error', { event });
        return null;
      }
      return event;
    },
  });

  sentryEnabled = true;
  sentryLog.info('Initialized for environment', { environment: NODE_ENV });
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function captureException(error: unknown): void {
  if (sentryEnabled) {
    Sentry.captureException(error);
  }
}

/**
 * Set user context for Sentry error tracking
 * Tracks which user encountered errors for debugging
 */
export function setSentryUser(user: { 
  id: string; 
  email?: string; 
  role?: string; 
  name?: string 
}): void {
  if (sentryEnabled) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role
    });
  }
}

/**
 * Add breadcrumb for debugging trail
 * Works even if Sentry is disabled (logs to console)
 * 
 * @param category - Breadcrumb category (e.g., 'jobs', 'compliance', 'pdf')
 * @param message - Human-readable message
 * @param data - Additional context data
 * @param level - Severity level
 */
export function addBreadcrumb(
  category: string, 
  message: string, 
  data?: Record<string, any>, 
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  // Always log breadcrumbs for debugging (even if Sentry disabled)
  const breadcrumbLog = logger.child({ context: 'Breadcrumb' });
  breadcrumbLog[level](`[${category}] ${message}`, data || {});
  
  // Send to Sentry if enabled
  if (sentryEnabled) {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }
}

/**
 * Capture error with custom context
 * Adds job, builder, and custom tags to error reports
 */
export function captureErrorWithContext(error: Error, context: {
  jobId?: string;
  builderId?: string;
  inspectionType?: string;
  userId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}): void {
  // Log error even if Sentry disabled
  const errorLog = logger.child({ context: 'ErrorWithContext' });
  errorLog.error('Error with context', {
    error: error.message,
    stack: error.stack,
    ...context
  });
  
  // Send to Sentry with scope if enabled
  if (sentryEnabled) {
    Sentry.withScope((scope) => {
      // Add tags
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      
      // Add job context
      if (context.jobId) {
        scope.setContext('job', {
          id: context.jobId,
          inspectionType: context.inspectionType
        });
      }
      
      // Add builder context
      if (context.builderId) {
        scope.setContext('builder', {
          id: context.builderId
        });
      }
      
      // Add extra data (sanitized)
      if (context.extra) {
        scope.setExtras(context.extra);
      }
      
      Sentry.captureException(error);
    });
  }
}

/**
 * Middleware to track user context in Sentry
 * Add after authentication middleware in server/index.ts
 */
export function sentryUserMiddleware(req: Request, res: Response, next: NextFunction): void {
  if ((req as any).user) {
    const user = (req as any).user;
    setSentryUser({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });
  }
  
  next();
}

/**
 * Express error handler for Sentry
 * Add at end of middleware chain (before final error handler)
 * Only reports 5xx errors (not 4xx client errors)
 */
export const sentryErrorHandler = SENTRY_DSN ? Sentry.Handlers.errorHandler({
  shouldHandleError(error: any) {
    // Only report server errors (5xx), not client errors (4xx)
    return error.status ? error.status >= 500 : true;
  }
}) : (req: Request, res: Response, next: NextFunction) => next();

export { Sentry };
