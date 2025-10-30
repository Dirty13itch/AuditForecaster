/**
 * [FEATURE NAME] - End-to-End Tests
 * 
 * Tests critical user workflows for [feature] using Playwright.
 * These tests run against a real browser and validate the entire stack.
 * 
 * TODO: Replace [FEATURE], [PAGE], [COMPONENT] placeholders
 * TODO: Customize test scenarios for your feature
 * TODO: Add accessibility checks for critical workflows
 * 
 * @see {@link https://playwright.dev/docs/intro Playwright Documentation}
 * @see {@link ../TESTING_STANDARDS.md Testing Standards}
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test timeouts (adjust as needed)
test.setTimeout(30000); // 30 seconds per test

// ============================================================================
// PAGE OBJECT MODEL (POM)
// ============================================================================

/**
 * Page Object Model for [Feature] page
 * Encapsulates page elements and interactions for reusability and maintainability
 * 
 * TODO: Customize locators and methods for your feature
 */
class FeaturePage {
  constructor(private page: Page) {}

  // Locators (using data-testid for stability)
  // TODO: Add locators for your feature's elements
  
  get createButton() {
    return this.page.getByTestId('button-create-[resource]');
  }

  get nameInput() {
    return this.page.getByTestId('input-[resource]-name');
  }

  get descriptionInput() {
    return this.page.getByTestId('input-[resource]-description');
  }

  get submitButton() {
    return this.page.getByTestId('button-submit-[resource]');
  }

  get cancelButton() {
    return this.page.getByTestId('button-cancel');
  }

  get successToast() {
    return this.page.getByText(/successfully created|created successfully/i);
  }

  get errorMessage() {
    return this.page.getByTestId('text-error-message');
  }

  getResourceCard(resourceId: string) {
    return this.page.getByTestId(`card-[resource]-${resourceId}`);
  }

  getEditButton(resourceId: string) {
    return this.page.getByTestId(`button-edit-${resourceId}`);
  }

  getDeleteButton(resourceId: string) {
    return this.page.getByTestId(`button-delete-${resourceId}`);
  }

  // Actions (high-level interactions)
  // TODO: Add methods for common user workflows

  async navigate() {
    await this.page.goto(`${BASE_URL}/[feature-route]`);
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
  }

  async createResource(data: { name: string; description?: string }) {
    // Click create button
    await this.createButton.click();

    // Fill form
    await this.nameInput.fill(data.name);
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }

    // Submit
    await this.submitButton.click();

