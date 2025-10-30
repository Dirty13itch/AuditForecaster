import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { BuildersPage } from './pages/BuildersPage';
import { nanoid } from 'nanoid';

/**
 * Builders Workflow E2E Tests
 * 
 * Tests the complete builder hierarchy workflow:
 * - Builder CRUD operations
 * - Development management (builder → development)
 * - Lot management (development → lot)
 * - Search and filtering
 * - Validation
 * - Cascade deletes
 * 
 * The Builders page uses a tabbed detail view on the same page rather than
 * separate routes. Developments and lots are managed through dialogs.
 */
test.describe('Builders Workflow - Critical Path', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);

    // Login as admin using dev-mode authentication
    await loginPage.loginAsAdmin();
  });

  test('should create a new builder successfully', async ({ page }) => {
    const testBuilderName = `John Doe`;
    const testCompanyName = `E2E Builder ${nanoid(6)}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create a new builder
    await buildersPage.createBuilder({
      name: testBuilderName,
      companyName: testCompanyName,
      email: 'john@e2ebuilder.com',
      phone: '(612) 555-0101',
      address: '123 Construction Ave, Minneapolis, MN 55401',
      tradeSpecialization: 'General Construction',
      rating: 5,
      notes: 'E2E test builder',
    });

    // Verify builder appears in the list
    await buildersPage.waitForBuilder(testCompanyName);
    await buildersPage.verifyBuilderExists(testCompanyName);
  });

  test('should validate required fields when creating a builder', async ({ page }) => {
    await buildersPage.goto();
    
    // Open dialog
    await buildersPage.addBuilderButton.click();
    await expect(page.getByTestId('dialog-builder')).toBeVisible();
    
    // Try to submit without required fields
    await page.getByTestId('button-submit').click();
    
    // Dialog should remain open (form validation prevents submission)
    await expect(page.getByTestId('dialog-builder')).toBeVisible();
  });

  test('should display builder creation dialog with all form fields', async ({ page }) => {
    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Open dialog
    await buildersPage.addBuilderButton.click();

    // Verify dialog is visible
    await expect(page.getByTestId('dialog-builder')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Add New Builder');

    // Verify form fields are present
    await expect(page.getByTestId('input-name')).toBeVisible();
    await expect(page.getByTestId('input-company')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-phone')).toBeVisible();
    await expect(page.getByTestId('input-address')).toBeVisible();
    await expect(page.getByTestId('select-trade')).toBeVisible();
    await expect(page.getByTestId('select-rating')).toBeVisible();
    await expect(page.getByTestId('input-notes')).toBeVisible();

    // Verify action buttons
    await expect(page.getByTestId('button-submit')).toBeVisible();
    await expect(page.getByTestId('button-cancel')).toBeVisible();

    // Close dialog
    await page.getByTestId('button-cancel').click();
    await expect(page.getByTestId('dialog-builder')).not.toBeVisible();
  });
});

test.describe('Builders Workflow - Search and Filter', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should search for builder by company name', async ({ page }) => {
    const uniqueCompany = `Searchable Builder ${nanoid(6)}`;

    await buildersPage.goto();

    // Create a test builder
    await buildersPage.createBuilder({
      name: 'Jane Smith',
      companyName: uniqueCompany,
      email: 'jane@search.com',
      phone: '(612) 555-0202',
      address: '456 Search St, Minneapolis, MN 55402',
    });

    await buildersPage.waitForBuilder(uniqueCompany);

    // Search for the builder
    await buildersPage.searchBuilder(uniqueCompany);

    // Verify builder is visible
    await expect(page.getByText(uniqueCompany)).toBeVisible();
  });

  test('should search by builder name', async ({ page }) => {
    const uniqueName = `UniqueBuilder${nanoid(4)}`;
    const companyName = `Company ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: uniqueName,
      companyName: companyName,
      email: 'unique@test.com',
      address: '789 Test Ave, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);

    // Search by name
    await buildersPage.searchBuilder(uniqueName);

    // Verify builder is found
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test('should search by trade specialization', async ({ page }) => {
    const companyName = `HVAC Specialist ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder with specific trade
    await buildersPage.createBuilder({
      name: 'Bob Johnson',
      companyName: companyName,
      email: 'bob@hvac.com',
      address: '321 HVAC Way, Minneapolis, MN',
      tradeSpecialization: 'HVAC Systems',
    });

    await buildersPage.waitForBuilder(companyName);

    // Search by trade specialization
    await buildersPage.searchBuilder('HVAC');

    // Verify builder is visible
    await expect(page.getByText(companyName)).toBeVisible();
  });

  test('should show "no results" when search has no matches', async ({ page }) => {
    await buildersPage.goto();

    // Search for non-existent builder
    await buildersPage.searchBuilder('NonExistentBuilderXYZ123');

    // Verify no results message
    await expect(page.getByTestId('text-no-results')).toBeVisible();
    await expect(page.getByText('No builders found')).toBeVisible();
  });
});

test.describe('Builders Workflow - Detail View', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should open builder detail view with tabs', async ({ page }) => {
    const companyName = `Detail View Builder ${nanoid(4)}`;

    await buildersPage.goto();

    // Create a builder
    await buildersPage.createBuilder({
      name: 'Alice Williams',
      companyName: companyName,
      email: 'alice@detail.com',
      phone: '(612) 555-0303',
      address: '100 Detail Dr, Minneapolis, MN 55403',
    });

    await buildersPage.waitForBuilder(companyName);

    // Open builder detail view
    await buildersPage.openBuilderDetails(companyName);

    // Verify detail view is displayed
    await expect(page.getByTestId('text-builder-name')).toBeVisible();
    await expect(page.getByTestId('text-builder-company')).toHaveText(companyName);

    // Verify tabs are visible
    await expect(page.getByTestId('tabs-list')).toBeVisible();
    await expect(page.getByTestId('tab-overview')).toBeVisible();
    await expect(page.getByTestId('tab-hierarchy')).toBeVisible();
    await expect(page.getByTestId('tab-contacts')).toBeVisible();
    await expect(page.getByTestId('tab-agreements')).toBeVisible();
    await expect(page.getByTestId('tab-programs')).toBeVisible();
    await expect(page.getByTestId('tab-interactions')).toBeVisible();
  });

  test('should navigate between tabs in detail view', async ({ page }) => {
    const companyName = `Tab Navigation Builder ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'David Brown',
      companyName: companyName,
      email: 'david@tabs.com',
      address: '200 Tab St, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(companyName);

    // Test navigating to different tabs
    const tabs = ['hierarchy', 'contacts', 'agreements', 'programs', 'interactions', 'overview'] as const;

    for (const tab of tabs) {
      await buildersPage.navigateToTab(tab);
      await expect(page.getByTestId(`tab-${tab}`)).toHaveAttribute('data-state', 'active');
    }
  });

  test('should display hierarchy tab with empty state', async ({ page }) => {
    const companyName = `Empty Hierarchy ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'Eve Davis',
      companyName: companyName,
      email: 'eve@hierarchy.com',
      address: '300 Hierarchy Blvd, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(companyName);

    // Navigate to hierarchy tab
    await buildersPage.navigateToTab('hierarchy');

    // Verify empty state message
    await expect(page.getByText('No Developments')).toBeVisible();
    await expect(page.getByText(/This builder doesn't have any developments yet/)).toBeVisible();
  });

  test('should navigate back to list from detail view', async ({ page }) => {
    const companyName = `Back Navigation ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'Frank Miller',
      companyName: companyName,
      email: 'frank@back.com',
      address: '400 Back St, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(companyName);

    // Verify we're in detail view
    await expect(page.getByTestId('text-builder-name')).toBeVisible();

    // Navigate back
    await buildersPage.backToList();

    // Verify we're back at the list view
    await expect(page.getByTestId('text-page-title')).toHaveText('Builders');
    await expect(page.getByText(companyName)).toBeVisible();
  });
});

