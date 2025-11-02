/**
 * Navigation Metadata Registry
 * 
 * Central source of truth for all routes in the application.
 * Used by gatekeeper middleware, breadcrumbs, and /status/features page.
 * 
 * @module client/src/lib/navigation
 */

import { FeatureMaturity } from '@shared/featureFlags';

/**
 * User roles from shared/schema.ts
 */
export type UserRole = 'admin' | 'inspector' | 'partner_contractor';

/**
 * Route metadata definition
 */
export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  allowedRoles: UserRole[];
  maturity: FeatureMaturity;
  goldenPathId?: string; // e.g., "GP-01", "GP-02"
  featureFlagKey?: string; // Maps to FEATURE_FLAGS registry
  category: 'core' | 'field' | 'admin' | 'builder' | 'financial' | 'compliance' | 'testing' | 'system';
  isMobileOptimized: boolean;
  breadcrumbs?: string[]; // e.g., ["Home", "Jobs", "Job Detail"]
  requiresAuth: boolean;
  isPublic: boolean; // Public routes don't require auth
}

/**
 * Route Registry
 * 
 * All routes in the application. Add new routes here.
 * Keep this synchronized with client/src/App.tsx routing.
 */
export const ROUTE_REGISTRY: Record<string, RouteMetadata> = {
  // Public Routes
  HOME: {
    path: '/',
    title: 'Dashboard',
    description: 'Main dashboard with inspection overview and quick actions',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Field Operations (Mobile-Optimized)
  FIELD_DAY: {
    path: '/field-day',
    title: 'Field Day',
    description: 'Daily workload view with assigned jobs and large touch-friendly status buttons',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-01',
    featureFlagKey: 'FIELD_DAY_VIEW',
    category: 'field',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  INSPECTION: {
    path: '/inspection/:id',
    title: 'Inspection Workflow',
    description: 'Step-by-step inspection workflow with checklist, photos, and measurements',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-01',
    category: 'field',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  PHOTOS: {
    path: '/photos',
    title: 'Photos',
    description: 'Photo library with multi-tagging, annotations, and OCR',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-03',
    featureFlagKey: 'OFFLINE_SYNC',
    category: 'field',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Job Management
  JOBS: {
    path: '/jobs',
    title: 'Jobs',
    description: 'Job list with search, filtering, and bulk operations',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  JOB_DETAIL: {
    path: '/jobs/:id',
    title: 'Job Detail',
    description: 'Detailed job view with timeline, checklists, and test results',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Schedule & Calendar
  SCHEDULE: {
    path: '/schedule',
    title: 'Schedule',
    description: 'Calendar view with drag-and-drop scheduling and assignment workflow',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-01',
    featureFlagKey: 'CALENDAR_IMPORT',
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  CALENDAR_MANAGEMENT: {
    path: '/calendar/management',
    title: 'Calendar Management',
    description: 'Google Calendar integration settings and preferences',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'CALENDAR_IMPORT',
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  CALENDAR_REVIEW: {
    path: '/calendar/review',
    title: 'Calendar Review',
    description: 'Review and approve pending calendar imports',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'CALENDAR_IMPORT',
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Testing Systems
  BLOWER_DOOR: {
    path: '/testing/blower-door',
    title: 'Blower Door Testing',
    description: 'Blower door test entry with TEC Auto Test import and compliance evaluation',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-02',
    featureFlagKey: 'BLOWER_DOOR_TESTING',
    category: 'testing',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  DUCT_LEAKAGE: {
    path: '/testing/duct-leakage',
    title: 'Duct Leakage Testing',
    description: 'Photo-based duct leakage testing with manual CFM entry',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-02',
    featureFlagKey: 'DUCT_LEAKAGE_TESTING',
    category: 'testing',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  VENTILATION: {
    path: '/testing/ventilation',
    title: 'Ventilation Testing',
    description: 'Airflow measurement testing with compliance checks',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-02',
    featureFlagKey: 'VENTILATION_TESTING',
    category: 'testing',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Builder Management
  BUILDERS: {
    path: '/builders',
    title: 'Builders',
    description: 'Builder list with contacts and construction managers',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    category: 'builder',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  BUILDER_DETAIL: {
    path: '/builders/:id',
    title: 'Builder Detail',
    description: 'Builder profile with developments, contacts, and agreements',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    category: 'builder',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  DEVELOPMENTS: {
    path: '/developments',
    title: 'Developments',
    description: 'Development list with lots and geographic hierarchy',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    category: 'builder',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  PLANS: {
    path: '/plans',
    title: 'Plans',
    description: 'Floor plan library with forecasts',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    category: 'builder',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Reports
  REPORTS: {
    path: '/reports',
    title: 'Reports',
    description: 'Report instance list with search and export',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-01',
    featureFlagKey: 'REPORT_GENERATION',
    category: 'core',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  REPORT_VIEWER: {
    path: '/reports/:id/view',
    title: 'Report Viewer',
    description: 'PDF report viewer with download and share',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'REPORT_GENERATION',
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  REPORT_TEMPLATES: {
    path: '/report-templates',
    title: 'Report Templates',
    description: 'Report template management with JSON editor',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Quality Assurance
  QUALITY_ASSURANCE: {
    path: '/quality-assurance',
    title: 'Quality Assurance',
    description: 'QA item triage with assignment and resolution workflow',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-05',
    featureFlagKey: 'QA_SYSTEM',
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Financial Management
  EXPENSES: {
    path: '/expenses',
    title: 'Expenses',
    description: 'Expense tracking with OCR receipt scanning',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'FINANCIAL_MANAGEMENT',
    category: 'financial',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  MILEAGE: {
    path: '/mileage',
    title: 'Mileage Logs',
    description: 'MileIQ-style mileage tracking with GPS routes',
    allowedRoles: ['admin', 'inspector', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'FINANCIAL_MANAGEMENT',
    category: 'financial',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  INVOICING: {
    path: '/invoicing',
    title: 'Invoicing',
    description: 'Invoice generation with payment tracking and AR aging',
    allowedRoles: ['admin', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'FINANCIAL_MANAGEMENT',
    category: 'financial',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  INVOICE_DETAIL: {
    path: '/invoicing/:id',
    title: 'Invoice Detail',
    description: 'Detailed invoice view with line items and payment history',
    allowedRoles: ['admin', 'partner_contractor'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'FINANCIAL_MANAGEMENT',
    category: 'financial',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  FINANCIALS: {
    path: '/financials',
    title: 'Financial Dashboard',
    description: 'Profitability analytics, cash flow, and job cost ledger',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'FINANCIAL_MANAGEMENT',
    category: 'financial',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Compliance
  COMPLIANCE: {
    path: '/compliance',
    title: 'Compliance Tracking',
    description: 'Minnesota compliance suite (ENERGY STAR MFNC, EGCC, ZERH)',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'COMPLIANCE_TRACKING',
    category: 'compliance',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  TAX_CREDITS_45L: {
    path: '/tax-credits/45l',
    title: '45L Tax Credits',
    description: 'Document ingestion and certification export for 45L tax credits',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-04',
    featureFlagKey: 'TAX_CREDITS_45L',
    category: 'compliance',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Equipment
  EQUIPMENT: {
    path: '/equipment',
    title: 'Equipment Management',
    description: 'Equipment inventory with calibration tracking and checkout',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'EQUIPMENT_MANAGEMENT',
    category: 'core',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Analytics
  ANALYTICS: {
    path: '/analytics',
    title: 'Analytics',
    description: 'Inspection volume, photo analysis, and builder performance',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Achievements (Gamification)
  ACHIEVEMENTS: {
    path: '/achievements',
    title: 'Achievements',
    description: 'Achievement tracking and gamification',
    allowedRoles: ['admin', 'inspector'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'GAMIFICATION',
    category: 'core',
    isMobileOptimized: true,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Admin
  ADMIN_DASHBOARD: {
    path: '/admin',
    title: 'Admin Dashboard',
    description: 'System administration and configuration',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    category: 'admin',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  BACKGROUND_JOBS: {
    path: '/admin/background-jobs',
    title: 'Background Jobs',
    description: 'Cron job monitoring and execution history',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    featureFlagKey: 'BACKGROUND_JOBS_MONITORING',
    category: 'system',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  AUDIT_LOGS: {
    path: '/admin/audit-logs',
    title: 'Audit Logs',
    description: 'Immutable audit trail with correlation IDs',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    category: 'system',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  ADMIN_DIAGNOSTICS: {
    path: '/admin/diagnostics',
    title: 'System Diagnostics',
    description: 'Health checks, metrics, and performance monitoring',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.GA,
    category: 'system',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // AAA Transformation Routes
  STATUS_FEATURES: {
    path: '/status/features',
    title: 'Feature Status',
    description: 'Feature maturity dashboard with Golden Path test results',
    allowedRoles: ['admin'],
    maturity: FeatureMaturity.BETA,
    category: 'system',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
  
  // Beta Features
  BUILDER_PORTAL: {
    path: '/builder-portal',
    title: 'Builder Portal',
    description: 'Self-service portal for builders',
    allowedRoles: ['partner_contractor'],
    maturity: FeatureMaturity.BETA,
    featureFlagKey: 'BUILDER_PORTAL',
    category: 'builder',
    isMobileOptimized: false,
    requiresAuth: true,
    isPublic: false,
  },
};

/**
 * Get route metadata by path
 */
export function getRouteMetadata(path: string): RouteMetadata | undefined {
  // Exact match first
  const exactMatch = Object.values(ROUTE_REGISTRY).find(route => route.path === path);
  if (exactMatch) return exactMatch;
  
  // Pattern match for dynamic routes (e.g., /jobs/:id)
  const patternMatch = Object.values(ROUTE_REGISTRY).find(route => {
    const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
  
  return patternMatch;
}

/**
 * Get routes by category
 */
export function getRoutesByCategory(category: RouteMetadata['category']): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(route => route.category === category);
}

/**
 * Get routes by maturity
 */
export function getRoutesByMaturity(maturity: FeatureMaturity): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(route => route.maturity === maturity);
}

/**
 * Get routes by Golden Path
 */
export function getRoutesByGoldenPath(goldenPathId: string): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(route => route.goldenPathId === goldenPathId);
}

/**
 * Check if user has access to route
 */
export function canAccessRoute(route: RouteMetadata, userRole: UserRole): boolean {
  return route.allowedRoles.includes(userRole);
}

/**
 * Get filtered routes for user
 */
export function getRoutesForUser(userRole: UserRole): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(route => canAccessRoute(route, userRole));
}

/**
 * Get mobile-optimized routes
 */
export function getMobileOptimizedRoutes(): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(route => route.isMobileOptimized);
}

/**
 * Generate breadcrumbs for a route
 */
export function generateBreadcrumbs(path: string): string[] {
  const route = getRouteMetadata(path);
  if (!route) return [];
  
  if (route.breadcrumbs) return route.breadcrumbs;
  
  // Auto-generate breadcrumbs from path
  const segments = path.split('/').filter(Boolean);
  return ['Home', ...segments.map(seg => {
    // Convert kebab-case to Title Case
    return seg
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  })];
}

/**
 * Get all routes (for /status/features page)
 */
export function getAllRoutes(): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY);
}

/**
 * Get route statistics
 */
export function getRouteStatistics() {
  const allRoutes = getAllRoutes();
  
  return {
    total: allRoutes.length,
    ga: allRoutes.filter(r => r.maturity === FeatureMaturity.GA).length,
    beta: allRoutes.filter(r => r.maturity === FeatureMaturity.BETA).length,
    experimental: allRoutes.filter(r => r.maturity === FeatureMaturity.EXPERIMENTAL).length,
    mobileOptimized: allRoutes.filter(r => r.isMobileOptimized).length,
    requiresAuth: allRoutes.filter(r => r.requiresAuth).length,
    byCategory: {
      core: allRoutes.filter(r => r.category === 'core').length,
      field: allRoutes.filter(r => r.category === 'field').length,
      admin: allRoutes.filter(r => r.category === 'admin').length,
      builder: allRoutes.filter(r => r.category === 'builder').length,
      financial: allRoutes.filter(r => r.category === 'financial').length,
      compliance: allRoutes.filter(r => r.category === 'compliance').length,
      testing: allRoutes.filter(r => r.category === 'testing').length,
      system: allRoutes.filter(r => r.category === 'system').length,
    },
  };
}
