import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 10000 })
    })

    test('sidebar navigation shows core menu items', async ({ page }) => {
        // Verify sidebar is visible on desktop
        const sidebar = page.locator('aside')
        await expect(sidebar).toBeVisible()

        // Verify core navigation items are present
        await expect(sidebar.getByText('Dashboard')).toBeVisible()
        await expect(sidebar.getByText('Jobs')).toBeVisible()
        await expect(sidebar.getByText('Finances')).toBeVisible()
        await expect(sidebar.getByText('Settings')).toBeVisible()

        // Verify the company name in the sidebar header
        await expect(sidebar.getByText('Ulrich Energy')).toBeVisible()
    })

    test('sidebar navigation navigates to Jobs page', async ({ page }) => {
        // Click on Jobs in the sidebar
        const sidebar = page.locator('aside')
        await sidebar.getByText('Jobs').click()

        // Should expand the Jobs submenu - click "All Jobs"
        await sidebar.getByText('All Jobs').click()

        // Should navigate to the jobs page
        await page.waitForURL('/dashboard/jobs', { timeout: 10000 })
        await expect(page.locator('h1')).toContainText('Jobs')
    })

    test('sidebar navigation navigates to Finances section', async ({ page }) => {
        // Click on Finances in the sidebar to expand it
        const sidebar = page.locator('aside')
        await sidebar.getByText('Finances').click()

        // Should show Invoices submenu item
        await expect(sidebar.getByText('Invoices')).toBeVisible()

        // Click on Invoices
        await sidebar.getByText('Invoices').click()

        // Should navigate to the invoices page
        await page.waitForURL('/dashboard/finances/invoices', { timeout: 10000 })
        await expect(page.locator('h1')).toContainText('Invoices')
    })

    test('sidebar navigation navigates to Settings page', async ({ page }) => {
        // Click on Settings in the sidebar
        const sidebar = page.locator('aside')
        await sidebar.getByText('Settings').click()

        // Should show Profile submenu
        await expect(sidebar.getByText('Profile')).toBeVisible()

        // Click Profile
        await sidebar.getByText('Profile').click()

        await page.waitForURL('/dashboard/settings', { timeout: 10000 })
    })

    test('command palette opens with Cmd+K', async ({ page }) => {
        // Press Cmd+K (or Ctrl+K on non-Mac) to open command palette
        await page.keyboard.press('Control+k')

        // The command palette dialog should appear
        const palette = page.locator('[role="dialog"][aria-label="Command palette"]')
        await expect(palette).toBeVisible({ timeout: 3000 })

        // Verify the search input is present and focused
        const searchInput = palette.getByRole('combobox', { name: /search commands/i })
        await expect(searchInput).toBeVisible()
        await expect(searchInput).toBeFocused()

        // Verify command items are listed
        const listbox = palette.locator('[role="listbox"]')
        await expect(listbox).toBeVisible()

        // Verify some navigation items appear
        await expect(palette.getByRole('option', { name: /dashboard/i })).toBeVisible()
        await expect(palette.getByRole('option', { name: /jobs/i })).toBeVisible()
    })

    test('command palette filters results when typing', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Control+k')

        const palette = page.locator('[role="dialog"][aria-label="Command palette"]')
        await expect(palette).toBeVisible({ timeout: 3000 })

        // Type a search query
        const searchInput = palette.getByRole('combobox', { name: /search commands/i })
        await searchInput.fill('invoices')

        // Should filter to show Invoices option
        await expect(palette.getByRole('option', { name: /invoices/i })).toBeVisible()
    })

    test('command palette navigates when selecting an item', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Control+k')

        const palette = page.locator('[role="dialog"][aria-label="Command palette"]')
        await expect(palette).toBeVisible({ timeout: 3000 })

        // Type to filter and select Jobs
        const searchInput = palette.getByRole('combobox', { name: /search commands/i })
        await searchInput.fill('Jobs')

        // Click the Jobs option
        await palette.getByRole('option', { name: /jobs/i }).first().click()

        // Should navigate to jobs page
        await page.waitForURL('/dashboard/jobs', { timeout: 10000 })
        await expect(page.locator('h1')).toContainText('Jobs')
    })

    test('command palette closes with Escape', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('Control+k')

        const palette = page.locator('[role="dialog"][aria-label="Command palette"]')
        await expect(palette).toBeVisible({ timeout: 3000 })

        // Press Escape to close
        await page.keyboard.press('Escape')

        // Palette should be hidden
        await expect(palette).not.toBeVisible()
    })

    test('breadcrumbs navigate correctly on job detail page', async ({ page }) => {
        // Navigate to jobs first
        await page.goto('/dashboard/jobs')

        // Click on a job if available
        const jobLink = page.locator('a[href*="/dashboard/jobs/"]').first()
        if (await jobLink.isVisible({ timeout: 5000 })) {
            await jobLink.click()
            await page.waitForURL(/\/dashboard\/jobs\//, { timeout: 10000 })

            // Look for a back/breadcrumb link to Jobs
            const backLink = page.getByRole('link', { name: /jobs/i }).first()
            if (await backLink.isVisible({ timeout: 3000 })) {
                await backLink.click()
                await page.waitForURL('/dashboard/jobs', { timeout: 10000 })
                await expect(page.locator('h1')).toContainText('Jobs')
            }
        }
    })

    test('sign out button is visible in sidebar', async ({ page }) => {
        const sidebar = page.locator('aside')
        await expect(sidebar.getByRole('button', { name: /sign out/i })).toBeVisible()
    })
})
