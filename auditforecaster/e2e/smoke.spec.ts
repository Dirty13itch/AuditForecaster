import { test, expect } from '@playwright/test';

const routes = [
    '/dashboard',
    '/dashboard/admin',
    '/dashboard/admin/health',
    '/dashboard/admin/integrations',
    '/dashboard/analytics',
    '/dashboard/analytics/advanced',
    '/dashboard/analytics/reports',
    '/dashboard/assets',
    '/dashboard/assets/equipment',
    '/dashboard/assets/fleet',
    '/dashboard/builder',
    '/dashboard/builder/jobs',
    '/dashboard/builder/plans',
    '/dashboard/builder/schedule',
    '/dashboard/builders',
    '/dashboard/builders/plans',
    '/dashboard/contractors',
    '/dashboard/dev/progress',
    '/dashboard/diagnostics',
    '/dashboard/finances',
    '/dashboard/finances/invoices',
    '/dashboard/finances/payouts',
    '/dashboard/finances/profitability',
    '/dashboard/finances/tax-credits',
    '/dashboard/health',
    '/dashboard/help',
    '/dashboard/jobs',
    '/dashboard/logistics',
    '/dashboard/logistics/mileage',
    '/dashboard/logistics/routes',
    '/dashboard/qa',
    '/dashboard/reports/templates',
    '/dashboard/settings',
    '/dashboard/settings/pricing',
    '/dashboard/team',
    '/dashboard/team/inspectors',
    '/dashboard/team/users',
    '/legal/privacy',
    '/legal/terms',
    '/offline',
];

test.describe('Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Admin Login for full access
        await page.route('**/api/auth/session', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        name: 'Smoke Test Admin',
                        email: 'admin@example.com',
                        role: 'ADMIN',
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

    for (const route of routes) {
        test(`should load ${route}`, async ({ page }) => {
            console.log(`Visiting ${route}...`);
            const response = await page.goto(route);

            // Check for 200 OK (or 304 Not Modified)
            // Some pages might redirect (3xx), which is also fine usually, but we want to ensure no 500s
            if (response) {
                if (response.status() >= 400) {
                    console.log(`Failed to load ${route}: ${response.status()}`);
                }
                expect(response.status(), `Failed to load ${route} with status ${response.status()}`).toBeLessThan(400);
            } else {
                throw new Error(`Failed to load ${route}: No response`);
            }

            // Check for common error indicators on the page
            await expect(page.locator('text=Application Error')).not.toBeVisible();
            await expect(page.locator('text=Something went wrong')).not.toBeVisible();
        });
    }
});
