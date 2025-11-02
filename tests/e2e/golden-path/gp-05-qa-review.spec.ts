/**
 * GP-05 Golden Path E2E Test - QA Review Workflow: Score Job → Admin Review → Approve
 * 
 * RESCOPED FROM ORIGINAL: "Create QA Item → Assign → Resolve" workflow doesn't exist in UI
 * Similar to GP-04, this test validates what IS implemented rather than non-existent features
 * 
 * This test validates the Quality Assurance review workflow for completed jobs,
 * focusing on existing UI functionality that is currently implemented.
 * 
 * Workflow Steps (ACTUAL IMPLEMENTATION):
 * 1. Admin Login
 * 2. Navigate to QA Dashboard and verify KPI metrics
 * 3. Navigate to QA Scoring page and verify job scoring UI
 * 4. Navigate to Review Queue and verify pending reviews
 * 5. Open review dialog and verify score details
 * 6. Admin approves/rejects review with notes
 * 7. Verify review submission workflow
 * 
 * What This Test DOES cover (existing UI):
 * - QA Dashboard with metrics (team average, pending reviews, compliance)
 * - QA Scoring page with job selection and scoring categories
 * - QA Review Queue with pending inspection scores
 * - Review dialog with approve/needs improvement decisions
 * - Review notes and submission workflow
 * 
 * What This Test DOES NOT cover (not implemented in UI):
 * - "QA Item" creation workflow (database has no qa_items table)
 * - Issue/defect creation with severity/category selection
 * - Assignment of QA items to inspectors
 * - Inspector resolution of QA items
 * - QA item tracking/closure workflow
 * 
 * IMPORTANT FINDING:
 * The current QA system is about SCORING completed jobs (quality metrics),
 * NOT about creating/tracking/resolving QA issues/items. The workflow is:
 * - Admin scores a completed job on 5 categories
 * - Score goes to review queue with status "pending"
 * - Admin reviews and approves/rejects the score
 * - This is job quality assessment, not issue tracking
 * 
 * Accessibility & Performance:
 * - Axe accessibility checks on QA Dashboard, Scoring, Review pages
 * - Lighthouse skipped (workers=1 limitation, same as GP-01/GP-02/GP-03/GP-04)
 * - No critical accessibility violations
 * 
 * Technical Implementation:
 * - Page Object Model pattern for maintainability
 * - Data-testid selectors verified against actual UI
 * - Handles mock data gracefully (QA pages use mock data in development)
 * - Proper error handling and cleanup
 * - 2-minute timeout for workflow
 * - Uses existing M/I Homes seed data where available
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Import POMs
import { QADashboardPage } from '../poms/QADashboardPage';
import { QAScoringPage } from '../poms/QAScoringPage';
import { QAReviewPage } from '../poms/QAReviewPage';

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
  await page.waitForURL(/\/(home|dashboard|jobs|calendar|tax-credits|qa)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// MAIN TEST
// ============================================================================

test.describe('GP-05: QA Review Workflow - Score Job → Admin Review → Approve', () => {
  test('Navigate QA system, view scoring, and process review queue', async ({ page }) => {
    // ============================================================================
    // STEP 1: ADMIN LOGIN
    // ============================================================================
    await test.step('Admin login', async () => {
      await loginAsAdmin(page);
      
      // Verify successful login
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('Login');
      
      console.log('✓ Admin logged in successfully');
    });

    // ============================================================================
    // STEP 2: NAVIGATE TO QA DASHBOARD
    // ============================================================================
    let dashboard: QADashboardPage;
    let teamAverage: string | null;
    let pendingReviews: string | null;
    let complianceRate: string | null;

    await test.step('Navigate to QA Dashboard and verify metrics', async () => {
      dashboard = new QADashboardPage(page, BASE_URL);
      await dashboard.navigate();

      // Verify dashboard loaded
      await expect(dashboard.pageTitle).toBeVisible({ timeout: 10000 });
      await expect(dashboard.mainContainer).toBeVisible();

      console.log('✓ QA Dashboard loaded');

      // Verify KPI metric cards are visible
      await expect(dashboard.teamAverageCard).toBeVisible();
      await expect(dashboard.pendingReviewsCard).toBeVisible();
      await expect(dashboard.complianceCard).toBeVisible();
      await expect(dashboard.criticalIssuesCard).toBeVisible();

      // Capture metric values (mock data)
      teamAverage = await dashboard.getTeamAverage();
      pendingReviews = await dashboard.getPendingReviewsCount();
      complianceRate = await dashboard.getComplianceRate();

      console.log('Dashboard Metrics:', {
        teamAverage,
        pendingReviews,
        complianceRate
      });

      // Verify action buttons are present
      await expect(dashboard.scoreInspectionButton).toBeVisible();
      await expect(dashboard.reviewQueueButton).toBeVisible();

      // Check for errors
      const hasErrors = await dashboard.hasErrors();
      expect(hasErrors).toBe(false);

      console.log('✓ All dashboard metrics and controls verified');
    });

    // Accessibility Check: QA Dashboard
    await test.step('Accessibility check - QA Dashboard', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
      console.log('✓ QA Dashboard passed accessibility checks');
    });

    // ============================================================================
    // STEP 3: NAVIGATE TO QA SCORING PAGE
    // ============================================================================
    let scoringPage: QAScoringPage;

    await test.step('Navigate to QA Scoring page and verify UI', async () => {
      // Navigate to scoring page
      await dashboard.navigateToScoring();
      
      scoringPage = new QAScoringPage(page, BASE_URL);

      // Verify scoring page loaded
      await expect(scoringPage.pageTitle).toBeVisible({ timeout: 10000 });
      await expect(scoringPage.mainContainer).toBeVisible();
      
      console.log('✓ QA Scoring page loaded');

      // Verify job selection dropdown is present
      await expect(scoringPage.jobSelectTrigger).toBeVisible();

      // Verify scoring mode tabs
      await expect(scoringPage.scoringModeTabs).toBeVisible();
      await expect(scoringPage.automatedTab).toBeVisible();
      await expect(scoringPage.manualTab).toBeVisible();

      // Verify action buttons
      await expect(scoringPage.backButton).toBeVisible();

      // Note: Category cards and score display may not be visible until job is selected
      // This is expected behavior with mock data
      
      console.log('✓ QA Scoring page UI elements verified');

      // Check for errors
      const hasErrors = await scoringPage.hasErrors();
      expect(hasErrors).toBe(false);
    });

    // Accessibility Check: QA Scoring Page
    await test.step('Accessibility check - QA Scoring Page', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
      console.log('✓ QA Scoring page passed accessibility checks');
    });

    // ============================================================================
    // STEP 4: NAVIGATE TO REVIEW QUEUE
    // ============================================================================
    let reviewPage: QAReviewPage;

    await test.step('Navigate to QA Review Queue and verify pending items', async () => {
      // Go back to dashboard first
      await scoringPage.navigateBack();
      await expect(dashboard.pageTitle).toBeVisible();

      // Navigate to review queue
      await dashboard.navigateToReviewQueue();
      
      reviewPage = new QAReviewPage(page, BASE_URL);

      // Verify review queue loaded
      // Note: Page title uses text locator since QAReview component lacks data-testids
      await expect(reviewPage.pageTitle).toBeVisible({ timeout: 10000 });
      
      console.log('✓ QA Review Queue loaded');

      // Verify pending badge is visible
      await expect(reviewPage.pendingBadge).toBeVisible();

      // Get pending count (using mock data)
      const pendingCount = await reviewPage.getPendingCount();
      console.log(`Pending reviews: ${pendingCount}`);
      expect(pendingCount).toBeGreaterThan(0); // Mock data should have items

      // Verify filter controls
      await expect(reviewPage.priorityFilter).toBeVisible();

      // Check for errors
      const hasErrors = await reviewPage.hasErrors();
      expect(hasErrors).toBe(false);

      console.log('✓ Review queue loaded with pending items');
    });

    // Accessibility Check: QA Review Page
    await test.step('Accessibility check - QA Review Queue', async () => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
      console.log('✓ QA Review Queue passed accessibility checks');
    });

    // ============================================================================
    // STEP 5: OPEN AND REVIEW AN INSPECTION SCORE
    // ============================================================================
    await test.step('Open review dialog and verify score details', async () => {
      // Open the first review item
      await reviewPage.openFirstReview();

      // Verify dialog opened
      const isDialogOpen = await reviewPage.isReviewDialogOpen();
      expect(isDialogOpen).toBe(true);
      
      console.log('✓ Review dialog opened');

      // Verify dialog elements are present
      await expect(reviewPage.reviewDialog).toBeVisible();
      await expect(reviewPage.reviewNotesTextarea).toBeVisible();
      await expect(reviewPage.approveButton).toBeVisible();
      await expect(reviewPage.needsImprovementButton).toBeVisible();
      await expect(reviewPage.submitReviewButton).toBeVisible();
      await expect(reviewPage.cancelButton).toBeVisible();

      console.log('✓ Review dialog UI elements verified');
    });

    // ============================================================================
    // STEP 6: SUBMIT REVIEW WITH APPROVAL
    // ============================================================================
    await test.step('Admin approves review with notes', async () => {
      // Submit approval with notes
      const reviewNotes = 'Quality assessment looks good. All categories meet standards. Approved for completion.';
      
      await reviewPage.approveReview(reviewNotes);

      // Wait for dialog to close and success message
      await page.waitForTimeout(1000);

      // Verify dialog closed
      const isDialogOpen = await reviewPage.isReviewDialogOpen();
      expect(isDialogOpen).toBe(false);
      
      console.log('✓ Review submitted successfully');

      // Note: Since backend uses mock data, actual database update won't occur
      // This test validates the UI workflow and form submission
    });

    // ============================================================================
    // STEP 7: VERIFY FINAL STATE
    // ============================================================================
    await test.step('Verify review workflow completion', async () => {
      // Verify we're back on the review queue page
      await expect(reviewPage.pageTitle).toBeVisible();

      console.log('✓ Returned to review queue after submission');

      // Check for any errors that might have occurred
      const hasErrors = await reviewPage.hasErrors();
      expect(hasErrors).toBe(false);

      console.log('✓ No errors detected in workflow');

      // Summary
      console.log('\n=== GP-05 QA Review Workflow Complete ===');
      console.log('✓ Navigated QA Dashboard with metrics');
      console.log('✓ Verified QA Scoring page UI');
      console.log('✓ Accessed Review Queue with pending items');
      console.log('✓ Opened and reviewed inspection score');
      console.log('✓ Submitted approval with notes');
      console.log('✓ All accessibility checks passed');
      console.log('\nNOTE: This test validates UI workflow with mock data.');
      console.log('Original "QA Item creation" workflow does not exist in current implementation.');
    });
  });
});

// ============================================================================
// DOCUMENTATION BLOCK
// ============================================================================

/**
 * RESCOPING RATIONALE (similar to GP-04):
 * 
 * The original test specification requested:
 * "QA Triage - Create QA Item → Assign → Resolve"
 * 
 * After thorough exploration of the codebase, this workflow DOES NOT EXIST:
 * 
 * 1. NO "QA Items" table in database (shared/schema.ts)
 *    - Database has: qaInspectionScores, qaChecklists, qaChecklistItems
 *    - NO table for: qa_items, qa_issues, qa_defects
 * 
 * 2. NO "Create QA Item" UI in frontend
 *    - QualityAssurance.tsx: Dashboard with metrics only
 *    - QAScoring.tsx: Job quality scoring (not issue creation)
 *    - QAReview.tsx: Review queue for inspection scores
 *    - NO form/modal for creating QA issues
 * 
 * 3. NO "Assignment" workflow
 *    - No dropdown to assign QA items to inspectors
 *    - No inspector queue for resolving assigned items
 * 
 * 4. NO "Resolution" workflow
 *    - No inspector interface to mark items resolved
 *    - No admin verification/closure of QA items
 * 
 * WHAT DOES EXIST:
 * 
 * The current QA system is a JOB QUALITY SCORING system:
 * - Admins score completed jobs on 5 quality categories
 * - Scores go to review queue with status "pending"
 * - Admins review and approve/reject scores
 * - System tracks performance metrics and leaderboards
 * 
 * This is fundamentally different from an "issue tracking" system.
 * 
 * RESCOPED TEST COVERAGE:
 * 
 * This test validates the ACTUAL implemented workflow:
 * ✓ QA Dashboard navigation and metrics
 * ✓ QA Scoring page UI and job selection
 * ✓ Review Queue with pending inspection scores
 * ✓ Review dialog with approve/needs improvement
 * ✓ Review submission workflow
 * ✓ Accessibility compliance across all QA pages
 * 
 * This provides comprehensive E2E coverage of what EXISTS,
 * following the same pattern as GP-04 which rescoped from
 * non-existent document upload to existing export workflow.
 */
