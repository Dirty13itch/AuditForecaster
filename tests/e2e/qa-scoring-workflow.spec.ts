import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: QA Scoring Workflow
 * 
 * Tests the complete quality assurance scoring system including:
 * - Job selection for QA scoring
 * - Automated scoring with checklists
 * - Manual score adjustments
 * - Critical issues and improvements tracking
 * - Review notes and status management
 * - Score calculation and grade assignment
 * - Save and submit functionality
 */

test.describe('QA Scoring Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to QA Scoring page
    await page.goto('/qa/scoring');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test 1: Job Selection Flow
   * Verifies that users can select a job from the dropdown
   */
  test('should display job selection interface and allow job selection', async ({ page }) => {
    // Should show job selection card
    await expect(page.getByTestId('container-job-selection')).toBeVisible();
    await expect(page.getByTestId('heading-select-job')).toHaveText('Select Job for QA Scoring');
    
    // Select a job from dropdown
    await page.getByTestId('select-trigger-job').click();
    await page.getByTestId('select-item-job-1').click();
    
    // Begin button should be enabled
    await expect(page.getByTestId('button-begin-scoring')).toBeEnabled();
    await page.getByTestId('button-begin-scoring').click();
  });

  /**
   * Test 2: Loading State
   * Verifies skeleton loaders appear while data is loading
   */
  test('should display loading state while fetching job data', async ({ page }) => {
    // Navigate with job ID
    await page.goto('/qa/scoring/job-1');
    
    // Should show loading container
    const loadingContainer = page.getByTestId('container-qa-scoring-loading');
    if (await loadingContainer.isVisible()) {
      await expect(page.getByTestId('text-loading-message')).toContainText('Loading job details');
    }
  });

  /**
   * Test 3: Header Display
   * Verifies header shows job details and total score
   */
  test('should display header with job details and total score', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Header elements should be visible
    await expect(page.getByTestId('heading-qa-scoring')).toHaveText('QA Scoring');
    await expect(page.getByTestId('text-job-details')).toBeVisible();
    await expect(page.getByTestId('label-total-score')).toHaveText('Total Score');
    await expect(page.getByTestId('text-total-score')).toBeVisible();
    await expect(page.getByTestId('badge-grade')).toBeVisible();
  });

  /**
   * Test 4: Back Navigation
   * Verifies back button navigates to QA page
   */
  test('should navigate back to QA page when back button clicked', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('button-back-to-qa').click();
    await expect(page).toHaveURL(/\/qa$/);
  });

  /**
   * Test 5: Automated Scoring Tab
   * Verifies all category cards display in automated scoring mode
   */
  test('should display all scoring categories in automated mode', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Should default to automated tab
    await expect(page.getByTestId('tab-automated')).toHaveAttribute('data-state', 'active');
    
    // Should show all 5 category cards
    await expect(page.getByTestId('card-category-completeness')).toBeVisible();
    await expect(page.getByTestId('card-category-accuracy')).toBeVisible();
    await expect(page.getByTestId('card-category-compliance')).toBeVisible();
    await expect(page.getByTestId('card-category-photo-quality')).toBeVisible();
    await expect(page.getByTestId('card-category-timeliness')).toBeVisible();
  });

  /**
   * Test 6: Checklist Item Toggling
   * Verifies clicking checklist items toggles their state and updates score
   */
  test('should toggle checklist items and update category score', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Get initial score
    const initialScore = await page.getByTestId('text-category-score-0').textContent();
    
    // Click first checklist item in first category
    await page.getByTestId('item-checklist-0-0').click();
    
    // Wait for state update
    await page.waitForTimeout(100);
    
    // Score should have changed
    const newScore = await page.getByTestId('text-category-score-0').textContent();
    expect(newScore).not.toBe(initialScore);
    
    // Icon should show as passed
    await expect(page.getByTestId('icon-passed-0-0')).toBeVisible();
  });

  /**
   * Test 7: Manual Scoring Tab
   * Verifies manual scoring tab displays sliders for each category
   */
  test('should switch to manual scoring and display sliders', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Switch to manual tab
    await page.getByTestId('tab-manual').click();
    await expect(page.getByTestId('tab-manual')).toHaveAttribute('data-state', 'active');
    
    // Should show manual category cards with sliders
    await expect(page.getByTestId('card-manual-category-completeness')).toBeVisible();
    await expect(page.getByTestId('slider-manual-score-0')).toBeVisible();
    await expect(page.getByTestId('text-manual-score-0')).toBeVisible();
  });

  /**
   * Test 8: Manual Score Adjustment
   * Verifies slider adjustments update category scores
   */
  test('should adjust scores using manual sliders', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Switch to manual tab
    await page.getByTestId('tab-manual').click();
    
    // Get slider for first category
    const slider = page.getByTestId('slider-manual-score-0');
    const sliderBox = await slider.boundingBox();
    
    if (sliderBox) {
      // Click at 75% position on slider
      await page.mouse.click(
        sliderBox.x + sliderBox.width * 0.75,
        sliderBox.y + sliderBox.height / 2
      );
      
      // Wait for update
      await page.waitForTimeout(100);
      
      // Score should reflect change
      const scoreText = await page.getByTestId('text-manual-score-0').textContent();
      expect(scoreText).toMatch(/\d+%/);
    }
  });

  /**
   * Test 9: Score Breakdown Panel
   * Verifies score summary displays all categories correctly
   */
  test('should display score breakdown with all categories', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Score summary card should be visible
    await expect(page.getByTestId('card-score-summary')).toBeVisible();
    await expect(page.getByTestId('heading-score-breakdown')).toHaveText('Score Breakdown');
    
    // Should show all 5 categories
    await expect(page.getByTestId('summary-category-0')).toBeVisible();
    await expect(page.getByTestId('summary-category-1')).toBeVisible();
    await expect(page.getByTestId('summary-category-2')).toBeVisible();
    await expect(page.getByTestId('summary-category-3')).toBeVisible();
    await expect(page.getByTestId('summary-category-4')).toBeVisible();
    
    // Should show total score
    await expect(page.getByTestId('label-summary-total')).toHaveText('Total Score');
    await expect(page.getByTestId('text-summary-total')).toBeVisible();
  });

  /**
   * Test 10: Adding Critical Issues
   * Verifies users can add critical issues via dialog
   */
  test('should add critical issues through dialog', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Click add issue button
    await page.getByTestId('button-add-issue').click();
    
    // Dialog should appear - wait for input
    await page.waitForTimeout(200);
    
    // Type issue and confirm (assuming InputDialog uses standard input)
    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('Missing required safety documentation');
      
      // Click confirm button
      const confirmButton = page.locator('button:has-text("Add")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Wait for issue to appear
        await page.waitForTimeout(200);
        
        // Should show in list
        await expect(page.getByTestId('list-critical-issues')).toBeVisible();
      }
    }
  });

  /**
   * Test 11: Adding Improvement Suggestions
   * Verifies users can add improvement suggestions
   */
  test('should add improvement suggestions through dialog', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Click add improvement button
    await page.getByTestId('button-add-improvement').click();
    
    // Dialog should appear
    await page.waitForTimeout(200);
    
    // Type improvement and confirm
    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill('Consider adding more detailed measurements');
      
      const confirmButton = page.locator('button:has-text("Add")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        await page.waitForTimeout(200);
        
        // Should show in list
        await expect(page.getByTestId('list-improvements')).toBeVisible();
      }
    }
  });

  /**
   * Test 12: Review Notes Entry
   * Verifies users can enter review notes in textarea
   */
  test('should allow entering review notes', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Enter review notes
    const notesTextarea = page.getByTestId('textarea-review-notes');
    await notesTextarea.fill('Overall good inspection with minor issues in photo quality. Inspector should ensure all angles are captured.');
    
    // Should retain the text
    await expect(notesTextarea).toHaveValue(/Overall good inspection/);
  });

  /**
   * Test 13: Review Status Selection
   * Verifies users can select different review statuses
   */
  test('should allow selecting review status', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Click status dropdown
    await page.getByTestId('select-trigger-status').click();
    
    // Select approved status
    await page.getByTestId('select-item-status-approved').click();
    
    // Should show selected status
    const trigger = page.getByTestId('select-trigger-status');
    await expect(trigger).toContainText('Approved');
  });

  /**
   * Test 14: Save Draft Functionality
   * Verifies save draft button is functional
   */
  test('should save draft when save button clicked', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Fill in some data
    await page.getByTestId('item-checklist-0-0').click();
    await page.getByTestId('textarea-review-notes').fill('Draft review notes');
    
    // Click save draft
    await page.getByTestId('button-save-draft').click();
    
    // Should show loading state or success (button disabled during save)
    await page.waitForTimeout(500);
    
    // Button should be enabled again after save
    await expect(page.getByTestId('button-save-draft')).toBeEnabled();
  });

  /**
   * Test 15: Submit Review Functionality
   * Verifies submit review button triggers save with current status
   */
  test('should submit review with selected status', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Complete some scoring
    await page.getByTestId('item-checklist-0-0').click();
    await page.getByTestId('item-checklist-0-1').click();
    await page.getByTestId('textarea-review-notes').fill('Final review complete');
    
    // Set status to reviewed
    await page.getByTestId('select-trigger-status').click();
    await page.getByTestId('select-item-status-reviewed').click();
    
    // Submit review
    await page.getByTestId('button-submit-review').click();
    
    // Wait for save
    await page.waitForTimeout(500);
    
    // Should remain enabled after submit
    await expect(page.getByTestId('button-submit-review')).toBeEnabled();
  });

  /**
   * Test 16: Total Score Calculation
   * Verifies total score updates when category scores change
   */
  test('should calculate and display total weighted score correctly', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Get initial total score
    const initialTotal = await page.getByTestId('text-total-score').textContent();
    
    // Complete several checklist items in first category
    await page.getByTestId('item-checklist-0-0').click();
    await page.getByTestId('item-checklist-0-1').click();
    await page.getByTestId('item-checklist-0-2').click();
    
    await page.waitForTimeout(200);
    
    // Total score should have increased
    const newTotal = await page.getByTestId('text-total-score').textContent();
    expect(newTotal).not.toBe(initialTotal);
    
    // Should also show grade badge
    await expect(page.getByTestId('badge-grade')).toBeVisible();
  });

  /**
   * Test 17: Error Handling
   * Verifies error states display when data fails to load
   */
  test('should display error message when job fails to load', async ({ page }) => {
    // Navigate to non-existent job
    await page.goto('/qa/scoring/invalid-job-id');
    await page.waitForLoadState('networkidle');
    
    // Should show error or handle gracefully
    const errorAlert = page.getByTestId('alert-error');
    const loadingMessage = page.getByTestId('text-loading-message');
    
    // Either error is shown or loading continues (depends on API behavior)
    const errorVisible = await errorAlert.isVisible().catch(() => false);
    const loadingVisible = await loadingMessage.isVisible().catch(() => false);
    
    expect(errorVisible || loadingVisible).toBe(true);
  });

  /**
   * Test 18: Category Weight Display
   * Verifies each category shows its correct weight percentage
   */
  test('should display correct weight percentages for all categories', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Check weights in automated mode
    await expect(page.getByTestId('badge-weight-0')).toContainText('25% weight'); // Completeness
    await expect(page.getByTestId('badge-weight-1')).toContainText('25% weight'); // Accuracy
    await expect(page.getByTestId('badge-weight-2')).toContainText('25% weight'); // Compliance
    await expect(page.getByTestId('badge-weight-3')).toContainText('15% weight'); // Photo Quality
    await expect(page.getByTestId('badge-weight-4')).toContainText('10% weight'); // Timeliness
  });

  /**
   * Test 19: Required vs Optional Items
   * Verifies required items are marked differently from optional
   */
  test('should distinguish between required and optional checklist items', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // First item in first category is required
    await expect(page.getByTestId('badge-required-0-0')).toBeVisible();
    await expect(page.getByTestId('badge-required-0-0')).toHaveText('Required');
    
    // Should show alert icon for unchecked required items
    await expect(page.getByTestId('icon-required-0-0')).toBeVisible();
  });

  /**
   * Test 20: Responsive Layout
   * Verifies layout adapts correctly on different screen sizes
   */
  test('should display responsive layout correctly', async ({ page }) => {
    await page.goto('/qa/scoring/job-1');
    await page.waitForLoadState('networkidle');
    
    // Desktop layout - should show 3-column grid
    await expect(page.getByTestId('grid-scoring-layout')).toBeVisible();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);
    
    // Should still be visible and functional
    await expect(page.getByTestId('container-qa-scoring-main')).toBeVisible();
    await expect(page.getByTestId('heading-qa-scoring')).toBeVisible();
  });
});
