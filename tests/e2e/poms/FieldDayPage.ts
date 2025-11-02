/**
 * Field Day Page Object Model
 * 
 * Represents the inspector's daily job schedule and job selection interface.
 * This page shows assigned jobs for the current day and allows navigation to inspections.
 */

import { type Page, type Locator } from '@playwright/test';

export class FieldDayPage {
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
    await this.page.goto(`${this.baseUrl}/field-day`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get header(): Locator {
    return this.page.getByTestId('header-field-day');
  }

  get myJobsSection(): Locator {
    return this.page.getByTestId('section-my-jobs');
  }

  get allJobsSection(): Locator {
    return this.page.getByTestId('section-all-jobs');
  }

  get myJobsCount(): Locator {
    return this.page.getByTestId('badge-my-jobs-count');
  }

  get allJobsCount(): Locator {
    return this.page.getByTestId('badge-all-jobs-count');
  }

  get datePicker(): Locator {
    return this.page.getByTestId('button-date-picker');
  }

  get showAllToggle(): Locator {
    return this.page.getByTestId('toggle-show-all');
  }

  get summaryBar(): Locator {
    return this.page.getByTestId('bar-summary');
  }

  jobCard(jobId: string | number): Locator {
    return this.page.getByTestId(`card-job-${jobId}`);
  }

  jobTypeBadge(jobId: string | number): Locator {
    return this.page.getByTestId(`badge-job-type-${jobId}`);
  }

  jobInspectorText(jobId: string | number): Locator {
    return this.page.getByTestId(`text-inspector-${jobId}`);
  }

  previewReportButton(jobId: string | number): Locator {
    return this.page.getByTestId(`button-preview-report-${jobId}`);
  }

  statusButton(jobId: string | number, status: string): Locator {
    return this.page.getByTestId(`button-status-${status}-${jobId}`);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Check if a specific job is visible on the page
   */
  async hasJob(jobId: string | number): Promise<boolean> {
    return await this.jobCard(jobId).isVisible();
  }

  /**
   * Get the text content of a job card
   */
  async getJobCardText(jobId: string | number): Promise<string> {
    return await this.jobCard(jobId).textContent() || '';
  }

  /**
   * Navigate to inspection workflow by clicking on a job card
   */
  async navigateToInspection(jobId: string | number) {
    await this.jobCard(jobId).click();
    await this.page.waitForURL(`**/inspection/${jobId}`);
  }

  /**
   * Find the first job card that matches the given inspection type
   * @param inspectionType - The type to search for (e.g., "Final", "Rough", "Pre-drywall")
   * @returns Job ID if found, null otherwise
   */
  async findJobByType(inspectionType: string): Promise<string | null> {
    const jobCards = this.page.locator('[data-testid^="card-job-"]');
    const count = await jobCards.count();

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const text = await card.textContent();

      if (text && text.includes(inspectionType)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-job-', '') || null;
      }
    }

    return null;
  }

  /**
   * Find the first job with "scheduled" status
   * @returns Job ID if found, null otherwise
   */
  async findScheduledJob(): Promise<string | null> {
    const jobCards = this.page.locator('[data-testid^="card-job-"]');
    const count = await jobCards.count();

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const text = await card.textContent();

      // Look for "Scheduled" badge or status
      if (text && (text.includes('Scheduled') || text.includes('scheduled'))) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-job-', '') || null;
      }
    }

    return null;
  }

  /**
   * Find a job that matches both inspection type and status
   * @param inspectionType - The type to search for (e.g., "Final")
   * @param status - The status to search for (e.g., "scheduled")
   * @returns Job ID if found, null otherwise
   */
  async findJobByTypeAndStatus(inspectionType: string, status: string): Promise<string | null> {
    const jobCards = this.page.locator('[data-testid^="card-job-"]');
    const count = await jobCards.count();

    for (let i = 0; i < count; i++) {
      const card = jobCards.nth(i);
      const text = await card.textContent();

      if (text && text.includes(inspectionType) && text.toLowerCase().includes(status.toLowerCase())) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-job-', '') || null;
      }
    }

    return null;
  }

  /**
   * Get the count of jobs in "My Jobs" section
   */
  async getMyJobsCount(): Promise<number> {
    const text = await this.myJobsCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get the count of jobs in "All Jobs" section
   */
  async getAllJobsCount(): Promise<number> {
    const text = await this.allJobsCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Toggle the "Show All" switch to see all jobs
   */
  async toggleShowAll() {
    await this.showAllToggle.click();
    await this.page.waitForTimeout(500); // Wait for UI update
  }

  /**
   * Get inspector name for a specific job
   */
  async getJobInspector(jobId: string | number): Promise<string | null> {
    const text = await this.jobInspectorText(jobId).textContent();
    return text?.trim() || null;
  }

  /**
   * Get job type for a specific job
   */
  async getJobType(jobId: string | number): Promise<string | null> {
    const text = await this.jobTypeBadge(jobId).textContent();
    return text?.trim() || null;
  }
}
