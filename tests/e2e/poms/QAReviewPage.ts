/**
 * QA Review Page Object Model
 * 
 * Represents the Quality Assurance review queue page
 * NOTE: This page is rendered by the QAReview component, not a dedicated route
 * Access via dashboard "Review Queue" button
 * 
 * Page Features:
 * - List of inspection scores pending review
 * - Priority filtering (critical, high, medium, low)
 * - Bulk approve functionality
 * - Individual review dialog with approve/needs improvement decisions
 * - Review notes and inspector messaging
 * 
 * Data-testid selectors need to be added to client/src/components/QAReview.tsx
 * Currently using generic locators based on component structure
 */

import { type Page, type Locator } from '@playwright/test';

export class QAReviewPage {
  readonly page: Page;
  readonly baseUrl: string;

  // Page Elements (using text/role locators since component lacks data-testids)
  readonly pageTitle: Locator;
  readonly pendingBadge: Locator;
  
  // Filters and Actions
  readonly priorityFilter: Locator;
  readonly bulkApproveButton: Locator;
  readonly clearSelectionButton: Locator;
  readonly selectAllCheckbox: Locator;
  
  // Review List (generic locators)
  readonly reviewCards: Locator;
  
  // Review Dialog
  readonly reviewDialog: Locator;
  readonly reviewNotesTextarea: Locator;
  readonly approveButton: Locator;
  readonly needsImprovementButton: Locator;
  readonly submitReviewButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;

    // Initialize locators (using text/role since component lacks data-testids)
    this.pageTitle = page.locator('h1', { hasText: 'QA Review Queue' });
    this.pendingBadge = page.locator('text=Pending');
    
    // Filters - using Radix Select structure
    this.priorityFilter = page.locator('button[role="combobox"]').filter({ hasText: /All Priorities|Critical|High|Medium|Low/ });
    
    // Bulk actions
    this.bulkApproveButton = page.locator('button', { hasText: 'Approve Selected' });
    this.clearSelectionButton = page.locator('button', { hasText: 'Clear Selection' });
    this.selectAllCheckbox = page.locator('button[role="checkbox"]').first();
    
    // Review list
    this.reviewCards = page.locator('[role="button"]').filter({ hasText: 'Review' }).locator('..');
    
    // Review Dialog (Radix Dialog)
    this.reviewDialog = page.locator('[role="dialog"]');
    this.reviewNotesTextarea = this.reviewDialog.locator('textarea');
    this.approveButton = this.reviewDialog.locator('button', { hasText: 'Approve' });
    this.needsImprovementButton = this.reviewDialog.locator('button', { hasText: 'Needs Improvement' });
    this.submitReviewButton = this.reviewDialog.locator('button', { hasText: 'Submit Review' });
    this.cancelButton = this.reviewDialog.locator('button', { hasText: 'Cancel' });
  }

  /**
   * Navigate to QA Review page
   * Note: This component is accessed via dashboard button, not direct route
   */
  async navigate(): Promise<void> {
    await this.page.goto(`${this.baseUrl}/qa`);
    await this.page.waitForLoadState('networkidle');
    
    // Click "Review Queue" button on dashboard
    const reviewQueueButton = this.page.getByTestId('button-review-queue');
    await reviewQueueButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get count of pending reviews
   */
  async getPendingCount(): Promise<number> {
    const badgeText = await this.pendingBadge.textContent();
    if (!badgeText) return 0;
    
    const match = badgeText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Filter reviews by priority
   */
  async filterByPriority(priority: 'all' | 'critical' | 'high' | 'medium' | 'low'): Promise<void> {
    await this.priorityFilter.click();
    await this.page.waitForTimeout(200);
    
    const option = this.page.locator(`[role="option"]`, { 
      hasText: new RegExp(priority, 'i') 
    });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Open review dialog for the first pending item
   */
  async openFirstReview(): Promise<void> {
    const firstReviewButton = this.page.locator('button', { hasText: 'Review' }).first();
    await firstReviewButton.click();
    await this.reviewDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Submit a review with approval
   */
  async approveReview(notes: string = ''): Promise<void> {
    // Enter notes if provided
    if (notes) {
      await this.reviewNotesTextarea.fill(notes);
    }
    
    // Select approve
    await this.approveButton.click();
    await this.page.waitForTimeout(300);
    
    // Submit
    await this.submitReviewButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Submit a review requesting improvements
   */
  async requestImprovements(notes: string): Promise<void> {
    // Enter notes (required for improvements)
    await this.reviewNotesTextarea.fill(notes);
    
    // Select needs improvement
    await this.needsImprovementButton.click();
    await this.page.waitForTimeout(300);
    
    // Submit
    await this.submitReviewButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel the review dialog
   */
  async cancelReview(): Promise<void> {
    await this.cancelButton.click();
    await this.reviewDialog.waitFor({ state: 'hidden', timeout: 2000 });
  }

  /**
   * Select all reviews for bulk action
   */
  async selectAll(): Promise<void> {
    await this.selectAllCheckbox.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Bulk approve all selected reviews
   */
  async bulkApprove(): Promise<void> {
    await this.bulkApproveButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clear all selections
   */
  async clearSelection(): Promise<void> {
    await this.clearSelectionButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the number of review cards visible
   */
  async getReviewCount(): Promise<number> {
    return await this.reviewCards.count();
  }

  /**
   * Check if review dialog is open
   */
  async isReviewDialogOpen(): Promise<boolean> {
    return await this.reviewDialog.isVisible();
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
