import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp, AlertTriangle, Camera, BarChart3, CheckCircle2, Clock, Target, Building2, TrendingDown, Minus, Trophy, ArrowUpDown, ArrowRight } from "lucide-react";
import { format, subMonths, differenceInMinutes, startOfMonth, isThisMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Job, ChecklistItem, Photo, Builder, Forecast } from "@shared/schema";
import { getTagConfig } from "@shared/photoTags";

const STATUS_COLORS = {
  pending: "#FFC107",
  "in-progress": "#2E5BBA",
  review: "#FD7E14",
  completed: "#28A745",
};

export default function Analytics() {
  const [, setLocation] = useLocation();
  const [sortColumn, setSortColumn] = useState<string>('completionRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: checklistItems = [], isLoading: itemsLoading } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
  });

  const isLoading = jobsLoading || itemsLoading || photosLoading || buildersLoading || forecastsLoading;

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

  // Builder Performance Metrics Calculation
  const builderStats = builders.map(builder => {
    const builderJobs = jobs.filter(j => j.builderId === builder.id);
    const completedBuilderJobs = builderJobs.filter(j => j.status === 'completed');
    
    const completionRate = builderJobs.length > 0
      ? (completedBuilderJobs.length / builderJobs.length * 100)
      : 0;
    
    const avgTime = completedBuilderJobs.filter(j => j.completedDate && j.scheduledDate).length > 0
      ? completedBuilderJobs
          .filter(j => j.completedDate && j.scheduledDate)
          .reduce((sum, job) => {
            const start = new Date(job.scheduledDate!);
            const end = new Date(job.completedDate!);
            return sum + differenceInMinutes(end, start);
          }, 0) / completedBuilderJobs.filter(j => j.completedDate && j.scheduledDate).length
      : 0;
    
    const builderForecasts = completedBuilderJobs
      .map(j => forecasts.find(f => f.jobId === j.id))
      .filter(f => f && f.actualTDL && f.predictedTDL);
    
    const avgAccuracy = builderForecasts.length > 0
      ? builderForecasts.reduce((sum, f) => {
          const actual = parseFloat(f!.actualTDL?.toString() || "0");
          const predicted = parseFloat(f!.predictedTDL?.toString() || "0");
          const variance = Math.abs(actual - predicted) / predicted * 100;
          return sum + (100 - variance);
        }, 0) / builderForecasts.length
      : 0;
    
    const builderChecklistItems = builderJobs.flatMap(job => 
      checklistItems.filter(item => item.jobId === job.id)
    );
    const failedItems = builderChecklistItems.filter(item => 
      !item.completed && completedBuilderJobs.find(j => j.id === item.jobId)
    );
    
    const thisMonthJobs = builderJobs.filter(j => {
      if (!j.scheduledDate) return false;
      return isThisMonth(new Date(j.scheduledDate));
    });
    
    return {
      builder,
      totalJobs: builderJobs.length,
      completedJobs: completedBuilderJobs.length,
      completionRate,
      avgAccuracy,
      avgInspectionTime: avgTime,
      commonIssuesCount: failedItems.length,
      jobsThisMonth: thisMonthJobs.length,
    };
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedBuilders = [...builderStats].sort((a, b) => {
    let aVal, bVal;
    
    // Handle nested property access
    if (sortColumn === 'builder.name') {
      aVal = a.builder.name;
      bVal = b.builder.name;
    } else {
      aVal = a[sortColumn as keyof typeof a];
      bVal = b[sortColumn as keyof typeof b];
    }
    
    // Handle string vs numeric comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const topPerformerIndex = sortedBuilders.length > 0 
    ? builderStats.findIndex(b => b.builder.id === sortedBuilders[0].builder.id)
    : -1;

  const getPerformanceTier = (completionRate: number, accuracy: number) => {
    const avgScore = (completionRate + accuracy) / 2;
    if (avgScore >= 85) return { label: 'Excellent', color: 'bg-green-600 text-white' };
    if (avgScore >= 70) return { label: 'Good', color: 'bg-blue-500 text-white' };
    return { label: 'Needs Improvement', color: 'bg-orange-500 text-white' };
  };

  const getTrendIcon = (stat: typeof builderStats[0], allJobs: Job[]) => {
    if (stat.totalJobs === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    // Get jobs for this builder in the last 6 months (excluding current month)
    const last6MonthsJobs = allJobs.filter(j => {
      if (j.builderId !== stat.builder.id) return false;
      const jobDate = new Date(j.createdAt || j.scheduledDate || Date.now());
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return jobDate >= sixMonthsAgo && jobDate < thisMonthStart;
    });
    
    // Guard: Need minimum data for reliable trends
    if (last6MonthsJobs.length < 3) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    // Calculate trend based on actual months with activity
    // Guards against false positives for low-volume builders
    const monthsWithJobs = new Set(
      last6MonthsJobs.map(j => {
        const date = new Date(j.createdAt || j.scheduledDate || Date.now());
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    ).size;
    
    const avgJobsPerActiveMonth = last6MonthsJobs.length / monthsWithJobs;
    
    // Compare current month to average (20% threshold)
    if (stat.jobsThisMonth > avgJobsPerActiveMonth * 1.2) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (stat.jobsThisMonth < avgJobsPerActiveMonth * 0.8) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const builderComparisonData = builderStats
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5)
    .map(stat => ({
      name: stat.builder.name,
      'Completion Rate': parseFloat(stat.completionRate.toFixed(1)),
      'Forecast Accuracy': parseFloat(stat.avgAccuracy.toFixed(1)),
    }));

  const builderTrendData = last6Months.map(month => {
    const monthData: any = { month };
    builderStats
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 5)
      .forEach(stat => {
        const jobsInMonth = jobs.filter(j => {
          if (!j.completedDate || j.builderId !== stat.builder.id) return false;
          const jobMonth = format(new Date(j.completedDate), 'MMM yyyy');
          return jobMonth === month;
        }).length;
        monthData[stat.builder.name] = jobsInMonth;
      });
    return monthData;
  });

  const topBuilders = builderStats
    .sort((a, b) => b.totalJobs - a.totalJobs)
    .slice(0, 5);

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

          {/* Builder Performance Comparison */}
          <Card data-testid="card-builder-performance">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Builder Performance Comparison
                  </CardTitle>
                  <CardDescription>Compare builders across key metrics</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setLocation("/builders")} data-testid="button-view-builders">
                  View All Builders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : builderStats.length > 0 ? (
                <div className="space-y-8">
                  {/* Builder Stats Table */}
                  <div className="overflow-x-auto">
                    <Table data-testid="table-builder-stats">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('builder.name')}
                              data-testid="button-sort-name"
                              className="hover-elevate -ml-3"
                            >
                              Builder Name
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('totalJobs')}
                              data-testid="button-sort-totalJobs"
                              className="hover-elevate"
                            >
                              Total Jobs
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('completedJobs')}
                              data-testid="button-sort-completedJobs"
                              className="hover-elevate"
                            >
                              Completed
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('completionRate')}
                              data-testid="button-sort-completionRate"
                              className="hover-elevate"
                            >
                              Completion Rate
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('avgAccuracy')}
                              data-testid="button-sort-avgAccuracy"
                              className="hover-elevate"
                            >
                              Forecast Accuracy
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('avgInspectionTime')}
                              data-testid="button-sort-avgInspectionTime"
                              className="hover-elevate"
                            >
                              Avg Time (min)
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('commonIssuesCount')}
                              data-testid="button-sort-commonIssuesCount"
                              className="hover-elevate"
                            >
                              Issues
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSort('jobsThisMonth')}
                              data-testid="button-sort-jobsThisMonth"
                              className="hover-elevate"
                            >
                              This Month
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">Trend</TableHead>
                          <TableHead className="text-right">Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBuilders.map((stat, index) => {
                          const isTopPerformer = index === 0 && sortColumn === 'completionRate';
                          const tier = getPerformanceTier(stat.completionRate, stat.avgAccuracy);
                          return (
                            <TableRow 
                              key={stat.builder.id} 
                              className="hover-elevate cursor-pointer"
                              onClick={() => setLocation("/builders")}
                              data-testid={`row-builder-${stat.builder.id}`}
                            >
                              <TableCell>
                                {isTopPerformer && (
                                  <Trophy className="h-5 w-5 text-yellow-500" data-testid="icon-top-performer" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{stat.builder.name}</TableCell>
                              <TableCell className="text-center">{stat.totalJobs}</TableCell>
                              <TableCell className="text-center">{stat.completedJobs}</TableCell>
                              <TableCell className="text-center font-semibold">
                                {stat.completionRate.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {stat.avgAccuracy > 0 ? `${stat.avgAccuracy.toFixed(1)}%` : 'N/A'}
                              </TableCell>
                              <TableCell className="text-center">
                                {stat.avgInspectionTime > 0 ? Math.round(stat.avgInspectionTime) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-center">{stat.commonIssuesCount}</TableCell>
                              <TableCell className="text-center">{stat.jobsThisMonth}</TableCell>
                              <TableCell className="text-center">
                                {getTrendIcon(stat, jobs)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge 
                                  className={tier.color}
                                  data-testid={`badge-performance-tier-${stat.builder.id}`}
                                >
                                  {tier.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Builder Comparison Chart */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Top 5 Builders Comparison</h3>
                      <p className="text-sm text-muted-foreground">Grouped comparison of completion rate vs forecast accuracy</p>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={builderComparisonData} data-testid="chart-builder-comparison">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Completion Rate" fill="#28A745" name="Completion Rate %" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Forecast Accuracy" fill="#2E5BBA" name="Forecast Accuracy %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Builder Trend Analysis */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Builder Performance Trends</h3>
                      <p className="text-sm text-muted-foreground">Job completion trends over the last 6 months for top 5 builders</p>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={builderTrendData} data-testid="chart-builder-trends">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: 'Jobs Completed', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        {topBuilders.map((stat, index) => (
                          <Line
                            key={stat.builder.id}
                            type="monotone"
                            dataKey={stat.builder.name}
                            stroke={['#2E5BBA', '#28A745', '#FFC107', '#DC3545', '#9333EA'][index % 5]}
                            strokeWidth={2}
                            name={stat.builder.name}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No builder data available</p>
                  <p className="text-sm mt-2">Add builders to start tracking performance metrics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
