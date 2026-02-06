import { test, expect } from '@playwright/test'

test.describe('Authentication flows', () => {
    test('login page renders with form fields', async ({ page }) => {
        await page.goto('/login')

        // Verify the page title and heading
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

        // Verify form fields are present
        await expect(page.getByLabel('Email')).toBeVisible()
        await expect(page.getByLabel('Password')).toBeVisible()
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

        // Verify forgot password link
        await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    })

    test('login with valid credentials redirects to dashboard', async ({ page }) => {
        await page.goto('/login')

        // Fill in credentials (demo credentials from login page)
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')

        // Submit the form
        await page.getByRole('button', { name: /sign in/i }).click()

        // Should redirect to dashboard
        await page.waitForURL('/dashboard', { timeout: 30000 })
        await expect(page).toHaveURL('/dashboard')

        // Dashboard should show heading
        await expect(page.locator('h1')).toContainText('Dashboard')
    })

    test('login with invalid credentials shows error', async ({ page }) => {
        await page.goto('/login')

        // Fill in invalid credentials
        await page.getByLabel('Email').fill('invalid@example.com')
        await page.getByLabel('Password').fill('wrongpassword')

        // Submit the form
        await page.getByRole('button', { name: /sign in/i }).click()

        // Should stay on login page and show error message
        await expect(page.locator('.flex.h-8[aria-live="polite"]')).toContainText(/.+/, { timeout: 5000 })
        await expect(page).toHaveURL(/\/login/)
    })

    test('logout redirects to login page', async ({ page }) => {
        // Log in first
        await page.goto('/login')
        await page.getByLabel('Email').fill('admin@ulrich.com')
        await page.getByLabel('Password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await page.waitForURL('/dashboard', { timeout: 30000 })

        // Click the Sign Out button in the sidebar (force to bypass dev overlay)
        await page.getByRole('button', { name: /sign out/i }).click({ force: true })

        // Should redirect to login page
        await page.waitForURL(/\/login/, { timeout: 10000 })
        await expect(page).toHaveURL(/\/login/)
    })

    test('protected routes redirect unauthenticated users', async ({ page }) => {
        // Try to access dashboard without logging in
        await page.goto('/dashboard')

        // Should be redirected to login or signin page
        await expect(page).toHaveURL(/\/(login|api\/auth\/signin)/)
    })

    test('protected routes redirect to login for jobs page', async ({ page }) => {
        await page.goto('/dashboard/jobs')
        await expect(page).toHaveURL(/\/(login|api\/auth\/signin)/)
    })

    test('protected routes redirect to login for inspections page', async ({ page }) => {
        await page.goto('/dashboard/inspections')
        await expect(page).toHaveURL(/\/(login|api\/auth\/signin)/)
    })
})