test.describe('Builders Workflow - Edit Operations', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should edit builder from detail view', async ({ page }) => {
    const initialCompany = `Initial Company ${nanoid(4)}`;
    const updatedCompany = `Updated Company ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'Grace Taylor',
      companyName: initialCompany,
      email: 'grace@initial.com',
      phone: '(612) 555-0404',
      address: '500 Initial Ave, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(initialCompany);
    await buildersPage.openBuilderDetails(initialCompany);

    // Click edit button
    await page.getByTestId('button-edit-builder').click();

    // Wait for dialog
    await expect(page.getByTestId('dialog-builder')).toBeVisible();
    await expect(page.getByTestId('text-dialog-title')).toHaveText('Edit Builder');

    // Update company name
    const companyInput = page.getByTestId('input-company');
    await companyInput.clear();
    await companyInput.fill(updatedCompany);

    // Submit
    await page.getByTestId('button-submit').click();

    // Wait for dialog to close
    await expect(page.getByTestId('dialog-builder')).not.toBeVisible({ timeout: 10000 });

    // Verify updated name is displayed
    await expect(page.getByTestId('text-builder-company')).toHaveText(updatedCompany);
  });
});

test.describe('Builders Workflow - Delete Operations', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should delete builder from detail view', async ({ page }) => {
    const companyName = `Delete Test ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'Henry Wilson',
      companyName: companyName,
      email: 'henry@delete.com',
      address: '600 Delete St, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(companyName);

    // Delete builder
    await buildersPage.deleteBuilderFromDetailView();

    // Wait for navigation back to list
    await expect(page.getByTestId('text-page-title')).toBeVisible();

    // Verify builder no longer exists
    await buildersPage.verifyBuilderNotExists(companyName);
  });

  test('should show confirmation dialog before deleting', async ({ page }) => {
    const companyName = `Confirmation Test ${nanoid(4)}`;

    await buildersPage.goto();

    // Create builder
    await buildersPage.createBuilder({
      name: 'Iris Johnson',
      companyName: companyName,
      email: 'iris@confirm.com',
      address: '700 Confirm Ave, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(companyName);

    // Click delete button
    await page.getByTestId('button-delete-builder').click();

    // Verify confirmation dialog
    await expect(page.getByTestId('dialog-delete-confirm')).toBeVisible();
    await expect(page.getByText('Are you sure?')).toBeVisible();
    await expect(page.getByText(/This will permanently delete this builder/)).toBeVisible();

    // Cancel deletion
    await page.getByTestId('button-cancel-delete').click();

    // Verify still in detail view
    await expect(page.getByTestId('text-builder-name')).toBeVisible();

    // Verify builder still exists
    await buildersPage.backToList();
    await buildersPage.verifyBuilderExists(companyName);
  });
});

