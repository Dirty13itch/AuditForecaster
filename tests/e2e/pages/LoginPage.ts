import { Page, expect } from '@playwright/test';

/**
 * LoginPage - Handles authentication for E2E tests
 * 
 * This application uses Replit OAuth for production but also has dev-mode authentication
 * for testing purposes. The dev-mode provides quick login URLs that bypass OAuth.
 */
export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the landing/login page
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Login using dev-mode authentication
   * This bypasses Replit OAuth and logs in directly as a test user
   * 
   * @param userId - One of: 'test-admin', 'test-inspector1', 'test-inspector2'
   */
  async loginWithDevMode(userId: string = 'test-admin') {
    await this.page.goto(`/api/dev-login/${userId}`);
    // Dev-mode login automatically redirects to dashboard after successful authentication
  }

  /**
   * Login as admin user (convenience method)
   */
  async loginAsAdmin() {
    await this.loginWithDevMode('test-admin');
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Login as inspector user (convenience method)
   */
  async loginAsInspector(inspectorNumber: 1 | 2 = 1) {
    await this.loginWithDevMode(`test-inspector${inspectorNumber}`);
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Logout by navigating to logout endpoint
   */
  async logout() {
    await this.page.goto('/api/logout');
  }

  /**
   * Verify user is logged in by checking for user profile element
   * @param expectedText - Optional text to verify in user profile (e.g., username or email)
   */
  async verifyLoggedIn(expectedText?: string) {
    const userProfile = this.page.getByTestId('user-profile');
    await expect(userProfile).toBeVisible();
    
    if (expectedText) {
      await expect(userProfile).toContainText(expectedText);
    }
  }

  /**
   * Verify user is logged out by checking for login button on landing page
   */
  async verifyLoggedOut() {
    const loginButton = this.page.getByTestId('button-login');
    await expect(loginButton).toBeVisible();
    await expect(this.page).toHaveURL('/');
  }

  /**
   * Verify user has a specific role by checking the role badge
   * @param role - Expected role (admin, inspector, manager, viewer)
   */
  async verifyRole(role: string) {
    const roleBadge = this.page.getByTestId(`badge-role-${role}`);
    await expect(roleBadge).toBeVisible();
  }

  /**
   * Click the logout button in the sidebar
   */
  async clickLogoutButton() {
    const logoutButton = this.page.getByTestId('button-logout');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
  }

  /**
   * Verify sidebar menu item is visible
   * @param itemName - Name of the menu item (e.g., 'diagnostics', 'audit logs')
   */
  async verifySidebarItemVisible(itemName: string) {
    const menuItem = this.page.getByTestId(`link-${itemName.toLowerCase()}`);
    await expect(menuItem).toBeVisible();
  }

  /**
   * Verify sidebar menu item is not visible
   * @param itemName - Name of the menu item (e.g., 'diagnostics', 'audit logs')
   */
  async verifySidebarItemNotVisible(itemName: string) {
    const menuItem = this.page.getByTestId(`link-${itemName.toLowerCase()}`);
    await expect(menuItem).not.toBeVisible();
  }
}
