/**
 * Report Instance Page - End-to-End Tests
 * 
 * Comprehensive tests for the Report Instance Viewer following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during initial load
 * - Error states with retry mechanisms for both queries
 * - Not found state for invalid/deleted reports
 * - Report metadata display (status, dates, inspector)
 * - Minnesota Code compliance display with violations
 * - Job information display
 * - Forecast data display (predicted vs actual)
 * - PDF download workflow with error handling
 * - Email report button presence
 * - Checklist items integration
 * - Navigation (back button)
 * - ErrorBoundary fallback
 * - Toast notifications for download success/failure
 * 
 * Report Instance Queries (2 total):
 * 1. /api/report-instances/:id - Main report data with job details
 * 2. /api/checklist-items?jobId=X - Associated checklist for scoring
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000);

class ReportInstancePage {
  constructor(private page: Page) {}

  async goto(reportId: string) {
    await this.page.goto(`${BASE_URL}/report-instance/${reportId}`);
  }

  // Page Elements - Header
  get backButton() {
    return this.page.getByTestId('button-back');
  }

  get pageTitle() {
    return this.page.getByTestId('text-page-title');
  }

  get jobSubtitle() {
    return this.page.getByTestId('text-job-subtitle');
  }

  get statusBadge() {
    return this.page.getByTestId('badge-status');
  }

  get downloadButton() {
    return this.page.getByTestId('button-download');
  }

  get emailButton() {
    return this.page.getByTestId('button-email');
  }

  // Skeleton Elements
  get skeletonLoading() {
    return this.page.getByTestId('skeleton-loading');
  }

  get skeletonBackButton() {
    return this.page.getByTestId('skeleton-back-button');
  }

  get skeletonTitle() {
    return this.page.getByTestId('skeleton-title');
  }

  get skeletonBadge() {
    return this.page.getByTestId('skeleton-badge');
  }

  skeletonCard(index: number) {
    return this.page.getByTestId(`skeleton-card-${index}`);
  }

  // Error States
  get errorReportQuery() {
    return this.page.getByTestId('error-report-query');
  }

  get errorTitle() {
    return this.page.getByTestId('text-error-title');
  }

  get errorMessage() {
    return this.page.getByTestId('text-error-message');
  }

  get retryReportButton() {
    return this.page.getByTestId('button-retry-report');
  }

  get backFromErrorButton() {
    return this.page.getByTestId('button-back-from-error');
  }

  get errorChecklistQuery() {
    return this.page.getByTestId('error-checklist-query');
  }

  get checklistErrorTitle() {
    return this.page.getByTestId('text-checklist-error-title');
  }

  get retryChecklistButton() {
    return this.page.getByTestId('button-retry-checklist');
  }

  // Not Found State
  get notFoundCard() {
    return this.page.getByTestId('card-not-found');
  }

  get notFoundIcon() {
    return this.page.getByTestId('icon-not-found');
  }

  get notFoundTitle() {
    return this.page.getByTestId('text-not-found-title');
  }

  get notFoundMessage() {
    return this.page.getByTestId('text-not-found-message');
  }

  get backNotFoundButton() {
    return this.page.getByTestId('button-back-not-found');
  }

  // Content Cards
  get complianceCard() {
    return this.page.getByTestId('card-compliance');
  }

  get complianceStatusBadge() {
    return this.page.getByTestId('badge-compliance-status');
  }

  get evaluationDate() {
    return this.page.getByTestId('text-evaluation-date');
  }

  get violationsList() {
    return this.page.getByTestId('list-violations');
  }

  violation(index: number) {
    return this.page.getByTestId(`violation-${index}`);
  }

  violationMetric(index: number) {
    return this.page.getByTestId(`violation-metric-${index}`);
  }

  violationActual(index: number) {
    return this.page.getByTestId(`violation-actual-${index}`);
  }

  violationSeverity(index: number) {
    return this.page.getByTestId(`violation-severity-${index}`);
  }

  get pendingMessage() {
    return this.page.getByTestId('text-pending-message');
  }

  get codeRequirements() {
    return this.page.getByTestId('text-code-requirements');
  }

  get reportInfoCard() {
    return this.page.getByTestId('card-report-info');
  }

  get createdDate() {
    return this.page.getByTestId('text-created-date');
  }

  get inspector() {
    return this.page.getByTestId('text-inspector');
  }

  get emailedTo() {
    return this.page.getByTestId('text-emailed-to');
  }

  get emailedDate() {
    return this.page.getByTestId('text-emailed-date');
  }

  get jobDetailsCard() {
    return this.page.getByTestId('card-job-details');
  }

  get jobName() {
    return this.page.getByTestId('text-job-name');
  }

  get jobAddress() {
    return this.page.getByTestId('text-job-address');
  }

  get contractor() {
    return this.page.getByTestId('text-contractor');
  }

  get inspectionType() {
    return this.page.getByTestId('text-inspection-type');
  }

  get overviewCard() {
    return this.page.getByTestId('card-overview');
  }

  get overviewText() {
    return this.page.getByTestId('text-overview');
  }

  get forecastCard() {
    return this.page.getByTestId('card-forecast');
  }

  get predictedTDL() {
    return this.page.getByTestId('text-predicted-tdl');
  }

  get predictedDLO() {
    return this.page.getByTestId('text-predicted-dlo');
  }

  get actualTDL() {
    return this.page.getByTestId('text-actual-tdl');
  }

  get actualDLO() {
    return this.page.getByTestId('text-actual-dlo');
  }

  get finalNotesCard() {
    return this.page.getByTestId('card-final-notes');
  }

  get finalNotesText() {
    return this.page.getByTestId('text-final-notes');
  }

  get reportInstanceContainer() {
    return this.page.getByTestId('report-instance-container');
  }

  // Helpers
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async login() {
    // Navigate to landing page
    await this.page.goto(BASE_URL);
    
    // Check if already logged in
    const loggedIn = await this.page.getByTestId('text-dashboard-title').isVisible().catch(() => false);
    if (loggedIn) return;

    // Login if needed
    const loginButton = this.page.getByTestId('button-login');
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await this.page.waitForURL('**/dashboard', { timeout: 10000 });
    }
  }
}

