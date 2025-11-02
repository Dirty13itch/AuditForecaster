/**
 * QA Scoring Page Object Model
 * 
 * Represents the Quality Assurance scoring page (/qa/scoring)
 * Provides functionality to score completed jobs on quality metrics
 * 
 * Page Features:
 * - Job selection dropdown
 * - Automated/Manual scoring tabs
 * - 5 scoring categories: Completeness, Accuracy, Compliance, Photo Quality, Timeliness
 * - Total score calculation and grade display
 * - Save draft and submit for review actions
 * 
 * Data-testid selectors are mapped from client/src/pages/QAScoring.tsx
 */

import { type Page, type Locator } from '@playwright/test';

export class QAScoringPage {
  readonly page: Page;
  readonly baseUrl: string;

  // Page Elements
  readonly mainContainer: Locator;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  
  // Job Selection
  readonly jobSelectTrigger: Locator;
  
  // Scoring Tabs
  readonly scoringModeTabs: Locator;
  readonly automatedTab: Locator;
  readonly manualTab: Locator;
  
  // Category Score Cards
  readonly completenessCard: Locator;
  readonly accuracyCard: Locator;
  readonly complianceCard: Locator;
  readonly photoQualityCard: Locator;
  readonly timelinessCard: Locator;
  
  // Score Display
  readonly totalScoreText: Locator;
  readonly gradeBadge: Locator;
  
  // Action Buttons
  readonly beginScoringButton: Locator;
  readonly saveDraftButton: Locator;
  readonly submitReviewButton: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;

    // Initialize locators
    this.mainContainer = page.getByTestId('container-qa-scoring-main');
    this.pageTitle = page.getByTestId('heading-qa-scoring');
    this.backButton = page.getByTestId('button-back-to-qa');
    
    // Job selection
    this.jobSelectTrigger = page.getByTestId('select-trigger-job');
    
    // Scoring tabs
    this.scoringModeTabs = page.getByTestId('tabs-scoring-mode');
    this.automatedTab = page.getByTestId('tab-automated');
    this.manualTab = page.getByTestId('tab-manual');
    
    // Category cards
    this.completenessCard = page.getByTestId('card-category-completeness');
    this.accuracyCard = page.getByTestId('card-category-accuracy');
    this.complianceCard = page.getByTestId('card-category-compliance');
    this.photoQualityCard = page.getByTestId('card-category-photo-quality');
    this.timelinessCard = page.getByTestId('card-category-timeliness');
    
    // Score display
    this.totalScoreText = page.getByTestId('text-total-score');
    this.gradeBadge = page.getByTestId('badge-grade');
    
    // Action buttons
    this.beginScoringButton = page.getByTestId('button-begin-scoring');
    this.saveDraftButton = page.getByTestId('button-save-draft');
    this.submitReviewButton = page.getByTestId('button-submit-review');
  }

  /**
   * Navigate to QA Scoring page
   */
  async navigate(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/qa/scoring`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate back to QA Dashboard
   */
  async navigateBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL(/\/qa$/);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a job from the dropdown by index
   * Note: This opens the select and clicks the nth item
   */
  async selectJobByIndex(index: number): Promise<void> {
    await this.jobSelectTrigger.click();
    await this.page.waitForTimeout(300);
    
    const jobItem = this.page.getByTestId(`select-item-job-${index}`);
    await jobItem.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Select the first available job
   */
  async selectFirstJob(): Promise<void> {
    await this.selectJobByIndex(1);
  }

  /**
   * Click begin scoring button
   */
  async beginScoring(): Promise<void> {
    await this.beginScoringButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to automated scoring mode
   */
  async switchToAutomated(): Promise<void> {
    await this.automatedTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to manual scoring mode
   */
  async switchToManual(): Promise<void> {
    await this.manualTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the total score displayed
   */
  async getTotalScore(): Promise<string | null> {
    return await this.totalScoreText.textContent();
  }

  /**
   * Get the grade displayed
   */
  async getGrade(): Promise<string | null> {
    return await this.gradeBadge.textContent();
  }

  /**
   * Save score as draft
   */
  async saveDraft(): Promise<void> {
    await this.saveDraftButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Submit score for review
   */
  async submitForReview(): Promise<void> {
    await this.submitReviewButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if all category cards are visible
   */
  async areAllCategoriesVisible(): Promise<boolean> {
    const cards = [
      this.completenessCard,
      this.accuracyCard,
      this.complianceCard,
      this.photoQualityCard,
      this.timelinessCard
    ];

    for (const card of cards) {
      if (!await card.isVisible()) {
        return false;
      }
    }
    return true;
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
