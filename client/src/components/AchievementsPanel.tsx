import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Flame, Zap, Target, Building2, CheckCircle2, TrendingUp, Rocket, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Achievement, UserAchievement } from "@shared/schema";

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
};

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700/20 text-amber-700 dark:bg-amber-700/30 dark:text-amber-400",
  silver: "bg-slate-400/20 text-slate-700 dark:bg-slate-400/30 dark:text-slate-300",
  gold: "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-400",
  platinum: "bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400",
};

interface AchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

export function AchievementsPanel() {
  const { toast } = useToast();
  
  const { data: userAchievements, isLoading } = useQuery<AchievementWithDetails[]>({
    queryKey: ["/api/achievements/user"],
  });

  const { data: allAchievements } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
  });

  const checkAchievementsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/achievements/check", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast({
          title: "🎉 Achievement Unlocked!",
          description: data.message,
        });
      } else {
        toast({
          title: "No New Achievements",
          description: "Keep up the great work! More achievements await.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/achievements/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check achievements",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-achievements">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading achievements...</div>
        </CardContent>
      </Card>
    );
  }

  const earnedAchievements = userAchievements || [];
  const earnedIds = new Set(earnedAchievements.map(ua => ua.achievementId));
  const lockedAchievements = (allAchievements || []).filter(a => !earnedIds.has(a.id));

  return (
    <Card data-testid="card-achievements">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
            <Badge variant="secondary" data-testid="badge-achievement-count">
              {earnedAchievements.length} / {(allAchievements || []).length}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => checkAchievementsMutation.mutate()}
            disabled={checkAchievementsMutation.isPending}
            data-testid="button-check-achievements"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checkAchievementsMutation.isPending ? 'animate-spin' : ''}`} />
            {checkAchievementsMutation.isPending ? 'Checking...' : 'Check'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {earnedAchievements.length === 0 && lockedAchievements.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No achievements available yet</p>
            <p className="text-xs mt-1">Complete inspections to unlock achievements!</p>
          </div>
        )}

        {earnedAchievements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Earned</h3>
            <div className="grid gap-3">
              {earnedAchievements.map(ua => (
                <AchievementCard
                  key={ua.id}
                  achievement={ua.achievement}
                  earned={true}
                  earnedAt={ua.earnedAt}
                  data-testid={`achievement-earned-${ua.achievement.id}`}
                />
              ))}
            </div>
          </div>
        )}

        {lockedAchievements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Locked</h3>
            <div className="grid gap-3">
              {lockedAchievements.slice(0, 3).map(achievement => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  earned={false}
                  data-testid={`achievement-locked-${achievement.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: Date | null;
  "data-testid"?: string;
}

function AchievementCard({ achievement, earned, earnedAt, "data-testid": testId }: AchievementCardProps) {
  const Icon = ICON_MAP[achievement.iconName] || Trophy;
  const tierColor = achievement.tier ? TIER_COLORS[achievement.tier] : TIER_COLORS.bronze;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border ${
        earned ? 'bg-card' : 'bg-muted/30 opacity-60'
      }`}
      data-testid={testId}
    >
      <div
        className={`p-2 rounded-md ${earned ? tierColor : 'bg-muted'}`}
        data-testid="achievement-icon"
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm" data-testid="achievement-name">
              {achievement.name}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="achievement-description">
              {achievement.description}
            </p>
          </div>
          {achievement.tier && (
            <Badge variant="outline" className={`text-xs capitalize ${tierColor}`} data-testid="achievement-tier">
              {achievement.tier}
            </Badge>
          )}
        </div>
        {earned && earnedAt && (
          <p className="text-xs text-muted-foreground mt-2" data-testid="achievement-earned-date">
            Earned {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
        {!earned && (
          <div className="mt-2" data-testid="achievement-progress">
            <Progress value={0} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
