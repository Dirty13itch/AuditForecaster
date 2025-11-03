#!/usr/bin/env node

/**
 * Lighthouse Performance Runner
 * 
 * Runs Lighthouse performance audits against specified routes and validates
 * against performance budgets defined in lighthouse.budgets.json.
 * 
 * Usage:
 *   node scripts/lh.mjs                    # Run all routes
 *   node scripts/lh.mjs /                  # Run specific route
 *   node scripts/lh.mjs / /jobs /photos    # Run multiple routes
 * 
 * Exit Codes:
 *   0 - All routes passed performance budgets
 *   1 - One or more routes failed performance budgets
 * 
 * Output:
 *   - Updates public/gate-status.json with performance metrics
 *   - Logs results to console
 *   - Generates HTML reports in lighthouse-reports/ directory
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const BUDGETS_FILE = join(__dirname, '..', 'lighthouse.budgets.json');
const GATE_STATUS_FILE = join(__dirname, '..', 'public', 'gate-status.json');
const REPORTS_DIR = join(__dirname, '..', 'lighthouse-reports');

// Performance thresholds
const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 80,
  lcp: 2500, // ms
  cls: 0.1,
  tbt: 200, // ms
};

// Default routes to test
const DEFAULT_ROUTES = [
  '/',
  '/field-day',
  '/jobs',
  '/inspection/1', // Requires seeded data
  '/photos',
  '/reports',
];

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Lighthouse Performance Runner\n');
  
  // Parse routes from CLI args or use defaults
  const routes = process.argv.slice(2).length > 0 
    ? process.argv.slice(2)
    : DEFAULT_ROUTES;
  
  console.log(`Testing ${routes.length} route(s):\n${routes.map(r => `  - ${r}`).join('\n')}\n`);
  
  // Ensure reports directory exists
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  // Load budgets
  let budgets = null;
  if (existsSync(BUDGETS_FILE)) {
    try {
      const budgetsContent = readFileSync(BUDGETS_FILE, 'utf-8');
      budgets = JSON.parse(budgetsContent);
      console.log('✅ Loaded performance budgets from lighthouse.budgets.json\n');
    } catch (error) {
      console.warn('⚠️  Failed to load budgets, using defaults\n');
    }
  }
  
  // Run Lighthouse for each route
  const results = [];
  let allPassed = true;
  
  for (const route of routes) {
    const url = `${BASE_URL}${route}`;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));
    
    try {
      const result = await runLighthouse(url, route, budgets);
      results.push(result);
      
      const passed = evaluateResult(result);
      allPassed = allPassed && passed;
      
      console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'} - ${route}`);
    } catch (error) {
      console.error(`\n❌ ERROR testing ${route}:`, error.message);
      allPassed = false;
      
      results.push({
        route,
        url,
        error: error.message,
        passed: false,
      });
    }
  }
  
  // Update gate status
  updateGateStatus(results);
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  console.log(`\nTotal Routes: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`\nReports saved to: ${REPORTS_DIR}`);
  console.log(`Gate status updated: ${GATE_STATUS_FILE}`);
  
  if (!allPassed) {
    console.log('\n❌ Some routes failed performance budgets');
    process.exit(1);
  }
  
  console.log('\n✅ All routes passed performance budgets');
  process.exit(0);
}

/**
 * Run Lighthouse audit for a URL
 */
