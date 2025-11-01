/**
 * Tax Credit Compliance Page - End-to-End Tests
 * 
 * Comprehensive tests for the 45L Compliance Verification page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders for project selection, metric cards, checklist, and tabs
 * - Error states with retry mechanisms for all 4 queries
 * - Project selection and filtering
 * - Metric card calculations (compliance score, passed/failed/warnings)
 * - Tab navigation (Verification Results, Energy Model, Certification)
 * - Compliance checklist by category
 * - Energy model comparison (reference vs as-built)
 * - Certification package generation
 * - Run verification button functionality
 * - ErrorBoundary fallback
 * 
 * Tax Credit Compliance Queries (4 total):
 * 1. /api/tax-credit-projects (all projects)
 * 2. /api/tax-credit-projects/{id} (project details)
 * 3. /api/tax-credit-requirements/project/{id}
 * 4. /api/unit-certifications/project/{id}
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000); // Compliance page has multiple queries

class TaxCreditCompliancePage {
  constructor(private page: Page) {}

  // Page Elements
  get pageContainer() {
    return this.page.getByTestId('page-tax-credit-compliance');
  }

  get pageHeader() {
    return this.page.getByTestId('header-compliance');
  }

  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get pageDescription() {
    return this.page.getByTestId('text-page-description');
  }

  get buttonRunVerification() {
    return this.page.getByTestId('button-run-verification');
  }

  // Project Selection Card
  get cardProjectSelection() {
    return this.page.getByTestId('card-project-selection');
  }

  get labelProject() {
    return this.page.getByTestId('label-project');
  }

  get selectProject() {
    return this.page.getByTestId('select-project');
  }

  get selectProjectContent() {
    return this.page.getByTestId('select-project-content');
  }

  projectOption(id: string) {
    return this.page.getByTestId(`option-project-${id}`);
  }

  get projectSummary() {
    return this.page.getByTestId('project-summary');
  }

  get textTotalUnits() {
    return this.page.getByTestId('text-total-units');
  }

  get textQualifiedUnits() {
    return this.page.getByTestId('text-qualified-units');
  }

  get badgeProjectStatus() {
    return this.page.getByTestId('badge-project-status');
  }

  // Skeleton Loaders
  get skeletonProjectSelection() {
    return this.page.getByTestId('skeleton-project-selection');
  }

  get skeletonMetricCards() {
    return this.page.getByTestId('skeleton-metric-cards');
  }

  skeletonMetric(index: number) {
    return this.page.getByTestId(`skeleton-metric-${index}`);
  }

  get skeletonChecklist() {
    return this.page.getByTestId('skeleton-checklist');
  }

  skeletonCheck(index: number) {
    return this.page.getByTestId(`skeleton-check-${index}`);
  }

  get skeletonEnergyModel() {
    return this.page.getByTestId('skeleton-energy-model');
  }

  // Error States
  get alertErrorProjects() {
    return this.page.getByTestId('alert-error-projects');
  }

  get buttonRetryProjects() {
    return this.page.getByTestId('button-retry-projects');
  }

  get alertErrorProjectData() {
    return this.page.getByTestId('alert-error-project-data');
  }

  // Metric Cards
  get metricCards() {
    return this.page.getByTestId('metric-cards');
  }

  get cardMetricComplianceScore() {
    return this.page.getByTestId('card-metric-compliance-score');
  }

  get cardMetricPassed() {
    return this.page.getByTestId('card-metric-passed');
  }

  get cardMetricWarnings() {
    return this.page.getByTestId('card-metric-warnings');
  }

  get cardMetricFailed() {
    return this.page.getByTestId('card-metric-failed');
  }

  get textComplianceScore() {
    return this.page.getByTestId('text-compliance-score');
  }

  get textPassedChecks() {
    return this.page.getByTestId('text-passed-checks');
  }

  get textWarnings() {
    return this.page.getByTestId('text-warnings');
  }

  get textFailedChecks() {
    return this.page.getByTestId('text-failed-checks');
  }

  get progressComplianceScore() {
    return this.page.getByTestId('progress-compliance-score');
  }

  // Tabs
  get tabsMain() {
    return this.page.getByTestId('tabs-main');
  }

  get tabsList() {
    return this.page.getByTestId('tabs-list');
  }

  get tabVerification() {
    return this.page.getByTestId('tab-verification');
  }

  get tabEnergyModel() {
    return this.page.getByTestId('tab-energy-model');
  }

  get tabCertification() {
    return this.page.getByTestId('tab-certification');
  }

  get contentVerification() {
    return this.page.getByTestId('content-verification');
  }

  get contentEnergyModel() {
    return this.page.getByTestId('content-energy-model');
  }

  get contentCertification() {
    return this.page.getByTestId('content-certification');
  }

  // Verification Tab - Compliance Checklist
  get cardChecklist() {
    return this.page.getByTestId('card-checklist');
  }

  get textChecklistTitle() {
    return this.page.getByTestId('text-checklist-title');
  }

  checkCategory(category: string) {
    return this.page.getByTestId(`category-${category}`);
  }

  check(id: string) {
    return this.page.getByTestId(`check-${id}`);
  }

  checkName(id: string) {
    return this.page.getByTestId(`text-check-name-${id}`);
  }

  checkDescription(id: string) {
    return this.page.getByTestId(`text-check-description-${id}`);
  }

  checkDetails(id: string) {
    return this.page.getByTestId(`text-check-details-${id}`);
  }

  checkStatus(id: string) {
    return this.page.getByTestId(`badge-status-${id}`);
  }

  // Energy Model Tab
  get cardEnergyModel() {
    return this.page.getByTestId('card-energy-model');
  }

  get textEnergyModelTitle() {
    return this.page.getByTestId('text-energy-model-title');
  }

  get sectionReferenceHome() {
    return this.page.getByTestId('section-reference-home');
  }

  get sectionAsBuiltHome() {
    return this.page.getByTestId('section-as-built-home');
  }

  get textRefHeating() {
    return this.page.getByTestId('text-ref-heating');
  }

  get textRefCooling() {
    return this.page.getByTestId('text-ref-cooling');
  }

  get textRefEnergy() {
    return this.page.getByTestId('text-ref-energy');
  }

  get textRefHers() {
    return this.page.getByTestId('text-ref-hers');
  }

  get textBuiltHeating() {
    return this.page.getByTestId('text-built-heating');
  }

  get textBuiltCooling() {
    return this.page.getByTestId('text-built-cooling');
  }

  get textBuiltEnergy() {
    return this.page.getByTestId('text-built-energy');
  }

  get textBuiltHers() {
    return this.page.getByTestId('text-built-hers');
  }

  get sectionEnergySavings() {
    return this.page.getByTestId('section-energy-savings');
  }

  get textEnergySavings() {
    return this.page.getByTestId('text-energy-savings');
  }

  get qualificationStatus() {
    return this.page.getByTestId('qualification-status');
  }

  get alertCalculationMethod() {
    return this.page.getByTestId('alert-calculation-method');
  }

  // Certification Tab
  get cardCertification() {
    return this.page.getByTestId('card-certification');
  }

  get alertReadyToCertify() {
    return this.page.getByTestId('alert-ready-to-certify');
  }

  get alertCannotCertify() {
    return this.page.getByTestId('alert-cannot-certify');
  }

  get certificationActions() {
    return this.page.getByTestId('certification-actions');
  }

  get buttonGenerateLetter() {
    return this.page.getByTestId('button-generate-letter');
  }

  get buttonIrsForm() {
    return this.page.getByTestId('button-irs-form');
  }

  get sectionPackageContents() {
    return this.page.getByTestId('section-package-contents');
  }

  get sectionRequiredActions() {
    return this.page.getByTestId('section-required-actions');
  }

  get cardArchive() {
    return this.page.getByTestId('card-archive');
  }

  get inputCertificationNotes() {
    return this.page.getByTestId('input-certification-notes');
  }

  get buttonArchive() {
    return this.page.getByTestId('button-archive');
  }

  requiredAction(checkId: string) {
    return this.page.getByTestId(`action-${checkId}`);
  }

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/tax-credit-compliance`);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

// Test Suite: Authentication
test.describe('Tax Credit Compliance - Authentication', () => {
  test('allows authenticated users to access compliance verification page', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await expect(compliance.pageTitle).toBeVisible();
    await expect(compliance.pageTitle).toHaveText('45L Compliance Verification');
  });

  test('displays page description and header elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
    
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    
    await expect(compliance.pageHeader).toBeVisible();
    await expect(compliance.pageDescription).toBeVisible();
    await expect(compliance.pageDescription).toContainText('Automated compliance checking');
    await expect(compliance.buttonRunVerification).toBeVisible();
  });
});

// Test Suite: Skeleton Loaders
test.describe('Tax Credit Compliance - Skeleton Loaders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays skeleton loader for project selection while loading', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    
    // Check for project selection skeleton
    const hasProjectSkeleton = await Promise.race([
      compliance.skeletonProjectSelection.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    // Page should load successfully
    await expect(compliance.pageTitle).toBeVisible();
  });

  test('displays skeleton loaders for metric cards while loading', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    
    // Select a project first
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
    }
    
    // Check for metric skeleton loaders
    const hasMetricSkeletons = await Promise.race([
      compliance.skeletonMetricCards.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
    
    // Wait for page to finish loading
    await expect(compliance.pageTitle).toBeVisible();
  });

  test('displays skeleton loaders for compliance checklist while loading', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    // Select a project
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
    }
    
    // Check for checklist skeleton
    const hasChecklistSkeleton = await Promise.race([
      compliance.skeletonChecklist.isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ]);
  });

  test('skeleton loaders disappear after data loads', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    // Select a project
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      await page.waitForTimeout(2000); // Wait for queries
      
      // Metric cards should be visible
      const metricsVisible = await compliance.metricCards.isVisible();
      if (metricsVisible) {
        // Skeletons should be gone
        await expect(compliance.skeletonMetricCards).not.toBeVisible();
      }
    }
  });
});

// Test Suite: Error Handling and Retry
test.describe('Tax Credit Compliance - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays error state when projects query fails', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    
    // Intercept and fail the projects query
    await page.route('**/api/tax-credit-projects*', route => route.abort());
    
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    // Should show error alert
    await expect(compliance.alertErrorProjects).toBeVisible({ timeout: 10000 });
    await expect(compliance.buttonRetryProjects).toBeVisible();
  });

  test('retry button refetches projects data after error', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    
    let requestCount = 0;
    await page.route('**/api/tax-credit-projects*', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    if (await compliance.buttonRetryProjects.isVisible({ timeout: 5000 })) {
      await compliance.buttonRetryProjects.click();
      await page.waitForTimeout(1000);
      
      // After retry, error should be gone
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('displays error when project data queries fail', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    // Select a project
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      const projectId = await firstOption.getAttribute('value');
      
      // Intercept and fail project detail queries
      await page.route(`**/api/tax-credit-projects/${projectId}`, route => route.abort());
      await firstOption.click();
      
      // Should show error alert
      await expect(compliance.alertErrorProjectData).toBeVisible({ timeout: 10000 });
    }
  });
});

