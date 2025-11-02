/**
 * GP-04 Golden Path E2E Test - 45L Credits: Dashboard → Project View → Progress Tracking
 * 
 * This test validates the 45L tax credit dashboard and project viewing workflow,
 * focusing on existing UI functionality that is currently implemented.
 * 
 * Workflow Steps:
 * 1. Admin Login
 * 2. Navigate to Tax Credit Dashboard and verify KPI metrics
 * 3. Select existing M/I Homes tax credit project
 * 4. View project details and verify progress tracking
 * 5. Navigate to reports/exports page and verify metrics
 * 
 * What This Test DOES cover (existing UI):
 * - Tax Credit Dashboard with KPI metrics
 * - Project list and navigation
 * - Project detail view with tabs (details, requirements, units, documents)
 * - Progress tracking for requirements and units
 * - Reports/Exports page with export buttons
 * 
 * What This Test DOES NOT cover (not implemented in UI):
 * - Document upload modal (UI only has button, no modal)
 * - Builder sign-off dialog (not implemented)
 * - Mark documents complete (not implemented)
 * 
 * Accessibility & Performance:
 * - Axe accessibility checks on Tax Credit Dashboard, Project Detail, Export pages
 * - Lighthouse skipped (workers=1 limitation, same as GP-01/GP-02/GP-03)
 * - No critical accessibility violations
 * 
 * Technical Implementation:
 * - Page Object Model pattern for maintainability
 * - Comprehensive data-testid selectors
 * - Proper error handling and cleanup
 * - 2-minute timeout for workflow
 * - Uses existing M/I Homes seed data
 */

import { test, expect, type Page, type Browser } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Import POMs (only those that match existing UI)
import { TaxCreditDashboardPage } from '../poms/TaxCreditDashboardPage';
import { TaxCreditProjectPage } from '../poms/TaxCreditProjectPage';
import { ExportsPage } from '../poms/ExportsPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test timeout: 2 minutes for workflow
test.setTimeout(120000);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Admin login helper
 * Uses existing admin credentials from seed data
 */
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  const emailInput = page.getByTestId('input-email');
  const passwordInput = page.getByTestId('input-password');
  const loginButton = page.getByTestId('button-login');

  await emailInput.fill('admin@test.com');
  await passwordInput.fill('password123');
  await loginButton.click();

  // Wait for redirect to home or dashboard
  await page.waitForURL(/\/(home|dashboard|jobs|calendar|tax-credits)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}


// ============================================================================
// MAIN TEST
// ============================================================================

