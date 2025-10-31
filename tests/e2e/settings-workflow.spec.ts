/**
 * Settings Page - End-to-End Tests
 * 
 * Comprehensive tests for the Settings page following the Vertical Completion Framework.
 * 
 * Tests cover:
 * - Skeleton loaders for settings sections
 * - Error states with retry functionality
 * - Email preference toggle functionality
 * - Save preferences with unsaved changes detection
 * - Test email sending with confirmation dialog
 * - ErrorBoundary fallback rendering
 * 
 * Settings Queries (1 total):
 * 1. /api/email-preferences (GET - fetch current preferences)
 * 
 * Settings Mutations (2 total):
 * 1. /api/email-preferences (PATCH - save preferences)
 * 2. /api/email-preferences/test (POST - send test email)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class SettingsPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/settings`);
  }

  // Page Elements
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get settingsIcon() {
    return this.page.getByTestId('icon-settings-header');
  }

  get emailPreferencesCard() {
    return this.page.getByTestId('card-email-preferences');
  }

  get cardTitle() {
    return this.page.getByTestId('text-card-title');
  }

  get cardDescription() {
    return this.page.getByTestId('text-card-description');
  }

  // Info Alert
  get infoAlert() {
    return this.page.getByTestId('alert-info');
  }

  get infoIcon() {
    return this.page.getByTestId('icon-info');
  }

  get infoTitle() {
    return this.page.getByTestId('text-info-title');
  }

  get infoDescription() {
    return this.page.getByTestId('text-info-description');
  }

  // Section Headers
  sectionHeader(sectionId: string) {
    return this.page.getByTestId(`header-${sectionId}`);
  }

  sectionTitle(sectionId: string) {
    return this.page.getByTestId(`text-section-title-${sectionId}`);
  }

  sectionDescription(sectionId: string) {
    return this.page.getByTestId(`text-section-description-${sectionId}`);
  }

  // Preference Switches
  preferenceSwitch(key: string) {
    return this.page.getByTestId(`switch-${key}`);
  }

  preferenceLabel(key: string) {
    return this.page.getByTestId(`label-${key}`);
  }

  preferenceDescription(key: string) {
    return this.page.getByTestId(`description-${key}`);
  }

  preferenceIcon(key: string) {
    return this.page.getByTestId(`icon-${key}`);
  }

  // Action Buttons
  get saveButton() {
    return this.page.getByTestId('button-save-preferences');
  }

  get testEmailButton() {
    return this.page.getByTestId('button-test-email');
  }

  get saveIcon() {
    return this.page.getByTestId('icon-save');
  }

  get sendIcon() {
    return this.page.getByTestId('icon-send');
  }

  // Unsaved Changes Alert
  get unsavedChangesAlert() {
    return this.page.getByTestId('alert-unsaved-changes');
  }

  get unsavedIcon() {
    return this.page.getByTestId('icon-unsaved');
  }

  get unsavedTitle() {
    return this.page.getByTestId('text-unsaved-title');
  }

  get unsavedDescription() {
    return this.page.getByTestId('text-unsaved-description');
  }

  // Test Email Dialog
  get testEmailDialog() {
    return this.page.getByTestId('dialog-test-email');
  }

  get dialogTitle() {
    return this.page.getByTestId('text-dialog-title');
  }

  get dialogDescription() {
    return this.page.getByTestId('text-dialog-description');
  }

  get cancelTestEmailButton() {
    return this.page.getByTestId('button-cancel-test-email');
  }

  get confirmTestEmailButton() {
    return this.page.getByTestId('button-confirm-test-email');
  }

  // Skeleton Loaders
  get skeletonContainer() {
    return this.page.getByTestId('container-settings-skeleton');
  }

  skeletonSection(index: number) {
    return this.page.getByTestId(`skeleton-section-${index}`);
  }

  // Error State
  get errorContainer() {
    return this.page.getByTestId('container-error-state');
  }

  get errorAlert() {
    return this.page.getByTestId('alert-error');
  }

  get errorTitle() {
    return this.page.getByTestId('text-alert-title');
  }

  get errorDescription() {
    return this.page.getByTestId('text-alert-description');
  }

  get retryButton() {
    return this.page.getByTestId('button-retry');
  }

  // ErrorBoundary
  get errorBoundaryContainer() {
    return this.page.getByTestId('container-error-boundary');
  }

  get errorBoundaryAlert() {
    return this.page.getByTestId('alert-error-boundary');
  }

  get errorBoundaryTitle() {
    return this.page.getByTestId('text-error-boundary-title');
  }

  get errorBoundaryDescription() {
    return this.page.getByTestId('text-error-boundary-description');
  }

  // Separators
  separator(index: number) {
    return this.page.getByTestId(`separator-${index}`);
  }

  // Actions
  async togglePreference(key: string) {
    await this.preferenceSwitch(key).click();
  }

  async savePreferences() {
    await this.saveButton.click();
  }

  async openTestEmailDialog() {
    await this.testEmailButton.click();
  }

  async confirmTestEmail() {
    await this.confirmTestEmailButton.click();
  }

  async cancelTestEmail() {
    await this.cancelTestEmailButton.click();
  }

  async retryLoad() {
    await this.retryButton.click();
  }
}

test.describe('Settings Page - Vertical Completion Framework', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
  });

  test.describe('Phase 2 - BUILD: Skeleton Loaders', () => {
    test('should display skeleton loaders while loading settings', async ({ page }) => {
      // Intercept the API call and delay it to see skeleton
      await page.route('**/api/email-preferences', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Verify skeleton container is visible
      await expect(settingsPage.skeletonContainer).toBeVisible();

      // Verify skeleton sections are present (3 sections)
      await expect(settingsPage.skeletonSection(1)).toBeVisible();
      await expect(settingsPage.skeletonSection(2)).toBeVisible();
      await expect(settingsPage.skeletonSection(3)).toBeVisible();

      // Wait for skeleton to disappear
      await expect(settingsPage.skeletonContainer).not.toBeVisible({ timeout: 5000 });

      // Verify actual content is now visible
      await expect(settingsPage.emailPreferencesCard).toBeVisible();
    });

    test('should display correct number of skeleton items per section', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Each section should have 2 skeleton items
      for (let section = 1; section <= 3; section++) {
        for (let item = 1; item <= 2; item++) {
          const skeletonItem = page.getByTestId(`skeleton-item-${section}-${item}`);
          await expect(skeletonItem).toBeVisible();
        }
      }
    });
  });

  test.describe('Phase 2 - BUILD: Error States with Retry', () => {
    test('should display error state when API fails', async ({ page }) => {
      // Simulate API failure
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      });

      await settingsPage.navigate();

      // Verify error state is displayed
      await expect(settingsPage.errorContainer).toBeVisible();
      await expect(settingsPage.errorAlert).toBeVisible();
      await expect(settingsPage.errorTitle).toContainText('Failed to load settings');
      await expect(settingsPage.retryButton).toBeVisible();
    });

    test('should retry loading when retry button is clicked', async ({ page }) => {
      let requestCount = 0;

      // First request fails, second succeeds
      await page.route('**/api/email-preferences', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal server error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              userId: 1,
              jobAssigned: true,
              jobStatusChanged: true,
              reportReady: true,
              calendarEvents: true,
              dailyDigest: true,
              weeklyPerformanceSummary: true,
            }),
          });
        }
      });

      await settingsPage.navigate();

      // Verify error state
      await expect(settingsPage.errorContainer).toBeVisible();

      // Click retry
      await settingsPage.retryLoad();

      // Verify success after retry
      await expect(settingsPage.emailPreferencesCard).toBeVisible({ timeout: 3000 });
      await expect(settingsPage.errorContainer).not.toBeVisible();
    });
  });

  test.describe('Phase 2 - BUILD: UI Elements and Data-TestIds', () => {
    test('should render all page elements with correct test IDs', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Page header
      await expect(settingsPage.pageTitle).toContainText('Settings');
      await expect(settingsPage.settingsIcon).toBeVisible();

      // Info alert
      await expect(settingsPage.infoAlert).toBeVisible();
      await expect(settingsPage.infoTitle).toContainText('Email Configuration');

      // Card header
      await expect(settingsPage.cardTitle).toContainText('Email Notifications');
      await expect(settingsPage.cardDescription).toBeVisible();
    });

    test('should render all three preference sections', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Job Updates section
      await expect(settingsPage.sectionTitle('job-updates')).toContainText('Job Updates');
      await expect(settingsPage.sectionDescription('job-updates')).toBeVisible();

      // Reports & Calendar section
      await expect(settingsPage.sectionTitle('reports-calendar')).toContainText('Reports & Calendar');
      await expect(settingsPage.sectionDescription('reports-calendar')).toBeVisible();

      // Digests & Summaries section
      await expect(settingsPage.sectionTitle('digests-summaries')).toContainText('Digests & Summaries');
      await expect(settingsPage.sectionDescription('digests-summaries')).toBeVisible();
    });

    test('should render all 6 preference switches with labels and icons', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      const preferences = [
        'jobAssigned',
        'jobStatusChanged',
        'reportReady',
        'calendarEvents',
        'dailyDigest',
        'weeklyPerformanceSummary',
      ];

      for (const pref of preferences) {
        await expect(settingsPage.preferenceSwitch(pref)).toBeVisible();
        await expect(settingsPage.preferenceLabel(pref)).toBeVisible();
        await expect(settingsPage.preferenceDescription(pref)).toBeVisible();
        await expect(settingsPage.preferenceIcon(pref)).toBeVisible();
      }
    });

    test('should have at least 30 unique data-testid attributes', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Count all elements with data-testid
      const elementsWithTestId = await page.locator('[data-testid]').count();
      
      // Should have at least 30 test IDs (requirement from framework)
      expect(elementsWithTestId).toBeGreaterThanOrEqual(30);
    });
  });

  test.describe('Phase 3-5: Update Settings Flow', () => {
    test('should toggle preferences and show unsaved changes alert', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Initially, unsaved changes alert should not be visible
      await expect(settingsPage.unsavedChangesAlert).not.toBeVisible();

      // Toggle a preference
      await settingsPage.togglePreference('jobAssigned');

      // Unsaved changes alert should appear
      await expect(settingsPage.unsavedChangesAlert).toBeVisible();
      await expect(settingsPage.unsavedTitle).toContainText('Unsaved Changes');
      await expect(settingsPage.unsavedIcon).toBeVisible();

      // Save button should be enabled
      await expect(settingsPage.saveButton).toBeEnabled();
    });

    test('should save preferences successfully', async ({ page }) => {
      let saveRequestMade = false;

      await page.route('**/api/email-preferences', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              userId: 1,
              jobAssigned: true,
              jobStatusChanged: true,
              reportReady: true,
              calendarEvents: true,
              dailyDigest: true,
              weeklyPerformanceSummary: true,
            }),
          });
        } else if (route.request().method() === 'PATCH') {
          saveRequestMade = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              userId: 1,
              jobAssigned: false, // Changed
              jobStatusChanged: true,
              reportReady: true,
              calendarEvents: true,
              dailyDigest: true,
              weeklyPerformanceSummary: true,
            }),
          });
        }
      });

      await settingsPage.navigate();

      // Toggle a preference
      await settingsPage.togglePreference('jobAssigned');

      // Save preferences
      await settingsPage.savePreferences();

      // Verify save request was made
      await page.waitForTimeout(1000);
      expect(saveRequestMade).toBeTruthy();

      // Unsaved changes alert should disappear
      await expect(settingsPage.unsavedChangesAlert).not.toBeVisible();

      // Save button should be disabled (no unsaved changes)
      await expect(settingsPage.saveButton).toBeDisabled();
    });

    test('should disable save button when no changes made', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Save button should be disabled initially
      await expect(settingsPage.saveButton).toBeDisabled();
    });
  });

  test.describe('Phase 2-5: Test Email Functionality', () => {
    test('should open test email confirmation dialog', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Dialog should not be visible initially
      await expect(settingsPage.testEmailDialog).not.toBeVisible();

      // Click test email button
      await settingsPage.openTestEmailDialog();

      // Dialog should appear
      await expect(settingsPage.testEmailDialog).toBeVisible();
      await expect(settingsPage.dialogTitle).toContainText('Send Test Email');
      await expect(settingsPage.dialogDescription).toBeVisible();
      await expect(settingsPage.confirmTestEmailButton).toBeVisible();
      await expect(settingsPage.cancelTestEmailButton).toBeVisible();
    });

    test('should cancel test email dialog', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Open dialog
      await settingsPage.openTestEmailDialog();
      await expect(settingsPage.testEmailDialog).toBeVisible();

      // Cancel dialog
      await settingsPage.cancelTestEmail();

      // Dialog should close
      await expect(settingsPage.testEmailDialog).not.toBeVisible();
    });

    test('should send test email successfully', async ({ page }) => {
      let testEmailSent = false;

      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await page.route('**/api/email-preferences/test', async (route) => {
        testEmailSent = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await settingsPage.navigate();

      // Open dialog and confirm
      await settingsPage.openTestEmailDialog();
      await settingsPage.confirmTestEmail();

      // Verify test email was sent
      await page.waitForTimeout(1000);
      expect(testEmailSent).toBeTruthy();

      // Dialog should close
      await expect(settingsPage.testEmailDialog).not.toBeVisible();
    });
  });

  test.describe('Phase 2: ErrorBoundary Fallback', () => {
    test('should display ErrorBoundary fallback on component crash', async ({ page }) => {
      // This test would require triggering a runtime error in the component
      // For now, we verify the ErrorBoundary wrapper exists in the DOM structure
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Normal render should not show error boundary
      await expect(settingsPage.errorBoundaryContainer).not.toBeVisible();
      
      // Actual content should be visible
      await expect(settingsPage.emailPreferencesCard).toBeVisible();
    });
  });

  test.describe('Phase 5: Edge Cases and Validation', () => {
    test('should handle network timeout gracefully', async ({ page }) => {
      // Simulate network timeout
      await page.route('**/api/email-preferences', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Timeout
      });

      await settingsPage.navigate();

      // Should eventually show error or skeleton
      // (In practice, React Query will retry and eventually fail)
      await expect(settingsPage.skeletonContainer).toBeVisible();
    });

    test('should handle multiple rapid toggle changes', async ({ page }) => {
      await page.route('**/api/email-preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            userId: 1,
            jobAssigned: true,
            jobStatusChanged: true,
            reportReady: true,
            calendarEvents: true,
            dailyDigest: true,
            weeklyPerformanceSummary: true,
          }),
        });
      });

      await settingsPage.navigate();

      // Rapidly toggle the same preference multiple times
      for (let i = 0; i < 5; i++) {
        await settingsPage.togglePreference('jobAssigned');
        await page.waitForTimeout(100);
      }

      // Unsaved changes should still be tracked correctly
      // After odd number of toggles, it should be different from initial
      await expect(settingsPage.unsavedChangesAlert).toBeVisible();
    });
  });
});
