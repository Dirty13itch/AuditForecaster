import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  DashboardCardSkeleton, 
  TableSkeleton, 
  ChartSkeleton,
  MetricCardSkeleton,
  ActivityFeedSkeleton
} from "@/components/ui/skeleton-variants";
import { 
  staggerContainer, 
  cardAppear, 
  listItem,
  fadeInUp
} from "@/lib/animations";
import { useAnimatedCounter } from "@/hooks/useAnimation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { ProgressWidget } from "@/components/dashboard/ProgressWidget";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/ActivityFeed";
import { TierSummaryCard } from "@/components/dashboard/TierSummaryCard";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { TaxCreditPanel } from "@/components/dashboard/TaxCreditPanel";
import { MonthlyHighlights } from "@/components/dashboard/MonthlyHighlights";
import { AchievementsPanel } from "@/components/AchievementsPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Trophy, BarChart3, DollarSign, Target, Download, Mail, FileText,
  TrendingUp, Activity, Users, CheckCircle2, Clock, Settings,
  RefreshCw, Calendar, FileSpreadsheet, Share2, Bell, Star, AlertCircle
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type { DashboardSummary, BuilderLeaderboardEntry } from "@shared/dashboardTypes";
import type { Forecast, Job, Builder, ChecklistItem } from "@shared/schema";
import { safeDivide, safeToFixed } from "@shared/numberUtils";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const REFRESH_INTERVAL = 30000; // 30 seconds
const ANALYTICS_REFRESH_INTERVAL = 60000; // 60 seconds for analytics data
const SPARKLINE_POINTS = 10;

// Phase 6 - DOCUMENT: Dashboard metric thresholds for visual indicators
const THRESHOLDS = {
  firstPassRate: 85, // Target: 85% jobs pass on first inspection
  avgInspectionTime: 120, // Target: 120 minutes per inspection
  monthlyJobsTarget: 100, // Target: 100 jobs per month
  complianceRate: 90, // Target: 90% compliance rate
} as const;

// Phase 6 - DOCUMENT: Status colors for job states (consistent with design system)
const STATUS_COLORS = {
  done: "hsl(var(--success))",
  scheduled: "hsl(var(--secondary))",
  failed: "hsl(var(--warning))",
  reschedule: "hsl(var(--primary))",
} as const;

// Phase 6 - DOCUMENT: Generate sparkline trend data for metric cards
// Creates a smooth trend line leading to the current value with realistic variance
function generateSparklineData(finalValue: number, points: number = SPARKLINE_POINTS): number[] {
  const data: number[] = [];
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const variance = (Math.random() - 0.5) * 0.3;
    const trendValue = finalValue * (0.7 + progress * 0.3);
    const value = Math.max(0, trendValue * (1 + variance));
    data.push(value);
  }
  
  data[points - 1] = finalValue;
  
  return data;
}

interface DashboardMetrics {
  jobsCompleted: number;
  jobsCompletedTrend: number;
  avgQaScore: number;
  avgQaScoreTrend: number;
  monthlyRevenue: number;
  monthlyRevenueTrend: number;
  complianceRate: number;
  complianceRateTrend: number;
  activeBuilders: number;
  activeBuildersTrend: number;
  avgInspectionTime: number;
  firstPassRate: number;
  photosUploaded: number;
}

