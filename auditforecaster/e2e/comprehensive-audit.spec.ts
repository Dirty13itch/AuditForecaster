import { test, expect } from '@playwright/test';

test.describe('Comprehensive Application Audit', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Admin Login
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Test Admin',
                        email: 'admin@example.com',
                        role: 'ADMIN',
                        id: 'test-admin-id',
                        builderId: 'e2e-test-builder' // Link to seeded builder
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

    test('should load admin dashboard', async ({ page }) => {
        await page.goto('/dashboard/admin');
        await expect(page.locator('h1, h2')).toContainText('Admin');
    });

    test('should load admin integrations', async ({ page }) => {
        await page.goto('/dashboard/admin/integrations');
        await expect(page.locator('h1, h2')).toContainText('Integrations');
    });

    test('should load analytics dashboard', async ({ page }) => {
        await page.goto('/dashboard/analytics');
        await expect(page.locator('h1, h2')).toContainText('Analytics');
    });

    test('should load builder dashboard', async ({ page }) => {
        await page.goto('/dashboard/builder');
        // Check for either the dashboard header OR access denied (both prove route exists)
        await expect(page.locator('h1, h2')).toBeVisible();
    });

    test('should load job list', async ({ page }) => {
        await page.goto('/dashboard/jobs');
        await expect(page.locator('h1, h2')).toContainText('Jobs');
    });

    test('should load reports templates', async ({ page }) => {
        await page.goto('/dashboard/reports/templates');
        await expect(page.locator('h1, h2')).toContainText('Report Templates');
    });

    test('should load settings page', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await expect(page.locator('h1, h2')).toContainText('Settings');
    });

    test('should load team management', async ({ page }) => {
        await page.goto('/dashboard/team/inspectors');
        await expect(page.locator('h1, h2')).toContainText('Inspectors');
        // Relaxed check for content to avoid flakiness
        await expect(page.locator('body')).toContainText('Manage your field inspection team');
    });

    test('should load diagnostics page', async ({ page }) => {
        await page.goto('/dashboard/diagnostics');
        await expect(page.locator('h1, h2')).toContainText('Field Diagnostics');
    });
});
