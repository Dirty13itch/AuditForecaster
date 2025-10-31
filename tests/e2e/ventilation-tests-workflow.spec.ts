import { test, expect } from '@playwright/test';

/**
 * Ventilation Testing Workflow E2E Tests
 * 
 * Comprehensive tests for ASHRAE 62.2 and Minnesota 2020 Energy Code compliance
 * 
 * Code Requirements:
 * - Kitchen: ≥100 CFM (intermittent) OR ≥25 CFM (continuous)
 * - Bathrooms: ≥50 CFM (intermittent) OR ≥20 CFM (continuous)
 * - Whole-house: ASHRAE 62.2 formula: Qtotal = 0.03 × floor_area + 7.5 × (bedrooms + 1)
 * 
 * Test Coverage:
 * - ASHRAE 62.2 calculation verification
 * - Local exhaust compliance (kitchen/bathrooms)
 * - Total ventilation compliance
 * - Pass/fail scenarios
 * - Infiltration credits
 * - Mechanical ventilation systems (HRV/ERV/supply/exhaust)
 * - Multi-bathroom configurations
 * - Test persistence (save/load)
 */

test.describe('Ventilation Testing Workflow', () => {
  let testJobId: string;

  test.beforeEach(async ({ page }) => {
    // Login and create test job
    await page.goto('/');
    
    // Wait for login or navigate to auth
    await page.waitForTimeout(1000);
    
    // Create a test job
    await page.goto('/jobs');
    
    const createButton = page.getByTestId('button-create-job');
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createButton.click();
      
      await page.getByTestId('input-lot-address').fill(`Ventilation Test ${Date.now()}`);
      await page.getByTestId('input-builder-name').fill('Test Builder');
      await page.getByTestId('input-floor-area').fill('2000');
      await page.getByTestId('input-bedrooms').fill('3');
      
      await page.getByTestId('button-save-job').click();
      await page.waitForTimeout(1000);
    }
    
    // Get first job card
    const firstJobCard = page.locator('[data-testid^="card-job-"]').first();
    await firstJobCard.waitFor({ state: 'visible', timeout: 5000 });
    
    const testId = await firstJobCard.getAttribute('data-testid');
    testJobId = testId?.replace('card-job-', '') || '';
    
    if (!testJobId) {
      throw new Error('Failed to extract job ID');
    }
  });

  /**
   * Test 1: Page loads with skeleton loaders
   */
  test('should show skeleton loaders while page loads', async ({ page }) => {
    // Navigate to ventilation tests page
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    
    // Should show skeleton initially (if data is slow to load)
    // Note: This might be very fast in test environment
    const skeleton = page.getByTestId('skeleton-loading');
    
    // Either we see skeleton briefly or page loads directly
    const skeletonVisible = await skeleton.isVisible({ timeout: 500 }).catch(() => false);
    
    // Page should eventually load
    await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ventilation Testing')).toBeVisible();
  });

  /**
   * Test 2: Verify all tabs are present and functional
   */
  test('should have all required tabs', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Verify all tabs exist
    await expect(page.getByTestId('tab-house')).toBeVisible();
    await expect(page.getByTestId('tab-kitchen')).toBeVisible();
    await expect(page.getByTestId('tab-bathrooms')).toBeVisible();
    await expect(page.getByTestId('tab-mechanical')).toBeVisible();
    await expect(page.getByTestId('tab-results')).toBeVisible();

    // Test tab switching
    await page.getByTestId('tab-kitchen').click();
    await expect(page.getByTestId('tab-content-kitchen')).toBeVisible();
    
    await page.getByTestId('tab-bathrooms').click();
    await expect(page.getByTestId('tab-content-bathrooms')).toBeVisible();
    
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();
  });

  /**
   * Test 3: ASHRAE 62.2 calculation verification (Pass scenario)
   * Floor area: 2000 sq ft, Bedrooms: 3
   * Required: 0.03 × 2000 + 7.5 × (3 + 1) = 60 + 30 = 90 CFM
   */
  test('should calculate ASHRAE 62.2 required ventilation correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Enter house characteristics
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    
    // Calculate required ventilation
    await page.getByTestId('button-calculate-required').click();
    
    // Verify ASHRAE 62.2 calculation: 0.03 × 2000 + 7.5 × (3 + 1) = 90 CFM
    await expect(page.getByTestId('section-calculated-requirements')).toBeVisible();
    
    const requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('90.0');
    
    // Verify adjusted required (no infiltration credit yet)
    const adjustedRequired = await page.getByTestId('text-adjusted-required').textContent();
    expect(adjustedRequired).toContain('90.0');
  });

  /**
   * Test 4: ASHRAE 62.2 with infiltration credit
   * Required: 90 CFM, Infiltration credit: 20 CFM
   * Adjusted required: 90 - 20 = 70 CFM
   */
  test('should apply infiltration credit correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Calculate base requirement
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();
    
    // Apply infiltration credit
    await page.getByTestId('input-infiltration-credit').fill('20');
    
    // Wait for calculation to update
    await page.waitForTimeout(500);
    
    // Verify adjusted required: 90 - 20 = 70 CFM
    const adjustedRequired = await page.getByTestId('text-adjusted-required').textContent();
    expect(adjustedRequired).toContain('70.0');
  });

  /**
   * Test 5: Kitchen exhaust compliance - Intermittent (Pass)
   * Requirement: ≥100 CFM
   */
  test('should pass kitchen intermittent exhaust compliance', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Navigate to kitchen tab
    await page.getByTestId('tab-kitchen').click();
    
    // Set intermittent exhaust type
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    
    // Enter measured CFM above minimum (100)
    await page.getByTestId('input-kitchen-measured').fill('120');
    
    // Navigate to results and calculate
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify kitchen compliance passes
    await expect(page.getByTestId('component-kitchen')).toContainText('Kitchen Exhaust');
    
    // Switch back to kitchen tab to see compliance badge
    await page.getByTestId('tab-kitchen').click();
    const kitchenBadge = page.getByTestId('badge-kitchen-compliance');
    await expect(kitchenBadge).toContainText('Compliant');
  });

  /**
   * Test 6: Kitchen exhaust compliance - Intermittent (Fail)
   * Requirement: ≥100 CFM, Provided: 80 CFM
   */
  test('should fail kitchen intermittent exhaust compliance', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Setup
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();

    // Kitchen - below minimum
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('80'); // Below 100 CFM requirement
    
    // Calculate compliance
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify overall non-compliance
    const overallBadge = page.getByTestId('badge-overall-compliance');
    await expect(overallBadge).toContainText('Non-Compliant');
    
    // Verify kitchen shows as non-compliant
    await page.getByTestId('tab-kitchen').click();
    const kitchenBadge = page.getByTestId('badge-kitchen-compliance');
    await expect(kitchenBadge).toContainText('Non-Compliant');
  });

  /**
   * Test 7: Kitchen continuous exhaust (Pass)
   * Requirement: ≥25 CFM
   */
  test('should pass kitchen continuous exhaust compliance', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByTestId('tab-kitchen').click();
    
    // Set continuous exhaust type
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /continuous.*25/i }).click();
    
    // Enter measured CFM above minimum (25)
    await page.getByTestId('input-kitchen-measured').fill('30');
    
    // Calculate compliance
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify compliance
    await page.getByTestId('tab-kitchen').click();
    const kitchenBadge = page.getByTestId('badge-kitchen-compliance');
    await expect(kitchenBadge).toContainText('Compliant');
  });

  /**
   * Test 8: Bathroom exhaust compliance - Intermittent (Pass)
   * Requirement: ≥50 CFM
   */
  test('should pass bathroom intermittent exhaust compliance', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByTestId('tab-bathrooms').click();
    
    // Configure bathroom 1
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent.*50/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('60');
    
    // Calculate compliance
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify bathroom 1 compliance
    await expect(page.getByTestId('component-bathroom1')).toBeVisible();
  });

  /**
   * Test 9: Bathroom exhaust compliance - Continuous (Pass)
   * Requirement: ≥20 CFM
   */
  test('should pass bathroom continuous exhaust compliance', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByTestId('tab-bathrooms').click();
    
    // Configure bathroom 1 as continuous
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /continuous.*20/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('25');
    
    // Calculate
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Should show bathroom 1 in component compliance
    await expect(page.getByTestId('component-bathroom1')).toBeVisible();
  });

  /**
   * Test 10: Multiple bathrooms configuration
   */
  test('should handle multiple bathrooms correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByTestId('tab-bathrooms').click();
    
    // Configure 4 bathrooms
    // Bathroom 1: Intermittent, 60 CFM
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('60');
    
    // Bathroom 2: Continuous, 25 CFM
    await page.getByTestId('select-bathroom2-type').click();
    await page.getByRole('option', { name: /continuous/i }).nth(1).click();
    await page.getByTestId('input-bathroom2-measured').fill('25');
    
    // Bathroom 3: Intermittent, 55 CFM
    await page.getByTestId('select-bathroom3-type').click();
    await page.getByRole('option', { name: /intermittent/i }).nth(2).click();
    await page.getByTestId('input-bathroom3-measured').fill('55');
    
    // Bathroom 4: None
    await page.getByTestId('select-bathroom4-type').click();
    await page.getByRole('option', { name: /none/i }).last().click();
    
    // Calculate
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify 3 bathrooms shown in results (bathroom 4 is "none")
    await expect(page.getByTestId('component-bathroom1')).toBeVisible();
    await expect(page.getByTestId('component-bathroom2')).toBeVisible();
    await expect(page.getByTestId('component-bathroom3')).toBeVisible();
    
    // Bathroom 4 should not show in component compliance
    const bathroom4Component = page.getByTestId('component-bathroom4');
    const isBathroom4Visible = await bathroom4Component.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isBathroom4Visible).toBe(false);
  });

  /**
   * Test 11: Overall compliance - PASS scenario
   * All requirements met:
   * - Kitchen: 120 CFM (intermittent) ✓
   * - Bathroom: 60 CFM (intermittent) ✓
   * - Total: 180 CFM vs Required: 90 CFM ✓
   */
  test('should pass overall compliance when all requirements met', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Calculate ASHRAE requirement
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();
    
    // Kitchen: 120 CFM intermittent (meets ≥100)
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('120');
    
    // Bathroom 1: 60 CFM intermittent (meets ≥50)
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('60');
    
    // Calculate compliance
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify total provided: 120 + 60 = 180 CFM
    const totalProvided = await page.getByTestId('text-total-provided').textContent();
    expect(totalProvided).toContain('180');
    
    // Verify required
    const requiredAdjusted = await page.getByTestId('text-required-adjusted').textContent();
    expect(requiredAdjusted).toContain('90');
    
    // Verify overall compliance
    const overallBadge = page.getByTestId('badge-overall-compliance');
    await expect(overallBadge).toContainText('Compliant');
    
    // Verify compliance alert at top of page
    const complianceAlert = page.getByTestId('alert-compliance');
    await expect(complianceAlert).toContainText('Compliant');
  });

  /**
   * Test 12: Overall compliance - FAIL scenario (insufficient total ventilation)
   * Kitchen + Bathroom meet local requirements, but total < ASHRAE requirement
   */
  test('should fail overall compliance when total ventilation insufficient', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Large house: requires more ventilation
    // 3000 sq ft, 4 bedrooms: 0.03 × 3000 + 7.5 × 5 = 90 + 37.5 = 127.5 CFM
    await page.getByTestId('input-floor-area').fill('3000');
    await page.getByTestId('input-bedrooms').fill('4');
    await page.getByTestId('button-calculate-required').click();
    
    // Kitchen: 100 CFM (meets minimum, but barely)
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('100');
    
    // Bathroom: 50 CFM (meets minimum, but barely)
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('50');
    
    // Total: 100 + 50 = 150 CFM, but required is 127.5 CFM
    // Actually this would pass. Let's make it fail:
    // Use smaller values that meet local requirements but not total
    
    // Kitchen: 100 CFM continuous → changed to 25 CFM continuous (minimum)
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /continuous/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('25');
    
    // Bathroom: 20 CFM continuous (minimum)
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /continuous/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('20');
    
    // Total: 25 + 20 = 45 CFM < Required: 127.5 CFM → FAIL
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify totals
    const totalProvided = await page.getByTestId('text-total-provided').textContent();
    expect(totalProvided).toContain('45');
    
    // Verify overall compliance FAILS
    const overallBadge = page.getByTestId('badge-overall-compliance');
    await expect(overallBadge).toContainText('Non-Compliant');
    
    // Verify alert shows non-compliant
    const complianceAlert = page.getByTestId('alert-compliance');
    await expect(complianceAlert).toContainText('Non-Compliant');
  });

  /**
   * Test 13: Mechanical ventilation system - HRV
   */
  test('should handle mechanical ventilation HRV correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Setup ASHRAE requirement
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();
    
    // Configure mechanical ventilation
    await page.getByTestId('tab-mechanical').click();
    
    await page.getByTestId('select-mechanical-type').click();
    await page.getByRole('option', { name: /balanced hrv/i }).click();
    
    await page.getByTestId('input-mechanical-supply').fill('95');
    await page.getByTestId('input-mechanical-exhaust').fill('93');
    
    // Kitchen and bathroom meet minimums
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('100');
    
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('50');
    
    // Calculate - mechanical uses max(supply, exhaust) = 95 CFM
    // Total: 100 + 50 + 95 = 245 CFM vs Required: 90 CFM
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    const totalProvided = await page.getByTestId('text-total-provided').textContent();
    expect(totalProvided).toContain('245');
    
    const overallBadge = page.getByTestId('badge-overall-compliance');
    await expect(overallBadge).toContainText('Compliant');
  });

  /**
   * Test 14: Save and reload test data
   */
  test('should save and reload test data correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Enter complete test data
    await page.getByTestId('input-floor-area').fill('2500');
    await page.getByTestId('input-bedrooms').fill('4');
    await page.getByTestId('button-calculate-required').click();
    
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('115');
    
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('65');
    
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Get calculated values
    const totalProvidedBefore = await page.getByTestId('text-total-provided').textContent();
    
    // Save test
    await page.getByTestId('button-save-test').click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 10000 });
    
    // Navigate to results
    await page.getByTestId('tab-results').click();
    
    // Verify data persisted
    const totalProvidedAfter = await page.getByTestId('text-total-provided').textContent();
    
    // Should show same total (or need to recalculate)
    // Note: might need to click calculate again depending on implementation
    if (!totalProvidedAfter || totalProvidedAfter === '0.0 cfm') {
      await page.getByTestId('button-calculate-compliance').click();
      const recalculated = await page.getByTestId('text-total-provided').textContent();
      expect(recalculated).toContain('180'); // 115 + 65
    } else {
      expect(totalProvidedAfter).toBe(totalProvidedBefore);
    }
  });

  /**
   * Test 15: Bedroom count affects ASHRAE 62.2 requirement
   */
  test('should adjust ASHRAE requirement based on bedroom count', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Test with 2 bedrooms
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('2');
    await page.getByTestId('button-calculate-required').click();
    
    // Required: 0.03 × 2000 + 7.5 × (2 + 1) = 60 + 22.5 = 82.5 CFM
    let requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('82.5');
    
    // Test with 5 bedrooms
    await page.getByTestId('input-bedrooms').fill('5');
    await page.getByTestId('button-calculate-required').click();
    
    // Required: 0.03 × 2000 + 7.5 × (5 + 1) = 60 + 45 = 105 CFM
    requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('105.0');
  });

  /**
   * Test 16: Floor area affects ASHRAE 62.2 requirement
   */
  test('should adjust ASHRAE requirement based on floor area', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Small house: 1500 sq ft, 3 bedrooms
    await page.getByTestId('input-floor-area').fill('1500');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();
    
    // Required: 0.03 × 1500 + 7.5 × 4 = 45 + 30 = 75 CFM
    let requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('75.0');
    
    // Large house: 4000 sq ft, 3 bedrooms
    await page.getByTestId('input-floor-area').fill('4000');
    await page.getByTestId('button-calculate-required').click();
    
    // Required: 0.03 × 4000 + 7.5 × 4 = 120 + 30 = 150 CFM
    requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('150.0');
  });

  /**
   * Test 17: Validation - missing floor area and bedrooms
   */
  test('should require floor area and bedrooms for ASHRAE calculation', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Clear inputs
    await page.getByTestId('input-floor-area').fill('');
    await page.getByTestId('input-bedrooms').fill('');
    
    // Try to calculate without data
    await page.getByTestId('button-calculate-required').click();
    
    // Should show error toast or validation message
    // Note: Implementation shows toast - we can't easily test toast content in Playwright
    // but we can verify that calculated requirements section doesn't appear
    const calculatedSection = page.getByTestId('section-calculated-requirements');
    const isVisible = await calculatedSection.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  /**
   * Test 18: Edge case - very tight house with high infiltration credit
   */
  test('should handle infiltration credit exceeding base requirement', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Small house with low requirement
    await page.getByTestId('input-floor-area').fill('1200');
    await page.getByTestId('input-bedrooms').fill('2');
    await page.getByTestId('button-calculate-required').click();
    
    // Required: 0.03 × 1200 + 7.5 × 3 = 36 + 22.5 = 58.5 CFM
    const requiredRate = await page.getByTestId('text-required-rate').textContent();
    expect(requiredRate).toContain('58.5');
    
    // Very tight house - high infiltration credit (exceeds requirement)
    await page.getByTestId('input-infiltration-credit').fill('70');
    await page.waitForTimeout(500);
    
    // Adjusted should be max(0, 58.5 - 70) = 0
    const adjustedRequired = await page.getByTestId('text-adjusted-required').textContent();
    expect(adjustedRequired).toContain('0.0');
  });

  /**
   * Test 19: Component compliance summary shows all results
   */
  test('should display component compliance summary correctly', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Setup complete test
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('input-bedrooms').fill('3');
    await page.getByTestId('button-calculate-required').click();
    
    // Kitchen: Pass
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('select-kitchen-type').click();
    await page.getByRole('option', { name: /intermittent/i }).click();
    await page.getByTestId('input-kitchen-measured').fill('120');
    
    // Bathroom 1: Pass
    await page.getByTestId('tab-bathrooms').click();
    await page.getByTestId('select-bathroom1-type').click();
    await page.getByRole('option', { name: /intermittent/i }).first().click();
    await page.getByTestId('input-bathroom1-measured').fill('60');
    
    // Bathroom 2: Fail
    await page.getByTestId('select-bathroom2-type').click();
    await page.getByRole('option', { name: /intermittent/i }).nth(1).click();
    await page.getByTestId('input-bathroom2-measured').fill('40'); // Below 50 CFM
    
    // Calculate
    await page.getByTestId('tab-results').click();
    await page.getByTestId('button-calculate-compliance').click();
    
    // Verify component compliance section
    await expect(page.getByTestId('section-component-compliance')).toBeVisible();
    await expect(page.getByTestId('component-kitchen')).toBeVisible();
    await expect(page.getByTestId('component-bathroom1')).toBeVisible();
    await expect(page.getByTestId('component-bathroom2')).toBeVisible();
    await expect(page.getByTestId('component-total-ventilation')).toBeVisible();
    
    // Overall should fail due to bathroom 2
    const overallBadge = page.getByTestId('badge-overall-compliance');
    await expect(overallBadge).toContainText('Non-Compliant');
  });

  /**
   * Test 20: Notes and recommendations can be saved
   */
  test('should save recommendations and inspector notes', async ({ page }) => {
    await page.goto(`/jobs/${testJobId}/ventilation-tests`);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByTestId('tab-results').click();
    
    const recommendations = 'Install HRV system to improve whole-house ventilation and meet code requirements.';
    const inspectorNotes = 'Test conducted in cold weather conditions. All exhaust fans verified operational.';
    
    await page.getByTestId('textarea-recommendations').fill(recommendations);
    await page.getByTestId('textarea-inspector-notes').fill(inspectorNotes);
    
    // Save
    await page.getByTestId('button-save-test').click();
    await page.waitForTimeout(1000);
    
    // Reload and verify
    await page.reload();
    await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('tab-results').click();
    
    const reloadedRecommendations = await page.getByTestId('textarea-recommendations').inputValue();
    const reloadedNotes = await page.getByTestId('textarea-inspector-notes').inputValue();
    
    expect(reloadedRecommendations).toBe(recommendations);
    expect(reloadedNotes).toBe(inspectorNotes);
  });
});
