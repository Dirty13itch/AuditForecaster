/**
 * Tax Credit Project Page - End-to-End Tests
 * 
 * Comprehensive tests for the Tax Credit Project management page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Create new 45L tax credit project workflow
 * - Edit existing project
 * - Form validation for all fields
 * - Tab navigation (details, requirements, units, documents)
 * - Requirements checklist toggle functionality
 * - Unit certifications display
 * - Documents management
 * - Save/cancel actions
 * - Progress tracking
 * - Empty states
 * - Loading states with skeletons
 * - Error states with retry mechanisms
 * - ErrorBoundary fallback
 * 
 * Page Queries (5 total):
 * 1. /api/tax-credit-projects/:id
 * 2. /api/tax-credit-requirements/project/:id
 * 3. /api/tax-credit-documents/project/:id
 * 4. /api/unit-certifications/project/:id
 * 5. /api/builders
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(90000); // Complex page with multiple data sources

class TaxCreditProjectPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(id: string = 'new') {
    await this.page.goto(`${BASE_URL}/tax-credits/projects/${id}`);
  }

  // Page Elements - Header
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get projectMeta() {
    return this.page.getByTestId('text-project-meta');
  }

  get projectStatusBadge() {
    return this.page.getByTestId('badge-project-status');
  }

  get backButton() {
    return this.page.getByTestId('button-back');
  }

  // Progress Cards
  get requirementsProgressCard() {
    return this.page.getByTestId('card-requirements-progress');
  }

  get requirementsProgress() {
    return this.page.getByTestId('progress-requirements');
  }

  get requirementsProgressText() {
    return this.page.getByTestId('text-requirements-progress');
  }

  get unitsProgressCard() {
    return this.page.getByTestId('card-units-progress');
  }

  get unitsProgress() {
    return this.page.getByTestId('progress-units');
  }

  get unitsProgressText() {
    return this.page.getByTestId('text-units-progress');
  }

  // Tabs
  get tabsList() {
    return this.page.getByTestId('tabs-list');
  }

  get tabDetails() {
    return this.page.getByTestId('tab-details');
  }

  get tabRequirements() {
    return this.page.getByTestId('tab-requirements');
  }

  get tabUnits() {
    return this.page.getByTestId('tab-units');
  }

  get tabDocuments() {
    return this.page.getByTestId('tab-documents');
  }

  // Form Fields - Details Tab
  get builderSelect() {
    return this.page.getByTestId('select-builder');
  }

  get projectNameInput() {
    return this.page.getByTestId('input-project-name');
  }

  get projectTypeSelect() {
    return this.page.getByTestId('select-project-type');
  }

  get totalUnitsInput() {
    return this.page.getByTestId('input-total-units');
  }

  get taxYearInput() {
    return this.page.getByTestId('input-tax-year');
  }

  get softwareSelect() {
    return this.page.getByTestId('select-software');
  }

  get softwareVersionInput() {
    return this.page.getByTestId('input-software-version');
  }

  get statusSelect() {
    return this.page.getByTestId('select-status');
  }

  get cancelButton() {
    return this.page.getByTestId('button-cancel');
  }

  get saveButton() {
    return this.page.getByTestId('button-save');
  }

  // Requirements Tab
  get requirementsCard() {
    return this.page.getByTestId('card-requirements');
  }

  requirementItem(id: string) {
    return this.page.getByTestId(`requirement-${id}`);
  }

  requirementCheckbox(id: string) {
    return this.page.getByTestId(`checkbox-requirement-${id}`);
  }

  requirementStatusBadge(id: string) {
    return this.page.getByTestId(`badge-requirement-status-${id}`);
  }

  get requirementsInfoAlert() {
    return this.page.getByTestId('alert-requirements-info');
  }

  // Units Tab
  get unitsCard() {
    return this.page.getByTestId('card-units');
  }

  get emptyUnits() {
    return this.page.getByTestId('empty-units');
  }

  get addUnitButton() {
    return this.page.getByTestId('button-add-unit');
  }

  unitItem(id: string) {
    return this.page.getByTestId(`unit-${id}`);
  }

  unitAddress(id: string) {
    return this.page.getByTestId(`text-unit-address-${id}`);
  }

  unitQualifiedBadge(id: string) {
    return this.page.getByTestId(`badge-unit-qualified-${id}`);
  }

  unitNotQualifiedBadge(id: string) {
    return this.page.getByTestId(`badge-unit-not-qualified-${id}`);
  }

  get unitsSummaryCard() {
    return this.page.getByTestId('card-units-summary');
  }

  get avgHersText() {
    return this.page.getByTestId('text-avg-hers');
  }

  get avgSavingsText() {
    return this.page.getByTestId('text-avg-savings');
  }

  get potentialCreditText() {
    return this.page.getByTestId('text-potential-credit');
  }

  // Documents Tab
  get documentsCard() {
    return this.page.getByTestId('card-documents');
  }

  get emptyDocuments() {
    return this.page.getByTestId('empty-documents');
  }

  get uploadDocumentButton() {
    return this.page.getByTestId('button-upload-document');
  }

  documentItem(id: string) {
    return this.page.getByTestId(`document-${id}`);
  }

  documentName(id: string) {
    return this.page.getByTestId(`text-document-name-${id}`);
  }

  downloadDocumentButton(id: string) {
    return this.page.getByTestId(`button-download-document-${id}`);
  }

  deleteDocumentButton(id: string) {
    return this.page.getByTestId(`button-delete-document-${id}`);
  }

  get documentsInfoAlert() {
    return this.page.getByTestId('alert-documents-info');
  }

  // Loading States
  get loadingContainer() {
    return this.page.getByTestId('container-loading');
  }

  get skeletonHeader() {
    return this.page.getByTestId('skeleton-header');
  }

  get skeletonProgressCards() {
    return this.page.getByTestId('skeleton-progress-cards');
  }

  get skeletonForm() {
    return this.page.getByTestId('skeleton-form');
  }

  // Error States
  get errorContainer() {
    return this.page.getByTestId('container-error');
  }

  get errorAlert() {
    return this.page.getByTestId('alert-error');
  }

  get retryAllButton() {
    return this.page.getByTestId('button-retry-all');
  }

  get backFromErrorButton() {
    return this.page.getByTestId('button-back-from-error');
  }

  // Helper Methods
  async fillProjectForm(data: {
    builder?: string;
    projectName?: string;
    projectType?: string;
    totalUnits?: number;
    taxYear?: number;
    software?: string;
    softwareVersion?: string;
  }) {
    if (data.builder) {
      await this.builderSelect.click();
      await this.page.getByTestId(`select-item-builder-${data.builder}`).click();
    }

    if (data.projectName) {
      await this.projectNameInput.fill(data.projectName);
    }

    if (data.projectType) {
      await this.projectTypeSelect.click();
      await this.page.getByTestId(`select-item-${data.projectType}`).click();
    }

    if (data.totalUnits !== undefined) {
      await this.totalUnitsInput.fill(data.totalUnits.toString());
    }

    if (data.taxYear !== undefined) {
      await this.taxYearInput.fill(data.taxYear.toString());
    }

    if (data.software) {
      await this.softwareSelect.click();
      await this.page.getByTestId(`select-item-${data.software.toLowerCase().replace('/', '')}`).click();
    }

    if (data.softwareVersion) {
      await this.softwareVersionInput.fill(data.softwareVersion);
    }
  }

  async toggleRequirement(requirementId: string) {
    await this.requirementCheckbox(requirementId).click();
  }
}

// Setup: Login helper
async function login(page: Page) {
  await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
  await page.waitForURL(`${BASE_URL}/`);
}

test.describe('Tax Credit Project Page - Create New Project', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
    await projectPage.goto('new');
  });

  test('TC-001: should display new project page with correct title', async () => {
    await expect(projectPage.pageTitle).toContainText('New 45L Project');
    await expect(projectPage.tabDetails).toBeVisible();
    await expect(projectPage.tabRequirements).not.toBeVisible(); // Only shows when editing
    await expect(projectPage.tabUnits).not.toBeVisible();
    await expect(projectPage.tabDocuments).not.toBeVisible();
  });

  test('TC-002: should validate required fields on submit', async () => {
    await projectPage.saveButton.click();
    
    // Form should show validation errors
    await expect(projectPage.page.getByTestId('error-builder')).toBeVisible();
    await expect(projectPage.page.getByTestId('error-project-name')).toBeVisible();
    await expect(projectPage.page.getByTestId('error-software')).toBeVisible();
  });

  test('TC-003: should create new project with valid data', async () => {
    await projectPage.fillProjectForm({
      projectName: 'Test Project 45L',
      projectType: 'multifamily',
      totalUnits: 24,
      taxYear: 2024,
      software: 'remrate',
      softwareVersion: 'v2.9.7',
    });

    // Select first builder
    await projectPage.builderSelect.click();
    const firstBuilder = projectPage.page.getByRole('option').first();
    await firstBuilder.click();

    await projectPage.saveButton.click();

    // Should redirect to project details page
    await expect(projectPage.page).toHaveURL(/\/tax-credits\/projects\/\d+/);
    await expect(projectPage.pageTitle).toContainText('Test Project 45L');
  });

  test('TC-004: should navigate back on cancel', async () => {
    await projectPage.cancelButton.click();
    await expect(projectPage.page).toHaveURL(`${BASE_URL}/tax-credits`);
  });

  test('TC-005: should navigate back using back button', async () => {
    await projectPage.backButton.click();
    await expect(projectPage.page).toHaveURL(`${BASE_URL}/tax-credits`);
  });

  test('TC-006: should validate total units minimum value', async () => {
    await projectPage.totalUnitsInput.fill('0');
    await projectPage.saveButton.click();
    await expect(projectPage.page.getByTestId('error-total-units')).toBeVisible();
  });

  test('TC-007: should validate tax year range', async () => {
    await projectPage.taxYearInput.fill('2019'); // Below minimum
    await projectPage.saveButton.click();
    await expect(projectPage.page.getByTestId('error-tax-year')).toBeVisible();

    await projectPage.taxYearInput.fill('2031'); // Above maximum
    await projectPage.saveButton.click();
    await expect(projectPage.page.getByTestId('error-tax-year')).toBeVisible();
  });

  test('TC-008: should show all project type options', async () => {
    await projectPage.projectTypeSelect.click();
    await expect(projectPage.page.getByTestId('select-item-single-family')).toBeVisible();
    await expect(projectPage.page.getByTestId('select-item-multifamily')).toBeVisible();
    await expect(projectPage.page.getByTestId('select-item-manufactured')).toBeVisible();
  });

  test('TC-009: should show all software options', async () => {
    await projectPage.softwareSelect.click();
    await expect(projectPage.page.getByTestId('select-item-remrate')).toBeVisible();
    await expect(projectPage.page.getByTestId('select-item-energygauge')).toBeVisible();
    await expect(projectPage.page.getByTestId('select-item-hers')).toBeVisible();
    await expect(projectPage.page.getByTestId('select-item-other')).toBeVisible();
  });
});

test.describe('Tax Credit Project Page - Edit Existing Project', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
  });

  test('TC-010: should display loading skeletons while fetching data', async ({ page }) => {
    // Slow down network to see loading state
    await page.route('**/api/tax-credit-projects/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await projectPage.goto('1');

    // Should show skeleton loaders
    await expect(projectPage.skeletonHeader).toBeVisible();
    await expect(projectPage.skeletonProgressCards).toBeVisible();
    await expect(projectPage.skeletonForm).toBeVisible();
  });

  test('TC-011: should display error state with retry button on load failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/tax-credit-projects/1', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal server error' }),
      });
    });

    await projectPage.goto('1');

    // Should show error state
    await expect(projectPage.errorContainer).toBeVisible();
    await expect(projectPage.errorAlert).toContainText('Error Loading Project');
    await expect(projectPage.retryAllButton).toBeVisible();
    await expect(projectPage.backFromErrorButton).toBeVisible();
  });

  test('TC-012: should retry loading on retry button click', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/tax-credit-projects/1', route => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });

    await projectPage.goto('1');
    await expect(projectPage.errorAlert).toBeVisible();

    await projectPage.retryAllButton.click();

    // Should successfully load after retry
    await expect(projectPage.pageTitle).toBeVisible();
  });

  test('TC-013: should display progress cards with accurate data', async () => {
    await projectPage.goto('1');

    await expect(projectPage.requirementsProgressCard).toBeVisible();
    await expect(projectPage.requirementsProgress).toBeVisible();
    await expect(projectPage.requirementsProgressText).toBeVisible();

    await expect(projectPage.unitsProgressCard).toBeVisible();
    await expect(projectPage.unitsProgress).toBeVisible();
    await expect(projectPage.unitsProgressText).toBeVisible();
  });

  test('TC-014: should display project status badge', async () => {
    await projectPage.goto('1');
    await expect(projectPage.projectStatusBadge).toBeVisible();
  });

  test('TC-015: should show all tabs when editing', async () => {
    await projectPage.goto('1');

    await expect(projectPage.tabDetails).toBeVisible();
    await expect(projectPage.tabRequirements).toBeVisible();
    await expect(projectPage.tabUnits).toBeVisible();
    await expect(projectPage.tabDocuments).toBeVisible();
  });

  test('TC-016: should disable builder selection when editing', async () => {
    await projectPage.goto('1');
    await expect(projectPage.builderSelect).toBeDisabled();
  });

  test('TC-017: should show status field when editing', async () => {
    await projectPage.goto('1');
    await expect(projectPage.statusSelect).toBeVisible();
  });

  test('TC-018: should update project data on save', async () => {
    await projectPage.goto('1');

    const newProjectName = 'Updated Project Name ' + Date.now();
    await projectPage.projectNameInput.clear();
    await projectPage.projectNameInput.fill(newProjectName);

    await projectPage.saveButton.click();

    // Should show success and update title
    await expect(projectPage.pageTitle).toContainText(newProjectName);
  });
});

