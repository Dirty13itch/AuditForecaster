/**
 * Document Upload Modal Page Object Model
 * 
 * ⚠️ WARNING: THIS MODAL IS NOT IMPLEMENTED IN THE ACTUAL UI ⚠️
 * 
 * The actual UI (TaxCreditProject.tsx) only has a simple button:
 *   - button-upload-document (line 879)
 * 
 * There is NO upload dialog/modal with the selectors defined below.
 * All selectors in this file (dialog-upload-document, input-file, dropzone-file, etc.)
 * DO NOT EXIST in the actual UI implementation.
 * 
 * This POM is kept for backward compatibility but should not be used in tests.
 * Tests should be updated to skip document upload steps or implement the actual
 * upload functionality first.
 */

import { type Page, type Locator } from '@playwright/test';

export class DocumentUploadModal {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get dialog(): Locator {
    return this.page.getByTestId('dialog-upload-document');
  }

  get dialogTitle(): Locator {
    return this.page.getByTestId('text-dialog-title');
  }

  get closeButton(): Locator {
    return this.page.getByTestId('button-close-dialog');
  }

  // File input (hidden)
  get fileInput(): Locator {
    return this.page.getByTestId('input-file');
  }

  // Dropzone
  get dropzone(): Locator {
    return this.page.getByTestId('dropzone-file');
  }

  get dropzoneText(): Locator {
    return this.page.getByTestId('text-dropzone');
  }

  // Upload form fields
  get documentTypeSelect(): Locator {
    return this.page.getByTestId('select-document-type');
  }

  get documentDescriptionInput(): Locator {
    return this.page.getByTestId('input-document-description');
  }

  get documentNotesTextarea(): Locator {
    return this.page.getByTestId('textarea-document-notes');
  }

  // Progress indicator
  get uploadProgress(): Locator {
    return this.page.getByTestId('progress-upload');
  }

  get uploadProgressText(): Locator {
    return this.page.getByTestId('text-upload-progress');
  }

  get uploadingIndicator(): Locator {
    return this.page.getByTestId('indicator-uploading');
  }

  // File preview
  get filePreview(): Locator {
    return this.page.getByTestId('preview-file');
  }

  get fileName(): Locator {
    return this.page.getByTestId('text-filename');
  }

  get fileSize(): Locator {
    return this.page.getByTestId('text-filesize');
  }

  get removeFileButton(): Locator {
    return this.page.getByTestId('button-remove-file');
  }

  // Action buttons
  get uploadButton(): Locator {
    return this.page.getByTestId('button-upload');
  }

  get cancelButton(): Locator {
    return this.page.getByTestId('button-cancel');
  }

  // Success/Error states
  get successMessage(): Locator {
    return this.page.getByTestId('text-upload-success');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('text-upload-error');
  }

  // Duplicate detection
  get duplicateWarning(): Locator {
    return this.page.getByTestId('alert-duplicate-warning');
  }

  get duplicateConfirmButton(): Locator {
    return this.page.getByTestId('button-confirm-duplicate');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Wait for dialog to be visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Upload file using setInputFiles (for hidden input)
   */
  async uploadFile(filePath: string) {
    // Use setInputFiles on the hidden file input
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500); // Wait for file to be selected
  }

  /**
   * Set document type
   */
  async setDocumentType(type: string) {
    await this.documentTypeSelect.click();
    await this.page.getByRole('option', { name: type }).click();
  }

  /**
   * Set document description
   */
  async setDescription(description: string) {
    await this.documentDescriptionInput.fill(description);
  }

  /**
   * Set document notes
   */
  async setNotes(notes: string) {
    await this.documentNotesTextarea.fill(notes);
  }

  /**
   * Click upload button and wait for response
   */
  async clickUpload() {
    // Wait for the upload API response
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/api/tax-credit') && resp.url().includes('/document') && resp.status() === 201,
      { timeout: 30000 }
    );

    await this.uploadButton.click();

    // Wait for upload to complete
    await responsePromise;
    await this.page.waitForTimeout(1000); // Wait for UI to update
  }

  /**
   * Complete full upload workflow
   */
  async completeUpload(filePath: string, documentType: string, description: string) {
    await this.waitForDialog();
    await this.uploadFile(filePath);
    await this.setDocumentType(documentType);
    await this.setDescription(description);
    await this.clickUpload();
  }

  /**
   * Cancel upload and close dialog
   */
  async cancel() {
    await this.cancelButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Close dialog
   */
  async close() {
    await this.closeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Remove selected file
   */
  async removeFile() {
    await this.removeFileButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Confirm duplicate upload
   */
  async confirmDuplicate() {
    await this.duplicateConfirmButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if upload is in progress
   */
  async isUploading(): Promise<boolean> {
    return await this.uploadingIndicator.isVisible().catch(() => false);
  }

  /**
   * Check if upload was successful
   */
  async isUploadSuccessful(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  /**
   * Check if upload failed
   */
  async hasUploadError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Check if duplicate warning is shown
   */
  async hasDuplicateWarning(): Promise<boolean> {
    return await this.duplicateWarning.isVisible().catch(() => false);
  }

  /**
   * Get upload progress percentage
   */
  async getProgressPercentage(): Promise<string | null> {
    return await this.uploadProgressText.textContent();
  }

  /**
   * Get uploaded filename
   */
  async getFileName(): Promise<string | null> {
    return await this.fileName.textContent();
  }

  /**
   * Get file size display
   */
  async getFileSize(): Promise<string | null> {
    return await this.fileSize.textContent();
  }

  /**
   * Verify dialog is open
   */
  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Verify dialog is closed
   */
  async isClosed(): Promise<boolean> {
    return !(await this.dialog.isVisible());
  }
}
