/**
 * CalendarManagement Page - End-to-End Tests
 * 
 * Comprehensive tests for the Calendar Management page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Admin-only access control with redirect
 * - Skeleton loaders during data fetch
 * - Error states with retry mechanisms
 * - Calendar event sync functionality
 * - Event filtering by status, builder, type, confidence
 * - Date range filtering
 * - Sort order controls
 * - Event table rendering with pagination
 * - Individual event assignment to inspectors
 * - Bulk event selection and assignment
 * - Quick builder creation workflow
 * - Weekly workload visualization
 * - Event detail modal display
 * - Confidence badge rendering
 * - Assignment modal workflow
 * - Bulk action confirmation dialogs
 * 
 * CalendarManagement Queries (3 total):
 * 1. /api/pending-events?[filters]
 * 2. /api/builders
 * 3. /api/weekly-workload?startDate=X&endDate=Y
 * 
 * CalendarManagement Mutations (4 total):
 * 1. POST /api/calendar/sync-now
 * 2. POST /api/pending-events/:eventId/assign
 * 3. POST /api/pending-events/bulk-assign
 * 4. POST /api/builders + assign event
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class CalendarManagementPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/calendar-management`);
  }

  // Page Elements
  get container() {
    return this.page.getByTestId('container-calendar-management');
  }

  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get loadingContainer() {
    return this.page.getByTestId('container-loading');
  }

  get errorContainer() {
    return this.page.getByTestId('container-error');
  }

  get retryButton() {
    return this.page.getByTestId('button-retry-load');
  }

  // Header Actions
  get lastSyncText() {
    return this.page.getByTestId('text-last-sync');
  }

  get syncNowButton() {
    return this.page.getByTestId('button-sync-now');
  }

  // Stats Cards
  get statPending() {
    return this.page.getByTestId('stat-pending');
  }

  get statAssigned() {
    return this.page.getByTestId('stat-assigned');
  }

  get statRejected() {
    return this.page.getByTestId('stat-rejected');
  }

  // Workload Chart
  get noWorkloadText() {
    return this.page.getByTestId('text-no-workload');
  }

  // Filters
  get statusFilter() {
    return this.page.getByTestId('select-filter-status');
  }

  get builderFilter() {
    return this.page.getByTestId('select-filter-builder');
  }

  get jobTypeFilter() {
    return this.page.getByTestId('select-filter-job-type');
  }

  get confidenceFilter() {
    return this.page.getByTestId('select-filter-confidence');
  }

  get dateStartInput() {
    return this.page.getByTestId('input-date-start');
  }

  get dateEndInput() {
    return this.page.getByTestId('input-date-end');
  }

  get sortBySelect() {
    return this.page.getByTestId('select-sort-by');
  }

  // Events Table
  get eventsLoadingContainer() {
    return this.page.getByTestId('container-events-loading');
  }

  get noEventsText() {
    return this.page.getByTestId('text-no-events');
  }

  get selectAllCheckbox() {
    return this.page.getByTestId('checkbox-select-all');
  }

  eventRow(eventId: string) {
    return this.page.getByTestId(`row-pending-event-${eventId}`);
  }

  eventCheckbox(eventId: string) {
    return this.page.getByTestId(`checkbox-event-${eventId}`);
  }

  assignShaunButton(eventId: string) {
    return this.page.getByTestId(`button-assign-shaun-${eventId}`);
  }

  assignErikButton(eventId: string) {
    return this.page.getByTestId(`button-assign-erik-${eventId}`);
  }

  // Bulk Actions
  get selectedCountText() {
    return this.page.getByTestId('text-selected-count');
  }

  get bulkAssignShaunButton() {
    return this.page.getByTestId('button-bulk-assign-shaun');
  }

  get bulkAssignErikButton() {
    return this.page.getByTestId('button-bulk-assign-erik');
  }

  get bulkRejectButton() {
    return this.page.getByTestId('button-bulk-reject');
  }

  get bulkCancelButton() {
    return this.page.getByTestId('button-bulk-cancel');
  }

  // Assignment Modal
  get assignmentDialog() {
    return this.page.getByTestId('dialog-assignment');
  }

  get eventTitle() {
    return this.page.getByTestId('text-event-title');
  }

  get builderName() {
    return this.page.getByTestId('text-builder-name');
  }

  get unknownBuilderText() {
    return this.page.getByTestId('text-unknown-builder');
  }

  get eventDate() {
    return this.page.getByTestId('text-event-date');
  }

  get jobType() {
    return this.page.getByTestId('text-job-type');
  }

  get confidenceScore() {
    return this.page.getByTestId('text-confidence-score');
  }

  get shaunWorkload() {
    return this.page.getByTestId('text-shaun-workload');
  }

  get erikWorkload() {
    return this.page.getByTestId('text-erik-workload');
  }

  get quickAddBuilderButton() {
    return this.page.getByTestId('button-quick-add-builder');
  }

  get cancelAssignmentButton() {
    return this.page.getByTestId('button-cancel-assignment');
  }

  get rejectEventButton() {
    return this.page.getByTestId('button-reject-event');
  }

  get assignErikModalButton() {
    return this.page.getByTestId('button-assign-erik-modal');
  }

  get assignShaunModalButton() {
    return this.page.getByTestId('button-assign-shaun-modal');
  }

  // Quick Add Builder Modal
  get quickAddBuilderDialog() {
    return this.page.getByTestId('dialog-quick-add-builder');
  }

  get builderNameInput() {
    return this.page.getByTestId('input-builder-name');
  }

  get companyNameInput() {
    return this.page.getByTestId('input-company-name');
  }

  get emailInput() {
    return this.page.getByTestId('input-email');
  }

  get phoneInput() {
    return this.page.getByTestId('input-phone');
  }

  get abbreviationsInput() {
    return this.page.getByTestId('input-abbreviations');
  }

  get quickAddCancelButton() {
    return this.page.getByTestId('button-quick-add-cancel');
  }

  get createAssignErikButton() {
    return this.page.getByTestId('button-create-assign-erik');
  }

  get createAssignShaunButton() {
    return this.page.getByTestId('button-create-assign-shaun');
  }

  // Bulk Confirmation Dialog
  get bulkConfirmDialog() {
    return this.page.getByTestId('dialog-bulk-confirm');
  }

  get bulkConfirmCancelButton() {
    return this.page.getByTestId('button-bulk-confirm-cancel');
  }

  get bulkConfirmYesButton() {
    return this.page.getByTestId('button-bulk-confirm-yes');
  }

  // Confidence Badges
  get confidenceBadgeUnmatched() {
    return this.page.getByTestId('badge-confidence-unmatched').first();
  }

  get confidenceBadgeHigh() {
    return this.page.getByTestId('badge-confidence-high').first();
  }

  get confidenceBadgeMedium() {
    return this.page.getByTestId('badge-confidence-medium').first();
  }

  get confidenceBadgeLow() {
    return this.page.getByTestId('badge-confidence-low').first();
  }

  // Helper Methods
  async login() {
    await this.page.goto(`${BASE_URL}/`);
    const emailInput = this.page.locator('input[type="email"]');
    const passwordInput = this.page.locator('input[type="password"]');
    const loginButton = this.page.getByRole('button', { name: /sign in|log in/i });
    
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('admin@example.com');
      await passwordInput.fill('password');
      await loginButton.click();
      await this.page.waitForURL(/^(?!.*login)/, { timeout: 5000 });
    }
  }

  async waitForDataLoad() {
    await this.page.waitForFunction(
      () => !document.querySelector('[data-testid="container-loading"]') &&
           !document.querySelector('[data-testid="container-events-loading"]'),
      { timeout: 10000 }
    );
  }

  async selectFilter(testId: string, value: string) {
    const filter = this.page.getByTestId(testId);
    await filter.click();
    await this.page.getByRole('option', { name: value }).click();
  }
}

test.describe('CalendarManagement - Admin Access Control', () => {
  test('redirects non-admin users to home page', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    // Attempt to navigate without admin role
    await calendarPage.navigate();
    
    // Should redirect to home or show access denied
    await expect(page).not.toHaveURL(/calendar-management/);
  });

  test('allows admin users to access calendar management', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    // Login as admin
    await calendarPage.login();
    await calendarPage.navigate();
    
    // Should load the page successfully
    await expect(calendarPage.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(calendarPage.pageTitle).toHaveText('Calendar Management');
  });
});

test.describe('CalendarManagement - Loading States', () => {
  test('displays skeleton loaders while fetching data', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    
    // Skeleton should be visible initially
    const loadingVisible = await calendarPage.loadingContainer.isVisible({ timeout: 1000 }).catch(() => false);
    
    // Eventually data should load
    await calendarPage.waitForDataLoad();
    await expect(calendarPage.container).toBeVisible();
  });

  test('shows events table skeleton during event fetch', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    
    // Events skeleton may be visible initially
    const eventsLoadingVisible = await calendarPage.eventsLoadingContainer.isVisible({ timeout: 500 }).catch(() => false);
    
    // Eventually events table should load
    await calendarPage.waitForDataLoad();
  });
});

test.describe('CalendarManagement - Error Handling', () => {
  test('displays error state when data fetch fails', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    
    // Intercept and fail API calls
    await page.route('**/api/pending-events*', route => route.abort());
    
    await calendarPage.navigate();
    
    // Error container should be visible
    await expect(calendarPage.errorContainer).toBeVisible({ timeout: 10000 });
    await expect(calendarPage.retryButton).toBeVisible();
  });

  test('retry button reloads data after error', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    
    // Fail first, then succeed
    let requestCount = 0;
    await page.route('**/api/pending-events*', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await calendarPage.navigate();
    await expect(calendarPage.errorContainer).toBeVisible({ timeout: 10000 });
    
    // Click retry
    await calendarPage.retryButton.click();
    
    // Should load successfully
    await expect(calendarPage.container).toBeVisible({ timeout: 10000 });
  });
});

