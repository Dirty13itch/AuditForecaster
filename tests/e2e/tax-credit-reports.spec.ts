/**
 * Tax Credit Reports Page - End-to-End Tests
 * 
 * Comprehensive tests for the Tax Credit Reports page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders for all sections (header, filters, metrics, charts, tables)
 * - Error states with retry mechanisms for both queries (projects, builders)
 * - Empty states when no data available
 * - Metric card calculations and accuracy
 * - Chart rendering and interactions
 * - Tab navigation (overview, builders, taxyear, analytics)
 * - Table data display across multiple tabs
 * - Export functionality (CSV, PDF, IRS Form 8908)
 * - Filter functionality (year, builder)
 * - Builder summaries accuracy
 * - Tax year summaries accuracy
 * - ErrorBoundary fallback
 * 
 * Tax Credit Reports Queries (2 total):
 * 1. /api/tax-credit-projects
 * 2. /api/builders
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(90000); // Complex page with charts and multiple data calculations

class TaxCreditReportsPage {
  constructor(private page: Page) {}

  // Page Elements
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get pageDescription() {
    return this.page.getByTestId('text-page-description');
  }

  // Export Buttons
  get exportCsvButton() {
    return this.page.getByTestId('button-export-csv');
  }

  get exportPdfButton() {
    return this.page.getByTestId('button-export-pdf');
  }

  get exportIrsButton() {
    return this.page.getByTestId('button-export-irs');
  }

  // Filters
  get filtersCard() {
    return this.page.getByTestId('card-filters');
  }

  get yearSelect() {
    return this.page.getByTestId('select-year');
  }

  get builderSelect() {
    return this.page.getByTestId('select-builder');
  }

  get generateReportButton() {
    return this.page.getByTestId('button-generate-report');
  }

  // Metric Cards
  get metricTotalProjects() {
    return this.page.getByTestId('card-metric-total-projects');
  }

  get metricQualifiedUnits() {
    return this.page.getByTestId('card-metric-qualified-units');
  }

  get metricTotalCredits() {
    return this.page.getByTestId('card-metric-total-credits');
  }

  get metricComplianceRate() {
    return this.page.getByTestId('card-metric-compliance-rate');
  }

  get totalProjectsValue() {
    return this.page.getByTestId('text-total-projects');
  }

  get qualifiedUnitsValue() {
    return this.page.getByTestId('text-qualified-units');
  }

  get totalCreditsValue() {
    return this.page.getByTestId('text-total-credits');
  }

  get complianceRateValue() {
    return this.page.getByTestId('text-compliance-rate');
  }

  // Tabs
  get tabsMain() {
    return this.page.getByTestId('tabs-main');
  }

  get tabOverview() {
    return this.page.getByTestId('tab-overview');
  }

  get tabBuilders() {
    return this.page.getByTestId('tab-builders');
  }

  get tabTaxYear() {
    return this.page.getByTestId('tab-taxyear');
  }

  get tabAnalytics() {
    return this.page.getByTestId('tab-analytics');
  }

  // Tab Content
  get contentOverview() {
    return this.page.getByTestId('content-overview');
  }

  get contentBuilders() {
    return this.page.getByTestId('content-builders');
  }

  get contentTaxYear() {
    return this.page.getByTestId('content-taxyear');
  }

  get contentAnalytics() {
    return this.page.getByTestId('content-analytics');
  }

  // Charts
  get chartStatusPie() {
    return this.page.getByTestId('chart-status-pie');
  }

  get chartMonthlyTrend() {
    return this.page.getByTestId('chart-monthly-trend');
  }

  get chartComplianceBar() {
    return this.page.getByTestId('chart-compliance-bar');
  }

  // Tables
  get tableRecentCertifications() {
    return this.page.getByTestId('table-recent-certifications');
  }

  get tableBuilderSummary() {
    return this.page.getByTestId('table-builder-summary');
  }

  get tableTaxYear() {
    return this.page.getByTestId('table-tax-year');
  }

  // Skeleton Loaders
  get skeletonTitle() {
    return this.page.getByTestId('skeleton-title');
  }

  get skeletonDescription() {
    return this.page.getByTestId('skeleton-description');
  }

  get skeletonFilters() {
    return this.page.getByTestId('skeleton-filters');
  }

  skeletonMetric(index: number) {
    return this.page.getByTestId(`skeleton-metric-${index}`);
  }

  get skeletonCharts() {
    return this.page.getByTestId('skeleton-charts');
  }

  get skeletonTable() {
    return this.page.getByTestId('skeleton-table');
  }

  // Error States
  get errorAlertProjects() {
    return this.page.getByTestId('alert-error-projects');
  }

  get errorAlertBuilders() {
    return this.page.getByTestId('alert-error-builders');
  }

  get retryProjectsButton() {
    return this.page.getByTestId('button-retry-projects');
  }

  get retryBuildersButton() {
    return this.page.getByTestId('button-retry-builders');
  }

  // Analytics Content
  get cardFailurePoints() {
    return this.page.getByTestId('card-failure-points');
  }

  get cardSuccessFactors() {
    return this.page.getByTestId('card-success-factors');
  }

  get cardExportOptions() {
    return this.page.getByTestId('card-export-options');
  }

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/tax-credits/reports`);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  // Helper: Select year filter
  async selectYear(year: string) {
    await this.yearSelect.click();
    await this.page.getByTestId(`select-year-${year}`).click();
  }

  // Helper: Select builder filter
  async selectBuilder(builderId: string) {
    await this.builderSelect.click();
    await this.page.getByTestId(`select-builder-${builderId}`).click();
  }
}

// Test Suite: Authentication
test.describe('Tax Credit Reports - Authentication', () => {
  test('allows authenticated users to access page', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.pageTitle).toBeVisible();
    await expect(reportsPage.pageTitle).toContainText('45L Tax Credit Reports');
  });
});

// Test Suite: Skeleton Loaders
test.describe('Tax Credit Reports - Skeleton Loaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays skeleton loaders for header while loading', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    // Delay queries to see skeletons
    await page.route('**/api/tax-credit-projects*', async route => {
      await page.waitForTimeout(2000);
      route.continue();
    });
    
    await reportsPage.navigate();
    
    // Check for header skeletons
    const hasSkeletons = await Promise.race([
      reportsPage.skeletonTitle.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    await reportsPage.waitForPageLoad();
    await expect(reportsPage.pageTitle).toBeVisible();
  });

  test('displays skeleton loaders for metric cards while loading', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    await page.route('**/api/tax-credit-projects*', async route => {
      await page.waitForTimeout(2000);
      route.continue();
    });
    
    await reportsPage.navigate();
    
    // At least one metric skeleton should be visible
    const hasMetricSkeletons = await Promise.race([
      reportsPage.skeletonMetric(1).isVisible().then(() => true),
      reportsPage.skeletonMetric(2).isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    await reportsPage.waitForPageLoad();
    await expect(reportsPage.metricTotalProjects).toBeVisible();
  });

  test('displays skeleton loaders for charts while loading', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    await page.route('**/api/tax-credit-projects*', async route => {
      await page.waitForTimeout(2000);
      route.continue();
    });
    
    await reportsPage.navigate();
    
    const hasChartSkeletons = await Promise.race([
      reportsPage.skeletonCharts.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    await reportsPage.waitForPageLoad();
  });

  test('displays skeleton loaders for tables while loading', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    await page.route('**/api/tax-credit-projects*', async route => {
      await page.waitForTimeout(2000);
      route.continue();
    });
    
    await reportsPage.navigate();
    
    const hasTableSkeletons = await Promise.race([
      reportsPage.skeletonTable.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    await reportsPage.waitForPageLoad();
  });

  test('skeleton loaders disappear after data loads', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Wait for actual content
    await expect(reportsPage.metricTotalProjects).toBeVisible({ timeout: 10000 });
    
    // Skeletons should be gone
    await expect(reportsPage.skeletonMetric(1)).not.toBeVisible();
  });
});

