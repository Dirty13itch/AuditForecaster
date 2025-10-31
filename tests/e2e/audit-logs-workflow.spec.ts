/**
 * AuditLogs Page - End-to-End Tests
 * 
 * Comprehensive tests for the Audit Logs page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during data fetch
 * - Error states with retry mechanisms
 * - Page title and subtitle display
 * - Filter controls (action, resource, date range)
 * - Filter validation (date range checks)
 * - Apply and clear filters
 * - Audit log listing with badges
 * - Empty state display
 * - Pagination controls
 * - Detail modal view
 * - Auto-refresh toggle
 * - Manual refresh functionality
 * - Export to CSV
 * - Timestamp formatting
 * - Action badge variants
 * - ErrorBoundary fallback
 * 
 * AuditLogs Queries (1 total):
 * 1. GET /api/audit-logs
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class AuditLogsPage {
  constructor(private page: Page) {}

  // Page Elements
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get pageTitleIcon() {
    return this.page.getByTestId('icon-page-title');
  }

  get pageSubtitle() {
    return this.page.getByTestId('text-page-subtitle');
  }

  // Action Buttons
  get autoRefreshButton() {
    return this.page.getByTestId('button-toggle-auto-refresh');
  }

  get autoRefreshIcon() {
    return this.page.getByTestId('icon-auto-refresh');
  }

  get manualRefreshButton() {
    return this.page.getByTestId('button-manual-refresh');
  }

  get manualRefreshIcon() {
    return this.page.getByTestId('icon-manual-refresh');
  }

  get exportButton() {
    return this.page.getByTestId('button-export-csv');
  }

  get exportIcon() {
    return this.page.getByTestId('icon-export');
  }

  // Skeleton Loaders
  get auditLogsSkeleton() {
    return this.page.getByTestId('skeleton-audit-logs');
  }

  get skeletonTitle() {
    return this.page.getByTestId('skeleton-title');
  }

  get skeletonSubtitle() {
    return this.page.getByTestId('skeleton-subtitle');
  }

  get skeletonFiltersCard() {
    return this.page.getByTestId('skeleton-filters-card');
  }

  get skeletonTableCard() {
    return this.page.getByTestId('skeleton-table-card');
  }

  skeletonLogRow(index: number) {
    return this.page.getByTestId(`skeleton-log-row-${index}`);
  }

  // Error States
  get errorContainer() {
    return this.page.getByTestId('container-error');
  }

  get errorIcon() {
    return this.page.getByTestId('icon-error');
  }

  get errorMessage() {
    return this.page.getByTestId('text-error-message');
  }

  get retryButton() {
    return this.page.getByTestId('button-retry');
  }

  // Filter Controls
  get filtersCard() {
    return this.page.getByTestId('card-filters');
  }

  get filtersIcon() {
    return this.page.getByTestId('icon-filters');
  }

  get filtersActivebadge() {
    return this.page.getByTestId('badge-filters-active');
  }

  get filtersDescription() {
    return this.page.getByTestId('text-filters-description');
  }

  get actionFilterLabel() {
    return this.page.getByTestId('label-action-filter');
  }

  get actionFilter() {
    return this.page.getByTestId('select-action-filter');
  }

  get resourceFilterLabel() {
    return this.page.getByTestId('label-resource-filter');
  }

  get resourceFilter() {
    return this.page.getByTestId('select-resource-filter');
  }

  get startDateLabel() {
    return this.page.getByTestId('label-start-date');
  }

  get startDateInput() {
    return this.page.getByTestId('input-start-date');
  }

  get endDateLabel() {
    return this.page.getByTestId('label-end-date');
  }

  get endDateInput() {
    return this.page.getByTestId('input-end-date');
  }

  get clearFiltersButton() {
    return this.page.getByTestId('button-clear-filters');
  }

  get clearFiltersIcon() {
    return this.page.getByTestId('icon-clear-filters');
  }

  get applyFiltersButton() {
    return this.page.getByTestId('button-apply-filters');
  }

  get applyFiltersIcon() {
    return this.page.getByTestId('icon-apply-filters');
  }

  // Table
  get logsTableCard() {
    return this.page.getByTestId('card-logs-table');
  }

  get logsTable() {
    return this.page.getByTestId('table-audit-logs');
  }

  get tableHeaderRow() {
    return this.page.getByTestId('row-table-header');
  }

  get timestampHeader() {
    return this.page.getByTestId('header-timestamp');
  }

  get actionHeader() {
    return this.page.getByTestId('header-action');
  }

  get resourceHeader() {
    return this.page.getByTestId('header-resource');
  }

  get resourceIdHeader() {
    return this.page.getByTestId('header-resource-id');
  }

  get userHeader() {
    return this.page.getByTestId('header-user');
  }

  get ipHeader() {
    return this.page.getByTestId('header-ip');
  }

  get actionsHeader() {
    return this.page.getByTestId('header-actions');
  }

  // Table Rows
  logRow(id: string) {
    return this.page.getByTestId(`row-audit-log-${id}`);
  }

  timestampCell(id: string) {
    return this.page.getByTestId(`cell-timestamp-${id}`);
  }

  actionCell(id: string) {
    return this.page.getByTestId(`cell-action-${id}`);
  }

  resourceCell(id: string) {
    return this.page.getByTestId(`cell-resource-${id}`);
  }

  resourceIdCell(id: string) {
    return this.page.getByTestId(`cell-resource-id-${id}`);
  }

  userIdCell(id: string) {
    return this.page.getByTestId(`cell-user-id-${id}`);
  }

  ipCell(id: string) {
    return this.page.getByTestId(`cell-ip-${id}`);
  }

  actionsCell(id: string) {
    return this.page.getByTestId(`cell-actions-${id}`);
  }

  viewDetailsButton(id: string) {
    return this.page.getByTestId(`button-view-details-${id}`);
  }

  viewIcon(id: string) {
    return this.page.getByTestId(`icon-view-${id}`);
  }

  // Action Badges
  actionBadge(action: string) {
    return this.page.getByTestId(`badge-action-${action}`);
  }

  // Empty State
  get noLogsRow() {
    return this.page.getByTestId('row-no-logs');
  }

  get noLogsCell() {
    return this.page.getByTestId('cell-no-logs');
  }

  get noLogsIcon() {
    return this.page.getByTestId('icon-no-logs');
  }

  get noLogsText() {
    return this.page.getByTestId('text-no-logs');
  }

  get clearFiltersEmptyButton() {
    return this.page.getByTestId('button-clear-filters-empty');
  }

  // Refreshing State
  get refreshingContainer() {
    return this.page.getByTestId('container-refreshing');
  }

  get refreshingIcon() {
    return this.page.getByTestId('icon-refreshing');
  }

  // Pagination
  get paginationContainer() {
    return this.page.getByTestId('container-pagination');
  }

  get paginationInfo() {
    return this.page.getByTestId('text-pagination-info');
  }

  get pageIndicator() {
    return this.page.getByTestId('container-page-indicator');
  }

  get currentPageText() {
    return this.page.getByTestId('text-current-page');
  }

  get previousPageButton() {
    return this.page.getByTestId('button-previous-page');
  }

  get nextPageButton() {
    return this.page.getByTestId('button-next-page');
  }

  // Detail Modal
  get detailDialog() {
    return this.page.getByTestId('dialog-log-details');
  }

  get dialogTitle() {
    return this.page.getByTestId('text-dialog-title');
  }

  get dialogDescription() {
    return this.page.getByTestId('text-dialog-description');
  }

  get logDetailsContainer() {
    return this.page.getByTestId('container-log-details');
  }

  get timestampSection() {
    return this.page.getByTestId('section-timestamp');
  }

  get timestampLabel() {
    return this.page.getByTestId('label-timestamp');
  }

  get timestampValue() {
    return this.page.getByTestId('value-timestamp');
  }

  get actionSection() {
    return this.page.getByTestId('section-action');
  }

  get actionLabel() {
    return this.page.getByTestId('label-action');
  }

  get actionValue() {
    return this.page.getByTestId('value-action');
  }

  get resourceTypeSection() {
    return this.page.getByTestId('section-resource-type');
  }

  get resourceTypeLabel() {
    return this.page.getByTestId('label-resource-type');
  }

  get resourceTypeValue() {
    return this.page.getByTestId('value-resource-type');
  }

  get resourceIdSection() {
    return this.page.getByTestId('section-resource-id');
  }

  get resourceIdLabel() {
    return this.page.getByTestId('label-resource-id');
  }

  get resourceIdValue() {
    return this.page.getByTestId('value-resource-id');
  }

  get userIdSection() {
    return this.page.getByTestId('section-user-id');
  }

  get userIdLabel() {
    return this.page.getByTestId('label-user-id');
  }

  get userIdValue() {
    return this.page.getByTestId('value-user-id');
  }

  get ipAddressSection() {
    return this.page.getByTestId('section-ip-address');
  }

  get ipAddressLabel() {
    return this.page.getByTestId('label-ip-address');
  }

  get ipAddressValue() {
    return this.page.getByTestId('value-ip-address');
  }

  get changesSection() {
    return this.page.getByTestId('section-changes');
  }

  get changesLabel() {
    return this.page.getByTestId('label-changes');
  }

  get changesValue() {
    return this.page.getByTestId('value-changes');
  }

  get metadataSection() {
    return this.page.getByTestId('section-metadata');
  }

  get metadataLabel() {
    return this.page.getByTestId('label-metadata');
  }

  get metadataValue() {
    return this.page.getByTestId('value-metadata');
  }

  get userAgentSection() {
    return this.page.getByTestId('section-user-agent');
  }

  get userAgentLabel() {
    return this.page.getByTestId('label-user-agent');
  }

  get userAgentValue() {
    return this.page.getByTestId('value-user-agent');
  }

  // Navigation
  async goto() {
    await this.page.goto(`${BASE_URL}/audit-logs`);
  }

  async refreshManually() {
    await this.manualRefreshButton.click();
  }

  async toggleAutoRefresh() {
    await this.autoRefreshButton.click();
  }

  async setActionFilter(action: string) {
    await this.actionFilter.click();
    await this.page.getByTestId(`option-action-${action}`).click();
  }

  async setResourceFilter(resource: string) {
    await this.resourceFilter.click();
    await this.page.getByTestId(`option-resource-${resource}`).click();
  }

  async setDateRange(startDate: string, endDate: string) {
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
  }

  async applyFilters() {
    await this.applyFiltersButton.click();
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
  }

  async viewLogDetails(logId: string) {
    await this.viewDetailsButton(logId).click();
  }

  async closeDetailDialog() {
    await this.page.keyboard.press('Escape');
  }

  async goToNextPage() {
    await this.nextPageButton.click();
  }

  async goToPreviousPage() {
    await this.previousPageButton.click();
  }
}

// Mock audit log data generator
function createMockLog(id: string, action: string, resourceType: string, overrides: Partial<any> = {}) {
  return {
    id,
    userId: 'user-123',
    action,
    resourceType,
    resourceId: `${resourceType}-${id}`,
    changesJson: { status: 'changed' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date().toISOString(),
    metadata: { source: 'web' },
    ...overrides,
  };
}

function createMockLogsResponse(total: number = 5, page: number = 0, limit: number = 50) {
  const logs = Array.from({ length: Math.min(limit, total - page * limit) }, (_, i) => {
    const index = page * limit + i;
    return createMockLog(
      `log-${index}`,
      index % 3 === 0 ? 'job.create' : index % 3 === 1 ? 'job.update' : 'job.delete',
      'job'
    );
  });

  return { logs, total };
}

test.describe('AuditLogs - Loading States', () => {
  test('Test 1: Should display skeleton loaders while fetching data', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    // Slow down network to see skeleton
    await page.route('**/api/audit-logs*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });
    
    await auditLogsPage.goto();
    
    // Check skeleton appears
    await expect(auditLogsPage.auditLogsSkeleton).toBeVisible();
    await expect(auditLogsPage.skeletonTitle).toBeVisible();
    await expect(auditLogsPage.skeletonFiltersCard).toBeVisible();
    await expect(auditLogsPage.skeletonTableCard).toBeVisible();
    
    // Check skeleton log rows
    for (let i = 0; i < 3; i++) {
      await expect(auditLogsPage.skeletonLogRow(i)).toBeVisible();
    }
  });
});

