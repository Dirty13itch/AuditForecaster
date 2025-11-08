/**
 * Shared Gatekeeper Evaluator
 * 
 * Centralized route access control logic used by both server and client.
 * Determines route visibility based on environment, maturity level, user roles,
 * and Golden Path test status.
 * 
 * @module shared/gatekeeping
 */

import { FeatureMaturity } from './featureFlags';
import { ROUTE_REGISTRY, type RouteMetadata } from './navigation';
import type { UserRole } from './types';

/**
 * Runtime environment (simplified names for gatekeeping)
 */
export type RuntimeEnvironment = 'dev' | 'staging' | 'prod';

/**
 * Route access decision result
 */
export interface RouteAccessDecision {
  /** Whether access is allowed */
  allowed: boolean;
  
  /** The route's maturity level */
  maturity: FeatureMaturity;
  
  /** Badge to display (if route is allowed but with caveats) */
  badge?: 'beta' | 'experimental' | 'not-ready';
  
  /** Human-readable message explaining decision */
  message?: string;
  
  /** Alternative route to redirect to if blocked */
  redirectTo?: string;
  
  /** The evaluated route metadata */
  route?: RouteMetadata;
}

/**
 * Golden Path test status (stubbed for now, can integrate real GP results later)
 */
interface GoldenPathStatus {
  passed: boolean;
  lastRun?: string;
  duration?: number;
}

/**
 * Get current runtime environment
 * 
 * Works in both server (Node.js) and client (Vite) contexts.
 * 
 * @returns Runtime environment: 'dev', 'staging', or 'prod'
 */
export function getRuntimeEnv(): RuntimeEnvironment {
  // Server-side (Node.js)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'prod';
    if (nodeEnv === 'staging') return 'staging';
    return 'dev';
  }
  
  // Client-side (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Vite's PROD is boolean, not string
    if (import.meta.env.PROD === true) return 'prod';
    if (import.meta.env.MODE === 'staging') return 'staging';
    return 'dev';
  }
  
  // Fallback
  return 'dev';
}

/**
 * Get Golden Path test status for a route
 * 
 * Parses actual GP test results from docs/product/golden-path-report.md
 * 
 * @param goldenPathId - GP test ID (e.g., "GP-01", "GP-02")
 * @returns Test status from the report
 */
function getGoldenPathStatus(goldenPathId?: string): GoldenPathStatus {
  if (!goldenPathId) {
    return { passed: true };
  }
  
  try {
    // Read golden-path-report.md and parse test status
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'docs/product/golden-path-report.md');
    
    if (!fs.existsSync(reportPath)) {
      // Fallback if file doesn't exist
      return { passed: false, lastRun: undefined };
    }
    
    const content = fs.readFileSync(reportPath, 'utf-8');
    
    // Parse test status for the given GP ID
    const gpSectionRegex = new RegExp(`## ${goldenPathId}:([\\s\\S]*?)(?=##|$)`, 'i');
    const match = content.match(gpSectionRegex);
    
    if (!match) {
      return { passed: false, lastRun: undefined };
    }
    
    const section = match[1];
    
    // Extract status emoji/text
    const statusMatch = section.match(/\*\*Status\*\*:\s*([^\n]+)/);
    const status = statusMatch ? statusMatch[1] : '';
    
    // Extract last executed date
    const dateMatch = section.match(/\*\*Last Executed\*\*:\s*([^\n]+)/);
    const lastExecuted = dateMatch ? dateMatch[1] : undefined;
    
    // Extract duration
    const durationMatch = section.match(/\*\*Duration\*\*:\s*([^\n]+)/);
    const durationStr = durationMatch ? durationMatch[1] : undefined;
    
    // Parse duration (e.g., "120 seconds" -> 120000 ms)
    let duration: number | undefined;
    if (durationStr && !durationStr.includes('N/A')) {
      const durationSeconds = parseInt(durationStr.match(/\d+/)?.[0] || '0');
      duration = durationSeconds * 1000;
    }
    
    // Determine if test passed based on status indicators
    const passed = status.includes('🟢') || status.includes('✅') || 
                   status.toLowerCase().includes('pass') ||
                   status.toLowerCase().includes('complete');
    
    return {
      passed,
      lastRun: lastExecuted && !lastExecuted.includes('Not yet') ? lastExecuted : undefined,
      duration,
    };
  } catch (error) {
    // Fallback to stub on error
    return { passed: false, lastRun: undefined };
  }
}

/**
 * Check if maturity level is visible in environment
 * 
 * Maturity Visibility Rules:
 * - Production: Only GA routes visible
 * - Staging: GA + Beta visible
 * - Dev: GA + Beta visible, Experimental only if showExperimental=true
 * 
 * @param maturity - Route maturity level
 * @param env - Runtime environment
 * @param showExperimental - Whether to show experimental routes (dev only)
 * @returns Whether maturity level should be visible
 */
function isMaturityVisible(
  maturity: FeatureMaturity,
  env: RuntimeEnvironment,
  showExperimental: boolean
): boolean {
  // Production: Only GA
  if (env === 'prod') {
    return maturity === FeatureMaturity.GA;
  }
  
  // Staging: GA + Beta
  if (env === 'staging') {
    return maturity === FeatureMaturity.GA || maturity === FeatureMaturity.BETA;
  }
  
  // Dev: GA + Beta always, Experimental only if toggled
  if (maturity === FeatureMaturity.GA || maturity === FeatureMaturity.BETA) {
    return true;
  }
  
  if (maturity === FeatureMaturity.EXPERIMENTAL) {
    return showExperimental;
  }
  
  return false;
}

