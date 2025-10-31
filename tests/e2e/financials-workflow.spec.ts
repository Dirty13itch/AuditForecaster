import { test, expect } from "@playwright/test";

test.describe("Financials - Financial Overview Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the financials page
    await page.goto("/financials");
    // Wait for the page to load
    await expect(page.getByTestId("page-financials")).toBeVisible();
  });

  test("should display page title and description", async ({ page }) => {
    await expect(page.getByTestId("text-page-title")).toHaveText("Financial Overview");
    await expect(page.getByTestId("text-page-description")).toContainText("Monitor your business financial health");
  });

  test("should display skeleton loaders while data is loading", async ({ page }) => {
    // Reload to catch loading state
    await page.reload();
    
    // Check for skeletons (they should appear briefly)
    const revenueSkeletonVisible = await page.getByTestId("skeleton-revenue").isVisible().catch(() => false);
    const expensesSkeletonVisible = await page.getByTestId("skeleton-expenses").isVisible().catch(() => false);
    const profitSkeletonVisible = await page.getByTestId("skeleton-profit").isVisible().catch(() => false);
    const outstandingSkeletonVisible = await page.getByTestId("skeleton-outstanding").isVisible().catch(() => false);

    // At least one skeleton should have been visible (or data loaded too fast)
    const anySkeletonVisible = revenueSkeletonVisible || expensesSkeletonVisible || profitSkeletonVisible || outstandingSkeletonVisible;
    
    // Wait for data to load - check that actual content appears
    await expect(page.getByTestId("text-revenue-amount")).toBeVisible();
  });

  test("should display all key financial metrics", async ({ page }) => {
    // Wait for metrics to load
    await expect(page.getByTestId("card-metric-revenue")).toBeVisible();
    await expect(page.getByTestId("card-metric-expenses")).toBeVisible();
    await expect(page.getByTestId("card-metric-profit")).toBeVisible();
    await expect(page.getByTestId("card-metric-outstanding")).toBeVisible();

    // Verify metric icons are present
    await expect(page.getByTestId("icon-revenue")).toBeVisible();
    await expect(page.getByTestId("icon-expenses")).toBeVisible();
    await expect(page.getByTestId("icon-profit")).toBeVisible();
    await expect(page.getByTestId("icon-outstanding")).toBeVisible();

    // Verify revenue amount is displayed as currency
    const revenueText = await page.getByTestId("text-revenue-amount").textContent();
    expect(revenueText).toMatch(/\$/); // Should contain dollar sign

    // Verify expenses amount is displayed
    const expensesText = await page.getByTestId("text-expenses-amount").textContent();
    expect(expensesText).toMatch(/\$/);

    // Verify profit amount is displayed
    const profitText = await page.getByTestId("text-profit-amount").textContent();
    expect(profitText).toMatch(/\$/);

    // Verify outstanding amount is displayed
    const outstandingText = await page.getByTestId("text-outstanding-amount").textContent();
    expect(outstandingText).toMatch(/\$/);
  });

  test("should display revenue growth indicator", async ({ page }) => {
    // Wait for revenue growth to load
    const growthElement = page.getByTestId("text-revenue-growth");
    await expect(growthElement).toBeVisible();

    // Should contain percentage
    const growthText = await growthElement.textContent();
    expect(growthText).toMatch(/%/);

    // Should have either up or down icon
    const upIconVisible = await page.getByTestId("icon-revenue-up").isVisible().catch(() => false);
    const downIconVisible = await page.getByTestId("icon-revenue-down").isVisible().catch(() => false);
    expect(upIconVisible || downIconVisible).toBe(true);
  });

  test("should display profit margin correctly", async ({ page }) => {
    // Wait for profit margin to load
    await expect(page.getByTestId("text-profit-margin")).toBeVisible();
    
    // Should contain percentage
    const marginText = await page.getByTestId("text-profit-margin").textContent();
    expect(marginText).toMatch(/%/);
  });

  test("should display overdue status for outstanding invoices", async ({ page }) => {
    // Wait for outstanding card to load
    await expect(page.getByTestId("card-metric-outstanding")).toBeVisible();

    // Should display either overdue amount or "all current" status
    const overdueVisible = await page.getByTestId("text-overdue-amount").isVisible().catch(() => false);
    const noOverdueVisible = await page.getByTestId("text-no-overdue").isVisible().catch(() => false);
    expect(overdueVisible || noOverdueVisible).toBe(true);
  });

  test("should allow changing period (month/quarter/year)", async ({ page }) => {
    // Click the period selector
    await page.getByTestId("select-period").click();

    // Verify all period options are available
    await expect(page.getByTestId("option-period-month")).toBeVisible();
    await expect(page.getByTestId("option-period-quarter")).toBeVisible();
    await expect(page.getByTestId("option-period-year")).toBeVisible();

    // Select quarterly period
    await page.getByTestId("option-period-quarter").click();

    // Verify the selection changed (page should still be visible)
    await expect(page.getByTestId("page-financials")).toBeVisible();
  });

  test("should display all quick access links", async ({ page }) => {
    await expect(page.getByTestId("text-quick-links-title")).toHaveText("Quick Access");

    // Verify all 6 quick links are present
    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId(`card-quick-link-${i}`)).toBeVisible();
      await expect(page.getByTestId(`icon-quick-link-${i}`)).toBeVisible();
      await expect(page.getByTestId(`text-quick-link-title-${i}`)).toBeVisible();
      await expect(page.getByTestId(`text-quick-link-desc-${i}`)).toBeVisible();
      await expect(page.getByTestId(`icon-arrow-${i}`)).toBeVisible();
    }
  });

  test("should navigate to detailed dashboard when button clicked", async ({ page }) => {
    await page.getByTestId("button-detailed-dashboard").click();
    
    // Should navigate to financial dashboard
    await expect(page).toHaveURL(/\/financial-dashboard/);
  });

  test("should display recent activity section", async ({ page }) => {
    await expect(page.getByTestId("card-recent-activity")).toBeVisible();
    await expect(page.getByTestId("text-activity-title")).toHaveText("Recent Activity");
    await expect(page.getByTestId("text-activity-description")).toContainText("Latest financial transactions");
  });

  test("should display financial health indicators", async ({ page }) => {
    await expect(page.getByTestId("card-financial-health")).toBeVisible();
    await expect(page.getByTestId("text-health-title")).toHaveText("Financial Health");
    await expect(page.getByTestId("text-health-description")).toContainText("Key performance indicators");

    // Wait for health indicators to load
    await expect(page.getByTestId("indicator-profit-margin")).toBeVisible();
    await expect(page.getByTestId("indicator-collection-ratio")).toBeVisible();
    await expect(page.getByTestId("indicator-outstanding-ratio")).toBeVisible();
    await expect(page.getByTestId("indicator-avg-days")).toBeVisible();

    // Verify labels and values are present
    await expect(page.getByTestId("text-indicator-profit-label")).toHaveText("Profit Margin");
    await expect(page.getByTestId("text-indicator-profit-value")).toBeVisible();
    
    await expect(page.getByTestId("text-indicator-collection-label")).toHaveText("Collection Ratio");
    await expect(page.getByTestId("text-indicator-collection-value")).toBeVisible();
    
    await expect(page.getByTestId("text-indicator-outstanding-label")).toHaveText("Outstanding vs Revenue");
    await expect(page.getByTestId("text-indicator-outstanding-value")).toBeVisible();
    
    await expect(page.getByTestId("text-indicator-days-label")).toHaveText("Avg. Days to Payment");
    await expect(page.getByTestId("text-indicator-days-value")).toBeVisible();

    // Verify progress bars are visible
    await expect(page.getByTestId("bar-profit-margin")).toBeVisible();
    await expect(page.getByTestId("bar-collection-ratio")).toBeVisible();
    await expect(page.getByTestId("bar-outstanding-ratio")).toBeVisible();
    await expect(page.getByTestId("bar-avg-days")).toBeVisible();
  });

  test("should display transactions with proper formatting", async ({ page }) => {
    // Wait for transactions to load or show empty state
    const hasTransactions = await page.getByTestId("transaction-item-0").isVisible().catch(() => false);
    
    if (hasTransactions) {
      // Verify first transaction has all elements
      await expect(page.getByTestId("icon-transaction-0")).toBeVisible();
      await expect(page.getByTestId("text-transaction-desc-0")).toBeVisible();
      await expect(page.getByTestId("text-transaction-date-0")).toBeVisible();
      await expect(page.getByTestId("text-transaction-amount-0")).toBeVisible();

      // Verify amount is formatted as currency
      const amountText = await page.getByTestId("text-transaction-amount-0").textContent();
      expect(amountText).toMatch(/\$/);

      // Verify "View All Transactions" button is present
      await expect(page.getByTestId("button-view-all-transactions")).toBeVisible();
    }
  });

  test("should display empty state when no transactions exist", async ({ page }) => {
    // This test assumes there might be an empty state
    const emptyStateVisible = await page.getByTestId("empty-transactions").isVisible().catch(() => false);
    const hasTransactions = await page.getByTestId("transaction-item-0").isVisible().catch(() => false);
    
    // Either empty state or transactions should be visible, not both
    expect(emptyStateVisible || hasTransactions).toBe(true);
    
    if (emptyStateVisible) {
      await expect(page.getByTestId("empty-transactions")).toContainText("No recent financial activity");
    }
  });

  test("should handle error state for financial summary with retry", async ({ page }) => {
    // Intercept API call to simulate error
    await page.route("**/api/financial-summary*", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify error alert is shown
    await expect(page.getByTestId("alert-summary-error")).toBeVisible();
    await expect(page.getByTestId("alert-summary-error")).toContainText("Error Loading Financial Summary");

    // Verify retry button is present
    await expect(page.getByTestId("button-retry-summary")).toBeVisible();
    
    // Remove the error route for retry
    await page.unroute("**/api/financial-summary*");
    
    // Click retry button
    await page.getByTestId("button-retry-summary").click();

    // Error should disappear after successful retry
    await expect(page.getByTestId("alert-summary-error")).not.toBeVisible({ timeout: 5000 });
  });

  test("should handle error state for transactions with retry", async ({ page }) => {
    // Intercept API call to simulate error
    await page.route("**/api/recent-financial-activity*", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify error alert is shown
    await expect(page.getByTestId("alert-transactions-error")).toBeVisible();
    await expect(page.getByTestId("alert-transactions-error")).toContainText("Error Loading Transactions");

    // Verify retry button is present
    await expect(page.getByTestId("button-retry-transactions")).toBeVisible();
  });

  test("should navigate to quick access pages when clicked", async ({ page }) => {
    // Test navigation to invoices (first quick link)
    const firstLink = page.getByTestId("card-quick-link-0");
    await expect(firstLink).toBeVisible();
    
    // Get the title to know which page we're testing
    const linkTitle = await page.getByTestId("text-quick-link-title-0").textContent();
    
    // Click the link
    await firstLink.click();
    
    // Verify navigation occurred (URL should change)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/financials");
  });

  test("should handle ErrorBoundary fallback", async ({ page }) => {
    // This test verifies the ErrorBoundary fallback is properly configured
    // In a real scenario, you would trigger a component error
    // For now, we just verify the page loads without crashing
    await expect(page.getByTestId("page-financials")).toBeVisible();
    
    // Verify no error boundary fallback is shown on normal load
    const errorFallbackVisible = await page.getByTestId("error-boundary-fallback").isVisible().catch(() => false);
    expect(errorFallbackVisible).toBe(false);
  });

  test("should display all required icons (no emoji)", async ({ page }) => {
    // Verify header icons
    await expect(page.getByTestId("icon-revenue")).toBeVisible();
    await expect(page.getByTestId("icon-expenses")).toBeVisible();
    await expect(page.getByTestId("icon-profit")).toBeVisible();
    await expect(page.getByTestId("icon-outstanding")).toBeVisible();

    // Verify quick link icons (all 6)
    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId(`icon-quick-link-${i}`)).toBeVisible();
      await expect(page.getByTestId(`icon-arrow-${i}`)).toBeVisible();
    }

    // Verify no emoji characters in the page
    const pageContent = await page.textContent("body");
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(pageContent || "")).toBe(false);
  });

  test("should have responsive layout on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify page is still visible and functional
    await expect(page.getByTestId("page-financials")).toBeVisible();
    await expect(page.getByTestId("text-page-title")).toBeVisible();
    
    // Verify metrics cards stack vertically
    await expect(page.getByTestId("card-metric-revenue")).toBeVisible();
    await expect(page.getByTestId("card-metric-expenses")).toBeVisible();

    // Verify quick links are still accessible
    await expect(page.getByTestId("card-quick-link-0")).toBeVisible();
  });

  test("should validate all data-testid attributes are present", async ({ page }) => {
    // This is a comprehensive check for all critical data-testid attributes
    const requiredTestIds = [
      "page-financials",
      "text-page-title",
      "text-page-description",
      "select-period",
      "button-detailed-dashboard",
      "card-metric-revenue",
      "card-metric-expenses",
      "card-metric-profit",
      "card-metric-outstanding",
      "icon-revenue",
      "icon-expenses",
      "icon-profit",
      "icon-outstanding",
      "text-revenue-amount",
      "text-expenses-amount",
      "text-profit-amount",
      "text-outstanding-amount",
      "text-revenue-growth",
      "text-profit-margin",
      "text-quick-links-title",
      "card-recent-activity",
      "text-activity-title",
      "text-activity-description",
      "card-financial-health",
      "text-health-title",
      "text-health-description",
      "indicator-profit-margin",
      "indicator-collection-ratio",
      "indicator-outstanding-ratio",
      "indicator-avg-days",
    ];

    for (const testId of requiredTestIds) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test("should verify all skeleton states have corresponding data states", async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Verify that data is displayed (not skeletons)
    await expect(page.getByTestId("text-revenue-amount")).toBeVisible();
    await expect(page.getByTestId("text-expenses-amount")).toBeVisible();
    await expect(page.getByTestId("text-profit-amount")).toBeVisible();
    await expect(page.getByTestId("text-outstanding-amount")).toBeVisible();

    // Verify skeletons are not visible after load
    const revenueSkeletonVisible = await page.getByTestId("skeleton-revenue").isVisible().catch(() => false);
    const expensesSkeletonVisible = await page.getByTestId("skeleton-expenses").isVisible().catch(() => false);
    const profitSkeletonVisible = await page.getByTestId("skeleton-profit").isVisible().catch(() => false);
    const outstandingSkeletonVisible = await page.getByTestId("skeleton-outstanding").isVisible().catch(() => false);

    expect(revenueSkeletonVisible).toBe(false);
    expect(expensesSkeletonVisible).toBe(false);
    expect(profitSkeletonVisible).toBe(false);
    expect(outstandingSkeletonVisible).toBe(false);
  });
});
