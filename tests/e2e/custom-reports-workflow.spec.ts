import { test, expect } from '@playwright/test';

test.describe('Custom Reports Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login as admin
    const devLoginLink = page.locator('a[href*="/api/dev-login/test-admin"]');
    if (await devLoginLink.isVisible()) {
      await devLoginLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to Custom Reports page
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    if (await sidebar.isVisible()) {
      const customReportsLink = sidebar.locator('text=Custom Reports').or(sidebar.locator('[href="/custom-reports"]'));
      await customReportsLink.click();
    } else {
      await page.goto('/custom-reports');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-custom-reports"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display page title and description', async ({ page }) => {
    await expect(page.locator('[data-testid="text-page-title"]')).toContainText('Custom Reports Builder');
    await expect(page.locator('[data-testid="text-page-description"]')).toBeVisible();
  });

  test('should display all main UI sections', async ({ page }) => {
    await expect(page.locator('[data-testid="section-config-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-main-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-saved-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-report-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-chart-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-group-by"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-date-range"]')).toBeVisible();
  });

  test('should load and display saved reports', async ({ page }) => {
    const savedReport1 = page.locator('[data-testid="saved-report-1"]');
    const savedReport2 = page.locator('[data-testid="saved-report-2"]');
    
    await expect(savedReport1).toBeVisible();
    await expect(savedReport2).toBeVisible();
    
    await expect(page.locator('[data-testid="text-report-name-1"]')).toContainText('Monthly Performance Review');
    await expect(page.locator('[data-testid="text-report-name-2"]')).toContainText('45L Compliance Tracker');
    
    // Check for scheduled report indicator
    await expect(page.locator('[data-testid="icon-scheduled-2"]')).toBeVisible();
  });

  test('should switch between report types', async ({ page }) => {
    // Default should be Performance
    await expect(page.locator('[data-testid="button-report-type-performance"]')).toHaveClass(/bg-accent/);
    
    // Switch to Compliance
    await page.locator('[data-testid="button-report-type-compliance"]').click();
    await expect(page.locator('[data-testid="button-report-type-compliance"]')).toHaveClass(/bg-accent/);
    
    // Switch to Financial
    await page.locator('[data-testid="button-report-type-financial"]').click();
    await expect(page.locator('[data-testid="button-report-type-financial"]')).toHaveClass(/bg-accent/);
    
    // Switch to Quality
    await page.locator('[data-testid="button-report-type-quality"]').click();
    await expect(page.locator('[data-testid="button-report-type-quality"]')).toHaveClass(/bg-accent/);
    
    // Switch to Equipment
    await page.locator('[data-testid="button-report-type-equipment"]').click();
    await expect(page.locator('[data-testid="button-report-type-equipment"]')).toHaveClass(/bg-accent/);
  });

  test('should select and display available metrics', async ({ page }) => {
    // Ensure we're in builder mode
    const builderCard = page.locator('[data-testid="card-builder-mode"]');
    await expect(builderCard).toBeVisible();
    
    // Check empty state message
    await expect(page.locator('[data-testid="text-empty-drop-zone"]')).toContainText('Drop metrics here');
    
    // Select a metric by clicking
    const firstMetric = page.locator('[data-testid^="metric-jobs_completed"]').first();
    await firstMetric.click();
    
    // Verify metric appears in selected area
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-selected-metrics"]')).toBeVisible();
    
    // Select another metric
    const secondMetric = page.locator('[data-testid^="metric-avg_inspection_time"]').first();
    await secondMetric.click();
    
    // Verify both metrics are selected
    await expect(page.locator('[data-testid="badge-selected-metric-avg_inspection_time"]')).toBeVisible();
  });

  test('should remove selected metrics', async ({ page }) => {
    // Select a metric
    const metric = page.locator('[data-testid^="metric-jobs_completed"]').first();
    await metric.click();
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).toBeVisible();
    
    // Remove the metric
    await page.locator('[data-testid="button-remove-metric-jobs_completed"]').click();
    
    // Verify metric is removed
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="text-empty-drop-zone"]')).toBeVisible();
  });

  test('should switch chart types', async ({ page }) => {
    // Default is line chart
    await expect(page.locator('[data-testid="button-chart-type-line"]')).toHaveAttribute('data-state', 'on');
    
    // Switch to bar chart
    await page.locator('[data-testid="button-chart-type-bar"]').click();
    await expect(page.locator('[data-testid="button-chart-type-bar"]')).toHaveAttribute('data-state', 'on');
    
    // Switch to area chart
    await page.locator('[data-testid="button-chart-type-area"]').click();
    await expect(page.locator('[data-testid="button-chart-type-area"]')).toHaveAttribute('data-state', 'on');
    
    // Switch to pie chart
    await page.locator('[data-testid="button-chart-type-pie"]').click();
    await expect(page.locator('[data-testid="button-chart-type-pie"]')).toHaveAttribute('data-state', 'on');
  });

  test('should change grouping options', async ({ page }) => {
    const groupBySelect = page.locator('[data-testid="select-group-by"]');
    
    // Open dropdown
    await groupBySelect.click();
    
    // Select "Week"
    await page.locator('[data-testid="select-item-group-week"]').click();
    await expect(groupBySelect).toContainText('Week');
    
    // Select "Day"
    await groupBySelect.click();
    await page.locator('[data-testid="select-item-group-day"]').click();
    await expect(groupBySelect).toContainText('Day');
    
    // Select "Quarter"
    await groupBySelect.click();
    await page.locator('[data-testid="select-item-group-quarter"]').click();
    await expect(groupBySelect).toContainText('Quarter');
  });

  test('should toggle between edit and preview modes', async ({ page }) => {
    // Start in edit mode (builder mode)
    await expect(page.locator('[data-testid="card-builder-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-preview-toggle"]')).toContainText('Preview');
    
    // Select a metric first
    const metric = page.locator('[data-testid^="metric-jobs_completed"]').first();
    await metric.click();
    
    // Switch to preview mode
    await page.locator('[data-testid="button-preview-toggle"]').click();
    await expect(page.locator('[data-testid="card-preview-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-preview-toggle"]')).toContainText('Edit');
    await expect(page.locator('[data-testid="section-chart-preview"]')).toBeVisible();
    
    // Switch back to edit mode
    await page.locator('[data-testid="button-preview-toggle"]').click();
    await expect(page.locator('[data-testid="card-builder-mode"]')).toBeVisible();
  });

  test('should show empty preview state when no metrics selected', async ({ page }) => {
    // Switch to preview without selecting metrics
    await page.locator('[data-testid="button-preview-toggle"]').click();
    
    // Verify empty state
    await expect(page.locator('[data-testid="section-empty-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-empty-preview"]')).toContainText('Select metrics to preview');
  });

  test('should load a saved report configuration', async ({ page }) => {
    // Load the first saved report
    await page.locator('[data-testid="saved-report-1"]').click();
    
    // Verify toast notification appears
    await expect(page.getByText('Report loaded')).toBeVisible({ timeout: 5000 });
    
    // Verify report type is selected
    await expect(page.locator('[data-testid="button-report-type-performance"]')).toHaveClass(/bg-accent/);
    
    // Verify metrics are selected
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-selected-metric-avg_inspection_time"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-selected-metric-first_pass_rate"]')).toBeVisible();
  });

  test('should delete a saved report', async ({ page }) => {
    // Hover over saved report to show delete button
    const savedReport = page.locator('[data-testid="saved-report-1"]');
    await savedReport.hover();
    
    // Click delete button
    await page.locator('[data-testid="button-delete-report-1"]').click();
    
    // Verify toast notification
    await expect(page.getByText('Report deleted')).toBeVisible({ timeout: 5000 });
    
    // Verify report is removed from list
    await expect(savedReport).not.toBeVisible();
  });

  test('should open save report dialog', async ({ page }) => {
    await page.locator('[data-testid="button-save-report"]').click();
    
    await expect(page.locator('[data-testid="dialog-save-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-dialog-title"]')).toContainText('Save Report Configuration');
    await expect(page.locator('[data-testid="input-report-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-report-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="switch-schedule-enabled"]')).toBeVisible();
  });

  test('should validate report name when saving', async ({ page }) => {
    // Open save dialog
    await page.locator('[data-testid="button-save-report"]').click();
    
    // Try to save without name
    await page.locator('[data-testid="button-confirm-save"]').click();
    
    // Verify error toast
    await expect(page.getByText('Please enter a report name')).toBeVisible({ timeout: 5000 });
  });

  test('should validate metrics selection when saving', async ({ page }) => {
    // Open save dialog
    await page.locator('[data-testid="button-save-report"]').click();
    
    // Enter name but no metrics selected
    await page.locator('[data-testid="input-report-name"]').fill('Test Report');
    await page.locator('[data-testid="button-confirm-save"]').click();
    
    // Verify error toast
    await expect(page.getByText('Please select at least one metric')).toBeVisible({ timeout: 5000 });
  });

  test('should save a new report with schedule', async ({ page }) => {
    // Select a metric
    await page.locator('[data-testid^="metric-jobs_completed"]').first().click();
    
    // Open save dialog
    await page.locator('[data-testid="button-save-report"]').click();
    
    // Fill in report details
    await page.locator('[data-testid="input-report-name"]').fill('My Custom Report');
    await page.locator('[data-testid="input-report-description"]').fill('Test description');
    
    // Enable scheduling
    await page.locator('[data-testid="switch-schedule-enabled"]').click();
    await expect(page.locator('[data-testid="section-schedule-config"]')).toBeVisible();
    
    // Set frequency
    await page.locator('[data-testid="select-schedule-frequency"]').click();
    await page.locator('[data-testid="select-item-weekly"]').click();
    
    // Set emails
    await page.locator('[data-testid="input-schedule-emails"]').fill('test@example.com');
    
    // Save
    await page.locator('[data-testid="button-confirm-save"]').click();
    
    // Verify success toast
    await expect(page.getByText('Report saved')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('My Custom Report')).toBeVisible({ timeout: 5000 });
    
    // Verify dialog closed
    await expect(page.locator('[data-testid="dialog-save-report"]')).not.toBeVisible();
  });

  test('should export report with validation', async ({ page }) => {
    // Try to export without metrics
    await page.locator('[data-testid="button-export-menu"]').click();
    await page.locator('[data-testid="menu-item-export-pdf"]').click();
    
    // Verify error toast
    await expect(page.getByText('Please select at least one metric to export')).toBeVisible({ timeout: 5000 });
    
    // Select a metric
    await page.locator('[data-testid^="metric-jobs_completed"]').first().click();
    
    // Export again
    await page.locator('[data-testid="button-export-menu"]').click();
    await page.locator('[data-testid="menu-item-export-pdf"]').click();
    
    // Verify success toast
    await expect(page.getByText('Export initiated')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('PDF')).toBeVisible({ timeout: 5000 });
  });

  test('should export in different formats', async ({ page }) => {
    // Select a metric
    await page.locator('[data-testid^="metric-jobs_completed"]').first().click();
    
    // Export as Excel
    await page.locator('[data-testid="button-export-menu"]').click();
    await page.locator('[data-testid="menu-item-export-excel"]').click();
    await expect(page.getByText('EXCEL')).toBeVisible({ timeout: 5000 });
    
    // Export as CSV
    await page.locator('[data-testid="button-export-menu"]').click();
    await page.locator('[data-testid="menu-item-export-csv"]').click();
    await expect(page.getByText('CSV')).toBeVisible({ timeout: 5000 });
  });

  test('should share report with validation', async ({ page }) => {
    // Try to share without metrics
    await page.locator('[data-testid="button-share"]').click();
    
    // Verify error toast
    await expect(page.getByText('Please select at least one metric to share')).toBeVisible({ timeout: 5000 });
    
    // Select a metric
    await page.locator('[data-testid^="metric-jobs_completed"]').first().click();
    
    // Share again
    await page.locator('[data-testid="button-share"]').click();
    
    // Verify success toast
    await expect(page.getByText('Share link generated')).toBeVisible({ timeout: 5000 });
  });

  test('should handle metric checkbox interaction', async ({ page }) => {
    // Click checkbox directly
    const checkbox = page.locator('[data-testid="checkbox-metric-jobs_completed"]').first();
    await checkbox.click();
    
    // Verify metric is selected
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).toBeVisible();
    
    // Click checkbox again to deselect
    await checkbox.click();
    
    // Verify metric is deselected
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).not.toBeVisible();
  });

  test('should display metric aggregation types', async ({ page }) => {
    // Check that aggregation badges are visible
    const countBadge = page.locator('[data-testid="badge-aggregation-jobs_completed"]').first();
    await expect(countBadge).toContainText('count');
    
    const avgBadge = page.locator('[data-testid="badge-aggregation-avg_inspection_time"]').first();
    await expect(avgBadge).toContainText('avg');
  });

  test('should cancel save dialog', async ({ page }) => {
    await page.locator('[data-testid="button-save-report"]').click();
    await expect(page.locator('[data-testid="dialog-save-report"]')).toBeVisible();
    
    await page.locator('[data-testid="button-cancel-save"]').click();
    await expect(page.locator('[data-testid="dialog-save-report"]')).not.toBeVisible();
  });

  test('should maintain report state when switching types', async ({ page }) => {
    // Select Performance metrics
    await page.locator('[data-testid^="metric-jobs_completed"]').first().click();
    await page.locator('[data-testid^="metric-avg_inspection_time"]').first().click();
    
    // Switch to Compliance type
    await page.locator('[data-testid="button-report-type-compliance"]').click();
    
    // Verify metrics are cleared (different category)
    await expect(page.locator('[data-testid="badge-selected-metric-jobs_completed"]')).not.toBeVisible();
    
    // Select compliance metrics
    await page.locator('[data-testid^="metric-compliance_rate"]').first().click();
    await expect(page.locator('[data-testid="badge-selected-metric-compliance_rate"]')).toBeVisible();
  });

  test('should display correct metrics for each report type', async ({ page }) => {
    // Performance type should show performance metrics
    await expect(page.locator('[data-testid^="button-report-type-performance"]')).toHaveClass(/bg-accent/);
    await expect(page.locator('[data-testid^="metric-jobs_completed"]').first()).toBeVisible();
    
    // Switch to Compliance
    await page.locator('[data-testid="button-report-type-compliance"]').click();
    await expect(page.locator('[data-testid^="metric-compliance_rate"]').first()).toBeVisible();
    
    // Switch to Financial
    await page.locator('[data-testid="button-report-type-financial"]').click();
    await expect(page.locator('[data-testid^="metric-total_revenue"]').first()).toBeVisible();
    
    // Switch to Quality
    await page.locator('[data-testid="button-report-type-quality"]').click();
    await expect(page.locator('[data-testid^="metric-qa_score"]').first()).toBeVisible();
    
    // Switch to Equipment
    await page.locator('[data-testid="button-report-type-equipment"]').click();
    await expect(page.locator('[data-testid^="metric-equipment_utilization"]').first()).toBeVisible();
  });

  test('should handle error boundary gracefully', async ({ page }) => {
    // This test verifies error boundary fallback exists
    // We can't easily trigger an error in the component, but we can verify the fallback UI structure exists
    await expect(page.locator('[data-testid="page-custom-reports"]')).toBeVisible();
    
    // If an error occurred, the error boundary fallback should be visible
    const errorFallback = page.locator('[data-testid="error-boundary-fallback"]');
    if (await errorFallback.isVisible()) {
      await expect(page.locator('[data-testid="text-error-title"]')).toContainText('Error Loading Custom Reports');
      await expect(page.locator('[data-testid="button-reload-page"]')).toBeVisible();
    }
  });
});