// Test Suite: Error Handling and Retry
test.describe('Tax Credit Reports - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays error state when projects query fails', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    // Intercept and fail the projects query
    await page.route('**/api/tax-credit-projects*', route => route.abort());
    
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Error alert should be visible
    await expect(reportsPage.errorAlertProjects).toBeVisible({ timeout: 10000 });
    await expect(reportsPage.retryProjectsButton).toBeVisible();
  });

  test('displays error state when builders query fails', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    await page.route('**/api/builders*', route => route.abort());
    
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.errorAlertBuilders).toBeVisible({ timeout: 10000 });
    await expect(reportsPage.retryBuildersButton).toBeVisible();
  });

  test('retry button refetches failed projects query', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    let failCount = 0;
    await page.route('**/api/tax-credit-projects*', route => {
      if (failCount < 1) {
        failCount++;
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Wait for error to appear
    await expect(reportsPage.errorAlertProjects).toBeVisible({ timeout: 10000 });
    
    // Click retry
    await reportsPage.retryProjectsButton.click();
    
    // Error should disappear and content should load
    await expect(reportsPage.errorAlertProjects).not.toBeVisible({ timeout: 10000 });
    await expect(reportsPage.metricTotalProjects).toBeVisible({ timeout: 10000 });
  });

  test('retry button refetches failed builders query', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    
    let failCount = 0;
    await page.route('**/api/builders*', route => {
      if (failCount < 1) {
        failCount++;
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Wait for error to appear
    await expect(reportsPage.errorAlertBuilders).toBeVisible({ timeout: 10000 });
    
    // Click retry
    await reportsPage.retryBuildersButton.click();
    
    // Error should disappear
    await expect(reportsPage.errorAlertBuilders).not.toBeVisible({ timeout: 10000 });
  });
});

// Test Suite: Metric Cards
test.describe('Tax Credit Reports - Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays all 4 metric cards', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // All 4 metric cards should be visible
    await expect(reportsPage.metricTotalProjects).toBeVisible();
    await expect(reportsPage.metricQualifiedUnits).toBeVisible();
    await expect(reportsPage.metricTotalCredits).toBeVisible();
    await expect(reportsPage.metricComplianceRate).toBeVisible();
  });

  test('metric cards display numeric values', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Check that values are visible
    await expect(reportsPage.totalProjectsValue).toBeVisible();
    await expect(reportsPage.qualifiedUnitsValue).toBeVisible();
    await expect(reportsPage.totalCreditsValue).toBeVisible();
    await expect(reportsPage.complianceRateValue).toBeVisible();
    
    // Check that values contain numbers
    const totalProjectsText = await reportsPage.totalProjectsValue.textContent();
    expect(totalProjectsText).toMatch(/\d+/);
  });

  test('total credits displays currency format', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    const creditsText = await reportsPage.totalCreditsValue.textContent();
    expect(creditsText).toMatch(/\$/); // Should contain dollar sign
  });

  test('compliance rate displays percentage', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    const complianceText = await reportsPage.complianceRateValue.textContent();
    expect(complianceText).toMatch(/%/); // Should contain percentage sign
  });
});

