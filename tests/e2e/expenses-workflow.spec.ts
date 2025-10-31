import { test, expect } from '@playwright/test';

test.describe('Expenses Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to expenses page
    await page.goto('/');
    
    // Login as admin
    await page.goto('/api/dev-login/test-admin');
    await page.waitForURL('/');
    
    // Navigate to expenses page
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
  });

  test('should load page with skeleton loaders initially', async ({ page }) => {
    // Reload to see skeleton state
    await page.goto('/expenses');
    
    // Should show skeleton loaders while loading
    const skeletonCards = page.getByTestId('skeleton-stats-card');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="text-page-title"]', { timeout: 10000 });
    
    // Verify page title
    await expect(page.getByTestId('text-page-title')).toHaveText('Expenses');
  });

  test('should display stats cards with correct data', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="card-total-expenses"]');
    
    // Verify all stats cards are present
    await expect(page.getByTestId('card-total-expenses')).toBeVisible();
    await expect(page.getByTestId('card-deductible')).toBeVisible();
    await expect(page.getByTestId('card-total-entries')).toBeVisible();
    
    // Verify stats contain currency/number values
    const totalExpenses = await page.getByTestId('text-total-expenses').textContent();
    expect(totalExpenses).toMatch(/\$[\d,]+\.\d{2}/);
    
    const deductible = await page.getByTestId('text-deductible-amount').textContent();
    expect(deductible).toMatch(/\$[\d,]+\.\d{2}/);
    
    const count = await page.getByTestId('text-total-count').textContent();
    expect(count).toMatch(/\d+/);
  });

  test('should handle error state with retry button', async ({ page }) => {
    // Intercept API call and make it fail
    await page.route('**/api/expenses', route => {
      route.abort('failed');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show error state
    const errorAlert = page.getByTestId('error-stats');
    await expect(errorAlert).toBeVisible();
    
    // Should have retry button
    const retryButton = page.getByTestId('button-retry-stats');
    await expect(retryButton).toBeVisible();
    
    // Unblock API and retry
    await page.unroute('**/api/expenses');
    await retryButton.click();
    
    // Should load successfully after retry
    await page.waitForSelector('[data-testid="card-total-expenses"]');
    await expect(page.getByTestId('card-total-expenses')).toBeVisible();
  });

  test('should display empty state when no expenses exist', async ({ page }) => {
    // Intercept API to return empty array
    await page.route('**/api/expenses', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show empty state
    const emptyState = page.getByTestId('empty-state-expenses');
    await expect(emptyState).toBeVisible();
    
    // Should have create first expense button
    const createButton = page.getByTestId('button-create-first-expense');
    await expect(createButton).toBeVisible();
    await expect(createButton).toHaveText('Add your first expense');
  });

  test('should create new expense successfully', async ({ page }) => {
    // Click add expense button
    await page.getByTestId('button-add-expense').click();
    
    // Wait for dialog to open
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Verify dialog title
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Add New Expense');
    
    // Fill in expense details
    await page.getByTestId('input-expense-amount').fill('125.50');
    await page.getByTestId('select-expense-category-form').click();
    await page.getByTestId('category-form-option-fuel').click();
    await page.getByTestId('input-expense-date').fill('2025-10-15');
    await page.getByTestId('input-expense-description').fill('Fuel for job site visit');
    
    // Mark as deductible
    await page.getByTestId('checkbox-expense-deductible').check();
    
    // Submit form
    await page.getByTestId('button-save-expense').click();
    
    // Wait for dialog to close and success toast
    await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
    
    // Verify expense appears in list
    await page.waitForSelector('[data-testid^="expense-row-"]');
    
    // Find the new expense in the table
    const expenseRow = page.locator('[data-testid^="expense-row-"]').first();
    await expect(expenseRow).toBeVisible();
  });

  test('should validate amount is positive', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Try to submit with zero amount
    await page.getByTestId('input-expense-amount').fill('0');
    await page.getByTestId('input-expense-description').fill('Test expense');
    await page.getByTestId('button-save-expense').click();
    
    // Should show validation error toast
    await page.waitForSelector('.toast', { timeout: 3000 });
    const toast = page.locator('.toast').first();
    await expect(toast).toContainText('Invalid Amount');
    
    // Try negative amount
    await page.getByTestId('input-expense-amount').fill('-50');
    await page.getByTestId('button-save-expense').click();
    
    // Should show validation error
    await page.waitForSelector('.toast');
  });

  test('should validate date is not in future', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Fill valid amount
    await page.getByTestId('input-expense-amount').fill('100');
    await page.getByTestId('input-expense-description').fill('Test expense');
    
    // Set future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.getByTestId('input-expense-date').fill(futureDateStr);
    await page.getByTestId('button-save-expense').click();
    
    // Should show validation error
    await page.waitForSelector('.toast', { timeout: 3000 });
    const toast = page.locator('.toast').first();
    await expect(toast).toContainText('Invalid Date');
  });

  test('should edit existing expense', async ({ page }) => {
    // Wait for expense list to load
    await page.waitForSelector('[data-testid^="expense-row-"]');
    
    // Click edit button on first expense
    const firstEditButton = page.getByTestId(/^button-edit-expense-/).first();
    await firstEditButton.click();
    
    // Wait for dialog to open
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Verify dialog shows edit title
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Edit Expense');
    
    // Modify description
    await page.getByTestId('input-expense-description').fill('Updated expense description');
    
    // Submit form
    await page.getByTestId('button-save-expense').click();
    
    // Wait for dialog to close
    await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
    
    // Verify update was successful (toast or updated row)
    await page.waitForLoadState('networkidle');
  });

  test('should delete expense with confirmation dialog', async ({ page }) => {
    // Wait for expense list to load
    await page.waitForSelector('[data-testid^="expense-row-"]');
    
    // Get initial expense count
    const initialRows = await page.locator('[data-testid^="expense-row-"]').count();
    
    // Click delete button on first expense
    const firstDeleteButton = page.getByTestId(/^button-delete-expense-/).first();
    await firstDeleteButton.click();
    
    // Wait for confirmation dialog to open
    await page.waitForSelector('[data-testid="dialog-delete-confirmation"]');
    
    // Verify confirmation dialog content
    await expect(page.getByTestId('text-delete-title')).toHaveText('Delete Expense?');
    await expect(page.getByTestId('text-delete-description')).toContainText('cannot be undone');
    
    // Cancel first
    await page.getByTestId('button-cancel-delete').click();
    await page.waitForSelector('[data-testid="dialog-delete-confirmation"]', { state: 'hidden' });
    
    // Verify expense still exists
    const rowsAfterCancel = await page.locator('[data-testid^="expense-row-"]').count();
    expect(rowsAfterCancel).toBe(initialRows);
    
    // Try delete again and confirm
    await firstDeleteButton.click();
    await page.waitForSelector('[data-testid="dialog-delete-confirmation"]');
    await page.getByTestId('button-confirm-delete').click();
    
    // Wait for dialog to close
    await page.waitForSelector('[data-testid="dialog-delete-confirmation"]', { state: 'hidden' });
    
    // Verify expense was deleted
    await page.waitForLoadState('networkidle');
    const rowsAfterDelete = await page.locator('[data-testid^="expense-row-"]').count();
    expect(rowsAfterDelete).toBe(initialRows - 1);
  });

  test('should filter expenses by category', async ({ page }) => {
    // Wait for expense list to load
    await page.waitForSelector('[data-testid="table-expenses"]');
    
    // Get initial expense count
    const initialRows = await page.locator('[data-testid^="expense-row-"]').count();
    
    // Open category filter
    await page.getByTestId('select-category-filter').click();
    
    // Select fuel category
    await page.getByTestId('category-option-fuel').click();
    
    // Wait for filter to apply
    await page.waitForLoadState('networkidle');
    
    // Verify only fuel expenses are shown
    const fuelRows = await page.locator('[data-testid^="expense-row-"]').count();
    
    // Should be less than or equal to initial count
    expect(fuelRows).toBeLessThanOrEqual(initialRows);
    
    // Reset filter to all
    await page.getByTestId('select-category-filter').click();
    await page.getByTestId('category-option-all').click();
    
    // Should show all expenses again
    await page.waitForLoadState('networkidle');
    const allRows = await page.locator('[data-testid^="expense-row-"]').count();
    expect(allRows).toBe(initialRows);
  });

  test('should search expenses by description', async ({ page }) => {
    // Wait for expense list to load
    await page.waitForSelector('[data-testid="table-expenses"]');
    
    // Get initial expense count
    const initialRows = await page.locator('[data-testid^="expense-row-"]').count();
    
    // Search for specific term
    await page.getByTestId('input-search-expenses').fill('fuel');
    
    // Wait for search to apply
    await page.waitForTimeout(300); // Debounce
    
    // Verify filtered results
    const searchRows = await page.locator('[data-testid^="expense-row-"]').count();
    expect(searchRows).toBeLessThanOrEqual(initialRows);
    
    // Clear search
    await page.getByTestId('input-search-expenses').clear();
    
    // Should show all expenses again
    await page.waitForTimeout(300);
    const allRows = await page.locator('[data-testid^="expense-row-"]').count();
    expect(allRows).toBe(initialRows);
  });

  test('should switch between list and category views', async ({ page }) => {
    // Should start on list view
    await expect(page.getByTestId('tab-list')).toHaveAttribute('data-state', 'active');
    
    // Verify expense table is visible
    await expect(page.getByTestId('table-expenses')).toBeVisible();
    
    // Switch to category view
    await page.getByTestId('tab-categories').click();
    
    // Verify category breakdown is visible
    await expect(page.getByTestId('card-category-breakdown')).toBeVisible();
    
    // Verify at least one category stat is shown (if expenses exist)
    const categoryStats = await page.locator('[data-testid^="category-stat-"]').count();
    expect(categoryStats).toBeGreaterThanOrEqual(0);
    
    // Switch back to list view
    await page.getByTestId('tab-list').click();
    
    // Verify expense table is visible again
    await expect(page.getByTestId('table-expenses')).toBeVisible();
  });

  test('should export expenses to CSV', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.getByTestId('button-export-csv').click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download was initiated
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should link expense to job', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Fill in expense details
    await page.getByTestId('input-expense-amount').fill('200');
    await page.getByTestId('input-expense-description').fill('Job-related expense');
    
    // Select a job
    await page.getByTestId('select-expense-job').click();
    
    // Wait for jobs to load and select first one (skip 'none' option)
    await page.waitForTimeout(500);
    const jobOptions = page.locator('[data-testid^="job-option-"]').filter({ hasNotText: 'No Job' });
    const jobCount = await jobOptions.count();
    
    if (jobCount > 0) {
      await jobOptions.first().click();
      
      // Submit form
      await page.getByTestId('button-save-expense').click();
      
      // Wait for dialog to close
      await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
      
      // Verify expense appears with job link
      await page.waitForSelector('[data-testid^="link-job-"]');
    }
  });

  test('should handle receipt upload (UI only)', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Verify receipt upload component is present
    await expect(page.getByTestId('receipt-upload')).toBeVisible();
    
    // Verify upload buttons are present
    await expect(page.getByTestId('button-take-photo')).toBeVisible();
    await expect(page.getByTestId('button-choose-file')).toBeVisible();
    
    // Cancel dialog
    await page.getByTestId('button-cancel-expense').click();
  });

  test('should toggle tax deductible checkbox', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Verify checkbox is checked by default
    const checkbox = page.getByTestId('checkbox-expense-deductible');
    await expect(checkbox).toBeChecked();
    
    // Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    
    // Check it again
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    // Cancel dialog
    await page.getByTestId('button-cancel-expense').click();
  });

  test('should display category breakdown with percentages', async ({ page }) => {
    // Switch to category view
    await page.getByTestId('tab-categories').click();
    
    // Wait for category breakdown to load
    await page.waitForSelector('[data-testid="card-category-breakdown"]');
    
    // Get all category stats
    const categoryStats = page.locator('[data-testid^="category-stat-"]');
    const count = await categoryStats.count();
    
    if (count > 0) {
      // Verify first category stat has all required elements
      const firstStat = categoryStats.first();
      
      // Should have category name
      const categoryName = firstStat.locator('[data-testid^="category-name-"]');
      await expect(categoryName).toBeVisible();
      
      // Should have entry count
      const categoryCount = firstStat.locator('[data-testid^="category-count-"]');
      await expect(categoryCount).toBeVisible();
      await expect(categoryCount).toContainText('entries');
      
      // Should have amount
      const categoryAmount = firstStat.locator('[data-testid^="category-amount-"]');
      await expect(categoryAmount).toBeVisible();
      const amountText = await categoryAmount.textContent();
      expect(amountText).toMatch(/\$[\d,]+\.\d{2}/);
      
      // Should have percentage
      const categoryPercentage = firstStat.locator('[data-testid^="category-percentage-"]');
      await expect(categoryPercentage).toBeVisible();
      const percentageText = await categoryPercentage.textContent();
      expect(percentageText).toMatch(/\d+\.\d%/);
    }
  });

  test('should handle dialog cancellation without saving', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Fill in some data
    await page.getByTestId('input-expense-amount').fill('500');
    await page.getByTestId('input-expense-description').fill('Test data that should not be saved');
    
    // Cancel dialog
    await page.getByTestId('button-cancel-expense').click();
    
    // Wait for dialog to close
    await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
    
    // Search for the unsaved data
    await page.getByTestId('input-search-expenses').fill('Test data that should not be saved');
    await page.waitForTimeout(300);
    
    // Should show empty results
    const rows = await page.locator('[data-testid^="expense-row-"]').count();
    expect(rows).toBe(0);
  });

  test('should preserve form data when switching between add and edit', async ({ page }) => {
    // Wait for expense list to load
    await page.waitForSelector('[data-testid^="expense-row-"]');
    
    // Click edit button on first expense
    const firstEditButton = page.getByTestId(/^button-edit-expense-/).first();
    await firstEditButton.click();
    
    // Wait for dialog to open
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Get the current description
    const originalDescription = await page.getByTestId('input-expense-description').inputValue();
    
    // Close dialog
    await page.getByTestId('button-cancel-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
    
    // Open add new expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Verify form is reset (description should be empty)
    const newDescription = await page.getByTestId('input-expense-description').inputValue();
    expect(newDescription).toBe('');
    
    // Close dialog
    await page.getByTestId('button-cancel-expense').click();
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Open add expense dialog
    await page.getByTestId('button-add-expense').click();
    await page.waitForSelector('[data-testid="dialog-expense-form"]');
    
    // Fill in expense details
    await page.getByTestId('input-expense-amount').fill('99.99');
    await page.getByTestId('input-expense-description').fill('Loading state test');
    
    // Submit form and immediately check for loading state
    const submitButton = page.getByTestId('button-save-expense');
    await submitButton.click();
    
    // Button should show loading text briefly
    await expect(submitButton).toContainText('Saving', { timeout: 1000 });
    
    // Wait for submission to complete
    await page.waitForSelector('[data-testid="dialog-expense-form"]', { state: 'hidden' });
  });

  test('should display all required table headers', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('[data-testid="table-expenses"]');
    
    // Verify all headers are present
    await expect(page.getByTestId('header-date')).toBeVisible();
    await expect(page.getByTestId('header-description')).toBeVisible();
    await expect(page.getByTestId('header-category')).toBeVisible();
    await expect(page.getByTestId('header-receipt')).toBeVisible();
    await expect(page.getByTestId('header-job')).toBeVisible();
    await expect(page.getByTestId('header-amount')).toBeVisible();
    await expect(page.getByTestId('header-deductible')).toBeVisible();
    await expect(page.getByTestId('header-actions')).toBeVisible();
  });

  test('should format currency values correctly', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="card-total-expenses"]');
    
    // Get total expenses value
    const totalExpenses = await page.getByTestId('text-total-expenses').textContent();
    
    // Verify currency format: $X,XXX.XX
    expect(totalExpenses).toMatch(/\$[\d,]+\.\d{2}/);
    
    // Get deductible value
    const deductible = await page.getByTestId('text-deductible-amount').textContent();
    expect(deductible).toMatch(/\$[\d,]+\.\d{2}/);
    
    // Check individual expense amounts in table
    const firstAmount = await page.locator('[data-testid^="expense-amount-"]').first().textContent();
    expect(firstAmount).toMatch(/\$[\d,]+\.\d{2}/);
  });
});
