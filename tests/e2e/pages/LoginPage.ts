import { Page } from '@playwright/test';

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
}
