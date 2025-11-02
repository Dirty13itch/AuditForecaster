import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  AlertCircle,
  UserPlus,
  Mail,
  RefreshCw,
  X
} from "lucide-react";
import { TravelTimeCard } from "@/components/TravelTimeCard";
import { useState } from "react";
import { useLocation } from "wouter";

interface KPIData {
  utilization: {
    rate: number;
    totalHours: number;
    billableHours: number;
  };
  firstPassRate: {
    rate: number;
    passed: number;
    failed: number;
  };
  revenueVsTarget: {
    actual: number;
    target: number;
    percentOfTarget: number;
  };
}

interface WorkloadData {
  byInspector: Array<{
    inspectorId: string;
    inspectorName: string;
    jobCounts: {
      scheduled: number;
      done: number;
      failed: number;
      total: number;
    };
  }>;
  byDay: Array<{
    date: string;
    jobCounts: {
      total: number;
      byInspector: Array<{
        inspectorId: string;
        inspectorName: string;
        count: number;
      }>;
    };
  }>;
}

interface Job {
  id: string;
  name: string;
  address: string;
  inspectionType: string;
  scheduledDate: string;
  completedDate: string;
  status: string;
}

interface PendingActionsData {
  unassignedJobs: Job[];
  overdueReports: Job[];
  failedTests: Job[];
}

interface AlertData {
  type: 'warning' | 'error';
  message: string;
  actionUrl?: string;
}

interface AdminDashboardData {
  kpis: KPIData;
  workload: WorkloadData;
  pendingActions: PendingActionsData;
  alerts: AlertData[];
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Fetch dashboard data with auto-refresh every 5 minutes
  const { data, isLoading, error, refetch } = useQuery<AdminDashboardData>({
    queryKey: ['/api/dashboard/admin-summary'],
    refetchInterval: 5 * 60 * 1000,
  });

