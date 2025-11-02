import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Building2, CheckCircle2, XCircle, CalendarClock, Loader2, Check, Battery, Wifi, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useBatteryStatus } from "@/hooks/useBatteryStatus";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, Builder } from "@shared/schema";
import { cn } from "@/lib/utils";
import { SwipeableFieldDayCard } from "@/components/SwipeableFieldDayCard";
import { JobCompletionCelebration } from "@/components/JobCompletionCelebration";
import { FieldStatusBar } from "@/components/FieldStatusBar";
import { JOB_TYPE_DISPLAY_NAMES } from "@shared/hersInspectionTypes";
import { VirtualList } from "@/components/ui/virtual-grid";
import { JobListLoadingFallback } from "@/components/LoadingStates";
import { PageTransition } from "@/components/ui/page-transition";
import { motion, AnimatePresence } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');

// Job type display names - Use HERS display names with fallbacks for unmapped types
const JOB_TYPE_LABELS: Record<string, string> = {
  ...JOB_TYPE_DISPLAY_NAMES,
  // Additional fallback mappings for any legacy or unmapped types
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

export default function FieldDay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  const [, navigate] = useLocation();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [completedJob, setCompletedJob] = useState<Job | null>(null);
  
  // Location, battery, and network monitoring
  const { getPosition, hasPermission, requestPermission } = useGeolocation();
  const { battery, batteryPercentage, batteryLevel, shouldSyncFull, shouldPauseSync } = useBatteryStatus();
  const {
    online,
    quality,
    lastSyncTime,
    pendingSyncCount,
    isRemoteArea,
    triggerManualSync,
    updatePendingSyncCount,
    markSyncComplete,
    isRetrying
  } = useNetworkQuality();
  
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
  const { data: allJobs, isLoading: isLoadingAllJobs, refetch: refetchAllJobs } = useQuery<(Job & { builder?: Builder })[]>({
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

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    haptic.vibrate('medium');
    
    try {
      // Refetch all queries in parallel
      const promises = [];
      promises.push(queryClient.invalidateQueries({ queryKey: ['/api/jobs'] }));
      
      await Promise.all(promises);
      
      toast({
        title: "Jobs refreshed",
        description: "Latest job data loaded",
      });
    } catch (error) {
      haptic.vibrate('error');
      toast({
        title: "Refresh failed",
        description: "Unable to refresh jobs. Please try again.",
        variant: "destructive",
      });
    }
  }, [haptic, toast]);

  // Pull-to-refresh state
  const pullToRefreshState = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: false,
  });

  // Mutation to update job status with GPS location
  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      let locationData: any = {};
      
      // Capture GPS location when marking job status (done/failed)
      if (status === 'done' || status === 'failed') {
        try {
          // Request permission if needed
          if (!hasPermission) {
            await requestPermission();
          }
          
          const position = await getPosition();
          locationData = {
            latitude: position.latitude,
            longitude: position.longitude,
            locationAccuracy: position.accuracy,
            locationCapturedAt: new Date().toISOString()
          };
          
          console.log(`Captured GPS for job ${jobId}: ${position.latitude}, ${position.longitude} (±${position.accuracy}m)`);
        } catch (error) {
          console.error('Failed to get GPS location:', error);
          // Continue without location data - don't block job status update
        }
      }
      
      // Update pending sync count for network quality indicator
      updatePendingSyncCount(pendingSyncCount + 1);
      
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { 
        status,
        ...locationData 
      });
      return response.json();
    },
    onMutate: async ({ jobId }) => {
      setUpdatingJobId(jobId);
    },
    onSuccess: (updatedJob, { status }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      // Mark sync as complete on successful update
      markSyncComplete();
      
      // Show celebration for completed jobs with haptic feedback
      if (status === 'done') {
        const jobData = allJobsList.find(job => job.id === updatedJob.id);
        if (jobData) {
          setCompletedJob({...jobData, status: 'done'});
          // Celebration haptic pattern for job completion
          haptic.vibrate('celebration');
        }
      } else if (status === 'failed') {
        // Error haptic pattern for job failure
        haptic.vibrate('error');
        const statusLabel = STATUS_CONFIG[status]?.label || status;
        toast({
          title: "Status updated",
          description: `Job marked as ${statusLabel.toLowerCase()}`,
        });
      } else if (status === 'reschedule') {
        // Warning haptic pattern for reschedule
        haptic.vibrate('warning');
        const statusLabel = STATUS_CONFIG[status]?.label || status;
        toast({
          title: "Status updated",
          description: `Job marked as ${statusLabel.toLowerCase()}`,
        });
      } else {
        // Medium tap for other status updates
        haptic.vibrate('medium');
        const statusLabel = STATUS_CONFIG[status]?.label || status;
        toast({
          title: "Status updated",
          description: `Job marked as ${statusLabel.toLowerCase()}`,
        });
      }
    },
    onError: (error: Error) => {
      // Error haptic feedback for failed update
      haptic.vibrate('error');
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

  const handleStatusUpdate = (status: string) => {
    if (!selectedJobId) return;
    
    // Strong haptic feedback for critical job status changes
    haptic.vibrate('strong');
    
    updateJobMutation.mutate({ jobId: selectedJobId, status });
    setSelectedJobId(null); // Clear selection after update
  };

  // Get selected job data
  const allJobsList = [...(myJobs || []), ...(isAdmin && allJobs ? allJobs.filter(job => !myJobs?.some(myJob => myJob.id === job.id)) : [])];
  const selectedJob = allJobsList.find(job => job.id === selectedJobId);

  return (
    <>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator {...pullToRefreshState} />
      
      <PageTransition mode="fade" duration={0.3}>
        <div className="container max-w-7xl mx-auto p-4 space-y-6 pb-32">
          {/* Job Completion Celebration */}
          {completedJob && (
            <JobCompletionCelebration
              job={completedJob}
              onClose={() => setCompletedJob(null)}
              autoCloseMs={5000}
            />
          )}

        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Field Day
            </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-today-date">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </motion.div>

      {/* Field Status Bar - Network, Battery, Sync Status */}
      {!isAdmin && (
        <FieldStatusBar 
          className="mb-6"
          onManualSync={triggerManualSync}
        />
      )}

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
          <JobListLoadingFallback count={3} />
        ) : myJobs && myJobs.length > 0 ? (
          <VirtualList
            items={myJobs}
            height="400px"
            estimateSize={140}
            renderItem={(job) => (
              <div className="mb-4">
                <SwipeableFieldDayCard
                  job={job}
                  isSelected={selectedJobId === job.id}
                  onSelect={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                  onNavigate={() => navigate(`/inspection/${job.id}`)}
                  onStatusUpdate={(status) => {
                    updateJobMutation.mutate({ jobId: job.id, status });
                  }}
                  syncStatus={{
                    isSynced: pendingSyncCount === 0,
                    lastSync: lastSyncTime,
                    pendingChanges: pendingSyncCount
                  }}
                  networkQuality={quality}
                />
              </div>
            )}
            getItemKey={(job) => job.id}
            overscan={3}
          />
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
            <JobListLoadingFallback count={5} />
          ) : allJobs && allJobs.length > 0 ? (
            <VirtualList
              items={allJobs}
              height="500px"
              estimateSize={140}
              renderItem={(job) => (
                <div className="mb-4">
                  <SwipeableFieldDayCard
                    job={job}
                    isSelected={selectedJobId === job.id}
                    onSelect={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                    onNavigate={() => navigate(`/inspection/${job.id}`)}
                    onStatusUpdate={(status) => {
                      updateJobMutation.mutate({ jobId: job.id, status });
                    }}
                    syncStatus={{
                      isSynced: pendingSyncCount === 0,
                      lastSync: lastSyncTime,
                      pendingChanges: pendingSyncCount
                    }}
                    networkQuality={quality}
                  />
                </div>
              )}
              getItemKey={(job) => job.id}
              overscan={3}
            />
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

      {/* Fixed Bottom Action Bar - Thumb Zone Optimized */}
      {selectedJob && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
          <div className="container max-w-7xl mx-auto">
            {/* Selected Job Info */}
            <div className="mb-4">
              <p className="text-sm font-medium truncate" data-testid="text-selected-job-name">
                {selectedJob.builder?.name || selectedJob.builderName}
              </p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-selected-job-address">
                {selectedJob.address}
              </p>
            </div>

            {/* Large Touch-Optimized Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                size="lg"
                className="h-14 bg-green-500 hover:bg-green-600 text-white font-bold"
                onClick={() => handleStatusUpdate('done')}
                disabled={updatingJobId === selectedJobId || selectedJob.status === 'done'}
                data-testid={`button-mark-done-${selectedJobId}`}
              >
                {updatingJobId === selectedJobId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Done
                  </>
                )}
              </Button>

              <Button
                size="lg"
                className="h-14 bg-red-500 hover:bg-red-600 text-white font-bold"
                onClick={() => handleStatusUpdate('failed')}
                disabled={updatingJobId === selectedJobId || selectedJob.status === 'failed'}
                data-testid={`button-mark-failed-${selectedJobId}`}
              >
                {updatingJobId === selectedJobId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Failed
                  </>
                )}
              </Button>

              <Button
                size="lg"
                className="h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                onClick={() => handleStatusUpdate('reschedule')}
                disabled={updatingJobId === selectedJobId}
                data-testid={`button-reschedule-${selectedJobId}`}
              >
                {updatingJobId === selectedJobId ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CalendarClock className="h-5 w-5 mr-2" />
                    Reschedule
                  </>
                )}
              </Button>
            </div>

            {/* Cancel Selection */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => setSelectedJobId(null)}
              data-testid="button-cancel-selection"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
    </>
  );
}