async function runLighthouse(url, route, budgets = null) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });
  
  try {
    const options = {
      logLevel: 'error',
      output: 'html',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    };
    
    // Add budgets to Lighthouse config if provided
    const config = budgets ? { settings: { budgets } } : undefined;
    
    const runnerResult = await lighthouse(url, options, config);
    
    // Save HTML report
    const reportFilename = `report-${route.replace(/\//g, '-') || 'root'}-${Date.now()}.html`;
    const reportPath = join(REPORTS_DIR, reportFilename);
    writeFileSync(reportPath, runnerResult.report);
    
    // Extract metrics
    const lhr = runnerResult.lhr;
    const metrics = lhr.audits.metrics?.details?.items?.[0] || {};
    
    // Extract budget results if available
    const budgetAudit = lhr.audits['performance-budget'];
    const budgetResults = budgetAudit?.details?.items || [];
    const budgetPassed = !budgetAudit || budgetAudit.score === 1;
    
    const result = {
      route,
      url,
      timestamp: new Date().toISOString(),
      scores: {
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
      },
      metrics: {
        lcp: metrics.largestContentfulPaint || 0,
        cls: metrics.cumulativeLayoutShift || 0,
        tbt: metrics.totalBlockingTime || 0,
        fcp: metrics.firstContentfulPaint || 0,
        tti: metrics.interactive || 0,
      },
      budgets: {
        passed: budgetPassed,
        items: budgetResults,
      },
      reportPath,
      passed: false, // Will be set by evaluateResult
    };
    
    return result;
  } finally {
    await chrome.kill();
  }
}

/**
 * Evaluate Lighthouse result against thresholds AND budgets
 */
function evaluateResult(result) {
  if (result.error) return false;
  
  console.log('\nScores:');
  console.log(`  Performance:   ${result.scores.performance}/100 ${result.scores.performance >= THRESHOLDS.performance ? '✅' : '❌'}`);
  console.log(`  Accessibility: ${result.scores.accessibility}/100 ${result.scores.accessibility >= THRESHOLDS.accessibility ? '✅' : '❌'}`);
  console.log(`  Best Practices: ${result.scores.bestPractices}/100 ${result.scores.bestPractices >= THRESHOLDS.bestPractices ? '✅' : '❌'}`);
  console.log(`  SEO:           ${result.scores.seo}/100 ${result.scores.seo >= THRESHOLDS.seo ? '✅' : '❌'}`);
  
  console.log('\nCore Web Vitals:');
  console.log(`  LCP: ${(result.metrics.lcp / 1000).toFixed(2)}s ${result.metrics.lcp <= THRESHOLDS.lcp ? '✅' : '❌'} (target: ≤2.5s)`);
  console.log(`  CLS: ${result.metrics.cls.toFixed(3)} ${result.metrics.cls <= THRESHOLDS.cls ? '✅' : '❌'} (target: ≤0.1)`);
  console.log(`  TBT: ${result.metrics.tbt}ms ${result.metrics.tbt <= THRESHOLDS.tbt ? '✅' : '❌'} (target: ≤200ms)`);
  
  // Check performance budgets if available
  if (result.budgets && result.budgets.items.length > 0) {
    console.log('\nPerformance Budgets:');
    
    let anyBudgetFailed = false;
    for (const item of result.budgets.items) {
      const overBudget = item.sizeOverBudget > 0 || item.countOverBudget > 0;
      anyBudgetFailed = anyBudgetFailed || overBudget;
      
      if (overBudget) {
        console.log(`  ❌ ${item.label}: Over budget`);
        if (item.sizeOverBudget > 0) {
          console.log(`     Size: ${item.transferSize} KB (budget: ${item.requestedSize - item.sizeOverBudget} KB, over by ${item.sizeOverBudget} KB)`);
        }
        if (item.countOverBudget > 0) {
          console.log(`     Count: ${item.requestCount} (budget: ${item.requestCount - item.countOverBudget}, over by ${item.countOverBudget})`);
        }
      } else {
        console.log(`  ✅ ${item.label}: Within budget`);
      }
    }
    
    if (!result.budgets.passed) {
      console.log(`\n  ⚠️  Performance budgets FAILED`);
    }
  }
  
  const thresholdsPass = 
    result.scores.performance >= THRESHOLDS.performance &&
    result.metrics.lcp <= THRESHOLDS.lcp &&
    result.metrics.cls <= THRESHOLDS.cls &&
    result.metrics.tbt <= THRESHOLDS.tbt;
  
  // CRITICAL: Must pass BOTH thresholds AND budgets
  const passed = thresholdsPass && (!result.budgets || result.budgets.passed);
  
  result.passed = passed;
  return passed;
}

