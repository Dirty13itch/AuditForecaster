import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Briefcase,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Calendar,
  Plus,
  ClipboardList,
  Route,
  FileText,
  AlertTriangle,
  Clock,
  Building2,
  RefreshCw,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth, format, startOfMonth, endOfMonth } from "date-fns";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import JobDialog from "@/components/JobDialog";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Job, Builder, ScheduleEvent, Expense, MileageLog, ReportInstance, Forecast, InsertJob } from "@shared/schema";
import { safeToFixed, safeParseFloat, safeDivide } from "@shared/numberUtils";

const STANDARD_MILEAGE_RATE = 0.67;

const STATUS_COLORS = {
  pending: "#FFC107",
  "in-progress": "#2E5BBA",
  review: "#FD7E14",
  completed: "#28A745",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("dashboard");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const { data: scheduleEvents = [], isLoading: eventsLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ["/api/schedule-events"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return fetch(`/api/schedule-events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`).then(r => r.json());
    },
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: mileageLogs = [], isLoading: mileageLoading } = useQuery<MileageLog[]>({
    queryKey: ["/api/mileage-logs"],
  });

  const { data: reportInstances = [], isLoading: reportsLoading } = useQuery<ReportInstance[]>({
    queryKey: ["/api/report-instances"],
    queryFn: async () => {
      const allReports: ReportInstance[] = [];
      for (const job of jobs) {
        const reports = await fetch(`/api/report-instances?jobId=${job.id}`).then(r => r.json());
        allReports.push(...reports);
      }
      return allReports;
    },
    enabled: jobs.length > 0,
  });

  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: InsertJob) => apiRequest("/api/jobs", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setIsJobDialogOpen(false);
      toast({
        title: "Success",
        description: "Job created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries();
    toast({
      title: "Refreshed",
      description: "All data has been refreshed",
    });
  };

  const isLoading = jobsLoading || buildersLoading || eventsLoading || expensesLoading || mileageLoading || forecastsLoading;

  const activeJobs = jobs.filter(j => j.status !== "completed");
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthEnd = endOfMonth(new Date());
  
  const thisMonthInspections = jobs.filter(j => {
    if (!j.completedDate) return false;
    const completedDate = new Date(j.completedDate);
    return completedDate >= thisMonthStart && completedDate <= thisMonthEnd;
  });

  const thisMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= thisMonthStart && expenseDate <= thisMonthEnd && e.isWorkRelated;
  });

  const thisMonthMileage = mileageLogs.filter(m => {
    const logDate = new Date(m.date);
    return logDate >= thisMonthStart && logDate <= thisMonthEnd && m.isWorkRelated;
  });

  const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + safeParseFloat(e.amount.toString()), 0);
  const totalMileageDeduction = thisMonthMileage.reduce((sum, m) => sum + (safeParseFloat(m.distance.toString()) * STANDARD_MILEAGE_RATE), 0);
  const thisMonthFinancials = totalExpenses + totalMileageDeduction;

  const jobsWithForecasts = forecasts.filter(f => f.actualTDL && f.predictedTDL).slice(-10);
  const forecastAccuracy = jobsWithForecasts.length > 0
    ? safeDivide(jobsWithForecasts.reduce((sum, f) => {
        const actual = safeParseFloat(f.actualTDL?.toString() || "0");
        const predicted = safeParseFloat(f.predictedTDL?.toString() || "0");
        const variance = safeDivide(Math.abs(actual - predicted), predicted) * 100;
        return sum + (100 - variance);
      }, 0), jobsWithForecasts.length)
    : 0;

  const todayEvents = scheduleEvents.filter(e => isToday(new Date(e.startTime)));
  const upcomingEvents = todayEvents.length > 0 
    ? todayEvents 
    : scheduleEvents.filter(e => isThisWeek(new Date(e.startTime)) && new Date(e.startTime) > new Date()).slice(0, 5);

  const jobsMap = new Map(jobs.map(j => [j.id, j]));

  const statusCounts = jobs.reduce((acc, job) => {
    const status = job.status === "in-progress" ? "In Progress" : 
                   job.status === "pending" ? "Pending" :
                   job.status === "review" ? "Review" : "Completed";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: "Pending", value: statusCounts["Pending"] || 0, color: STATUS_COLORS.pending },
    { name: "In Progress", value: statusCounts["In Progress"] || 0, color: STATUS_COLORS["in-progress"] },
    { name: "Review", value: statusCounts["Review"] || 0, color: STATUS_COLORS.review },
    { name: "Completed", value: statusCounts["Completed"] || 0, color: STATUS_COLORS.completed },
  ];

  const scheduledJobIds = new Set(scheduleEvents.map(e => e.jobId));
  const unscheduledJobs = jobs.filter(j => !scheduledJobIds.has(j.id) && j.status !== "completed");

  const recentActivities = [
    ...jobs.slice(-3).map(j => ({ type: "job", item: j, date: new Date() })),
    ...reportInstances.slice(-3).map(r => ({ type: "report", item: r, date: r.createdAt ? new Date(r.createdAt) : new Date() })),
    ...thisMonthExpenses.slice(-2).map(e => ({ type: "expense", item: e, date: new Date(e.date) })),
    ...scheduleEvents.slice(-2).map(e => ({ type: "schedule", item: e, date: new Date(e.startTime) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  const miHomesBuilders = builders.filter(b => b.companyName === "M/I Homes");
  const builderStats = miHomesBuilders.map(builder => {
    const builderJobs = jobs.filter(j => j.builderId === builder.id);
    const builderForecasts = builderJobs
      .map(j => forecasts.find(f => f.jobId === j.id))
      .filter(f => f && f.actualTDL && f.predictedTDL);
    
    const avgAccuracy = builderForecasts.length > 0
      ? safeDivide(builderForecasts.reduce((sum, f) => {
          const actual = safeParseFloat(f!.actualTDL?.toString() || "0");
          const predicted = safeParseFloat(f!.predictedTDL?.toString() || "0");
          const variance = safeDivide(Math.abs(actual - predicted), predicted) * 100;
          return sum + (100 - variance);
        }, 0), builderForecasts.length)
      : 0;

    return {
      builder,
      jobCount: builderJobs.length,
      avgAccuracy,
    };
  }).sort((a, b) => b.avgAccuracy - a.avgAccuracy);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Energy Audit Pro"
        isOnline={true}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <OfflineBanner />
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h2>
              <p className="text-muted-foreground text-sm">Comprehensive overview of your business</p>
            </div>
            <Button onClick={handleRefreshAll} variant="outline" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Row 1: Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-metric-active-jobs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Active Jobs</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-active-jobs">{activeJobs.length}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-success">
                      <TrendingUp className="h-3 w-3" />
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-primary/10">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-inspections">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">This Month's Inspections</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-month-inspections">{thisMonthInspections.length}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Completed</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-financials">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">This Month Financials</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-month-financials">${safeToFixed(thisMonthFinancials, 2)}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Expenses + Mileage</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-info/10">
                    <DollarSign className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-forecast-accuracy">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Forecast Accuracy</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-forecast-accuracy">{safeToFixed(forecastAccuracy, 1)}%</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Last 10 jobs</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-warning/10">
                    <TrendingUp className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Today's Schedule & Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-todays-schedule">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {todayEvents.length > 0 ? "Today's Schedule" : "Upcoming This Week"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => {
                      const job = jobsMap.get(event.jobId);
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-md border hover-elevate" data-testid={`event-${event.id}`}>
                          <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{job?.name || event.title}</p>
                              <Badge variant="outline" className="text-xs">{job?.status || "scheduled"}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.startTime), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <Button 
                      variant="outline" 
                      className="w-full mt-4" 
                      onClick={() => setLocation("/schedule")}
                      data-testid="button-view-calendar"
                    >
                      View Full Calendar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming events scheduled</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => setLocation("/schedule")}
                      data-testid="button-add-schedule"
                    >
                      Schedule Events
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="h-24 flex-col gap-2" 
                    onClick={() => setIsJobDialogOpen(true)}
                    data-testid="button-action-new-job"
                  >
                    <Plus className="h-6 w-6" />
                    <span>Add New Job</span>
                  </Button>
                  <Button 
                    className="h-24 flex-col gap-2" 
                    variant="outline"
                    onClick={() => setLocation("/jobs")}
                    data-testid="button-action-start-inspection"
                  >
                    <ClipboardList className="h-6 w-6" />
                    <span>Start Inspection</span>
                  </Button>
                  <Button 
                    className="h-24 flex-col gap-2" 
                    variant="outline"
                    onClick={() => setLocation("/financials")}
                    data-testid="button-action-log-mileage"
                  >
                    <Route className="h-6 w-6" />
                    <span>Log Mileage</span>
                  </Button>
                  <Button 
                    className="h-24 flex-col gap-2" 
                    variant="outline"
                    onClick={() => setLocation("/reports")}
                    data-testid="button-action-generate-report"
                  >
                    <FileText className="h-6 w-6" />
                    <span>Generate Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Activity Feed, Jobs Overview, Unscheduled Jobs */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3" data-testid={`activity-${idx}`}>
                        <div className="p-2 rounded-md bg-muted">
                          {activity.type === "job" && <Briefcase className="h-4 w-4" />}
                          {activity.type === "report" && <FileText className="h-4 w-4" />}
                          {activity.type === "expense" && <DollarSign className="h-4 w-4" />}
                          {activity.type === "schedule" && <Calendar className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {activity.type === "job" && `New job: ${(activity.item as Job).name}`}
                            {activity.type === "report" && "Report generated"}
                            {activity.type === "expense" && `Expense logged: $${(activity.item as Expense).amount}`}
                            {activity.type === "schedule" && `Event scheduled: ${(activity.item as ScheduleEvent).title}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activity.date, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-jobs-overview">
              <CardHeader>
                <CardTitle>Jobs Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                      {chartData.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setLocation("/jobs")}
                          className="flex items-center gap-2 p-2 rounded-md hover-elevate active-elevate-2 text-left"
                          data-testid={`stat-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{item.name}</p>
                            <p className="font-semibold">{item.value}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-unscheduled-jobs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${unscheduledJobs.length > 5 ? 'text-warning' : ''}`} />
                  Unscheduled Jobs
                  {unscheduledJobs.length > 5 && (
                    <Badge variant="destructive" className="ml-auto">{unscheduledJobs.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : unscheduledJobs.length > 0 ? (
                  <div className="space-y-3">
                    {unscheduledJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="p-3 rounded-md border" data-testid={`unscheduled-job-${job.id}`}>
                        <p className="font-medium text-sm">{job.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{job.address}</p>
                      </div>
                    ))}
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => setLocation("/schedule")}
                      data-testid="button-schedule-now"
                    >
                      Schedule Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>All jobs are scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 4: M/I Homes Builder Performance */}
          {miHomesBuilders.length > 0 && (
            <Card data-testid="card-builder-performance">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      M/I Homes Builder Performance
                    </CardTitle>
                    <CardDescription>Top performing builders by forecast accuracy</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/builders")}
                    data-testid="button-view-builders"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {builderStats.map((stat, idx) => (
                      <div 
                        key={stat.builder.id} 
                        className="flex items-center gap-4 p-4 rounded-md border hover-elevate"
                        data-testid={`builder-stat-${stat.builder.id}`}
                      >
                        {idx === 0 && (
                          <Trophy className="h-6 w-6 text-warning" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{stat.builder.name}</p>
                            {idx === 0 && <Badge className="bg-warning">Top Performer</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{stat.builder.companyName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{stat.jobCount} jobs</p>
                          <p className="text-sm text-muted-foreground">
                            {safeToFixed(stat.avgAccuracy, 1)}% accuracy
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <JobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        builders={builders}
        onSave={async (data) => { await createJobMutation.mutateAsync(data); }}
        isPending={createJobMutation.isPending}
      />
    </div>
  );
}
