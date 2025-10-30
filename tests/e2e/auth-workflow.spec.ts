import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication Workflow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('admin user can login successfully', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    
    // Verify redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify user profile is visible
    await loginPage.verifyLoggedIn();
    
    // Verify admin role badge is displayed
    await loginPage.verifyRole('admin');
    
    // Verify user email is displayed
    const userEmail = page.getByTestId('user-email');
    await expect(userEmail).toBeVisible();
    await expect(userEmail).toContainText('@');
  });

  test('inspector user can login successfully', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAsInspector();
    
    // Verify redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify user profile is visible
    await loginPage.verifyLoggedIn();
    
    // Verify inspector role badge is displayed
    await loginPage.verifyRole('inspector');
    
    // Verify user email is displayed
    const userEmail = page.getByTestId('user-email');
    await expect(userEmail).toBeVisible();
  });

  test('user can logout successfully', async ({ page }) => {
    // Login first
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    
    // Click logout button
    await loginPage.clickLogoutButton();
    
    // Verify redirected to landing page
    await loginPage.verifyLoggedOut();
    
    // Verify login button is visible
    const loginButton = page.getByTestId('button-login');
    await expect(loginButton).toBeVisible();
  });

  test('admin can access admin-only pages - diagnostics', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to admin diagnostics page
    await page.goto('/admin/diagnostics');
    
    // Verify page loads successfully (not redirected)
    await expect(page).toHaveURL('/admin/diagnostics');
    
    // Verify page content is visible (no 403 error)
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('admin can access audit logs page', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to audit logs page
    await page.goto('/audit-logs');
    
    // Verify page loads successfully
    await expect(page).toHaveURL('/audit-logs');
    
    // Verify page content is visible
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('inspector cannot access admin diagnostics page', async ({ page }) => {
    await loginPage.loginAsInspector();
    await expect(page).toHaveURL('/dashboard');
    
    // Try to navigate to admin diagnostics page
    await page.goto('/admin/diagnostics');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Assert either redirected away OR shows access denied message
    const currentUrl = page.url();
    
    if (currentUrl.includes('/admin/diagnostics')) {
      // If still on diagnostics page, there must be an access denied message
      await expect(
        page.getByText(/access denied|unauthorized|forbidden|you don't have permission/i)
      ).toBeVisible();
      
      // Verify admin-only controls are NOT visible
      const adminPanel = page.getByTestId('admin-panel');
      if (await adminPanel.count() > 0) {
        await expect(adminPanel).not.toBeVisible();
      }
    } else {
      // Verify redirected to an appropriate page (not admin diagnostics)
      expect(currentUrl).not.toContain('/admin/diagnostics');
      
      // Should be on dashboard, access-denied, or landing page
      expect(
        currentUrl.includes('/dashboard') || 
        currentUrl.includes('/access-denied') || 
        currentUrl.includes('/unauthorized') ||
        currentUrl === '/'
      ).toBe(true);
    }
  });

  test('unauthenticated user redirected to landing page', async ({ page }) => {
    // Clear session by visiting logout
    await page.goto('/api/logout');
    
    // Wait for redirect to landing
    await page.waitForURL('/');
    
    // Try to access protected page (dashboard)
    await page.goto('/dashboard');
    
    // Should be redirected back to landing page
    await expect(page).toHaveURL('/');
    
    // Verify login button is visible
    await loginPage.verifyLoggedOut();
  });

  test('session persists across page refresh', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Verify logged in
    await loginPage.verifyLoggedIn();
    await loginPage.verifyRole('admin');
    
    // Refresh the page
    await page.reload();
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify still logged in
    await loginPage.verifyLoggedIn();
    await loginPage.verifyRole('admin');
    
    // Verify still on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('session expires after logout', async ({ page }) => {
    // Login first
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    
    // Logout
    await loginPage.clickLogoutButton();
    await loginPage.verifyLoggedOut();
    
    // Try to access protected page
    await page.goto('/jobs');
    
    // Should be redirected to landing page
    await expect(page).toHaveURL('/');
    await loginPage.verifyLoggedOut();
  });

  test('admin sees admin-only UI elements in sidebar', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Open sidebar
    const sidebarTrigger = page.getByTestId('button-sidebar-toggle');
    await sidebarTrigger.click();
    
    // Verify admin-only menu items are visible (Playwright auto-waits)
    await loginPage.verifySidebarItemVisible('diagnostics');
    
    // Verify audit logs is visible (admin and manager can see it)
    await loginPage.verifySidebarItemVisible('audit logs');
  });

  test('inspector does not see admin-only UI elements in sidebar', async ({ page }) => {
    await loginPage.loginAsInspector();
    await expect(page).toHaveURL('/dashboard');
    
    // Open sidebar
    const sidebarTrigger = page.getByTestId('button-sidebar-toggle');
    await sidebarTrigger.click();
    
    // Verify admin-only menu items are NOT visible (Playwright auto-waits)
    await loginPage.verifySidebarItemNotVisible('diagnostics');
    
    // Verify audit logs is NOT visible for inspector
    await loginPage.verifySidebarItemNotVisible('audit logs');
  });

  test('multiple login-logout cycles work correctly', async ({ page }) => {
    // First login as admin
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    await loginPage.verifyRole('admin');
    
    // Logout
    await loginPage.clickLogoutButton();
    await loginPage.verifyLoggedOut();
    
    // Login as inspector
    await loginPage.loginAsInspector();
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    await loginPage.verifyRole('inspector');
    
    // Logout again
    await loginPage.clickLogoutButton();
    await loginPage.verifyLoggedOut();
    
    // Login as admin again
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    await loginPage.verifyRole('admin');
  });

  test('admin can navigate between multiple protected pages', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to jobs page
    await page.goto('/jobs');
    await expect(page).toHaveURL('/jobs');
    await loginPage.verifyLoggedIn();
    
    // Navigate to builders page
    await page.goto('/builders');
    await expect(page).toHaveURL('/builders');
    await loginPage.verifyLoggedIn();
    
    // Navigate to admin diagnostics
    await page.goto('/admin/diagnostics');
    await expect(page).toHaveURL('/admin/diagnostics');
    await loginPage.verifyLoggedIn();
    
    // Navigate back to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await loginPage.verifyLoggedIn();
    
    // Verify still admin
    await loginPage.verifyRole('admin');
  });

  test('inspector can navigate between allowed pages', async ({ page }) => {
    await loginPage.loginAsInspector();
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to jobs page
    await page.goto('/jobs');
    await expect(page).toHaveURL('/jobs');
    await loginPage.verifyLoggedIn();
    
    // Navigate to builders page
    await page.goto('/builders');
    await expect(page).toHaveURL('/builders');
    await loginPage.verifyLoggedIn();
    
    // Navigate to photos page
    await page.goto('/photos');
    await expect(page).toHaveURL('/photos');
    await loginPage.verifyLoggedIn();
    
    // Verify still inspector
    await loginPage.verifyRole('inspector');
  });

  test('role badge displays correct role for admin', async ({ page }) => {
    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL('/dashboard');
    
    // Verify admin role badge
    const adminBadge = page.getByTestId('badge-role-admin');
    await expect(adminBadge).toBeVisible();
    
    // Verify no other role badges are visible
    const inspectorBadge = page.getByTestId('badge-role-inspector');
    await expect(inspectorBadge).not.toBeVisible();
  });

  test('role badge displays correct role for inspector', async ({ page }) => {
    await loginPage.loginAsInspector();
    await expect(page).toHaveURL('/dashboard');
    
    // Verify inspector role badge
    const inspectorBadge = page.getByTestId('badge-role-inspector');
    await expect(inspectorBadge).toBeVisible();
    
    // Verify no other role badges are visible
    const adminBadge = page.getByTestId('badge-role-admin');
    await expect(adminBadge).not.toBeVisible();
  });
});
