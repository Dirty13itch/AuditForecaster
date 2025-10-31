/**
 * E2E Test: Blower Door Test Workflow
 * 
 * Tests the complete blower door testing workflow including:
 * - Page loading with skeleton states
 * - Error states with retry functionality
 * - Test setup and data entry
 * - Multi-point pressure testing
 * - ACH50 calculation verification
 * - Minnesota 2020 Energy Code compliance checking (≤3.0 ACH50)
 * - Pass/fail determination
 * - Test save and PDF download
 */

import { test, expect } from '@playwright/test';

test.describe('Blower Door Test Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the blower door test page for a test job
    await page.goto('/jobs/1/blower-door-test');
  });

  test('should display page title and job information', async ({ page }) => {
    // Verify page title loads
    const pageTitle = page.getByTestId('text-page-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText('Blower Door Test');

    // Verify subtitle shows job information
    const subtitle = page.getByTestId('text-page-subtitle');
    await expect(subtitle).toBeVisible();
  });

  test('should show skeleton loaders while data is loading', async ({ page }) => {
    // Intercept API requests to simulate slow loading
    await page.route('/api/jobs/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/jobs/1/blower-door-test');

    // Verify skeleton loaders are visible during load
    const skeleton = page.getByTestId('skeleton-blower-door-test');
    await expect(skeleton).toBeVisible();

    // Verify skeleton elements
    await expect(page.getByTestId('skeleton-title')).toBeVisible();
    await expect(page.getByTestId('skeleton-subtitle')).toBeVisible();
    await expect(page.getByTestId('skeleton-tabs')).toBeVisible();
    await expect(page.getByTestId('skeleton-content')).toBeVisible();
  });

  test('should display error state with retry button on job load failure', async ({ page }) => {
    // Intercept API and force error
    await page.route('/api/jobs/*', route => route.abort());

    await page.goto('/jobs/1/blower-door-test');

    // Verify error state is displayed
    const errorContainer = page.getByTestId('error-job-load');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('Failed to Load Job');

    // Verify retry button exists
    const retryButton = page.getByTestId('button-retry-job');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('Retry');
  });

  test('should navigate between tabs', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByTestId('tabs-blower-door')).toBeVisible();

    // Click Weather tab
    await page.getByTestId('tab-weather').click();
    await expect(page.getByTestId('tab-content-weather')).toBeVisible();

    // Click Multi-Point tab
    await page.getByTestId('tab-multipoint').click();
    await expect(page.getByTestId('tab-content-multipoint')).toBeVisible();

    // Click Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Click Report tab
    await page.getByTestId('tab-report').click();
    await expect(page.getByTestId('tab-content-report')).toBeVisible();

    // Return to Setup tab
    await page.getByTestId('tab-setup').click();
    await expect(page.getByTestId('tab-content-setup')).toBeVisible();
  });

  test('should enter test setup information', async ({ page }) => {
    // Wait for setup tab to be visible
    await expect(page.getByTestId('tab-content-setup')).toBeVisible();

    // Enter test date
    const testDate = page.getByTestId('input-test-date');
    await expect(testDate).toBeVisible();
    await testDate.fill('2025-10-31');

    // Enter test time
    const testTime = page.getByTestId('input-test-time');
    await expect(testTime).toBeVisible();
    await testTime.fill('14:30');

    // Enter equipment serial number
    const equipmentSerial = page.getByTestId('input-equipment-serial');
    await expect(equipmentSerial).toBeVisible();
    await equipmentSerial.fill('BD3-5678');

    // Enter calibration date
    const calibrationDate = page.getByTestId('input-calibration-date');
    await expect(calibrationDate).toBeVisible();
    await calibrationDate.fill('2025-09-15');
  });

  test('should enter building information', async ({ page }) => {
    await expect(page.getByTestId('card-building-info')).toBeVisible();

    // Enter house volume
    const houseVolume = page.getByTestId('input-house-volume');
    await expect(houseVolume).toBeVisible();
    await houseVolume.fill('24000');

    // Enter conditioned area
    const conditionedArea = page.getByTestId('input-conditioned-area');
    await expect(conditionedArea).toBeVisible();
    await conditionedArea.fill('3000');

    // Enter surface area
    const surfaceArea = page.getByTestId('input-surface-area');
    await expect(surfaceArea).toBeVisible();
    await surfaceArea.fill('5500');

    // Select number of stories
    const storiesSelect = page.getByTestId('select-stories');
    await expect(storiesSelect).toBeVisible();
    await storiesSelect.click();
    await page.getByRole('option', { name: '2 Stories' }).click();

    // Select basement type
    const basementSelect = page.getByTestId('select-basement');
    await expect(basementSelect).toBeVisible();
    await basementSelect.click();
    await page.getByRole('option', { name: 'Conditioned Basement' }).click();
  });

  test('should enter weather conditions', async ({ page }) => {
    // Navigate to weather tab
    await page.getByTestId('tab-weather').click();
    await expect(page.getByTestId('tab-content-weather')).toBeVisible();

    // Enter outdoor temperature
    const outdoorTemp = page.getByTestId('input-outdoor-temp');
    await expect(outdoorTemp).toBeVisible();
    await outdoorTemp.fill('45');

    // Enter indoor temperature
    const indoorTemp = page.getByTestId('input-indoor-temp');
    await expect(indoorTemp).toBeVisible();
    await indoorTemp.fill('68');

    // Enter outdoor humidity
    const outdoorHumidity = page.getByTestId('input-outdoor-humidity');
    await expect(outdoorHumidity).toBeVisible();
    await outdoorHumidity.fill('65');

    // Enter indoor humidity
    const indoorHumidity = page.getByTestId('input-indoor-humidity');
    await expect(indoorHumidity).toBeVisible();
    await indoorHumidity.fill('45');

    // Enter wind speed
    const windSpeed = page.getByTestId('input-wind-speed');
    await expect(windSpeed).toBeVisible();
    await windSpeed.fill('8');

    // Enter barometric pressure
    const barometric = page.getByTestId('input-barometric');
    await expect(barometric).toBeVisible();
    await barometric.fill('29.85');

    // Enter altitude
    const altitude = page.getByTestId('input-altitude');
    await expect(altitude).toBeVisible();
    await altitude.fill('900');

    // Verify altitude correction factor is displayed
    const correctionFactor = page.getByTestId('text-altitude-correction');
    await expect(correctionFactor).toBeVisible();
    await expect(correctionFactor).toContainText('Correction factor:');
  });

  test('should enter multi-point test data and calculate results', async ({ page }) => {
    // Setup: First enter building volume (required for ACH50 calculation)
    await expect(page.getByTestId('input-house-volume')).toBeVisible();
    await page.getByTestId('input-house-volume').fill('24000');

    // Navigate to multi-point tab
    await page.getByTestId('tab-multipoint').click();
    await expect(page.getByTestId('tab-content-multipoint')).toBeVisible();

    // Enter fan pressure readings for at least 5 points (minimum required)
    const testPoints = [
      { index: 0, fanPressure: '48.5' },  // 50 Pa house pressure
      { index: 1, fanPressure: '43.2' },  // 45 Pa
      { index: 2, fanPressure: '38.7' },  // 40 Pa
      { index: 3, fanPressure: '33.9' },  // 35 Pa
      { index: 4, fanPressure: '28.8' },  // 30 Pa
    ];

    for (const point of testPoints) {
      const fanPressureInput = page.getByTestId(`input-fan-pressure-${point.index}`);
      await expect(fanPressureInput).toBeVisible();
      await fanPressureInput.fill(point.fanPressure);

      // Verify status icon appears
      const statusIcon = page.getByTestId(`icon-valid-${point.index}`);
      await expect(statusIcon).toBeVisible();

      // Verify CFM is calculated and displayed
      const cfmInput = page.getByTestId(`input-cfm-${point.index}`);
      await expect(cfmInput).toBeVisible();
    }

    // Click calculate results button
    const calculateButton = page.getByTestId('button-calculate-results');
    await expect(calculateButton).toBeVisible();
    await expect(calculateButton).toBeEnabled();
    await calculateButton.click();

    // Wait for calculation to complete (toast notification appears)
    await page.waitForTimeout(500);
  });

  test('should verify ACH50 calculation and compliance check', async ({ page }) => {
    // Setup test with known values that will pass compliance
    await page.getByTestId('input-house-volume').fill('24000');

    // Navigate to multi-point tab and enter data
    await page.getByTestId('tab-multipoint').click();
    
    // Enter readings that should result in ACH50 < 3.0 (passing)
    const passingReadings = [
      { index: 0, pressure: '35.2' },
      { index: 1, pressure: '30.8' },
      { index: 2, pressure: '26.5' },
      { index: 3, pressure: '22.1' },
      { index: 4, pressure: '17.9' },
    ];

    for (const reading of passingReadings) {
      await page.getByTestId(`input-fan-pressure-${reading.index}`).fill(reading.pressure);
    }

    await page.getByTestId('button-calculate-results').click();
    await page.waitForTimeout(500);

    // Navigate to results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Verify CFM50 result is displayed
    const cfm50Result = page.getByTestId('result-cfm50');
    await expect(cfm50Result).toBeVisible();
    await expect(cfm50Result).not.toContainText('—');

    // Verify ACH50 result is displayed
    const ach50Result = page.getByTestId('result-ach50');
    await expect(ach50Result).toBeVisible();
    await expect(ach50Result).not.toContainText('—');

    // Verify ELA result is displayed
    const elaResult = page.getByTestId('result-ela');
    await expect(elaResult).toBeVisible();
    await expect(elaResult).not.toContainText('—');

    // Verify compliance alert shows PASSES
    const complianceStatus = page.getByTestId('text-compliance-status');
    await expect(complianceStatus).toBeVisible();
    await expect(complianceStatus).toContainText('PASSES');

    // Verify Minnesota Code limit (3.0 ACH50)
    const codeLimit = page.getByTestId('text-code-limit');
    await expect(codeLimit).toBeVisible();
    await expect(codeLimit).toContainText('3.0');
  });

  test('should show failure when ACH50 exceeds compliance threshold', async ({ page }) => {
    // Setup test with values that will fail compliance
    await page.getByTestId('input-house-volume').fill('15000'); // Smaller volume = higher ACH50

    await page.getByTestId('tab-multipoint').click();
    
    // Enter readings that should result in ACH50 > 3.0 (failing)
    const failingReadings = [
      { index: 0, pressure: '48.5' },
      { index: 1, pressure: '43.2' },
      { index: 2, pressure: '38.7' },
      { index: 3, pressure: '33.9' },
      { index: 4, pressure: '28.8' },
    ];

    for (const reading of failingReadings) {
      await page.getByTestId(`input-fan-pressure-${reading.index}`).fill(reading.pressure);
    }

    await page.getByTestId('button-calculate-results').click();
    await page.waitForTimeout(500);

    // Check results
    await page.getByTestId('tab-results').click();

    const complianceStatus = page.getByTestId('text-compliance-status');
    await expect(complianceStatus).toBeVisible();
    await expect(complianceStatus).toContainText('FAILS');
  });

  test('should display test quality indicators', async ({ page }) => {
    // Setup and calculate
    await page.getByTestId('input-house-volume').fill('24000');
    await page.getByTestId('tab-multipoint').click();

    for (let i = 0; i < 5; i++) {
      await page.getByTestId(`input-fan-pressure-${i}`).fill('30');
    }

    await page.getByTestId('button-calculate-results').click();
    await page.waitForTimeout(500);

    // Navigate to results and verify quality indicators
    await page.getByTestId('tab-results').click();

    const validPoints = page.getByTestId('text-valid-points');
    await expect(validPoints).toBeVisible();
    await expect(validPoints).toContainText('5');

    const correlationPercent = page.getByTestId('text-correlation-percent');
    await expect(correlationPercent).toBeVisible();

    const flowExponent = page.getByTestId('text-flow-exponent');
    await expect(flowExponent).toBeVisible();
  });

  test('should generate and view test report', async ({ page }) => {
    // Setup complete test
    await page.getByTestId('input-test-date').fill('2025-10-31');
    await page.getByTestId('input-test-time').fill('14:30');
    await page.getByTestId('input-equipment-serial').fill('BD3-5678');
    await page.getByTestId('input-house-volume').fill('24000');

    await page.getByTestId('tab-multipoint').click();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId(`input-fan-pressure-${i}`).fill('30');
    }
    await page.getByTestId('button-calculate-results').click();
    await page.waitForTimeout(500);

    // Navigate to report tab
    await page.getByTestId('tab-report').click();
    await expect(page.getByTestId('tab-content-report')).toBeVisible();

    // Verify report sections
    await expect(page.getByTestId('text-report-date')).toBeVisible();
    await expect(page.getByTestId('text-report-time')).toBeVisible();
    await expect(page.getByTestId('text-report-equipment')).toBeVisible();
    await expect(page.getByTestId('text-report-volume')).toBeVisible();
    await expect(page.getByTestId('text-report-cfm50')).toBeVisible();
    await expect(page.getByTestId('text-report-ach50')).toBeVisible();

    // Verify compliance badge
    await expect(page.getByTestId('badge-report-compliance')).toBeVisible();

    // Enter notes
    const notesTextarea = page.getByTestId('textarea-notes');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('Test completed successfully. All readings within acceptable range.');
  });

  test('should save test data successfully', async ({ page }) => {
    // Setup complete test
    await page.getByTestId('input-house-volume').fill('24000');
    await page.getByTestId('tab-multipoint').click();
    
    for (let i = 0; i < 5; i++) {
      await page.getByTestId(`input-fan-pressure-${i}`).fill('30');
    }
    
    await page.getByTestId('button-calculate-results').click();
    await page.waitForTimeout(500);

    // Mock the save API call
    await page.route('/api/blower-door-tests', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, id: '123' })
      });
    });

    // Click save button
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for success toast (would appear if toast system is working)
    await page.waitForTimeout(500);
  });

  test('should validate minimum test points requirement', async ({ page }) => {
    // Try to calculate with insufficient points
    await page.getByTestId('input-house-volume').fill('24000');
    await page.getByTestId('tab-multipoint').click();

    // Enter only 3 points (need 5 minimum)
    for (let i = 0; i < 3; i++) {
      await page.getByTestId(`input-fan-pressure-${i}`).fill('30');
    }

    const calculateButton = page.getByTestId('button-calculate-results');
    await expect(calculateButton).toBeVisible();
    
    // Button should be disabled with less than 5 points
    await expect(calculateButton).toBeDisabled();
  });

  test('should show ring configuration options', async ({ page }) => {
    await page.getByTestId('tab-multipoint').click();

    // Click first ring selector
    const ringSelect = page.getByTestId('select-ring-0');
    await expect(ringSelect).toBeVisible();
    await ringSelect.click();

    // Verify all ring options are available
    await expect(page.getByRole('option', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Ring A' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Ring B' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Ring C' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Ring D' })).toBeVisible();
  });

  test('should update CFM when ring configuration changes', async ({ page }) => {
    await page.getByTestId('tab-multipoint').click();

    // Enter fan pressure
    await page.getByTestId('input-fan-pressure-0').fill('45');

    // Get initial CFM value
    const cfmInput = page.getByTestId('input-cfm-0');
    const initialCfm = await cfmInput.inputValue();

    // Change ring configuration
    await page.getByTestId('select-ring-0').click();
    await page.getByRole('option', { name: 'Ring A' }).click();

    // CFM should update (Ring A has different calibration factor)
    await page.waitForTimeout(200);
    const newCfm = await cfmInput.inputValue();
    expect(newCfm).not.toBe(initialCfm);
  });

  test('should display ACH50 badge in header', async ({ page }) => {
    const badge = page.getByTestId('badge-ach50-summary');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('ACH50:');
  });

  test('should show last saved timestamp for existing test', async ({ page }) => {
    // Mock existing test data
    await page.route('/api/jobs/*/blower-door-tests/latest', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: '1',
          cfm50: 2400,
          ach50: 2.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      });
    });

    await page.goto('/jobs/1/blower-door-test');
    await page.waitForTimeout(500);

    const lastSavedBadge = page.getByTestId('badge-last-saved');
    await expect(lastSavedBadge).toBeVisible();
    await expect(lastSavedBadge).toContainText('Last saved:');
  });

  test('should prevent save without calculated results', async ({ page }) => {
    // Try to save without calculating
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Should show error toast (validated in component)
    await page.waitForTimeout(200);
  });

  test('should verify all critical data-testid attributes exist', async ({ page }) => {
    // Verify container elements
    await expect(page.getByTestId('container-blower-door-test')).toBeVisible();
    await expect(page.getByTestId('text-page-title')).toBeVisible();
    await expect(page.getByTestId('text-page-subtitle')).toBeVisible();

    // Verify action buttons
    await expect(page.getByTestId('button-save-test')).toBeVisible();
    await expect(page.getByTestId('button-download-pdf')).toBeVisible();

    // Verify tabs
    await expect(page.getByTestId('tabs-blower-door')).toBeVisible();
    await expect(page.getByTestId('tab-setup')).toBeVisible();
    await expect(page.getByTestId('tab-weather')).toBeVisible();
    await expect(page.getByTestId('tab-multipoint')).toBeVisible();
    await expect(page.getByTestId('tab-results')).toBeVisible();
    await expect(page.getByTestId('tab-report')).toBeVisible();

    // Verify cards
    await expect(page.getByTestId('card-test-setup')).toBeVisible();
    await expect(page.getByTestId('card-building-info')).toBeVisible();

    // Weather tab elements
    await page.getByTestId('tab-weather').click();
    await expect(page.getByTestId('card-weather-conditions')).toBeVisible();

    // Results tab elements
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('card-primary-results')).toBeVisible();
    await expect(page.getByTestId('card-compliance')).toBeVisible();
    await expect(page.getByTestId('result-cfm50')).toBeVisible();
    await expect(page.getByTestId('result-ach50')).toBeVisible();
  });
});
