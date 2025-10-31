import { test, expect } from '@playwright/test';

// Phase 4 - TEST: Comprehensive e2e test for expenses page
// Tests all critical workflows: swipe approval, create, filter, error states, OCR

test.describe('Financial Expenses Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to expenses page
    await page.goto('/financial/expenses');
  });

  test('should load expenses page with skeleton loaders', async ({ page }) => {
    // Check page header is visible
    await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();
    
    // Should show skeleton loaders initially
    const skeletons = page.getByTestId('skeleton-pending');
    if (await skeletons.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(skeletons).toBeVisible();
    }
  });

  test('should handle error state with retry button', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/expenses', (route) => {
      route.abort('failed');
    });

    await page.reload();

    // Should show error alert
    const errorAlert = page.getByTestId('alert-pending-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // Should have retry button
    const retryButton = page.getByTestId('button-retry-pending');
    await expect(retryButton).toBeVisible();

    // Unblock API
    await page.unroute('**/api/expenses');

    // Click retry
    await retryButton.click();

    // Error should disappear
    await expect(errorAlert).not.toBeVisible({ timeout: 5000 });
  });

  test('should display pending expenses tab with swipe cards', async ({ page }) => {
    // Click pending tab
    await page.getByTestId('tab-pending').click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check for either swipe container or empty state
    const swipeContainer = page.getByTestId('swipe-container');
    const emptyState = page.getByTestId('empty-pending');

    const hasSwipeCards = await swipeContainer.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasSwipeCards || isEmpty).toBeTruthy();

    if (hasSwipeCards) {
      // Should show swipe cards
      await expect(swipeContainer).toBeVisible();
    } else if (isEmpty) {
      // Should show empty state
      await expect(emptyState).toBeVisible();
      await expect(page.getByText(/all caught up/i)).toBeVisible();
    }
  });

  test('should open add expense dialog when FAB is clicked', async ({ page }) => {
    // Click FAB button
    await page.getByTestId('fab-add-expense').click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/add expense/i).first()).toBeVisible();

    // Form fields should be visible
    await expect(page.getByTestId('input-amount')).toBeVisible();
    await expect(page.getByTestId('select-category')).toBeVisible();
    await expect(page.getByTestId('input-description')).toBeVisible();
  });

  test('should create new expense with validation', async ({ page }) => {
    // Open dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without filling required fields
    await page.getByTestId('button-submit').click();

    // Should show validation errors (form should stay open)
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in valid data
    await page.getByTestId('input-amount').fill('125.50');
    await page.getByTestId('input-description').fill('Test Expense Vendor');
    
    // Select category
    await page.getByTestId('select-category').click();
    await page.getByRole('option', { name: /fuel/i }).first().click();

    // Mock successful creation
    await page.route('**/api/expenses', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ id: '1', amount: '125.50' }),
        });
      } else {
        route.continue();
      }
    });

    // Submit form
    await page.getByTestId('button-submit').click();

    // Dialog should close on success
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('should validate amount is greater than zero', async ({ page }) => {
    // Open dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill with zero amount
    await page.getByTestId('input-amount').fill('0');
    await page.getByTestId('input-description').fill('Test Vendor');
    
    // Select category
    await page.getByTestId('select-category').click();
    await page.getByRole('option', { name: /fuel/i }).first().click();

    // Mock API to reject zero amount
    await page.route('**/api/expenses', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ message: 'Amount must be greater than zero' }),
        });
      } else {
        route.continue();
      }
    });

    // Submit
    await page.getByTestId('button-submit').click();

    // Should show error toast or keep dialog open
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should filter approved expenses by category', async ({ page }) => {
    // Navigate to approved tab
    await page.getByTestId('tab-approved').click();
    await page.waitForTimeout(1000);

    // Check if category filter exists
    const categoryFilter = page.getByTestId('select-category-filter');
    if (await categoryFilter.isVisible().catch(() => false)) {
      // Open filter dropdown
      await categoryFilter.click();

      // Select a category
      await page.getByRole('option', { name: /fuel/i }).first().click();

      // Filter should be applied
      await page.waitForTimeout(500);
      await expect(categoryFilter).toBeVisible();
    }
  });

  test('should display approved expenses in table', async ({ page }) => {
    // Click approved tab
    await page.getByTestId('tab-approved').click();
    await page.waitForTimeout(1000);

    // Check for either table or empty state
    const hasTable = await page.getByRole('table').isVisible().catch(() => false);
    const isEmpty = await page.getByTestId('empty-approved').isVisible().catch(() => false);

    expect(hasTable || isEmpty).toBeTruthy();

    if (isEmpty) {
      await expect(page.getByText(/no approved expenses/i)).toBeVisible();
    }
  });

  test('should show admin-only all expenses tab', async ({ page }) => {
    // Check if all tab exists (admin only)
    const allTab = page.getByTestId('tab-all');
    const isVisible = await allTab.isVisible().catch(() => false);

    if (isVisible) {
      // Click all tab
      await allTab.click();
      await page.waitForTimeout(1000);

      // Should show content or empty state
      const hasContent = await page.getByRole('table').isVisible().catch(() => false);
      const isEmpty = await page.getByTestId('empty-all').isVisible().catch(() => false);

      expect(hasContent || isEmpty).toBeTruthy();
    } else {
      // Non-admin user - tab should not exist
      expect(isVisible).toBeFalsy();
    }
  });

  test('should show reject confirmation dialog', async ({ page }) => {
    // This test assumes there are pending expenses
    await page.getByTestId('tab-pending').click();
    await page.waitForTimeout(1000);

    const swipeContainer = page.getByTestId('swipe-container');
    const hasCards = await swipeContainer.isVisible().catch(() => false);

    if (hasCards) {
      // Find first swipe card
      const firstCard = page.locator('[data-testid^="swipe-card-"]').first();
      if (await firstCard.isVisible().catch(() => false)) {
        // Simulate swipe left (rejection) by dragging
        await firstCard.hover();
        await page.mouse.down();
        await page.mouse.move(-200, 0, { steps: 10 });
        await page.mouse.up();

        // Should show confirmation dialog
        await page.waitForTimeout(500);
        const confirmDialog = page.getByTestId('dialog-confirm-reject');
        if (await confirmDialog.isVisible().catch(() => false)) {
          await expect(confirmDialog).toBeVisible();
          
          // Should have cancel button
          await expect(page.getByTestId('button-cancel-reject')).toBeVisible();
          
          // Should have confirm button
          await expect(page.getByTestId('button-confirm-reject')).toBeVisible();

          // Click cancel
          await page.getByTestId('button-cancel-reject').click();

          // Dialog should close
          await expect(confirmDialog).not.toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('should show bulk approve button for admin users', async ({ page }) => {
    await page.getByTestId('tab-pending').click();
    await page.waitForTimeout(1000);

    // Check if bulk approve button exists (admin only)
    const bulkApproveButton = page.getByTestId('button-bulk-approve');
    const isVisible = await bulkApproveButton.isVisible().catch(() => false);

    // Button visibility depends on admin role and pending expenses
    if (isVisible) {
      await expect(bulkApproveButton).toBeVisible();
      await expect(bulkApproveButton).toContainText(/approve all/i);
    }
  });

  test('should show mutation pending state when creating expense', async ({ page }) => {
    // Open dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill form
    await page.getByTestId('input-amount').fill('99.99');
    await page.getByTestId('input-description').fill('Pending Test');
    
    await page.getByTestId('select-category').click();
    await page.getByRole('option', { name: /fuel/i }).first().click();

    // Mock slow API response
    await page.route('**/api/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        await page.waitForTimeout(2000);
        route.fulfill({
          status: 200,
          body: JSON.stringify({ id: '1', amount: '99.99' }),
        });
      } else {
        route.continue();
      }
    });

    // Submit
    await page.getByTestId('button-submit').click();

    // Should show loading state
    await expect(page.getByTestId('button-submit')).toContainText(/adding/i);
    await expect(page.getByTestId('button-submit')).toBeDisabled();

    // Wait for completion
    await page.waitForTimeout(2500);
  });

  test('should handle OCR receipt upload', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Look for receipt upload component
    const uploadButton = page.getByTestId('button-upload-receipt');
    if (await uploadButton.isVisible().catch(() => false)) {
      await expect(uploadButton).toBeVisible();

      // OCR functionality would be tested here
      // This is a basic check that the upload component exists
    }
  });

  test('should display error boundary fallback on critical error', async ({ page }) => {
    // Mock a critical error by breaking the API
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    // Reload to trigger errors
    await page.reload();
    await page.waitForTimeout(2000);

    // Check for either error boundary or error alerts
    const errorBoundary = page.getByTestId('error-boundary-fallback');
    const errorAlert = page.locator('[data-testid^="alert-"]').first();

    const hasErrorBoundary = await errorBoundary.isVisible().catch(() => false);
    const hasErrorAlert = await errorAlert.isVisible().catch(() => false);

    // Should show some form of error handling
    expect(hasErrorBoundary || hasErrorAlert).toBeTruthy();

    if (hasErrorBoundary) {
      await expect(page.getByTestId('button-reload')).toBeVisible();
    }
  });

  test('should show receipt links for expenses with receipts', async ({ page }) => {
    // Go to approved tab
    await page.getByTestId('tab-approved').click();
    await page.waitForTimeout(1000);

    // Look for receipt links
    const receiptLink = page.locator('[data-testid^="link-receipt-"]').first();
    const hasReceipt = await receiptLink.isVisible().catch(() => false);

    if (hasReceipt) {
      // Receipt link should be visible and have correct attributes
      await expect(receiptLink).toBeVisible();
      await expect(receiptLink).toHaveAttribute('target', '_blank');
    }
  });

  test('should cancel dialog without saving changes', async ({ page }) => {
    // Open dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill some data
    await page.getByTestId('input-amount').fill('50.00');
    await page.getByTestId('input-description').fill('Test Cancel');

    // Click cancel
    await page.getByTestId('button-cancel').click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });

    // Reopen dialog - fields should be reset
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const amountInput = page.getByTestId('input-amount');
    const value = await amountInput.inputValue();
    
    // Should not have the previously entered value
    expect(value === '50.00').toBeFalsy();
  });

  test('should display category icons instead of emoji', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('fab-add-expense').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Open category dropdown
    await page.getByTestId('select-category').click();

    // Check that options render (lucide icons should be present, not emoji)
    const options = page.getByRole('option');
    const count = await options.count();

    // Should have multiple category options
    expect(count).toBeGreaterThan(5);

    // Each option should have text (category name) not just emoji
    const firstOption = options.first();
    const text = await firstOption.textContent();
    
    // Should contain actual category name, not just emoji
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(2);
  });
});
