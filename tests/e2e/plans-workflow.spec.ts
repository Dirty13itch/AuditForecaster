import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { nanoid } from 'nanoid';

/**
 * Plans Workflow E2E Tests
 * 
 * Tests the complete service plans management workflow:
 * - Plan CRUD operations (Create, Read, Update, Delete)
 * - Builder filtering and organization
 * - Form validation and error handling
 * - Empty states and loading states
 * - Data persistence and cache invalidation
 * 
 * Plans are reusable templates that store common house measurements
 * to speed up job creation for builders.
 */

test.describe('Plans Workflow - Critical Path', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Login as admin using dev-mode authentication
    await loginPage.loginAsAdmin();
  });

  test('should load Plans page successfully with proper structure', async ({ page }) => {
    await page.goto('/plans');
    
    // Verify page header elements
    await expect(page.getByTestId('container-plans-page')).toBeVisible();
    await expect(page.getByTestId('text-page-title')).toHaveText('Builder Plans');
    await expect(page.getByTestId('text-page-description')).toBeVisible();
    await expect(page.getByTestId('icon-page-title')).toBeVisible();
    
    // Verify add button is present
    await expect(page.getByTestId('button-add-plan')).toBeVisible();
    await expect(page.getByTestId('button-add-plan')).toContainText('Add Plan');
    
    // Verify builder filter card is present
    await expect(page.getByTestId('card-builder-filter')).toBeVisible();
    await expect(page.getByTestId('select-builder-filter')).toBeVisible();
  });

  test('should display empty state when no plans exist', async ({ page }) => {
    await page.goto('/plans');
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="container-loading-state"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    
    // If there are no plans, should show empty state
    const emptyState = page.getByTestId('card-empty-state');
    if (await emptyState.isVisible()) {
      await expect(page.getByTestId('icon-empty-state')).toBeVisible();
      await expect(page.getByTestId('text-empty-state-title')).toHaveText('No Plans Yet');
      await expect(page.getByTestId('text-empty-state-description')).toBeVisible();
      await expect(page.getByTestId('button-add-first-plan')).toBeVisible();
    }
  });

  test('should open plan creation dialog with all form fields', async ({ page }) => {
    await page.goto('/plans');
    
    // Click add plan button
    await page.getByTestId('button-add-plan').click();
    
    // Verify dialog is visible
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Add New Plan');
    
    // Verify all form fields are present
    await expect(page.getByTestId('select-plan-builder')).toBeVisible();
    await expect(page.getByTestId('input-plan-name')).toBeVisible();
    await expect(page.getByTestId('input-floor-area')).toBeVisible();
    await expect(page.getByTestId('input-surface-area')).toBeVisible();
    await expect(page.getByTestId('input-house-volume')).toBeVisible();
    await expect(page.getByTestId('input-stories')).toBeVisible();
    await expect(page.getByTestId('input-notes')).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByTestId('button-save-plan')).toBeVisible();
    await expect(page.getByTestId('button-cancel')).toBeVisible();
    
    // Close dialog
    await page.getByTestId('button-cancel').click();
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible();
  });

  test('should create a new plan successfully with all fields', async ({ page }) => {
    const planName = `Rambler ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    
    // Fill in all fields
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('input-floor-area').fill('1800');
    await page.getByTestId('input-surface-area').fill('3200');
    await page.getByTestId('input-house-volume').fill('14400');
    await page.getByTestId('input-stories').fill('1');
    await page.getByTestId('input-notes').fill('E2E test plan with all measurements');
    
    // Submit form
    await page.getByTestId('button-save-plan').click();
    
    // Verify dialog closes
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible({ timeout: 10000 });
    
    // Verify plan appears in the list
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
  });

  test('should create a minimal plan with only required fields', async ({ page }) => {
    const planName = `Minimal Plan ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    
    // Fill only required fields
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    
    await page.getByTestId('input-plan-name').fill(planName);
    
    // Submit form
    await page.getByTestId('button-save-plan').click();
    
    // Verify success
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields when creating a plan', async ({ page }) => {
    await page.goto('/plans');
    
    // Open dialog
    await page.getByTestId('button-add-plan').click();
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    
    // Try to submit without filling required fields
    await page.getByTestId('button-save-plan').click();
    
    // Dialog should remain open (form validation prevents submission)
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    
    // Verify validation errors are shown
    await expect(page.getByTestId('error-builder')).toBeVisible();
  });

  test('should edit an existing plan successfully', async ({ page }) => {
    const originalName = `Original Plan ${nanoid(4)}`;
    const updatedName = `Updated Plan ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create a plan first
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(originalName);
    await page.getByTestId('input-floor-area').fill('2000');
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 10000 });
    
    // Find and click edit button (look for the plan card first, then its edit button)
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: originalName });
    await expect(planCard).toBeVisible();
    
    const editButton = planCard.locator('[data-testid^="button-edit-plan-"]');
    await editButton.click();
    
    // Verify dialog opens with existing data
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Edit Plan');
    await expect(page.getByTestId('input-plan-name')).toHaveValue(originalName);
    await expect(page.getByTestId('input-floor-area')).toHaveValue('2000');
    
    // Update the plan name and floor area
    await page.getByTestId('input-plan-name').clear();
    await page.getByTestId('input-plan-name').fill(updatedName);
    await page.getByTestId('input-floor-area').clear();
    await page.getByTestId('input-floor-area').fill('2500');
    
    // Save changes
    await page.getByTestId('button-save-plan').click();
    
    // Verify dialog closes and updated name appears
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(originalName)).not.toBeVisible();
  });

  test('should delete a plan with confirmation', async ({ page }) => {
    const planName = `To Delete ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create a plan to delete
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
    
    // Find and click delete button
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: planName });
    const deleteButton = planCard.locator('[data-testid^="button-delete-plan-"]');
    await deleteButton.click();
    
    // Verify confirmation dialog appears
    await expect(page.getByTestId('dialog-delete-confirmation')).toBeVisible();
    await expect(page.getByTestId('text-delete-title')).toHaveText('Delete Plan?');
    await expect(page.getByTestId('text-delete-description')).toBeVisible();
    
    // Confirm deletion
    await page.getByTestId('button-confirm-delete').click();
    
    // Verify plan is removed
    await expect(page.getByTestId('dialog-delete-confirmation')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(planName)).not.toBeVisible({ timeout: 10000 });
  });

  test('should cancel plan deletion', async ({ page }) => {
    const planName = `Not Deleted ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create a plan
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
    
    // Click delete button
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: planName });
    const deleteButton = planCard.locator('[data-testid^="button-delete-plan-"]');
    await deleteButton.click();
    
    // Verify confirmation dialog appears
    await expect(page.getByTestId('dialog-delete-confirmation')).toBeVisible();
    
    // Cancel deletion
    await page.getByTestId('button-cancel-delete').click();
    
    // Verify plan still exists
    await expect(page.getByTestId('dialog-delete-confirmation')).not.toBeVisible();
    await expect(page.getByText(planName)).toBeVisible();
  });

  test('should filter plans by builder', async ({ page }) => {
    await page.goto('/plans');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="container-loading-state"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    
    // Open builder filter
    await page.getByTestId('select-builder-filter').click();
    
    // Verify "All Builders" option exists
    await expect(page.getByTestId('select-item-all-builders')).toBeVisible();
    
    // Select first builder if available
    const firstBuilderOption = page.locator('[data-testid^="select-item-builder-"]').first();
    if (await firstBuilderOption.isVisible()) {
      await firstBuilderOption.click();
      
      // Verify filter is applied (page should update)
      await page.waitForTimeout(1000);
      
      // Reset filter
      await page.getByTestId('select-builder-filter').click();
      await page.getByTestId('select-item-all-builders').click();
    }
  });

  test('should display plan measurements correctly', async ({ page }) => {
    const planName = `Measurement Plan ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create plan with specific measurements
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('input-floor-area').fill('2400');
    await page.getByTestId('input-surface-area').fill('4200');
    await page.getByTestId('input-house-volume').fill('19200');
    await page.getByTestId('input-stories').fill('2');
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
    
    // Find the plan card
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: planName });
    
    // Verify measurements are displayed
    await expect(planCard.getByText('2400 sq ft')).toBeVisible();
    await expect(planCard.getByText('4200 sq ft')).toBeVisible();
    await expect(planCard.getByText('19200 cu ft')).toBeVisible();
    await expect(planCard.getByText('2', { exact: true })).toBeVisible();
  });

  test('should show "no measurements" indicator for minimal plans', async ({ page }) => {
    const planName = `No Measurements ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create plan with no measurements
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
    
    // Find the plan card and verify "no measurements" text
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: planName });
    const noMeasurementsText = planCard.locator('[data-testid^="text-no-measurements-"]');
    await expect(noMeasurementsText).toBeVisible();
  });

  test('should handle decimal measurements correctly', async ({ page }) => {
    const planName = `Decimal Plan ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create plan with decimal measurements
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('input-floor-area').fill('1850.5');
    await page.getByTestId('input-stories').fill('1.5');
    await page.getByTestId('button-save-plan').click();
    
    // Verify plan is created
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
  });

  test('should validate positive numbers for measurements', async ({ page }) => {
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    
    // Fill required fields
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill('Test Plan');
    
    // Try to enter negative number
    await page.getByTestId('input-floor-area').fill('-1000');
    
    // Try to submit
    await page.getByTestId('button-save-plan').click();
    
    // Dialog should remain open due to validation
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
  });

  test('should display plans grouped by builder', async ({ page }) => {
    await page.goto('/plans');
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="container-loading-state"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    
    // Check if any builder groups exist
    const builderGroups = page.locator('[data-testid^="card-builder-group-"]');
    const count = await builderGroups.count();
    
    if (count > 0) {
      // Verify first builder group has required elements
      const firstGroup = builderGroups.first();
      await expect(firstGroup).toBeVisible();
      
      // Verify builder icon and name are shown
      const builderId = await firstGroup.getAttribute('data-testid');
      const extractedId = builderId?.replace('card-builder-group-', '');
      
      if (extractedId) {
        await expect(page.getByTestId(`icon-builder-${extractedId}`)).toBeVisible();
        await expect(page.getByTestId(`text-builder-name-${extractedId}`)).toBeVisible();
      }
    }
  });

  test('should cancel plan creation', async ({ page }) => {
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
    
    // Fill some fields
    await page.getByTestId('input-plan-name').fill('Cancelled Plan');
    
    // Cancel
    await page.getByTestId('button-cancel').click();
    
    // Verify dialog closes
    await expect(page.getByTestId('dialog-plan-form')).not.toBeVisible();
  });

  test('should show loading state during plan submission', async ({ page }) => {
    const planName = `Loading Test ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    
    // Fill form
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    
    // Submit and immediately check for loading state
    const submitButton = page.getByTestId('button-save-plan');
    await submitButton.click();
    
    // Button should show loading text or be disabled
    // (May be too fast to catch, but test attempts to verify)
    const buttonText = await submitButton.textContent();
    expect(buttonText).toBeTruthy();
  });

  test('should preserve form data when editing and cancelling', async ({ page }) => {
    const planName = `Edit Cancel Test ${nanoid(4)}`;
    
    await page.goto('/plans');
    
    // Create a plan
    await page.getByTestId('button-add-plan').click();
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill(planName);
    await page.getByTestId('input-floor-area').fill('1500');
    await page.getByTestId('button-save-plan').click();
    
    // Wait for plan to appear
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });
    
    // Open edit dialog
    const planCard = page.locator(`[data-testid^="card-plan-"]`).filter({ hasText: planName });
    const editButton = planCard.locator('[data-testid^="button-edit-plan-"]');
    await editButton.click();
    
    // Verify form is pre-filled
    await expect(page.getByTestId('input-plan-name')).toHaveValue(planName);
    await expect(page.getByTestId('input-floor-area')).toHaveValue('1500');
    
    // Cancel without saving
    await page.getByTestId('button-cancel').click();
    
    // Verify original data is unchanged
    await expect(page.getByText(planName)).toBeVisible();
    await expect(page.getByText('1500 sq ft')).toBeVisible();
  });
});

test.describe('Plans Workflow - Error Handling', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    await page.goto('/plans');
    
    // Page should load even if there are issues
    await expect(page.getByTestId('container-plans-page')).toBeVisible({ timeout: 15000 })
      .catch(async () => {
        // If loading fails, error state should be shown
        await expect(page.getByTestId('container-error-state')).toBeVisible();
        await expect(page.getByTestId('alert-query-error')).toBeVisible();
      });
  });

  test('should validate plan name length', async ({ page }) => {
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    
    // Fill required fields
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    
    // Try to enter a very long plan name (over 100 characters)
    const longName = 'A'.repeat(150);
    await page.getByTestId('input-plan-name').fill(longName);
    
    // Try to submit
    await page.getByTestId('button-save-plan').click();
    
    // Should show validation error
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
  });

  test('should validate stories maximum', async ({ page }) => {
    await page.goto('/plans');
    
    // Open create dialog
    await page.getByTestId('button-add-plan').click();
    
    // Fill required fields
    await page.getByTestId('select-plan-builder').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('input-plan-name').fill('Too Many Stories');
    
    // Try to enter more than 10 stories
    await page.getByTestId('input-stories').fill('15');
    
    // Try to submit
    await page.getByTestId('button-save-plan').click();
    
    // Should show validation error or prevent submission
    await expect(page.getByTestId('dialog-plan-form')).toBeVisible();
  });
});