/**
 * Check if user has required role for route
 * 
 * @param userRoles - User's roles
 * @param requiredRoles - Route's required roles (undefined = all roles allowed)
 * @returns Whether user has access
 */
function hasRequiredRole(userRoles: UserRole[], requiredRoles?: UserRole[]): boolean {
  // No role restrictions = everyone can access
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  
  // Check if user has at least one required role
  return requiredRoles.some(requiredRole => userRoles.includes(requiredRole));
}

/**
 * Find route metadata by path
 * 
 * Handles both exact matches and dynamic routes (e.g., /jobs/:id)
 * 
 * @param path - Route path to lookup
 * @returns Route metadata or undefined
 */
export function findRouteMetadata(path: string): RouteMetadata | undefined {
  // Exact match first
  if (ROUTE_REGISTRY[path]) {
    return ROUTE_REGISTRY[path];
  }
  
  // Try to match dynamic routes
  // e.g., /inspection/123 should match /inspection/:id
  for (const [routePath, metadata] of Object.entries(ROUTE_REGISTRY)) {
    if (routePath.includes(':')) {
      // Convert route pattern to regex
      const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return metadata;
      }
    }
  }
  
  return undefined;
}

/**
 * Evaluate route access for user
 * 
 * Main entry point for route access control. Evaluates:
 * 1. Route existence
 * 2. Maturity visibility in environment
 * 3. Golden Path test status (demotes to "not-ready" if failed)
 * 4. User role requirements
 * 
 * @param path - Route path to evaluate
 * @param userRoles - User's roles (empty array for unauthenticated)
 * @param env - Runtime environment
 * @param showExperimental - Whether to show experimental routes (dev only)
 * @returns Access decision with allowed status and metadata
 */
export function evaluateRouteAccess(
  path: string,
  userRoles: UserRole[],
  env: RuntimeEnvironment,
  showExperimental: boolean = false
): RouteAccessDecision {
  // Find route metadata
  const route = findRouteMetadata(path);
  
  // Route not found - allow through (404 will be handled by app)
  if (!route) {
    return {
      allowed: true,
      maturity: FeatureMaturity.GA,
      message: 'Route not found in registry',
    };
  }
  
  // Check Golden Path status first
  const gpStatus = getGoldenPathStatus(route.goldenPathId);
  if (route.goldenPathId && !gpStatus.passed) {
    // GP test failed - demote to "not-ready" regardless of maturity
    return {
      allowed: false,
      maturity: route.maturity,
      badge: 'not-ready',
      message: `Feature not ready: Golden Path test ${route.goldenPathId} has not passed`,
      redirectTo: '/status/features',
      route,
    };
  }
  
  // Check maturity visibility
  if (!isMaturityVisible(route.maturity, env, showExperimental)) {
    const envLabel = env === 'prod' ? 'production' : env === 'staging' ? 'staging' : 'development';
    return {
      allowed: false,
      maturity: route.maturity,
      badge: route.maturity === FeatureMaturity.EXPERIMENTAL ? 'experimental' : 'beta',
      message: `This ${route.maturity} feature is not available in ${envLabel} environment`,
      redirectTo: '/',
      route,
    };
  }
  
  // Check role requirements
  if (!hasRequiredRole(userRoles, route.roles)) {
    return {
      allowed: false,
      maturity: route.maturity,
      message: `Insufficient permissions: This route requires one of these roles: ${route.roles?.join(', ') || 'none'}`,
      redirectTo: '/',
      route,
    };
  }
  
  // All checks passed
  const decision: RouteAccessDecision = {
    allowed: true,
    maturity: route.maturity,
    route,
  };
  
  // Add badge for non-GA routes
  if (route.maturity === FeatureMaturity.BETA) {
    decision.badge = 'beta';
  } else if (route.maturity === FeatureMaturity.EXPERIMENTAL) {
    decision.badge = 'experimental';
  }
  
  return decision;
}

/**
 * Get all accessible routes for user
 * 
 * Filters ROUTE_REGISTRY to only routes accessible in current environment
 * and for current user.
 * 
 * @param userRoles - User's roles
 * @param env - Runtime environment
 * @param showExperimental - Whether to show experimental routes
 * @returns Array of accessible routes with access decisions
 */
export function getAccessibleRoutes(
  userRoles: UserRole[],
  env: RuntimeEnvironment = getRuntimeEnv(),
  showExperimental: boolean = false
): Array<{ route: RouteMetadata; decision: RouteAccessDecision }> {
  const results: Array<{ route: RouteMetadata; decision: RouteAccessDecision }> = [];
  
  for (const [path, route] of Object.entries(ROUTE_REGISTRY)) {
    const decision = evaluateRouteAccess(path, userRoles, env, showExperimental);
    
    if (decision.allowed) {
      results.push({ route, decision });
    }
  }
  
  return results;
}

/**
 * Get navigation routes for sidebar (only routes with showInNav=true)
 * 
 * @param userRoles - User's roles
 * @param env - Runtime environment
 * @param showExperimental - Whether to show experimental routes
 * @returns Array of navigation routes with access decisions
 */
export function getNavigationRoutes(
  userRoles: UserRole[],
  env: RuntimeEnvironment = getRuntimeEnv(),
  showExperimental: boolean = false
): Array<{ route: RouteMetadata; decision: RouteAccessDecision }> {
  return getAccessibleRoutes(userRoles, env, showExperimental)
    .filter(({ route }) => route.showInNav === true);
}
