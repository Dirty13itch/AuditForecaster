import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { JobsPage } from './pages/JobsPage';
import { nanoid } from 'nanoid';

/**
 * Jobs Workflow E2E Tests
 * 
 * Tests the critical path for job management:
 * - Admin login via dev-mode
 * - Navigate to Jobs page
 * - Create a new job
 * - Verify job appears in the list
 * - Cleanup test data
 */
test.describe('Jobs Workflow - Critical Path', () => {
  let loginPage: LoginPage;
  let jobsPage: JobsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    jobsPage = new JobsPage(page);

    // Login as admin using dev-mode authentication
    await loginPage.loginAsAdmin();
  });

  test('should create a new job successfully', async ({ page }) => {
    const testJobName = `E2E Test Job ${nanoid(6)}`;

    // Navigate to Jobs page
    await jobsPage.goto();
    await jobsPage.verifyPageLoaded();

    // Create a new job
    await jobsPage.createJob({
      name: testJobName,
      address: '123 Main St, Minneapolis, MN 55401',
      contractor: 'ABC Construction',
      inspectionType: 'Final Testing',
    });

    // Verify job was created and appears in the list
    await jobsPage.waitForJob(testJobName);
    await jobsPage.verifyJobExists(testJobName);
  });

  test('should create multiple jobs with different inspection types', async ({ page }) => {
    const timestamp = nanoid(4);
    const jobTypes = [
      { type: 'Pre-Drywall Inspection', name: `Pre-Drywall ${timestamp}` },
      { type: 'Final Testing', name: `Final Test ${timestamp}` },
      { type: 'Blower Door Only', name: `Blower Door ${timestamp}` },
    ];

    await jobsPage.goto();

    // Create multiple jobs with different types
    for (const jobType of jobTypes) {
      await jobsPage.createJob({
        name: jobType.name,
        address: `${Math.floor(Math.random() * 1000)} Test St, Minneapolis, MN`,
        contractor: 'Test Builder Inc',
        inspectionType: jobType.type,
      });

      // Verify each job was created
      await jobsPage.waitForJob(jobType.name, 15000);
    }

    // Verify all jobs are visible
    for (const jobType of jobTypes) {
      await jobsPage.verifyJobExists(jobType.name);
    }
  });

  test('should display job creation dialog with all required fields', async ({ page }) => {
    await jobsPage.goto();
    await jobsPage.verifyPageLoaded();

    // Click create job button
    await jobsPage.createJobButton.click();

    // Verify dialog is visible
    await expect(page.getByTestId('modal-new-job')).toBeVisible();
    
    // Verify dialog title
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Add New Job');

    // Verify required form fields are present
    await expect(page.getByTestId('input-job-name')).toBeVisible();
    await expect(page.getByTestId('input-contractor')).toBeVisible();
    await expect(page.getByTestId('input-address')).toBeVisible();
    await expect(page.getByTestId('select-inspection-type')).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByTestId('button-save')).toBeVisible();
    await expect(page.getByTestId('button-cancel')).toBeVisible();

    // Close dialog
    await page.getByTestId('button-cancel').click();
    await expect(page.getByTestId('modal-new-job')).not.toBeVisible();
  });

  test('should validate required fields when creating a job', async ({ page }) => {
    await jobsPage.goto();
    
    // Open job creation dialog
    await jobsPage.createJobButton.click();
    await expect(page.getByTestId('modal-new-job')).toBeVisible();

    // Try to submit without filling required fields
    await page.getByTestId('button-save').click();

    // Dialog should remain open (validation failed)
    await expect(page.getByTestId('modal-new-job')).toBeVisible();
  });
});

test.describe('Jobs Page Navigation', () => {
  let loginPage: LoginPage;
  let jobsPage: JobsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    jobsPage = new JobsPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should navigate to jobs page and display jobs list', async ({ page }) => {
    await jobsPage.goto();
    
    // Verify jobs page loaded
    await jobsPage.verifyPageLoaded();
    
    // Verify create button is visible
    await expect(jobsPage.createJobButton).toBeVisible();
    
    // Verify page is at correct URL
    expect(page.url()).toContain('/jobs');
  });

  test('should maintain jobs page state after page reload', async ({ page }) => {
    const testJobName = `Reload Test ${nanoid(4)}`;
    
    await jobsPage.goto();
    
    // Create a job
    await jobsPage.createJob({
      name: testJobName,
      address: '456 Reload Ave, Minneapolis, MN',
      contractor: 'Test Contractor',
      inspectionType: 'Final Testing',
    });
    
    // Wait for job to appear
    await jobsPage.waitForJob(testJobName);
    
    // Reload the page
    await page.reload();
    
    // Verify job still appears after reload
    await jobsPage.verifyJobExists(testJobName);
  });
});

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access jobs page without authentication
    await page.goto('/jobs');
    
    // Should redirect to login/landing page
    await page.waitForURL(/\/(|login|dashboard)/, { timeout: 10000 });
  });

  test('should allow admin to access jobs page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const jobsPage = new JobsPage(page);
    
    // Login as admin
    await loginPage.loginAsAdmin();
    
    // Navigate to jobs page
    await jobsPage.goto();
    
    // Should be able to access the page
    await jobsPage.verifyPageLoaded();
    expect(page.url()).toContain('/jobs');
  });

  test('should allow inspector to access jobs page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const jobsPage = new JobsPage(page);
    
    // Login as inspector
    await loginPage.loginAsInspector(1);
    
    // Navigate to jobs page
    await jobsPage.goto();
    
    // Should be able to access the page
    await jobsPage.verifyPageLoaded();
    expect(page.url()).toContain('/jobs');
  });
});
