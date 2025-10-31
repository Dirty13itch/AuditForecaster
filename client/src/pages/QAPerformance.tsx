import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DashboardCardSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  User,
  Users,
  Trophy,
  Target,
  Award,
  Download,
  GraduationCap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  staggerContainer, 
  cardAppear, 
  listItem 
} from "@/lib/animations";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// Phase 3 - OPTIMIZE: Module-level interfaces prevent recreation on every render
interface PerformanceMetric {
  userId: string;
  name: string;
  period: string;
  avgScore: number;
  jobsCompleted: number;
  jobsReviewed: number;
  onTimeRate: number;
  firstPassRate: number;
  customerSatisfaction: number;
  strongAreas: string[];
  improvementAreas: string[];
  trend: 'up' | 'down' | 'stable';
}

interface TeamPerformance {
  month: string;
  avgScore: number;
  completionRate: number;
  complianceRate: number;
  customerSatisfaction: number;
}

interface CategoryBreakdown {
  category: string;
  score: number;
  fullMark: number;
}

interface TeamMember {
  id: string;
  name: string;
  score: number;
  jobsCompleted?: number;
  trend: 'up' | 'down' | 'stable';
}

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const REFRESH_INTERVAL = 60000; // 1 minute for performance data
const DEFAULT_PERIOD = "month";
const DEFAULT_VIEW = "individual";
const DEFAULT_USER_ID = "user-1";

// Phase 6 - DOCUMENT: QA score thresholds for color coding
// These values determine when scores are considered excellent/good/needs improvement
const SCORE_THRESHOLDS = {
  excellent: 90, // 90+ is excellent (green)
  good: 80,      // 80-89 is good (blue)
  warning: 70,   // 70-79 needs attention (yellow)
  critical: 70   // Below 70 is critical (red)
} as const;

// Phase 6 - DOCUMENT: Mock data for development until backend endpoints are ready
// These represent realistic QA performance metrics
const MOCK_INDIVIDUAL_METRIC: PerformanceMetric = {
  userId: "user-1",
  name: "John Doe",
  period: "month",
  avgScore: 88.5,
  jobsCompleted: 42,
  jobsReviewed: 38,
  onTimeRate: 95,
  firstPassRate: 82,
  customerSatisfaction: 4.6,
  strongAreas: ["Photo Quality", "Documentation", "Timeliness"],
  improvementAreas: ["Calculation Accuracy", "Compliance Checks"],
  trend: 'up'
};

const MOCK_TEAM_METRICS: TeamPerformance[] = [
  { month: "Jun", avgScore: 82, completionRate: 88, complianceRate: 90, customerSatisfaction: 4.2 },
  { month: "Jul", avgScore: 84, completionRate: 90, complianceRate: 92, customerSatisfaction: 4.3 },
  { month: "Aug", avgScore: 85, completionRate: 91, complianceRate: 93, customerSatisfaction: 4.4 },
  { month: "Sep", avgScore: 86, completionRate: 92, complianceRate: 94, customerSatisfaction: 4.5 },
  { month: "Oct", avgScore: 87, completionRate: 93, complianceRate: 95, customerSatisfaction: 4.5 },
  { month: "Nov", avgScore: 88, completionRate: 94, complianceRate: 96, customerSatisfaction: 4.6 }
];

const MOCK_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { category: 'Completeness', score: 92, fullMark: 100 },
  { category: 'Accuracy', score: 85, fullMark: 100 },
  { category: 'Compliance', score: 88, fullMark: 100 },
  { category: 'Photo Quality', score: 95, fullMark: 100 },
  { category: 'Timeliness', score: 90, fullMark: 100 }
];

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: "user-1", name: "John Doe", score: 88.5, jobsCompleted: 42, trend: 'up' },
  { id: "user-2", name: "Jane Smith", score: 92.3, jobsCompleted: 38, trend: 'up' },
  { id: "user-3", name: "Mike Johnson", score: 85.7, jobsCompleted: 35, trend: 'stable' },
  { id: "user-4", name: "Sarah Wilson", score: 90.1, jobsCompleted: 40, trend: 'down' },
  { id: "user-5", name: "Tom Brown", score: 87.4, jobsCompleted: 36, trend: 'up' }
];

