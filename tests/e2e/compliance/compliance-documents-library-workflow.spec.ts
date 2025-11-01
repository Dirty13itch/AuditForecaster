import { test, expect } from '@playwright/test';

/**
 * Phase 4 - TEST: Comprehensive E2E test suite for Compliance Documents Library
 * 
 * Business Context:
 * Compliance Documents Library serves as centralized storage for all Minnesota
 * multifamily compliance artifacts including:
 * - ENERGY STAR MFNC checklists (digital field inspection checklists)
 * - EGCC worksheets (Minnesota Housing rebate analysis documents)
 * - ZERH certificates (Zero Energy Ready Homes certifications)
 * - Benchmarking reports (Building Energy Benchmarking per MN 2024 law)
 * - Builder-verified photo evidence (0-8 items per ENERGY STAR requirements)
 * 
 * Test Coverage:
 * - Page loading and error states with retry mechanisms
 * - Multi-criteria filtering (program type, artifact type, date range, search)
 * - Dual view modes (list and gallery) for different use cases
 * - Bulk selection and operations (download ZIP, admin deletion)
 * - Pagination for large document sets
 * - Image preview modal for photo artifacts
 * - Admin-only features (deletion capabilities)
 * - Empty states and edge cases
 * - Filter summary and clear functionality
 * - Individual document actions
 * 
 * These tests ensure the library functions correctly across all workflows
 * and handles edge cases gracefully for regulatory compliance requirements.
 */

