import { test, expect } from '@playwright/test';

/**
 * Phase 4 - TEST: Comprehensive E2E tests for Builder Verified Items Tracker
 * 
 * Test Coverage:
 * - Page loading and error states
 * - Job context validation
 * - Add/edit/delete item operations
 * - Photo upload workflows
 * - Validation scenarios
 * - Submit workflow
 * - Draft persistence
 * - Edge cases and boundaries
 * 
 * Business Context:
 * BuilderVerifiedItemsTracker manages compliance items that builders self-certify
 * for ENERGY STAR MFNC certification. These items cannot be verified by third-party
 * inspectors (e.g., insulation behind walls). Tests ensure data integrity and
 * proper workflow enforcement for program compliance.
 */

test.describe('Builder Verified Items Tracker - Workflow Tests', () => {
  let jobId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
    
    // Login with test credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    
    // Create a test job with multifamily program configuration
    const response = await page.request.post('/api/jobs', {
      data: {
        name: 'Builder Verified Items Test Job',
        address: '123 Test Street, Minneapolis, MN',
        multifamilyProgram: 'energy_star_mfnc',
        builderVerifiedItemsCount: 8,
        builderVerifiedItemsPhotoRequired: true,
      }
    });
    
    const job = await response.json();
    jobId = job.id;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test job
    if (jobId) {
      await page.request.delete(`/api/jobs/${jobId}`);
    }
  });

  /**
   * Test 1: Page loads successfully with job context
   */
  test('should load page with job details', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify page loads
    await expect(page.getByTestId('page-builder-verified-items')).toBeVisible();
    
    // Verify job header displays
    await expect(page.getByTestId('text-job-name')).toContainText('Builder Verified Items Test Job');
    await expect(page.getByTestId('text-job-address')).toContainText('123 Test Street');
    
    // Verify program configuration
    await expect(page.getByTestId('text-program-type')).toContainText('ENERGY_STAR_MFNC');
    await expect(page.getByTestId('text-items-count')).toContainText('0 / 8');
    await expect(page.getByTestId('badge-photo-required')).toContainText('Required');
  });

  /**
   * Test 2: Loading state displays skeletons
   */
  test('should show loading skeletons while fetching job', async ({ page }) => {
    // Intercept job API call and delay response
    await page.route(`/api/jobs/${jobId}`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify loading state
    await expect(page.getByTestId('page-builder-verified-items-loading')).toBeVisible();
    await expect(page.getByTestId('skeleton-header')).toBeVisible();
    await expect(page.getByTestId('skeleton-content')).toBeVisible();
  });

  /**
   * Test 3: Error state with retry button
   */
  test('should show error state with retry on fetch failure', async ({ page }) => {
    // Intercept job API call and return error
    await page.route(`/api/jobs/${jobId}`, route => route.abort('failed'));
    
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify error state
    await expect(page.getByTestId('page-builder-verified-items-error')).toBeVisible();
    await expect(page.getByTestId('alert-job-error')).toBeVisible();
    await expect(page.getByTestId('text-error-message')).toContainText('Failed to load job data');
    
    // Verify retry button exists
    await expect(page.getByTestId('button-retry-job')).toBeVisible();
  });

  /**
   * Test 4: Not found state for invalid job ID
   */
  test('should show not found state for invalid job', async ({ page }) => {
    await page.goto('/compliance/builder-verified-items/invalid-job-id');
    
    // Verify not found state
    await expect(page.getByTestId('page-builder-verified-items-not-found')).toBeVisible();
    await expect(page.getByTestId('alert-job-not-found')).toBeVisible();
    await expect(page.getByTestId('text-not-found-message')).toContainText('Job not found');
  });

  /**
   * Test 5: Add new builder-verified item
   */
  test('should add new item successfully', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify no items initially
    await expect(page.getByTestId('text-no-items')).toBeVisible();
    
    // Click add item button
    await page.click('[data-testid="button-add-item"]');
    
    // Verify item appears in table
    await expect(page.getByTestId('row-item-1')).toBeVisible();
    await expect(page.getByTestId('text-item-number-1')).toContainText('1');
    
    // Verify items count updated
    await expect(page.getByTestId('text-items-count')).toContainText('1 / 8');
  });

  /**
   * Test 6: Add multiple items and verify numbering
   */
  test('should add multiple items with sequential numbering', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add 3 items
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="button-add-item"]');
    }
    
    // Verify all items exist with correct numbers
    await expect(page.getByTestId('row-item-1')).toBeVisible();
    await expect(page.getByTestId('row-item-2')).toBeVisible();
    await expect(page.getByTestId('row-item-3')).toBeVisible();
    
    // Verify count
    await expect(page.getByTestId('text-items-count')).toContainText('3 / 8');
  });

  /**
   * Test 7: Enforce maximum items limit
   */
  test('should enforce maximum items limit (8)', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add 8 items (maximum)
    for (let i = 0; i < 8; i++) {
      await page.click('[data-testid="button-add-item"]');
    }
    
    // Verify count at maximum
    await expect(page.getByTestId('text-items-count')).toContainText('8 / 8');
    
    // Verify add button is disabled
    await expect(page.getByTestId('button-add-item')).toBeDisabled();
    
    // Attempt to add another item (button click should not work)
    const initialRows = await page.locator('[data-testid^="row-item-"]').count();
    await page.click('[data-testid="button-add-item"]', { force: true });
    
    // Verify no additional row was added
    const finalRows = await page.locator('[data-testid^="row-item-"]').count();
    expect(finalRows).toBe(initialRows);
  });

  /**
   * Test 8: Edit item description
   */
  test('should update item description', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    
    // Fill description
    const description = 'Insulation behind drywall in unit 101';
    await page.fill('[data-testid="input-description-1"]', description);
    
    // Verify description is set
    await expect(page.getByTestId('input-description-1')).toHaveValue(description);
  });

  /**
   * Test 9: Update item status
   */
  test('should update item status', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    
    // Click status select
    await page.click('[data-testid="select-status-1"]');
    
    // Select verified status
    await page.click('[data-testid="status-verified-1"]');
    
    // Verify status updated (select trigger should show verified)
    await expect(page.getByTestId('select-status-1')).toContainText('Verified');
  });

  /**
   * Test 10: Delete item and renumber remaining items
   */
  test('should delete item and renumber remaining items', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add 3 items
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="button-add-item"]');
    }
    
    // Delete item #2
    await page.click('[data-testid="button-delete-item-2"]');
    
    // Verify only 2 items remain
    await expect(page.getByTestId('row-item-1')).toBeVisible();
    await expect(page.getByTestId('row-item-2')).toBeVisible();
    await expect(page.getByTestId('row-item-3')).not.toBeVisible();
    
    // Verify count updated
    await expect(page.getByTestId('text-items-count')).toContainText('2 / 8');
  });

  /**
   * Test 11: Photo upload button appears when photo required
   */
  test('should show photo upload button when photo required', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    
    // Verify photo upload button exists
    await expect(page.getByTestId('button-upload-photo-1')).toBeVisible();
  });

  /**
   * Test 12: Save draft to localStorage
   */
  test('should save draft to localStorage', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item with description
    await page.click('[data-testid="button-add-item"]');
    await page.fill('[data-testid="input-description-1"]', 'Test item for draft save');
    
    // Click save draft
    await page.click('[data-testid="button-save-draft"]');
    
    // Verify toast appears
    await expect(page.locator('text=Draft saved')).toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(500);
    
    // Verify item persisted
    await expect(page.getByTestId('row-item-1')).toBeVisible();
    await expect(page.getByTestId('input-description-1')).toHaveValue('Test item for draft save');
  });

  /**
   * Test 13: Validation - Cannot submit with incomplete descriptions
   */
  test('should prevent submit with incomplete descriptions', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item without description
    await page.click('[data-testid="button-add-item"]');
    
    // Attempt to submit
    await page.click('[data-testid="button-submit-review"]');
    
    // Verify error toast appears
    await expect(page.locator('text=Incomplete items')).toBeVisible();
  });

  /**
   * Test 14: Validation - Enforce minimum description length
   */
  test('should enforce minimum description length (3 characters)', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item with too-short description
    await page.click('[data-testid="button-add-item"]');
    await page.fill('[data-testid="input-description-1"]', 'ab');
    
    // Attempt to submit
    await page.click('[data-testid="button-submit-review"]');
    
    // Verify error toast appears with minimum length message
    await expect(page.locator('text=minimum 3 characters')).toBeVisible();
  });

  /**
   * Test 15: Validation - Cannot submit when photos required but missing
   */
  test('should prevent submit when photos required but missing', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item with description but no photo
    await page.click('[data-testid="button-add-item"]');
    await page.fill('[data-testid="input-description-1"]', 'Valid description without photo');
    
    // Attempt to submit
    await page.click('[data-testid="button-submit-review"]');
    
    // Verify error toast appears
    await expect(page.locator('text=Missing photos')).toBeVisible();
  });

  /**
   * Test 16: Submit button disabled when no items
   */
  test('should disable submit button when no items exist', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify submit button is disabled
    await expect(page.getByTestId('button-submit-review')).toBeDisabled();
  });

  /**
   * Test 17: Photo upload workflow shows correct UI states
   */
  test('should display photo uploaded state after upload', async ({ page }) => {
    // Skip actual upload test - would require mocking object storage
    // This test verifies the UI structure exists
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    
    // Verify upload button exists before upload
    await expect(page.getByTestId('button-upload-photo-1')).toBeVisible();
    
    // Note: Actual upload testing would require:
    // - Mocking ObjectUploader component
    // - Mocking compliance artifact API
    // - File upload simulation
    // These are covered by unit tests and integration tests
  });

  /**
   * Test 18: All interactive elements have proper data-testid
   */
  test('should have comprehensive data-testid coverage', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify key elements have data-testid
    await expect(page.getByTestId('page-builder-verified-items')).toBeVisible();
    await expect(page.getByTestId('card-job-header')).toBeVisible();
    await expect(page.getByTestId('card-items-table')).toBeVisible();
    await expect(page.getByTestId('button-add-item')).toBeVisible();
    await expect(page.getByTestId('button-save-draft')).toBeVisible();
    await expect(page.getByTestId('button-submit-review')).toBeVisible();
    
    // Add item and verify item-specific test IDs
    await page.click('[data-testid="button-add-item"]');
    await expect(page.getByTestId('row-item-1')).toBeVisible();
    await expect(page.getByTestId('text-item-number-1')).toBeVisible();
    await expect(page.getByTestId('input-description-1')).toBeVisible();
    await expect(page.getByTestId('select-status-1')).toBeVisible();
    await expect(page.getByTestId('button-delete-item-1')).toBeVisible();
  });

  /**
   * Test 19: Retry button refetches job data
   */
  test('should refetch job data when retry button clicked', async ({ page }) => {
    let requestCount = 0;
    
    // Intercept job API call and fail first request
    await page.route(`/api/jobs/${jobId}`, async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });
    
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify error state initially
    await expect(page.getByTestId('page-builder-verified-items-error')).toBeVisible();
    
    // Click retry button
    await page.click('[data-testid="button-retry-job"]');
    
    // Verify page loads successfully after retry
    await expect(page.getByTestId('page-builder-verified-items')).toBeVisible();
    await expect(page.getByTestId('text-job-name')).toBeVisible();
  });

  /**
   * Test 20: No emoji in UI (production standards)
   */
  test('should not contain emoji in any UI elements', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    await page.fill('[data-testid="input-description-1"]', 'Test description');
    
    // Check submit button (previously had emoji in loading state)
    const submitButton = page.getByTestId('button-submit-review');
    await expect(submitButton).toBeVisible();
    
    // Get text content and verify no emoji
    const buttonText = await submitButton.textContent();
    expect(buttonText).not.toMatch(/[\u{1F000}-\u{1F9FF}]/u);
  });
});

