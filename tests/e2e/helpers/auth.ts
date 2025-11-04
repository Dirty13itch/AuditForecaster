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

  // Map userKey to actual test user ID in database
  // Only test-admin, test-inspector1, test-inspector2 are seeded in dev mode
  const userIdMap: Record<string, string> = {
    'admin': 'test-admin',
    'inspector1': 'test-inspector1',
    'inspector2': 'test-inspector2',
  };
  
  const userId = userIdMap[userKey];
  if (!userId) {
    throw new Error(`No dev login mapping for user key "${userKey}". Available: admin, inspector1, inspector2`);
  }
  
  const devLoginUrl = `${BASE_URL}/api/dev-login/${userId}`;
  
  // Navigate to dev login endpoint (GET request that redirects to /)
  // Use 'domcontentloaded' instead of 'networkidle' for more reliable timing
  await page.goto(devLoginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Poll for user menu with generous timeout to handle slow dashboard hydration
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 30000 });
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