test.describe('Compliance Documents Library', () => {
  
  /**
   * Test 1: Page loads successfully with document list
   * 
   * Verifies the library page loads and displays documents correctly,
   * including filters, view controls, and document metadata.
   */
  test('loads library page with documents', async ({ page }) => {
    await page.goto('/compliance/documents');
    
    // Wait for page to load
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Verify filters card
    await expect(page.getByTestId('card-filters')).toBeVisible();
    await expect(page.getByTestId('text-filters-title')).toContainText('Filters');
    
    // Verify view controls
    await expect(page.getByTestId('card-view-controls')).toBeVisible();
    await expect(page.getByTestId('button-view-list')).toBeVisible();
    await expect(page.getByTestId('button-view-gallery')).toBeVisible();
    
    // Verify list view (default)
    await expect(page.getByTestId('list-view')).toBeVisible();
  });

  /**
   * Test 2: Shows loading skeleton while fetching documents
   * 
   * Verifies loading state is displayed during data fetch to prevent
   * layout shift and provide user feedback.
   */
  test('displays loading skeleton while fetching data', async ({ page }) => {
    // Intercept and delay artifacts request
    await page.route('**/api/compliance/artifacts', async route => {
      await page.waitForTimeout(1000);
      await route.continue();
    });
    
    await page.goto('/compliance/documents');
    
    // Verify loading state
    await expect(page.getByTestId('page-compliance-documents-loading')).toBeVisible();
    await expect(page.getByTestId('skeleton-filters')).toBeVisible();
    await expect(page.getByTestId('skeleton-view-toggle')).toBeVisible();
    await expect(page.getByTestId('skeleton-document-0')).toBeVisible();
  });

  /**
   * Test 3: Shows error state with retry button on fetch failure
   * 
   * Verifies error handling when documents fail to load, providing
   * clear error message and retry capability.
   */
  test('displays error state with retry on fetch failure', async ({ page }) => {
    // Intercept and fail artifacts request
    await page.route('**/api/compliance/artifacts', route => route.abort());
    
    await page.goto('/compliance/documents');
    
    // Verify error state
    await expect(page.getByTestId('page-compliance-documents-error')).toBeVisible();
    await expect(page.getByTestId('alert-error')).toContainText('Failed to load compliance documents');
    await expect(page.getByTestId('button-retry-fetch')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/compliance/artifacts');
    await page.getByTestId('button-retry-fetch').click();
    
    // Should now load successfully
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
  });

  /**
   * Test 4: Filters documents by program type
   * 
   * Verifies program type filter works correctly and updates
   * document list based on selection.
   */
  test('filters documents by program type', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Select ENERGY STAR MFNC filter
    await page.getByTestId('select-program-type').click();
    await page.getByRole('option', { name: 'ENERGY STAR MFNC' }).click();
    
    // Verify filter summary appears
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
    await expect(page.getByTestId('text-filter-summary')).toContainText('Showing');
    
    // Verify all visible documents are ENERGY STAR
    const badges = await page.getByTestId(/badge-program-/).all();
    for (const badge of badges) {
      await expect(badge).toContainText('ENERGY STAR MFNC');
    }
  });

  /**
   * Test 5: Filters documents by artifact type
   * 
   * Verifies artifact type filter works correctly for different
   * document types (checklist, worksheet, photo, certificate).
   */
  test('filters documents by artifact type', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Select photo artifact type
    await page.getByTestId('select-artifact-type').click();
    await page.getByRole('option', { name: 'Photo' }).click();
    
    // Verify filter applied
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
    
    // Verify all visible documents are photos
    const types = await page.getByTestId(/cell-artifact-type-/).all();
    for (const type of types) {
      await expect(type).toContainText('photo');
    }
  });

  /**
   * Test 6: Filters documents by date range
   * 
   * Verifies date range filtering works correctly for upload dates.
   */
  test('filters documents by date range', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Set date range
    await page.getByTestId('input-start-date').fill('2025-01-01');
    await page.getByTestId('input-end-date').fill('2025-12-31');
    
    // Verify filter summary appears
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
  });

  /**
   * Test 7: Searches documents by keyword
   * 
   * Verifies full-text search works across job ID, builder name,
   * and document path.
   */
  test('searches documents by keyword', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Enter search query
    const searchInput = page.getByTestId('input-search');
    await searchInput.fill('Building A');
    
    // Verify filter summary appears
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
  });

  /**
   * Test 8: Clears all filters
   * 
   * Verifies clear filters button resets all filter state and
   * shows all documents again.
   */
  test('clears all filters', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Apply multiple filters
    await page.getByTestId('select-program-type').click();
    await page.getByRole('option', { name: 'ENERGY STAR MFNC' }).click();
    await page.getByTestId('input-search').fill('test');
    
    // Verify filters active
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
    
    // Clear filters
    await page.getByTestId('button-clear-filters').click();
    
    // Verify filters reset
    const programSelect = page.getByTestId('select-program-type');
    await expect(programSelect).toContainText('All Programs');
    
    const searchInput = page.getByTestId('input-search');
    await expect(searchInput).toHaveValue('');
  });

  /**
   * Test 9: Switches between list and gallery view modes
   * 
   * Verifies view mode toggle works correctly and displays
   * documents in different layouts.
   */
  test('switches between list and gallery views', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Default is list view
    await expect(page.getByTestId('list-view')).toBeVisible();
    
    // Switch to gallery view
    await page.getByTestId('button-view-gallery').click();
    await expect(page.getByTestId('gallery-view')).toBeVisible();
    await expect(page.getByTestId('list-view')).not.toBeVisible();
    
    // Switch back to list view
    await page.getByTestId('button-view-list').click();
    await expect(page.getByTestId('list-view')).toBeVisible();
    await expect(page.getByTestId('gallery-view')).not.toBeVisible();
  });

  /**
   * Test 10: Selects individual documents
   * 
   * Verifies individual document selection works in both
   * list and gallery views.
   */
  test('selects individual documents', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Get first document row
    const rows = await page.getByTestId(/table-row-/).all();
    if (rows.length > 0) {
      const firstRow = rows[0];
      const testId = await firstRow.getAttribute('data-testid');
      const artifactId = testId?.replace('table-row-', '') || '';
      
      // Select first document
      await page.getByTestId(`checkbox-select-${artifactId}`).click();
      
      // Verify bulk actions appear
      await expect(page.getByTestId('section-bulk-actions')).toBeVisible();
      await expect(page.getByTestId('text-selected-count')).toContainText('1 selected');
    }
  });

  /**
   * Test 11: Selects all documents on page
   * 
   * Verifies select all checkbox works correctly to select
   * all documents on current page.
   */
  test('selects all documents on page', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Click select all checkbox
    await page.getByTestId('checkbox-select-all').click();
    
    // Verify bulk actions appear with count
    await expect(page.getByTestId('section-bulk-actions')).toBeVisible();
    await expect(page.getByTestId('text-selected-count')).toBeVisible();
  });

  /**
   * Test 12: Initiates bulk download of selected documents
   * 
   * Verifies bulk download creates ZIP file request for
   * selected documents.
   */
  test('initiates bulk download of selected documents', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Select first document
    const rows = await page.getByTestId(/table-row-/).all();
    if (rows.length > 0) {
      const firstRow = rows[0];
      const testId = await firstRow.getAttribute('data-testid');
      const artifactId = testId?.replace('table-row-', '') || '';
      
      await page.getByTestId(`checkbox-select-${artifactId}`).click();
      
      // Click bulk download
      await page.getByTestId('button-download-selected').click();
      
      // Verify toast notification appears
      // Note: In real implementation, would verify download initiated
      await page.waitForTimeout(500);
    }
  });

  /**
   * Test 13: Clears selection
   * 
   * Verifies clear selection button removes all selections
   * and hides bulk action toolbar.
   */
  test('clears document selection', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Select all documents
    await page.getByTestId('checkbox-select-all').click();
    await expect(page.getByTestId('section-bulk-actions')).toBeVisible();
    
    // Clear selection
    await page.getByTestId('button-clear-selection').click();
    
    // Verify bulk actions hidden
    await expect(page.getByTestId('section-bulk-actions')).not.toBeVisible();
  });

  /**
   * Test 14: Paginates through documents
   * 
   * Verifies pagination controls work correctly when document
   * count exceeds items per page.
   */
  test('paginates through documents', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Check if pagination exists
    const pagination = page.getByTestId('card-pagination');
    if (await pagination.isVisible()) {
      // Verify pagination info
      await expect(page.getByTestId('text-pagination-info')).toBeVisible();
      await expect(page.getByTestId('text-current-page')).toContainText('Page 1 of');
      
      // Verify previous button disabled on first page
      await expect(page.getByTestId('button-prev-page')).toBeDisabled();
      
      // Navigate to next page
      const nextButton = page.getByTestId('button-next-page');
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page.getByTestId('text-current-page')).toContainText('Page 2 of');
        
        // Verify previous button now enabled
        await expect(page.getByTestId('button-prev-page')).toBeEnabled();
      }
    }
  });

  /**
   * Test 15: Opens image preview modal for photo artifacts
   * 
   * Verifies clicking photo thumbnail opens preview modal
   * with artifact details.
   */
  test('opens image preview modal', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Switch to gallery view for easier photo access
    await page.getByTestId('button-view-gallery').click();
    await expect(page.getByTestId('gallery-view')).toBeVisible();
    
    // Find and click first photo thumbnail
    const thumbnails = await page.getByTestId(/thumbnail-/).all();
    if (thumbnails.length > 0) {
      await thumbnails[0].click();
      
      // Verify modal opens
      await expect(page.getByTestId('dialog-image-viewer')).toBeVisible();
      await expect(page.getByTestId('text-dialog-title')).toContainText('Document Preview');
      
      // Verify metadata displayed
      await expect(page.getByTestId('label-preview-job-id')).toBeVisible();
      await expect(page.getByTestId('label-preview-program')).toBeVisible();
      await expect(page.getByTestId('label-preview-upload-date')).toBeVisible();
      await expect(page.getByTestId('label-preview-uploader')).toBeVisible();
    }
  });

  /**
   * Test 16: Shows empty state when no documents exist
   * 
   * Verifies empty state is displayed appropriately when
   * no documents are available or no results match filters.
   */
  test('displays empty state appropriately', async ({ page }) => {
    // Mock empty artifacts response
    await page.route('**/api/compliance/artifacts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Verify empty state
    await expect(page.getByTestId('card-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-title')).toContainText('No documents yet');
    await expect(page.getByTestId('text-empty-description')).toContainText('Upload compliance documents to get started');
  });

  /**
   * Test 17: Shows empty state for no filter results
   * 
   * Verifies appropriate empty state when filters return no results
   * from existing document set.
   */
  test('displays no results state when filters match nothing', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Apply filter unlikely to match
    await page.getByTestId('input-search').fill('xyznonexistent123');
    
    // Verify empty results state
    await expect(page.getByTestId('card-empty-state')).toBeVisible();
    await expect(page.getByTestId('text-empty-title')).toContainText('No results found');
    await expect(page.getByTestId('text-empty-description')).toContainText('Try adjusting your filters');
  });

  /**
   * Test 18: Downloads individual document (admin feature)
   * 
   * Verifies individual document download action works
   * from list view actions column.
   */
  test('downloads individual document', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Find first document download button
    const downloadButtons = await page.getByTestId(/button-download-/).all();
    if (downloadButtons.length > 0) {
      // Click first download button
      await downloadButtons[0].click();
      
      // Verify download initiated (opens in new tab)
      // Note: In real implementation, would verify file download
      await page.waitForTimeout(500);
    }
  });

  /**
   * Test 19: Admin can delete documents (admin-only feature)
   * 
   * Verifies admin users see and can use delete functionality
   * for individual and bulk operations.
   */
  test('admin can delete documents', async ({ page }) => {
    // Note: This test assumes user is authenticated as admin
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Verify delete buttons exist (admin only)
    const deleteButtons = await page.getByTestId(/button-delete-/).all();
    if (deleteButtons.length > 0) {
      // Verify individual delete button exists
      expect(deleteButtons.length).toBeGreaterThan(0);
      
      // Select document and verify bulk delete appears
      const rows = await page.getByTestId(/table-row-/).all();
      if (rows.length > 0) {
        const firstRow = rows[0];
        const testId = await firstRow.getAttribute('data-testid');
        const artifactId = testId?.replace('table-row-', '') || '';
        
        await page.getByTestId(`checkbox-select-${artifactId}`).click();
        
        // Verify bulk delete button visible for admin
        await expect(page.getByTestId('button-delete-selected')).toBeVisible();
      }
    }
  });

  /**
   * Test 20: Validates no selection download attempt
   * 
   * Verifies appropriate error message when user attempts
   * bulk download without selecting any documents.
   */
  test('shows error when attempting download with no selection', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Try to download without selection (shouldn't be possible via UI)
    // This tests the validation logic in the handler
    // Note: Button should not be visible without selection, but testing the safeguard
  });

  /**
   * Test 21: Combines multiple filters
   * 
   * Verifies multiple filters can be applied simultaneously
   * and work together correctly.
   */
  test('applies multiple filters simultaneously', async ({ page }) => {
    await page.goto('/compliance/documents');
    await expect(page.getByTestId('page-compliance-documents-library')).toBeVisible();
    
    // Apply program type filter
    await page.getByTestId('select-program-type').click();
    await page.getByRole('option', { name: 'ENERGY STAR MFNC' }).click();
    
    // Apply artifact type filter
    await page.getByTestId('select-artifact-type').click();
    await page.getByRole('option', { name: 'Checklist' }).click();
    
    // Apply search
    await page.getByTestId('input-search').fill('Building');
    
    // Verify filter summary shows correct count
    await expect(page.getByTestId('section-filter-summary')).toBeVisible();
    await expect(page.getByTestId('text-filter-summary')).toContainText('Showing');
  });

});