// Phase 3 - OPTIMIZE: Helper functions moved to module level to prevent recreation
// Phase 6 - DOCUMENT: Get color class for QA score based on thresholds
// Returns appropriate Tailwind color class for visual feedback
const getScoreColor = (score: number): string => {
  if (score >= SCORE_THRESHOLDS.excellent) return "text-green-600 dark:text-green-400";
  if (score >= SCORE_THRESHOLDS.good) return "text-blue-600 dark:text-blue-400";
  if (score >= SCORE_THRESHOLDS.warning) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
};

// Phase 6 - DOCUMENT: Get bar color for category breakdown charts
const getCategoryBarColor = (score: number): string => {
  if (score >= SCORE_THRESHOLDS.excellent) return "#10b981"; // green
  if (score >= SCORE_THRESHOLDS.good) return "hsl(var(--primary))"; // blue
  return "#f59e0b"; // yellow/orange
};

// Phase 2 - BUILD: Main component with comprehensive error handling
function QAPerformanceContent() {
  const [selectedView, setSelectedView] = useState<'individual' | 'team'>(DEFAULT_VIEW);
  const [selectedUserId, setSelectedUserId] = useState(DEFAULT_USER_ID);
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);
  
  const { toast } = useToast();

  // Phase 3 - OPTIMIZE: useMemo for date range computation
  const dateRange = useMemo(() => ({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: endOfMonth(new Date())
  }), []);

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  // Phase 6 - DOCUMENT: Fetch individual inspector performance metrics
  const { 
    data: individualMetric, 
    isLoading: individualLoading,
    error: individualError
  } = useQuery<PerformanceMetric>({
    queryKey: ['/api/qa/performance', selectedUserId, selectedPeriod],
    enabled: !!selectedUserId && selectedView === 'individual',
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch team performance trends over time
  const { 
    data: teamMetrics, 
    isLoading: teamLoading,
    error: teamError
  } = useQuery<TeamPerformance[]>({
    queryKey: ['/api/qa/performance/team', selectedPeriod],
    enabled: selectedView === 'team',
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 6 - DOCUMENT: Fetch category breakdown scores (radar chart data)
  const { 
    data: categoryBreakdown,
    isLoading: categoryLoading,
    error: categoryError
  } = useQuery<CategoryBreakdown[]>({
    queryKey: ['/api/qa/performance/category-breakdown', selectedView === 'team' ? 'team' : selectedUserId],
    enabled: true,
    retry: 2
  });

  // Phase 6 - DOCUMENT: Fetch leaderboard rankings for inspector selection
  const { 
    data: leaderboard,
    isLoading: leaderboardLoading,
    error: leaderboardError
  } = useQuery<TeamMember[]>({
    queryKey: ['/api/qa/performance/leaderboard', selectedPeriod],
    enabled: true,
    retry: 2,
    refetchInterval: REFRESH_INTERVAL
  });

  // Phase 3 - OPTIMIZE: useMemo for computed display values
  // Phase 6 - DOCUMENT: Use real data when available, fallback to mock data for development
  const displayMetric = useMemo(() => 
    individualMetric || MOCK_INDIVIDUAL_METRIC, 
    [individualMetric]
  );
  
  const displayTeamMetrics = useMemo(() => 
    teamMetrics || MOCK_TEAM_METRICS, 
    [teamMetrics]
  );
  
  const displayCategoryBreakdown = useMemo(() => 
    categoryBreakdown || MOCK_CATEGORY_BREAKDOWN, 
    [categoryBreakdown]
  );
  
  const displayLeaderboard = useMemo(() => 
    leaderboard || MOCK_TEAM_MEMBERS, 
    [leaderboard]
  );

  // Phase 3 - OPTIMIZE: useCallback for event handlers to prevent child re-renders
  const handleViewChange = useCallback((value: string) => {
    setSelectedView(value as 'individual' | 'team');
  }, []);

  const handlePeriodChange = useCallback((value: string) => {
    setSelectedPeriod(value);
  }, []);

  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  // Phase 5 - HARDEN: Enhanced export with comprehensive error handling
  const exportReport = useCallback(async () => {
    try {
      const response = await fetch('/api/qa/performance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'csv',
          period: selectedPeriod,
          userId: selectedView === 'individual' ? selectedUserId : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Phase 5 - HARDEN: Validate blob has content
      if (blob.size === 0) {
        throw new Error('Export file is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qa-performance-${selectedView}-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your performance report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "There was an error generating the report. Please try again.",
        variant: "destructive"
      });
    }
  }, [selectedPeriod, selectedView, selectedUserId, toast]);

  // Phase 2 - BUILD: Comprehensive loading states
  const isLoading = individualLoading || teamLoading || categoryLoading || leaderboardLoading;
  const hasError = individualError || teamError || categoryError || leaderboardError;

  // Phase 2 - BUILD: Show skeleton loaders during initial data fetch
  if (isLoading && !displayMetric) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-performance-loading">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-qa-performance-title">QA Performance</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-qa-performance-subtitle">
            Individual and team performance metrics
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
      <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-performance-error">
        <Alert variant="destructive" data-testid="alert-qa-performance-error">
          <AlertCircle className="h-4 w-4" data-testid="icon-error" />
          <AlertTitle data-testid="text-error-title">Error Loading Performance Data</AlertTitle>
          <AlertDescription data-testid="text-error-description">
            {individualError?.message || teamError?.message || categoryError?.message || 
             leaderboardError?.message || 'Failed to load QA performance data. Please try again.'}
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
      data-testid="container-qa-performance-main"
    >
      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between mb-6"
        variants={cardAppear}
        data-testid="section-qa-performance-header"
      >
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-qa-performance-title">QA Performance</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-qa-performance-subtitle">
            Individual and team performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3" data-testid="group-header-actions">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]" data-testid="select-period-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent data-testid="select-period-content">
              <SelectItem value="month" data-testid="select-period-month">This Month</SelectItem>
              <SelectItem value="quarter" data-testid="select-period-quarter">This Quarter</SelectItem>
              <SelectItem value="year" data-testid="select-period-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={exportReport}
            data-testid="button-export-report"
          >
            <Download className="w-4 h-4 mr-2" data-testid="icon-download" />
            Export Report
          </Button>
        </div>
      </motion.div>

      {/* View Tabs */}
      <Tabs 
        value={selectedView} 
        onValueChange={handleViewChange}
        data-testid="tabs-qa-performance"
      >
        <TabsList 
          className="grid grid-cols-2 w-full max-w-md"
          data-testid="tablist-view-selector"
        >
          <TabsTrigger value="individual" data-testid="tab-individual-view">
            <User className="w-4 h-4 mr-2" data-testid="icon-individual" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team-view">
            <Users className="w-4 h-4 mr-2" data-testid="icon-team" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Individual Performance Tab */}
        <TabsContent 
          value="individual" 
          className="space-y-6 mt-6"
          data-testid="content-individual-performance"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Inspector Selector */}
            <motion.div 
              className="lg:col-span-1"
              variants={cardAppear}
              data-testid="section-inspector-selector"
            >
              <Card data-testid="card-inspector-list">
                <CardHeader>
                  <CardTitle className="text-sm" data-testid="heading-inspector-selector">
                    Select Inspector
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]" data-testid="scroll-inspector-list">
                    <div className="space-y-2 pr-4">
                      {displayLeaderboard.map((member, index) => (
                        <motion.div
                          key={member.id}
                          variants={listItem}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                            selectedUserId === member.id
                              ? "bg-accent border-accent-foreground/20"
                              : ""
                          }`}
                          onClick={() => handleUserSelect(member.id)}
                          data-testid={`inspector-item-${member.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10" data-testid={`avatar-${member.id}`}>
                              <AvatarFallback data-testid={`avatar-fallback-${member.id}`}>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium" data-testid={`inspector-name-${member.id}`}>
                                {member.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span 
                                  className={`text-sm font-medium ${getScoreColor(member.score)}`}
                                  data-testid={`inspector-score-${member.id}`}
                                >
                                  {member.score}%
                                </span>
                                {member.trend === 'up' && (
                                  <TrendingUp 
                                    className="w-3 h-3 text-green-500" 
                                    data-testid={`trend-up-${member.id}`}
                                  />
                                )}
                                {member.trend === 'down' && (
                                  <TrendingDown 
                                    className="w-3 h-3 text-red-500" 
                                    data-testid={`trend-down-${member.id}`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Metrics */}
            <div className="lg:col-span-3 space-y-6" data-testid="section-performance-metrics">
              {/* Performance Summary Cards */}
              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                variants={staggerContainer}
                data-testid="grid-summary-cards"
              >
                <motion.div variants={cardAppear}>
                  <Card data-testid="card-average-score">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm" data-testid="heading-average-score">
                        Average Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span 
                          className={`text-2xl font-bold ${getScoreColor(displayMetric.avgScore)}`}
                          data-testid="text-average-score-value"
                        >
                          {displayMetric.avgScore}%
                        </span>
                        {displayMetric.trend === 'up' && (
                          <TrendingUp 
                            className="w-4 h-4 text-green-500" 
                            data-testid="icon-trend-up-score"
                          />
                        )}
                        {displayMetric.trend === 'down' && (
                          <TrendingDown 
                            className="w-4 h-4 text-red-500" 
                            data-testid="icon-trend-down-score"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardAppear}>
                  <Card data-testid="card-jobs-completed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm" data-testid="heading-jobs-completed">
                        Jobs Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="text-jobs-completed-value">
                        {displayMetric.jobsCompleted}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-jobs-reviewed">
                        {displayMetric.jobsReviewed} reviewed
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardAppear}>
                  <Card data-testid="card-on-time-rate">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm" data-testid="heading-on-time-rate">
                        On-Time Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="text-on-time-rate-value">
                        {displayMetric.onTimeRate}%
                      </p>
                      <Progress 
                        value={displayMetric.onTimeRate} 
                        className="mt-2" 
                        data-testid="progress-on-time-rate"
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardAppear}>
                  <Card data-testid="card-first-pass-rate">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm" data-testid="heading-first-pass-rate">
                        First Pass Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="text-first-pass-rate-value">
                        {displayMetric.firstPassRate}%
                      </p>
                      <Progress 
                        value={displayMetric.firstPassRate} 
                        className="mt-2" 
                        data-testid="progress-first-pass-rate"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="grid-performance-charts">
                {/* Score Trend Chart */}
                <motion.div variants={cardAppear}>
                  <Card data-testid="card-score-trend">
                    <CardHeader>
                      <CardTitle data-testid="heading-score-trend">Score Trend</CardTitle>
                      <CardDescription data-testid="text-score-trend-description">
                        Performance over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={displayTeamMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[70, 100]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="avgScore"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Category Breakdown */}
                <motion.div variants={cardAppear}>
                  <Card data-testid="card-category-breakdown">
                    <CardHeader>
                      <CardTitle data-testid="heading-category-breakdown">Category Breakdown</CardTitle>
                      <CardDescription data-testid="text-category-description">
                        Score by assessment category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={displayCategoryBreakdown}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Strengths and Improvements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="grid-strengths-improvements">
                <motion.div variants={cardAppear}>
                  <Card data-testid="card-strong-areas">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid="heading-strong-areas">
                        <Trophy className="w-5 h-5 text-yellow-500" data-testid="icon-trophy" />
                        Strong Areas
                      </CardTitle>
                      <CardDescription data-testid="text-strong-areas-description">
                        Top performing categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3" data-testid="list-strong-areas">
                        {displayMetric.strongAreas.map((area, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-3"
                            data-testid={`strong-area-${index}`}
                          >
                            <CheckCircle2 
                              className="w-5 h-5 text-green-500" 
                              data-testid={`icon-check-${index}`}
                            />
                            <span className="font-medium" data-testid={`text-strong-area-${index}`}>
                              {area}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardAppear}>
                  <Card data-testid="card-improvement-areas">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" data-testid="heading-improvement-areas">
                        <Target className="w-5 h-5 text-blue-500" data-testid="icon-target" />
                        Improvement Areas
                      </CardTitle>
                      <CardDescription data-testid="text-improvement-description">
                        Categories needing focus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3" data-testid="list-improvement-areas">
                        {displayMetric.improvementAreas.map((area, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between"
                            data-testid={`improvement-area-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <AlertCircle 
                                className="w-5 h-5 text-yellow-500" 
                                data-testid={`icon-alert-${index}`}
                              />
                              <span className="font-medium" data-testid={`text-improvement-area-${index}`}>
                                {area}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-training-${index}`}
                            >
                              <GraduationCap className="w-4 h-4 mr-2" data-testid={`icon-training-${index}`} />
                              Training
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Achievement Badges */}
              <motion.div variants={cardAppear}>
                <Card data-testid="card-achievements">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="heading-achievements">
                      <Award className="w-5 h-5" data-testid="icon-award" />
                      Achievements & Milestones
                    </CardTitle>
                    <CardDescription data-testid="text-achievements-description">
                      Recognition for excellent performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="grid-achievements">
                      <div 
                        className="text-center p-4 border rounded-lg"
                        data-testid="achievement-quality-champion"
                      >
                        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" data-testid="icon-quality-champion" />
                        <p className="font-medium" data-testid="text-quality-champion">Quality Champion</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-quality-champion-desc">
                          3 months &gt;90%
                        </p>
                      </div>
                      <div 
                        className="text-center p-4 border rounded-lg opacity-50"
                        data-testid="achievement-accuracy-expert"
                      >
                        <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" data-testid="icon-accuracy-expert" />
                        <p className="font-medium" data-testid="text-accuracy-expert">Accuracy Expert</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-accuracy-expert-desc">
                          95% accuracy
                        </p>
                        <p className="text-xs font-medium mt-1" data-testid="text-accuracy-expert-status">
                          In Progress
                        </p>
                      </div>
                      <div 
                        className="text-center p-4 border rounded-lg"
                        data-testid="achievement-consistent-performer"
                      >
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" data-testid="icon-consistent" />
                        <p className="font-medium" data-testid="text-consistent-performer">Consistent Performer</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-consistent-desc">
                          20 streak
                        </p>
                      </div>
                      <div 
                        className="text-center p-4 border rounded-lg opacity-50"
                        data-testid="achievement-master-inspector"
                      >
                        <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" data-testid="icon-master-inspector" />
                        <p className="font-medium" data-testid="text-master-inspector">Master Inspector</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-master-desc">
                          100 jobs 90%+
                        </p>
                        <p className="text-xs font-medium mt-1" data-testid="text-master-progress">
                          42/100
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent 
          value="team" 
          className="space-y-6 mt-6"
          data-testid="content-team-performance"
        >
          {/* Team Summary Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerContainer}
            data-testid="grid-team-summary"
          >
            <motion.div variants={cardAppear}>
              <Card data-testid="card-team-average-score">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" data-testid="heading-team-average">
                    Team Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" data-testid="text-team-average-value">
                      87.8%
                    </span>
                    <span 
                      className="text-sm text-green-600 dark:text-green-400" 
                      data-testid="text-team-average-change"
                    >
                      +2.3%
                    </span>
                  </div>
                  <Progress value={87.8} className="mt-3" data-testid="progress-team-average" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardAppear}>
              <Card data-testid="card-total-jobs-reviewed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" data-testid="heading-total-jobs">
                    Total Jobs Reviewed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-total-jobs-value">
                    186
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-total-jobs-period">
                    This month
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={cardAppear}>
              <Card data-testid="card-team-compliance-rate">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" data-testid="heading-team-compliance">
                    Compliance Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-team-compliance-value">
                    96%
                  </p>
                  <Progress value={96} className="mt-3" data-testid="progress-team-compliance" />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Team Performance Chart */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-team-performance-trends">
              <CardHeader>
                <CardTitle data-testid="heading-team-trends">Team Performance Trends</CardTitle>
                <CardDescription data-testid="text-team-trends-description">
                  Key metrics over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={displayTeamMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[70, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      name="Average Score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      name="Completion Rate"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="complianceRate"
                      name="Compliance Rate"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Comparison */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-category-comparison">
              <CardHeader>
                <CardTitle data-testid="heading-category-comparison">
                  Category Performance Comparison
                </CardTitle>
                <CardDescription data-testid="text-category-comparison-description">
                  Team performance by assessment category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={displayCategoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score">
                      {displayCategoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryBarColor(entry.score)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Leaderboard */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-team-leaderboard">
              <CardHeader>
                <CardTitle data-testid="heading-team-leaderboard">Team Leaderboard</CardTitle>
                <CardDescription data-testid="text-team-leaderboard-description">
                  Individual performance rankings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="list-team-leaderboard">
                  {displayLeaderboard
                    .sort((a, b) => b.score - a.score)
                    .map((member, index) => (
                      <motion.div 
                        key={member.id} 
                        variants={listItem}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        data-testid={`leaderboard-item-${member.id}`}
                      >
                        <div 
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold"
                          data-testid={`leaderboard-rank-${index + 1}`}
                        >
                          {index + 1}
                        </div>
                        <Avatar className="w-10 h-10" data-testid={`leaderboard-avatar-${member.id}`}>
                          <AvatarFallback data-testid={`leaderboard-fallback-${member.id}`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`leaderboard-name-${member.id}`}>
                            {member.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span 
                            className={`text-lg font-bold ${getScoreColor(member.score)}`}
                            data-testid={`leaderboard-score-${member.id}`}
                          >
                            {member.score}%
                          </span>
                          {member.trend === 'up' && (
                            <TrendingUp 
                              className="w-4 h-4 text-green-500" 
                              data-testid={`leaderboard-trend-up-${member.id}`}
                            />
                          )}
                          {member.trend === 'down' && (
                            <TrendingDown 
                              className="w-4 h-4 text-red-500" 
                              data-testid={`leaderboard-trend-down-${member.id}`}
                            />
                          )}
                        </div>
                        {index === 0 && (
                          <Trophy 
                            className="w-5 h-5 text-yellow-500" 
                            data-testid="icon-first-place"
                          />
                        )}
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Training Needs Analysis */}
          <motion.div variants={cardAppear}>
            <Card data-testid="card-training-needs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="heading-training-needs">
                  <GraduationCap className="w-5 h-5" data-testid="icon-training-cap" />
                  Team Training Needs
                </CardTitle>
                <CardDescription data-testid="text-training-needs-description">
                  Identified areas for team improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="list-training-needs">
                  <div 
                    className="p-4 border rounded-lg"
                    data-testid="training-need-calculations"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium" data-testid="text-training-calc-title">
                          Calculation Accuracy
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-training-calc-desc">
                          5 team members scoring below 80%
                        </p>
                      </div>
                      <Badge variant="destructive" data-testid="badge-training-calc-priority">
                        High Priority
                      </Badge>
                    </div>
                    <Progress value={65} className="mb-2" data-testid="progress-training-calc" />
                    <Button size="sm" data-testid="button-schedule-training-calc">
                      Schedule Training
                    </Button>
                  </div>
                  
                  <div 
                    className="p-4 border rounded-lg"
                    data-testid="training-need-photos"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium" data-testid="text-training-photo-title">
                          Photo Documentation
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-training-photo-desc">
                          3 team members need improvement
                        </p>
                      </div>
                      <Badge variant="secondary" data-testid="badge-training-photo-priority">
                        Medium Priority
                      </Badge>
                    </div>
                    <Progress value={78} className="mb-2" data-testid="progress-training-photo" />
                    <Button size="sm" data-testid="button-schedule-training-photo">
                      Schedule Training
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper as default export
export default function QAPerformance() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6 max-w-7xl" data-testid="container-qa-performance-error-boundary">
          <Alert variant="destructive" data-testid="alert-error-boundary">
            <AlertCircle className="h-4 w-4" data-testid="icon-error-boundary" />
            <AlertTitle data-testid="text-error-boundary-title">Error</AlertTitle>
            <AlertDescription data-testid="text-error-boundary-description">
              Failed to load QA Performance page. Please refresh the page or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <QAPerformanceContent />
    </ErrorBoundary>
  );
}
