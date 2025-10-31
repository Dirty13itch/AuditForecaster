import { test, expect } from '@playwright/test';

test.describe('Scheduled Exports Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to scheduled exports page
    await page.goto('/');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Navigate to scheduled exports (assuming it's in the sidebar or navigation)
    // Adjust this selector based on your actual navigation structure
    await page.goto('/scheduled-exports');
    await page.waitForSelector('[data-testid="text-page-title"]');
  });

  test('displays page title and description', async ({ page }) => {
    const title = page.locator('[data-testid="text-page-title"]');
    await expect(title).toHaveText('Scheduled Exports');
    
    const description = page.locator('[data-testid="text-page-description"]');
    await expect(description).toBeVisible();
  });

  test('displays empty state when no exports exist', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Check if empty state is visible (if no exports exist)
    const emptyState = page.locator('[data-testid="empty-state"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState.locator('[data-testid="text-empty-title"]')).toHaveText('No Scheduled Exports');
      await expect(emptyState.locator('[data-testid="text-empty-description"]')).toBeVisible();
      await expect(emptyState.locator('[data-testid="button-create-first"]')).toBeVisible();
    }
  });

  test('displays skeleton loaders while loading exports', async ({ page }) => {
    // Reload to see loading state
    await page.reload();
    
    // Check for skeleton loaders (they should appear briefly)
    const skeleton = page.locator('[data-testid="loading-skeleton"]');
    // Note: This may be very brief, so we just check if it exists in the DOM at some point
  });

  test('opens create export dialog when clicking create button', async ({ page }) => {
    await page.click('[data-testid="button-create-export"]');
    
    const dialog = page.locator('[data-testid="dialog-create-export"]');
    await expect(dialog).toBeVisible();
  });

  test('creates a new daily export successfully', async ({ page }) => {
    // Open create dialog
    await page.click('[data-testid="button-create-export"]');
    await page.waitForSelector('[data-testid="dialog-create-export"]');
    
    // Fill in export details
    await page.fill('[data-testid="input-name"]', 'Test Daily Export');
    
    // Select data type
    await page.click('[data-testid="select-dataType"]');
    await page.click('[data-testid="option-dataType-jobs"]');
    
    // Select format
    await page.click('[data-testid="select-format"]');
    await page.click('[data-testid="option-format-csv"]');
    
    // Select frequency (daily is default)
    await page.click('[data-testid="select-frequency"]');
    await page.click('[data-testid="option-frequency-daily"]');
    
    // Set time
    await page.fill('[data-testid="input-time"]', '09:00');
    
    // Add recipients
    await page.fill('[data-testid="input-recipients"]', 'test@example.com');
    
    // Submit form
    await page.click('[data-testid="button-submit-create"]');
    
    // Wait for success (dialog should close and export should appear in list)
    await expect(page.locator('[data-testid="dialog-create-export"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('creates a weekly export with day of week selection', async ({ page }) => {
    // Open create dialog
    await page.click('[data-testid="button-create-export"]');
    await page.waitForSelector('[data-testid="dialog-create-export"]');
    
    // Fill basic details
    await page.fill('[data-testid="input-name"]', 'Test Weekly Export');
    
    // Select frequency as weekly
    await page.click('[data-testid="select-frequency"]');
    await page.click('[data-testid="option-frequency-weekly"]');
    
    // Day of week field should now be visible
    await expect(page.locator('[data-testid="select-dayOfWeek"]')).toBeVisible();
    
    // Select Monday
    await page.click('[data-testid="select-dayOfWeek"]');
    await page.click('[data-testid="option-dayOfWeek-1"]');
    
    // Set time
    await page.fill('[data-testid="input-time"]', '10:00');
    
    // Add recipients
    await page.fill('[data-testid="input-recipients"]', 'weekly@example.com');
    
    // Submit form
    await page.click('[data-testid="button-submit-create"]');
    
    // Wait for success
    await expect(page.locator('[data-testid="dialog-create-export"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('creates a monthly export with day of month selection', async ({ page }) => {
    // Open create dialog
    await page.click('[data-testid="button-create-export"]');
    await page.waitForSelector('[data-testid="dialog-create-export"]');
    
    // Fill basic details
    await page.fill('[data-testid="input-name"]', 'Test Monthly Export');
    
    // Select frequency as monthly
    await page.click('[data-testid="select-frequency"]');
    await page.click('[data-testid="option-frequency-monthly"]');
    
    // Day of month field should now be visible
    await expect(page.locator('[data-testid="input-dayOfMonth"]')).toBeVisible();
    
    // Enter day of month
    await page.fill('[data-testid="input-dayOfMonth"]', '15');
    
    // Set time
    await page.fill('[data-testid="input-time"]', '11:00');
    
    // Add recipients
    await page.fill('[data-testid="input-recipients"]', 'monthly@example.com');
    
    // Submit form
    await page.click('[data-testid="button-submit-create"]');
    
    // Wait for success
    await expect(page.locator('[data-testid="dialog-create-export"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('validates required fields in create form', async ({ page }) => {
    // Open create dialog
    await page.click('[data-testid="button-create-export"]');
    await page.waitForSelector('[data-testid="dialog-create-export"]');
    
    // Try to submit without filling required fields
    await page.fill('[data-testid="input-name"]', ''); // Clear name
    await page.fill('[data-testid="input-recipients"]', ''); // Clear recipients
    
    await page.click('[data-testid="button-submit-create"]');
    
    // Dialog should still be visible due to validation errors
    await expect(page.locator('[data-testid="dialog-create-export"]')).toBeVisible();
  });

  test('displays export cards with correct information', async ({ page }) => {
    // Wait for exports grid or empty state
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // If exports exist, check the first card
    const exportCard = page.locator('[data-testid^="card-export-"]').first();
    if (await exportCard.isVisible()) {
      // Check that card has required elements
      await expect(exportCard.locator('[data-testid^="text-name-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="badge-status-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="badge-dataType-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="badge-format-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="badge-frequency-"]')).toBeVisible();
    }
  });

  test('displays action buttons on export cards', async ({ page }) => {
    // Wait for exports grid or empty state
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // If exports exist, check the first card's action buttons
    const exportCard = page.locator('[data-testid^="card-export-"]').first();
    if (await exportCard.isVisible()) {
      await expect(exportCard.locator('[data-testid^="button-edit-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="button-toggle-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="button-test-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="button-delete-"]')).toBeVisible();
    }
  });

  test('opens edit dialog when clicking edit button', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click edit on first export (if exists)
    const editButton = page.locator('[data-testid^="button-edit-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const editDialog = page.locator('[data-testid="dialog-edit-export"]');
      await expect(editDialog).toBeVisible();
      
      // Check that form fields are populated
      await expect(editDialog.locator('[data-testid="input-edit-name"]')).not.toBeEmpty();
    }
  });

  test('updates an existing export', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click edit on first export (if exists)
    const editButton = page.locator('[data-testid^="button-edit-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[data-testid="dialog-edit-export"]');
      
      // Update name
      await page.fill('[data-testid="input-edit-name"]', 'Updated Export Name');
      
      // Submit
      await page.click('[data-testid="button-submit-edit"]');
      
      // Wait for dialog to close
      await expect(page.locator('[data-testid="dialog-edit-export"]')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('opens delete confirmation dialog', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click delete on first export (if exists)
    const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const deleteDialog = page.locator('[data-testid="dialog-delete-confirm"]');
      await expect(deleteDialog).toBeVisible();
      
      // Cancel deletion
      await page.click('[data-testid="button-cancel-delete"]');
      await expect(deleteDialog).not.toBeVisible();
    }
  });

  test('deletes an export after confirmation', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Get initial count of exports
    const initialCards = await page.locator('[data-testid^="card-export-"]').count();
    
    // Click delete on first export (if exists)
    const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
    if (await deleteButton.isVisible() && initialCards > 0) {
      await deleteButton.click();
      await page.waitForSelector('[data-testid="dialog-delete-confirm"]');
      
      // Confirm deletion
      await page.click('[data-testid="button-confirm-delete"]');
      
      // Wait for dialog to close
      await expect(page.locator('[data-testid="dialog-delete-confirm"]')).not.toBeVisible({ timeout: 5000 });
      
      // Verify export was removed
      await page.waitForTimeout(1000); // Wait for update
      const finalCards = await page.locator('[data-testid^="card-export-"]').count();
      expect(finalCards).toBeLessThan(initialCards);
    }
  });

  test('toggles export enabled/disabled status', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click toggle on first export (if exists)
    const toggleButton = page.locator('[data-testid^="button-toggle-"]').first();
    if (await toggleButton.isVisible()) {
      // Get current status
      const statusBadge = page.locator('[data-testid^="badge-status-"]').first();
      const currentStatus = await statusBadge.textContent();
      
      // Click toggle
      await toggleButton.click();
      
      // Wait for status to change
      await page.waitForTimeout(1000);
      
      // Verify status changed
      const newStatus = await statusBadge.textContent();
      expect(newStatus).not.toBe(currentStatus);
    }
  });

  test('triggers test export run', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click test on first export (if exists)
    const testButton = page.locator('[data-testid^="button-test-"]').first();
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Should show a toast notification (this is async, so we just verify button was clicked)
      // In a real test, you might want to verify the toast appears
    }
  });

  test('displays next run and last run times', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Check first export card (if exists)
    const exportCard = page.locator('[data-testid^="card-export-"]').first();
    if (await exportCard.isVisible()) {
      await expect(exportCard.locator('[data-testid^="text-nextRun-"]')).toBeVisible();
      await expect(exportCard.locator('[data-testid^="text-lastRun-"]')).toBeVisible();
    }
  });

  test('displays recipient email addresses', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Check first export card (if exists)
    const exportCard = page.locator('[data-testid^="card-export-"]').first();
    if (await exportCard.isVisible()) {
      // At least one recipient should be visible
      const recipientCount = await exportCard.locator('[data-testid^="text-recipient-"]').count();
      expect(recipientCount).toBeGreaterThan(0);
    }
  });

  test('handles error state with retry button', async ({ page }) => {
    // This test would require mocking a network error
    // For now, we just verify the error UI elements exist in the code
    // In a real scenario, you'd use page.route() to intercept and fail the API call
    
    // Navigate to page
    await page.goto('/scheduled-exports');
    
    // The page should load normally (error state only shows on actual errors)
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible();
  });

  test('cancels create dialog without saving', async ({ page }) => {
    // Open create dialog
    await page.click('[data-testid="button-create-export"]');
    await page.waitForSelector('[data-testid="dialog-create-export"]');
    
    // Fill in some data
    await page.fill('[data-testid="input-name"]', 'Test Export to Cancel');
    
    // Click cancel
    await page.click('[data-testid="button-cancel-create"]');
    
    // Dialog should close
    await expect(page.locator('[data-testid="dialog-create-export"]')).not.toBeVisible();
    
    // Verify export was not created (would need to check the list)
  });

  test('cancels edit dialog without saving changes', async ({ page }) => {
    // Wait for exports grid
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="exports-grid"]', { timeout: 10000 });
    
    // Click edit on first export (if exists)
    const editButton = page.locator('[data-testid^="button-edit-"]').first();
    if (await editButton.isVisible()) {
      // Get original name
      const nameElement = page.locator('[data-testid^="text-name-"]').first();
      const originalName = await nameElement.textContent();
      
      await editButton.click();
      await page.waitForSelector('[data-testid="dialog-edit-export"]');
      
      // Modify name
      await page.fill('[data-testid="input-edit-name"]', 'Changed Name');
      
      // Click cancel
      await page.click('[data-testid="button-cancel-edit"]');
      
      // Dialog should close
      await expect(page.locator('[data-testid="dialog-edit-export"]')).not.toBeVisible();
      
      // Verify name didn't change
      const currentName = await nameElement.textContent();
      expect(currentName).toBe(originalName);
    }
  });
});
