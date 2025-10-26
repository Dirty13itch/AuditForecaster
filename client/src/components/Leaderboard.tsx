import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Crown,
  Star,
  Users,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getLevelTitle } from "@/data/achievementDefinitions";

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  profileImageUrl?: string;
  totalXP: number;
  level: number;
  rank: number;
  previousRank?: number;
  achievementCount: number;
  categoryScores?: Record<string, number>;
  teamId?: string;
  teamName?: string;
}

interface LeaderboardProps {
  defaultPeriod?: 'week' | 'month' | 'year' | 'all_time';
  defaultCategory?: 'overall' | 'inspections' | 'quality' | 'speed' | 'photos';
  showTeamToggle?: boolean;
  compact?: boolean;
}

export function Leaderboard({
  defaultPeriod = 'month',
  defaultCategory = 'overall',
  showTeamToggle = true,
  compact = false
}: LeaderboardProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState(defaultPeriod);
  const [category, setCategory] = useState(defaultCategory);
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');

  const { data: leaderboardData, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard', period, category, viewMode],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        category,
        mode: viewMode
      });
      const response = await fetch(`/api/leaderboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    }
  });

  const { data: userPosition } = useQuery<{ rank: number; nearbyUsers: LeaderboardEntry[] }>({
    queryKey: ['/api/leaderboard/position', period, category, viewMode, user?.id],
    enabled: !!user?.id && !!leaderboardData && !leaderboardData.find(e => e.userId === user.id),
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        category,
        mode: viewMode,
        userId: user!.id
      });
      const response = await fetch(`/api/leaderboard/position?${params}`);
      if (!response.ok) throw new Error('Failed to fetch user position');
      return response.json();
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 2:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 3:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMovementIndicator = (current: number, previous?: number) => {
    if (!previous || current === previous) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    if (current < previous) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">{previous - current}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs font-medium">{current - previous}</span>
      </div>
    );
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, isCurrentUser: boolean = false) => (
    <div
      key={entry.userId}
      className={`
        flex items-center gap-4 p-4 rounded-lg transition-colors
        ${isCurrentUser 
          ? 'bg-primary/10 border-2 border-primary' 
          : 'hover:bg-muted/50'
        }
      `}
      data-testid={`leaderboard-entry-${entry.userId}`}
    >
      <div className="flex items-center justify-center w-10">
        {entry.rank <= 3 ? (
          getRankIcon(entry.rank)
        ) : (
          <span className="text-lg font-bold text-muted-foreground">
            {entry.rank}
          </span>
        )}
      </div>

      <Avatar className="h-10 w-10">
        <AvatarImage src={entry.profileImageUrl} alt={entry.userName} />
        <AvatarFallback>
          {entry.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{entry.userName}</p>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">You</Badge>
          )}
          {entry.teamName && viewMode === 'individual' && (
            <Badge variant="secondary" className="text-xs">{entry.teamName}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Level {entry.level} · {getLevelTitle(entry.level)}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold">{entry.totalXP.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
        {entry.previousRank !== undefined && (
          <div className="w-12">
            {getMovementIndicator(entry.rank, entry.previousRank)}
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    // Compact view for dashboard widget
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Top Performers</CardTitle>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-24 h-7 text-xs" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </>
          ) : (
            <>
              {leaderboardData?.slice(0, 3).map(entry => (
                <div key={entry.userId} className="flex items-center gap-3">
                  <div className="w-6 text-center">
                    {entry.rank <= 3 ? getRankIcon(entry.rank) : <span className="text-sm font-bold">{entry.rank}</span>}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.profileImageUrl} />
                    <AvatarFallback className="text-xs">
                      {entry.userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.userName}</p>
                    <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                  </div>
                  <p className="text-sm font-bold">{entry.totalXP.toLocaleString()}</p>
                </div>
              ))}
              
              {user && userPosition && userPosition.rank > 10 && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Your Position</p>
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center">
                        <span className="text-sm font-bold">{userPosition.rank}</span>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">You</p>
                        <p className="text-xs text-muted-foreground">Level {user.level || 1}</p>
                      </div>
                      <p className="text-sm font-bold">{user.totalXP?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full leaderboard view
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <div className="flex flex-wrap gap-2">
            {showTeamToggle && (
              <div className="flex rounded-lg border p-1">
                <Button
                  variant={viewMode === 'individual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('individual')}
                  data-testid="button-individual"
                >
                  <User className="w-4 h-4 mr-1" />
                  Individual
                </Button>
                <Button
                  variant={viewMode === 'team' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('team')}
                  data-testid="button-team"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Team
                </Button>
              </div>
            )}
            
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-32" data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="inspections">Inspections</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="speed">Speed</SelectItem>
                <SelectItem value="photos">Photos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-28" data-testid="select-period-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardData?.map(entry => 
                renderLeaderboardEntry(entry, entry.userId === user?.id)
              )}
              
              {user && userPosition && userPosition.rank > 10 && (
                <>
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Your Position
                      </span>
                    </div>
                  </div>
                  
                  {userPosition.nearbyUsers.map(entry =>
                    renderLeaderboardEntry(entry, entry.userId === user.id)
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}