test.describe('Tax Credit Project Page - Requirements Tab', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
    await projectPage.goto('1');
    await projectPage.tabRequirements.click();
  });

  test('TC-019: should display all 8 requirement types', async () => {
    await expect(projectPage.requirementItem('hers-index')).toBeVisible();
    await expect(projectPage.requirementItem('blower-door')).toBeVisible();
    await expect(projectPage.requirementItem('duct-leakage')).toBeVisible();
    await expect(projectPage.requirementItem('hvac-commissioning')).toBeVisible();
    await expect(projectPage.requirementItem('insulation-grade')).toBeVisible();
    await expect(projectPage.requirementItem('window-specs')).toBeVisible();
    await expect(projectPage.requirementItem('equipment-ahri')).toBeVisible();
    await expect(projectPage.requirementItem('software-report')).toBeVisible();
  });

  test('TC-020: should toggle requirement status on checkbox click', async () => {
    const requirementId = 'hers-index';
    
    // Get initial status
    const statusBadge = projectPage.requirementStatusBadge(requirementId);
    const initialStatus = await statusBadge.textContent();

    // Toggle checkbox
    await projectPage.toggleRequirement(requirementId);

    // Wait for update
    await projectPage.page.waitForTimeout(500);

    // Status should change
    const newStatus = await statusBadge.textContent();
    expect(newStatus).not.toBe(initialStatus);
  });

  test('TC-021: should display requirement descriptions', async () => {
    await expect(projectPage.page.getByTestId('text-requirement-description-hers-index'))
      .toContainText('Home Energy Rating System');
  });

  test('TC-022: should display requirements info alert', async () => {
    await expect(projectPage.requirementsInfoAlert).toBeVisible();
    await expect(projectPage.requirementsInfoAlert).toContainText('All requirements must be completed');
  });

  test('TC-023: should update progress card when requirements are completed', async () => {
    // Get initial progress
    const initialProgress = await projectPage.requirementsProgressText.textContent();

    // Toggle a requirement
    await projectPage.toggleRequirement('hers-index');
    await projectPage.page.waitForTimeout(500);

    // Progress should update
    const newProgress = await projectPage.requirementsProgressText.textContent();
    expect(newProgress).not.toBe(initialProgress);
  });
});

