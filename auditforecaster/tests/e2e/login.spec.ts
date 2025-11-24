import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Ulrich Energy/);
});

test('login form is present', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
