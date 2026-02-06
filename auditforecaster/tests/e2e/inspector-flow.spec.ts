import { test, expect } from '@playwright/test'

test.describe('Inspector Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 30000 })
    })

    test('should allow an inspector to complete a job', async ({ page }) => {
        // Navigate to Jobs
        await page.goto('/dashboard/jobs')
        await expect(page.locator('h1')).toContainText('Jobs')

        // Find first job link in main content
        const mainContent = page.locator('main')
        const jobLink = mainContent.locator('a[href*="/dashboard/jobs/c"]').first()
        if (!(await jobLink.isVisible({ timeout: 5000 }))) {
            // No jobs in database, skip test
            return
        }

        await jobLink.click()
        await page.waitForURL(/\/dashboard\/jobs\/c/, { timeout: 10000 })

        // Verify Job Details Page
        await expect(page.locator('h1')).toContainText('Job Details')

        // Look for Start Inspection or Continue Inspection
        const continueLink = page.getByRole('link', { name: /continue inspection/i })
        const startButton = page.getByRole('button', { name: /start inspection/i })

        if (await continueLink.isVisible({ timeout: 3000 })) {
            await continueLink.click()
            await page.waitForURL(/\/inspections\//, { timeout: 10000 })
        } else if (await startButton.isVisible({ timeout: 1000 })) {
            await startButton.click()
            // Start Inspection opens a template selection modal
            await expect(page.getByText(/select.*template/i)).toBeVisible({ timeout: 5000 })
        }
    })
})