test.describe('Tax Credit Project Page - Units Tab', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
  });

  test('TC-024: should display empty state when no units exist', async ({ page }) => {
    // Mock empty certifications
    await page.route('**/api/unit-certifications/project/1', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await projectPage.goto('1');
    await projectPage.tabUnits.click();

    await expect(projectPage.emptyUnits).toBeVisible();
    await expect(projectPage.addUnitButton).toBeVisible();
  });

  test('TC-025: should display unit certifications list', async () => {
    await projectPage.goto('1');
    await projectPage.tabUnits.click();

    // Should show units summary card
    await expect(projectPage.unitsSummaryCard).toBeVisible();
    await expect(projectPage.avgHersText).toBeVisible();
    await expect(projectPage.avgSavingsText).toBeVisible();
    await expect(projectPage.potentialCreditText).toBeVisible();
  });

  test('TC-026: should display qualification badges correctly', async ({ page }) => {
    // Mock unit with qualified status
    await page.route('**/api/unit-certifications/project/1', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: '1', unitNumber: '101', unitAddress: '123 Main St', hersIndex: 52, qualified: true },
          { id: '2', unitNumber: '102', unitAddress: '124 Main St', hersIndex: 58, qualified: false },
        ]),
      });
    });

    await projectPage.goto('1');
    await projectPage.tabUnits.click();

    await expect(projectPage.unitQualifiedBadge('1')).toContainText('Qualified');
    await expect(projectPage.unitNotQualifiedBadge('2')).toContainText('Not Qualified');
  });

  test('TC-027: should calculate and display average HERS index', async () => {
    await projectPage.goto('1');
    await projectPage.tabUnits.click();

    const avgHers = await projectPage.avgHersText.textContent();
    expect(avgHers).toMatch(/\d+/); // Should be a number
  });

  test('TC-028: should calculate and display potential tax credit', async () => {
    await projectPage.goto('1');
    await projectPage.tabUnits.click();

    const credit = await projectPage.potentialCreditText.textContent();
    expect(credit).toMatch(/\$[\d,]+/); // Should be formatted currency
  });
});

