/**
 * Accessibility Audit Test Suite - WCAG 2.2 AA Compliance
 * 
 * Systematic Playwright + Axe audit scanning all GA and Beta routes (37 total),
 * generating comprehensive violation reports per AAA Blueprint requirements.
 * 
 * **Objective**: Create comprehensive accessibility audit for production readiness.
 * 
 * **Workflow**:
 * 1. Filter ROUTE_REGISTRY to GA + Beta routes only (exclude Experimental)
 * 2. Group routes by auth level (public, inspector, admin)
 * 3. For each route:
 *    - Login with appropriate role if needed
 *    - Navigate to route path
 *    - Run AxeBuilder scan with WCAG 2.2 AA + best-practice rules
 *    - Capture violations with metadata
 * 4. Generate reports:
 *    - JSON: docs/audit-results/accessibility-audit.json
 *    - Markdown: docs/ACCESSIBILITY_AUDIT_REPORT.md
 * 
 * **Edge Cases Handled**:
 * - Dynamic routes (/:id) use fixed test IDs
 * - Admin-only routes use admin auth context
 * - Routes requiring specific state are skipped with documentation
 * - Errors don't crash audit, logged and continued
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTE_REGISTRY, FeatureMaturity } from '@shared/navigation';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test timeout: 10 minutes for comprehensive audit
test.setTimeout(600000);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ViolationSummary {
  id: string;
  impact: string;
  description: string;
  helpUrl: string;
  nodes: number;
}

interface RouteAuditResult {
  path: string;
  title: string;
  maturity: string;
  status: 'pass' | 'fail' | 'error' | 'skipped';
  violations: ViolationSummary[];
  errorMessage?: string;
  skipReason?: string;
  requiredAuth?: string;
}

interface AuditSummary {
  totalRoutes: number;
  routesScanned: number;
  routesSkipped: number;
  routesErrored: number;
  routesPassed: number;
  routesFailed: number;
}

interface ViolationsBySeverity {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

interface AccessibilityAuditReport {
  timestamp: string;
  environment: string;
  summary: AuditSummary;
  violationsBySeverity: ViolationsBySeverity;
  routes: RouteAuditResult[];
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Login using dev-login endpoint
 * Reused pattern from GP tests for fast authentication
 */
async function login(page: Page, userType: 'admin' | 'inspector1' | 'inspector2') {
  const loginUrl = `${BASE_URL}/api/dev-login/test-${userType}`;
  await page.goto(loginUrl);
  await page.waitForURL(`${BASE_URL}/`);
}

// ============================================================================
// ROUTE FILTERING & GROUPING
// ============================================================================

/**
 * Filter routes to GA and Beta only, exclude Experimental
 */
function getAuditableRoutes() {
  return Object.entries(ROUTE_REGISTRY)
    .filter(([_, metadata]) => 
      metadata.maturity === FeatureMaturity.GA || 
      metadata.maturity === FeatureMaturity.BETA
    )
    .map(([path, metadata]) => ({ path, metadata }));
}

/**
 * Determine required auth level for a route
 */
function getRequiredAuth(route: typeof ROUTE_REGISTRY[string]): 'public' | 'inspector' | 'admin' {
  if (!route.roles || route.roles.length === 0) {
    return 'inspector'; // Default to inspector for authenticated routes
  }
  
  if (route.roles.includes('admin')) {
    return 'admin';
  }
  
  return 'inspector';
}

/**
 * Resolve dynamic route paths to concrete test paths
 * Handles common patterns like /jobs/:id, /inspection/:id, etc.
 */