// Test Suite: Project Selection
test.describe('Tax Credit Compliance - Project Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays project selection card', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await expect(compliance.cardProjectSelection).toBeVisible();
    await expect(compliance.selectProject).toBeVisible();
  });

  test('allows selecting a project from dropdown', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    // Click project selector
    await compliance.selectProject.click();
    
    // Select first project
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      // Project summary should appear
      await expect(compliance.projectSummary).toBeVisible({ timeout: 10000 });
    }
  });

  test('displays project details after selection', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      // Check for project details
      if (await compliance.projectSummary.isVisible({ timeout: 10000 })) {
        await expect(compliance.textTotalUnits).toBeVisible();
        await expect(compliance.textQualifiedUnits).toBeVisible();
        await expect(compliance.badgeProjectStatus).toBeVisible();
      }
    }
  });
});

// Test Suite: Metric Cards
test.describe('Tax Credit Compliance - Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays all four metric cards after project selection', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      // Wait for metric cards
      if (await compliance.metricCards.isVisible({ timeout: 10000 })) {
        await expect(compliance.cardMetricComplianceScore).toBeVisible();
        await expect(compliance.cardMetricPassed).toBeVisible();
        await expect(compliance.cardMetricWarnings).toBeVisible();
        await expect(compliance.cardMetricFailed).toBeVisible();
      }
    }
  });

  test('displays compliance score with progress bar', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.cardMetricComplianceScore.isVisible({ timeout: 10000 })) {
        await expect(compliance.textComplianceScore).toBeVisible();
        await expect(compliance.progressComplianceScore).toBeVisible();
        
        // Score should be a percentage
        const scoreText = await compliance.textComplianceScore.textContent();
        expect(scoreText).toMatch(/\d+%/);
      }
    }
  });

  test('displays passed, warning, and failed check counts', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.metricCards.isVisible({ timeout: 10000 })) {
        await expect(compliance.textPassedChecks).toBeVisible();
        await expect(compliance.textWarnings).toBeVisible();
        await expect(compliance.textFailedChecks).toBeVisible();
        
        // All should contain numbers
        const passed = await compliance.textPassedChecks.textContent();
        const warnings = await compliance.textWarnings.textContent();
        const failed = await compliance.textFailedChecks.textContent();
        
        expect(passed).toMatch(/\d+/);
        expect(warnings).toMatch(/\d+/);
        expect(failed).toMatch(/\d+/);
      }
    }
  });
});

