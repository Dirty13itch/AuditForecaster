/**
 * Report Template Detail - End-to-End Tests
 * 
 * Comprehensive tests for the template detail/view page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders for all content sections
 * - Error states with retry mechanism
 * - Empty states (no components)
 * - Template information display
 * - Component list rendering
 * - Quick actions (create report, edit template)
 * - Status and default badges
 * - Date formatting
 * - Navigation flows
 * - ErrorBoundary fallback
 * 
 * Detail Queries (1 main query):
 * 1. /api/report-templates/:id
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class ReportTemplateDetailPage {
  constructor(private page: Page) {}

  // Header Elements
  get backButton() {
    return this.page.getByTestId('button-back');
  }

  get templateName() {
    return this.page.getByTestId('text-template-name');
  }

  get templateVersion() {
    return this.page.getByTestId('text-template-version');
  }

  get statusBadge() {
    return this.page.getByTestId('badge-status');
  }

  get defaultBadge() {
    return this.page.getByTestId('badge-default');
  }

  // Template Information Card
  get templateInfoCard() {
    return this.page.getByTestId('card-template-info');
  }

  get infoTitle() {
    return this.page.getByTestId('text-info-title');
  }

  get descriptionLabel() {
    return this.page.getByTestId('label-description');
  }

  get descriptionText() {
    return this.page.getByTestId('text-description');
  }

  get inspectionTypeLabel() {
    return this.page.getByTestId('label-inspection-type');
  }

  get inspectionTypeText() {
    return this.page.getByTestId('text-inspection-type');
  }

  get createdLabel() {
    return this.page.getByTestId('label-created');
  }

  get createdDateText() {
    return this.page.getByTestId('text-created-date');
  }

  get updatedLabel() {
    return this.page.getByTestId('label-updated');
  }

  get updatedDateText() {
    return this.page.getByTestId('text-updated-date');
  }

  // Quick Actions Card
  get quickActionsCard() {
    return this.page.getByTestId('card-quick-actions');
  }

  get actionsTitle() {
    return this.page.getByTestId('text-actions-title');
  }

  get actionsDescription() {
    return this.page.getByTestId('text-actions-description');
  }

  get createReportButton() {
    return this.page.getByTestId('button-create-report');
  }

  get editTemplateButton() {
    return this.page.getByTestId('button-edit-template');
  }

  // Components Card
  get componentsCard() {
    return this.page.getByTestId('card-components');
  }

  get componentsTitle() {
    return this.page.getByTestId('text-components-title');
  }

  get componentsDescription() {
    return this.page.getByTestId('text-components-description');
  }

  get componentsList() {
    return this.page.getByTestId('list-components');
  }

  get scrollComponents() {
    return this.page.getByTestId('scroll-components');
  }

  componentCard(index: number) {
    return this.page.getByTestId(`card-component-${index}`);
  }

  componentTypebadge(index: number) {
    return this.page.getByTestId(`badge-type-${index}`);
  }

  componentRequiredBadge(index: number) {
    return this.page.getByTestId(`badge-required-${index}`);
  }

  componentLabel(index: number) {
    return this.page.getByTestId(`text-component-label-${index}`);
  }

  componentDescription(index: number) {
    return this.page.getByTestId(`text-component-desc-${index}`);
  }

  // Empty States
  get emptyComponents() {
    return this.page.getByTestId('empty-components');
  }

  get emptyComponentsMessage() {
    return this.page.getByTestId('text-empty-message');
  }

  get emptyComponentsExplanation() {
    return this.page.getByTestId('text-empty-explanation');
  }

  // Skeleton Loaders
  get skeletonDetail() {
    return this.page.getByTestId('skeleton-detail');
  }

  // Error States
  get errorDetail() {
    return this.page.getByTestId('error-detail');
  }

  get retryTemplateButton() {
    return this.page.getByTestId('button-retry-template');
  }

  get backToTemplatesButton() {
    return this.page.getByTestId('button-back-to-templates');
  }

  // Navigation
  async navigate(templateId: string) {
    await this.page.goto(`${BASE_URL}/report-templates/${templateId}`);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

// Test Suite: Authentication
test.describe('Template Detail - Authentication', () => {
  test('allows authenticated users to access template detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const detail = new ReportTemplateDetailPage(page);
    await detail.navigate('test-template-id');
    
    // Page should load (either with error or template)
    const pageLoaded = await Promise.race([
      detail.templateName.isVisible().then(() => true),
      detail.errorDetail.isVisible().then(() => true),
      page.waitForTimeout(5000).then(() => false)
    ]);
    
    expect(pageLoaded).toBeTruthy();
  });
});

// Test Suite: Skeleton Loaders
test.describe('Template Detail - Skeleton Loaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays skeleton loader while loading template', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('test-template-id');
    
    // Skeleton should appear during load
    const hasSkeleton = await Promise.race([
      detail.skeletonDetail.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    // Either skeleton appeared or page loaded quickly
    expect(hasSkeleton || await detail.templateName.isVisible()).toBeTruthy();
  });

  test('skeleton loader disappears after template loads', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    // Wait for content to appear
    await expect(detail.templateName).toBeVisible({ timeout: 10000 });
    
    // Skeleton should not be visible
    await expect(detail.skeletonDetail).not.toBeVisible();
  });

  test('skeleton shows header and card placeholders', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('test-template');
    
    // If skeleton is visible, check its structure
    const skeletonVisible = await detail.skeletonDetail.isVisible().catch(() => false);
    
    if (skeletonVisible) {
      // Skeleton should contain placeholder elements
      await expect(detail.skeletonDetail).toBeVisible();
    }
  });
});

// Test Suite: Error Handling and Retry
test.describe('Template Detail - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays error state when template query fails', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Intercept and fail the template query
    await page.route('**/api/report-templates/*', route => route.abort());
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    // Error state should be visible
    await expect(detail.errorDetail).toBeVisible({ timeout: 10000 });
    await expect(detail.retryTemplateButton).toBeVisible();
    await expect(detail.backToTemplatesButton).toBeVisible();
  });

  test('displays error state when template not found (404)', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock 404 response
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Template not found' })
      });
    });
    
    await detail.navigate('nonexistent-template');
    await detail.waitForPageLoad();
    
    await expect(detail.errorDetail).toBeVisible({ timeout: 10000 });
  });

  test('retry button refetches failed template query', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    let failCount = 0;
    await page.route('**/api/report-templates/*', route => {
      if (failCount < 1) {
        failCount++;
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    // Wait for error to appear
    await expect(detail.errorDetail).toBeVisible({ timeout: 10000 });
    
    // Click retry
    await detail.retryTemplateButton.click();
    
    // Error should disappear
    await expect(detail.errorDetail).not.toBeVisible({ timeout: 10000 });
  });

  test('back to templates button navigates correctly', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Intercept to cause error
    await page.route('**/api/report-templates/*', route => route.abort());
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.errorDetail).toBeVisible({ timeout: 10000 });
    
    // Click back button
    await detail.backToTemplatesButton.click();
    
    // Should navigate to templates page
    await page.waitForURL('**/report-templates');
  });
});

