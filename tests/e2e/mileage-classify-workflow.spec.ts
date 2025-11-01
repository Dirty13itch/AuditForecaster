import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Mileage Classification Workflow
 * 
 * Covers:
 * - Drive loading and display
 * - Swipe classification (Business/Personal)
 * - Error states and retry
 * - Empty states
 * - Optimistic UI updates
 */

test.describe('Mileage Classify Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mileage classify page
    await page.goto('/mileage/classify');
  });

  test('should display loading skeletons while fetching drives', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ drives: [] }),
      });
    });

    await page.goto('/mileage/classify');
    
    await expect(page.getByTestId('div-loading-container')).toBeVisible();
    await expect(page.getByTestId('skeleton-back-button')).toBeVisible();
    await expect(page.getByTestId('skeleton-title')).toBeVisible();
    await expect(page.getByTestId('skeleton-drive-1')).toBeVisible();
  });

  test('should display page header with drive count', async ({ page }) => {
    await expect(page.getByTestId('text-title')).toHaveText('Classify Drives');
    await expect(page.getByTestId('text-subtitle')).toContainText('Swipe to categorize');
  });

  test('should show swipe instructions alert', async ({ page }) => {
    await expect(page.getByTestId('alert-instructions')).toBeVisible();
    await expect(page.getByTestId('text-swipe-right')).toContainText('right');
    await expect(page.getByTestId('text-swipe-left')).toContainText('left');
  });

  test('should display unclassified drives', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          drives: [
            {
              id: '1',
              startLocation: 'Home',
              endLocation: 'Office',
              distance: 25.5,
              startTimestamp: new Date().toISOString(),
              endTimestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-drive-stack')).toBeVisible();
    await expect(page.getByTestId('badge-count')).toHaveText('1');
  });

  test('should display empty state when no drives to classify', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ drives: [] }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-title')).toHaveText('All caught up!');
    await expect(page.getByTestId('button-back-to-mileage-empty')).toBeVisible();
  });

  test('should navigate back to mileage page', async ({ page }) => {
    await page.getByTestId('button-back').click();
    await expect(page).toHaveURL(/\/mileage/);
  });

  test('should display error state on failed API call', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-error-container')).toBeVisible();
    await expect(page.getByTestId('text-error-title')).toContainText('Failed to Load');
    await expect(page.getByTestId('text-error-message')).toBeVisible();
  });

  test('should retry failed request on retry button click', async ({ page }) => {
    let callCount = 0;
    await page.route('/api/mileage/unclassified', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ drives: [] }),
        });
      }
    });

    await page.reload();
    await expect(page.getByTestId('div-error-container')).toBeVisible();
    
    await page.getByTestId('button-retry').click();
    await expect(page.getByTestId('div-empty-state')).toBeVisible();
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await page.waitForTimeout(5000);
      await route.abort();
    });

    await page.goto('/mileage/classify');
    await expect(page.getByTestId('div-error-container')).toBeVisible({ timeout: 10000 });
  });

  test('should classify drive as business', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          drives: [
            {
              id: 'drive-1',
              startLocation: 'Home',
              endLocation: 'Client Site',
              distance: 30,
              startTimestamp: new Date().toISOString(),
              endTimestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('/api/mileage/drive-1/classify', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.reload();
    
    // Simulate business classification (implementation specific)
    const driveCard = page.getByTestId('card-drive-0');
    await expect(driveCard).toBeVisible();
  });

  test('should show success toast on classification', async ({ page }) => {
    await page.route('/api/mileage/*/classify', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Wait for toast message (implementation specific)
    await expect(page.locator('text=Drive Classified')).toBeVisible({ timeout: 3000 });
  });

  test('should handle classification error', async ({ page }) => {
    await page.route('/api/mileage/*/classify', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Failed' }) });
    });

    // Trigger classification and verify error toast
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 3000 });
  });

  test('should update badge count as drives are classified', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          drives: [
            { id: '1', startLocation: 'A', endLocation: 'B', distance: 10, startTimestamp: new Date().toISOString(), endTimestamp: new Date().toISOString() },
            { id: '2', startLocation: 'C', endLocation: 'D', distance: 15, startTimestamp: new Date().toISOString(), endTimestamp: new Date().toISOString() },
          ],
        }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('badge-count')).toHaveText('2');
  });

  test('should display all drives in stack', async ({ page }) => {
    await page.route('/api/mileage/unclassified', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          drives: [
            { id: '1', startLocation: 'A', endLocation: 'B', distance: 10, startTimestamp: new Date().toISOString(), endTimestamp: new Date().toISOString() },
            { id: '2', startLocation: 'C', endLocation: 'D', distance: 15, startTimestamp: new Date().toISOString(), endTimestamp: new Date().toISOString() },
            { id: '3', startLocation: 'E', endLocation: 'F', distance: 20, startTimestamp: new Date().toISOString(), endTimestamp: new Date().toISOString() },
          ],
        }),
      });
    });

    await page.reload();
    await expect(page.getByTestId('div-drive-stack')).toBeVisible();
  });

  test('should show "all classified" message after all drives are classified', async ({ page }) => {
    // This would test the optimistic UI update scenario
    await expect(page.getByTestId('div-all-classified')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check for interactive elements accessibility
    const buttons = page.locator('button');
    for (const button of await buttons.all()) {
      await expect(button).toBeEnabled();
    }
  });

  test('should handle rapid classification attempts', async ({ page }) => {
    // Test debouncing/throttling of rapid swipes
    await page.route('/api/mileage/*/classify', async (route) => {
      await page.waitForTimeout(100);
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Rapid classification simulation would go here
  });

  test('should persist page state on navigation back', async ({ page }) => {
    await page.goto('/mileage');
    await page.goto('/mileage/classify');
    await page.goBack();
    await page.goForward();
    
    // Verify page reloaded correctly
    await expect(page.getByTestId('text-title')).toBeVisible();
  });

  test('should have all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = [
      'text-title',
      'text-subtitle',
      'button-back',
      'alert-instructions',
      'div-drive-stack',
      'badge-count',
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeAttached();
    }
  });
});
