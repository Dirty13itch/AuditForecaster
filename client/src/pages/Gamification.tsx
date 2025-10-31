import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AchievementCard } from "@/components/AchievementCard";
import { Leaderboard } from "@/components/Leaderboard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  staggerContainer,
  cardAppear,
  listItem,
  fadeInUp
} from "@/lib/animations";
import { achievementTracker, type AchievementProgress } from "@/utils/achievementTracker";
import { streakTracker, getStreakIcon, getStreakColor, streakTypes } from "@/utils/streakTracker";
import { 
  achievementDefinitions, 
  calculateLevelFromXP, 
  getLevelTitle,
  getAchievementsByCategory,
  type AchievementCategory
} from "@/data/achievementDefinitions";
import {
  Trophy, Flame, Target, Grid3x3, ClipboardCheck, Star, Zap, Wind,
  DollarSign, Camera, Users, Clock, Lock, Snowflake, RefreshCw,
  AlertCircle, CheckCircle, Info, Award, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const ICON_MAP = {
  Grid3x3,
  ClipboardCheck,
  Star,
  Zap,
  Wind,
  DollarSign,
  Camera,
  Users,
  Trophy,
  Target,
  Flame,
  Clock,
  Lock,
  Snowflake,
  Award,
  TrendingUp
} as const;

// Phase 6 - DOCUMENT: Achievement categories with metadata for filtering and display
// Maps category IDs to user-friendly labels and corresponding Lucide icons
const ACHIEVEMENT_CATEGORIES: Array<{
  id: AchievementCategory | "all";
  label: string;
  icon: keyof typeof ICON_MAP;
}> = [
  { id: "all", label: "All", icon: "Grid3x3" },
  { id: "inspection", label: "Inspections", icon: "ClipboardCheck" },
  { id: "quality", label: "Quality", icon: "Star" },
  { id: "speed", label: "Speed", icon: "Zap" },
  { id: "blower_door", label: "Blower Door", icon: "Wind" },
  { id: "tax_credit", label: "Tax Credit", icon: "DollarSign" },
  { id: "photo", label: "Photos", icon: "Camera" },
  { id: "team", label: "Team", icon: "Users" },
];

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
function GamificationSkeletonLoaders() {
  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="skeleton-gamification">
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

// Phase 2 - BUILD: Empty state component for no data scenario
function EmptyGamificationState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-state-gamification"
    >
      <Trophy className="w-20 h-20 mb-4 text-muted-foreground opacity-50" data-testid="icon-empty-trophy" />
      <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
        No Achievements Yet
      </h3>
      <p className="text-muted-foreground max-w-md mb-6" data-testid="text-empty-description">
        Start completing inspections and tasks to unlock achievements and earn XP!
        Track your progress and compete with other inspectors.
      </p>
      <Link href="/jobs">
        <Button variant="outline" data-testid="button-get-started">
          <Target className="w-4 h-4 mr-2" />
          Start Inspecting
        </Button>
      </Link>
    </div>
  );
}

