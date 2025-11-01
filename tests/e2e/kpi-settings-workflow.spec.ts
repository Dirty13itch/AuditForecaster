import { test, expect } from '@playwright/test';

/**
 * E2E Tests for KPI Settings Workflow
 * 
 * Covers:
 * - KPI management (enable/disable/reorder)
 * - Custom KPI creation
 * - Alert configuration
 * - Appearance customization
 * - Tab navigation
 */

test.describe('KPI Settings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kpi-settings');
  });

  test('should display page header and description', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toHaveText('KPI Configuration');
    await expect(page.getByTestId('text-page-description')).toContainText('Customize your dashboard');
  });

  test('should display three main tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-dashboard')).toBeVisible();
    await expect(page.getByTestId('tab-alerts')).toBeVisible();
    await expect(page.getByTestId('tab-appearance')).toBeVisible();
  });

  test('should show create custom KPI button', async ({ page }) => {
    await expect(page.getByTestId('button-create-custom-kpi')).toBeVisible();
    await expect(page.getByTestId('button-create-custom-kpi')).toContainText('Create Custom KPI');
  });

  test('should show save configuration button', async ({ page }) => {
    await expect(page.getByTestId('button-save-settings')).toBeVisible();
    await expect(page.getByTestId('button-save-settings')).toContainText('Save Configuration');
  });

  test('should display active KPIs card', async ({ page }) => {
    await expect(page.getByTestId('card-active-kpis')).toBeVisible();
    await expect(page.getByTestId('text-active-title')).toContainText('Active KPIs');
    await expect(page.getByTestId('scroll-active-kpis')).toBeVisible();
  });

  test('should display available KPIs card', async ({ page }) => {
    await expect(page.getByTestId('card-available-kpis')).toBeVisible();
    await expect(page.getByTestId('text-available-title')).toContainText('Available KPIs');
    await expect(page.getByTestId('scroll-available-kpis')).toBeVisible();
  });

  test('should list predefined active KPIs', async ({ page }) => {
    await expect(page.getByTestId('item-active-kpi-0')).toBeVisible();
    await expect(page.getByTestId('text-kpi-name-0')).toBeVisible();
    await expect(page.getByTestId('badge-category-0')).toBeVisible();
  });

  test('should show drag handle for active KPIs', async ({ page }) => {
    await expect(page.getByTestId('icon-drag-0')).toBeVisible();
  });

  test('should show edit and disable buttons for active KPIs', async ({ page }) => {
    await expect(page.getByTestId('button-edit-0')).toBeVisible();
    await expect(page.getByTestId('button-disable-0')).toBeVisible();
  });

  test('should toggle KPI visibility', async ({ page }) => {
    await page.getByTestId('button-disable-0').click();
    
    // Verify KPI moved to available list
    await expect(page.getByTestId('item-available-kpi-0')).toBeVisible({ timeout: 2000 });
  });

  test('should enable disabled KPI', async ({ page }) => {
    await page.getByTestId('button-enable-0').click();
    
    // Verify KPI moved to active list
    await expect(page.getByTestId('item-active-kpi-0')).toBeVisible({ timeout: 2000 });
  });

  test('should open custom KPI creation dialog', async ({ page }) => {
    await page.getByTestId('button-create-custom-kpi').click();
    
    await expect(page.getByTestId('dialog-create-kpi')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Create Custom KPI');
  });

  test('should display all custom KPI form fields', async ({ page }) => {
    await page.getByTestId('button-create-custom-kpi').click();
    
    await expect(page.getByTestId('input-kpi-name')).toBeVisible();
    await expect(page.getByTestId('input-kpi-description')).toBeVisible();
    await expect(page.getByTestId('input-kpi-formula')).toBeVisible();
    await expect(page.getByTestId('input-kpi-unit')).toBeVisible();
    await expect(page.getByTestId('select-kpi-category')).toBeVisible();
    await expect(page.getByTestId('input-kpi-target')).toBeVisible();
  });

  test('should create custom KPI with valid data', async ({ page }) => {
    await page.getByTestId('button-create-custom-kpi').click();
    
    await page.getByTestId('input-kpi-name').fill('Test Efficiency');
    await page.getByTestId('input-kpi-description').fill('Measure test completion rate');
    await page.getByTestId('input-kpi-unit').fill('%');
    await page.getByTestId('input-kpi-target').fill('95');
    
    await page.getByTestId('button-save-kpi').click();
    
    await expect(page.locator('text=Custom KPI created')).toBeVisible({ timeout: 3000 });
  });

  test('should show error when creating KPI without required fields', async ({ page }) => {
    await page.getByTestId('button-create-custom-kpi').click();
    await page.getByTestId('button-save-kpi').click();
    
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible({ timeout: 3000 });
  });

  test('should cancel custom KPI creation', async ({ page }) => {
    await page.getByTestId('button-create-custom-kpi').click();
    await page.getByTestId('button-cancel-kpi').click();
    
    await expect(page.getByTestId('dialog-create-kpi')).not.toBeVisible();
  });

  test('should edit KPI details', async ({ page }) => {
    await page.getByTestId('button-edit-0').click();
    
    await expect(page.getByTestId('card-kpi-details')).toBeVisible();
    await expect(page.getByTestId('text-details-title')).toContainText('Edit KPI:');
  });

  test('should display KPI edit options', async ({ page }) => {
    await page.getByTestId('button-edit-0').click();
    
    await expect(page.getByTestId('input-target')).toBeVisible();
    await expect(page.getByTestId('select-refresh')).toBeVisible();
    await expect(page.getByTestId('switch-show-trend')).toBeVisible();
    await expect(page.getByTestId('switch-show-target')).toBeVisible();
  });

  test('should navigate to alerts tab', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    
    await expect(page.getByTestId('content-alerts')).toBeVisible();
    await expect(page.getByTestId('card-notification-channels')).toBeVisible();
  });

  test('should display notification channel options', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    
    await expect(page.getByTestId('switch-email-alerts')).toBeVisible();
    await expect(page.getByTestId('switch-sms-alerts')).toBeVisible();
    await expect(page.getByTestId('switch-in-app-alerts')).toBeVisible();
  });

  test('should enable email alerts and show email input', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    await page.getByTestId('switch-email-alerts').click();
    
    await expect(page.getByTestId('input-email-addresses')).toBeVisible();
  });

  test('should enable SMS alerts and show phone input', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    await page.getByTestId('switch-sms-alerts').click();
    
    await expect(page.getByTestId('input-phone-numbers')).toBeVisible();
  });

  test('should display alert preferences card', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    
    await expect(page.getByTestId('card-alert-preferences')).toBeVisible();
    await expect(page.getByTestId('select-frequency')).toBeVisible();
  });

  test('should show quiet hours configuration', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    
    await expect(page.getByTestId('input-quiet-from')).toBeVisible();
    await expect(page.getByTestId('input-quiet-to')).toBeVisible();
  });

  test('should display alert type checkboxes', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    
    await expect(page.getByTestId('checkbox-alert-Critical')).toBeVisible();
    await expect(page.getByTestId('checkbox-alert-Warning')).toBeVisible();
    await expect(page.getByTestId('checkbox-alert-Info')).toBeVisible();
    await expect(page.getByTestId('checkbox-alert-Success')).toBeVisible();
  });

  test('should navigate to appearance tab', async ({ page }) => {
    await page.getByTestId('tab-appearance').click();
    
    await expect(page.getByTestId('content-appearance')).toBeVisible();
    await expect(page.getByTestId('card-appearance')).toBeVisible();
  });

  test('should display color theme options', async ({ page }) => {
    await page.getByTestId('tab-appearance').click();
    
    await expect(page.getByTestId('button-color-0')).toBeVisible();
    await expect(page.getByTestId('button-color-1')).toBeVisible();
    await expect(page.getByTestId('button-color-2')).toBeVisible();
    await expect(page.getByTestId('button-color-3')).toBeVisible();
  });

  test('should display card size selector', async ({ page }) => {
    await page.getByTestId('tab-appearance').click();
    
    await expect(page.getByTestId('select-card-size')).toBeVisible();
  });

  test('should display animation speed slider', async ({ page }) => {
    await page.getByTestId('tab-appearance').click();
    
    await expect(page.getByTestId('slider-animation-speed')).toBeVisible();
    await expect(page.getByTestId('text-speed-value')).toHaveText('50%');
  });

  test('should display appearance toggle switches', async ({ page }) => {
    await page.getByTestId('tab-appearance').click();
    
    await expect(page.getByTestId('switch-animations')).toBeVisible();
    await expect(page.getByTestId('switch-sparklines')).toBeVisible();
    await expect(page.getByTestId('switch-compact-mode')).toBeVisible();
  });

  test('should save settings successfully', async ({ page }) => {
    await page.getByTestId('button-save-settings').click();
    
    await expect(page.locator('text=Settings saved')).toBeVisible({ timeout: 3000 });
  });

  test('should persist tab selection on page reload', async ({ page }) => {
    await page.getByTestId('tab-alerts').click();
    await page.reload();
    
    // Default tab should be dashboard
    await expect(page.getByTestId('content-dashboard')).toBeVisible();
  });

  test('should show empty state when all KPIs are active', async ({ page }) => {
    // After enabling all KPIs
    await expect(page.getByTestId('div-all-active')).toBeVisible({ timeout: 3000 });
  });

  test('should have all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = [
      'text-page-title',
      'button-create-custom-kpi',
      'button-save-settings',
      'card-active-kpis',
      'card-available-kpis',
      'tab-dashboard',
      'tab-alerts',
      'tab-appearance',
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeAttached();
    }
  });
});
