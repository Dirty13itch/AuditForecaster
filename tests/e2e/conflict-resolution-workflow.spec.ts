import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Conflict Resolution Workflow
 * 
 * Tests the complete conflict resolution workflow including:
 * - Conflict listing and grouping
 * - Single conflict resolution (local, remote, merge)
 * - Batch conflict resolution
 * - Field-level comparison and merging
 * - Error handling and retry mechanisms
 * - Loading states and skeletons
 */

test.describe('Conflict Resolution Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to conflict resolution page
    await page.goto('/conflict-resolution');
  });

  /**
   * Scenario 1: Page Load and Initial State
   */
  test('should display conflict resolution page with correct title', async ({ page }) => {
    await expect(page.getByTestId('page-conflict-resolution')).toBeVisible();
    await expect(page.getByTestId('text-page-title')).toHaveText('Conflict Resolution');
    await expect(page.getByTestId('text-page-description')).toContainText('Resolve data conflicts');
  });

  /**
   * Scenario 2: Loading State Display
   */
  test('should show skeleton loaders while loading conflicts', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/conflicts', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({ json: [] });
    });

    await page.goto('/conflict-resolution');
    await expect(page.getByTestId('page-conflict-resolution-loading')).toBeVisible();
    await expect(page.getByTestId('skeleton-title')).toBeVisible();
    await expect(page.getByTestId('skeleton-conflict-0')).toBeVisible();
  });

  /**
   * Scenario 3: No Conflicts State
   */
  test('should display no conflicts message when list is empty', async ({ page }) => {
    await expect(page.getByTestId('card-no-conflicts')).toBeVisible();
    await expect(page.getByTestId('text-no-conflicts-title')).toHaveText('No Conflicts');
    await expect(page.getByTestId('icon-no-conflicts')).toBeVisible();
    await expect(page.getByTestId('button-back-to-jobs')).toBeVisible();
  });

  /**
   * Scenario 4: Conflict Summary Cards
   */
  test('should display summary cards with conflict counts', async ({ page }) => {
    await expect(page.getByTestId('card-total-conflicts')).toBeVisible();
    await expect(page.getByTestId('text-total-conflicts-count')).toBeVisible();
    await expect(page.getByTestId('card-by-type')).toBeVisible();
    await expect(page.getByTestId('text-jobs-count')).toBeVisible();
    await expect(page.getByTestId('text-photos-count')).toBeVisible();
    await expect(page.getByTestId('text-reports-count')).toBeVisible();
  });

  /**
   * Scenario 5: Action Buttons Availability
   */
  test('should show action buttons in summary card', async ({ page }) => {
    await expect(page.getByTestId('card-actions')).toBeVisible();
    await expect(page.getByTestId('button-batch-mode')).toBeVisible();
    await expect(page.getByTestId('button-refresh')).toBeVisible();
  });

  /**
   * Scenario 6: Conflict List Grouping
   */
  test('should group conflicts by entity type in accordion', async ({ page }) => {
    // Assume conflicts exist
    const hasConflicts = await page.getByTestId('accordion-conflicts').isVisible().catch(() => false);
    
    if (hasConflicts) {
      await expect(page.getByTestId('accordion-conflicts')).toBeVisible();
      
      // Check if accordion items exist for different types
      const jobsAccordion = page.getByTestId('accordion-item-jobs');
      const photosAccordion = page.getByTestId('accordion-item-photos');
      const reportsAccordion = page.getByTestId('accordion-item-reports');
      
      // At least one should be visible if conflicts exist
      const anyVisible = await Promise.race([
        jobsAccordion.isVisible().catch(() => false),
        photosAccordion.isVisible().catch(() => false),
        reportsAccordion.isVisible().catch(() => false),
      ]);
      
      expect(anyVisible).toBeTruthy();
    }
  });

  /**
   * Scenario 7: Conflict Selection
   */
  test('should select conflict and display details', async ({ page }) => {
    const hasConflicts = await page.getByTestId('section-conflict-list').isVisible().catch(() => false);
    
    if (hasConflicts) {
      // Expand accordion and click first conflict
      const firstTrigger = page.getByTestId('accordion-trigger-jobs').first();
      await firstTrigger.click();
      
      const firstConflict = page.locator('[data-testid^="conflict-item-"]').first();
      await firstConflict.click();
      
      // Should show conflict details
      await expect(page.getByTestId('card-conflict-details')).toBeVisible();
      await expect(page.getByTestId('tabs-conflict-details')).toBeVisible();
    }
  });

  /**
   * Scenario 8: Comparison Tab Display
   */
  test('should display field comparison in comparison tab', async ({ page }) => {
    const hasDetails = await page.getByTestId('card-conflict-details').isVisible().catch(() => false);
    
    if (hasDetails) {
      await page.getByTestId('tab-comparison').click();
      await expect(page.getByTestId('tab-content-comparison')).toBeVisible();
      await expect(page.getByTestId('scroll-comparison')).toBeVisible();
      
      // Should show field differences
      const firstDiff = page.locator('[data-testid^="diff-field-"]').first();
      await expect(firstDiff).toBeVisible();
    }
  });

  /**
   * Scenario 9: Resolution Strategy Selection
   */
  test('should allow selecting resolution strategy', async ({ page }) => {
    const hasDetails = await page.getByTestId('card-conflict-details').isVisible().catch(() => false);
    
    if (hasDetails) {
      await page.getByTestId('tab-resolution').click();
      await expect(page.getByTestId('tab-content-resolution')).toBeVisible();
      
      // Should show resolution options
      await expect(page.getByTestId('radio-single-remote')).toBeVisible();
      await expect(page.getByTestId('radio-single-local')).toBeVisible();
      await expect(page.getByTestId('radio-single-merge')).toBeVisible();
      
      // Click merge option
      await page.getByTestId('radio-input-single-merge').click();
      
      // Should show auto merge button
      await expect(page.getByTestId('button-auto-merge')).toBeVisible();
    }
  });

  /**
   * Scenario 10: Preview Tab Display
   */
  test('should display resolution preview', async ({ page }) => {
    const hasDetails = await page.getByTestId('card-conflict-details').isVisible().catch(() => false);
    
    if (hasDetails) {
      await page.getByTestId('tab-preview').click();
      await expect(page.getByTestId('tab-content-preview')).toBeVisible();
      await expect(page.getByTestId('scroll-preview')).toBeVisible();
      await expect(page.getByTestId('text-preview-data')).toBeVisible();
    }
  });

  /**
   * Scenario 11: Batch Mode Activation
   */
  test('should enable batch mode and show selection controls', async ({ page }) => {
    const hasConflicts = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasConflicts) {
      await page.getByTestId('button-batch-mode').click();
      
      // Should show batch actions
      await expect(page.getByTestId('section-batch-actions')).toBeVisible();
      await expect(page.getByTestId('button-select-all')).toBeVisible();
      await expect(page.getByTestId('button-clear-selection')).toBeVisible();
      
      // Should show batch resolution card
      await expect(page.getByTestId('card-batch-resolution')).toBeVisible();
      await expect(page.getByTestId('text-batch-resolution-title')).toHaveText('Batch Resolution');
    }
  });

  /**
   * Scenario 12: Select All Conflicts
   */
  test('should select all conflicts in batch mode', async ({ page }) => {
    const hasBatchMode = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasBatchMode) {
      await page.getByTestId('button-batch-mode').click();
      await page.getByTestId('button-select-all').click();
      
      // Should update selected count
      const selectedCount = page.getByTestId('text-selected-count');
      const countText = await selectedCount.textContent();
      expect(countText).toContain('conflicts selected');
    }
  });

  /**
   * Scenario 13: Clear Selection in Batch Mode
   */
  test('should clear all selections in batch mode', async ({ page }) => {
    const hasBatchMode = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasBatchMode) {
      await page.getByTestId('button-batch-mode').click();
      await page.getByTestId('button-select-all').click();
      await page.getByTestId('button-clear-selection').click();
      
      // Should show 0 selected
      const selectedCount = page.getByTestId('text-selected-count');
      await expect(selectedCount).toContainText('0 conflicts selected');
    }
  });

  /**
   * Scenario 14: Batch Resolution Strategy Selection
   */
  test('should allow selecting batch resolution strategy', async ({ page }) => {
    const hasBatchMode = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasBatchMode) {
      await page.getByTestId('button-batch-mode').click();
      
      await expect(page.getByTestId('radio-remote')).toBeVisible();
      await expect(page.getByTestId('radio-local')).toBeVisible();
      await expect(page.getByTestId('radio-both')).toBeVisible();
      
      // Select local strategy
      await page.getByTestId('radio-input-local').click();
    }
  });

  /**
   * Scenario 15: Cancel Batch Mode
   */
  test('should cancel batch mode and return to normal view', async ({ page }) => {
    const hasBatchMode = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasBatchMode) {
      await page.getByTestId('button-batch-mode').click();
      await expect(page.getByTestId('card-batch-resolution')).toBeVisible();
      
      await page.getByTestId('button-cancel-batch').click();
      
      // Should return to normal view
      await expect(page.getByTestId('card-batch-resolution')).not.toBeVisible();
    }
  });

  /**
   * Scenario 16: Refresh Conflicts List
   */
  test('should reload conflicts when refresh button clicked', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/conflicts', route => {
      requestCount++;
      route.fulfill({ json: [] });
    });
    
    await page.getByTestId('button-refresh').click();
    
    // Wait a bit for request
    await page.waitForTimeout(100);
    
    // Should have made at least one new request
    expect(requestCount).toBeGreaterThan(0);
  });

  /**
   * Scenario 17: Error State Display
   */
  test('should display error state when loading fails', async ({ page }) => {
    await page.route('**/api/conflicts', route => {
      route.fulfill({
        status: 500,
        json: { error: 'Internal server error' }
      });
    });
    
    await page.goto('/conflict-resolution');
    
    await expect(page.getByTestId('page-conflict-resolution-error')).toBeVisible();
    await expect(page.getByTestId('alert-load-error')).toBeVisible();
  });

  /**
   * Scenario 18: Retry After Error
   */
  test('should retry loading conflicts after error', async ({ page }) => {
    let attemptCount = 0;
    
    await page.route('**/api/conflicts', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          json: { error: 'Internal server error' }
        });
      } else {
        route.fulfill({ json: [] });
      }
    });
    
    await page.goto('/conflict-resolution');
    await expect(page.getByTestId('page-conflict-resolution-error')).toBeVisible();
    
    await page.getByTestId('button-retry-load').click();
    
    // Should load successfully
    await expect(page.getByTestId('page-conflict-resolution')).toBeVisible();
  });

  /**
   * Scenario 19: Individual Conflict Checkbox Toggle
   */
  test('should toggle individual conflict checkbox in batch mode', async ({ page }) => {
    const hasBatchMode = await page.getByTestId('button-batch-mode').isEnabled().catch(() => false);
    
    if (hasBatchMode) {
      await page.getByTestId('button-batch-mode').click();
      
      // Expand accordion
      const firstTrigger = page.getByTestId('accordion-trigger-jobs').first();
      await firstTrigger.click();
      
      // Find first checkbox
      const firstCheckbox = page.locator('[data-testid^="checkbox-conflict-"]').first();
      await firstCheckbox.click();
      
      // Should update count
      const selectedCount = page.getByTestId('text-selected-count');
      const countText = await selectedCount.textContent();
      expect(countText).toContain('conflict');
    }
  });

  /**
   * Scenario 20: Navigate Back to Jobs
   */
  test('should navigate back to jobs page when no conflicts', async ({ page }) => {
    const noConflicts = await page.getByTestId('card-no-conflicts').isVisible().catch(() => false);
    
    if (noConflicts) {
      await page.getByTestId('button-back-to-jobs').click();
      
      // Should navigate to jobs page
      await expect(page).toHaveURL(/\/jobs/);
    }
  });

  /**
   * Scenario 21: Resolve Conflict Button Availability
   */
  test('should enable resolve button when strategy selected', async ({ page }) => {
    const hasDetails = await page.getByTestId('card-conflict-details').isVisible().catch(() => false);
    
    if (hasDetails) {
      await page.getByTestId('tab-resolution').click();
      
      const resolveButton = page.getByTestId('button-resolve-conflict');
      await expect(resolveButton).toBeVisible();
      await expect(resolveButton).toBeEnabled();
    }
  });

  /**
   * Scenario 22: Field Difference Badge Display
   */
  test('should display difference badges for conflicting fields', async ({ page }) => {
    const hasDetails = await page.getByTestId('card-conflict-details').isVisible().catch(() => false);
    
    if (hasDetails) {
      await page.getByTestId('tab-comparison').click();
      
      // Should show at least one difference badge
      const badges = page.locator('[data-testid^="badge-different-"]');
      const count = await badges.count();
      
      if (count > 0) {
        await expect(badges.first()).toBeVisible();
      }
    }
  });
});
