/**
 * Reports Page Object Model
 * 
 * Represents the reports interface for generating, viewing, and managing
 * inspection reports and templates.
 */

import { type Page, type Locator } from '@playwright/test';

export class ReportsPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async navigate() {
    await this.page.goto(`${this.baseUrl}/reports`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get generateReportButton(): Locator {
    return this.page.getByTestId('button-generate-report');
  }

  // Tabs
  get templatesTab(): Locator {
    return this.page.getByTestId('tab-templates');
  }

  get instancesTab(): Locator {
    return this.page.getByTestId('tab-instances');
  }

  // Templates tab
  get searchTemplatesInput(): Locator {
    return this.page.getByTestId('input-search-templates');
  }

  get createTemplateButton(): Locator {
    return this.page.getByTestId('button-create-template');
  }

  templateCard(templateId: string | number): Locator {
    return this.page.getByTestId(`card-template-${templateId}`);
  }

  templateName(templateId: string | number): Locator {
    return this.page.getByTestId(`text-template-name-${templateId}`);
  }

  templateDescription(templateId: string | number): Locator {
    return this.page.getByTestId(`text-template-description-${templateId}`);
  }

  templatePreviewButton(templateId: string | number): Locator {
    return this.page.getByTestId(`button-preview-${templateId}`);
  }

  templateEditButton(templateId: string | number): Locator {
    return this.page.getByTestId(`button-edit-${templateId}`);
  }

  templateDeleteButton(templateId: string | number): Locator {
    return this.page.getByTestId(`button-delete-${templateId}`);
  }

  // Instances tab (Generated Reports)
  get complianceFilter(): Locator {
    return this.page.getByTestId('filter-report-compliance');
  }

  get reportCountText(): Locator {
    return this.page.getByTestId('text-report-count');
  }

  reportCard(reportId: string | number): Locator {
    return this.page.getByTestId(`card-report-${reportId}`);
  }

  reportJobText(reportId: string | number): Locator {
    return this.page.getByTestId(`text-report-job-${reportId}`);
  }

  reportAddressText(reportId: string | number): Locator {
    return this.page.getByTestId(`text-report-address-${reportId}`);
  }

  reportStatusBadge(reportId: string | number): Locator {
    return this.page.getByTestId(`badge-status-${reportId}`);
  }

  reportScoreBadge(reportId: string | number): Locator {
    return this.page.getByTestId(`badge-score-${reportId}`);
  }

  reportComplianceBadge(reportId: string | number): Locator {
    return this.page.getByTestId(`badge-compliance-${reportId}`);
  }

  reportTemplateText(reportId: string | number): Locator {
    return this.page.getByTestId(`text-report-template-${reportId}`);
  }

  reportDateText(reportId: string | number): Locator {
    return this.page.getByTestId(`text-report-date-${reportId}`);
  }

  reportEmailText(reportId: string | number): Locator {
    return this.page.getByTestId(`text-report-email-${reportId}`);
  }

  reportViewButton(reportId: string | number): Locator {
    return this.page.getByTestId(`button-view-${reportId}`);
  }

  reportDownloadButton(reportId: string | number): Locator {
    return this.page.getByTestId(`button-download-${reportId}`);
  }

  reportShareButton(reportId: string | number): Locator {
    return this.page.getByTestId(`button-share-${reportId}`);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Switch to Templates tab
   */
  async viewTemplates() {
    await this.templatesTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to Generated Reports tab
   */
  async viewReports() {
    await this.instancesTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for templates
   */
  async searchTemplates(query: string) {
    await this.viewTemplates();
    await this.searchTemplatesInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  /**
   * Find a report by job ID
   */
  async findReportByJobId(jobId: string | number): Promise<string | null> {
    await this.viewReports();
    
    const reportCards = this.page.locator('[data-testid^="card-report-"]');
    const count = await reportCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = reportCards.nth(i);
      const text = await card.textContent();
      
      // Check if the card contains the job ID
      if (text && (text.includes(`Job ${jobId}`) || text.includes(`#${jobId}`))) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-report-', '') || null;
      }
    }
    
    return null;
  }

  /**
   * Find a report by job address
   */
  async findReportByAddress(address: string): Promise<string | null> {
    await this.viewReports();
    
    const reportCards = this.page.locator('[data-testid^="card-report-"]');
    const count = await reportCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = reportCards.nth(i);
      const text = await card.textContent();
      
      if (text && text.includes(address)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-report-', '') || null;
      }
    }
    
    return null;
  }

  /**
   * Check if a report exists for a given job
   */
  async hasReportForJob(jobId: string | number): Promise<boolean> {
    const reportId = await this.findReportByJobId(jobId);
    return reportId !== null;
  }

  /**
   * View report details
   */
  async viewReport(reportId: string | number) {
    await this.reportViewButton(reportId).click();
    await this.page.waitForURL(`**/report-instance/${reportId}`);
  }

  /**
   * Download report PDF
   */
  async downloadReport(reportId: string | number): Promise<boolean> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.reportDownloadButton(reportId).click();
    
    const download = await downloadPromise;
    return download !== null;
  }

  /**
   * Share/email report
   */
  async shareReport(reportId: string | number) {
    await this.reportShareButton(reportId).click();
    // Wait for share dialog to open
    await this.page.waitForTimeout(500);
  }

  /**
   * Get report status
   */
  async getReportStatus(reportId: string | number): Promise<string | null> {
    return await this.reportStatusBadge(reportId).textContent();
  }

  /**
   * Get report compliance status
   */
  async getReportCompliance(reportId: string | number): Promise<string | null> {
    return await this.reportComplianceBadge(reportId).textContent();
  }

  /**
   * Get report score
   */
  async getReportScore(reportId: string | number): Promise<number | null> {
    const text = await this.reportScoreBadge(reportId).textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Filter reports by compliance status
   */
  async filterByCompliance(status: 'all' | 'pass' | 'fail' | 'warning') {
    await this.viewReports();
    await this.complianceFilter.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count of generated reports
   */
  async getReportCount(): Promise<number> {
    await this.viewReports();
    const text = await this.reportCountText.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Generate a new report
   */
  async generateNewReport() {
    await this.generateReportButton.click();
    // Wait for generation dialog or navigation
    await this.page.waitForTimeout(1000);
  }
}
