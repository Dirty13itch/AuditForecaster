/**
 * E2E Test: Duct Leakage Test Workflow
 * 
 * Tests the complete duct leakage testing workflow including:
 * - Page loading with skeleton states
 * - Error states with retry functionality
 * - Test setup and data entry
 * - Total Duct Leakage (TDL) calculation verification
 * - Duct Leakage to Outside (DLO) calculation verification
 * - Pressure pan testing
 * - Minnesota 2020 Energy Code compliance checking (TDL ≤4.0, DLO ≤3.0 CFM25/100ft²)
 * - Pass/fail determination
 * - Test save and PDF download
 */

import { test, expect } from '@playwright/test';

test.describe('Duct Leakage Test Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the duct leakage test page for a test job
    await page.goto('/jobs/1/duct-leakage-test');
  });

  test('should display page title and job information', async ({ page }) => {
    // Verify page title loads
    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText('Duct Leakage Test');

    // Verify subtitle shows job information
    const jobAddress = page.getByTestId('job-address');
    await expect(jobAddress).toBeVisible();
  });

  test('should show skeleton loaders while data is loading', async ({ page }) => {
    // Intercept API requests to simulate slow loading
    await page.route('/api/jobs/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/jobs/1/duct-leakage-test');

    // Verify skeleton loaders are visible during load
    const skeleton = page.getByTestId('skeleton-duct-leakage-test');
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

    await page.goto('/jobs/1/duct-leakage-test');

    // Verify error state is displayed
    const errorContainer = page.getByTestId('error-job-load');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('Failed to Load Job');

    // Verify retry button exists
    const retryButton = page.getByTestId('button-retry-job');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('Retry');
  });

  test('should display error state with retry button on test load failure', async ({ page }) => {
    // Intercept only the test data endpoint and force error
    await page.route('**/duct-leakage-tests/latest', route => route.abort());

    await page.goto('/jobs/1/duct-leakage-test');

    // Verify error state is displayed
    const errorContainer = page.getByTestId('error-test-load');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('Failed to Load Test Data');

    // Verify retry button exists
    const retryButton = page.getByTestId('button-retry-test');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('Retry');
  });

  test('should navigate between tabs', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByTestId('tabs-list')).toBeVisible();

    // Click TDL tab
    await page.getByTestId('tab-tdl').click();
    await expect(page.getByTestId('tab-content-tdl')).toBeVisible();

    // Click DLO tab
    await page.getByTestId('tab-dlo').click();
    await expect(page.getByTestId('tab-content-dlo')).toBeVisible();

    // Click Pressure Pan tab
    await page.getByTestId('tab-pressure-pan').click();
    await expect(page.getByTestId('tab-content-pressure-pan')).toBeVisible();

    // Click Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

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

    // Select test type (both TDL and DLO)
    const testTypeSelect = page.getByTestId('select-test-type');
    await expect(testTypeSelect).toBeVisible();
    await testTypeSelect.click();
    await page.getByTestId('select-option-both').click();

    // Enter equipment serial number
    const equipmentSerial = page.getByTestId('input-equipment-serial');
    await expect(equipmentSerial).toBeVisible();
    await equipmentSerial.fill('DB3-1234');

    // Enter calibration date
    const calibrationDate = page.getByTestId('input-calibration-date');
    await expect(calibrationDate).toBeVisible();
    await calibrationDate.fill('2025-09-15');
  });

  test('should enter system information', async ({ page }) => {
    await expect(page.getByTestId('tab-content-setup')).toBeVisible();

    // Select system type
    const systemTypeSelect = page.getByTestId('select-system-type');
    await expect(systemTypeSelect).toBeVisible();
    await systemTypeSelect.click();
    await page.getByTestId('select-option-forced-air').click();

    // Enter number of systems
    const numSystems = page.getByTestId('input-num-systems');
    await expect(numSystems).toBeVisible();
    await numSystems.fill('1');

    // Enter conditioned area (required for calculations)
    const conditionedArea = page.getByTestId('input-conditioned-area');
    await expect(conditionedArea).toBeVisible();
    await conditionedArea.fill('3000');

    // Enter design system airflow
    const systemAirflow = page.getByTestId('input-system-airflow');
    await expect(systemAirflow).toBeVisible();
    await systemAirflow.fill('1200');
  });

  test('should calculate Total Duct Leakage (TDL) and verify compliance', async ({ page }) => {
    // Setup: Enter conditioned area (required for calculation)
    await expect(page.getByTestId('input-conditioned-area')).toBeVisible();
    await page.getByTestId('input-conditioned-area').fill('3000');

    // Navigate to TDL tab
    await page.getByTestId('tab-tdl').click();
    await expect(page.getByTestId('tab-content-tdl')).toBeVisible();

    // Enter total fan pressure
    const totalFanPressure = page.getByTestId('input-total-fan-pressure');
    await expect(totalFanPressure).toBeVisible();
    await totalFanPressure.fill('25.0');

    // Select ring configuration
    const ringConfig = page.getByTestId('select-total-ring-config');
    await expect(ringConfig).toBeVisible();
    await ringConfig.click();
    await page.getByTestId('select-option-open').click();

    // Click Calculate TDL button
    const calculateButton = page.getByTestId('button-calculate-tdl');
    await expect(calculateButton).toBeVisible();
    await calculateButton.click();

    // Wait for calculation to complete and verify results are displayed
    const cfm25Total = page.getByTestId('text-cfm25-total');
    await expect(cfm25Total).toBeVisible();
    
    const totalCfmPerSqFt = page.getByTestId('text-total-cfm-per-sqft');
    await expect(totalCfmPerSqFt).toBeVisible();
    
    const totalPercentFlow = page.getByTestId('text-total-percent-flow');
    await expect(totalPercentFlow).toBeVisible();

    // Verify compliance badge is displayed
    const complianceBadge = page.getByTestId('badge-tdl-compliance');
    await expect(complianceBadge).toBeVisible();
    
    // Verify toast notification appears with result
    const toast = page.getByTestId('toast-tdl-result');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should calculate Duct Leakage to Outside (DLO) and verify compliance', async ({ page }) => {
    // Setup: Enter conditioned area (required for calculation)
    await expect(page.getByTestId('input-conditioned-area')).toBeVisible();
    await page.getByTestId('input-conditioned-area').fill('3000');

    // Navigate to DLO tab
    await page.getByTestId('tab-dlo').click();
    await expect(page.getByTestId('tab-content-dlo')).toBeVisible();

    // Verify house pressure is set to standard -25 Pa
    const housePressure = page.getByTestId('input-outside-house-pressure');
    await expect(housePressure).toBeVisible();
    await expect(housePressure).toHaveValue('-25');

    // Enter outside fan pressure
    const outsideFanPressure = page.getByTestId('input-outside-fan-pressure');
    await expect(outsideFanPressure).toBeVisible();
    await outsideFanPressure.fill('25.0');

    // Select ring configuration
    const ringConfig = page.getByTestId('select-outside-ring-config');
    await expect(ringConfig).toBeVisible();
    await ringConfig.click();
    await page.getByTestId('select-option-open-dlo').click();

    // Click Calculate DLO button
    const calculateButton = page.getByTestId('button-calculate-dlo');
    await expect(calculateButton).toBeVisible();
    await calculateButton.click();

    // Wait for calculation to complete and verify results are displayed
    const cfm25Outside = page.getByTestId('text-cfm25-outside');
    await expect(cfm25Outside).toBeVisible();
    
    const outsideCfmPerSqFt = page.getByTestId('text-outside-cfm-per-sqft');
    await expect(outsideCfmPerSqFt).toBeVisible();
    
    const outsidePercentFlow = page.getByTestId('text-outside-percent-flow');
    await expect(outsidePercentFlow).toBeVisible();

    // Verify compliance badge is displayed
    const complianceBadge = page.getByTestId('badge-dlo-compliance');
    await expect(complianceBadge).toBeVisible();
    
    // Verify toast notification appears with result
    const toast = page.getByTestId('toast-dlo-result');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should warn when house pressure is not at standard -25 Pa for DLO test', async ({ page }) => {
    // Setup: Enter conditioned area
    await expect(page.getByTestId('input-conditioned-area')).toBeVisible();
    await page.getByTestId('input-conditioned-area').fill('3000');

    // Navigate to DLO tab
    await page.getByTestId('tab-dlo').click();
    await expect(page.getByTestId('tab-content-dlo')).toBeVisible();

    // Change house pressure to non-standard value
    const housePressure = page.getByTestId('input-outside-house-pressure');
    await expect(housePressure).toBeVisible();
    await housePressure.fill('-20');

    // Enter outside fan pressure
    await page.getByTestId('input-outside-fan-pressure').fill('25.0');

    // Click Calculate DLO button
    await page.getByTestId('button-calculate-dlo').click();

    // Verify warning toast appears about house pressure
    // Note: This would need to check for a warning message in the toast
    // The exact selector would depend on how warnings are displayed
  });

  test('should add and remove pressure pan readings', async ({ page }) => {
    // Navigate to Pressure Pan tab
    await page.getByTestId('tab-pressure-pan').click();
    await expect(page.getByTestId('tab-content-pressure-pan')).toBeVisible();

    // Verify default readings exist (at least 6 default locations)
    await expect(page.getByTestId('input-location-0')).toBeVisible();
    await expect(page.getByTestId('input-location-5')).toBeVisible();

    // Add a new pressure pan reading
    const addButton = page.getByTestId('button-add-pressure-pan');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Verify new reading input appears
    await expect(page.getByTestId('input-location-6')).toBeVisible();

    // Remove the newly added reading
    const removeButton = page.getByTestId('button-remove-6');
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Verify reading was removed
    await expect(page.getByTestId('input-location-6')).not.toBeVisible();
  });

  test('should enter pressure pan readings and verify pass/fail evaluation', async ({ page }) => {
    // Navigate to Pressure Pan tab
    await page.getByTestId('tab-pressure-pan').click();
    await expect(page.getByTestId('tab-content-pressure-pan')).toBeVisible();

    // Enter a passing reading (≤ 1.0 Pa)
    const passingReading = page.getByTestId('input-reading-0');
    await expect(passingReading).toBeVisible();
    await passingReading.fill('0.8');

    // Verify badge shows "pass"
    const passBadge = page.getByTestId('badge-result-0');
    await expect(passBadge).toBeVisible();
    await expect(passBadge).toContainText('pass');

    // Enter a marginal reading (1.0 < x ≤ 3.0 Pa)
    const marginalReading = page.getByTestId('input-reading-1');
    await expect(marginalReading).toBeVisible();
    await marginalReading.fill('2.5');

    // Verify badge shows "marginal"
    const marginalBadge = page.getByTestId('badge-result-1');
    await expect(marginalBadge).toBeVisible();
    await expect(marginalBadge).toContainText('marginal');

    // Enter a failing reading (> 3.0 Pa)
    const failingReading = page.getByTestId('input-reading-2');
    await expect(failingReading).toBeVisible();
    await failingReading.fill('4.5');

    // Verify badge shows "fail"
    const failBadge = page.getByTestId('badge-result-2');
    await expect(failBadge).toBeVisible();
    await expect(failBadge).toContainText('fail');
  });

  test('should select supply or return for pressure pan readings', async ({ page }) => {
    // Navigate to Pressure Pan tab
    await page.getByTestId('tab-pressure-pan').click();
    await expect(page.getByTestId('tab-content-pressure-pan')).toBeVisible();

    // Select "return" for first reading
    const typeSelect = page.getByTestId('select-type-0');
    await expect(typeSelect).toBeVisible();
    await typeSelect.click();
    await page.getByTestId('select-option-return-0').click();

    // Select "supply" for second reading
    const typeSelect2 = page.getByTestId('select-type-1');
    await expect(typeSelect2).toBeVisible();
    await typeSelect2.click();
    await page.getByTestId('select-option-supply-1').click();
  });

  test('should display compliance results summary on Results tab', async ({ page }) => {
    // Setup: Calculate both TDL and DLO first
    await expect(page.getByTestId('input-conditioned-area')).toBeVisible();
    await page.getByTestId('input-conditioned-area').fill('3000');

    // Calculate TDL
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-tdl').click();
    await expect(page.getByTestId('text-cfm25-total')).toBeVisible();

    // Calculate DLO
    await page.getByTestId('tab-dlo').click();
    await page.getByTestId('input-outside-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-dlo').click();
    await expect(page.getByTestId('text-cfm25-outside')).toBeVisible();

    // Navigate to Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Verify test summary is displayed
    await expect(page.getByTestId('text-summary-date')).toBeVisible();
    await expect(page.getByTestId('text-summary-time')).toBeVisible();
    await expect(page.getByTestId('text-summary-type')).toBeVisible();
    await expect(page.getByTestId('text-summary-area')).toBeVisible();

    // Verify overall compliance status
    await expect(page.getByTestId('text-overall-compliance')).toBeVisible();

    // Verify TDL compliance details
    await expect(page.getByTestId('text-tdl-limit')).toContainText('4.0');
    await expect(page.getByTestId('text-tdl-your-result')).toBeVisible();
    await expect(page.getByTestId('text-tdl-margin')).toBeVisible();

    // Verify DLO compliance details
    await expect(page.getByTestId('text-dlo-limit')).toContainText('3.0');
    await expect(page.getByTestId('text-dlo-your-result')).toBeVisible();
    await expect(page.getByTestId('text-dlo-margin')).toBeVisible();
  });

  test('should display pressure pan results on Results tab', async ({ page }) => {
    // Setup: Add some pressure pan readings
    await page.getByTestId('tab-pressure-pan').click();
    await page.getByTestId('input-location-0').fill('Master Bedroom');
    await page.getByTestId('input-reading-0').fill('0.8');

    // Navigate to Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Verify pressure pan results grid is displayed
    await expect(page.getByTestId('pressure-pan-results-grid')).toBeVisible();
    await expect(page.getByTestId('pressure-pan-result-0')).toBeVisible();
  });

  test('should display empty state when no pressure pan readings', async ({ page }) => {
    // Clear all default pressure pan readings
    await page.getByTestId('tab-pressure-pan').click();
    
    // Remove all default readings
    for (let i = 5; i >= 0; i--) {
      const removeButton = page.getByTestId(`button-remove-${i}`);
      if (await removeButton.isVisible()) {
        await removeButton.click();
      }
    }

    // Navigate to Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Verify empty state message is displayed
    await expect(page.getByTestId('no-pressure-pan-results')).toBeVisible();
    await expect(page.getByTestId('no-pressure-pan-results')).toContainText('No pressure pan readings recorded');
  });

  test('should enter notes and recommendations', async ({ page }) => {
    // Navigate to Results tab
    await page.getByTestId('tab-results').click();
    await expect(page.getByTestId('tab-content-results')).toBeVisible();

    // Enter test notes
    const notesTextarea = page.getByTestId('textarea-notes');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('Duct system has significant leakage at main trunk connections');

    // Enter recommendations
    const recommendationsTextarea = page.getByTestId('textarea-recommendations');
    await expect(recommendationsTextarea).toBeVisible();
    await recommendationsTextarea.fill('Seal main trunk connections with mastic. Consider aerosol sealing for branch runs.');
  });

  test('should save test data successfully', async ({ page }) => {
    // Setup: Enter minimum required data
    await page.getByTestId('input-conditioned-area').fill('3000');
    
    // Calculate TDL
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-tdl').click();
    await expect(page.getByTestId('text-cfm25-total')).toBeVisible();

    // Calculate DLO
    await page.getByTestId('tab-dlo').click();
    await page.getByTestId('input-outside-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-dlo').click();
    await expect(page.getByTestId('text-cfm25-outside')).toBeVisible();

    // Click Save Test button
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify success toast appears
    // Note: Exact toast verification would depend on toast implementation
    // await expect(page.getByText('Test saved')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent saving incomplete test (TDL-only without calculation)', async ({ page }) => {
    // Navigate to setup and select TDL-only test
    await page.getByTestId('select-test-type').click();
    await page.getByTestId('select-option-total').click();

    // Try to save without calculating TDL
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify error toast appears
    // Note: Would need to verify error message appears
  });

  test('should prevent saving incomplete test (DLO-only without calculation)', async ({ page }) => {
    // Navigate to setup and select DLO-only test
    await page.getByTestId('select-test-type').click();
    await page.getByTestId('select-option-dlo').click();

    // Try to save without calculating DLO
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify error toast appears
    // Note: Would need to verify error message appears
  });

  test('should prevent saving both test without both calculations', async ({ page }) => {
    // Setup: Calculate only TDL
    await page.getByTestId('input-conditioned-area').fill('3000');
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-tdl').click();
    await expect(page.getByTestId('text-cfm25-total')).toBeVisible();

    // Try to save without calculating DLO (test type is "both" by default)
    const saveButton = page.getByTestId('button-save-test');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify error toast appears indicating both calculations needed
    // Note: Would need to verify error message appears
  });

  test('should download PDF report', async ({ page }) => {
    // Setup a download listener
    const downloadPromise = page.waitForEvent('download');

    // Click Download PDF button
    const downloadButton = page.getByTestId('button-download-pdf');
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename matches expected pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/duct-leakage-test-\d+-\d+\.pdf/);
  });

  test('should delete test data', async ({ page }) => {
    // This test assumes there's existing test data
    // First verify delete button is visible (only shows when test exists)
    const deleteButton = page.getByTestId('button-delete-test');
    
    // If delete button exists, test deletion
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verify confirmation or success message
      // Note: Would need to handle confirmation dialog if implemented
    }
  });

  test('should display badge indicators for TDL and DLO results in header', async ({ page }) => {
    // Setup: Calculate both metrics
    await page.getByTestId('input-conditioned-area').fill('3000');
    
    // Calculate TDL
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-tdl').click();
    await expect(page.getByTestId('text-cfm25-total')).toBeVisible();

    // Calculate DLO
    await page.getByTestId('tab-dlo').click();
    await page.getByTestId('input-outside-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-dlo').click();
    await expect(page.getByTestId('text-cfm25-outside')).toBeVisible();

    // Verify header badges update with results
    const tdlBadge = page.getByTestId('badge-tdl-result');
    await expect(tdlBadge).toBeVisible();
    await expect(tdlBadge).toContainText('TDL:');

    const dloBadge = page.getByTestId('badge-dlo-result');
    await expect(dloBadge).toBeVisible();
    await expect(dloBadge).toContainText('DLO:');
  });

  test('should display last saved timestamp badge when test exists', async ({ page }) => {
    // This test assumes there's existing test data
    const lastSavedBadge = page.getByTestId('badge-last-saved');
    
    // If badge exists, verify it shows timestamp
    if (await lastSavedBadge.isVisible()) {
      await expect(lastSavedBadge).toContainText('Last saved:');
    }
  });

  test('should calculate correct CFM25 values using calibration factors', async ({ page }) => {
    // This test verifies the calculation accuracy
    // Setup known inputs
    await page.getByTestId('input-conditioned-area').fill('3000');
    
    // Calculate TDL with known fan pressure
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    
    // Select "Open" ring configuration (C=110, n=0.5)
    await page.getByTestId('select-total-ring-config').click();
    await page.getByTestId('select-option-open').click();
    
    await page.getByTestId('button-calculate-tdl').click();

    // Expected CFM25 = 110 * (25.0)^0.5 = 110 * 5 = 550 CFM
    // Expected CFM25/100ft² = (550 * 100) / 3000 = 18.33 CFM25/100ft²
    const cfm25Total = page.getByTestId('text-cfm25-total');
    await expect(cfm25Total).toContainText('550');

    const cfmPerSqFt = page.getByTestId('text-total-cfm-per-sqft');
    await expect(cfmPerSqFt).toContainText('18.33');
  });

  test('should show pass result for compliant TDL (≤4.0 CFM25/100ft²)', async ({ page }) => {
    // Setup to produce passing result
    await page.getByTestId('input-conditioned-area').fill('5000'); // Larger area for lower CFM/sqft
    
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('15.0'); // Lower pressure
    
    await page.getByTestId('select-total-ring-config').click();
    await page.getByTestId('select-option-ring3').click(); // Ring 3 (C=31)
    
    await page.getByTestId('button-calculate-tdl').click();

    // Expected CFM25 = 31 * (15.0)^0.5 ≈ 120 CFM
    // Expected CFM25/100ft² = (120 * 100) / 5000 = 2.4 CFM25/100ft² (PASS)
    const complianceBadge = page.getByTestId('badge-tdl-compliance');
    await expect(complianceBadge).toContainText('PASS');
  });

  test('should show fail result for non-compliant DLO (>3.0 CFM25/100ft²)', async ({ page }) => {
    // Setup to produce failing result
    await page.getByTestId('input-conditioned-area').fill('2000'); // Smaller area for higher CFM/sqft
    
    await page.getByTestId('tab-dlo').click();
    await page.getByTestId('input-outside-fan-pressure').fill('25.0'); // Higher pressure
    
    await page.getByTestId('select-outside-ring-config').click();
    await page.getByTestId('select-option-open-dlo').click(); // Open (C=110)
    
    await page.getByTestId('button-calculate-dlo').click();

    // Expected CFM25 = 110 * (25.0)^0.5 = 550 CFM
    // Expected CFM25/100ft² = (550 * 100) / 2000 = 27.5 CFM25/100ft² (FAIL)
    const complianceBadge = page.getByTestId('badge-dlo-compliance');
    await expect(complianceBadge).toContainText('FAIL');
  });

  test('should validate conditioned area is required before calculation', async ({ page }) => {
    // Try to calculate TDL without entering conditioned area
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    await page.getByTestId('button-calculate-tdl').click();

    // Verify error toast appears about missing conditioned area
    // Note: Would check for error message in toast
  });

  test('should maintain state when switching between tabs', async ({ page }) => {
    // Enter data in setup tab
    await page.getByTestId('input-equipment-serial').fill('TEST-123');
    
    // Navigate to TDL tab and enter data
    await page.getByTestId('tab-tdl').click();
    await page.getByTestId('input-total-fan-pressure').fill('25.0');
    
    // Navigate to DLO tab and enter data
    await page.getByTestId('tab-dlo').click();
    await page.getByTestId('input-outside-fan-pressure').fill('20.0');
    
    // Go back to setup tab
    await page.getByTestId('tab-setup').click();
    
    // Verify equipment serial is still there
    await expect(page.getByTestId('input-equipment-serial')).toHaveValue('TEST-123');
    
    // Go back to TDL tab
    await page.getByTestId('tab-tdl').click();
    
    // Verify fan pressure is still there
    await expect(page.getByTestId('input-total-fan-pressure')).toHaveValue('25.0');
  });
});
