import { test, expect } from '@playwright/test'

test.describe('Inspection flows', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 10000 })
    })

    test('inspections list page renders', async ({ page }) => {
        await page.goto('/dashboard/inspections')

        // Verify inspections page heading
        await expect(page.locator('h1')).toContainText('Inspections')

        // Verify the description text
        await expect(page.getByText('View and manage energy audit inspections')).toBeVisible()

        // Verify the inspection count summary is shown
        await expect(page.getByText(/\d+ inspections? found/)).toBeVisible({ timeout: 10000 })
    })

    test('inspections page shows cards or empty state', async ({ page }) => {
        await page.goto('/dashboard/inspections')

        // Wait for page to load
        await expect(page.locator('h1')).toContainText('Inspections')

        // Either inspection cards are shown or the empty state message
        const hasInspections = await page.getByText(/\d+ inspections? found/).textContent()
        const count = parseInt(hasInspections?.match(/\d+/)?.[0] || '0')

        if (count > 0) {
            // Inspection cards should be visible
            const cards = page.locator('[class*="Card"]')
            await expect(cards.first()).toBeVisible()
        } else {
            // Empty state message
            await expect(page.getByText('No inspections found')).toBeVisible()
        }
    })

    test('inspection form loads for a job', async ({ page }) => {
        // Navigate to jobs first to find one to inspect
        await page.goto('/dashboard/jobs')

        // Click on the first job link if available
        const jobLink = page.locator('a[href*="/dashboard/jobs/"]').first()
        if (await jobLink.isVisible({ timeout: 5000 })) {
            await jobLink.click()

            // Verify job details page loaded
            await expect(page.locator('h1')).toContainText('Job Details')

            // Look for Start Inspection or Continue Inspection button
            const inspectionButton = page.getByRole('button', { name: /start inspection|continue inspection/i })
            if (await inspectionButton.isVisible({ timeout: 3000 })) {
                await inspectionButton.click()

                // Should navigate to inspection form
                await page.waitForURL(/\/inspections\//, { timeout: 10000 })
            }
        }
    })

    test('inspection detail page loads when clicking an inspection', async ({ page }) => {
        await page.goto('/dashboard/inspections')

        // Click on the first inspection card link if available
        const inspectionLink = page.locator('a[href*="/dashboard/inspections/"]').first()
        if (await inspectionLink.isVisible({ timeout: 5000 })) {
            await inspectionLink.click()

            // Should navigate to inspection detail page
            await page.waitForURL(/\/dashboard\/inspections\//, { timeout: 10000 })
        }
    })
})