function resolveDynamicPath(path: string): { resolved: string; canNavigate: boolean; skipReason?: string } {
  // Static routes (no parameters)
  if (!path.includes(':')) {
    return { resolved: path, canNavigate: true };
  }
  
  // Common dynamic route patterns - use fixed test IDs
  const dynamicPathMappings: Record<string, string> = {
    '/jobs/:id': '/jobs/1',
    '/inspection/:id': '/inspection/1',
    '/blower-door/:jobId': '/blower-door/1',
    '/duct-leakage/:jobId': '/duct-leakage/1',
    '/ventilation-tests/:jobId': '/ventilation-tests/1',
    '/equipment/:id': '/equipment/1',
    '/reports/:id': '/reports/1',
    '/photos/:id': '/photos/1',
    '/photos/annotate/:photoId': '/photos/annotate/1',
    '/tax-credits/projects/:id': '/tax-credits/projects/1',
    '/qa/scoring/:jobId': '/qa/scoring/1',
    '/report-templates/:id': '/report-templates/1',
    '/report-template-designer/:id': '/report-template-designer/1',
    '/reports/fillout/:id': '/reports/fillout/1',
    '/invoices/:id': '/invoices/1',
    '/compliance/builder-verified-items/:jobId': '/compliance/builder-verified-items/1',
    '/compliance/energy-star-checklist/:jobId': '/compliance/energy-star-checklist/1',
    '/compliance/mn-housing-egcc/:jobId': '/compliance/mn-housing-egcc/1',
    '/compliance/zerh-tracker/:jobId': '/compliance/zerh-tracker/1',
    '/compliance/benchmarking-tracker/:buildingId': '/compliance/benchmarking-tracker/1',
    '/forecast/:id': '/forecast/1',
  };
  
  if (dynamicPathMappings[path]) {
    return { resolved: dynamicPathMappings[path], canNavigate: true };
  }
  
  // Unknown dynamic pattern - skip
  return {
    resolved: path,
    canNavigate: false,
    skipReason: `Unknown dynamic path pattern: ${path}`,
  };
}

// ============================================================================
// AXE SCANNING
// ============================================================================

/**
 * Run Axe accessibility scan with WCAG 2.2 AA + best-practice rules
 */