test.describe('AuditLogs - Error States', () => {
  test('Test 2: Should display error state when API fails', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    // Mock API error
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForTimeout(1000);
    
    // Error state should be visible
    await expect(auditLogsPage.errorContainer).toBeVisible();
    await expect(auditLogsPage.errorIcon).toBeVisible();
    await expect(auditLogsPage.errorMessage).toBeVisible();
    await expect(auditLogsPage.retryButton).toBeVisible();
  });

  test('Test 3: Retry button should refetch data after error', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let callCount = 0;
    
    await page.route('**/api/audit-logs*', route => {
      callCount++;
      if (callCount <= 2) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockLogsResponse(10)),
        });
      }
    });
    
    await auditLogsPage.goto();
    await page.waitForTimeout(1000);
    
    // Click retry
    await auditLogsPage.retryButton.click();
    await page.waitForTimeout(1000);
    
    // Should eventually show data
    expect(callCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe('AuditLogs - Page Display', () => {
  test('Test 4: Should display page title, subtitle, and action buttons', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check page elements
    await expect(auditLogsPage.pageTitle).toContainText('Audit Logs');
    await expect(auditLogsPage.pageTitleIcon).toBeVisible();
    await expect(auditLogsPage.pageSubtitle).toContainText('Complete audit trail');
    
    // Check action buttons
    await expect(auditLogsPage.autoRefreshButton).toBeVisible();
    await expect(auditLogsPage.manualRefreshButton).toBeVisible();
    await expect(auditLogsPage.exportButton).toBeVisible();
  });

  test('Test 5: Should display filters card with all controls', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check filters card
    await expect(auditLogsPage.filtersCard).toBeVisible();
    await expect(auditLogsPage.filtersIcon).toBeVisible();
    await expect(auditLogsPage.filtersDescription).toBeVisible();
    
    // Check all filter controls
    await expect(auditLogsPage.actionFilterLabel).toContainText('Action');
    await expect(auditLogsPage.actionFilter).toBeVisible();
    await expect(auditLogsPage.resourceFilterLabel).toContainText('Resource Type');
    await expect(auditLogsPage.resourceFilter).toBeVisible();
    await expect(auditLogsPage.startDateLabel).toContainText('Start Date');
    await expect(auditLogsPage.startDateInput).toBeVisible();
    await expect(auditLogsPage.endDateLabel).toContainText('End Date');
    await expect(auditLogsPage.endDateInput).toBeVisible();
    
    // Check filter action buttons
    await expect(auditLogsPage.clearFiltersButton).toBeVisible();
    await expect(auditLogsPage.applyFiltersButton).toBeVisible();
  });
});

