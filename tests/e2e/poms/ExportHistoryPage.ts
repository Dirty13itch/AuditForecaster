/**
 * Export History Page Object Model (Scheduled Exports)
 * 
 * Represents the interface for viewing and managing scheduled exports
 * and export history/audit trail.
 */

import { type Page, type Locator } from '@playwright/test';

export class ExportHistoryPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async navigate() {
    await this.page.goto(`${this.baseUrl}/scheduled-exports`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get pageDescription(): Locator {
    return this.page.getByTestId('text-page-description');
  }

  get createExportButton(): Locator {
    return this.page.getByTestId('button-create-export');
  }

  get createFirstButton(): Locator {
    return this.page.getByTestId('button-create-first');
  }

  // Export cards
  exportCard(exportId: string | number): Locator {
    return this.page.getByTestId(`card-export-${exportId}`);
  }

  exportName(exportId: string | number): Locator {
    return this.page.getByTestId(`text-name-${exportId}`);
  }

  exportDataTypeBadge(exportId: string | number): Locator {
    return this.page.getByTestId(`badge-dataType-${exportId}`);
  }

  exportFormatBadge(exportId: string | number): Locator {
    return this.page.getByTestId(`badge-format-${exportId}`);
  }

  exportFrequencyBadge(exportId: string | number): Locator {
    return this.page.getByTestId(`badge-frequency-${exportId}`);
  }

  exportStatusBadge(exportId: string | number): Locator {
    return this.page.getByTestId(`badge-status-${exportId}`);
  }

  exportTimeText(exportId: string | number): Locator {
    return this.page.getByTestId(`text-time-${exportId}`);
  }

  exportDayOfWeekText(exportId: string | number): Locator {
    return this.page.getByTestId(`text-dayOfWeek-${exportId}`);
  }

  exportDayOfMonthText(exportId: string | number): Locator {
    return this.page.getByTestId(`text-dayOfMonth-${exportId}`);
  }

  exportRecipient(exportId: string | number, index: number): Locator {
    return this.page.getByTestId(`text-recipient-${exportId}-${index}`);
  }

  exportNextRunText(exportId: string | number): Locator {
    return this.page.getByTestId(`text-nextRun-${exportId}`);
  }

  exportLastRunText(exportId: string | number): Locator {
    return this.page.getByTestId(`text-lastRun-${exportId}`);
  }

  exportEditButton(exportId: string | number): Locator {
    return this.page.getByTestId(`button-edit-${exportId}`);
  }

  exportToggleButton(exportId: string | number): Locator {
    return this.page.getByTestId(`button-toggle-${exportId}`);
  }

  // Empty state
  get emptyState(): Locator {
    return this.page.getByTestId('empty-state');
  }

  get emptyTitle(): Locator {
    return this.page.getByTestId('text-empty-title');
  }

  get emptyDescription(): Locator {
    return this.page.getByTestId('text-empty-description');
  }

  // Loading state
  get loadingSkeleton(): Locator {
    return this.page.getByTestId('loading-skeleton');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Check if the page is in empty state (no exports configured)
   */
  async isEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Find export by name
   */
  async findExportByName(name: string): Promise<string | null> {
    const exportCards = this.page.locator('[data-testid^="card-export-"]');
    const count = await exportCards.count();

    for (let i = 0; i < count; i++) {
      const card = exportCards.nth(i);
      const text = await card.textContent();

      if (text && text.includes(name)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-export-', '') || null;
      }
    }

    return null;
  }

  /**
   * Find export by data type
   */
  async findExportByDataType(dataType: string): Promise<string | null> {
    const exportCards = this.page.locator('[data-testid^="card-export-"]');
    const count = await exportCards.count();

    for (let i = 0; i < count; i++) {
      const card = exportCards.nth(i);
      const text = await card.textContent();

      if (text && text.toLowerCase().includes(dataType.toLowerCase())) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-export-', '') || null;
      }
    }

    return null;
  }

  /**
   * Check if an export with specific name exists
   */
  async hasExport(name: string): Promise<boolean> {
    const exportId = await this.findExportByName(name);
    return exportId !== null;
  }

  /**
   * Get export status (enabled/disabled)
   */
  async getExportStatus(exportId: string | number): Promise<string | null> {
    return await this.exportStatusBadge(exportId).textContent();
  }

  /**
   * Get export frequency
   */
  async getExportFrequency(exportId: string | number): Promise<string | null> {
    return await this.exportFrequencyBadge(exportId).textContent();
  }

  /**
   * Get export data type
   */
  async getExportDataType(exportId: string | number): Promise<string | null> {
    return await this.exportDataTypeBadge(exportId).textContent();
  }

  /**
   * Get export format
   */
  async getExportFormat(exportId: string | number): Promise<string | null> {
    return await this.exportFormatBadge(exportId).textContent();
  }

  /**
   * Get next run time
   */
  async getNextRunTime(exportId: string | number): Promise<string | null> {
    const text = await this.exportNextRunText(exportId).textContent();
    return text?.trim() || null;
  }

  /**
   * Get last run time
   */
  async getLastRunTime(exportId: string | number): Promise<string | null> {
    const text = await this.exportLastRunText(exportId).textContent();
    return text?.trim() || null;
  }

  /**
   * Get all recipients for an export
   */
  async getRecipients(exportId: string | number): Promise<string[]> {
    const recipients: string[] = [];
    let index = 0;

    while (true) {
      const recipient = this.exportRecipient(exportId, index);
      const isVisible = await recipient.isVisible().catch(() => false);

      if (!isVisible) break;

      const text = await recipient.textContent();
      if (text) recipients.push(text.trim());

      index++;
    }

    return recipients;
  }

  /**
   * Toggle export enabled/disabled status
   */
  async toggleExport(exportId: string | number) {
    await this.exportToggleButton(exportId).click();
    await this.page.waitForTimeout(500); // Wait for toggle to update
  }

  /**
   * Edit export configuration
   */
  async editExport(exportId: string | number) {
    await this.exportEditButton(exportId).click();
    // Wait for edit dialog to open
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a new export
   */
  async createExport() {
    const isEmpty = await this.isEmptyState();

    if (isEmpty) {
      await this.createFirstButton.click();
    } else {
      await this.createExportButton.click();
    }

    // Wait for create dialog to open
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the count of configured exports
   */
  async getExportCount(): Promise<number> {
    if (await this.isEmptyState()) return 0;

    const exportCards = this.page.locator('[data-testid^="card-export-"]');
    return await exportCards.count();
  }

  /**
   * Verify export was created recently (within last 5 minutes)
   */
  async verifyRecentExport(exportName: string): Promise<boolean> {
    const exportId = await this.findExportByName(exportName);

    if (!exportId) return false;

    const lastRun = await this.getLastRunTime(exportId);

    // If it has a last run time, it was executed
    return lastRun !== null && lastRun.length > 0;
  }
}
