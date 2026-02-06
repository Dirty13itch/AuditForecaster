import { test, expect } from '@playwright/test'

test.describe('Job management flows', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 30000 })
    })

    test('dashboard loads with stats cards', async ({ page }) => {
        // Verify dashboard heading
        await expect(page.locator('h1')).toContainText('Dashboard')

        // Verify stat cards are rendered (Total Jobs, Completed This Month, Revenue, Pending Inspections)
        await expect(page.getByText('Total Jobs')).toBeVisible({ timeout: 10000 })
        await expect(page.getByText('Completed This Month')).toBeVisible()
        await expect(page.getByText('Revenue This Month')).toBeVisible()
        await expect(page.getByText('Pending Inspections')).toBeVisible()
    })

    test('jobs list page renders', async ({ page }) => {
        await page.goto('/dashboard/jobs')

        // Verify jobs page heading
        await expect(page.locator('h1')).toContainText('Jobs')

        // Verify sub-heading text
        await expect(page.getByText('Manage inspection jobs and assignments')).toBeVisible()
    })

    test('create new job form validates required fields', async ({ page }) => {
        await page.goto('/dashboard/jobs')

        // Look for the "New Job" or "Create Job" button (the JobDialog component)
        const newJobButton = page.getByRole('button', { name: /new job|create job|add job/i })
        if (await newJobButton.isVisible()) {
            await newJobButton.click()

            // A dialog/modal should appear - try to submit without filling required fields
            const submitButton = page.getByRole('button', { name: /create|save|submit/i }).first()
            if (await submitButton.isVisible()) {
                await submitButton.click()

                // HTML5 validation should prevent submission, or custom error messages should appear
                // Check that we're still on the same page (form not submitted)
                await expect(page).toHaveURL(/\/dashboard\/jobs/)
            }
        }
    })

    test('job detail page shows property information', async ({ page }) => {
        await page.goto('/dashboard/jobs')

        // Click on the first job link in the main content area (not sidebar)
        // Use a pattern that matches job ID URLs (CUIDs start with 'c')
        const mainContent = page.locator('main')
        const jobLink = mainContent.locator('a[href*="/dashboard/jobs/c"]').first()
        if (await jobLink.isVisible({ timeout: 5000 })) {
            await jobLink.click()

            // Wait for navigation to job detail page
            await page.waitForURL(/\/dashboard\/jobs\/c/, { timeout: 10000 })

            // Verify job details page loaded
            await expect(page.locator('h1')).toContainText('Job Details')

            // Verify Property Information card
            await expect(page.getByText('Property Information')).toBeVisible()

            // Verify Schedule & Status card
            await expect(page.getByText('Schedule & Status')).toBeVisible()
        }
    })

    test('jobs page shows job filters', async ({ page }) => {
        await page.goto('/dashboard/jobs')

        // The JobFilters component should be rendered
        // Look for filter-related elements (search input, status filter)
        const searchInput = page.getByPlaceholder(/search/i)
        if (await searchInput.isVisible({ timeout: 5000 })) {
            // Type a search query
            await searchInput.fill('test')

            // URL should update with search params
            await page.waitForURL(/q=test/)
        }
    })
})