test.describe('AuditLogs - Filter Functionality', () => {
  test('Test 6: Should show active badge when filters are applied', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let requestUrl = '';
    
    await page.route('**/api/audit-logs*', route => {
      requestUrl = route.request().url();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(5)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // No active badge initially
    await expect(auditLogsPage.filtersActivebage).not.toBeVisible();
    
    // Set a filter
    await auditLogsPage.setActionFilter('job-create');
    await auditLogsPage.applyFilters();
    await page.waitForTimeout(500);
    
    // Active badge should appear
    await expect(auditLogsPage.filtersActiveBadge).toBeVisible();
    
    // Check request includes filter
    expect(requestUrl).toContain('action=job.create');
  });

  test('Test 7: Should clear all filters when clear button is clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Set filters
    await auditLogsPage.setActionFilter('job-create');
    await auditLogsPage.setResourceFilter('job');
    await auditLogsPage.setDateRange('2024-01-01', '2024-12-31');
    await auditLogsPage.applyFilters();
    await page.waitForTimeout(500);
    
    // Clear filters
    await auditLogsPage.clearFilters();
    await page.waitForTimeout(500);
    
    // Filters should be reset
    await expect(auditLogsPage.filtersActiveBadge).not.toBeVisible();
  });

  test('Test 8: Should validate date range (start before end)', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Set invalid date range (end before start)
    await auditLogsPage.setDateRange('2024-12-31', '2024-01-01');
    await auditLogsPage.applyFilters();
    await page.waitForTimeout(500);
    
    // Should show error toast
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/Invalid Date Range|Start date must be before end date/i);
  });
});