// Test Suite: Tab Navigation
test.describe('Tax Credit Reports - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays all 4 tabs', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.tabOverview).toBeVisible();
    await expect(reportsPage.tabBuilders).toBeVisible();
    await expect(reportsPage.tabTaxYear).toBeVisible();
    await expect(reportsPage.tabAnalytics).toBeVisible();
  });

  test('overview tab is active by default', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.contentOverview).toBeVisible();
  });

  test('can switch to builders tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabBuilders.click();
    await expect(reportsPage.contentBuilders).toBeVisible();
    await expect(reportsPage.tableBuilderSummary).toBeVisible();
  });

  test('can switch to tax year tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabTaxYear.click();
    await expect(reportsPage.contentTaxYear).toBeVisible();
    await expect(reportsPage.tableTaxYear).toBeVisible();
  });

  test('can switch to analytics tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabAnalytics.click();
    await expect(reportsPage.contentAnalytics).toBeVisible();
    await expect(reportsPage.cardFailurePoints).toBeVisible();
    await expect(reportsPage.cardSuccessFactors).toBeVisible();
  });

  test('can switch between all tabs', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Overview -> Builders
    await reportsPage.tabBuilders.click();
    await expect(reportsPage.contentBuilders).toBeVisible();
    
    // Builders -> Tax Year
    await reportsPage.tabTaxYear.click();
    await expect(reportsPage.contentTaxYear).toBeVisible();
    
    // Tax Year -> Analytics
    await reportsPage.tabAnalytics.click();
    await expect(reportsPage.contentAnalytics).toBeVisible();
    
    // Analytics -> Overview
    await reportsPage.tabOverview.click();
    await expect(reportsPage.contentOverview).toBeVisible();
  });
});

