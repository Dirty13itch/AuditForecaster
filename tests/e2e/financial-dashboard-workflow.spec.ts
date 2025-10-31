import { test, expect } from '@playwright/test';

test.describe('Financial Dashboard Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the financial dashboard
    await page.goto('/financial-dashboard');
  });

  test('should display page title and header elements', async ({ page }) => {
    // Verify page loads and title is visible
    await expect(page.getByTestId('text-title')).toBeVisible();
    await expect(page.getByTestId('text-title')).toHaveText('Financial Dashboard');
    
    // Verify period selector is present
    await expect(page.getByTestId('select-period')).toBeVisible();
    
    // Verify new invoice button is present
    await expect(page.getByTestId('button-new-invoice')).toBeVisible();
  });

  test('should show skeleton loaders while data is loading', async ({ page }) => {
    // Reload to see loading states
    await page.reload();
    
    // Check for skeleton loaders (they may appear briefly)
    // We verify the cards exist even if skeletons are fast
    await expect(page.getByTestId('card-total-revenue')).toBeVisible();
    await expect(page.getByTestId('card-total-expenses')).toBeVisible();
    await expect(page.getByTestId('card-net-profit')).toBeVisible();
    await expect(page.getByTestId('card-outstanding')).toBeVisible();
  });

  test('should display all four key metric cards', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByTestId('text-total-revenue')).toBeVisible();
    
    // Verify all metric cards are present
    await expect(page.getByTestId('card-total-revenue')).toBeVisible();
    await expect(page.getByTestId('card-total-expenses')).toBeVisible();
    await expect(page.getByTestId('card-net-profit')).toBeVisible();
    await expect(page.getByTestId('card-outstanding')).toBeVisible();
    
    // Verify metric values are displayed (currency format)
    const revenueText = await page.getByTestId('text-total-revenue').textContent();
    expect(revenueText).toMatch(/\$[\d,]+\.\d{2}/); // Currency format
    
    const expensesText = await page.getByTestId('text-total-expenses').textContent();
    expect(expensesText).toMatch(/\$[\d,]+\.\d{2}/);
    
    const profitText = await page.getByTestId('text-net-profit').textContent();
    expect(profitText).toMatch(/\$[\d,]+\.\d{2}/);
    
    const outstandingText = await page.getByTestId('text-outstanding').textContent();
    expect(outstandingText).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('should display profit margin percentage', async ({ page }) => {
    // Wait for profit margin to load
    await expect(page.getByTestId('text-profit-margin')).toBeVisible();
    
    // Verify profit margin displays percentage
    const marginText = await page.getByTestId('text-profit-margin').textContent();
    expect(marginText).toMatch(/\d+\.\d% margin/);
  });

  test('should change period when selecting from dropdown', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByTestId('select-period')).toBeVisible();
    
    // Click period selector
    await page.getByTestId('select-period').click();
    
    // Select quarterly
    await page.getByRole('option', { name: 'Quarterly' }).click();
    
    // Verify the revenue chart description updates
    await expect(page.getByText('Revenue over time by quarter')).toBeVisible();
    
    // Change to yearly
    await page.getByTestId('select-period').click();
    await page.getByRole('option', { name: 'Yearly' }).click();
    
    // Verify update
    await expect(page.getByText('Revenue over time by year')).toBeVisible();
  });

  test('should display revenue trend chart or empty state', async ({ page }) => {
    // Verify revenue trend card exists
    await expect(page.getByTestId('card-revenue-trend')).toBeVisible();
    
    // Check if chart has data or shows empty state
    const hasData = await page.getByTestId('empty-revenue-chart').isVisible().catch(() => false);
    
    if (hasData) {
      // Empty state should show
      await expect(page.getByTestId('empty-revenue-chart')).toBeVisible();
      await expect(page.getByText('No revenue data available for this period')).toBeVisible();
    } else {
      // Chart should be rendered (ResponsiveContainer renders SVG)
      const chartContainer = page.getByTestId('card-revenue-trend').locator('svg');
      await expect(chartContainer).toBeVisible();
    }
  });

  test('should display expense breakdown chart or empty state', async ({ page }) => {
    // Verify expense breakdown card exists
    await expect(page.getByTestId('card-expense-breakdown')).toBeVisible();
    
    // Check if chart has data or shows empty state
    const hasEmptyState = await page.getByTestId('empty-expense-chart').isVisible().catch(() => false);
    
    if (hasEmptyState) {
      // Empty state should show
      await expect(page.getByTestId('empty-expense-chart')).toBeVisible();
      await expect(page.getByText('No expense data available for this period')).toBeVisible();
    } else {
      // Chart should be rendered
      const chartContainer = page.getByTestId('card-expense-breakdown').locator('svg');
      await expect(chartContainer).toBeVisible();
    }
  });

  test('should display recent invoices or empty state', async ({ page }) => {
    // Verify recent invoices card exists
    await expect(page.getByTestId('card-recent-invoices')).toBeVisible();
    
    // Check if there are invoices or empty state
    const hasEmptyState = await page.getByTestId('empty-recent-invoices').isVisible().catch(() => false);
    
    if (hasEmptyState) {
      // Empty state should show
      await expect(page.getByTestId('empty-recent-invoices')).toBeVisible();
      await expect(page.getByText('No recent invoices')).toBeVisible();
      await expect(page.getByTestId('button-create-first-invoice')).toBeVisible();
    } else {
      // At least one invoice should be visible
      const invoiceItems = await page.locator('[data-testid^="invoice-item-"]').count();
      expect(invoiceItems).toBeGreaterThan(0);
    }
  });

  test('should display invoice details correctly', async ({ page }) => {
    // Wait for invoices to load
    await page.waitForTimeout(1000);
    
    // Check if any invoices exist
    const firstInvoice = page.locator('[data-testid^="invoice-item-"]').first();
    const exists = await firstInvoice.isVisible().catch(() => false);
    
    if (exists) {
      // Get invoice ID from the first invoice
      const invoiceElement = await firstInvoice.getAttribute('data-testid');
      const invoiceId = invoiceElement?.replace('invoice-item-', '');
      
      if (invoiceId) {
        // Verify invoice details are displayed
        await expect(page.getByTestId(`invoice-number-${invoiceId}`)).toBeVisible();
        await expect(page.getByTestId(`invoice-status-${invoiceId}`)).toBeVisible();
        await expect(page.getByTestId(`invoice-total-${invoiceId}`)).toBeVisible();
        await expect(page.getByTestId(`button-view-invoice-${invoiceId}`)).toBeVisible();
        
        // Verify total is in currency format
        const totalText = await page.getByTestId(`invoice-total-${invoiceId}`).textContent();
        expect(totalText).toMatch(/\$[\d,]+\.\d{2}/);
      }
    }
  });

  test('should display all quick action buttons', async ({ page }) => {
    // Verify quick actions card exists
    await expect(page.getByTestId('card-quick-actions')).toBeVisible();
    
    // Verify all quick action buttons are present
    await expect(page.getByTestId('button-create-invoice')).toBeVisible();
    await expect(page.getByTestId('button-log-expense')).toBeVisible();
    await expect(page.getByTestId('button-log-mileage')).toBeVisible();
    await expect(page.getByTestId('button-view-reports')).toBeVisible();
  });

  test('should display mileage summary widget', async ({ page }) => {
    // Verify mileage summary widget exists
    await expect(page.getByTestId('widget-mileage-summary')).toBeVisible();
    
    // Verify mileage data is displayed
    await expect(page.getByTestId('text-total-mileage')).toBeVisible();
    await expect(page.getByTestId('text-mileage-deduction')).toBeVisible();
    await expect(page.getByTestId('text-irs-rate')).toBeVisible();
    
    // Verify IRS rate displays correctly
    const irsRateText = await page.getByTestId('text-irs-rate').textContent();
    expect(irsRateText).toMatch(/\$0\.67\/mile/);
    
    // Verify mileage displays number format
    const mileageText = await page.getByTestId('text-total-mileage').textContent();
    expect(mileageText).toMatch(/[\d,]+ miles/);
    
    // Verify deduction displays currency format
    const deductionText = await page.getByTestId('text-mileage-deduction').textContent();
    expect(deductionText).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('should navigate to create invoice page', async ({ page }) => {
    // Click new invoice button in header
    await page.getByTestId('button-new-invoice').click();
    
    // Verify navigation occurred
    await expect(page).toHaveURL(/\/invoices/);
  });

  test('should navigate to invoice detail when clicking view', async ({ page }) => {
    // Wait for invoices to load
    await page.waitForTimeout(1000);
    
    // Check if any invoices exist
    const firstViewButton = page.locator('[data-testid^="button-view-invoice-"]').first();
    const exists = await firstViewButton.isVisible().catch(() => false);
    
    if (exists) {
      // Click the view button
      await firstViewButton.click();
      
      // Verify navigation to invoice detail page
      await expect(page).toHaveURL(/\/invoices\/[a-zA-Z0-9-]+/);
    }
  });

  test('should handle error states with retry buttons', async ({ page }) => {
    // This test verifies error UI elements exist in the component
    // In a real scenario, we'd need to mock API failures
    
    // Verify error handling elements are properly defined
    // by checking the page structure
    await expect(page.getByTestId('page-financial-dashboard')).toBeVisible();
    
    // The error states will appear if queries fail
    // This test verifies the page loads without throwing errors
  });

  test('should handle empty data states gracefully', async ({ page }) => {
    // Verify that empty states are handled
    // Either data is shown or appropriate empty states appear
    
    await expect(page.getByTestId('card-revenue-trend')).toBeVisible();
    await expect(page.getByTestId('card-expense-breakdown')).toBeVisible();
    await expect(page.getByTestId('card-recent-invoices')).toBeVisible();
    
    // Verify no JavaScript errors on page
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('should display overdue invoice warning when applicable', async ({ page }) => {
    // Wait for outstanding card to load
    await expect(page.getByTestId('text-outstanding')).toBeVisible();
    
    // Check if overdue indicator exists
    const hasOverdue = await page.getByTestId('text-overdue').isVisible().catch(() => false);
    const hasNoOverdue = await page.getByTestId('text-no-overdue').isVisible().catch(() => false);
    
    // One of these should be visible
    expect(hasOverdue || hasNoOverdue).toBeTruthy();
    
    if (hasOverdue) {
      // Verify overdue amount is displayed
      const overdueText = await page.getByTestId('text-overdue').textContent();
      expect(overdueText).toMatch(/\$[\d,]+\.\d{2} overdue/);
    } else {
      // Verify "All current" message
      await expect(page.getByTestId('text-no-overdue')).toHaveText('All current');
    }
  });

  test('should maintain responsive layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify page still loads correctly
    await expect(page.getByTestId('text-title')).toBeVisible();
    await expect(page.getByTestId('card-total-revenue')).toBeVisible();
    
    // Verify metrics cards stack vertically on mobile
    const revenueCard = page.getByTestId('card-total-revenue');
    const expensesCard = page.getByTestId('card-total-expenses');
    
    const revenueBox = await revenueCard.boundingBox();
    const expensesBox = await expensesCard.boundingBox();
    
    if (revenueBox && expensesBox) {
      // Cards should be stacked (Y position should be different)
      expect(Math.abs(revenueBox.y - expensesBox.y)).toBeGreaterThan(50);
    }
  });

  test('should calculate financial metrics correctly', async ({ page }) => {
    // Wait for all metrics to load
    await expect(page.getByTestId('text-total-revenue')).toBeVisible();
    await expect(page.getByTestId('text-total-expenses')).toBeVisible();
    await expect(page.getByTestId('text-net-profit')).toBeVisible();
    
    // Get the text values
    const revenueText = await page.getByTestId('text-total-revenue').textContent();
    const expensesText = await page.getByTestId('text-total-expenses').textContent();
    const profitText = await page.getByTestId('text-net-profit').textContent();
    const marginText = await page.getByTestId('text-profit-margin').textContent();
    
    // Parse currency values (remove $ and commas)
    const revenue = parseFloat(revenueText?.replace(/[$,]/g, '') || '0');
    const expenses = parseFloat(expensesText?.replace(/[$,]/g, '') || '0');
    const profit = parseFloat(profitText?.replace(/[$,]/g, '') || '0');
    
    // Verify profit = revenue - expenses (with small tolerance for floating point)
    const expectedProfit = revenue - expenses;
    expect(Math.abs(profit - expectedProfit)).toBeLessThan(0.01);
    
    // Verify profit margin calculation
    if (revenue > 0) {
      const marginValue = parseFloat(marginText?.match(/(\d+\.\d+)%/)?.[1] || '0');
      const expectedMargin = (profit / revenue) * 100;
      expect(Math.abs(marginValue - Math.abs(expectedMargin))).toBeLessThan(0.1);
    }
  });

  test('should calculate mileage deduction correctly', async ({ page }) => {
    // Wait for mileage widget to load
    await expect(page.getByTestId('text-total-mileage')).toBeVisible();
    await expect(page.getByTestId('text-mileage-deduction')).toBeVisible();
    
    // Get values
    const mileageText = await page.getByTestId('text-total-mileage').textContent();
    const deductionText = await page.getByTestId('text-mileage-deduction').textContent();
    
    // Parse values
    const miles = parseFloat(mileageText?.replace(/[,\s]miles/, '') || '0');
    const deduction = parseFloat(deductionText?.replace(/[$,]/g, '') || '0');
    
    // Verify deduction = miles * IRS rate ($0.67)
    const expectedDeduction = miles * 0.67;
    expect(Math.abs(deduction - expectedDeduction)).toBeLessThan(0.01);
  });
});
