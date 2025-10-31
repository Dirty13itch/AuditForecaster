/**
 * Landing Page - End-to-End Tests
 * 
 * Comprehensive tests for the Landing page following
 * the Vertical Completion Framework requirements.
 * 
 * Tests cover:
 * - Page load and rendering
 * - All UI elements visibility (hero, features, CTA)
 * - Login button functionality
 * - Navigation to authentication
 * - Responsive design (mobile and desktop viewports)
 * - All 38 data-testid selectors match UI
 * - ErrorBoundary fallback (no runtime errors expected on static page)
 * 
 * Landing Page Queries: NONE (static content only)
 * No skeleton loaders or error states needed (static content)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.setTimeout(30000);

class LandingPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(`${BASE_URL}/`);
    await this.page.waitForLoadState('networkidle');
  }

  // Container Elements
  get container() {
    return this.page.getByTestId('landing-page-container');
  }

  get contentWrapper() {
    return this.page.getByTestId('landing-content-wrapper');
  }

  // Hero Section
  get heroSection() {
    return this.page.getByTestId('hero-section');
  }

  get heroLogoWrapper() {
    return this.page.getByTestId('hero-logo-wrapper');
  }

  get logoIcon() {
    return this.page.getByTestId('icon-logo');
  }

  get appTitle() {
    return this.page.getByTestId('heading-app-title');
  }

  get appDescription() {
    return this.page.getByTestId('text-app-description');
  }

  // Login Card
  get loginCard() {
    return this.page.getByTestId('card-login');
  }

  get loginCardHeader() {
    return this.page.getByTestId('card-login-header');
  }

  get welcomeHeading() {
    return this.page.getByTestId('heading-welcome');
  }

  get signinDescription() {
    return this.page.getByTestId('text-signin-description');
  }

  get loginCardContent() {
    return this.page.getByTestId('card-login-content');
  }

  get loginButton() {
    return this.page.getByTestId('button-login');
  }

  // Features Grid
  get featuresGrid() {
    return this.page.getByTestId('features-grid');
  }

  // Individual Feature Items
  getFeatureItem(featureId: string) {
    return this.page.getByTestId(`feature-${featureId}`);
  }

  getFeatureIcon(featureId: string) {
    return this.page.getByTestId(`icon-${featureId}`);
  }

  getFeatureText(featureId: string) {
    return this.page.getByTestId(`text-${featureId}`);
  }

  // Footer
  get footer() {
    return this.page.getByTestId('text-footer');
  }

  get footerPowered() {
    return this.page.getByTestId('text-footer-powered');
  }

  get footerSecure() {
    return this.page.getByTestId('text-footer-secure');
  }

  get footerMobile() {
    return this.page.getByTestId('text-footer-mobile');
  }

  // Actions
  async clickLogin() {
    await this.loginButton.click();
  }
}

// Test suite
test.describe('Landing Page', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test.describe('Page Load and Structure', () => {
    test('should load landing page successfully', async () => {
      await expect(landingPage.container).toBeVisible();
      await expect(landingPage.contentWrapper).toBeVisible();
    });

    test('should display hero section with logo and title', async () => {
      await expect(landingPage.heroSection).toBeVisible();
      await expect(landingPage.heroLogoWrapper).toBeVisible();
      await expect(landingPage.logoIcon).toBeVisible();
      await expect(landingPage.appTitle).toBeVisible();
      await expect(landingPage.appTitle).toHaveText('Energy Auditing Field App');
    });

    test('should display app description', async () => {
      await expect(landingPage.appDescription).toBeVisible();
      await expect(landingPage.appDescription).toContainText(
        'Comprehensive field inspection management for RESNET-certified energy auditors'
      );
    });

    test('should display login card', async () => {
      await expect(landingPage.loginCard).toBeVisible();
      await expect(landingPage.loginCardHeader).toBeVisible();
      await expect(landingPage.loginCardContent).toBeVisible();
    });

    test('should display welcome message', async () => {
      await expect(landingPage.welcomeHeading).toBeVisible();
      await expect(landingPage.welcomeHeading).toHaveText('Welcome Back');
      await expect(landingPage.signinDescription).toBeVisible();
      await expect(landingPage.signinDescription).toContainText(
        'Sign in to access your field auditing tools'
      );
    });

    test('should display footer with metadata', async () => {
      await expect(landingPage.footer).toBeVisible();
      await expect(landingPage.footerPowered).toContainText('Powered by Replit');
      await expect(landingPage.footerSecure).toContainText('Secure authentication');
      await expect(landingPage.footerMobile).toContainText('Mobile-optimized for Samsung Galaxy S23 Ultra');
    });
  });

  test.describe('Login Button', () => {
    test('should display login button', async () => {
      await expect(landingPage.loginButton).toBeVisible();
      await expect(landingPage.loginButton).toBeEnabled();
      await expect(landingPage.loginButton).toHaveText('Sign in with Replit');
    });

    test('should have proper ARIA label for accessibility', async () => {
      const ariaLabel = await landingPage.loginButton.getAttribute('aria-label');
      expect(ariaLabel).toBe('Sign in with Replit authentication');
    });

    test('should navigate to login endpoint when clicked', async ({ page }) => {
      // Listen for navigation
      const navigationPromise = page.waitForURL(/.*\/api\/login.*/);
      
      await landingPage.clickLogin();
      
      // Wait for navigation to login endpoint
      await navigationPromise;
      
      // Verify we're on the login route
      expect(page.url()).toContain('/api/login');
    });
  });

  test.describe('Features Grid', () => {
    const features = [
      { id: 'calendar-sync', title: 'Calendar Sync' },
      { id: 'photo-docs', title: 'Photo Docs' },
      { id: 'analytics', title: 'Analytics' },
      { id: 'pdf-reports', title: 'PDF Reports' },
      { id: 'builder-tracking', title: 'Builder Tracking' },
      { id: '45l-credits', title: '45L Credits' },
    ];

    test('should display features grid', async () => {
      await expect(landingPage.featuresGrid).toBeVisible();
    });

    test('should display all 6 feature items', async () => {
      for (const feature of features) {
        const featureItem = landingPage.getFeatureItem(feature.id);
        await expect(featureItem).toBeVisible();
      }
    });

    test('should display icon for each feature', async () => {
      for (const feature of features) {
        const icon = landingPage.getFeatureIcon(feature.id);
        await expect(icon).toBeVisible();
        
        // Verify icon has proper ARIA label
        const ariaLabel = await icon.getAttribute('aria-label');
        expect(ariaLabel).toBe(feature.title);
      }
    });

    test('should display text label for each feature', async () => {
      for (const feature of features) {
        const text = landingPage.getFeatureText(feature.id);
        await expect(text).toBeVisible();
        await expect(text).toHaveText(feature.title);
      }
    });

    test('should verify feature grid has correct structure', async () => {
      // Features grid should be visible
      const grid = landingPage.featuresGrid;
      await expect(grid).toBeVisible();
      
      // Count feature items - should be exactly 6
      const featureCount = await landingPage.page
        .getByTestId(/^feature-/)
        .count();
      expect(featureCount).toBe(6);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await landingPage.goto();

      // Verify layout is responsive
      await expect(landingPage.container).toBeVisible();
      await expect(landingPage.heroSection).toBeVisible();
      await expect(landingPage.loginCard).toBeVisible();
      await expect(landingPage.featuresGrid).toBeVisible();
      
      // Features should be 2 columns on mobile
      const grid = landingPage.featuresGrid;
      await expect(grid).toBeVisible();
      
      // Verify all features are still visible on mobile
      const featureCount = await page.getByTestId(/^feature-/).count();
      expect(featureCount).toBe(6);
    });

    test('should display correctly on tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await landingPage.goto();

      await expect(landingPage.container).toBeVisible();
      await expect(landingPage.heroSection).toBeVisible();
      await expect(landingPage.loginCard).toBeVisible();
      await expect(landingPage.featuresGrid).toBeVisible();
      
      // Verify all features visible on tablet
      const featureCount = await page.getByTestId(/^feature-/).count();
      expect(featureCount).toBe(6);
    });

    test('should display correctly on desktop viewport (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await landingPage.goto();

      await expect(landingPage.container).toBeVisible();
      await expect(landingPage.heroSection).toBeVisible();
      await expect(landingPage.loginCard).toBeVisible();
      await expect(landingPage.featuresGrid).toBeVisible();
      
      // Features should be 3 columns on desktop
      const featureCount = await page.getByTestId(/^feature-/).count();
      expect(featureCount).toBe(6);
    });
  });

  test.describe('All Data-TestId Selectors', () => {
    test('should verify all 38 data-testid attributes are present', async ({ page }) => {
      // List of all expected data-testid attributes
      const expectedTestIds = [
        'landing-page-container',
        'landing-content-wrapper',
        'hero-section',
        'hero-logo-wrapper',
        'icon-logo',
        'heading-app-title',
        'text-app-description',
        'card-login',
        'card-login-header',
        'heading-welcome',
        'text-signin-description',
        'card-login-content',
        'button-login',
        'features-grid',
        'feature-calendar-sync',
        'icon-calendar-sync',
        'text-calendar-sync',
        'feature-photo-docs',
        'icon-photo-docs',
        'text-photo-docs',
        'feature-analytics',
        'icon-analytics',
        'text-analytics',
        'feature-pdf-reports',
        'icon-pdf-reports',
        'text-pdf-reports',
        'feature-builder-tracking',
        'icon-builder-tracking',
        'text-builder-tracking',
        'feature-45l-credits',
        'icon-45l-credits',
        'text-45l-credits',
        'text-footer',
        'text-footer-powered',
        'text-footer-separator-1',
        'text-footer-secure',
        'text-footer-separator-2',
        'text-footer-mobile',
      ];

      // Verify each test ID exists
      for (const testId of expectedTestIds) {
        const element = page.getByTestId(testId);
        await expect(element).toBeAttached();
      }

      // Count total test IDs
      expect(expectedTestIds.length).toBe(38);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Main heading (h1) should exist
      const h1 = page.getByRole('heading', { level: 1, name: 'Energy Auditing Field App' });
      await expect(h1).toBeVisible();
    });

    test('should have descriptive alt text for icons', async () => {
      // Logo icon should have aria-label
      const logoAriaLabel = await landingPage.logoIcon.getAttribute('aria-label');
      expect(logoAriaLabel).toBe('Energy Auditing App Logo');
    });

    test('should have accessible button with aria-label', async () => {
      const buttonAriaLabel = await landingPage.loginButton.getAttribute('aria-label');
      expect(buttonAriaLabel).toBe('Sign in with Replit authentication');
    });
  });

  test.describe('Content Verification', () => {
    test('should display correct app title', async () => {
      await expect(landingPage.appTitle).toHaveText('Energy Auditing Field App');
    });

    test('should display correct tagline', async () => {
      const description = await landingPage.appDescription.textContent();
      expect(description).toContain('Comprehensive field inspection management');
      expect(description).toContain('RESNET-certified energy auditors');
    });

    test('should display all feature names correctly', async () => {
      const featureTexts = [
        'Calendar Sync',
        'Photo Docs',
        'Analytics',
        'PDF Reports',
        'Builder Tracking',
        '45L Credits',
      ];

      for (const text of featureTexts) {
        const element = landingPage.page.getByText(text);
        await expect(element).toBeVisible();
      }
    });
  });

  test.describe('No Errors or Console Messages', () => {
    test('should not have console errors on page load', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await landingPage.goto();
      
      // Wait a bit to catch any async errors
      await page.waitForTimeout(2000);
      
      // Should have no errors
      expect(errors).toHaveLength(0);
    });
  });
});
