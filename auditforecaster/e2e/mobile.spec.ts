import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Admin Login
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Mobile Test Admin',
                        email: 'admin@example.com',
                        role: 'ADMIN',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }),
            });
        });

        // Mock Data for Mileage
        await page.route('**/api/finance/mileage/pending', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: '1', date: new Date().toISOString(), distance: 12.5, startLocation: 'Office', endLocation: 'Site A' },
                    { id: '2', date: new Date().toISOString(), distance: 5.2, startLocation: 'Site A', endLocation: 'Home' },
                ]),
            });
        });
    });

    test('should render mobile navigation', async ({ page }) => {
        await page.goto('/dashboard');
        const menuButton = page.getByLabel('Toggle menu');
        if (await menuButton.isVisible()) {
            await menuButton.click();
            await expect(page.locator('[role="dialog"]')).toBeVisible();
        }
    });

    test('should render components on Mobile Audit Page', async ({ page }) => {
        await page.goto('/dashboard/dev/mobile-audit');
        
        // Mileage Swipe
        await expect(page.locator('text=Mileage Swipe')).toBeVisible();
        await expect(page.locator('.cursor-grab').first()).toBeVisible();

        // Project Feed
        await expect(page.locator('text=Project Feed')).toBeVisible();
        await expect(page.locator('img').first()).toBeVisible();

        // Scenario Builder
        await expect(page.locator('text=Scenario Builder')).toBeVisible();
        await expect(page.locator('text=HERS Score Projection')).toBeVisible();

        // Action Item Dialog
        await expect(page.locator('text=Action Item Dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Open Action Item Dialog' }).click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        await expect(page.locator('text=Create Action Item')).toBeVisible();

        // Verify no horizontal overflow
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
    });
});
