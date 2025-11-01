import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  Activity
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { BackgroundJob, BackgroundJobExecution } from "@shared/schema";

export default function BackgroundJobs() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  // Fetch all background jobs
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<BackgroundJob[]>({
    queryKey: ["/api/admin/background-jobs"],
  });

  // Fetch execution history for selected job
  const { data: executions = [], isLoading: executionsLoading } = useQuery<BackgroundJobExecution[]>({
    queryKey: [`/api/admin/background-jobs/${selectedJob}/executions`],
    enabled: !!selectedJob,
  });

  // Fetch recent executions across all jobs
  const { data: recentExecutions = [], isLoading: recentLoading } = useQuery<BackgroundJobExecution[]>({
    queryKey: ["/api/admin/background-jobs/executions/recent"],
  });

  // Get health status color
  const getHealthStatus = (job: BackgroundJob): { color: string; label: string; icon: any } => {
    if (!job.lastRunAt) {
      return { color: "text-muted-foreground", label: "Not Run", icon: AlertCircle };
    }

    const failureRate = job.failureCount / (job.successCount + job.failureCount);
    
    if (job.lastStatus === 'failed') {
      return { color: "text-destructive", label: "Failed", icon: XCircle };
    } else if (failureRate > 0.2) {
      return { color: "text-yellow-600 dark:text-yellow-500", label: "Degraded", icon: AlertCircle };
    } else {
      return { color: "text-green-600 dark:text-green-500", label: "Healthy", icon: CheckCircle2 };
    }
  };

  // Format duration in milliseconds to human readable
  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (jobsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading background jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Background Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage scheduled background jobs
          </p>
        </div>
        <Button 
          onClick={() => refetchJobs()} 
          variant="outline"
          data-testid="button-refresh"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-jobs">{jobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {jobs.filter(j => j.enabled).length} enabled
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Jobs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500" data-testid="text-healthy-count">
              {jobs.filter(j => getHealthStatus(j).label === "Healthy").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Running smoothly
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-failed-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-failed-count">
              {jobs.filter(j => getHealthStatus(j).label === "Failed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-executions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-execution-count">
              {jobs.reduce((sum, j) => sum + j.successCount + j.failureCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Recent History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {jobs.map((job) => {
              const health = getHealthStatus(job);
              const HealthIcon = health.icon;
              
              return (
                <Card 
                  key={job.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedJob(job.jobName)}
                  data-testid={`card-job-${job.jobName}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg" data-testid={`text-job-name-${job.jobName}`}>
                            {job.displayName}
                          </CardTitle>
                          <Badge 
                            variant={job.enabled ? "default" : "secondary"}
                            data-testid={`badge-enabled-${job.jobName}`}
                          >
                            {job.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <CardDescription>{job.description}</CardDescription>
                      </div>
                      <div className={`flex items-center gap-2 ${health.color}`}>
                        <HealthIcon className="w-5 h-5" />
                        <span className="text-sm font-medium" data-testid={`text-health-${job.jobName}`}>
                          {health.label}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Schedule</div>
                        <div className="font-medium flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {job.schedule || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Run</div>
                        <div className="font-medium mt-1" data-testid={`text-last-run-${job.jobName}`}>
                          {job.lastRunAt 
                            ? formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true })
                            : "Never"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="font-medium mt-1" data-testid={`text-success-rate-${job.jobName}`}>
                          {job.successCount + job.failureCount > 0
                            ? `${Math.round((job.successCount / (job.successCount + job.failureCount)) * 100)}%`
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Duration</div>
                        <div className="font-medium mt-1" data-testid={`text-avg-duration-${job.jobName}`}>
                          {formatDuration(job.averageDuration)}
                        </div>
                      </div>
                    </div>

                    {job.lastError && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                        <div className="text-sm font-medium text-destructive mb-1">Last Error:</div>
                        <div className="text-xs text-muted-foreground font-mono" data-testid={`text-error-${job.jobName}`}>
                          {job.lastError}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedJob && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Execution History: {jobs.find(j => j.jobName === selectedJob)?.displayName}</CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedJob(null)}
                    data-testid="button-close-history"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {executionsLoading ? (
                    <div className="text-center text-muted-foreground py-8">Loading executions...</div>
                  ) : executions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No execution history</div>
                  ) : (
                    <div className="space-y-2">
                      {executions.map((execution) => (
                        <div 
                          key={execution.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                          data-testid={`execution-${execution.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {execution.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                            ) : execution.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {format(new Date(execution.startedAt), "PPpp")}
                              </div>
                              {execution.error && (
                                <div className="text-xs text-destructive mt-1">{execution.error}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDuration(execution.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions (All Jobs)</CardTitle>
              <CardDescription>Last 100 job executions across all background jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {recentLoading ? (
                  <div className="text-center text-muted-foreground py-8">Loading recent executions...</div>
                ) : recentExecutions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No recent executions</div>
                ) : (
                  <div className="space-y-2">
                    {recentExecutions.map((execution) => {
                      const job = jobs.find(j => j.jobName === execution.jobName);
                      return (
                        <div 
                          key={execution.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                          data-testid={`recent-execution-${execution.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {execution.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                            ) : execution.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {job?.displayName || execution.jobName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(execution.startedAt), "PPpp")}
                              </div>
                              {execution.error && (
                                <div className="text-xs text-destructive mt-1">{execution.error}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDuration(execution.duration)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
