/**
 * Equipment Page Object Model
 * 
 * Represents the equipment management interface for tracking field equipment,
 * calibration, and checkout status.
 */

import { type Page, type Locator } from '@playwright/test';

export class EquipmentPage {
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
    await this.page.goto(`${this.baseUrl}/equipment`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get addEquipmentButton(): Locator {
    return this.page.getByTestId('button-add-equipment');
  }

  // Alerts
  get overdueCalibrationAlert(): Locator {
    return this.page.getByTestId('alert-overdue-calibrations');
  }

  get calibrationDueAlert(): Locator {
    return this.page.getByTestId('alert-calibration-due');
  }

  get overdueCheckoutAlert(): Locator {
    return this.page.getByTestId('alert-overdue-checkouts');
  }

  // Filters
  get searchInput(): Locator {
    return this.page.getByTestId('input-search-equipment');
  }

  get statusFilter(): Locator {
    return this.page.getByTestId('select-status-filter');
  }

  get typeFilter(): Locator {
    return this.page.getByTestId('select-type-filter');
  }

  get gridViewButton(): Locator {
    return this.page.getByTestId('button-view-grid');
  }

  get listViewButton(): Locator {
    return this.page.getByTestId('button-view-list');
  }

  // Tabs
  get allEquipmentTab(): Locator {
    return this.page.getByTestId('tab-all');
  }

  get checkoutTab(): Locator {
    return this.page.getByTestId('tab-checkout');
  }

  get calibrationTab(): Locator {
    return this.page.getByTestId('tab-calibration');
  }

  get maintenanceTab(): Locator {
    return this.page.getByTestId('tab-maintenance');
  }

  // Equipment cards/rows
  equipmentCard(itemId: string | number): Locator {
    return this.page.getByTestId(`card-equipment-${itemId}`);
  }

  equipmentRow(itemId: string | number): Locator {
    return this.page.getByTestId(`row-equipment-${itemId}`);
  }

  equipmentName(itemId: string | number): Locator {
    return this.page.getByTestId(`text-equipment-name-${itemId}`);
  }

  equipmentSerial(itemId: string | number): Locator {
    return this.page.getByTestId(`text-equipment-serial-${itemId}`);
  }

  equipmentStatus(itemId: string | number): Locator {
    return this.page.getByTestId(`badge-equipment-status-${itemId}`);
  }

  equipmentTypeIcon(itemId: string | number): Locator {
    return this.page.getByTestId(`icon-equipment-type-${itemId}`);
  }

  calibrationStatus(itemId: string | number): Locator {
    return this.page.getByTestId(`container-calibration-status-${itemId}`);
  }

  // Quick action buttons
  get manageCheckoutsButton(): Locator {
    return this.page.getByTestId('button-manage-checkouts');
  }

  get viewCalibrationScheduleButton(): Locator {
    return this.page.getByTestId('button-view-calibration-schedule');
  }

  get viewMaintenanceLogButton(): Locator {
    return this.page.getByTestId('button-view-maintenance-log');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Search for equipment by name or serial number
   */
  async searchEquipment(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  /**
   * Filter equipment by status
   */
  async filterByStatus(status: 'available' | 'checked_out' | 'maintenance' | 'retired') {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter equipment by type
   */
  async filterByType(type: string) {
    await this.typeFilter.click();
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to grid view
   */
  async switchToGridView() {
    await this.gridViewButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to list view
   */
  async switchToListView() {
    await this.listViewButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Find equipment by name
   */
  async findEquipmentByName(name: string): Promise<string | null> {
    const cards = this.page.locator('[data-testid^="card-equipment-"]');
    const rows = this.page.locator('[data-testid^="row-equipment-"]');
    
    // Try cards first (grid view)
    let count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const text = await card.textContent();
      
      if (text && text.includes(name)) {
        const testId = await card.getAttribute('data-testid');
        return testId?.replace('card-equipment-', '') || null;
      }
    }
    
    // Try rows (list view)
    count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      
      if (text && text.includes(name)) {
        const testId = await row.getAttribute('data-testid');
        return testId?.replace('row-equipment-', '') || null;
      }
    }
    
    return null;
  }

  /**
   * Find equipment by serial number
   */
  async findEquipmentBySerial(serial: string): Promise<string | null> {
    await this.searchEquipment(serial);
    
    const cards = this.page.locator('[data-testid^="card-equipment-"]');
    const count = await cards.count();
    
    if (count > 0) {
      const firstCard = cards.first();
      const testId = await firstCard.getAttribute('data-testid');
      return testId?.replace('card-equipment-', '') || null;
    }
    
    return null;
  }

  /**
   * Get equipment serial number
   */
  async getEquipmentSerial(itemId: string | number): Promise<string | null> {
    const text = await this.equipmentSerial(itemId).textContent();
    return text?.replace('Serial:', '').trim() || null;
  }

  /**
   * Get equipment status
   */
  async getEquipmentStatus(itemId: string | number): Promise<string | null> {
    return await this.equipmentStatus(itemId).textContent();
  }

  /**
   * Click on equipment card/row to view details
   */
  async viewEquipmentDetails(itemId: string | number) {
    const card = this.equipmentCard(itemId);
    const isCardVisible = await card.isVisible().catch(() => false);
    
    if (isCardVisible) {
      await card.click();
    } else {
      await this.equipmentRow(itemId).click();
    }
    
    await this.page.waitForURL(`**/equipment/${itemId}**`);
  }

  /**
   * Navigate to checkout management
   */
  async navigateToCheckouts() {
    await this.manageCheckoutsButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to calibration schedule
   */
  async navigateToCalibrationSchedule() {
    await this.viewCalibrationScheduleButton.click();
    await this.page.waitForURL('**/calibration-schedule');
  }

  /**
   * Count equipment items currently displayed
   */
  async getEquipmentCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="card-equipment-"]');
    const rows = this.page.locator('[data-testid^="row-equipment-"]');
    
    const cardCount = await cards.count();
    const rowCount = await rows.count();
    
    return Math.max(cardCount, rowCount);
  }
}
