import type { FeatureMaturity } from './featureFlags';
import type { UserRole } from './types';
import type { FeatureFlagKey } from './featureFlags';

export interface TierDistribution {
  tier: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MonthlyHighlight {
  label: string;
  value: string | number;
  type: 'success' | 'info' | 'warning';
}

export interface DashboardSummary {
  totalInspections: number;
  averageACH50: number;
  tierDistribution: TierDistribution[];
  passRate: number;
  failRate: number;
  tax45LEligibleCount: number;
  totalPotentialTaxCredits: number;
  monthlyHighlights: MonthlyHighlight[];
}

export interface BuilderLeaderboardEntry {
  builderId: string;
  builderName: string;
  averageACH50: number;
  tier: string;
  totalJobs: number;
  passRate: number;
  bestACH50: number;
  latestACH50: number | null;
  tierDistribution: TierDistribution[];
}

export type TierName = 'Elite' | 'Excellent' | 'Very Good' | 'Good' | 'Passing' | 'Failing';

export interface TierConfig {
  name: TierName;
  min: number;
  max: number;
  color: string;
}

export const TIER_CONFIGS: TierConfig[] = [
  { name: 'Elite', min: 0.5, max: 1.0, color: '#0B7285' },
  { name: 'Excellent', min: 1.0, max: 1.5, color: '#2E8B57' },
  { name: 'Very Good', min: 1.5, max: 2.0, color: '#3FA34D' },
  { name: 'Good', min: 2.0, max: 2.5, color: '#A0C34E' },
  { name: 'Passing', min: 2.5, max: 3.0, color: '#FFC107' },
  { name: 'Failing', min: 3.0, max: Infinity, color: '#DC3545' },
];

export function calculateTier(ach50: number): TierName {
  if (ach50 <= 1.0) return 'Elite';
  if (ach50 <= 1.5) return 'Excellent';
  if (ach50 <= 2.0) return 'Very Good';
  if (ach50 <= 2.5) return 'Good';
  if (ach50 <= 3.0) return 'Passing';
  return 'Failing';
}

export function getTierColor(tier: TierName): string {
  const config = TIER_CONFIGS.find(t => t.name === tier);
  return config?.color || '#6C757D';
}

/**
 * Feature Status Dashboard Types
 * 
 * Types for the /status/features admin dashboard that displays
 * maturity status and Golden Path test results for all routes.
 */

/**
 * Route Readiness Information
 * 
 * Complete metadata about a route's maturity, testing status,
 * access control, and quality metrics.
 */
export interface RouteReadiness {
  /** Route path (e.g., "/jobs", "/inspection/:id") */
  path: string;
  
  /** Human-readable page title */
  title: string;
  
  /** Release maturity level (ga, beta, experimental) */
  maturity: FeatureMaturity;
  
  /** Associated Golden Path test ID (e.g., "GP-01", "GP-02") */
  goldenPathId?: string;
  
  /** Golden Path test result status */
  goldenPathStatus?: 'pass' | 'fail' | 'pending' | 'n/a';
  
  /** Required user roles for access */
  roles?: UserRole[];
  
  /** Optional feature flag key */
  flag?: FeatureFlagKey;
  
  /** Route description */
  description?: string;
  
  /** Navigation category (e.g., "Field Work", "Admin") */
  category?: string;
  
  // Future extensibility: Quality metrics
  
  /** Number of accessibility violations (Axe) */
  axeViolations?: number;
  
  /** Accessibility audit status */
  axeStatus?: 'pass' | 'fail' | 'pending';
  
  /** Lighthouse performance score (0-100) */
  lighthouseScore?: number;
  
  /** Test coverage percentage (0-100) */
  testCoverage?: number;
  
  /** Count of TODO comments related to this route */
  todos?: number;
  
  /** Open TODOs or blockers (detailed list - future) */
  openTodos?: string[];
}

/**
 * Readiness Summary Statistics
 * 
 * Aggregated counts and percentages for feature maturity levels.
 */
export interface ReadinessSummary {
  /** Total number of routes */
  totalRoutes: number;
  
  /** Number of GA routes */
  ga: number;
  
  /** Number of Beta routes */
  beta: number;
  
  /** Number of Experimental routes */
  experimental: number;
  
  /** Percentage of GA routes (0-100) */
  gaPercentage: number;
  
  /** Percentage of Beta routes (0-100) */
  betaPercentage: number;
  
  /** Percentage of Experimental routes (0-100) */
  experimentalPercentage: number;
}

/**
 * Features Dashboard Response
 * 
 * Complete API response for /api/status/features endpoint.
 */
export interface FeaturesDashboardResponse {
  /** List of all routes with readiness info */
  routes: RouteReadiness[];
  
  /** Summary statistics */
  summary: ReadinessSummary;
  
  /** Timestamp of data generation */
  timestamp: string;
}
