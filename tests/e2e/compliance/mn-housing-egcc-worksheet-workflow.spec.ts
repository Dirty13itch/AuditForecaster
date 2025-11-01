import { test, expect } from '@playwright/test';

/**
 * Phase 4 - TEST: Comprehensive E2E tests for MN Housing EGCC Worksheet
 * 
 * Test Coverage:
 * - Page loading and error states
 * - Compliance approach selection
 * - Building characteristics input
 * - Method deviations management
 * - Rebate calculations
 * - Document uploads
 * - Form validation
 * - Submission workflow
 * - LocalStorage persistence
 * 
 * Business Context:
 * Minnesota Housing EGCC (Energy Guide Compliance Certification) 2020
 * is a critical compliance program for multifamily new construction.
 * These tests ensure field inspectors can reliably complete worksheets
 * even in low-connectivity environments.
 */

test.describe('MN Housing EGCC Worksheet - Critical Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a job's EGCC worksheet
    await page.goto('/');
    
    // Wait for auth and redirect
    await page.waitForSelector('[data-testid="button-sign-in"]', { timeout: 5000 }).catch(() => {});
    const signInButton = await page.$('[data-testid="button-sign-in"]');
    if (signInButton) {
      await signInButton.click();
      await page.fill('[data-testid="input-username"]', 'admin');
      await page.fill('[data-testid="input-password"]', 'admin');
      await page.click('[data-testid="button-submit-login"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }
    
    // Navigate to compliance hub
    await page.goto('/compliance');
    await page.waitForSelector('[data-testid="page-compliance-hub"]', { timeout: 10000 });
    
    // Click EGCC Worksheet tool (should open job selector)
    await page.click('[data-testid="button-tool-mn-housing-egcc-egcc-worksheet"]');
    
    // Wait for job selector dialog
    await page.waitForSelector('[data-testid="dialog-job-selector"]', { timeout: 5000 });
    
    // Select first available job
    const firstJobOption = await page.$('[data-testid^="select-option-job-"]');
    if (firstJobOption) {
      await firstJobOption.click();
      await page.click('[data-testid="button-select-job"]');
    } else {
      // If no jobs in selector, navigate directly to a test job
      await page.goto('/compliance/mn-housing-egcc/test-job-1');
    }
    
    // Wait for worksheet page to load
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]', { timeout: 10000 });
  });

  /**
   * Test 1: Page loads successfully with job information
   */
  test('should load worksheet page with job details', async ({ page }) => {
    // Verify page loaded
    await expect(page.locator('[data-testid="page-mn-housing-egcc-worksheet"]')).toBeVisible();
    
    // Verify header information is displayed
    await expect(page.locator('[data-testid="text-job-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-job-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-job-builder"]')).toBeVisible();
    
    // Verify program badge
    await expect(page.locator('[data-testid="badge-program"]')).toHaveText('Minnesota Housing EGCC 2020');
    
    // Verify initial status is DRAFT
    await expect(page.locator('[data-testid="badge-status"]')).toContainText('DRAFT');
  });

  /**
   * Test 2: Loading skeleton displays during data fetch
   */
  test('should show loading skeleton while fetching job data', async ({ page }) => {
    // Navigate with slow network to see skeleton
    await page.route('**/api/jobs/**', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    
    // Verify skeleton elements appear
    await expect(page.locator('[data-testid="page-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="skeleton-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="skeleton-card-0"]')).toBeVisible();
    
    // Wait for actual content to load
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]', { timeout: 10000 });
  });

  /**
   * Test 3: Error state displays when job not found
   */
  test('should display error when job does not exist', async ({ page }) => {
    await page.goto('/compliance/mn-housing-egcc/nonexistent-job-id');
    
    // Wait for error state
    await page.waitForSelector('[data-testid="page-not-found"]', { timeout: 10000 });
    
    // Verify error alert is shown
    await expect(page.locator('[data-testid="alert-job-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-job-not-found"]')).toContainText('Job not found');
  });

  /**
   * Test 4: Compliance approach selection (Prescriptive Path)
   */
  test('should allow selecting prescriptive compliance path', async ({ page }) => {
    const prescriptiveCheckbox = page.locator('[data-testid="checkbox-prescriptive"]');
    
    // Initially unchecked
    await expect(prescriptiveCheckbox).not.toBeChecked();
    
    // Click to check
    await prescriptiveCheckbox.click();
    await expect(prescriptiveCheckbox).toBeChecked();
    
    // Verify auto-save (data should persist in localStorage)
    await page.waitForTimeout(31000); // Wait for auto-save (30s interval + buffer)
    
    // Reload page and verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="checkbox-prescriptive"]');
    await expect(page.locator('[data-testid="checkbox-prescriptive"]')).toBeChecked();
  });

  /**
   * Test 5: Multiple compliance approaches can be selected
   */
  test('should allow combination of compliance approaches', async ({ page }) => {
    // Select multiple approaches
    await page.click('[data-testid="checkbox-prescriptive"]');
    await page.click('[data-testid="checkbox-performance"]');
    await page.click('[data-testid="checkbox-combination"]');
    
    // Verify all are checked
    await expect(page.locator('[data-testid="checkbox-prescriptive"]')).toBeChecked();
    await expect(page.locator('[data-testid="checkbox-performance"]')).toBeChecked();
    await expect(page.locator('[data-testid="checkbox-combination"]')).toBeChecked();
  });

  /**
   * Test 6: Building characteristics selection
   */
  test('should allow selecting building type and climate zone', async ({ page }) => {
    // Select building type
    await page.click('[data-testid="select-building-type"]');
    await page.click('[data-testid="option-mid-rise"]');
    
    // Verify selection
    await expect(page.locator('[data-testid="select-building-type"]')).toContainText('Mid-Rise');
    
    // Select climate zone
    await page.click('[data-testid="select-climate-zone"]');
    await page.click('[data-testid="option-zone-6"]');
    
    // Verify selection
    await expect(page.locator('[data-testid="select-climate-zone"]')).toContainText('Zone 6');
  });

  /**
   * Test 7: Square footage and lock-in date input
   */
  test('should allow entering square footage and lock-in date', async ({ page }) => {
    // Enter square footage
    await page.fill('[data-testid="input-sqft"]', '125000');
    await expect(page.locator('[data-testid="input-sqft"]')).toHaveValue('125000');
    
    // Enter lock-in date
    await page.fill('[data-testid="input-lock-in-date"]', '2024-01-15');
    await expect(page.locator('[data-testid="input-lock-in-date"]')).toHaveValue('2024-01-15');
  });

  /**
   * Test 8: Adding and editing method deviations
   */
  test('should allow adding and editing method deviations', async ({ page }) => {
    // Initially no deviations
    await expect(page.locator('[data-testid="text-no-deviations"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-deviations"]')).not.toBeVisible();
    
    // Add a deviation
    await page.click('[data-testid="button-add-deviation"]');
    
    // Verify deviation table appears
    await expect(page.locator('[data-testid="table-deviations"]')).toBeVisible();
    
    // Get the deviation row (ID will be timestamp-based)
    const deviationRow = page.locator('[data-testid^="deviation-row-"]').first();
    await expect(deviationRow).toBeVisible();
    
    // Fill in deviation details
    await deviationRow.locator('[data-testid^="input-deviation-item-"]').fill('Wall Insulation');
    await deviationRow.locator('[data-testid^="input-deviation-original-"]').fill('R-21 Fiberglass');
    await deviationRow.locator('[data-testid^="input-deviation-revised-"]').fill('R-23 Spray Foam');
    await deviationRow.locator('[data-testid^="input-deviation-reason-"]').fill('Better air sealing performance');
    
    // Verify values entered
    await expect(deviationRow.locator('[data-testid^="input-deviation-item-"]')).toHaveValue('Wall Insulation');
    await expect(deviationRow.locator('[data-testid^="input-deviation-original-"]')).toHaveValue('R-21 Fiberglass');
  });

  /**
   * Test 9: Removing method deviations
   */
  test('should allow removing method deviations', async ({ page }) => {
    // Add a deviation
    await page.click('[data-testid="button-add-deviation"]');
    await page.waitForSelector('[data-testid="table-deviations"]');
    
    // Count initial deviations
    const initialCount = await page.locator('[data-testid^="deviation-row-"]').count();
    expect(initialCount).toBe(1);
    
    // Remove the deviation
    await page.click('[data-testid^="button-remove-deviation-"]');
    
    // Wait for removal
    await page.waitForTimeout(500);
    
    // Verify it's removed and empty state is shown
    await expect(page.locator('[data-testid="text-no-deviations"]')).toBeVisible();
  });

  /**
   * Test 10: Rebate amount calculations
   */
  test('should calculate total rebates correctly', async ({ page }) => {
    // Enter rebate amounts
    await page.fill('[data-testid="input-energy-star-bonus"]', '5000');
    await page.fill('[data-testid="input-insulation-rebates"]', '3500');
    await page.fill('[data-testid="input-hvac-rebates"]', '2000');
    await page.fill('[data-testid="input-lighting-rebates"]', '1500');
    
    // Trigger calculation by clicking away (blur event)
    await page.click('[data-testid="text-rebate-title"]');
    
    // Wait for calculation
    await page.waitForTimeout(500);
    
    // Verify total is calculated correctly: 5000 + 3500 + 2000 + 1500 = 12000
    await expect(page.locator('[data-testid="text-total-rebates"]')).toContainText('$12000.00');
  });

  /**
   * Test 11: Utility provider selection and rebate tracking
   */
  test('should allow selecting utility provider and tracking rebate status', async ({ page }) => {
    // Select utility provider
    await page.click('[data-testid="select-utility-provider"]');
    await page.click('[data-testid="option-xcel"]');
    await expect(page.locator('[data-testid="select-utility-provider"]')).toContainText('Xcel Energy');
    
    // Select rebate application status
    await page.click('[data-testid="select-rebate-status"]');
    await page.click('[data-testid="option-submitted"]');
    await expect(page.locator('[data-testid="select-rebate-status"]')).toContainText('Submitted');
    
    // Enter application date
    await page.fill('[data-testid="input-application-date"]', '2024-02-01');
    await expect(page.locator('[data-testid="input-application-date"]')).toHaveValue('2024-02-01');
  });

  /**
   * Test 12: Document upload buttons are visible and functional
   */
  test('should display all required document upload buttons', async ({ page }) => {
    // Verify all 4 document types have upload buttons
    await expect(page.locator('[data-testid="button-upload-intended-methods-worksheet"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-upload-energy-calculations"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-upload-compliance-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-upload-mro-verification"]')).toBeVisible();
    
    // Verify empty state message
    await expect(page.locator('[data-testid="text-no-documents"]')).toBeVisible();
  });

  /**
   * Test 13: Submission tracking fields
   */
  test('should allow entering submission tracking information', async ({ page }) => {
    // Enter submission details
    await page.fill('[data-testid="input-submission-date"]', '2024-03-01');
    await page.fill('[data-testid="input-submitted-to"]', 'Minnesota Housing Finance Agency');
    await page.fill('[data-testid="input-review-status"]', 'Under Review');
    await page.fill('[data-testid="input-cert-date"]', '2024-04-15');
    
    // Verify values
    await expect(page.locator('[data-testid="input-submission-date"]')).toHaveValue('2024-03-01');
    await expect(page.locator('[data-testid="input-submitted-to"]')).toHaveValue('Minnesota Housing Finance Agency');
    await expect(page.locator('[data-testid="input-review-status"]')).toHaveValue('Under Review');
    await expect(page.locator('[data-testid="input-cert-date"]')).toHaveValue('2024-04-15');
  });

  /**
   * Test 14: Notes/comments textarea
   */
  test('should allow entering notes and comments', async ({ page }) => {
    const notesText = 'Project includes additional energy efficiency measures beyond code requirements. Builder opted for triple-pane windows and additional roof insulation.';
    
    await page.fill('[data-testid="textarea-notes"]', notesText);
    await expect(page.locator('[data-testid="textarea-notes"]')).toHaveValue(notesText);
  });

  /**
   * Test 15: Manual save draft functionality
   */
  test('should save draft when save button is clicked', async ({ page }) => {
    // Make some changes
    await page.click('[data-testid="checkbox-prescriptive"]');
    await page.fill('[data-testid="input-sqft"]', '100000');
    
    // Click save draft button
    await page.click('[data-testid="button-save-draft"]');
    
    // Wait for toast notification
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 16: Validation prevents submission without required fields
   */
  test('should validate required fields before submission', async ({ page }) => {
    // Try to submit without selecting compliance approach
    await page.click('[data-testid="button-submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Please select at least one compliance approach')).toBeVisible({ timeout: 5000 });
    
    // Select compliance approach but not building type
    await page.click('[data-testid="checkbox-prescriptive"]');
    await page.click('[data-testid="button-submit"]');
    
    // Should show validation error for building type
    await expect(page.locator('text=Please select a building type')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 17: Successful submission with all required fields
   */
  test('should submit worksheet when all required fields are complete', async ({ page }) => {
    // Fill required fields
    await page.click('[data-testid="checkbox-prescriptive"]');
    await page.click('[data-testid="select-building-type"]');
    await page.click('[data-testid="option-low-rise"]');
    await page.click('[data-testid="select-climate-zone"]');
    await page.click('[data-testid="option-zone-6"]');
    
    // Submit
    await page.click('[data-testid="button-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Worksheet submitted')).toBeVisible({ timeout: 5000 });
    
    // Status badge should update
    await expect(page.locator('[data-testid="badge-status"]')).toContainText('SUBMITTED');
    
    // Submit button should be disabled
    await expect(page.locator('[data-testid="button-submit"]')).toBeDisabled();
  });

  /**
   * Test 18: PDF download button is visible
   */
  test('should display download PDF button', async ({ page }) => {
    await expect(page.locator('[data-testid="button-download-pdf"]')).toBeVisible();
    
    // Click should show coming soon message
    await page.click('[data-testid="button-download-pdf"]');
    await expect(page.locator('text=PDF download feature coming soon')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 19: LocalStorage persistence across page reloads
   */
  test('should persist data in localStorage across page reloads', async ({ page }) => {
    // Enter data in multiple fields
    await page.click('[data-testid="checkbox-performance"]');
    await page.fill('[data-testid="input-sqft"]', '75000');
    await page.fill('[data-testid="input-energy-star-bonus"]', '4000');
    
    // Wait for auto-save
    await page.waitForTimeout(31000); // 30s auto-save + 1s buffer
    
    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]');
    
    // Verify data persisted
    await expect(page.locator('[data-testid="checkbox-performance"]')).toBeChecked();
    await expect(page.locator('[data-testid="input-sqft"]')).toHaveValue('75000');
    await expect(page.locator('[data-testid="input-energy-star-bonus"]')).toHaveValue('4000');
  });

  /**
   * Test 20: All major UI sections are present
   */
  test('should display all major worksheet sections', async ({ page }) => {
    // Verify all major cards/sections exist
    await expect(page.locator('[data-testid="card-worksheet-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-intended-methods"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-rebate-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-submission"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-actions"]')).toBeVisible();
  });
});

/**
 * Phase 4 - TEST: Additional edge case and error handling tests
 */
test.describe('MN Housing EGCC Worksheet - Edge Cases', () => {

  /**
   * Test 21: Handles network errors gracefully with retry
   */
  test('should show error state and allow retry on network failure', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/jobs/**', route => route.abort());
    
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    
    // Should show error state
    await expect(page.locator('[data-testid="page-error"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="alert-query-error"]')).toBeVisible();
    
    // Retry button should be visible
    await expect(page.locator('[data-testid="button-retry"]')).toBeVisible();
    
    // Clear route and retry
    await page.unroute('**/api/jobs/**');
    await page.click('[data-testid="button-retry"]');
    
    // Should eventually load successfully
    await expect(page.locator('[data-testid="page-mn-housing-egcc-worksheet"]')).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 22: Handles corrupted localStorage data gracefully
   */
  test('should handle corrupted localStorage data without crashing', async ({ page }) => {
    // Navigate to worksheet first
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]');
    
    // Inject corrupted data into localStorage
    await page.evaluate(() => {
      localStorage.setItem('mn-egcc-worksheet-test-job-1', 'CORRUPTED{invalid:json');
    });
    
    // Reload page
    await page.reload();
    
    // Should still load with default values (not crash)
    await expect(page.locator('[data-testid="page-mn-housing-egcc-worksheet"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-status"]')).toContainText('DRAFT');
  });

  /**
   * Test 23: Zero rebate amounts display correctly
   */
  test('should handle zero rebate amounts correctly', async ({ page }) => {
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]');
    
    // Leave all rebate fields empty (default to 0)
    await page.click('[data-testid="text-rebate-title"]'); // Trigger calculation
    
    // Total should be $0.00
    await expect(page.locator('[data-testid="text-total-rebates"]')).toContainText('$0.00');
  });

  /**
   * Test 24: Large rebate amounts display correctly
   */
  test('should handle large rebate amounts correctly', async ({ page }) => {
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]');
    
    // Enter large amounts
    await page.fill('[data-testid="input-energy-star-bonus"]', '999999');
    await page.fill('[data-testid="input-insulation-rebates"]', '888888');
    
    await page.click('[data-testid="text-rebate-title"]'); // Trigger calculation
    await page.waitForTimeout(500);
    
    // Should calculate correctly: 999999 + 888888 = 1888887
    await expect(page.locator('[data-testid="text-total-rebates"]')).toContainText('$1888887.00');
  });

  /**
   * Test 25: Submit button is disabled after submission
   */
  test('should disable submit button after successful submission', async ({ page }) => {
    await page.goto('/compliance/mn-housing-egcc/test-job-1');
    await page.waitForSelector('[data-testid="page-mn-housing-egcc-worksheet"]');
    
    // Fill required fields and submit
    await page.click('[data-testid="checkbox-prescriptive"]');
    await page.click('[data-testid="select-building-type"]');
    await page.click('[data-testid="option-mid-rise"]');
    await page.click('[data-testid="select-climate-zone"]');
    await page.click('[data-testid="option-zone-7"]');
    
    await page.click('[data-testid="button-submit"]');
    await page.waitForTimeout(1000);
    
    // Submit button should now be disabled
    await expect(page.locator('[data-testid="button-submit"]')).toBeDisabled();
    
    // Trying to click again should not work
    await page.click('[data-testid="button-submit"]', { force: true });
    
    // Status should remain SUBMITTED
    await expect(page.locator('[data-testid="badge-status"]')).toContainText('SUBMITTED');
  });
});
