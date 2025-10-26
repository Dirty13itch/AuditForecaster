import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { 
  Trophy, 
  Target, 
  Clock, 
  Users, 
  Calendar,
  Award,
  TrendingUp,
  Star,
  Gift,
  ChevronRight
} from "lucide-react";
import { format, differenceInHours, differenceInDays } from "date-fns";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'team' | 'special';
  category: 'inspections' | 'quality' | 'speed' | 'collaboration' | 'mixed';
  startDate: string;
  endDate: string;
  requirements: Array<{
    type: string;
    target: number;
    current: number;
    unit: string;
  }>;
  rewards: {
    xp: number;
    badges?: string[];
    achievements?: string[];
    bonuses?: string[];
  };
  participants?: number;
  teamId?: string;
  status: 'active' | 'completed' | 'expired';
  userProgress?: {
    joined: boolean;
    progress: number;
    completedAt?: string;
    rank?: number;
  };
}

export default function Challenges() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'team' | 'special'>('all');

  // Fetch challenges
  const { data: challenges, isLoading, refetch } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges', selectedType],
    queryFn: async () => {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const response = await fetch(`/api/challenges${params}`);
      if (!response.ok) throw new Error('Failed to fetch challenges');
      return response.json();
    }
  });

  // Join challenge
  const joinChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to join challenge:', error);
    }
  };

  // Get time remaining
  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const hoursRemaining = differenceInHours(end, now);
    const daysRemaining = differenceInDays(end, now);

    if (hoursRemaining < 0) return 'Expired';
    if (hoursRemaining < 24) return `${hoursRemaining}h remaining`;
    if (daysRemaining < 7) return `${daysRemaining}d remaining`;
    return `${Math.floor(daysRemaining / 7)}w remaining`;
  };

  // Get challenge icon
  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily': return Clock;
      case 'weekly': return Calendar;
      case 'monthly': return TrendingUp;
      case 'team': return Users;
      case 'special': return Gift;
      default: return Target;
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'weekly': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'monthly': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'team': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'special': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Group challenges by status
  const activeChallenges = challenges?.filter(c => c.status === 'active') || [];
  const completedChallenges = challenges?.filter(c => c.status === 'completed') || [];

  const renderChallengeCard = (challenge: Challenge) => {
    const Icon = getChallengeIcon(challenge.type);
    const totalProgress = challenge.requirements.reduce((acc, req) => {
      return acc + (req.current / req.target) * 100;
    }, 0) / challenge.requirements.length;

    const isJoined = challenge.userProgress?.joined;
    const isCompleted = challenge.status === 'completed' || challenge.userProgress?.completedAt;

    return (
      <Card 
        key={challenge.id} 
        className={`
          transition-all
          ${isCompleted ? 'bg-muted/50' : 'hover-elevate'}
        `}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${getTypeColor(challenge.type)}
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{challenge.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {challenge.description}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-xs">
                {getTimeRemaining(challenge.endDate)}
              </Badge>
              {challenge.teamId && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Team
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Requirements */}
          <div className="space-y-3">
            {challenge.requirements.map((req, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{req.type.replace(/_/g, ' ')}</span>
                  <span className="font-medium">
                    {req.current} / {req.target} {req.unit}
                  </span>
                </div>
                <Progress 
                  value={(req.current / req.target) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          {isJoined && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} className="h-3" />
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center gap-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-sm">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">+{challenge.rewards.xp} XP</span>
            </div>
            {challenge.rewards.badges && challenge.rewards.badges.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Award className="w-4 h-4 text-purple-500" />
                <span>{challenge.rewards.badges.length} Badge{challenge.rewards.badges.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {challenge.participants && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                <Users className="w-4 h-4" />
                <span>{challenge.participants} joined</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isJoined && challenge.status === 'active' ? (
              <Button 
                className="w-full" 
                onClick={() => joinChallenge(challenge.id)}
                data-testid={`button-join-${challenge.id}`}
              >
                Join Challenge
              </Button>
            ) : isCompleted ? (
              <div className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-lg">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Completed!</span>
                {challenge.userProgress?.rank && (
                  <Badge variant="secondary" className="ml-auto">
                    Rank #{challenge.userProgress.rank}
                  </Badge>
                )}
              </div>
            ) : isJoined ? (
              <Button variant="outline" className="w-full" disabled>
                <Target className="w-4 h-4 mr-2" />
                In Progress
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Expired
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Challenges</h1>
              <p className="text-muted-foreground">
                Complete challenges to earn XP, badges, and climb the leaderboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active Challenges</p>
                <p className="text-2xl font-bold">{activeChallenges.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedChallenges.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'daily', 'weekly', 'monthly', 'team', 'special'].map(type => {
          const Icon = type === 'all' ? Target : getChallengeIcon(type);
          return (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type as any)}
              data-testid={`button-filter-${type}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          );
        })}
      </div>

      {/* Challenges */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeChallenges.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active challenges available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeChallenges.map(renderChallengeCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedChallenges.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed challenges yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedChallenges.map(renderChallengeCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}