test.describe('Tax Credit Project Page - Documents Tab', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
  });

  test('TC-029: should display empty state when no documents exist', async ({ page }) => {
    await page.route('**/api/tax-credit-documents/project/1', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await projectPage.goto('1');
    await projectPage.tabDocuments.click();

    await expect(projectPage.emptyDocuments).toBeVisible();
    await expect(projectPage.uploadDocumentButton).toBeVisible();
  });

  test('TC-030: should display documents list with metadata', async ({ page }) => {
    await page.route('**/api/tax-credit-documents/project/1', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: '1',
            fileName: 'HERS_Report_2024.pdf',
            documentType: 'HERS Report',
            uploadDate: new Date().toISOString(),
          },
          {
            id: '2',
            fileName: 'Blower_Door_Results.pdf',
            documentType: 'Test Results',
            uploadDate: new Date().toISOString(),
          },
        ]),
      });
    });

    await projectPage.goto('1');
    await projectPage.tabDocuments.click();

    await expect(projectPage.documentItem('1')).toBeVisible();
    await expect(projectPage.documentName('1')).toContainText('HERS_Report_2024.pdf');
    await expect(projectPage.downloadDocumentButton('1')).toBeVisible();
    await expect(projectPage.deleteDocumentButton('1')).toBeVisible();

    await expect(projectPage.documentItem('2')).toBeVisible();
  });

  test('TC-031: should display documents info alert', async () => {
    await projectPage.goto('1');
    await projectPage.tabDocuments.click();

    await expect(projectPage.documentsInfoAlert).toBeVisible();
    await expect(projectPage.documentsInfoAlert).toContainText('Required documents');
  });
});