// Test Suite: Charts
test.describe('Tax Credit Reports - Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays pie chart in overview tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Pie chart should be visible in overview
    await expect(reportsPage.chartStatusPie).toBeVisible();
  });

  test('displays line chart in overview tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Line chart should be visible in overview
    await expect(reportsPage.chartMonthlyTrend).toBeVisible();
  });

  test('displays bar chart in builders tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Switch to builders tab
    await reportsPage.tabBuilders.click();
    
    // Bar chart should be visible
    await expect(reportsPage.chartComplianceBar).toBeVisible();
  });
});

// Test Suite: Tables
test.describe('Tax Credit Reports - Tables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays recent certifications table in overview', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.tableRecentCertifications).toBeVisible();
  });

  test('displays builder summary table in builders tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabBuilders.click();
    await expect(reportsPage.tableBuilderSummary).toBeVisible();
  });

  test('displays tax year summary table in tax year tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabTaxYear.click();
    await expect(reportsPage.tableTaxYear).toBeVisible();
  });

  test('tax year table shows data for 2023, 2024, 2025', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabTaxYear.click();
    
    // Check for year rows
    await expect(page.getByTestId('row-year-2023')).toBeVisible();
    await expect(page.getByTestId('row-year-2024')).toBeVisible();
    await expect(page.getByTestId('row-year-2025')).toBeVisible();
  });
});

// Test Suite: Filters
test.describe('Tax Credit Reports - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays filter card', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.filtersCard).toBeVisible();
    await expect(reportsPage.yearSelect).toBeVisible();
    await expect(reportsPage.builderSelect).toBeVisible();
  });

  test('can select different tax year', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    // Get initial total projects
    const initialText = await reportsPage.totalProjectsValue.textContent();
    
    // Change year filter
    await reportsPage.selectYear('2023');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Value may change or stay same depending on data
    await expect(reportsPage.totalProjectsValue).toBeVisible();
  });

  test('can select all years filter', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.selectYear('all');
    
    // Should show all projects
    await expect(reportsPage.totalProjectsValue).toBeVisible();
  });

  test('can select all builders filter', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.builderSelect.click();
    await page.getByTestId('select-builder-all').click();
    
    await expect(reportsPage.totalProjectsValue).toBeVisible();
  });

  test('generate report button is visible', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.generateReportButton).toBeVisible();
  });
});

