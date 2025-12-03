import { test, expect } from '@playwright/test';

test.describe('Inspection Runner', () => {
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
                        role: 'INSPECTOR',
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

    test('should load inspection runner and handle offline mode', async ({ page }) => {
        // 1. Navigate to a mock inspection
        await page.goto('/inspections/e2e-test-inspection/run');

        // 2. Verify UI elements
        await expect(page.locator('h1')).toContainText('E2E Inspection Template');

        // 3. Simulate Offline Mode
        await page.context().setOffline(true);
        await expect(page.locator('text=Offline')).toBeVisible();

        // 4. Fill form (should save to local storage/IndexedDB)
        // Note: This requires knowing the exact form fields. 
        // For now, we check if the offline indicator appears.

        // 5. Simulate Online Mode
        await page.context().setOffline(false);
        await expect(page.locator('text=Offline')).toBeHidden();
    });
});
