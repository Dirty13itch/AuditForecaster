import { Page, Locator, expect } from '@playwright/test';

/**
 * JobsPage - Page object for the Jobs management page
 * 
 * Handles job creation, viewing, updating, and deletion through the Jobs interface
 */
export class JobsPage {
  readonly page: Page;
  readonly createJobButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createJobButton = page.getByTestId('button-create-job');
  }

  /**
   * Navigate to the Jobs page
   */
  async goto() {
    await this.page.goto('/jobs');
  }

  /**
   * Create a new job using the job creation dialog
   * 
   * @param jobData - Job information including name, address, contractor, and inspection type
   */
  async createJob(jobData: {
    name: string;
    address: string;
    contractor: string;
    inspectionType: string;
    builderId?: string;
  }) {
    // Click the create job button to open the dialog
    await this.createJobButton.click();
    
    // Wait for the dialog to be visible
    await this.page.getByTestId('modal-new-job').waitFor({ state: 'visible' });
    
    // Fill job form fields using the actual data-testid attributes from JobDialog
    await this.page.getByTestId('input-contractor').fill(jobData.contractor);
    await this.page.getByTestId('input-address').fill(jobData.address);
    
    // Select builder if provided
    if (jobData.builderId) {
      await this.page.getByTestId('select-builder').click();
      await this.page.getByRole('option', { name: jobData.builderId }).click();
    }
    
    // Select inspection type
    await this.page.getByTestId('select-inspection-type').click();
    await this.page.getByRole('option', { name: jobData.inspectionType }).click();
    
    // The job name is auto-generated based on inspection type and date
    // but we can override it if needed
    await this.page.getByTestId('input-job-name').clear();
    await this.page.getByTestId('input-job-name').fill(jobData.name);
    
    // Submit the form
    await this.page.getByTestId('button-save').click();
    
    // Wait for the dialog to close (job created)
    await this.page.getByTestId('modal-new-job').waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Find a job card by job name
   * Note: In the actual app, jobs are displayed as cards, not in a separate detail view
   */
  async findJobByName(name: string): Promise<Locator> {
    return this.page.getByText(name).first();
  }

  /**
   * Wait for a job to appear in the list
   */
  async waitForJob(name: string, timeout: number = 10000) {
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout });
  }

  /**
   * Verify a job appears in the jobs list
   */
  async verifyJobExists(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  /**
   * Click on a job card to view/edit it
   */
  async clickJob(name: string) {
    const job = await this.findJobByName(name);
    await job.click();
  }

  /**
   * Delete a job
   * Note: This is a placeholder - the actual delete flow might be different
   * You would need to check if there's a delete button in the job detail view or context menu
   */
  async deleteJob(name: string) {
    // This would need to be implemented based on the actual delete UI flow
    // For now, this is a placeholder
    const job = await this.findJobByName(name);
    
    // Look for delete button or action
    // This might need to be updated based on the actual implementation
    await job.click();
    
    // Try to find and click a delete button
    const deleteButton = this.page.getByTestId('button-delete-job');
    if (await deleteButton.isVisible({ timeout: 1000 })) {
      await deleteButton.click();
      
      // Confirm deletion if there's a confirmation dialog
      const confirmButton = this.page.getByTestId('button-confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
    }
  }

  /**
   * Get the status badge for a job
   */
  async getJobStatus(jobName: string): Promise<string> {
    const job = await this.findJobByName(jobName);
    const statusBadge = job.locator('[data-testid^="status-"]').or(job.locator('text=/pending|scheduled|in-progress|completed/i'));
    return await statusBadge.textContent() || '';
  }

  /**
   * Verify job has expected status
   */
  async verifyJobStatus(jobName: string, expectedStatus: string) {
    const status = await this.getJobStatus(jobName);
    expect(status.toLowerCase()).toContain(expectedStatus.toLowerCase());
  }

  /**
   * Verify the jobs page is loaded
   */
  async verifyPageLoaded() {
    await expect(this.createJobButton).toBeVisible();
  }

  /**
   * Wait for the jobs list to load
   */
  async waitForJobsToLoad(timeout: number = 10000) {
    // Wait for either the create job button or jobs list to be visible
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
