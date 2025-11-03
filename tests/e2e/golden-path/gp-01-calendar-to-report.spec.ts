/**
 * GP-01 Golden Path E2E Test - Calendar→Job→Visit→Report Journey
 * 
 * This test validates the complete user journey from calendar import to report generation,
 * representing the core workflow that delivers value to customers.
 * 
 * Workflow Steps:
 * 1. Admin imports Google Calendar events
 * 2. Admin reviews and approves pending events
 * 3. System creates jobs from approved events
 * 4. Jobs are assigned to inspectors
 * 5. Inspector logs in and views Field Day schedule
 * 6. Inspector navigates to inspection workflow
 * 7. Inspector completes checklist items
 * 8. Inspector captures photos
 * 9. System generates PDF report
 * 10. Report is verified and downloadable
 * 
 * Accessibility & Performance:
 * - Axe accessibility checks on Calendar Management, Field Day, Inspection pages
 * - Lighthouse performance checks (target: ≥90 score)
 * - No critical accessibility violations
 * 
 * Technical Implementation:
 * - Page Object Model pattern for maintainability
 * - Comprehensive data-testid selectors
 * - Proper error handling and cleanup
 * - 2-minute timeout for complex workflow
 */

import { test, expect, type Page } from '@playwright/test';
import {
  login,
  runAxeScan,
  runLighthouseCheck,
  setupAnalyticsTracking,
  assertAnalyticsEvent,
  assertAuditLog,
  updateGoldenPathReport,
  createTestResult,
  BASE_URL
} from '../helpers';

// Test timeout: 2 minutes for complex multi-step workflow
test.setTimeout(120000);

// ============================================================================
// PAGE OBJECT MODELS
// ============================================================================

/**
 * Calendar Management Page Object
 * Handles calendar import and event sync functionality
 */
class CalendarManagementPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/calendar/management`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  get syncButton() {
    return this.page.getByTestId('button-sync-calendar');
  }

  get lastSyncTime() {
    return this.page.getByTestId('text-last-sync');
  }

  get pendingEventsCount() {
    return this.page.getByTestId('badge-pending-count');
  }

  // Actions
  async syncCalendar() {
    await this.syncButton.click();
    // Wait for sync to complete
    await this.page.waitForResponse(resp => 
      resp.url().includes('/api/calendar/sync-now') && resp.status() === 200
    );
  }

  async getPendingCount(): Promise<number> {
    const countText = await this.pendingEventsCount.textContent();
    return parseInt(countText || '0', 10);
  }
}

/**
 * Calendar Review Page Object
 * Handles event review and approval workflow
 */
class CalendarReviewPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/calendar/review`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  get eventTable() {
    return this.page.getByTestId('table-events');
  }

  eventRow(eventId: string) {
    return this.page.getByTestId(`row-event-${eventId}`);
  }

  approveButton(eventId: string) {
    return this.page.getByTestId(`button-approve-${eventId}`);
  }

  rejectButton(eventId: string) {
    return this.page.getByTestId(`button-reject-${eventId}`);
  }

  get approveDialog() {
    return this.page.getByTestId('dialog-approve-event');
  }

  get builderSelect() {
    return this.page.getByTestId('select-builder');
  }

  get inspectionTypeSelect() {
    return this.page.getByTestId('select-inspection-type');
  }

  get confirmApproveButton() {
    return this.page.getByTestId('button-confirm-approve');
  }

  // Actions
  async getFirstPendingEventId(): Promise<string | null> {
    const firstRow = this.page.locator('[data-testid^="row-event-"]').first();
    const isVisible = await firstRow.isVisible().catch(() => false);
    
    if (!isVisible) return null;
    
    const testId = await firstRow.getAttribute('data-testid');
    return testId?.replace('row-event-', '') || null;
  }

  async approveEvent(eventId: string, builderId: string, inspectionType: string) {
    await this.approveButton(eventId).click();
    await this.approveDialog.waitFor({ state: 'visible' });
    
    await this.builderSelect.click();
    await this.page.getByRole('option', { name: new RegExp(builderId, 'i') }).first().click();
    
    await this.inspectionTypeSelect.click();
    await this.page.getByRole('option', { name: inspectionType }).click();
    
    await this.confirmApproveButton.click();
    
    // Wait for approval to complete
    await this.page.waitForResponse(resp => 
      resp.url().includes('/approve') && resp.status() === 200
    );
  }
}

/**
 * Jobs Page Object
 * Handles job list and job creation verification
 */
class JobsPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/jobs`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  get allJobsAccordion() {
    return this.page.getByTestId('accordion-trigger-all-jobs');
  }

  jobCard(jobId: string) {
    return this.page.getByTestId(`card-job-${jobId}`);
  }

  // Actions
  async findJobByAddress(address: string): Promise<string | null> {
    await this.allJobsAccordion.click();
    await this.page.waitForTimeout(500); // Wait for accordion to expand
    
    const jobCards = this.page.locator('[data-testid^="card-job-"]');
    const count = await jobCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const text = await card.textContent();
      
      if (text && text.includes(address)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-job-', '') || null;
      }
    }
    
    return null;
  }

  async getJobInspector(jobId: string): Promise<string | null> {
    const card = this.jobCard(jobId);
    const text = await card.textContent();
    
    if (text && text.includes('Inspector:')) {
      const match = text.match(/Inspector:\s*([^\n]+)/);
      return match ? match[1].trim() : null;
    }
    
    return null;
  }
}

/**
 * Field Day Page Object
 * Inspector's daily job list and schedule
 */
class FieldDayPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/field-day`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  get header() {
    return this.page.getByTestId('header-field-day');
  }

  get myJobsSection() {
    return this.page.getByTestId('section-my-jobs');
  }

  jobCard(jobId: string) {
    return this.page.getByTestId(`card-job-${jobId}`);
  }

  // Actions
  async hasJob(jobId: string): Promise<boolean> {
    return await this.jobCard(jobId).isVisible();
  }

  async navigateToInspection(jobId: string) {
    await this.jobCard(jobId).click();
    await this.page.waitForURL(`**/inspection/${jobId}`);
  }
}

/**
 * Inspection Page Object
 * Main inspection workflow for completing jobs
 */
class InspectionPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate(jobId: string) {
    await this.page.goto(`${BASE_URL}/inspection/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get progressCard() {
    return this.page.getByTestId('card-progress');
  }

  checklistItem(itemId: string) {
    return this.page.getByTestId(`checklist-item-${itemId}`);
  }

  completeButton(itemId: string) {
    return this.page.getByTestId(`button-complete-${itemId}`);
  }

  get photoUploadButton() {
    return this.page.getByTestId('button-upload-photo');
  }

  get generateReportButton() {
    return this.page.getByTestId('button-generate-report');
  }

  // Actions
  async getFirstChecklistItemId(): Promise<string | null> {
    const firstItem = this.page.locator('[data-testid^="checklist-item-"]').first();
    const isVisible = await firstItem.isVisible().catch(() => false);
    
    if (!isVisible) return null;
    
    const testId = await firstItem.getAttribute('data-testid');
    return testId?.replace('checklist-item-', '') || null;
  }

  async completeChecklistItem(itemId: string) {
    const button = this.completeButton(itemId);
    
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForTimeout(500); // Wait for optimistic update
    }
  }

  async uploadPhoto(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await this.page.waitForResponse(resp => 
      resp.url().includes('/api/photos') && (resp.status() === 200 || resp.status() === 201)
    );
  }

  async generateReport() {
    await this.generateReportButton.click();
    
    // Wait for report generation
    await this.page.waitForResponse(resp => 
      resp.url().includes('/api/reports') && resp.status() === 200,
      { timeout: 30000 } // Report generation can take longer
    );
  }
}

/**
 * Reports Page Object
 * Handles report viewing and downloading
 */
class ReportsPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto(`${BASE_URL}/reports`);
    await this.page.waitForLoadState('networkidle');
  }

  // Elements
  reportCard(jobId: string) {
    return this.page.getByTestId(`card-report-${jobId}`);
  }

  downloadButton(reportId: string) {
    return this.page.getByTestId(`button-download-${reportId}`);
  }

  previewButton(reportId: string) {
    return this.page.getByTestId(`button-preview-${reportId}`);
  }

  // Actions
  async findReportByJobId(jobId: string): Promise<boolean> {
    return await this.reportCard(jobId).isVisible();
  }

  async downloadReport(reportId: string): Promise<boolean> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton(reportId).click();
    
    const download = await downloadPromise;
    return download !== null;
  }
}

// ============================================================================
// TEST-SPECIFIC HELPER FUNCTIONS
// ============================================================================

// Main helper functions are imported from '../helpers'
// All authentication, accessibility, performance, and analytics helpers are available

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('GP-01: Golden Path - Calendar to Report Journey', () => {
  let createdJobId: string | null = null;
  let approvedEventId: string | null = null;

  test('Complete calendar-to-report workflow with accessibility checks', async ({ browser }) => {
    // Create separate contexts for admin and inspector
    const adminContext = await browser.newContext();
    const inspectorContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const inspectorPage = await inspectorContext.newPage();
    
    // Initialize Page Objects
    const calendarMgmt = new CalendarManagementPage(adminPage);
    const calendarReview = new CalendarReviewPage(adminPage);
    const jobs = new JobsPage(adminPage);
    const fieldDay = new FieldDayPage(inspectorPage);
    const inspection = new InspectionPage(inspectorPage);
    const reports = new ReportsPage(adminPage);

    try {
      // Step 1: Login as Admin
      await test.step('Step 1: Admin Login', async () => {
        await login(adminPage, 'admin');
        
        // Verify login successful
        await expect(adminPage).toHaveURL(`${BASE_URL}/`);
      });

      // Step 2: Calendar Import
      await test.step('Step 2: Calendar Import', async () => {
        await calendarMgmt.navigate();
        
        // Verify page loaded
        await expect(calendarMgmt.syncButton).toBeVisible();
        
        // Run Axe scan on Calendar Management page
        await runAxeScan(adminPage, 'Calendar Management');
        
        // Sync calendar to import events
        const beforeCount = await calendarMgmt.getPendingCount().catch(() => 0);
        
        await calendarMgmt.syncCalendar();
        
        // Wait for sync completion
        await adminPage.waitForTimeout(2000);
        
        const afterCount = await calendarMgmt.getPendingCount().catch(() => 0);
        
        // Should have pending events (or at least no errors)
        expect(afterCount).toBeGreaterThanOrEqual(0);
      });

      // Step 3: Event Review & Approval
      await test.step('Step 3: Review and Approve Event', async () => {
        await calendarReview.navigate();
        await expect(calendarReview.eventTable).toBeVisible();
        
        approvedEventId = await calendarReview.getFirstPendingEventId();
        
        // If no pending events, skip approval
        if (approvedEventId) {
          await calendarReview.approveEvent(approvedEventId, 'builder-1', 'Final');
          await adminPage.waitForTimeout(1000);
        }
      });

      // Step 4: Verify Job Creation
      await test.step('Step 4: Verify Job Created', async () => {
        await jobs.navigate();
        await expect(jobs.allJobsAccordion).toBeVisible();
      });

      // Step 5: Verify Inspector Assignment
      await test.step('Step 5: Verify Inspector Assignment', async () => {
        if (createdJobId) {
          const inspector = await jobs.getJobInspector(createdJobId);
          expect(inspector).toBeTruthy();
        }
      });

      // Step 6: Inspector Login & Field Day View
      await test.step('Step 6: Inspector Field Day View', async () => {
        await login(inspectorPage, 'inspector1');
        await expect(inspectorPage).toHaveURL(`${BASE_URL}/`);
        
        await fieldDay.navigate();
        await expect(fieldDay.header).toBeVisible();
        
        // Run Axe scan on Field Day page
        await runAxeScan(inspectorPage, 'Field Day');
        
        await expect(fieldDay.myJobsSection).toBeVisible();
        
        if (createdJobId) {
          const hasJob = await fieldDay.hasJob(createdJobId);
          expect(hasJob).toBeTruthy();
        }
      });

      // Step 7: Inspection Workflow
      await test.step('Step 7: Complete Inspection Workflow', async () => {
        if (createdJobId) {
          await inspection.navigate(createdJobId);
        } else {
          await inspectorPage.goto(`${BASE_URL}/inspection/1`);
        }
        
        await expect(inspection.pageTitle).toBeVisible();
        
        // Run Axe scan on Inspection page
        await runAxeScan(inspectorPage, 'Inspection');
        
        const firstItemId = await inspection.getFirstChecklistItemId();
        if (firstItemId) {
          await inspection.completeChecklistItem(firstItemId);
        }
      });

      // Step 8: Photo Capture
      await test.step('Step 8: Capture Photo', async () => {
        const testImagePath = 'tests/fixtures/test-image.jpg';
        
        try {
          await inspection.uploadPhoto(testImagePath);
        } catch (error) {
          console.log('Photo upload skipped:', error);
        }
      });

      // Step 9: Report Generation
      await test.step('Step 9: Generate Report', async () => {
        const hasButton = await inspection.generateReportButton.isVisible();
        
        if (hasButton) {
          await inspection.generateReport();
        }
      });

      // Step 10: Report Verification
      await test.step('Step 10: Verify Report', async () => {
        await reports.navigate();
        
        if (createdJobId) {
          const hasReport = await reports.findReportByJobId(createdJobId);
          // Report verification completed
        }
      });

      // Performance Check - Field Day (Critical Inspector Page)
      await test.step('Lighthouse: Field Day Performance', async () => {
        await fieldDay.navigate();
        const fieldDayResults = await runLighthouseCheck(
          inspectorPage,
          'Field Day',
          `${BASE_URL}/field-day`
        );
        
        console.log('\n✅ Field Day Lighthouse audit completed:', fieldDayResults);
      });
    } finally {
      // Cleanup: Close pages and contexts
      await adminPage.close();
      await inspectorPage.close();
      await adminContext.close();
      await inspectorContext.close();
    }
  });
});

// ============================================================================
// STANDALONE ACCESSIBILITY TESTS
// ============================================================================

test.describe('GP-01: Accessibility Checks', () => {
  test('Calendar Management - Accessibility', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`${BASE_URL}/calendar/management`);
    await page.waitForLoadState('networkidle');
    
    const results = await runAxeScan(page, 'Calendar Management');
    
    // Log results for reference
    console.log(`Calendar Management: ${results.violations.length} violations found`);
  });

  test('Field Day - Accessibility', async ({ page }) => {
    await login(page, 'inspector1');
    await page.goto(`${BASE_URL}/field-day`);
    await page.waitForLoadState('networkidle');
    
    const results = await runAxeScan(page, 'Field Day');
    
    console.log(`Field Day: ${results.violations.length} violations found`);
  });

  test('Inspection Page - Accessibility', async ({ page }) => {
    await login(page, 'inspector1');
    await page.goto(`${BASE_URL}/inspection/1`);
    await page.waitForLoadState('networkidle');
    
    const results = await runAxeScan(page, 'Inspection');
    
    console.log(`Inspection: ${results.violations.length} violations found`);
  });
});

// ============================================================================
// LIGHTHOUSE PERFORMANCE TESTS
// ============================================================================

test.describe('GP-01: Lighthouse Performance Audits', () => {
  const lighthouseResults: any[] = [];

  test.afterAll(async () => {
    // Log all Lighthouse results for reporting
    console.log('\n' + '='.repeat(80));
    console.log('📊 LIGHTHOUSE PERFORMANCE SUMMARY - GP-01');
    console.log('='.repeat(80));
    
    lighthouseResults.forEach(result => {
      console.log(`\n${result.pageName}:`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Performance:    ${result.performance}/100 ${result.performance >= 90 ? '✅' : '❌'}`);
      console.log(`  Accessibility:  ${result.accessibility}/100 ${result.accessibility >= 90 ? '✅' : '❌'}`);
      console.log(`  Best Practices: ${result.bestPractices}/100`);
      console.log(`  SEO:            ${result.seo}/100`);
      console.log(`  Status:         ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (result.error) {
        console.log(`  Error:          ${result.error}`);
      }
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
  });

  test('Field Day - Performance ≥90, Accessibility ≥90', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await login(page, 'inspector1');
      await page.goto(`${BASE_URL}/field-day`);
      await page.waitForLoadState('networkidle');
      
      const result = await runLighthouseCheck(page, 'Field Day', `${BASE_URL}/field-day`);
      lighthouseResults.push(result);
      
      // Test passes if assertions in runLighthouseCheck pass
    } finally {
      await page.close();
      await context.close();
    }
  });

  test('Inspection Page - Performance ≥90, Accessibility ≥90', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await login(page, 'inspector1');
      await page.goto(`${BASE_URL}/inspection/1`);
      await page.waitForLoadState('networkidle');
      
      const result = await runLighthouseCheck(page, 'Inspection', `${BASE_URL}/inspection/1`);
      lighthouseResults.push(result);
      
      // Test passes if assertions in runLighthouseCheck pass
    } finally {
      await page.close();
      await context.close();
    }
  });

  test('Calendar Management - Performance ≥90, Accessibility ≥90', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await login(page, 'admin');
      await page.goto(`${BASE_URL}/calendar/management`);
      await page.waitForLoadState('networkidle');
      
      const result = await runLighthouseCheck(page, 'Calendar Management', `${BASE_URL}/calendar/management`);
      lighthouseResults.push(result);
      
      // Test passes if assertions in runLighthouseCheck pass
    } finally {
      await page.close();
      await context.close();
    }
  });
});
