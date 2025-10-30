import { Page, expect } from '@playwright/test';
import path from 'path';

/**
 * PhotosPage - Page object for Photos workflow E2E tests
 * 
 * Handles photo upload, tagging, filtering, annotation, OCR, and bulk operations
 */
export class PhotosPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the Photos page
   */
  async goto() {
    await this.page.goto('/photos');
    await this.page.waitForSelector('[data-testid="text-page-title"]');
  }

  /**
   * Upload a single photo with optional job association and tags
   * 
   * @param filePath - Absolute path to the image file
   * @param options - Upload options (jobId, tags)
   */
  async uploadPhoto(filePath: string, options?: { jobId?: string; tags?: string[] }) {
    // Click the "Take Photo" button to open upload modal
    await this.page.getByTestId('button-add-photo').click();

    // Wait for Uppy dashboard modal to appear
    await this.page.waitForSelector('.uppy-Dashboard', { timeout: 5000 });

    // Use file input to upload (Uppy creates a hidden file input)
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(filePath);

    // Wait for file to be added to Uppy
    await this.page.waitForSelector('.uppy-Dashboard-Item', { timeout: 5000 });

    // Click "Upload" button in Uppy dashboard
    const uploadButton = this.page.locator('.uppy-StatusBar-actionBtn--upload');
    await uploadButton.click();

    // Wait for upload to complete (Uppy shows "Complete" status)
    await this.page.waitForSelector('.uppy-StatusBar-content >> text=Complete', { timeout: 30000 });

    // Close the modal
    const closeButton = this.page.locator('.uppy-Dashboard-close').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Wait for photo to appear in the gallery
    const filename = path.basename(filePath);
    await this.waitForPhotoInGallery(filename);

    // If tags are provided, add them to the newly uploaded photo
    if (options?.tags && options.tags.length > 0) {
      // Find the photo card and add tags through bulk operations
      await this.addTagsToLatestPhoto(options.tags);
    }
  }

  /**
   * Wait for a photo to appear in the gallery after upload
   */
  private async waitForPhotoInGallery(filename: string, timeout = 10000) {
    // Wait for any photo card to appear (photos might not show filename in UI)
    // Instead, wait for gallery to refresh with new photo count
    await this.page.waitForTimeout(2000); // Give time for API to save photo
    
    // Refresh the page to see new photo
    await this.page.reload();
    await this.page.waitForSelector('[data-testid="text-page-title"]');
  }

  /**
   * Add tags to the most recently uploaded photo
   */
  private async addTagsToLatestPhoto(tags: string[]) {
    // Enable selection mode
    await this.page.getByTestId('button-toggle-selection').click();

    // Select the first photo (most recent)
    const firstPhotoCheckbox = this.page.locator('[data-testid^="checkbox-photo-"]').first();
    await firstPhotoCheckbox.click();

    // Wait for selection toolbar to appear
    await this.page.waitForSelector('text=1 photo selected', { timeout: 5000 });

    // Click bulk tag action
    // Note: Looking for the tag button in the SelectionToolbar
    const tagButton = this.page.locator('button:has-text("Tag")').first();
    await tagButton.click();

    // Wait for bulk tag dialog
    await this.page.waitForSelector('[data-testid="input-tags"]', { timeout: 5000 });

    // Enter tags (comma-separated)
    await this.page.getByTestId('input-tags').fill(tags.join(', '));

    // Submit tags
    const applyButton = this.page.locator('button:has-text("Apply Tags")').first();
    await applyButton.click();

    // Wait for success and exit selection mode
    await this.page.waitForTimeout(1000);
    await this.page.getByTestId('button-toggle-selection').click();
  }

  /**
   * Filter photos by clicking a tag filter badge
   * 
   * @param tag - Tag to filter by (e.g., 'exterior', 'hvac', 'before')
   */
  async filterByTag(tag: string) {
    // Click the tag filter badge
    await this.page.getByTestId(`tag-filter-${tag}`).click();
    
    // Wait for photos to filter
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter photos by job
   * 
   * @param jobId - Job ID to filter by, or 'all' for all jobs
   */
  async filterByJob(jobId: string) {
    // Click job filter dropdown
    await this.page.getByTestId('select-job-filter').click();
    
    // Select the job
    await this.page.locator(`[role="option"][data-value="${jobId}"]`).click();
    
    // Wait for filtering
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter photos by date range
   * 
   * @param dateFrom - Start date (YYYY-MM-DD)
   * @param dateTo - End date (YYYY-MM-DD)
   */
  async filterByDateRange(dateFrom: string, dateTo: string) {
    await this.page.getByTestId('input-date-from').fill(dateFrom);
    await this.page.getByTestId('input-date-to').fill(dateTo);
    
    // Wait for filtering
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clear all active filters
   */
  async clearFilters() {
    const clearButton = this.page.getByTestId('button-clear-filters');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Open photo detail view (PhotoViewerDialog)
   * 
   * @param index - Index of photo in gallery (0-based)
   */
  async openPhotoDetail(index: number = 0) {
    // Click on a photo card to open viewer
    const photoCards = this.page.locator('[data-testid^="card-photo-"]');
    await photoCards.nth(index).click();
    
    // Wait for PhotoViewerDialog to open
    await this.page.waitForSelector('[data-testid="button-close"]', { timeout: 5000 });
  }

  /**
   * Close the photo detail viewer
   */
  async closePhotoDetail() {
    await this.page.getByTestId('button-close').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Download a photo from the detail view
   */
  async downloadPhoto() {
    // Must be in photo detail view
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByTestId('button-download').click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Zoom in on the current photo in detail view
   */
  async zoomIn() {
    await this.page.getByTestId('button-zoom-in').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Zoom out on the current photo in detail view
   */
  async zoomOut() {
    await this.page.getByTestId('button-zoom-out').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Rotate the current photo in detail view
   */
  async rotatePhoto() {
    await this.page.getByTestId('button-rotate').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Toggle the info panel in photo detail view
   */
  async toggleInfo() {
    await this.page.getByTestId('button-toggle-info').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Navigate to next photo in viewer
   */
  async nextPhoto() {
    await this.page.getByTestId('button-next').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to previous photo in viewer
   */
  async previousPhoto() {
    await this.page.getByTestId('button-previous').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Add an annotation to the current photo
   * Opens PhotoAnnotator dialog and adds annotation
   * 
   * @param type - Annotation type ('arrow', 'text', 'line')
   * @param text - Text for text annotations
   */
  async addAnnotation(type: 'arrow' | 'text' | 'line', text?: string) {
    // Note: The actual UI might trigger annotator differently
    // This is a placeholder - adjust based on actual UI flow
    
    // For now, we'll simulate the annotation workflow
    // In real UI, there might be an "Annotate" button in PhotoViewerDialog
    
    // Look for annotate button (might need to add this to UI)
    const annotateButton = this.page.locator('button:has-text("Annotate")');
    if (await annotateButton.isVisible({ timeout: 1000 })) {
      await annotateButton.click();
    }

    // Wait for annotator dialog
    await this.page.waitForSelector('[data-testid="text-annotator-title"]', { timeout: 5000 });

    if (type === 'arrow') {
      await this.page.getByTestId('button-tool-arrow').click();
      
      // Simulate drawing arrow by clicking on canvas
      const canvas = this.page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        // Click and drag to create arrow
        await this.page.mouse.move(box.x + 100, box.y + 100);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + 200, box.y + 200);
        await this.page.mouse.up();
      }
    } else if (type === 'text' && text) {
      await this.page.getByTestId('button-tool-text').click();
      
      // Click on canvas to place text
      const canvas = this.page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + 150, box.y + 150);
      }

      // Wait for text input dialog
      await this.page.waitForSelector('[data-testid="input-annotation-text"]', { timeout: 3000 });
      
      // Enter text
      await this.page.getByTestId('input-annotation-text').fill(text);
      await this.page.getByTestId('button-add-text').click();
    } else if (type === 'line') {
      await this.page.getByTestId('button-tool-line').click();
      
      // Simulate drawing line
      const canvas = this.page.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + 100, box.y + 150);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + 250, box.y + 150);
        await this.page.mouse.up();
      }
    }

    // Save annotations
    await this.page.getByTestId('button-save-annotations').click();
    
    // Wait for dialog to close
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel annotation without saving
   */
  async cancelAnnotation() {
    await this.page.getByTestId('button-cancel-annotator').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Run OCR on the current photo
   * Opens PhotoOCR dialog and processes the image
   * 
   * @returns Extracted text
   */
  async runOCR(): Promise<string> {
    // Look for OCR button (might need to add to PhotoViewerDialog or use via menu)
    const ocrButton = this.page.locator('button:has-text("OCR"), button:has-text("Extract Text")');
    if (await ocrButton.first().isVisible({ timeout: 1000 })) {
      await ocrButton.first().click();
    }

    // Wait for OCR dialog
    await this.page.waitForSelector('[data-testid="dialog-ocr"]', { timeout: 5000 });

    // Wait for OCR processing to complete (can take 10-30 seconds)
    await this.page.waitForSelector('[data-testid="textarea-extracted-text"]', { timeout: 60000 });

    // Get extracted text
    const extractedText = await this.page.getByTestId('textarea-extracted-text').inputValue();

    return extractedText;
  }

  /**
   * Get OCR confidence score
   */
  async getOCRConfidence(): Promise<number> {
    const confidenceBadge = this.page.getByTestId('badge-confidence');
    const text = await confidenceBadge.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Copy OCR text to clipboard
   */
  async copyOCRText() {
    await this.page.getByTestId('button-copy-text').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Save edited OCR text
   */
  async saveOCRText() {
    await this.page.getByTestId('button-save-text').click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Close OCR dialog
   */
  async closeOCR() {
    // Click outside dialog or press Escape
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Enter selection mode for bulk operations
   */
  async enterSelectionMode() {
    const button = this.page.getByTestId('button-toggle-selection');
    const text = await button.textContent();
    
    // Only click if not already in selection mode
    if (text?.includes('Select')) {
      await button.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Exit selection mode
   */
  async exitSelectionMode() {
    const button = this.page.getByTestId('button-toggle-selection');
    const text = await button.textContent();
    
    // Only click if currently in selection mode
    if (text?.includes('Exit')) {
      await button.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Select photos by index
   * 
   * @param indices - Array of photo indices to select (0-based)
   */
  async selectPhotos(indices: number[]) {
    await this.enterSelectionMode();

    for (const index of indices) {
      const checkbox = this.page.locator('[data-testid^="checkbox-photo-"]').nth(index);
      await checkbox.click();
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Bulk tag selected photos
   * 
   * @param tags - Array of tags to add
   * @param mode - Operation mode ('add', 'remove', 'replace')
   */
  async bulkTag(tags: string[], mode: 'add' | 'remove' | 'replace' = 'add') {
    // Must be in selection mode with photos selected
    const tagButton = this.page.locator('button:has-text("Tag")').first();
    await tagButton.click();

    // Wait for bulk tag dialog
    await this.page.waitForSelector('[data-testid="input-tags"]', { timeout: 5000 });

    // Enter tags
    await this.page.getByTestId('input-tags').fill(tags.join(', '));

    // Select mode if there's a dropdown
    const modeSelect = this.page.locator('select, [role="combobox"]').filter({ hasText: /Add|Remove|Replace/ });
    if (await modeSelect.isVisible({ timeout: 1000 })) {
      await modeSelect.click();
      await this.page.locator(`[role="option"]:has-text("${mode.charAt(0).toUpperCase() + mode.slice(1)}")`).click();
    }

    // Apply tags
    const applyButton = this.page.locator('button:has-text("Apply"), button:has-text("Save")').first();
    await applyButton.click();

    // Wait for operation to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Bulk delete selected photos
   */
  async bulkDelete() {
    // Must be in selection mode with photos selected
    const deleteButton = this.page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Wait for confirmation dialog
    await this.page.waitForTimeout(500);

    // Confirm deletion
    const confirmButton = this.page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
    await confirmButton.click();

    // Wait for deletion to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Bulk export selected photos
   * 
   * @param format - Export format ('json' or 'csv')
   */
  async bulkExport(format: 'json' | 'csv' = 'json') {
    // Must be in selection mode with photos selected
    const exportButton = this.page.locator('button:has-text("Export")').first();
    await exportButton.click();

    // Wait for export dialog
    await this.page.waitForTimeout(500);

    // Select format
    const formatOption = this.page.locator(`[value="${format}"], button:has-text("${format.toUpperCase()}")`);
    if (await formatOption.isVisible({ timeout: 1000 })) {
      await formatOption.click();
    }

    // Trigger export (wait for download)
    const downloadPromise = this.page.waitForEvent('download');
    const exportConfirmButton = this.page.locator('button:has-text("Export"), button:has-text("Download")').last();
    await exportConfirmButton.click();
    
    const download = await downloadPromise;
    return download;
  }

  /**
   * Get the total number of photos displayed
   */
  async getPhotoCount(): Promise<number> {
    const photoCards = this.page.locator('[data-testid^="card-photo-"]');
    return await photoCards.count();
  }

  /**
   * Verify a photo exists in the gallery
   * 
   * @param index - Photo index (0-based)
   */
  async verifyPhotoExists(index: number) {
    const photoCard = this.page.locator('[data-testid^="card-photo-"]').nth(index);
    await expect(photoCard).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get selected photo count in selection mode
   */
  async getSelectedCount(): Promise<number> {
    const selectionText = this.page.locator('text=/\\d+ photos? selected/');
    if (await selectionText.isVisible({ timeout: 1000 })) {
      const text = await selectionText.textContent();
      const match = text?.match(/(\d+) photo/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  /**
   * Verify photo has specific tags
   * 
   * @param index - Photo index in gallery
   * @param tags - Expected tags
   */
  async verifyPhotoHasTags(index: number, tags: string[]) {
    const photoCard = this.page.locator('[data-testid^="card-photo-"]').nth(index);
    
    for (const tag of tags) {
      const tagBadge = photoCard.locator(`text="${tag}"`);
      await expect(tagBadge).toBeVisible({ timeout: 3000 });
    }
  }
}
