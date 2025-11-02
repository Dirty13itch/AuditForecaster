/**
 * QA Dashboard Page Object Model
 * 
 * Represents the Quality Assurance dashboard page (/qa)
 * Provides access to metrics, navigation, and overview of QA system
 * 
 * Page Features:
 * - KPI metrics: Team average, pending reviews, critical issues, compliance
 * - Navigation: Links to scoring and review queue
 * - Tabs: Dashboard, Pending Reviews, Checklists, Performance, Training
 * - Leaderboard and recent activity
 * 
 * Data-testid selectors are mapped from client/src/pages/QualityAssurance.tsx
 */

import { type Page, type Locator } from '@playwright/test';

export class QADashboardPage {
  readonly page: Page;
  readonly baseUrl: string;

  // Page Elements
  readonly mainContainer: Locator;
  readonly pageTitle: Locator;
  
  // Action Buttons
  readonly scoreInspectionButton: Locator;
  readonly reviewQueueButton: Locator;
  
  // KPI Metric Cards
  readonly teamAverageCard: Locator;
  readonly pendingReviewsCard: Locator;
  readonly criticalIssuesCard: Locator;
  readonly complianceCard: Locator;
  
  // Tabs
  readonly tabsMain: Locator;
  readonly dashboardTab: Locator;
  readonly pendingTab: Locator;
  readonly checklistsTab: Locator;
  readonly performanceTab: Locator;
  readonly trainingTab: Locator;
  
  // Content Cards
  readonly leaderboardCard: Locator;
  readonly activityCard: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;

    // Initialize locators
    this.mainContainer = page.getByTestId('container-qa-main');
    this.pageTitle = page.getByTestId('heading-qa-title');
    
    // Action buttons
    this.scoreInspectionButton = page.getByTestId('button-score-inspection');
    this.reviewQueueButton = page.getByTestId('button-review-queue');
    
    // KPI Cards
    this.teamAverageCard = page.getByTestId('card-team-average');
    this.pendingReviewsCard = page.getByTestId('card-pending-reviews');
    this.criticalIssuesCard = page.getByTestId('card-critical-issues');
    this.complianceCard = page.getByTestId('card-compliance');
    
    // Tabs
    this.tabsMain = page.getByTestId('tabs-qa-main');
    this.dashboardTab = page.getByTestId('tab-dashboard');
    this.pendingTab = page.getByTestId('tab-pending');
    this.checklistsTab = page.getByTestId('tab-checklists');
    this.performanceTab = page.getByTestId('tab-performance');
    this.trainingTab = page.getByTestId('tab-training');
    
    // Content cards
    this.leaderboardCard = page.getByTestId('card-leaderboard');
    this.activityCard = page.getByTestId('card-activity');
  }

  /**
   * Navigate to QA Dashboard page
   */
  async navigate(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/qa`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to QA Scoring page
   */
  async navigateToScoring(): Promise<void> {
    await this.scoreInspectionButton.click();
    await this.page.waitForURL(/\/qa\/scoring/);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to QA Review Queue
   */
  async navigateToReviewQueue(): Promise<void> {
    await this.reviewQueueButton.click();
    await this.page.waitForURL(/\/qa\/review/);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get team average score from metric card
   */
  async getTeamAverage(): Promise<string | null> {
    return await this.teamAverageCard.textContent();
  }

  /**
   * Get pending reviews count from metric card
   */
  async getPendingReviewsCount(): Promise<string | null> {
    return await this.pendingReviewsCard.textContent();
  }

  /**
   * Get critical issues count from metric card
   */
  async getCriticalIssuesCount(): Promise<string | null> {
    return await this.criticalIssuesCard.textContent();
  }

  /**
   * Get compliance rate from metric card
   */
  async getComplianceRate(): Promise<string | null> {
    return await this.complianceCard.textContent();
  }

  /**
   * Switch to Pending Reviews tab
   */
  async openPendingTab(): Promise<void> {
    await this.pendingTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to Checklists tab
   */
  async openChecklistsTab(): Promise<void> {
    await this.checklistsTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to Performance tab
   */
  async openPerformanceTab(): Promise<void> {
    await this.performanceTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to Training tab
   */
  async openTrainingTab(): Promise<void> {
    await this.trainingTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check for errors on the page
   */
  async hasErrors(): Promise<boolean> {
    const errorSelectors = [
      'text=Error loading',
      'text=Failed to',
      '[role="alert"]'
    ];

    for (const selector of errorSelectors) {
      const errorElement = this.page.locator(selector).first();
      if (await errorElement.isVisible()) {
        return true;
      }
    }
    return false;
  }
}
