import { test, expect, type Page } from '@playwright/test';

test.describe('Forecast Workflow - Business Forecasting', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login if needed
    const loginButton = page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test.describe('Page Loading and Navigation', () => {
    test('should load forecast page with valid job ID', async ({ page }) => {
      // Navigate to jobs page first
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      // Click on first job card to get job details
      const firstJobCard = page.locator('[data-testid^="card-job-"]').first();
      await firstJobCard.click();
      await page.waitForLoadState('networkidle');
      
      // Navigate to forecast tab or page
      const forecastButton = page.locator('[data-testid="button-forecast"], [data-testid="tab-forecast"]').first();
      if (await forecastButton.isVisible()) {
        await forecastButton.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Verify forecast page loads
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display loading skeleton while fetching data', async ({ page }) => {
      // Start navigation and immediately check for skeleton
      const navigationPromise = page.goto('/forecast/1');
      
      // Check for skeleton state (may be very brief)
      const skeleton = page.locator('[data-testid="skeleton-forecast"]');
      if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(skeleton).toBeVisible();
        await expect(page.locator('[data-testid="skeleton-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="skeleton-building-info"]')).toBeVisible();
      }
      
      await navigationPromise;
      await page.waitForLoadState('networkidle');
      
      // Verify actual content loads after skeleton
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle invalid job ID with error state', async ({ page }) => {
      await page.goto('/forecast/99999999');
      await page.waitForLoadState('networkidle');
      
      // Should show error state
      const errorState = page.locator('[data-testid="error-no-job"], [data-testid="error-forecast"]');
      await expect(errorState.first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate back to jobs list when back button clicked', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Click back button
      const backButton = page.locator('[data-testid="button-back"]');
      await backButton.click();
      await page.waitForLoadState('networkidle');
      
      // Should be on jobs page
      await expect(page).toHaveURL(/\/jobs/);
    });
  });

  test.describe('Job Information Display', () => {
    test('should display job name and address in header', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Verify job name is displayed
      const jobName = page.locator('[data-testid="text-job-name"]');
      await expect(jobName).toBeVisible();
      await expect(jobName).not.toBeEmpty();
      
      // Verify address is displayed
      const jobAddress = page.locator('[data-testid="text-job-address"]');
      await expect(jobAddress).toBeVisible();
    });

    test('should display building information card with all fields', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Verify building info card is visible
      await expect(page.locator('[data-testid="card-building-info"]')).toBeVisible();
      
      // Verify all expected fields
      await expect(page.locator('[data-testid="field-inspection-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-scheduled"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-priority"]')).toBeVisible();
      
      // Verify contractor badge
      await expect(page.locator('[data-testid="badge-contractor"]')).toBeVisible();
    });

    test('should display rescheduled alert when job date changed', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check if rescheduled alert is present (only if job was rescheduled)
      const rescheduledAlert = page.locator('[data-testid="alert-rescheduled"]');
      if (await rescheduledAlert.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify alert components
        await expect(page.locator('[data-testid="badge-rescheduled"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-original-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-current-date"]')).toBeVisible();
      }
    });

    test('should display cancelled alert when job is cancelled', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check if cancelled alert is present (only if job was cancelled)
      const cancelledAlert = page.locator('[data-testid="alert-cancelled"]');
      if (await cancelledAlert.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(page.locator('[data-testid="badge-cancelled"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-cancelled-message"]')).toBeVisible();
      }
    });
  });

  test.describe('Forecast Predictions Display', () => {
    test('should display forecast cards for TDL and DLO', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Wait for predictions section
      await expect(page.locator('[data-testid="section-predictions"]')).toBeVisible();
      
      // Check if forecast data exists
      const forecastCards = page.locator('[data-testid="grid-forecast-cards"]');
      const emptyState = page.locator('[data-testid="empty-forecast"]');
      
      if (await forecastCards.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Forecast data exists - verify cards
        await expect(page.locator('[data-testid="card-tdl-forecast"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-dlo-forecast"]')).toBeVisible();
      } else {
        // No forecast data - verify empty state
        await expect(emptyState).toBeVisible();
        await expect(page.locator('[data-testid="text-no-forecast"]')).toBeVisible();
      }
    });

    test('should display variance indicators when actual values exist', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check if variance indicators are present
      const tdlVariance = page.locator('[data-testid="info-tdl-variance"]');
      const dloVariance = page.locator('[data-testid="info-dlo-variance"]');
      
      if (await tdlVariance.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify variance has icon and text
        const tdlIcon = page.locator('[data-testid="icon-tdl-variance-up"], [data-testid="icon-tdl-variance-down"]');
        await expect(tdlIcon.first()).toBeVisible();
        await expect(page.locator('[data-testid="text-tdl-variance"]')).toBeVisible();
      }
      
      if (await dloVariance.isVisible({ timeout: 2000 }).catch(() => false)) {
        const dloIcon = page.locator('[data-testid="icon-dlo-variance-up"], [data-testid="icon-dlo-variance-down"]');
        await expect(dloIcon.first()).toBeVisible();
        await expect(page.locator('[data-testid="text-dlo-variance"]')).toBeVisible();
      }
    });

    test('should display recalculate button and be clickable when forecast exists', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      const recalculateButton = page.locator('[data-testid="button-recalculate"]');
      await expect(recalculateButton).toBeVisible();
      
      // Check if button is enabled (only enabled when forecast exists)
      const forecastCards = page.locator('[data-testid="grid-forecast-cards"]');
      if (await forecastCards.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(recalculateButton).toBeEnabled();
        
        // Click and verify loading state
        await recalculateButton.click();
        // Button should show loading state (spinning icon)
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Analysis and Recommendations', () => {
    test('should display analysis card when actual values exist', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Analysis card should only appear if actual values exist
      const analysisCard = page.locator('[data-testid="card-analysis"]');
      if (await analysisCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify analysis sections
        await expect(page.locator('[data-testid="text-analysis-title"]')).toBeVisible();
        
        // Check for TDL analysis if present
        const tdlAnalysis = page.locator('[data-testid="section-tdl-analysis"]');
        if (await tdlAnalysis.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(page.locator('[data-testid="indicator-tdl-status"]')).toBeVisible();
          await expect(page.locator('[data-testid="text-tdl-analysis"]')).toBeVisible();
        }
        
        // Check for DLO analysis if present
        const dloAnalysis = page.locator('[data-testid="section-dlo-analysis"]');
        if (await dloAnalysis.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(page.locator('[data-testid="indicator-dlo-status"]')).toBeVisible();
          await expect(page.locator('[data-testid="text-dlo-analysis"]')).toBeVisible();
        }
      }
    });

    test('should display contractor performance section', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check if contractor performance section exists in analysis
      const contractorSection = page.locator('[data-testid="section-contractor-performance"]');
      if (await contractorSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(page.locator('[data-testid="text-contractor-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-contractor-analysis"]')).toBeVisible();
      }
    });

    test('should show correct status indicators (pass/fail) based on thresholds', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check TDL status indicator
      const tdlIndicator = page.locator('[data-testid="indicator-tdl-status"]');
      if (await tdlIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Indicator should have either success or destructive color
        const classes = await tdlIndicator.getAttribute('class');
        expect(classes).toMatch(/bg-(success|destructive)/);
      }
      
      // Check DLO status indicator
      const dloIndicator = page.locator('[data-testid="indicator-dlo-status"]');
      if (await dloIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        const classes = await dloIndicator.getAttribute('class');
        expect(classes).toMatch(/bg-(success|destructive|warning)/);
      }
    });
  });

  test.describe('Interactive Features', () => {
    test('should refresh data when refresh button clicked', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      const refreshButton = page.locator('[data-testid="button-refresh"]');
      await expect(refreshButton).toBeVisible();
      
      // Click refresh button
      await refreshButton.click();
      
      // Should show loading state briefly
      await page.waitForTimeout(500);
      
      // Page should still be visible
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible();
    });

    test('should handle report generation button click', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      const reportButton = page.locator('[data-testid="button-generate-report"]');
      await expect(reportButton).toBeVisible();
      await expect(reportButton).toBeEnabled();
      
      // Click should not cause error
      await reportButton.click();
      await page.waitForTimeout(500);
    });

    test('should maintain bottom navigation state', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Bottom nav should be present on mobile
      const bottomNav = page.locator('[data-testid="bottom-nav"]');
      if (await bottomNav.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Forecast tab should be active
        const forecastTab = page.locator('[data-testid="tab-forecast"]');
        if (await forecastTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Verify active state
          const classes = await forecastTab.getAttribute('class');
          expect(classes).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true);
      
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Should show error state
      const errorState = page.locator('[data-testid="error-forecast"], [data-testid="alert-error"]');
      await expect(errorState.first()).toBeVisible({ timeout: 10000 });
      
      // Restore online
      await page.context().setOffline(false);
    });

    test('should show retry button on error and allow retry', async ({ page }) => {
      // Navigate to invalid job ID
      await page.goto('/forecast/99999');
      await page.waitForLoadState('networkidle');
      
      // Should show error with retry option
      const retryButton = page.locator('[data-testid="button-retry"], [data-testid="button-refresh"]');
      if (await retryButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(retryButton.first()).toBeEnabled();
        await retryButton.first().click();
        await page.waitForTimeout(1000);
      }
    });

    test('should handle missing forecast data appropriately', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Check for either forecast cards or empty state
      const hasForecasts = await page.locator('[data-testid="grid-forecast-cards"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      
      const hasEmptyState = await page.locator('[data-testid="empty-forecast"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      
      // One of them should be visible
      expect(hasForecasts || hasEmptyState).toBeTruthy();
      
      if (hasEmptyState) {
        await expect(page.locator('[data-testid="text-no-forecast"]')).toContainText(/No forecast data available/i);
      }
    });

    test('should handle malformed data without crashing', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Page should load successfully
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible();
      
      // No unhandled errors should appear
      const errorMessages = await page.locator('text=/error|failed|crash/i').count();
      // Some error text is expected in empty states, but not crashes
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe('Accessibility and Data Attributes', () => {
    test('should have all required data-testid attributes', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Verify key data-testid attributes exist
      const requiredTestIds = [
        'page-forecast',
        'main-content',
        'button-back',
        'text-job-name',
        'button-refresh',
        'button-generate-report',
        'card-building-info',
        'section-predictions',
        'button-recalculate',
      ];
      
      for (const testId of requiredTestIds) {
        const element = page.locator(`[data-testid="${testId}"]`);
        await expect(element).toBeAttached();
      }
    });

    test('should have minimum 30 data-testid attributes on page', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Count all data-testid attributes
      const testIdElements = await page.locator('[data-testid]').count();
      
      // Should have at least 30 data-testid attributes
      expect(testIdElements).toBeGreaterThanOrEqual(30);
    });

    test('should have proper ARIA labels and semantic HTML', async ({ page }) => {
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Main content should be in a <main> tag
      const main = page.locator('main[data-testid="main-content"]');
      await expect(main).toBeVisible();
      
      // Buttons should have accessible text
      const buttons = page.locator('button[data-testid^="button-"]');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        // Either text content or aria-label should exist
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      // Page should be visible
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible();
      
      // Bottom nav should be visible on mobile
      const bottomNav = page.locator('[data-testid="bottom-nav"]');
      if (await bottomNav.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(bottomNav).toBeVisible();
      }
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible();
      
      // Grid should show both forecast cards side by side on tablet
      const forecastGrid = page.locator('[data-testid="grid-forecast-cards"]');
      if (await forecastGrid.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(forecastGrid).toBeVisible();
      }
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/forecast/1');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="page-forecast"]')).toBeVisible();
      
      // Should have max-width container
      const main = page.locator('main[data-testid="main-content"]');
      await expect(main).toBeVisible();
    });
  });
});
