import { test, expect } from '@playwright/test';

test.describe('Functional Critical Flows', () => {
    test.beforeEach(async ({ page }) => {
        // Real Admin Login
        await page.goto('/dashboard');

        // Check if we are redirected to login
        const url = page.url();
        if (url.includes('/login')) {
            await page.getByLabel('Email').fill('admin@example.com');
            await page.getByLabel('Password').fill('password123');
            await page.getByRole('button', { name: 'Sign In' }).click();
        }

        // Wait for dashboard to load by checking for a key element
        await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 30000 });
        await expect(page).toHaveURL('/dashboard');
    });

    test('should create a new job successfully', async ({ page }) => {
        test.setTimeout(60000);
        page.on('console', msg => console.log(`JOB TEST LOG: ${msg.text()}`));
        await page.goto('/dashboard/jobs');

        // Open Dialog
        await page.getByRole('button', { name: 'New Job' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill Form
        await page.getByLabel('Lot Number').fill('999');
        await page.getByLabel('City').fill('Test City');
        await page.getByLabel('Street Address').fill('999 Functional Test St');

        // Select Builder
        await page.click('button[role="combobox"]:has-text("Select Builder")');
        await page.click('div[role="option"]:has-text("Test Builder")');

        // Select Date
        await page.getByLabel('Date').fill(new Date().toISOString().split('T')[0]);

        // Submit
        await page.getByRole('button', { name: 'Schedule Job' }).click();

        // Check for validation errors
        const validationErrors = page.locator('.text-destructive');
        if (await validationErrors.count() > 0) {
            const errors = await validationErrors.allInnerTexts();
            console.log('Validation Errors:', errors);
        }

        // Check for success OR error
        const success = page.getByText('Job scheduled');
        const error = page.getByText('Failed to schedule job locally');

        await expect(success.or(error)).toBeVisible();

        if (await error.isVisible()) {
            throw new Error('Job creation failed with error toast');
        }

        // Verify in List (reload to be sure, though it should update)
        await page.reload();
        await expect(page.getByText('999 Functional Test St')).toBeVisible();
    });

    test('should load inspection runner for existing inspection', async ({ page }) => {
        test.setTimeout(60000);
        page.on('console', msg => console.log(`RUNNER LOG: ${msg.text()}`));

        // Use the seeded inspection ID
        await page.goto('/inspections/e2e-test-inspection/run');

        // Verify Header
        await expect(page.locator('h1')).toContainText('Standard Energy Audit');

        // Verify Sections
        await expect(page.getByText('Air Barrier')).toBeVisible();
        await expect(page.getByText('Windows and doors properly sealed')).toBeVisible();
    });
});