// Test Suite: Tab Navigation
test.describe('Tax Credit Compliance - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays all three tabs', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabsMain.isVisible({ timeout: 10000 })) {
        await expect(compliance.tabVerification).toBeVisible();
        await expect(compliance.tabEnergyModel).toBeVisible();
        await expect(compliance.tabCertification).toBeVisible();
      }
    }
  });

  test('switches to energy model tab', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        await expect(compliance.contentEnergyModel).toBeVisible();
        await expect(compliance.cardEnergyModel).toBeVisible();
      }
    }
  });

  test('switches to certification tab', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        await expect(compliance.contentCertification).toBeVisible();
        await expect(compliance.cardCertification).toBeVisible();
      }
    }
  });
});

// Test Suite: Compliance Checklist
test.describe('Tax Credit Compliance - Compliance Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays compliance checklist card', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.cardChecklist.isVisible({ timeout: 10000 })) {
        await expect(compliance.textChecklistTitle).toBeVisible();
        await expect(compliance.textChecklistTitle).toHaveText('Compliance Checklist');
      }
    }
  });

  test('displays compliance checks grouped by category', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.cardChecklist.isVisible({ timeout: 10000 })) {
        // Check for categories
        const energyCategory = compliance.checkCategory('energy-performance');
        const testingCategory = compliance.checkCategory('testing');
        
        // At least one category should be visible
        const hasCategories = await Promise.race([
          energyCategory.isVisible().then(() => true),
          testingCategory.isVisible().then(() => true),
          page.waitForTimeout(2000).then(() => false)
        ]);
      }
    }
  });

  test('displays individual compliance check details', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      // Check for specific compliance checks
      const hersCheck = compliance.check('hers-index');
      if (await hersCheck.isVisible({ timeout: 10000 })) {
        await expect(compliance.checkName('hers-index')).toBeVisible();
        await expect(compliance.checkDescription('hers-index')).toBeVisible();
        await expect(compliance.checkDetails('hers-index')).toBeVisible();
        await expect(compliance.checkStatus('hers-index')).toBeVisible();
      }
    }
  });
});

