/**
 * Tax Credit Project Page Object Model
 * 
 * Represents the project detail page interface with status timeline,
 * document table, requirements checklist, and sign-off controls.
 */

import { type Page, type Locator } from '@playwright/test';

export class TaxCreditProjectPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async navigate(projectId: string) {
    await this.page.goto(`${this.baseUrl}/tax-credits/projects/${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get pageTitle(): Locator {
    return this.page.getByTestId('text-page-title');
  }

  get backButton(): Locator {
    return this.page.getByTestId('button-back');
  }

  get projectStatusBadge(): Locator {
    return this.page.getByTestId('badge-project-status');
  }

  get projectMeta(): Locator {
    return this.page.getByTestId('text-project-meta');
  }

  // Progress Cards
  get requirementsProgressCard(): Locator {
    return this.page.getByTestId('card-requirements-progress');
  }

  get requirementsProgress(): Locator {
    return this.page.getByTestId('progress-requirements');
  }

  get requirementsProgressText(): Locator {
    return this.page.getByTestId('text-requirements-progress');
  }

  get unitsProgressCard(): Locator {
    return this.page.getByTestId('card-units-progress');
  }

  get unitsProgress(): Locator {
    return this.page.getByTestId('progress-units');
  }

  get unitsProgressText(): Locator {
    return this.page.getByTestId('text-units-progress');
  }

  // Tabs
  get tabsList(): Locator {
    return this.page.getByTestId('tabs-list');
  }

  get detailsTab(): Locator {
    return this.page.getByTestId('tab-details');
  }

  get requirementsTab(): Locator {
    return this.page.getByTestId('tab-requirements');
  }

  get unitsTab(): Locator {
    return this.page.getByTestId('tab-units');
  }

  get documentsTab(): Locator {
    return this.page.getByTestId('tab-documents');
  }

  // Documents Tab Elements
  get documentsTabContent(): Locator {
    return this.page.getByTestId('tab-content-documents');
  }

  get uploadDocumentButton(): Locator {
    return this.page.getByTestId('button-upload-document');
  }

  documentRow(documentId: string): Locator {
    return this.page.getByTestId(`document-${documentId}`);
  }

  documentFileName(documentId: string): Locator {
    return this.page.getByTestId(`text-document-name-${documentId}`);
  }

  documentDownloadButton(documentId: string): Locator {
    return this.page.getByTestId(`button-download-document-${documentId}`);
  }

  documentDeleteButton(documentId: string): Locator {
    return this.page.getByTestId(`button-delete-document-${documentId}`);
  }

  get emptyDocuments(): Locator {
    return this.page.getByTestId('empty-documents');
  }

  // Requirements Tab Elements
  get requirementsTabContent(): Locator {
    return this.page.getByTestId('tab-content-requirements');
  }

  requirementItem(requirementType: string): Locator {
    return this.page.getByTestId(`item-requirement-${requirementType}`);
  }

  requirementCheckbox(requirementType: string): Locator {
    return this.page.getByTestId(`checkbox-requirement-${requirementType}`);
  }

  requirementStatusIcon(requirementType: string): Locator {
    return this.page.getByTestId(`icon-status-${requirementType}`);
  }

  // Builder Sign-off Button
  get builderSignoffButton(): Locator {
    return this.page.getByTestId('button-builder-signoff');
  }

  // Error states
  get errorAlert(): Locator {
    return this.page.getByTestId('alert-error');
  }

  get retryAllButton(): Locator {
    return this.page.getByTestId('button-retry-all');
  }

  // Form elements (for creating new project)
  get projectForm(): Locator {
    return this.page.getByTestId('form-project');
  }

  get builderSelect(): Locator {
    return this.page.getByTestId('select-builder');
  }

  get projectNameInput(): Locator {
    return this.page.getByTestId('input-project-name');
  }

  get projectTypeSelect(): Locator {
    return this.page.getByTestId('select-project-type');
  }

  get totalUnitsInput(): Locator {
    return this.page.getByTestId('input-total-units');
  }

  get taxYearInput(): Locator {
    return this.page.getByTestId('input-tax-year');
  }

  get softwareToolInput(): Locator {
    return this.page.getByTestId('input-software-tool');
  }

  get saveProjectButton(): Locator {
    return this.page.getByTestId('button-save-project');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Navigate back to dashboard
   */
  async goBack() {
    await this.backButton.click();
    await this.page.waitForURL('**/tax-credits');
  }

  /**
   * Switch to Documents tab
   */
  async openDocumentsTab() {
    await this.documentsTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to Requirements tab
   */
  async openRequirementsTab() {
    await this.requirementsTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to Units tab
   */
  async openUnitsTab() {
    await this.unitsTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Open document upload dialog
   */
  async openUploadDialog() {
    await this.uploadDocumentButton.click();
    await this.page.waitForTimeout(500); // Wait for dialog to open
  }


  /**
   * Open builder sign-off dialog
   */
  async openBuilderSignoff() {
    await this.builderSignoffButton.click();
    await this.page.waitForTimeout(500); // Wait for dialog to open
  }

  /**
   * Find document by filename
   */
  async findDocumentByFilename(filename: string): Promise<string | null> {
    const documentRows = this.page.locator('[data-testid^="document-"]');
    const count = await documentRows.count();

    for (let i = 0; i < count; i++) {
      const row = documentRows.nth(i);
      const text = await row.textContent();

      if (text && text.includes(filename)) {
        const testId = await row.getAttribute('data-testid');
        return testId?.replace('document-', '') || null;
      }
    }

    return null;
  }

  /**
   * Get project status
   */
  async getProjectStatus(): Promise<string | null> {
    return await this.projectStatusBadge.textContent();
  }

  /**
   * Get requirements progress
   */
  async getRequirementsProgress(): Promise<string | null> {
    return await this.requirementsProgressText.textContent();
  }

  /**
   * Get units progress
   */
  async getUnitsProgress(): Promise<string | null> {
    return await this.unitsProgressText.textContent();
  }

  /**
   * Check if documents tab shows empty state
   */
  async hasNoDocuments(): Promise<boolean> {
    return await this.emptyDocuments.isVisible();
  }

  /**
   * Get count of uploaded documents
   */
  async getDocumentCount(): Promise<number> {
    const rows = this.page.locator('[data-testid^="document-"]');
    return await rows.count();
  }

  /**
   * Toggle requirement checkbox
   */
  async toggleRequirement(requirementType: string, checked: boolean) {
    const checkbox = this.requirementCheckbox(requirementType);
    const isChecked = await checkbox.isChecked();

    if (isChecked !== checked) {
      await checkbox.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string) {
    await this.documentDownloadButton(documentId).click();
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string) {
    await this.documentDeleteButton(documentId).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify page loaded successfully
   */
  async verifyPageLoaded(): Promise<boolean> {
    const titleVisible = await this.pageTitle.isVisible();
    const tabsVisible = await this.tabsList.isVisible();

    return titleVisible && tabsVisible;
  }
}