test.describe('Report Instance Page - Production Standards', () => {
  let reportPage: ReportInstancePage;

  test.beforeEach(async ({ page }) => {
    reportPage = new ReportInstancePage(page);
    await reportPage.login();
  });

  test('1. Skeleton Loading State - Should display comprehensive skeleton loaders', async ({ page }) => {
    // Intercept to delay response
    await page.route('**/api/report-instances/*', async route => {
      await page.waitForTimeout(1000);
      await route.continue();
    });

    await reportPage.goto('1');

    // Verify skeleton container is visible
    await expect(reportPage.skeletonLoading).toBeVisible();

    // Verify header skeletons
    await expect(reportPage.skeletonBackButton).toBeVisible();
    await expect(reportPage.skeletonTitle).toBeVisible();
    await expect(reportPage.skeletonBadge).toBeVisible();

    // Verify card skeletons (should have 3)
    await expect(reportPage.skeletonCard(0)).toBeVisible();
    await expect(reportPage.skeletonCard(1)).toBeVisible();
    await expect(reportPage.skeletonCard(2)).toBeVisible();

    // Wait for actual content
    await expect(reportPage.skeletonLoading).not.toBeVisible({ timeout: 5000 });
  });

  test('2. Error State - Report Query Failure with Retry', async ({ page }) => {
    // Force error on report query
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify error state displays
    await expect(reportPage.errorReportQuery).toBeVisible();
    await expect(reportPage.errorTitle).toContainText('Failed to Load Report');
    await expect(reportPage.errorMessage).toBeVisible();

    // Verify retry button exists
    await expect(reportPage.retryReportButton).toBeVisible();
    await expect(reportPage.backFromErrorButton).toBeVisible();

    // Test retry functionality
    await page.unroute('**/api/report-instances/*');
    await reportPage.retryReportButton.click();

    // Should load successfully after retry
    await expect(reportPage.errorReportQuery).not.toBeVisible({ timeout: 5000 });
  });

  test('3. Error State - Checklist Query Failure with Retry', async ({ page }) => {
    // Allow report query to succeed
    await page.route('**/api/report-instances/*', route => route.continue());
    
    // Force error on checklist query
    await page.route('**/api/checklist-items*', route => 
      route.fulfill({ status: 500, body: 'Checklist error' })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify checklist error alert displays
    await expect(reportPage.errorChecklistQuery).toBeVisible();
    await expect(reportPage.checklistErrorTitle).toContainText('Failed to Load Checklist');

    // Verify retry button exists
    await expect(reportPage.retryChecklistButton).toBeVisible();

    // Test retry functionality
    await page.unroute('**/api/checklist-items*');
    await reportPage.retryChecklistButton.click();

    // Error should disappear after successful retry
    await expect(reportPage.errorChecklistQuery).not.toBeVisible({ timeout: 5000 });
  });

  test('4. Not Found State - Invalid Report ID', async ({ page }) => {
    // Mock empty response for invalid ID
    await page.route('**/api/report-instances/99999', route => 
      route.fulfill({ status: 404, body: 'null' })
    );

    await reportPage.goto('99999');
    await reportPage.waitForLoad();

    // Verify not found card displays
    await expect(reportPage.notFoundCard).toBeVisible();
    await expect(reportPage.notFoundIcon).toBeVisible();
    await expect(reportPage.notFoundTitle).toContainText('Report Not Found');
    await expect(reportPage.notFoundMessage).toContainText("doesn't exist or has been deleted");

    // Verify back button exists
    await expect(reportPage.backNotFoundButton).toBeVisible();
  });

  test('5. Report Header - Display All Metadata', async ({ page }) => {
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify header elements
    await expect(reportPage.backButton).toBeVisible();
    await expect(reportPage.pageTitle).toContainText('Inspection Report');
    await expect(reportPage.jobSubtitle).toBeVisible();

    // Verify status badge
    await expect(reportPage.statusBadge).toBeVisible();
    const statusText = await reportPage.statusBadge.textContent();
    expect(['Draft', 'Finalized', 'Sent']).toContain(statusText);

    // Verify action buttons
    await expect(reportPage.downloadButton).toBeVisible();
    await expect(reportPage.downloadButton).toContainText('Download PDF');
    await expect(reportPage.emailButton).toBeVisible();
    await expect(reportPage.emailButton).toContainText('Email Report');
  });

  test('6. Compliance Card - Display Status and Requirements', async ({ page }) => {
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify compliance card exists
    await expect(reportPage.complianceCard).toBeVisible();
    await expect(reportPage.complianceCard).toContainText('Minnesota Code Compliance');
    await expect(reportPage.complianceCard).toContainText('2020 Minnesota Energy Code');

    // Verify compliance status badge
    await expect(reportPage.complianceStatusBadge).toBeVisible();

    // Verify Minnesota code requirements are displayed
    await expect(reportPage.codeRequirements).toBeVisible();
    await expect(reportPage.codeRequirements).toContainText('Total Duct Leakage');
    await expect(reportPage.codeRequirements).toContainText('4.0 CFM/100 sq ft');
    await expect(reportPage.codeRequirements).toContainText('Duct Leakage to Outside');
    await expect(reportPage.codeRequirements).toContainText('6.0 CFM/100 sq ft');
    await expect(reportPage.codeRequirements).toContainText('Air Changes per Hour');
    await expect(reportPage.codeRequirements).toContainText('5.0 ACH');
  });

  test('7. Compliance Card - Display Violations for Non-Compliant Report', async ({ page }) => {
    // Mock non-compliant report with violations
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          complianceStatus: 'non-compliant',
          complianceFlags: JSON.stringify({
            violations: [
              { metric: 'Total Duct Leakage', threshold: 4.0, actualValue: 5.2, severity: 'critical' },
              { metric: 'Air Changes per Hour', threshold: 5.0, actualValue: 6.1, severity: 'warning' }
            ],
            evaluatedAt: '2025-10-31T12:00:00Z'
          }),
          data: '{}',
          createdAt: '2025-10-31T10:00:00Z'
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify violations list is visible
    await expect(reportPage.violationsList).toBeVisible();

    // Verify first violation
    await expect(reportPage.violation(0)).toBeVisible();
    await expect(reportPage.violationMetric(0)).toContainText('Total Duct Leakage');
    await expect(reportPage.violationActual(0)).toContainText('5.2');
    await expect(reportPage.violationSeverity(0)).toContainText('critical');

    // Verify second violation
    await expect(reportPage.violation(1)).toBeVisible();
    await expect(reportPage.violationMetric(1)).toContainText('Air Changes per Hour');
    await expect(reportPage.violationActual(1)).toContainText('6.1');
  });

  test('8. Compliance Card - Display Pending Message', async ({ page }) => {
    // Mock pending compliance status
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          complianceStatus: 'pending',
          data: '{}',
          createdAt: '2025-10-31T10:00:00Z'
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify pending message is displayed
    await expect(reportPage.pendingMessage).toBeVisible();
    await expect(reportPage.pendingMessage).toContainText('Awaiting actual test results');
  });

  test('9. Report Info Card - Display Metadata', async ({ page }) => {
    // Mock report with full metadata
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: JSON.stringify({ inspector: 'John Smith' }),
          createdAt: '2025-10-31T10:00:00Z',
          emailedTo: 'client@example.com',
          emailedAt: '2025-10-31T15:00:00Z'
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify report info card
    await expect(reportPage.reportInfoCard).toBeVisible();
    await expect(reportPage.createdDate).toBeVisible();
    await expect(reportPage.inspector).toContainText('John Smith');
    await expect(reportPage.emailedTo).toContainText('client@example.com');
    await expect(reportPage.emailedDate).toBeVisible();
  });

  test('10. Job Details Card - Display Job Information', async ({ page }) => {
    // Mock report with job details
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: '{}',
          job: {
            id: 1,
            name: 'Test Job 123',
            address: '123 Main St',
            contractor: 'ABC Builders',
            inspectionType: 'Final'
          }
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify job details card
    await expect(reportPage.jobDetailsCard).toBeVisible();
    await expect(reportPage.jobName).toContainText('Test Job 123');
    await expect(reportPage.jobAddress).toContainText('123 Main St');
    await expect(reportPage.contractor).toContainText('ABC Builders');
    await expect(reportPage.inspectionType).toContainText('Final');
  });

  test('11. Overview Card - Display When Present', async ({ page }) => {
    // Mock report with overview
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: JSON.stringify({ 
            overview: 'This inspection was conducted on a newly constructed single-family home.'
          })
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify overview card
    await expect(reportPage.overviewCard).toBeVisible();
    await expect(reportPage.overviewText).toContainText('newly constructed single-family home');
  });

  test('12. Forecast Card - Display Predicted and Actual Values', async ({ page }) => {
    // Mock report with forecast data
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: JSON.stringify({ 
            forecast: {
              predictedTDL: 3.2,
              predictedDLO: 2.8,
              actualTDL: 3.5,
              actualDLO: 2.9
            }
          })
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify forecast card
    await expect(reportPage.forecastCard).toBeVisible();
    await expect(reportPage.forecastCard).toContainText('Duct Leakage Forecast');
    
    // Verify predicted values
    await expect(reportPage.predictedTDL).toContainText('3.2');
    await expect(reportPage.predictedDLO).toContainText('2.8');
    
    // Verify actual values
    await expect(reportPage.actualTDL).toContainText('3.5');
    await expect(reportPage.actualDLO).toContainText('2.9');
  });

  test('13. Final Notes Card - Display When Present', async ({ page }) => {
    // Mock report with final notes
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: JSON.stringify({ 
            finalNotes: 'All systems passed inspection.\nMinor air sealing recommended in attic.'
          })
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify final notes card
    await expect(reportPage.finalNotesCard).toBeVisible();
    await expect(reportPage.finalNotesText).toContainText('All systems passed inspection');
    await expect(reportPage.finalNotesText).toContainText('Minor air sealing recommended');
  });

  test('14. PDF Download - Success Workflow', async ({ page }) => {
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Mock successful PDF generation
    await page.route('**/api/reports/*/pdf', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('mock-pdf-content')
      })
    );

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    await reportPage.downloadButton.click();

    // Verify download initiated
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('report-');
    expect(download.suggestedFilename()).toContain('.pdf');

    // Verify success toast appears
    await expect(page.getByText('PDF Downloaded')).toBeVisible({ timeout: 3000 });
  });

  test('15. PDF Download - Error Handling', async ({ page }) => {
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Mock failed PDF generation
    await page.route('**/api/reports/*/pdf', route => 
      route.fulfill({ status: 500, body: 'PDF generation failed' })
    );

    // Click download button
    await reportPage.downloadButton.click();

    // Verify error toast appears
    await expect(page.getByText('Download Failed')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unable to generate PDF')).toBeVisible();
  });

  test('16. Navigation - Back Button Functionality', async ({ page }) => {
    // Navigate to reports first
    await page.goto(`${BASE_URL}/reports`);
    await reportPage.waitForLoad();

    // Then navigate to report instance
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Click back button
    await reportPage.backButton.click();

    // Should navigate back (history.back())
    await page.waitForLoadState('networkidle');
    
    // Verify we're back on reports page (or previous page)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/report-instance/');
  });

  test('17. Email Button - Present and Clickable', async ({ page }) => {
    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Verify email button is present
    await expect(reportPage.emailButton).toBeVisible();
    await expect(reportPage.emailButton).toBeEnabled();
    await expect(reportPage.emailButton).toContainText('Email Report');
  });

  test('18. Status Badge Variants - Draft, Finalized, Sent', async ({ page }) => {
    // Test Draft status
    await page.route('**/api/report-instances/1', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, data: '{}' })
      })
    );
    await reportPage.goto('1');
    await reportPage.waitForLoad();
    await expect(reportPage.statusBadge).toContainText('Draft');

    // Test Finalized status
    await page.route('**/api/report-instances/2', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 2, data: '{}', pdfUrl: 'http://example.com/report.pdf' })
      })
    );
    await reportPage.goto('2');
    await reportPage.waitForLoad();
    await expect(reportPage.statusBadge).toContainText('Finalized');

    // Test Sent status
    await page.route('**/api/report-instances/3', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          id: 3, 
          data: '{}', 
          pdfUrl: 'http://example.com/report.pdf',
          emailedTo: 'client@example.com',
          emailedAt: '2025-10-31T15:00:00Z'
        })
      })
    );
    await reportPage.goto('3');
    await reportPage.waitForLoad();
    await expect(reportPage.statusBadge).toContainText('Sent');
  });

  test('19. Data Validation - Safe JSON Parsing', async ({ page }) => {
    // Mock report with malformed JSON in data field
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          data: '{invalid json}', // Malformed JSON
          complianceFlags: '{also invalid}' // Malformed compliance flags
        })
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // Page should still render without crashing
    await expect(reportPage.pageTitle).toBeVisible();
    await expect(reportPage.complianceCard).toBeVisible();
    
    // Should gracefully handle missing data
    // (won't show overview, forecast, etc. since data parsing failed)
    await expect(reportPage.overviewCard).not.toBeVisible();
    await expect(reportPage.forecastCard).not.toBeVisible();
  });

  test('20. ErrorBoundary - Handles Component Crashes', async ({ page }) => {
    // Force a component crash by providing invalid data structure
    await page.route('**/api/report-instances/*', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid-not-even-json'
      })
    );

    await reportPage.goto('1');
    await reportPage.waitForLoad();

    // ErrorBoundary should catch the error
    // Look for error boundary fallback UI
    const errorText = page.getByText(/something went wrong/i);
    const hasErrorBoundary = await errorText.isVisible().catch(() => false);
    
    // Page should either show error boundary or handle gracefully
    expect(hasErrorBoundary || await reportPage.errorReportQuery.isVisible()).toBeTruthy();
  });
});
