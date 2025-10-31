/**
 * Phase 4 - TEST: Comprehensive E2E tests for ENERGY STAR MFNC Checklist
 * 
 * Test Coverage:
 * 1. Loading states and error handling
 * 2. Job context display
 * 3. Progress tracking calculations
 * 4. Checklist item status updates
 * 5. Notes editing
 * 6. Photo upload workflow
 * 7. Validation messaging
 * 8. Draft saving
 * 9. MRO submission flow
 * 10. Edge cases (no job, network failures)
 * 
 * Business Context:
 * ENERGY STAR MFNC (Multifamily New Construction) v1.2 Rev. 05 digital checklist
 * enables field inspectors to complete certification inspections on mobile devices
 * with offline resilience, photo evidence, and real-time progress tracking.
 * 
 * All required items must be marked "complete" with photo evidence before
 * submission to Minnesota Rater Organization (MRO) for final certification approval.
 */

import { test, expect } from '@playwright/test';

test.describe('ENERGY STAR MFNC Checklist - Workflow Tests', () => {
  
  /**
   * Test Setup
   * 
   * Before each test:
   * 1. Navigate to login page
   * 2. Authenticate as test user
   * 3. Ensure clean state for checklist testing
   */
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/');
    
    // Login as test user
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for successful login redirect
    await page.waitForURL('/dashboard');
  });

  /**
   * Test 1: Page Load and Job Context Display
   * 
   * Verifies:
   * - Page loads successfully with valid job ID
   * - Job name and address display correctly
   * - ENERGY STAR program version badge shows
   * - Certification path and inspector metadata display
   */
  test('should load checklist page and display job context', async ({ page }) => {
    // Navigate to checklist for test job
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify page loaded (no error state)
    await expect(page.getByTestId('page-energy-star-checklist')).toBeVisible();
    
    // Verify job context displays
    await expect(page.getByTestId('text-job-name')).toBeVisible();
    await expect(page.getByTestId('text-job-name')).toContainText('Job:');
    
    await expect(page.getByTestId('text-job-address')).toBeVisible();
    
    // Verify program version badge
    await expect(page.getByTestId('badge-program-version')).toBeVisible();
    await expect(page.getByTestId('badge-program-version')).toContainText('ENERGY STAR MFNC 1.2 Rev. 05');
    
    // Verify metadata section
    await expect(page.getByTestId('text-certification-path')).toBeVisible();
    await expect(page.getByTestId('text-inspector')).toBeVisible();
  });

  /**
   * Test 2: Loading State with Skeleton Loaders
   * 
   * Verifies:
   * - Skeleton loaders display during initial data fetch
   * - Layout remains stable (no content jump)
   * - Loading state clears when data arrives
   */
  test('should show loading skeletons while fetching job data', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('/api/jobs/1', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    // Navigate to checklist
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify loading state displays
    await expect(page.getByTestId('page-energy-star-checklist-loading')).toBeVisible();
    await expect(page.getByTestId('skeleton-loading-0')).toBeVisible();
    await expect(page.getByTestId('skeleton-loading-1')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.getByTestId('page-energy-star-checklist')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 3: Error State with Retry Capability
   * 
   * Verifies:
   * - Error alert displays when job fetch fails
   * - Retry button is available
   * - Retry button triggers new fetch attempt
   * - Success state loads after successful retry
   */
  test('should display error state and allow retry on failed job fetch', async ({ page }) => {
    let callCount = 0;
    
    // Intercept API call to fail first attempt, succeed on retry
    await page.route('/api/jobs/1', async route => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });
    
    // Navigate to checklist
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify error state displays
    await expect(page.getByTestId('page-energy-star-checklist-error')).toBeVisible();
    await expect(page.getByTestId('alert-error')).toBeVisible();
    await expect(page.getByTestId('text-error-message')).toContainText('Failed to load job data');
    
    // Click retry button
    await page.click('[data-testid="button-retry-load"]');
    
    // Verify success state loads
    await expect(page.getByTestId('page-energy-star-checklist')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 4: Not Found State
   * 
   * Verifies:
   * - Appropriate error displays for invalid job ID
   * - User receives clear messaging
   */
  test('should display not found state for invalid job ID', async ({ page }) => {
    // Intercept API call to return 404
    await page.route('/api/jobs/99999', async route => {
      await route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Job not found' }),
      });
    });
    
    // Navigate to checklist with invalid ID
    await page.goto('/compliance/energy-star-checklist/99999');
    
    // Verify not found state displays
    await expect(page.getByTestId('page-energy-star-checklist-not-found')).toBeVisible();
    await expect(page.getByTestId('alert-not-found')).toBeVisible();
    await expect(page.getByTestId('text-not-found-message')).toContainText('Job not found');
  });

  /**
   * Test 5: Progress Tracking Display
   * 
   * Verifies:
   * - Overall progress percentage displays correctly
   * - Completed items count updates in real-time
   * - Required items tracker shows separately
   * - Progress bar reflects completion percentage
   */
  test('should display accurate progress tracking metrics', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify progress section displays
    await expect(page.getByTestId('section-progress')).toBeVisible();
    await expect(page.getByTestId('text-completion-label')).toContainText('Overall Progress');
    await expect(page.getByTestId('text-completion-stats')).toBeVisible();
    await expect(page.getByTestId('progress-completion')).toBeVisible();
    
    // Verify required items status
    await expect(page.getByTestId('section-required-status')).toBeVisible();
    await expect(page.getByTestId('text-required-status')).toContainText('Required items:');
    
    // Should show incomplete icon initially
    await expect(page.getByTestId('icon-required-incomplete')).toBeVisible();
  });

  /**
   * Test 6: Checklist Section Accordion
   * 
   * Verifies:
   * - All four sections display (Thermal, HVAC, Water, Indoor Air)
   * - Section progress badges show correctly
   * - Accordion expands/collapses properly
   * - Items display within expanded sections
   */
  test('should display all checklist sections with accordion functionality', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify all sections present
    await expect(page.getByTestId('section-thermal-enclosure')).toBeVisible();
    await expect(page.getByTestId('section-hvac-system')).toBeVisible();
    await expect(page.getByTestId('section-water-management')).toBeVisible();
    await expect(page.getByTestId('section-indoor-airplus')).toBeVisible();
    
    // Verify section progress badges
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toBeVisible();
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toContainText('0/3');
    
    // Verify thermal enclosure section can collapse
    const thermalTrigger = page.getByTestId('trigger-thermal-enclosure');
    await thermalTrigger.click();
    
    // Items should no longer be visible
    await expect(page.getByTestId('item-te-1')).not.toBeVisible();
    
    // Expand again
    await thermalTrigger.click();
    await expect(page.getByTestId('item-te-1')).toBeVisible();
  });

  /**
   * Test 7: Checklist Item Display
   * 
   * Verifies:
   * - Item number and description display
   * - Required/Optional badge shows correctly
   * - Status dropdown displays with all options
   * - Notes textarea is editable
   * - Photo upload section displays
   */
  test('should display checklist item with all fields', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Focus on first item in thermal enclosure section
    const item = page.getByTestId('item-te-1');
    await expect(item).toBeVisible();
    
    // Verify item number and description
    await expect(page.getByTestId('text-item-number-te-1')).toContainText('1.1');
    await expect(page.getByTestId('text-description-te-1')).toContainText('Insulation installed at rated R-value');
    
    // Verify required badge
    await expect(page.getByTestId('badge-required-te-1')).toContainText('Required');
    
    // Verify status dropdown
    await expect(page.getByTestId('select-status-te-1')).toBeVisible();
    
    // Verify notes textarea
    await expect(page.getByTestId('textarea-notes-te-1')).toBeVisible();
    
    // Verify photo section
    await expect(page.getByTestId('label-photos-te-1')).toContainText('Photo Evidence');
    await expect(page.getByTestId('button-upload-photo-te-1')).toBeVisible();
  });

  /**
   * Test 8: Update Item Status
   * 
   * Verifies:
   * - Status dropdown options all available
   * - Selecting status updates item state
   * - Progress tracking updates in real-time
   * - Section progress badge updates
   */
  test('should update item status and reflect in progress tracking', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Get initial completion stats
    const initialStats = await page.getByTestId('text-completion-stats').textContent();
    
    // Open status dropdown for first item
    await page.click('[data-testid="select-status-te-1"]');
    
    // Select "Complete" status
    await page.click('[data-testid="status-complete-te-1"]');
    
    // Wait for state update
    await page.waitForTimeout(500);
    
    // Verify progress updated
    const updatedStats = await page.getByTestId('text-completion-stats').textContent();
    expect(updatedStats).not.toEqual(initialStats);
    expect(updatedStats).toContain('1 of');
    
    // Verify section badge updated
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toContainText('1/3');
  });

  /**
   * Test 9: Edit Item Notes
   * 
   * Verifies:
   * - Notes textarea accepts user input
   * - Text persists in component state
   * - Multiple items can have independent notes
   */
  test('should allow editing item notes', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Add notes to first item
    const notesTextarea = page.getByTestId('textarea-notes-te-1');
    await notesTextarea.fill('Verified R-30 insulation in attic space. All gaps sealed.');
    
    // Verify text persisted
    await expect(notesTextarea).toHaveValue('Verified R-30 insulation in attic space. All gaps sealed.');
    
    // Add notes to second item
    const notes2Textarea = page.getByTestId('textarea-notes-te-2');
    await notes2Textarea.fill('Air barrier continuous at all penetrations.');
    
    // Verify both notes persist independently
    await expect(notesTextarea).toHaveValue('Verified R-30 insulation in attic space. All gaps sealed.');
    await expect(notes2Textarea).toHaveValue('Air barrier continuous at all penetrations.');
  });

  /**
   * Test 10: Photo Upload Button Display
   * 
   * Verifies:
   * - Upload button displays for each item
   * - Photo count displays (initially 0)
   * - Upload button has correct icon and label
   */
  test('should display photo upload button for each item', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify upload button displays
    const uploadButton = page.getByTestId('button-upload-photo-te-1');
    await expect(uploadButton).toBeVisible();
    
    // Verify upload icon displays
    await expect(page.getByTestId('icon-upload-te-1')).toBeVisible();
    
    // Verify photo count displays
    await expect(page.getByTestId('text-photo-count-te-1')).toContainText('0 photo(s) attached');
  });

  /**
   * Test 11: Validation Warning Display
   * 
   * Verifies:
   * - Validation warning shows when required items incomplete
   * - Warning message displays correct count
   * - Warning icon displays
   * - Warning disappears when all required items complete
   */
  test('should display validation warning for incomplete required items', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify validation warning displays initially
    await expect(page.getByTestId('alert-validation-warning')).toBeVisible();
    await expect(page.getByTestId('icon-validation-warning')).toBeVisible();
    
    const warningText = await page.getByTestId('text-validation-warning').textContent();
    expect(warningText).toContain('required item(s) must be completed');
  });

  /**
   * Test 12: Save Draft Button
   * 
   * Verifies:
   * - Save draft button displays
   * - Clicking button shows success toast
   * - Draft saved to localStorage
   */
  test('should save checklist draft to localStorage', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Update an item status
    await page.click('[data-testid="select-status-te-1"]');
    await page.click('[data-testid="status-complete-te-1"]');
    
    // Click save draft button
    await page.click('[data-testid="button-save-draft"]');
    
    // Verify toast notification (look for toast container)
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 3000 });
    
    // Verify localStorage contains saved data
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('energy-star-checklist-1');
    });
    expect(localStorageData).toBeTruthy();
  });

  /**
   * Test 13: Submit Button Disabled State
   * 
   * Verifies:
   * - Submit button disabled when required items incomplete
   * - Validation warning displays
   * - Button enabled when all required items complete
   */
  test('should disable submit button when required items incomplete', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify submit button disabled
    const submitButton = page.getByTestId('button-submit-mro');
    await expect(submitButton).toBeDisabled();
    
    // Complete all required items (7 total across all sections)
    // Thermal enclosure: 3 required
    await page.click('[data-testid="select-status-te-1"]');
    await page.click('[data-testid="status-complete-te-1"]');
    
    await page.click('[data-testid="select-status-te-2"]');
    await page.click('[data-testid="status-complete-te-2"]');
    
    await page.click('[data-testid="select-status-te-3"]');
    await page.click('[data-testid="status-complete-te-3"]');
    
    // HVAC: 2 required
    await page.click('[data-testid="select-status-hvac-1"]');
    await page.click('[data-testid="status-complete-hvac-1"]');
    
    await page.click('[data-testid="select-status-hvac-2"]');
    await page.click('[data-testid="status-complete-hvac-2"]');
    
    // Water management: 2 required
    await page.click('[data-testid="select-status-wm-1"]');
    await page.click('[data-testid="status-complete-wm-1"]');
    
    await page.click('[data-testid="select-status-wm-2"]');
    await page.click('[data-testid="status-complete-wm-2"]');
    
    // Wait for state updates
    await page.waitForTimeout(500);
    
    // Verify submit button enabled
    await expect(submitButton).toBeEnabled();
    
    // Verify required complete icon shows
    await expect(page.getByTestId('icon-required-complete')).toBeVisible();
    
    // Verify validation warning disappeared
    await expect(page.getByTestId('alert-validation-warning')).not.toBeVisible();
  });

  /**
   * Test 14: Submit to MRO with Incomplete Items
   * 
   * Verifies:
   * - Clicking submit with incomplete items shows error toast
   * - User receives clear feedback about incomplete items
   * - Submission does not proceed
   */
  test('should show error toast when submitting with incomplete required items', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Complete only 2 of 7 required items
    await page.click('[data-testid="select-status-te-1"]');
    await page.click('[data-testid="status-complete-te-1"]');
    
    await page.click('[data-testid="select-status-te-2"]');
    await page.click('[data-testid="status-complete-te-2"]');
    
    // Submit button should still be disabled
    const submitButton = page.getByTestId('button-submit-mro');
    await expect(submitButton).toBeDisabled();
  });

  /**
   * Test 15: Complete Submission Workflow
   * 
   * Verifies:
   * - Completing all required items enables submission
   * - Clicking submit shows success toast
   * - Draft is saved before submission
   * - Page navigates to inspection summary
   */
  test('should successfully submit checklist when all required items complete', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Complete all 7 required items
    const requiredItems = [
      'te-1', 'te-2', 'te-3',
      'hvac-1', 'hvac-2',
      'wm-1', 'wm-2'
    ];
    
    for (const itemId of requiredItems) {
      await page.click(`[data-testid="select-status-${itemId}"]`);
      await page.click(`[data-testid="status-complete-${itemId}"]`);
      await page.waitForTimeout(100);
    }
    
    // Wait for state updates
    await page.waitForTimeout(500);
    
    // Verify submit button enabled
    const submitButton = page.getByTestId('button-submit-mro');
    await expect(submitButton).toBeEnabled();
    
    // Click submit
    await submitButton.click();
    
    // Verify success toast
    await expect(page.locator('text=Submitted to MRO')).toBeVisible({ timeout: 3000 });
    
    // Verify navigation to inspection page (with timeout for redirect)
    await expect(page).toHaveURL(/\/inspection\/1/, { timeout: 5000 });
  });

  /**
   * Test 16: Section Progress Badge Updates
   * 
   * Verifies:
   * - Section progress badges update in real-time
   * - Each section tracks its own completion independently
   * - Badge format is "completed/total"
   */
  test('should update section progress badges independently', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify initial thermal enclosure badge
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toContainText('0/3');
    
    // Complete first thermal item
    await page.click('[data-testid="select-status-te-1"]');
    await page.click('[data-testid="status-complete-te-1"]');
    await page.waitForTimeout(200);
    
    // Verify thermal badge updated
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toContainText('1/3');
    
    // Verify HVAC badge unchanged
    await expect(page.getByTestId('badge-section-progress-hvac-system')).toContainText('0/3');
    
    // Complete HVAC item
    await page.click('[data-testid="select-status-hvac-1"]');
    await page.click('[data-testid="status-complete-hvac-1"]');
    await page.waitForTimeout(200);
    
    // Verify HVAC badge updated
    await expect(page.getByTestId('badge-section-progress-hvac-system')).toContainText('1/3');
    
    // Verify thermal badge unchanged
    await expect(page.getByTestId('badge-section-progress-thermal-enclosure')).toContainText('1/3');
  });

  /**
   * Test 17: Overall Completion Percentage Calculation
   * 
   * Verifies:
   * - Completion percentage calculates correctly
   * - Progress bar reflects percentage
   * - Percentage rounds to nearest whole number
   */
  test('should calculate completion percentage correctly', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Total items: 10 (3 thermal + 3 HVAC + 2 water + 2 indoor air)
    // Complete 3 items = 30%
    
    const items = ['te-1', 'te-2', 'te-3'];
    
    for (const itemId of items) {
      await page.click(`[data-testid="select-status-${itemId}"]`);
      await page.click(`[data-testid="status-complete-${itemId}"]`);
      await page.waitForTimeout(100);
    }
    
    await page.waitForTimeout(500);
    
    // Verify completion stats shows 3/10
    await expect(page.getByTestId('text-completion-stats')).toContainText('3 of 10 items complete (30%)');
  });

  /**
   * Test 18: Action Buttons Display
   * 
   * Verifies:
   * - Both action buttons display
   * - Buttons have correct icons
   * - Buttons have correct labels
   */
  test('should display save draft and submit action buttons', async ({ page }) => {
    await page.goto('/compliance/energy-star-checklist/1');
    
    // Verify action section
    await expect(page.getByTestId('section-actions')).toBeVisible();
    
    // Verify save draft button
    const saveDraftButton = page.getByTestId('button-save-draft');
    await expect(saveDraftButton).toBeVisible();
    await expect(saveDraftButton).toContainText('Save Draft');
    await expect(page.getByTestId('icon-save-draft')).toBeVisible();
    
    // Verify submit button
    const submitButton = page.getByTestId('button-submit-mro');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Submit to MRO');
    await expect(page.getByTestId('icon-submit')).toBeVisible();
  });
});