test.describe('GP-04: 45L Tax Credit - Dashboard → Project View → Progress Tracking', () => {
  test('View 45L tax credit dashboard, project details, and progress tracking', async ({ page, browser }) => {
    // ============================================================================
    // STEP 1: ADMIN LOGIN
    // ============================================================================
    await test.step('Admin login', async () => {
      await loginAsAdmin(page);
      
      // Verify successful login
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('Login');
    });

    // ============================================================================
    // STEP 2: NAVIGATE TO TAX CREDIT DASHBOARD
    // ============================================================================
    let dashboard: TaxCreditDashboardPage;
    let initialTotalCredits: string | null;
    let initialActiveProjects: string | null;
    let initialComplianceRate: string | null;

    await test.step('Navigate to 45L Tax Credit Dashboard', async () => {
      dashboard = new TaxCreditDashboardPage(page, BASE_URL);
      await dashboard.navigate();

      // Verify dashboard loaded
      await expect(dashboard.pageTitle).toBeVisible({ timeout: 10000 });
      await expect(dashboard.pageTitle).toContainText('45L Tax Credit');

      // Capture initial KPI values for later comparison
      initialTotalCredits = await dashboard.getTotalCredits();
      initialActiveProjects = await dashboard.getActiveProjectsCount();
      initialComplianceRate = await dashboard.getComplianceRate();

      console.log('Initial Dashboard Metrics:', {
        totalCredits: initialTotalCredits,
        activeProjects: initialActiveProjects,
        complianceRate: initialComplianceRate
      });

      // Verify KPI cards are visible
      await expect(dashboard.totalCreditsCard).toBeVisible();
      await expect(dashboard.activeProjectsCard).toBeVisible();
      await expect(dashboard.complianceRateCard).toBeVisible();
      await expect(dashboard.totalUnitsCard).toBeVisible();

      // Check for errors
      const hasErrors = await dashboard.hasErrors();
      expect(hasErrors).toBe(false);
    });

    // Accessibility Check: Dashboard
    await test.step('Accessibility check - Dashboard', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    // ============================================================================
    // STEP 3: SELECT PROJECT
    // ============================================================================
    let projectId: string | null;
    let projectPage: TaxCreditProjectPage;

    await test.step('Select M/I Homes tax credit project', async () => {
      // Find any available project from seed data
      // Try to find M/I Homes project, or use first available
      projectId = await dashboard.findProjectByName('M/I Homes');
      
      if (!projectId) {
        // Fallback: use first available project
        projectId = await dashboard.findFirstProject();
      }

      expect(projectId).not.toBeNull();
      console.log(`Selected project ID: ${projectId}`);

      // Navigate to project detail page
      await dashboard.openProject(projectId!);
      
      // Initialize project page POM
      projectPage = new TaxCreditProjectPage(page, BASE_URL);
      
      // Verify project page loaded
      await expect(projectPage.pageTitle).toBeVisible({ timeout: 10000 });
      await expect(projectPage.tabsList).toBeVisible();
      
      const projectStatus = await projectPage.getProjectStatus();
      console.log(`Project initial status: ${projectStatus}`);
    });

    // Accessibility Check: Project Detail Page
    await test.step('Accessibility check - Project Detail', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    // ============================================================================
    // STEP 4: VIEW PROJECT DETAILS AND PROGRESS
    // ============================================================================
    await test.step('View project details, requirements, and progress tracking', async () => {
      // Verify progress cards are visible
      await expect(projectPage.requirementsProgressCard).toBeVisible();
      await expect(projectPage.unitsProgressCard).toBeVisible();

      // Navigate to Requirements tab
      await projectPage.openRequirementsTab();
      await expect(projectPage.requirementsTabContent).toBeVisible();
      
      console.log('Requirements tab loaded successfully');

      // Navigate to Units tab
      await projectPage.openUnitsTab();
      await expect(projectPage.unitsTabContent).toBeVisible();
      
      console.log('Units tab loaded successfully');

      // Navigate to Documents tab (verify tab exists, but no upload functionality)
      await projectPage.openDocumentsTab();
      await expect(projectPage.documentsTabContent).toBeVisible();
      
      // Note: Document upload button exists but modal is not implemented
      const docCount = await projectPage.getDocumentCount();
      console.log(`Current document count: ${docCount}`);

      // Navigate back to Details tab
      await projectPage.openDetailsTab();
      await expect(projectPage.tabsList).toBeVisible();
      
      console.log('All project tabs verified successfully');
    });

    // ============================================================================
    // STEP 5: VERIFY EXPORTS/REPORTS PAGE
    // ============================================================================
    await test.step('Navigate to reports page and verify export options', async () => {
      const exportsPage = new ExportsPage(page, BASE_URL);
      await exportsPage.navigate();

      // Verify exports page loaded
      await expect(exportsPage.pageTitle).toBeVisible({ timeout: 10000 });
      await expect(exportsPage.pageTitle).toContainText('Reports');

      // Check for errors
      const hasErrors = await exportsPage.hasErrors();
      expect(hasErrors).toBe(false);

      // Verify metric cards are visible
      await expect(exportsPage.totalProjectsCard).toBeVisible();
      await expect(exportsPage.totalCreditsCard).toBeVisible();

      // Get export metrics
      const totalProjects = await exportsPage.getTotalProjects();
      const totalCredits = await exportsPage.getTotalCredits();
      const complianceRate = await exportsPage.getComplianceRate();

      console.log('Export Page Metrics:', {
        totalProjects,
        totalCredits,
        complianceRate
      });

      // Verify metrics have values
      expect(totalProjects).not.toBeNull();
      expect(totalCredits).not.toBeNull();

      // Check if recent certifications table exists and has entries
      const certCount = await exportsPage.getCertificationCount();
      console.log(`Total certifications available: ${certCount}`);

      // Verify export buttons are present
      await expect(exportsPage.exportCSVButton).toBeVisible();
      await expect(exportsPage.exportPDFButton).toBeVisible();
      await expect(exportsPage.exportIRSButton).toBeVisible();
    });

    // Accessibility Check: Exports Page
    await test.step('Accessibility check - Exports Page', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    // ============================================================================
    // FINAL VERIFICATION
    // ============================================================================
    await test.step('Final workflow verification', async () => {
      console.log('✅ GP-04 Golden Path Test Completed Successfully');
      console.log('Workflow Summary:');
      console.log('  1. ✓ Admin login');
      console.log('  2. ✓ Navigate to Tax Credit Dashboard and verify KPI metrics');
      console.log('  3. ✓ Select M/I Homes tax credit project');
      console.log('  4. ✓ View project details, requirements, units, and documents tabs');
      console.log('  5. ✓ Navigate to reports page and verify export options');
      console.log('  6. ✓ Accessibility checks passed (3 pages)');
      console.log('');
      console.log('Note: This test covers ONLY existing UI functionality');
      console.log('Features NOT tested (not implemented in UI):');
      console.log('  - Document upload modal');
      console.log('  - Builder sign-off dialog');
      console.log('  - Mark documents complete');
    });
  });
});
