import { Page, Locator, expect } from '@playwright/test';

/**
 * BuildersPage - Page Object for Builders management
 * 
 * Handles the complete builder hierarchy workflow:
 * - Builder CRUD operations
 * - Development management within builders
 * - Lot management within developments
 * 
 * The Builders page uses a tabbed detail view on the same page rather than
 * separate routes, and manages developments/lots through dialogs.
 */
export class BuildersPage {
  readonly page: Page;
  readonly addBuilderButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBuilderButton = page.getByTestId('button-add-builder');
    this.searchInput = page.getByTestId('input-search');
  }

  /**
   * Navigate to the Builders page
   */
  async goto() {
    await this.page.goto('/builders');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify the Builders page has loaded
   */
  async verifyPageLoaded() {
    await expect(this.page.getByTestId('text-page-title')).toHaveText('Builders');
    await expect(this.addBuilderButton).toBeVisible();
  }

  /**
   * Create a new builder
   */
  async createBuilder(data: {
    name: string;
    companyName: string;
    email?: string;
    phone?: string;
    address?: string;
    tradeSpecialization?: string;
    rating?: number;
    notes?: string;
  }) {
    // Click add builder button
    await this.addBuilderButton.click();
    
    // Wait for dialog to open
    await expect(this.page.getByTestId('dialog-builder')).toBeVisible();
    
    // Fill in required fields
    await this.page.getByTestId('input-name').fill(data.name);
    await this.page.getByTestId('input-company').fill(data.companyName);
    
    // Fill optional fields
    if (data.email) {
      await this.page.getByTestId('input-email').fill(data.email);
    }
    
    if (data.phone) {
      await this.page.getByTestId('input-phone').fill(data.phone);
    }
    
    if (data.address) {
      await this.page.getByTestId('input-address').fill(data.address);
    }
    
    if (data.tradeSpecialization) {
      await this.page.getByTestId('select-trade').click();
      await this.page.getByTestId(`option-${data.tradeSpecialization}`).click();
    }
    
    if (data.rating) {
      await this.page.getByTestId('select-rating').click();
      await this.page.getByTestId(`option-rating-${data.rating}`).click();
    }
    
    if (data.notes) {
      await this.page.getByTestId('input-notes').fill(data.notes);
    }
    
    // Submit the form
    await this.page.getByTestId('button-submit').click();
    
    // Wait for dialog to close
    await expect(this.page.getByTestId('dialog-builder')).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Search for a builder
   */
  async searchBuilder(query: string) {
    await this.searchInput.fill(query);
    // Wait for search to filter results
    await this.page.waitForTimeout(500);
  }

  /**
   * Find a builder card by name
   */
  async findBuilderCard(name: string): Promise<Locator | null> {
    // Look for the builder name in a card
    const nameLocator = this.page.getByText(name, { exact: false }).first();
    if (await nameLocator.isVisible()) {
      // Find the parent card
      return nameLocator.locator('..').locator('..').locator('..').locator('..');
    }
    return null;
  }

  /**
   * Click on a builder to view details (opens tabbed view)
   */
  async openBuilderDetails(builderName: string) {
    // Find and click the builder card
    const card = await this.findBuilderCard(builderName);
    if (card) {
      await card.click();
      // Wait for detail view to load
      await expect(this.page.getByTestId('text-builder-name')).toBeVisible();
      await expect(this.page.getByTestId('tabs-list')).toBeVisible();
    }
  }

  /**
   * Navigate to a specific tab in the builder detail view
   */
  async navigateToTab(tabName: 'overview' | 'hierarchy' | 'contacts' | 'agreements' | 'programs' | 'interactions') {
    await this.page.getByTestId(`tab-${tabName}`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a development under the current builder
   * Must be called when builder detail view is open
   */
  async createDevelopment(data: {
    name: string;
    region?: string;
    municipality?: string;
    address?: string;
    status?: string;
    notes?: string;
  }) {
    // Navigate to hierarchy tab if not already there
    await this.navigateToTab('hierarchy');
    
    // Look for the button that opens developments dialog
    // This might be in the BuilderHierarchyTab component
    const addDevButton = this.page.getByTestId('button-add-development').or(
      this.page.getByText('Add Development', { exact: false })
    );
    
    await addDevButton.click();
    
    // Wait for development form dialog
    await expect(this.page.getByTestId('dialog-development-form')).toBeVisible();
    
    // Fill in the form
    await this.page.getByTestId('input-development-name').fill(data.name);
    
    if (data.region) {
      await this.page.getByTestId('input-region').fill(data.region);
    }
    
    if (data.municipality) {
      await this.page.getByTestId('input-municipality').fill(data.municipality);
    }
    
    if (data.address) {
      await this.page.getByTestId('input-address').fill(data.address);
    }
    
    if (data.status) {
      await this.page.getByTestId('select-status').click();
      await this.page.getByRole('option', { name: data.status }).click();
    }
    
    if (data.notes) {
      await this.page.getByTestId('textarea-notes').fill(data.notes);
    }
    
    // Submit
    await this.page.getByTestId('button-save').click();
    
    // Wait for dialog to close
    await expect(this.page.getByTestId('dialog-development-form')).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Create a lot under a development
   * Must be called when viewing developments dialog
   */
  async createLot(developmentId: string, data: {
    lotNumber: string;
    phase?: string;
    block?: string;
    streetAddress?: string;
    status?: string;
    squareFootage?: string;
    notes?: string;
  }) {
    // Click manage lots button for the development
    await this.page.getByTestId(`button-manage-lots-${developmentId}`).click();
    
    // Wait for lots dialog to open
    await expect(this.page.getByTestId('dialog-development-lots')).toBeVisible();
    
    // Click add lot button
    await this.page.getByTestId('button-add-lot').click();
    
    // Wait for lot form
    await expect(this.page.getByTestId('dialog-lot-form')).toBeVisible();
    
    // Fill in the form
    await this.page.getByTestId('input-lot-number').fill(data.lotNumber);
    
    if (data.phase) {
      await this.page.getByTestId('input-phase').fill(data.phase);
    }
    
    if (data.block) {
      await this.page.getByTestId('input-block').fill(data.block);
    }
    
    if (data.streetAddress) {
      await this.page.getByTestId('input-street-address').fill(data.streetAddress);
    }
    
    if (data.status) {
      await this.page.getByTestId('select-status').click();
      await this.page.getByRole('option', { name: data.status }).click();
    }
    
    if (data.squareFootage) {
      await this.page.getByTestId('input-square-footage').fill(data.squareFootage);
    }
    
    if (data.notes) {
      await this.page.getByTestId('textarea-notes').fill(data.notes);
    }
    
    // Submit
    await this.page.getByTestId('button-save').click();
    
    // Wait for form to close
    await expect(this.page.getByTestId('dialog-lot-form')).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Edit an existing builder
   */
  async editBuilder(builderId: string, data: Partial<{
    name: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
  }>) {
    // Click edit button on builder card
    await this.page.getByTestId(`button-edit-${builderId}`).click();
    
    // Wait for dialog
    await expect(this.page.getByTestId('dialog-builder')).toBeVisible();
    
    // Update fields
    if (data.name) {
      await this.page.getByTestId('input-name').clear();
      await this.page.getByTestId('input-name').fill(data.name);
    }
    
    if (data.companyName) {
      await this.page.getByTestId('input-company').clear();
      await this.page.getByTestId('input-company').fill(data.companyName);
    }
    
    if (data.email) {
      await this.page.getByTestId('input-email').clear();
      await this.page.getByTestId('input-email').fill(data.email);
    }
    
    if (data.phone) {
      await this.page.getByTestId('input-phone').clear();
      await this.page.getByTestId('input-phone').fill(data.phone);
    }
    
    if (data.address) {
      await this.page.getByTestId('input-address').clear();
      await this.page.getByTestId('input-address').fill(data.address);
    }
    
    // Submit
    await this.page.getByTestId('button-submit').click();
    
    // Wait for dialog to close
    await expect(this.page.getByTestId('dialog-builder')).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Delete a builder
   */
  async deleteBuilder(builderId: string) {
    // Click delete button
    await this.page.getByTestId(`button-delete-${builderId}`).click();
    
    // Wait for confirmation dialog
    await expect(this.page.getByTestId('dialog-delete-confirm')).toBeVisible();
    
    // Confirm deletion
    await this.page.getByTestId('button-confirm-delete').click();
    
    // Wait for confirmation to close
    await expect(this.page.getByTestId('dialog-delete-confirm')).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Delete a builder from the detail view
   */
  async deleteBuilderFromDetailView() {
    // Click delete button in detail view
    await this.page.getByTestId('button-delete-builder').click();
    
    // Confirm deletion
    await expect(this.page.getByTestId('dialog-delete-confirm')).toBeVisible();
    await this.page.getByTestId('button-confirm-delete').click();
    
    // Should navigate back to list view
    await expect(this.page.getByTestId('text-page-title')).toHaveText('Builders');
  }

  /**
   * Back to list from detail view
   */
  async backToList() {
    await this.page.getByTestId('button-back-to-list').click();
    await expect(this.page.getByTestId('text-page-title')).toBeVisible();
  }

  /**
   * Verify a builder exists in the list
   */
  async verifyBuilderExists(companyName: string) {
    await expect(this.page.getByText(companyName)).toBeVisible();
  }

  /**
   * Verify a builder does not exist in the list
   */
  async verifyBuilderNotExists(companyName: string) {
    await expect(this.page.getByText(companyName)).not.toBeVisible();
  }

  /**
   * Get the count of builders displayed
   */
  async getBuilderCount(): Promise<number> {
    const countText = await this.page.getByTestId('text-results-count').textContent();
    if (!countText) return 0;
    
    const match = countText.match(/Showing (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Wait for a builder to appear in the list
   */
  async waitForBuilder(companyName: string, timeout: number = 10000) {
    await expect(this.page.getByText(companyName)).toBeVisible({ timeout });
  }
}