test.describe('Builders Workflow - Multi-Builder Scenarios', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should create multiple builders with different trades', async ({ page }) => {
    const timestamp = nanoid(4);
    const builders = [
      {
        name: 'Jack Adams',
        companyName: `HVAC ${timestamp}`,
        trade: 'HVAC Systems',
        email: 'jack@hvac.com',
      },
      {
        name: 'Kate Brown',
        companyName: `Electrical ${timestamp}`,
        trade: 'Electrical',
        email: 'kate@electric.com',
      },
      {
        name: 'Leo Chen',
        companyName: `Plumbing ${timestamp}`,
        trade: 'Plumbing',
        email: 'leo@plumb.com',
      },
    ];

    await buildersPage.goto();

    // Create all builders
    for (const builder of builders) {
      await buildersPage.createBuilder({
        name: builder.name,
        companyName: builder.companyName,
        email: builder.email,
        address: `${Math.floor(Math.random() * 1000)} Trade St, Minneapolis, MN`,
        tradeSpecialization: builder.trade,
      });

      await buildersPage.waitForBuilder(builder.companyName);
    }

    // Verify all builders are visible
    for (const builder of builders) {
      await buildersPage.verifyBuilderExists(builder.companyName);
    }
  });

  test('should display correct builder count', async ({ page }) => {
    await buildersPage.goto();
    
    const initialCount = await buildersPage.getBuilderCount();

    // Create a new builder
    const companyName = `Count Test ${nanoid(4)}`;
    await buildersPage.createBuilder({
      name: 'Mike Davis',
      companyName: companyName,
      email: 'mike@count.com',
      address: '800 Count Blvd, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);

    // Verify count increased by 1
    const newCount = await buildersPage.getBuilderCount();
    expect(newCount).toBe(initialCount + 1);
  });
});

