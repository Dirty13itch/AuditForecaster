import { test, expect } from '@playwright/test'

test.describe('Finance flows', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 30000 })
    })

    test('invoices page renders', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices')

        // Verify invoices page heading
        await expect(page.locator('h1')).toContainText('Invoices')

        // Verify sub-heading
        await expect(page.getByText('Manage and track builder invoices')).toBeVisible()

        // Verify the Create Invoice button is present
        await expect(page.getByRole('link', { name: /create invoice/i })).toBeVisible()

        // Verify the Recent Invoices card header
        await expect(page.getByText('Recent Invoices')).toBeVisible()
    })

    test('invoices table renders with headers', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices')

        // Verify table column headers
        await expect(page.getByRole('columnheader', { name: /invoice/i })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: /builder/i })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible()
    })

    test('create invoice link navigates to creation form', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices')

        // Click the Create Invoice button
        await page.getByRole('link', { name: /create invoice/i }).click()

        // Should navigate to invoice creation page
        await page.waitForURL('/dashboard/finances/invoices/create', { timeout: 10000 })
    })

    test('invoice detail page loads when clicking an invoice', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices')

        // Click on the first invoice link if available (exclude "create" links)
        const invoiceLink = page.locator('a[href*="/dashboard/finances/invoices/c"]:not([href*="create"])').first()
        if (await invoiceLink.isVisible({ timeout: 5000 })) {
            await invoiceLink.click()

            // Should navigate to invoice detail page
            await page.waitForURL(/\/dashboard\/finances\/invoices\/c/, { timeout: 10000 })

            // Verify back link is present
            await expect(page.getByText('Back to Invoices')).toBeVisible()

            // Verify Download PDF button
            await expect(page.getByText('Download PDF')).toBeVisible()
        }
    })

    test('export button triggers download', async ({ page }) => {
        await page.goto('/dashboard/finances/invoices')

        // Look for an Export CSV button on the page
        const exportButton = page.getByRole('button', { name: /export csv/i })
        if (await exportButton.isVisible({ timeout: 3000 })) {
            // Set up download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 })

            await exportButton.click()

            // Verify a download was triggered
            const download = await downloadPromise
            expect(download.suggestedFilename()).toContain('.csv')
        }
    })
})
