import { test, expect } from '@playwright/test';

test.describe('Inspection Rejection Loop', () => {
    // Use a unique job ID or create one in a beforeAll hook if possible
    // For this E2E, we'll assume a clean state or use unique data
    const timestamp = Date.now();
    const jobAddress = `123 Test St ${timestamp}`;

    test('Inspector submits, QA rejects, Inspector fixes, QA approves', async ({ browser }) => {
        // 1. Inspector Context
        const inspectorContext = await browser.newContext();
        const inspectorPage = await inspectorContext.newPage();

        // Login as Inspector
        await inspectorPage.goto('/api/auth/signin');
        await inspectorPage.fill('input[name="email"]', 'inspector@example.com');
        await inspectorPage.fill('input[name="password"]', 'password123');
        await inspectorPage.click('button[type="submit"]');
        await expect(inspectorPage).toHaveURL(/\/dashboard/);

        // Create Job
        await inspectorPage.goto('/dashboard/jobs/new');
        await inspectorPage.fill('input[name="streetAddress"]', jobAddress);
        await inspectorPage.fill('input[name="city"]', 'Test City');
        await inspectorPage.fill('input[name="lotNumber"]', `Lot ${timestamp}`);
        // Select builder (assuming dropdown)
        await inspectorPage.selectOption('select[name="builderId"]', { index: 1 });
        await inspectorPage.click('button[type="submit"]');

        // Start Inspection
        await expect(inspectorPage.locator(`text=${jobAddress}`)).toBeVisible();
        await inspectorPage.click(`text=${jobAddress}`);
        await inspectorPage.click('text=Start Inspection');

        // Submit Inspection (Incomplete/Dummy)
        await inspectorPage.fill('input[name="cfm50"]', '1000');
        await inspectorPage.click('button:has-text("Submit")');
        await expect(inspectorPage.locator('text=Completed')).toBeVisible();

        // 2. QA Context
        const qaContext = await browser.newContext();
        const qaPage = await qaContext.newPage();

        // Login as QA
        await qaPage.goto('/api/auth/signin');
        await qaPage.fill('input[name="email"]', 'qa@example.com');
        await qaPage.fill('input[name="password"]', 'password123');
        await qaPage.click('button[type="submit"]');

        // Find Job in QA Dashboard
        await qaPage.goto('/dashboard/qa');
        await expect(qaPage.locator(`text=${jobAddress}`)).toBeVisible();
        await qaPage.click(`text=${jobAddress}`);

        // Reject Job
        await qaPage.click('button:has-text("Reject")');
        await qaPage.fill('textarea[name="reason"]', 'Missing photos of blower door');
        await qaPage.click('button:has-text("Confirm Rejection")');

        // 3. Inspector Context (Verify Rejection)
        await inspectorPage.reload();
        await expect(inspectorPage.locator('text=Rejected')).toBeVisible();
        await expect(inspectorPage.locator('text=Missing photos of blower door')).toBeVisible();

        // Resubmit
        await inspectorPage.click('text=Resume Inspection');
        await inspectorPage.fill('textarea[name="notes"]', 'Added photos');
        await inspectorPage.click('button:has-text("Submit")');

        // 4. QA Context (Approve)
        await qaPage.reload();
        await qaPage.click(`text=${jobAddress}`);
        await qaPage.click('button:has-text("Approve")');

        // Verify Status
        await expect(qaPage.locator('text=Invoiced')).toBeVisible(); // or Approved
    });
});