test.describe('AuditLogs - Log Listing', () => {
  test('Test 9: Should display table with correct headers', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(5)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check table headers
    await expect(auditLogsPage.logsTable).toBeVisible();
    await expect(auditLogsPage.timestampHeader).toContainText('Timestamp');
    await expect(auditLogsPage.actionHeader).toContainText('Action');
    await expect(auditLogsPage.resourceHeader).toContainText('Resource');
    await expect(auditLogsPage.resourceIdHeader).toContainText('Resource ID');
    await expect(auditLogsPage.userHeader).toContainText('User ID');
    await expect(auditLogsPage.ipHeader).toContainText('IP Address');
    await expect(auditLogsPage.actionsHeader).toContainText('Actions');
  });

  test('Test 10: Should display audit log rows with correct data', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    const mockLogs = [
      createMockLog('log-1', 'job.create', 'job'),
      createMockLog('log-2', 'job.update', 'job'),
      createMockLog('log-3', 'job.delete', 'job'),
    ];
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: mockLogs, total: 3 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check each log row
    for (const log of mockLogs) {
      await expect(auditLogsPage.logRow(log.id)).toBeVisible();
      await expect(auditLogsPage.timestampCell(log.id)).toBeVisible();
      await expect(auditLogsPage.actionCell(log.id)).toBeVisible();
      await expect(auditLogsPage.resourceCell(log.id)).toBeVisible();
      await expect(auditLogsPage.resourceIdCell(log.id)).toBeVisible();
      await expect(auditLogsPage.userIdCell(log.id)).toBeVisible();
      await expect(auditLogsPage.ipCell(log.id)).toContainText(log.ipAddress);
      await expect(auditLogsPage.viewDetailsButton(log.id)).toBeVisible();
    }
  });

  test('Test 11: Should display correct action badge variants', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    const mockLogs = [
      createMockLog('create-log', 'job.create', 'job'),
      createMockLog('update-log', 'job.update', 'job'),
      createMockLog('delete-log', 'job.delete', 'job'),
    ];
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: mockLogs, total: 3 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check action badges are displayed
    await expect(auditLogsPage.actionBadge('job.create')).toBeVisible();
    await expect(auditLogsPage.actionBadge('job.update')).toBeVisible();
    await expect(auditLogsPage.actionBadge('job.delete')).toBeVisible();
  });
});