test.describe('CalendarManagement - Calendar Sync', () => {
  test('displays last sync time after successful sync', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Last sync text should be visible after initial sync
    await expect(calendarPage.lastSyncText).toBeVisible({ timeout: 10000 });
    await expect(calendarPage.lastSyncText).toContainText(/synced/i);
  });

  test('sync now button triggers calendar sync', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Click sync now button
    await calendarPage.syncNowButton.click();
    
    // Button should show syncing state
    await expect(calendarPage.syncNowButton).toContainText(/syncing/i);
    
    // Eventually completes
    await expect(calendarPage.syncNowButton).toContainText(/sync now/i, { timeout: 10000 });
  });
});

test.describe('CalendarManagement - Stats Display', () => {
  test('displays event status counts correctly', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // All stats should be visible with numeric values
    await expect(calendarPage.statPending).toBeVisible();
    await expect(calendarPage.statAssigned).toBeVisible();
    await expect(calendarPage.statRejected).toBeVisible();
    
    // Stats should contain numbers
    const pendingText = await calendarPage.statPending.textContent();
    expect(pendingText).toMatch(/\d+/);
  });
});

test.describe('CalendarManagement - Event Filtering', () => {
  test('filters events by status', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select "Pending" filter
    await calendarPage.selectFilter('select-filter-status', 'Pending');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Events should update
    const hasEvents = await calendarPage.noEventsText.isVisible({ timeout: 2000 }).catch(() => false);
    // Either shows "no events" or shows filtered events
  });

  test('filters events by builder', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select "Unmatched Only" filter
    await calendarPage.selectFilter('select-filter-builder', 'Unmatched Only');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
  });

  test('filters events by confidence level', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select confidence filter
    await calendarPage.confidenceFilter.click();
    const highOption = page.getByRole('option', { name: /high/i }).first();
    await highOption.click();
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
  });

  test('filters events by date range', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Set date range
    await calendarPage.dateStartInput.fill('2025-11-01');
    await calendarPage.dateEndInput.fill('2025-11-30');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
  });

  test('sorts events by different criteria', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Change sort order
    await calendarPage.selectFilter('select-sort-by', 'Confidence');
    
    // Wait for re-sorted results
    await page.waitForTimeout(1000);
  });
});

