import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertTriangle, Camera, BarChart3, CheckCircle2, Clock, Target } from "lucide-react";
import { format, subMonths, differenceInMinutes, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Job, ChecklistItem, Photo } from "@shared/schema";
import { getTagConfig } from "@shared/photoTags";

const STATUS_COLORS = {
  pending: "#FFC107",
  "in-progress": "#2E5BBA",
  review: "#FD7E14",
  completed: "#28A745",
};

export default function Analytics() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: checklistItems = [], isLoading: itemsLoading } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const isLoading = jobsLoading || itemsLoading || photosLoading;

  const totalInspections = jobs.length;
  const completedJobs = jobs.filter(j => j.status === "completed" && j.completedDate && j.scheduledDate);
  
  const avgInspectionTime = completedJobs.length > 0
    ? completedJobs.reduce((sum, job) => {
        const start = new Date(job.scheduledDate!);
        const end = new Date(job.completedDate!);
        return sum + differenceInMinutes(end, start);
      }, 0) / completedJobs.length
    : 0;

  const completionRate = totalInspections > 0
    ? (jobs.filter(j => j.status === "completed").length / totalInspections * 100)
    : 0;

  const avgItemsPerInspection = totalInspections > 0
    ? (checklistItems.length / totalInspections)
    : 0;

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return format(date, 'MMM yyyy');
  });

  const monthlyInspectionData = last6Months.map(month => {
    const count = jobs.filter(j => {
      if (!j.completedDate) return false;
      const jobMonth = format(new Date(j.completedDate), 'MMM yyyy');
      return jobMonth === month;
    }).length;
    return { month, inspections: count };
  });

  const completedJobIds = jobs.filter(j => j.status === 'completed').map(j => j.id);
  const failedItems = checklistItems.filter(item => 
    !item.completed && completedJobIds.includes(item.jobId)
  );
  const issueFrequency = failedItems.reduce((acc, item) => {
    const key = item.title;
    if (!acc[key]) {
      acc[key] = {
        count: 0,
        photoRequired: item.photoRequired || false,
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { count: number; photoRequired: boolean }>);

  const completedInspections = jobs.filter(j => j.status === 'completed').length;
  const commonIssues = Object.entries(issueFrequency)
    .map(([name, data]) => ({
      name,
      frequency: data.count,
      percentage: completedInspections > 0 ? ((data.count / completedInspections) * 100).toFixed(1) : '0.0',
      severity: data.count > 10 ? 'Critical' : data.count > 5 ? 'Major' : 'Minor',
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  const tagCounts = photos.reduce((acc, photo) => {
    (photo.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const photoTagData = Object.entries(tagCounts)
    .map(([tag, count]) => {
      const config = getTagConfig(tag);
      return {
        tag: config?.label || tag,
        count,
        category: config?.category || 'other',
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const statusBreakdownData = last6Months.map(month => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - last6Months.indexOf(month)));
    const jobsInMonth = jobs.filter(j => {
      if (!j.scheduledDate) return false;
      const jobMonth = format(new Date(j.scheduledDate), 'MMM yyyy');
      return jobMonth === month;
    });

    return {
      month,
      Pending: jobsInMonth.filter(j => j.status === 'pending').length,
      'In Progress': jobsInMonth.filter(j => j.status === 'in-progress').length,
      Review: jobsInMonth.filter(j => j.status === 'review').length,
      Completed: jobsInMonth.filter(j => j.status === 'completed').length,
    };
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-600 text-white';
      case 'Major':
        return 'bg-orange-500 text-white';
      case 'Minor':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'inspection':
        return '#2E5BBA';
      case 'status':
        return '#28A745';
      case 'priority':
        return '#DC3545';
      case 'location':
        return '#9333EA';
      default:
        return '#6C757D';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <main className="pt-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Analytics</h1>
            <p className="text-muted-foreground">Deep insights into inspection trends and common issues</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-testid="card-inspection-metrics">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Inspections</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-total-inspections">{totalInspections}</p>
                    )}
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <div className="p-3 rounded-md bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Inspection Time</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-avg-inspection-time">
                        {avgInspectionTime > 0 ? `${Math.round(avgInspectionTime)}m` : 'N/A'}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Minutes per job</p>
                  </div>
                  <div className="p-3 rounded-md bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-completion-rate">
                        {completionRate.toFixed(1)}%
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Jobs completed</p>
                  </div>
                  <div className="p-3 rounded-md bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Items/Inspection</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-avg-items">
                        {avgItemsPerInspection.toFixed(1)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Checklist items</p>
                  </div>
                  <div className="p-3 rounded-md bg-orange-500/10">
                    <Target className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Inspection Volume Trend
                </CardTitle>
                <CardDescription>Completed inspections over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300} data-testid="chart-inspection-volume">
                    <LineChart data={monthlyInspectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="inspections"
                        stroke="#2E5BBA"
                        strokeWidth={2}
                        name="Inspections"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photo Tag Analysis
                </CardTitle>
                <CardDescription>Most common tags used in photo documentation</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300} data-testid="chart-photo-tags">
                    <BarChart data={photoTagData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tag" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Usage Count"
                        fill="#2E5BBA"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inspection Status Breakdown
              </CardTitle>
              <CardDescription>Status distribution over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300} data-testid="chart-status-breakdown">
                  <AreaChart data={statusBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Pending"
                      stackId="1"
                      stroke={STATUS_COLORS.pending}
                      fill={STATUS_COLORS.pending}
                    />
                    <Area
                      type="monotone"
                      dataKey="In Progress"
                      stackId="1"
                      stroke={STATUS_COLORS["in-progress"]}
                      fill={STATUS_COLORS["in-progress"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="Review"
                      stackId="1"
                      stroke={STATUS_COLORS.review}
                      fill={STATUS_COLORS.review}
                    />
                    <Area
                      type="monotone"
                      dataKey="Completed"
                      stackId="1"
                      stroke={STATUS_COLORS.completed}
                      fill={STATUS_COLORS.completed}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Common Issues
              </CardTitle>
              <CardDescription>Top 10 most frequently failed items from completed inspections</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : commonIssues.length > 0 ? (
                <Table data-testid="table-common-issues">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Issue Description</TableHead>
                      <TableHead className="text-center">Frequency</TableHead>
                      <TableHead className="text-center">% of Inspections</TableHead>
                      <TableHead className="text-right">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commonIssues.map((issue, index) => (
                      <TableRow key={issue.name}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{issue.name}</TableCell>
                        <TableCell className="text-center font-semibold">{issue.frequency}</TableCell>
                        <TableCell className="text-center">{issue.percentage}%</TableCell>
                        <TableCell className="text-right">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-no-issues">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No failed items found</p>
                  <p className="text-sm mt-2">All completed inspections are passing!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
