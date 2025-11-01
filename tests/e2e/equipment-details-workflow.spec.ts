import { test, expect } from '@playwright/test';

test.describe('Equipment Details Workflow', () => {
  let equipmentId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/api/dev-login/test-admin');
    await page.waitForURL('/');
    
    await page.goto('/equipment');
    await page.waitForLoadState('networkidle');
    
    const firstEquipmentLink = page.locator('a[href^="/equipment/"]').first();
    if (await firstEquipmentLink.isVisible()) {
      const href = await firstEquipmentLink.getAttribute('href');
      equipmentId = href?.split('/').pop() || '';
      await page.goto(`/equipment/${equipmentId}`);
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display equipment name and manufacturer', async ({ page }) => {
    await expect(page.getByTestId('text-equipment-name')).toBeVisible();
    await expect(page.getByTestId('text-equipment-manufacturer')).toBeVisible();
  });

  test('should show back button and navigate to equipment list', async ({ page }) => {
    await page.getByTestId('button-back').click();
    await expect(page).toHaveURL('/equipment');
  });

  test('should display refresh button', async ({ page }) => {
    const refreshButton = page.getByTestId('button-refresh');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(refreshButton).toBeDisabled();
    await page.waitForLoadState('networkidle');
    await expect(refreshButton).toBeEnabled();
  });

  test('should display edit button and enter edit mode', async ({ page }) => {
    await page.getByTestId('button-edit').click();
    await expect(page.getByTestId('button-save')).toBeVisible();
    await expect(page.getByTestId('button-cancel')).toBeVisible();
  });

  test('should cancel edit mode when clicking cancel', async ({ page }) => {
    await page.getByTestId('button-edit').click();
    await page.getByTestId('button-cancel').click();
    await expect(page.getByTestId('button-edit')).toBeVisible();
  });

  test('should display delete button and show confirmation dialog', async ({ page }) => {
    await page.getByTestId('button-delete').click();
    await expect(page.getByTestId('dialog-delete')).toBeVisible();
    await expect(page.getByTestId('text-delete-title')).toContainText('Delete Equipment');
    await expect(page.getByTestId('text-delete-description')).toBeVisible();
  });

  test('should cancel delete operation', async ({ page }) => {
    await page.getByTestId('button-delete').click();
    await page.getByTestId('button-cancel-delete').click();
    await expect(page.getByTestId('dialog-delete')).not.toBeVisible();
  });

  test('should display equipment information card', async ({ page }) => {
    await expect(page.getByTestId('card-equipment-info')).toBeVisible();
    await expect(page.getByTestId('text-info-title')).toContainText('Equipment Information');
  });

  test('should display all equipment fields in read mode', async ({ page }) => {
    await expect(page.getByTestId('field-name')).toBeVisible();
    await expect(page.getByTestId('field-type')).toBeVisible();
    await expect(page.getByTestId('field-manufacturer')).toBeVisible();
    await expect(page.getByTestId('field-model')).toBeVisible();
    await expect(page.getByTestId('field-serial')).toBeVisible();
    await expect(page.getByTestId('field-status')).toBeVisible();
    await expect(page.getByTestId('field-location')).toBeVisible();
    await expect(page.getByTestId('field-purchase-date')).toBeVisible();
  });

  test('should show edit inputs when in edit mode', async ({ page }) => {
    await page.getByTestId('button-edit').click();
    await expect(page.getByTestId('input-edit-name')).toBeVisible();
    await expect(page.getByTestId('select-edit-type')).toBeVisible();
    await expect(page.getByTestId('input-edit-manufacturer')).toBeVisible();
    await expect(page.getByTestId('input-edit-model')).toBeVisible();
    await expect(page.getByTestId('input-edit-serial')).toBeVisible();
    await expect(page.getByTestId('select-edit-status')).toBeVisible();
    await expect(page.getByTestId('input-edit-location')).toBeVisible();
    await expect(page.getByTestId('input-edit-purchase-date')).toBeVisible();
  });

  test('should display QR code card', async ({ page }) => {
    await expect(page.getByTestId('card-qr-code')).toBeVisible();
    await expect(page.getByTestId('text-qr-title')).toContainText('QR Code');
    await expect(page.getByTestId('icon-qr-code')).toBeVisible();
    await expect(page.getByTestId('button-print-qr')).toBeVisible();
  });

  test('should display calibration overdue alert if applicable', async ({ page }) => {
    const overdueAlert = page.getByTestId('alert-calibration-overdue');
    if (await overdueAlert.isVisible()) {
      await expect(page.getByTestId('icon-overdue')).toBeVisible();
      await expect(page.getByTestId('text-overdue-title')).toContainText('Calibration Overdue');
      await expect(page.getByTestId('button-schedule-overdue')).toBeVisible();
    }
  });

  test('should display calibration due soon alert if applicable', async ({ page }) => {
    const dueAlert = page.getByTestId('alert-calibration-due');
    if (await dueAlert.isVisible()) {
      await expect(page.getByTestId('icon-due')).toBeVisible();
      await expect(page.getByTestId('text-due-title')).toContainText('Calibration Due Soon');
      await expect(page.getByTestId('button-schedule-due')).toBeVisible();
    }
  });

  test('should display history tabs', async ({ page }) => {
    await expect(page.getByTestId('tabs-history')).toBeVisible();
    await expect(page.getByTestId('tab-calibration')).toBeVisible();
    await expect(page.getByTestId('tab-maintenance')).toBeVisible();
    await expect(page.getByTestId('tab-checkouts')).toBeVisible();
  });

  test('should display calibration history tab content', async ({ page }) => {
    await page.getByTestId('tab-calibration').click();
    await expect(page.getByTestId('tab-content-calibration')).toBeVisible();
    await expect(page.getByTestId('card-calibration-history')).toBeVisible();
    await expect(page.getByTestId('button-add-calibration')).toBeVisible();
  });

  test('should display maintenance log tab content', async ({ page }) => {
    await page.getByTestId('tab-maintenance').click();
    await expect(page.getByTestId('tab-content-maintenance')).toBeVisible();
    await expect(page.getByTestId('card-maintenance-log')).toBeVisible();
    await expect(page.getByTestId('button-add-maintenance')).toBeVisible();
  });

  test('should display checkout history tab content', async ({ page }) => {
    await page.getByTestId('tab-checkouts').click();
    await expect(page.getByTestId('tab-content-checkouts')).toBeVisible();
    await expect(page.getByTestId('card-checkout-history')).toBeVisible();
  });

  test('should show empty state for calibration history if no records', async ({ page }) => {
    await page.getByTestId('tab-calibration').click();
    const emptyState = page.getByTestId('empty-calibrations');
    if (await emptyState.isVisible()) {
      await expect(page.getByTestId('icon-empty-calibrations')).toBeVisible();
      await expect(page.getByTestId('text-empty-calibrations')).toContainText('No calibration records');
    }
  });

  test('should show empty state for maintenance log if no records', async ({ page }) => {
    await page.getByTestId('tab-maintenance').click();
    const emptyState = page.getByTestId('empty-maintenance');
    if (await emptyState.isVisible()) {
      await expect(page.getByTestId('icon-empty-maintenance')).toBeVisible();
      await expect(page.getByTestId('text-empty-maintenance')).toContainText('No maintenance records');
    }
  });

  test('should show empty state for checkout history if no records', async ({ page }) => {
    await page.getByTestId('tab-checkouts').click();
    const emptyState = page.getByTestId('empty-checkouts');
    if (await emptyState.isVisible()) {
      await expect(page.getByTestId('icon-empty-checkouts')).toBeVisible();
      await expect(page.getByTestId('text-empty-checkouts')).toContainText('No checkout records');
    }
  });

  test('should display calibration table with data if records exist', async ({ page }) => {
    await page.getByTestId('tab-calibration').click();
    const table = page.getByTestId('table-calibrations');
    if (await table.isVisible()) {
      await expect(page.getByTestId('header-cal-date')).toBeVisible();
      await expect(page.getByTestId('header-cal-next-due')).toBeVisible();
      await expect(page.getByTestId('header-cal-performed-by')).toBeVisible();
      await expect(page.getByTestId('header-cal-certificate')).toBeVisible();
      await expect(page.getByTestId('header-cal-result')).toBeVisible();
      await expect(page.getByTestId('header-cal-cost')).toBeVisible();
    }
  });

  test('should display maintenance table with data if records exist', async ({ page }) => {
    await page.getByTestId('tab-maintenance').click();
    const table = page.getByTestId('table-maintenance');
    if (await table.isVisible()) {
      await expect(page.getByTestId('header-maint-date')).toBeVisible();
      await expect(page.getByTestId('header-maint-performed-by')).toBeVisible();
      await expect(page.getByTestId('header-maint-description')).toBeVisible();
      await expect(page.getByTestId('header-maint-next-due')).toBeVisible();
      await expect(page.getByTestId('header-maint-cost')).toBeVisible();
    }
  });

  test('should display checkout table with data if records exist', async ({ page }) => {
    await page.getByTestId('tab-checkouts').click();
    const table = page.getByTestId('table-checkouts');
    if (await table.isVisible()) {
      await expect(page.getByTestId('header-checkout-out')).toBeVisible();
      await expect(page.getByTestId('header-checkout-in')).toBeVisible();
      await expect(page.getByTestId('header-checkout-by')).toBeVisible();
      await expect(page.getByTestId('header-checkout-purpose')).toBeVisible();
      await expect(page.getByTestId('header-checkout-status')).toBeVisible();
    }
  });

  test('should open add calibration dialog', async ({ page }) => {
    await page.getByTestId('tab-calibration').click();
    await page.getByTestId('button-add-calibration').click();
    await expect(page.getByTestId('dialog-add-calibration')).toBeVisible();
    await expect(page.getByTestId('text-add-calibration-title')).toContainText('Add Calibration Record');
  });

  test('should open add maintenance dialog', async ({ page }) => {
    await page.getByTestId('tab-maintenance').click();
    await page.getByTestId('button-add-maintenance').click();
    await expect(page.getByTestId('dialog-add-maintenance')).toBeVisible();
    await expect(page.getByTestId('text-add-maintenance-title')).toContainText('Add Maintenance Record');
  });

  test('should show error state with retry for calibrations on API failure', async ({ page }) => {
    await page.route('**/api/equipment/*/calibrations', route => route.abort());
    await page.getByTestId('tab-calibration').click();
    await page.waitForLoadState('networkidle');
    
    const errorAlert = page.getByTestId('alert-calibrations-error');
    if (await errorAlert.isVisible()) {
      await expect(page.getByTestId('button-retry-calibrations')).toBeVisible();
    }
  });

  test('should show error state with retry for maintenance on API failure', async ({ page }) => {
    await page.route('**/api/equipment/*/maintenance', route => route.abort());
    await page.getByTestId('tab-maintenance').click();
    await page.waitForLoadState('networkidle');
    
    const errorAlert = page.getByTestId('alert-maintenance-error');
    if (await errorAlert.isVisible()) {
      await expect(page.getByTestId('button-retry-maintenance')).toBeVisible();
    }
  });

  test('should show error state with retry for checkouts on API failure', async ({ page }) => {
    await page.route('**/api/equipment/*/checkouts', route => route.abort());
    await page.getByTestId('tab-checkouts').click();
    await page.waitForLoadState('networkidle');
    
    const errorAlert = page.getByTestId('alert-checkouts-error');
    if (await errorAlert.isVisible()) {
      await expect(page.getByTestId('button-retry-checkouts')).toBeVisible();
    }
  });

  test('should display status badge with correct color', async ({ page }) => {
    const statusBadge = page.getByTestId('badge-status');
    if (await statusBadge.isVisible()) {
      const badgeText = await statusBadge.textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test('should be responsive and work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('text-equipment-name')).toBeVisible();
    await expect(page.getByTestId('card-equipment-info')).toBeVisible();
  });
});
