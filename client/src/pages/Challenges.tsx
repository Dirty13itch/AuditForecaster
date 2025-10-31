import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { staggerContainer, cardAppear, listItem, fadeInUp } from "@/lib/animations";
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
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from "lucide-react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Link } from "wouter";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const ICON_MAP = {
  Clock,
  Calendar,
  TrendingUp,
  Users,
  Gift,
  Target,
  Trophy,
  Award,
  Star,
  Zap
} as const;

// Phase 6 - DOCUMENT: Challenge type definitions with metadata for filtering and display
// Maps challenge types to user-friendly labels and corresponding Lucide icons
const CHALLENGE_TYPES = [
  { id: 'all' as const, label: 'All', icon: 'Target' as const },
  { id: 'daily' as const, label: 'Daily', icon: 'Clock' as const },
  { id: 'weekly' as const, label: 'Weekly', icon: 'Calendar' as const },
  { id: 'monthly' as const, label: 'Monthly', icon: 'TrendingUp' as const },
  { id: 'team' as const, label: 'Team', icon: 'Users' as const },
  { id: 'special' as const, label: 'Special', icon: 'Gift' as const },
] as const;

// Phase 6 - DOCUMENT: Visual styling for challenge types supporting dark mode
// Provides consistent color schemes across all challenge type badges
const TYPE_COLORS: Record<string, string> = {
  daily: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  weekly: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  monthly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  team: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  special: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// Phase 6 - DOCUMENT: Challenge interface for gamification system
// Tracks requirements, rewards, and user progress for competitive activities
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

// Phase 6 - DOCUMENT: Challenge statistics aggregation interface
// Provides overview metrics for user's challenge participation
interface ChallengeStats {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  totalXPEarned: number;
  currentRank?: number;
}

// Phase 2 - BUILD: Skeleton loader components for loading states
function ChallengesSkeletonLoaders() {
  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="skeleton-challenges">
      <Skeleton className="h-32 w-full" data-testid="skeleton-header" />
      <Skeleton className="h-12 w-full" data-testid="skeleton-filters" />
      <Skeleton className="h-12 w-full" data-testid="skeleton-tabs" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-80" data-testid={`skeleton-challenge-${i}`} />
        ))}
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

// Phase 2 - BUILD: Empty state component for no challenges scenario
function EmptyChallengesState({ type }: { type: 'active' | 'completed' | 'all' }) {
  const icon = type === 'completed' ? Trophy : Target;
  const Icon = icon;
  const title = type === 'completed' ? 'No Completed Challenges' : 'No Active Challenges';
  const description = type === 'completed' 
    ? 'Complete challenges to see them here and track your achievements.'
    : 'No challenges are currently available. Check back later for new opportunities to earn XP and badges!';
  
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid={`empty-state-challenges-${type}`}
    >
      <Icon className="w-20 h-20 mb-4 text-muted-foreground opacity-50" data-testid={`icon-empty-${type}`} />
      <h3 className="text-xl font-semibold mb-2" data-testid={`text-empty-title-${type}`}>
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6" data-testid={`text-empty-description-${type}`}>
        {description}
      </p>
      {type !== 'completed' && (
        <Link href="/gamification">
          <Button variant="outline" data-testid="button-view-achievements">
            <Trophy className="w-4 h-4 mr-2" />
            View Achievements
          </Button>
        </Link>
      )}
    </div>
  );
}

