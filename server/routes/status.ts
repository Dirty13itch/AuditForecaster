/**
 * Status Routes - Feature Readiness Dashboard
 * 
 * Admin-only endpoints for viewing feature maturity and Golden Path test results.
 * 
 * @module server/routes/status
 */

import type { Express } from 'express';
import type { AuthenticatedRequest } from '../types';
import { requireRole } from '../middleware/gatekeeper';
import { ROUTE_REGISTRY } from '@shared/navigation';
import type { RouteReadiness, ReadinessSummary, FeaturesDashboardResponse } from '@shared/dashboardTypes';
import { FeatureMaturity } from '@shared/featureFlags';
import { serverLogger } from '../logger';
import { stringify } from 'csv-stringify/sync';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import NodeCache from 'node-cache';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache for status features data (5 minute TTL)
const statusCache = new NodeCache({ stdTTL: 300 });

// ============================================================================
// ACCESSIBILITY AUDIT PARSING
// ============================================================================

/**
 * Accessibility Audit Route Result
 */
interface AccessibilityRouteResult {
  path: string;
  title: string;
  maturity: string;
  status: 'pass' | 'fail' | 'error' | 'skipped';
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    helpUrl: string;
    nodes: number;
  }>;
  errorMessage?: string;
  skipReason?: string;
}

/**
 * Accessibility Audit Report
 */
interface AccessibilityAuditReport {
  timestamp: string;
  environment: string;
  summary: {
    totalRoutes: number;
    routesScanned: number;
    routesSkipped: number;
    routesErrored: number;
    routesPassed: number;
    routesFailed: number;
  };
  violationsBySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  routes: AccessibilityRouteResult[];
}

/**
 * Parse Accessibility Audit Report
 * 
 * Reads docs/audit-results/accessibility-audit.json and extracts
 * violation counts and status per route.
 */