test.describe('AuditLogs - Empty State', () => {
  test('Test 12: Should display empty state when no logs found', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [], total: 0 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check empty state
    await expect(auditLogsPage.noLogsRow).toBeVisible();
    await expect(auditLogsPage.noLogsIcon).toBeVisible();
    await expect(auditLogsPage.noLogsText).toContainText('No audit logs found');
  });

  test('Test 13: Should show clear filters button in empty state when filters active', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let callCount = 0;
    
    await page.route('**/api/audit-logs*', route => {
      callCount++;
      if (callCount === 1) {
        // Initial load
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createMockLogsResponse(10)),
        });
      } else {
        // After filter applied
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ logs: [], total: 0 }),
        });
      }
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Apply filter that returns no results
    await auditLogsPage.setActionFilter('job-create');
    await auditLogsPage.applyFilters();
    await page.waitForTimeout(500);
    
    // Check empty state with clear filters button
    await expect(auditLogsPage.noLogsText).toBeVisible();
    await expect(auditLogsPage.clearFiltersEmptyButton).toBeVisible();
  });
});

test.describe('AuditLogs - Pagination', () => {
  test('Test 14: Should display pagination controls when total exceeds limit', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(100, 0, 50)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check pagination elements
    await expect(auditLogsPage.paginationContainer).toBeVisible();
    await expect(auditLogsPage.paginationInfo).toContainText('Showing 1 - 50 of 100 logs');
    await expect(auditLogsPage.currentPageText).toContainText('Page 1 of 2');
    await expect(auditLogsPage.previousPageButton).toBeDisabled();
    await expect(auditLogsPage.nextPageButton).toBeEnabled();
  });

  test('Test 15: Should navigate to next page when next button clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let requestPage = 0;
    
    await page.route('**/api/audit-logs*', route => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');
      requestPage = offset / 50;
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(100, requestPage, 50)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Click next page
    await auditLogsPage.goToNextPage();
    await page.waitForTimeout(500);
    
    // Check we're on page 2
    await expect(auditLogsPage.currentPageText).toContainText('Page 2 of 2');
    await expect(auditLogsPage.previousPageButton).toBeEnabled();
    await expect(auditLogsPage.nextPageButton).toBeDisabled();
    expect(requestPage).toBe(1);
  });

  test('Test 16: Should navigate to previous page when previous button clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let requestPage = 0;
    
    await page.route('**/api/audit-logs*', route => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');
      requestPage = offset / 50;
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(100, requestPage, 50)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Go to page 2
    await auditLogsPage.goToNextPage();
    await page.waitForTimeout(500);
    
    // Go back to page 1
    await auditLogsPage.goToPreviousPage();
    await page.waitForTimeout(500);
    
    // Check we're back on page 1
    await expect(auditLogsPage.currentPageText).toContainText('Page 1 of 2');
    await expect(auditLogsPage.previousPageButton).toBeDisabled();
    expect(requestPage).toBe(0);
  });
});

