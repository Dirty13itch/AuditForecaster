/**
 * Tax Credit Dashboard Page Object Model
 * 
 * Represents the 45L Tax Credit dashboard interface for project list,
 * filters, navigation, and summary KPIs.
 */

import { type Page, type Locator } from '@playwright/test';

export class TaxCreditDashboardPage {
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
    await this.page.goto(`${this.baseUrl}/tax-credits`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get newProjectButton(): Locator {
    return this.page.getByTestId('button-new-project');
  }

  // KPI Metric Cards
  get totalCreditsCard(): Locator {
    return this.page.getByTestId('card-metric-total-credits');
  }

  get totalCreditsText(): Locator {
    return this.page.getByTestId('text-total-credits');
  }

  get activeProjectsCard(): Locator {
    return this.page.getByTestId('card-metric-active-projects');
  }

  get activeProjectsText(): Locator {
    return this.page.getByTestId('text-active-projects');
  }

  get complianceRateCard(): Locator {
    return this.page.getByTestId('card-metric-compliance-rate');
  }

  get complianceRateText(): Locator {
    return this.page.getByTestId('text-compliance-rate');
  }

  get totalUnitsCard(): Locator {
    return this.page.getByTestId('card-metric-total-units');
  }

  get totalUnitsText(): Locator {
    return this.page.getByTestId('text-total-units');
  }

  // Tabs
  get activeTab(): Locator {
    return this.page.getByTestId('tab-active');
  }

  get yearTab(): Locator {
    return this.page.getByTestId('tab-year');
  }

  get builderTab(): Locator {
    return this.page.getByTestId('tab-builder');
  }

  // Recent Projects
  get recentProjectsCard(): Locator {
    return this.page.getByTestId('card-recent-projects');
  }

  get recentProjectsList(): Locator {
    return this.page.getByTestId('list-recent-projects');
  }

  projectCard(projectId: string): Locator {
    return this.page.getByTestId(`card-project-${projectId}`);
  }

  projectName(projectId: string): Locator {
    return this.page.getByTestId(`text-name-${projectId}`);
  }

  projectInfo(projectId: string): Locator {
    return this.page.getByTestId(`text-info-${projectId}`);
  }

  projectAmount(projectId: string): Locator {
    return this.page.getByTestId(`text-amount-${projectId}`);
  }

  projectStatusBadge(projectId: string): Locator {
    return this.page.getByTestId(`badge-status-${projectId}`);
  }

  // Year filter
  yearFilterButton(year: number): Locator {
    return this.page.getByTestId(`button-year-${year}`);
  }

  // Empty state
  get emptyRecentProjects(): Locator {
    return this.page.getByTestId('empty-recent-projects');
  }

  // Error states
  get errorSummaryAlert(): Locator {
    return this.page.getByTestId('alert-error-summary');
  }

  get errorRecentAlert(): Locator {
    return this.page.getByTestId('alert-error-recent');
  }

  get errorProjectsAlert(): Locator {
    return this.page.getByTestId('alert-error-projects');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Navigate to create new project page
   */
  async createNewProject() {
    await this.newProjectButton.click();
    await this.page.waitForURL('**/tax-credits/projects/new');
  }

  /**
   * Navigate to project detail page
   */
  async openProject(projectId: string) {
    await this.projectCard(projectId).click();
    await this.page.waitForURL(`**/tax-credits/projects/${projectId}`);
  }

  /**
   * Find project by name
   */
  async findProjectByName(name: string): Promise<string | null> {
    const projectCards = this.page.locator('[data-testid^="card-project-"]');
    const count = await projectCards.count();

    for (let i = 0; i < count; i++) {
      const card = projectCards.nth(i);
      const text = await card.textContent();

      if (text && text.includes(name)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-project-', '') || null;
      }
    }

    return null;
  }

  /**
   * Find first project (any project from seed data)
   */
  async findFirstProject(): Promise<string | null> {
    const firstCard = this.page.locator('[data-testid^="card-project-"]').first();
    const isVisible = await firstCard.isVisible().catch(() => false);

    if (!isVisible) return null;

    const testId = await firstCard.getAttribute('data-testid');
    return testId?.replace('card-project-', '') || null;
  }

  /**
   * Get project status
   */
  async getProjectStatus(projectId: string): Promise<string | null> {
    return await this.projectStatusBadge(projectId).textContent();
  }

  /**
   * Get total credits value
   */
  async getTotalCredits(): Promise<string | null> {
    return await this.totalCreditsText.textContent();
  }

  /**
   * Get active projects count
   */
  async getActiveProjectsCount(): Promise<string | null> {
    return await this.activeProjectsText.textContent();
  }

  /**
   * Get compliance rate
   */
  async getComplianceRate(): Promise<string | null> {
    return await this.complianceRateText.textContent();
  }

  /**
   * Switch to specific year tab and filter
   */
  async filterByYear(year: number) {
    await this.yearTab.click();
    await this.page.waitForTimeout(300);
    await this.yearFilterButton(year).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if page is in error state
   */
  async hasErrors(): Promise<boolean> {
    const summaryError = await this.errorSummaryAlert.isVisible().catch(() => false);
    const recentError = await this.errorRecentAlert.isVisible().catch(() => false);
    const projectsError = await this.errorProjectsAlert.isVisible().catch(() => false);

    return summaryError || recentError || projectsError;
  }

  /**
   * Verify dashboard loaded successfully
   */
  async verifyDashboardLoaded(): Promise<boolean> {
    const titleVisible = await this.pageTitle.isVisible();
    const metricsVisible = await this.totalCreditsCard.isVisible();

    return titleVisible && metricsVisible;
  }
}
