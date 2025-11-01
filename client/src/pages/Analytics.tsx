import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  AlertTriangle, 
  Camera, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Target, 
  Building2, 
  TrendingDown, 
  Minus, 
  Trophy, 
  ArrowUpDown, 
  ArrowRight, 
  Award, 
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { analyticsLogger } from "@/lib/logger";
import { format, subMonths, differenceInMinutes, startOfMonth, isThisMonth, subDays, isWithinInterval, eachMonthOfInterval, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChartLoadingFallback, DashboardLoadingFallback } from "@/components/LoadingStates";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Use lazy-loaded chart components to reduce initial bundle size
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
} from "@/components/LazyChart";
import type { Job, ChecklistItem, Photo, Builder, Forecast } from "@shared/schema";
import { getTagConfig } from "@shared/photoTags";
import { safeToFixed, safeParseFloat, safeDivide } from "@shared/numberUtils";
import { calculateAccuracy } from "@shared/forecastAccuracy";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import ExportDialog from "@/components/ExportDialog";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const STATUS_COLORS = {
  scheduled: "#FFC107",
  done: "#28A745",
  failed: "#FD7E14",
  reschedule: "#2E5BBA",
} as const;

const ISSUE_COLORS = [
  '#2E5BBA', // Blue
  '#28A745', // Green
  '#FFC107', // Yellow
  '#DC3545', // Red
  '#6C757D', // Gray
] as const;

const STORAGE_KEY = 'analytics-date-range';