    // Wait for success feedback
    await this.successToast.waitFor({ state: 'visible' });
  }

  async editResource(resourceId: string, data: { name?: string; description?: string }) {
    // Click edit button
    await this.getEditButton(resourceId).click();

    // Update fields
    if (data.name) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }
    if (data.description) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(data.description);
    }

    // Submit
    await this.submitButton.click();

    // Wait for success
    await this.page.getByText(/updated successfully/i).waitFor({ state: 'visible' });
  }

  async deleteResource(resourceId: string) {
    // Click delete button
    await this.getDeleteButton(resourceId).click();

    // Confirm deletion in dialog
    await this.page.getByTestId('button-confirm-delete').click();

    // Wait for success
    await this.page.getByText(/deleted successfully/i).waitFor({ state: 'visible' });
  }

  async searchResources(query: string) {
    const searchInput = this.page.getByTestId('input-search');
    await searchInput.fill(query);
    
    // Wait for search results to update
    await this.page.waitForTimeout(300); // Debounce
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('[Feature Name] - E2E Tests', () => {
  let featurePage: FeaturePage;

  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  test.beforeEach(async ({ page }) => {
    // Initialize page object
    featurePage = new FeaturePage(page);

    // Login as admin user (adjust based on your auth system)
    // Option 1: Dev mode quick login
    await page.goto(`${BASE_URL}/api/dev-login/test-admin`);
    
    // Option 2: Full login flow
    // await page.goto(`${BASE_URL}/login`);
    // await page.getByTestId('input-email').fill('admin@test.com');
    // await page.getByTestId('input-password').fill('password');
    // await page.getByTestId('button-login').click();

    // Navigate to feature page
    await featurePage.navigate();

    // Wait for page to be ready
    await expect(page.getByTestId('page-[feature]')).toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on failure
    if (testInfo.status !== 'passed') {
      const screenshot = await page.screenshot();
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }

    // TODO: Cleanup test data if needed
    // Example: Delete resources created during test
  });

  // ============================================================================
  // TEST CASES
  // ============================================================================

  /**
   * TEST 1: Create New Resource - Happy Path
   * Verifies user can create a new resource with valid data
   */
  test('should create new resource successfully', async ({ page }) => {
    // Arrange: Prepare test data
    const testData = {
      name: 'E2E Test Resource',
      description: 'Created by automated E2E test',
    };

    // Act: Create resource
    await featurePage.createButton.click();
    await featurePage.nameInput.fill(testData.name);
    await featurePage.descriptionInput.fill(testData.description);
    await featurePage.submitButton.click();

    // Assert: Verify success
    await expect(featurePage.successToast).toBeVisible();
    await expect(page.getByText(testData.name)).toBeVisible();
    
    // Verify resource appears in list
    const resourceCard = page.getByText(testData.name).locator('..');
    await expect(resourceCard).toBeVisible();
  });

  /**
   * TEST 2: Validation Error - Missing Required Field
   * Verifies validation errors are shown for invalid input
   */
  test('should show validation error for missing required field', async ({ page }) => {
    // Act: Try to submit form without required field
    await featurePage.createButton.click();
    await featurePage.descriptionInput.fill('Description without name');
    await featurePage.submitButton.click();

    // Assert: Verify error message
    await expect(page.getByText(/name is required/i)).toBeVisible();
    
    // Verify form is still open (not submitted)
    await expect(featurePage.submitButton).toBeVisible();
  });

  /**
   * TEST 3: Edit Existing Resource
   * Verifies user can update an existing resource
   */
  test('should edit existing resource successfully', async ({ page }) => {
    // Arrange: Create a resource first
    const originalName = 'Original Resource Name';
    const updatedName = 'Updated Resource Name';

    await featurePage.createResource({
      name: originalName,
      description: 'Will be updated',
    });

    // Act: Edit the resource
    // TODO: Get the created resource ID (may need to query API or parse UI)
    const resourceCard = page.getByText(originalName).locator('..');
    await resourceCard.getByTestId('button-edit').click();

    await featurePage.nameInput.clear();
    await featurePage.nameInput.fill(updatedName);
    await featurePage.submitButton.click();

    // Assert: Verify update
    await expect(page.getByText(/updated successfully/i)).toBeVisible();
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(originalName)).not.toBeVisible();
  });

  /**
   * TEST 4: Delete Resource with Confirmation
   * Verifies user can delete a resource after confirming
   */
  test('should delete resource after confirmation', async ({ page }) => {
    // Arrange: Create a resource to delete
    const resourceName = 'Resource to Delete';
    await featurePage.createResource({ name: resourceName });

    // Act: Delete the resource
    const resourceCard = page.getByText(resourceName).locator('..');
    await resourceCard.getByTestId('button-delete').click();

    // Confirm deletion in dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/are you sure/i);

    await confirmDialog.getByTestId('button-confirm-delete').click();

    // Assert: Verify deletion
    await expect(page.getByText(/deleted successfully/i)).toBeVisible();
    await expect(page.getByText(resourceName)).not.toBeVisible();
  });

  /**
   * TEST 5: Cancel Creation
   * Verifies user can cancel resource creation
   */
  test('should cancel resource creation without saving', async ({ page }) => {
    // Act: Open form and fill some data
    await featurePage.createButton.click();
    await featurePage.nameInput.fill('Cancelled Resource');

    // Cancel the form
    await featurePage.cancelButton.click();

    // Assert: Verify form closed and resource not created
    await expect(featurePage.submitButton).not.toBeVisible();
    await expect(page.getByText('Cancelled Resource')).not.toBeVisible();
  });

  /**
   * TEST 6: Search/Filter Resources
   * Verifies search functionality works correctly
   * 
   * TODO: Implement if your feature has search
   */
  test.skip('should filter resources by search query', async ({ page }) => {
    // Arrange: Create multiple resources
    await featurePage.createResource({ name: 'Apple Resource' });
    await featurePage.createResource({ name: 'Banana Resource' });
    await featurePage.createResource({ name: 'Cherry Resource' });

    // Act: Search for specific resource
    await featurePage.searchResources('Banana');

    // Assert: Verify filtered results
    await expect(page.getByText('Banana Resource')).toBeVisible();
    await expect(page.getByText('Apple Resource')).not.toBeVisible();
    await expect(page.getByText('Cherry Resource')).not.toBeVisible();
  });

  /**
   * TEST 7: Pagination
   * Verifies pagination works correctly for large datasets
   * 
   * TODO: Implement if your feature uses pagination
   */
  test.skip('should navigate through paginated results', async ({ page }) => {
    // This test requires seeding many resources (>10)
    // You may want to use API to seed data instead of UI

    // Act: Navigate to next page
    await page.getByTestId('button-next-page').click();

    // Assert: Verify page changed
    await expect(page.getByTestId('text-current-page')).toContainText('2');
    
    // Navigate back to first page
    await page.getByTestId('button-previous-page').click();
    await expect(page.getByTestId('text-current-page')).toContainText('1');
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  test.describe('Authorization', () => {
    /**
     * TEST 8: Inspector Cannot Delete (Admin Only)
     * Verifies role-based access control is enforced
     * 
     * TODO: Customize for your feature's authorization rules
     */
    test('inspector cannot delete resource (admin only)', async ({ page }) => {
      // Arrange: Login as inspector
      await page.goto(`${BASE_URL}/api/dev-login/test-inspector1`);
      await featurePage.navigate();

      // Create resource as inspector
      await featurePage.createResource({ name: 'Inspector Resource' });

      // Assert: Delete button should not be visible or disabled
      const resourceCard = page.getByText('Inspector Resource').locator('..');
      const deleteButton = resourceCard.getByTestId('button-delete');
      
      // Either button doesn't exist, or it's disabled
      await expect(deleteButton).not.toBeVisible().catch(async () => {
        await expect(deleteButton).toBeDisabled();
      });
    });

    /**
     * TEST 9: Inspector Can Only See Own Resources
     * Verifies data isolation between users
     * 
     * TODO: Implement if your feature has user-specific data
     */
    test.skip('inspector can only see own resources', async ({ page }) => {
      // Login as inspector 1, create resource
      await page.goto(`${BASE_URL}/api/dev-login/test-inspector1`);
      await featurePage.navigate();
      await featurePage.createResource({ name: 'Inspector 1 Resource' });

      // Login as inspector 2
      await page.goto(`${BASE_URL}/api/dev-login/test-inspector2`);
      await featurePage.navigate();

      // Assert: Inspector 1's resource should not be visible
      await expect(page.getByText('Inspector 1 Resource')).not.toBeVisible();
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  test.describe('Accessibility', () => {
    /**
     * TEST 10: Keyboard Navigation
     * Verifies all interactive elements are keyboard accessible
     */
    test('should support keyboard navigation', async ({ page }) => {
      // Focus on create button with Tab
      await page.keyboard.press('Tab');
      await expect(featurePage.createButton).toBeFocused();

      // Open dialog with Enter
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();

      // Focus should be trapped in dialog
      await page.keyboard.press('Tab');
      await expect(featurePage.nameInput).toBeFocused();

      // Close dialog with Escape
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    /**
     * TEST 11: Screen Reader Compatibility
     * Verifies ARIA labels and semantic HTML
     */
    test('should have proper ARIA labels', async ({ page }) => {
      // Check main elements have accessible labels
      await expect(featurePage.createButton).toHaveAccessibleName();
      
      // Check form inputs have associated labels
      await featurePage.createButton.click();
      await expect(featurePage.nameInput).toHaveAccessibleName();
      await expect(featurePage.descriptionInput).toHaveAccessibleName();
    });

    /**
     * TEST 12: Automated Accessibility Scan
     * Uses axe-core to detect accessibility violations
     * 
     * TODO: Install @axe-core/playwright if not already installed
     */
    test.skip('should have no accessibility violations', async ({ page }) => {
      // Requires: npm install -D @axe-core/playwright
      // const { injectAxe, checkA11y } = require('@axe-core/playwright');
      
      // await injectAxe(page);
      // await checkA11y(page, null, {
      //   detailedReport: true,
      //   detailedReportOptions: { html: true },
      // });
    });
  });

  // ============================================================================
  // MOBILE/RESPONSIVE TESTS
  // ============================================================================

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    /**
     * TEST 13: Mobile Touch Targets
     * Verifies touch targets meet 48x48px minimum (field usability)
     */
    test('should have touch targets ≥48px', async ({ page }) => {
      // Check create button size
      const createButtonBox = await featurePage.createButton.boundingBox();
      expect(createButtonBox?.height).toBeGreaterThanOrEqual(48);

      // Check all buttons in a resource card
      await featurePage.createResource({ name: 'Mobile Test' });
      const card = page.getByText('Mobile Test').locator('..');
      
      const editButton = card.getByTestId('button-edit');
      const editBox = await editButton.boundingBox();
      expect(editBox?.height).toBeGreaterThanOrEqual(48);
    });

    /**
     * TEST 14: Mobile Layout
     * Verifies responsive design works on mobile
     */
    test('should display correctly on mobile', async ({ page }) => {
      // Verify page renders without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 0;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding

      // Verify critical elements are visible
      await expect(featurePage.createButton).toBeInViewport();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  test.describe('Performance', () => {
    /**
     * TEST 15: Page Load Time
     * Verifies page loads within performance budget
     */
    test('should load page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await featurePage.navigate();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
    });

    /**
     * TEST 16: Large Dataset Performance
     * Verifies UI remains responsive with many items
     * 
     * TODO: Implement if your feature handles large lists
     */
    test.skip('should handle large dataset without lag', async ({ page }) => {
      // Seed many resources via API (faster than UI)
      // TODO: Call API to create 100+ resources

      // Measure render time
      const startTime = Date.now();
      await featurePage.navigate();
      await page.waitForLoadState('networkidle');
      const renderTime = Date.now() - startTime;

      // Should render in reasonable time even with many items
      expect(renderTime).toBeLessThan(5000); // 5 second budget for large list
    });
  });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Create test resource via API (faster than UI)
 * Use this in beforeEach if tests need existing data
 * 
 * TODO: Implement based on your API
 */
async function createResourceViaAPI(data: { name: string; description?: string }) {
  // Example:
  // const response = await fetch(`${BASE_URL}/api/[resources]`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-Test-User-Id': 'test-admin-1',
  //   },
  //   body: JSON.stringify(data),
  // });
  // return await response.json();
}

/**
 * Helper: Delete test resource via API
 * Use this in afterEach for cleanup
 * 
 * TODO: Implement based on your API
 */
async function deleteResourceViaAPI(resourceId: string) {
  // Example:
  // await fetch(`${BASE_URL}/api/[resources]/${resourceId}`, {
  //   method: 'DELETE',
  //   headers: { 'X-Test-User-Id': 'test-admin-1' },
  // });
}