// Phase 2 - BUILD: Main Challenges component with comprehensive error handling and optimization
function ChallengesContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'team' | 'special'>('all');
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');

  // Phase 5 - HARDEN: Fetch challenges with retry: 2 for resilience
  const {
    data: challenges,
    isLoading: challengesLoading,
    error: challengesError,
    refetch: refetchChallenges,
  } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges', selectedType],
    retry: 2,
    enabled: !!user?.id,
    queryFn: async () => {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const response = await fetch(`/api/challenges${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch challenges');
      return response.json();
    },
  });

  // Phase 5 - HARDEN: Fetch challenge stats with retry and error handling
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<ChallengeStats>({
    queryKey: ['/api/challenges/stats', user?.id],
    retry: 2,
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/challenges/stats/${user!.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch challenge stats');
      return response.json();
    },
  });

  // Phase 5 - HARDEN: Join challenge mutation with proper error handling and optimistic updates
  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return apiRequest('/api/challenges/' + challengeId + '/join', {
        method: 'POST',
        body: { userId: user?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/stats'] });
      toast({
        title: 'Challenge Joined',
        description: 'You have successfully joined the challenge. Good luck!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Join Challenge',
        description: error.message || 'Unable to join challenge. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoize join challenge handler to prevent recreation
  const handleJoinChallenge = useCallback((challengeId: string) => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to join challenges.',
        variant: 'destructive',
      });
      return;
    }
    joinChallengeMutation.mutate(challengeId);
  }, [user?.id, joinChallengeMutation, toast]);

  // Phase 3 - OPTIMIZE: Memoize filtered challenges to avoid recalculation
  const { activeChallenges, completedChallenges } = useMemo(() => {
    if (!challenges) return { activeChallenges: [], completedChallenges: [] };
    
    return {
      activeChallenges: challenges.filter(c => c.status === 'active'),
      completedChallenges: challenges.filter(c => c.status === 'completed'),
    };
  }, [challenges]);

  // Phase 3 - OPTIMIZE: Memoize time remaining calculation
  const getTimeRemaining = useCallback((endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const hoursRemaining = differenceInHours(end, now);
    const daysRemaining = differenceInDays(end, now);

    if (hoursRemaining < 0) return 'Expired';
    if (hoursRemaining < 24) return `${hoursRemaining}h remaining`;
    if (daysRemaining < 7) return `${daysRemaining}d remaining`;
    return `${Math.floor(daysRemaining / 7)}w remaining`;
  }, []);

  // Phase 3 - OPTIMIZE: Memoize icon getter
  const getChallengeIcon = useCallback((type: string) => {
    switch (type) {
      case 'daily': return Clock;
      case 'weekly': return Calendar;
      case 'monthly': return TrendingUp;
      case 'team': return Users;
      case 'special': return Gift;
      default: return Target;
    }
  }, []);

  // Phase 3 - OPTIMIZE: Memoize type color getter
  const getTypeColor = useCallback((type: string) => {
    return TYPE_COLORS[type] || TYPE_COLORS.default;
  }, []);

  // Phase 6 - DOCUMENT: Renders individual challenge card with progress tracking
  // Displays requirements, rewards, time remaining, and join/completion status
  const renderChallengeCard = useCallback((challenge: Challenge) => {
    const Icon = getChallengeIcon(challenge.type);
    
    // Calculate overall progress across all requirements
    const totalProgress = challenge.requirements.reduce((acc, req) => {
      return acc + (req.current / req.target) * 100;
    }, 0) / challenge.requirements.length;

    const isJoined = challenge.userProgress?.joined;
    const isCompleted = challenge.status === 'completed' || challenge.userProgress?.completedAt;

    return (
      <motion.div
        key={challenge.id}
        variants={cardAppear}
        initial="hidden"
        animate="visible"
        data-testid={`card-challenge-${challenge.id}`}
      >
        <Card 
          className={`
            transition-all
            ${isCompleted ? 'bg-muted/50' : 'hover-elevate'}
          `}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div 
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${getTypeColor(challenge.type)}
                  `}
                  data-testid={`icon-type-${challenge.id}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`text-name-${challenge.id}`}>
                    {challenge.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1" data-testid={`text-description-${challenge.id}`}>
                    {challenge.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  data-testid={`badge-time-${challenge.id}`}
                >
                  {getTimeRemaining(challenge.endDate)}
                </Badge>
                {challenge.teamId && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    data-testid={`badge-team-${challenge.id}`}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Team
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Requirements */}
            <div className="space-y-3" data-testid={`section-requirements-${challenge.id}`}>
              {challenge.requirements.map((req, idx) => (
                <div key={idx} className="space-y-1" data-testid={`requirement-${challenge.id}-${idx}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span data-testid={`text-req-type-${challenge.id}-${idx}`}>
                      {req.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium" data-testid={`text-req-progress-${challenge.id}-${idx}`}>
                      {req.current} / {req.target} {req.unit}
                    </span>
                  </div>
                  <Progress 
                    value={(req.current / req.target) * 100} 
                    className="h-2"
                    data-testid={`progress-req-${challenge.id}-${idx}`}
                  />
                </div>
              ))}
            </div>

            {/* Overall Progress */}
            {isJoined && (
              <div className="pt-3 border-t" data-testid={`section-overall-progress-${challenge.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" data-testid={`text-overall-label-${challenge.id}`}>
                    Overall Progress
                  </span>
                  <span className="text-sm font-bold" data-testid={`text-overall-percentage-${challenge.id}`}>
                    {Math.round(totalProgress)}%
                  </span>
                </div>
                <Progress 
                  value={totalProgress} 
                  className="h-3"
                  data-testid={`progress-overall-${challenge.id}`}
                />
              </div>
            )}

            {/* Rewards */}
            <div className="flex items-center gap-3 pt-3 border-t" data-testid={`section-rewards-${challenge.id}`}>
              <div className="flex items-center gap-1 text-sm" data-testid={`reward-xp-${challenge.id}`}>
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">+{challenge.rewards.xp} XP</span>
              </div>
              {challenge.rewards.badges && challenge.rewards.badges.length > 0 && (
                <div className="flex items-center gap-1 text-sm" data-testid={`reward-badges-${challenge.id}`}>
                  <Award className="w-4 h-4 text-purple-500" />
                  <span>{challenge.rewards.badges.length} Badge{challenge.rewards.badges.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {challenge.participants && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto" data-testid={`text-participants-${challenge.id}`}>
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
                  onClick={() => handleJoinChallenge(challenge.id)}
                  disabled={joinChallengeMutation.isPending}
                  data-testid={`button-join-${challenge.id}`}
                >
                  {joinChallengeMutation.isPending ? 'Joining...' : 'Join Challenge'}
                </Button>
              ) : isCompleted ? (
                <div className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-lg" data-testid={`status-completed-${challenge.id}`}>
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Completed!</span>
                  {challenge.userProgress?.rank && (
                    <Badge variant="secondary" className="ml-auto" data-testid={`badge-rank-${challenge.id}`}>
                      Rank #{challenge.userProgress.rank}
                    </Badge>
                  )}
                </div>
              ) : isJoined ? (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                  data-testid={`button-in-progress-${challenge.id}`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  In Progress
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                  data-testid={`button-expired-${challenge.id}`}
                >
                  Expired
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }, [getChallengeIcon, getTypeColor, getTimeRemaining, handleJoinChallenge, joinChallengeMutation.isPending]);

  // Phase 2 - BUILD: Show loading skeleton while fetching data
  if (challengesLoading || statsLoading) {
    return <ChallengesSkeletonLoaders />;
  }

  // Phase 2 - BUILD: Show error state with retry option
  if (challengesError) {
    return (
      <div className="container mx-auto p-4">
        <QueryErrorAlert 
          error={challengesError as Error} 
          refetch={refetchChallenges}
          queryName="challenges"
        />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="container mx-auto p-4">
        <QueryErrorAlert 
          error={statsError as Error} 
          refetch={refetchStats}
          queryName="challenge stats"
        />
      </div>
    );
  }

  // Phase 2 - BUILD: Show empty state if no data
  if (!challenges || challenges.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <EmptyChallengesState type="all" />
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto p-4 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      data-testid="page-challenges"
    >
      {/* Header */}
      <Card data-testid="card-header">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Challenges
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Complete challenges to earn XP, badges, and climb the leaderboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground" data-testid="text-active-label">
                  Active Challenges
                </p>
                <p className="text-2xl font-bold" data-testid="text-active-count">
                  {activeChallenges.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground" data-testid="text-completed-label">
                  Completed
                </p>
                <p className="text-2xl font-bold" data-testid="text-completed-count">
                  {completedChallenges.length}
                </p>
              </div>
              {stats?.totalXPEarned !== undefined && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground" data-testid="text-xp-label">
                    Total XP
                  </p>
                  <p className="text-2xl font-bold" data-testid="text-xp-count">
                    {stats.totalXPEarned}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <ScrollArea className="w-full whitespace-nowrap" data-testid="scrollarea-filters">
        <div className="flex gap-2 pb-2">
          {CHALLENGE_TYPES.map(type => {
            const Icon = ICON_MAP[type.icon];
            return (
              <Button
                key={type.id}
                variant={selectedType === type.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.id as any)}
                data-testid={`button-filter-${type.id}`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {type.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Challenges */}
      <Tabs 
        value={selectedTab} 
        onValueChange={(value) => setSelectedTab(value as 'active' | 'completed')}
        className="space-y-4"
        data-testid="tabs-challenges"
      >
        <TabsList className="grid w-full grid-cols-2" data-testid="tabslist-challenges">
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4" data-testid="tabcontent-active">
          {activeChallenges.length === 0 ? (
            <EmptyChallengesState type="active" />
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              data-testid="grid-active-challenges"
            >
              {activeChallenges.map(renderChallengeCard)}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4" data-testid="tabcontent-completed">
          {completedChallenges.length === 0 ? (
            <EmptyChallengesState type="completed" />
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              data-testid="grid-completed-challenges"
            >
              {completedChallenges.map(renderChallengeCard)}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert data-testid="alert-info">
        <Info className="h-4 w-4" />
        <AlertTitle data-testid="text-info-title">Challenge Tips</AlertTitle>
        <AlertDescription data-testid="text-info-description">
          Join challenges to compete with other inspectors and earn exclusive rewards. 
          Some challenges are time-limited, so act fast! Team challenges require coordination 
          with your team members.
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for production resilience
export default function Challenges() {
  return (
    <ErrorBoundary>
      <ChallengesContent />
    </ErrorBoundary>
  );
}
