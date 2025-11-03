/**
 * Gatekeeper Middleware & Gate Status Utilities
 * 
 * Controls route visibility based on:
 * - Feature maturity level (GA, Beta, Experimental)
 * - Environment (production, staging, development)
 * - Golden Path test status
 * 
 * **Visibility Rules** (SAFETY_MODE = "report-only"):
 * - Production: Show ALL routes (report-only mode for gradual rollout)
 * - Staging: Show GA + Beta routes
 * - Development: Show all routes with readiness badges
 * 
 * **Enforcement Mode** (SAFETY_MODE = "enforce", future):
 * - Production: Show ONLY GA routes
 * - Staging: Show GA + Beta routes
 * - Development: Show all routes
 * 
 * @module client/src/lib/gates
 */

import { FeatureMaturity } from '@shared/featureFlags';
import type { RouteMetadata } from '@shared/navigation';

/**
 * Gate status for a single Golden Path test
 */
export interface GoldenPathGateStatus {
  id: string;
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  lastRun: string | null;
  duration: number;
  functional: {
    passed: number;
    failed: number;
    total: number;
  };
  accessibility: {
    violations: number;
    passes: number;
    score: number;
  };
  performance: {
    score: number;
    lcp: number;
    cls: number;
    tbt: number;
    budgetsPassed: boolean;
    budgetViolations: BudgetViolation[];
    passed: boolean;
  };
  routes: string[];
}

/**
 * Budget violation details
 */
export interface BudgetViolation {
  label: string;
  sizeOverBudget?: number;
  countOverBudget?: number;
}

/**
 * Complete gate status JSON structure
 */
export interface GateStatus {
  lastUpdated: string;
  environment: 'production' | 'staging' | 'development';
  goldenPathTests: Record<string, GoldenPathGateStatus>;
  routes: Record<string, {
    maturity?: FeatureMaturity;
    goldenPathId?: string;
    lastTestRun?: string;
    lastPerformanceTest?: string;
    status?: 'passed' | 'failed' | 'pending';
    performance?: {
      score: number;
      lcp: number;
      cls: number;
      tbt: number;
      budgetsPassed: boolean;
      budgetViolations: BudgetViolation[];
      passed: boolean;
    };
  }>;
}

/**
 * Safety mode configuration
 */
export const SAFETY_MODE: 'report-only' | 'enforce' = 'report-only';

/**
 * Current environment detection
 */
export function getCurrentEnvironment(): 'production' | 'staging' | 'development' {
  if (typeof window === 'undefined') return 'development';
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('.replit.app') || hostname.includes('repl.co')) {
    return 'production';
  }
  
  if (hostname.includes('staging') || hostname.includes('beta')) {
    return 'staging';
  }
  
  return 'development';
}

/**
 * Fetch gate status from public JSON
 */
export async function fetchGateStatus(): Promise<GateStatus | null> {
  try {
    const response = await fetch('/gate-status.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.warn('Gate status not available, defaulting to permissive mode');
      return null;
    }
    
    const data = await response.json();
    return data as GateStatus;
  } catch (error) {
    console.warn('Failed to fetch gate status:', error);
    return null;
  }
}

/**
 * Check if route should be visible in current environment
 * 
 * **Report-Only Mode** (current):
 * - All routes visible in all environments
 * - Readiness badges show maturity level
 * - Logs violations but doesn't block access
 * 
 * **Enforce Mode** (future):
 * - Production: GA only
 * - Staging: GA + Beta
 * - Development: All routes
 */
export function isRouteVisible(route: RouteMetadata, environment?: 'production' | 'staging' | 'development'): boolean {
  const env = environment || getCurrentEnvironment();
  
  // Report-only mode: Allow all routes, log for monitoring
  if (SAFETY_MODE === 'report-only') {
    if (env === 'production' && route.maturity !== FeatureMaturity.GA) {
      console.info(`[Gatekeeper] Non-GA route visible in production (report-only mode): ${route.path}`);
    }
    return true;
  }
  
  // Enforce mode (future): Strict visibility rules
  switch (env) {
    case 'production':
      return route.maturity === FeatureMaturity.GA;
      
    case 'staging':
      return route.maturity === FeatureMaturity.GA || route.maturity === FeatureMaturity.BETA;
      
    case 'development':
      return true;
      
    default:
      return true;
  }
}

/**
 * Filter routes based on visibility rules
 */
export function filterVisibleRoutes(routes: RouteMetadata[], environment?: 'production' | 'staging' | 'development'): RouteMetadata[] {
  return routes.filter(route => isRouteVisible(route, environment));
}

/**
 * Check if route should show readiness badge
 */
export function shouldShowReadinessBadge(route: RouteMetadata, environment?: 'production' | 'staging' | 'development'): boolean {
  const env = environment || getCurrentEnvironment();
  
  // Always show badges in development
  if (env === 'development') {
    return true;
  }
  
  // Show badges for non-GA routes in staging
  if (env === 'staging' && route.maturity !== FeatureMaturity.GA) {
    return true;
  }
  
  // In production report-only mode, show badges for non-GA routes as warning
  if (env === 'production' && SAFETY_MODE === 'report-only' && route.maturity !== FeatureMaturity.GA) {
    return true;
  }
  
  return false;
}

/**
 * Get Golden Path test status for a route
 */
export async function getGoldenPathStatus(goldenPathId: string): Promise<GoldenPathGateStatus | null> {
  const gateStatus = await fetchGateStatus();
  if (!gateStatus) return null;
  
  return gateStatus.goldenPathTests[goldenPathId] || null;
}

/**
 * Check if all routes in a Golden Path test have passed
 */
export function hasGoldenPathPassed(gpStatus: GoldenPathGateStatus): boolean {
  return (
    gpStatus.status === 'passed' &&
    gpStatus.functional.failed === 0 &&
    gpStatus.accessibility.violations === 0 &&
    gpStatus.performance.passed
  );
}

/**
 * Get maturity level that route should be promoted to based on GP status
 */
export async function getRecommendedMaturity(route: RouteMetadata): Promise<FeatureMaturity> {
  if (!route.goldenPathId) {
    // No GP test = stay at current maturity
    return route.maturity;
  }
  
  const gpStatus = await getGoldenPathStatus(route.goldenPathId);
  if (!gpStatus) {
    // No gate status data = stay at current maturity
    return route.maturity;
  }
  
  if (hasGoldenPathPassed(gpStatus)) {
    // GP passed = promote to GA
    return FeatureMaturity.GA;
  } else if (gpStatus.status === 'failed') {
    // GP failed = demote to Beta (if not already lower)
    return route.maturity === FeatureMaturity.GA ? FeatureMaturity.BETA : route.maturity;
  }
  
  // GP pending/skipped = stay at current maturity
  return route.maturity;
}

/**
 * Development-only toggle for showing experimental routes
 */
export function useExperimentalRoutesToggle(): [boolean, (enabled: boolean) => void] {
  const key = 'show-experimental-routes';
  
  // Read from localStorage (client-side only)
  const getEnabled = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  };
  
  const setEnabled = (enabled: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, enabled.toString());
      window.location.reload(); // Refresh to apply changes
    } catch (error) {
      console.error('Failed to save experimental routes preference:', error);
    }
  };
  
  return [getEnabled(), setEnabled];
}

/**
 * Log gate decision for monitoring (report-only mode)
 */
export function logGateDecision(route: RouteMetadata, allowed: boolean, reason: string): void {
  if (SAFETY_MODE === 'report-only') {
    console.info(`[Gatekeeper] ${allowed ? '✅ ALLOW' : '🚫 BLOCK'} ${route.path} - ${reason}`);
  }
}
