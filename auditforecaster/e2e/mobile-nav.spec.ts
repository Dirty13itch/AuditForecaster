import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('Hamburger menu opens sidebar on mobile', async ({ page }) => {
        // 1. Login
        console.log('Navigating to login...');
        await page.goto('/login');
        console.log('Filling credentials...');
        await page.fill('input[name="email"]', 'admin@ulrich.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        console.log('Waiting for dashboard URL...');
        await expect(page).toHaveURL(/\/dashboard/);
        console.log('Dashboard loaded.');

        // 2. Verify Sidebar is hidden (desktop sidebar)
        const hamburger = page.locator('button:has-text("Toggle menu")');

        console.log('Checking hamburger visibility...');
        await expect(hamburger).toBeVisible();
        console.log('Hamburger visible. Clicking...');

        // 3. Click Hamburger
        await hamburger.click();

        // 4. Verify Sheet Content
        const dashboardLink = page.locator('a[href="/dashboard"]').first();
        console.log('Checking dashboard link visibility in sheet...');
        await expect(dashboardLink).toBeVisible();
        console.log('Dashboard link visible.');

        // 5. Verify we can navigate
        await dashboardLink.click();
        await expect(page).toHaveURL('/dashboard');
    });
});