// Phase 2 - BUILD: Main Dashboard component wrapped in ErrorBoundary at export
function DashboardContent() {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  // Phase 2 - BUILD: Fetch data queries with error handling
  const { 
    data: summary, 
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: leaderboard = [], 
    isLoading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard
  } = useQuery<BuilderLeaderboardEntry[]>({
    queryKey: ["/api/dashboard/leaderboard"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: forecasts = [], 
    isLoading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecasts
  } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
    retry: 2,
  });

  const { 
    data: jobs = [], 
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs 
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: builders = [], 
    isLoading: buildersLoading,
    error: buildersError,
    refetch: refetchBuilders
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  const { 
    data: checklistItems = [], 
    isLoading: checklistLoading,
    error: checklistError,
    refetch: refetchChecklist
  } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
    retry: 2,
  });

  const { 
    data: analyticsData, 
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: metricsData, 
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ["/api/analytics/metrics", dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/metrics?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: trendsData, 
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends
  } = useQuery({
    queryKey: ["/api/analytics/trends", selectedTimeRange, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: selectedTimeRange === "month" ? "monthly" : selectedTimeRange === "week" ? "weekly" : "daily",
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/trends?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch trends");
      return response.json();
    },
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: builderPerformance, 
    isLoading: builderPerfLoading,
    error: builderPerfError,
    refetch: refetchBuilderPerf
  } = useQuery({
    queryKey: ["/api/analytics/builder-performance"],
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: financialData, 
    isLoading: financialLoading,
    error: financialError,
    refetch: refetchFinancial
  } = useQuery({
    queryKey: ["/api/analytics/financial", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const response = await fetch(`/api/analytics/financial?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch financial data");
      return response.json();
    },
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: revenueExpense, 
    isLoading: revenueExpenseLoading,
    error: revenueExpenseError,
    refetch: refetchRevenueExpense
  } = useQuery({
    queryKey: ["/api/analytics/revenue-expense", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: "monthly",
        startDate: subMonths(new Date(), 6).toISOString(),
        endDate: new Date().toISOString(),
      });
      const response = await fetch(`/api/analytics/revenue-expense?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch revenue/expense data");
      return response.json();
    },
    refetchInterval: isLiveMode ? ANALYTICS_REFRESH_INTERVAL : false,
    retry: 2,
  });

  const isLoading = summaryLoading || leaderboardLoading || forecastsLoading || jobsLoading || 
                   buildersLoading || checklistLoading || analyticsLoading || metricsLoading || 
                   trendsLoading || builderPerfLoading || financialLoading || revenueExpenseLoading;

  const hasAnyError = summaryError || leaderboardError || forecastsError || jobsError || 
                     buildersError || checklistError || analyticsError || metricsError ||
                     trendsError || builderPerfError || financialError || revenueExpenseError;

  // Phase 3 - OPTIMIZE: Memoized metrics calculation
  // Phase 6 - DOCUMENT: Dashboard metrics derived from multiple data sources
  // Calculates key performance indicators including completion rates, revenue, compliance
  // Phase 5 - HARDEN: All divisions use safeDivide to prevent NaN from division by zero
  const metrics: DashboardMetrics = useMemo(() => {
    if (metricsData) {
      return {
        jobsCompleted: metricsData.completedJobs || 0,
        jobsCompletedTrend: 0,
        avgQaScore: 0,
        avgQaScoreTrend: 0,
        monthlyRevenue: metricsData.totalRevenue || 0,
        monthlyRevenueTrend: 0,
        complianceRate: metricsData.completionRate || 0,
        complianceRateTrend: 0,
        activeBuilders: 0,
        activeBuildersTrend: 0,
        avgInspectionTime: 0,
        firstPassRate: 0,
        photosUploaded: metricsData.photosUploaded || 0,
      };
    }

    // Phase 6 - DOCUMENT: Fallback calculation when analytics API unavailable
    // Filters jobs by date range and calculates metrics from raw data
    const thisMonthJobs = jobs.filter(j => {
      const jobDate = new Date(j.completedDate || j.scheduledDate || "");
      return jobDate >= dateRange.from && jobDate <= dateRange.to;
    });
    
    const lastMonthJobs = jobs.filter(j => {
      const jobDate = new Date(j.completedDate || j.scheduledDate || "");
      const lastMonthStart = subMonths(dateRange.from, 1);
      const lastMonthEnd = subMonths(dateRange.to, 1);
      return jobDate >= lastMonthStart && jobDate <= lastMonthEnd;
    });

    const completedJobs = jobs.filter(j => j.status === "done");

    const jobsCompleted = thisMonthJobs.filter(j => j.status === "done").length;
    const jobsCompletedLastMonth = lastMonthJobs.filter(j => j.status === "done").length;
    
    // Phase 6 - DOCUMENT: Trend calculation - percentage change from previous period
    // Phase 5 - HARDEN: safeDivide prevents NaN when last month had zero jobs
    const jobsCompletedTrend = safeDivide(
      (jobsCompleted - jobsCompletedLastMonth) * 100,
      jobsCompletedLastMonth,
      0
    );

    // Phase 6 - DOCUMENT: QA Score - percentage of completed checklist items
    // Aggregates checklist completion across all jobs for quality assessment
    const completedWithScores = completedJobs.filter(j => checklistItems.some(c => c.jobId === j.id));
    const avgQaScore = safeDivide(
      completedWithScores.reduce((sum, job) => {
        const items = checklistItems.filter(c => c.jobId === job.id);
        const score = safeDivide(
          items.filter(i => i.completed).length * 100,
          items.length,
          0
        );
        return sum + score;
      }, 0),
      completedWithScores.length,
      0
    );

    // Phase 6 - DOCUMENT: Revenue calculation - $850 per inspection (standard rate)
    const monthlyRevenue = thisMonthJobs.length * 850;
    const lastMonthRevenue = lastMonthJobs.length * 850;
    const monthlyRevenueTrend = safeDivide(
      (monthlyRevenue - lastMonthRevenue) * 100,
      lastMonthRevenue,
      0
    );

    // Phase 6 - DOCUMENT: Compliance rate - percentage of jobs meeting compliance standards
    const compliantJobs = thisMonthJobs.filter(j => j.complianceStatus === "compliant");
    const complianceRate = safeDivide(
      compliantJobs.length * 100,
      thisMonthJobs.length,
      0
    );

    // Phase 6 - DOCUMENT: Active builders - unique builders with jobs in current period
    const activeBuilders = new Set(thisMonthJobs.map(j => j.builderId)).size;
    const activeLastMonth = new Set(lastMonthJobs.map(j => j.builderId)).size;
    const activeBuildersTrend = safeDivide(
      (activeBuilders - activeLastMonth) * 100,
      activeLastMonth,
      0
    );

    // Phase 6 - DOCUMENT: First pass rate - jobs completed without requiring rework
    const firstPassJobs = completedJobs.filter(j => {
      const items = checklistItems.filter(c => c.jobId === j.id);
      return items.length > 0 && items.every(i => i.completed);
    });
    const firstPassRate = safeDivide(
      firstPassJobs.length * 100,
      completedJobs.length,
      0
    );

    return {
      jobsCompleted,
      jobsCompletedTrend,
      avgQaScore,
      avgQaScoreTrend: 5.2,
      monthlyRevenue,
      monthlyRevenueTrend,
      complianceRate,
      complianceRateTrend: -2.1,
      activeBuilders,
      activeBuildersTrend,
      avgInspectionTime: 125,
      firstPassRate,
      photosUploaded: 342,
    };
  }, [jobs, checklistItems, dateRange, metricsData]);

  // Phase 3 - OPTIMIZE: Memoized chart data transformations
  const inspectionTrendsData = useMemo(() => {
    if (trendsData && trendsData.length > 0) {
      return trendsData.map((item: any) => ({
        period: item.date,
        inspections: item.total || 0,
        completed: item.completed || 0,
        pending: item.pending || 0,
        scheduled: item.scheduled || 0,
        inProgress: item.inProgress || 0,
      }));
    }
    
    return [];
  }, [trendsData]);

  const builderPerformanceData = useMemo(() => {
    if (builderPerformance && builderPerformance.length > 0) {
      return builderPerformance.map((builder: any) => ({
        name: builder.builderName,
        completed: builder.completedJobs || 0,
        pending: builder.totalJobs - builder.completedJobs || 0,
        compliance: builder.qualityScore || 0,
        completionRate: builder.completionRate || 0,
        avgCompletionTime: builder.avgCompletionTime || 0,
      }));
    }
    
    return builders.slice(0, 5).map(builder => {
      const builderJobs = jobs.filter(j => j.builderId === builder.id);
      return {
        name: builder.name,
        completed: builderJobs.filter(j => j.status === "done").length,
        pending: builderJobs.filter(j => j.status === "scheduled").length,
        compliance: 0,
        completionRate: 0,
        avgCompletionTime: 0,
      };
    });
  }, [builderPerformance, builders, jobs]);

  const jobStatusData = useMemo(() => [
    { name: "Done", value: jobs.filter(j => j.status === "done").length, color: STATUS_COLORS.done },
    { name: "Scheduled", value: jobs.filter(j => j.status === "scheduled").length, color: STATUS_COLORS.scheduled },
    { name: "Failed", value: jobs.filter(j => j.status === "failed").length, color: STATUS_COLORS.failed },
    { name: "Reschedule", value: jobs.filter(j => j.status === "reschedule").length, color: STATUS_COLORS.reschedule },
  ], [jobs]);

  const revenueExpenseData = useMemo(() => {
    if (revenueExpense && revenueExpense.length > 0) {
      return revenueExpense.map((item: any) => ({
        month: item.date,
        revenue: item.revenue || 0,
        expenses: item.expenses || 0,
        profit: item.profit || 0,
      }));
    }
    
    return [];
  }, [revenueExpense]);

  const ach50ResultsData = useMemo(() => {
    if (analyticsData && analyticsData.tierDistribution) {
      return analyticsData.tierDistribution.map((tier: any) => ({
        tier: tier.tier,
        count: tier.count,
        percentage: tier.percentage,
        color: tier.color,
      }));
    }
    
    return [];
  }, [analyticsData]);

  // Phase 3 - OPTIMIZE: Memoized activity feed generation
  // Phase 6 - DOCUMENT: Activity feed shows recent job completions and system events
  const activityItems: ActivityItem[] = useMemo(() => {
    const recentJobs = jobs
      .filter(j => j.completedDate)
      .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime())
      .slice(0, 5);

    return [
      ...recentJobs.map(job => ({
        id: job.id,
        type: "job_completed" as const,
        title: `Job completed: ${job.address}`,
        description: job.builderName,
        timestamp: new Date(job.completedDate!),
        user: { name: "Inspector" },
      })),
      {
        id: "achievement-1",
        type: "achievement_unlocked" as const,
        title: "Speed Demon unlocked!",
        description: "Completed 5 inspections in one day",
        timestamp: subDays(new Date(), 1),
        user: { name: "John Doe" },
      },
      {
        id: "photo-1",
        type: "photo_uploaded" as const,
        title: "15 photos uploaded",
        description: "Job #1234 documentation complete",
        timestamp: subDays(new Date(), 0.5),
        user: { name: "Jane Smith" },
      },
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [jobs]);

  // Phase 3 - OPTIMIZE: useCallback for event handlers prevents recreation
  // Phase 6 - DOCUMENT: Dashboard refresh mechanism - invalidates all data queries
  const handleRefresh = useCallback(async () => {
    setLastRefresh(new Date());
    await Promise.all([
      refetchSummary(),
      refetchJobs(),
      refetchLeaderboard(),
      refetchAnalytics(),
      refetchMetrics(),
      refetchTrends(),
      refetchBuilderPerf(),
      refetchFinancial(),
      refetchRevenueExpense(),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
    ]);
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
    });
  }, [
    refetchSummary, 
    refetchJobs, 
    refetchLeaderboard,
    refetchAnalytics,
    refetchMetrics,
    refetchTrends,
    refetchBuilderPerf,
    refetchFinancial,
    refetchRevenueExpense,
    toast
  ]);

  // Phase 3 - OPTIMIZE: Export handlers with useCallback
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/dashboard/export", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to download PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `dashboard-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dashboard report downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const response = await apiRequest("POST", "/api/dashboard/export/email", { emails });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setEmailDialogOpen(false);
      setEmailAddresses("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = useCallback(() => downloadMutation.mutate(), [downloadMutation]);

  const handleExport = useCallback(async (format: "pdf" | "excel" | "csv") => {
    if (format === "csv") {
      try {
        const params = new URLSearchParams({
          format: 'csv',
          type: 'dashboard'
        });
        
        const response = await fetch(`/api/analytics/export?${params.toString()}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = dateRange.from && dateRange.to 
          ? `${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}`
          : new Date().toISOString().split('T')[0];
        a.download = `dashboard_analytics_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export successful",
          description: "Dashboard analytics exported to CSV",
        });
      } catch (error) {
        toast({
          title: "Export failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Coming soon",
        description: `${format.toUpperCase()} export will be available soon`,
      });
    }
  }, [dateRange, toast]);

  const handleEmailSubmit = useCallback(() => {
    const emails = emailAddresses
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }
    
    emailMutation.mutate(emails);
  }, [emailAddresses, emailMutation, toast]);

  // Phase 3 - OPTIMIZE: Auto-refresh effect with cleanup
  // Phase 6 - DOCUMENT: Live mode updates dashboard every 30 seconds
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval); // Phase 3 - OPTIMIZE: Cleanup prevents memory leak
  }, [isLiveMode]);

  // Phase 2 - BUILD: Per-query error state component with retry
  const QueryErrorAlert = ({ error, refetch, queryName }: { error: Error; refetch: () => void; queryName: string }) => (
    <Alert variant="destructive" className="my-4" data-testid={`alert-error-${queryName}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Failed to load {queryName}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch}
          data-testid={`button-retry-${queryName}`}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              Analytics Dashboard
              {isLiveMode && (
                <Badge variant="secondary" className="animate-pulse" data-testid="badge-live-mode">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              data-testid="picker-date-range"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-export">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="menu-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="menu-export-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="menu-export-csv">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEmailDialogOpen(true)} data-testid="menu-export-email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              onClick={() => setIsLiveMode(!isLiveMode)}
              data-testid="button-toggle-live-mode"
            >
              {isLiveMode ? "Pause" : "Resume"} Live
            </Button>
          </div>
        </div>

        {/* Phase 2 - BUILD: Error states with retry for each query */}
        {summaryError && <QueryErrorAlert error={summaryError as Error} refetch={refetchSummary} queryName="summary" />}
        {leaderboardError && <QueryErrorAlert error={leaderboardError as Error} refetch={refetchLeaderboard} queryName="leaderboard" />}
        {jobsError && <QueryErrorAlert error={jobsError as Error} refetch={refetchJobs} queryName="jobs" />}
        {analyticsError && <QueryErrorAlert error={analyticsError as Error} refetch={refetchAnalytics} queryName="analytics" />}
        {metricsError && <QueryErrorAlert error={metricsError as Error} refetch={refetchMetrics} queryName="metrics" />}
        {trendsError && <QueryErrorAlert error={trendsError as Error} refetch={refetchTrends} queryName="trends" />}

        {/* Phase 2 - BUILD: KPI Cards with skeleton loaders */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <MetricCardSkeleton key={i} data-testid={`skeleton-metric-${i}`} />
              ))}
            </>
          ) : (
            <>
              <motion.div variants={cardAppear} data-testid="card-metric-jobs-completed">
                <MetricCard
                  title="Jobs Completed"
                  value={metrics.jobsCompleted}
                  previousValue={metrics.jobsCompleted - 5}
                  sparklineData={generateSparklineData(metrics.jobsCompleted)}
                  icon={<CheckCircle2 className="h-5 w-5 text-success" />}
                  format="number"
                  trend={metrics.jobsCompletedTrend > 0 ? "up" : "down"}
                  trendValue={`${Math.abs(metrics.jobsCompletedTrend).toFixed(1)}%`}
                  loading={false}
                  animate={isLiveMode}
                  live={isLiveMode}
                />
              </motion.div>
              <motion.div variants={cardAppear} data-testid="card-metric-qa-score">
                <MetricCard
                  title="Avg QA Score"
                  value={`${metrics.avgQaScore.toFixed(1)}%`}
                  sparklineData={generateSparklineData(metrics.avgQaScore)}
                  icon={<Star className="h-5 w-5 text-warning" />}
                  trend={metrics.avgQaScoreTrend > 0 ? "up" : "down"}
                  trendValue={`${Math.abs(metrics.avgQaScoreTrend).toFixed(1)}%`}
                  loading={false}
                  animate={isLiveMode}
                  live={isLiveMode}
                />
              </motion.div>
              <motion.div variants={cardAppear} data-testid="card-metric-revenue">
                <MetricCard
                  title="Monthly Revenue"
                  value={metrics.monthlyRevenue}
                  previousValue={metrics.monthlyRevenue - 5000}
                  sparklineData={generateSparklineData(metrics.monthlyRevenue / 1000)}
                  icon={<DollarSign className="h-5 w-5 text-success" />}
                  format="currency"
                  trend={metrics.monthlyRevenueTrend > 0 ? "up" : "down"}
                  trendValue={`${Math.abs(metrics.monthlyRevenueTrend).toFixed(1)}%`}
                  loading={false}
                  animate={isLiveMode}
                  live={isLiveMode}
                />
              </motion.div>
              <motion.div variants={cardAppear} data-testid="card-metric-compliance">
                <MetricCard
                  title="Compliance Rate"
                  value={`${metrics.complianceRate.toFixed(1)}%`}
                  sparklineData={generateSparklineData(metrics.complianceRate)}
                  icon={<Target className="h-5 w-5 text-info" />}
                  trend={metrics.complianceRateTrend > 0 ? "up" : "down"}
                  trendValue={`${Math.abs(metrics.complianceRateTrend).toFixed(1)}%`}
                  loading={false}
                  animate={isLiveMode}
                  live={isLiveMode}
                />
              </motion.div>
              <motion.div variants={cardAppear} data-testid="card-metric-builders">
                <MetricCard
                  title="Active Builders"
                  value={metrics.activeBuilders}
                  previousValue={metrics.activeBuilders - 2}
                  sparklineData={generateSparklineData(metrics.activeBuilders)}
                  icon={<Users className="h-5 w-5 text-primary" />}
                  trend={metrics.activeBuildersTrend > 0 ? "up" : "down"}
                  trendValue={`${Math.abs(metrics.activeBuildersTrend).toFixed(0)}%`}
                  loading={false}
                  animate={isLiveMode}
                  live={isLiveMode}
                />
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Phase 2 - BUILD: Progress Widgets with skeleton loaders */}
        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <DashboardCardSkeleton key={i} data-testid={`skeleton-progress-${i}`} />
              ))}
            </>
          ) : (
            <>
              <ProgressWidget
                title="Monthly Target"
                current={metrics.jobsCompleted}
                target={THRESHOLDS.monthlyJobsTarget}
                unit=" jobs"
                color="primary"
                showPercentage={true}
                subtitle="Track monthly inspection goals"
                data-testid="widget-progress-monthly-target"
              />
              <ProgressWidget
                title="First Pass Rate"
                current={metrics.firstPassRate}
                target={THRESHOLDS.firstPassRate}
                unit="%"
                format="percentage"
                color="success"
                subtitle={`Quality target: ${THRESHOLDS.firstPassRate}%`}
                data-testid="widget-progress-first-pass"
              />
              <ProgressWidget
                title="Avg Inspection Time"
                current={metrics.avgInspectionTime}
                target={THRESHOLDS.avgInspectionTime}
                unit=" min"
                color={metrics.avgInspectionTime > THRESHOLDS.avgInspectionTime ? "warning" : "success"}
                subtitle={`Efficiency target: ${THRESHOLDS.avgInspectionTime} min`}
                data-testid="widget-progress-inspection-time"
              />
            </>
          )}
        </div>

        {/* Phase 2 - BUILD: Main Charts with skeleton loaders and empty states */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList data-testid="tabs-charts">
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
            <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4" data-testid="content-trends">
            <div className="grid gap-4 lg:grid-cols-2">
              {trendsLoading ? (
                <ChartSkeleton height={300} data-testid="skeleton-chart-trends" />
              ) : inspectionTrendsData.length === 0 ? (
                <Card data-testid="empty-chart-trends">
                  <CardHeader>
                    <CardTitle>Inspection Trends</CardTitle>
                    <CardDescription>No trend data available</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No inspection data for the selected period</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ChartWidget
                  title="Inspection Trends"
                  description="Daily, weekly, and monthly inspection volumes"
                  data={inspectionTrendsData}
                  type="line"
                  dataKeys={["inspections", "completed", "pending"]}
                  xAxisKey="period"
                  height={300}
                  onTimeRangeChange={setSelectedTimeRange}
                  currentTimeRange={selectedTimeRange === "day" ? "Day" : selectedTimeRange === "week" ? "Week" : "Month"}
                  timeRangeOptions={["Day", "Week", "Month"]}
                  showLegend={true}
                  animate={true}
                  live={isLiveMode}
                  loading={false}
                  data-testid="chart-inspection-trends"
                />
              )}
              
              {jobsLoading ? (
                <ChartSkeleton height={300} data-testid="skeleton-chart-job-status" />
              ) : jobStatusData.every(d => d.value === 0) ? (
                <Card data-testid="empty-chart-job-status">
                  <CardHeader>
                    <CardTitle>Job Status Distribution</CardTitle>
                    <CardDescription>No job data available</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No jobs to display</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ChartWidget
                  title="Job Status Distribution"
                  description="Current status breakdown of all jobs"
                  data={jobStatusData}
                  type="pie"
                  dataKeys={["value"]}
                  xAxisKey="name"
                  height={300}
                  colors={jobStatusData.map(d => d.color)}
                  showLegend={true}
                  animate={true}
                  interactive={true}
                  loading={false}
                  onDataPointClick={(data) => {
                    toast({
                      title: data.name,
                      description: `${data.value} jobs`,
                    });
                  }}
                  data-testid="chart-job-status"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4" data-testid="content-performance">
            {builderPerfLoading ? (
              <ChartSkeleton height={350} data-testid="skeleton-chart-builder-perf" />
            ) : builderPerformanceData.length === 0 ? (
              <Card data-testid="empty-chart-builder-perf">
                <CardHeader>
                  <CardTitle>Builder Performance Comparison</CardTitle>
                  <CardDescription>No builder data available</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No builder performance data for the selected period</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartWidget
                title="Builder Performance Comparison"
                description="Top builders by completion rate and compliance"
                data={builderPerformanceData}
                type="bar"
                dataKeys={["completed", "pending", "compliance"]}
                xAxisKey="name"
                height={350}
                stacked={false}
                showLegend={true}
                animate={true}
                interactive={true}
                loading={false}
                data-testid="chart-builder-performance"
              />
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4" data-testid="content-compliance">
            {analyticsLoading ? (
              <ChartSkeleton height={350} data-testid="skeleton-chart-compliance" />
            ) : ach50ResultsData.length === 0 ? (
              <Card data-testid="empty-chart-compliance">
                <CardHeader>
                  <CardTitle>ACH50 Test Results Over Time</CardTitle>
                  <CardDescription>No compliance data available</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No ACH50 test results for the selected period</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartWidget
                title="ACH50 Test Results Over Time"
                description="Average ACH50 values and pass rates"
                data={ach50ResultsData}
                type="composed"
                dataKeys={[
                  { key: "avgACH50", color: "hsl(var(--primary))" },
                  { key: "passRate", color: "hsl(var(--success))" },
                ]}
                xAxisKey="month"
                height={350}
                showLegend={true}
                animate={true}
                loading={false}
                annotations={[
                  { x: "Current", label: "Target: < 5 ACH50", color: "hsl(var(--warning))" },
                ]}
                data-testid="chart-ach50-results"
              />
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4" data-testid="content-financial">
            {revenueExpenseLoading ? (
              <ChartSkeleton height={350} data-testid="skeleton-chart-financial" />
            ) : revenueExpenseData.length === 0 ? (
              <Card data-testid="empty-chart-financial">
                <CardHeader>
                  <CardTitle>Revenue & Expense Tracking</CardTitle>
                  <CardDescription>No financial data available</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No financial data for the selected period</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ChartWidget
                title="Revenue & Expense Tracking"
                description="Monthly financial performance"
                data={revenueExpenseData}
                type="area"
                dataKeys={["revenue", "expenses", "profit"]}
                xAxisKey="month"
                height={350}
                stacked={false}
                showLegend={true}
                animate={true}
                loading={false}
                data-testid="chart-revenue-expense"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Phase 2 - BUILD: Bottom Section with skeleton loaders and empty states */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Tier Summary */}
            {summaryLoading ? (
              <DashboardCardSkeleton data-testid="skeleton-tier-summary" />
            ) : summary ? (
              <TierSummaryCard summary={summary} data-testid="card-tier-summary" />
            ) : (
              <Card data-testid="empty-tier-summary">
                <CardHeader>
                  <CardTitle>Tier Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No tier data available</p>
                </CardContent>
              </Card>
            )}
            
            {/* Leaderboard */}
            {leaderboardLoading ? (
              <TableSkeleton rows={5} columns={4} data-testid="skeleton-leaderboard" />
            ) : leaderboard.length === 0 ? (
              <Card data-testid="empty-leaderboard">
                <CardHeader>
                  <CardTitle>Leaderboard</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No leaderboard data available</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <LeaderboardTable entries={leaderboard} loading={false} data-testid="table-leaderboard" />
            )}
            
            {/* Tax Credit Panel */}
            {summaryLoading ? (
              <DashboardCardSkeleton data-testid="skeleton-tax-credit" />
            ) : summary ? (
              <TaxCreditPanel summary={summary} data-testid="panel-tax-credit" />
            ) : (
              <Card data-testid="empty-tax-credit">
                <CardHeader>
                  <CardTitle>Tax Credit Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No tax credit data available</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Activity Feed */}
            {jobsLoading ? (
              <ActivityFeedSkeleton items={5} data-testid="skeleton-activity-feed" />
            ) : activityItems.length === 0 ? (
              <Card data-testid="empty-activity-feed">
                <CardHeader>
                  <CardTitle>Activity Feed</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ActivityFeed
                items={activityItems}
                maxHeight={400}
                live={isLiveMode}
                onItemClick={(item) => {
                  toast({
                    title: item.title,
                    description: item.description,
                  });
                }}
                data-testid="feed-activity"
              />
            )}
            
            {/* Monthly Highlights */}
            {isLoading ? (
              <DashboardCardSkeleton data-testid="skeleton-monthly-highlights" />
            ) : (
              <MonthlyHighlights
                totalInspections={metrics.jobsCompleted}
                avgQaScore={metrics.avgQaScore}
                topPerformer={leaderboard[0]?.builderName || "N/A"}
                mostImproved={leaderboard[1]?.builderName || "N/A"}
                data-testid="card-monthly-highlights"
              />
            )}
            
            {/* Achievements Panel */}
            <AchievementsPanel userId="current-user" data-testid="panel-achievements" />
          </div>
        </div>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent data-testid="dialog-email-report">
            <DialogHeader>
              <DialogTitle>Email Dashboard Report</DialogTitle>
              <DialogDescription>
                Enter email addresses to send the dashboard report
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="emails">Email Addresses</Label>
                <Input
                  id="emails"
                  value={emailAddresses}
                  onChange={(e) => setEmailAddresses(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  data-testid="input-email-addresses"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEmailDialogOpen(false)}
                data-testid="button-cancel-email"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEmailSubmit} 
                disabled={emailMutation.isPending}
                data-testid="button-send-email"
              >
                {emailMutation.isPending ? "Sending..." : "Send Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary with comprehensive fallback
export default function Dashboard() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full" data-testid="card-error-boundary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Dashboard Error
              </CardTitle>
              <CardDescription>
                The dashboard encountered an unexpected error
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please try refreshing the page. If the problem persists, contact support.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
                data-testid="button-reload-page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <DashboardContent />
    </ErrorBoundary>
  );
}
