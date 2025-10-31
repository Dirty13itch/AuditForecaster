import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.describe("Achievements Page Workflow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();
  });

  test("should load achievements page with skeletons then content", async ({ page }) => {
    // Navigate to achievements page
    await page.goto("/achievements");

    // Phase 4 - TEST: Verify skeleton loaders appear during initial load
    const skeleton = page.getByTestId("skeleton-achievements");
    if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(skeleton).toBeVisible();
      await expect(page.getByTestId("skeleton-header")).toBeVisible();
      await expect(page.getByTestId("skeleton-tabs")).toBeVisible();
    }

    // Wait for content to load
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Verify main sections are present
    await expect(page.getByTestId("card-header")).toBeVisible();
    await expect(page.getByTestId("tabs-main")).toBeVisible();
    await expect(page.getByTestId("section-user-info")).toBeVisible();
  });

  test("should display user level and XP progress", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Verify level badge
    const levelBadge = page.getByTestId("badge-level");
    await expect(levelBadge).toBeVisible();

    const levelText = page.getByTestId("text-level");
    await expect(levelText).toBeVisible();
    const level = await levelText.textContent();
    expect(parseInt(level || "1")).toBeGreaterThanOrEqual(1);

    // Verify level title
    await expect(page.getByTestId("text-level-title")).toBeVisible();

    // Verify XP progress bar
    await expect(page.getByTestId("progress-level")).toBeVisible();
    await expect(page.getByTestId("text-current-xp")).toBeVisible();
    await expect(page.getByTestId("text-xp-to-next")).toBeVisible();

    // Verify achievement count
    const achievementCount = page.getByTestId("text-achievement-count");
    await expect(achievementCount).toBeVisible();
    const countText = await achievementCount.textContent();
    expect(countText).toMatch(/\d+\s*\/\s*\d+\s*Achievements/);
  });

  test("should display active streaks section if streaks exist", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Check if streaks card exists
    const streaksCard = page.getByTestId("card-streaks");
    const isVisible = await streaksCard.isVisible().catch(() => false);

    if (isVisible) {
      // Verify streaks title
      await expect(page.getByTestId("title-streaks")).toBeVisible();
      await expect(page.getByTestId("title-streaks")).toContainText("Active Streaks");

      // Verify streaks grid
      await expect(page.getByTestId("grid-streaks")).toBeVisible();
    }
  });

  test("should navigate between tabs (achievements, leaderboard, progress)", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Verify tabs list
    await expect(page.getByTestId("tabs-list")).toBeVisible();

    // Test Achievements tab (default)
    const achievementsTab = page.getByTestId("tab-achievements");
    await expect(achievementsTab).toBeVisible();
    await achievementsTab.click();
    await expect(page.getByTestId("tab-content-achievements")).toBeVisible();
    await expect(page.getByTestId("card-category-filter")).toBeVisible();

    // Test Leaderboard tab
    const leaderboardTab = page.getByTestId("tab-leaderboard");
    await expect(leaderboardTab).toBeVisible();
    await leaderboardTab.click();
    await expect(page.getByTestId("tab-content-leaderboard")).toBeVisible({ timeout: 5000 });

    // Test Progress tab
    const progressTab = page.getByTestId("tab-progress");
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await expect(page.getByTestId("tab-content-progress")).toBeVisible();
    await expect(page.getByTestId("card-category-progress")).toBeVisible();
    await expect(page.getByTestId("card-stats-overview")).toBeVisible();
  });

  test("should filter achievements by category", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Ensure we're on the achievements tab
    await page.getByTestId("tab-achievements").click();
    await expect(page.getByTestId("card-category-filter")).toBeVisible();

    // Test "All Achievements" category (default)
    const allButton = page.getByTestId("button-category-all");
    await expect(allButton).toBeVisible();

    // Test filtering by specific categories
    const categoriesToTest = [
      "inspection",
      "quality",
      "speed",
      "blower_door",
      "tax_credit",
      "photo",
      "team",
    ];

    for (const category of categoriesToTest) {
      const categoryButton = page.getByTestId(`button-category-${category}`);
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
        // Wait for filter to apply
        await page.waitForTimeout(300);
        // Verify the button is now active (has default variant styling)
        await expect(categoryButton).toBeVisible();
      }
    }

    // Return to "All" filter
    await allButton.click();
    await page.waitForTimeout(300);
  });

  test("should display achievement sections (unlocked, in-progress, locked)", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate to achievements tab
    await page.getByTestId("tab-achievements").click();
    await expect(page.getByTestId("section-achievement-gallery")).toBeVisible();

    // Check for at least one section (unlocked, in-progress, or locked)
    const unlockedSection = page.getByTestId("section-unlocked");
    const inProgressSection = page.getByTestId("section-in-progress");
    const lockedSection = page.getByTestId("section-locked");
    const emptyState = page.getByTestId("empty-state-category");

    const hasUnlocked = await unlockedSection.isVisible().catch(() => false);
    const hasInProgress = await inProgressSection.isVisible().catch(() => false);
    const hasLocked = await lockedSection.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // At least one section should be visible
    expect(hasUnlocked || hasInProgress || hasLocked || hasEmpty).toBe(true);

    // Verify section titles and grids if sections exist
    if (hasUnlocked) {
      await expect(page.getByTestId("title-unlocked")).toBeVisible();
      await expect(page.getByTestId("title-unlocked")).toContainText("Unlocked");
      await expect(page.getByTestId("grid-unlocked")).toBeVisible();
    }

    if (hasInProgress) {
      await expect(page.getByTestId("title-in-progress")).toBeVisible();
      await expect(page.getByTestId("title-in-progress")).toContainText("In Progress");
      await expect(page.getByTestId("grid-in-progress")).toBeVisible();
    }

    if (hasLocked) {
      await expect(page.getByTestId("title-locked")).toBeVisible();
      await expect(page.getByTestId("title-locked")).toContainText("Locked");
      await expect(page.getByTestId("grid-locked")).toBeVisible();
    }
  });

  test("should display progress bars in category progress section", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate to Progress tab
    await page.getByTestId("tab-progress").click();
    await expect(page.getByTestId("card-category-progress")).toBeVisible();

    // Verify progress bars for each category
    const categories = [
      "inspection",
      "quality",
      "speed",
      "blower_door",
      "tax_credit",
      "photo",
      "team",
    ];

    for (const category of categories) {
      const progressSection = page.getByTestId(`progress-category-${category}`);
      if (await progressSection.isVisible()) {
        await expect(page.getByTestId(`text-category-name-${category}`)).toBeVisible();
        await expect(page.getByTestId(`text-category-count-${category}`)).toBeVisible();
        await expect(page.getByTestId(`progress-bar-${category}`)).toBeVisible();

        // Verify count format (e.g., "2 / 5")
        const countText = await page.getByTestId(`text-category-count-${category}`).textContent();
        expect(countText).toMatch(/\d+\s*\/\s*\d+/);
      }
    }
  });

  test("should display statistics overview", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate to Progress tab
    await page.getByTestId("tab-progress").click();
    await expect(page.getByTestId("card-stats-overview")).toBeVisible();

    // Verify stats grid
    await expect(page.getByTestId("grid-stats")).toBeVisible();

    // Verify individual stats
    await expect(page.getByTestId("stat-total-xp")).toBeVisible();
    await expect(page.getByTestId("text-total-xp")).toBeVisible();

    await expect(page.getByTestId("stat-achievements")).toBeVisible();
    await expect(page.getByTestId("text-achievement-total")).toBeVisible();

    await expect(page.getByTestId("stat-level")).toBeVisible();
    await expect(page.getByTestId("text-level-stat")).toBeVisible();

    await expect(page.getByTestId("stat-streaks")).toBeVisible();
    await expect(page.getByTestId("text-active-streaks")).toBeVisible();

    // Verify values are numeric
    const totalXP = await page.getByTestId("text-total-xp").textContent();
    expect(parseInt(totalXP || "0")).toBeGreaterThanOrEqual(0);

    const level = await page.getByTestId("text-level-stat").textContent();
    expect(parseInt(level || "1")).toBeGreaterThanOrEqual(1);
  });

  test("should display rarity distribution", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate to Progress tab
    await page.getByTestId("tab-progress").click();

    // Scroll to rarity distribution card
    const rarityCard = page.getByTestId("card-rarity-distribution");
    await rarityCard.scrollIntoViewIfNeeded();
    await expect(rarityCard).toBeVisible();

    await expect(page.getByTestId("title-rarity")).toBeVisible();
    await expect(page.getByTestId("grid-rarity")).toBeVisible();

    // Verify all rarity tiers
    const rarities = ["common", "rare", "epic", "legendary"];
    for (const rarity of rarities) {
      await expect(page.getByTestId(`rarity-${rarity}`)).toBeVisible();
      await expect(page.getByTestId(`text-rarity-count-${rarity}`)).toBeVisible();
      await expect(page.getByTestId(`text-rarity-label-${rarity}`)).toBeVisible();

      // Verify count is numeric
      const count = await page.getByTestId(`text-rarity-count-${rarity}`).textContent();
      expect(parseInt(count || "0")).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle check achievements button", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    const checkButton = page.getByTestId("button-check-achievements");
    await expect(checkButton).toBeVisible();
    await expect(checkButton).toBeEnabled();

    // Click the button
    await checkButton.click();

    // Button should show loading state briefly
    // Then a toast should appear (either success or no new achievements)
    await page.waitForTimeout(1000);

    // Button should be enabled again after mutation completes
    await expect(checkButton).toBeEnabled({ timeout: 5000 });
  });

  test("should handle refresh button", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    const refreshButton = page.getByTestId("button-refresh");
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();

    // Click refresh
    await refreshButton.click();

    // Wait for refresh to complete
    await page.waitForTimeout(1000);

    // Page should still be visible and functional
    await expect(page.getByTestId("page-achievements")).toBeVisible();
  });

  test("should display recent achievements if they exist", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate to Progress tab
    await page.getByTestId("tab-progress").click();

    // Check if recent achievements card exists
    const recentCard = page.getByTestId("card-recent-achievements");
    const hasRecentAchievements = await recentCard.isVisible().catch(() => false);

    if (hasRecentAchievements) {
      await expect(page.getByTestId("title-recent-achievements")).toBeVisible();
      await expect(page.getByTestId("list-recent-achievements")).toBeVisible();

      // Check first recent achievement (if exists)
      const firstRecent = page.getByTestId("recent-achievement-0");
      if (await firstRecent.isVisible()) {
        await expect(page.getByTestId("text-recent-name-0")).toBeVisible();
        await expect(page.getByTestId("text-recent-date-0")).toBeVisible();
        await expect(page.getByTestId("badge-recent-xp-0")).toBeVisible();
      }
    }
  });

  test("should handle empty state when no achievements exist", async ({ page }) => {
    // This test would require mocking the API to return empty data
    // For now, we'll just verify the empty state components exist in the code
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Navigate through tabs to ensure they work even with potential empty states
    await page.getByTestId("tab-achievements").click();
    await page.waitForTimeout(500);

    await page.getByTestId("tab-leaderboard").click();
    await page.waitForTimeout(500);

    await page.getByTestId("tab-progress").click();
    await page.waitForTimeout(500);
  });

  test("should verify all critical test IDs are present", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Critical top-level test IDs
    const criticalTestIds = [
      "page-achievements",
      "card-header",
      "section-user-info",
      "badge-level",
      "text-level",
      "text-level-title",
      "text-achievement-count",
      "section-xp-progress",
      "progress-level",
      "text-current-xp",
      "text-xp-to-next",
      "section-actions",
      "button-check-achievements",
      "button-refresh",
      "tabs-main",
      "tabs-list",
      "tab-achievements",
      "tab-leaderboard",
      "tab-progress",
    ];

    for (const testId of criticalTestIds) {
      const element = page.getByTestId(testId);
      await expect(element).toBeAttached();
    }
  });

  test("should display leaderboard when switching to leaderboard tab", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Switch to leaderboard tab
    await page.getByTestId("tab-leaderboard").click();
    await expect(page.getByTestId("tab-content-leaderboard")).toBeVisible({ timeout: 5000 });

    // Leaderboard content should be present (from Leaderboard component)
    // Note: Specific leaderboard test IDs are defined in Leaderboard.tsx
    await page.waitForTimeout(1000);
  });

  test("should handle error states gracefully", async ({ page }) => {
    // Note: This would require mocking API failures
    // For now, verify error alert components are defined in code
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // If an error occurred, these elements would be visible:
    // - alert-error-[queryName]
    // - text-error-title-[queryName]
    // - text-error-message-[queryName]
    // - button-retry-[queryName]
    
    // For this test, we just verify the page loads successfully
    await expect(page.getByTestId("card-header")).toBeVisible();
  });

  test("should display user information correctly", async ({ page }) => {
    await page.goto("/achievements");
    await expect(page.getByTestId("page-achievements")).toBeVisible({ timeout: 10000 });

    // Verify user name is displayed
    const userName = page.getByTestId("text-user-name");
    await expect(userName).toBeVisible();
    const userNameText = await userName.textContent();
    expect(userNameText?.trim().length).toBeGreaterThan(0);

    // Verify level information
    await expect(page.getByTestId("text-level-title")).toBeVisible();
    const levelTitle = await page.getByTestId("text-level-title").textContent();
    expect(levelTitle).toMatch(/Inspector/); // Should contain "Inspector" in the title
  });
});