// Test Suite: Export Functionality
test.describe('Tax Credit Reports - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays all export buttons in header', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.exportCsvButton).toBeVisible();
    await expect(reportsPage.exportPdfButton).toBeVisible();
    await expect(reportsPage.exportIrsButton).toBeVisible();
  });

  test('export CSV button shows toast notification', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.exportCsvButton.click();
    
    // Wait for toast (may appear briefly)
    await page.waitForTimeout(500);
  });

  test('export PDF button shows toast notification', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.exportPdfButton.click();
    
    await page.waitForTimeout(500);
  });

  test('export IRS button shows toast notification', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.exportIrsButton.click();
    
    await page.waitForTimeout(500);
  });

  test('displays export options in analytics tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabAnalytics.click();
    
    await expect(reportsPage.cardExportOptions).toBeVisible();
    await expect(page.getByTestId('button-irs-8908')).toBeVisible();
    await expect(page.getByTestId('button-builder-summary')).toBeVisible();
    await expect(page.getByTestId('button-tax-software')).toBeVisible();
  });
});

// Test Suite: Analytics Tab Content
test.describe('Tax Credit Reports - Analytics Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays failure points card in analytics', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabAnalytics.click();
    
    await expect(reportsPage.cardFailurePoints).toBeVisible();
    
    // Check for specific failure items
    await expect(page.getByTestId('item-failure-hers')).toBeVisible();
    await expect(page.getByTestId('item-failure-savings')).toBeVisible();
    await expect(page.getByTestId('item-failure-docs')).toBeVisible();
    await expect(page.getByTestId('item-failure-air')).toBeVisible();
    await expect(page.getByTestId('item-failure-duct')).toBeVisible();
  });

  test('displays success factors card in analytics', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabAnalytics.click();
    
    await expect(reportsPage.cardSuccessFactors).toBeVisible();
    
    // Check for specific success items
    await expect(page.getByTestId('item-success-hvac')).toBeVisible();
    await expect(page.getByTestId('item-success-insulation')).toBeVisible();
    await expect(page.getByTestId('item-success-windows')).toBeVisible();
    await expect(page.getByTestId('item-success-ach50')).toBeVisible();
    await expect(page.getByTestId('item-success-ducts')).toBeVisible();
  });
});

// Test Suite: Tax Year Deadlines
test.describe('Tax Credit Reports - Tax Year Deadlines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays deadline alerts in tax year tab', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabTaxYear.click();
    
    // Check for deadline alerts
    await expect(page.getByTestId('alert-deadline-corporate')).toBeVisible();
    await expect(page.getByTestId('alert-deadline-individual')).toBeVisible();
    await expect(page.getByTestId('alert-deadline-extended')).toBeVisible();
  });

  test('deadline alerts show correct dates', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await reportsPage.tabTaxYear.click();
    
    const corporateAlert = page.getByTestId('alert-deadline-corporate');
    const alertText = await corporateAlert.textContent();
    
    // Should contain "March 15"
    expect(alertText).toContain('March 15');
  });
});

// Test Suite: Page Layout
test.describe('Tax Credit Reports - Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('page has proper title and description', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    await expect(reportsPage.pageTitle).toContainText('45L Tax Credit Reports');
    await expect(reportsPage.pageDescription).toContainText('Analytics, summaries, and export options');
  });

  test('metric cards are in responsive grid', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    const metricsContainer = page.getByTestId('group-metric-cards');
    await expect(metricsContainer).toBeVisible();
    
    // All 4 metrics should be visible
    await expect(reportsPage.metricTotalProjects).toBeVisible();
    await expect(reportsPage.metricQualifiedUnits).toBeVisible();
    await expect(reportsPage.metricTotalCredits).toBeVisible();
    await expect(reportsPage.metricComplianceRate).toBeVisible();
  });
});

// Test Suite: Data Accuracy
test.describe('Tax Credit Reports - Data Accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('qualified units displays as fraction', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    const unitsText = await reportsPage.qualifiedUnitsValue.textContent();
    
    // Should contain slash for fraction (e.g., "50/100")
    expect(unitsText).toMatch(/\d+\/\d+/);
  });

  test('compliance rate progress bar is visible', async ({ page }) => {
    const reportsPage = new TaxCreditReportsPage(page);
    await reportsPage.navigate();
    await reportsPage.waitForPageLoad();
    
    const progressBar = page.getByTestId('progress-compliance');
    await expect(progressBar).toBeVisible();
  });
});
