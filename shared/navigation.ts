/**
 * Centralized Navigation Registry & Feature Maturity System
 * 
 * This module provides a single source of truth for all application routes,
 * their maturity levels, required permissions, and metadata for AAA Blueprint compliance.
 * 
 * **Maturity Levels**:
 * - `ga` (Generally Available): Production-ready features with passing Golden Path tests
 * - `beta`: Feature-complete but with rescoped/partial GP coverage, staging-only
 * - `experimental`: Active development, unstable, dev-only
 * 
 * **Integration Points**:
 * - Gatekeeper middleware: Controls route visibility by environment and maturity
 * - Sidebar navigation: Shows/hides routes, displays readiness badges
 * - Page headers: Renders ReadinessChip components
 * - `/status/features` dashboard: Feature maturity overview
 * 
 * @module shared/navigation
 */

import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Calendar,
  Briefcase,
  FileText,
  Camera,
  Users,
  Building2,
  Settings,
  TrendingUp,
  DollarSign,
  Award,
  ClipboardCheck,
  AlertTriangle,
  Wind,
  Wrench,
  Map,
  Clock,
  FileSearch,
  ShieldCheck,
  Bell,
  BarChart3,
  Route as RouteIcon,
  Package,
} from 'lucide-react';
import type { FeatureFlagKey } from './featureFlags';
import type { UserRole } from './types';

/**
 * Feature Maturity Levels
 * 
 * Defines the release readiness of application routes based on
 * Golden Path (GP) test coverage and production stability.
 */
export enum FeatureMaturity {
  /** Generally Available: Production-ready with passing GP tests */
  GA = 'ga',
  /** Beta: Feature-complete with partial/rescoped GP coverage */
  BETA = 'beta',
  /** Experimental: Active development, unstable, dev-only */
  EXPERIMENTAL = 'experimental',
}

/**
 * Breadcrumb Navigation Item
 */
export interface Breadcrumb {
  label: string;
  path: string;
}

/**
 * Route Metadata
 * 
 * Complete metadata for each application route including maturity level,
 * access control, navigation hints, and Golden Path test association.
 */
export interface RouteMetadata {
  /** Route path (e.g., "/jobs", "/inspection/:id") */
  path: string;
  
  /** Human-readable page title */
  title: string;
  
  /** Release maturity level (ga, beta, experimental) */
  maturity: FeatureMaturity;
  
  /** Optional feature flag key from shared/featureFlags.ts */
  flag?: FeatureFlagKey;
  
  /** Required user roles (admin, inspector, lead, builderviewer) */
  roles?: UserRole[];
  
  /** Associated Golden Path test ID (e.g., "GP-01", "GP-02") */
  goldenPathId?: string;
  
  /** Breadcrumb trail for navigation */
  breadcrumbs?: Breadcrumb[];
  
  /** Lucide icon for navigation menus */
  icon?: LucideIcon;
  
  /** Short description for feature dashboards */
  description?: string;
  
  /** Parent route path for nested routes */
  parent?: string;
  
  /** Whether route appears in main navigation */
  showInNav?: boolean;
}

/**
 * Complete Route Registry
 * 
 * Maps all application routes to their metadata. Routes are organized by
 * functional area and maturity level for maintainability.
 */
