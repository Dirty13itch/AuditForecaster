import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Notification Test Workflow
 * 
 * Covers:
 * - Sending test notifications
 * - Displaying recent notifications
 * - Priority-based styling
 * - Error handling
 */

test.describe('Notification Test Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notification-test');
  });

  test('should display page header', async ({ page }) => {
    await expect(page.getByTestId('text-title')).toHaveText('Notification System Test');
    await expect(page.getByTestId('text-description')).toContainText('Test the real-time');
  });

  test('should show test action buttons', async ({ page }) => {
    await expect(page.getByTestId('button-send-test')).toBeVisible();
    await expect(page.getByTestId('button-send-test')).toContainText('Send Test Notifications');
    
    await expect(page.getByTestId('button-send-custom')).toBeVisible();
    await expect(page.getByTestId('button-send-custom')).toContainText('Send Custom Notification');
  });

  test('should display current notifications section', async ({ page }) => {
    await expect(page.getByTestId('div-notifications-section')).toBeVisible();
    await expect(page.getByTestId('text-notifications-title')).toContainText('Current Notifications');
    await expect(page.getByTestId('badge-count')).toBeVisible();
  });

  test('should show empty state when no notifications', async ({ page }) => {
    await expect(page.getByTestId('div-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-message')).toContainText('No notifications yet');
  });

  test('should send test notifications successfully', async ({ page }) => {
    await page.route('/api/test-notifications', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.getByTestId('button-send-test').click();
    
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Test notifications sent')).toBeVisible({ timeout: 3000 });
  });

  test('should send custom notification successfully', async ({ page }) => {
    await page.route('/api/test-notification-single', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.getByTestId('button-send-custom').click();
    
    await expect(page.locator('text=Custom notification sent')).toBeVisible({ timeout: 3000 });
  });

  test('should handle send test notifications error', async ({ page }) => {
    await page.route('/api/test-notifications', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.getByTestId('button-send-test').click();
    
    await expect(page.locator('text=Failed to send test notifications')).toBeVisible({ timeout: 3000 });
  });

  test('should handle send custom notification error', async ({ page }) => {
    await page.route('/api/test-notification-single', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.getByTestId('button-send-custom').click();
    
    await expect(page.locator('text=Failed to send custom notification')).toBeVisible({ timeout: 3000 });
  });

  test('should display notification cards', async ({ page }) => {
    // Assuming notifications are present
    await expect(page.getByTestId('card-notification-0')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('text-notification-title-0')).toBeVisible();
    await expect(page.getByTestId('text-notification-message-0')).toBeVisible();
    await expect(page.getByTestId('badge-priority-0')).toBeVisible();
  });

  test('should show correct priority badge styling', async ({ page }) => {
    // Test different priority levels
    const badge = page.getByTestId('badge-priority-0');
    await expect(badge).toHaveClass(/bg-(red|orange|yellow|blue)-/);
  });

  test('should display testing instructions', async ({ page }) => {
    await expect(page.getByTestId('div-instructions')).toBeVisible();
    await expect(page.getByTestId('text-instructions-title')).toContainText('How to Test');
    await expect(page.getByTestId('list-instructions')).toBeVisible();
  });

  test('should show all instruction steps', async ({ page }) => {
    const instructions = [
      'instruction-1',
      'instruction-2',
      'instruction-3',
      'instruction-4',
      'instruction-5',
      'instruction-6',
      'instruction-7',
    ];

    for (const testId of instructions) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test('should display feature summary cards', async ({ page }) => {
    await expect(page.getByTestId('feature-realtime')).toBeVisible();
    await expect(page.getByTestId('feature-priorities')).toBeVisible();
    await expect(page.getByTestId('feature-persistent')).toBeVisible();
  });

  test('should show real-time feature description', async ({ page }) => {
    await expect(page.getByTestId('text-feature-realtime-title')).toContainText('Real-time Updates');
    await expect(page.getByTestId('text-feature-realtime-desc')).toContainText('WebSocket');
  });

  test('should show priorities feature description', async ({ page }) => {
    await expect(page.getByTestId('text-feature-priorities-title')).toContainText('Priority Levels');
    await expect(page.getByTestId('text-feature-priorities-desc')).toContainText('Urgent');
  });

  test('should show persistent storage feature description', async ({ page }) => {
    await expect(page.getByTestId('text-feature-persistent-title')).toContainText('Persistent Storage');
    await expect(page.getByTestId('text-feature-persistent-desc')).toContainText('database');
  });

  test('should have all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = [
      'text-title',
      'text-description',
      'button-send-test',
      'button-send-custom',
      'div-notifications-section',
      'div-instructions',
      'feature-realtime',
      'feature-priorities',
      'feature-persistent',
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeAttached();
    }
  });
});