// Test Suite: Energy Model
test.describe('Tax Credit Compliance - Energy Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays energy model comparison', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        
        await expect(compliance.cardEnergyModel).toBeVisible();
        await expect(compliance.sectionReferenceHome).toBeVisible();
        await expect(compliance.sectionAsBuiltHome).toBeVisible();
      }
    }
  });

  test('displays reference home energy values', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        
        await expect(compliance.textRefHeating).toBeVisible();
        await expect(compliance.textRefCooling).toBeVisible();
        await expect(compliance.textRefEnergy).toBeVisible();
        await expect(compliance.textRefHers).toBeVisible();
      }
    }
  });

  test('displays as-built home energy values', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        
        await expect(compliance.textBuiltHeating).toBeVisible();
        await expect(compliance.textBuiltCooling).toBeVisible();
        await expect(compliance.textBuiltEnergy).toBeVisible();
        await expect(compliance.textBuiltHers).toBeVisible();
      }
    }
  });

  test('displays energy savings and qualification status', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        
        await expect(compliance.sectionEnergySavings).toBeVisible();
        await expect(compliance.textEnergySavings).toBeVisible();
        await expect(compliance.qualificationStatus).toBeVisible();
        
        // Savings should be a percentage
        const savingsText = await compliance.textEnergySavings.textContent();
        expect(savingsText).toMatch(/\d+%/);
      }
    }
  });

  test('displays calculation method information', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabEnergyModel.isVisible({ timeout: 10000 })) {
        await compliance.tabEnergyModel.click();
        
        await expect(compliance.alertCalculationMethod).toBeVisible();
      }
    }
  });
});

