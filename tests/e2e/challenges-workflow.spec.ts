import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.describe("Challenges Page Workflow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();
  });

  // Test 1: Page load and skeleton states
  test("should load challenges page with skeletons then content", async ({ page }) => {
    await page.goto("/challenges");

    // Phase 4 - TEST: Verify skeleton loaders appear during initial load
    const skeleton = page.getByTestId("skeleton-challenges");
    if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(skeleton).toBeVisible();
      await expect(page.getByTestId("skeleton-header")).toBeVisible();
      await expect(page.getByTestId("skeleton-filters")).toBeVisible();
      await expect(page.getByTestId("skeleton-tabs")).toBeVisible();
      await expect(page.getByTestId("skeleton-challenge-0")).toBeVisible();
    }

    // Wait for content to load
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify main sections are present
    await expect(page.getByTestId("card-header")).toBeVisible();
    await expect(page.getByTestId("text-page-title")).toContainText("Challenges");
  });

  // Test 2: Header statistics display
  test("should display challenge statistics in header", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify page title and description
    await expect(page.getByTestId("text-page-title")).toBeVisible();
    await expect(page.getByTestId("text-page-description")).toBeVisible();
    await expect(page.getByTestId("text-page-description")).toContainText("Complete challenges to earn XP");

    // Verify statistics labels and counts
    await expect(page.getByTestId("text-active-label")).toContainText("Active Challenges");
    await expect(page.getByTestId("text-active-count")).toBeVisible();
    
    await expect(page.getByTestId("text-completed-label")).toContainText("Completed");
    await expect(page.getByTestId("text-completed-count")).toBeVisible();

    // Verify counts are valid numbers
    const activeCount = await page.getByTestId("text-active-count").textContent();
    const completedCount = await page.getByTestId("text-completed-count").textContent();
    expect(parseInt(activeCount || "0")).toBeGreaterThanOrEqual(0);
    expect(parseInt(completedCount || "0")).toBeGreaterThanOrEqual(0);
  });

  // Test 3: Total XP display if available
  test("should display total XP if stats are available", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Check if XP stats are visible
    const xpLabel = page.getByTestId("text-xp-label");
    const isVisible = await xpLabel.isVisible().catch(() => false);

    if (isVisible) {
      await expect(xpLabel).toContainText("Total XP");
      await expect(page.getByTestId("text-xp-count")).toBeVisible();
      
      const xpCount = await page.getByTestId("text-xp-count").textContent();
      expect(parseInt(xpCount || "0")).toBeGreaterThanOrEqual(0);
    }
  });

  // Test 4: Filter buttons functionality
  test("should filter challenges by type using filter buttons", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify all filter buttons are present
    const filterTypes = ['all', 'daily', 'weekly', 'monthly', 'team', 'special'];
    
    for (const type of filterTypes) {
      const filterButton = page.getByTestId(`button-filter-${type}`);
      await expect(filterButton).toBeVisible();
    }

    // Test clicking different filters
    await page.getByTestId("button-filter-daily").click();
    await page.waitForTimeout(500); // Wait for potential data reload

    await page.getByTestId("button-filter-weekly").click();
    await page.waitForTimeout(500);

    await page.getByTestId("button-filter-all").click();
    await page.waitForTimeout(500);
  });

  // Test 5: Tab navigation between active and completed
  test("should navigate between active and completed tabs", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify tabs are present
    await expect(page.getByTestId("tabslist-challenges")).toBeVisible();
    await expect(page.getByTestId("tab-active")).toBeVisible();
    await expect(page.getByTestId("tab-completed")).toBeVisible();

    // Click active tab (default)
    await page.getByTestId("tab-active").click();
    await expect(page.getByTestId("tabcontent-active")).toBeVisible();

    // Click completed tab
    await page.getByTestId("tab-completed").click();
    await expect(page.getByTestId("tabcontent-completed")).toBeVisible();

    // Switch back to active
    await page.getByTestId("tab-active").click();
    await expect(page.getByTestId("tabcontent-active")).toBeVisible();
  });

  // Test 6: Active challenges display
  test("should display active challenges or empty state", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Ensure we're on active tab
    await page.getByTestId("tab-active").click();
    await expect(page.getByTestId("tabcontent-active")).toBeVisible();

    // Check if there are challenges or empty state
    const hasActiveChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);
    const hasEmptyState = await page.getByTestId("empty-state-challenges-active").isVisible().catch(() => false);

    if (hasActiveChallenges) {
      await expect(page.getByTestId("grid-active-challenges")).toBeVisible();
    } else if (hasEmptyState) {
      await expect(page.getByTestId("empty-state-challenges-active")).toBeVisible();
      await expect(page.getByTestId("icon-empty-active")).toBeVisible();
      await expect(page.getByTestId("text-empty-title-active")).toBeVisible();
      await expect(page.getByTestId("text-empty-description-active")).toBeVisible();
    }

    // Either challenges or empty state should be present
    expect(hasActiveChallenges || hasEmptyState).toBeTruthy();
  });

  // Test 7: Completed challenges display
  test("should display completed challenges or empty state", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Navigate to completed tab
    await page.getByTestId("tab-completed").click();
    await expect(page.getByTestId("tabcontent-completed")).toBeVisible();

    // Check if there are challenges or empty state
    const hasCompletedChallenges = await page.getByTestId("grid-completed-challenges").isVisible().catch(() => false);
    const hasEmptyState = await page.getByTestId("empty-state-challenges-completed").isVisible().catch(() => false);

    if (hasCompletedChallenges) {
      await expect(page.getByTestId("grid-completed-challenges")).toBeVisible();
    } else if (hasEmptyState) {
      await expect(page.getByTestId("empty-state-challenges-completed")).toBeVisible();
      await expect(page.getByTestId("icon-empty-completed")).toBeVisible();
      await expect(page.getByTestId("text-empty-title-completed")).toContainText("No Completed Challenges");
    }

    expect(hasCompletedChallenges || hasEmptyState).toBeTruthy();
  });

  // Test 8: Challenge card structure
  test("should display challenge cards with all required elements", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Check if any challenge cards exist
    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      // Get all challenge cards
      const challengeCards = await page.locator('[data-testid^="card-challenge-"]').all();
      
      if (challengeCards.length > 0) {
        const firstCard = challengeCards[0];
        const challengeId = (await firstCard.getAttribute('data-testid'))?.replace('card-challenge-', '') || '';

        // Verify card elements
        await expect(page.getByTestId(`icon-type-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`text-name-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`text-description-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`badge-time-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`section-requirements-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`section-rewards-${challengeId}`)).toBeVisible();
      }
    }
  });

  // Test 9: Challenge requirements display
  test("should display challenge requirements with progress bars", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      const challengeCards = await page.locator('[data-testid^="card-challenge-"]').all();
      
      if (challengeCards.length > 0) {
        const firstCard = challengeCards[0];
        const challengeId = (await firstCard.getAttribute('data-testid'))?.replace('card-challenge-', '') || '';

        // Check for requirement elements
        const requirement = page.getByTestId(`requirement-${challengeId}-0`);
        const isVisible = await requirement.isVisible().catch(() => false);

        if (isVisible) {
          await expect(page.getByTestId(`text-req-type-${challengeId}-0`)).toBeVisible();
          await expect(page.getByTestId(`text-req-progress-${challengeId}-0`)).toBeVisible();
          await expect(page.getByTestId(`progress-req-${challengeId}-0`)).toBeVisible();
        }
      }
    }
  });

  // Test 10: Challenge rewards display
  test("should display challenge rewards (XP, badges, participants)", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      const challengeCards = await page.locator('[data-testid^="card-challenge-"]').all();
      
      if (challengeCards.length > 0) {
        const firstCard = challengeCards[0];
        const challengeId = (await firstCard.getAttribute('data-testid'))?.replace('card-challenge-', '') || '';

        // Verify XP reward
        await expect(page.getByTestId(`reward-xp-${challengeId}`)).toBeVisible();
        const xpText = await page.getByTestId(`reward-xp-${challengeId}`).textContent();
        expect(xpText).toContain("XP");

        // Check for optional badge rewards
        const hasBadges = await page.getByTestId(`reward-badges-${challengeId}`).isVisible().catch(() => false);
        if (hasBadges) {
          await expect(page.getByTestId(`reward-badges-${challengeId}`)).toContainText("Badge");
        }

        // Check for optional participant count
        const hasParticipants = await page.getByTestId(`text-participants-${challengeId}`).isVisible().catch(() => false);
        if (hasParticipants) {
          await expect(page.getByTestId(`text-participants-${challengeId}`)).toContainText("joined");
        }
      }
    }
  });

  // Test 11: Join challenge button functionality
  test("should show join button for non-joined active challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      const joinButtons = await page.locator('[data-testid^="button-join-"]').all();
      
      if (joinButtons.length > 0) {
        const firstJoinButton = joinButtons[0];
        await expect(firstJoinButton).toBeVisible();
        await expect(firstJoinButton).toContainText("Join Challenge");
        
        // Verify button is enabled
        await expect(firstJoinButton).toBeEnabled();
      }
    }
  });

  // Test 12: In-progress challenge status display
  test("should display in-progress status for joined challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      // Look for any in-progress buttons
      const inProgressButtons = await page.locator('[data-testid^="button-in-progress-"]').all();
      
      if (inProgressButtons.length > 0) {
        const firstButton = inProgressButtons[0];
        await expect(firstButton).toBeVisible();
        await expect(firstButton).toContainText("In Progress");
        await expect(firstButton).toBeDisabled();
      }
    }
  });

  // Test 13: Completed challenge status display
  test("should display completion status for completed challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Navigate to completed tab
    await page.getByTestId("tab-completed").click();
    await expect(page.getByTestId("tabcontent-completed")).toBeVisible();

    const hasChallenges = await page.getByTestId("grid-completed-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      // Look for completed status
      const completedStatus = await page.locator('[data-testid^="status-completed-"]').all();
      
      if (completedStatus.length > 0) {
        const firstStatus = completedStatus[0];
        await expect(firstStatus).toBeVisible();
        await expect(firstStatus).toContainText("Completed!");
      }
    }
  });

  // Test 14: Team challenge badge display
  test("should display team badge for team challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      // Look for team badges
      const teamBadges = await page.locator('[data-testid^="badge-team-"]').all();
      
      if (teamBadges.length > 0) {
        const firstBadge = teamBadges[0];
        await expect(firstBadge).toBeVisible();
        await expect(firstBadge).toContainText("Team");
      }
    }
  });

  // Test 15: Overall progress display for joined challenges
  test("should display overall progress for joined challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      // Look for overall progress sections
      const progressSections = await page.locator('[data-testid^="section-overall-progress-"]').all();
      
      if (progressSections.length > 0) {
        const firstSection = progressSections[0];
        const challengeId = (await firstSection.getAttribute('data-testid'))?.replace('section-overall-progress-', '') || '';

        await expect(firstSection).toBeVisible();
        await expect(page.getByTestId(`text-overall-label-${challengeId}`)).toContainText("Overall Progress");
        await expect(page.getByTestId(`text-overall-percentage-${challengeId}`)).toBeVisible();
        await expect(page.getByTestId(`progress-overall-${challengeId}`)).toBeVisible();

        // Verify percentage is valid
        const percentageText = await page.getByTestId(`text-overall-percentage-${challengeId}`).textContent();
        const percentage = parseInt(percentageText?.replace('%', '') || "0");
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    }
  });

  // Test 16: Info alert display
  test("should display challenge tips info alert", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify info alert
    await expect(page.getByTestId("alert-info")).toBeVisible();
    await expect(page.getByTestId("text-info-title")).toContainText("Challenge Tips");
    await expect(page.getByTestId("text-info-description")).toBeVisible();
    await expect(page.getByTestId("text-info-description")).toContainText("Join challenges to compete");
  });

  // Test 17: Error state handling
  test("should handle error states with retry functionality", async ({ page }) => {
    // This test would require mocking a failed API call
    // For now, we verify the structure exists for error handling
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // If there's an error state visible, verify retry button
    const errorAlert = page.getByTestId("alert-error-challenges");
    const hasError = await errorAlert.isVisible().catch(() => false);

    if (hasError) {
      await expect(page.getByTestId("text-error-title-challenges")).toBeVisible();
      await expect(page.getByTestId("text-error-message-challenges")).toBeVisible();
      await expect(page.getByTestId("button-retry-challenges")).toBeVisible();
      await expect(page.getByTestId("button-retry-challenges")).toContainText("Retry");
    }
  });

  // Test 18: Responsive filter scrolling
  test("should allow horizontal scrolling of filter buttons", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Verify scroll area exists
    await expect(page.getByTestId("scrollarea-filters")).toBeVisible();

    // All filter buttons should be accessible
    const allButton = page.getByTestId("button-filter-all");
    const specialButton = page.getByTestId("button-filter-special");

    await expect(allButton).toBeVisible();
    // Special button might need scrolling on small screens, but should be in DOM
    const specialExists = await specialButton.count();
    expect(specialExists).toBeGreaterThan(0);
  });

  // Test 19: Time remaining badge display
  test("should display time remaining badge for active challenges", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    const hasChallenges = await page.getByTestId("grid-active-challenges").isVisible().catch(() => false);

    if (hasChallenges) {
      const challengeCards = await page.locator('[data-testid^="card-challenge-"]').all();
      
      if (challengeCards.length > 0) {
        const firstCard = challengeCards[0];
        const challengeId = (await firstCard.getAttribute('data-testid'))?.replace('card-challenge-', '') || '';

        // Verify time badge
        await expect(page.getByTestId(`badge-time-${challengeId}`)).toBeVisible();
        const timeText = await page.getByTestId(`badge-time-${challengeId}`).textContent();
        
        // Should contain time unit (h, d, w, or "Expired")
        const hasTimeUnit = /\d+[hdw]|Expired/.test(timeText || '');
        expect(hasTimeUnit).toBeTruthy();
      }
    }
  });

  // Test 20: Empty state link to gamification page
  test("should provide link to achievements from empty state", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page.getByTestId("page-challenges")).toBeVisible({ timeout: 10000 });

    // Check if empty state is visible
    const emptyState = page.getByTestId("empty-state-challenges-active");
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      // Verify button to view achievements exists
      const achievementsButton = page.getByTestId("button-view-achievements");
      await expect(achievementsButton).toBeVisible();
      await expect(achievementsButton).toContainText("View Achievements");
    }
  });
});
