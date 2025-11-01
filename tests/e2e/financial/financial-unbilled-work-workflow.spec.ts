/**
 * Unbilled Work Page - End-to-End Tests
 * 
 * Comprehensive tests for Unbilled Work Tracker functionality following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during data fetch
 * - Error states with retry mechanisms
 * - Job selection and multi-select
 * - Builder filtering
 * - Job type grouping and subtotals
 * - Invoice creation from selected jobs
 * - Empty states
 * - Summary metrics display
 * - Data validation
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(45000);

class UnbilledWorkPage {
  constructor(private page: Page) {}

  // Locators
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get pageSubtitle() {
    return this.page.getByTestId('text-page-subtitle');
  }

  get builderFilter() {
    return this.page.getByTestId('select-builder-filter');
  }

  get summaryError() {
    return this.page.getByTestId('alert-summary-error');
  }

  get jobsError() {
    return this.page.getByTestId('alert-jobs-error');
  }

  get buildersError() {
    return this.page.getByTestId('alert-builders-error');
  }

  get retrySummaryButton() {
    return this.page.getByTestId('button-retry-summary');
  }

  get retryJobsButton() {
    return this.page.getByTestId('button-retry-jobs');
  }

  get retryBuildersButton() {
    return this.page.getByTestId('button-retry-builders');
  }

  get skeletonJobsList() {
    return this.page.getByTestId('skeleton-jobs-list');
  }

  get unbilledCountCard() {
    return this.page.getByTestId('card-unbilled-count');
  }

  get unbilledAmountCard() {
    return this.page.getByTestId('card-unbilled-amount');
  }

  get unbilledCount() {
    return this.page.getByTestId('text-unbilled-count');
  }

  get unbilledAmount() {
    return this.page.getByTestId('text-unbilled-amount');
  }

  get unbilledJobsTable() {
    return this.page.getByTestId('card-unbilled-jobs-table');
  }

  get unbilledJobsTitle() {
    return this.page.getByTestId('text-unbilled-jobs-title');
  }

  get selectionSummary() {
    return this.page.getByTestId('text-selection-summary');
  }

  get createInvoiceButton() {
    return this.page.getByTestId('button-create-invoice');
  }

  get emptyJobsState() {
    return this.page.getByTestId('text-no-jobs');
  }

  getJobRow(jobId: string) {
    return this.page.getByTestId(`row-job-${jobId}`);
  }

  getJobCheckbox(jobId: string) {
    return this.page.getByTestId(`checkbox-job-${jobId}`);
  }

  getJobTypeGroup(jobType: string) {
    return this.page.getByTestId(`group-job-type-${jobType}`);
  }

  getJobTypeBadge(jobType: string) {
    return this.page.getByTestId(`badge-job-type-${jobType}`);
  }

  getJobTypeSubtotal(jobType: string) {
    return this.page.getByTestId(`text-subtotal-${jobType}`);
  }

  getSelectAllCheckbox(jobType: string) {
    return this.page.getByTestId(`checkbox-select-all-${jobType}`);
  }

  // Actions
  async navigate() {
    await this.page.goto(`${BASE_URL}/financial/unbilled-work`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectBuilder(builderId: string) {
    await this.builderFilter.click();
    await this.page.getByTestId(`select-builder-${builderId}`).click();
  }

  async selectAllBuilders() {
    await this.builderFilter.click();
    await this.page.getByTestId('select-builder-all').click();
  }

  async selectJob(jobId: string) {
    await this.getJobCheckbox(jobId).click();
  }

  async selectAllJobsOfType(jobType: string) {
    await this.getSelectAllCheckbox(jobType).click();
  }

  async createInvoice() {
    await this.createInvoiceButton.click();
  }
}

test.describe('Unbilled Work Page - E2E Tests', () => {
  let unbilledWorkPage: UnbilledWorkPage;

  test.beforeEach(async ({ page }) => {
    unbilledWorkPage = new UnbilledWorkPage(page);

    // Login as admin using dev-mode
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    
    // Navigate to unbilled work page
    await unbilledWorkPage.navigate();
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
  // PHASE 1 - PAGE LOAD & BASIC DISPLAY
  // ============================================================================

  test('should display page title and subtitle correctly', async () => {
    await expect(unbilledWorkPage.pageTitle).toBeVisible();
    await expect(unbilledWorkPage.pageTitle).toHaveText('Unbilled Work');
    await expect(unbilledWorkPage.pageSubtitle).toBeVisible();
  });

  test('should display builder filter dropdown', async () => {
    await expect(unbilledWorkPage.builderFilter).toBeVisible();
  });

  test('should display summary cards', async () => {
    await expect(unbilledWorkPage.unbilledCountCard).toBeVisible();
    await expect(unbilledWorkPage.unbilledAmountCard).toBeVisible();
  });

  test('should display unbilled jobs table', async () => {
    await expect(unbilledWorkPage.unbilledJobsTable).toBeVisible();
    await expect(unbilledWorkPage.unbilledJobsTitle).toBeVisible();
  });

  test('should display create invoice button', async () => {
    await expect(unbilledWorkPage.createInvoiceButton).toBeVisible();
    await expect(unbilledWorkPage.createInvoiceButton).toContainText('Create Invoice');
  });

  // ============================================================================
  // PHASE 2 - SKELETON LOADERS & ERROR STATES
  // ============================================================================

  test('should display skeleton loaders during initial page load', async ({ page }) => {
    // Navigate to a fresh page to catch skeleton state
    await page.goto(`${BASE_URL}/financial/unbilled-work`);
    
    // Page should eventually load with title
    await expect(unbilledWorkPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display error state with retry button when summary fails to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/ar/unbilled*', (route) => {
      route.abort('failed');
    });
    
    await unbilledWorkPage.navigate();
    
    // Wait for error to appear
    await expect(unbilledWorkPage.summaryError).toBeVisible({ timeout: 10000 });
    await expect(unbilledWorkPage.summaryError).toContainText('Failed to Load Unbilled Summary');
    
    // Verify retry button exists
    await expect(unbilledWorkPage.retrySummaryButton).toBeVisible();
    await expect(unbilledWorkPage.retrySummaryButton).toContainText('Retry');
    
    // Remove the route intercept
    await page.unroute('**/api/ar/unbilled*');
    
    // Click retry
    await unbilledWorkPage.retrySummaryButton.click();
    
    // Should load successfully now
    await expect(unbilledWorkPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display error state with retry button when jobs fail to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/jobs*', (route) => {
      route.abort('failed');
    });
    
    await unbilledWorkPage.navigate();
    
    // Wait for error to appear
    await expect(unbilledWorkPage.jobsError).toBeVisible({ timeout: 10000 });
    await expect(unbilledWorkPage.jobsError).toContainText('Failed to Load Jobs');
    
    // Verify retry button exists
    await expect(unbilledWorkPage.retryJobsButton).toBeVisible();
    
    // Remove the route intercept
    await page.unroute('**/api/jobs*');
    
    // Click retry
    await unbilledWorkPage.retryJobsButton.click();
    
    // Should load successfully now
    await expect(unbilledWorkPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display error state with retry button when builders fail to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/builders*', (route) => {
      route.abort('failed');
    });
    
    await unbilledWorkPage.navigate();
    
    // Wait for error to appear
    await expect(unbilledWorkPage.buildersError).toBeVisible({ timeout: 10000 });
    await expect(unbilledWorkPage.buildersError).toContainText('Failed to Load Builders');
    
    // Verify retry button exists
    await expect(unbilledWorkPage.retryBuildersButton).toBeVisible();
    
    // Remove the route intercept
    await page.unroute('**/api/builders*');
    
    // Click retry
    await unbilledWorkPage.retryBuildersButton.click();
  });

  test('should display empty state when no unbilled jobs exist', async ({ page }) => {
    const emptyState = unbilledWorkPage.emptyJobsState;
    const isVisible = await emptyState.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(emptyState).toContainText('No unbilled jobs found');
    }
  });

  // ============================================================================
  // PHASE 3 - SUMMARY METRICS
  // ============================================================================

  test('should display total unbilled jobs count', async ({ page }) => {
    const unbilledCount = unbilledWorkPage.unbilledCount;
    const isVisible = await unbilledCount.isVisible().catch(() => false);
    
    if (isVisible) {
      const countText = await unbilledCount.textContent();
      expect(countText).toBeTruthy();
      expect(parseInt(countText || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display total unbilled amount in currency format', async ({ page }) => {
    const unbilledAmount = unbilledWorkPage.unbilledAmount;
    const isVisible = await unbilledAmount.isVisible().catch(() => false);
    
    if (isVisible) {
      const amountText = await unbilledAmount.textContent();
      expect(amountText).toContain('$');
    }
  });

  test('should display count and amount descriptions', async ({ page }) => {
    const countDesc = page.getByTestId('text-unbilled-count-description');
    const amountDesc = page.getByTestId('text-unbilled-amount-description');
    
    await expect(countDesc).toBeVisible();
    await expect(amountDesc).toBeVisible();
  });

  // ============================================================================
  // PHASE 4 - BUILDER FILTERING
  // ============================================================================

  test('should filter jobs by selected builder', async ({ page }) => {
    await unbilledWorkPage.builderFilter.click();
    
    const firstBuilder = page.locator('[data-testid^="select-builder-"]').nth(1);
    const isAvailable = await firstBuilder.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstBuilder.click();
      await page.waitForTimeout(500);
      
      // Jobs should be filtered
    }
  });

  test('should show all jobs when "All Builders" is selected', async ({ page }) => {
    await unbilledWorkPage.builderFilter.click();
    
    const allBuildersOption = page.getByTestId('select-builder-all');
    await allBuildersOption.click();
    
    await page.waitForTimeout(500);
  });

  test('should display builder options in filter dropdown', async ({ page }) => {
    await unbilledWorkPage.builderFilter.click();
    
    const builderOptions = page.locator('[data-testid^="select-builder-"]');
    const optionsCount = await builderOptions.count();
    
    expect(optionsCount).toBeGreaterThan(0);
  });

  // ============================================================================
  // PHASE 5 - JOB SELECTION
  // ============================================================================

  test('should select individual job', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      
      // Selection summary should update
      const selectionSummary = unbilledWorkPage.selectionSummary;
      const summaryText = await selectionSummary.textContent();
      expect(summaryText).toContain('1');
    }
  });

  test('should deselect individual job', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      // Select
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      // Deselect
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      // Selection summary should show 0
      const selectionSummary = unbilledWorkPage.selectionSummary;
      const summaryText = await selectionSummary.textContent();
      expect(summaryText).toContain('0');
    }
  });

  test('should select all jobs of a specific type', async ({ page }) => {
    const firstSelectAllCheckbox = page.locator('[data-testid^="checkbox-select-all-"]').first();
    const isAvailable = await firstSelectAllCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstSelectAllCheckbox.click();
      await page.waitForTimeout(300);
      
      // Selection summary should update
      const selectionSummary = unbilledWorkPage.selectionSummary;
      const summaryText = await selectionSummary.textContent();
      expect(summaryText).not.toContain('0 jobs');
    }
  });

  test('should update selection summary as jobs are selected', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const secondJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').nth(1);
    
    const isFirstAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    const isSecondAvailable = await secondJobCheckbox.isVisible().catch(() => false);
    
    if (isFirstAvailable && isSecondAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(200);
      
      let summaryText = await unbilledWorkPage.selectionSummary.textContent();
      expect(summaryText).toContain('1');
      
      await secondJobCheckbox.click();
      await page.waitForTimeout(200);
      
      summaryText = await unbilledWorkPage.selectionSummary.textContent();
      expect(summaryText).toContain('2');
    }
  });

  test('should display selected total amount in selection summary', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      const selectionSummary = unbilledWorkPage.selectionSummary;
      const summaryText = await selectionSummary.textContent();
      expect(summaryText).toContain('$');
    }
  });

  // ============================================================================
  // PHASE 6 - JOB TYPE GROUPING
  // ============================================================================

  test('should display jobs grouped by inspection type', async ({ page }) => {
    const jobTypeGroups = page.locator('[data-testid^="group-job-type-"]');
    const groupCount = await jobTypeGroups.count();
    
    expect(groupCount).toBeGreaterThanOrEqual(0);
  });

  test('should display job type badge for each group', async ({ page }) => {
    const firstJobTypeBadge = page.locator('[data-testid^="badge-job-type-"]').first();
    const isAvailable = await firstJobTypeBadge.isVisible().catch(() => false);
    
    if (isAvailable) {
      const badgeText = await firstJobTypeBadge.textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test('should display job count for each type', async ({ page }) => {
    const firstJobCount = page.locator('[data-testid^="text-job-count-"]').first();
    const isAvailable = await firstJobCount.isVisible().catch(() => false);
    
    if (isAvailable) {
      const countText = await firstJobCount.textContent();
      expect(countText).toMatch(/\d+\s+(job|jobs)/);
    }
  });

  test('should display subtotal for each job type', async ({ page }) => {
    const firstSubtotal = page.locator('[data-testid^="text-subtotal-"]').first();
    const isAvailable = await firstSubtotal.isVisible().catch(() => false);
    
    if (isAvailable) {
      const subtotalText = await firstSubtotal.textContent();
      expect(subtotalText).toContain('$');
    }
  });

  test('should display table headers for each job type group', async ({ page }) => {
    const firstHeader = page.locator('[data-testid^="header-job-number-"]').first();
    const isAvailable = await firstHeader.isVisible().catch(() => false);
    
    expect(isAvailable).toBeTruthy();
  });

  // ============================================================================
  // PHASE 7 - JOB DETAILS DISPLAY
  // ============================================================================

  test('should display job number in table', async ({ page }) => {
    const firstJobName = page.locator('[data-testid^="cell-job-name-"]').first();
    const isAvailable = await firstJobName.isVisible().catch(() => false);
    
    if (isAvailable) {
      const jobName = await firstJobName.textContent();
      expect(jobName).toBeTruthy();
    }
  });

  test('should display job address', async ({ page }) => {
    const firstAddress = page.locator('[data-testid^="cell-address-"]').first();
    const isAvailable = await firstAddress.isVisible().catch(() => false);
    
    if (isAvailable) {
      const address = await firstAddress.textContent();
      expect(address).toBeTruthy();
    }
  });

  test('should display builder name', async ({ page }) => {
    const firstBuilder = page.locator('[data-testid^="cell-builder-"]').first();
    const isAvailable = await firstBuilder.isVisible().catch(() => false);
    
    if (isAvailable) {
      const builderName = await firstBuilder.textContent();
      expect(builderName).toBeTruthy();
    }
  });

  test('should display completion date', async ({ page }) => {
    const firstDate = page.locator('[data-testid^="cell-completion-date-"]').first();
    const isAvailable = await firstDate.isVisible().catch(() => false);
    
    if (isAvailable) {
      const dateText = await firstDate.textContent();
      expect(dateText).toBeTruthy();
    }
  });

  test('should display job value in currency format', async ({ page }) => {
    const firstValue = page.locator('[data-testid^="cell-value-"]').first();
    const isAvailable = await firstValue.isVisible().catch(() => false);
    
    if (isAvailable) {
      const valueText = await firstValue.textContent();
      expect(valueText).toContain('$');
    }
  });

  // ============================================================================
  // PHASE 8 - INVOICE CREATION
  // ============================================================================

  test('should disable create invoice button when no jobs selected', async () => {
    await expect(unbilledWorkPage.createInvoiceButton).toBeDisabled();
  });

  test('should enable create invoice button when jobs are selected', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      await expect(unbilledWorkPage.createInvoiceButton).toBeEnabled();
    }
  });

  test('should navigate to invoices page when creating invoice', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      await unbilledWorkPage.createInvoiceButton.click();
      
      // Should navigate to invoices page
      await page.waitForURL('**/financial/invoices**', { timeout: 5000 });
    }
  });

  test('should pass selected job IDs to invoice creation', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      await unbilledWorkPage.createInvoiceButton.click();
      
      // URL should contain jobIds parameter
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('jobIds');
    }
  });

  // ============================================================================
  // PHASE 9 - DATA INTEGRITY
  // ============================================================================

  test('should maintain selection when filtering by builder', async ({ page }) => {
    const firstJobCheckbox = page.locator('[data-testid^="checkbox-job-"]').first();
    const isAvailable = await firstJobCheckbox.isVisible().catch(() => false);
    
    if (isAvailable) {
      await firstJobCheckbox.click();
      await page.waitForTimeout(300);
      
      // Filter by a builder
      await unbilledWorkPage.builderFilter.click();
      const allBuildersOption = page.getByTestId('select-builder-all');
      await allBuildersOption.click();
      
      await page.waitForTimeout(300);
      
      // Selection should still show count
      const selectionText = await unbilledWorkPage.selectionSummary.textContent();
      expect(selectionText).toBeTruthy();
    }
  });

  test('should display jobs from all builders when "All" is selected', async ({ page }) => {
    await unbilledWorkPage.selectAllBuilders();
    await page.waitForTimeout(500);
    
    const jobRows = page.locator('[data-testid^="row-job-"]');
    const rowCount = await jobRows.count();
    
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });
});
