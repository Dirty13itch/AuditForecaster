import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Clock, PlayCircle, Loader2, ChevronDown, WifiOff, Wifi, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListItemSkeleton, DashboardCardSkeleton } from "@/components/ui/skeleton-variants";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder, GoogleEvent } from "@shared/schema";
import type { PaginatedResult } from "@shared/pagination";
import JobCard from "@/components/JobCard";
import JobDialog from "@/components/JobDialog";
import ExportDialog from "@/components/ExportDialog";
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

// Pagination hook to manage URL state
function usePagination(key: string, defaultPageSize = 25) {
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
              <SelectItem value="10" data-testid="option-page-size-10">10</SelectItem>
              <SelectItem value="25" data-testid="option-page-size-25">25</SelectItem>
              <SelectItem value="50" data-testid="option-page-size-50">50</SelectItem>
              <SelectItem value="100" data-testid="option-page-size-100">100</SelectItem>
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

export default function Jobs() {
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
  
  // Check pending sync status for jobs
  useEffect(() => {
    const checkPendingSync = async () => {
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
    };
    
    checkPendingSync();
    // Refresh every 5 seconds
    const interval = setInterval(checkPendingSync, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch planned events (today's unconverted Google calendar events)
  const { data: plannedEvents = [], isLoading: isLoadingPlanned } = useQuery<GoogleEvent[]>({
    queryKey: ["/api/google-events/today"],
  });

  // Fetch today's active jobs with pagination
  const { data: todaysJobsData, isLoading: isLoadingTodays } = useQuery<PaginatedResult<Job>>({
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
  });

  // Fetch today's completed jobs with pagination
  const { data: completedTodayData, isLoading: isLoadingCompleted } = useQuery<PaginatedResult<Job>>({
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
  });

  // Fetch all jobs with standard pagination
  const { data: allJobsData, isLoading: isLoadingAll } = useQuery<PaginatedResult<Job>>({
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
  });

  // Extract data and pagination info
  const todaysJobs = todaysJobsData?.data || [];
  const todaysPaginationInfo = todaysJobsData?.pagination;
  const completedToday = completedTodayData?.data || [];
  const completedPaginationInfo = completedTodayData?.pagination;
  const allJobs = allJobsData?.data || [];
  const allJobsPaginationInfo = allJobsData?.pagination;

  // Fetch builders for job cards
  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  // Fetch all inspectors for assignment
  const { data: inspectors = [] } = useQuery<Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string;
  }>>({
    queryKey: ["/api/inspectors"],
  });

  // Fetch inspector workload (next 30 days)
  const { data: inspectorWorkload = [] } = useQuery<Array<{
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
  });

  // Assign job to inspector mutation
  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, inspectorId }: { jobId: string; inspectorId: string }) => {
      return apiRequest("POST", `/api/jobs/${jobId}/assign`, { inspectorId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/jobs" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspectors/workload"] });
      toast({
        title: "Job Assigned",
        description: `Job assigned successfully`,
      });
    },
    onError: (error: Error) => {
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
      // Use fetch directly instead of apiRequest to handle 409 before throwing
      const response = await fetch("/api/jobs/from-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json();

      // Handle 409 Conflict - job already exists
      if (response.status === 409) {
        return { isDuplicate: true, existingJob: data.job };
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.message || "Failed to create job");
      }

      // Success - return the newly created job
      return { isDuplicate: false, job: data };
    },
    onSuccess: (data: { isDuplicate: boolean; existingJob?: Job; job?: Job }) => {
      // Invalidate cache for both new and duplicate jobs
      queryClient.invalidateQueries({ queryKey: ["/api/google-events/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/today"] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/jobs" });
      
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
      return apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/jobs" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/today"] });
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
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <ListItemSkeleton key={i} />
                  ))}
                </div>
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
                            {event.summary || "Untitled Event"}
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
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <DashboardCardSkeleton key={i} />
                ))}
              </div>
            ) : todaysJobs.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-todays-jobs">
                <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active jobs scheduled for today</p>
              </div>
            ) : (
              <>
                <StaggerContainer className="space-y-3">
                  {todaysJobs.map((job) => (
                    <StaggerItem key={job.id}>
                      <JobCard
                        {...job}
                        builders={builders}
                        inspectors={inspectors}
                        inspectorWorkload={inspectorWorkload}
                        onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                        onClick={() => navigate(`/inspection/${job.id}`)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
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
              <Badge className="bg-success text-success-foreground">
                ✓
              </Badge>
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
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <DashboardCardSkeleton key={i} />
                ))}
              </div>
            ) : completedToday.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-completed-today">
                <Badge className="w-12 h-12 mx-auto mb-3 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-2xl">
                  ✓
                </Badge>
                <p className="text-muted-foreground">No jobs completed today yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {completedToday.map((job) => (
                    <JobCard
                      key={job.id}
                      {...job}
                      builders={builders}
                      inspectors={inspectors}
                      inspectorWorkload={inspectorWorkload}
                      onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                      onClick={() => navigate(`/inspection/${job.id}`)}
                    />
                  ))}
                </div>
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
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <DashboardCardSkeleton key={i} />
                ))}
              </div>
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
                <div className="space-y-3">
                  {allJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      {...job}
                      builders={builders}
                      inspectors={inspectors}
                      inspectorWorkload={inspectorWorkload}
                      onAssign={(inspectorId) => assignJobMutation.mutate({ jobId: job.id, inspectorId })}
                      onClick={() => navigate(`/inspection/${job.id}`)}
                    />
                  ))}
                </div>
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
    </div>
  );
}