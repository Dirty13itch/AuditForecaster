/**
 * Authentication helpers for E2E tests
 * Provides login functionality for different user roles
 */

import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'inspector' | 'partner';
}

// Test users based on M/I Homes seed data
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  },
  inspector1: {
    email: 'test-inspector1@test.com',
    password: 'password123',
    role: 'inspector'
  },
  inspector2: {
    email: 'test-inspector2@test.com',
    password: 'password123',
    role: 'inspector'
  },
  partner: {
    email: 'partner@mihomes.com',
    password: 'password123',
    role: 'partner'
  }
};

/**
 * Login helper function for E2E tests
 * Uses dev login endpoint for test environment
 */
export async function login(page: Page, userKey: string): Promise<void> {
  const user = TEST_USERS[userKey];
  if (!user) {
    throw new Error(`Unknown test user: ${userKey}`);
  }

  // Use dev login endpoint for faster test execution
  // This bypasses the full OAuth flow for testing
  const devLoginUrl = `/api/dev-login/${userKey}`;
  
  try {
    // Make a direct API call to dev login
    const response = await page.request.post(`${BASE_URL}${devLoginUrl}`);
    
    if (!response.ok()) {
      // Fallback to regular login flow
      await regularLogin(page, user);
      return;
    }

    // Navigate to base URL to establish session
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Verify login was successful
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });
    
  } catch (error) {
    console.warn(`Dev login failed, using regular login: ${error}`);
    await regularLogin(page, user);
  }
}

/**
 * Regular login flow (fallback when dev login is not available)
 */
async function regularLogin(page: Page, user: TestUser): Promise<void> {
  // Navigate to login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill in login form
  await page.fill('[data-testid="input-email"], input[type="email"]', user.email);
  await page.fill('[data-testid="input-password"], input[type="password"]', user.password);
  
  // Submit form
  await page.click('[data-testid="button-login"], button[type="submit"]');
  
  // Wait for redirect after successful login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
    waitUntil: 'networkidle'
  });
  
  // Verify login was successful
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu
  await page.click('[data-testid="user-menu"]');
  
  // Click logout option
  await page.click('[data-testid="button-logout"]');
  
  // Wait for redirect to login page
  await page.waitForURL((url) => url.pathname.includes('/login'), {
    timeout: 5000
  });
}

/**
 * Get current user info from page
 */
export async function getCurrentUser(page: Page): Promise<string | null> {
  try {
    const userMenuText = await page.textContent('[data-testid="user-menu"]');
    return userMenuText;
  } catch {
    return null;
  }
}