// Phase 2 - BUILD: AnalyticsContent wrapped in ErrorBoundary at export
function AnalyticsContent() {
  const [, setLocation] = useLocation();
  const [sortColumn, setSortColumn] = useState<string>('completionRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Initialize date range with last 6 months (to maintain current behavior)
  const getInitialDateRange = (): DateRange => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.from && parsed.to) {
          return {
            from: new Date(parsed.from),
            to: new Date(parsed.to),
          };
        }
      }
    } catch (error) {
      analyticsLogger.error('Failed to load date range from localStorage', { error });
    }
    
    // Default: last 6 months
    return {
      from: subMonths(new Date(), 5),
      to: new Date(),
    };
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange);
  
  // Persist date range to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }));
    } catch (error) {
      analyticsLogger.error('Failed to save date range to localStorage', { error });
    }
  }, [dateRange]);

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  const { 
    data: jobs = [], 
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: 2,
  });

  const { 
    data: checklistItems = [], 
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems
  } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
    retry: 2,
  });

  const { 
    data: photos = [], 
    isLoading: photosLoading,
    error: photosError,
    refetch: refetchPhotos
  } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
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
    data: forecasts = [], 
    isLoading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecasts
  } = useQuery<Forecast[]>({
    queryKey: ["/api/forecasts"],
    retry: 2,
  });

  const isLoading = jobsLoading || itemsLoading || photosLoading || buildersLoading || forecastsLoading;

  // Phase 3 - OPTIMIZE: Memoized helper function to check if date is within range
  // Prevents recreation on every render
  const isInDateRange = useCallback((date: Date | string | null | undefined): boolean => {
    if (!date) return false;
    const checkDate = new Date(date);
    // Phase 5 - HARDEN: Validate date is not NaN
    if (isNaN(checkDate.getTime())) return false;
    return isWithinInterval(checkDate, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to),
    });
  }, [dateRange.from, dateRange.to]);

  // Phase 3 - OPTIMIZE: Memoized filtered jobs to prevent recomputation
  // Only recalculates when jobs data or date range changes
  const jobsInRange = useMemo(() => {
    return jobs.filter(j => {
      const relevantDate = j.completedDate || j.scheduledDate;
      return isInDateRange(relevantDate);
    });
  }, [jobs, isInDateRange]);

  // Phase 6 - DOCUMENT: Total inspections metric
  // Count of all jobs within the selected date range
  const totalInspections = jobsInRange.length;
  
  // Phase 3 - OPTIMIZE: Memoized completed jobs calculation
  const completedJobs = useMemo(() => {
    return jobsInRange.filter(j => j.status === "done" && j.completedDate && j.scheduledDate);
  }, [jobsInRange]);
  
  // Phase 6 - DOCUMENT: Average inspection time calculation
  // Calculates mean time in minutes from scheduled to completed for all finished jobs
  // Phase 5 - HARDEN: Prevents division by zero
  const avgInspectionTime = useMemo(() => {
    if (completedJobs.length === 0) return 0;
    
    return completedJobs.reduce((sum, job) => {
      const start = new Date(job.scheduledDate!);
      const end = new Date(job.completedDate!);
      return sum + differenceInMinutes(end, start);
    }, 0) / completedJobs.length;
  }, [completedJobs]);

  // Phase 6 - DOCUMENT: Completion rate metric
  // Percentage of jobs in selected range that have been completed
  // Phase 5 - HARDEN: Prevents division by zero
  const completionRate = useMemo(() => {
    if (totalInspections === 0) return 0;
    return (jobsInRange.filter(j => j.status === "done").length / totalInspections) * 100;
  }, [jobsInRange, totalInspections]);

  // Phase 6 - DOCUMENT: Average items per inspection metric
  // Mean number of checklist items across all inspections in date range
  // Phase 5 - HARDEN: Prevents division by zero
  const avgItemsPerInspection = useMemo(() => {
    if (totalInspections === 0) return 0;
    
    const itemsInRange = checklistItems.filter(item => {
      const job = jobs.find(j => j.id === item.jobId);
      return job && isInDateRange(job.completedDate || job.scheduledDate);
    });
    
    return itemsInRange.length / totalInspections;
  }, [checklistItems, jobs, totalInspections, isInDateRange]);

  // Phase 3 - OPTIMIZE: Memoized month labels generation
  const monthsInRange = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfMonth(dateRange.from),
      end: startOfMonth(dateRange.to),
    }).map(date => format(date, 'MMM yyyy'));
  }, [dateRange.from, dateRange.to]);

  // Phase 6 - DOCUMENT: Monthly inspection data for trend chart
  // Groups completed jobs by month for time-series visualization
  const monthlyInspectionData = useMemo(() => {
    return monthsInRange.map(month => {
      const count = jobs.filter(j => {
        if (!j.completedDate || !isInDateRange(j.completedDate)) return false;
        const jobMonth = format(new Date(j.completedDate), 'MMM yyyy');
        return jobMonth === month;
      }).length;
      return { month, inspections: count };
    });
  }, [monthsInRange, jobs, isInDateRange]);

  // Phase 3 - OPTIMIZE: Memoize job lookup map to avoid repeated finds
  const jobsMap = useMemo(() => {
    return new Map(jobs.map(j => [j.id, j]));
  }, [jobs]);

  // Phase 3 - OPTIMIZE: Memoize displayed months Set
  const displayedMonths = useMemo(() => {
    return new Set(monthsInRange);
  }, [monthsInRange]);

  // Phase 6 - DOCUMENT: Common issues calculation
  // Identifies most frequently failed checklist items from completed jobs
  const commonIssues = useMemo(() => {
    const completedJobIds = jobsInRange.filter(j => j.status === 'done').map(j => j.id);
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

    const completedInspections = jobsInRange.filter(j => j.status === 'done').length;
    
    return Object.entries(issueFrequency)
      .map(([name, data]) => ({
        name,
        frequency: data.count,
        // Phase 5 - HARDEN: Safe division to prevent NaN
        percentage: completedInspections > 0 ? safeToFixed((data.count / completedInspections) * 100, 1) : '0.0',
        severity: data.count > 10 ? 'Critical' : data.count > 5 ? 'Major' : 'Minor',
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }, [jobsInRange, checklistItems]);

  // Phase 6 - DOCUMENT: Monthly issue tracking for trend analysis
  // Tracks issue frequency over time for the top 5 issues
  const monthlyIssues = useMemo(() => {
    return checklistItems
      .filter(item => {
        const job = jobsMap.get(item.jobId);
        if (!job?.completedDate || item.completed || job.status !== 'completed') return false;
        
        if (!isInDateRange(job.completedDate)) return false;
        
        const jobMonth = format(new Date(job.completedDate), 'MMM yyyy');
        return displayedMonths.has(jobMonth);
      })
      .reduce((acc, item) => {
        const job = jobsMap.get(item.jobId);
        if (!job?.completedDate) return acc;
        
        const month = format(new Date(job.completedDate), 'MMM yyyy');
        const issueName = item.title;
        
        if (!acc[month]) acc[month] = {};
        acc[month][issueName] = (acc[month][issueName] ?? 0) + 1;
        
        return acc;
      }, {} as Record<string, Record<string, number>>);
  }, [checklistItems, jobsMap, isInDateRange, displayedMonths]);

  // Phase 3 - OPTIMIZE: Memoize top issues calculation
  const topIssues = useMemo(() => {
    const issueFrequency6Months: Record<string, number> = {};
    Object.values(monthlyIssues).forEach(monthData => {
      Object.entries(monthData).forEach(([issue, count]) => {
        issueFrequency6Months[issue] = (issueFrequency6Months[issue] ?? 0) + count;
      });
    });

    return Object.entries(issueFrequency6Months)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [monthlyIssues]);

  // Phase 6 - DOCUMENT: Issues trend data for line chart
  // Formats issue frequency by month for time-series visualization
  const issuesTrendData = useMemo(() => {
    return monthsInRange.map(month => {
      const dataPoint: Record<string, string | number> = { month };
      topIssues.forEach(issue => {
        dataPoint[issue] = monthlyIssues[month]?.[issue] ?? 0;
      });
      return dataPoint;
    });
  }, [monthsInRange, topIssues, monthlyIssues]);

  // Phase 6 - DOCUMENT: Photo tag analytics
  // Aggregates and ranks most commonly used photo tags
  const photoTagData = useMemo(() => {
    const tagCounts = photos
      .filter(photo => {
        const job = jobs.find(j => j.id === photo.jobId);
        return job && isInDateRange(job.completedDate || job.scheduledDate);
      })
      .reduce((acc, photo) => {
        (photo.tags ?? []).forEach(tag => {
          acc[tag] = (acc[tag] ?? 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(tagCounts)
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
  }, [photos, jobs, isInDateRange]);

  // Phase 6 - DOCUMENT: Status breakdown by month
  // Shows distribution of job statuses over time
  const statusBreakdownData = useMemo(() => {
    return monthsInRange.map(month => {
      const jobsInMonth = jobs.filter(j => {
        if (!j.scheduledDate || !isInDateRange(j.scheduledDate)) return false;
        const jobMonth = format(new Date(j.scheduledDate), 'MMM yyyy');
        return jobMonth === month;
      });

      return {
        month,
        Scheduled: jobsInMonth.filter(j => j.status === 'scheduled').length,
        Done: jobsInMonth.filter(j => j.status === 'done').length,
        Failed: jobsInMonth.filter(j => j.status === 'failed').length,
        Reschedule: jobsInMonth.filter(j => j.status === 'reschedule').length,
      };
    });
  }, [monthsInRange, jobs, isInDateRange]);

  // Phase 3 - OPTIMIZE: Memoized helper functions
  const getSeverityColor = useCallback((severity: string) => {
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
  }, []);

  const getCategoryColor = useCallback((category: string) => {
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
  }, []);

  // Phase 6 - DOCUMENT: Issue trend indicator
  // Compares current month to 3-month average to show improving/worsening trends
  const getIssueTrend = useCallback((issueName: string, monthlyData: Record<string, Record<string, number>>) => {
    const now = new Date();
    const currentMonth = format(now, 'MMM yyyy');
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const date = subMonths(now, i + 1);
      return format(date, 'MMM yyyy');
    });
    
    const currentCount = monthlyData[currentMonth]?.[issueName] ?? 0;
    const avgLast3Months = safeDivide(last3Months.reduce((sum, month) => {
      return sum + (monthlyData[month]?.[issueName] ?? 0);
    }, 0), 3);
    
    // Phase 6 - DOCUMENT: Thresholds for trend classification
    // >30% increase = worsening, >30% decrease = improving
    if (currentCount > avgLast3Months * 1.3) {
      return { icon: TrendingUp, color: 'text-destructive', label: 'Worsening' };
    } else if (currentCount < avgLast3Months * 0.7) {
      return { icon: TrendingDown, color: 'text-success', label: 'Improving' };
    }
    return { icon: Minus, color: 'text-muted-foreground', label: 'Stable' };
  }, []);

  // Phase 6 - DOCUMENT: Builder Performance Metrics Calculation
  // Aggregates key performance indicators for each builder
  const builderStats = useMemo(() => {
    return builders.map(builder => {
      const builderJobs = jobsInRange.filter(j => j.builderId === builder.id);
      const completedBuilderJobs = builderJobs.filter(j => j.status === 'done');
      
      // Phase 5 - HARDEN: Safe division prevents NaN values
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
      
      // Phase 6 - DOCUMENT: TDL/DLO forecast accuracy calculation
      // Filters valid forecasts and calculates accuracy for this builder
      const tdlForecasts = completedBuilderJobs
        .map(j => forecasts.find(f => f.jobId === j.id))
        .filter((f): f is Forecast => 
          f != null &&
          f.actualTDL != null && 
          f.predictedTDL != null &&
          !isNaN(Number(f.actualTDL)) && 
          !isNaN(Number(f.predictedTDL))
        );
      
      const dloForecasts = completedBuilderJobs
        .map(j => forecasts.find(f => f.jobId === j.id))
        .filter((f): f is Forecast =>
          f != null &&
          f.actualDLO != null &&
          f.predictedDLO != null &&
          !isNaN(Number(f.actualDLO)) &&
          !isNaN(Number(f.predictedDLO))
        );
      
      const tdlAccuracy = tdlForecasts.length > 0
        ? safeDivide(tdlForecasts.reduce((sum, f) => {
            return sum + calculateAccuracy(
              Number(f.predictedTDL),
              Number(f.actualTDL)
            );
          }, 0), tdlForecasts.length)
        : 0;
      
      const dloAccuracy = dloForecasts.length > 0
        ? safeDivide(dloForecasts.reduce((sum, f) => {
            return sum + calculateAccuracy(
              Number(f.predictedDLO),
              Number(f.actualDLO)
            );
          }, 0), dloForecasts.length)
        : 0;
      
      // Phase 6 - DOCUMENT: Weighted average of TDL and DLO accuracy
      const totalForecasts = tdlForecasts.length + dloForecasts.length;
      const avgAccuracy = totalForecasts > 0
        ? safeDivide(tdlAccuracy * tdlForecasts.length + dloAccuracy * dloForecasts.length, totalForecasts)
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
      
      // Phase 6 - DOCUMENT: Compliance rate calculation
      // Percentage of evaluated jobs that are compliant
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
  }, [builders, jobsInRange, forecasts, checklistItems]);

  // Phase 3 - OPTIMIZE: useCallback for sort handler
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn, sortDirection]);

  // Phase 3 - OPTIMIZE: Memoize sorted builders
  const sortedBuilders = useMemo(() => {
    return [...builderStats].sort((a, b) => {
      let aVal, bVal;
      
      if (sortColumn === 'builder.name') {
        aVal = a.builder.name;
        bVal = b.builder.name;
      } else {
        aVal = a[sortColumn as keyof typeof a];
        bVal = b[sortColumn as keyof typeof b];
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [builderStats, sortColumn, sortDirection]);

  const topPerformerIndex = useMemo(() => {
    return sortedBuilders.length > 0 
      ? builderStats.findIndex(b => b.builder.id === sortedBuilders[0].builder.id)
      : -1;
  }, [sortedBuilders, builderStats]);

  const getPerformanceTier = useCallback((completionRate: number, accuracy: number) => {
    const avgScore = (completionRate + accuracy) / 2;
    if (avgScore >= 85) return { label: 'Excellent', color: 'bg-green-600 text-white' };
    if (avgScore >= 70) return { label: 'Good', color: 'bg-blue-500 text-white' };
    return { label: 'Needs Improvement', color: 'bg-orange-500 text-white' };
  }, []);

  // Phase 6 - DOCUMENT: Builder trend indicator
  // Compares current month activity to 6-month average
  const getTrendIcon = useCallback((stat: typeof builderStats[0], allJobs: Job[]) => {
    if (stat.totalJobs === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const last6MonthsJobs = allJobs.filter(j => {
      if (j.builderId !== stat.builder.id) return false;
      const jobDate = new Date(j.scheduledDate || j.completedDate || Date.now());
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return jobDate >= sixMonthsAgo && jobDate < thisMonthStart;
    });
    
    // Phase 5 - HARDEN: Need minimum data for reliable trends
    if (last6MonthsJobs.length < 3) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    const monthsWithJobs = new Set(
      last6MonthsJobs.map(j => {
        const date = new Date(j.scheduledDate || j.completedDate || Date.now());
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    ).size;
    
    // Phase 5 - HARDEN: Prevent division by zero
    if (monthsWithJobs === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    
    const avgJobsPerActiveMonth = safeDivide(last6MonthsJobs.length, monthsWithJobs);
    
    if (stat.jobsThisMonth > avgJobsPerActiveMonth * 1.2) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    } else if (stat.jobsThisMonth < avgJobsPerActiveMonth * 0.8) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }, []);

  // Phase 3 - OPTIMIZE: Memoize builder comparison data
  const builderComparisonData = useMemo(() => {
    return builderStats
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
      .map(stat => ({
        name: stat.builder.name,
        'Completion Rate': safeParseFloat(safeToFixed(stat.completionRate, 1)),
        'Forecast Accuracy': safeParseFloat(safeToFixed(stat.avgAccuracy, 1)),
      }));
  }, [builderStats]);

  const builderTrendData = useMemo(() => {
    return monthsInRange.map(month => {
      const monthData: Record<string, string | number> = { month };
      builderStats
        .sort((a, b) => b.totalJobs - a.totalJobs)
        .slice(0, 5)
        .forEach(stat => {
          const jobsInMonth = jobs.filter(j => {
            if (!j.completedDate || j.builderId !== stat.builder.id) return false;
            if (!isInDateRange(j.completedDate)) return false;
            const jobMonth = format(new Date(j.completedDate), 'MMM yyyy');
            return jobMonth === month;
          }).length;
          monthData[stat.builder.name] = jobsInMonth;
        });
      return monthData;
    });
  }, [monthsInRange, builderStats, jobs, isInDateRange]);

  const topBuilders = useMemo(() => {
    return builderStats
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 5);
  }, [builderStats]);

  // Phase 6 - DOCUMENT: Forecast accuracy calculations
  // Filters and validates forecast data, then calculates accuracy metrics
  const forecastsWithTDL = useMemo(() => {
    return forecasts.filter((f): f is Forecast => {
      if (!f || f.actualTDL == null || f.predictedTDL == null) return false;
      if (isNaN(Number(f.actualTDL)) || isNaN(Number(f.predictedTDL))) return false;
      const job = jobsMap.get(f.jobId);
      return job != null && isInDateRange(job.completedDate || job.scheduledDate);
    });
  }, [forecasts, jobsMap, isInDateRange]);

  const forecastsWithDLO = useMemo(() => {
    return forecasts.filter((f): f is Forecast => {
      if (!f || f.actualDLO == null || f.predictedDLO == null) return false;
      if (isNaN(Number(f.actualDLO)) || isNaN(Number(f.predictedDLO))) return false;
      const job = jobsMap.get(f.jobId);
      return job != null && isInDateRange(job.completedDate || job.scheduledDate);
    });
  }, [forecasts, jobsMap, isInDateRange]);

  const forecastsWithData = useMemo(() => {
    return forecasts.filter((f): f is Forecast => {
      if (!f) return false;
      const job = jobsMap.get(f.jobId);
      if (!job || !isInDateRange(job.completedDate || job.scheduledDate)) return false;
      return (
        (f.actualTDL != null &&
          f.predictedTDL != null &&
          !isNaN(Number(f.actualTDL)) &&
          !isNaN(Number(f.predictedTDL))) ||
        (f.actualDLO != null &&
          f.predictedDLO != null &&
          !isNaN(Number(f.actualDLO)) &&
          !isNaN(Number(f.predictedDLO)))
      );
    });
  }, [forecasts, jobsMap, isInDateRange]);

  // Phase 6 - DOCUMENT: TDL accuracy metric
  // Percentage accuracy of Total Duct Leakage predictions
  const tdlAccuracy = useMemo(() => {
    if (forecastsWithTDL.length === 0) return 0;
    return safeDivide(forecastsWithTDL.reduce((sum, f) => {
      return sum + calculateAccuracy(
        Number(f.predictedTDL),
        Number(f.actualTDL)
      );
    }, 0), forecastsWithTDL.length);
  }, [forecastsWithTDL]);

  const dloAccuracy = useMemo(() => {
    if (forecastsWithDLO.length === 0) return 0;
    return safeDivide(forecastsWithDLO.reduce((sum, f) => {
      return sum + calculateAccuracy(
        Number(f.predictedDLO),
        Number(f.actualDLO)
      );
    }, 0), forecastsWithDLO.length);
  }, [forecastsWithDLO]);

  // Phase 6 - DOCUMENT: Overall forecast accuracy
  // Weighted average of TDL and DLO accuracy based on forecast counts
  const overallAccuracy = useMemo(() => {
    const totalForecasts = forecastsWithTDL.length + forecastsWithDLO.length;
    if (totalForecasts === 0) return 0;
    return safeDivide(tdlAccuracy * forecastsWithTDL.length + dloAccuracy * forecastsWithDLO.length, totalForecasts);
  }, [forecastsWithTDL.length, forecastsWithDLO.length, tdlAccuracy, dloAccuracy]);

  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);
  
  const recentTDLForecasts = useMemo(() => {
    return forecastsWithTDL.filter(f => {
      const job = jobsMap.get(f.jobId);
      return job?.completedDate && new Date(job.completedDate) >= thirtyDaysAgo;
    });
  }, [forecastsWithTDL, jobsMap, thirtyDaysAgo]);

  const recentDLOForecasts = useMemo(() => {
    return forecastsWithDLO.filter(f => {
      const job = jobsMap.get(f.jobId);
      return job?.completedDate && new Date(job.completedDate) >= thirtyDaysAgo;
    });
  }, [forecastsWithDLO, jobsMap, thirtyDaysAgo]);

  const recentTDLAccuracy = useMemo(() => {
    if (recentTDLForecasts.length === 0) return 0;
    return safeDivide(recentTDLForecasts.reduce((sum, f) => {
      return sum + calculateAccuracy(Number(f.predictedTDL), Number(f.actualTDL));
    }, 0), recentTDLForecasts.length);
  }, [recentTDLForecasts]);

  const recentDLOAccuracy = useMemo(() => {
    if (recentDLOForecasts.length === 0) return 0;
    return safeDivide(recentDLOForecasts.reduce((sum, f) => {
      return sum + calculateAccuracy(Number(f.predictedDLO), Number(f.actualDLO));
    }, 0), recentDLOForecasts.length);
  }, [recentDLOForecasts]);

  const recentOverallAccuracy = useMemo(() => {
    const total = recentTDLForecasts.length + recentDLOForecasts.length;
    if (total === 0) return 0;
    return safeDivide(
      recentTDLAccuracy * recentTDLForecasts.length + recentDLOAccuracy * recentDLOForecasts.length,
      total
    );
  }, [recentTDLForecasts.length, recentDLOForecasts.length, recentTDLAccuracy, recentDLOAccuracy]);

  const getAccuracyColor = useCallback((accuracy: number) => {
    if (accuracy >= 90) return 'text-success';
    if (accuracy >= 75) return 'text-blue-600';
    if (accuracy >= 60) return 'text-orange-500';
    return 'text-destructive';
  }, []);

  const getAccuracyBadgeColor = useCallback((accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-600 text-white';
    if (accuracy >= 75) return 'bg-blue-500 text-white';
    if (accuracy >= 60) return 'bg-orange-500 text-white';
    return 'bg-red-600 text-white';
  }, []);

  const getAccuracyLabel = useCallback((accuracy: number) => {
    if (accuracy >= 90) return 'Excellent';
    if (accuracy >= 75) return 'Good';
    if (accuracy >= 60) return 'Fair';
    return 'Poor';
  }, []);

  // Phase 6 - DOCUMENT: Detailed forecast data for table display
  // Enriches forecast data with job info and calculated variance
  const detailedForecasts = useMemo(() => {
    return forecastsWithData
      .map(f => {
        const job = jobsMap.get(f.jobId);
        const builder = builders.find(b => b.id === job?.builderId);
        
        // Phase 6 - DOCUMENT: Variance calculation (actual - predicted)
        // Positive variance = actual exceeded prediction
        const tdlVariance = (f.actualTDL != null && f.predictedTDL != null)
          ? Number(f.actualTDL) - Number(f.predictedTDL)
          : null;
        
        const dloVariance = (f.actualDLO != null && f.predictedDLO != null)
          ? Number(f.actualDLO) - Number(f.predictedDLO)
          : null;
        
        // Calculate accuracy for this specific forecast
        let accuracy = 0;
        let count = 0;
        
        if (f.actualTDL != null && f.predictedTDL != null && !isNaN(Number(f.actualTDL)) && !isNaN(Number(f.predictedTDL))) {
          accuracy += calculateAccuracy(Number(f.predictedTDL), Number(f.actualTDL));
          count++;
        }
        
        if (f.actualDLO != null && f.predictedDLO != null && !isNaN(Number(f.actualDLO)) && !isNaN(Number(f.predictedDLO))) {
          accuracy += calculateAccuracy(Number(f.predictedDLO), Number(f.actualDLO));
          count++;
        }
        
        const avgAccuracy = count > 0 ? accuracy / count : 0;
        
        return {
          id: f.id,
          jobId: f.jobId,
          jobName: job?.jobName || 'Unknown',
          builderName: builder?.name || 'Unknown',
          predictedTDL: f.predictedTDL != null ? Number(f.predictedTDL) : null,
          actualTDL: f.actualTDL != null ? Number(f.actualTDL) : null,
          tdlVariance,
          predictedDLO: f.predictedDLO != null ? Number(f.predictedDLO) : null,
          actualDLO: f.actualDLO != null ? Number(f.actualDLO) : null,
          dloVariance,
          accuracy: avgAccuracy,
          date: job?.completedDate ? new Date(job.completedDate) : null,
        };
      })
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
      })
      .slice(0, 20);
  }, [forecastsWithData, jobsMap, builders]);

  // Phase 6 - DOCUMENT: Compliance metrics calculation
  // Tracks Minnesota code compliance rates over time
  const monthlyComplianceData = useMemo(() => {
    return monthsInRange.map(month => {
      const jobsInMonth = jobsInRange.filter(j => {
        if (!j.completedDate) return false;
        const jobMonth = format(new Date(j.completedDate), 'MMM yyyy');
        return jobMonth === month;
      });

      const evaluatedJobs = jobsInMonth.filter(j => 
        j.complianceStatus === 'compliant' || j.complianceStatus === 'non-compliant'
      );
      const compliantJobs = jobsInMonth.filter(j => j.complianceStatus === 'compliant');
      const nonCompliantJobs = jobsInMonth.filter(j => j.complianceStatus === 'non-compliant');

      const totalEvaluated = evaluatedJobs.length;
      const compliantRate = totalEvaluated > 0 
        ? (compliantJobs.length / totalEvaluated * 100) 
        : 0;
      const nonCompliantRate = totalEvaluated > 0 
        ? (nonCompliantJobs.length / totalEvaluated * 100) 
        : 0;

      return {
        month,
        totalEvaluated,
        compliant: compliantJobs.length,
        nonCompliant: nonCompliantJobs.length,
        compliantRate,
        nonCompliantRate,
      };
    });
  }, [monthsInRange, jobsInRange]);

  // Phase 6 - DOCUMENT: Top violations analysis
  // Identifies most common code compliance failures
  const topViolationsData = useMemo(() => {
    const nonCompliantJobs = jobsInRange.filter(j => j.complianceStatus === 'non-compliant');
    
    const violations: Record<string, { frequency: number; totalOverage: number; count: number }> = {};
    
    nonCompliantJobs.forEach(job => {
      if (job.tdlResult && job.tdlLimit) {
        const tdlValue = Number(job.tdlResult);
        const tdlLimitValue = Number(job.tdlLimit);
        if (!isNaN(tdlValue) && !isNaN(tdlLimitValue) && tdlValue > tdlLimitValue) {
          if (!violations['TDL']) violations['TDL'] = { frequency: 0, totalOverage: 0, count: 0 };
          violations['TDL'].frequency++;
          violations['TDL'].totalOverage += (tdlValue - tdlLimitValue);
          violations['TDL'].count++;
        }
      }
      
      if (job.dloResult && job.dloLimit) {
        const dloValue = Number(job.dloResult);
        const dloLimitValue = Number(job.dloLimit);
        if (!isNaN(dloValue) && !isNaN(dloLimitValue) && dloValue > dloLimitValue) {
          if (!violations['DLO']) violations['DLO'] = { frequency: 0, totalOverage: 0, count: 0 };
          violations['DLO'].frequency++;
          violations['DLO'].totalOverage += (dloValue - dloLimitValue);
          violations['DLO'].count++;
        }
      }
    });

    return Object.entries(violations)
      .map(([metric, data]) => ({
        metric,
        frequency: data.frequency,
        avgOverage: data.count > 0 ? data.totalOverage / data.count : 0,
        severity: data.frequency > 10 ? 'high' : data.frequency > 5 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }, [jobsInRange]);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetryJobs = useCallback(() => refetchJobs(), [refetchJobs]);
  const handleRetryItems = useCallback(() => refetchItems(), [refetchItems]);
  const handleRetryPhotos = useCallback(() => refetchPhotos(), [refetchPhotos]);
  const handleRetryBuilders = useCallback(() => refetchBuilders(), [refetchBuilders]);
  const handleRetryForecasts = useCallback(() => refetchForecasts(), [refetchForecasts]);
  const handleNavigateToBuilders = useCallback(() => setLocation("/builders"), [setLocation]);

  // Phase 2 - BUILD: Error state components with retry buttons
  if (jobsError || itemsError || photosError || buildersError || forecastsError) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold mb-6" data-testid="text-page-title">Analytics</h1>
        
        {jobsError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-jobs">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Jobs Data</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch jobs data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryJobs}
                data-testid="button-retry-jobs"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {itemsError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-items">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Checklist Items</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch checklist items. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryItems}
                data-testid="button-retry-items"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {photosError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-photos">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Photos Data</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch photos data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryPhotos}
                data-testid="button-retry-photos"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {buildersError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-builders">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Builders Data</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch builders data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryBuilders}
                data-testid="button-retry-builders"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {forecastsError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-forecasts">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Forecasts Data</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch forecasts data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryForecasts}
                data-testid="button-retry-forecasts"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Analytics</h1>
              <p className="text-muted-foreground">Performance insights and key metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                data-testid="date-range-picker"
              />
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
                data-testid="button-export-analytics"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Phase 2 - BUILD: Summary metrics with skeleton loaders */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-total-inspections">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Inspections</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" data-testid="skeleton-total-inspections" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-total-inspections">
                        {totalInspections}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <div className="p-3 rounded-md bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-inspection-time">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Inspection Time</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" data-testid="skeleton-avg-time" />
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

            <Card data-testid="card-completion-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" data-testid="skeleton-completion-rate" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-completion-rate">
                        {safeToFixed(completionRate, 1)}%
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

            <Card data-testid="card-avg-items">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Items/Inspection</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" data-testid="skeleton-avg-items" />
                    ) : (
                      <p className="text-3xl font-bold" data-testid="text-avg-items">
                        {safeToFixed(avgItemsPerInspection, 1)}
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

          {/* Phase 2 - BUILD: Charts with skeleton loaders and empty states */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-testid="card-inspection-volume">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Inspection Volume Trend
                </CardTitle>
                <CardDescription>Completed inspections over selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartLoadingFallback />
                ) : monthlyInspectionData.some(d => d.inspections > 0) ? (
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
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-inspection-volume">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No inspection data</p>
                    <p className="text-sm mt-2">Complete inspections to see volume trends</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-photo-tags">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photo Tag Analysis
                </CardTitle>
                <CardDescription>Most common tags used in photo documentation</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartLoadingFallback />
                ) : photoTagData.length > 0 ? (
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
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-photo-tags">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No photo tags</p>
                    <p className="text-sm mt-2">Tag photos to see usage analytics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-status-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inspection Status Breakdown
              </CardTitle>
              <CardDescription>Status distribution over selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingFallback />
              ) : statusBreakdownData.some(d => d.Scheduled + d.Done + d.Failed + d.Reschedule > 0) ? (
                <ResponsiveContainer width="100%" height={300} data-testid="chart-status-breakdown">
                  <AreaChart data={statusBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Scheduled"
                      stackId="1"
                      stroke={STATUS_COLORS.scheduled}
                      fill={STATUS_COLORS.scheduled}
                    />
                    <Area
                      type="monotone"
                      dataKey="Done"
                      stackId="1"
                      stroke={STATUS_COLORS.done}
                      fill={STATUS_COLORS.done}
                    />
                    <Area
                      type="monotone"
                      dataKey="Failed"
                      stackId="1"
                      stroke={STATUS_COLORS.failed}
                      fill={STATUS_COLORS.failed}
                    />
                    <Area
                      type="monotone"
                      dataKey="Reschedule"
                      stackId="1"
                      stroke={STATUS_COLORS.reschedule}
                      fill={STATUS_COLORS.reschedule}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-status-breakdown">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No status data</p>
                  <p className="text-sm mt-2">Schedule jobs to see status breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-common-issues">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Common Issues
              </CardTitle>
              <CardDescription>Top 10 most frequently failed items from completed inspections</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartLoadingFallback />
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
                <ChartLoadingFallback />
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
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-issues-trend">
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
            
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card data-testid="card-compliance-trends">
                <CardHeader>
                  <CardTitle>Compliance Pass-Rate Trends</CardTitle>
                  <CardDescription>Monthly pass rates for selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <ChartLoadingFallback />
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
                    <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-compliance-trends">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No compliance data available</p>
                      <p className="text-sm mt-2">Jobs need compliance evaluation to show trends</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-top-violations">
                <CardHeader>
                  <CardTitle>Most Common Code Violations</CardTitle>
                  <CardDescription>Frequency of compliance failures</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <ChartLoadingFallback />
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
                                  <p className="font-semibold">{data.metric ?? 'Unknown'}</p>
                                  <p className="text-sm">Frequency: {data.frequency ?? 0}</p>
                                  <p className="text-sm">Avg Overage: {typeof data.avgOverage === 'number' && !isNaN(data.avgOverage) ? safeToFixed(data.avgOverage, 2) : '0.00'}</p>
                                  <p className="text-sm text-muted-foreground capitalize">Severity: {data.severity ?? 'unknown'}</p>
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
                    <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-top-violations">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No violation data available</p>
                      <p className="text-sm mt-2">Non-compliant jobs will show violation patterns here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Builder Performance Section */}
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
                <Button variant="outline" onClick={handleNavigateToBuilders} data-testid="button-view-builders">
                  View All Builders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" data-testid="skeleton-builder-performance" />
              ) : builderStats.length > 0 ? (
                <div className="space-y-8">
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
                          <TableHead className="text-center">Trend</TableHead>
                          <TableHead className="text-right">Tier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBuilders.map((stat, index) => {
                          const tier = getPerformanceTier(stat.completionRate, stat.avgAccuracy);
                          return (
                            <TableRow key={stat.builder.id}>
                              <TableCell className="font-medium">
                                {index === topPerformerIndex && <Trophy className="h-4 w-4 text-yellow-500" />}
                              </TableCell>
                              <TableCell className="font-medium">{stat.builder.name}</TableCell>
                              <TableCell className="text-center">{stat.totalJobs}</TableCell>
                              <TableCell className="text-center">{stat.completedJobs}</TableCell>
                              <TableCell className="text-center">{safeToFixed(stat.completionRate, 1)}%</TableCell>
                              <TableCell className="text-center">{safeToFixed(stat.avgAccuracy, 1)}%</TableCell>
                              <TableCell className="text-center">{safeToFixed(stat.complianceRate, 1)}%</TableCell>
                              <TableCell className="text-center">{stat.avgInspectionTime > 0 ? Math.round(stat.avgInspectionTime) : 'N/A'}</TableCell>
                              <TableCell className="text-center">{stat.commonIssuesCount}</TableCell>
                              <TableCell className="text-center">{getTrendIcon(stat, jobs)}</TableCell>
                              <TableCell className="text-right">
                                <Badge className={tier.color}>{tier.label}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top 5 Builders by Completion Rate</h3>
                      {builderComparisonData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300} data-testid="chart-builder-comparison">
                          <BarChart data={builderComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Completion Rate" fill="#2E5BBA" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Forecast Accuracy" fill="#28A745" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No builder data</p>
                          <p className="text-sm mt-2">Add builders to see comparisons</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Builder Activity Trend</h3>
                      {topBuilders.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300} data-testid="chart-builder-trend">
                          <LineChart data={builderTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {topBuilders.map((builder, idx) => (
                              <Line
                                key={builder.builder.id}
                                type="monotone"
                                dataKey={builder.builder.name}
                                stroke={ISSUE_COLORS[idx % ISSUE_COLORS.length]}
                                strokeWidth={2}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No activity data</p>
                          <p className="text-sm mt-2">Complete jobs to see builder trends</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-builder-performance">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No builder data available</p>
                  <p className="text-sm mt-2">Add builders to see performance analytics</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast Accuracy Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Forecast Accuracy</h2>
            
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card data-testid="card-overall-accuracy">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-10 w-20" data-testid="skeleton-overall-accuracy" />
                  ) : (
                    <div className="space-y-1">
                      <p className="text-3xl font-bold" data-testid="text-overall-accuracy">
                        {safeToFixed(overallAccuracy, 1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Based on {forecastsWithData.length} forecasts
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-tdl-accuracy">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">TDL Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-10 w-20" data-testid="skeleton-tdl-accuracy" />
                  ) : (
                    <div className="space-y-1">
                      <p className="text-3xl font-bold" data-testid="text-tdl-accuracy">
                        {safeToFixed(tdlAccuracy, 1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {forecastsWithTDL.length} predictions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-dlo-accuracy">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">DLO Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-10 w-20" data-testid="skeleton-dlo-accuracy" />
                  ) : (
                    <div className="space-y-1">
                      <p className="text-3xl font-bold" data-testid="text-dlo-accuracy">
                        {safeToFixed(dloAccuracy, 1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {forecastsWithDLO.length} predictions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-forecast-details">
              <CardHeader>
                <CardTitle>Recent Forecast Details</CardTitle>
                <CardDescription>Last 20 forecasts with accuracy breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" data-testid="skeleton-forecast-details" />
                ) : detailedForecasts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table data-testid="table-forecast-details">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Builder</TableHead>
                          <TableHead className="text-center">Predicted TDL</TableHead>
                          <TableHead className="text-center">Actual TDL</TableHead>
                          <TableHead className="text-center">Variance</TableHead>
                          <TableHead className="text-center">Predicted DLO</TableHead>
                          <TableHead className="text-center">Actual DLO</TableHead>
                          <TableHead className="text-center">Variance</TableHead>
                          <TableHead className="text-center">Accuracy</TableHead>
                          <TableHead className="text-center">Date</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedForecasts.map((forecast) => (
                          <TableRow key={forecast.id}>
                            <TableCell className="font-medium">{forecast.jobName}</TableCell>
                            <TableCell>{forecast.builderName}</TableCell>
                            <TableCell className="text-center">
                              {forecast.predictedTDL !== null ? safeToFixed(forecast.predictedTDL, 2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {forecast.actualTDL !== null ? safeToFixed(forecast.actualTDL, 2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.tdlVariance !== null ? (
                                <span className={forecast.tdlVariance > 0 ? 'text-destructive' : 'text-success'}>
                                  {forecast.tdlVariance > 0 ? '+' : ''}{safeToFixed(forecast.tdlVariance, 2)}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.predictedDLO !== null ? safeToFixed(forecast.predictedDLO, 2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {forecast.actualDLO !== null ? safeToFixed(forecast.actualDLO, 2) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {forecast.dloVariance !== null ? (
                                <span className={forecast.dloVariance > 0 ? 'text-destructive' : 'text-success'}>
                                  {forecast.dloVariance > 0 ? '+' : ''}{safeToFixed(forecast.dloVariance, 2)}
                                </span>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${getAccuracyColor(forecast.accuracy)}`}>
                                {safeToFixed(forecast.accuracy, 1)}%
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
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-forecast-details">
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

      {/* Phase 2 - BUILD: Export dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        jobIds={jobsInRange.map(j => j.id)}
        title="Export Analytics"
      />
    </div>
  );
}

// Phase 2 - BUILD: Wrap with ErrorBoundary for production robustness
export default function Analytics() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6">
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Analytics Error</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400">
              An unexpected error occurred while loading analytics. Please refresh the page to try again.
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <AnalyticsContent />
    </ErrorBoundary>
  );
}
