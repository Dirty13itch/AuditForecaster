import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Clock, PlayCircle, Loader2, ChevronDown, WifiOff, Wifi, ChevronLeft, ChevronRight, Download, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { JobListLoadingFallback, CalendarEventsLoadingFallback } from "@/components/LoadingStates";
import { 
  FadeIn, 
  FadeInUp, 
  StaggerContainer, 
  StaggerItem,
  HoverScale,
  ErrorShake
} from "@/components/ui/animated-wrapper";
import { useDebounce } from "@/hooks/useAnimation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { VirtualList } from "@/components/ui/virtual-grid";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder, GoogleEvent } from "@shared/schema";
import type { PaginatedResult } from "@shared/pagination";
import JobCard from "@/components/JobCard";
import JobDialog from "@/components/JobDialog";
import ExportDialog from "@/components/ExportDialog";
import { QuickReportDialog } from "@/components/QuickReportDialog";
import { ReportPreview } from "@/components/ReportPreview";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { indexedDB } from "@/utils/indexedDB";
import { syncQueue } from "@/utils/syncQueue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Status colors for job states
const STATUS_COLORS = {
  scheduled: "warning",
  done: "success",
  failed: "secondary",
  reschedule: "info",
} as const;

// Default pagination sizes
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Sync check interval (milliseconds)
const SYNC_CHECK_INTERVAL = 5000;

// Skeleton counts for loading states
const SKELETON_COUNTS = {
  plannedEvents: 2,
  todaysJobs: 3,
  completedToday: 2,
  allJobs: 5,
} as const;

// Pagination hook to manage URL state
function usePagination(key: string, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  
  const page = parseInt(searchParams.get(`${key}_page`) || '1');
  const pageSize = parseInt(searchParams.get(`${key}_size`) || defaultPageSize.toString());
  
  const setPage = (newPage: number) => {
    searchParams.set(`${key}_page`, newPage.toString());
    navigate(`${location.split('?')[0]}?${searchParams.toString()}`);
  };
  
  const setPageSize = (newSize: number) => {
    searchParams.set(`${key}_size`, newSize.toString());
    searchParams.set(`${key}_page`, '1'); // Reset to first page when changing size
    navigate(`${location.split('?')[0]}?${searchParams.toString()}`);
  };
  
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    setPage,
    setPageSize
  };
}