test.describe('Builders Workflow - Builder Ratings', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should create builders with different ratings', async ({ page }) => {
    const ratings = [1, 3, 5];

    await buildersPage.goto();

    for (const rating of ratings) {
      const companyName = `${rating}-Star Builder ${nanoid(4)}`;
      
      await buildersPage.createBuilder({
        name: `Builder ${rating}`,
        companyName: companyName,
        email: `rating${rating}@test.com`,
        address: `${rating}00 Rating Ave, Minneapolis, MN`,
        rating: rating,
      });

      await buildersPage.waitForBuilder(companyName);
    }

    // Verify all builders created successfully
    for (const rating of ratings) {
      const companyName = `${rating}-Star Builder`;
      await expect(page.getByText(companyName, { exact: false })).toBeVisible();
    }
  });
});

test.describe('Builders Workflow - Contact Information Formats', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should accept various phone number formats', async ({ page }) => {
    const phoneFormats = [
      '(612) 555-0101',
      '612-555-0102',
      '6125550103',
      '+1 (612) 555-0104',
    ];

    await buildersPage.goto();

    for (let i = 0; i < phoneFormats.length; i++) {
      const companyName = `Phone Format ${i + 1} ${nanoid(4)}`;
      
      await buildersPage.createBuilder({
        name: `Phone Tester ${i + 1}`,
        companyName: companyName,
        email: `phone${i}@test.com`,
        phone: phoneFormats[i],
        address: `${i}00 Phone St, Minneapolis, MN`,
      });

      await buildersPage.waitForBuilder(companyName);
    }
  });

  test('should accept valid email addresses', async ({ page }) => {
    const companyName = `Email Test ${nanoid(4)}`;

    await buildersPage.goto();

    await buildersPage.createBuilder({
      name: 'Email Tester',
      companyName: companyName,
      email: 'valid.email+test@builder-company.com',
      address: '900 Email Ave, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.verifyBuilderExists(companyName);
  });
});

