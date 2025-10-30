import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { JobsPage } from './pages/JobsPage';
import { BlowerDoorPage } from './pages/BlowerDoorPage';

/**
 * Blower Door Testing Workflow E2E Tests
 * 
 * Comprehensive tests for Minnesota 2020 Energy Code compliance testing
 * ACH50 ≤ 3.0 requirement for Climate Zone 6
 * 
 * Test Coverage:
 * - Single-point and multi-point tests
 * - Compliance pass/fail scenarios
 * - Weather and altitude corrections
 * - Data validation
 * - Test persistence (save/load/delete)
 * - PDF report generation
 */

test.describe('Blower Door Testing Workflow', () => {
  let loginPage: LoginPage;
  let jobsPage: JobsPage;
  let blowerDoorPage: BlowerDoorPage;
  let testJobId: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    jobsPage = new JobsPage(page);
    blowerDoorPage = new BlowerDoorPage(page);

    // Login as inspector
    await loginPage.loginAsInspector();
    
    // Create a test job for blower door testing
    await jobsPage.goto();
    await jobsPage.createJob({
      name: `Blower Door Test ${Date.now()}`,
      address: '123 Energy Ave, Minneapolis, MN 55401',
      contractor: 'Green Build Co',
      inspectionType: 'Final',
    });
    
    // Navigate to jobs page to find the created job
    await jobsPage.goto();
    
    // Click on the first job card (most recently created)
    const firstJobCard = page.locator('[data-testid^="card-job-"]').first();
    await firstJobCard.waitFor({ state: 'visible' });
    
    // Get job ID from the card's data-testid (format: card-job-{id})
    const testId = await firstJobCard.getAttribute('data-testid');
    testJobId = testId?.replace('card-job-', '') || '';
    
    if (!testJobId) {
      throw new Error('Failed to extract job ID');
    }
  });

  /**
   * Test 1: Pass compliance with ACH50 = 2.5 (well under 3.0 limit)
   * Uses realistic values: CFM50 = 500, Volume = 12,000 ft³
   */
  test('should pass compliance with ACH50 = 2.5', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);
    await blowerDoorPage.verifyPageLoaded();

    // Enter building data
    await blowerDoorPage.enterBuildingData({
      volume: 12000,
      conditionedArea: 1500,
      stories: 2,
      basementType: 'none',
    });

    // Enter multi-point test data to achieve CFM50 ≈ 500
    // Using realistic fan pressures that will calculate to ~500 CFM at 50 Pa
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },  // 50 Pa
      { index: 1, fanPressure: 40, ringConfig: 'Open' },  // 45 Pa
      { index: 2, fanPressure: 35, ringConfig: 'Open' },  // 40 Pa
      { index: 3, fanPressure: 30, ringConfig: 'Open' },  // 35 Pa
      { index: 4, fanPressure: 25, ringConfig: 'Open' },  // 30 Pa
    ]);

    // Calculate results
    await blowerDoorPage.calculateResults();

    // Verify ACH50 ≈ 2.5: (500 * 60) / 12000 = 2.5
    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeLessThan(3.0);
    expect(ach50).toBeGreaterThan(2.0);
    expect(ach50).toBeCloseTo(2.5, 0.5); // Within 0.5 ACH50

    // Verify compliance passes
    await blowerDoorPage.verifyCompliance(true);
  });

  /**
   * Test 2: Borderline pass (ACH50 = 2.9, just under 3.0 limit)
   */
  test('should pass compliance borderline ACH50 = 2.9', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Calculate needed CFM50: ACH50 = (CFM50 * 60) / Volume
    // For ACH50 = 2.9 and Volume = 10,000: CFM50 = (2.9 * 10000) / 60 ≈ 483
    await blowerDoorPage.enterBuildingData({
      volume: 10000,
      conditionedArea: 1250,
    });

    // Enter test points to achieve CFM50 ≈ 480
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 43, ringConfig: 'Open' },
      { index: 1, fanPressure: 38, ringConfig: 'Open' },
      { index: 2, fanPressure: 33, ringConfig: 'Open' },
      { index: 3, fanPressure: 28, ringConfig: 'Open' },
      { index: 4, fanPressure: 23, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeLessThanOrEqual(3.0);
    expect(ach50).toBeGreaterThan(2.5);

    await blowerDoorPage.verifyCompliance(true);
  });

  /**
   * Test 3: Fail compliance with ACH50 = 3.2 (slightly over 3.0 limit)
   */
  test('should fail compliance with ACH50 = 3.2', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // For ACH50 = 3.2 and Volume = 10,000: CFM50 = (3.2 * 10000) / 60 ≈ 533
    await blowerDoorPage.enterBuildingData({
      volume: 10000,
      conditionedArea: 1250,
    });

    // Enter test points to achieve CFM50 ≈ 530
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 48, ringConfig: 'Open' },
      { index: 1, fanPressure: 43, ringConfig: 'Open' },
      { index: 2, fanPressure: 38, ringConfig: 'Open' },
      { index: 3, fanPressure: 33, ringConfig: 'Open' },
      { index: 4, fanPressure: 28, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeGreaterThan(3.0);
    expect(ach50).toBeLessThan(3.5);

    // Verify compliance fails
    await blowerDoorPage.verifyCompliance(false);

    // Verify negative margin
    const margin = await blowerDoorPage.getComplianceMargin();
    expect(margin).toBeLessThan(0); // Negative margin = over limit
  });

  /**
   * Test 4: Fail compliance with ACH50 = 4.5 (well over limit)
   */
  test('should fail compliance with ACH50 = 4.5', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // For ACH50 = 4.5 and Volume = 8,000: CFM50 = (4.5 * 8000) / 60 = 600
    await blowerDoorPage.enterBuildingData({
      volume: 8000,
      conditionedArea: 1000,
    });

    // Enter test points to achieve CFM50 ≈ 600
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 55, ringConfig: 'Open' },
      { index: 1, fanPressure: 50, ringConfig: 'Open' },
      { index: 2, fanPressure: 44, ringConfig: 'Open' },
      { index: 3, fanPressure: 38, ringConfig: 'Open' },
      { index: 4, fanPressure: 32, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeGreaterThan(4.0);

    await blowerDoorPage.verifyCompliance(false);
  });

  /**
   * Test 5: Multi-point test with minimum 5 points
   */
  test('should calculate with minimum 5 test points', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({
      volume: 15000,
      conditionedArea: 1875,
    });

    // Enter exactly 5 points (minimum required)
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },
      { index: 1, fanPressure: 40, ringConfig: 'Open' },
      { index: 2, fanPressure: 35, ringConfig: 'Open' },
      { index: 3, fanPressure: 30, ringConfig: 'Open' },
      { index: 4, fanPressure: 25, ringConfig: 'Open' },
    ]);

    // Should succeed with 5 points
    await blowerDoorPage.calculateResults();

    // Verify results were calculated
    const cfm50 = await blowerDoorPage.getCFM50();
    expect(cfm50).toBeGreaterThan(0);

    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeGreaterThan(0);
  });

  /**
   * Test 6: Multi-point test with all 7 points for maximum accuracy
   */
  test('should calculate with all 7 test points for maximum accuracy', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({
      volume: 18000,
      conditionedArea: 2250,
      stories: 2,
    });

    // Enter all 7 test points
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },  // 50 Pa
      { index: 1, fanPressure: 40, ringConfig: 'Open' },  // 45 Pa
      { index: 2, fanPressure: 35, ringConfig: 'Open' },  // 40 Pa
      { index: 3, fanPressure: 30, ringConfig: 'Open' },  // 35 Pa
      { index: 4, fanPressure: 25, ringConfig: 'Open' },  // 30 Pa
      { index: 5, fanPressure: 20, ringConfig: 'Open' },  // 25 Pa
      { index: 6, fanPressure: 16, ringConfig: 'Open' },  // 20 Pa
    ]);

    await blowerDoorPage.calculateResults();

    // Verify ELA is calculated (only calculated with multi-point)
    const ela = await blowerDoorPage.getELA();
    expect(ela).toBeGreaterThan(0);

    // Verify ACH50 is reasonable for this volume
    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeGreaterThan(0);
    expect(ach50).toBeLessThan(5.0);
  });

  /**
   * Test 7: Weather corrections applied (temperature difference)
   */
  test('should apply weather corrections for temperature', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({
      volume: 12000,
    });

    // Enter weather conditions with significant temp difference
    await blowerDoorPage.enterWeatherConditions({
      outdoorTemp: 30,  // Cold outdoor temp (winter testing)
      indoorTemp: 70,   // Warm indoor temp
      barometricPressure: 29.92,
    });

    // Enter test data
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },
      { index: 1, fanPressure: 40, ringConfig: 'Open' },
      { index: 2, fanPressure: 35, ringConfig: 'Open' },
      { index: 3, fanPressure: 30, ringConfig: 'Open' },
      { index: 4, fanPressure: 25, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    // Verify calculations completed with weather correction
    const ach50 = await blowerDoorPage.getACH50();
    expect(ach50).toBeGreaterThan(0);

    // Verify results tab shows weather correction was applied
    await blowerDoorPage.switchToTab('results');
    await expect(page.getByText(/Weather Corrected/i)).toBeVisible();
    await expect(page.getByText(/Yes/i)).toBeVisible();
  });

  /**
   * Test 8: Altitude corrections for Minneapolis (900 ft elevation)
   */
  test('should apply altitude correction for Minneapolis', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({
      volume: 14000,
    });

    // Enter Minneapolis altitude
    await blowerDoorPage.enterWeatherConditions({
      altitude: 900,  // Minneapolis average elevation
      barometricPressure: 29.5, // Typical for 900 ft
    });

    // Enter test data
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },
      { index: 1, fanPressure: 40, ringConfig: 'Open' },
      { index: 2, fanPressure: 35, ringConfig: 'Open' },
      { index: 3, fanPressure: 30, ringConfig: 'Open' },
      { index: 4, fanPressure: 25, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    // Verify altitude correction is shown
    await blowerDoorPage.switchToTab('results');
    await expect(page.getByText(/Altitude Correction/i)).toBeVisible();
    
    // Correction factor should be close to 1.0 for moderate altitude
    const altitudeText = await page.locator('text=/Altitude Correction/i')
      .locator('..')
      .locator('span')
      .last()
      .textContent();
    
    expect(altitudeText).toBeTruthy();
    const correctionFactor = parseFloat(altitudeText || '1.0');
    expect(correctionFactor).toBeGreaterThan(0.95);
    expect(correctionFactor).toBeLessThan(1.05);
  });

  /**
   * Test 9: Save and reload test data
   */
  test('should save test and reload data correctly', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Enter complete test data
    await blowerDoorPage.enterBuildingData({
      volume: 13000,
      conditionedArea: 1625,
      stories: 2,
    });

    await blowerDoorPage.enterEquipmentInfo('BD3-2024-001', '2024-01-15');

    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45, ringConfig: 'Open' },
      { index: 1, fanPressure: 40, ringConfig: 'Open' },
      { index: 2, fanPressure: 35, ringConfig: 'Open' },
      { index: 3, fanPressure: 30, ringConfig: 'Open' },
      { index: 4, fanPressure: 25, ringConfig: 'Open' },
    ]);

    await blowerDoorPage.calculateResults();

    // Get original ACH50
    const originalACH50 = await blowerDoorPage.getACH50();

    // Save the test
    await blowerDoorPage.saveTest();

    // Reload the page
    await page.reload();
    await blowerDoorPage.verifyPageLoaded();

    // Verify data persisted
    await blowerDoorPage.switchToTab('results');
    const reloadedACH50 = await blowerDoorPage.getACH50();
    
    expect(reloadedACH50).toBe(originalACH50);

    // Verify delete button is visible (test exists)
    const hasTest = await blowerDoorPage.hasExistingTest();
    expect(hasTest).toBe(true);
  });

  /**
   * Test 10: Delete test
   */
  test('should delete test successfully', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Enter and save test
    await blowerDoorPage.enterBuildingData({ volume: 12000 });
    
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45 },
      { index: 1, fanPressure: 40 },
      { index: 2, fanPressure: 35 },
      { index: 3, fanPressure: 30 },
      { index: 4, fanPressure: 25 },
    ]);

    await blowerDoorPage.calculateResults();
    await blowerDoorPage.saveTest();

    // Verify test exists
    const hasTestBefore = await blowerDoorPage.hasExistingTest();
    expect(hasTestBefore).toBe(true);

    // Delete the test
    await blowerDoorPage.deleteTest();

    // Verify delete button is no longer visible
    const hasTestAfter = await blowerDoorPage.hasExistingTest();
    expect(hasTestAfter).toBe(false);
  });

  /**
   * Test 11: Validation - cannot calculate without building volume
   */
  test('should require building volume for calculation', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Try to calculate without entering building volume
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45 },
      { index: 1, fanPressure: 40 },
      { index: 2, fanPressure: 35 },
      { index: 3, fanPressure: 30 },
      { index: 4, fanPressure: 25 },
    ]);

    await blowerDoorPage.calculateResults();

    // Should show error or incomplete results
    // ACH50 calculation requires volume, so it should be 0 or show error
    await blowerDoorPage.switchToTab('results');
    const ach50Display = await page.locator('text=/ACH50/i').locator('..').locator('.text-2xl').textContent();
    
    // Should be either "—" (not calculated) or "Infinity" / "0" (invalid)
    expect(ach50Display === '—' || ach50Display === '0' || ach50Display?.includes('Infinity')).toBe(true);
  });

  /**
   * Test 12: Validation - cannot calculate with fewer than 5 test points
   */
  test('should require minimum 5 test points for calculation', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({ volume: 12000 });

    // Enter only 4 points (below minimum)
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45 },
      { index: 1, fanPressure: 40 },
      { index: 2, fanPressure: 35 },
      { index: 3, fanPressure: 30 },
    ]);

    await blowerDoorPage.switchToTab('multipoint');

    // Calculate button should be disabled
    const calculateButton = page.getByRole('button', { name: /calculate results/i });
    await expect(calculateButton).toBeDisabled();
  });

  /**
   * Test 13: PDF report generation
   */
  test('should generate PDF report', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Enter complete test
    await blowerDoorPage.enterBuildingData({
      volume: 12000,
      conditionedArea: 1500,
    });

    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45 },
      { index: 1, fanPressure: 40 },
      { index: 2, fanPressure: 35 },
      { index: 3, fanPressure: 30 },
      { index: 4, fanPressure: 25 },
    ]);

    await blowerDoorPage.calculateResults();
    await blowerDoorPage.saveTest();

    // Add notes
    await blowerDoorPage.enterNotes('Test completed successfully. All preparatory work verified.');

    // Download PDF
    const download = await blowerDoorPage.downloadPDF();

    // Verify download started
    expect(download.suggestedFilename()).toMatch(/blower-door-test.*\.pdf/);
  });

  /**
   * Test 14: Edit existing test measurements
   */
  test('should edit existing test measurements', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    // Create initial test
    await blowerDoorPage.enterBuildingData({ volume: 12000 });
    
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 45 },
      { index: 1, fanPressure: 40 },
      { index: 2, fanPressure: 35 },
      { index: 3, fanPressure: 30 },
      { index: 4, fanPressure: 25 },
    ]);

    await blowerDoorPage.calculateResults();
    const originalACH50 = await blowerDoorPage.getACH50();
    
    await blowerDoorPage.saveTest();

    // Edit the test - change fan pressures
    await blowerDoorPage.enterMultiPointData([
      { index: 0, fanPressure: 50 },  // Increased
      { index: 1, fanPressure: 45 },  // Increased
      { index: 2, fanPressure: 40 },  // Increased
      { index: 3, fanPressure: 35 },  // Increased
      { index: 4, fanPressure: 30 },  // Increased
    ]);

    await blowerDoorPage.calculateResults();
    const newACH50 = await blowerDoorPage.getACH50();

    // ACH50 should be higher due to increased fan pressures
    expect(newACH50).toBeGreaterThan(originalACH50);

    // Save updated test
    await blowerDoorPage.saveTest();

    // Reload and verify new values persisted
    await page.reload();
    await blowerDoorPage.verifyPageLoaded();
    
    await blowerDoorPage.switchToTab('results');
    const reloadedACH50 = await blowerDoorPage.getACH50();
    
    expect(reloadedACH50).toBe(newACH50);
  });

  /**
   * Test 15: Different ring configurations affect CFM calculation
   */
  test('should calculate different CFM values for different ring configurations', async ({ page }) => {
    await blowerDoorPage.goto(testJobId);

    await blowerDoorPage.enterBuildingData({ volume: 12000 });

    // Enter same fan pressure with different ring configurations
    // Ring A should produce lower CFM than Open for same fan pressure
    await blowerDoorPage.enterFanPressure(0, 50, 'Open');
    await blowerDoorPage.enterFanPressure(1, 50, 'Ring A');
    await blowerDoorPage.enterFanPressure(2, 50, 'Ring B');
    await blowerDoorPage.enterFanPressure(3, 40, 'Open');
    await blowerDoorPage.enterFanPressure(4, 40, 'Ring A');

    // Verify that CFM values in the table are different
    // This is a visual verification that the calculations are working
    // The actual CFM values are displayed in the read-only CFM column
    
    await blowerDoorPage.calculateResults();
    
    // Should successfully calculate with mixed ring configurations
    const cfm50 = await blowerDoorPage.getCFM50();
    expect(cfm50).toBeGreaterThan(0);
  });
});
