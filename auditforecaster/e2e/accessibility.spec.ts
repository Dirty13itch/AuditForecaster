import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';

test.describe('Accessibility Audit', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/dashboard');

        // Check if we are redirected to login
        const url = page.url();
        if (url.includes('/login')) {
            await page.getByLabel('Email').fill('admin@example.com');
            await page.getByLabel('Password').fill('password123');
            await page.getByRole('button', { name: 'Sign In' }).click();
        }

        await page.waitForTimeout(3000); // Wait for redirect/load
        await expect(page).toHaveURL('/dashboard', { timeout: 30000 });
    });

    test('should pass accessibility checks on Dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        if (accessibilityScanResults.violations.length > 0) {
            fs.writeFileSync('accessibility_violations_dashboard.json', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }
        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass accessibility checks on Jobs Page', async ({ page }) => {
        await page.goto('/dashboard/jobs');
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        if (accessibilityScanResults.violations.length > 0) {
            fs.writeFileSync('accessibility_violations_jobs.json', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }
        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass accessibility checks on Job Creation Dialog', async ({ page }) => {
        await page.goto('/dashboard/jobs');
        await page.getByRole('button', { name: 'New Job' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        const accessibilityScanResults = await new AxeBuilder({ page })
            .include('[role="dialog"]')
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            fs.writeFileSync('accessibility_violations_job_dialog.json', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }
        expect(accessibilityScanResults.violations).toEqual([]);
    });
});
