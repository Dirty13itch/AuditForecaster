import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Photo Cleanup Workflow
 * 
 * Covers:
 * - Session loading and display
 * - Cleanup confirmation
 * - Bulk operations
 * - Error states and retry
 * - Storage estimation
 */

test.describe('Photo Cleanup Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/photos/cleanup');
  });

  test('should display loading skeletons while fetching sessions', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto('/photos/cleanup');
    
    await expect(page.getByTestId('div-loading-container')).toBeVisible();
    await expect(page.getByTestId('skeleton-summary')).toBeVisible();
    await expect(page.getByTestId('skeleton-session-1')).toBeVisible();
  });

  test('should display page header and description', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toContainText('Device Storage Cleanup');
    await expect(page.getByTestId('text-page-description')).toContainText('Manage photo cleanup');
  });

  test('should show storage summary card', async ({ page }) => {
    await expect(page.getByTestId('card-summary')).toBeVisible();
    await expect(page.getByTestId('text-summary-title')).toContainText('Storage Summary');
    await expect(page.getByTestId('stat-pending-sessions')).toBeVisible();
    await expect(page.getByTestId('stat-total-photos')).toBeVisible();
    await expect(page.getByTestId('stat-estimated-space')).toBeVisible();
  });

  test('should display storage reminder alert when sessions exist', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            sessionId: 'session-123',
            deviceInfo: 'iPhone 14',
            photoCount: 25,
            uploadDate: new Date().toISOString(),
            cleanupConfirmed: false,
            reminderSent: false,
          },
        ]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('alert-storage-reminder')).toBeVisible();
    await expect(page.getByTestId('text-alert-title')).toContainText('Storage Reminder');
  });

  test('should display empty state when no pending sessions', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('card-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-title')).toHaveText('All Caught Up!');
    await expect(page.getByTestId('text-empty-description')).toContainText('well managed');
  });

  test('should display error state on failed API call', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-error-container')).toBeVisible();
    await expect(page.getByTestId('text-error-title')).toContainText('Failed to Load');
    await expect(page.getByTestId('button-retry')).toBeVisible();
  });

  test('should retry on error', async ({ page }) => {
    let callCount = 0;
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    });

    await page.reload();
    await page.getByTestId('button-retry').click();
    await expect(page.getByTestId('card-empty-state')).toBeVisible();
  });

  test('should display session list with details', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'session-1',
            sessionId: 'abc123',
            deviceInfo: 'iPhone 14 Pro',
            photoCount: 50,
            uploadDate: new Date().toISOString(),
            cleanupConfirmed: false,
            reminderSent: true,
          },
        ]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('card-session-session-1')).toBeVisible();
    await expect(page.getByTestId('text-device-0')).toContainText('iPhone');
    await expect(page.getByTestId('text-photo-count-0')).toContainText('50');
  });

  test('should show storage estimation correctly', async ({ page }) => {
    await expect(page.getByTestId('text-space-estimate')).toBeVisible();
    // Verify format (MB or GB)
    const spaceText = await page.getByTestId('text-space-estimate').textContent();
    expect(spaceText).toMatch(/MB|GB/);
  });

  test('should display device icons correctly', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            deviceInfo: 'iPhone 14',
            photoCount: 20,
            uploadDate: new Date().toISOString(),
            cleanupConfirmed: false,
          },
          {
            id: '2',
            deviceInfo: 'Android Pixel',
            photoCount: 30,
            uploadDate: new Date().toISOString(),
            cleanupConfirmed: false,
          },
        ]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('icon-device-ios')).toBeVisible();
    await expect(page.getByTestId('icon-device-android')).toBeVisible();
  });

  test('should open cleanup confirmation dialog', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'session-1',
            photoCount: 25,
            uploadDate: new Date().toISOString(),
            cleanupConfirmed: false,
          },
        ]),
      });
    });

    await page.reload();
    await page.getByTestId('button-confirm-session-1').click();
    
    await expect(page.getByTestId('dialog-confirm-cleanup')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toContainText('Confirm Device Cleanup');
  });

  test('should confirm cleanup and show success toast', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions/*/confirm', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.getByTestId('button-confirm-session-1').click();
    await page.getByTestId('button-confirm-cleanup').click();
    
    await expect(page.locator('text=Cleanup Confirmed')).toBeVisible({ timeout: 3000 });
  });

  test('should handle cleanup confirmation error', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions/*/confirm', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.getByTestId('button-confirm-session-1').click();
    await page.getByTestId('button-confirm-cleanup').click();
    
    await expect(page.locator('text=Confirmation Failed')).toBeVisible({ timeout: 3000 });
  });

  test('should select individual sessions', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: '1', photoCount: 20, uploadDate: new Date().toISOString(), cleanupConfirmed: false },
          { id: '2', photoCount: 30, uploadDate: new Date().toISOString(), cleanupConfirmed: false },
        ]),
      });
    });

    await page.reload();
    await page.getByTestId('checkbox-session-1').click();
    await expect(page.getByTestId('badge-selected-count')).toHaveText('1 selected');
  });

  test('should select all sessions', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: '1', photoCount: 20, uploadDate: new Date().toISOString(), cleanupConfirmed: false },
          { id: '2', photoCount: 30, uploadDate: new Date().toISOString(), cleanupConfirmed: false },
        ]),
      });
    });

    await page.reload();
    await page.getByTestId('button-select-all').click();
    await expect(page.getByTestId('badge-selected-count')).toHaveText('2 selected');
  });

  test('should deselect all sessions', async ({ page }) => {
    await page.getByTestId('button-select-all').click();
    await page.getByTestId('button-deselect-all').click();
    await expect(page.getByTestId('badge-selected-count')).not.toBeVisible();
  });

  test('should bulk confirm selected sessions', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions/*/confirm', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.getByTestId('button-select-all').click();
    await page.getByTestId('button-bulk-confirm').click();
    
    await expect(page.locator('text=Bulk Cleanup Confirmed')).toBeVisible({ timeout: 3000 });
  });

  test('should display cleanup tips card', async ({ page }) => {
    await expect(page.getByTestId('card-tips')).toBeVisible();
    await expect(page.getByTestId('text-tips-title')).toContainText('Storage Management Tips');
    await expect(page.getByTestId('list-tips')).toBeVisible();
    await expect(page.getByTestId('tip-1')).toBeVisible();
  });

  test('should show progress bar for storage usage', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: '1', photoCount: 100, uploadDate: new Date().toISOString(), cleanupConfirmed: false },
        ]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-storage-progress')).toBeVisible();
    await expect(page.getByTestId('progress-storage')).toBeVisible();
  });

  test('should format dates correctly', async ({ page }) => {
    await page.route('/api/photos/cleanup-sessions', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            photoCount: 20,
            uploadDate: '2024-01-15T10:00:00Z',
            cleanupConfirmed: false,
          },
        ]),
      });
    });

    await page.reload();
    const dateText = await page.getByTestId('text-upload-time-0').textContent();
    expect(dateText).toContain('ago');
  });

  test('should have all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = [
      'text-page-title',
      'card-summary',
      'text-summary-title',
      'stat-pending-sessions',
      'stat-total-photos',
      'card-tips',
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeAttached();
    }
  });
});