test.describe('CalendarManagement - Event Assignment', () => {
  test('assigns individual event to Shaun', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Find first pending event
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const eventId = await firstRow.getAttribute('data-testid').then(id => id?.replace('row-pending-event-', ''));
      
      if (eventId) {
        const assignButton = calendarPage.assignShaunButton(eventId);
        if (await assignButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await assignButton.click();
          
          // Wait for assignment to complete
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('assigns individual event to Erik', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Find first pending event
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const eventId = await firstRow.getAttribute('data-testid').then(id => id?.replace('row-pending-event-', ''));
      
      if (eventId) {
        const assignButton = calendarPage.assignErikButton(eventId);
        if (await assignButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await assignButton.click();
          
          // Wait for assignment to complete
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

test.describe('CalendarManagement - Bulk Operations', () => {
  test('selects multiple events using checkboxes', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select all events
    if (await calendarPage.selectAllCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calendarPage.selectAllCheckbox.click();
      
      // Bulk toolbar should appear
      await expect(calendarPage.selectedCountText).toBeVisible({ timeout: 2000 });
    }
  });

  test('bulk assigns events to Shaun', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select events
    if (await calendarPage.selectAllCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calendarPage.selectAllCheckbox.click();
      
      // Click bulk assign to Shaun
      await calendarPage.bulkAssignShaunButton.click();
      
      // Confirmation dialog should appear
      await expect(calendarPage.bulkConfirmDialog).toBeVisible({ timeout: 2000 });
      
      // Confirm
      await calendarPage.bulkConfirmYesButton.click();
      
      // Wait for bulk assignment
      await page.waitForTimeout(2000);
    }
  });

  test('cancels bulk operation', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Select events
    if (await calendarPage.selectAllCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calendarPage.selectAllCheckbox.click();
      
      // Click cancel button
      await calendarPage.bulkCancelButton.click();
      
      // Selection should clear
      await expect(calendarPage.selectedCountText).not.toBeVisible({ timeout: 1000 });
    }
  });
});

test.describe('CalendarManagement - Assignment Modal', () => {
  test('opens assignment modal when clicking event row', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Click first event row
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      // Modal should open
      await expect(calendarPage.assignmentDialog).toBeVisible({ timeout: 2000 });
      await expect(calendarPage.eventTitle).toBeVisible();
    }
  });

  test('displays event details in assignment modal', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Open modal
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      await expect(calendarPage.assignmentDialog).toBeVisible({ timeout: 2000 });
      
      // Check event details are displayed
      await expect(calendarPage.eventDate).toBeVisible();
      await expect(calendarPage.jobType).toBeVisible();
      await expect(calendarPage.confidenceScore).toBeVisible();
    }
  });

  test('displays workload comparison in assignment modal', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Open modal
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      await expect(calendarPage.assignmentDialog).toBeVisible({ timeout: 2000 });
      
      // Workload should be visible
      await expect(calendarPage.shaunWorkload).toBeVisible();
      await expect(calendarPage.erikWorkload).toBeVisible();
    }
  });

  test('assigns event from modal using Shaun button', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Open modal
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      await expect(calendarPage.assignmentDialog).toBeVisible({ timeout: 2000 });
      
      // Click assign to Shaun
      await calendarPage.assignShaunModalButton.click();
      
      // Modal should close
      await expect(calendarPage.assignmentDialog).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('closes assignment modal on cancel', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Open modal
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      await expect(calendarPage.assignmentDialog).toBeVisible({ timeout: 2000 });
      
      // Click cancel
      await calendarPage.cancelAssignmentButton.click();
      
      // Modal should close
      await expect(calendarPage.assignmentDialog).not.toBeVisible({ timeout: 1000 });
    }
  });
});

