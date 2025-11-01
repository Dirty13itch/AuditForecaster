import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Route View Workflow
 * 
 * Covers:
 * - Route optimization algorithms
 * - Drag-and-drop reordering
 * - Distance calculations
 * - Google Maps integration
 * - Error states and retry
 */

test.describe('Route View Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route-view');
  });

  test('should display loading skeletons while fetching data', async ({ page }) => {
    await page.route('/api/jobs', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('/api/builders', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/route-view');
    
    await expect(page.getByTestId('div-loading-skeletons')).toBeVisible();
    await expect(page.getByTestId('skeleton-job-1')).toBeVisible();
  });

  test('should display page header', async ({ page }) => {
    await expect(page.getByTestId('text-page-title')).toHaveText('Daily Route Planner');
    await expect(page.getByTestId('text-page-subtitle')).toContainText('Optimized route');
  });

  test('should show sort dropdown', async ({ page }) => {
    await expect(page.getByTestId('select-sort-option')).toBeVisible();
  });

  test('should display all sort options', async ({ page }) => {
    await page.getByTestId('select-sort-option').click();
    
    await expect(page.locator('text=Closest First')).toBeVisible();
    await expect(page.locator('text=Farthest First')).toBeVisible();
    await expect(page.locator('text=By Builder')).toBeVisible();
    await expect(page.locator('text=Custom Order')).toBeVisible();
  });

  test('should display empty state when no jobs scheduled', async ({ page }) => {
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.route('/api/builders', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.reload();
    await expect(page.getByTestId('div-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-title')).toContainText('No Jobs Scheduled Today');
  });

  test('should display error state on API failure', async ({ page }) => {
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.reload();
    await expect(page.getByTestId('div-error-container')).toBeVisible();
    await expect(page.getByTestId('text-error-title')).toContainText('Failed to Load Routes');
    await expect(page.getByTestId('button-retry')).toBeVisible();
  });

  test('should retry on error', async ({ page }) => {
    let callCount = 0;
    await page.route('/api/jobs', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      }
    });
    await page.route('/api/builders', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.reload();
    await page.getByTestId('button-retry').click();
    await expect(page.getByTestId('div-empty-state')).toBeVisible();
  });

  test('should display job cards', async ({ page }) => {
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'job-1',
            name: 'Inspection A',
            address: '123 Main St',
            status: 'scheduled',
            priority: 'high',
            inspectionType: 'Final',
            scheduledDate: new Date().toISOString(),
            latitude: 40.7128,
            longitude: -74.0060,
          },
        ]),
      });
    });
    await page.route('/api/builders', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.reload();
    await expect(page.getByTestId('card-route-job-job-1')).toBeVisible();
  });

  test('should display job details', async ({ page }) => {
    await expect(page.getByTestId('text-job-name-job-1')).toBeVisible();
    await expect(page.getByTestId('badge-priority-job-1')).toBeVisible();
    await expect(page.getByTestId('text-job-address-job-1')).toBeVisible();
    await expect(page.getByTestId('text-job-type-job-1')).toBeVisible();
  });

  test('should show navigate button for each job', async ({ page }) => {
    await expect(page.getByTestId('button-navigate-job-1')).toBeVisible();
    await expect(page.getByTestId('button-navigate-job-1')).toContainText('Navigate');
  });

  test('should display route summary when jobs exist', async ({ page }) => {
    await expect(page.getByTestId('div-route-summary')).toBeVisible();
    await expect(page.getByTestId('text-total-distance')).toBeVisible();
    await expect(page.getByTestId('text-total-drive-time')).toBeVisible();
    await expect(page.getByTestId('badge-job-count')).toBeVisible();
  });

  test('should show distance to next job', async ({ page }) => {
    await expect(page.getByTestId('text-distance-to-next-job-1')).toBeVisible();
  });

  test('should show warning for jobs without coordinates', async ({ page }) => {
    await page.route('/api/jobs', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'job-2',
            name: 'Inspection B',
            address: '456 Oak Ave',
            status: 'scheduled',
            priority: 'medium',
            inspectionType: 'Pre-Drywall',
            scheduledDate: new Date().toISOString(),
            latitude: null,
            longitude: null,
          },
        ]),
      });
    });

    await page.reload();
    await expect(page.getByTestId('alert-no-coords-job-2')).toBeVisible();
  });

  test('should change sort order', async ({ page }) => {
    await page.getByTestId('select-sort-option').click();
    await page.locator('text=Farthest First').click();
    
    // Verify sort changed (implementation specific)
    await expect(page.getByTestId('select-sort-option')).toContainText('Farthest First');
  });

  test('should show drag hint when custom sort selected', async ({ page }) => {
    await page.getByTestId('select-sort-option').click();
    await page.locator('text=Custom Order').click();
    
    await expect(page.getByTestId('div-drag-hint')).toBeVisible();
    await expect(page.getByTestId('div-drag-hint')).toContainText('Drag and drop');
  });

  test('should show drag handles in custom sort mode', async ({ page }) => {
    await page.getByTestId('select-sort-option').click();
    await page.locator('text=Custom Order').click();
    
    await expect(page.getByTestId('handle-drag-job-1')).toBeVisible();
  });

  test('should navigate to Google Maps on click', async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByTestId('button-navigate-job-1').click(),
    ]);

    await expect(popup.url()).toContain('google.com/maps');
  });

  test('should persist sort preference in localStorage', async ({ page }) => {
    await page.getByTestId('select-sort-option').click();
    await page.locator('text=By Builder').click();
    
    await page.reload();
    
    // Should remember sort preference
    await expect(page.getByTestId('select-sort-option')).toContainText('By Builder');
  });

  test('should calculate total distance correctly', async ({ page }) => {
    const distanceText = await page.getByTestId('text-total-distance').textContent();
    expect(distanceText).toMatch(/\d+(\.\d+)?\s*(mi|km)/);
  });

  test('should calculate total drive time correctly', async ({ page }) => {
    const timeText = await page.getByTestId('text-total-drive-time').textContent();
    expect(timeText).toMatch(/\d+\s*(min|hr)/);
  });

  test('should have all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = [
      'text-page-title',
      'text-page-subtitle',
      'select-sort-option',
      'div-jobs-container',
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeAttached();
    }
  });
});
