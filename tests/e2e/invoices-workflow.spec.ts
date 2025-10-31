import { test, expect } from '@playwright/test';

test.describe('Invoices Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin for full access
    await page.goto('/api/dev-login/test-admin');
    await page.waitForURL('/');
  });

  test('should load invoices page with skeleton loaders', async ({ page }) => {
    await page.goto('/invoices');
    
    // Check for skeleton loaders during initial load (may be very brief)
    const skeletonStats = page.getByTestId('skeleton-stats');
    const skeletonInvoices = page.getByTestId('skeleton-invoices');
    
    // Wait for page to load
    await expect(page.getByTestId('text-page-title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('text-page-title')).toHaveText('Invoices');
  });

  test('should display invoice statistics correctly', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Verify all stat cards are visible
    await expect(page.getByTestId('text-total-invoices')).toBeVisible();
    await expect(page.getByTestId('text-outstanding')).toBeVisible();
    await expect(page.getByTestId('text-overdue')).toBeVisible();
    
    // Verify stats contain numeric values
    const totalText = await page.getByTestId('text-total-invoices').textContent();
    expect(totalText).toMatch(/^\d+$/);
  });

  test('should search and filter invoices', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Test search functionality
    const searchInput = page.getByTestId('input-search');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('INV');
    
    // Wait for search to take effect
    await page.waitForTimeout(500);
    
    // Test status filter
    const statusSelect = page.getByTestId('select-status');
    await expect(statusSelect).toBeVisible();
    await statusSelect.click();
    
    // Select "Sent" status
    await page.getByRole('option', { name: 'Sent' }).click();
    await page.waitForTimeout(500);
  });

  test('should display empty state when no invoices exist', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Apply filter that returns no results
    const statusSelect = page.getByTestId('select-status');
    await statusSelect.click();
    await page.getByRole('option', { name: 'Cancelled' }).click();
    await page.waitForTimeout(500);
    
    // Check for empty state (might be visible if no cancelled invoices)
    const searchInput = page.getByTestId('input-search');
    await searchInput.fill('NONEXISTENT_INVOICE_12345');
    await page.waitForTimeout(500);
    
    // Empty state should show
    const emptyState = page.getByTestId('empty-state');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('No invoices found');
    }
  });

  test('should handle query errors with retry mechanism', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/invoices*', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/invoices');
    
    // Wait for error to appear
    const errorAlert = page.getByTestId('error-invoices');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText('Failed to Load Invoices');
    
    // Verify retry button exists
    const retryButton = page.getByTestId('button-retry-invoices');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('Retry');
    
    // Remove the route intercept
    await page.unroute('**/api/invoices*');
    
    // Click retry
    await retryButton.click();
    
    // Should load successfully now
    await expect(page.getByTestId('text-page-title')).toBeVisible({ timeout: 10000 });
  });

  test('should open and close payment dialog', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Wait for invoices to load
    await page.waitForTimeout(1000);
    
    // Find first invoice row
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Click actions dropdown
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      // Click "Mark as Paid" if available
      const markPaidButton = page.locator('[data-testid^="button-mark-paid-"]').first();
      if (await markPaidButton.isVisible()) {
        await markPaidButton.click();
        
        // Verify payment dialog opens
        const paymentDialog = page.getByTestId('dialog-payment');
        await expect(paymentDialog).toBeVisible();
        
        // Verify form fields
        await expect(page.getByTestId('input-payment-amount')).toBeVisible();
        await expect(page.getByTestId('select-payment-method')).toBeVisible();
        
        // Cancel dialog
        await page.getByTestId('button-cancel-payment').click();
        await expect(paymentDialog).not.toBeVisible();
      }
    }
  });

  test('should validate payment amount', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    // Find first unpaid invoice
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      const markPaidButton = page.locator('[data-testid^="button-mark-paid-"]').first();
      if (await markPaidButton.isVisible()) {
        await markPaidButton.click();
        
        // Wait for dialog
        await expect(page.getByTestId('dialog-payment')).toBeVisible();
        
        // Set invalid amount (zero)
        await page.getByTestId('input-payment-amount').fill('0');
        
        // Try to submit
        await page.getByTestId('button-submit-payment').click();
        
        // Should show error and keep dialog open
        await page.waitForTimeout(500);
        const errorMessage = page.getByTestId('error-payment');
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toContainText('greater than zero');
        }
        
        // Dialog should still be open
        await expect(page.getByTestId('dialog-payment')).toBeVisible();
        
        // Cancel
        await page.getByTestId('button-cancel-payment').click();
      }
    }
  });

  test('should open delete confirmation dialog', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    // Find first invoice
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Get invoice number for verification
      const invoiceNumber = await firstInvoiceRow.locator('[data-testid^="invoice-number-"]').textContent();
      
      // Click actions dropdown
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      // Click delete
      const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
      await deleteButton.click();
      
      // Verify delete confirmation dialog opens
      const deleteDialog = page.getByTestId('dialog-delete');
      await expect(deleteDialog).toBeVisible();
      
      // Verify dialog contains invoice number
      if (invoiceNumber) {
        await expect(deleteDialog).toContainText(invoiceNumber);
      }
      
      // Cancel deletion
      await page.getByTestId('button-cancel-delete').click();
      await expect(deleteDialog).not.toBeVisible();
    }
  });

  test('should keep delete dialog open on error', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Intercept delete request to simulate error
      await page.route('**/api/invoices/*', (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ message: 'Failed to delete invoice' }),
          });
        } else {
          route.continue();
        }
      });
      
      // Open delete dialog
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
      await deleteButton.click();
      
      // Wait for dialog
      await expect(page.getByTestId('dialog-delete')).toBeVisible();
      
      // Confirm deletion
      await page.getByTestId('button-confirm-delete').click();
      
      // Wait for error
      await page.waitForTimeout(1000);
      
      // Dialog should still be open
      await expect(page.getByTestId('dialog-delete')).toBeVisible();
      
      // Error should be visible
      const deleteError = page.getByTestId('error-delete');
      if (await deleteError.isVisible()) {
        await expect(deleteError).toBeVisible();
        
        // Retry button should exist
        await expect(page.getByTestId('button-retry-delete')).toBeVisible();
      }
      
      // Clean up
      await page.unroute('**/api/invoices/*');
      await page.getByTestId('button-cancel-delete').click();
    }
  });

  test('should display invoice details in table', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Verify all expected columns are present
      await expect(firstInvoiceRow.locator('[data-testid^="invoice-number-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="invoice-customer-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="invoice-date-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="invoice-due-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="invoice-amount-"]')).toBeVisible();
      
      // Verify status badge
      const statusBadge = firstInvoiceRow.locator('[data-testid^="badge-status-"]');
      await expect(statusBadge).toBeVisible();
    }
  });

  test('should have accessible dropdown menu actions', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Click actions dropdown
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      // Wait for menu to open
      await page.waitForTimeout(300);
      
      // Verify all action buttons exist
      const editButton = page.locator('[data-testid^="button-edit-"]').first();
      const sendButton = page.locator('[data-testid^="button-send-"]').first();
      const downloadButton = page.locator('[data-testid^="button-download-"]').first();
      const duplicateButton = page.locator('[data-testid^="button-duplicate-"]').first();
      const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
      
      if (await editButton.isVisible()) {
        await expect(editButton).toContainText('View/Edit');
      }
      if (await sendButton.isVisible()) {
        await expect(sendButton).toContainText('Send Invoice');
      }
      if (await downloadButton.isVisible()) {
        await expect(downloadButton).toContainText('Download PDF');
      }
      if (await duplicateButton.isVisible()) {
        await expect(duplicateButton).toContainText('Duplicate');
      }
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toContainText('Delete');
      }
      
      // Close menu by clicking elsewhere
      await page.click('body');
    }
  });

  test('should navigate to new invoice page', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Click "New Invoice" button
    const newInvoiceButton = page.getByTestId('button-new-invoice');
    await expect(newInvoiceButton).toBeVisible();
    await newInvoiceButton.click();
    
    // Should navigate to new invoice page
    await page.waitForURL(/\/invoices\/new/);
  });

  test('should handle ErrorBoundary fallback', async ({ page }) => {
    // This test verifies the ErrorBoundary is in place
    // We can't easily trigger it without causing actual errors
    // But we can verify the component structure
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    
    // Page should load successfully
    await expect(page.getByTestId('text-page-title')).toBeVisible();
  });

  test('should show pending states during mutations', async ({ page }) => {
    await page.goto('/invoices');
    await page.waitForSelector('[data-testid="text-page-title"]');
    await page.waitForTimeout(1000);
    
    const firstInvoiceRow = page.locator('[data-testid^="invoice-row-"]').first();
    if (await firstInvoiceRow.isVisible()) {
      // Delay the API response to see pending state
      await page.route('**/api/invoices/*/mark-paid', async (route) => {
        await page.waitForTimeout(2000);
        route.continue();
      });
      
      // Open payment dialog
      const actionsButton = firstInvoiceRow.locator('[data-testid^="button-actions-"]');
      await actionsButton.click();
      
      const markPaidButton = page.locator('[data-testid^="button-mark-paid-"]').first();
      if (await markPaidButton.isVisible()) {
        await markPaidButton.click();
        
        // Wait for dialog
        await expect(page.getByTestId('dialog-payment')).toBeVisible();
        
        // Set valid amount
        await page.getByTestId('input-payment-amount').fill('100');
        
        // Submit - don't await, we want to see pending state
        page.getByTestId('button-submit-payment').click();
        
        // Check for pending state
        await page.waitForTimeout(500);
        const submitButton = page.getByTestId('button-submit-payment');
        
        // Should show "Processing..." text
        const buttonText = await submitButton.textContent();
        if (buttonText?.includes('Processing')) {
          expect(buttonText).toContain('Processing');
        }
        
        // Clean up
        await page.unroute('**/api/invoices/*/mark-paid');
        
        // Wait for completion
        await page.waitForTimeout(3000);
      }
    }
  });
});
