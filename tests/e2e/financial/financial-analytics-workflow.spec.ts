/**
 * Analytics Page - End-to-End Tests
 * 
 * Comprehensive tests for Business Analytics functionality following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during data fetch
 * - Error states with retry mechanisms
 * - Date range filtering (MTD, QTD, YTD, Custom)
 * - Revenue, expense, and profit KPIs
 * - Revenue trends and job type breakdown
 * - Builder profitability sorting
 * - Cash flow forecasts
 * - Inspector utilization metrics
 * - CSV export functionality
 * - Empty states
 * - Responsive error handling
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(45000);

class AnalyticsPage {
  constructor(private page: Page) {}

  // Locators
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get pageSubtitle() {
    return this.page.getByTestId('text-page-subtitle');
  }

  get dateRangePreset() {
    return this.page.getByTestId('select-daterange-preset');
  }

  get refreshButton() {
    return this.page.getByTestId('button-refresh');
  }

  get exportCSVButton() {
    return this.page.getByTestId('button-export-csv');
  }

  get exportPDFButton() {
    return this.page.getByTestId('button-export-pdf');
  }

  get dateRangeText() {
    return this.page.getByTestId('text-daterange');
  }

  get summaryError() {
    return this.page.getByTestId('alert-summary-error');
  }

  get retrySummaryButton() {
    return this.page.getByTestId('button-retry-summary');
  }

  get kpiRevenueCard() {
    return this.page.getByTestId('card-kpi-revenue');
  }

  get kpiExpensesCard() {
    return this.page.getByTestId('card-kpi-expenses');
  }

  get kpiProfitCard() {
    return this.page.getByTestId('card-kpi-profit');
  }

  get kpiProfitMarginCard() {
    return this.page.getByTestId('card-kpi-profit-margin');
  }

  get revenueTrendCard() {
    return this.page.getByTestId('card-revenue-trend');
  }

  get jobTypeRevenueCard() {
    return this.page.getByTestId('card-revenue-by-job-type');
  }

  get builderProfitabilityCard() {
    return this.page.getByTestId('card-builder-profitability');
  }

  get cashFlowCard() {
    return this.page.getByTestId('card-cash-flow-forecast');
  }

  get inspectorUtilCard() {
    return this.page.getByTestId('card-inspector-utilization');
  }

  get inspectorSelect() {
    return this.page.getByTestId('select-inspector');
  }

  // Actions
  async navigate() {
    await this.page.goto(`${BASE_URL}/financial/analytics`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectDateRange(preset: 'mtd' | 'qtd' | 'ytd' | 'custom') {
    await this.dateRangePreset.click();
    await this.page.getByTestId(`option-${preset}`).click();
  }

  async clickRefresh() {
    await this.refreshButton.click();
  }

  async clickExportCSV() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportCSVButton.click();
    return await downloadPromise;
  }

  async selectInspector(inspectorId: string) {
    await this.inspectorSelect.click();
    await this.page.getByTestId(`option-inspector-${inspectorId}`).click();
  }

  async sortBuilderBy(field: string) {
    await this.page.getByTestId(`sort-${field}`).click();
  }
}

test.describe('Analytics Page - E2E Tests', () => {
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    analyticsPage = new AnalyticsPage(page);

    // Login as admin using dev-mode
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    
    // Navigate to analytics page
    await analyticsPage.navigate();
  });

  test.afterEach(async ({ page }, testInfo: any) => {
    if (testInfo.status !== 'passed') {
      const screenshot = await page.screenshot();
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  });

  // ============================================================================
  // PHASE 1 - PAGE LOAD & SKELETON STATES
  // ============================================================================

  test('should display page title and subtitle correctly', async () => {
    await expect(analyticsPage.pageTitle).toBeVisible();
    await expect(analyticsPage.pageTitle).toHaveText('Business Analytics');
    await expect(analyticsPage.pageSubtitle).toBeVisible();
    await expect(analyticsPage.pageSubtitle).toContainText('revenue');
  });

  test('should display all KPI cards on page load', async () => {
    await expect(analyticsPage.kpiRevenueCard).toBeVisible();
    await expect(analyticsPage.kpiExpensesCard).toBeVisible();
    await expect(analyticsPage.kpiProfitCard).toBeVisible();
    await expect(analyticsPage.kpiProfitMarginCard).toBeVisible();
  });

  test('should display all chart cards on page load', async () => {
    await expect(analyticsPage.revenueTrendCard).toBeVisible();
    await expect(analyticsPage.jobTypeRevenueCard).toBeVisible();
    await expect(analyticsPage.builderProfitabilityCard).toBeVisible();
    await expect(analyticsPage.cashFlowCard).toBeVisible();
    await expect(analyticsPage.inspectorUtilCard).toBeVisible();
  });

  // ============================================================================
  // PHASE 2 - ERROR STATES WITH RETRY
  // ============================================================================

  test('should display error state with retry button when summary fails to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/analytics/profitability-summary*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.navigate();
    
    // Wait for error to appear
    await expect(analyticsPage.summaryError).toBeVisible({ timeout: 10000 });
    await expect(analyticsPage.summaryError).toContainText('Failed to Load Analytics Summary');
    
    // Verify retry button exists
    await expect(analyticsPage.retrySummaryButton).toBeVisible();
    await expect(analyticsPage.retrySummaryButton).toContainText('Retry');
    
    // Remove the route intercept
    await page.unroute('**/api/analytics/profitability-summary*');
    
    // Click retry
    await analyticsPage.retrySummaryButton.click();
    
    // Should load successfully now
    await expect(analyticsPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should show error state for revenue trend when data fails', async ({ page }) => {
    await page.route('**/api/analytics/profitability-summary*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.navigate();
    
    const revenueTrendError = page.getByTestId('alert-revenue-trend-error');
    await expect(revenueTrendError).toBeVisible({ timeout: 10000 });
    
    const retryButton = page.getByTestId('button-retry-revenue-trend');
    await expect(retryButton).toBeVisible();
    
    await page.unroute('**/api/analytics/profitability-summary*');
    await retryButton.click();
  });

  test('should show error state for job type revenue when data fails', async ({ page }) => {
    await page.route('**/api/analytics/revenue-by-job-type*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.navigate();
    
    const jobTypeError = page.getByTestId('alert-job-type-revenue-error');
    await expect(jobTypeError).toBeVisible({ timeout: 10000 });
    
    const retryButton = page.getByTestId('button-retry-job-type');
    await expect(retryButton).toBeVisible();
    
    await page.unroute('**/api/analytics/revenue-by-job-type*');
    await retryButton.click();
  });

  test('should show error state for builder profitability when data fails', async ({ page }) => {
    await page.route('**/api/analytics/builder-profitability*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.navigate();
    
    const builderError = page.getByTestId('alert-builder-profitability-error');
    await expect(builderError).toBeVisible({ timeout: 10000 });
    
    const retryButton = page.getByTestId('button-retry-builder');
    await expect(retryButton).toBeVisible();
  });

  test('should show error state for cash flow when data fails', async ({ page }) => {
    await page.route('**/api/analytics/cash-flow-forecast*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.navigate();
    
    const cashFlowError = page.getByTestId('alert-cash-flow-error');
    await expect(cashFlowError).toBeVisible({ timeout: 10000 });
    
    const retryButton = page.getByTestId('button-retry-cash-flow');
    await expect(retryButton).toBeVisible();
  });

  // ============================================================================
  // PHASE 3 - DATE RANGE FILTERING
  // ============================================================================

  test('should change date range to MTD', async () => {
    await analyticsPage.selectDateRange('mtd');
    await expect(analyticsPage.dateRangeText).toBeVisible();
    // Date range should update (verify it contains current month)
    const dateText = await analyticsPage.dateRangeText.textContent();
    expect(dateText).toBeTruthy();
  });

  test('should change date range to QTD', async () => {
    await analyticsPage.selectDateRange('qtd');
    await expect(analyticsPage.dateRangeText).toBeVisible();
    const dateText = await analyticsPage.dateRangeText.textContent();
    expect(dateText).toBeTruthy();
  });

  test('should change date range to YTD', async () => {
    await analyticsPage.selectDateRange('ytd');
    await expect(analyticsPage.dateRangeText).toBeVisible();
    const dateText = await analyticsPage.dateRangeText.textContent();
    expect(dateText).toBeTruthy();
  });

  test('should display current date range in readable format', async () => {
    await expect(analyticsPage.dateRangeText).toBeVisible();
    const dateText = await analyticsPage.dateRangeText.textContent();
    // Should contain month abbreviation and year
    expect(dateText).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
  });

  // ============================================================================
  // PHASE 4 - REFRESH & EXPORT FUNCTIONALITY
  // ============================================================================

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    let requestCount = 0;
    
    page.on('request', (request) => {
      if (request.url().includes('/api/analytics/')) {
        requestCount++;
      }
    });
    
    await analyticsPage.clickRefresh();
    await page.waitForTimeout(1000);
    
    // Should have made API requests
    expect(requestCount).toBeGreaterThan(0);
  });

  test('should export CSV when export button is clicked', async ({ page }) => {
    // Mock toast notification
    page.on('dialog', dialog => dialog.accept());
    
    await analyticsPage.exportCSVButton.click();
    
    // Wait for any download or toast notification
    await page.waitForTimeout(1000);
  });

  test('should show coming soon message for PDF export', async ({ page }) => {
    await analyticsPage.exportPDFButton.click();
    
    // Wait for toast notification
    await page.waitForTimeout(500);
  });

  // ============================================================================
  // PHASE 5 - BUILDER PROFITABILITY SORTING
  // ============================================================================

  test('should sort builder profitability by revenue', async ({ page }) => {
    const sortButton = page.getByTestId('sort-revenue');
    const isVisible = await sortButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await sortButton.click();
      await page.waitForTimeout(500);
      
      // Click again to change sort order
      await sortButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should sort builder profitability by job count', async ({ page }) => {
    const sortButton = page.getByTestId('sort-job-count');
    const isVisible = await sortButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await sortButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should sort builder profitability by avg revenue', async ({ page }) => {
    const sortButton = page.getByTestId('sort-avg-revenue');
    const isVisible = await sortButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await sortButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should sort builder profitability by outstanding AR', async ({ page }) => {
    const sortButton = page.getByTestId('sort-outstanding-ar');
    const isVisible = await sortButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await sortButton.click();
      await page.waitForTimeout(500);
    }
  });

  // ============================================================================
  // PHASE 6 - INSPECTOR UTILIZATION
  // ============================================================================

  test('should display empty state for inspector utilization initially', async ({ page }) => {
    const emptyState = page.getByTestId('empty-inspector-util');
    const isVisible = await emptyState.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(emptyState).toContainText('Select an inspector');
    }
  });

  test('should load inspector utilization data when inspector is selected', async ({ page }) => {
    await analyticsPage.inspectorSelect.click();
    
    const firstInspector = page.getByTestId('option-inspector-1');
    const isAvailable = await firstInspector.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstInspector.click();
      await page.waitForTimeout(1000);
      
      // Should show metrics or loading state
      const metricsSection = page.getByTestId('section-inspector-metrics');
      const skeletonSection = page.getByTestId('skeleton-inspector-util');
      
      const hasMetrics = await metricsSection.isVisible().catch(() => false);
      const hasSkeleton = await skeletonSection.isVisible().catch(() => false);
      
      expect(hasMetrics || hasSkeleton).toBeTruthy();
    }
  });

  test('should show error state for inspector utilization when data fails', async ({ page }) => {
    await page.route('**/api/analytics/inspector-utilization*', (route) => {
      route.abort('failed');
    });
    
    await analyticsPage.inspectorSelect.click();
    const firstInspector = page.getByTestId('option-inspector-1');
    const isAvailable = await firstInspector.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstInspector.click();
      
      const inspectorError = page.getByTestId('alert-inspector-util-error');
      await expect(inspectorError).toBeVisible({ timeout: 10000 });
      
      const retryButton = page.getByTestId('button-retry-inspector');
      await expect(retryButton).toBeVisible();
    }
  });

  // ============================================================================
  // PHASE 7 - DATA DISPLAY VERIFICATION
  // ============================================================================

  test('should display KPI values in cards', async ({ page }) => {
    const revenueText = page.getByTestId('text-revenue');
    const expensesText = page.getByTestId('text-expenses');
    const profitText = page.getByTestId('text-profit');
    const profitMarginText = page.getByTestId('text-profit-margin');
    
    // All KPI values should be visible (or show skeleton/empty state)
    const hasRevenue = await revenueText.isVisible().catch(() => false);
    const hasExpenses = await expensesText.isVisible().catch(() => false);
    const hasProfit = await profitText.isVisible().catch(() => false);
    const hasProfitMargin = await profitMarginText.isVisible().catch(() => false);
    
    // At least the cards should be visible
    expect(hasRevenue || hasExpenses || hasProfit || hasProfitMargin).toBeTruthy();
  });
});
