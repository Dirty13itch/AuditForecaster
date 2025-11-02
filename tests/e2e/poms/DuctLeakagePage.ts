/**
 * Duct Leakage Test Page Object Model
 * 
 * Represents the interface for conducting duct leakage tests to measure
 * total duct leakage (TDL) and leakage to outside (DLO).
 */

import { type Page, type Locator } from '@playwright/test';

export class DuctLeakagePage {
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
    await this.page.goto(`${this.baseUrl}/duct-leakage-test/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('page-title');
  }

  get jobAddress(): Locator {
    return this.page.getByTestId('job-address');
  }

  get tdlResultBadge(): Locator {
    return this.page.getByTestId('badge-tdl-result');
  }

  get dloResultBadge(): Locator {
    return this.page.getByTestId('badge-dlo-result');
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
  get setupTab(): Locator {
    return this.page.getByTestId('tab-setup');
  }

  get tdlTab(): Locator {
    return this.page.getByTestId('tab-tdl');
  }

  get dloTab(): Locator {
    return this.page.getByTestId('tab-dlo');
  }

  get pressurePanTab(): Locator {
    return this.page.getByTestId('tab-pressure-pan');
  }

  get resultsTab(): Locator {
    return this.page.getByTestId('tab-results');
  }

  // Setup tab
  get testDateInput(): Locator {
    return this.page.getByTestId('input-test-date');
  }

  get testTimeInput(): Locator {
    return this.page.getByTestId('input-test-time');
  }

  get testTypeSelect(): Locator {
    return this.page.getByTestId('select-test-type');
  }

  get equipmentSerialInput(): Locator {
    return this.page.getByTestId('input-equipment-serial');
  }

  get calibrationDateInput(): Locator {
    return this.page.getByTestId('input-calibration-date');
  }

  get systemTypeSelect(): Locator {
    return this.page.getByTestId('select-system-type');
  }

  get numSystemsInput(): Locator {
    return this.page.getByTestId('input-num-systems');
  }

  get conditionedAreaInput(): Locator {
    return this.page.getByTestId('input-conditioned-area');
  }

  get systemAirflowInput(): Locator {
    return this.page.getByTestId('input-system-airflow');
  }

  // TDL tab
  get totalFanPressureInput(): Locator {
    return this.page.getByTestId('input-total-fan-pressure');
  }

  get totalRingConfigSelect(): Locator {
    return this.page.getByTestId('select-total-ring-config');
  }

  get tdlComplianceBadge(): Locator {
    return this.page.getByTestId('badge-tdl-compliance');
  }

  // DLO tab
  get outsideHousePressureInput(): Locator {
    return this.page.getByTestId('input-outside-house-pressure');
  }

  get outsideFanPressureInput(): Locator {
    return this.page.getByTestId('input-outside-fan-pressure');
  }

  get outsideRingConfigSelect(): Locator {
    return this.page.getByTestId('select-outside-ring-config');
  }

  get calculateDloButton(): Locator {
    return this.page.getByTestId('button-calculate-dlo');
  }

  get cfm25OutsideText(): Locator {
    return this.page.getByTestId('text-cfm25-outside');
  }

  get outsideCfmPerSqFtText(): Locator {
    return this.page.getByTestId('text-outside-cfm-per-sqft');
  }

  get outsidePercentFlowText(): Locator {
    return this.page.getByTestId('text-outside-percent-flow');
  }

  get dloComplianceBadge(): Locator {
    return this.page.getByTestId('badge-dlo-compliance');
  }

  // Pressure pan tab
  pressurePanLocationInput(index: number): Locator {
    return this.page.getByTestId(`input-location-${index}`);
  }

  pressurePanTypeSelect(index: number): Locator {
    return this.page.getByTestId(`select-type-${index}`);
  }

  pressurePanReadingInput(index: number): Locator {
    return this.page.getByTestId(`input-reading-${index}`);
  }

  pressurePanResultBadge(index: number): Locator {
    return this.page.getByTestId(`badge-result-${index}`);
  }

  pressurePanRemoveButton(index: number): Locator {
    return this.page.getByTestId(`button-remove-${index}`);
  }

  get addPressurePanButton(): Locator {
    return this.page.getByTestId('button-add-pressure-pan');
  }

  // Results tab
  get summaryDate(): Locator {
    return this.page.getByTestId('text-summary-date');
  }

  get summaryTime(): Locator {
    return this.page.getByTestId('text-summary-time');
  }

  get summaryType(): Locator {
    return this.page.getByTestId('text-summary-type');
  }

  get summaryArea(): Locator {
    return this.page.getByTestId('text-summary-area');
  }

  get overallComplianceTitle(): Locator {
    return this.page.getByTestId('text-overall-compliance');
  }

  get tdlLimitText(): Locator {
    return this.page.getByTestId('text-tdl-limit');
  }

  get tdlYourResultText(): Locator {
    return this.page.getByTestId('text-tdl-your-result');
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
    testType?: 'total' | 'leakage_to_outside' | 'both';
    equipmentSerial?: string;
    calibrationDate?: string;
    systemType?: 'forced_air' | 'heat_pump' | 'hydronic' | 'other';
    numSystems?: number;
    conditionedArea?: number;
    systemAirflow?: number;
  }) {
    await this.setupTab.click();

    if (data.testDate) await this.testDateInput.fill(data.testDate);
    if (data.testTime) await this.testTimeInput.fill(data.testTime);

    if (data.testType) {
      await this.testTypeSelect.click();
      const optionMap = {
        total: 'select-option-total',
        leakage_to_outside: 'select-option-dlo',
        both: 'select-option-both',
      };
      await this.page.getByTestId(optionMap[data.testType]).click();
    }

    if (data.equipmentSerial) await this.equipmentSerialInput.fill(data.equipmentSerial);
    if (data.calibrationDate) await this.calibrationDateInput.fill(data.calibrationDate);

    if (data.systemType) {
      await this.systemTypeSelect.click();
      const optionMap = {
        forced_air: 'select-option-forced-air',
        heat_pump: 'select-option-heat-pump',
        hydronic: 'select-option-hydronic',
        other: 'select-option-other',
      };
      await this.page.getByTestId(optionMap[data.systemType]).click();
    }

    if (data.numSystems) await this.numSystemsInput.fill(data.numSystems.toString());
    if (data.conditionedArea) await this.conditionedAreaInput.fill(data.conditionedArea.toString());
    if (data.systemAirflow) await this.systemAirflowInput.fill(data.systemAirflow.toString());
  }

  /**
   * Fill in Total Duct Leakage test data
   */
  async fillTdlData(data: {
    fanPressure?: number;
    ringConfig?: string;
  }) {
    await this.tdlTab.click();

    if (data.fanPressure) {
      await this.totalFanPressureInput.fill(data.fanPressure.toString());
    }

    if (data.ringConfig) {
      await this.totalRingConfigSelect.click();
      await this.page.getByRole('option', { name: data.ringConfig }).click();
    }
  }

  /**
   * Fill in Leakage to Outside test data
   */
  async fillDloData(data: {
    housePressure?: number;
    fanPressure?: number;
    ringConfig?: string;
  }) {
    await this.dloTab.click();

    if (data.housePressure) {
      await this.outsideHousePressureInput.fill(data.housePressure.toString());
    }

    if (data.fanPressure) {
      await this.outsideFanPressureInput.fill(data.fanPressure.toString());
    }

    if (data.ringConfig) {
      await this.outsideRingConfigSelect.click();
      await this.page.getByRole('option', { name: data.ringConfig }).click();
    }

    // Calculate DLO results
    await this.calculateDloButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Add a pressure pan reading
   */
  async addPressurePanReading(index: number, data: {
    location?: string;
    type?: 'supply' | 'return';
    reading?: number;
  }) {
    await this.pressurePanTab.click();

    if (data.location) {
      await this.pressurePanLocationInput(index).fill(data.location);
    }

    if (data.type) {
      await this.pressurePanTypeSelect(index).click();
      const optionId = `select-option-${data.type}-${index}`;
      await this.page.getByTestId(optionId).click();
    }

    if (data.reading) {
      await this.pressurePanReadingInput(index).fill(data.reading.toString());
    }
  }

  /**
   * Save the test data
   */
  async saveTest() {
    await this.saveButton.click();

    // Wait for save to complete
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/duct-leakage-tests') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 10000 }
    );

    await this.page.waitForTimeout(500);
  }

  /**
   * Get TDL compliance status
   */
  async getTdlComplianceStatus(): Promise<string> {
    await this.tdlTab.click();
    return await this.tdlComplianceBadge.textContent() || '';
  }

  /**
   * Get DLO compliance status
   */
  async getDloComplianceStatus(): Promise<string> {
    await this.dloTab.click();
    return await this.dloComplianceBadge.textContent() || '';
  }

  /**
   * Get CFM25 outside value
   */
  async getCfm25Outside(): Promise<number | null> {
    await this.dloTab.click();
    const text = await this.cfm25OutsideText.textContent();
    return text ? parseFloat(text) : null;
  }
}