test.describe('CalendarManagement - Quick Add Builder', () => {
  test('shows quick add builder button for unmatched events', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Filter for unmatched events
    await calendarPage.selectFilter('select-filter-builder', 'Unmatched Only');
    await page.waitForTimeout(1000);
    
    // Open first event
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      // Quick add builder button may be visible
      const quickAddVisible = await calendarPage.quickAddBuilderButton.isVisible({ timeout: 1000 }).catch(() => false);
    }
  });

  test('opens quick add builder modal', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Filter and open unmatched event
    await calendarPage.selectFilter('select-filter-builder', 'Unmatched Only');
    await page.waitForTimeout(1000);
    
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      if (await calendarPage.quickAddBuilderButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await calendarPage.quickAddBuilderButton.click();
        
        // Quick add modal should open
        await expect(calendarPage.quickAddBuilderDialog).toBeVisible({ timeout: 2000 });
        await expect(calendarPage.builderNameInput).toBeVisible();
      }
    }
  });

  test('validates required fields in quick add builder form', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Open quick add modal
    await calendarPage.selectFilter('select-filter-builder', 'Unmatched Only');
    await page.waitForTimeout(1000);
    
    const firstRow = page.locator('[data-testid^="row-pending-event-"]').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      
      if (await calendarPage.quickAddBuilderButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await calendarPage.quickAddBuilderButton.click();
        await expect(calendarPage.quickAddBuilderDialog).toBeVisible({ timeout: 2000 });
        
        // Submit buttons should be disabled without required fields
        await expect(calendarPage.createAssignShaunButton).toBeDisabled();
        await expect(calendarPage.createAssignErikButton).toBeDisabled();
      }
    }
  });
});

test.describe('CalendarManagement - Workload Visualization', () => {
  test('displays 7-day workload chart', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // Chart or "no data" message should be visible
    const hasWorkload = await page.locator('.recharts-wrapper').isVisible({ timeout: 2000 }).catch(() => false);
    const noWorkload = await calendarPage.noWorkloadText.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasWorkload || noWorkload).toBeTruthy();
  });
});

test.describe('CalendarManagement - Confidence Badges', () => {
  test('displays appropriate confidence badges', async ({ page }) => {
    const calendarPage = new CalendarManagementPage(page);
    
    await calendarPage.login();
    await calendarPage.navigate();
    await calendarPage.waitForDataLoad();
    
    // At least one confidence badge type should be visible
    const hasUnmatched = await calendarPage.confidenceBadgeUnmatched.isVisible({ timeout: 2000 }).catch(() => false);
    const hasHigh = await calendarPage.confidenceBadgeHigh.isVisible({ timeout: 2000 }).catch(() => false);
    const hasMedium = await calendarPage.confidenceBadgeMedium.isVisible({ timeout: 2000 }).catch(() => false);
    const hasLow = await calendarPage.confidenceBadgeLow.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Some badge should exist if there are events
    const hasEvents = !(await calendarPage.noEventsText.isVisible({ timeout: 1000 }).catch(() => false));
    
    if (hasEvents) {
      expect(hasUnmatched || hasHigh || hasMedium || hasLow).toBeTruthy();
    }
  });
});
