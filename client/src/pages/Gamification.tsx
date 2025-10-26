import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementCard } from "@/components/AchievementCard";
import { Leaderboard } from "@/components/Leaderboard";
import { useAuth } from "@/hooks/useAuth";
import { achievementTracker, type AchievementProgress } from "@/utils/achievementTracker";
import { streakTracker, getStreakIcon, getStreakColor, streakTypes } from "@/utils/streakTracker";
import { 
  achievementDefinitions, 
  calculateLevelFromXP, 
  getLevelTitle,
  getAchievementsByCategory,
  type AchievementCategory
} from "@/data/achievementDefinitions";
import * as Icons from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

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

export default function Gamification() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [achievementProgress, setAchievementProgress] = useState<Map<string, AchievementProgress>>(new Map());

  // Initialize trackers
  useEffect(() => {
    if (user?.id) {
      achievementTracker.initialize(user.id);
      streakTracker.initialize(user.id);
    }
  }, [user?.id]);

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/achievements/user', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/achievements/user/${user!.id}`);
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    }
  });

  // Calculate achievement progress
  useEffect(() => {
    if (userStats) {
      const progress = achievementTracker.calculateAllProgress();
      setAchievementProgress(progress);
    }
  }, [userStats]);

  // Fetch streaks
  const { data: streaks } = useQuery({
    queryKey: ['/api/streaks', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/streaks/${user!.id}`);
      if (!response.ok) throw new Error('Failed to fetch streaks');
      return response.json();
    }
  });

  const levelInfo = userStats ? calculateLevelFromXP(userStats.totalXP) : null;
  const levelTitle = levelInfo ? getLevelTitle(levelInfo.level) : '';

  // Filter achievements by category
  const filteredAchievements = selectedCategory === 'all'
    ? achievementDefinitions
    : getAchievementsByCategory(selectedCategory);

  // Group achievements by status
  const groupedAchievements = {
    unlocked: filteredAchievements.filter(a => 
      achievementProgress.get(a.id)?.unlocked
    ),
    inProgress: filteredAchievements.filter(a => {
      const progress = achievementProgress.get(a.id);
      return progress && !progress.unlocked && progress.progress > 0;
    }),
    locked: filteredAchievements.filter(a => {
      const progress = achievementProgress.get(a.id);
      return !progress || (!progress.unlocked && progress.progress === 0);
    })
  };

  const categories: Array<{ id: AchievementCategory | 'all'; label: string; icon: keyof typeof Icons }> = [
    { id: 'all', label: 'All', icon: 'Grid3x3' },
    { id: 'inspection', label: 'Inspections', icon: 'ClipboardCheck' },
    { id: 'quality', label: 'Quality', icon: 'Star' },
    { id: 'speed', label: 'Speed', icon: 'Zap' },
    { id: 'blower_door', label: 'Blower Door', icon: 'Wind' },
    { id: 'tax_credit', label: 'Tax Credit', icon: 'DollarSign' },
    { id: 'photo', label: 'Photos', icon: 'Camera' },
    { id: 'team', label: 'Team', icon: 'Users' }
  ];

  if (statsLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Level and XP */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {levelInfo?.level || 1}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h1>
                <p className="text-muted-foreground">{levelTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Icons.Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {userStats?.achievements.length || 0} Achievements
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 max-w-md space-y-2">
              <div className="flex justify-between text-sm">
                <span>Level {levelInfo?.level}</span>
                <span>Level {(levelInfo?.level || 0) + 1}</span>
              </div>
              <Progress value={levelInfo?.progress || 0} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{levelInfo?.currentXP || 0} XP</span>
                <span>{levelInfo?.nextLevelXP || 100} XP to next level</span>
              </div>
            </div>

            <Link href="/challenges">
              <Button>
                <Icons.Target className="w-4 h-4 mr-2" />
                View Challenges
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Streaks Section */}
      {streaks && streaks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.Flame className="w-5 h-5 text-orange-500" />
              Active Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streaks.map((streak: any) => {
                const StreakIcon = Icons[getStreakIcon(streak.type) as keyof typeof Icons] || Icons.Flame;
                const streakType = streakTypes.find(t => t.id === streak.type);
                
                return (
                  <div
                    key={streak.type}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                  >
                    <StreakIcon className={`w-8 h-8 ${getStreakColor(streak.current)}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{streakType?.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getStreakColor(streak.current)}`}>
                          {streak.current}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          days • Best: {streak.best}
                        </span>
                      </div>
                    </div>
                    {streak.frozen && (
                      <Badge variant="secondary" className="text-xs">
                        <Icons.Snowflake className="w-3 h-3 mr-1" />
                        Frozen
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          {/* Category Filter */}
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="w-full">
                <div className="flex gap-2">
                  {categories.map(category => {
                    const Icon = Icons[category.icon];
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
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

          {/* Achievement Gallery */}
          <div className="space-y-6">
            {/* In Progress */}
            {groupedAchievements.inProgress.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Icons.Clock className="w-5 h-5 text-yellow-500" />
                  In Progress ({groupedAchievements.inProgress.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedAchievements.inProgress.map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      progress={achievementProgress.get(achievement.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unlocked */}
            {groupedAchievements.unlocked.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Icons.Trophy className="w-5 h-5 text-primary" />
                  Unlocked ({groupedAchievements.unlocked.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {groupedAchievements.unlocked.map(achievement => (
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

            {/* Locked */}
            {groupedAchievements.locked.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Icons.Lock className="w-5 h-5 text-muted-foreground" />
                  Locked ({groupedAchievements.locked.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 opacity-60">
                  {groupedAchievements.locked.map(achievement => (
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
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {/* Category Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Category Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.slice(1).map(category => {
                const categoryAchievements = getAchievementsByCategory(category.id as AchievementCategory);
                const unlockedCount = categoryAchievements.filter(a => 
                  achievementProgress.get(a.id)?.unlocked
                ).length;
                const percentage = (unlockedCount / categoryAchievements.length) * 100;
                const Icon = Icons[category.icon];

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {unlockedCount} / {categoryAchievements.length}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          {userStats?.recentAchievements && userStats.recentAchievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userStats.recentAchievements.slice(0, 5).map((recent, idx) => {
                    const achievement = achievementDefinitions.find(a => a.id === recent.achievementId);
                    if (!achievement) return null;
                    const Icon = Icons[achievement.icon as keyof typeof Icons] || Icons.Trophy;

                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(recent.unlockedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="secondary">+{achievement.xpReward} XP</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{userStats?.totalXP || 0}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{userStats?.achievements.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{levelInfo?.level || 1}</p>
                  <p className="text-xs text-muted-foreground">Level</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {streaks?.filter((s: any) => s.current > 0).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Streaks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}