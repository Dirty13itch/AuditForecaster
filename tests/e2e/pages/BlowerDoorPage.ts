import { Page, Locator, expect } from '@playwright/test';

/**
 * BlowerDoorPage - Page object for Blower Door testing workflow
 * 
 * Handles blower door test data entry, calculations, and compliance verification
 * for Minnesota 2020 Energy Code (ACH50 ≤ 3.0 requirement)
 */
export class BlowerDoorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the Blower Door test page for a specific job
   * @param jobId - The job ID to test
   */
  async goto(jobId: string) {
    await this.page.goto(`/blower-door-test/${jobId}`);
    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to a specific tab
   * @param tab - Tab name: 'setup', 'weather', 'multipoint', 'results', or 'report'
   */
  async switchToTab(tab: 'setup' | 'weather' | 'multipoint' | 'results' | 'report') {
    await this.page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
    // Wait a moment for tab content to render
    await this.page.waitForTimeout(300);
  }

  /**
   * Enter building data in the Setup tab
   * @param data - Building information
   */
  async enterBuildingData(data: {
    volume: number;
    conditionedArea?: number;
    surfaceArea?: number;
    stories?: number;
    basementType?: 'none' | 'unconditioned' | 'conditioned';
  }) {
    // Ensure we're on the setup tab
    await this.switchToTab('setup');

    // Enter house volume (required for ACH50 calculation)
    await this.page.getByTestId('input-house-volume').clear();
    await this.page.getByTestId('input-house-volume').fill(data.volume.toString());

    // Enter optional fields if provided
    if (data.conditionedArea !== undefined) {
      await this.page.getByTestId('input-conditioned-area').clear();
      await this.page.getByTestId('input-conditioned-area').fill(data.conditionedArea.toString());
    }

    if (data.surfaceArea !== undefined) {
      await this.page.getByTestId('input-surface-area').clear();
      await this.page.getByTestId('input-surface-area').fill(data.surfaceArea.toString());
    }

    if (data.stories !== undefined) {
      await this.page.getByTestId('select-stories').click();
      await this.page.getByRole('option', { name: `${data.stories}` }).click();
    }

    if (data.basementType) {
      await this.page.getByTestId('select-basement').click();
      await this.page.getByRole('option', { name: new RegExp(data.basementType, 'i') }).click();
    }
  }

  /**
   * Enter equipment information in the Setup tab
   * @param serial - Equipment serial number
   * @param calibrationDate - Optional calibration date (YYYY-MM-DD format)
   */
  async enterEquipmentInfo(serial: string, calibrationDate?: string) {
    await this.switchToTab('setup');
    
    await this.page.getByTestId('input-equipment-serial').clear();
    await this.page.getByTestId('input-equipment-serial').fill(serial);

    if (calibrationDate) {
      await this.page.getByTestId('input-calibration-date').fill(calibrationDate);
    }
  }

  /**
   * Enter weather conditions in the Weather tab
   * @param conditions - Weather data for corrections
   */
  async enterWeatherConditions(conditions: {
    outdoorTemp?: number;
    indoorTemp?: number;
    outdoorHumidity?: number;
    indoorHumidity?: number;
    windSpeed?: number;
    barometricPressure?: number;
    altitude?: number;
  }) {
    await this.switchToTab('weather');

    if (conditions.outdoorTemp !== undefined) {
      await this.page.getByTestId('input-outdoor-temp').clear();
      await this.page.getByTestId('input-outdoor-temp').fill(conditions.outdoorTemp.toString());
    }

    if (conditions.indoorTemp !== undefined) {
      await this.page.getByTestId('input-indoor-temp').clear();
      await this.page.getByTestId('input-indoor-temp').fill(conditions.indoorTemp.toString());
    }

    if (conditions.outdoorHumidity !== undefined) {
      await this.page.getByTestId('input-outdoor-humidity').clear();
      await this.page.getByTestId('input-outdoor-humidity').fill(conditions.outdoorHumidity.toString());
    }

    if (conditions.indoorHumidity !== undefined) {
      await this.page.getByTestId('input-indoor-humidity').clear();
      await this.page.getByTestId('input-indoor-humidity').fill(conditions.indoorHumidity.toString());
    }

    if (conditions.windSpeed !== undefined) {
      await this.page.getByTestId('input-wind-speed').clear();
      await this.page.getByTestId('input-wind-speed').fill(conditions.windSpeed.toString());
    }

    if (conditions.barometricPressure !== undefined) {
      await this.page.getByTestId('input-barometric').clear();
      await this.page.getByTestId('input-barometric').fill(conditions.barometricPressure.toString());
    }

    if (conditions.altitude !== undefined) {
      await this.page.getByTestId('input-altitude').clear();
      await this.page.getByTestId('input-altitude').fill(conditions.altitude.toString());
    }
  }

  /**
   * Enter fan pressure reading for a specific test point
   * Note: CFM is automatically calculated based on fan pressure and ring configuration
   * 
   * @param index - Test point index (0-6 for the 7 default points)
   * @param fanPressure - Fan pressure in Pascals
   * @param ringConfig - Ring configuration: 'Open', 'Ring A', 'Ring B', 'Ring C', or 'Ring D'
   */
  async enterFanPressure(index: number, fanPressure: number, ringConfig: string = 'Open') {
    await this.switchToTab('multipoint');

    // Enter fan pressure
    await this.page.getByTestId(`input-fan-pressure-${index}`).clear();
    await this.page.getByTestId(`input-fan-pressure-${index}`).fill(fanPressure.toString());

    // Select ring configuration
    await this.page.getByTestId(`select-ring-${index}`).click();
    await this.page.getByRole('option', { name: ringConfig }).click();
  }

  /**
   * Enter multiple test points at once
   * @param points - Array of test point data
   */
  async enterMultiPointData(points: Array<{
    index: number;
    fanPressure: number;
    ringConfig?: string;
  }>) {
    await this.switchToTab('multipoint');

    for (const point of points) {
      await this.enterFanPressure(point.index, point.fanPressure, point.ringConfig || 'Open');
    }
  }

  /**
   * Click the "Calculate Results" button to perform multi-point regression
   * This calculates CFM50, ACH50, ELA, and compliance status
   */
  async calculateResults() {
    await this.switchToTab('multipoint');
    
    // Find and click the Calculate Results button
    await this.page.getByTestId('button-calculate-results').click();
    
    // Wait for calculation to complete (toast should appear)
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the calculated ACH50 value from the results
   * @returns ACH50 value as a number
   */
  async getACH50(): Promise<number> {
    await this.switchToTab('results');
    
    // Find the ACH50 display element using data-testid
    const ach50Text = await this.page.getByTestId('result-ach50').textContent();
    
    if (!ach50Text || ach50Text === '—') {
      throw new Error('ACH50 not calculated yet');
    }
    
    return parseFloat(ach50Text.trim());
  }

  /**
   * Get the calculated CFM50 value from the results
   * @returns CFM50 value as a number
   */
  async getCFM50(): Promise<number> {
    await this.switchToTab('results');
    
    // Find the CFM50 display element using data-testid
    const cfm50Text = await this.page.getByTestId('result-cfm50').textContent();
    
    if (!cfm50Text || cfm50Text === '—') {
      throw new Error('CFM50 not calculated yet');
    }
    
    return parseFloat(cfm50Text.trim());
  }

  /**
   * Get the calculated ELA value from the results
   * @returns ELA value as a number
   */
  async getELA(): Promise<number> {
    await this.switchToTab('results');
    
    // Find the ELA display element using data-testid
    const elaText = await this.page.getByTestId('result-ela').textContent();
    
    if (!elaText || elaText === '—') {
      throw new Error('ELA not calculated yet');
    }
    
    return parseFloat(elaText.trim());
  }

  /**
   * Verify compliance status (PASS or FAIL for Minnesota 2020 Code)
   * @param expectedPass - true if test should pass, false if it should fail
   */
  async verifyCompliance(expectedPass: boolean) {
    await this.switchToTab('results');
    
    // Check for PASSES or FAILS text in the compliance alert using data-testid
    const complianceStatus = await this.page.getByTestId('text-compliance-status').textContent();
    const expectedText = expectedPass ? 'PASSES' : 'FAILS';
    
    expect(complianceStatus).toContain(expectedText);
  }

  /**
   * Get the compliance margin
   * @returns Margin value (positive = under limit, negative = over limit)
   */
  async getComplianceMargin(): Promise<number> {
    await this.switchToTab('results');
    
    // Find the margin text in the compliance alert using data-testid
    const alertText = await this.page.getByTestId('text-compliance-details').textContent();
    
    if (!alertText) {
      throw new Error('Compliance margin not found');
    }
    
    // Extract the margin number (format: "Margin: +0.5" or "Margin: -0.3")
    const match = alertText.match(/Margin:\s*([+-]?\d+\.?\d*)/);
    
    if (!match) {
      throw new Error('Could not parse margin value');
    }
    
    return parseFloat(match[1]);
  }

  /**
   * Save the test data
   */
  async saveTest() {
    await this.page.getByTestId('button-save-test').click();
    
    // Wait for success toast
    await expect(this.page.getByText(/test saved/i)).toBeVisible();
  }

  /**
   * Delete the test
   */
  async deleteTest() {
    await this.page.getByTestId('button-delete-test').click();
    
    // Wait for success toast
    await expect(this.page.getByText(/test deleted/i)).toBeVisible();
  }

  /**
   * Download PDF report
   */
  async downloadPDF() {
    // Set up download listener before clicking
    const downloadPromise = this.page.waitForEvent('download');
    
    await this.page.getByTestId('button-download-pdf').click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify the download has a filename
    expect(download.suggestedFilename()).toMatch(/blower-door-test.*\.pdf/);
    
    return download;
  }

  /**
   * Enter notes in the report tab
   * @param notes - Text notes to add
   */
  async enterNotes(notes: string) {
    await this.switchToTab('report');
    
    await this.page.getByTestId('textarea-notes').clear();
    await this.page.getByTestId('textarea-notes').fill(notes);
  }

  /**
   * Verify the test results display shows expected values
   */
  async verifyResults(expected: {
    cfm50?: number;
    ach50?: number;
    passes?: boolean;
  }) {
    if (expected.cfm50 !== undefined) {
      const cfm50 = await this.getCFM50();
      expect(cfm50).toBeCloseTo(expected.cfm50, 0); // Within 1 CFM
    }

    if (expected.ach50 !== undefined) {
      const ach50 = await this.getACH50();
      expect(ach50).toBeCloseTo(expected.ach50, 1); // Within 0.1 ACH50
    }

    if (expected.passes !== undefined) {
      await this.verifyCompliance(expected.passes);
    }
  }

  /**
   * Check if delete button is visible (test exists)
   */
  async hasExistingTest(): Promise<boolean> {
    return await this.page.getByTestId('button-delete-test').isVisible();
  }

  /**
   * Verify page is loaded and ready
   */
  async verifyPageLoaded() {
    await expect(this.page.getByText(/Blower Door Test/i).first()).toBeVisible();
    await expect(this.page.getByTestId('button-save-test')).toBeVisible();
  }
}
