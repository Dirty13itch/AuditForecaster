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
import { readFileSync } from 'fs';
import { join } from 'path';
import NodeCache from 'node-cache';

// Cache for status features data (5 minute TTL)
const statusCache = new NodeCache({ stdTTL: 300 });

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
 * Converts ROUTE_REGISTRY into RouteReadiness objects with GP status.
 */
function buildRouteReadiness(): RouteReadiness[] {
  const gpStatusMap = parseGoldenPathReport();
  const routes: RouteReadiness[] = [];
  
  for (const [path, metadata] of Object.entries(ROUTE_REGISTRY)) {
    let goldenPathStatus: 'pass' | 'fail' | 'pending' | 'n/a' = 'n/a';
    
    if (metadata.goldenPathId) {
      goldenPathStatus = gpStatusMap.get(metadata.goldenPathId) || 'pending';
    }
    
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
  app.get('/api/status/features', requireRole('admin'), (req: AuthenticatedRequest, res) => {
    try {
      const format = req.query.format as string | undefined;
      const cacheKey = 'status-features-data';
      
      // Check cache first
      let routes = statusCache.get<RouteReadiness[]>(cacheKey);
      let cacheHit = !!routes;
      
      if (!routes) {
        // Cache miss - perform expensive computation
        serverLogger.debug('[StatusRoutes] Cache miss, building route readiness data');
        routes = buildRouteReadiness();
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
