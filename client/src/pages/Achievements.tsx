import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AchievementCard } from "@/components/AchievementCard";
import { Leaderboard } from "@/components/Leaderboard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeDivide, safeToFixed } from "@shared/numberUtils";
import {
  staggerContainer,
  cardAppear,
  listItem,
  fadeInUp
} from "@/lib/animations";
import {
  achievementDefinitions,
  calculateLevelFromXP,
  getLevelTitle,
  getAchievementsByCategory,
  getRarityColor,
  getRarityBackground,
  type AchievementDefinition,
  type AchievementCategory,
  type AchievementRarity
} from "@/data/achievementDefinitions";
import {
  Trophy, Award, Flame, Zap, Target, Building2, CheckCircle2,
  TrendingUp, Rocket, Calendar, Clock, Lock, Crown, Medal,
  Users, Star, Camera, Wind, DollarSign, ClipboardCheck,
  Grid3x3, RefreshCw, AlertCircle, CheckCircle, Info
} from "lucide-react";
import type { Achievement, UserAchievement } from "@shared/schema";
import { achievementTracker, type AchievementProgress } from "@/utils/achievementTracker";
import { streakTracker, getStreakIcon, getStreakColor, streakTypes } from "@/utils/streakTracker";
import { format } from "date-fns";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const ICON_MAP: Record<string, any> = {
  Trophy,
  Award,
  Flame,
  Zap,
  Target,
  Building2,
  CheckCircle2,
  TrendingUp,
  Rocket,
  Calendar,
  Wind,
  DollarSign,
  Camera,
  Star,
  Crown,
  Medal,
  ClipboardCheck,
  Users,
  Clock,
  Lock,
};

// Phase 6 - DOCUMENT: Achievement categories with metadata for filtering and display
// Maps category IDs to user-friendly labels and corresponding Lucide icons
const ACHIEVEMENT_CATEGORIES: Array<{
  id: AchievementCategory | "all";
  label: string;
  icon: keyof typeof ICON_MAP;
}> = [
  { id: "all", label: "All Achievements", icon: "Grid3x3" },
  { id: "inspection", label: "Inspections", icon: "ClipboardCheck" },
  { id: "quality", label: "Quality", icon: "Star" },
  { id: "speed", label: "Speed", icon: "Zap" },
  { id: "blower_door", label: "Blower Door", icon: "Wind" },
  { id: "tax_credit", label: "Tax Credit", icon: "DollarSign" },
  { id: "photo", label: "Photos", icon: "Camera" },
  { id: "team", label: "Team", icon: "Users" },
];

// Phase 6 - DOCUMENT: Rarity tier visual styling configuration
// Used to apply consistent color schemes across all rarity badges and backgrounds
const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "text-gray-600 dark:text-gray-400",
  rare: "text-blue-600 dark:text-blue-400",
  epic: "text-purple-600 dark:text-purple-400",
  legendary: "text-yellow-600 dark:text-yellow-400",
};

const RARITY_BACKGROUNDS: Record<AchievementRarity, string> = {
  common: "bg-gray-100 dark:bg-gray-800",
  rare: "bg-blue-100 dark:bg-blue-900",
  epic: "bg-purple-100 dark:bg-purple-900",
  legendary: "bg-yellow-100 dark:bg-yellow-900",
};

// Phase 6 - DOCUMENT: Gamification level progression thresholds
// Levels require exponentially increasing XP (level * 50 + 50 more than previous)
const LEVEL_THRESHOLDS = {
  novice: 5,      // Levels 1-5: Novice Inspector
  apprentice: 10, // Levels 6-10: Apprentice Inspector
  journeyman: 20, // Levels 11-20: Journeyman Inspector
  expert: 30,     // Levels 21-30: Expert Inspector
  master: 40,     // Levels 31-40: Master Inspector
  senior: 50,     // Levels 41-50: Senior Master
  legendary: 999, // Level 51+: Legendary Inspector
} as const;

// Phase 6 - DOCUMENT: User statistics interface for gamification system
// Tracks progress across all achievement categories and XP levels
interface UserStats {
  userId: string;
  totalXP: number;
  level: number;
  achievements: string[];
  stats: Record<string, number>;
  recentAchievements: Array<{
    achievementId: string;
    unlockedAt: string;
  }>;
  categoryProgress: Record<AchievementCategory, {
    unlocked: number;
    total: number;
    percentage: number;
  }>;
  nextAchievements: string[];
}

// Phase 6 - DOCUMENT: Streak data interface for consecutive activity tracking
// Monitors daily inspection patterns and maintains frozen streak states
interface StreakData {
  type: string;
  current: number;
  best: number;
  frozen: boolean;
  lastActivity?: string;
}

