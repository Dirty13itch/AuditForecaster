import { test, expect } from '@playwright/test';

test.describe('Financials & Logistics', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Admin Login
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Test Inspector',
                        email: 'inspector@example.com',
                        role: 'ADMIN', // Use ADMIN to access all areas
                        id: 'test-inspector-id'
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }),
            });
        });

        // Bypass Middleware Auth
        await page.setExtraHTTPHeaders({
            'x-e2e-bypass-auth': 'true'
        });
    });

    test('should load financials dashboard', async ({ page }) => {
        await page.goto('/dashboard/finances');
        await expect(page.locator('h2')).toContainText('Finances');
    });

    test('should load invoices', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices');
        await expect(page.locator('h1')).toContainText('Invoices');
        await expect(page.locator('text=INV-E2E-001')).toBeVisible();
    });

    test('should load payouts', async ({ page }) => {
        await page.goto('/dashboard/finances/payouts');
        await expect(page.locator('h2')).toContainText('Contractor Payouts');
        // Check for seeded payout amount or date if possible, or just the table
        await expect(page.locator('text=$500.00')).toBeVisible();
    });

    test('should load logistics dashboard', async ({ page }) => {
        await page.goto('/dashboard/logistics');
        await expect(page.locator('h1')).toContainText('Logistics');
    });

    test('should load fleet', async ({ page }) => {
        await page.goto('/dashboard/assets/fleet');
        await expect(page.locator('h1')).toContainText('Fleet');
        await expect(page.locator('text=E2E Truck')).toBeVisible();
    });

    test('should load equipment', async ({ page }) => {
        await page.goto('/dashboard/assets/equipment');
        await expect(page.locator('h1')).toContainText('Equipment');
        await expect(page.locator('text=E2E Blower Door')).toBeVisible();
    });
});