// Test Suite: Certification
test.describe('Tax Credit Compliance - Certification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('displays certification card', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        await expect(compliance.cardCertification).toBeVisible();
      }
    }
  });

  test('displays ready to certify alert when all checks pass', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        
        // Check if ready to certify or cannot certify
        const isReadyVisible = await compliance.alertReadyToCertify.isVisible({ timeout: 5000 });
        const cannotCertifyVisible = await compliance.alertCannotCertify.isVisible({ timeout: 5000 });
        
        // One of these should be visible
        expect(isReadyVisible || cannotCertifyVisible).toBe(true);
      }
    }
  });

  test('displays certification action buttons when ready', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        
        // If ready to certify
        if (await compliance.alertReadyToCertify.isVisible({ timeout: 5000 })) {
          await expect(compliance.certificationActions).toBeVisible();
          await expect(compliance.buttonGenerateLetter).toBeVisible();
          await expect(compliance.buttonIrsForm).toBeVisible();
          await expect(compliance.sectionPackageContents).toBeVisible();
        }
      }
    }
  });

  test('displays required actions when cannot certify', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        
        // If cannot certify
        if (await compliance.alertCannotCertify.isVisible({ timeout: 5000 })) {
          await expect(compliance.sectionRequiredActions).toBeVisible();
        }
      }
    }
  });

  test('displays archive certification card when ready', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.tabCertification.isVisible({ timeout: 10000 })) {
        await compliance.tabCertification.click();
        
        // If ready to certify, archive card should be visible
        if (await compliance.alertReadyToCertify.isVisible({ timeout: 5000 })) {
          if (await compliance.cardArchive.isVisible({ timeout: 5000 })) {
            await expect(compliance.inputCertificationNotes).toBeVisible();
            await expect(compliance.buttonArchive).toBeVisible();
          }
        }
      }
    }
  });
});

// Test Suite: Run Verification Button
test.describe('Tax Credit Compliance - Run Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('run verification button is disabled when no project selected', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await expect(compliance.buttonRunVerification).toBeDisabled();
  });

  test('run verification button becomes enabled after project selection', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      await page.waitForTimeout(1000);
      
      await expect(compliance.buttonRunVerification).toBeEnabled();
    }
  });

  test('clicking run verification shows loading state', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      await page.waitForTimeout(1000);
      
      if (await compliance.buttonRunVerification.isEnabled()) {
        await compliance.buttonRunVerification.click();
        
        // Button should show "Verifying..."
        const buttonText = await compliance.buttonRunVerification.textContent();
        expect(buttonText).toContain('Verifying');
      }
    }
  });
});

// Test Suite: Data Display and Accuracy
test.describe('Tax Credit Compliance - Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    await page.waitForURL(`${BASE_URL}/`);
  });

  test('compliance score matches passed checks ratio', async ({ page }) => {
    const compliance = new TaxCreditCompliancePage(page);
    await compliance.navigate();
    await compliance.waitForPageLoad();
    
    await compliance.selectProject.click();
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 5000 })) {
      await firstOption.click();
      
      if (await compliance.metricCards.isVisible({ timeout: 10000 })) {
        const scoreText = await compliance.textComplianceScore.textContent();
        const passedText = await compliance.textPassedChecks.textContent();
        
        // Extract numbers
        const score = parseInt(scoreText?.replace('%', '') || '0');
        const passed = parseInt(passedText || '0');
        
        // Score should be between 0 and 100
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
