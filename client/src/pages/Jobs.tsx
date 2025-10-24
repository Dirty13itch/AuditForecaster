import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Clock, PlayCircle, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder, GoogleEvent } from "@shared/schema";
import JobCard from "@/components/JobCard";
import JobDialog from "@/components/JobDialog";
import { useAuth, type UserRole } from "@/hooks/useAuth";

export default function Jobs() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const userRole = (user?.role as UserRole) || 'inspector';
  const canCreateJobs = userRole === 'admin' || userRole === 'inspector';

  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);

  // Fetch planned events (today's unconverted Google calendar events)
  const { data: plannedEvents = [], isLoading: isLoadingPlanned } = useQuery<GoogleEvent[]>({
    queryKey: ["/api/google-events/today"],
  });

  // Fetch today's active jobs
  // TODO: Add pagination for better performance when job count grows
  const { data: todaysJobs = [], isLoading: isLoadingTodays } = useQuery<Job[]>({
    queryKey: ["/api/jobs/today"],
  });

  // Fetch today's completed jobs
  // TODO: Add pagination for better performance when job count grows
  const { data: completedToday = [], isLoading: isLoadingCompleted } = useQuery<Job[]>({
    queryKey: ["/api/jobs/completed-today"],
  });

  // Fetch all jobs with cursor-based infinite scroll pagination
  const {
    data: allJobsData,
    isLoading: isLoadingAll,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/jobs", "infinite"],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: "20",
        sortBy: "id",
        sortOrder: "desc",
      });
      if (pageParam) {
        params.append("cursor", pageParam);
      }
      const response = await fetch(`/api/jobs?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const allJobs = allJobsData?.pages.flatMap((page) => page.data) ?? [];
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fetch builders for job cards
  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const handleJobSave = async (data: any) => {
    await createJobMutation.mutateAsync(data);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Jobs</h1>
          <p className="text-sm text-muted-foreground">Manage inspections and job workflow</p>
        </div>
        <Button 
          onClick={() => setIsJobDialogOpen(true)} 
          disabled={!canCreateJobs}
          data-testid="button-add-job"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Main Content with 4 Sections */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Accordion
          type="multiple"
          defaultValue={["planned", "todays-work", "completed-today", "all-jobs"]}
          className="space-y-4"
        >
          {/* Section 1: Planned Today - Calendar Events */}
          <AccordionItem value="planned" className="border rounded-lg">
            <AccordionTrigger 
              className="px-6 hover:no-underline hover-elevate"
              data-testid="accordion-trigger-planned"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Planned Today</h2>
                  <p className="text-sm text-muted-foreground">
                    Calendar events ready to start ({plannedEvents.length})
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              {isLoadingPlanned ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : plannedEvents.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-planned-events">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No calendar events scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className="hover-elevate"
                      data-testid={`card-planned-event-${event.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <CardTitle className="text-base" data-testid="text-event-title">
                              {event.title}
                            </CardTitle>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span data-testid="text-event-location">{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span data-testid="text-event-time">
                                {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => startJobMutation.mutate(event.id)}
                            disabled={startJobMutation.isPending || !canCreateJobs}
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
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

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
                    Active jobs scheduled for today ({todaysJobs.length})
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              {isLoadingTodays ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : todaysJobs.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-todays-jobs">
                  <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active jobs scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      {...job}
                      builders={builders}
                      onClick={() => navigate(`/inspection/${job.id}`)}
                    />
                  ))}
                </div>
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
                    Jobs finished today ({completedToday.length})
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              {isLoadingCompleted ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
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
                <div className="space-y-3">
                  {completedToday.map((job) => (
                    <JobCard
                      key={job.id}
                      {...job}
                      builders={builders}
                      onClick={() => navigate(`/inspection/${job.id}`)}
                    />
                  ))}
                </div>
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
                    Complete job list ({allJobs.length} total)
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              {isLoadingAll ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
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
                <div className="space-y-3">
                  {allJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      {...job}
                      builders={builders}
                      onClick={() => navigate(`/inspection/${job.id}`)}
                    />
                  ))}
                  {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                      {isFetchingNextPage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" data-testid="loader-fetching-more" />
                      ) : (
                        <div className="h-4" data-testid="load-more-trigger" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Job Dialog */}
      <JobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        builders={builders}
        onSave={handleJobSave}
        isPending={createJobMutation.isPending}
      />
    </div>
  );
}
