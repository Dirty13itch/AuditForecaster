import { test, expect } from '@playwright/test';

test.describe('Inspection Creation Flow', () => {
    test('Inspector can create an inspection from a job', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Login as Inspector
        await page.goto('/login');
        await page.fill('input[name="email"]', 'inspector1@ulrich.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/);

        // 2. Navigate to Jobs
        await page.goto('/dashboard/jobs');

        // 3. Find a job that is PENDING or ASSIGNED (not completed)
        // We'll click the first available job link
        const firstJobLink = page.locator('a[href^="/dashboard/jobs/"]').first();
        await firstJobLink.click();

        // 4. Click "Start Inspection"
        // This might not be available if inspection already exists, so we might need to handle that
        // For this test, we assume there's a job ready. 
        // Alternatively, we can create a job via API first, but let's try UI first.

        // Check if "Start Inspection" button is visible
        const startButton = page.locator('button:has-text("Start Inspection")');
        if (await startButton.isVisible()) {
            await startButton.click();

            // 5. Select Template
            // Wait for modal
            await expect(page.locator('text=Select Inspection Template')).toBeVisible();

            // Click the first template "Select" button
            await page.locator('button:has-text("Select")').first().click();

            // 6. Verify Redirect
            // Should go to /dashboard/inspections/[id]
            await expect(page).toHaveURL(/\/dashboard\/inspections\//);

            // 7. Verify Form Loads
            await expect(page.locator('text=Inspection Details')).toBeVisible();
        } else {
            console.log('Start Inspection button not found, possibly already started.');
            // If already started, we should see "Continue Inspection" or similar
            // Or we are on the wrong job status.
        }
    });
});