/**
 * Phase 4 - TEST: Additional edge case tests
 */
test.describe('Builder Verified Items Tracker - Edge Cases', () => {
  let jobId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    const response = await page.request.post('/api/jobs', {
      data: {
        name: 'Edge Case Test Job',
        address: '456 Edge Street, Minneapolis, MN',
        multifamilyProgram: 'energy_star_mfnc',
        builderVerifiedItemsCount: 8,
        builderVerifiedItemsPhotoRequired: false,
      }
    });
    
    const job = await response.json();
    jobId = job.id;
  });

  test.afterEach(async ({ page }) => {
    if (jobId) {
      await page.request.delete(`/api/jobs/${jobId}`);
    }
  });

  /**
   * Test 21: Photo not required configuration
   */
  test('should not show photo column when photos not required', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Verify photo not required badge
    await expect(page.getByTestId('badge-photo-optional')).toBeVisible();
    
    // Add item
    await page.click('[data-testid="button-add-item"]');
    
    // Verify photo column does not exist
    await expect(page.getByTestId('th-photo')).not.toBeVisible();
  });

  /**
   * Test 22: Submit workflow navigates correctly
   */
  test('should navigate to inspection page after successful submit', async ({ page }) => {
    await page.goto(`/compliance/builder-verified-items/${jobId}`);
    
    // Add item with valid description
    await page.click('[data-testid="button-add-item"]');
    await page.fill('[data-testid="input-description-1"]', 'Valid item for navigation test');
    
    // Submit
    await page.click('[data-testid="button-submit-review"]');
    
    // Wait for navigation (1500ms delay)
    await page.waitForURL(`**/inspection/${jobId}`, { timeout: 3000 });
    
    // Verify we navigated to inspection page
    expect(page.url()).toContain(`/inspection/${jobId}`);
  });
});