  // Helper function to get color class for utilization
  const getUtilizationColor = (rate: number): string => {
    if (rate > 70) return 'text-green-600 dark:text-green-400';
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Helper function to get color class for first pass rate
  const getFirstPassColor = (rate: number): string => {
    if (rate > 85) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Helper function to get color class for revenue
  const getRevenueColor = (percent: number): string => {
    if (percent >= 100) return 'text-green-600 dark:text-green-400';
    if (percent >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Helper function to get heatmap cell color based on job count
  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
    if (count <= 2) return 'bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
    if (count <= 4) return 'bg-blue-400 dark:bg-blue-700 text-white';
    return 'bg-blue-600 dark:bg-blue-500 text-white';
  };

  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Helper function to get day name from date
  const getDayName = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Helper function to calculate days overdue
  const getDaysOverdue = (completedDate: string): number => {
    const completed = new Date(completedDate);
    const now = new Date();
    const diff = now.getTime() - completed.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-semibold">Failed to load dashboard</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button onClick={() => refetch()} data-testid="button-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const visibleAlerts = data.alerts
    .map((alert, originalIndex) => ({ alert, originalIndex }))
    .filter(({ originalIndex }) => !dismissedAlerts.includes(originalIndex));

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-dashboard">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts Panel */}
      {visibleAlerts.length > 0 && (
        <div className="mb-6 space-y-2" data-testid="panel-alerts">
          {visibleAlerts.map(({ alert, originalIndex }) => (
            <Alert 
              key={originalIndex} 
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              data-testid={`alert-${originalIndex}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>{alert.message}</AlertDescription>
                    {alert.actionUrl && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto" 
                        onClick={() => navigate(alert.actionUrl!)}
                        data-testid={`link-alert-details-${originalIndex}`}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setDismissedAlerts([...dismissedAlerts, originalIndex])}
                  data-testid={`button-dismiss-alert-${originalIndex}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" data-testid="section-admin-kpis">
        {/* Utilization Card */}
        <Card data-testid="card-kpi-utilization">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team Utilization</span>
              {data.kpis.utilization.rate > 70 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold mb-2 ${getUtilizationColor(data.kpis.utilization.rate)}`}>
              {data.kpis.utilization.rate.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {data.kpis.utilization.billableHours.toFixed(0)}h / {data.kpis.utilization.totalHours}h
            </p>
          </CardContent>
        </Card>

        {/* First Pass Rate Card */}
        <Card data-testid="card-kpi-first-pass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>First Pass Rate</span>
              {data.kpis.firstPassRate.rate > 85 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold mb-2 ${getFirstPassColor(data.kpis.firstPassRate.rate)}`}>
              {data.kpis.firstPassRate.rate.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {data.kpis.firstPassRate.passed} passed / {data.kpis.firstPassRate.failed} failed
            </p>
          </CardContent>
        </Card>

        {/* Revenue vs Target Card */}
        <Card data-testid="card-kpi-revenue">
          <CardHeader>
            <CardTitle>Revenue vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold mb-2 ${getRevenueColor(data.kpis.revenueVsTarget.percentOfTarget)}`}>
              ${data.kpis.revenueVsTarget.actual.toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              ${data.kpis.revenueVsTarget.target.toFixed(0)} target
            </p>
            <Progress value={Math.min(data.kpis.revenueVsTarget.percentOfTarget, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {data.kpis.revenueVsTarget.percentOfTarget.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Workload Heatmap */}
      <Card className="mb-8" data-testid="section-workload">
        <CardHeader>
          <CardTitle>Team Workload</CardTitle>
          <p className="text-sm text-muted-foreground">
            Job distribution across inspectors and days
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TooltipProvider>
              <div className="min-w-max">
                {/* Header row with dates */}
                <div className="flex mb-2">
                  <div className="w-40 font-semibold text-sm">Inspector</div>
                  {data.workload.byDay.map((day) => (
                    <div key={day.date} className="w-24 text-center font-semibold text-sm">
                      <div>{getDayName(day.date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(day.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inspector rows */}
                {data.workload.byInspector.map((inspector) => (
                  <div key={inspector.inspectorId} className="flex mb-1">
                    <div className="w-40 text-sm flex items-center">
                      {inspector.inspectorName}
                    </div>
                    {data.workload.byDay.map((day) => {
                      const inspectorData = day.jobCounts.byInspector.find(
                        (i) => i.inspectorId === inspector.inspectorId
                      );
                      const count = inspectorData?.count || 0;

                      return (
                        <Tooltip key={`${inspector.inspectorId}-${day.date}`}>
                          <TooltipTrigger asChild>
                            <button
                              className={`w-24 h-12 rounded border flex items-center justify-center text-sm font-semibold transition-colors hover-elevate ${getHeatmapColor(count)}`}
                              onClick={() => {
                                if (count > 0) {
                                  setSelectedInspector(inspector.inspectorId);
                                  setSelectedDate(new Date(day.date));
                                }
                              }}
                              data-testid={`cell-workload-${inspector.inspectorId}-${day.date}`}
                            >
                              {count > 0 ? count : '-'}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{inspector.inspectorName} - {getDayName(day.date)}: {count} jobs</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Travel Time Analysis for Selected Inspector */}
          {selectedInspector && selectedDate && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Travel Analysis for {data.workload.byInspector.find(i => i.inspectorId === selectedInspector)?.inspectorName}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedInspector(null);
                    setSelectedDate(null);
                  }}
                  data-testid="button-clear-travel-selection"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <TravelTimeCard date={selectedDate} inspectorId={selectedInspector} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Actions */}
      <Card data-testid="section-pending-actions">
        <CardHeader>
          <CardTitle>Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unassigned">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unassigned" data-testid="tab-unassigned" className="gap-2">
                Unassigned Jobs
                {data.pendingActions.unassignedJobs.length > 0 && (
                  <Badge variant="secondary">{data.pendingActions.unassignedJobs.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue-reports" className="gap-2">
                Overdue Reports
                {data.pendingActions.overdueReports.length > 0 && (
                  <Badge variant="secondary">{data.pendingActions.overdueReports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed" data-testid="tab-failed-tests" className="gap-2">
                Failed Tests
                {data.pendingActions.failedTests.length > 0 && (
                  <Badge variant="secondary">{data.pendingActions.failedTests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Unassigned Jobs Table */}
            <TabsContent value="unassigned">
              {data.pendingActions.unassignedJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-semibold">All jobs assigned</p>
                  <p className="text-sm text-muted-foreground">No unassigned jobs at the moment</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pendingActions.unassignedJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.inspectionType}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(job.scheduledDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              data-testid={`button-assign-job-${job.id}`}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Overdue Reports Table */}
            <TabsContent value="overdue">
              {data.pendingActions.overdueReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-semibold">No overdue reports</p>
                  <p className="text-sm text-muted-foreground">All reports are up to date</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pendingActions.overdueReports.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.inspectionType}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(job.completedDate)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {getDaysOverdue(job.completedDate)} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              data-testid={`button-remind-${job.id}`}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Reminder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Failed Tests Table */}
            <TabsContent value="failed">
              {data.pendingActions.failedTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-semibold">No failed tests</p>
                  <p className="text-sm text-muted-foreground">All tests passed successfully</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Failed Date</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pendingActions.failedTests.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.inspectionType}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(job.scheduledDate)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Failed</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/jobs?retest=${job.id}`)}
                              data-testid={`button-retest-${job.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Create Retest
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
