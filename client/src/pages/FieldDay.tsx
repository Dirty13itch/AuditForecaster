import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Building2, CheckCircle2, XCircle, CalendarClock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder } from "@shared/schema";

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');

// Job type display names
const JOB_TYPE_LABELS: Record<string, string> = {
  rough: "Rough Inspection",
  final: "Final Inspection",
  blower_door: "Blower Door Test",
  duct_leakage: "Duct Leakage Test",
  ventilation: "Ventilation Test",
};

// Status badge configurations
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  scheduled: { label: "Scheduled", variant: "secondary", color: "bg-blue-500" },
  done: { label: "Done", variant: "default", color: "bg-green-500" },
  failed: { label: "Failed", variant: "destructive", color: "bg-red-500" },
  reschedule: { label: "Reschedule", variant: "outline", color: "bg-orange-500" }
};

interface JobCardProps {
  job: Job & { builder?: Builder };
  onStatusUpdate: (jobId: string, status: string) => void;
  isUpdating: boolean;
}

function FieldDayJobCard({ job, onStatusUpdate, isUpdating }: JobCardProps) {
  const [, navigate] = useLocation();
  
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't navigate if clicking a button
    if (target.closest('button')) {
      return;
    }
    navigate(`/inspection/${job.id}`);
  };

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer"
      onClick={handleCardClick}
      data-testid={`card-field-day-job-${job.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold truncate" data-testid="text-builder-name">
              {job.builder?.name || job.builderName || "Unknown Builder"}
            </CardTitle>
            <CardDescription className="flex items-start gap-1 mt-1" data-testid="text-address">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{job.address}</span>
            </CardDescription>
          </div>
          {STATUS_CONFIG[job.status] && (
            <Badge 
              variant={STATUS_CONFIG[job.status].variant}
              data-testid={`badge-status-${job.id}`}
            >
              {STATUS_CONFIG[job.status].label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" data-testid={`badge-job-type-${job.id}`}>
            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
          </Badge>
          {job.pricing && (
            <Badge variant="outline" data-testid={`badge-pricing-${job.id}`}>
              ${parseFloat(job.pricing).toFixed(2)}
            </Badge>
          )}
        </div>

        {job.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-notes-${job.id}`}>
            {job.notes}
          </p>
        )}

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            size="default"
            variant="outline"
            className="bg-success/10 hover:bg-success/20 border-success/30 text-success-foreground min-h-12"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(job.id, 'done');
            }}
            disabled={isUpdating || job.status === 'done'}
            data-testid={`button-mark-done-${job.id}`}
          >
            <CheckCircle2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Done</span>
          </Button>

          <Button
            size="default"
            variant="outline"
            className="bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive-foreground min-h-12"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(job.id, 'failed');
            }}
            disabled={isUpdating || job.status === 'failed'}
            data-testid={`button-mark-failed-${job.id}`}
          >
            <XCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Failed</span>
          </Button>

          <Button
            size="default"
            variant="outline"
            className="bg-warning/10 hover:bg-warning/20 border-warning/30 text-warning-foreground min-h-12"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(job.id, 'reschedule');
            }}
            disabled={isUpdating}
            data-testid={`button-reschedule-${job.id}`}
          >
            <CalendarClock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reschedule</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FieldDay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  
  const today = getTodayDate();
  const isAdmin = user?.role === 'admin';

  // Query for inspector's assigned jobs
  const { data: myJobs, isLoading: isLoadingMyJobs } = useQuery<(Job & { builder?: Builder })[]>({
    queryKey: ['/api/jobs', { scheduledDate: today, assignedInspectorId: user?.id }],
    queryFn: async () => {
      const params = new URLSearchParams({
        scheduledDate: today,
        assignedInspectorId: user?.id || '',
      });
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch assigned jobs');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Query for all jobs today (admin only)
  const { data: allJobs, isLoading: isLoadingAllJobs } = useQuery<(Job & { builder?: Builder })[]>({
    queryKey: ['/api/jobs', { scheduledDate: today }],
    queryFn: async () => {
      const params = new URLSearchParams({
        scheduledDate: today,
      });
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch all jobs');
      return response.json();
    },
    enabled: isAdmin,
  });

  // Mutation to update job status
  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
      return response.json();
    },
    onMutate: async ({ jobId }) => {
      setUpdatingJobId(jobId);
    },
    onSuccess: (_, { status }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      const statusLabel = STATUS_CONFIG[status]?.label || status;
      toast({
        title: "Status updated",
        description: `Job marked as ${statusLabel.toLowerCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update job status. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingJobId(null);
    },
  });

  const handleStatusUpdate = (jobId: string, status: string) => {
    updateJobMutation.mutate({ jobId, status });
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Field Day
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-today-date">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* My Jobs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold" data-testid="heading-my-jobs">
            My Jobs Today
          </h2>
          {myJobs && myJobs.length > 0 && (
            <Badge variant="secondary" data-testid="badge-my-jobs-count">
              {myJobs.length} {myJobs.length === 1 ? 'job' : 'jobs'}
            </Badge>
          )}
        </div>

        {isLoadingMyJobs ? (
          <JobListSkeleton />
        ) : myJobs && myJobs.length > 0 ? (
          <div className="space-y-4">
            {myJobs.map((job) => (
              <FieldDayJobCard
                key={job.id}
                job={job}
                onStatusUpdate={handleStatusUpdate}
                isUpdating={updatingJobId === job.id}
              />
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-jobs-assigned">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No jobs assigned today
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later or contact your manager
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* All Jobs Section (Admin only) */}
      {isAdmin && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold" data-testid="heading-all-jobs">
              All Jobs Today
            </h2>
            {allJobs && allJobs.length > 0 && (
              <Badge variant="secondary" data-testid="badge-all-jobs-count">
                {allJobs.length} {allJobs.length === 1 ? 'job' : 'jobs'}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Management view of all scheduled jobs, including unassigned and other inspectors' assignments
          </p>

          {isLoadingAllJobs ? (
            <JobListSkeleton count={5} />
          ) : allJobs && allJobs.length > 0 ? (
            <div className="space-y-4">
              {allJobs.map((job) => (
                <FieldDayJobCard
                  key={job.id}
                  job={job}
                  onStatusUpdate={handleStatusUpdate}
                  isUpdating={updatingJobId === job.id}
                />
              ))}
            </div>
          ) : (
            <Card data-testid="card-no-jobs-today">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  No jobs scheduled today
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All clear for {format(new Date(), 'EEEE')}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
