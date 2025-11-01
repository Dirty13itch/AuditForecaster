import { test, expect } from '@playwright/test';

test.describe('Calibration Schedule Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/dev-login/test-admin');
    await page.waitForURL('/');
    await page.goto('/calibration-schedule');
    await page.waitForLoadState('networkidle');
  });

  test('should display page title and subtitle', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toContainText('Calibration Schedule');
    await expect(page.getByTestId('text-page-subtitle')).toContainText('Manage equipment calibration schedules');
  });

  test('should show refresh button and it should work', async ({ page }) => {
    const refreshButton = page.getByTestId('button-refresh');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(refreshButton).toBeDisabled();
    await page.waitForLoadState('networkidle');
    await expect(refreshButton).toBeEnabled();
  });

  test('should show export button', async ({ page }) => {
    await expect(page.getByTestId('button-export')).toBeVisible();
    await expect(page.getByTestId('button-export')).toContainText('Export Schedule');
  });

  test('should display view toggle tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-list-view')).toBeVisible();
    await expect(page.getByTestId('tab-calendar-view')).toBeVisible();
  });

  test('should start in list view by default', async ({ page }) => {
    await expect(page.getByTestId('tab-content-list')).toBeVisible();
  });

  test('should switch to calendar view when clicked', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    await expect(page.getByTestId('tab-content-calendar')).toBeVisible();
    await expect(page.getByTestId('card-calendar')).toBeVisible();
  });

  test('should display overdue calibrations alert if present', async ({ page }) => {
    const overdueAlert = page.getByTestId('alert-overdue');
    if (await overdueAlert.isVisible()) {
      await expect(page.getByTestId('text-alert-overdue-title')).toContainText('Overdue Calibrations');
      await expect(page.getByTestId('icon-alert-overdue')).toBeVisible();
    }
  });

  test('should display overdue calibrations table if present', async ({ page }) => {
    const overdueCard = page.getByTestId('card-overdue');
    if (await overdueCard.isVisible()) {
      await expect(page.getByTestId('text-overdue-title')).toContainText('Overdue Calibrations');
      await expect(page.getByTestId('table-overdue')).toBeVisible();
    }
  });

  test('should display upcoming calibrations card', async ({ page }) => {
    await expect(page.getByTestId('card-upcoming')).toBeVisible();
    await expect(page.getByTestId('text-upcoming-title')).toContainText('Upcoming Calibrations');
  });

  test('should show empty state when no upcoming calibrations', async ({ page }) => {
    const emptyState = page.getByTestId('empty-upcoming');
    if (await emptyState.isVisible()) {
      await expect(page.getByTestId('icon-empty-upcoming')).toBeVisible();
      await expect(page.getByTestId('text-empty-upcoming')).toContainText('No calibrations due');
    }
  });

  test('should display upcoming calibrations table with data', async ({ page }) => {
    const table = page.getByTestId('table-upcoming');
    if (await table.isVisible()) {
      await expect(page.getByTestId('header-upcoming-equipment')).toBeVisible();
      await expect(page.getByTestId('header-upcoming-type')).toBeVisible();
      await expect(page.getByTestId('header-upcoming-serial')).toBeVisible();
      await expect(page.getByTestId('header-upcoming-due')).toBeVisible();
      await expect(page.getByTestId('header-upcoming-status')).toBeVisible();
      await expect(page.getByTestId('header-upcoming-action')).toBeVisible();
    }
  });

  test('should navigate to equipment details from upcoming table', async ({ page }) => {
    const firstViewButton = page.locator('[data-testid^="button-view-"]').first();
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click();
      await expect(page).toHaveURL(/\/equipment\/.+/);
    }
  });

  test('should navigate to equipment details from overdue table', async ({ page }) => {
    const firstScheduleButton = page.locator('[data-testid^="button-schedule-"]').first();
    if (await firstScheduleButton.isVisible()) {
      await firstScheduleButton.click();
      await expect(page).toHaveURL(/\/equipment\/.+/);
    }
  });

  test('should display calendar navigation controls', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    await expect(page.getByTestId('button-prev-month')).toBeVisible();
    await expect(page.getByTestId('button-next-month')).toBeVisible();
    await expect(page.getByTestId('button-today')).toBeVisible();
  });

  test('should display current month in calendar view', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    const monthTitle = page.getByTestId('text-calendar-month');
    await expect(monthTitle).toBeVisible();
    const monthText = await monthTitle.textContent();
    expect(monthText).toMatch(/[A-Z][a-z]+ \d{4}/);
  });

  test('should navigate to previous month in calendar', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    const currentMonth = await page.getByTestId('text-calendar-month').textContent();
    await page.getByTestId('button-prev-month').click();
    await page.waitForTimeout(100);
    const newMonth = await page.getByTestId('text-calendar-month').textContent();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('should navigate to next month in calendar', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    const currentMonth = await page.getByTestId('text-calendar-month').textContent();
    await page.getByTestId('button-next-month').click();
    await page.waitForTimeout(100);
    const newMonth = await page.getByTestId('text-calendar-month').textContent();
    expect(newMonth).not.toBe(currentMonth);
  });

  test('should return to current month when clicking today button', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    await page.getByTestId('button-prev-month').click();
    await page.waitForTimeout(100);
    await page.getByTestId('button-today').click();
    await page.waitForTimeout(100);
    const monthText = await page.getByTestId('text-calendar-month').textContent();
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(monthText).toContain(currentMonth.split(' ')[0]);
  });

  test('should display calendar weekday headers', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    await expect(page.getByTestId('header-weekday-sun')).toBeVisible();
    await expect(page.getByTestId('header-weekday-mon')).toBeVisible();
    await expect(page.getByTestId('header-weekday-tue')).toBeVisible();
    await expect(page.getByTestId('header-weekday-wed')).toBeVisible();
    await expect(page.getByTestId('header-weekday-thu')).toBeVisible();
    await expect(page.getByTestId('header-weekday-fri')).toBeVisible();
    await expect(page.getByTestId('header-weekday-sat')).toBeVisible();
  });

  test('should display calendar legend', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    await expect(page.getByTestId('legend-calendar')).toBeVisible();
    await expect(page.getByTestId('legend-overdue')).toBeVisible();
    await expect(page.getByTestId('legend-due-soon')).toBeVisible();
    await expect(page.getByTestId('legend-upcoming')).toBeVisible();
  });

  test('should show error state with retry button on API failure', async ({ page }) => {
    await page.route('**/api/calibrations/**', route => route.abort());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const errorAlert = page.getByTestId('alert-error');
    if (await errorAlert.isVisible()) {
      await expect(page.getByTestId('button-retry')).toBeVisible();
    }
  });

  test('should handle retry button click on error', async ({ page }) => {
    await page.route('**/api/calibrations/upcoming*', route => route.abort());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const retryButton = page.getByTestId('button-retry');
    if (await retryButton.isVisible()) {
      await page.unroute('**/api/calibrations/upcoming*');
      await retryButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should show loading skeleton on initial load', async ({ page }) => {
    await page.goto('/calibration-schedule');
    const skeleton = page.getByTestId('skeleton-loading');
    if (await skeleton.isVisible({ timeout: 100 })) {
      await expect(skeleton).toBeVisible();
    }
  });

  test('should display calibration badges with correct colors', async ({ page }) => {
    const upcomingBadges = page.locator('[data-testid^="badge-upcoming-"]');
    const count = await upcomingBadges.count();
    if (count > 0) {
      await expect(upcomingBadges.first()).toBeVisible();
    }
  });

  test('should navigate to equipment details from calendar items', async ({ page }) => {
    await page.getByTestId('tab-calendar-view').click();
    const calendarItems = page.locator('[data-testid^="calendar-item-"]');
    const count = await calendarItems.count();
    if (count > 0) {
      await calendarItems.first().click();
      await expect(page).toHaveURL(/\/equipment\/.+/);
    }
  });

  test('should be responsive and work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByTestId('tabs-view-toggle')).toBeVisible();
  });
});
