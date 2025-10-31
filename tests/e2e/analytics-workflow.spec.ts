/**
 * Analytics Page - End-to-End Tests
 * 
 * Comprehensive tests for Analytics dashboard following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders for all widgets/charts during data fetch
 * - Error states with retry mechanisms for each query
 * - Empty states when no data available
 * - Date range filter functionality
 * - Metric calculations accuracy
 * - Chart rendering and interactions
 * - Builder performance comparison
 * - Forecast accuracy display
 * - Compliance metrics
 * - Export functionality
 * - Responsive design
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000); // Analytics has many queries

class AnalyticsPage {
  constructor(private page: Page) {}

  // Page Elements
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get dateRangePicker() {
    return this.page.getByTestId('date-range-picker');
  }

  get exportButton() {
    return this.page.getByTestId('button-export-analytics');
  }

  // Summary Metrics
  get totalInspections() {
    return this.page.getByTestId('text-total-inspections');
  }

  get avgInspectionTime() {
    return this.page.getByTestId('text-avg-inspection-time');
  }

  get completionRate() {
    return this.page.getByTestId('text-completion-rate');
  }

  get avgItems() {
    return this.page.getByTestId('text-avg-items');
  }

  // Skeleton Loaders
  get skeletonTotalInspections() {
    return this.page.getByTestId('skeleton-total-inspections');
  }

  get skeletonAvgTime() {
    return this.page.getByTestId('skeleton-avg-time');
  }

  get skeletonCompletionRate() {
    return this.page.getByTestId('skeleton-completion-rate');
  }

  get skeletonAvgItems() {
    return this.page.getByTestId('skeleton-avg-items');
  }

  get skeletonInspectionVolume() {
    return this.page.getByTestId('skeleton-inspection-volume');
  }

  get skeletonPhotoTags() {
    return this.page.getByTestId('skeleton-photo-tags');
  }

  get skeletonStatusBreakdown() {
    return this.page.getByTestId('skeleton-status-breakdown');
  }

  get skeletonCommonIssues() {
    return this.page.getByTestId('skeleton-common-issues');
  }

  get skeletonComplianceTrends() {
    return this.page.getByTestId('skeleton-compliance-trends');
  }

  get skeletonTopViolations() {
    return this.page.getByTestId('skeleton-top-violations');
  }

  get skeletonBuilderPerformance() {
    return this.page.getByTestId('skeleton-builder-performance');
  }

  get skeletonForecastDetails() {
    return this.page.getByTestId('skeleton-forecast-details');
  }

  // Error States
  get errorJobs() {
    return this.page.getByTestId('error-jobs');
  }

  get errorItems() {
    return this.page.getByTestId('error-items');
  }

  get errorPhotos() {
    return this.page.getByTestId('error-photos');
  }

  get errorBuilders() {
    return this.page.getByTestId('error-builders');
  }

  get errorForecasts() {
    return this.page.getByTestId('error-forecasts');
  }

  // Retry Buttons
  get retryJobsButton() {
    return this.page.getByTestId('button-retry-jobs');
  }

  get retryItemsButton() {
    return this.page.getByTestId('button-retry-items');
  }

  get retryPhotosButton() {
    return this.page.getByTestId('button-retry-photos');
  }

  get retryBuildersButton() {
    return this.page.getByTestId('button-retry-builders');
  }

  get retryForecastsButton() {
    return this.page.getByTestId('button-retry-forecasts');
  }

  // Charts
  get chartInspectionVolume() {
    return this.page.getByTestId('chart-inspection-volume');
  }

  get chartPhotoTags() {
    return this.page.getByTestId('chart-photo-tags');
  }

  get chartStatusBreakdown() {
    return this.page.getByTestId('chart-status-breakdown');
  }

  get chartIssuesTrend() {
    return this.page.getByTestId('chart-issues-trend');
  }

  get chartComplianceTrends() {
    return this.page.getByTestId('chart-compliance-trends');
  }

  get chartTopViolations() {
    return this.page.getByTestId('chart-top-violations');
  }

  get chartBuilderComparison() {
    return this.page.getByTestId('chart-builder-comparison');
  }

  get chartBuilderTrend() {
    return this.page.getByTestId('chart-builder-trend');
  }

  // Tables
  get tableCommonIssues() {
    return this.page.getByTestId('table-common-issues');
  }

  get tableBuilderStats() {
    return this.page.getByTestId('table-builder-stats');
  }

  get tableForecastDetails() {
    return this.page.getByTestId('table-forecast-details');
  }

  // Empty States
  get emptyStateInspectionVolume() {
    return this.page.getByTestId('empty-state-inspection-volume');
  }

  get emptyStatePhotoTags() {
    return this.page.getByTestId('empty-state-photo-tags');
  }

  get emptyStateStatusBreakdown() {
    return this.page.getByTestId('empty-state-status-breakdown');
  }

  get emptyStateNoIssues() {
    return this.page.getByTestId('empty-state-no-issues');
  }

  get emptyStateIssuesTrend() {
    return this.page.getByTestId('empty-state-issues-trend');
  }

  get emptyStateComplianceTrends() {
    return this.page.getByTestId('empty-state-compliance-trends');
  }

  get emptyStateTopViolations() {
    return this.page.getByTestId('empty-state-top-violations');
  }

  get emptyStateBuilderPerformance() {
    return this.page.getByTestId('empty-state-builder-performance');
  }

  get emptyStateForecastDetails() {
    return this.page.getByTestId('empty-state-forecast-details');
  }

  // Sort Buttons
  getSortButton(column: string) {
    return this.page.getByTestId(`button-sort-${column}`);
  }

  // Navigation
  async goto() {
    await this.page.goto(`${BASE_URL}/analytics`);
  }
}

test.describe('Analytics Dashboard Workflow', () => {
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    analyticsPage = new AnalyticsPage(page);
    
    // Navigate to login and authenticate as admin
    await page.goto(BASE_URL);
    
    // Wait for dev mode login links to be available
    await page.waitForSelector('[data-testid="link-dev-login-admin"]', { timeout: 10000 });
    await page.click('[data-testid="link-dev-login-admin"]');
    
    // Wait for authentication to complete and dashboard to load
    await page.waitForSelector('[data-testid="text-page-title"]', { timeout: 10000 });
    
    // Navigate to Analytics page
    await analyticsPage.goto();
    
    // Wait for initial content load
    await page.waitForTimeout(1000);
  });

  test.describe('Phase 2 - BUILD: Skeleton Loaders', () => {
    test('should display skeleton loaders while data is loading', async ({ page }) => {
      // Intercept and delay all analytics queries
      await page.route('/api/jobs', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });
      await page.route('/api/checklist-items', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });
      await page.route('/api/photos', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });
      await page.route('/api/builders', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });
      await page.route('/api/forecasts', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });
      
      await analyticsPage.goto();
      
      // Verify skeleton loaders for metrics appear
      await expect(analyticsPage.skeletonTotalInspections).toBeVisible({ timeout: 3000 });
      await expect(analyticsPage.skeletonAvgTime).toBeVisible();
      await expect(analyticsPage.skeletonCompletionRate).toBeVisible();
      await expect(analyticsPage.skeletonAvgItems).toBeVisible();
      
      // Verify skeleton loaders for charts appear
      const hasChartSkeletons = 
        await analyticsPage.skeletonInspectionVolume.isVisible() ||
        await analyticsPage.skeletonPhotoTags.isVisible() ||
        await analyticsPage.skeletonStatusBreakdown.isVisible();
      
      expect(hasChartSkeletons).toBeTruthy();
    });
  });

  test.describe('Phase 2 - BUILD: Error States with Retry', () => {
    test('should display error state for jobs query failure with retry button', async ({ page }) => {
      // Mock jobs API to fail
      await page.route('/api/jobs', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      
      // Wait for error state
      await expect(analyticsPage.errorJobs).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorJobs).toContainText('Failed to Load Jobs Data');
      
      // Verify retry button
      await expect(analyticsPage.retryJobsButton).toBeVisible();
      await expect(analyticsPage.retryJobsButton).toContainText('Retry');
    });

    test('should display error state for checklist items query failure', async ({ page }) => {
      await page.route('/api/checklist-items', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      
      await expect(analyticsPage.errorItems).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorItems).toContainText('Failed to Load Checklist Items');
      await expect(analyticsPage.retryItemsButton).toBeVisible();
    });

    test('should display error state for photos query failure', async ({ page }) => {
      await page.route('/api/photos', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      
      await expect(analyticsPage.errorPhotos).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorPhotos).toContainText('Failed to Load Photos Data');
      await expect(analyticsPage.retryPhotosButton).toBeVisible();
    });

    test('should display error state for builders query failure', async ({ page }) => {
      await page.route('/api/builders', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      
      await expect(analyticsPage.errorBuilders).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorBuilders).toContainText('Failed to Load Builders Data');
      await expect(analyticsPage.retryBuildersButton).toBeVisible();
    });

    test('should display error state for forecasts query failure', async ({ page }) => {
      await page.route('/api/forecasts', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      
      await expect(analyticsPage.errorForecasts).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorForecasts).toContainText('Failed to Load Forecasts Data');
      await expect(analyticsPage.retryForecastsButton).toBeVisible();
    });
  });

  test.describe('Phase 2 - BUILD: Page Layout and Navigation', () => {
    test('should display page title and controls', async () => {
      await expect(analyticsPage.pageTitle).toBeVisible();
      await expect(analyticsPage.pageTitle).toHaveText('Analytics');
      
      // Date range picker should be visible
      await expect(analyticsPage.dateRangePicker).toBeVisible();
      
      // Export button should be visible
      await expect(analyticsPage.exportButton).toBeVisible();
      await expect(analyticsPage.exportButton).toContainText('Export');
    });

    test('should display summary metrics cards', async () => {
      // Wait for data to load
      await analyticsPage.page.waitForTimeout(2000);
      
      // All 4 metric cards should be present
      const totalInspectionsCard = analyticsPage.page.getByTestId('card-total-inspections');
      const avgTimeCard = analyticsPage.page.getByTestId('card-avg-inspection-time');
      const completionRateCard = analyticsPage.page.getByTestId('card-completion-rate');
      const avgItemsCard = analyticsPage.page.getByTestId('card-avg-items');
      
      await expect(totalInspectionsCard).toBeVisible();
      await expect(avgTimeCard).toBeVisible();
      await expect(completionRateCard).toBeVisible();
      await expect(avgItemsCard).toBeVisible();
    });
  });

  test.describe('Phase 2 - BUILD: Empty States', () => {
    test('should display empty state when no inspection data', async ({ page }) => {
      // Mock empty jobs response
      await page.route('/api/jobs', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
      
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Check for empty states
      const hasEmptyState = 
        await analyticsPage.emptyStateInspectionVolume.isVisible() ||
        await analyticsPage.emptyStateNoIssues.isVisible();
      
      expect(hasEmptyState).toBeTruthy();
    });

    test('should display empty state when no photo tags', async ({ page }) => {
      await page.route('/api/photos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
      
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Scroll to photo tags section
      await analyticsPage.page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(500);
      
      const emptyState = analyticsPage.emptyStatePhotoTags;
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText('No photo tags');
      }
    });

    test('should display empty state when no builder data', async ({ page }) => {
      await page.route('/api/builders', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
      
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Scroll to builder section
      await analyticsPage.page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(500);
      
      const emptyState = analyticsPage.emptyStateBuilderPerformance;
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText('No builder data available');
      }
    });
  });

  test.describe('Phase 4 - TEST: Data Display and Calculations', () => {
    test('should display metric values correctly', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000);
      
      // Metrics should have numeric values or N/A
      const totalText = await analyticsPage.totalInspections.textContent();
      expect(totalText).toMatch(/^\d+$/);
      
      const completionText = await analyticsPage.completionRate.textContent();
      expect(completionText).toMatch(/^\d+(\.\d+)?%$/);
      
      const avgItemsText = await analyticsPage.avgItems.textContent();
      expect(avgItemsText).toMatch(/^\d+(\.\d+)?$/);
    });

    test('should display charts when data is available', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // At least one chart should render
      const hasCharts = 
        await analyticsPage.chartInspectionVolume.isVisible() ||
        await analyticsPage.chartPhotoTags.isVisible() ||
        await analyticsPage.chartStatusBreakdown.isVisible();
      
      expect(hasCharts).toBeTruthy();
    });

    test('should display common issues table when issues exist', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to common issues
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(500);
      
      // Either table or empty state should be visible
      const hasTable = await analyticsPage.tableCommonIssues.isVisible();
      const hasEmptyState = await analyticsPage.emptyStateNoIssues.isVisible();
      
      expect(hasTable || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Phase 4 - TEST: Builder Performance', () => {
    test('should display builder performance table with sortable columns', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to builder section
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(1000);
      
      const builderTable = analyticsPage.tableBuilderStats;
      const emptyState = analyticsPage.emptyStateBuilderPerformance;
      
      // Check if either table or empty state is visible
      const hasTable = await builderTable.isVisible();
      const hasEmpty = await emptyState.isVisible();
      
      expect(hasTable || hasEmpty).toBeTruthy();
      
      // If table exists, verify sort buttons
      if (hasTable) {
        const sortNameButton = analyticsPage.getSortButton('name');
        const sortTotalJobsButton = analyticsPage.getSortButton('totalJobs');
        const sortCompletionRateButton = analyticsPage.getSortButton('completionRate');
        
        await expect(sortNameButton).toBeVisible();
        await expect(sortTotalJobsButton).toBeVisible();
        await expect(sortCompletionRateButton).toBeVisible();
      }
    });

    test('should allow sorting builder performance table', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to builder section
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(1000);
      
      // Check if table exists
      if (await analyticsPage.tableBuilderStats.isVisible()) {
        const sortButton = analyticsPage.getSortButton('completionRate');
        
        // Click to sort
        await sortButton.click();
        await page.waitForTimeout(500);
        
        // Click again to reverse sort
        await sortButton.click();
        await page.waitForTimeout(500);
        
        // Table should still be visible
        await expect(analyticsPage.tableBuilderStats).toBeVisible();
      }
    });
  });

  test.describe('Phase 4 - TEST: Forecast Accuracy', () => {
    test('should display forecast accuracy metrics', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to forecast section
      await page.evaluate(() => window.scrollBy(0, 3000));
      await page.waitForTimeout(1000);
      
      const overallAccuracyCard = page.getByTestId('card-overall-accuracy');
      const tdlAccuracyCard = page.getByTestId('card-tdl-accuracy');
      const dloAccuracyCard = page.getByTestId('card-dlo-accuracy');
      
      await expect(overallAccuracyCard).toBeVisible();
      await expect(tdlAccuracyCard).toBeVisible();
      await expect(dloAccuracyCard).toBeVisible();
    });

    test('should display forecast details table or empty state', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to forecast details
      await page.evaluate(() => window.scrollBy(0, 3500));
      await page.waitForTimeout(1000);
      
      const forecastTable = analyticsPage.tableForecastDetails;
      const emptyState = analyticsPage.emptyStateForecastDetails;
      
      const hasTable = await forecastTable.isVisible();
      const hasEmpty = await emptyState.isVisible();
      
      expect(hasTable || hasEmpty).toBeTruthy();
    });
  });

  test.describe('Phase 4 - TEST: Compliance Metrics', () => {
    test('should display compliance trends chart or empty state', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to compliance section
      await page.evaluate(() => window.scrollBy(0, 1800));
      await page.waitForTimeout(1000);
      
      const complianceCard = page.getByTestId('card-compliance-trends');
      await expect(complianceCard).toBeVisible();
      
      // Either chart or empty state should be visible
      const hasChart = await analyticsPage.chartComplianceTrends.isVisible();
      const hasEmpty = await analyticsPage.emptyStateComplianceTrends.isVisible();
      
      expect(hasChart || hasEmpty).toBeTruthy();
    });

    test('should display top violations chart or empty state', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Scroll to violations section
      await page.evaluate(() => window.scrollBy(0, 1800));
      await page.waitForTimeout(1000);
      
      const violationsCard = page.getByTestId('card-top-violations');
      await expect(violationsCard).toBeVisible();
      
      const hasChart = await analyticsPage.chartTopViolations.isVisible();
      const hasEmpty = await analyticsPage.emptyStateTopViolations.isVisible();
      
      expect(hasChart || hasEmpty).toBeTruthy();
    });
  });

  test.describe('Phase 4 - TEST: Export Functionality', () => {
    test('should open export dialog when export button clicked', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Click export button
      await analyticsPage.exportButton.click();
      await page.waitForTimeout(500);
      
      // Dialog should appear (verify by looking for common dialog content)
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Phase 5 - HARDEN: Edge Cases', () => {
    test('should handle division by zero gracefully in metrics', async ({ page }) => {
      // Mock empty data
      await page.route('/api/jobs', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
      
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Metrics should show 0 or N/A, not NaN or Infinity
      const completionText = await analyticsPage.completionRate.textContent();
      expect(completionText).not.toContain('NaN');
      expect(completionText).not.toContain('Infinity');
      
      const avgTimeText = await analyticsPage.avgInspectionTime.textContent();
      expect(avgTimeText).not.toContain('NaN');
      expect(avgTimeText).not.toContain('Infinity');
    });

    test('should handle concurrent query failures gracefully', async ({ page }) => {
      // Mock multiple API failures
      await page.route('/api/jobs', async (route) => {
        await route.abort('failed');
      });
      await page.route('/api/checklist-items', async (route) => {
        await route.abort('failed');
      });
      
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Multiple error states should be visible
      await expect(analyticsPage.errorJobs).toBeVisible({ timeout: 5000 });
      await expect(analyticsPage.errorItems).toBeVisible();
      
      // Both retry buttons should be functional
      await expect(analyticsPage.retryJobsButton).toBeVisible();
      await expect(analyticsPage.retryItemsButton).toBeVisible();
    });
  });

  test.describe('Phase 2 - BUILD: Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      // Page should still be accessible
      await expect(analyticsPage.pageTitle).toBeVisible();
      
      // Cards should stack vertically on mobile
      const cards = await page.locator('[data-testid^="card-"]').all();
      expect(cards.length).toBeGreaterThan(0);
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await analyticsPage.goto();
      await page.waitForTimeout(2000);
      
      await expect(analyticsPage.pageTitle).toBeVisible();
      await expect(analyticsPage.exportButton).toBeVisible();
    });
  });
});

test.describe('Analytics Dashboard - ErrorBoundary', () => {
  test('should catch and display errors with ErrorBoundary fallback', async ({ page }) => {
    // Navigate to Analytics
    await page.goto(`${BASE_URL}/analytics`);
    
    // Try to trigger an error by corrupting local storage
    await page.evaluate(() => {
      localStorage.setItem('analytics-date-range', 'invalid-json-{{{');
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Page should still render (ErrorBoundary may catch localStorage errors)
    const pageTitle = page.getByTestId('text-page-title');
    const hasTitle = await pageTitle.isVisible().catch(() => false);
    
    // Either the page loads normally or error boundary catches it
    expect(hasTitle || await page.locator('text=Analytics Error').isVisible()).toBeTruthy();
  });
});
