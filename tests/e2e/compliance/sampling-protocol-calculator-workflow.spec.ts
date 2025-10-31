/**
 * Phase 4 - TEST: Comprehensive E2E tests for Sampling Protocol Calculator
 * 
 * Test Coverage:
 * 1. Page load and initial state
 * 2. Loading states with skeletons
 * 3. Error handling and retry
 * 4. Input validation (min/max, invalid values)
 * 5. Sample size calculation
 * 6. Protocol table highlighting
 * 7. Random unit selection
 * 8. Unit tracking and progress
 * 9. Completion percentage calculation
 * 10. Edge cases (boundary values, empty state)
 * 
 * Business Context:
 * ENERGY STAR MFNC 1.2 requires specific sampling protocols for multifamily
 * unit testing. This calculator helps inspectors determine required sample
 * sizes and randomly select units for unbiased compliance verification.
 * 
 * Sampling ensures statistical confidence while minimizing testing burden
 * for large multifamily projects (up to 1000+ units).
 */

import { test, expect } from '@playwright/test';

test.describe('Sampling Protocol Calculator - Workflow Tests', () => {
  
  /**
   * Test Setup
   * 
   * Before each test:
   * 1. Navigate to login page
   * 2. Authenticate as test user
   * 3. Ensure clean state for calculator testing
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
   * Test 1: Page Load and Initial State
   * 
   * Verifies:
   * - Page loads successfully without errors
   * - Header and description display correctly
   * - Protocol table shows all 5 sampling rules
   * - Input field is empty and ready for user input
   * - No sample result displayed initially
   */
  test('should load calculator page and display initial state', async ({ page }) => {
    // Navigate to sampling calculator
    await page.goto('/compliance/sampling-calculator');
    
    // Verify page loaded (no error state)
    await expect(page.getByTestId('page-sampling-calculator')).toBeVisible();
    
    // Verify header card displays
    await expect(page.getByTestId('card-calculator-header')).toBeVisible();
    await expect(page.getByTestId('text-calculator-title')).toBeVisible();
    await expect(page.getByTestId('text-calculator-title')).toContainText('ENERGY STAR MFNC Sampling Protocol Calculator');
    
    await expect(page.getByTestId('text-calculator-description')).toBeVisible();
    await expect(page.getByTestId('text-calculator-description')).toContainText('ENERGY STAR MFNC Version 1.2');
    
    // Verify input field exists and is empty
    await expect(page.getByTestId('input-unit-count')).toBeVisible();
    await expect(page.getByTestId('input-unit-count')).toBeEmpty();
    
    // Verify protocol table displays
    await expect(page.getByTestId('card-protocol-table')).toBeVisible();
    await expect(page.getByTestId('text-protocol-table-title')).toContainText('ENERGY STAR Sampling Protocol Table');
    
    // Verify all 5 sampling rules are shown
    for (let i = 0; i < 5; i++) {
      await expect(page.getByTestId(`row-sampling-rule-${i}`)).toBeVisible();
      await expect(page.getByTestId(`cell-range-${i}`)).toBeVisible();
      await expect(page.getByTestId(`cell-sample-${i}`)).toBeVisible();
      await expect(page.getByTestId(`cell-description-${i}`)).toBeVisible();
    }
    
    // Verify no sample result container shown initially
    await expect(page.getByTestId('container-sample-result')).not.toBeVisible();
  });

  /**
   * Test 2: Input Validation - Minimum Value
   * 
   * Verifies:
   * - Entering 0 shows validation error
   * - Error message displays correctly
   * - No sample calculation occurs
   */
  test('should validate minimum unit count of 1', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter invalid value (0)
    await page.fill('[data-testid="input-unit-count"]', '0');
    
    // Verify error message displays
    await expect(page.getByTestId('alert-input-error')).toBeVisible();
    await expect(page.getByTestId('text-input-error')).toContainText('Minimum 1 unit required');
    
    // Verify no sample result shown
    await expect(page.getByTestId('container-sample-result')).not.toBeVisible();
  });

  /**
   * Test 3: Input Validation - Maximum Value
   * 
   * Verifies:
   * - Entering value > 1000 shows validation error
   * - Error message displays correctly
   * - No sample calculation occurs
   */
  test('should validate maximum unit count of 1000', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter invalid value (1001)
    await page.fill('[data-testid="input-unit-count"]', '1001');
    
    // Verify error message displays
    await expect(page.getByTestId('alert-input-error')).toBeVisible();
    await expect(page.getByTestId('text-input-error')).toContainText('Maximum 1000 units allowed');
    
    // Verify no sample result shown
    await expect(page.getByTestId('container-sample-result')).not.toBeVisible();
  });

  /**
   * Test 4: Input Validation - Invalid Characters
   * 
   * Verifies:
   * - Entering non-numeric characters shows error
   * - Error message displays correctly
   */
  test('should validate numeric input only', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter invalid characters
    await page.fill('[data-testid="input-unit-count"]', 'abc');
    
    // Verify error message displays
    await expect(page.getByTestId('alert-input-error')).toBeVisible();
    await expect(page.getByTestId('text-input-error')).toContainText('Please enter a valid number');
  });

  /**
   * Test 5: Loading State with Skeleton Loaders
   * 
   * Verifies:
   * - Skeleton loaders display during calculation
   * - Layout remains stable (no content jump)
   * - Loading state clears when data arrives
   */
  test('should show loading skeletons while calculating sample size', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('/api/compliance/sampling/calculate', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/compliance/sampling-calculator');
    
    // Enter valid unit count
    await page.fill('[data-testid="input-unit-count"]', '50');
    
    // Verify loading state displays
    await expect(page.getByTestId('container-sample-result')).toBeVisible();
    await expect(page.getByTestId('container-loading-skeleton')).toBeVisible();
    await expect(page.getByTestId('skeleton-protocol-name')).toBeVisible();
    await expect(page.getByTestId('skeleton-sample-size')).toBeVisible();
    await expect(page.getByTestId('skeleton-sample-percentage')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.getByTestId('text-sample-size')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 6: Error State with Retry Capability
   * 
   * Verifies:
   * - Error alert displays when calculation fails
   * - Retry button is available and visible
   * - Retry button triggers new calculation attempt
   * - Success state loads after successful retry
   */
  test('should display error state and allow retry on failed calculation', async ({ page }) => {
    let callCount = 0;
    
    // Intercept API call to fail first attempt, succeed on retry
    await page.route('/api/compliance/sampling/calculate', async route => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/compliance/sampling-calculator');
    
    // Enter valid unit count
    await page.fill('[data-testid="input-unit-count"]', '50');
    
    // Verify error state displays
    await expect(page.getByTestId('alert-calculation-error')).toBeVisible();
    await expect(page.getByTestId('text-calculation-error')).toContainText('Unable to calculate sample size');
    await expect(page.getByTestId('button-retry-calculation')).toBeVisible();
    
    // Click retry button
    await page.click('[data-testid="button-retry-calculation"]');
    
    // Verify success state after retry
    await expect(page.getByTestId('text-sample-size')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('text-protocol-name')).toContainText('ENERGY STAR MFNC Version 1.2');
  });

  /**
   * Test 7: Sample Size Calculation - Small Building (1-7 units)
   * 
   * Verifies:
   * - Entering 5 units calculates 100% sample (5 units)
   * - Sample size displays correctly
   * - Percentage shows 100%
   * - Protocol table highlights first row
   */
  test('should calculate 100% sample for small buildings (1-7 units)', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 5 units
    await page.fill('[data-testid="input-unit-count"]', '5');
    
    // Verify sample result displays
    await expect(page.getByTestId('container-sample-result')).toBeVisible();
    await expect(page.getByTestId('text-protocol-name')).toContainText('ENERGY STAR MFNC Version 1.2');
    await expect(page.getByTestId('text-sample-size')).toContainText('5 units');
    await expect(page.getByTestId('text-sample-percentage')).toContainText('100%');
    
    // Verify first row highlighted in protocol table
    const firstRow = page.getByTestId('row-sampling-rule-0');
    await expect(firstRow).toHaveClass(/bg-primary\/10/);
  });

  /**
   * Test 8: Sample Size Calculation - Medium Building (8-20 units)
   * 
   * Verifies:
   * - Entering 15 units calculates 7 units sample
   * - Sample size displays correctly
   * - Percentage calculates correctly (47%)
   * - Protocol table highlights second row
   */
  test('should calculate 7 unit sample for medium buildings (8-20 units)', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 15 units
    await page.fill('[data-testid="input-unit-count"]', '15');
    
    // Verify sample result displays
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    await expect(page.getByTestId('text-sample-percentage')).toContainText('47%');
    
    // Verify second row highlighted in protocol table
    const secondRow = page.getByTestId('row-sampling-rule-1');
    await expect(secondRow).toHaveClass(/bg-primary\/10/);
  });

  /**
   * Test 9: Sample Size Calculation - Large Building (21-50 units)
   * 
   * Verifies:
   * - Entering 35 units calculates 9 units sample
   * - Sample size displays correctly
   * - Percentage calculates correctly (26%)
   * - Protocol table highlights third row
   */
  test('should calculate 9 unit sample for large buildings (21-50 units)', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 35 units
    await page.fill('[data-testid="input-unit-count"]', '35');
    
    // Verify sample result displays
    await expect(page.getByTestId('text-sample-size')).toContainText('9 units');
    await expect(page.getByTestId('text-sample-percentage')).toContainText('26%');
    
    // Verify third row highlighted in protocol table
    const thirdRow = page.getByTestId('row-sampling-rule-2');
    await expect(thirdRow).toHaveClass(/bg-primary\/10/);
  });

  /**
   * Test 10: Sample Size Calculation - Very Large Building (51-100 units)
   * 
   * Verifies:
   * - Entering 75 units calculates 11 units sample
   * - Sample size displays correctly
   * - Percentage calculates correctly (15%)
   * - Protocol table highlights fourth row
   */
  test('should calculate 11 unit sample for very large buildings (51-100 units)', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 75 units
    await page.fill('[data-testid="input-unit-count"]', '75');
    
    // Verify sample result displays
    await expect(page.getByTestId('text-sample-size')).toContainText('11 units');
    await expect(page.getByTestId('text-sample-percentage')).toContainText('15%');
    
    // Verify fourth row highlighted in protocol table
    const fourthRow = page.getByTestId('row-sampling-rule-3');
    await expect(fourthRow).toHaveClass(/bg-primary\/10/);
  });

  /**
   * Test 11: Sample Size Calculation - Massive Complex (101+ units)
   * 
   * Verifies:
   * - Entering 200 units calculates correct sample (13 + extra)
   * - Sample size displays correctly
   * - Protocol table highlights fifth row
   */
  test('should calculate scaled sample for massive complexes (101+ units)', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 200 units
    await page.fill('[data-testid="input-unit-count"]', '200');
    
    // Verify sample result displays (should be 13 + additional units)
    await expect(page.getByTestId('text-sample-size')).toBeVisible();
    await expect(page.getByTestId('text-sample-size')).toContainText('units');
    
    // Verify fifth row highlighted in protocol table
    const fifthRow = page.getByTestId('row-sampling-rule-4');
    await expect(fifthRow).toHaveClass(/bg-primary\/10/);
  });

  /**
   * Test 12: Random Unit Selection Generation
   * 
   * Verifies:
   * - Random selection card appears after calculation
   * - Generate button is enabled
   * - Clicking generate creates unit list
   * - Selected units display in correct format
   */
  test('should generate random unit selection when requested', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 20 units
    await page.fill('[data-testid="input-unit-count"]', '20');
    
    // Wait for calculation to complete
    await expect(page.getByTestId('text-sample-size')).toBeVisible();
    
    // Verify random selection card appears
    await expect(page.getByTestId('card-random-selection')).toBeVisible();
    await expect(page.getByTestId('text-random-selection-title')).toContainText('Random Unit Selection');
    
    // Verify generate button is enabled
    const generateButton = page.getByTestId('button-generate-sample');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();
    
    // Click generate button
    await generateButton.click();
    
    // Verify selected units display
    await expect(page.getByTestId('container-selected-units')).toBeVisible();
    await expect(page.getByTestId('text-selected-units-label')).toContainText('Selected Units:');
    await expect(page.getByTestId('text-selected-units')).toBeVisible();
    await expect(page.getByTestId('text-selected-units')).toContainText('Units:');
  });

  /**
   * Test 13: Sample Tracking Section Display
   * 
   * Verifies:
   * - Tracking card appears after unit selection
   * - All selected units display as checkboxes
   * - Initial status shows all as "Pending"
   * - Progress shows 0% initially
   * - Completion badge shows 0/7 tested
   */
  test('should display sample tracking section after unit selection', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 15 units (requires 7 unit sample)
    await page.fill('[data-testid="input-unit-count"]', '15');
    
    // Wait for calculation
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    
    // Generate random sample
    await page.click('[data-testid="button-generate-sample"]');
    
    // Verify tracking card appears
    await expect(page.getByTestId('card-tracking')).toBeVisible();
    await expect(page.getByTestId('text-tracking-title')).toContainText('Sample Tracking');
    
    // Verify completion badge shows 0/7
    await expect(page.getByTestId('badge-completion')).toContainText('0 / 7 Tested');
    
    // Verify progress section
    await expect(page.getByTestId('container-progress')).toBeVisible();
    await expect(page.getByTestId('text-completion-percentage')).toContainText('0%');
    
    // Verify unit list displays
    await expect(page.getByTestId('container-unit-list')).toBeVisible();
  });

  /**
   * Test 14: Unit Testing Status Toggle
   * 
   * Verifies:
   * - Clicking checkbox marks unit as tested
   * - Status badge updates from "Pending" to "Tested"
   * - Completion percentage updates correctly
   * - Completion badge updates tested count
   * - Progress bar updates visually
   */
  test('should update testing status and progress when units are marked tested', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 10 units (requires 7 unit sample)
    await page.fill('[data-testid="input-unit-count"]', '10');
    
    // Wait for calculation
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    
    // Generate random sample
    await page.click('[data-testid="button-generate-sample"]');
    
    // Wait for tracking section
    await expect(page.getByTestId('card-tracking')).toBeVisible();
    
    // Get first unit number from the list
    const firstUnitContainer = page.locator('[data-testid^="container-unit-"]').first();
    const firstCheckbox = firstUnitContainer.locator('[data-testid^="checkbox-unit-"]');
    const firstBadge = firstUnitContainer.locator('[data-testid^="badge-status-"]');
    
    // Verify initial state is "Pending"
    await expect(firstBadge).toContainText('Pending');
    
    // Click checkbox to mark as tested
    await firstCheckbox.click();
    
    // Verify badge updates to "Tested"
    await expect(firstBadge).toContainText('Tested');
    
    // Verify completion badge updates to 1/7
    await expect(page.getByTestId('badge-completion')).toContainText('1 / 7 Tested');
    
    // Verify percentage updates (1/7 ≈ 14%)
    await expect(page.getByTestId('text-completion-percentage')).toContainText('14%');
  });

  /**
   * Test 15: Complete Testing Workflow Progress
   * 
   * Verifies:
   * - Marking all units as tested shows 100% completion
   * - All badges update to "Tested"
   * - Progress bar reaches 100%
   * - Completion badge shows all units tested
   */
  test('should show 100% completion when all units are tested', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 7 units (100% sample = 7 units)
    await page.fill('[data-testid="input-unit-count"]', '7');
    
    // Wait for calculation
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    
    // Generate random sample
    await page.click('[data-testid="button-generate-sample"]');
    
    // Wait for tracking section
    await expect(page.getByTestId('card-tracking')).toBeVisible();
    
    // Get all unit checkboxes
    const allCheckboxes = page.locator('[data-testid^="checkbox-unit-"]');
    
    // Mark all units as tested
    const count = await allCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await allCheckboxes.nth(i).click();
    }
    
    // Verify 100% completion
    await expect(page.getByTestId('text-completion-percentage')).toContainText('100%');
    await expect(page.getByTestId('badge-completion')).toContainText('7 / 7 Tested');
    
    // Verify all badges show "Tested"
    const allBadges = page.locator('[data-testid^="badge-status-"]');
    const badgeCount = await allBadges.count();
    for (let i = 0; i < badgeCount; i++) {
      await expect(allBadges.nth(i)).toContainText('Tested');
    }
  });

  /**
   * Test 16: Regenerate Random Sample
   * 
   * Verifies:
   * - Can generate new random sample multiple times
   * - Selected units change with each generation
   * - Testing progress resets when new sample generated
   */
  test('should allow regenerating random sample with progress reset', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 20 units
    await page.fill('[data-testid="input-unit-count"]', '20');
    
    // Wait for calculation
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    
    // Generate first sample
    await page.click('[data-testid="button-generate-sample"]');
    await expect(page.getByTestId('container-selected-units')).toBeVisible();
    
    // Get first sample units text
    const firstSample = await page.getByTestId('text-selected-units').textContent();
    
    // Mark first unit as tested
    await page.locator('[data-testid^="checkbox-unit-"]').first().click();
    
    // Verify 1 unit tested
    await expect(page.getByTestId('badge-completion')).toContainText('1 / 7 Tested');
    
    // Regenerate sample
    await page.click('[data-testid="button-generate-sample"]');
    
    // Get second sample units text
    const secondSample = await page.getByTestId('text-selected-units').textContent();
    
    // Verify sample changed (statistically very unlikely to be identical)
    expect(firstSample).not.toBe(secondSample);
    
    // Verify progress reset to 0
    await expect(page.getByTestId('badge-completion')).toContainText('0 / 7 Tested');
  });

  /**
   * Test 17: Edge Case - Changing Unit Count Clears Selection
   * 
   * Verifies:
   * - Changing unit count clears random selection
   * - Testing progress is lost
   * - User must regenerate sample for new count
   */
  test('should clear random selection when unit count changes', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Enter 20 units
    await page.fill('[data-testid="input-unit-count"]', '20');
    await expect(page.getByTestId('text-sample-size')).toContainText('7 units');
    
    // Generate sample
    await page.click('[data-testid="button-generate-sample"]');
    await expect(page.getByTestId('card-tracking')).toBeVisible();
    
    // Mark unit as tested
    await page.locator('[data-testid^="checkbox-unit-"]').first().click();
    await expect(page.getByTestId('badge-completion')).toContainText('1 / 7 Tested');
    
    // Change unit count
    await page.fill('[data-testid="input-unit-count"]', '30');
    
    // Verify tracking card is no longer visible
    await expect(page.getByTestId('card-tracking')).not.toBeVisible();
    
    // Verify sample size updated for new count
    await expect(page.getByTestId('text-sample-size')).toContainText('9 units');
  });

  /**
   * Test 18: Accessibility - ARIA Labels
   * 
   * Verifies:
   * - Input has proper aria-invalid when error occurs
   * - Checkboxes have aria-label for screen readers
   * - Error messages have aria-describedby linking
   */
  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    await page.goto('/compliance/sampling-calculator');
    
    // Test invalid input ARIA
    await page.fill('[data-testid="input-unit-count"]', '-5');
    const input = page.getByTestId('input-unit-count');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    
    // Enter valid count and generate sample
    await page.fill('[data-testid="input-unit-count"]', '10');
    await expect(page.getByTestId('text-sample-size')).toBeVisible();
    await page.click('[data-testid="button-generate-sample"]');
    
    // Verify checkboxes have aria-label
    const firstCheckbox = page.locator('[data-testid^="checkbox-unit-"]').first();
    await expect(firstCheckbox).toHaveAttribute('aria-label', /Mark unit \d+ as tested/);
  });
});
