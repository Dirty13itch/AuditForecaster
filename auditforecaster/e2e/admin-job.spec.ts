import { test, expect } from '@playwright/test';

test.describe('Admin Job Creation', () => {
    test('Admin can create a job', async ({ page }) => {
        // Mock Admin Login
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Admin User',
                        email: 'admin@example.com',
                        role: 'ADMIN',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }),
            });
        });

        await page.goto('/dashboard/jobs');

        // Check for "Create Job" button (should be visible for Admin)
        await expect(page.getByRole('button', { name: 'Create Job' })).toBeVisible();

        // Open dialog
        await page.getByRole('button', { name: 'Create Job' }).click();

        // Fill form
        await page.getByLabel('Builder').selectOption({ index: 1 }); // Select first builder
        await page.getByLabel('Lot Number').fill('999');
        await page.getByLabel('Street Address').fill('999 Test St');
        await page.getByLabel('City').fill('Test City');

        // Submit
        await page.getByRole('button', { name: 'Create Job' }).click();

        // Verify success toast or redirection
        // Note: This depends on actual implementation, assuming toast for now
        await expect(page.getByText('Job created successfully')).toBeVisible();
    });

    test('Inspector cannot see Create Job button', async ({ page }) => {
        // Mock Inspector Login
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Inspector User',
                        email: 'inspector@example.com',
                        role: 'INSPECTOR',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }),
            });
        });

        await page.goto('/dashboard/jobs');

        // Check for "Create Job" button (should NOT be visible)
        await expect(page.getByRole('button', { name: 'Create Job' })).not.toBeVisible();
    });
});
