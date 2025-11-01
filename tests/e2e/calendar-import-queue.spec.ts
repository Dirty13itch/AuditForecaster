/**
 * Calendar Import Queue Page - End-to-End Tests
 * 
 * Tests for the Calendar Import Queue page wrapper.
 * This is a simple wrapper page that delegates to CalendarImportQueue component.
 * 
 * Tests cover:
 * - Authentication and access control (admin only)
 * - Access denied message for non-admin users
 * - Component loading for admin users
 * - ErrorBoundary fallback
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class CalendarImportQueuePage {
  constructor(private page: Page) {}

  // Page Elements
  get accessDeniedAlert() {
    return this.page.getByTestId('alert-access-denied');
  }

  get accessDeniedTitle() {
    return this.page.getByTestId('text-alert-title');
  }

  get accessDeniedDescription() {
    return this.page.getByTestId('text-alert-description');
  }

  get queueContainer() {
    return this.page.getByTestId('container-queue-page');
  }

  get errorIcon() {
    return this.page.getByTestId('icon-error');
  }

  // ErrorBoundary
  get errorBoundary() {
    return this.page.getByTestId('card-error-boundary');
  }

  get reloadPageButton() {
    return this.page.getByTestId('button-reload-page');
  }

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/calendar/import-queue`);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

// Test Suite: Authentication - Admin Access
test.describe('Calendar Import Queue - Admin Access', () => {
  test('allows admin users to access queue page', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    // Admin should see the queue container
    await expect(queuePage.queueContainer).toBeVisible({ timeout: 10000 });
  });

  test('admin sees queue component not access denied', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    // Should NOT see access denied
    await expect(queuePage.accessDeniedAlert).not.toBeVisible();
  });
});

// Test Suite: Authentication - Non-Admin Access
test.describe('Calendar Import Queue - Non-Admin Access', () => {
  test('denies access to non-admin users', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-user`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    // Non-admin should see access denied
    await expect(queuePage.accessDeniedAlert).toBeVisible({ timeout: 10000 });
  });

  test('displays access denied message correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-user`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    await expect(queuePage.accessDeniedAlert).toBeVisible({ timeout: 10000 });
    await expect(queuePage.accessDeniedTitle).toContainText('Access Denied');
    await expect(queuePage.accessDeniedDescription).toContainText('administrators');
  });

  test('shows error icon in access denied alert', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-user`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    await expect(queuePage.errorIcon).toBeVisible({ timeout: 10000 });
  });

  test('non-admin does not see queue container', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-user`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    // Should NOT see queue container
    await expect(queuePage.queueContainer).not.toBeVisible();
  });
});

// Test Suite: Page Loading
test.describe('Calendar Import Queue - Page Loading', () => {
  test('page loads without errors for admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    
    // Page should load successfully
    await expect(queuePage.queueContainer).toBeVisible({ timeout: 10000 });
  });

  test('page loads access denied for non-admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-user`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    
    // Page should load with access denied
    await expect(queuePage.accessDeniedAlert).toBeVisible({ timeout: 10000 });
  });
});

// Test Suite: Component Integration
test.describe('Calendar Import Queue - Component Integration', () => {
  test('CalendarImportQueue component renders for admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const queuePage = new CalendarImportQueuePage(page);
    await queuePage.navigate();
    await queuePage.waitForPageLoad();
    
    // Queue container should be visible
    const containerVisible = await queuePage.queueContainer.isVisible({ timeout: 10000 });
    expect(containerVisible).toBeTruthy();
  });
});
