import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DashboardCardSkeleton,
  TableSkeleton,
  ActivityFeedSkeleton
} from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  staggerContainer, 
  cardAppear, 
  listItem
} from "@/lib/animations";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  ClipboardCheck,
  Star,
  Trophy,
  Target,
  Clock,
  FileCheck,
  Users,
  BarChart3,
  ShieldCheck,
  GraduationCap
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Link } from "wouter";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const REFRESH_INTERVAL = 30000; // 30 seconds for live QA data
const DEFAULT_LIMIT = 10; // Default items to show in lists

// Phase 6 - DOCUMENT: QA score thresholds for color coding
// These values determine when scores are considered excellent/good/needs improvement
const SCORE_THRESHOLDS = {
  excellent: 90, // 90+ is excellent (green)
  good: 80,      // 80-89 is good (blue)
  warning: 70,   // 70-79 needs attention (yellow)
  critical: 70   // Below 70 is critical (red)
} as const;

// Phase 6 - DOCUMENT: Badge type mappings for inspector achievements
// Maps badge identifiers to their display icons
const BADGE_ICONS = {
  'quality-champion': Trophy,
  'streak-master': Star,
  'accuracy-expert': Target,
  'rising-star': TrendingUp,
  default: CheckCircle2
} as const;

// Phase 6 - DOCUMENT: Activity type configurations for recent QA events
// Defines icon and styling for each type of QA activity
const ACTIVITY_TYPES = {
  inspection: { icon: FileCheck, color: '' },
  review: { icon: ClipboardCheck, color: '' },
  failed: { icon: AlertCircle, color: 'text-destructive' },
  corrective: { icon: Target, color: 'text-warning' },
  default: { icon: CheckCircle2, color: '' }
} as const;

