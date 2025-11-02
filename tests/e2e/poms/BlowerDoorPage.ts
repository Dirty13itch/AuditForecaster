/**
 * Blower Door Test Page Object Model
 * 
 * Represents the interface for conducting blower door tests to measure
 * building envelope air leakage (CFM50, ACH50).
 */

import { type Page, type Locator } from '@playwright/test';

export class BlowerDoorPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async navigate(jobId: string | number) {
    await this.page.goto(`${this.baseUrl}/blower-door-test/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get pageSubtitle(): Locator {
    return this.page.getByTestId('text-page-subtitle');
  }

  get ach50SummaryBadge(): Locator {
    return this.page.getByTestId('badge-ach50-summary');
  }

  get lastSavedBadge(): Locator {
    return this.page.getByTestId('badge-last-saved');
  }

  get saveButton(): Locator {
    return this.page.getByTestId('button-save-test');
  }

  get downloadPdfButton(): Locator {
    return this.page.getByTestId('button-download-pdf');
  }

  get deleteButton(): Locator {
    return this.page.getByTestId('button-delete-test');
  }

  // Tabs
  get tabsList(): Locator {
    return this.page.getByTestId('tabs-list');
  }

  get setupTab(): Locator {
    return this.page.getByTestId('tab-setup');
  }

  get weatherTab(): Locator {
    return this.page.getByTestId('tab-weather');
  }

  get multipointTab(): Locator {
    return this.page.getByTestId('tab-multipoint');
  }

  get resultsTab(): Locator {
    return this.page.getByTestId('tab-results');
  }

  get reportTab(): Locator {
    return this.page.getByTestId('tab-report');
  }

  // Setup tab inputs
  get testDateInput(): Locator {
    return this.page.getByTestId('input-test-date');
  }

  get testTimeInput(): Locator {
    return this.page.getByTestId('input-test-time');
  }

  get equipmentSerialInput(): Locator {
    return this.page.getByTestId('input-equipment-serial');
  }

  get calibrationDateInput(): Locator {
    return this.page.getByTestId('input-calibration-date');
  }

  get houseVolumeInput(): Locator {
    return this.page.getByTestId('input-house-volume');
  }

  get conditionedAreaInput(): Locator {
    return this.page.getByTestId('input-conditioned-area');
  }

  get surfaceAreaInput(): Locator {
    return this.page.getByTestId('input-surface-area');
  }

  get storiesSelect(): Locator {
    return this.page.getByTestId('select-stories');
  }

  get basementSelect(): Locator {
    return this.page.getByTestId('select-basement');
  }

  // Weather tab inputs
  get outdoorTempInput(): Locator {
    return this.page.getByTestId('input-outdoor-temp');
  }

  get indoorTempInput(): Locator {
    return this.page.getByTestId('input-indoor-temp');
  }

  get outdoorHumidityInput(): Locator {
    return this.page.getByTestId('input-outdoor-humidity');
  }

  get indoorHumidityInput(): Locator {
    return this.page.getByTestId('input-indoor-humidity');
  }

  get windSpeedInput(): Locator {
    return this.page.getByTestId('input-wind-speed');
  }

  get barometricInput(): Locator {
    return this.page.getByTestId('input-barometric');
  }

  get altitudeInput(): Locator {
    return this.page.getByTestId('input-altitude');
  }

  // Results tab
  get resultCorrelation(): Locator {
    return this.page.getByTestId('result-correlation');
  }

  get complianceCard(): Locator {
    return this.page.getByTestId('card-compliance');
  }

  get complianceAlert(): Locator {
    return this.page.getByTestId('alert-compliance');
  }

  get complianceStatus(): Locator {
    return this.page.getByTestId('text-compliance-status');
  }

  get complianceDetails(): Locator {
    return this.page.getByTestId('text-compliance-details');
  }

  get codeLimitText(): Locator {
    return this.page.getByTestId('text-code-limit');
  }

  get resultAch50(): Locator {
    return this.page.getByTestId('text-result-ach50');
  }

  get weatherCorrected(): Locator {
    return this.page.getByTestId('text-weather-corrected');
  }

  get altitudeFactor(): Locator {
    return this.page.getByTestId('text-altitude-factor');
  }

  // Quality indicators
  get validPointsText(): Locator {
    return this.page.getByTestId('text-valid-points');
  }

  get correlationPercent(): Locator {
    return this.page.getByTestId('text-correlation-percent');
  }

  get flowExponent(): Locator {
    return this.page.getByTestId('text-flow-exponent');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Fill in basic setup information
   */
  async fillSetupInfo(data: {
    testDate?: string;
    testTime?: string;
    equipmentSerial?: string;
    calibrationDate?: string;
    houseVolume?: number;
    conditionedArea?: number;
    surfaceArea?: number;
    stories?: string;
    basement?: string;
  }) {
    await this.setupTab.click();

    if (data.testDate) await this.testDateInput.fill(data.testDate);
    if (data.testTime) await this.testTimeInput.fill(data.testTime);
    if (data.equipmentSerial) await this.equipmentSerialInput.fill(data.equipmentSerial);
    if (data.calibrationDate) await this.calibrationDateInput.fill(data.calibrationDate);
    if (data.houseVolume) await this.houseVolumeInput.fill(data.houseVolume.toString());
    if (data.conditionedArea) await this.conditionedAreaInput.fill(data.conditionedArea.toString());
    if (data.surfaceArea) await this.surfaceAreaInput.fill(data.surfaceArea.toString());

    if (data.stories) {
      await this.storiesSelect.click();
      await this.page.getByRole('option', { name: data.stories }).click();
    }

    if (data.basement) {
      await this.basementSelect.click();
      await this.page.getByRole('option', { name: data.basement }).click();
    }
  }

  /**
   * Fill in weather conditions
   */
  async fillWeatherInfo(data: {
    outdoorTemp?: number;
    indoorTemp?: number;
    outdoorHumidity?: number;
    indoorHumidity?: number;
    windSpeed?: number;
    barometric?: number;
    altitude?: number;
  }) {
    await this.weatherTab.click();

    if (data.outdoorTemp) await this.outdoorTempInput.fill(data.outdoorTemp.toString());
    if (data.indoorTemp) await this.indoorTempInput.fill(data.indoorTemp.toString());
    if (data.outdoorHumidity) await this.outdoorHumidityInput.fill(data.outdoorHumidity.toString());
    if (data.indoorHumidity) await this.indoorHumidityInput.fill(data.indoorHumidity.toString());
    if (data.windSpeed) await this.windSpeedInput.fill(data.windSpeed.toString());
    if (data.barometric) await this.barometricInput.fill(data.barometric.toString());
    if (data.altitude) await this.altitudeInput.fill(data.altitude.toString());
  }

  /**
   * Add a single multipoint test reading
   */
  async addMultipointReading(index: number, data: {
    housePressure?: number;
    fanPressure?: number;
    ringConfig?: string;
    cfm?: number;
  }) {
    await this.multipointTab.click();

    if (data.housePressure) {
      const input = this.page.getByTestId(`input-house-pressure-${index}`);
      await input.fill(data.housePressure.toString());
    }

    if (data.fanPressure) {
      const input = this.page.getByTestId(`input-fan-pressure-${index}`);
      await input.fill(data.fanPressure.toString());
    }

    if (data.ringConfig) {
      const select = this.page.getByTestId(`select-ring-config-${index}`);
      await select.click();
      await this.page.getByRole('option', { name: data.ringConfig }).click();
    }

    if (data.cfm) {
      const input = this.page.getByTestId(`input-cfm-${index}`);
      await input.fill(data.cfm.toString());
    }
  }

  /**
   * Save the test data
   */
  async saveTest() {
    await this.saveButton.click();

    // Wait for save to complete
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/blower-door-tests') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 10000 }
    );

    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to Results tab and get compliance status
   */
  async getComplianceStatus(): Promise<'pass' | 'fail' | 'unknown'> {
    await this.resultsTab.click();
    await this.page.waitForTimeout(500);

    const statusText = await this.complianceStatus.textContent();

    if (statusText?.toLowerCase().includes('passes')) return 'pass';
    if (statusText?.toLowerCase().includes('fails')) return 'fail';

    return 'unknown';
  }

  /**
   * Get the ACH50 value from results tab
   */
  async getAch50Value(): Promise<number | null> {
    await this.resultsTab.click();
    await this.page.waitForTimeout(500);

    const text = await this.resultAch50.textContent();
    const match = text?.match(/([\d.]+)/);

    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Download PDF report
   */
  async downloadPdf(): Promise<boolean> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadPdfButton.click();

    const download = await downloadPromise;
    return download !== null;
  }
}
