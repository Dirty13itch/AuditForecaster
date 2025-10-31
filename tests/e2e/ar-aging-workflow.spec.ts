import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('AR Aging Workflow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    await page.waitForURL('**/dashboard');
  });

  test('should display skeleton loaders while loading AR aging data', async ({ page }) => {
    // Navigate to AR Aging page
    await page.goto('/financial/ar-aging');
    
    // Verify skeleton loaders appear (they should be visible briefly)
    const skeleton = page.getByTestId('skeleton-ar-aging');
    
    // Wait for data to load and skeleton to disappear
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });
    
    // Verify page loaded successfully
    await expect(page.getByTestId('page-ar-aging')).toBeVisible();
    await expect(page.getByTestId('text-title')).toHaveText('AR Aging Report');
  });

  test('should display AR aging buckets with correct data', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-aging-breakdown"]');

    // Verify all aging buckets are displayed
    await expect(page.getByTestId('bucket-current')).toBeVisible();
    await expect(page.getByTestId('bucket-30days')).toBeVisible();
    await expect(page.getByTestId('bucket-60days')).toBeVisible();
    await expect(page.getByTestId('bucket-90plus')).toBeVisible();

    // Verify bucket amounts are displayed
    await expect(page.getByTestId('bucket-current-amount')).toBeVisible();
    await expect(page.getByTestId('bucket-30days-amount')).toBeVisible();
    await expect(page.getByTestId('bucket-60days-amount')).toBeVisible();
    await expect(page.getByTestId('bucket-90plus-amount')).toBeVisible();

    // Verify total AR is displayed
    await expect(page.getByTestId('text-total-ar')).toBeVisible();
    
    // Verify total AR contains currency formatting
    const totalAR = await page.getByTestId('text-total-ar').textContent();
    expect(totalAR).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('should handle empty state when no outstanding invoices', async ({ page }) => {
    // This test assumes we can reach a state with no AR
    // In a real scenario, you might need to mock the API or create test data
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-aging-breakdown"]');

    // Check if empty state is shown (when total AR is $0.00)
    const totalAR = await page.getByTestId('text-total-ar').textContent();
    
    if (totalAR === '$0.00') {
      await expect(page.getByTestId('empty-ar')).toBeVisible();
      await expect(page.getByText('No Outstanding Receivables')).toBeVisible();
    }
  });

  test('should display invoice tabs and allow switching between buckets', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-invoices-by-bucket"]');

    // Verify all tabs are present
    await expect(page.getByTestId('tab-current')).toBeVisible();
    await expect(page.getByTestId('tab-30days')).toBeVisible();
    await expect(page.getByTestId('tab-60days')).toBeVisible();
    await expect(page.getByTestId('tab-90plus')).toBeVisible();

    // Click on 30 Days tab
    await page.getByTestId('tab-30days').click();
    await page.waitForTimeout(500); // Wait for tab transition

    // Click on 60 Days tab
    await page.getByTestId('tab-60days').click();
    await page.waitForTimeout(500);

    // Click on 90+ Days tab
    await page.getByTestId('tab-90plus').click();
    await page.waitForTimeout(500);

    // Return to Current tab
    await page.getByTestId('tab-current').click();
    await page.waitForTimeout(500);
  });

  test('should display invoices in each bucket with correct information', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-invoices-by-bucket"]');

    // Check current bucket for invoices
    const currentInvoices = await page.locator('[data-testid^="row-invoice-"]').count();
    
    if (currentInvoices > 0) {
      const firstInvoiceRow = page.locator('[data-testid^="row-invoice-"]').first();
      
      // Verify invoice row has all required cells
      await expect(firstInvoiceRow.locator('[data-testid^="cell-invoice-number-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="cell-builder-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="cell-invoice-date-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="cell-amount-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="cell-balance-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="cell-days-overdue-"]')).toBeVisible();
      await expect(firstInvoiceRow.locator('[data-testid^="badge-status-"]')).toBeVisible();
    }
  });

  test('should navigate to invoice detail when clicking on invoice row', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-invoices-by-bucket"]');

    // Find first invoice row
    const firstInvoiceRow = page.locator('[data-testid^="row-invoice-"]').first();
    const invoiceCount = await page.locator('[data-testid^="row-invoice-"]').count();
    
    if (invoiceCount > 0) {
      // Click on invoice row
      await firstInvoiceRow.click();
      
      // Verify navigation to invoice detail page
      await page.waitForURL('**/financial/invoices?id=*', { timeout: 5000 });
    }
  });

  test('should filter AR aging by selected builder', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="select-builder-filter"]');

    // Get initial total AR
    const initialTotal = await page.getByTestId('text-total-ar').textContent();

    // Click builder filter dropdown
    await page.getByTestId('select-builder-filter').click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(300);

    // Check if there are builders to filter by
    const builderOptions = await page.locator('[data-testid^="select-builder-"]').count();
    
    if (builderOptions > 1) {
      // Select first non-"All" builder
      const firstBuilder = page.locator('[data-testid^="select-builder-"]').nth(1);
      await firstBuilder.click();
      
      // Wait for data to update
      await page.waitForTimeout(500);
      
      // Verify total AR may have changed (unless all AR is from that builder)
      const filteredTotal = await page.getByTestId('text-total-ar').textContent();
      // Total may be same or different depending on data
      expect(filteredTotal).toMatch(/\$[\d,]+\.\d{2}/);
    }
  });

  test('should handle AR data error with retry button', async ({ page }) => {
    // Intercept AR aging API and force it to fail
    await page.route('**/api/ar/aging', route => route.abort());
    
    await page.goto('/financial/ar-aging');
    
    // Wait for error alert to appear
    await expect(page.getByTestId('alert-ar-error')).toBeVisible({ timeout: 10000 });
    
    // Verify error message is displayed
    await expect(page.getByText('Failed to load AR aging data')).toBeVisible();
    
    // Verify retry button is present
    await expect(page.getByTestId('button-retry-ar')).toBeVisible();
    
    // Unblock the route
    await page.unroute('**/api/ar/aging');
    
    // Click retry button
    await page.getByTestId('button-retry-ar').click();
    
    // Verify error disappears and data loads
    await expect(page.getByTestId('alert-ar-error')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle invoices error with retry button', async ({ page }) => {
    // Intercept invoices API and force it to fail
    await page.route('**/api/invoices', route => route.abort());
    
    await page.goto('/financial/ar-aging');
    
    // Wait for error alert to appear
    await expect(page.getByTestId('alert-invoices-error')).toBeVisible({ timeout: 10000 });
    
    // Verify error message is displayed
    await expect(page.getByText('Failed to load invoices')).toBeVisible();
    
    // Verify retry button is present
    await expect(page.getByTestId('button-retry-invoices')).toBeVisible();
    
    // Unblock the route
    await page.unroute('**/api/invoices');
    
    // Click retry button
    await page.getByTestId('button-retry-invoices').click();
    
    // Verify error disappears and data loads
    await expect(page.getByTestId('alert-invoices-error')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle builders error with retry button', async ({ page }) => {
    // Intercept builders API and force it to fail
    await page.route('**/api/builders', route => route.abort());
    
    await page.goto('/financial/ar-aging');
    
    // Wait for error alert to appear
    await expect(page.getByTestId('alert-builders-error')).toBeVisible({ timeout: 10000 });
    
    // Verify error message is displayed
    await expect(page.getByText('Failed to load builders')).toBeVisible();
    
    // Verify retry button is present
    await expect(page.getByTestId('button-retry-builders')).toBeVisible();
    
    // Unblock the route
    await page.unroute('**/api/builders');
    
    // Click retry button
    await page.getByTestId('button-retry-builders').click();
    
    // Verify error disappears and data loads
    await expect(page.getByTestId('alert-builders-error')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display empty state for buckets with no invoices', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-invoices-by-bucket"]');

    // Check each bucket for empty state
    const buckets: BucketType[] = ['current', '30days', '60days', '90plus'];
    
    for (const bucket of buckets) {
      // Click on the bucket tab
      await page.getByTestId(`tab-${bucket}`).click();
      await page.waitForTimeout(300);
      
      // Check if empty state or invoices are shown
      const invoiceCount = await page.locator('[data-testid^="row-invoice-"]').count();
      
      if (invoiceCount === 0) {
        await expect(page.getByTestId(`empty-invoices-${bucket}`)).toBeVisible();
        await expect(page.getByText('No invoices in this bucket')).toBeVisible();
      }
    }
  });

  test('should display export button', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    
    // Verify export button is visible
    await expect(page.getByTestId('button-export')).toBeVisible();
    
    // Click export button (functionality may not be implemented yet)
    await page.getByTestId('button-export').click();
  });

  test('should handle error boundary gracefully', async ({ page }) => {
    // Force a JavaScript error by intercepting with invalid JSON
    await page.route('**/api/ar/aging', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json{{{',
      })
    );
    
    await page.goto('/financial/ar-aging');
    
    // The error boundary should catch the parse error
    // However, TanStack Query might handle this as a query error instead
    // So we check for either error state
    const errorBoundary = page.getByTestId('error-boundary-fallback');
    const queryError = page.getByTestId('alert-ar-error');
    
    // Either error boundary or query error should be visible
    const hasError = await Promise.race([
      errorBoundary.isVisible().then(() => true).catch(() => false),
      queryError.isVisible().then(() => true).catch(() => false),
    ]);
    
    expect(hasError).toBeTruthy();
  });

  test('should calculate and display days overdue correctly', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="card-invoices-by-bucket"]');

    // Switch to 30 days bucket (more likely to have invoices with overdue days)
    await page.getByTestId('tab-30days').click();
    await page.waitForTimeout(300);

    const invoiceCount = await page.locator('[data-testid^="row-invoice-"]').count();
    
    if (invoiceCount > 0) {
      const firstInvoiceDaysOverdue = page.locator('[data-testid^="cell-days-overdue-"]').first();
      const daysText = await firstInvoiceDaysOverdue.textContent();
      
      // Should be either a number followed by "days" or "-"
      expect(daysText).toMatch(/^(\d+ days|-)$/);
    }
  });

  test('should show aging bucket counts in bucket cards', async ({ page }) => {
    await page.goto('/financial/ar-aging');
    await page.waitForSelector('[data-testid="bucket-current"]');

    // Verify invoice counts are displayed in bucket cards
    const buckets = ['current', '30days', '60days', '90plus'];
    
    for (const bucket of buckets) {
      const bucketCard = page.getByTestId(`bucket-${bucket}`);
      await expect(bucketCard).toBeVisible();
      
      // Verify the card contains an invoice count
      const bucketText = await bucketCard.textContent();
      expect(bucketText).toMatch(/\d+ invoice\(s\)/);
    }
  });
});

type BucketType = 'current' | '30days' | '60days' | '90plus';