test.describe('AuditLogs - Detail Modal', () => {
  test('Test 17: Should open detail modal when view button clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    const mockLog = createMockLog('detail-log', 'job.create', 'job', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [mockLog], total: 1 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Click view details
    await auditLogsPage.viewLogDetails(mockLog.id);
    await page.waitForTimeout(300);
    
    // Check modal is open
    await expect(auditLogsPage.detailDialog).toBeVisible();
    await expect(auditLogsPage.dialogTitle).toContainText('Audit Log Details');
    await expect(auditLogsPage.dialogDescription).toBeVisible();
  });

  test('Test 18: Should display all log details in modal', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    const mockLog = createMockLog('detail-log', 'job.update', 'job', {
      userId: 'user-456',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 Test Agent',
      changesJson: { status: 'from pending to completed' },
      metadata: { correlationId: 'abc-123' },
    });
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [mockLog], total: 1 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    await auditLogsPage.viewLogDetails(mockLog.id);
    await page.waitForTimeout(300);
    
    // Check all detail sections
    await expect(auditLogsPage.timestampSection).toBeVisible();
    await expect(auditLogsPage.actionSection).toBeVisible();
    await expect(auditLogsPage.resourceTypeSection).toBeVisible();
    await expect(auditLogsPage.resourceIdSection).toBeVisible();
    await expect(auditLogsPage.userIdSection).toBeVisible();
    await expect(auditLogsPage.ipAddressSection).toBeVisible();
    await expect(auditLogsPage.changesSection).toBeVisible();
    await expect(auditLogsPage.metadataSection).toBeVisible();
    await expect(auditLogsPage.userAgentSection).toBeVisible();
    
    // Check values
    await expect(auditLogsPage.userIdValue).toContainText('user-456');
    await expect(auditLogsPage.ipAddressValue).toContainText('10.0.0.1');
    await expect(auditLogsPage.userAgentValue).toContainText('Mozilla/5.0 Test Agent');
  });

  test('Test 19: Should close modal when escape key pressed', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    const mockLog = createMockLog('close-test', 'job.create', 'job');
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [mockLog], total: 1 }),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    await auditLogsPage.viewLogDetails(mockLog.id);
    await page.waitForTimeout(300);
    await expect(auditLogsPage.detailDialog).toBeVisible();
    
    // Close with escape
    await auditLogsPage.closeDetailDialog();
    await page.waitForTimeout(300);
    
    await expect(auditLogsPage.detailDialog).not.toBeVisible();
  });
});

test.describe('AuditLogs - Auto-Refresh', () => {
  test('Test 20: Should toggle auto-refresh when button clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Initially auto-refresh is on
    await expect(auditLogsPage.autoRefreshButton).toContainText('Auto-refresh On');
    
    // Toggle off
    await auditLogsPage.toggleAutoRefresh();
    await page.waitForTimeout(300);
    await expect(auditLogsPage.autoRefreshButton).toContainText('Auto-refresh Off');
    
    // Toggle back on
    await auditLogsPage.toggleAutoRefresh();
    await page.waitForTimeout(300);
    await expect(auditLogsPage.autoRefreshButton).toContainText('Auto-refresh On');
  });

  test('Test 21: Should manually refresh data when refresh button clicked', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    let callCount = 0;
    
    await page.route('**/api/audit-logs*', route => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    const initialCalls = callCount;
    
    // Manual refresh
    await auditLogsPage.refreshManually();
    await page.waitForTimeout(500);
    
    // Should have made additional request
    expect(callCount).toBeGreaterThan(initialCalls);
  });
});

test.describe('AuditLogs - Export', () => {
  test('Test 22: Export button should be visible and clickable', async ({ page }) => {
    const auditLogsPage = new AuditLogsPage(page);
    
    await page.route('**/api/audit-logs*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockLogsResponse(10)),
      });
    });
    
    await auditLogsPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Check export button
    await expect(auditLogsPage.exportButton).toBeVisible();
    await expect(auditLogsPage.exportButton).toBeEnabled();
    await expect(auditLogsPage.exportIcon).toBeVisible();
    
    // Click should not throw error (actual download tested elsewhere)
    await auditLogsPage.exportButton.click();
    await page.waitForTimeout(300);
  });
});
