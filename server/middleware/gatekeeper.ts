/**
 * Gatekeeper Middleware
 * 
 * Enforces feature maturity gates based on environment.
 * Routes are filtered by maturity level to control feature exposure.
 * 
 * @module server/middleware/gatekeeper
 */

import type { Request, Response, NextFunction } from 'express';
import { FeatureMaturity, isFeatureEnabled, getCurrentEnvironment } from '@shared/featureFlags';
import { getRouteMetadata, type RouteMetadata } from '../../client/src/lib/navigation';

/**
 * Extended request with route metadata
 */
export interface GatekeeperRequest extends Request {
  routeMetadata?: RouteMetadata;
  correlationId?: string;
}

/**
 * Maturity gate configuration by environment
 */
export const MATURITY_GATES: Record<string, FeatureMaturity[]> = {
  development: [FeatureMaturity.EXPERIMENTAL, FeatureMaturity.BETA, FeatureMaturity.GA],
  staging: [FeatureMaturity.BETA, FeatureMaturity.GA],
  production: [FeatureMaturity.GA],
};

/**
 * Check if route is allowed in current environment
 */
export function isRouteAllowed(route: RouteMetadata): boolean {
  const currentEnv = getCurrentEnvironment();
  const allowedMaturityLevels = MATURITY_GATES[currentEnv] || MATURITY_GATES.production;
  
  return allowedMaturityLevels.includes(route.maturity);
}

/**
 * Check if feature flag is enabled for route
 */
export function isRouteFeatureEnabled(route: RouteMetadata): boolean {
  if (!route.featureFlagKey) return true; // No feature flag = always enabled
  
  return isFeatureEnabled(route.featureFlagKey);
}

/**
 * Gatekeeper middleware
 * 
 * Blocks access to routes that don't meet maturity requirements for current environment.
 * 
 * Usage:
 * ```typescript
 * app.use(gatekeeperMiddleware());
 * ```
 */
export function gatekeeperMiddleware() {
  return (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    // Skip gatekeeper for health check endpoints
    if (req.path === '/healthz' || req.path === '/readyz' || req.path === '/api/status') {
      return next();
    }
    
    // Skip gatekeeper for public assets
    if (req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
      return next();
    }

    // Get route metadata
    const routeMetadata = getRouteMetadata(req.path);
    
    // If no route metadata found, allow through (404 will be handled by route handler)
    if (!routeMetadata) {
      return next();
    }
    
    // Attach route metadata to request for downstream use
    req.routeMetadata = routeMetadata;
    
    // Check if route is public (no auth required)
    if (routeMetadata.isPublic) {
      return next();
    }
    
    // Check maturity gate
    if (!isRouteAllowed(routeMetadata)) {
      const currentEnv = getCurrentEnvironment();
      
      return res.status(404).json({
        code: 'FEATURE_NOT_AVAILABLE',
        message: `This feature is not available in ${currentEnv} environment`,
        details: {
          route: req.path,
          maturity: routeMetadata.maturity,
          environment: currentEnv,
          allowedMaturityLevels: MATURITY_GATES[currentEnv],
        },
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
    
    // Check feature flag gate
    if (!isRouteFeatureEnabled(routeMetadata)) {
      return res.status(404).json({
        code: 'FEATURE_DISABLED',
        message: 'This feature is currently disabled',
        details: {
          route: req.path,
          featureFlag: routeMetadata.featureFlagKey,
        },
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
    
    // All gates passed
    next();
  };
}

/**
 * Role-based access control middleware
 * 
 * Checks if user has required role to access route.
 * Should be used after authentication middleware.
 * 
 * Usage:
 * ```typescript
 * app.use(requireRole(['admin', 'inspector']));
 * ```
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req: GatekeeperRequest & { user?: { role?: string; id?: string } }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
    
    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN_ROLE',
        message: 'Your role does not allow this action',
        details: {
          requiredRoles: roles,
          userRole: req.user.role,
        },
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
    
    next();
  };
}

/**
 * Ownership check middleware
 * 
 * Checks if user owns the resource they're trying to access.
 * Admins bypass ownership checks.
 * 
 * Usage:
 * ```typescript
 * app.patch('/api/jobs/:id', requireOwnership(async (req) => {
 *   const job = await storage.getJob(req.params.id);
 *   return job.inspectorId === req.user.id;
 * }));
 * ```
 */
export function requireOwnership(
  ownershipCheck: (req: GatekeeperRequest & { user?: { role?: string; id?: string } }) => Promise<boolean>
) {
  return async (req: GatekeeperRequest & { user?: { role?: string; id?: string } }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
    
    // Admins bypass ownership checks
    if (req.user.role === 'admin') {
      return next();
    }
    
    try {
      const isOwner = await ownershipCheck(req);
      
      if (!isOwner) {
        return res.status(403).json({
          code: 'FORBIDDEN_OWNERSHIP',
          message: 'You do not own this resource',
          correlationId: req.correlationId || crypto.randomUUID(),
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Error checking resource ownership',
        correlationId: req.correlationId || crypto.randomUUID(),
      });
    }
  };
}

/**
 * Correlation ID middleware
 * 
 * Generates and attaches correlation ID to every request.
 * 
 * Usage:
 * ```typescript
 * app.use(correlationIdMiddleware());
 * ```
 */
export function correlationIdMiddleware() {
  return (req: GatekeeperRequest, res: Response, next: NextFunction) => {
    // Check for existing correlation ID from client
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    
    // Attach to request
    req.correlationId = correlationId;
    
    // Return in response header
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  };
}

/**
 * Get filtered routes for user
 * 
 * Returns list of routes accessible to user based on:
 * - Environment maturity gates
 * - Feature flags
 * - User role
 */
export function getFilteredRoutes(userRole?: string): RouteMetadata[] {
  const allRoutes = Object.values(require('../../client/src/lib/navigation').ROUTE_REGISTRY);
  
  return allRoutes.filter((route: RouteMetadata) => {
    // Check maturity gate
    if (!isRouteAllowed(route)) return false;
    
    // Check feature flag
    if (!isRouteFeatureEnabled(route)) return false;
    
    // Check role (if provided)
    if (userRole && !route.allowedRoles.includes(userRole as any)) return false;
    
    return true;
  });
}

/**
 * Export environment info for debugging
 */
export function getGatekeeperInfo() {
  const currentEnv = getCurrentEnvironment();
  const allowedMaturityLevels = MATURITY_GATES[currentEnv] || MATURITY_GATES.production;
  
  return {
    environment: currentEnv,
    allowedMaturityLevels,
    experimentalEnabled: allowedMaturityLevels.includes(FeatureMaturity.EXPERIMENTAL),
    betaEnabled: allowedMaturityLevels.includes(FeatureMaturity.BETA),
    gaEnabled: allowedMaturityLevels.includes(FeatureMaturity.GA),
  };
}
