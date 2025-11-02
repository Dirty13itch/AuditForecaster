/**
 * Inspection Workflow Page Object Model
 * 
 * Represents the main inspection interface where inspectors complete checklists,
 * capture photos, add measurements, and navigate to testing pages.
 */

import { type Page, type Locator } from '@playwright/test';

export class InspectionWorkflowPage {
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
    await this.page.goto(`${this.baseUrl}/inspection/${jobId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get jobAddress(): Locator {
    return this.page.getByTestId('text-job-address');
  }

  get backButton(): Locator {
    return this.page.getByTestId('button-back');
  }

  get inspectionTypeBadge(): Locator {
    return this.page.getByTestId('badge-inspection-type');
  }

  get progressCard(): Locator {
    return this.page.getByTestId('card-progress');
  }

  get progressText(): Locator {
    return this.page.getByTestId('text-progress');
  }

  get progressPercent(): Locator {
    return this.page.getByTestId('text-progress-percent');
  }

  get progressBar(): Locator {
    return this.page.getByTestId('progress-inspection');
  }

  // Checklist section
  checklistItem(itemId: string | number): Locator {
    return this.page.getByTestId(`checklist-item-${itemId}`);
  }

  checklistCheckbox(itemId: string | number): Locator {
    return this.page.getByTestId(`checkbox-item-${itemId}`);
  }

  // Testing sections
  get blowerDoorSection(): Locator {
    return this.page.getByTestId('section-blower-door-tests');
  }

  get blowerDoorTitle(): Locator {
    return this.page.getByTestId('text-blower-door-title');
  }

  blowerDoorTestCard(testId: string | number): Locator {
    return this.page.getByTestId(`card-blower-door-test-${testId}`);
  }

  blowerDoorAddButton(): Locator {
    return this.page.getByTestId('button-add-blower-door-test');
  }

  get ductLeakageSection(): Locator {
    return this.page.getByTestId('section-duct-leakage-tests');
  }

  get ductLeakageTitle(): Locator {
    return this.page.getByTestId('text-duct-leakage-title');
  }

  ductLeakageTestCard(testId: string | number): Locator {
    return this.page.getByTestId(`card-duct-leakage-test-${testId}`);
  }

  ductLeakageAddButton(): Locator {
    return this.page.getByTestId('button-add-duct-leakage-test');
  }

  get ventilationSection(): Locator {
    return this.page.getByTestId('section-ventilation-tests');
  }

  get ventilationTitle(): Locator {
    return this.page.getByTestId('text-ventilation-title');
  }

  ventilationTestCard(testId: string | number): Locator {
    return this.page.getByTestId(`card-ventilation-test-${testId}`);
  }

  ventilationAddButton(): Locator {
    return this.page.getByTestId('button-add-ventilation-test');
  }

  // Photo upload
  get uploadPhotoButton(): Locator {
    return this.page.getByTestId('button-upload-photo');
  }

  // Report generation
  get generateReportButton(): Locator {
    return this.page.getByTestId('button-generate-report');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Get the first checklist item ID
   */
  async getFirstChecklistItemId(): Promise<string | null> {
    const firstItem = this.page.locator('[data-testid^="checklist-item-"]').first();
    const isVisible = await firstItem.isVisible().catch(() => false);

    if (!isVisible) return null;

    const testId = await firstItem.getAttribute('data-testid');
    return testId?.replace('checklist-item-', '') || null;
  }

  /**
   * Complete a checklist item by checking its checkbox
   */
  async completeChecklistItem(itemId: string | number) {
    const checkbox = this.checklistCheckbox(itemId);

    if (await checkbox.isVisible()) {
      await checkbox.click();
      await this.page.waitForTimeout(500); // Wait for optimistic update
    }
  }

  /**
   * Complete multiple checklist items
   */
  async completeMultipleItems(count: number) {
    const items = this.page.locator('[data-testid^="checkbox-item-"]');
    const totalItems = await items.count();
    const itemsToComplete = Math.min(count, totalItems);

    for (let i = 0; i < itemsToComplete; i++) {
      const checkbox = items.nth(i);
      const isChecked = await checkbox.isChecked();

      if (!isChecked) {
        await checkbox.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Upload a photo using a file path
   */
  async uploadPhoto(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/photos') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 10000 }
    );
  }

  /**
   * Navigate to Blower Door test by clicking "Add Test" or existing test card
   */
  async navigateToBlowerDoorTest(testId?: string | number) {
    if (testId) {
      await this.blowerDoorTestCard(testId).click();
    } else {
      await this.blowerDoorAddButton().click();
    }
    await this.page.waitForURL('**/blower-door-test/**');
  }

  /**
   * Navigate to Duct Leakage test
   */
  async navigateToDuctLeakageTest(testId?: string | number) {
    if (testId) {
      await this.ductLeakageTestCard(testId).click();
    } else {
      await this.ductLeakageAddButton().click();
    }
    await this.page.waitForURL('**/duct-leakage-test/**');
  }

  /**
   * Navigate to Ventilation test
   */
  async navigateToVentilationTest(testId?: string | number) {
    if (testId) {
      await this.ventilationTestCard(testId).click();
    } else {
      await this.ventilationAddButton().click();
    }
    await this.page.waitForURL('**/ventilation-tests/**');
  }

  /**
   * Generate report for the inspection
   */
  async generateReport() {
    await this.generateReportButton.click();

    // Wait for report generation
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/reports') && resp.status() === 200,
      { timeout: 30000 } // Report generation can take longer
    );
  }

  /**
   * Get current progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    const text = await this.progressPercent.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get completed/total items count from progress text
   */
  async getProgressCounts(): Promise<{ completed: number; total: number }> {
    const text = await this.progressText.textContent();
    const match = text?.match(/(\d+)\/(\d+)/);

    if (match) {
      return {
        completed: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
      };
    }

    return { completed: 0, total: 0 };
  }

  /**
   * Wait for progress to update after an action
   */
  async waitForProgressUpdate(expectedPercentage?: number) {
    if (expectedPercentage) {
      await this.page.waitForFunction(
        (percent) => {
          const progressText = document.querySelector('[data-testid="text-progress-percent"]');
          return progressText?.textContent?.includes(`${percent}%`) || false;
        },
        expectedPercentage,
        { timeout: 5000 }
      );
    } else {
      await this.page.waitForTimeout(1000);
    }
  }
}