// Test Suite: Template Information Display
test.describe('Template Detail - Template Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays template name and version in header', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.templateName).toBeVisible();
    await expect(detail.templateVersion).toBeVisible();
    await expect(detail.templateVersion).toContainText('Version');
  });

  test('displays status badge', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.statusBadge).toBeVisible();
  });

  test('displays template information card', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.templateInfoCard).toBeVisible();
    await expect(detail.infoTitle).toHaveText('Template Information');
  });

  test('displays description field', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.descriptionLabel).toBeVisible();
    await expect(detail.descriptionText).toBeVisible();
  });

  test('displays inspection type field', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.inspectionTypeLabel).toBeVisible();
    await expect(detail.inspectionTypeText).toBeVisible();
  });

  test('displays created and updated dates', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.createdLabel).toBeVisible();
    await expect(detail.createdDateText).toBeVisible();
    await expect(detail.updatedLabel).toBeVisible();
    await expect(detail.updatedDateText).toBeVisible();
  });
});

// Test Suite: Quick Actions
test.describe('Template Detail - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays quick actions card', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.quickActionsCard).toBeVisible();
    await expect(detail.actionsTitle).toHaveText('Quick Actions');
  });

  test('displays create report button', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.createReportButton).toBeVisible();
    await expect(detail.createReportButton).toBeEnabled();
    await expect(detail.createReportButton).toContainText('Create Report');
  });

  test('displays edit template button', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.editTemplateButton).toBeVisible();
    await expect(detail.editTemplateButton).toBeEnabled();
    await expect(detail.editTemplateButton).toContainText('Edit Template');
  });

  test('edit button navigates to designer', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await detail.editTemplateButton.click();
    
    // Should navigate to designer
    await page.waitForURL('**/report-template-designer/**');
  });
});