function parseAccessibilityAudit(): Map<string, { violations: number; status: 'pass' | 'fail' | 'pending' }> {
  const accessibilityMap = new Map<string, { violations: number; status: 'pass' | 'fail' | 'pending' }>();
  
  try {
    const auditPath = join(process.cwd(), 'docs/audit-results/accessibility-audit.json');
    
    if (!existsSync(auditPath)) {
      serverLogger.debug('[StatusRoutes] Accessibility audit file not found, returning empty map');
      return accessibilityMap;
    }
    
    const content = readFileSync(auditPath, 'utf-8');
    const report: AccessibilityAuditReport = JSON.parse(content);
    
    for (const routeResult of report.routes) {
      const totalViolations = routeResult.violations.reduce((sum, v) => sum + v.nodes, 0);
      
      let status: 'pass' | 'fail' | 'pending' = 'pending';
      if (routeResult.status === 'pass') {
        status = 'pass';
      } else if (routeResult.status === 'fail') {
        status = 'fail';
      }
      
      accessibilityMap.set(routeResult.path, {
        violations: totalViolations,
        status,
      });
    }
    
    serverLogger.info('[StatusRoutes] Parsed accessibility audit', {
      totalRoutes: accessibilityMap.size,
      timestamp: report.timestamp,
    });
  } catch (error) {
    serverLogger.warn('[StatusRoutes] Could not parse accessibility audit, using defaults', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return accessibilityMap;
}

// ============================================================================
// TODO COUNTING
// ============================================================================

/**
 * TODO Item from Codebase
 */
interface TodoItem {
  file: string;
  line: number;
  text: string;
}

/**
 * Module-level cache for TODO counts (separate from route readiness cache)
 * Refreshed every 5 minutes to balance accuracy and performance
 */
let todoCountsCache: Map<string, number> | null = null;
let todosCacheTime = 0;
const TODO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get All TODO Comments from Codebase
 * 
 * Uses grep to find all TODO comments in TypeScript files.
 * Parses results into structured TodoItem objects with file path,
 * line number, and comment text.
 * 
 * @returns Array of TODO items found in the codebase
 */
async function getAllTodos(): Promise<TodoItem[]> {
  try {
    // grep -rn "// TODO:" returns lines like:
    // client/src/pages/Jobs.tsx:45:// TODO: Add bulk actions
    const { stdout } = await execAsync(
      `grep -rn "// TODO:" client/src server --include="*.ts" --include="*.tsx"`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer for large codebases
    );
    
    const todos: TodoItem[] = [];
    const lines = stdout.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Parse format: file:line:text
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        todos.push({
          file: match[1],
          line: parseInt(match[2], 10),
          text: match[3].trim(),
        });
      }
    }
    
    serverLogger.debug('[StatusRoutes] Found TODO comments', {
      totalTodos: todos.length,
    });
    
    return todos;
  } catch (error) {
    // grep returns exit code 1 when no matches found - this is normal
    if (error instanceof Error && 'code' in error && error.code === 1) {
      serverLogger.debug('[StatusRoutes] No TODO comments found in codebase');
      return [];
    }
    
    // Log unexpected errors but don't crash
    serverLogger.warn('[StatusRoutes] Error scanning for TODOs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return [];
  }
}

/**
 * Map File Path to Route
 * 
 * Maps source files to their corresponding routes based on file path patterns.
 * Handles pages, components, and server files with intelligent inference.
 * 
 * Pattern Matching Strategy:
 * - `client/src/pages/Jobs.tsx` → `/jobs`
 * - `client/src/pages/compliance/EgccCompliancePage.tsx` → `/compliance/egcc`
 * - `client/src/components/jobs/JobCard.tsx` → `/jobs`
 * - `server/routes.ts` → null (not route-specific)
 * 
 * @param filePath - Source file path from grep results
 * @returns Matched route path or null if unmappable
 */
function mapFileToRoute(filePath: string): string | null {
  // Direct page file mappings (most common case)
  if (filePath.startsWith('client/src/pages/')) {
    // Remove prefix and extension
    let normalized = filePath
      .replace(/^client\/src\/pages\//, '')
      .replace(/\.tsx?$/, '');
    
    // Handle nested routes (e.g., compliance/EgccCompliancePage)
    if (normalized.includes('/')) {
      const parts = normalized.split('/');
      // Convert "compliance/EgccCompliancePage" -> "/compliance/egcc"
      const lastPart = parts[parts.length - 1]
        .replace(/Page$/, '')
        .replace(/([A-Z])/g, (match, letter, offset) => 
          offset > 0 ? '-' + letter.toLowerCase() : letter.toLowerCase()
        );
      parts[parts.length - 1] = lastPart;
      return '/' + parts.join('/');
    }
    
    // Direct page mappings for common pages
    const pageMap: Record<string, string> = {
      'Jobs': '/jobs',
      'Photos': '/photos',
      'PhotoGallery': '/photos',
      'Schedule': '/schedule',
      'Dashboard': '/',
      'AnalyticsDashboard': '/analytics',
      'Analytics': '/analytics',
      'BlowerDoorTest': '/blower-door-test',
      'DuctLeakageTest': '/duct-leakage-test',
      'VentilationTests': '/ventilation-tests',
      'Inspection': '/inspection/:id',
      'Equipment': '/equipment',
      'EquipmentDetails': '/equipment',
      'Reports': '/reports',
      'ReportInstance': '/reports/:id',
      'Builders': '/builders',
      'BuilderReview': '/builders',
      'FieldDay': '/field-day',
      'Invoices': '/invoices',
      'Expenses': '/expenses',
      'Mileage': '/mileage',
      'MileageClassify': '/mileage/classify',
      'RouteView': '/route',
      'QualityAssurance': '/qa',
      'QAScoring': '/qa/scoring',
      'QAChecklists': '/qa/checklists',
      'QAPerformance': '/qa/performance',
      'CalendarManagement': '/calendar-management',
      'CalendarReview': '/calendar-review',
      'CalendarImportHistory': '/calendar-imports',
      'FinancialDashboard': '/financial-dashboard',
      'TaxCredit45L': '/tax-credit/45l',
      'TaxCreditProject': '/tax-credits/projects/:id',
      'TaxCreditCompliance': '/tax-credits/compliance',
      'TaxCreditReports': '/tax-credits/reports',
      'CustomReports': '/custom-reports',
      'ReportTemplates': '/report-templates',
      'ReportTemplateDesigner': '/report-template-designer',
      'ScheduledExports': '/scheduled-exports',
      'Settings': '/settings',
      'SettingsHub': '/settings-hub',
      'AdminDashboard': '/admin',
      'AdminDiagnostics': '/admin/diagnostics',
      'AuditLogs': '/admin/audit-logs',
      'BackgroundJobs': '/admin/background-jobs',
      'ComplianceHub': '/compliance',
      'StatusFeaturesPage': '/status/features',
    };
    
    if (pageMap[normalized]) {
      return pageMap[normalized];
    }
    
    // Fallback: lowercase the filename and add leading slash
    return '/' + normalized.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
  }
  
  // Component files -> infer parent route from directory structure
  if (filePath.includes('client/src/components/')) {
    // Extract component category from path
    // e.g., client/src/components/jobs/JobCard.tsx -> /jobs
    const match = filePath.match(/\/components\/([^/]+)\//);
    if (match) {
      const category = match[1];
      
      // Map component categories to routes
      const categoryMap: Record<string, string> = {
        'jobs': '/jobs',
        'photos': '/photos',
        'builders': '/builders',
        'dashboard': '/',
        'financial': '/financial-dashboard',
        'expenses': '/expenses',
        'mileage': '/mileage',
        'pdf': '/reports',
        'settings': '/settings',
      };
      
      return categoryMap[category] || `/${category}`;
    }
    
    // Top-level components (not in subdirectories) - check filename
    const componentName = filePath.split('/').pop()?.replace(/\.tsx?$/, '');
    if (componentName) {
      const componentRouteMap: Record<string, string> = {
        'JobCard': '/jobs',
        'JobDialog': '/jobs',
        'JobWizard': '/jobs',
        'BuilderCard': '/builders',
        'BuilderDialog': '/builders',
        'PhotoGallery': '/photos',
        'PhotoCapture': '/photos',
        'PhotoAnnotator': '/photos',
        'CalendarImportQueue': '/calendar-management',
        'EquipmentCheckout': '/equipment',
        'InspectionScore': '/inspection/:id',
        'ReportPreview': '/reports',
        'DashboardStats': '/',
      };
      
      return componentRouteMap[componentName] || null;
    }
  }
  
  // Server files - no direct route mapping (these are backend logic)
  if (filePath.startsWith('server/')) {
    // Server route files might map to API endpoints, but we track frontend routes
    return null;
  }
  
  // Shared files - no route mapping
  if (filePath.startsWith('shared/')) {
    return null;
  }
  
  // Unmappable file
  return null;
}

/**
 * Count TODOs Per Route
 * 
 * Aggregates TODO comments by route using file-to-route mapping.
 * Uses module-level cache with 5-minute TTL to avoid expensive
 * grep operations on every request.
 * 
 * @returns Map of route paths to TODO counts
 */
async function countTodosPerRoute(): Promise<Map<string, number>> {
  // Check cache first
  const now = Date.now();
  if (todoCountsCache && now - todosCacheTime < TODO_CACHE_TTL) {
    serverLogger.debug('[StatusRoutes] Using cached TODO counts');
    return todoCountsCache;
  }
  
  // Cache miss - scan codebase
  serverLogger.debug('[StatusRoutes] TODO cache expired, scanning codebase');
  
  const allTodos = await getAllTodos();
  const todoCounts = new Map<string, number>();
  
  let mappedCount = 0;
  let unmappedCount = 0;
  
  for (const todo of allTodos) {
    const route = mapFileToRoute(todo.file);
    if (route) {
      todoCounts.set(route, (todoCounts.get(route) || 0) + 1);
      mappedCount++;
    } else {
      unmappedCount++;
    }
  }
  
  serverLogger.info('[StatusRoutes] TODO counting complete', {
    totalTodos: allTodos.length,
    mappedTodos: mappedCount,
    unmappedTodos: unmappedCount,
    routesWithTodos: todoCounts.size,
  });
  
  // Update cache
  todoCountsCache = todoCounts;
  todosCacheTime = now;
  
  return todoCounts;
}

// ============================================================================
// GOLDEN PATH REPORT PARSING
// ============================================================================

/**
 * Parse Golden Path Report
 * 
 * Reads docs/product/golden-path-report.md and extracts test status.
 * Falls back to 'pending' for routes without test results.
 * 
 * FIXED: Now uses matchAll() to preserve GP identifiers instead of split()
 */
export function parseGoldenPathReport(): Map<string, 'pass' | 'fail' | 'pending'> {
  const statusMap = new Map<string, 'pass' | 'fail' | 'pending'>();
  
  try {
    const reportPath = join(process.cwd(), 'docs/product/golden-path-report.md');
    const content = readFileSync(reportPath, 'utf-8');
    
    // Use matchAll() to capture GP sections while preserving identifiers
    // Pattern: ## (GP-\d+): [title]\n[content until next ## GP or end]
    const gpPattern = /## (GP-\d+):[^\n]+\n([\s\S]*?)(?=## GP-\d+:|$)/g;
    const matches = content.matchAll(gpPattern);
    
    for (const match of matches) {
      const gpId = match[1]; // e.g., "GP-01"
      const sectionContent = match[2]; // Section content
      
      // Determine status based on markers in the section content
      // Priority: Look for emoji first, then text indicators
      let status: 'pass' | 'fail' | 'pending' = 'pending';
      
      if (sectionContent.includes('🟢')) {
        // Green circle = pass (Architecturally Complete)
        status = 'pass';
      } else if (sectionContent.includes('🟡')) {
        // Yellow circle = pending (Architecturally Complete but not validated)
        status = 'pending';
      } else if (sectionContent.includes('🔴')) {
        // Red circle = fail
        status = 'fail';
      } else if (sectionContent.includes('Architecturally Complete')) {
        // Text indicator without emoji
        status = 'pass';
      }
      
      statusMap.set(gpId, status);
      
      serverLogger.debug('[StatusRoutes] Parsed GP section', {
        gpId,
        status,
      });
    }
    
    serverLogger.info('[StatusRoutes] Parsed Golden Path report', {
      totalTests: statusMap.size,
      pass: Array.from(statusMap.values()).filter(s => s === 'pass').length,
      fail: Array.from(statusMap.values()).filter(s => s === 'fail').length,
      pending: Array.from(statusMap.values()).filter(s => s === 'pending').length,
    });
  } catch (error) {
    serverLogger.warn('[StatusRoutes] Could not parse Golden Path report, using defaults', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return statusMap;
}

/**
 * Build Route Readiness Data
 * 
 * Converts ROUTE_REGISTRY into RouteReadiness objects with GP status,
 * accessibility metrics, performance data, and TODO counts.
 * 
 * NOTE: Some metrics are currently mocked placeholders:
 * - lighthouseScore: Mocked values until Lighthouse CI is configured
 * - testCoverage: Hardcoded to 0% until coverage reporting is integrated
 * - todos: Real per-route counts from codebase TODO comments (cached for 5 minutes)
 */
async function buildRouteReadiness(): Promise<RouteReadiness[]> {
  const gpStatusMap = parseGoldenPathReport();
  const accessibilityMap = parseAccessibilityAudit();
  
  // Get per-route TODO counts (uses cache with 5-minute TTL)
  const todoCountsMap = await countTodosPerRoute();
  
  serverLogger.info('[StatusRoutes] Building route readiness data', {
    totalRoutes: Object.keys(ROUTE_REGISTRY).length,
    routesWithTodos: todoCountsMap.size,
  });
  
  const routes: RouteReadiness[] = [];
  
  for (const [path, metadata] of Object.entries(ROUTE_REGISTRY)) {
    let goldenPathStatus: 'pass' | 'fail' | 'pending' | 'n/a' = 'n/a';
    
    if (metadata.goldenPathId) {
      goldenPathStatus = gpStatusMap.get(metadata.goldenPathId) || 'pending';
    }
    
    // Get accessibility audit results if available
    const accessibilityResult = accessibilityMap.get(path);
    
    // Determine category from route metadata or path
    let category = 'Other';
    if (path.startsWith('/admin') || metadata.roles?.includes('admin')) {
      category = 'Admin';
    } else if (path.startsWith('/field') || path.startsWith('/jobs') || path.startsWith('/inspection')) {
      category = 'Field Work';
    } else if (path.startsWith('/financial') || path.startsWith('/invoices') || path.startsWith('/expenses')) {
      category = 'Financial';
    } else if (path.startsWith('/compliance') || path.startsWith('/qa')) {
      category = 'Compliance';
    } else if (path.startsWith('/calendar') || path.startsWith('/schedule')) {
      category = 'Scheduling';
    } else if (path.startsWith('/analytics') || path.startsWith('/dashboard')) {
      category = 'Analytics';
    }
    
    // MOCKED DATA: Lighthouse performance score
    // TODO: Replace with actual Lighthouse CI results when CI pipeline is configured
    // Per AAA Blueprint: GA routes should target ≥90 performance score
    let lighthouseScore: number | undefined;
    if (metadata.maturity === FeatureMaturity.GA) {
      lighthouseScore = 92; // Mock target value for GA routes (placeholder)
    } else if (metadata.maturity === FeatureMaturity.BETA) {
      lighthouseScore = 85; // Lower target for beta (placeholder)
    }
    
    // MOCKED DATA: Test coverage percentage
    // TODO: Parse from coverage reports (e.g., coverage/coverage-summary.json)
    // Per AAA Blueprint: Use 0% for now (future: parse from coverage reports)
    const testCoverage = 0;
    
    // Get actual TODO count for this route from cached map
    // Uses file-to-route mapping to aggregate TODO comments from source files
    const todos = todoCountsMap.get(path) || 0;
    
    routes.push({
      path,
      title: metadata.title,
      maturity: metadata.maturity,
      goldenPathId: metadata.goldenPathId,
      goldenPathStatus,
      roles: metadata.roles,
      flag: metadata.flag,
      description: metadata.description,
      category,
      // Accessibility audit results (real data from audit file)
      axeViolations: accessibilityResult?.violations,
      axeStatus: accessibilityResult?.status,
      // Performance metrics (MOCKED - see comments above)
      lighthouseScore,
      // Test coverage (MOCKED - see comments above)
      testCoverage,
      // TODO count (MOCKED - see comments above)
      todos,
    });
  }
  
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Calculate Summary Statistics
 */
function calculateSummary(routes: RouteReadiness[]): ReadinessSummary {
  const total = routes.length;
  const ga = routes.filter(r => r.maturity === FeatureMaturity.GA).length;
  const beta = routes.filter(r => r.maturity === FeatureMaturity.BETA).length;
  const experimental = routes.filter(r => r.maturity === FeatureMaturity.EXPERIMENTAL).length;
  
  return {
    totalRoutes: total,
    ga,
    beta,
    experimental,
    gaPercentage: total > 0 ? Math.round((ga / total) * 100) : 0,
    betaPercentage: total > 0 ? Math.round((beta / total) * 100) : 0,
    experimentalPercentage: total > 0 ? Math.round((experimental / total) * 100) : 0,
  };
}

/**
 * Convert routes to CSV format
 */
function convertToCSV(routes: RouteReadiness[]): string {
  const records = routes.map(route => ({
    path: route.path,
    title: route.title,
    maturity: route.maturity,
    category: route.category || '',
    goldenPathId: route.goldenPathId || '',
    goldenPathStatus: route.goldenPathStatus || 'n/a',
    axeViolations: route.axeViolations ?? '',
    axeStatus: route.axeStatus || '',
    lighthouseScore: route.lighthouseScore ?? '',
    testCoverage: route.testCoverage ?? '',
    todos: route.todos ?? '',
    roles: route.roles?.join(', ') || '',
    flag: route.flag || '',
    description: route.description || '',
  }));
  
  return stringify(records, {
    header: true,
    columns: [
      'path',
      'title',
      'maturity',
      'category',
      'goldenPathId',
      'goldenPathStatus',
      'axeViolations',
      'axeStatus',
      'lighthouseScore',
      'testCoverage',
      'todos',
      'roles',
      'flag',
      'description',
    ],
  });
}

/**
 * Register Status Routes
 */
export function registerStatusRoutes(app: Express) {
  /**
   * GET /api/status/features
   * 
   * Returns complete feature readiness dashboard data.
   * Admin-only access.
   * Supports CSV export via ?format=csv query parameter.
   * 
   * FIXED: Now uses NodeCache with 5-minute TTL to avoid re-parsing on every request
   */
  app.get('/api/status/features', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const format = req.query.format as string | undefined;
      const cacheKey = 'status-features-data';
      
      // Check cache first
      let routes = statusCache.get<RouteReadiness[]>(cacheKey);
      let cacheHit = !!routes;
      
      if (!routes) {
        // Cache miss - perform expensive computation (now async)
        serverLogger.debug('[StatusRoutes] Cache miss, building route readiness data');
        routes = await buildRouteReadiness();
        statusCache.set(cacheKey, routes);
      } else {
        serverLogger.debug('[StatusRoutes] Cache hit, serving cached data');
      }
      
      const summary = calculateSummary(routes);
      
      // CSV export
      if (format === 'csv') {
        const csv = convertToCSV(routes);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="feature-status.csv"');
        return res.send(csv);
      }
      
      // JSON response
      const response: FeaturesDashboardResponse = {
        routes,
        summary,
        timestamp: new Date().toISOString(),
      };
      
      serverLogger.info('[StatusRoutes] Feature status fetched', {
        userId: req.user?.id,
        totalRoutes: routes.length,
        format: format || 'json',
        cacheHit,
      });
      
      res.json(response);
    } catch (error) {
      serverLogger.error('[StatusRoutes] Error fetching feature status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      res.status(500).json({
        error: 'Failed to fetch feature status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  /**
   * POST /api/status/features/invalidate-cache
   * 
   * Invalidates the status features cache.
   * Admin-only access.
   * Useful after updating the golden-path-report.md file.
   */
  app.post('/api/status/features/invalidate-cache', requireRole('admin'), (req: AuthenticatedRequest, res) => {
    try {
      const cacheKey = 'status-features-data';
      const deleted = statusCache.del(cacheKey);
      
      serverLogger.info('[StatusRoutes] Cache invalidation requested', {
        userId: req.user?.id,
        success: deleted > 0,
      });
      
      res.json({
        success: true,
        message: 'Cache invalidated successfully',
        keysDeleted: deleted,
      });
    } catch (error) {
      serverLogger.error('[StatusRoutes] Error invalidating cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      res.status(500).json({
        error: 'Failed to invalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  serverLogger.info('[StatusRoutes] Status routes registered');
}
