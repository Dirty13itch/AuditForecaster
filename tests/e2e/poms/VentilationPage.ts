/**
 * Ventilation Tests Page Object Model
 * 
 * Represents the interface for conducting ventilation tests to ensure
 * compliance with residential ventilation requirements (ASHRAE 62.2).
 */

import { type Page, type Locator } from '@playwright/test';

export class VentilationPage {
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
    await this.page.goto(`${this.baseUrl}/ventilation-tests/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('page-title');
  }

  get jobInfo(): Locator {
    return this.page.getByTestId('job-info');
  }

  get backButton(): Locator {
    return this.page.getByTestId('button-back-to-jobs');
  }

  get saveButton(): Locator {
    return this.page.getByTestId('button-save-test');
  }

  get complianceAlert(): Locator {
    return this.page.getByTestId('alert-compliance');
  }

  get complianceTitle(): Locator {
    return this.page.getByTestId('alert-compliance-title');
  }

  get complianceDescription(): Locator {
    return this.page.getByTestId('alert-compliance-description');
  }

  // Tabs
  get houseTab(): Locator {
    return this.page.getByTestId('tab-house');
  }

  get kitchenTab(): Locator {
    return this.page.getByTestId('tab-kitchen');
  }

  get bathroomsTab(): Locator {
    return this.page.getByTestId('tab-bathrooms');
  }

  get mechanicalTab(): Locator {
    return this.page.getByTestId('tab-mechanical');
  }

  get resultsTab(): Locator {
    return this.page.getByTestId('tab-results');
  }

  // House tab
  get testDateInput(): Locator {
    return this.page.getByTestId('input-test-date');
  }

  get testTimeInput(): Locator {
    return this.page.getByTestId('input-test-time');
  }

  get equipmentSerialInput(): Locator {
    return this.page.getByTestId('input-equipment-serial');
  }

  get weatherInput(): Locator {
    return this.page.getByTestId('input-weather');
  }

  get floorAreaInput(): Locator {
    return this.page.getByTestId('input-floor-area');
  }

  get bedroomsInput(): Locator {
    return this.page.getByTestId('input-bedrooms');
  }

  get storiesInput(): Locator {
    return this.page.getByTestId('input-stories');
  }

  get calculateRequiredButton(): Locator {
    return this.page.getByTestId('button-calculate-required');
  }

  get requiredRateText(): Locator {
    return this.page.getByTestId('text-required-rate');
  }

  get infiltrationCreditInput(): Locator {
    return this.page.getByTestId('input-infiltration-credit');
  }

  get adjustedRequiredText(): Locator {
    return this.page.getByTestId('text-adjusted-required');
  }

  // Kitchen tab
  get kitchenTypeSelect(): Locator {
    return this.page.getByTestId('select-kitchen-type');
  }

  get kitchenRatedInput(): Locator {
    return this.page.getByTestId('input-kitchen-rated');
  }

  get kitchenMeasuredInput(): Locator {
    return this.page.getByTestId('input-kitchen-measured');
  }

  get kitchenComplianceBadge(): Locator {
    return this.page.getByTestId('badge-kitchen-compliance');
  }

  get kitchenNotesTextarea(): Locator {
    return this.page.getByTestId('textarea-kitchen-notes');
  }

  // Bathroom tabs
  bathroomTypeSelect(num: number): Locator {
    return this.page.getByTestId(`select-bathroom${num}-type`);
  }

  bathroomRatedInput(num: number): Locator {
    return this.page.getByTestId(`input-bathroom${num}-rated`);
  }

  bathroomMeasuredInput(num: number): Locator {
    return this.page.getByTestId(`input-bathroom${num}-measured`);
  }

  bathroomComplianceBadge(num: number): Locator {
    return this.page.getByTestId(`badge-bathroom${num}-compliance`);
  }

  // Mechanical tab
  get mechanicalTypeSelect(): Locator {
    return this.page.getByTestId('select-mechanical-type');
  }

  get mechanicalRatedInput(): Locator {
    return this.page.getByTestId('input-mechanical-rated');
  }

  get mechanicalSupplyInput(): Locator {
    return this.page.getByTestId('input-mechanical-supply');
  }

  get mechanicalExhaustInput(): Locator {
    return this.page.getByTestId('input-mechanical-exhaust');
  }

  get mechanicalScheduleSelect(): Locator {
    return this.page.getByTestId('select-mechanical-schedule');
  }

  get mechanicalControlsInput(): Locator {
    return this.page.getByTestId('input-mechanical-controls');
  }

  get mechanicalNotesTextarea(): Locator {
    return this.page.getByTestId('textarea-mechanical-notes');
  }

  // Results tab
  get calculateComplianceButton(): Locator {
    return this.page.getByTestId('button-calculate-compliance');
  }

  get totalProvidedText(): Locator {
    return this.page.getByTestId('text-total-provided');
  }

  get requiredAdjustedText(): Locator {
    return this.page.getByTestId('text-required-adjusted');
  }

  get overallComplianceBadge(): Locator {
    return this.page.getByTestId('badge-overall-compliance');
  }

  get kitchenComponentStatus(): Locator {
    return this.page.getByTestId('component-kitchen');
  }

  bathroomComponentStatus(num: number): Locator {
    return this.page.getByTestId(`component-bathroom${num}`);
  }

  get totalVentilationStatus(): Locator {
    return this.page.getByTestId('component-total-ventilation');
  }

  get recommendationsTextarea(): Locator {
    return this.page.getByTestId('textarea-recommendations');
  }

  get inspectorNotesTextarea(): Locator {
    return this.page.getByTestId('textarea-inspector-notes');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Fill in house characteristics
   */
  async fillHouseInfo(data: {
    testDate?: string;
    testTime?: string;
    equipmentSerial?: string;
    weather?: string;
    floorArea?: number;
    bedrooms?: number;
    stories?: number;
    infiltrationCredit?: number;
  }) {
    await this.houseTab.click();

    if (data.testDate) await this.testDateInput.fill(data.testDate);
    if (data.testTime) await this.testTimeInput.fill(data.testTime);
    if (data.equipmentSerial) await this.equipmentSerialInput.fill(data.equipmentSerial);
    if (data.weather) await this.weatherInput.fill(data.weather);
    if (data.floorArea) await this.floorAreaInput.fill(data.floorArea.toString());
    if (data.bedrooms) await this.bedroomsInput.fill(data.bedrooms.toString());
    if (data.stories) await this.storiesInput.fill(data.stories.toString());

    // Calculate required ventilation rate
    if (data.floorArea && data.bedrooms) {
      await this.calculateRequiredButton.click();
      await this.page.waitForTimeout(500);
    }

    if (data.infiltrationCredit) {
      await this.infiltrationCreditInput.fill(data.infiltrationCredit.toString());
    }
  }

  /**
   * Fill in kitchen exhaust data
   */
  async fillKitchenData(data: {
    type?: string;
    rated?: number;
    measured?: number;
    notes?: string;
  }) {
    await this.kitchenTab.click();

    if (data.type) {
      await this.kitchenTypeSelect.click();
      await this.page.getByRole('option', { name: data.type }).click();
    }

    if (data.rated) await this.kitchenRatedInput.fill(data.rated.toString());
    if (data.measured) await this.kitchenMeasuredInput.fill(data.measured.toString());
    if (data.notes) await this.kitchenNotesTextarea.fill(data.notes);
  }

  /**
   * Fill in bathroom exhaust data
   */
  async fillBathroomData(bathroomNum: number, data: {
    type?: string;
    rated?: number;
    measured?: number;
  }) {
    await this.bathroomsTab.click();

    if (data.type) {
      await this.bathroomTypeSelect(bathroomNum).click();
      await this.page.getByRole('option', { name: data.type }).click();
    }

    if (data.rated) {
      await this.bathroomRatedInput(bathroomNum).fill(data.rated.toString());
    }

    if (data.measured) {
      await this.bathroomMeasuredInput(bathroomNum).fill(data.measured.toString());
    }
  }

  /**
   * Fill in mechanical ventilation data
   */
  async fillMechanicalData(data: {
    type?: string;
    rated?: number;
    supply?: number;
    exhaust?: number;
    schedule?: string;
    controls?: string;
    notes?: string;
  }) {
    await this.mechanicalTab.click();

    if (data.type) {
      await this.mechanicalTypeSelect.click();
      await this.page.getByRole('option', { name: data.type }).click();
    }

    if (data.rated) await this.mechanicalRatedInput.fill(data.rated.toString());
    if (data.supply) await this.mechanicalSupplyInput.fill(data.supply.toString());
    if (data.exhaust) await this.mechanicalExhaustInput.fill(data.exhaust.toString());

    if (data.schedule) {
      await this.mechanicalScheduleSelect.click();
      await this.page.getByRole('option', { name: data.schedule }).click();
    }

    if (data.controls) await this.mechanicalControlsInput.fill(data.controls);
    if (data.notes) await this.mechanicalNotesTextarea.fill(data.notes);
  }

  /**
   * Calculate overall compliance
   */
  async calculateCompliance() {
    await this.resultsTab.click();
    await this.calculateComplianceButton.click();
    await this.page.waitForTimeout(1000); // Wait for calculations
  }

  /**
   * Save the test data
   */
  async saveTest() {
    await this.saveButton.click();

    // Wait for save to complete
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/ventilation-tests') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 10000 }
    );

    await this.page.waitForTimeout(500);
  }

  /**
   * Get overall compliance status
   */
  async getComplianceStatus(): Promise<'pass' | 'fail' | 'unknown'> {
    await this.resultsTab.click();
    const badgeText = await this.overallComplianceBadge.textContent();

    if (badgeText?.toLowerCase().includes('passes') || badgeText?.toLowerCase().includes('compliant')) {
      return 'pass';
    }
    if (badgeText?.toLowerCase().includes('fails') || badgeText?.toLowerCase().includes('non-compliant')) {
      return 'fail';
    }

    return 'unknown';
  }

  /**
   * Get total provided ventilation rate
   */
  async getTotalProvided(): Promise<number | null> {
    await this.resultsTab.click();
    const text = await this.totalProvidedText.textContent();
    const match = text?.match(/([\d.]+)/);

    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Get required adjusted ventilation rate
   */
  async getRequiredAdjusted(): Promise<number | null> {
    await this.resultsTab.click();
    const text = await this.requiredAdjustedText.textContent();
    const match = text?.match(/([\d.]+)/);

    return match ? parseFloat(match[1]) : null;
  }
}