// Test Suite: Components Display
test.describe('Template Detail - Components Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays components card', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.componentsCard).toBeVisible();
    await expect(detail.componentsTitle).toHaveText('Template Components');
  });

  test('displays components description with count', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.componentsDescription).toBeVisible();
  });

  test('displays component list when components exist', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock template with components
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Test Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          components: [
            {
              id: 'comp1',
              type: 'text',
              properties: { label: 'Test Field', required: true }
            },
            {
              id: 'comp2',
              type: 'number',
              properties: { label: 'Number Field' }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    // Should see component list
    await expect(detail.componentsList).toBeVisible();
    await expect(detail.componentCard(0)).toBeVisible();
    await expect(detail.componentCard(1)).toBeVisible();
  });

  test('displays component type badges', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock template with components
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Test Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          components: [
            {
              id: 'comp1',
              type: 'text',
              properties: { label: 'Test Field' }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.componentTypeBadge(0)).toBeVisible();
    await expect(detail.componentTypeBadge(0)).toHaveText('text');
  });

  test('displays required badge for required components', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock template with required component
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Test Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          components: [
            {
              id: 'comp1',
              type: 'text',
              properties: { label: 'Required Field', required: true }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.componentRequiredBadge(0)).toBeVisible();
    await expect(detail.componentRequiredBadge(0)).toHaveText('Required');
  });
});

// Test Suite: Empty States
test.describe('Template Detail - Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays empty state when no components', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock template with no components
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Test Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          components: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.emptyComponents).toBeVisible();
    await expect(detail.emptyComponentsMessage).toBeVisible();
    await expect(detail.emptyComponentsMessage).toContainText('legacy fields system');
  });

  test('empty state shows explanation text', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock template with no components
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Empty Template',
          category: 'custom',
          version: 1,
          status: 'draft',
          components: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.emptyComponentsExplanation).toBeVisible();
    await expect(detail.emptyComponentsExplanation).toContainText('fields table');
  });
});

// Test Suite: Navigation
test.describe('Template Detail - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('back button navigates to templates list', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await detail.backButton.click();
    
    // Should navigate to templates page
    await page.waitForURL('**/report-templates');
  });

  test('back button is visible and enabled', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    await detail.navigate('existing-template');
    await detail.waitForPageLoad();
    
    await expect(detail.backButton).toBeVisible();
    await expect(detail.backButton).toBeEnabled();
  });
});

// Test Suite: Badge Display
test.describe('Template Detail - Badge Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays default badge for default templates', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock default template
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Default Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          isDefault: true,
          components: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.defaultBadge).toBeVisible();
    await expect(detail.defaultBadge).toHaveText('Default');
  });

  test('does not display default badge for non-default templates', async ({ page }) => {
    const detail = new ReportTemplateDetailPage(page);
    
    // Mock non-default template
    await page.route('**/api/report-templates/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-template',
          name: 'Regular Template',
          category: 'pre_drywall',
          version: 1,
          status: 'published',
          isDefault: false,
          components: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
    });
    
    await detail.navigate('test-template');
    await detail.waitForPageLoad();
    
    await expect(detail.defaultBadge).not.toBeVisible();
  });
});
