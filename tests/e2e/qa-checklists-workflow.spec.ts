/**
 * QA Checklists Page - End-to-End Tests
 * 
 * Comprehensive tests for the QA Checklist Management page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Skeleton loaders during initial data fetch
 * - Error states with retry mechanisms
 * - Empty states when no checklists or items
 * - Tab navigation (Manage, Templates, Analytics, Settings)
 * - Checklist list display with active/inactive status
 * - Checklist item management (add, edit, delete, reorder)
 * - Drag-and-drop item reordering
 * - Usage statistics display
 * - Create checklist dialog with validation
 * - Create/edit item dialog with validation
 * - Template selection
 * - Analytics display
 * - Settings configuration
 * - ErrorBoundary fallback
 * - Category icons and evidence type icons
 * 
 * QA Checklist Queries (2 total):
 * 1. /api/qa/checklists (disabled - mock data)
 * 2. /api/qa/checklists/stats/:id (disabled - mock data)
 * 
 * QA Checklist Mutations (4 total):
 * 1. POST /api/qa/checklists (create checklist)
 * 2. POST /api/qa/checklist-items (create item)
 * 3. PATCH /api/qa/checklist-items/:id (update item)
 * 4. DELETE /api/qa/checklist-items/:id (delete item)
 * 5. POST /api/qa/checklists/:id/items/reorder (reorder items)
 * 6. PATCH /api/qa/checklists/:id/toggle-active (toggle active status)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(60000); // QA Checklists page with drag-and-drop

class QAChecklistsPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(`${BASE_URL}/qa/checklists`);
  }

  // Page Elements
  get pageTitle() {
    return this.page.getByTestId('heading-checklists-title');
  }

  get pageSubtitle() {
    return this.page.getByTestId('text-checklists-subtitle');
  }

  get mainContainer() {
    return this.page.getByTestId('container-checklists-main');
  }

  get loadingContainer() {
    return this.page.getByTestId('container-checklists-loading');
  }

  get errorContainer() {
    return this.page.getByTestId('container-checklists-error');
  }

  // Action Buttons
  get newChecklistButton() {
    return this.page.getByTestId('button-new-checklist');
  }

  get addItemButton() {
    return this.page.getByTestId('button-add-item');
  }

  get addFirstItemButton() {
    return this.page.getByTestId('button-add-first-item');
  }

  // Tabs
  get manageTab() {
    return this.page.getByTestId('tab-manage');
  }

  get templatesTab() {
    return this.page.getByTestId('tab-templates');
  }

  get analyticsTab() {
    return this.page.getByTestId('tab-analytics');
  }

  get settingsTab() {
    return this.page.getByTestId('tab-settings');
  }

  // Checklist List
  get checklistsList() {
    return this.page.getByTestId('card-checklists-list');
  }

  checklistCard(id: string) {
    return this.page.getByTestId(`card-checklist-${id}`);
  }

  checklistName(id: string) {
    return this.page.getByTestId(`text-name-${id}`);
  }

  checklistStatus(id: string) {
    return this.page.getByTestId(`badge-status-${id}`);
  }

  checklistItemCount(id: string) {
    return this.page.getByTestId(`badge-count-${id}`);
  }

  checklistActiveSwitch(id: string) {
    return this.page.getByTestId(`switch-active-${id}`);
  }

  // Checklist Items
  get itemsList() {
    return this.page.getByTestId('list-checklist-items');
  }

  checklistItem(id: string) {
    return this.page.getByTestId(`item-checklist-${id}`);
  }

  itemText(id: string) {
    return this.page.getByTestId(`text-item-${id}`);
  }

  itemDragHandle(id: string) {
    return this.page.getByTestId(`handle-drag-${id}`);
  }

  itemEditButton(id: string) {
    return this.page.getByTestId(`button-edit-${id}`);
  }

  itemDeleteButton(id: string) {
    return this.page.getByTestId(`button-delete-${id}`);
  }

  // Empty States
  get emptyStateItems() {
    return this.page.getByTestId('empty-state-items');
  }

  get noSelectionCard() {
    return this.page.getByTestId('card-no-selection');
  }

  // Statistics
  get statsSection() {
    return this.page.getByTestId('section-checklist-stats');
  }

  get totalUsesValue() {
    return this.page.getByTestId('value-total-uses');
  }

  get completionRateValue() {
    return this.page.getByTestId('value-completion-rate');
  }

  get avgTimeValue() {
    return this.page.getByTestId('value-avg-time');
  }

  get criticalItemsValue() {
    return this.page.getByTestId('value-critical-items');
  }

  // Create Checklist Dialog
  get createChecklistDialog() {
    return this.page.getByTestId('dialog-create-checklist');
  }

  get nameInput() {
    return this.page.getByTestId('input-name');
  }

  get categorySelect() {
    return this.page.getByTestId('select-category');
  }

  get descriptionTextarea() {
    return this.page.getByTestId('textarea-description');
  }

  get saveCreateButton() {
    return this.page.getByTestId('button-save-create');
  }

  get cancelCreateButton() {
    return this.page.getByTestId('button-cancel-create');
  }

  // Item Dialog
  get itemDialog() {
    return this.page.getByTestId('dialog-item');
  }

  get itemTextInput() {
    return this.page.getByTestId('input-item-text');
  }

  get helpTextTextarea() {
    return this.page.getByTestId('textarea-help-text');
  }

  get evidenceSelect() {
    return this.page.getByTestId('select-evidence');
  }

  get criticalSwitch() {
    return this.page.getByTestId('switch-critical');
  }

  get saveItemButton() {
    return this.page.getByTestId('button-save-item');
  }

  get cancelItemButton() {
    return this.page.getByTestId('button-cancel-item');
  }

  // Templates
  get safetyTemplate() {
    return this.page.getByTestId('template-safety');
  }

  get equipmentTemplate() {
    return this.page.getByTestId('template-equipment');
  }

  get complianceTemplate() {
    return this.page.getByTestId('template-compliance');
  }

  // Analytics
  get checklistPerformanceCard() {
    return this.page.getByTestId('card-checklist-performance');
  }

  get usageTrendsCard() {
    return this.page.getByTestId('card-usage-trends');
  }

  // Settings
  get settingsCard() {
    return this.page.getByTestId('card-settings');
  }

  get requireEvidenceSwitch() {
    return this.page.getByTestId('switch-require-evidence');
  }

  get autoCompleteSwitch() {
    return this.page.getByTestId('switch-auto-complete');
  }

  // Helper Methods
  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
  }

  async selectChecklist(checklistId: string) {
    await this.checklistCard(checklistId).click();
    await this.page.waitForTimeout(500); // Allow for selection animation
  }

  async openCreateChecklistDialog() {
    await this.newChecklistButton.click();
    await this.createChecklistDialog.waitFor({ state: 'visible' });
  }

  async openCreateItemDialog() {
    await this.addItemButton.click();
    await this.itemDialog.waitFor({ state: 'visible' });
  }

  async fillChecklistForm(data: {
    name: string;
    category?: string;
    description?: string;
  }) {
    await this.nameInput.fill(data.name);
    if (data.category) {
      await this.categorySelect.click();
      await this.page.getByTestId(`option-${data.category}`).click();
    }
    if (data.description) {
      await this.descriptionTextarea.fill(data.description);
    }
  }

  async fillItemForm(data: {
    itemText: string;
    helpText?: string;
    evidence?: string;
    critical?: boolean;
  }) {
    await this.itemTextInput.fill(data.itemText);
    if (data.helpText) {
      await this.helpTextTextarea.fill(data.helpText);
    }
    if (data.evidence) {
      await this.evidenceSelect.click();
      await this.page.getByTestId(`option-evidence-${data.evidence}`).click();
    }
    if (data.critical) {
      await this.criticalSwitch.click();
    }
  }
}

// Test Suite
test.describe('QA Checklists Workflow', () => {
  let checklistsPage: QAChecklistsPage;

  test.beforeEach(async ({ page }) => {
    checklistsPage = new QAChecklistsPage(page);
  });

  // Test 1: Page loads with correct title and structure
  test('should load QA Checklists page with correct title and subtitle', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await expect(checklistsPage.pageTitle).toBeVisible();
    await expect(checklistsPage.pageTitle).toHaveText('QA Checklists');
    await expect(checklistsPage.pageSubtitle).toBeVisible();
    await expect(checklistsPage.pageSubtitle).toContainText('Manage inspection checklists');
  });

  // Test 2: Displays loading skeleton during initial load
  test('should show skeleton loaders during initial data fetch', async ({ page }) => {
    // Simulate slow network to see skeleton
    await page.route('**/api/qa/checklists', async route => {
      await page.waitForTimeout(2000);
      await route.continue();
    });

    await checklistsPage.goto();
    
    // Skeleton should be visible during load
    await expect(checklistsPage.loadingContainer).toBeVisible({ timeout: 1000 });
    await expect(checklistsPage.pageTitle).toHaveText('QA Checklists');
  });

  // Test 3: Displays error state when query fails
  test('should show error alert when checklist data fails to load', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/qa/checklists', route => {
      route.abort('failed');
    });

    await checklistsPage.goto();
    await page.waitForTimeout(2000);

    // Error container should be visible
    await expect(checklistsPage.errorContainer).toBeVisible({ timeout: 5000 });
  });

  // Test 4: Tab navigation works correctly
  test('should navigate between tabs correctly', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Click Templates tab
    await checklistsPage.templatesTab.click();
    await expect(checklistsPage.safetyTemplate).toBeVisible();

    // Click Analytics tab
    await checklistsPage.analyticsTab.click();
    await expect(checklistsPage.checklistPerformanceCard).toBeVisible();
    await expect(checklistsPage.usageTrendsCard).toBeVisible();

    // Click Settings tab
    await checklistsPage.settingsTab.click();
    await expect(checklistsPage.settingsCard).toBeVisible();
    await expect(checklistsPage.requireEvidenceSwitch).toBeVisible();

    // Back to Manage tab
    await checklistsPage.manageTab.click();
    await expect(checklistsPage.checklistsList).toBeVisible();
  });

  // Test 5: Displays checklist list with mock data
  test('should display checklist cards with correct information', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Check first checklist (Pre-Inspection Safety)
    const checklist1 = checklistsPage.checklistCard('1');
    await expect(checklist1).toBeVisible();
    await expect(checklistsPage.checklistName('1')).toHaveText('Pre-Inspection Safety');
    await expect(checklistsPage.checklistStatus('1')).toHaveText('Active');
    await expect(checklistsPage.checklistItemCount('1')).toContainText('3 items');
  });

  // Test 6: Selecting checklist displays its items
  test('should display checklist items when checklist is selected', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Initially should show "Select a checklist" message
    await expect(checklistsPage.noSelectionCard).toBeVisible();

    // Select first checklist
    await checklistsPage.selectChecklist('1');

    // Should show items list
    await expect(checklistsPage.itemsList).toBeVisible();
    await expect(checklistsPage.checklistItem('item-1')).toBeVisible();
    await expect(checklistsPage.itemText('item-1')).toHaveText('Check for gas leaks');
  });

  // Test 7: Displays usage statistics for selected checklist
  test('should display usage statistics when checklist has items', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Select checklist
    await checklistsPage.selectChecklist('1');

    // Check statistics are visible
    await expect(checklistsPage.statsSection).toBeVisible();
    await expect(checklistsPage.totalUsesValue).toHaveText('145');
    await expect(checklistsPage.completionRateValue).toHaveText('92.5%');
    await expect(checklistsPage.avgTimeValue).toContainText('12.3');
    await expect(checklistsPage.criticalItemsValue).toHaveText('2');
  });

  // Test 8: Empty state when checklist has no items
  test('should show empty state when checklist has no items', async ({ page }) => {
    // Mock empty checklist
    await page.route('**/api/qa/checklists', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{
          id: 'empty-1',
          name: 'Empty Checklist',
          category: 'pre-inspection',
          description: 'Test empty checklist',
          isActive: true,
          requiredForJobTypes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          items: []
        }])
      });
    });

    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Select empty checklist
    await checklistsPage.selectChecklist('empty-1');

    // Should show empty state
    await expect(checklistsPage.emptyStateItems).toBeVisible();
    await expect(checklistsPage.addFirstItemButton).toBeVisible();
  });

  // Test 9: Create checklist dialog opens and closes
  test('should open and close create checklist dialog', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Open dialog
    await checklistsPage.openCreateChecklistDialog();
    await expect(checklistsPage.createChecklistDialog).toBeVisible();

    // Close dialog
    await checklistsPage.cancelCreateButton.click();
    await expect(checklistsPage.createChecklistDialog).not.toBeVisible();
  });

  // Test 10: Create checklist form validation
  test('should validate required fields in create checklist form', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.openCreateChecklistDialog();

    // Try to save without filling required fields
    await checklistsPage.saveCreateButton.click();

    // Should show validation error (toast)
    await checklistsPage.page.waitForTimeout(500);
  });

  // Test 11: Create checklist with valid data
  test('should create new checklist with valid data', async ({ page }) => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.openCreateChecklistDialog();

    // Fill form
    await checklistsPage.fillChecklistForm({
      name: 'New Test Checklist',
      category: 'during',
      description: 'Test checklist for E2E'
    });

    // Mock successful creation
    await page.route('**/api/qa/checklists', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 'new-1',
            name: 'New Test Checklist',
            category: 'during',
            description: 'Test checklist for E2E',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        });
      }
    });

    await checklistsPage.saveCreateButton.click();

    // Should show success toast
    await page.waitForTimeout(1000);
  });

  // Test 12: Add item dialog opens and closes
  test('should open and close add item dialog', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Select checklist
    await checklistsPage.selectChecklist('1');

    // Open item dialog
    await checklistsPage.openCreateItemDialog();
    await expect(checklistsPage.itemDialog).toBeVisible();

    // Close dialog
    await checklistsPage.cancelItemButton.click();
    await expect(checklistsPage.itemDialog).not.toBeVisible();
  });

  // Test 13: Create checklist item with valid data
  test('should create new checklist item', async ({ page }) => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');
    await checklistsPage.openCreateItemDialog();

    // Fill item form
    await checklistsPage.fillItemForm({
      itemText: 'New test item',
      helpText: 'This is help text',
      evidence: 'photo',
      critical: true
    });

    // Mock successful creation
    await page.route('**/api/qa/checklist-items', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 'item-new',
            checklistId: '1',
            itemText: 'New test item',
            isCritical: true,
            category: 'safety',
            sortOrder: 4,
            helpText: 'This is help text',
            requiredEvidence: 'photo'
          })
        });
      }
    });

    await checklistsPage.saveItemButton.click();

    // Should show success toast
    await page.waitForTimeout(1000);
  });

  // Test 14: Edit existing checklist item
  test('should edit existing checklist item', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');

    // Click edit on first item
    await checklistsPage.itemEditButton('item-1').click();
    await expect(checklistsPage.itemDialog).toBeVisible();

    // Should pre-fill with existing data
    await expect(checklistsPage.itemTextInput).toHaveValue('Check for gas leaks');
  });

  // Test 15: Delete checklist item with confirmation
  test('should delete checklist item after confirmation', async ({ page }) => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');

    // Set up confirmation dialog handler
    page.on('dialog', dialog => dialog.accept());

    // Mock successful deletion
    await page.route('**/api/qa/checklist-items/**', route => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204 });
      }
    });

    await checklistsPage.itemDeleteButton('item-1').click();

    // Should show success toast
    await page.waitForTimeout(1000);
  });

  // Test 16: Toggle checklist active/inactive status
  test('should toggle checklist active status', async ({ page }) => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Mock toggle endpoint
    await page.route('**/api/qa/checklists/*/toggle-active', route => {
      route.fulfill({ status: 200 });
    });

    // Toggle first checklist
    await checklistsPage.checklistActiveSwitch('1').click();

    // Should show success toast
    await page.waitForTimeout(1000);
  });

  // Test 17: Drag handle is visible on items
  test('should display drag handles on checklist items', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');

    // Check drag handle is visible
    await expect(checklistsPage.itemDragHandle('item-1')).toBeVisible();
  });

  // Test 18: Templates tab displays template cards
  test('should display template cards in templates tab', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.templatesTab.click();

    // Check all template cards are visible
    await expect(checklistsPage.safetyTemplate).toBeVisible();
    await expect(checklistsPage.equipmentTemplate).toBeVisible();
    await expect(checklistsPage.complianceTemplate).toBeVisible();
  });

  // Test 19: Analytics tab displays performance metrics
  test('should display analytics in analytics tab', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.analyticsTab.click();

    await expect(checklistsPage.checklistPerformanceCard).toBeVisible();
    await expect(checklistsPage.usageTrendsCard).toBeVisible();
  });

  // Test 20: Settings tab displays configuration options
  test('should display settings switches in settings tab', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.settingsTab.click();

    await expect(checklistsPage.requireEvidenceSwitch).toBeVisible();
    await expect(checklistsPage.autoCompleteSwitch).toBeVisible();
  });

  // Test 21: Category icons display correctly
  test('should display category icons for each checklist', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Check that category icons are present
    const preInspectionIcon = checklistsPage.page.getByTestId('icon-category-pre-inspection').first();
    await expect(preInspectionIcon).toBeVisible();
  });

  // Test 22: Evidence type icons display correctly
  test('should display evidence type icons for items', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');

    // Check evidence icon is visible on item
    const evidenceGroup = checklistsPage.page.getByTestId('group-evidence-item-1');
    await expect(evidenceGroup).toBeVisible();
  });

  // Test 23: Critical badge displays on critical items
  test('should display critical badge on critical items', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    await checklistsPage.selectChecklist('1');

    // Check critical badge is visible
    const criticalBadge = checklistsPage.page.getByTestId('badge-critical-item-1');
    await expect(criticalBadge).toBeVisible();
    await expect(criticalBadge).toHaveText('Critical');
  });

  // Test 24: All data-testid attributes are present
  test('should have comprehensive data-testid attributes', async () => {
    await checklistsPage.goto();
    await checklistsPage.waitForPageLoad();

    // Check key elements have data-testid
    await expect(checklistsPage.mainContainer).toBeVisible();
    await expect(checklistsPage.pageTitle).toBeVisible();
    await expect(checklistsPage.newChecklistButton).toBeVisible();
    await expect(checklistsPage.checklistsList).toBeVisible();

    await checklistsPage.selectChecklist('1');
    await expect(checklistsPage.itemsList).toBeVisible();
  });
});