export const ROUTE_REGISTRY: Record<string, RouteMetadata> = {
  // ============================================================================
  // GA ROUTES - Production-ready with Golden Path test coverage
  // ============================================================================
  
  // --- Dashboard & Field Work (GP-01) ---
  '/': {
    path: '/',
    title: 'Dashboard',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    icon: Home,
    description: 'Inspector dashboard with daily jobs, KPIs, and activity feed',
    showInNav: true,
  },
  
  '/field-day': {
    path: '/field-day',
    title: 'Field Day',
    maturity: FeatureMaturity.GA,
    flag: 'FIELD_DAY_VIEW',
    goldenPathId: 'GP-01',
    icon: Briefcase,
    description: 'Mobile-first daily workload view with large touch-friendly status buttons',
    showInNav: true,
  },
  
  // --- Jobs (GP-01) ---
  '/jobs': {
    path: '/jobs',
    title: 'Jobs',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    icon: Briefcase,
    description: 'Job list with filtering, search, and batch operations',
    showInNav: true,
  },
  
  '/jobs/:id': {
    path: '/jobs/:id',
    title: 'Job Details',
    maturity: FeatureMaturity.GA,
    goldenPathId: 'GP-01',
    parent: '/jobs',
    description: 'Redirects to inspection workflow',
    showInNav: false,
  },
  
  // --- Inspection Workflow (GP-01, GP-02) ---
  '/inspection/:id': {
    path: '/inspection/:id',
    title: 'Inspection Workflow',
    maturity: FeatureMaturity.GA,
    flag: 'BLOWER_DOOR_TESTING',
    goldenPathId: 'GP-02',
    icon: ClipboardCheck,
    description: 'Step-by-step inspection workflow with checklist, photos, and measurements',
    parent: '/jobs',
    showInNav: false,
  },
  
  // --- Schedule & Calendar (GP-01) ---
  '/schedule': {
    path: '/schedule',
    title: 'Schedule',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    icon: Calendar,
    description: 'Calendar view with drag-and-drop job scheduling',
    showInNav: true,
  },
  
  '/calendar-management': {
    path: '/calendar-management',
    title: 'Calendar Management',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    roles: ['admin'],
    icon: Calendar,
    description: 'Google Calendar import settings and configuration',
    showInNav: true,
  },
  
  '/calendar-review': {
    path: '/calendar-review',
    title: 'Calendar Event Review',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    roles: ['admin'],
    icon: Calendar,
    description: 'Review and approve pending calendar events before job creation',
    parent: '/calendar-management',
    showInNav: false,
  },
  
  '/calendar-imports': {
    path: '/calendar-imports',
    title: 'Calendar Import History',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    roles: ['admin'],
    icon: Clock,
    description: 'Historical log of calendar import runs and results',
    parent: '/calendar-management',
    showInNav: false,
  },
  
  '/admin/calendar-import': {
    path: '/admin/calendar-import',
    title: 'Calendar Import Queue',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    roles: ['admin'],
    icon: Clock,
    description: 'Real-time queue of pending calendar events awaiting import',
    parent: '/calendar-management',
    showInNav: false,
  },
  
  // --- Builders (GP-01) ---
  '/builders': {
    path: '/builders',
    title: 'Builders',
    maturity: FeatureMaturity.GA,
    flag: 'CALENDAR_IMPORT',
    goldenPathId: 'GP-01',
    icon: Building2,
    description: 'Builder/contractor management with hierarchy and programs',
    showInNav: true,
  },
  
  // --- Testing Systems (GP-02) ---
  '/blower-door-test': {
    path: '/blower-door-test',
    title: 'Blower Door Testing',
    maturity: FeatureMaturity.GA,
    flag: 'BLOWER_DOOR_TESTING',
    goldenPathId: 'GP-02',
    icon: Wind,
    description: 'Air leakage testing with TEC Auto Test import and compliance evaluation',
    showInNav: true,
  },
  
  '/blower-door/:jobId': {
    path: '/blower-door/:jobId',
    title: 'Blower Door Test',
    maturity: FeatureMaturity.GA,
    flag: 'BLOWER_DOOR_TESTING',
    goldenPathId: 'GP-02',
    parent: '/blower-door-test',
    description: 'Blower door test for specific job',
    showInNav: false,
  },
  
  '/duct-leakage-test': {
    path: '/duct-leakage-test',
    title: 'Duct Leakage Testing',
    maturity: FeatureMaturity.GA,
    flag: 'DUCT_LEAKAGE_TESTING',
    goldenPathId: 'GP-02',
    icon: Wind,
    description: 'Photo-based duct leakage testing with manual CFM entry',
    showInNav: true,
  },
  
  '/duct-leakage/:jobId': {
    path: '/duct-leakage/:jobId',
    title: 'Duct Leakage Test',
    maturity: FeatureMaturity.GA,
    flag: 'DUCT_LEAKAGE_TESTING',
    goldenPathId: 'GP-02',
    parent: '/duct-leakage-test',
    description: 'Duct leakage test for specific job',
    showInNav: false,
  },
  
  '/ventilation-tests': {
    path: '/ventilation-tests',
    title: 'Ventilation Testing',
    maturity: FeatureMaturity.GA,
    flag: 'VENTILATION_TESTING',
    goldenPathId: 'GP-02',
    icon: Wind,
    description: 'Airflow measurement testing with compliance evaluation',
    showInNav: true,
  },
  
  '/ventilation-tests/:jobId': {
    path: '/ventilation-tests/:jobId',
    title: 'Ventilation Test',
    maturity: FeatureMaturity.GA,
    flag: 'VENTILATION_TESTING',
    goldenPathId: 'GP-02',
    parent: '/ventilation-tests',
    description: 'Ventilation test for specific job',
    showInNav: false,
  },
  
  // --- Equipment (GP-02) ---
  '/equipment': {
    path: '/equipment',
    title: 'Equipment',
    maturity: FeatureMaturity.GA,
    flag: 'EQUIPMENT_MANAGEMENT',
    goldenPathId: 'GP-02',
    icon: Wrench,
    description: 'Equipment inventory, calibration tracking, and checkout workflows',
    showInNav: true,
  },
  
  // --- Reports & Exports (GP-01, GP-02) ---
  '/reports': {
    path: '/reports',
    title: 'Reports',
    maturity: FeatureMaturity.GA,
    flag: 'REPORT_GENERATION',
    goldenPathId: 'GP-01',
    icon: FileText,
    description: 'PDF report generation and management',
    showInNav: true,
  },
  
  '/reports/:id': {
    path: '/reports/:id',
    title: 'Report Instance',
    maturity: FeatureMaturity.GA,
    flag: 'REPORT_GENERATION',
    goldenPathId: 'GP-01',
    parent: '/reports',
    description: 'View and download specific report',
    showInNav: false,
  },
  
  '/scheduled-exports': {
    path: '/scheduled-exports',
    title: 'Scheduled Exports',
    maturity: FeatureMaturity.GA,
    flag: 'REPORT_GENERATION',
    goldenPathId: 'GP-02',
    icon: Clock,
    description: 'Export history and scheduled report delivery',
    showInNav: true,
  },
  
  // --- Photos (GP-03) ---
  '/photos': {
    path: '/photos',
    title: 'Photos',
    maturity: FeatureMaturity.GA,
    flag: 'OFFLINE_SYNC',
    goldenPathId: 'GP-03',
    icon: Camera,
    description: 'Photo gallery with tagging, annotation, and offline sync',
    showInNav: true,
  },
  
  '/photos/:id': {
    path: '/photos/:id',
    title: 'Job Photos',
    maturity: FeatureMaturity.GA,
    flag: 'OFFLINE_SYNC',
    goldenPathId: 'GP-03',
    parent: '/photos',
    description: 'Photos for specific job',
    showInNav: false,
  },
  
  '/photos/annotate/:photoId': {
    path: '/photos/annotate/:photoId',
    title: 'Photo Annotation',
    maturity: FeatureMaturity.GA,
    flag: 'OFFLINE_SYNC',
    goldenPathId: 'GP-03',
    icon: Camera,
    description: 'Konva-based photo annotation with arrows, text, and shapes',
    parent: '/photos',
    showInNav: false,
  },
  
  // ============================================================================
  // BETA ROUTES - Rescoped Golden Path coverage, staging-only
  // ============================================================================
  
  // --- Tax Credits (GP-04 Rescoped) ---
  '/tax-credit/45l': {
    path: '/tax-credit/45l',
    title: '45L Tax Credits',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    icon: DollarSign,
    description: 'Dashboard for 45L tax credit projects (document upload missing)',
    showInNav: true,
  },
  
  '/tax-credits': {
    path: '/tax-credits',
    title: 'Tax Credits',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    icon: DollarSign,
    description: 'Alias for /tax-credit/45l',
    showInNav: false,
  },
  
  '/tax-credits/projects/new': {
    path: '/tax-credits/projects/new',
    title: 'New Tax Credit Project',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    parent: '/tax-credit/45l',
    description: 'Create new tax credit project',
    showInNav: false,
  },
  
  '/tax-credits/projects/:id': {
    path: '/tax-credits/projects/:id',
    title: 'Tax Credit Project',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    parent: '/tax-credit/45l',
    description: 'View tax credit project details and progress',
    showInNav: false,
  },
  
  '/tax-credits/compliance': {
    path: '/tax-credits/compliance',
    title: 'Tax Credit Compliance',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    parent: '/tax-credit/45l',
    description: 'Compliance tracking for tax credit projects',
    showInNav: false,
  },
  
  '/tax-credits/reports': {
    path: '/tax-credits/reports',
    title: 'Tax Credit Reports',
    maturity: FeatureMaturity.BETA,
    flag: 'TAX_CREDITS_45L',
    goldenPathId: 'GP-04',
    parent: '/tax-credit/45l',
    description: 'Export packages and certification reports',
    showInNav: false,
  },
  
  // --- Quality Assurance (GP-05 Rescoped) ---
  '/qa': {
    path: '/qa',
    title: 'Quality Assurance',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    icon: ShieldCheck,
    description: 'QA dashboard with scoring and review queue (issue tracking missing)',
    showInNav: true,
  },
  
  '/qa/scoring': {
    path: '/qa/scoring',
    title: 'QA Scoring',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    parent: '/qa',
    description: 'Job quality scoring interface',
    showInNav: false,
  },
  
  '/qa/scoring/:jobId': {
    path: '/qa/scoring/:jobId',
    title: 'Score Job',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    parent: '/qa/scoring',
    description: 'Score specific job quality',
    showInNav: false,
  },
  
  '/qa/checklists': {
    path: '/qa/checklists',
    title: 'QA Checklists',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    parent: '/qa',
    description: 'QA checklist templates and management',
    showInNav: false,
  },
  
  '/qa/performance': {
    path: '/qa/performance',
    title: 'QA Performance',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    parent: '/qa',
    description: 'Inspector performance metrics and leaderboard',
    showInNav: false,
  },
  
  '/qa/review': {
    path: '/qa/review',
    title: 'QA Review',
    maturity: FeatureMaturity.BETA,
    flag: 'QA_SYSTEM',
    goldenPathId: 'GP-05',
    parent: '/qa',
    description: 'Admin review queue for quality scores',
    showInNav: false,
  },
  
  // ============================================================================
  // EXPERIMENTAL ROUTES - No GP coverage, dev-only
  // ============================================================================
  
  // --- Financial Management ---
  '/financials': {
    path: '/financials',
    title: 'Financials',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: DollarSign,
    description: 'Legacy financial overview page',
    showInNav: false,
  },
  
  '/financial-dashboard': {
    path: '/financial-dashboard',
    title: 'Financial Dashboard',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: DollarSign,
    description: 'Comprehensive financial analytics and KPIs',
    showInNav: true,
  },
  
  '/invoices': {
    path: '/invoices',
    title: 'Invoices',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: FileText,
    description: 'Invoice management and generation',
    showInNav: true,
  },
  
  '/invoices/new': {
    path: '/invoices/new',
    title: 'New Invoice',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    parent: '/invoices',
    description: 'Create new invoice',
    showInNav: false,
  },
  
  '/invoices/:id': {
    path: '/invoices/:id',
    title: 'Invoice Details',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    parent: '/invoices',
    description: 'View and edit invoice',
    showInNav: false,
  },
  
  '/financial/payments': {
    path: '/financial/payments',
    title: 'Payments',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: DollarSign,
    description: 'Payment tracking and reconciliation',
    showInNav: true,
  },
  
  '/financial/ar-aging': {
    path: '/financial/ar-aging',
    title: 'A/R Aging Report',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: FileSearch,
    description: 'Accounts receivable aging analysis',
    showInNav: true,
  },
  
  '/financial/unbilled-work': {
    path: '/financial/unbilled-work',
    title: 'Unbilled Work',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: AlertTriangle,
    description: 'Track completed work not yet invoiced',
    showInNav: true,
  },
  
  '/financial/expenses': {
    path: '/financial/expenses',
    title: 'Expense Tracker',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: DollarSign,
    description: 'Swipe-based expense categorization',
    showInNav: true,
  },
  
  '/financial/analytics': {
    path: '/financial/analytics',
    title: 'Financial Analytics',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: TrendingUp,
    description: 'Profitability analysis and trends',
    showInNav: true,
  },
  
  '/expenses': {
    path: '/expenses',
    title: 'Expenses',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    icon: DollarSign,
    description: 'Expense management with OCR receipt scanning',
    showInNav: false,
  },
  
  '/expenses/new': {
    path: '/expenses/new',
    title: 'New Expense',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'FINANCIAL_MANAGEMENT',
    parent: '/expenses',
    description: 'Record new expense',
    showInNav: false,
  },
  
  // --- Mileage Tracking ---
  '/mileage': {
    path: '/mileage',
    title: 'Mileage Tracking',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: RouteIcon,
    description: 'Automatic mileage tracking with geolocation',
    showInNav: true,
  },
  
  '/mileage/new': {
    path: '/mileage/new',
    title: 'New Mileage Entry',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/mileage',
    description: 'Manual mileage entry',
    showInNav: false,
  },
  
  '/mileage/classify': {
    path: '/mileage/classify',
    title: 'Classify Mileage',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/mileage',
    description: 'Classify unassigned drives as business/personal',
    showInNav: false,
  },
  
  // --- Route Planning ---
  '/route': {
    path: '/route',
    title: 'Route Planning',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: Map,
    description: 'Optimized route planning for field visits',
    showInNav: true,
  },
  
  // --- Analytics & Reporting ---
  '/analytics': {
    path: '/analytics',
    title: 'Analytics',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'ANALYTICS_DASHBOARD_V2',
    icon: BarChart3,
    description: 'Business intelligence dashboard with Recharts visualizations',
    showInNav: true,
  },
  
  '/custom-reports': {
    path: '/custom-reports',
    title: 'Custom Reports',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: FileSearch,
    description: 'Custom report builder',
    showInNav: true,
  },
  
  '/report-templates': {
    path: '/report-templates',
    title: 'Report Templates',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: FileText,
    description: 'Manage report templates',
    showInNav: true,
  },
  
  '/report-templates/:id': {
    path: '/report-templates/:id',
    title: 'Report Template Details',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/report-templates',
    description: 'View and edit template',
    showInNav: false,
  },
  
  '/report-template-designer': {
    path: '/report-template-designer',
    title: 'Template Designer',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/report-templates',
    description: 'Visual report template designer',
    showInNav: false,
  },
  
  '/report-template-designer/:id': {
    path: '/report-template-designer/:id',
    title: 'Edit Template',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/report-templates',
    description: 'Edit existing template',
    showInNav: false,
  },
  
  '/reports/fillout/:id': {
    path: '/reports/fillout/:id',
    title: 'Fill Out Report',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/reports',
    description: 'Complete dynamic report form',
    showInNav: false,
  },
  
  // --- Admin & Settings ---
  '/settings': {
    path: '/settings',
    title: 'Settings',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: Settings,
    description: 'User preferences and configuration',
    showInNav: true,
  },
  
  '/settings-hub': {
    path: '/settings-hub',
    title: 'Settings Hub',
    maturity: FeatureMaturity.EXPERIMENTAL,
    roles: ['admin'],
    icon: Settings,
    description: 'Centralized settings management',
    showInNav: true,
  },
  
  '/kpi-settings': {
    path: '/kpi-settings',
    title: 'KPI Configuration',
    maturity: FeatureMaturity.EXPERIMENTAL,
    roles: ['admin'],
    icon: TrendingUp,
    description: 'Configure dashboard KPI thresholds',
    showInNav: true,
  },
  
  '/admin/diagnostics': {
    path: '/admin/diagnostics',
    title: 'System Diagnostics',
    maturity: FeatureMaturity.EXPERIMENTAL,
    roles: ['admin'],
    icon: AlertTriangle,
    description: 'System health monitoring and troubleshooting',
    showInNav: true,
  },
  
  '/admin/background-jobs': {
    path: '/admin/background-jobs',
    title: 'Background Jobs',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'BACKGROUND_JOBS_MONITORING',
    roles: ['admin'],
    icon: Clock,
    description: 'Monitor cron jobs and scheduled tasks',
    showInNav: true,
  },
  
  '/audit-logs': {
    path: '/audit-logs',
    title: 'Audit Logs',
    maturity: FeatureMaturity.EXPERIMENTAL,
    roles: ['admin'],
    icon: FileSearch,
    description: 'System audit trail and user activity logs',
    showInNav: true,
  },
  
  '/status/features': {
    path: '/status/features',
    title: 'Feature Status',
    maturity: FeatureMaturity.GA,
    roles: ['admin'],
    icon: ShieldCheck,
    description: 'Comprehensive feature readiness dashboard showing maturity status and Golden Path test results for all routes',
    showInNav: true,
  },
  
  // --- Business Data ---
  '/business-data/construction-managers': {
    path: '/business-data/construction-managers',
    title: 'Construction Managers',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: Users,
    description: 'Manage construction manager contacts',
    showInNav: true,
  },
  
  '/builder-review': {
    path: '/builder-review',
    title: 'Builder Review',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: Building2,
    description: 'Review and approve builder submissions',
    showInNav: true,
  },
  
  '/plans': {
    path: '/plans',
    title: 'Plans',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: FileText,
    description: 'House plan library',
    showInNav: true,
  },
  
  // --- Equipment Management ---
  '/equipment/calibrations': {
    path: '/equipment/calibrations',
    title: 'Calibration Schedule',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/equipment',
    icon: Wrench,
    description: 'Equipment calibration tracking and reminders',
    showInNav: false,
  },
  
  '/equipment/:id': {
    path: '/equipment/:id',
    title: 'Equipment Details',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/equipment',
    description: 'Equipment history and maintenance log',
    showInNav: false,
  },
  
  // --- Gamification ---
  '/gamification': {
    path: '/gamification',
    title: 'Gamification',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'GAMIFICATION',
    icon: Award,
    description: 'Achievement tracking and leaderboards',
    showInNav: true,
  },
  
  '/achievements': {
    path: '/achievements',
    title: 'Achievements',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'GAMIFICATION',
    parent: '/gamification',
    icon: Award,
    description: 'User achievements and badges',
    showInNav: false,
  },
  
  '/challenges': {
    path: '/challenges',
    title: 'Challenges',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'GAMIFICATION',
    parent: '/gamification',
    icon: Award,
    description: 'Active challenges and competitions',
    showInNav: false,
  },
  
  // --- Compliance Tracking ---
  '/compliance': {
    path: '/compliance',
    title: 'Compliance Hub',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    icon: ShieldCheck,
    description: 'Minnesota compliance programs dashboard',
    showInNav: true,
  },
  
  '/compliance/multifamily-setup': {
    path: '/compliance/multifamily-setup',
    title: 'Multifamily Program Setup',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Configure multifamily program parameters',
    showInNav: false,
  },
  
  '/compliance/builder-verified-items/:jobId': {
    path: '/compliance/builder-verified-items/:jobId',
    title: 'Builder Verified Items',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Track builder-verified compliance items',
    showInNav: false,
  },
  
  '/compliance/sampling-calculator': {
    path: '/compliance/sampling-calculator',
    title: 'Sampling Protocol Calculator',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Calculate sampling requirements for multifamily projects',
    showInNav: false,
  },
  
  '/compliance/energy-star-checklist/:jobId': {
    path: '/compliance/energy-star-checklist/:jobId',
    title: 'ENERGY STAR MFNC Checklist',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'ENERGY STAR Multifamily New Construction checklist',
    showInNav: false,
  },
  
  '/compliance/mn-housing-egcc/:jobId': {
    path: '/compliance/mn-housing-egcc/:jobId',
    title: 'MN Housing EGCC Worksheet',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Minnesota Housing Enterprise Green Communities worksheet',
    showInNav: false,
  },
  
  '/compliance/zerh-tracker/:jobId': {
    path: '/compliance/zerh-tracker/:jobId',
    title: 'ZERH Compliance Tracker',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Zero Energy Ready Home compliance tracking',
    showInNav: false,
  },
  
  '/compliance/benchmarking-tracker/:buildingId': {
    path: '/compliance/benchmarking-tracker/:buildingId',
    title: 'Benchmarking Deadline Tracker',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    description: 'Building Energy Benchmarking deadline tracking',
    showInNav: false,
  },
  
  '/compliance/documents': {
    path: '/compliance/documents',
    title: 'Compliance Documents Library',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'COMPLIANCE_TRACKING',
    parent: '/compliance',
    icon: FileText,
    description: 'Centralized compliance document repository',
    showInNav: false,
  },
  
  // --- Miscellaneous ---
  '/photos/cleanup': {
    path: '/photos/cleanup',
    title: 'Photo Cleanup',
    maturity: FeatureMaturity.EXPERIMENTAL,
    parent: '/photos',
    icon: Camera,
    description: 'Bulk photo management and deletion',
    showInNav: false,
  },
  
  '/conflicts': {
    path: '/conflicts',
    title: 'Conflict Resolution',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: AlertTriangle,
    description: 'Resolve sync conflicts for offline edits',
    showInNav: false,
  },
  
  '/forecast/:id': {
    path: '/forecast/:id',
    title: 'TDL/DLO Forecast',
    maturity: FeatureMaturity.EXPERIMENTAL,
    icon: TrendingUp,
    description: 'Predictive testing analytics (experimental ML feature)',
    showInNav: false,
  },
  
  '/calendar-poc': {
    path: '/calendar-poc',
    title: 'Calendar POC',
    maturity: FeatureMaturity.EXPERIMENTAL,
    roles: ['admin'],
    description: 'Calendar proof-of-concept (development only)',
    showInNav: false,
  },
  
  '/notification-test': {
    path: '/notification-test',
    title: 'Notification Test',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'WEBSOCKET_NOTIFICATIONS',
    roles: ['admin'],
    icon: Bell,
    description: 'WebSocket notification testing page',
    showInNav: false,
  },
  
  '/offline-test': {
    path: '/offline-test',
    title: 'Offline Test',
    maturity: FeatureMaturity.EXPERIMENTAL,
    flag: 'OFFLINE_SYNC',
    roles: ['admin'],
    description: 'Offline sync testing page',
    showInNav: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get route metadata by path
 * 
 * Supports both exact paths and parameterized routes (e.g., "/jobs/123" matches "/jobs/:id")
 * 
 * @param path - Route path (e.g., "/jobs", "/inspection/42")
 * @returns Route metadata or undefined if not found
 * 
 * @example
 * ```typescript
 * const meta = getRouteMetadata('/jobs');
 * console.log(meta?.title); // "Jobs"
 * console.log(meta?.maturity); // FeatureMaturity.GA
 * 
 * const inspectionMeta = getRouteMetadata('/inspection/42');
 * console.log(inspectionMeta?.title); // "Inspection Workflow"
 * ```
 */
export function getRouteMetadata(path: string): RouteMetadata | undefined {
  // Exact match first
  if (ROUTE_REGISTRY[path]) {
    return ROUTE_REGISTRY[path];
  }
  
  // Try to match parameterized routes
  const pathSegments = path.split('/').filter(Boolean);
  
  for (const [registryPath, metadata] of Object.entries(ROUTE_REGISTRY)) {
    const registrySegments = registryPath.split('/').filter(Boolean);
    
    // Must have same number of segments
    if (pathSegments.length !== registrySegments.length) {
      continue;
    }
    
    // Check if all segments match (treating :param as wildcard)
    const matches = registrySegments.every((segment, idx) => {
      return segment.startsWith(':') || segment === pathSegments[idx];
    });
    
    if (matches) {
      return metadata;
    }
  }
  
  return undefined;
}

/**
 * Get all routes with specific maturity level
 * 
 * @param maturity - Target maturity level (ga, beta, experimental)
 * @returns Array of route metadata objects
 * 
 * @example
 * ```typescript
 * const gaRoutes = getRoutesByMaturity(FeatureMaturity.GA);
 * console.log(gaRoutes.length); // 25 (all production-ready routes)
 * 
 * const betaRoutes = getRoutesByMaturity(FeatureMaturity.BETA);
 * console.log(betaRoutes.length); // 12 (tax credits + QA)
 * ```
 */
export function getRoutesByMaturity(maturity: FeatureMaturity): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter(
    (route) => route.maturity === maturity
  );
}

/**
 * Check if user has permission to access route
 * 
 * Validates user roles against route requirements. Routes without
 * role restrictions are accessible to all authenticated users.
 * 
 * @param path - Route path to check
 * @param userRoles - Array of user's role strings (e.g., ['admin', 'inspector'])
 * @returns True if user can access route, false otherwise
 * 
 * @example
 * ```typescript
 * const canViewDashboard = isRouteAllowed('/dashboard', ['inspector']);
 * console.log(canViewDashboard); // true (no role restriction)
 * 
 * const canViewDiagnostics = isRouteAllowed('/admin/diagnostics', ['inspector']);
 * console.log(canViewDiagnostics); // false (requires admin role)
 * 
 * const adminCanViewDiagnostics = isRouteAllowed('/admin/diagnostics', ['admin']);
 * console.log(adminCanViewDiagnostics); // true
 * ```
 */
export function isRouteAllowed(path: string, userRoles: string[]): boolean {
  const route = getRouteMetadata(path);
  
  if (!route) {
    // Route not found - deny by default
    return false;
  }
  
  if (!route.roles || route.roles.length === 0) {
    // No role restrictions - allow all authenticated users
    return true;
  }
  
  // Check if user has at least one required role
  return route.roles.some((requiredRole) => userRoles.includes(requiredRole));
}

/**
 * Get all routes visible in main navigation
 * 
 * Filters routes that should appear in sidebar/navigation menus.
 * Respects user roles and excludes nested/child routes.
 * 
 * @param userRoles - Optional array of user roles for permission filtering
 * @returns Array of navigation-visible routes
 * 
 * @example
 * ```typescript
 * const navRoutes = getNavigationRoutes();
 * console.log(navRoutes.map(r => r.title));
 * // ["Dashboard", "Field Day", "Jobs", "Schedule", ...]
 * 
 * const adminNavRoutes = getNavigationRoutes(['admin']);
 * console.log(adminNavRoutes.map(r => r.title));
 * // Includes admin-only routes like "System Diagnostics"
 * ```
 */
export function getNavigationRoutes(userRoles?: string[]): RouteMetadata[] {
  return Object.values(ROUTE_REGISTRY).filter((route) => {
    // Must be marked for navigation
    if (!route.showInNav) {
      return false;
    }
    
    // Check role permissions if roles provided
    if (userRoles && route.roles && route.roles.length > 0) {
      return route.roles.some((role) => userRoles.includes(role));
    }
    
    return true;
  });
}

/**
 * Get routes grouped by Golden Path test ID
 * 
 * Useful for generating test coverage reports and understanding
 * which routes are validated by each GP test scenario.
 * 
 * @returns Map of GP test ID to route metadata arrays
 * 
 * @example
 * ```typescript
 * const gpRoutes = getRoutesByGoldenPath();
 * console.log(gpRoutes.get('GP-01')?.map(r => r.title));
 * // ["Dashboard", "Field Day", "Jobs", "Schedule", "Calendar Management", ...]
 * 
 * console.log(gpRoutes.get('GP-02')?.map(r => r.title));
 * // ["Inspection Workflow", "Blower Door Testing", "Duct Leakage Testing", ...]
 * ```
 */
export function getRoutesByGoldenPath(): Map<string, RouteMetadata[]> {
  const grouped = new Map<string, RouteMetadata[]>();
  
  for (const route of Object.values(ROUTE_REGISTRY)) {
    if (route.goldenPathId) {
      const existing = grouped.get(route.goldenPathId) || [];
      grouped.set(route.goldenPathId, [...existing, route]);
    }
  }
  
  return grouped;
}

/**
 * Get maturity statistics for reporting
 * 
 * Returns count of routes at each maturity level and total coverage percentage.
 * 
 * @returns Object with counts and percentages
 * 
 * @example
 * ```typescript
 * const stats = getMaturityStats();
 * console.log(stats);
 * // {
 * //   ga: 25,
 * //   beta: 12,
 * //   experimental: 48,
 * //   total: 85,
 * //   gaPercentage: 29.4,
 * //   betaPercentage: 14.1,
 * //   experimentalPercentage: 56.5
 * // }
 * ```
 */
export function getMaturityStats() {
  const routes = Object.values(ROUTE_REGISTRY);
  const total = routes.length;
  
  const ga = routes.filter((r) => r.maturity === FeatureMaturity.GA).length;
  const beta = routes.filter((r) => r.maturity === FeatureMaturity.BETA).length;
  const experimental = routes.filter((r) => r.maturity === FeatureMaturity.EXPERIMENTAL).length;
  
  return {
    ga,
    beta,
    experimental,
    total,
    gaPercentage: ((ga / total) * 100).toFixed(1),
    betaPercentage: ((beta / total) * 100).toFixed(1),
    experimentalPercentage: ((experimental / total) * 100).toFixed(1),
  };
}
