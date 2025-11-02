/**
 * Offline Photos Page Object Model
 * 
 * Represents the photo capture, tagging, annotation, and OCR workflow.
 * Used for testing offline photo capture and sync functionality.
 */

import { type Page, type Locator } from '@playwright/test';

export class OfflinePhotosPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // PHOTO CAPTURE ELEMENTS
  // ============================================================================

  get chooseGalleryButton(): Locator {
    return this.page.getByTestId('button-choose-gallery');
  }

  get chooseCameraButton(): Locator {
    return this.page.getByTestId('button-choose-camera');
  }

  get backToOptionsButton(): Locator {
    return this.page.getByTestId('button-back-to-options');
  }

  get photoFileInput(): Locator {
    return this.page.locator('input[type="file"]').first();
  }

  get uploadButton(): Locator {
    return this.page.getByTestId('button-upload-photos');
  }

  get uploadProgressBar(): Locator {
    return this.page.getByTestId('progress-upload');
  }

  // ============================================================================
  // SMART TAG SELECTOR ELEMENTS
  // ============================================================================

  get smartTagSelector(): Locator {
    return this.page.getByTestId('smart-tag-selector');
  }

  get tagSelectionCount(): Locator {
    return this.page.getByTestId('text-selection-count');
  }

  get suggestedTagsContainer(): Locator {
    return this.page.getByTestId('container-suggested-tags');
  }

  tagButton(tagName: string): Locator {
    return this.page.getByTestId(`button-tag-${tagName}`);
  }

  // ============================================================================
  // PHOTO ANNOTATOR ELEMENTS
  // ============================================================================

  get annotatorDialog(): Locator {
    return this.page.getByTestId('dialog-annotator');
  }

  get annotatorCanvas(): Locator {
    return this.page.locator('canvas').first();
  }

  get arrowToolButton(): Locator {
    return this.page.getByTestId('button-tool-arrow');
  }

  get textToolButton(): Locator {
    return this.page.getByTestId('button-tool-text');
  }

  get lineToolButton(): Locator {
    return this.page.getByTestId('button-tool-line');
  }

  get colorButtonRed(): Locator {
    return this.page.getByTestId('button-color-red');
  }

  get undoButton(): Locator {
    return this.page.getByTestId('button-undo');
  }

  get redoButton(): Locator {
    return this.page.getByTestId('button-redo');
  }

  get saveAnnotationButton(): Locator {
    return this.page.getByTestId('button-save-annotation');
  }

  get cancelAnnotationButton(): Locator {
    return this.page.getByTestId('button-cancel-annotation');
  }

  get textInput(): Locator {
    return this.page.getByTestId('input-annotation-text');
  }

  // ============================================================================
  // PHOTO OCR ELEMENTS
  // ============================================================================

  get ocrDialog(): Locator {
    return this.page.getByTestId('dialog-ocr');
  }

  get ocrPhoto(): Locator {
    return this.page.getByTestId('img-ocr-photo');
  }

  get ocrLoadingIcon(): Locator {
    return this.page.getByTestId('icon-loading');
  }

  get ocrProgressBar(): Locator {
    return this.page.getByTestId('progress-ocr');
  }

  get ocrProgressText(): Locator {
    return this.page.getByTestId('text-progress');
  }

  get ocrExtractedTextarea(): Locator {
    return this.page.getByTestId('textarea-extracted-text');
  }

  get ocrConfidenceBadge(): Locator {
    return this.page.getByTestId('badge-confidence');
  }

  get copyTextButton(): Locator {
    return this.page.getByTestId('button-copy-text');
  }

  get saveTextButton(): Locator {
    return this.page.getByTestId('button-save-text');
  }

  // ============================================================================
  // PHOTO GALLERY ELEMENTS
  // ============================================================================

  get photoGallery(): Locator {
    return this.page.getByTestId('gallery-photos');
  }

  photoCard(photoId: string | number): Locator {
    return this.page.getByTestId(`card-photo-${photoId}`);
  }

  photoImage(photoId: string | number): Locator {
    return this.page.getByTestId(`img-photo-${photoId}`);
  }

  photoActionMenu(photoId: string | number): Locator {
    return this.page.getByTestId(`button-photo-menu-${photoId}`);
  }

  get annotatePhotoButton(): Locator {
    return this.page.getByTestId('button-annotate-photo');
  }

  get scanPhotoButton(): Locator {
    return this.page.getByTestId('button-scan-photo');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Upload a photo from file path (simulates gallery selection)
   */
  async uploadPhotoFromGallery(filePath: string) {
    // Click "Add from Gallery" button
    await this.chooseGalleryButton.click();
    await this.page.waitForTimeout(500);

    // Set file input
    await this.photoFileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  /**
   * Upload multiple photos from file paths
   */
  async uploadMultiplePhotos(filePaths: string[]) {
    await this.chooseGalleryButton.click();
    await this.page.waitForTimeout(500);

    await this.photoFileInput.setInputFiles(filePaths);
    await this.page.waitForTimeout(500);
  }

  /**
   * Click upload button to process selected photos
   */
  async confirmUpload() {
    const uploadBtn = this.uploadButton;
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
    }
  }

  /**
   * Wait for photo upload to complete
   */
  async waitForUploadComplete(timeout: number = 10000) {
    // Wait for upload progress to disappear or complete
    await this.page.waitForTimeout(2000);
  }

  /**
   * Select a tag by name
   */
  async selectTag(tagName: string) {
    const tagBtn = this.tagButton(tagName);
    await tagBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Select multiple tags
   */
  async selectTags(tagNames: string[]) {
    for (const tagName of tagNames) {
      await this.selectTag(tagName);
    }
  }

  /**
   * Get selected tags count
   */
  async getSelectedTagsCount(): Promise<number> {
    const text = await this.tagSelectionCount.textContent();
    const match = text?.match(/(\d+)\/\d+/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Open photo annotator
   */
  async openAnnotator(photoId?: string | number) {
    if (photoId) {
      const menuButton = this.photoActionMenu(photoId);
      await menuButton.click();
      await this.annotatePhotoButton.click();
    }

    await this.annotatorDialog.waitFor({ state: 'visible' });
  }

  /**
   * Draw an arrow annotation on the canvas
   */
  async drawArrow(startX: number, startY: number, endX: number, endY: number) {
    // Select arrow tool
    await this.arrowToolButton.click();
    await this.page.waitForTimeout(200);

    // Get canvas element
    const canvas = this.annotatorCanvas;

    // Draw arrow by mouse down, move, and up
    await canvas.hover();
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();

    await this.page.waitForTimeout(300);
  }

  /**
   * Add text annotation
   */
  async addTextAnnotation(x: number, y: number, text: string) {
    // Select text tool
    await this.textToolButton.click();
    await this.page.waitForTimeout(200);

    // Click on canvas to place text
    const canvas = this.annotatorCanvas;
    await canvas.click({ position: { x, y } });
    await this.page.waitForTimeout(300);

    // Type text in input
    const input = this.textInput;
    if (await input.isVisible()) {
      await input.fill(text);
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * Save annotations
   */
  async saveAnnotations() {
    await this.saveAnnotationButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Cancel annotation
   */
  async cancelAnnotation() {
    await this.cancelAnnotationButton.click();
  }

  /**
   * Open OCR dialog for a photo
   */
  async openOCR(photoId?: string | number) {
    if (photoId) {
      const menuButton = this.photoActionMenu(photoId);
      await menuButton.click();
      await this.scanPhotoButton.click();
    }

    await this.ocrDialog.waitFor({ state: 'visible' });
  }

  /**
   * Wait for OCR processing to complete
   */
  async waitForOCRComplete(timeout: number = 30000) {
    // Wait for loading icon to disappear
    await this.ocrLoadingIcon.waitFor({ state: 'hidden', timeout });

    // Wait for extracted text to be populated
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get extracted OCR text
   */
  async getExtractedText(): Promise<string> {
    return await this.ocrExtractedTextarea.inputValue();
  }

  /**
   * Get OCR confidence percentage
   */
  async getOCRConfidence(): Promise<number> {
    const text = await this.ocrConfidenceBadge.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a photo exists in the gallery
   */
  async hasPhoto(photoId: string | number): Promise<boolean> {
    return await this.photoCard(photoId).isVisible();
  }

  /**
   * Get the first photo ID in the gallery
   */
  async getFirstPhotoId(): Promise<string | null> {
    const firstCard = this.page.locator('[data-testid^="card-photo-"]').first();
    const isVisible = await firstCard.isVisible().catch(() => false);

    if (!isVisible) return null;

    const testId = await firstCard.getAttribute('data-testid');
    return testId?.replace('card-photo-', '') || null;
  }

  /**
   * Get count of photos in gallery
   */
  async getPhotoCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="card-photo-"]');
    return await cards.count();
  }
}