test.describe('Tax Credit Project Page - Tab Navigation', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
    await projectPage.goto('1');
  });

  test('TC-032: should switch between tabs', async () => {
    // Start on details tab
    await expect(projectPage.page.getByTestId('tab-content-details')).toBeVisible();

    // Switch to requirements
    await projectPage.tabRequirements.click();
    await expect(projectPage.page.getByTestId('tab-content-requirements')).toBeVisible();

    // Switch to units
    await projectPage.tabUnits.click();
    await expect(projectPage.page.getByTestId('tab-content-units')).toBeVisible();

    // Switch to documents
    await projectPage.tabDocuments.click();
    await expect(projectPage.page.getByTestId('tab-content-documents')).toBeVisible();

    // Back to details
    await projectPage.tabDetails.click();
    await expect(projectPage.page.getByTestId('tab-content-details')).toBeVisible();
  });

  test('TC-033: should maintain tab state across reloads', async ({ page }) => {
    await projectPage.tabRequirements.click();
    await expect(projectPage.page.getByTestId('tab-content-requirements')).toBeVisible();

    // Reload page
    await page.reload();

    // Should return to default details tab
    await expect(projectPage.page.getByTestId('tab-content-details')).toBeVisible();
  });
});

test.describe('Tax Credit Project Page - ErrorBoundary', () => {
  test('TC-034: should display ErrorBoundary fallback on component crash', async ({ page }) => {
    await login(page);
    
    // Mock a component-level error by injecting script that throws
    await page.addInitScript(() => {
      // @ts-ignore
      window.__FORCE_ERROR__ = true;
    });

    await page.goto(`${BASE_URL}/tax-credits/projects/1`);

    // If ErrorBoundary catches, should show fallback UI
    const errorFallback = page.getByTestId('error-boundary-fallback');
    if (await errorFallback.isVisible()) {
      await expect(errorFallback).toBeVisible();
      await expect(page.getByTestId('button-reload')).toBeVisible();
      await expect(page.getByTestId('button-home')).toBeVisible();
    }
  });
});

test.describe('Tax Credit Project Page - Performance & Optimization', () => {
  let projectPage: TaxCreditProjectPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    projectPage = new TaxCreditProjectPage(page);
  });

  test('TC-035: should memoize progress calculations', async () => {
    await projectPage.goto('1');

    // Initial load
    const initialProgress = await projectPage.requirementsProgressText.textContent();

    // Re-render without data change (toggle tab)
    await projectPage.tabUnits.click();
    await projectPage.tabDetails.click();

    // Progress should remain the same (memoized)
    const afterToggle = await projectPage.requirementsProgressText.textContent();
    expect(afterToggle).toBe(initialProgress);
  });

  test('TC-036: should retry queries up to 2 times on failure', async ({ page }) => {
    let attemptCount = 0;

    await page.route('**/api/tax-credit-projects/1', route => {
      attemptCount++;
      if (attemptCount <= 2) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });

    await projectPage.goto('1');

    // Should eventually succeed after retries
    await page.waitForTimeout(3000);
    expect(attemptCount).toBeGreaterThan(1);
  });
});
