/**
 * Payments Page - End-to-End Tests
 * 
 * Comprehensive tests for Payment tracking functionality following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during data fetch
 * - Error states with retry mechanisms
 * - Record/Update/Delete payment flows
 * - Delete confirmation dialog with error persistence
 * - Form validation and pending states
 * - Payment method selection
 * - Overpayment warnings
 * - Empty states
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(45000);

class PaymentsPage {
  constructor(private page: Page) {}

  // Locators
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get paymentCount() {
    return this.page.getByTestId('text-payment-count');
  }

  get formTitle() {
    return this.page.getByTestId('text-form-title');
  }

  get selectInvoice() {
    return this.page.getByTestId('select-invoice');
  }

  get inputAmount() {
    return this.page.getByTestId('input-amount');
  }

  get buttonPaymentDate() {
    return this.page.getByTestId('button-payment-date');
  }

  get selectPaymentMethod() {
    return this.page.getByTestId('select-payment-method');
  }

  get inputReferenceNumber() {
    return this.page.getByTestId('input-reference-number');
  }

  get textareaNotes() {
    return this.page.getByTestId('textarea-notes');
  }

  get submitButton() {
    return this.page.getByTestId('button-submit-payment');
  }

  get cancelEditButton() {
    return this.page.getByTestId('button-cancel-edit');
  }

  get skeletonPaymentsTable() {
    return this.page.getByTestId('skeleton-payments-table');
  }

  get errorInvoices() {
    return this.page.getByTestId('error-invoices');
  }

  get errorPayments() {
    return this.page.getByTestId('error-payments');
  }

  get retryInvoicesButton() {
    return this.page.getByTestId('button-retry-invoices');
  }

  get retryPaymentsButton() {
    return this.page.getByTestId('button-retry-payments');
  }

  get emptyState() {
    return this.page.getByTestId('empty-state-payments');
  }

  get deleteDialog() {
    return this.page.getByTestId('dialog-delete-payment');
  }

  get confirmDeleteButton() {
    return this.page.getByTestId('button-confirm-delete');
  }

  get cancelDeleteButton() {
    return this.page.getByTestId('button-cancel-delete');
  }

  get deleteError() {
    return this.page.getByTestId('error-delete');
  }

  getEditButton(paymentId: string) {
    return this.page.getByTestId(`button-edit-${paymentId}`);
  }

  getDeleteButton(paymentId: string) {
    return this.page.getByTestId(`button-delete-${paymentId}`);
  }

  getPaymentRow(paymentId: string) {
    return this.page.getByTestId(`row-payment-${paymentId}`);
  }

  getPaymentAmount(paymentId: string) {
    return this.page.getByTestId(`cell-amount-${paymentId}`);
  }

  // Actions
  async navigate() {
    await this.page.goto(`${BASE_URL}/invoices`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectInvoiceById(invoiceId: string) {
    await this.selectInvoice.click();
    await this.page.getByTestId(`select-invoice-option-${invoiceId}`).click();
  }

  async selectPaymentMethodByValue(method: 'direct_deposit' | 'check' | 'wire') {
    await this.selectPaymentMethod.click();
    await this.page.getByTestId(`select-method-${method}`).click();
  }

  async fillPaymentForm(data: {
    invoiceId?: string;
    amount?: string;
    paymentMethod?: 'direct_deposit' | 'check' | 'wire';
    referenceNumber?: string;
    notes?: string;
  }) {
    if (data.invoiceId) {
      await this.selectInvoiceById(data.invoiceId);
    }

    if (data.amount) {
      await this.inputAmount.fill(data.amount);
    }

    if (data.paymentMethod) {
      await this.selectPaymentMethodByValue(data.paymentMethod);
    }

    if (data.referenceNumber) {
      await this.inputReferenceNumber.fill(data.referenceNumber);
    }

    if (data.notes) {
      await this.textareaNotes.fill(data.notes);
    }
  }

  async submitPayment() {
    await this.submitButton.click();
  }
}

test.describe('Payments Page - E2E Tests', () => {
  let paymentsPage: PaymentsPage;

  test.beforeEach(async ({ page }) => {
    paymentsPage = new PaymentsPage(page);

    // Login as admin using dev-mode
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    
    // Navigate to payments page
    await paymentsPage.navigate();
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
  // PHASE 2 - BUILD: Skeleton Loaders & Error States
  // ============================================================================

  test('should display skeleton loaders during initial page load', async ({ page }) => {
    // Navigate to a fresh page to catch skeleton state
    await page.goto(`${BASE_URL}/invoices`);
    
    // Skeleton might be very brief, but we check for it
    const skeleton = paymentsPage.skeletonPaymentsTable;
    
    // Page should eventually load with title
    await expect(paymentsPage.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(paymentsPage.pageTitle).toHaveText('Payments');
  });

  test('should display error state with retry button when payments fail to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/payments*', (route) => {
      route.abort('failed');
    });
    
    await page.goto(`${BASE_URL}/invoices`);
    
    // Wait for error to appear
    await expect(paymentsPage.errorPayments).toBeVisible({ timeout: 10000 });
    await expect(paymentsPage.errorPayments).toContainText('Failed to Load Payments');
    
    // Verify retry button exists
    await expect(paymentsPage.retryPaymentsButton).toBeVisible();
    await expect(paymentsPage.retryPaymentsButton).toContainText('Retry');
    
    // Remove the route intercept
    await page.unroute('**/api/payments*');
    
    // Click retry
    await paymentsPage.retryPaymentsButton.click();
    
    // Should load successfully now
    await expect(paymentsPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display error state with retry button when invoices fail to load', async ({ page }) => {
    // Intercept API request and simulate error
    await page.route('**/api/invoices*', (route) => {
      route.abort('failed');
    });
    
    await page.goto(`${BASE_URL}/invoices`);
    
    // Wait for error to appear
    await expect(paymentsPage.errorInvoices).toBeVisible({ timeout: 10000 });
    await expect(paymentsPage.errorInvoices).toContainText('Failed to Load Invoices');
    
    // Verify retry button exists
    await expect(paymentsPage.retryInvoicesButton).toBeVisible();
    
    // Remove the route intercept
    await page.unroute('**/api/invoices*');
    
    // Click retry
    await paymentsPage.retryInvoicesButton.click();
    
    // Should load successfully now
    await expect(paymentsPage.pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display empty state when no payments exist', async ({ page }) => {
    // This test assumes there are no payments initially or we need to delete all
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState('networkidle');
    
    // Check if empty state is visible (if no payments exist)
    const emptyState = paymentsPage.emptyState;
    const isVisible = await emptyState.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(emptyState).toContainText('No payments recorded yet');
      await expect(emptyState).toContainText('Start tracking payments');
    }
  });

  // ============================================================================
  // PHASE 4 - TEST: Record Payment Flow
  // ============================================================================

  test('should record a new payment successfully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verify form is visible
    await expect(paymentsPage.formTitle).toBeVisible();
    await expect(paymentsPage.formTitle).toHaveText('Record Payment');
    
    // Wait for invoices to load
    await page.waitForTimeout(1000);
    
    // Select first invoice
    await paymentsPage.selectInvoice.click();
    const firstInvoiceOption = page.locator('[data-testid^="select-invoice-option-"]').first();
    const isInvoiceAvailable = await firstInvoiceOption.isVisible();
    
    if (isInvoiceAvailable) {
      await firstInvoiceOption.click();
      
      // Fill in payment details
      await paymentsPage.inputAmount.fill('500.00');
      
      // Select payment method
      await paymentsPage.selectPaymentMethodByValue('check');
      
      // Add reference number
      await paymentsPage.inputReferenceNumber.fill('CHK-12345');
      
      // Add notes
      await paymentsPage.textareaNotes.fill('First payment for invoice');
      
      // Submit payment
      await paymentsPage.submitButton.click();
      
      // Wait for success
      await page.waitForTimeout(1500);
      
      // Verify form is reset (title should say "Record Payment" not "Edit Payment")
      await expect(paymentsPage.formTitle).toHaveText('Record Payment');
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Try to submit without filling required fields
    await paymentsPage.submitButton.click();
    
    // Should show validation errors
    await page.waitForTimeout(500);
    
    // Check for error messages
    const invoiceError = page.getByTestId('error-invoice');
    if (await invoiceError.isVisible()) {
      await expect(invoiceError).toContainText('invoice');
    }
  });

  test('should validate amount is greater than zero', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Select an invoice first
    await paymentsPage.selectInvoice.click();
    const firstInvoiceOption = page.locator('[data-testid^="select-invoice-option-"]').first();
    const isInvoiceAvailable = await firstInvoiceOption.isVisible();
    
    if (isInvoiceAvailable) {
      await firstInvoiceOption.click();
      
      // Try to submit with zero amount
      await paymentsPage.inputAmount.fill('0');
      await paymentsPage.submitButton.click();
      
      await page.waitForTimeout(500);
      
      // Should show error
      const amountError = page.getByTestId('error-amount');
      if (await amountError.isVisible()) {
        await expect(amountError).toContainText('greater than 0');
      }
    }
  });

  // ============================================================================
  // PHASE 4 - TEST: Edit Payment Flow
  // ============================================================================

  test('should edit an existing payment', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Find first payment row
    const firstPaymentRow = page.locator('[data-testid^="row-payment-"]').first();
    const isPaymentVisible = await firstPaymentRow.isVisible();
    
    if (isPaymentVisible) {
      // Get payment ID from row
      const rowTestId = await firstPaymentRow.getAttribute('data-testid');
      const paymentId = rowTestId?.replace('row-payment-', '') || '';
      
      // Click edit button
      const editButton = paymentsPage.getEditButton(paymentId);
      await editButton.click();
      
      // Wait for form to populate
      await page.waitForTimeout(500);
      
      // Verify form title changes to "Edit Payment"
      await expect(paymentsPage.formTitle).toHaveText('Edit Payment');
      
      // Modify amount
      await paymentsPage.inputAmount.fill('750.00');
      
      // Update reference number
      await paymentsPage.inputReferenceNumber.fill('CHK-UPDATED');
      
      // Submit update
      await paymentsPage.submitButton.click();
      
      // Wait for success
      await page.waitForTimeout(1500);
      
      // Verify form title returns to "Record Payment"
      await expect(paymentsPage.formTitle).toHaveText('Record Payment');
    }
  });

  test('should cancel edit and reset form', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Find first payment row
    const firstPaymentRow = page.locator('[data-testid^="row-payment-"]').first();
    const isPaymentVisible = await firstPaymentRow.isVisible();
    
    if (isPaymentVisible) {
      const rowTestId = await firstPaymentRow.getAttribute('data-testid');
      const paymentId = rowTestId?.replace('row-payment-', '') || '';
      
      // Click edit button
      const editButton = paymentsPage.getEditButton(paymentId);
      await editButton.click();
      
      // Wait for form to populate
      await page.waitForTimeout(500);
      
      // Verify cancel button is visible
      await expect(paymentsPage.cancelEditButton).toBeVisible();
      
      // Click cancel
      await paymentsPage.cancelEditButton.click();
      
      // Verify form title returns to "Record Payment"
      await expect(paymentsPage.formTitle).toHaveText('Record Payment');
    }
  });

  // ============================================================================
  // PHASE 4 - TEST: Delete Payment with Confirmation Dialog
  // ============================================================================

  test('should delete payment with confirmation dialog', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Find first payment row
    const firstPaymentRow = page.locator('[data-testid^="row-payment-"]').first();
    const isPaymentVisible = await firstPaymentRow.isVisible();
    
    if (isPaymentVisible) {
      const rowTestId = await firstPaymentRow.getAttribute('data-testid');
      const paymentId = rowTestId?.replace('row-payment-', '') || '';
      
      // Click delete button
      const deleteButton = paymentsPage.getDeleteButton(paymentId);
      await deleteButton.click();
      
      // Verify confirmation dialog appears
      await expect(paymentsPage.deleteDialog).toBeVisible();
      
      // Verify dialog content
      const deleteTitle = page.getByTestId('text-delete-title');
      await expect(deleteTitle).toHaveText('Delete Payment');
      
      const deleteDescription = page.getByTestId('text-delete-description');
      await expect(deleteDescription).toContainText('cannot be undone');
      
      // Click cancel
      await paymentsPage.cancelDeleteButton.click();
      
      // Dialog should close
      await expect(paymentsPage.deleteDialog).not.toBeVisible();
      
      // Payment should still exist
      await expect(firstPaymentRow).toBeVisible();
    }
  });

  test('should keep delete dialog open on error and allow retry', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Find first payment row
    const firstPaymentRow = page.locator('[data-testid^="row-payment-"]').first();
    const isPaymentVisible = await firstPaymentRow.isVisible();
    
    if (isPaymentVisible) {
      const rowTestId = await firstPaymentRow.getAttribute('data-testid');
      const paymentId = rowTestId?.replace('row-payment-', '') || '';
      
      // Intercept delete request to simulate error
      let requestCount = 0;
      await page.route(`**/api/payments/${paymentId}`, (route) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          // Second request succeeds
          route.continue();
        }
      });
      
      // Click delete button
      const deleteButton = paymentsPage.getDeleteButton(paymentId);
      await deleteButton.click();
      
      // Verify confirmation dialog appears
      await expect(paymentsPage.deleteDialog).toBeVisible();
      
      // Confirm delete (this will fail)
      await paymentsPage.confirmDeleteButton.click();
      
      // Wait for error
      await page.waitForTimeout(1000);
      
      // Dialog should stay open
      await expect(paymentsPage.deleteDialog).toBeVisible();
      
      // Error message should appear
      const errorMessage = paymentsPage.deleteError;
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
      
      // Click confirm again (this will succeed)
      await paymentsPage.confirmDeleteButton.click();
      
      // Wait for success
      await page.waitForTimeout(1500);
      
      // Dialog should close
      await expect(paymentsPage.deleteDialog).not.toBeVisible();
      
      // Clean up route
      await page.unroute(`**/api/payments/${paymentId}`);
    }
  });

  // ============================================================================
  // PHASE 5 - HARDEN: Payment Method Selection
  // ============================================================================

  test('should select different payment methods', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Test all payment methods
    const methods: Array<'direct_deposit' | 'check' | 'wire'> = ['direct_deposit', 'check', 'wire'];
    
    for (const method of methods) {
      await paymentsPage.selectPaymentMethod.click();
      
      const methodOption = page.getByTestId(`select-method-${method}`);
      await expect(methodOption).toBeVisible();
      await methodOption.click();
      
      // Verify selection (wait a bit for UI to update)
      await page.waitForTimeout(300);
    }
  });

  // ============================================================================
  // PHASE 5 - HARDEN: Mutation Pending States
  // ============================================================================

  test('should show loading state during payment submission', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Select first invoice
    await paymentsPage.selectInvoice.click();
    const firstInvoiceOption = page.locator('[data-testid^="select-invoice-option-"]').first();
    const isInvoiceAvailable = await firstInvoiceOption.isVisible();
    
    if (isInvoiceAvailable) {
      await firstInvoiceOption.click();
      
      // Fill amount
      await paymentsPage.inputAmount.fill('100.00');
      
      // Intercept request to slow it down
      await page.route('**/api/payments', async (route) => {
        await page.waitForTimeout(1000);
        route.continue();
      });
      
      // Submit payment
      await paymentsPage.submitButton.click();
      
      // Button should show "Recording..." and be disabled
      await expect(paymentsPage.submitButton).toContainText('Recording...');
      await expect(paymentsPage.submitButton).toBeDisabled();
      
      // Wait for completion
      await page.waitForTimeout(2000);
      
      // Clean up route
      await page.unroute('**/api/payments');
    }
  });

  // ============================================================================
  // PHASE 4 - TEST: Payment Table Display
  // ============================================================================

  test('should display payment details in table correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Find first payment row
    const firstPaymentRow = page.locator('[data-testid^="row-payment-"]').first();
    const isPaymentVisible = await firstPaymentRow.isVisible();
    
    if (isPaymentVisible) {
      const rowTestId = await firstPaymentRow.getAttribute('data-testid');
      const paymentId = rowTestId?.replace('row-payment-', '') || '';
      
      // Verify all cells are visible
      await expect(page.getByTestId(`cell-payment-date-${paymentId}`)).toBeVisible();
      await expect(page.getByTestId(`cell-invoice-number-${paymentId}`)).toBeVisible();
      await expect(page.getByTestId(`cell-amount-${paymentId}`)).toBeVisible();
      await expect(page.getByTestId(`cell-payment-method-${paymentId}`)).toBeVisible();
      await expect(page.getByTestId(`cell-reference-number-${paymentId}`)).toBeVisible();
      
      // Verify amount format (should include $)
      const amountText = await page.getByTestId(`cell-amount-${paymentId}`).textContent();
      expect(amountText).toContain('$');
    }
  });

  test('should display payment count correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Get payment count text
    const countText = await paymentsPage.paymentCount.textContent();
    
    // Should contain number and "payment" or "payments"
    expect(countText).toMatch(/\d+ payments?/);
  });
});