// Pagination controls component
function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {total} items
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Items per page:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(parseInt(v))}>
            <SelectTrigger className="w-20" data-testid="select-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()} data-testid={`option-page-size-${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          data-testid="button-prev-page"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <Button
                key={i}
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                data-testid={`button-page-${pageNum}`}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          data-testid="button-next-page"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: JobsContent component wrapped in ErrorBoundary at export
function JobsContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncJobs, setPendingSyncJobs] = useState<Set<number>>(new Set());
  
  const userRole = (user?.role as UserRole) || 'inspector';
  const canCreateJobs = userRole === 'admin' || userRole === 'inspector';

  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [selectedJobForReport, setSelectedJobForReport] = useState<Job | null>(null);
  const [reportPreviewJobId, setReportPreviewJobId] = useState<string | null>(null);
  
  // Pagination state for different sections
  const todaysPagination = usePagination('today', 25);
  const completedPagination = usePagination('completed', 25);
  const allJobsPagination = usePagination('all', 25);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Syncing pending changes...",
      });
      // Trigger background sync
      syncQueue.processQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working offline",
        description: "Your changes will be synced when you're back online",
        variant: "default",
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback prevents recreation on every render
   * 
   * Business Logic - Offline Sync Tracking:
   * - Scans the offline sync queue for pending job mutations
   * - Extracts job IDs from queued API calls (e.g., /api/jobs/123)
   * - Updates UI to show "syncing" badges on affected jobs
   * - Runs every 5 seconds (SYNC_CHECK_INTERVAL) to keep UI updated
   * - Critical for field operations where inspectors work offline
   */
  const checkPendingSync = useCallback(async () => {
    const queue = await syncQueue.getQueue();
    const pendingJobIds = new Set<number>();
    
    for (const item of queue) {
      if (item.url.includes('/api/jobs/')) {
        const match = item.url.match(/\/api\/jobs\/(\d+)/);
        if (match) {
          pendingJobIds.add(parseInt(match[1]));
        }
      }
    }
    
    setPendingSyncJobs(pendingJobIds);
  }, []);

  // Check pending sync status for jobs
  useEffect(() => {
    checkPendingSync();
    // Phase 3 - OPTIMIZE: Use constant for interval duration
    const interval = setInterval(checkPendingSync, SYNC_CHECK_INTERVAL);
    
    // Phase 3 - OPTIMIZE: Cleanup function prevents memory leak
    return () => clearInterval(interval);
  }, [checkPendingSync]);

  // Phase 5 - HARDEN: Fetch planned events (today's unconverted Google calendar events)
  // retry: 2 added for network resilience
  const { 
    data: plannedEvents = [], 
    isLoading: isLoadingPlanned,
    error: plannedEventsError,
    refetch: refetchPlannedEvents
  } = useQuery<GoogleEvent[]>({
    queryKey: ["/api/google-events/today"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch today's active jobs with pagination
  // retry: 2 added for network resilience
  const { 
    data: todaysJobsData, 
    isLoading: isLoadingTodays,
    error: todaysJobsError,
    refetch: refetchTodaysJobs
  } = useQuery<PaginatedResult<Job>>({
    queryKey: ["/api/jobs/today", { limit: todaysPagination.pageSize, offset: todaysPagination.offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: todaysPagination.pageSize.toString(),
        offset: todaysPagination.offset.toString(),
      });
      const response = await fetch(`/api/jobs/today?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch today's jobs");
      }
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch today's completed jobs with pagination
  // retry: 2 added for network resilience
  const { 
    data: completedTodayData, 
    isLoading: isLoadingCompleted,
    error: completedTodayError,
    refetch: refetchCompletedToday
  } = useQuery<PaginatedResult<Job>>({
    queryKey: ["/api/jobs/completed-today", { limit: completedPagination.pageSize, offset: completedPagination.offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: completedPagination.pageSize.toString(),
        offset: completedPagination.offset.toString(),
      });
      const response = await fetch(`/api/jobs/completed-today?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch completed jobs");
      }
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch all jobs with standard pagination
  // retry: 2 added for network resilience
  const { 
    data: allJobsData, 
    isLoading: isLoadingAll,
    error: allJobsError,
    refetch: refetchAllJobs
  } = useQuery<PaginatedResult<Job>>({
    queryKey: ["/api/jobs", { limit: allJobsPagination.pageSize, offset: allJobsPagination.offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: allJobsPagination.pageSize.toString(),
        offset: allJobsPagination.offset.toString(),
      });
      const response = await fetch(`/api/jobs?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch all jobs");
      }
      return response.json();
    },
    retry: 2,
  });

  // Extract data and pagination info
  const todaysJobs = todaysJobsData?.data || [];
  const todaysPaginationInfo = todaysJobsData?.pagination;
  const completedToday = completedTodayData?.data || [];
  const completedPaginationInfo = completedTodayData?.pagination;
  const allJobs = allJobsData?.data || [];
  const allJobsPaginationInfo = allJobsData?.pagination;

  // Phase 5 - HARDEN: Fetch builders for job cards
  // retry: 2 added for network resilience
  const { 
    data: builders = [],
    error: buildersError,
    refetch: refetchBuilders
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch all inspectors for assignment (admin only)
  // retry: 2 added for network resilience
  const { 
    data: inspectors = [],
    error: inspectorsError,
    refetch: refetchInspectors
  } = useQuery<Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string;
  }>>({
    queryKey: ["/api/users/inspectors"],
    enabled: userRole === 'admin',
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch inspector workload (next 30 days - admin only)
  // retry: 2 added for network resilience
  const { 
    data: inspectorWorkload = [],
    error: workloadError,
    refetch: refetchWorkload
  } = useQuery<Array<{
    inspectorId: string;
    inspectorName: string;
    jobCount: number;
  }>>({
    queryKey: ["/api/inspectors/workload"],
    queryFn: async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      const response = await fetch(`/api/inspectors/workload?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch inspector workload");
      }
      
      return response.json();
    },
    enabled: userRole === 'admin',
    retry: 2,
  });

  /**
   * Assign Job to Inspector Mutation - Admin-only operation
   * 
   * Business Logic:
   * - Updates job.assignedTo field to the selected inspector
   * - Invalidates multiple caches to ensure UI consistency:
   *   * All job lists (today, completed, all) - shows new assignment
   *   * Inspector workload - updates their job count
   * - Uses refetchType: 'active' for immediate UI update
   * - Critical for workload balancing across inspectors
   */
  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, inspectorId }: { jobId: string; inspectorId: string }) => {
      // BUGFIX: Use PUT endpoint which now handles inspectorId → assignedTo mapping
      console.log('[Jobs] Assigning inspector:', { jobId, inspectorId });
      const result = await apiRequest("PUT", `/api/jobs/${jobId}`, { inspectorId });
      console.log('[Jobs] Assignment API response:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('[Jobs] Assignment mutation success:', data);
      // Invalidate all job-related queries with improved predicate
      await Promise.all([
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === "/api/jobs" || 
                   key === "/api/jobs/today" || 
                   key === "/api/jobs/completed-today";
          },
          refetchType: 'active' // Force immediate refetch
        }),
        queryClient.invalidateQueries({ 
          queryKey: ["/api/inspectors/workload"],
          refetchType: 'active'
        }),
      ]);
      
      toast({
        title: "Job Assigned",
        description: `Job assigned successfully`,
      });
    },
    onError: (error: Error) => {
      console.error('[Jobs] Assignment mutation error:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign job",
        variant: "destructive",
      });
    },
  });

  // Start job from calendar event mutation
  const startJobMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // Use apiRequest which handles CSRF tokens properly
      const response = await apiRequest("POST", "/api/jobs/from-event", { eventId });
      
      // Check the response status
      if (!response.ok) {
        const data = await response.json();
        
        // Handle 409 Conflict - job already exists
        if (response.status === 409) {
          return { isDuplicate: true, existingJob: data.job };
        }
        
        // Handle other errors
        throw new Error(data.message || "Failed to create job");
      }
      
      // Success - return the newly created job
      const data = await response.json();
      return { isDuplicate: false, job: data };
    },
    onSuccess: async (data: { isDuplicate: boolean; existingJob?: Job; job?: Job }) => {
      // Invalidate cache for Google events FIRST to immediately remove the converted event
      // This ensures the UI updates to remove the event from "Planned Events"
      await Promise.all([
        // Force refetch of today's Google calendar events
        queryClient.invalidateQueries({ 
          queryKey: ["/api/google-events/today"],
          exact: true,
          refetchType: 'active' // Force immediate refetch
        }),
        // Also invalidate any other potential google events queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key?.includes("/api/google-events");
          },
          refetchType: 'active'
        })
      ]);
      
      // Then invalidate all job-related queries to show the new job
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "/api/jobs" || 
                 key === "/api/jobs/today" || 
                 key === "/api/jobs/completed-today";
        },
        refetchType: 'active' // Force immediate refetch
      });
      
      if (data.isDuplicate && data.existingJob) {
        toast({
          title: "Job Already Exists",
          description: "This calendar event was already converted to a job. Opening it now...",
        });
        navigate(`/inspection/${data.existingJob.id}`);
      } else if (data.job) {
        toast({
          title: "Job Created",
          description: `Job "${data.job.name}" has been created successfully`,
        });
        navigate(`/inspection/${data.job.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create job",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/jobs", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create job");
      }
      return response.json();
    },
    onSuccess: async (newJob) => {
      // Invalidate and refetch all job-related queries immediately
      // This ensures the cache is marked stale and fetches fresh data
      
      // Invalidate all variations of the /api/jobs query (with different pagination params)
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === "/api/jobs" || 
                 key === "/api/jobs/today" || 
                 key === "/api/jobs/completed-today";
        },
        refetchType: 'active' // Force immediate refetch of active queries
      });
      
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      setIsJobDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold" data-testid="heading-jobs">Jobs</h1>
          <Badge variant={isOnline ? "success" : "secondary"} className="flex items-center gap-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsExportDialogOpen(true)} 
            data-testid="button-export-jobs"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canCreateJobs && (
            <Button onClick={() => setIsJobDialogOpen(true)} data-testid="button-create-job">
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          )}
        </div>
      </div>

      {/* Job sections with pagination */}
      <Accordion type="multiple" defaultValue={["todays-work", "all-jobs"]} className="space-y-4">
        {/* Section 1: Planned Events (Calendar) */}
        {plannedEvents.length > 0 && (
          <AccordionItem value="planned-events" className="border rounded-lg">
            <AccordionTrigger 
              className="px-6 hover:no-underline hover-elevate"
              data-testid="accordion-trigger-planned-events"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Planned Events</h2>
                  <p className="text-sm text-muted-foreground">
                    From your calendar ({plannedEvents.length} events)
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              {isLoadingPlanned ? (
                <CalendarEventsLoadingFallback count={SKELETON_COUNTS.plannedEvents} />
              ) : plannedEventsError ? (
                <Alert variant="destructive" data-testid="alert-error-planned-events">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Calendar Events</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{(plannedEventsError as Error).message || 'Failed to load planned events'}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchPlannedEvents()}
                      data-testid="button-retry-planned-events"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <StaggerContainer className="space-y-3">
                  {plannedEvents.map((event: GoogleEvent) => (
                    <StaggerItem key={event.id}>
                      <Card 
                        className="hover-elevate cursor-pointer"
                        data-testid={`card-event-${event.id}`}
                      >
                      <CardHeader className="flex flex-row items-start justify-between space-y-0">
                        <div className="flex-1">
                          <CardTitle className="text-base" data-testid="text-event-title">
                            {event.title || event.summary || "Untitled Event"}
                          </CardTitle>
                          <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(event.startTime), "h:mm a")}
                              {event.endTime && ` - ${format(new Date(event.endTime), "h:mm a")}`}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant="secondary"
                            className="bg-warning/10 text-warning hover:bg-warning/20"
                            data-testid="badge-event-source"
                          >
                            {event.calendarName}
                          </Badge>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              startJobMutation.mutate(event.id);
                            }}
                            disabled={startJobMutation.isPending}
                            variant="outline"
                            size="sm"
                            data-testid={`button-start-job-${event.id}`}
                          >
                            {startJobMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <PlayCircle className="w-4 h-4 mr-2" />
                            )}
                            Start Job
                          </Button>
                        </div>
                      </CardHeader>
                      {event.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground" data-testid="text-event-description">
                            {event.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Section 2: Today's Work - Active Jobs */}
        <AccordionItem value="todays-work" className="border rounded-lg">
          <AccordionTrigger 
            className="px-6 hover:no-underline hover-elevate"
            data-testid="accordion-trigger-todays-work"
          >
            <div className="flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-info" />
              <div className="text-left">
                <h2 className="text-lg font-semibold">Today's Work</h2>
                <p className="text-sm text-muted-foreground">
                  Active jobs scheduled for today ({todaysPaginationInfo?.total || 0} total)
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            {isLoadingTodays ? (
              <JobListLoadingFallback count={SKELETON_COUNTS.todaysJobs} />
            ) : todaysJobsError ? (
              <Alert variant="destructive" data-testid="alert-error-todays-jobs">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Today's Jobs</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{(todaysJobsError as Error).message || "Failed to load today's jobs"}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTodaysJobs()}
                    data-testid="button-retry-todays-jobs"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : todaysJobs.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-todays-jobs">
                <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active jobs scheduled for today</p>
              </div>
            ) : (
              <>
                <VirtualList
                  items={todaysJobs}
                  height="500px"
                  estimateSize={120}
                  renderItem={(job) => (
                    <div className="mb-3">
                      <JobCard
                        {...job}
                        builders={builders}
                        inspectors={inspectors}
                        inspectorWorkload={inspectorWorkload}
                        onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                        onClick={() => navigate(`/inspection/${job.id}`)}
                        onGenerateReport={() => setSelectedJobForReport(job)}
                        onPreviewReport={() => setReportPreviewJobId(job.id)}
                      />
                    </div>
                  )}
                  getItemKey={(job) => job.id}
                  className="mb-4"
                  overscan={3}
                />
                {todaysPaginationInfo && todaysPaginationInfo.total > todaysPagination.pageSize && (
                  <PaginationControls
                    page={todaysPagination.page}
                    pageSize={todaysPagination.pageSize}
                    total={todaysPaginationInfo.total}
                    onPageChange={todaysPagination.setPage}
                    onPageSizeChange={todaysPagination.setPageSize}
                  />
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Completed Today */}
        <AccordionItem value="completed-today" className="border rounded-lg">
          <AccordionTrigger 
            className="px-6 hover:no-underline hover-elevate"
            data-testid="accordion-trigger-completed-today"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div className="text-left">
                <h2 className="text-lg font-semibold">Completed Today</h2>
                <p className="text-sm text-muted-foreground">
                  Jobs finished today ({completedPaginationInfo?.total || 0} total)
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            {isLoadingCompleted ? (
              <JobListLoadingFallback count={SKELETON_COUNTS.completedToday} />
            ) : completedTodayError ? (
              <Alert variant="destructive" data-testid="alert-error-completed-today">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Completed Jobs</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{(completedTodayError as Error).message || 'Failed to load completed jobs'}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchCompletedToday()}
                    data-testid="button-retry-completed-today"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : completedToday.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-completed-today">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No jobs completed today yet</p>
              </div>
            ) : (
              <>
                <VirtualList
                  items={completedToday}
                  height="500px"
                  estimateSize={120}
                  renderItem={(job) => (
                    <div className="mb-3">
                      <JobCard
                        {...job}
                        builders={builders}
                        inspectors={inspectors}
                        inspectorWorkload={inspectorWorkload}
                        onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                        onClick={() => navigate(`/inspection/${job.id}`)}
                        onGenerateReport={() => setSelectedJobForReport(job)}
                        onPreviewReport={() => setReportPreviewJobId(job.id)}
                      />
                    </div>
                  )}
                  getItemKey={(job) => job.id}
                  className="mb-4"
                  overscan={3}
                />
                {completedPaginationInfo && completedPaginationInfo.total > completedPagination.pageSize && (
                  <PaginationControls
                    page={completedPagination.page}
                    pageSize={completedPagination.pageSize}
                    total={completedPaginationInfo.total}
                    onPageChange={completedPagination.setPage}
                    onPageSizeChange={completedPagination.setPageSize}
                  />
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: All Jobs - Full List */}
        <AccordionItem value="all-jobs" className="border rounded-lg">
          <AccordionTrigger 
            className="px-6 hover:no-underline hover-elevate"
            data-testid="accordion-trigger-all-jobs"
          >
            <div className="flex items-center gap-3">
              <ChevronDown className="w-5 h-5" />
              <div className="text-left">
                <h2 className="text-lg font-semibold">All Jobs</h2>
                <p className="text-sm text-muted-foreground">
                  Complete job list ({allJobsPaginationInfo?.total || 0} total)
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            {isLoadingAll ? (
              <JobListLoadingFallback count={SKELETON_COUNTS.allJobs} />
            ) : allJobsError ? (
              <Alert variant="destructive" data-testid="alert-error-all-jobs">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Jobs</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{(allJobsError as Error).message || 'Failed to load jobs'}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAllJobs()}
                    data-testid="button-retry-all-jobs"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : allJobs.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-all-jobs">
                <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No jobs yet. Create your first job to get started.</p>
                <Button onClick={() => setIsJobDialogOpen(true)} data-testid="button-create-first-job">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Job
                </Button>
              </div>
            ) : (
              <>
                <VirtualList
                  items={allJobs}
                  height="600px"
                  estimateSize={120}
                  renderItem={(job) => (
                    <div className="mb-3">
                      <JobCard
                        {...job}
                        builders={builders}
                        inspectors={inspectors}
                        inspectorWorkload={inspectorWorkload}
                        onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                        onClick={() => navigate(`/inspection/${job.id}`)}
                        onGenerateReport={() => setSelectedJobForReport(job)}
                        onPreviewReport={() => setReportPreviewJobId(job.id)}
                      />
                    </div>
                  )}
                  getItemKey={(job) => job.id}
                  className="mb-4"
                  overscan={3}
                />
                {allJobsPaginationInfo && allJobsPaginationInfo.total > allJobsPagination.pageSize && (
                  <PaginationControls
                    page={allJobsPagination.page}
                    pageSize={allJobsPagination.pageSize}
                    total={allJobsPaginationInfo.total}
                    onPageChange={allJobsPagination.setPage}
                    onPageSizeChange={allJobsPagination.setPageSize}
                  />
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Job Dialog */}
      {canCreateJobs && (
        <JobDialog
          open={isJobDialogOpen}
          onOpenChange={setIsJobDialogOpen}
          job={jobToEdit}
          builders={builders}
          onSave={async (data) => {
            if (jobToEdit) {
              // For future editing functionality
              // await updateJobMutation.mutateAsync({ id: jobToEdit.id, ...data });
            } else {
              await createJobMutation.mutateAsync(data);
            }
            setJobToEdit(null);
          }}
          isPending={createJobMutation.isPending}
        />
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        dataType="jobs"
        availableColumns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Job Name' },
          { key: 'status', label: 'Status' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'zipCode', label: 'ZIP Code' },
          { key: 'scheduledDate', label: 'Scheduled Date' },
          { key: 'completedDate', label: 'Completed Date' },
          { key: 'builderId', label: 'Builder ID' },
          { key: 'assignedTo', label: 'Assigned To' },
          { key: 'createdAt', label: 'Created Date' },
          { key: 'updatedAt', label: 'Last Updated' },
        ]}
        defaultFileName={`jobs-export-${format(new Date(), 'yyyy-MM-dd')}`}
      />

      {/* Quick Report Dialog */}
      {selectedJobForReport && (
        <QuickReportDialog
          open={!!selectedJobForReport}
          onOpenChange={(open) => !open && setSelectedJobForReport(null)}
          job={selectedJobForReport}
        />
      )}

      {/* Report Preview Dialog */}
      {reportPreviewJobId && (
        <ReportPreview
          jobId={reportPreviewJobId}
          open={!!reportPreviewJobId}
          onOpenChange={(open) => !open && setReportPreviewJobId(null)}
        />
      )}
    </div>
  );
}

// Phase 2 - BUILD: Export component wrapped in ErrorBoundary for production resilience
export default function Jobs() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="error-boundary-jobs">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Jobs Page</AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                An unexpected error occurred while loading the jobs page. Please try refreshing the page.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <JobsContent />
    </ErrorBoundary>
  );
}