/**
 * Feature Flag Infrastructure
 * 
 * Defines feature maturity levels and flag registry for AAA transformation.
 * Used by gatekeeper middleware to control feature exposure by environment.
 * 
 * @module shared/featureFlags
 */

import { z } from 'zod';

/**
 * Feature Maturity Levels
 * 
 * - experimental: In active development, unstable, dev-only
 * - beta: Feature complete, undergoing refinement, staging-only
 * - ga: Generally Available, production-ready, fully tested
 */
export enum FeatureMaturity {
  EXPERIMENTAL = 'experimental',
  BETA = 'beta',
  GA = 'ga',
}

/**
 * Feature Flag Definition
 */
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  maturity: FeatureMaturity;
  enabledEnvironments: ('development' | 'staging' | 'production')[];
  goldenPathId?: string; // e.g., "GP-01", "GP-02"
  owner: string; // Team/person responsible
  jiraTicket?: string; // Optional tracking
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Feature Flag Registry
 * 
 * Central source of truth for all feature flags.
 * Add new flags here when building features.
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Core System (GA - Production Ready)
  CALENDAR_IMPORT: {
    key: 'CALENDAR_IMPORT',
    name: 'Google Calendar Import',
    description: 'Automated calendar event parsing and job creation from Building Knowledge calendar',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-01',
    owner: 'Product Team',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  OFFLINE_SYNC: {
    key: 'OFFLINE_SYNC',
    name: 'Offline-First Sync',
    description: 'IndexedDB storage, Service Worker caching, and photo upload queue',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-03',
    owner: 'Product Team',
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  BLOWER_DOOR_TESTING: {
    key: 'BLOWER_DOOR_TESTING',
    name: 'Blower Door Testing',
    description: 'Blower door test calculations with TEC Auto Test import and compliance evaluation',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-02',
    owner: 'Product Team',
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  DUCT_LEAKAGE_TESTING: {
    key: 'DUCT_LEAKAGE_TESTING',
    name: 'Duct Leakage Testing',
    description: 'Photo-based duct leakage testing with manual CFM entry and compliance checks',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-02',
    owner: 'Product Team',
    createdAt: '2024-10-20T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  VENTILATION_TESTING: {
    key: 'VENTILATION_TESTING',
    name: 'Ventilation Testing',
    description: 'Airflow measurement testing with compliance evaluation',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-02',
    owner: 'Product Team',
    createdAt: '2024-10-25T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  REPORT_GENERATION: {
    key: 'REPORT_GENERATION',
    name: 'PDF Report Generation',
    description: 'Dynamic PDF report generation with @react-pdf/renderer',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-01',
    owner: 'Product Team',
    createdAt: '2024-09-20T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  FIELD_DAY_VIEW: {
    key: 'FIELD_DAY_VIEW',
    name: 'Field Day Experience',
    description: 'Mobile-first daily workload view with large touch-friendly status buttons',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-01',
    owner: 'Product Team',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  QA_SYSTEM: {
    key: 'QA_SYSTEM',
    name: 'Quality Assurance System',
    description: 'QA item triage, assignment, and resolution workflow',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-05',
    owner: 'Product Team',
    createdAt: '2024-10-05T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  TAX_CREDITS_45L: {
    key: 'TAX_CREDITS_45L',
    name: '45L Tax Credits',
    description: 'Document ingestion, status tracking, and certification export for 45L tax credits',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    goldenPathId: 'GP-04',
    owner: 'Product Team',
    createdAt: '2024-10-10T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  EQUIPMENT_MANAGEMENT: {
    key: 'EQUIPMENT_MANAGEMENT',
    name: 'Equipment Management',
    description: 'Equipment inventory, calibration tracking, and checkout workflows',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-09-25T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  FINANCIAL_MANAGEMENT: {
    key: 'FINANCIAL_MANAGEMENT',
    name: 'Financial Management',
    description: 'Invoicing, payment tracking, expense management, and profitability analytics',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-10-30T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  COMPLIANCE_TRACKING: {
    key: 'COMPLIANCE_TRACKING',
    name: 'Minnesota Compliance Suite',
    description: 'ENERGY STAR MFNC, MN Housing EGCC, ZERH, and Building Energy Benchmarking',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  WEBSOCKET_NOTIFICATIONS: {
    key: 'WEBSOCKET_NOTIFICATIONS',
    name: 'Real-Time Notifications',
    description: 'WebSocket-based real-time updates with HTTP polling fallback',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-09-30T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  BACKGROUND_JOBS_MONITORING: {
    key: 'BACKGROUND_JOBS_MONITORING',
    name: 'Background Jobs Dashboard',
    description: 'Admin dashboard for monitoring cron jobs and scheduled tasks',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  GAMIFICATION: {
    key: 'GAMIFICATION',
    name: 'Achievements & Gamification',
    description: 'Achievement tracking and gamification system',
    maturity: FeatureMaturity.GA,
    enabledEnvironments: ['development', 'staging', 'production'],
    owner: 'Product Team',
    createdAt: '2024-09-10T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  // Beta Features (Staging Only)
  ANALYTICS_DASHBOARD_V2: {
    key: 'ANALYTICS_DASHBOARD_V2',
    name: 'Analytics Dashboard V2',
    description: 'Enhanced analytics with Recharts visualizations and drill-down capabilities',
    maturity: FeatureMaturity.BETA,
    enabledEnvironments: ['development', 'staging'],
    owner: 'Product Team',
    createdAt: '2025-10-15T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  PHOTO_AI_TAGGING: {
    key: 'PHOTO_AI_TAGGING',
    name: 'AI-Powered Photo Tagging',
    description: 'Machine learning-based automatic photo tagging and categorization',
    maturity: FeatureMaturity.BETA,
    enabledEnvironments: ['development', 'staging'],
    owner: 'Product Team',
    createdAt: '2025-10-20T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  BUILDER_PORTAL: {
    key: 'BUILDER_PORTAL',
    name: 'Builder Self-Service Portal',
    description: 'Self-service portal for builders to view jobs, reports, and invoices',
    maturity: FeatureMaturity.BETA,
    enabledEnvironments: ['development', 'staging'],
    owner: 'Product Team',
    createdAt: '2025-10-25T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  // Experimental Features (Dev Only)
  VOICE_NOTES: {
    key: 'VOICE_NOTES',
    name: 'Voice Notes',
    description: 'Voice-to-text transcription for field notes',
    maturity: FeatureMaturity.EXPERIMENTAL,
    enabledEnvironments: ['development'],
    owner: 'Product Team',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  AR_MEASUREMENTS: {
    key: 'AR_MEASUREMENTS',
    name: 'AR Measurements',
    description: 'Augmented reality-based measurement capture using smartphone camera',
    maturity: FeatureMaturity.EXPERIMENTAL,
    enabledEnvironments: ['development'],
    owner: 'Product Team',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
  
  PREDICTIVE_SCHEDULING: {
    key: 'PREDICTIVE_SCHEDULING',
    name: 'Predictive Scheduling',
    description: 'ML-powered job scheduling optimization based on travel time and inspector skills',
    maturity: FeatureMaturity.EXPERIMENTAL,
    enabledEnvironments: ['development'],
    owner: 'Product Team',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-02T00:00:00Z',
  },
};

/**
 * Get current environment from Node.env or Vite import.meta.env
 */
export function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  // Server-side (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'staging') return 'staging';
    return 'development';
  }
  
  // Client-side (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteMode = import.meta.env.MODE || 'development';
    if (viteMode === 'production') return 'production';
    if (viteMode === 'staging') return 'staging';
    return 'development';
  }
  
  return 'development';
}

/**
 * Check if a feature is enabled in the current environment
 */
export function isFeatureEnabled(flagKey: string): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) {
    console.warn(`Feature flag '${flagKey}' not found in registry`);
    return false;
  }
  
  const currentEnv = getCurrentEnvironment();
  return flag.enabledEnvironments.includes(currentEnv);
}

/**
 * Get all enabled features for the current environment
 */
export function getEnabledFeatures(): FeatureFlag[] {
  const currentEnv = getCurrentEnvironment();
  return Object.values(FEATURE_FLAGS).filter(flag =>
    flag.enabledEnvironments.includes(currentEnv)
  );
}

/**
 * Get features by maturity level
 */
export function getFeaturesByMaturity(maturity: FeatureMaturity): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.maturity === maturity);
}

/**
 * Get features by Golden Path ID
 */
export function getFeaturesByGoldenPath(goldenPathId: string): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.goldenPathId === goldenPathId);
}

/**
 * Get maturity badge color for UI
 */
export function getMaturityBadgeColor(maturity: FeatureMaturity): string {
  switch (maturity) {
    case FeatureMaturity.GA:
      return 'green';
    case FeatureMaturity.BETA:
      return 'yellow';
    case FeatureMaturity.EXPERIMENTAL:
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Zod schema for feature flag validation
 */
export const featureFlagSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  maturity: z.nativeEnum(FeatureMaturity),
  enabledEnvironments: z.array(z.enum(['development', 'staging', 'production'])),
  goldenPathId: z.string().optional(),
  owner: z.string(),
  jiraTicket: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;
