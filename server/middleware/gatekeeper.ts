/**
 * Gatekeeper Middleware - Server-Side Route Guards
 * 
 * Express middleware for enforcing route access control based on:
 * - Feature maturity level (GA, Beta, Experimental)
 * - Environment (dev, staging, prod)
 * - User roles and permissions
 * - Golden Path test status
 * 
 * Integrates with shared/gatekeeping.ts for consistent server/client logic.
 * 
 * @module server/middleware/gatekeeper
 */

import type { Request, Response, NextFunction } from 'express';
import { evaluateRouteAccess, getRuntimeEnv, type RouteAccessDecision } from '@shared/gatekeeping';
import type { UserRole } from '@shared/types';
import { serverLogger } from '../logger';

/**
 * Extended Express request with user and correlation ID
 */
export interface GatekeeperRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: UserRole;
    roles?: UserRole[];
    firstName?: string;
    lastName?: string;
  };
  correlationId?: string;
}

/**
 * Correlation ID Middleware
 * 
 * Generates and attaches correlation ID to every request for tracing.
 * 
 * @returns Express middleware
 */
export function correlationIdMiddleware() {
  return (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  };
}

/**
 * Route Access Middleware
 * 
 * Evaluates route access using shared gatekeeping logic.
 * Blocks access if user doesn't meet requirements (maturity, role, environment).
 * 
 * Usage:
 * ```typescript
 * // Apply to all routes
 * app.use(requireRouteAccess());
 * 
 * // Apply to specific route
 * app.get('/api/admin/settings', requireRouteAccess(), (req, res) => { ... });
 * ```
 * 
 * @param options - Configuration options
 * @returns Express middleware
 */
export function requireRouteAccess(options: {
  /** Allow experimental routes (default: false) */
  showExperimental?: boolean;
} = {}) {
  const { showExperimental = false } = options;
  
  return (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    // Skip for health check endpoints
    if (req.path === '/healthz' || req.path === '/readyz' || req.path === '/api/status') {
      return next();
    }
    
    // Skip for public assets
    if (req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
      return next();
    }
    
    // Skip for auth endpoints
    if (req.path.startsWith('/api/login') || req.path.startsWith('/api/logout') || req.path.startsWith('/api/dev-login')) {
      return next();
    }
    
    // Get user roles
    let userRoles: UserRole[] = [];
    if (req.user) {
      if (req.user.roles) {
        userRoles = req.user.roles;
      } else if (req.user.role) {
        userRoles = [req.user.role];
      }
    }
    
    // Evaluate route access
    const env = getRuntimeEnv();
    const decision = evaluateRouteAccess(
      req.path,
      userRoles,
      env,
      showExperimental
    );
    
    // Block if not allowed
    if (!decision.allowed) {
      serverLogger.warn('[Gatekeeper] Route access denied', {
        path: req.path,
        userId: req.user?.id,
        userRoles,
        environment: env,
        maturity: decision.maturity,
        reason: decision.message,
        correlationId: req.correlationId,
      });
      
      return res.status(403).json({
        error: decision.message || 'Access denied',
        code: 'ROUTE_ACCESS_DENIED',
        details: {
          path: req.path,
          maturity: decision.maturity,
          badge: decision.badge,
          redirectTo: decision.redirectTo,
        },
        correlationId: req.correlationId,
      });
    }
    
    // Access granted
    next();
  };
}

/**
 * Role-Based Access Control Middleware
 * 
 * Checks if user has required role to access route.
 * Should be used after authentication middleware.
 * 
 * Usage:
 * ```typescript
 * app.get('/api/admin/users', requireRole(['admin']), (req, res) => { ... });
 * app.get('/api/inspections', requireRole(['admin', 'inspector', 'lead']), (req, res) => { ... });
 * ```
 * 
 * @param allowedRoles - Single role or array of allowed roles
 * @returns Express middleware
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        correlationId: req.correlationId,
      });
    }
    
    const userRoles: UserRole[] = req.user.roles || (req.user.role ? [req.user.role] : []);
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      serverLogger.warn('[Gatekeeper] Role access denied', {
        path: req.path,
        userId: req.user.id,
        userRoles,
        requiredRoles: roles,
        correlationId: req.correlationId,
      });
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN_ROLE',
        details: {
          requiredRoles: roles,
          userRole: userRoles,
        },
        correlationId: req.correlationId,
      });
    }
    
    next();
  };
}

/**
 * Ownership Check Middleware
 * 
 * Checks if user owns the resource they're trying to access.
 * Admins bypass ownership checks.
 * 
 * Usage:
 * ```typescript
 * app.patch('/api/jobs/:id', requireOwnership(async (req) => {
 *   const job = await storage.getJob(req.params.id);
 *   return job.inspectorId === req.user.id;
 * }), (req, res) => { ... });
 * ```
 * 
 * @param ownershipCheck - Async function that returns true if user owns resource
 * @returns Express middleware
 */
export function requireOwnership(
  ownershipCheck: (req: GatekeeperRequest) => Promise<boolean>
) {
  return async (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        correlationId: req.correlationId,
      });
    }
    
    // Admins bypass ownership checks
    const userRoles: UserRole[] = req.user.roles || (req.user.role ? [req.user.role] : []);
    if (userRoles.includes('admin')) {
      return next();
    }
    
    try {
      const isOwner = await ownershipCheck(req);
      
      if (!isOwner) {
        serverLogger.warn('[Gatekeeper] Ownership check failed', {
          path: req.path,
          userId: req.user.id,
          correlationId: req.correlationId,
        });
        
        return res.status(403).json({
          error: 'You do not own this resource',
          code: 'FORBIDDEN_OWNERSHIP',
          correlationId: req.correlationId,
        });
      }
      
      next();
    } catch (error) {
      serverLogger.error('[Gatekeeper] Ownership check error', {
        path: req.path,
        userId: req.user.id,
        error,
        correlationId: req.correlationId,
      });
      
      return res.status(500).json({
        error: 'Error checking resource ownership',
        code: 'INTERNAL_ERROR',
        correlationId: req.correlationId,
      });
    }
  };
}

/**
 * Get gatekeeper information for debugging
 * 
 * Returns current environment and maturity levels allowed.
 * Useful for /api/status endpoint.
 * 
 * @returns Gatekeeper configuration info
 */
export function getGatekeeperInfo() {
  const env = getRuntimeEnv();
  
  return {
    environment: env,
    maturityGates: {
      prod: ['ga'],
      staging: ['ga', 'beta'],
      dev: ['ga', 'beta', 'experimental (with toggle)'],
    },
    currentAllowed: env === 'prod' 
      ? ['ga'] 
      : env === 'staging' 
        ? ['ga', 'beta'] 
        : ['ga', 'beta', 'experimental (with toggle)'],
  };
}