// Phase 3 - OPTIMIZE: Helper functions moved to module level
// Phase 6 - DOCUMENT: Get icon component for activity type
const getActivityIcon = (type: string) => {
  const config = ACTIVITY_TYPES[type as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.default;
  const IconComponent = config.icon;
  return <IconComponent className={`w-4 h-4 ${config.color}`} data-testid={`icon-activity-${type}`} />;
};

// Phase 6 - DOCUMENT: Get color class for QA score based on thresholds
// Returns appropriate Tailwind color class for visual feedback
const getScoreColor = (score: number): string => {
  if (score >= SCORE_THRESHOLDS.excellent) return "text-green-600 dark:text-green-400";
  if (score >= SCORE_THRESHOLDS.good) return "text-blue-600 dark:text-blue-400";
  if (score >= SCORE_THRESHOLDS.warning) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
};

// Phase 6 - DOCUMENT: Get icon component for inspector badge type
const getBadgeIcon = (badge: string) => {
  const IconComponent = BADGE_ICONS[badge as keyof typeof BADGE_ICONS] || BADGE_ICONS.default;
  return <IconComponent className="w-3 h-3" data-testid={`icon-badge-${badge}`} />;
};

interface PerformanceSummary {
  teamAverageScore: number;
  jobsNeedingReview: number;
  criticalIssues: number;
  complianceRate: number;
  trend: {
    score: number;
    direction: 'up' | 'down' | 'stable';
  };
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  jobsCompleted: number;
  completionRate: number;
  badges: string[];
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

interface RecentActivity {
  id: string;
  type: 'inspection' | 'review' | 'failed' | 'corrective';
  jobName: string;
  jobId: string;
  inspectorName: string;
  score?: number;
  issue?: string;
  timestamp: Date;
  status: string;
}

// Phase 2 - BUILD: Main component with comprehensive error handling
function QualityAssuranceContent() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  
  // Phase 3 - OPTIMIZE: useMemo for date range computation
  const dateRange = useMemo(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }), []);

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  // Phase 6 - DOCUMENT: Fetch QA performance summary including team averages and metrics
  const { 
    data: summary, 
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery<PerformanceSummary>({
    queryKey: ['/api/qa/analytics/summary', dateRange],
    enabled: false, // Will be enabled when backend implements this aggregated endpoint
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch inspector leaderboard rankings for current month
  const { 
    data: leaderboard, 
    isLoading: leaderboardLoading,
    error: leaderboardError
  } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/qa/analytics/leaderboard/month'],
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch jobs pending QA review from managers/admins
  const { 
    data: pendingReviews, 
    isLoading: reviewsLoading,
    error: reviewsError
  } = useQuery({
    queryKey: ['/api/qa/scores/review-status/pending'],
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch recent QA activity feed (inspections, reviews, issues)
  const { 
    data: recentActivity, 
    isLoading: activityLoading,
    error: activityError
  } = useQuery<RecentActivity[]>({
    queryKey: ['/api/qa/analytics/recent-activity'],
    enabled: false, // Will be enabled when backend implements this endpoint
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch compliance rate metrics over date range
  const {
    data: complianceData,
    isLoading: complianceLoading,
    error: complianceError
  } = useQuery({
    queryKey: ['/api/qa/analytics/compliance-rate', dateRange],
    retry: 2
  });

  // Phase 6 - DOCUMENT: Fetch QA score trends for charting
  const {
    data: scoreTrends,
    isLoading: trendsLoading,
    error: trendsError
  } = useQuery({
    queryKey: ['/api/qa/analytics/score-trends'],
    retry: 2
  });

  // Phase 6 - DOCUMENT: Mock data for development until all backend endpoints are ready
  // These represent realistic QA metrics and will be replaced by actual API data
  const mockSummary: PerformanceSummary = useMemo(() => ({
    teamAverageScore: 87.5,
    jobsNeedingReview: 12,
    criticalIssues: 3,
    complianceRate: 94.2,
    trend: {
      score: 2.3,
      direction: 'up' as const
    }
  }), []);

  const mockLeaderboard: LeaderboardEntry[] = useMemo(() => [
    {
      userId: "1",
      name: "John Doe",
      score: 95.5,
      jobsCompleted: 42,
      completionRate: 98,
      badges: ["quality-champion", "streak-master"],
      rank: 1,
      trend: 'up' as const
    },
    {
      userId: "2", 
      name: "Jane Smith",
      score: 93.2,
      jobsCompleted: 38,
      completionRate: 95,
      badges: ["accuracy-expert"],
      rank: 2,
      trend: 'stable' as const
    },
    {
      userId: "3",
      name: "Mike Johnson",
      score: 91.8,
      jobsCompleted: 35,
      completionRate: 92,
      badges: ["rising-star"],
      rank: 3,
      trend: 'up' as const
    }
  ], []);

  const mockActivity: RecentActivity[] = useMemo(() => [
    {
      id: "1",
      type: 'inspection' as const,
      jobName: "123 Main St - Blower Door Test",
      jobId: "job-1",
      inspectorName: "John Doe",
      score: 95,
      timestamp: new Date(),
      status: "done"
    },
    {
      id: "2",
      type: 'review' as const,
      jobName: "456 Oak Ave - Full Inspection",
      jobId: "job-2",
      inspectorName: "Jane Smith",
      timestamp: subDays(new Date(), 1),
      status: "scheduled"
    },
    {
      id: "3",
      type: 'failed' as const,
      jobName: "789 Pine St - Duct Test",
      jobId: "job-3",
      inspectorName: "Mike Johnson",
      score: 65,
      issue: "Missing required photos",
      timestamp: subDays(new Date(), 1),
      status: "needs_improvement"
    }
  ], []);

  // Phase 3 - OPTIMIZE: useMemo for computed display values
  // Phase 6 - DOCUMENT: Use real data when available, fallback to mock data for development
  const displaySummary = useMemo(() => summary || mockSummary, [summary, mockSummary]);
  const displayLeaderboard = useMemo(() => leaderboard || mockLeaderboard, [leaderboard, mockLeaderboard]);
  const displayActivity = useMemo(() => recentActivity || mockActivity, [recentActivity, mockActivity]);

  // Phase 3 - OPTIMIZE: useCallback for event handlers
  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  // Phase 2 - BUILD: Comprehensive loading states with skeleton loaders
  const isLoading = summaryLoading || leaderboardLoading || reviewsLoading || 
                   activityLoading || complianceLoading || trendsLoading;

  // Phase 2 - BUILD: Error detection across all queries
  const hasError = summaryError || leaderboardError || reviewsError || 
                  activityError || complianceError || trendsError;

  // Phase 2 - BUILD: Show skeleton loaders during initial data fetch
  if (isLoading && !displaySummary) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-loading">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-qa-title">Quality Assurance</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-qa-subtitle">
            Monitor inspection quality and team performance
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // Phase 2 - BUILD: Show error alert if any query fails
  if (hasError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-error">
        <Alert variant="destructive" data-testid="alert-qa-error">
          <AlertCircle className="h-4 w-4" data-testid="icon-error" />
          <AlertTitle data-testid="text-error-title">Error Loading QA Data</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            {summaryError?.message || leaderboardError?.message || 
             reviewsError?.message || activityError?.message || 
             complianceError?.message || trendsError?.message || 
             'Failed to load quality assurance data. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 max-w-7xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="container-qa-main"
    >
      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between mb-6"
        variants={cardAppear}
        data-testid="section-qa-header"
      >
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-qa-title">Quality Assurance</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-qa-subtitle">
            Monitor inspection quality and team performance
          </p>
        </div>
        <div className="flex gap-2" data-testid="group-qa-actions">
          <Button variant="outline" asChild data-testid="button-score-inspection">
            <Link href="/qa/scoring">
              <ClipboardCheck className="w-4 h-4 mr-2" data-testid="icon-score" />
              Score Inspection
            </Link>
          </Button>
          <Button asChild data-testid="button-review-queue">
            <Link href="/qa/review">
              <FileCheck className="w-4 h-4 mr-2" data-testid="icon-review" />
              Review Queue
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Performance Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={staggerContainer}
        data-testid="grid-summary-cards"
      >
        {/* Team Average Score Card */}
        <motion.div variants={cardAppear}>
          <Card data-testid="card-team-average">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium" data-testid="title-team-average">
                Team Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2" data-testid="group-score-display">
                <span className="text-2xl font-bold" data-testid="text-average-score">
                  {displaySummary.teamAverageScore.toFixed(1)}%
                </span>
                {displaySummary.trend.direction === 'up' ? (
                  <span className="flex items-center text-sm text-green-600 dark:text-green-400" data-testid="trend-up">
                    <TrendingUp className="w-4 h-4 mr-1" data-testid="icon-trend-up" />
                    {displaySummary.trend.score.toFixed(1)}%
                  </span>
                ) : displaySummary.trend.direction === 'down' ? (
                  <span className="flex items-center text-sm text-destructive" data-testid="trend-down">
                    <TrendingDown className="w-4 h-4 mr-1" data-testid="icon-trend-down" />
                    {displaySummary.trend.score.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground" data-testid="trend-stable">Stable</span>
                )}
              </div>
              <Progress value={displaySummary.teamAverageScore} className="mt-3" data-testid="progress-team-average" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Jobs Needing Review Card */}
        <motion.div variants={cardAppear}>
          <Card data-testid="card-pending-reviews">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium" data-testid="title-pending-reviews">
                Jobs Needing Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between" data-testid="group-pending-display">
                <span className="text-2xl font-bold" data-testid="text-pending-count">
                  {displaySummary.jobsNeedingReview}
                </span>
                <ClipboardCheck className="w-8 h-8 text-muted-foreground opacity-50" data-testid="icon-clipboard" />
              </div>
              <Button variant="link" className="p-0 h-auto mt-2" asChild data-testid="link-view-reviews">
                <Link href="/qa/review">View pending reviews →</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Critical Issues Card */}
        <motion.div variants={cardAppear}>
          <Card data-testid="card-critical-issues">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium" data-testid="title-critical-issues">
                Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between" data-testid="group-critical-display">
                <span className="text-2xl font-bold text-destructive" data-testid="text-critical-count">
                  {displaySummary.criticalIssues}
                </span>
                <AlertCircle className="w-8 h-8 text-destructive opacity-50" data-testid="icon-alert" />
              </div>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-critical-note">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance Rate Card */}
        <motion.div variants={cardAppear}>
          <Card data-testid="card-compliance">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium" data-testid="title-compliance">
                Compliance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2" data-testid="group-compliance-display">
                <span className="text-2xl font-bold" data-testid="text-compliance-rate">
                  {displaySummary.complianceRate.toFixed(1)}%
                </span>
                <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" data-testid="icon-shield" />
              </div>
              <Progress value={displaySummary.complianceRate} className="mt-3" data-testid="progress-compliance" />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs Section */}
      <Tabs value={selectedTab} onValueChange={handleTabChange} data-testid="tabs-qa-main">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl" data-testid="tablist-qa">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending Reviews</TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">Checklists</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Training</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6" data-testid="content-dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="grid-dashboard">
            {/* Inspector Leaderboard */}
            <Card className="lg:col-span-1" data-testid="card-leaderboard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="title-leaderboard">
                  <Trophy className="w-5 h-5 text-yellow-500" data-testid="icon-trophy" />
                  Top Performers
                </CardTitle>
                <CardDescription data-testid="description-leaderboard">
                  This month's quality leaders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <ActivityFeedSkeleton data-testid="skeleton-leaderboard" />
                ) : (
                  <div className="space-y-4" data-testid="list-leaderboard">
                    {displayLeaderboard.map((entry) => (
                      <motion.div 
                        key={entry.userId} 
                        className="flex items-center gap-3"
                        variants={listItem}
                        data-testid={`leaderboard-entry-${entry.userId}`}
                      >
                        <div 
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm"
                          data-testid={`rank-${entry.rank}`}
                        >
                          {entry.rank}
                        </div>
                        <Avatar className="w-10 h-10" data-testid={`avatar-${entry.userId}`}>
                          <AvatarImage src={entry.avatarUrl} />
                          <AvatarFallback data-testid={`avatar-fallback-${entry.userId}`}>
                            {entry.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0" data-testid={`details-${entry.userId}`}>
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate" data-testid={`name-${entry.userId}`}>
                              {entry.name}
                            </p>
                            {entry.trend === 'up' && (
                              <TrendingUp className="w-3 h-3 text-green-500" data-testid={`trend-up-${entry.userId}`} />
                            )}
                            {entry.trend === 'down' && (
                              <TrendingDown className="w-3 h-3 text-red-500" data-testid={`trend-down-${entry.userId}`} />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground" data-testid={`stats-${entry.userId}`}>
                            <span className={getScoreColor(entry.score)} data-testid={`score-${entry.userId}`}>
                              {entry.score.toFixed(1)}%
                            </span>
                            <span data-testid={`jobs-${entry.userId}`}>{entry.jobsCompleted} jobs</span>
                          </div>
                          <div className="flex gap-1 mt-1" data-testid={`badges-${entry.userId}`}>
                            {entry.badges.map(badge => (
                              <Badge key={badge} variant="secondary" className="px-1 py-0" data-testid={`badge-${badge}-${entry.userId}`}>
                                {getBadgeIcon(badge)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4" asChild data-testid="button-view-leaderboard">
                  <Link href="/qa/leaderboard">View Full Leaderboard</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-2" data-testid="card-activity">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="title-activity">
                  <Clock className="w-5 h-5" data-testid="icon-clock" />
                  Recent Activity
                </CardTitle>
                <CardDescription data-testid="description-activity">
                  Latest QA events and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <ActivityFeedSkeleton data-testid="skeleton-activity" />
                ) : (
                  <ScrollArea className="h-[400px]" data-testid="scroll-activity">
                    <div className="space-y-4 pr-4" data-testid="list-activity">
                      {displayActivity.map((activity) => (
                        <motion.div 
                          key={activity.id} 
                          className="flex gap-3 pb-3 border-b last:border-0"
                          variants={listItem}
                          data-testid={`activity-${activity.id}`}
                        >
                          <div className="mt-1" data-testid={`activity-icon-${activity.id}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 space-y-1" data-testid={`activity-content-${activity.id}`}>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium" data-testid={`activity-job-${activity.id}`}>
                                  {activity.jobName}
                                </p>
                                <p className="text-sm text-muted-foreground" data-testid={`activity-inspector-${activity.id}`}>
                                  Inspector: {activity.inspectorName}
                                </p>
                              </div>
                              {activity.score !== undefined && (
                                <Badge 
                                  variant={activity.score >= 80 ? "default" : "destructive"}
                                  className="ml-2"
                                  data-testid={`activity-score-${activity.id}`}
                                >
                                  {activity.score}%
                                </Badge>
                              )}
                            </div>
                            {activity.issue && (
                              <p className="text-sm text-destructive" data-testid={`activity-issue-${activity.id}`}>
                                {activity.issue}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground" data-testid={`activity-meta-${activity.id}`}>
                              <span data-testid={`activity-time-${activity.id}`}>
                                {format(activity.timestamp, "MMM d, h:mm a")}
                              </span>
                              <Badge variant="outline" className="text-xs" data-testid={`activity-status-${activity.id}`}>
                                {activity.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`button-view-job-${activity.id}`}
                          >
                            <Link href={`/jobs/${activity.jobId}`}>View</Link>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            data-testid="grid-quick-stats"
          >
            <motion.div variants={cardAppear}>
              <Card data-testid="card-stat-inspectors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2" data-testid="title-stat-inspectors">
                    <Users className="w-4 h-4" data-testid="icon-users" />
                    Active Inspectors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-stat-inspectors">12</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={cardAppear}>
              <Card data-testid="card-stat-completion">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2" data-testid="title-stat-completion">
                    <BarChart3 className="w-4 h-4" data-testid="icon-chart" />
                    Avg Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-stat-completion">94%</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardAppear}>
              <Card data-testid="card-stat-first-pass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2" data-testid="title-stat-first-pass">
                    <Target className="w-4 h-4" data-testid="icon-target" />
                    First Pass Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-stat-first-pass">88%</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardAppear}>
              <Card data-testid="card-stat-training">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2" data-testid="title-stat-training">
                    <GraduationCap className="w-4 h-4" data-testid="icon-cap" />
                    Training Due
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-stat-training">3</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Pending Reviews Tab */}
        <TabsContent value="pending" data-testid="content-pending">
          <Card data-testid="card-pending-content">
            <CardHeader>
              <CardTitle data-testid="title-pending-content">Pending Reviews</CardTitle>
              <CardDescription data-testid="description-pending-content">
                Jobs awaiting quality review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reviewsLoading ? (
                <p className="text-muted-foreground" data-testid="text-loading-reviews">
                  Loading pending reviews...
                </p>
              ) : (
                <p className="text-muted-foreground" data-testid="text-reviews-count">
                  {displaySummary.jobsNeedingReview} jobs need review
                </p>
              )}
              <Button className="mt-4" asChild data-testid="button-go-to-review">
                <Link href="/qa/review">Go to Review Queue</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklists Tab */}
        <TabsContent value="checklists" data-testid="content-checklists">
          <Card data-testid="card-checklists-content">
            <CardHeader>
              <CardTitle data-testid="title-checklists-content">QA Checklists</CardTitle>
              <CardDescription data-testid="description-checklists-content">
                Manage inspection checklists and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild data-testid="button-manage-checklists">
                <Link href="/qa/checklists">Manage Checklists</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" data-testid="content-performance">
          <Card data-testid="card-performance-content">
            <CardHeader>
              <CardTitle data-testid="title-performance-content">Performance Metrics</CardTitle>
              <CardDescription data-testid="description-performance-content">
                Individual and team performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild data-testid="button-view-performance">
                <Link href="/qa/performance">View Performance</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" data-testid="content-training">
          <Card data-testid="card-training-content">
            <CardHeader>
              <CardTitle data-testid="title-training-content">Training Needs</CardTitle>
              <CardDescription data-testid="description-training-content">
                Identified areas for improvement and training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="list-training">
                <div className="border rounded-lg p-4" data-testid="training-item-photos">
                  <h4 className="font-medium mb-2" data-testid="training-title-photos">
                    Photo Quality Training
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2" data-testid="training-description-photos">
                    3 inspectors need training on proper photo documentation
                  </p>
                  <Progress value={40} className="mb-2" data-testid="progress-training-photos" />
                  <Button size="sm" variant="outline" data-testid="button-schedule-photos">
                    Schedule Training
                  </Button>
                </div>
                <div className="border rounded-lg p-4" data-testid="training-item-compliance">
                  <h4 className="font-medium mb-2" data-testid="training-title-compliance">
                    Compliance Updates
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2" data-testid="training-description-compliance">
                    New Minnesota Code requirements training
                  </p>
                  <Progress value={75} className="mb-2" data-testid="progress-training-compliance" />
                  <Button size="sm" variant="outline" data-testid="button-schedule-compliance">
                    Schedule Training
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary with fallback UI
export default function QualityAssurance() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-error-boundary">
          <Alert variant="destructive" data-testid="alert-error-boundary">
            <AlertCircle className="h-4 w-4" data-testid="icon-error-boundary" />
            <AlertTitle data-testid="text-error-boundary-title">
              Quality Assurance Error
            </AlertTitle>
            <AlertDescription data-testid="text-error-boundary-description">
              Something went wrong loading the Quality Assurance page. 
              Please refresh the page or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <QualityAssuranceContent />
    </ErrorBoundary>
  );
}
