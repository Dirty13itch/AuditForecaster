import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, CheckCircle2, XCircle, CalendarClock, Loader2, MapPin, Building2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import { cn } from "@/lib/utils";
import { JOB_TYPE_DISPLAY_NAMES } from "@shared/hersInspectionTypes";
import { ReportPreview } from "@/components/ReportPreview";
import { TravelTimeCard } from "@/components/TravelTimeCard";

// Field Day API Response Type
interface FieldDayResponse {
  myJobs: Job[];
  allJobs?: Job[];
  date: string;
  summary: {
    total: number;
    scheduled: number;
    done: number;
    failed: number;
    reschedule: number;
  };
}

// Status configurations for buttons
const STATUS_CONFIG = {
  done: { label: "Done", bgClass: "bg-green-500 hover:bg-green-600", outlineClass: "border-green-500 text-green-700 hover:bg-green-50" },
  failed: { label: "Failed", bgClass: "bg-red-500 hover:bg-red-600", outlineClass: "border-red-500 text-red-700 hover:bg-red-50" },
  reschedule: { label: "Reschedule", bgClass: "bg-orange-500 hover:bg-orange-600", outlineClass: "border-orange-500 text-orange-700 hover:bg-orange-50" },
};

export default function FieldDay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [reportPreviewJobId, setReportPreviewJobId] = useState<string | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  
  // Fetch field day data
  const { data: fieldDayData, isLoading, refetch } = useQuery<FieldDayResponse>({
    queryKey: ['/api/field-day', { date: dateString, view: 'today' }],
    enabled: !!user?.id,
    refetchInterval: 120000, // Auto-refresh every 2 minutes
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      setUpdatingJobId(jobId);
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-day'] });
      toast({
        title: "Status updated",
        description: `Job marked as ${status}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingJobId(null);
    },
  });

  const handleStatusClick = (jobId: string, status: 'done' | 'failed' | 'reschedule') => {
    statusMutation.mutate({ jobId, status });
  };

  const handleCardClick = (jobId: string, event: React.MouseEvent) => {
    // Don't navigate if clicking on a button
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/inspection/${jobId}`);
  };

  // Job card component
  const JobCard = ({ job, showInspector = false }: { job: Job; showInspector?: boolean }) => {
    const isUpdating = updatingJobId === job.id;
    const jobType = JOB_TYPE_DISPLAY_NAMES[job.inspectionType] || job.inspectionType;
    
    return (
      <Card 
        className="min-h-[120px] cursor-pointer hover-elevate"
        onClick={(e) => handleCardClick(job.id, e)}
        data-testid={`card-job-${job.id}`}
      >
        <CardContent className="p-6 space-y-4">
          {/* Top Section */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{job.address}</h3>
            <p className="text-sm text-muted-foreground">{job.contractor}</p>
            {showInspector && job.assignedTo && (
              <p className="text-sm text-muted-foreground" data-testid={`text-inspector-${job.id}`}>
                Inspector: {job.assignedTo}
              </p>
            )}
            {showInspector && !job.assignedTo && (
              <Badge variant="outline" className="border-yellow-500" data-testid="badge-unassigned">
                Unassigned
              </Badge>
            )}
          </div>

          {/* Middle Section */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary" data-testid={`badge-job-type-${job.id}`}>
              {jobType}
            </Badge>
            {job.scheduledDate && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(job.scheduledDate), 'h:mm a')}
              </span>
            )}
          </div>

          {/* Bottom Section - Status Toggle Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['done', 'failed', 'reschedule'] as const).map((status) => {
              const config = STATUS_CONFIG[status];
              const isSelected = job.status === status;
              
              return (
                <Button
                  key={status}
                  size="lg"
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "min-h-12 font-bold",
                    isSelected ? `${config.bgClass} text-white` : config.outlineClass
                  )}
                  onClick={() => handleStatusClick(job.id, status)}
                  disabled={isUpdating}
                  data-testid={`button-status-${status}-${job.id}`}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {status === 'done' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                      {status === 'failed' && <XCircle className="h-4 w-4 mr-1" />}
                      {status === 'reschedule' && <CalendarClock className="h-4 w-4 mr-1" />}
                      {config.label}
                    </>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Preview Report Button (for completed jobs) */}
          {(job.status === 'done' || job.status === 'failed') && (
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setReportPreviewJobId(job.id);
              }}
              data-testid={`button-preview-report-${job.id}`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Preview Report
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Loading skeleton
  const SkeletonCards = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="min-h-[120px]">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-24" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="space-y-4" data-testid="header-field-day">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Field Day</h1>
            <p className="text-muted-foreground mt-1">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" data-testid="button-date-picker">
                <Calendar className="mr-2 h-4 w-4" />
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Admin Toggle */}
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Switch
              id="show-all"
              checked={showAllJobs}
              onCheckedChange={setShowAllJobs}
              data-testid="toggle-show-all"
            />
            <Label htmlFor="show-all">Show All Jobs</Label>
          </div>
        )}
      </header>

      {/* Summary Stats Bar */}
      {fieldDayData?.summary && (
        <div 
          className="flex gap-2 overflow-x-auto pb-2 sticky top-0 bg-background z-10 border-b"
          data-testid="bar-summary"
        >
          <Badge variant="outline" className="border-blue-500 text-blue-700 whitespace-nowrap">
            Scheduled: {fieldDayData.summary.scheduled}
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-700 whitespace-nowrap">
            Done: {fieldDayData.summary.done}
          </Badge>
          <Badge variant="outline" className="border-red-500 text-red-700 whitespace-nowrap">
            Failed: {fieldDayData.summary.failed}
          </Badge>
          <Badge variant="outline" className="border-orange-500 text-orange-700 whitespace-nowrap">
            Reschedule: {fieldDayData.summary.reschedule}
          </Badge>
        </div>
      )}

      {/* Travel Time Analysis */}
      {user?.id && fieldDayData?.myJobs && fieldDayData.myJobs.length > 1 && (
        <TravelTimeCard date={selectedDate} inspectorId={user.id} />
      )}

      {/* My Jobs Section */}
      <section className="space-y-4" data-testid="section-my-jobs">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">My Jobs Today</h2>
          {fieldDayData?.myJobs && fieldDayData.myJobs.length > 0 && (
            <Badge variant="secondary" data-testid="badge-my-jobs-count">
              {fieldDayData.myJobs.length}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <SkeletonCards count={3} />
        ) : fieldDayData?.myJobs && fieldDayData.myJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fieldDayData.myJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No jobs assigned for today
              </p>
              <Button variant="link" className="mt-2" onClick={() => navigate('/schedule')}>
                View Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* All Jobs Section (Admin only) */}
      {isAdmin && showAllJobs && (
        <section className="space-y-4" data-testid="section-all-jobs">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">All Jobs Today</h2>
            {fieldDayData?.allJobs && fieldDayData.allJobs.length > 0 && (
              <Badge variant="secondary" data-testid="badge-all-jobs-count">
                {fieldDayData.allJobs.length}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <SkeletonCards count={5} />
          ) : fieldDayData?.allJobs && fieldDayData.allJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fieldDayData.allJobs.map((job) => (
                <JobCard key={job.id} job={job} showInspector={true} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  No other jobs scheduled for today
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All clear for {format(selectedDate, 'EEEE')}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
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