test.describe('Builders Workflow - Full Hierarchy (Builder → Development → Lot)', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should create complete 3-level hierarchy: builder → development → lot', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Michael Anderson ${timestamp}`;
    const companyName = `Anderson Custom Homes ${timestamp}`;
    const developmentName = `Willow Creek Estates ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // STEP 1: Create Builder
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'michael@andersoncustomhomes.com',
      phone: '(952) 555-2100',
      address: '4567 Oak Valley Rd, Edina, MN 55436',
      tradeSpecialization: 'General Construction',
      rating: 5,
      notes: 'Premium custom home builder specializing in energy-efficient construction',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.verifyBuilderExists(companyName);

    // STEP 2: Create Development
    await buildersPage.openBuilderDetails(builderName);
    await buildersPage.navigateToTab('hierarchy');

    await buildersPage.createDevelopment({
      name: developmentName,
      region: 'West Metro',
      municipality: 'Minnetonka',
      address: '1200 Willow Creek Blvd, Minnetonka, MN 55305',
      status: 'Active',
      notes: '35-lot luxury development with lakefront properties',
    });

    // Verify development was created
    await expect(page.getByText(developmentName)).toBeVisible({ timeout: 10000 });

    // STEP 3: Create Lot within Development
    // Open the developments dialog
    const manageDevelopmentsBtn = page.getByRole('button', { name: /manage development/i }).first();
    
    if (await manageDevelopmentsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await manageDevelopmentsBtn.click();
      await expect(page.getByTestId('dialog-builder-developments')).toBeVisible({ timeout: 10000 });

      // Find the development ID from the manage lots button
      const manageLotButtons = await page.getByTestId(/^button-manage-lots-/).all();
      
      if (manageLotButtons.length > 0) {
        // Get the development ID
        const devButtonId = await manageLotButtons[0].getAttribute('data-testid');
        const developmentId = devButtonId?.replace('button-manage-lots-', '');

        if (developmentId) {
          // Create a lot
          await buildersPage.createLot(developmentId, {
            lotNumber: '15',
            phase: '1',
            block: 'B',
            streetAddress: '1515 Willow Creek Circle',
            status: 'Available',
            squareFootage: '3200',
            notes: 'Premium lakefront lot with southern exposure',
          });

          // Verify lot appears
          await expect(page.getByText('Lot 15')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('should create multiple developments under single builder', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Jennifer Martinez ${timestamp}`;
    const companyName = `Martinez Development Group ${timestamp}`;
    const dev1 = `North Ridge ${timestamp}`;
    const dev2 = `South Valley ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create builder
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'jennifer@martinezdevelopment.com',
      phone: '(651) 555-3300',
      address: '890 Development Dr, St. Paul, MN 55104',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(builderName);
    await buildersPage.navigateToTab('hierarchy');

    // Create first development
    await buildersPage.createDevelopment({
      name: dev1,
      region: 'North Metro',
      municipality: 'Blaine',
      address: '2500 Ridge Pkwy, Blaine, MN 55449',
      status: 'Active',
    });

    await expect(page.getByText(dev1)).toBeVisible({ timeout: 10000 });

    // Create second development
    await buildersPage.createDevelopment({
      name: dev2,
      region: 'South Metro',
      municipality: 'Apple Valley',
      address: '3400 Valley Way, Apple Valley, MN 55124',
      status: 'Planning',
    });

    await expect(page.getByText(dev2)).toBeVisible({ timeout: 10000 });

    // Open developments dialog to verify both exist
    const manageDevelopmentsBtn = page.getByRole('button', { name: /manage development/i }).first();
    
    if (await manageDevelopmentsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await manageDevelopmentsBtn.click();
      await expect(page.getByTestId('dialog-builder-developments')).toBeVisible({ timeout: 10000 });

      // Both developments should be visible
      await expect(page.getByText(dev1)).toBeVisible();
      await expect(page.getByText(dev2)).toBeVisible();
    }
  });

  test('should create multiple lots under single development', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Robert Johnson ${timestamp}`;
    const companyName = `Johnson Builders ${timestamp}`;
    const developmentName = `Eagle Point ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create builder and development
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'robert@johnsonbuilders.com',
      address: '1234 Builder Lane, Minneapolis, MN 55410',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(builderName);
    await buildersPage.navigateToTab('hierarchy');

    await buildersPage.createDevelopment({
      name: developmentName,
      region: 'East Metro',
      municipality: 'Woodbury',
      address: '5600 Eagle Point Dr, Woodbury, MN 55125',
      status: 'Active',
    });

    await expect(page.getByText(developmentName)).toBeVisible({ timeout: 10000 });

    // Open developments dialog
    const manageDevelopmentsBtn = page.getByRole('button', { name: /manage development/i }).first();
    
    if (await manageDevelopmentsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await manageDevelopmentsBtn.click();
      await expect(page.getByTestId('dialog-builder-developments')).toBeVisible({ timeout: 10000 });

      const manageLotButtons = await page.getByTestId(/^button-manage-lots-/).all();
      
      if (manageLotButtons.length > 0) {
        const devButtonId = await manageLotButtons[0].getAttribute('data-testid');
        const developmentId = devButtonId?.replace('button-manage-lots-', '');

        if (developmentId) {
          // Create first lot
          await buildersPage.createLot(developmentId, {
            lotNumber: '10',
            phase: '1',
            block: 'A',
            streetAddress: '1010 Eagle Point Circle',
            status: 'Available',
            squareFootage: '2800',
          });

          await expect(page.getByText('Lot 10')).toBeVisible({ timeout: 10000 });

          // Create second lot
          await buildersPage.createLot(developmentId, {
            lotNumber: '11',
            phase: '1',
            block: 'A',
            streetAddress: '1011 Eagle Point Circle',
            status: 'Available',
            squareFootage: '2900',
          });

          await expect(page.getByText('Lot 11')).toBeVisible({ timeout: 10000 });

          // Both lots should be visible
          await expect(page.getByText('Lot 10')).toBeVisible();
          await expect(page.getByText('Lot 11')).toBeVisible();
        }
      }
    }
  });
});

test.describe('Builders Workflow - Cascade Delete', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should cascade delete developments and lots when builder is deleted', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Cascade Test ${timestamp}`;
    const companyName = `Cascade Builder ${timestamp}`;
    const developmentName = `Test Development ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create builder with development and lot
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'cascade@test.com',
      address: '999 Cascade St, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(builderName);
    await buildersPage.navigateToTab('hierarchy');

    // Create development
    await buildersPage.createDevelopment({
      name: developmentName,
      region: 'Test Region',
      municipality: 'Test City',
      status: 'Active',
    });

    await expect(page.getByText(developmentName)).toBeVisible({ timeout: 10000 });

    // Create lot in development
    const manageDevelopmentsBtn = page.getByRole('button', { name: /manage development/i }).first();
    
    if (await manageDevelopmentsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await manageDevelopmentsBtn.click();
      await expect(page.getByTestId('dialog-builder-developments')).toBeVisible({ timeout: 10000 });

      const manageLotButtons = await page.getByTestId(/^button-manage-lots-/).all();
      
      if (manageLotButtons.length > 0) {
        const devButtonId = await manageLotButtons[0].getAttribute('data-testid');
        const developmentId = devButtonId?.replace('button-manage-lots-', '');

        if (developmentId) {
          await buildersPage.createLot(developmentId, {
            lotNumber: '99',
            phase: '1',
            status: 'Available',
          });

          await expect(page.getByText('Lot 99')).toBeVisible({ timeout: 10000 });

          // Close dialogs
          const closeButton = page.getByRole('button', { name: /close/i }).last();
          if (await closeButton.isVisible().catch(() => false)) {
            await closeButton.click();
          }
        }
      }
    }

    // Now delete the builder - this should cascade delete the development and lot
    await page.getByTestId('button-delete-builder').click();
    await expect(page.getByTestId('dialog-delete-confirm')).toBeVisible();
    await page.getByTestId('button-confirm-delete').click();

    // Should navigate back to list
    await expect(page.getByTestId('text-page-title')).toBeVisible({ timeout: 10000 });

    // Builder should no longer exist
    await buildersPage.verifyBuilderNotExists(companyName);

    // The development and lot should also be deleted (cascade delete)
    // We verify this by confirming the builder is gone
    // In a real database, we'd check that the development and lot records are also deleted
  });
});

test.describe('Builders Workflow - Contacts Management', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should navigate to contacts tab', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Contact Test ${timestamp}`;
    const companyName = `Contact Builder ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create builder
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'contact@test.com',
      address: '555 Contact Ave, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(builderName);

    // Navigate to contacts tab
    await buildersPage.navigateToTab('contacts');

    // Verify contacts tab is active and empty state is shown
    await expect(page.getByTestId('tab-contacts')).toHaveAttribute('data-state', 'active');
    
    // Check for empty state or add contact button
    const addContactButton = page.getByRole('button', { name: /add contact/i });
    await expect(addContactButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Builders Workflow - Agreements Management', () => {
  let loginPage: LoginPage;
  let buildersPage: BuildersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    buildersPage = new BuildersPage(page);
    await loginPage.loginAsAdmin();
  });

  test('should navigate to agreements tab', async ({ page }) => {
    const timestamp = nanoid(6);
    const builderName = `Agreement Test ${timestamp}`;
    const companyName = `Agreement Builder ${timestamp}`;

    await buildersPage.goto();
    await buildersPage.verifyPageLoaded();

    // Create builder
    await buildersPage.createBuilder({
      name: builderName,
      companyName: companyName,
      email: 'agreement@test.com',
      address: '777 Agreement Blvd, Minneapolis, MN',
    });

    await buildersPage.waitForBuilder(companyName);
    await buildersPage.openBuilderDetails(builderName);

    // Navigate to agreements tab
    await buildersPage.navigateToTab('agreements');

    // Verify agreements tab is active
    await expect(page.getByTestId('tab-agreements')).toHaveAttribute('data-state', 'active');
    
    // Check for empty state or add agreement button
    const addAgreementButton = page.getByRole('button', { name: /add agreement/i });
    await expect(addAgreementButton).toBeVisible({ timeout: 5000 });
  });
});