// Phase 2 - BUILD: Main Gamification component with comprehensive error handling and optimization
function GamificationContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
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
    retry: 2,
    queryFn: async () => {
      const response = await fetch(`/api/achievements/user/${user!.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch user stats");
      return response.json();
    },
  });

  // Phase 5 - HARDEN: Fetch streaks with retry and error handling
  const {
    data: streaks,
    isLoading: streaksLoading,
    error: streaksError,
    refetch: refetchStreaks,
  } = useQuery<StreakData[]>({
    queryKey: ["/api/streaks", user?.id],
    enabled: !!user?.id,
    retry: 2,
    queryFn: async () => {
      const response = await fetch(`/api/streaks/${user!.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch streaks");
      return response.json();
    },
  });

  // Phase 3 - OPTIMIZE: Calculate achievement progress only when userStats changes
  useEffect(() => {
    if (userStats) {
      const progress = achievementTracker.calculateAllProgress();
      setAchievementProgress(progress);
    }
  }, [userStats]);

  // Phase 3 - OPTIMIZE: Memoize level calculations to avoid recalculation on every render
  const levelInfo = useMemo(() => {
    return userStats ? calculateLevelFromXP(userStats.totalXP) : null;
  }, [userStats]);

  const levelTitle = useMemo(() => {
    return levelInfo ? getLevelTitle(levelInfo.level) : "";
  }, [levelInfo]);

  // Phase 3 - OPTIMIZE: Memoize filtered achievements to avoid recalculation
  const filteredAchievements = useMemo(() => {
    return selectedCategory === "all"
      ? achievementDefinitions
      : getAchievementsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Phase 3 - OPTIMIZE: Memoize grouped achievements based on progress state
  const groupedAchievements = useMemo(() => {
    return {
      unlocked: filteredAchievements.filter((a) =>
        achievementProgress.get(a.id)?.unlocked
      ),
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

  // Phase 3 - OPTIMIZE: Memoize category change handler
  const handleCategoryChange = useCallback((category: AchievementCategory | "all") => {
    setSelectedCategory(category);
  }, []);

  // Phase 3 - OPTIMIZE: Memoize refresh all handler
  const handleRefreshAll = useCallback(() => {
    refetchStats();
    refetchStreaks();
    toast({
      title: "Refreshed",
      description: "Achievement data has been refreshed",
    });
  }, [refetchStats, refetchStreaks, toast]);

  // Phase 2 - BUILD: Show skeleton loaders during initial load
  if (statsLoading || streaksLoading) {
    return <GamificationSkeletonLoaders />;
  }

  // Phase 2 - BUILD: Display error states with retry functionality
  if (statsError) {
    return (
      <div className="container mx-auto p-4" data-testid="page-gamification-error">
        <QueryErrorAlert error={statsError} refetch={refetchStats} queryName="user statistics" />
      </div>
    );
  }

  // Phase 2 - BUILD: Display empty state when user has no achievements
  if (userStats && userStats.achievements.length === 0 && !achievementProgress.size) {
    return (
      <div className="container mx-auto p-4" data-testid="page-gamification-empty">
        <EmptyGamificationState />
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto p-4 space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="page-gamification"
    >
      {/* Phase 2 - BUILD: Header with Level and XP - Comprehensive data-testid coverage */}
      <motion.div variants={cardAppear}>
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
                      {userStats?.achievements.length || 0} Achievements
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase 6 - DOCUMENT: XP progress section showing current level advancement */}
              <div className="flex-1 max-w-md space-y-2" data-testid="section-xp-progress">
                <div className="flex justify-between text-sm">
                  <span data-testid="text-level-from">Level {levelInfo?.level}</span>
                  <span data-testid="text-level-to">Level {(levelInfo?.level || 0) + 1}</span>
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

              {/* Phase 2 - BUILD: Action buttons section */}
              <div className="flex gap-2" data-testid="section-actions">
                <Button onClick={handleRefreshAll} variant="outline" data-testid="button-refresh">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Link href="/challenges">
                  <Button data-testid="button-view-challenges">
                    <Target className="w-4 h-4 mr-2" />
                    View Challenges
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Phase 2 - BUILD: Streaks Section with error handling */}
      {streaksError && (
        <QueryErrorAlert error={streaksError} refetch={refetchStreaks} queryName="streaks" />
      )}
      
      {streaks && streaks.length > 0 && (
        <motion.div variants={cardAppear}>
          <Card data-testid="card-streaks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="title-streaks">
                <Flame className="w-5 h-5 text-orange-500" />
                Active Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-streaks">
                {streaks.map((streak, index) => {
                  const StreakIconComponent = ICON_MAP[getStreakIcon(streak.type) as keyof typeof ICON_MAP] || Flame;
                  const streakType = streakTypes.find((t) => t.id === streak.type);

                  return (
                    <div
                      key={streak.type}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                      data-testid={`streak-${streak.type}`}
                    >
                      <StreakIconComponent
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
                          <span className="text-xs text-muted-foreground" data-testid={`text-streak-best-${streak.type}`}>
                            days • Best: {streak.best}
                          </span>
                        </div>
                      </div>
                      {streak.frozen && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-frozen-${streak.type}`}>
                          <Snowflake className="w-3 h-3 mr-1" />
                          Frozen
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Phase 2 - BUILD: Main Content Tabs with comprehensive test IDs */}
      <Tabs defaultValue="achievements" className="space-y-4" data-testid="tabs-main">
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

        {/* Phase 6 - DOCUMENT: Achievements Tab - Display and filter achievement cards */}
        <TabsContent value="achievements" className="space-y-4" data-testid="tab-content-achievements">
          {/* Category Filter */}
          <Card data-testid="card-category-filter">
            <CardContent className="p-4">
              <ScrollArea className="w-full">
                <div className="flex gap-2" data-testid="filter-categories">
                  {ACHIEVEMENT_CATEGORIES.map((category) => {
                    const IconComponent = ICON_MAP[category.icon];
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryChange(category.id)}
                        data-testid={`button-category-${category.id}`}
                      >
                        <IconComponent className="w-4 h-4 mr-1" />
                        {category.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Phase 2 - BUILD: Achievement Gallery with sections */}
          <div className="space-y-6" data-testid="section-achievement-gallery">
            {/* Phase 6 - DOCUMENT: Display empty state if no achievements in selected category */}
            {groupedAchievements.unlocked.length === 0 &&
              groupedAchievements.inProgress.length === 0 &&
              groupedAchievements.locked.length === 0 && (
                <div
                  className="text-center py-12"
                  data-testid="empty-state-category"
                >
                  <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground" data-testid="text-no-achievements">
                    No achievements in this category yet
                  </p>
                </div>
              )}

            {/* In Progress Section */}
            {groupedAchievements.inProgress.length > 0 && (
              <motion.div variants={fadeInUp} data-testid="section-in-progress">
                <h3
                  className="text-lg font-semibold mb-3 flex items-center gap-2"
                  data-testid="title-in-progress"
                >
                  <Clock className="w-5 h-5 text-yellow-500" />
                  In Progress ({groupedAchievements.inProgress.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-in-progress">
                  {groupedAchievements.inProgress.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                      data-testid={`achievement-in-progress-${achievement.id}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Unlocked Section */}
            {groupedAchievements.unlocked.length > 0 && (
              <motion.div variants={fadeInUp} data-testid="section-unlocked">
                <h3
                  className="text-lg font-semibold mb-3 flex items-center gap-2"
                  data-testid="title-unlocked"
                >
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
                      data-testid={`achievement-unlocked-${achievement.id}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Locked Section */}
            {groupedAchievements.locked.length > 0 && (
              <motion.div variants={fadeInUp} data-testid="section-locked">
                <h3
                  className="text-lg font-semibold mb-3 flex items-center gap-2"
                  data-testid="title-locked"
                >
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  Locked ({groupedAchievements.locked.length})
                </h3>
                <div
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 opacity-60"
                  data-testid="grid-locked"
                >
                  {groupedAchievements.locked.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                      compact
                      data-testid={`achievement-locked-${achievement.id}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>

        {/* Phase 6 - DOCUMENT: Leaderboard Tab - Display competitive rankings */}
        <TabsContent value="leaderboard" data-testid="tab-content-leaderboard">
          <Leaderboard />
        </TabsContent>

        {/* Phase 6 - DOCUMENT: Progress Tab - Display personal statistics and category progress */}
        <TabsContent value="progress" className="space-y-4" data-testid="tab-content-progress">
          {/* Category Progress */}
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
                const percentage = (unlockedCount / categoryAchievements.length) * 100;
                const IconComponent = ICON_MAP[category.icon];

                return (
                  <div key={category.id} className="space-y-2" data-testid={`progress-category-${category.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-category-name-${category.id}`}>
                          {category.label}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid={`text-category-count-${category.id}`}>
                        {unlockedCount} / {categoryAchievements.length}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" data-testid={`progress-bar-${category.id}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
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
                    const IconComponent = ICON_MAP[achievement.icon as keyof typeof ICON_MAP] || Trophy;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3"
                        data-testid={`recent-achievement-${idx}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary" />
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

          {/* Stats Overview */}
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
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
                <div className="text-center" data-testid="stat-achievements">
                  <p className="text-2xl font-bold" data-testid="text-achievement-total">
                    {userStats?.achievements.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
                <div className="text-center" data-testid="stat-level">
                  <p className="text-2xl font-bold" data-testid="text-level-stat">
                    {levelInfo?.level || 1}
                  </p>
                  <p className="text-xs text-muted-foreground">Level</p>
                </div>
                <div className="text-center" data-testid="stat-streaks">
                  <p className="text-2xl font-bold" data-testid="text-active-streaks">
                    {streaks?.filter((s) => s.current > 0).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Streaks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for production resilience
export default function Gamification() {
  return (
    <ErrorBoundary>
      <GamificationContent />
    </ErrorBoundary>
  );
}
