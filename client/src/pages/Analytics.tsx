import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp, AlertTriangle, Camera, BarChart3, CheckCircle2, Clock, Target, Building2, TrendingDown, Minus, Trophy, ArrowUpDown, ArrowRight, Award } from "lucide-react";
import { format, subMonths, differenceInMinutes, startOfMonth, isThisMonth, subDays } from "date-fns";
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

const ISSUE_COLORS = [
  '#2E5BBA', // Blue
  '#28A745', // Green
  '#FFC107', // Yellow
  '#DC3545', // Red
  '#6C757D', // Gray
];

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

  // Performance optimization: Create job lookup map to avoid repeated finds
  const jobsMap = new Map(jobs.map(j => [j.id, j]));

  // Create Set of displayed months for exact alignment with chart
  const displayedMonths = new Set(last6Months);

  // Monthly issue tracking for trend analysis (exact chart months)
  const monthlyIssues = checklistItems
    .filter(item => {
      const job = jobsMap.get(item.jobId);
      if (!job?.completedDate || item.completed || job.status !== 'completed') return false;
      
      // Check if job's month is in the displayed months
      const jobMonth = format(new Date(job.completedDate), 'MMM yyyy');
      return displayedMonths.has(jobMonth);
    })
    .reduce((acc, item) => {
      const job = jobsMap.get(item.jobId);
      if (!job?.completedDate) return acc;
      
      const month = format(new Date(job.completedDate), 'MMM yyyy');
      const issueName = item.title;
      
      if (!acc[month]) acc[month] = {};
      acc[month][issueName] = (acc[month][issueName] || 0) + 1;
      
      return acc;
    }, {} as Record<string, Record<string, number>>);

  // Calculate top issues from the 6-month data only
  const issueFrequency6Months: Record<string, number> = {};
  Object.values(monthlyIssues).forEach(monthData => {
    Object.entries(monthData).forEach(([issue, count]) => {
      issueFrequency6Months[issue] = (issueFrequency6Months[issue] || 0) + count;
    });
  });

  // Get top 5 issues for trend chart based on 6-month window
  const topIssues = Object.entries(issueFrequency6Months)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Format data for line chart
  const issuesTrendData = last6Months.map(month => {
    const dataPoint: any = { month };
    topIssues.forEach(issue => {
      dataPoint[issue] = monthlyIssues[month]?.[issue] || 0;
    });
    return dataPoint;
  });

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

  // Get trend indicator for an issue
  const getIssueTrend = (issueName: string, monthlyData: Record<string, Record<string, number>>) => {
    const now = new Date();
    const currentMonth = format(now, 'MMM yyyy');
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const date = subMonths(now, i + 1);
      return format(date, 'MMM yyyy');
    });
    
    const currentCount = monthlyData[currentMonth]?.[issueName] || 0;
    const avgLast3Months = last3Months.reduce((sum, month) => {
      return sum + (monthlyData[month]?.[issueName] || 0);
    }, 0) / 3;
    
    if (currentCount > avgLast3Months * 1.3) {
      return { icon: TrendingUp, color: 'text-destructive', label: 'Worsening' };
    } else if (currentCount < avgLast3Months * 0.7) {
      return { icon: TrendingDown, color: 'text-success', label: 'Improving' };
    }
    return { icon: Minus, color: 'text-muted-foreground', label: 'Stable' };
  };

  // Forecast Accuracy Helper Function
  const calculateAccuracy = (predicted: number, actual: number): number => {
    if (predicted === null || predicted === undefined || 
        actual === null || actual === undefined) return 0;
    
    // Handle zero predicted value
    if (predicted === 0) {
      return actual === 0 ? 100 : 0; // Perfect if both zero, else 0%
    }
    
    const variance = Math.abs(actual - predicted) / predicted * 100;
    return Math.max(0, 100 - variance);
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
    
    // Get TDL forecasts for this builder
    const tdlForecasts = completedBuilderJobs
      .map(j => forecasts.find(f => f.jobId === j.id))
      .filter(f => f && 
        f.actualTDL !== null && f.actualTDL !== undefined && 
        f.predictedTDL !== null && f.predictedTDL !== undefined
      );
    
    // Get DLO forecasts for this builder
    const dloForecasts = completedBuilderJobs
      .map(j => forecasts.find(f => f.jobId === j.id))
      .filter(f => f &&
        f.actualDLO !== null && f.actualDLO !== undefined &&
        f.predictedDLO !== null && f.predictedDLO !== undefined
      );
    
    // Calculate TDL accuracy
    const tdlAccuracy = tdlForecasts.length > 0
      ? tdlForecasts.reduce((sum, f) => {
          return sum + calculateAccuracy(
            parseFloat(f!.predictedTDL!.toString()),
            parseFloat(f!.actualTDL!.toString())
          );
        }, 0) / tdlForecasts.length
      : 0;
    
    // Calculate DLO accuracy
    const dloAccuracy = dloForecasts.length > 0
      ? dloForecasts.reduce((sum, f) => {
          return sum + calculateAccuracy(
            parseFloat(f!.predictedDLO!.toString()),
            parseFloat(f!.actualDLO!.toString())
          );
        }, 0) / dloForecasts.length
      : 0;
    
    // Calculate weighted average of both TDL and DLO
    const totalForecasts = tdlForecasts.length + dloForecasts.length;
    const avgAccuracy = totalForecasts > 0
      ? (tdlAccuracy * tdlForecasts.length + dloAccuracy * dloForecasts.length) / totalForecasts
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
    
    // Calculate compliance rate for this builder
    const builderJobsWithCompliance = builderJobs.filter(j => 
      j.complianceStatus === 'compliant' || j.complianceStatus === 'non-compliant'
    );
    const builderCompliantJobs = builderJobs.filter(j => j.complianceStatus === 'compliant');
    const complianceRate = builderJobsWithCompliance.length > 0
      ? (builderCompliantJobs.length / builderJobsWithCompliance.length * 100)
      : 0;
    
    return {
      builder,
      totalJobs: builderJobs.length,
      completedJobs: completedBuilderJobs.length,
      completionRate,
      avgAccuracy,
      avgInspectionTime: avgTime,
      commonIssuesCount: failedItems.length,
      jobsThisMonth: thisMonthJobs.length,
      complianceRate,
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
      const jobDate = new Date(j.scheduledDate || j.completedDate || Date.now());
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
        const date = new Date(j.scheduledDate || j.completedDate || Date.now());
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

  // Forecast Accuracy Calculations
  const forecastsWithTDL = forecasts.filter(f => 
    f.actualTDL !== null && f.actualTDL !== undefined &&
    f.predictedTDL !== null && f.predictedTDL !== undefined
  );

  const forecastsWithDLO = forecasts.filter(f =>
    f.actualDLO !== null && f.actualDLO !== undefined &&
    f.predictedDLO !== null && f.predictedDLO !== undefined
  );

  const forecastsWithData = forecasts.filter(f => 
    (f.actualTDL !== null && f.actualTDL !== undefined &&
     f.predictedTDL !== null && f.predictedTDL !== undefined) ||
    (f.actualDLO !== null && f.actualDLO !== undefined &&
     f.predictedDLO !== null && f.predictedDLO !== undefined)
  );

  // Calculate TDL accuracy
  const tdlAccuracy = forecastsWithTDL.length > 0
    ? forecastsWithTDL.reduce((sum, f) => {
        return sum + calculateAccuracy(
          parseFloat(f.predictedTDL!.toString()),
          parseFloat(f.actualTDL!.toString())
        );
      }, 0) / forecastsWithTDL.length
    : 0;

  // Calculate DLO accuracy
  const dloAccuracy = forecastsWithDLO.length > 0
    ? forecastsWithDLO.reduce((sum, f) => {
        return sum + calculateAccuracy(
          parseFloat(f.predictedDLO!.toString()),
          parseFloat(f.actualDLO!.toString())
        );
      }, 0) / forecastsWithDLO.length
    : 0;

  // Calculate overall accuracy (weighted average of TDL and DLO)
  const overallAccuracy = (() => {
    const totalForecasts = forecastsWithTDL.length + forecastsWithDLO.length;
    if (totalForecasts === 0) return 0;
    return (tdlAccuracy * forecastsWithTDL.length + dloAccuracy * forecastsWithDLO.length) / totalForecasts;
  })();

  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const recentTDLForecasts = forecastsWithTDL.filter(f => {
    const job = jobsMap.get(f.jobId);
    return job?.completedDate && new Date(job.completedDate) >= thirtyDaysAgo;
  });

  const recentDLOForecasts = forecastsWithDLO.filter(f => {
    const job = jobsMap.get(f.jobId);
    return job?.completedDate && new Date(job.completedDate) >= thirtyDaysAgo;
  });

  const recentTDLAccuracy = recentTDLForecasts.length > 0
    ? recentTDLForecasts.reduce((sum, f) => {
        return sum + calculateAccuracy(
          parseFloat(f.predictedTDL!.toString()),
          parseFloat(f.actualTDL!.toString())
        );
      }, 0) / recentTDLForecasts.length
    : 0;

  const recentDLOAccuracy = recentDLOForecasts.length > 0
    ? recentDLOForecasts.reduce((sum, f) => {
        return sum + calculateAccuracy(
          parseFloat(f.predictedDLO!.toString()),
          parseFloat(f.actualDLO!.toString())
        );
      }, 0) / recentDLOForecasts.length
    : 0;

  const recentAccuracy = (() => {
    const totalRecent = recentTDLForecasts.length + recentDLOForecasts.length;
    if (totalRecent === 0) return 0;
    return (recentTDLAccuracy * recentTDLForecasts.length + recentDLOAccuracy * recentDLOForecasts.length) / totalRecent;
  })();

  type BestForecastResult = { forecast: Forecast; accuracy: number; job?: Job; type: 'TDL' | 'DLO' } | null;
  
  const bestForecast: BestForecastResult = (() => {
    const candidates: Array<{ forecast: Forecast; accuracy: number; job?: Job; type: 'TDL' | 'DLO' }> = [];
    
    // Check TDL forecasts
    forecastsWithTDL.forEach(f => {
      const accuracy = calculateAccuracy(
        parseFloat(f.predictedTDL!.toString()),
        parseFloat(f.actualTDL!.toString())
      );
      const job = jobsMap.get(f.jobId);
      candidates.push({ forecast: f, accuracy, job, type: 'TDL' });
    });
    
    // Check DLO forecasts
    forecastsWithDLO.forEach(f => {
      const accuracy = calculateAccuracy(
        parseFloat(f.predictedDLO!.toString()),
        parseFloat(f.actualDLO!.toString())
      );
      const job = jobsMap.get(f.jobId);
      candidates.push({ forecast: f, accuracy, job, type: 'DLO' });
    });
    
    if (candidates.length === 0) return null;
    
    return candidates.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );
  })();

  const monthlyAccuracyData = last6Months.map(month => {
    const monthTDLForecasts = forecastsWithTDL.filter(f => {
      const job = jobsMap.get(f.jobId);
      if (!job?.completedDate) return false;
      return format(new Date(job.completedDate), 'MMM yyyy') === month;
    });

    const monthDLOForecasts = forecastsWithDLO.filter(f => {
      const job = jobsMap.get(f.jobId);
      if (!job?.completedDate) return false;
      return format(new Date(job.completedDate), 'MMM yyyy') === month;
    });
    
    const tdlAccuracy = monthTDLForecasts.length > 0
      ? monthTDLForecasts.reduce((sum, f) => {
          const accuracy = calculateAccuracy(
            parseFloat(f.predictedTDL!.toString()),
            parseFloat(f.actualTDL!.toString())
          );
          return sum + accuracy;
        }, 0) / monthTDLForecasts.length
      : 0;

    const dloAccuracy = monthDLOForecasts.length > 0
      ? monthDLOForecasts.reduce((sum, f) => {
          const accuracy = calculateAccuracy(
            parseFloat(f.predictedDLO!.toString()),
            parseFloat(f.actualDLO!.toString())
          );
          return sum + accuracy;
        }, 0) / monthDLOForecasts.length
      : 0;
    
    return { 
      month, 
      tdlAccuracy: parseFloat(tdlAccuracy.toFixed(1)),
      dloAccuracy: parseFloat(dloAccuracy.toFixed(1))
    };
  });

  const accuracyDistribution = (() => {
    const dist = {
      'Excellent (>95%)': 0,
      'Good (90-95%)': 0,
      'Fair (80-90%)': 0,
      'Needs Improvement (<80%)': 0
    };

    // Count TDL accuracies
    forecastsWithTDL.forEach(f => {
      const accuracy = calculateAccuracy(
        parseFloat(f.predictedTDL!.toString()),
        parseFloat(f.actualTDL!.toString())
      );
      if (accuracy > 95) dist['Excellent (>95%)']++;
      else if (accuracy >= 90) dist['Good (90-95%)']++;
      else if (accuracy >= 80) dist['Fair (80-90%)']++;
      else dist['Needs Improvement (<80%)']++;
    });

    // Count DLO accuracies
    forecastsWithDLO.forEach(f => {
      const accuracy = calculateAccuracy(
        parseFloat(f.predictedDLO!.toString()),
        parseFloat(f.actualDLO!.toString())
      );
      if (accuracy > 95) dist['Excellent (>95%)']++;
      else if (accuracy >= 90) dist['Good (90-95%)']++;
      else if (accuracy >= 80) dist['Fair (80-90%)']++;
      else dist['Needs Improvement (<80%)']++;
    });

    return dist;
  })();

  const accuracyDistributionData = Object.entries(accuracyDistribution).map(([range, count]) => ({
    range,
    count
  }));

  const [forecastSortColumn, setForecastSortColumn] = useState<string>('accuracy');
  const [forecastSortDirection, setForecastSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleForecastSort = (column: string) => {
    if (forecastSortColumn === column) {
      setForecastSortDirection(forecastSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setForecastSortColumn(column);
      setForecastSortDirection('desc');
    }
  };

  const forecastTableData = forecastsWithData.map(f => {
    const job = jobsMap.get(f.jobId);
    
    // TDL data
    const hasTDL = f.predictedTDL !== null && f.predictedTDL !== undefined && 
                   f.actualTDL !== null && f.actualTDL !== undefined;
    const predictedTDL = hasTDL ? parseFloat(f.predictedTDL!.toString()) : null;
    const actualTDL = hasTDL ? parseFloat(f.actualTDL!.toString()) : null;
    const tdlVariance = hasTDL && predictedTDL !== null && actualTDL !== null ? actualTDL - predictedTDL : null;
    const tdlAccuracy = hasTDL && predictedTDL !== null && actualTDL !== null ? calculateAccuracy(predictedTDL, actualTDL) : null;
    
    // DLO data
    const hasDLO = f.predictedDLO !== null && f.predictedDLO !== undefined && 
                   f.actualDLO !== null && f.actualDLO !== undefined;
    const predictedDLO = hasDLO ? parseFloat(f.predictedDLO!.toString()) : null;
    const actualDLO = hasDLO ? parseFloat(f.actualDLO!.toString()) : null;
    const dloVariance = hasDLO && predictedDLO !== null && actualDLO !== null ? actualDLO - predictedDLO : null;
    const dloAccuracy = hasDLO && predictedDLO !== null && actualDLO !== null ? calculateAccuracy(predictedDLO, actualDLO) : null;
    
    // Overall accuracy (average of available metrics)
    let overallAccuracy = 0;
    if (tdlAccuracy !== null && dloAccuracy !== null) {
      overallAccuracy = (tdlAccuracy + dloAccuracy) / 2;
    } else if (tdlAccuracy !== null) {
      overallAccuracy = tdlAccuracy;
    } else if (dloAccuracy !== null) {
      overallAccuracy = dloAccuracy;
    }
    
    return {
      id: f.id,
      jobName: job?.name || 'Unknown Job',
      predictedTDL,
      actualTDL,
      tdlVariance,
      tdlAccuracy,
      predictedDLO,
      actualDLO,
      dloVariance,
      dloAccuracy,
      accuracy: overallAccuracy,
      date: job?.completedDate ? new Date(job.completedDate) : null
    };
  });

  const sortedForecasts = [...forecastTableData].sort((a, b) => {
    let aVal = a[forecastSortColumn as keyof typeof a];
    let bVal = b[forecastSortColumn as keyof typeof b];
    
    if (forecastSortColumn === 'date') {
      aVal = a.date?.getTime() || 0;
      bVal = b.date?.getTime() || 0;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return forecastSortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      return forecastSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const getAccuracyBadgeColor = (accuracy: number) => {
    if (accuracy > 95) return 'bg-green-600 text-white';
    if (accuracy >= 90) return 'bg-blue-500 text-white';
    if (accuracy >= 80) return 'bg-yellow-500 text-white';
    return 'bg-red-600 text-white';
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy > 95) return 'Excellent';
    if (accuracy >= 90) return 'Good';
    if (accuracy >= 80) return 'Fair';
    return 'Needs Improvement';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy > 90) return 'text-success';
    if (accuracy >= 80) return 'text-yellow-600';
    return 'text-destructive';
  };

  // Compliance Metrics Calculations
  
  // Filter jobs with evaluated compliance status (compliant or non-compliant)
  const jobsWithComplianceData = jobs.filter(j => 
    j.complianceStatus === 'compliant' || j.complianceStatus === 'non-compliant'
  );
  
  const compliantJobs = jobs.filter(j => j.complianceStatus === 'compliant');
  const nonCompliantJobs = jobs.filter(j => j.complianceStatus === 'non-compliant');
  
  // Monthly compliance rate data for 6-month chart
  const monthlyComplianceData = last6Months.map(month => {
    const monthJobsWithCompliance = jobsWithComplianceData.filter(j => {
      if (!j.completedDate && !j.scheduledDate) return false;
      const jobDate = j.completedDate || j.scheduledDate;
      const jobMonth = format(new Date(jobDate!), 'MMM yyyy');
      return jobMonth === month;
    });
    
    const monthCompliantJobs = monthJobsWithCompliance.filter(j => j.complianceStatus === 'compliant');
    const monthNonCompliantJobs = monthJobsWithCompliance.filter(j => j.complianceStatus === 'non-compliant');
    
    const totalEvaluated = monthJobsWithCompliance.length;
    const compliantRate = totalEvaluated > 0 ? (monthCompliantJobs.length / totalEvaluated * 100) : 0;
    const nonCompliantRate = totalEvaluated > 0 ? (monthNonCompliantJobs.length / totalEvaluated * 100) : 0;
    
    return {
      month,
      compliantRate: parseFloat(compliantRate.toFixed(1)),
      nonCompliantRate: parseFloat(nonCompliantRate.toFixed(1)),
      totalEvaluated
    };
  });
  
  // Parse compliance violations from non-compliant jobs
  interface Violation {
    metric: string;
    threshold: number;
    actualValue: number;
    severity: string;
  }
  
  interface ComplianceFlags {
    violations: Violation[];
    evaluatedAt: string;
  }
  
  const violationFrequency: Record<string, { count: number; totalOverage: number; violations: Violation[] }> = {};
  
  nonCompliantJobs.forEach(job => {
    if (job.complianceFlags) {
      try {
        const flags = typeof job.complianceFlags === 'string' 
          ? JSON.parse(job.complianceFlags) as ComplianceFlags
          : job.complianceFlags as ComplianceFlags;
        
        if (flags.violations && Array.isArray(flags.violations)) {
          flags.violations.forEach(violation => {
            const metric = violation.metric;
            if (!violationFrequency[metric]) {
              violationFrequency[metric] = { count: 0, totalOverage: 0, violations: [] };
            }
            violationFrequency[metric].count++;
            const overage = violation.actualValue - violation.threshold;
            violationFrequency[metric].totalOverage += overage;
            violationFrequency[metric].violations.push(violation);
          });
        }
      } catch (e) {
        // Skip invalid JSON
        console.error('Invalid complianceFlags JSON:', e);
      }
    }
  });
  
  const topViolationsData = Object.entries(violationFrequency)
    .map(([metric, data]) => ({
      metric,
      frequency: data.count,
      avgOverage: data.count > 0 ? parseFloat((data.totalOverage / data.count).toFixed(2)) : 0,
      severity: data.violations[0]?.severity || 'unknown'
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

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
                      <TableHead className="text-center">Trend</TableHead>
                      <TableHead className="text-right">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commonIssues.map((issue, index) => {
                      const trend = getIssueTrend(issue.name, monthlyIssues);
                      const Icon = trend.icon;
                      return (
                        <TableRow key={issue.name}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{issue.name}</TableCell>
                          <TableCell className="text-center font-semibold">{issue.frequency}</TableCell>
                          <TableCell className="text-center">{issue.percentage}%</TableCell>
                          <TableCell className="text-center">
                            <div className={`flex items-center justify-center gap-1 ${trend.color}`} data-testid={`trend-indicator-${index}`}>
                              <Icon className="h-4 w-4" />
                              <span className="text-xs">{trend.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

          {/* Common Issues Trend Chart */}
          <Card data-testid="card-common-issues-trend">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Common Issues Trend
              </CardTitle>
              <CardDescription>Track how top issues are changing over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : topIssues.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} data-testid="chart-issues-trend">
                  <LineChart data={issuesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {topIssues.map((issue, idx) => (
                      <Line
                        key={issue}
                        type="monotone"
                        dataKey={issue}
                        stroke={ISSUE_COLORS[idx % ISSUE_COLORS.length]}
                        strokeWidth={2}
                        name={issue}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No trend data available</p>
                  <p className="text-sm mt-2">Complete more inspections to see issue trends</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Metrics Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Minnesota Code Compliance</h2>
            
            {/* Compliance Pass-Rate Trends */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card data-testid="card-compliance-trends">
                <CardHeader>
                  <CardTitle>Compliance Pass-Rate Trends</CardTitle>
                  <CardDescription>Monthly pass rates over 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : monthlyComplianceData.some(d => d.totalEvaluated > 0) ? (
                    <ResponsiveContainer width="100%" height={300} data-testid="chart-compliance-trends">
                      <LineChart data={monthlyComplianceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="compliantRate" 
                          stroke="#28A745" 
                          strokeWidth={2}
                          name="Compliant Rate %"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="nonCompliantRate" 
                          stroke="#DC3545" 
                          strokeWidth={2}
                          name="Non-Compliant Rate %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No compliance data available</p>
                      <p className="text-sm mt-2">Jobs need compliance evaluation to show trends</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Code Violations */}
              <Card data-testid="card-top-violations">
                <CardHeader>
                  <CardTitle>Most Common Code Violations</CardTitle>
                  <CardDescription>Frequency of compliance failures</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : topViolationsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300} data-testid="chart-top-violations">
                      <BarChart data={topViolationsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-card p-3 border rounded-md shadow-md">
                                  <p className="font-semibold">{data.metric || 'Unknown'}</p>
                                  <p className="text-sm">Frequency: {data.frequency || 0}</p>
                                  <p className="text-sm">Avg Overage: {typeof data.avgOverage === 'number' && !isNaN(data.avgOverage) ? data.avgOverage.toFixed(2) : '0.00'}</p>
                                  <p className="text-sm text-muted-foreground capitalize">Severity: {data.severity || 'unknown'}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="frequency" fill="#DC3545" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No violation data available</p>
                      <p className="text-sm mt-2">Non-compliant jobs will show violation patterns here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

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
                              onClick={() => handleSort('complianceRate')}
                              data-testid="button-sort-complianceRate"
                              className="hover-elevate"
                            >
                              Compliance Rate
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
                              <TableCell className="text-center font-semibold">
                                <span 
                                  className={
                                    stat.complianceRate >= 90 ? 'text-success' : 
                                    stat.complianceRate >= 70 ? 'text-yellow-600' : 
                                    stat.complianceRate > 0 ? 'text-destructive' : 
                                    'text-muted-foreground'
                                  }
                                  data-testid={`text-builder-compliance-${stat.builder.id}`}
                                >
                                  {stat.complianceRate > 0 ? `${stat.complianceRate.toFixed(1)}%` : 'N/A'}
                                </span>
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

          {/* Forecast Accuracy Tracking */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-forecast-accuracy-title">Forecast Accuracy Tracking</h2>
              <p className="text-muted-foreground">Track prediction accuracy and improve forecasting skills over time</p>
            </div>

            {/* Accuracy Metric Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-overall-accuracy">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <p className={`text-3xl font-bold ${getAccuracyColor(overallAccuracy)}`} data-testid="text-overall-accuracy">
                          {overallAccuracy > 0 ? `${overallAccuracy.toFixed(1)}%` : 'N/A'}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{forecastsWithData.length} forecasts</p>
                    </div>
                    <div className="p-3 rounded-md bg-primary/10">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-tdl-accuracy">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">TDL Accuracy</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <p className={`text-3xl font-bold ${getAccuracyColor(tdlAccuracy)}`} data-testid="text-tdl-accuracy">
                          {tdlAccuracy > 0 ? `${tdlAccuracy.toFixed(1)}%` : 'N/A'}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Total Duct Leakage</p>
                    </div>
                    <div className="p-3 rounded-md bg-blue-500/10">
                      <CheckCircle2 className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-dlo-accuracy">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">DLO Accuracy</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <p className={`text-3xl font-bold ${getAccuracyColor(dloAccuracy)}`} data-testid="text-dlo-accuracy">
                          {dloAccuracy > 0 ? `${dloAccuracy.toFixed(1)}%` : 'N/A'}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Duct Leakage to Outside</p>
                    </div>
                    <div className="p-3 rounded-md bg-purple-500/10">
                      <CheckCircle2 className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-best-forecast">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Best Forecast</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : bestForecast && bestForecast.accuracy !== undefined ? (
                        <>
                          <p className="text-3xl font-bold text-success" data-testid="text-best-forecast">
                            {bestForecast.accuracy.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bestForecast.job?.completedDate 
                              ? `${format(new Date(bestForecast.job.completedDate), 'MMM d, yyyy')} (${bestForecast.type})`
                              : 'No data'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-muted-foreground" data-testid="text-best-forecast">
                            N/A
                          </p>
                          <p className="text-xs text-muted-foreground">No data</p>
                        </>
                      )}
                    </div>
                    <div className="p-3 rounded-md bg-yellow-500/10">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accuracy Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card data-testid="card-accuracy-trend">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Accuracy Trend
                  </CardTitle>
                  <CardDescription>Monthly TDL and DLO forecast accuracy over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : forecastsWithData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300} data-testid="chart-accuracy-trend">
                      <LineChart data={monthlyAccuracyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="tdlAccuracy" 
                          stroke="#28A745" 
                          strokeWidth={2}
                          name="TDL Accuracy %"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="dloAccuracy" 
                          stroke="#2E5BBA" 
                          strokeWidth={2}
                          name="DLO Accuracy %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No forecast data available</p>
                      <p className="text-sm mt-2">Add forecasts with actual results to see trends</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-accuracy-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Accuracy Distribution
                  </CardTitle>
                  <CardDescription>How forecasts are distributed by accuracy range</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : forecastsWithData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300} data-testid="chart-accuracy-distribution">
                      <BarChart data={accuracyDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-15} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2E5BBA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No distribution data available</p>
                      <p className="text-sm mt-2">Complete forecasts to see accuracy distribution</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Forecast Table */}
            <Card data-testid="card-forecast-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Detailed Forecast Analysis
                </CardTitle>
                <CardDescription>Individual forecast predictions vs actual results</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : sortedForecasts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table data-testid="table-forecast-details">
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('jobName')}
                              data-testid="button-sort-jobName"
                              className="hover-elevate -ml-3"
                            >
                              Job Name
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('predictedTDL')}
                              data-testid="button-sort-predictedTDL"
                              className="hover-elevate"
                            >
                              Predicted TDL
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('actualTDL')}
                              data-testid="button-sort-actualTDL"
                              className="hover-elevate"
                            >
                              Actual TDL
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('tdlVariance')}
                              data-testid="button-sort-tdlVariance"
                              className="hover-elevate"
                            >
                              TDL Variance
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('predictedDLO')}
                              data-testid="button-sort-predictedDLO"
                              className="hover-elevate"
                            >
                              Predicted DLO
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('actualDLO')}
                              data-testid="button-sort-actualDLO"
                              className="hover-elevate"
                            >
                              Actual DLO
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('dloVariance')}
                              data-testid="button-sort-dloVariance"
                              className="hover-elevate"
                            >
                              DLO Variance
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('accuracy')}
                              data-testid="button-sort-accuracy"
                              className="hover-elevate"
                            >
                              Accuracy
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleForecastSort('date')}
                              data-testid="button-sort-date"
                              className="hover-elevate"
                            >
                              Date
                              <ArrowUpDown className="h-4 w-4 ml-2" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">Quality</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedForecasts.map((forecast) => (
                          <TableRow 
                            key={forecast.id}
                            className="hover-elevate"
                            data-testid={`row-forecast-${forecast.id}`}
                          >
                            <TableCell className="font-medium">{forecast.jobName}</TableCell>
                            <TableCell className="text-center">
                              {forecast.predictedTDL !== null ? forecast.predictedTDL.toFixed(2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {forecast.actualTDL !== null ? forecast.actualTDL.toFixed(2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.tdlVariance !== null ? (
                                <span className={forecast.tdlVariance > 0 ? 'text-destructive' : 'text-success'}>
                                  {forecast.tdlVariance > 0 ? '+' : ''}{forecast.tdlVariance.toFixed(2)}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.predictedDLO !== null ? forecast.predictedDLO.toFixed(2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {forecast.actualDLO !== null ? forecast.actualDLO.toFixed(2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.dloVariance !== null ? (
                                <span className={forecast.dloVariance > 0 ? 'text-destructive' : 'text-success'}>
                                  {forecast.dloVariance > 0 ? '+' : ''}{forecast.dloVariance.toFixed(2)}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${getAccuracyColor(forecast.accuracy)}`}>
                                {forecast.accuracy.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.date ? format(forecast.date, 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                className={getAccuracyBadgeColor(forecast.accuracy)}
                                data-testid={`badge-accuracy-${forecast.id}`}
                              >
                                {getAccuracyLabel(forecast.accuracy)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No forecast details available</p>
                    <p className="text-sm mt-2">Add forecasts with predicted and actual TDL values</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