/**
 * Update gate status JSON with Lighthouse results
 */
function updateGateStatus(results) {
  let gateStatus = {
    lastUpdated: new Date().toISOString(),
    environment: 'development',
    goldenPathTests: {},
    routes: {},
  };
  
  // Load existing gate status if it exists
  if (existsSync(GATE_STATUS_FILE)) {
    try {
      const content = readFileSync(GATE_STATUS_FILE, 'utf-8');
      gateStatus = JSON.parse(content);
    } catch (error) {
      console.warn('⚠️  Failed to load existing gate status, creating new one');
    }
  }
  
  // Update routes with performance data
  for (const result of results) {
    if (result.error) continue;
    
    gateStatus.routes[result.route] = {
      ...gateStatus.routes[result.route],
      lastPerformanceTest: result.timestamp,
      performance: {
        score: result.scores.performance,
        lcp: result.metrics.lcp,
        cls: result.metrics.cls,
        tbt: result.metrics.tbt,
        budgetsPassed: result.budgets ? result.budgets.passed : true,
        budgetViolations: result.budgets ? result.budgets.items.filter(item => 
          item.sizeOverBudget > 0 || item.countOverBudget > 0
        ).map(item => ({
          label: item.label,
          sizeOverBudget: item.sizeOverBudget,
          countOverBudget: item.countOverBudget,
        })) : [],
        passed: result.passed, // Overall pass (thresholds AND budgets)
      },
    };
  }
  
  // Update Golden Path tests with aggregated performance data
  for (const [gpId, gpTest] of Object.entries(gateStatus.goldenPathTests)) {
    if (!gpTest.routes || gpTest.routes.length === 0) continue;
    
    // Find all tested routes that belong to this GP test
    const testedRoutes = gpTest.routes
      .map(route => gateStatus.routes[route])
      .filter(routeData => routeData?.performance);
    
    if (testedRoutes.length === 0) continue;
    
    // Aggregate performance metrics across all tested routes (worst-case)
    const aggregated = {
      score: Math.min(...testedRoutes.map(r => r.performance.score)),
      lcp: Math.max(...testedRoutes.map(r => r.performance.lcp)),
      cls: Math.max(...testedRoutes.map(r => r.performance.cls)),
      tbt: Math.max(...testedRoutes.map(r => r.performance.tbt)),
      budgetsPassed: testedRoutes.every(r => r.performance.budgetsPassed),
      budgetViolations: [],
      passed: testedRoutes.every(r => r.performance.passed),
    };
    
    // Collect all unique budget violations across tested routes
    const violationsMap = new Map();
    for (const routeData of testedRoutes) {
      for (const violation of routeData.performance.budgetViolations) {
        const key = violation.label;
        const existing = violationsMap.get(key);
        if (!existing || 
            (violation.sizeOverBudget || 0) > (existing.sizeOverBudget || 0) ||
            (violation.countOverBudget || 0) > (existing.countOverBudget || 0)) {
          violationsMap.set(key, violation);
        }
      }
    }
    aggregated.budgetViolations = Array.from(violationsMap.values());
    
    // Update GP test performance
    gateStatus.goldenPathTests[gpId].performance = aggregated;
    
    console.log(`\n✅ Updated GP test ${gpId} performance (aggregated from ${testedRoutes.length}/${gpTest.routes.length} routes)`);
  }
  
  gateStatus.lastUpdated = new Date().toISOString();
  
  // Write updated gate status
  writeFileSync(GATE_STATUS_FILE, JSON.stringify(gateStatus, null, 2));
  console.log('\n✅ Gate status updated');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { runLighthouse, evaluateResult, updateGateStatus };
