import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DashboardCardSkeleton, 
  TableSkeleton, 
  ChartSkeleton,
  MetricCardSkeleton,
  ActivityFeedSkeleton
} from "@/components/ui/skeleton-variants";
import { 
  FadeIn, 
  FadeInUp, 
  StaggerContainer, 
  StaggerItem,
  AnimatedNumber,
  HoverScale
} from "@/components/ui/animated-wrapper";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Trophy, BarChart3, DollarSign, Target, Download, Mail, FileText,
  TrendingUp, Activity, Users, CheckCircle2, Clock, Settings,
  RefreshCw, Calendar, FileSpreadsheet, Share2, Bell, Star
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

const REFRESH_INTERVAL = 30000; // 30 seconds

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

export default function Dashboard() {
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

  // Fetch data queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<BuilderLeaderboardEntry[]>({
    queryKey: ["/api/dashboard/leaderboard"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
  });

  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
  });

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: isLiveMode ? REFRESH_INTERVAL : false,
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const { data: checklistItems = [], isLoading: checklistLoading } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
  });

  // Fetch analytics data from new endpoints
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    refetchInterval: isLiveMode ? 60000 : false, // 60 seconds refresh
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
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
    refetchInterval: isLiveMode ? 60000 : false,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
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
    refetchInterval: isLiveMode ? 60000 : false,
  });

  const { data: builderPerformance, isLoading: builderPerfLoading } = useQuery({
    queryKey: ["/api/analytics/builder-performance"],
    refetchInterval: isLiveMode ? 60000 : false,
  });

  const { data: financialData, isLoading: financialLoading } = useQuery({
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
    refetchInterval: isLiveMode ? 60000 : false,
  });

  const { data: revenueExpense, isLoading: revenueExpenseLoading } = useQuery({
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
    refetchInterval: isLiveMode ? 60000 : false,
  });

  const isLoading = summaryLoading || leaderboardLoading || forecastsLoading || jobsLoading || 
                   buildersLoading || checklistLoading || analyticsLoading || metricsLoading || 
                   trendsLoading || builderPerfLoading || financialLoading || revenueExpenseLoading;

  // Use real metrics from API
  const metrics: DashboardMetrics = useMemo(() => {
    if (metricsData) {
      return {
        jobsCompleted: metricsData.completedJobs || 0,
        jobsCompletedTrend: 0, // Will calculate from historical data
        avgQaScore: 0, // Will get from QA data
        avgQaScoreTrend: 0,
        monthlyRevenue: metricsData.totalRevenue || 0,
        monthlyRevenueTrend: 0, // Will calculate from historical data
        complianceRate: metricsData.completionRate || 0,
        complianceRateTrend: 0,
        activeBuilders: 0, // Will get from builder performance
        activeBuildersTrend: 0,
        avgInspectionTime: 0, // Will calculate from job timestamps
        firstPassRate: 0, // Will calculate from QA data
        photosUploaded: metricsData.photosUploaded || 0,
      };
    }

    // Fallback to calculated metrics if new API not available yet
    const completedJobs = jobs.filter(j => j.status === "completed");
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

    const jobsCompleted = thisMonthJobs.filter(j => j.status === "completed").length;
    const jobsCompletedLastMonth = lastMonthJobs.filter(j => j.status === "completed").length;
    const jobsCompletedTrend = jobsCompletedLastMonth > 0 
      ? ((jobsCompleted - jobsCompletedLastMonth) / jobsCompletedLastMonth) * 100
      : 0;

    // Calculate QA scores
    const completedWithScores = completedJobs.filter(j => checklistItems.some(c => c.jobId === j.id));
    const avgQaScore = completedWithScores.length > 0
      ? completedWithScores.reduce((sum, job) => {
          const items = checklistItems.filter(c => c.jobId === job.id);
          const score = items.length > 0 
            ? (items.filter(i => i.completed).length / items.length) * 100
            : 0;
          return sum + score;
        }, 0) / completedWithScores.length
      : 0;

    // Mock revenue data (in real app, would come from backend)
    const monthlyRevenue = thisMonthJobs.length * 850;
    const lastMonthRevenue = lastMonthJobs.length * 850;
    const monthlyRevenueTrend = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Compliance rate
    const compliantJobs = thisMonthJobs.filter(j => j.complianceStatus === "compliant");
    const complianceRate = thisMonthJobs.length > 0
      ? (compliantJobs.length / thisMonthJobs.length) * 100
      : 0;

    // Active builders
    const activeBuilders = new Set(thisMonthJobs.map(j => j.builderId)).size;
    const activeLastMonth = new Set(lastMonthJobs.map(j => j.builderId)).size;
    const activeBuildersTrend = activeLastMonth > 0
      ? ((activeBuilders - activeLastMonth) / activeLastMonth) * 100
      : 0;

    // First pass rate
    const firstPassJobs = completedJobs.filter(j => {
      const items = checklistItems.filter(c => c.jobId === j.id);
      return items.length > 0 && items.every(i => i.completed);
    });
    const firstPassRate = completedJobs.length > 0
      ? (firstPassJobs.length / completedJobs.length) * 100
      : 0;

    return {
      jobsCompleted,
      jobsCompletedTrend,
      avgQaScore,
      avgQaScoreTrend: 5.2, // Mock trend
      monthlyRevenue,
      monthlyRevenueTrend,
      complianceRate,
      complianceRateTrend: -2.1, // Mock trend
      activeBuilders,
      activeBuildersTrend,
      avgInspectionTime: 125,
      firstPassRate,
      photosUploaded: 342, // Mock
    };
  }, [jobs, checklistItems, dateRange, builders]);

  // Use real chart data from API
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
    
    // Fallback if API data not available
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
    
    // Fallback calculation from local data
    return builders.slice(0, 5).map(builder => {
      const builderJobs = jobs.filter(j => j.builderId === builder.id);
      return {
        name: builder.name,
        completed: builderJobs.filter(j => j.status === "completed").length,
        pending: builderJobs.filter(j => j.status === "pending").length,
        compliance: 0,
        completionRate: 0,
        avgCompletionTime: 0,
      };
    });
  }, [builderPerformance, builders, jobs]);

  const jobStatusData = useMemo(() => [
    { name: "Completed", value: jobs.filter(j => j.status === "completed").length, color: "hsl(var(--success))" },
    { name: "In Progress", value: jobs.filter(j => j.status === "in-progress").length, color: "hsl(var(--primary))" },
    { name: "Review", value: jobs.filter(j => j.status === "review").length, color: "hsl(var(--warning))" },
    { name: "Pending", value: jobs.filter(j => j.status === "pending").length, color: "hsl(var(--secondary))" },
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
    
    // Fallback to empty data if API not available
    return [];
  }, [revenueExpense]);

  const ach50ResultsData = useMemo(() => {
    // Use data from analytics/dashboard endpoint if available
    if (analyticsData && analyticsData.tierDistribution) {
      return analyticsData.tierDistribution.map((tier: any) => ({
        tier: tier.tier,
        count: tier.count,
        percentage: tier.percentage,
        color: tier.color,
      }));
    }
    
    // Fallback to empty data
    return [];
  }, [analyticsData]);

  // Generate activity feed items
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

  // Refresh handler
  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await Promise.all([
      refetchSummary(),
      refetchJobs(),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
    ]);
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
    });
  };

  // Export handlers
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

  const handleDownload = () => downloadMutation.mutate();

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    toast({
      title: "Export initiated",
      description: `Exporting dashboard as ${format.toUpperCase()}...`,
    });
  };

  const handleEmailSubmit = () => {
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
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              Analytics Dashboard
              {isLiveMode && (
                <Badge variant="secondary" className="animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
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
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => setIsLiveMode(!isLiveMode)}>
              {isLiveMode ? "Pause" : "Resume"} Live
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StaggerItem>
            <MetricCard
              title="Jobs Completed"
              value={metrics.jobsCompleted}
              previousValue={metrics.jobsCompleted - 5}
              sparklineData={generateSparklineData(metrics.jobsCompleted)}
              icon={<CheckCircle2 className="h-5 w-5 text-success" />}
              format="number"
              trend={metrics.jobsCompletedTrend > 0 ? "up" : "down"}
              trendValue={`${Math.abs(metrics.jobsCompletedTrend).toFixed(1)}%`}
              loading={isLoading}
              animate={isLiveMode}
              live={isLiveMode}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              title="Avg QA Score"
              value={`${metrics.avgQaScore.toFixed(1)}%`}
              sparklineData={generateSparklineData(metrics.avgQaScore)}
              icon={<Star className="h-5 w-5 text-warning" />}
              trend={metrics.avgQaScoreTrend > 0 ? "up" : "down"}
              trendValue={`${Math.abs(metrics.avgQaScoreTrend).toFixed(1)}%`}
              loading={isLoading}
              animate={isLiveMode}
              live={isLiveMode}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              title="Monthly Revenue"
              value={metrics.monthlyRevenue}
              previousValue={metrics.monthlyRevenue - 5000}
              sparklineData={generateSparklineData(metrics.monthlyRevenue / 1000)}
              icon={<DollarSign className="h-5 w-5 text-success" />}
              format="currency"
              trend={metrics.monthlyRevenueTrend > 0 ? "up" : "down"}
              trendValue={`${Math.abs(metrics.monthlyRevenueTrend).toFixed(1)}%`}
              loading={isLoading}
              animate={isLiveMode}
              live={isLiveMode}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              title="Compliance Rate"
              value={`${metrics.complianceRate.toFixed(1)}%`}
              sparklineData={generateSparklineData(metrics.complianceRate)}
              icon={<Target className="h-5 w-5 text-info" />}
              trend={metrics.complianceRateTrend > 0 ? "up" : "down"}
              trendValue={`${Math.abs(metrics.complianceRateTrend).toFixed(1)}%`}
              loading={isLoading}
              animate={isLiveMode}
              live={isLiveMode}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              title="Active Builders"
              value={metrics.activeBuilders}
              previousValue={metrics.activeBuilders - 2}
              sparklineData={generateSparklineData(metrics.activeBuilders)}
              icon={<Users className="h-5 w-5 text-primary" />}
              trend={metrics.activeBuildersTrend > 0 ? "up" : "down"}
              trendValue={`${Math.abs(metrics.activeBuildersTrend).toFixed(0)}%`}
              loading={isLoading}
              animate={isLiveMode}
              live={isLiveMode}
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Progress Widgets */}
        <div className="grid gap-4 md:grid-cols-3">
          <ProgressWidget
            title="Monthly Target"
            current={metrics.jobsCompleted}
            target={100}
            unit=" jobs"
            color="primary"
            showPercentage={true}
            subtitle="Track monthly inspection goals"
          />
          <ProgressWidget
            title="First Pass Rate"
            current={metrics.firstPassRate}
            target={85}
            unit="%"
            format="percentage"
            color="success"
            subtitle="Quality target: 85%"
          />
          <ProgressWidget
            title="Avg Inspection Time"
            current={metrics.avgInspectionTime}
            target={120}
            unit=" min"
            color={metrics.avgInspectionTime > 120 ? "warning" : "success"}
            subtitle="Efficiency target: 120 min"
          />
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
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
              />
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
                onDataPointClick={(data) => {
                  toast({
                    title: data.name,
                    description: `${data.value} jobs`,
                  });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
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
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
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
              annotations={[
                { x: "Current", label: "Target: < 5 ACH50", color: "hsl(var(--warning))" },
              ]}
            />
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
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
            />
          </TabsContent>
        </Tabs>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Tier Summary */}
            {summary && <TierSummaryCard summary={summary} />}
            
            {/* Leaderboard */}
            <LeaderboardTable entries={leaderboard} loading={leaderboardLoading} />
            
            {/* Tax Credit Panel */}
            {summary && <TaxCreditPanel summary={summary} />}
          </div>
          
          <div className="space-y-6">
            {/* Activity Feed */}
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
            />
            
            {/* Monthly Highlights */}
            <MonthlyHighlights
              totalInspections={metrics.jobsCompleted}
              avgQaScore={metrics.avgQaScore}
              topPerformer={leaderboard[0]?.builderName || "N/A"}
              mostImproved={leaderboard[1]?.builderName || "N/A"}
            />
            
            {/* Achievements Panel */}
            <AchievementsPanel userId="current-user" />
          </div>
        </div>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEmailSubmit} disabled={emailMutation.isPending}>
                {emailMutation.isPending ? "Sending..." : "Send Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}