async function runAxeScan(page: Page, routePath: string, routeTitle: string, maturity: string): Promise<RouteAuditResult> {
  try {
    // Run Axe scan with WCAG 2.2 AA tags
    const axe = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice']);
    
    const results = await axe.analyze();
    
    // Extract violation summaries
    const violations: ViolationSummary[] = results.violations.map(v => ({
      id: v.id,
      impact: v.impact || 'unknown',
      description: v.description,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
    }));
    
    const status = violations.length === 0 ? 'pass' : 'fail';
    
    console.log(`  ✓ ${routeTitle} (${routePath}): ${violations.length} violations`);
    
    return {
      path: routePath,
      title: routeTitle,
      maturity,
      status,
      violations,
    };
  } catch (error) {
    console.error(`  ✗ ${routeTitle} (${routePath}): Error during scan`, error);
    return {
      path: routePath,
      title: routeTitle,
      maturity,
      status: 'error',
      violations: [],
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate JSON report
 */
function generateJSONReport(results: RouteAuditResult[]): AccessibilityAuditReport {
  const summary: AuditSummary = {
    totalRoutes: results.length,
    routesScanned: results.filter(r => r.status === 'pass' || r.status === 'fail').length,
    routesSkipped: results.filter(r => r.status === 'skipped').length,
    routesErrored: results.filter(r => r.status === 'error').length,
    routesPassed: results.filter(r => r.status === 'pass').length,
    routesFailed: results.filter(r => r.status === 'fail').length,
  };
  
  const violationsBySeverity: ViolationsBySeverity = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };
  
  results.forEach(route => {
    route.violations.forEach(violation => {
      const impact = violation.impact.toLowerCase();
      if (impact === 'critical') violationsBySeverity.critical += violation.nodes;
      else if (impact === 'serious') violationsBySeverity.serious += violation.nodes;
      else if (impact === 'moderate') violationsBySeverity.moderate += violation.nodes;
      else if (impact === 'minor') violationsBySeverity.minor += violation.nodes;
    });
  });
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    summary,
    violationsBySeverity,
    routes: results,
  };
}

/**
 * Generate Markdown report with executive summary
 */
function generateMarkdownReport(report: AccessibilityAuditReport): string {
  const { summary, violationsBySeverity, routes } = report;
  
  const passRate = summary.totalRoutes > 0 
    ? Math.round((summary.routesPassed / summary.totalRoutes) * 100) 
    : 0;
  
  let md = `# Accessibility Audit Report\n\n`;
  md += `**Generated**: ${new Date(report.timestamp).toLocaleString()}\n`;
  md += `**Environment**: ${report.environment}\n\n`;
  
  md += `## Executive Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Routes | ${summary.totalRoutes} |\n`;
  md += `| Routes Scanned | ${summary.routesScanned} |\n`;
  md += `| Routes Passed | ${summary.routesPassed} ✅ |\n`;
  md += `| Routes Failed | ${summary.routesFailed} ❌ |\n`;
  md += `| Routes Skipped | ${summary.routesSkipped} ⏭️ |\n`;
  md += `| Routes Errored | ${summary.routesErrored} ⚠️ |\n`;
  md += `| **Pass Rate** | **${passRate}%** |\n\n`;
  
  md += `## Violations by Severity\n\n`;
  md += `| Severity | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| Critical | ${violationsBySeverity.critical} 🔴 |\n`;
  md += `| Serious | ${violationsBySeverity.serious} 🟠 |\n`;
  md += `| Moderate | ${violationsBySeverity.moderate} 🟡 |\n`;
  md += `| Minor | ${violationsBySeverity.minor} ⚪ |\n\n`;
  
  md += `## Route-by-Route Findings\n\n`;
  
  const failedRoutes = routes.filter(r => r.status === 'fail');
  const passedRoutes = routes.filter(r => r.status === 'pass');
  const skippedRoutes = routes.filter(r => r.status === 'skipped');
  const erroredRoutes = routes.filter(r => r.status === 'error');
  
  if (failedRoutes.length > 0) {
    md += `### ❌ Failed Routes (${failedRoutes.length})\n\n`;
    failedRoutes.forEach(route => {
      md += `#### ${route.title} (${route.path})\n\n`;
      md += `**Status**: ${route.status.toUpperCase()}\n`;
      md += `**Maturity**: ${route.maturity}\n`;
      md += `**Violations**: ${route.violations.length}\n\n`;
      
      if (route.violations.length > 0) {
        md += `| ID | Impact | Description | Nodes |\n`;
        md += `|----|--------|-------------|-------|\n`;
        route.violations.forEach(v => {
          md += `| [${v.id}](${v.helpUrl}) | ${v.impact} | ${v.description} | ${v.nodes} |\n`;
        });
        md += `\n`;
      }
    });
  }
  
  if (passedRoutes.length > 0) {
    md += `### ✅ Passed Routes (${passedRoutes.length})\n\n`;
    passedRoutes.forEach(route => {
      md += `- ${route.title} (${route.path})\n`;
    });
    md += `\n`;
  }
  
  if (skippedRoutes.length > 0) {
    md += `### ⏭️ Skipped Routes (${skippedRoutes.length})\n\n`;
    skippedRoutes.forEach(route => {
      md += `- ${route.title} (${route.path}): ${route.skipReason}\n`;
    });
    md += `\n`;
  }
  
  if (erroredRoutes.length > 0) {
    md += `### ⚠️ Errored Routes (${erroredRoutes.length})\n\n`;
    erroredRoutes.forEach(route => {
      md += `- ${route.title} (${route.path}): ${route.errorMessage}\n`;
    });
    md += `\n`;
  }
  
  md += `## Recommendations\n\n`;
  md += `1. **Priority**: Fix critical and serious violations first\n`;
  md += `2. **Common Issues**: Review color contrast, form labels, and ARIA attributes\n`;
  md += `3. **Tools**: Use axe DevTools browser extension for debugging\n`;
  md += `4. **Resources**: [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)\n`;
  md += `5. **Testing**: Re-run audit after fixes to verify improvements\n\n`;
  
  return md;
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

test.describe.serial('Accessibility Audit - WCAG 2.2 AA Compliance', () => {
  let adminContext: BrowserContext;
  let inspectorContext: BrowserContext;
  let adminPage: Page;
  let inspectorPage: Page;
  
  const auditResults: RouteAuditResult[] = [];
  
  test.beforeAll(async ({ browser }) => {
    console.log('\n🔍 Starting Accessibility Audit...\n');
    
    // Create auth contexts
    adminContext = await browser.newContext();
    inspectorContext = await browser.newContext();
    
    adminPage = await adminContext.newPage();
    inspectorPage = await inspectorContext.newPage();
    
    // Login both contexts
    console.log('🔐 Authenticating admin and inspector...');
    await login(adminPage, 'admin');
    await login(inspectorPage, 'inspector1');
    console.log('✓ Authentication complete\n');
  });
  
  test.afterAll(async () => {
    // Generate reports
    console.log('\n📊 Generating accessibility reports...\n');
    
    const jsonReport = generateJSONReport(auditResults);
    const mdReport = generateMarkdownReport(jsonReport);
    
    // Write JSON report
    const jsonPath = join(process.cwd(), 'docs/audit-results/accessibility-audit.json');
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✓ JSON report: ${jsonPath}`);
    
    // Write Markdown report
    const mdPath = join(process.cwd(), 'docs/ACCESSIBILITY_AUDIT_REPORT.md');
    writeFileSync(mdPath, mdReport);
    console.log(`✓ Markdown report: ${mdPath}`);
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 ACCESSIBILITY AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Routes:    ${jsonReport.summary.totalRoutes}`);
    console.log(`Scanned:         ${jsonReport.summary.routesScanned}`);
    console.log(`Passed:          ${jsonReport.summary.routesPassed} ✅`);
    console.log(`Failed:          ${jsonReport.summary.routesFailed} ❌`);
    console.log(`Skipped:         ${jsonReport.summary.routesSkipped} ⏭️`);
    console.log(`Errored:         ${jsonReport.summary.routesErrored} ⚠️`);
    console.log('\nViolations by Severity:');
    console.log(`  Critical:      ${jsonReport.violationsBySeverity.critical} 🔴`);
    console.log(`  Serious:       ${jsonReport.violationsBySeverity.serious} 🟠`);
    console.log(`  Moderate:      ${jsonReport.violationsBySeverity.moderate} 🟡`);
    console.log(`  Minor:         ${jsonReport.violationsBySeverity.minor} ⚪`);
    console.log('='.repeat(80) + '\n');
    
    // Cleanup
    await adminPage.close();
    await inspectorPage.close();
    await adminContext.close();
    await inspectorContext.close();
  });
  
  test('Scan all GA and Beta routes', async () => {
    const auditableRoutes = getAuditableRoutes();
    
    console.log(`📋 Found ${auditableRoutes.length} auditable routes (GA + Beta)\n`);
    
    for (const { path, metadata } of auditableRoutes) {
      console.log(`\nScanning: ${metadata.title} (${path})`);
      
      // Resolve dynamic paths
      const { resolved, canNavigate, skipReason } = resolveDynamicPath(path);
      
      if (!canNavigate) {
        console.log(`  ⏭️ Skipped: ${skipReason}`);
        auditResults.push({
          path,
          title: metadata.title,
          maturity: metadata.maturity,
          status: 'skipped',
          violations: [],
          skipReason,
        });
        continue;
      }
      
      // Determine which page to use based on auth requirement
      const authLevel = getRequiredAuth(metadata);
      const page = authLevel === 'admin' ? adminPage : inspectorPage;
      
      try {
        // Navigate to route
        await page.goto(`${BASE_URL}${resolved}`, { 
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        
        // Small delay to ensure page is fully rendered
        await page.waitForTimeout(1000);
        
        // Run Axe scan
        const result = await runAxeScan(page, path, metadata.title, metadata.maturity);
        result.requiredAuth = authLevel;
        
        auditResults.push(result);
      } catch (error) {
        console.error(`  ✗ Error navigating to ${path}:`, error);
        auditResults.push({
          path,
          title: metadata.title,
          maturity: metadata.maturity,
          status: 'error',
          violations: [],
          errorMessage: error instanceof Error ? error.message : 'Unknown navigation error',
          requiredAuth: authLevel,
        });
      }
    }
    
    // Test doesn't fail on violations - just reports them
    expect(auditResults.length).toBeGreaterThan(0);
  });
});
