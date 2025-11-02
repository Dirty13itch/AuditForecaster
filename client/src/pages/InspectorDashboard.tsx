import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Calendar,
  Camera,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";

interface Job {
  id: string;
  name: string;
  address: string;
  contractor: string;
  status: string;
  inspectionType: string;
  scheduledDate: string;
  builderId?: string;
}

interface DayJobsData {
  date: string;
  count: number;
  jobs: Job[];
}

interface InspectorSummary {
  todayJobs: {
    total: number;
    scheduled: number;
    done: number;
    failed: number;
    jobs: Job[];
  };
  weekJobs: {
    total: number;
    byDay: DayJobsData[];
  };
  thisWeekRange: {
    start: string;
    end: string;
    includesNextMonday: boolean;
  };
  upcomingJobs: Job[];
  offlineQueueCount: number;
  unsyncedPhotoCount: number;
}

export default function InspectorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Create stable "today" ISO string that only changes when day changes
  const todayIso = useMemo(() => {
    return startOfDay(new Date()).toISOString();
  }, []); // Empty deps = only computed once per mount

  // Fetch inspector summary data
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery<InspectorSummary>({
    queryKey: ["/api/dashboard/inspector-summary", { 
      inspectorId: user?.id, 
      date: todayIso  // ✅ Stable across renders
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        inspectorId: user?.id || '',
        date: todayIso  // ✅ Use same stable value
      });
      const response = await fetch(`/api/dashboard/inspector-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard summary');
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Handle sync action
  const handleSync = () => {
    toast({
      title: "Sync triggered",
      description: "Syncing your data with the server...",
    });
    refetch();
  };

  // Get status color and icon
  const getStatusIndicator = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-success" };
      case "failed":
        return { icon: <XCircle className="h-4 w-4" />, color: "text-destructive" };
      case "in_progress":
      case "in progress":
        return { icon: <Clock className="h-4 w-4" />, color: "text-primary" };
      default:
        return { icon: <Clock className="h-4 w-4" />, color: "text-muted-foreground" };
    }
  };

  // Get action button for job card
  const getJobAction = (job: Job) => {
    const status = job.status.toLowerCase();
    if (status === "done") {
      return {
        label: "View Report",
        testId: `button-view-report-${job.id}`,
        href: `/jobs/${job.id}`,
      };
    }
    if (status === "in_progress" || status === "in progress") {
      return {
        label: "Continue",
        testId: `button-continue-job-${job.id}`,
        href: `/inspection/${job.id}`,
      };
    }
    return {
      label: "Start Inspection",
      testId: `button-start-job-${job.id}`,
      href: `/inspection/${job.id}`,
    };
  };

  // Format date for week carousel
  const formatDayDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "EEE M/d");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        {/* Hero skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>

        {/* Week carousel skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="min-w-[200px] h-32" />
            ))}
          </div>
        </div>

        {/* Today's jobs skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
            <p className="text-muted-foreground text-center">
              We couldn't load your dashboard data. Please try again.
            </p>
            <Button data-testid="button-retry-dashboard" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayScheduled = summary?.todayJobs.scheduled || 0;
  const todayDone = summary?.todayJobs.done || 0;
  const todayFailed = summary?.todayJobs.failed || 0;
  const todayTotal = summary?.todayJobs.total || 0;
  const offlineCount = summary?.offlineQueueCount || 0;

  // Get today's date for highlighting in carousel
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Hero Section */}
      <section data-testid="section-inspector-hero" className="space-y-4">
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {user?.firstName || "Inspector"}
        </h1>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-2xl font-semibold" data-testid="text-today-summary">
                {todayScheduled} {todayScheduled === 1 ? "job" : "jobs"} scheduled today
              </p>
              
              {(todayDone > 0 || todayFailed > 0) && (
                <div className="flex flex-wrap gap-2">
                  {todayDone > 0 && (
                    <Badge variant="default" className="bg-success hover:bg-success/90">
                      Done: {todayDone}
                    </Badge>
                  )}
                  {todayFailed > 0 && (
                    <Badge variant="destructive">
                      Failed: {todayFailed}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section data-testid="section-quick-actions" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/field-day?view=today">
          <Button 
            data-testid="button-start-field-day" 
            size="lg" 
            className="w-full min-h-14"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Start Field Day
          </Button>
        </Link>

        <Link href="/photos">
          <Button 
            data-testid="button-capture-photos" 
            size="lg" 
            variant="outline"
            className="w-full min-h-14"
          >
            <Camera className="mr-2 h-5 w-5" />
            Capture Photos
          </Button>
        </Link>

        <Button 
          data-testid="button-sync-now" 
          size="lg" 
          variant="outline"
          onClick={handleSync}
          className="w-full min-h-14 relative"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Sync Now
          {offlineCount > 0 && (
            <Badge 
              data-testid="badge-offline-count"
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {offlineCount}
            </Badge>
          )}
        </Button>
      </section>

      {/* Smart Week Carousel */}
      <section data-testid="section-smart-week" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">This Week</h2>
          {summary?.thisWeekRange && (
            <p className="text-muted-foreground">
              {formatDayDate(summary.thisWeekRange.start)} - {formatDayDate(summary.thisWeekRange.end)}
              {summary.thisWeekRange.includesNextMonday && " (includes next week)"}
            </p>
          )}
        </div>

        {summary?.weekJobs.total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs this week</p>
              <Link href="/schedule">
                <Button variant="outline">View Calendar</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div 
            data-testid="carousel-week-days"
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin"
          >
            {summary?.weekJobs.byDay.map((dayData) => {
              const isToday = dayData.date === today;
              const isNextWeek = summary.thisWeekRange.includesNextMonday && 
                                parseISO(dayData.date) > parseISO(summary.thisWeekRange.start).setDate(
                                  parseISO(summary.thisWeekRange.start).getDate() + 6
                                );

              return (
                <Link 
                  key={dayData.date}
                  href={`/field-day?date=${dayData.date}`}
                >
                  <Card 
                    className={`min-w-[240px] snap-start cursor-pointer hover-elevate ${
                      isToday ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle 
                          className="text-lg" 
                          data-testid={`text-day-${dayData.date}`}
                        >
                          {formatDayDate(dayData.date)}
                        </CardTitle>
                        <Badge 
                          data-testid={`badge-day-count-${dayData.date}`}
                          variant={isToday ? "default" : "secondary"}
                        >
                          {dayData.count} {dayData.count === 1 ? "job" : "jobs"}
                        </Badge>
                      </div>
                      {isNextWeek && (
                        <Badge 
                          data-testid="badge-next-week"
                          variant="outline"
                          className="w-fit text-xs"
                        >
                          Next Week
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {dayData.jobs.slice(0, 3).map((job) => (
                          <div 
                            key={job.id}
                            className="truncate text-muted-foreground"
                          >
                            • {job.address}
                          </div>
                        ))}
                        {dayData.count > 3 && (
                          <div className="text-muted-foreground font-medium">
                            +{dayData.count - 3} more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's Jobs */}
      <section data-testid="section-today-jobs" className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Today's Jobs</h2>
          {todayTotal > 0 && (
            <Badge variant="secondary">{todayTotal}</Badge>
          )}
        </div>

        {todayTotal === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No jobs scheduled for today</p>
              <Link href="/schedule" data-testid="link-view-schedule">
                <Button variant="outline">View Schedule</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {summary?.todayJobs.jobs.map((job) => {
              const statusInfo = getStatusIndicator(job.status);
              const action = getJobAction(job);

              return (
                <Card 
                  key={job.id}
                  data-testid={`card-job-${job.id}`}
                  className="hover-elevate cursor-pointer min-h-[100px]"
                >
                  <CardContent className="p-4 md:max-w-[600px]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <h3 className="text-lg font-bold leading-tight">{job.address}</h3>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{job.contractor}</p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{job.inspectionType}</Badge>
                          
                          <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="text-sm capitalize">{job.status}</span>
                          </div>

                          {job.scheduledDate && (
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(job.scheduledDate), "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link href={action.href}>
                        <Button 
                          size="sm"
                          data-testid={action.testId}
                          className="flex-shrink-0"
                        >
                          {action.label}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
