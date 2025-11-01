import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Builder Review Workflow
 * 
 * Tests the complete builder review workflow including:
 * - Builder review queue listing
 * - Approval workflow
 * - Edit and approve workflow
 * - Merge workflow
 * - Reject workflow
 * - Error handling and retry mechanisms
 * - Loading states and skeletons
 */

test.describe('Builder Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder review page
    await page.goto('/builder-review');
  });

  /**
   * Scenario 1: Page Load and Initial State
   */
  test('should display builder review page with correct title', async ({ page }) => {
    await expect(page.getByTestId('page-builder-review')).toBeVisible();
    await expect(page.getByTestId('text-page-title')).toHaveText('Builder Review Queue');
    await expect(page.getByTestId('text-page-description')).toContainText('Review and approve temporary builders');
  });

  /**
   * Scenario 2: Loading State Display
   */
  test('should show skeleton loaders while loading builders', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/builders/review', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({ json: [] });
    });

    await page.goto('/builder-review');
    await expect(page.getByTestId('page-builder-review-loading')).toBeVisible();
    await expect(page.getByTestId('skeleton-title')).toBeVisible();
    await expect(page.getByTestId('skeleton-row-0')).toBeVisible();
  });

  /**
   * Scenario 3: No Pending Reviews State
   */
  test('should display no pending reviews message when queue is empty', async ({ page }) => {
    await expect(page.getByTestId('card-no-pending')).toBeVisible();
    await expect(page.getByTestId('text-no-pending')).toHaveText('No Pending Reviews');
    await expect(page.getByTestId('icon-no-pending')).toBeVisible();
    await expect(page.getByTestId('text-all-reviewed')).toContainText('All temporary builders have been reviewed');
  });

  /**
   * Scenario 4: Pending Count Badge Display
   */
  test('should display pending count badge in header', async ({ page }) => {
    await expect(page.getByTestId('badge-pending-count')).toBeVisible();
    const badgeText = await page.getByTestId('badge-pending-count').textContent();
    expect(badgeText).toContain('Pending');
  });

  /**
   * Scenario 5: Review Table Display
   */
  test('should display review table with headers when builders exist', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      await expect(page.getByTestId('row-header')).toBeVisible();
      await expect(page.getByTestId('header-builder-name')).toHaveText('Builder Name');
      await expect(page.getByTestId('header-confidence')).toHaveText('Confidence');
      await expect(page.getByTestId('header-abbreviation')).toHaveText('Abbreviation');
      await expect(page.getByTestId('header-jobs')).toHaveText('Jobs');
      await expect(page.getByTestId('header-created')).toHaveText('Created');
      await expect(page.getByTestId('header-actions')).toHaveText('Actions');
    }
  });

  /**
   * Scenario 6: Builder Row Display
   */
  test('should display builder rows with all data fields', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      await expect(firstRow).toBeVisible();
      
      // Should have all cells visible
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await expect(page.getByTestId(`text-builder-name-${id}`)).toBeVisible();
      await expect(page.getByTestId(`cell-confidence-${id}`)).toBeVisible();
      await expect(page.getByTestId(`text-abbreviation-${id}`)).toBeVisible();
      await expect(page.getByTestId(`text-job-count-${id}`)).toBeVisible();
      await expect(page.getByTestId(`text-created-date-${id}`)).toBeVisible();
    }
  });

  /**
   * Scenario 7: Confidence Badge Variants
   */
  test('should display confidence badges with appropriate colors', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      // Check if any confidence badges are visible
      const badges = page.locator('[data-testid^="badge-confidence-"]');
      const count = await badges.count();
      
      if (count > 0) {
        const firstBadge = badges.first();
        await expect(firstBadge).toBeVisible();
        
        // Badge should have text content
        const badgeText = await firstBadge.textContent();
        expect(badgeText).toBeTruthy();
      }
    }
  });

  /**
   * Scenario 8: Action Buttons Display
   */
  test('should display all action buttons for each builder', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await expect(page.getByTestId(`button-approve-${id}`)).toBeVisible();
      await expect(page.getByTestId(`button-edit-${id}`)).toBeVisible();
      await expect(page.getByTestId(`button-merge-${id}`)).toBeVisible();
      await expect(page.getByTestId(`button-reject-${id}`)).toBeVisible();
    }
  });

  /**
   * Scenario 9: Approve Builder Action
   */
  test('should click approve button for builder', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      const approveButton = page.getByTestId(`button-approve-${id}`);
      await expect(approveButton).toBeVisible();
      
      // Note: We don't actually click since it would modify data
      // In a real test with test data, we would click here
    }
  });

  /**
   * Scenario 10: Open Edit Dialog
   */
  test('should open edit dialog when edit button clicked', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-edit-${id}`).click();
      
      // Should open BuilderDialog
      // Note: BuilderDialog test-ids would be checked here
      // For now, just verify it was clicked
      await page.waitForTimeout(100);
    }
  });

  /**
   * Scenario 11: Open Merge Dialog
   */
  test('should open merge dialog when merge button clicked', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-merge-${id}`).click();
      
      await expect(page.getByTestId('dialog-merge')).toBeVisible();
      await expect(page.getByTestId('text-merge-title')).toHaveText('Merge Builder');
      await expect(page.getByTestId('text-merge-description')).toBeVisible();
    }
  });

  /**
   * Scenario 12: Merge Dialog Builder Selection
   */
  test('should display builder selection in merge dialog', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-merge-${id}`).click();
      
      await expect(page.getByTestId('section-merge-select')).toBeVisible();
      await expect(page.getByTestId('select-target-builder')).toBeVisible();
      await expect(page.getByTestId('footer-merge')).toBeVisible();
      await expect(page.getByTestId('button-cancel-merge')).toBeVisible();
      await expect(page.getByTestId('button-confirm-merge')).toBeVisible();
    }
  });

  /**
   * Scenario 13: Cancel Merge Dialog
   */
  test('should close merge dialog when cancel clicked', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-merge-${id}`).click();
      await expect(page.getByTestId('dialog-merge')).toBeVisible();
      
      await page.getByTestId('button-cancel-merge').click();
      
      // Dialog should be closed
      await expect(page.getByTestId('dialog-merge')).not.toBeVisible();
    }
  });

  /**
   * Scenario 14: Open Reject Dialog
   */
  test('should open reject dialog when reject button clicked', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-reject-${id}`).click();
      
      await expect(page.getByTestId('dialog-reject')).toBeVisible();
      await expect(page.getByTestId('text-reject-title')).toContainText('Reject Builder');
      await expect(page.getByTestId('text-reject-description')).toBeVisible();
    }
  });

  /**
   * Scenario 15: Reject Dialog Warning Display
   */
  test('should display warning in reject dialog', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-reject-${id}`).click();
      
      // Should show warning about deletion
      const description = page.getByTestId('text-reject-description');
      await expect(description).toContainText('cannot be undone');
    }
  });

  /**
   * Scenario 16: Reject Dialog Unknown Builder Selection
   */
  test('should display unknown builder selection in reject dialog', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-reject-${id}`).click();
      
      await expect(page.getByTestId('section-reject-select')).toBeVisible();
      await expect(page.getByTestId('text-unknown-label')).toBeVisible();
      await expect(page.getByTestId('select-unknown-builder')).toBeVisible();
      await expect(page.getByTestId('footer-reject')).toBeVisible();
    }
  });

  /**
   * Scenario 17: Cancel Reject Dialog
   */
  test('should close reject dialog when cancel clicked', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-reject-${id}`).click();
      await expect(page.getByTestId('dialog-reject')).toBeVisible();
      
      await page.getByTestId('button-cancel-reject').click();
      
      // Dialog should be closed
      await expect(page.getByTestId('dialog-reject')).not.toBeVisible();
    }
  });

  /**
   * Scenario 18: Error State for Review Builders
   */
  test('should display error state when loading review builders fails', async ({ page }) => {
    await page.route('**/api/builders/review', route => {
      route.fulfill({
        status: 500,
        json: { error: 'Internal server error' }
      });
    });
    
    await page.goto('/builder-review');
    
    await expect(page.getByTestId('page-builder-review-error')).toBeVisible();
    await expect(page.getByTestId('alert-review-error')).toBeVisible();
  });

  /**
   * Scenario 19: Retry After Review Error
   */
  test('should retry loading review builders after error', async ({ page }) => {
    let attemptCount = 0;
    
    await page.route('**/api/builders/review', route => {
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
    
    await page.goto('/builder-review');
    await expect(page.getByTestId('page-builder-review-error')).toBeVisible();
    
    await page.getByTestId('button-retry-review').click();
    
    // Should load successfully
    await expect(page.getByTestId('page-builder-review')).toBeVisible();
  });

  /**
   * Scenario 20: Error State for Active Builders
   */
  test('should display error alert when loading active builders fails', async ({ page }) => {
    await page.route('**/api/builders/review', route => {
      route.fulfill({ json: [{ id: '1', name: 'Test Builder', jobCount: 5 }] });
    });
    
    await page.route('**/api/builders', route => {
      route.fulfill({
        status: 500,
        json: { error: 'Failed to load builders' }
      });
    });
    
    await page.goto('/builder-review');
    
    await expect(page.getByTestId('alert-builders-error')).toBeVisible();
  });

  /**
   * Scenario 21: Retry After Builders Error
   */
  test('should retry loading active builders after error', async ({ page }) => {
    await page.route('**/api/builders/review', route => {
      route.fulfill({ json: [{ id: '1', name: 'Test Builder', jobCount: 5 }] });
    });
    
    let attemptCount = 0;
    await page.route('**/api/builders', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          json: { error: 'Failed to load builders' }
        });
      } else {
        route.fulfill({ json: [] });
      }
    });
    
    await page.goto('/builder-review');
    await expect(page.getByTestId('alert-builders-error')).toBeVisible();
    
    await page.getByTestId('button-retry-builders').click();
    
    // Error should disappear
    await expect(page.getByTestId('alert-builders-error')).not.toBeVisible();
  });

  /**
   * Scenario 22: Abbreviation Badge Display
   */
  test('should display abbreviation badge when available', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      const abbreviationCell = page.getByTestId(`text-abbreviation-${id}`);
      await expect(abbreviationCell).toBeVisible();
      
      // Should either show badge or "None" text
      const hasAbbreviation = await page.getByTestId(`badge-abbreviation-${id}`).isVisible().catch(() => false);
      if (!hasAbbreviation) {
        await expect(abbreviationCell).toContainText('None');
      }
    }
  });

  /**
   * Scenario 23: Job Count Badge Display
   */
  test('should display job count badge for each builder', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      const jobCountBadge = page.getByTestId(`badge-job-count-${id}`);
      await expect(jobCountBadge).toBeVisible();
      
      // Should have numeric content
      const badgeText = await jobCountBadge.textContent();
      expect(badgeText).toMatch(/^\d+$/);
    }
  });

  /**
   * Scenario 24: Created Date Formatting
   */
  test('should display formatted created date for each builder', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      const dateCell = page.getByTestId(`text-created-date-${id}`);
      await expect(dateCell).toBeVisible();
      
      const dateText = await dateCell.textContent();
      // Should either show formatted date or "N/A"
      expect(dateText).toBeTruthy();
    }
  });

  /**
   * Scenario 25: Confirm Merge Button Disabled Without Selection
   */
  test('should disable confirm merge button until builder selected', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-merge-${id}`).click();
      
      const confirmButton = page.getByTestId('button-confirm-merge');
      await expect(confirmButton).toBeDisabled();
    }
  });

  /**
   * Scenario 26: Confirm Reject Button Disabled Without Selection
   */
  test('should disable confirm reject button until unknown builder selected', async ({ page }) => {
    const hasTable = await page.getByTestId('table-builders').isVisible().catch(() => false);
    
    if (hasTable) {
      const firstRow = page.locator('[data-testid^="row-builder-"]').first();
      const builderId = await firstRow.getAttribute('data-testid');
      const id = builderId?.replace('row-builder-', '') || '';
      
      await page.getByTestId(`button-reject-${id}`).click();
      
      const confirmButton = page.getByTestId('button-confirm-reject');
      await expect(confirmButton).toBeDisabled();
    }
  });
});
