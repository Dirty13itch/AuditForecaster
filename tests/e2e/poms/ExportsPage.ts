/**
 * Exports Page Object Model (Tax Credit Exports)
 * 
 * Represents the tax credit exports/reports page interface for viewing
 * export packages, download verification, and audit trail.
 * 
 * Based on TaxCreditReports page structure.
 */

import { type Page, type Locator } from '@playwright/test';

export class ExportsPage {
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
    await this.page.goto(`${this.baseUrl}/tax-credits/reports`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get pageDescription(): Locator {
    return this.page.getByTestId('text-page-description');
  }

  // Export buttons
  get exportCSVButton(): Locator {
    return this.page.getByTestId('button-export-csv');
  }

  get exportPDFButton(): Locator {
    return this.page.getByTestId('button-export-pdf');
  }

  get exportIRSButton(): Locator {
    return this.page.getByTestId('button-export-irs');
  }

  // Filters
  get filtersCard(): Locator {
    return this.page.getByTestId('card-filters');
  }

  get yearSelect(): Locator {
    return this.page.getByTestId('select-year');
  }

  get builderSelect(): Locator {
    return this.page.getByTestId('select-builder');
  }

  get generateReportButton(): Locator {
    return this.page.getByTestId('button-generate-report');
  }

  // Metric Cards
  get totalProjectsCard(): Locator {
    return this.page.getByTestId('card-metric-total-projects');
  }

  get totalProjectsText(): Locator {
    return this.page.getByTestId('text-total-projects');
  }

  get qualifiedUnitsCard(): Locator {
    return this.page.getByTestId('card-metric-qualified-units');
  }

  get qualifiedUnitsText(): Locator {
    return this.page.getByTestId('text-qualified-units');
  }

  get totalCreditsCard(): Locator {
    return this.page.getByTestId('card-metric-total-credits');
  }

  get totalCreditsText(): Locator {
    return this.page.getByTestId('text-total-credits');
  }

  get complianceRateCard(): Locator {
    return this.page.getByTestId('card-metric-compliance-rate');
  }

  get complianceRateText(): Locator {
    return this.page.getByTestId('text-compliance-rate');
  }

  // Tabs
  get tabsList(): Locator {
    return this.page.getByTestId('tabslist-main');
  }

  get overviewTab(): Locator {
    return this.page.getByTestId('tab-overview');
  }

  get buildersTab(): Locator {
    return this.page.getByTestId('tab-builders');
  }

  get taxYearTab(): Locator {
    return this.page.getByTestId('tab-taxyear');
  }

  get analyticsTab(): Locator {
    return this.page.getByTestId('tab-analytics');
  }

  // Recent Certifications Table
  get recentCertificationsCard(): Locator {
    return this.page.getByTestId('card-table-recent');
  }

  get recentCertificationsTable(): Locator {
    return this.page.getByTestId('table-recent-certifications');
  }

  certificationRow(projectId: string): Locator {
    return this.page.getByTestId(`row-project-${projectId}`);
  }

  certificationName(projectId: string): Locator {
    return this.page.getByTestId(`cell-name-${projectId}`);
  }

  certificationBuilder(projectId: string): Locator {
    return this.page.getByTestId(`cell-builder-${projectId}`);
  }

  certificationUnits(projectId: string): Locator {
    return this.page.getByTestId(`cell-units-${projectId}`);
  }

  certificationAmount(projectId: string): Locator {
    return this.page.getByTestId(`cell-amount-${projectId}`);
  }

  certificationDownloadButton(projectId: string): Locator {
    return this.page.getByTestId(`button-download-${projectId}`);
  }

  // Charts
  get statusChartCard(): Locator {
    return this.page.getByTestId('card-chart-status');
  }

  get monthlyChartCard(): Locator {
    return this.page.getByTestId('card-chart-monthly');
  }

  // Error states
  get errorProjectsAlert(): Locator {
    return this.page.getByTestId('alert-error-projects');
  }

  get errorBuildersAlert(): Locator {
    return this.page.getByTestId('alert-error-builders');
  }

  get retryProjectsButton(): Locator {
    return this.page.getByTestId('button-retry-projects');
  }

  get retryBuildersButton(): Locator {
    return this.page.getByTestId('button-retry-builders');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Export to CSV
   */
  async exportToCSV() {
    await this.exportCSVButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Export to PDF
   */
  async exportToPDF() {
    await this.exportPDFButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Export IRS Form 8908
   */
  async exportIRSForm() {
    await this.exportIRSButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by year
   */
  async filterByYear(year: string) {
    await this.yearSelect.click();
    await this.page.getByTestId(`select-year-${year}`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by builder
   */
  async filterByBuilder(builderId: string) {
    await this.builderSelect.click();
    await this.page.getByTestId(`select-builder-${builderId}`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Generate custom report
   */
  async generateReport() {
    await this.generateReportButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Switch to overview tab
   */
  async openOverviewTab() {
    await this.overviewTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to builders tab
   */
  async openBuildersTab() {
    await this.buildersTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to tax year tab
   */
  async openTaxYearTab() {
    await this.taxYearTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to analytics tab
   */
  async openAnalyticsTab() {
    await this.analyticsTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Find certification by project name
   */
  async findCertificationByName(projectName: string): Promise<string | null> {
    const rows = this.page.locator('[data-testid^="row-project-"]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();

      if (text && text.includes(projectName)) {
        const testId = await row.getAttribute('data-testid');
        return testId?.replace('row-project-', '') || null;
      }
    }

    return null;
  }

  /**
   * Download certification package
   */
  async downloadCertification(projectId: string) {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
    await this.certificationDownloadButton(projectId).click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Get total projects count
   */
  async getTotalProjects(): Promise<string | null> {
    return await this.totalProjectsText.textContent();
  }

  /**
   * Get qualified units count
   */
  async getQualifiedUnits(): Promise<string | null> {
    return await this.qualifiedUnitsText.textContent();
  }

  /**
   * Get total credits amount
   */
  async getTotalCredits(): Promise<string | null> {
    return await this.totalCreditsText.textContent();
  }

  /**
   * Get compliance rate
   */
  async getComplianceRate(): Promise<string | null> {
    return await this.complianceRateText.textContent();
  }

  /**
   * Verify recent certification exists
   */
  async hasRecentCertification(projectName: string): Promise<boolean> {
    const projectId = await this.findCertificationByName(projectName);
    return projectId !== null;
  }

  /**
   * Get certification count
   */
  async getCertificationCount(): Promise<number> {
    const rows = this.page.locator('[data-testid^="row-project-"]');
    return await rows.count();
  }

  /**
   * Check if page has errors
   */
  async hasErrors(): Promise<boolean> {
    const projectsError = await this.errorProjectsAlert.isVisible().catch(() => false);
    const buildersError = await this.errorBuildersAlert.isVisible().catch(() => false);

    return projectsError || buildersError;
  }

  /**
   * Verify page loaded successfully
   */
  async verifyPageLoaded(): Promise<boolean> {
    const titleVisible = await this.pageTitle.isVisible();
    const metricsVisible = await this.totalProjectsCard.isVisible();

    return titleVisible && metricsVisible;
  }
}