// Phase 2 - BUILD: Skeleton loader components for loading states
function AchievementsSkeletonLoaders() {
  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="skeleton-achievements">
      {/* Header skeleton */}
      <Skeleton className="h-32 w-full" data-testid="skeleton-header" />
      
      {/* Streaks skeleton */}
      <Skeleton className="h-40 w-full" data-testid="skeleton-streaks" />
      
      {/* Tabs and content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" data-testid="skeleton-tabs" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-achievement-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Per-query error component with retry functionality
function QueryErrorAlert({
  error,
  refetch,
  queryName,
}: {
  error: Error;
  refetch: () => void;
  queryName: string;
}) {
  return (
    <Alert variant="destructive" className="my-4" data-testid={`alert-error-${queryName}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle data-testid={`text-error-title-${queryName}`}>
        Failed to load {queryName}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span data-testid={`text-error-message-${queryName}`}>{error.message}</span>
        <Button
          onClick={refetch}
          variant="outline"
          size="sm"
          data-testid={`button-retry-${queryName}`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Phase 2 - BUILD: Empty state component for no achievements scenario
function EmptyAchievementsState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-state-achievements"
    >
      <Trophy className="w-20 h-20 mb-4 text-muted-foreground opacity-50" data-testid="icon-empty-trophy" />
      <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
        No Achievements Yet
      </h3>
      <p className="text-muted-foreground max-w-md mb-6" data-testid="text-empty-description">
        Start completing inspections and tasks to unlock achievements and earn XP!
        Track your progress and compete with other inspectors.
      </p>
      <Button variant="outline" data-testid="button-get-started">
        <Rocket className="w-4 h-4 mr-2" />
        Get Started
      </Button>
    </div>
  );
}

// Phase 2 - BUILD: Main Achievements component
function AchievementsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
  const [selectedTab, setSelectedTab] = useState("achievements");
  const [achievementProgress, setAchievementProgress] = useState<Map<string, AchievementProgress>>(
    new Map()
  );

  // Phase 3 - OPTIMIZE: Initialize trackers only when user changes
  useEffect(() => {
    if (user?.id) {
      achievementTracker.initialize(user.id);
      streakTracker.initialize(user.id);
    }
  }, [user?.id]);

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience against transient failures
  // Phase 2 - BUILD: Fetch user statistics with comprehensive error handling
  const {
    data: userStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<UserStats>({
    queryKey: ["/api/achievements/user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/achievements/user/${user!.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user statistics");
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch user achievements with retry logic
  const {
    data: userAchievements = [],
    isLoading: achievementsLoading,
    error: achievementsError,
    refetch: refetchAchievements,
  } = useQuery<Array<UserAchievement & { achievement: Achievement }>>({
    queryKey: ["/api/achievements/user"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch all available achievements
  const {
    data: allAchievements = [],
    isLoading: allAchievementsLoading,
    error: allAchievementsError,
    refetch: refetchAllAchievements,
  } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch streak data with retry
  const {
    data: streaks = [],
    isLoading: streaksLoading,
    error: streaksError,
    refetch: refetchStreaks,
  } = useQuery<StreakData[]>({
    queryKey: ["/api/streaks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/streaks/${user!.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch streaks");
      return response.json();
    },
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Calculate achievement progress when userStats changes
  // Memoized to prevent unnecessary recalculations
  useEffect(() => {
    if (userStats) {
      const progress = achievementTracker.calculateAllProgress();
      setAchievementProgress(progress);
    }
  }, [userStats]);

  // Phase 3 - OPTIMIZE: Mutation for checking new achievements
  const checkAchievementsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/achievements/check", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast({
          title: "Achievement Unlocked!",
          description: data.message,
        });
      } else {
        toast({
          title: "No New Achievements",
          description: "Keep up the great work! More achievements await.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/achievements/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check achievements",
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized level calculations with safeDivide
  // Phase 6 - DOCUMENT: Calculates current level, XP progress, and title based on total XP
  // Uses exponential curve: each level requires (level * 50 + 50) more XP than previous
  const levelInfo = useMemo(() => {
    if (!userStats) return null;
    return calculateLevelFromXP(userStats.totalXP);
  }, [userStats]);

  const levelTitle = useMemo(() => {
    if (!levelInfo) return "";
    return getLevelTitle(levelInfo.level);
  }, [levelInfo]);

  // Phase 3 - OPTIMIZE: Memoized filtered achievements by category
  // Prevents re-filtering on every render
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") {
      return achievementDefinitions;
    }
    return getAchievementsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Phase 3 - OPTIMIZE: Memoized grouped achievements by unlock status
  // Phase 6 - DOCUMENT: Groups achievements into unlocked, in-progress, and locked categories
  // In-progress: >0% but not unlocked; Locked: 0% progress
  const groupedAchievements = useMemo(() => {
    return {
      unlocked: filteredAchievements.filter((a) => achievementProgress.get(a.id)?.unlocked),
      inProgress: filteredAchievements.filter((a) => {
        const progress = achievementProgress.get(a.id);
        return progress && !progress.unlocked && progress.progress > 0;
      }),
      locked: filteredAchievements.filter((a) => {
        const progress = achievementProgress.get(a.id);
        return !progress || (!progress.unlocked && progress.progress === 0);
      }),
    };
  }, [filteredAchievements, achievementProgress]);

  // Phase 3 - OPTIMIZE: Memoized achievement statistics with safeDivide
  // Phase 5 - HARDEN: Uses safeDivide to prevent NaN from division by zero
  const achievementStats = useMemo(() => {
    const earnedCount = userAchievements.length;
    const totalCount = allAchievements.length || achievementDefinitions.length;
    const percentage = safeDivide(earnedCount * 100, totalCount, 0);

    // Phase 6 - DOCUMENT: Calculate rarity distribution of earned achievements
    const rarityCount: Record<AchievementRarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    userAchievements.forEach((ua) => {
      const def = achievementDefinitions.find((a) => a.id === ua.achievement.id);
      if (def && def.rarity) {
        rarityCount[def.rarity]++;
      }
    });

    return {
      earned: earnedCount,
      total: totalCount,
      percentage: Math.min(percentage, 100), // Phase 5 - HARDEN: Cap at 100%
      rarityCount,
    };
  }, [userAchievements, allAchievements]);

  // Phase 3 - OPTIMIZE: useCallback for all event handlers
  const handleCategoryChange = useCallback((category: AchievementCategory | "all") => {
    setSelectedCategory(category);
  }, []);

  const handleCheckAchievements = useCallback(() => {
    checkAchievementsMutation.mutate();
  }, [checkAchievementsMutation]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchAchievements(),
      refetchAllAchievements(),
      refetchStreaks(),
    ]);
    toast({
      title: "Refreshed",
      description: "All achievement data has been updated",
    });
  }, [refetchStats, refetchAchievements, refetchAllAchievements, refetchStreaks, toast]);

  // Phase 2 - BUILD: Loading state with comprehensive skeleton loaders
  if (statsLoading || achievementsLoading || allAchievementsLoading) {
    return <AchievementsSkeletonLoaders />;
  }

  // Phase 2 - BUILD: Per-query error states with individual retry buttons
  if (statsError) {
    return <QueryErrorAlert error={statsError} refetch={refetchStats} queryName="user stats" />;
  }

  if (achievementsError) {
    return (
      <QueryErrorAlert
        error={achievementsError}
        refetch={refetchAchievements}
        queryName="achievements"
      />
    );
  }

  if (allAchievementsError) {
    return (
      <QueryErrorAlert
        error={allAchievementsError}
        refetch={refetchAllAchievements}
        queryName="all achievements"
      />
    );
  }

  // Phase 2 - BUILD: Empty state when no achievements exist
  if (achievementStats.total === 0) {
    return <EmptyAchievementsState />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="page-achievements">
      {/* Phase 6 - DOCUMENT: Header card displays user level, XP progress, and quick actions */}
      {/* Shows current level title, progress to next level, and total achievements earned */}
      <motion.div variants={cardAppear} initial="hidden" animate="visible">
        <Card data-testid="card-header">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4" data-testid="section-user-info">
                <div
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                  data-testid="badge-level"
                >
                  <span className="text-3xl font-bold text-primary" data-testid="text-level">
                    {levelInfo?.level || 1}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <p className="text-muted-foreground" data-testid="text-level-title">
                    {levelTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Trophy className="w-4 h-4 text-yellow-500" data-testid="icon-trophy" />
                    <span className="text-sm font-medium" data-testid="text-achievement-count">
                      {achievementStats.earned} / {achievementStats.total} Achievements (
                      {safeToFixed(achievementStats.percentage, 0)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md space-y-2" data-testid="section-xp-progress">
                <div className="flex justify-between text-sm">
                  <span data-testid="text-current-level">Level {levelInfo?.level}</span>
                  <span data-testid="text-next-level">Level {(levelInfo?.level || 0) + 1}</span>
                </div>
                <Progress
                  value={levelInfo?.progress || 0}
                  className="h-3"
                  data-testid="progress-level"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid="text-current-xp">{levelInfo?.currentXP || 0} XP</span>
                  <span data-testid="text-xp-to-next">
                    {levelInfo?.nextLevelXP || 100} XP to next level
                  </span>
                </div>
              </div>

              <div className="flex gap-2" data-testid="section-actions">
                <Button
                  onClick={handleCheckAchievements}
                  disabled={checkAchievementsMutation.isPending}
                  data-testid="button-check-achievements"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {checkAchievementsMutation.isPending ? "Checking..." : "Check Progress"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Phase 6 - DOCUMENT: Streaks section displays active consecutive activity streaks */}
      {/* Shows daily inspection patterns with freeze protection and best streak records */}
      {streaks && streaks.length > 0 && (
        <motion.div variants={cardAppear} initial="hidden" animate="visible">
          <Card data-testid="card-streaks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="title-streaks">
                <Flame className="w-5 h-5 text-orange-500" />
                Active Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {streaksError ? (
                <QueryErrorAlert error={streaksError} refetch={refetchStreaks} queryName="streaks" />
              ) : streaksLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20" data-testid={`skeleton-streak-${i}`} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-streaks">
                  {streaks.map((streak) => {
                    const StreakIcon = ICON_MAP[getStreakIcon(streak.type)] || Flame;
                    const streakType = streakTypes.find((t) => t.id === streak.type);

                    return (
                      <div
                        key={streak.type}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                        data-testid={`streak-${streak.type}`}
                      >
                        <StreakIcon
                          className={`w-8 h-8 ${getStreakColor(streak.current)}`}
                          data-testid={`icon-streak-${streak.type}`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-streak-name-${streak.type}`}>
                            {streakType?.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-2xl font-bold ${getStreakColor(streak.current)}`}
                              data-testid={`text-streak-current-${streak.type}`}
                            >
                              {streak.current}
                            </span>
                            <span
                              className="text-xs text-muted-foreground"
                              data-testid={`text-streak-best-${streak.type}`}
                            >
                              days • Best: {streak.best}
                            </span>
                          </div>
                        </div>
                        {streak.frozen && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-frozen-${streak.type}`}>
                            Frozen
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Phase 6 - DOCUMENT: Main tabs navigation for achievements, leaderboard, and progress views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4" data-testid="tabs-main">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list">
          <TabsTrigger value="achievements" data-testid="tab-achievements">
            Achievements
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="progress" data-testid="tab-progress">
            My Progress
          </TabsTrigger>
        </TabsList>

        {/* Phase 6 - DOCUMENT: Achievements tab with category filtering and status grouping */}
        <TabsContent value="achievements" className="space-y-4" data-testid="tab-content-achievements">
          {/* Category filter */}
          <Card data-testid="card-category-filter">
            <CardContent className="p-4">
              <ScrollArea className="w-full" data-testid="scroll-categories">
                <div className="flex gap-2 flex-wrap" data-testid="grid-categories">
                  {ACHIEVEMENT_CATEGORIES.map((category) => {
                    const Icon = ICON_MAP[category.icon];
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryChange(category.id)}
                        data-testid={`button-category-${category.id}`}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {category.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Phase 6 - DOCUMENT: Achievement gallery grouped by unlock status */}
          {/* In Progress: partial completion, Unlocked: fully earned, Locked: not started */}
          <div className="space-y-6" data-testid="section-achievement-gallery">
            {/* In Progress achievements */}
            {groupedAchievements.inProgress.length > 0 && (
              <div data-testid="section-in-progress">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="title-in-progress">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  In Progress ({groupedAchievements.inProgress.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-in-progress">
                  {groupedAchievements.inProgress.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unlocked achievements */}
            {groupedAchievements.unlocked.length > 0 && (
              <div data-testid="section-unlocked">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="title-unlocked">
                  <Trophy className="w-5 h-5 text-primary" />
                  Unlocked ({groupedAchievements.unlocked.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="grid-unlocked">
                  {groupedAchievements.unlocked.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Locked achievements */}
            {groupedAchievements.locked.length > 0 && (
              <div data-testid="section-locked">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="title-locked">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  Locked ({groupedAchievements.locked.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 opacity-60" data-testid="grid-locked">
                  {groupedAchievements.locked.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for category */}
            {groupedAchievements.unlocked.length === 0 &&
              groupedAchievements.inProgress.length === 0 &&
              groupedAchievements.locked.length === 0 && (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-testid="empty-state-category"
                >
                  <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p data-testid="text-empty-category">
                    No achievements in this category yet
                  </p>
                </div>
              )}
          </div>
        </TabsContent>

        {/* Phase 6 - DOCUMENT: Leaderboard tab showing rankings and competitive stats */}
        <TabsContent value="leaderboard" data-testid="tab-content-leaderboard">
          <Leaderboard />
        </TabsContent>

        {/* Phase 6 - DOCUMENT: Progress tab with category breakdowns and statistics */}
        <TabsContent value="progress" className="space-y-4" data-testid="tab-content-progress">
          {/* Category progress */}
          <Card data-testid="card-category-progress">
            <CardHeader>
              <CardTitle data-testid="title-category-progress">Category Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ACHIEVEMENT_CATEGORIES.slice(1).map((category) => {
                const categoryAchievements = getAchievementsByCategory(
                  category.id as AchievementCategory
                );
                const unlockedCount = categoryAchievements.filter((a) =>
                  achievementProgress.get(a.id)?.unlocked
                ).length;
                // Phase 5 - HARDEN: Use safeDivide to prevent NaN
                const percentage = safeDivide(unlockedCount * 100, categoryAchievements.length, 0);
                const Icon = ICON_MAP[category.icon];

                return (
                  <div key={category.id} className="space-y-2" data-testid={`progress-category-${category.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-category-name-${category.id}`}>
                          {category.label}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid={`text-category-count-${category.id}`}>
                        {unlockedCount} / {categoryAchievements.length}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className="h-2"
                      data-testid={`progress-bar-${category.id}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent achievements */}
          {userStats?.recentAchievements && userStats.recentAchievements.length > 0 && (
            <Card data-testid="card-recent-achievements">
              <CardHeader>
                <CardTitle data-testid="title-recent-achievements">Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="list-recent-achievements">
                  {userStats.recentAchievements.slice(0, 5).map((recent, idx) => {
                    const achievement = achievementDefinitions.find(
                      (a) => a.id === recent.achievementId
                    );
                    if (!achievement) return null;
                    const Icon = ICON_MAP[achievement.icon] || Trophy;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3"
                        data-testid={`recent-achievement-${idx}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-recent-name-${idx}`}>
                            {achievement.name}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-recent-date-${idx}`}>
                            {format(new Date(recent.unlockedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="secondary" data-testid={`badge-recent-xp-${idx}`}>
                          +{achievement.xpReward} XP
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats overview */}
          <Card data-testid="card-stats-overview">
            <CardHeader>
              <CardTitle data-testid="title-stats-overview">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="grid-stats">
                <div className="text-center" data-testid="stat-total-xp">
                  <p className="text-2xl font-bold" data-testid="text-total-xp">
                    {userStats?.totalXP || 0}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="label-total-xp">
                    Total XP
                  </p>
                </div>
                <div className="text-center" data-testid="stat-achievements">
                  <p className="text-2xl font-bold" data-testid="text-achievement-total">
                    {achievementStats.earned}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="label-achievements">
                    Achievements
                  </p>
                </div>
                <div className="text-center" data-testid="stat-level">
                  <p className="text-2xl font-bold" data-testid="text-level-stat">
                    {levelInfo?.level || 1}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="label-level">
                    Level
                  </p>
                </div>
                <div className="text-center" data-testid="stat-streaks">
                  <p className="text-2xl font-bold" data-testid="text-active-streaks">
                    {streaks?.filter((s: any) => s.current > 0).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="label-streaks">
                    Active Streaks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rarity distribution */}
          <Card data-testid="card-rarity-distribution">
            <CardHeader>
              <CardTitle data-testid="title-rarity">Rarity Distribution</CardTitle>
              <CardDescription data-testid="description-rarity">
                Breakdown of achievements by rarity tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="grid-rarity">
                {(Object.keys(RARITY_COLORS) as AchievementRarity[]).map((rarity) => (
                  <div
                    key={rarity}
                    className="text-center p-4 rounded-lg border"
                    data-testid={`rarity-${rarity}`}
                  >
                    <div className={`text-3xl font-bold ${RARITY_COLORS[rarity]}`} data-testid={`text-rarity-count-${rarity}`}>
                      {achievementStats.rarityCount[rarity]}
                    </div>
                    <div className="text-sm capitalize mt-1" data-testid={`text-rarity-label-${rarity}`}>
                      {rarity}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for crash protection
export default function Achievements() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-4" data-testid="error-boundary-achievements">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle data-testid="text-error-boundary-title">
              Something went wrong
            </AlertTitle>
            <AlertDescription data-testid="text-error-boundary-description">
              There was an error loading the achievements page. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <AchievementsContent />
    </ErrorBoundary>
  );
}
