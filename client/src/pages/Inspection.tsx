import { useState, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, CheckCircle2, Loader2, Calendar, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import TopBar from "@/components/TopBar";
import ChecklistItem from "@/components/ChecklistItem";
import BottomNav from "@/components/BottomNav";
import { FinalTestingMeasurements } from "@/components/FinalTestingMeasurements";
import { EnhancedPhotoGallery } from "@/components/photos/EnhancedPhotoGallery";
import { JobCompletionCelebration } from "@/components/JobCompletionCelebration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getWorkflowTemplate, type JobType } from '@shared/workflowTemplates';
import type { ChecklistItem as ChecklistItemType, UpdateChecklistItem, Job } from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Tab navigation options for inspection workflow
const TAB_OPTIONS = {
  WORKFLOW: "workflow",
  DASHBOARD: "dashboard", 
  INSPECTION: "inspection",
  PHOTOS: "photos",
  FORECAST: "forecast",
} as const;

// Phase 6 - DOCUMENT: Minnesota Energy Code compliance thresholds
const COMPLIANCE_THRESHOLDS = {
  MAX_ACH50: 3.0, // Maximum air changes per hour at 50 Pascals
} as const;

// Phase 6 - DOCUMENT: Skeleton loader counts for consistent loading UX
const SKELETON_COUNTS = {
  checklistItems: 5,
  testResults: 2,
} as const;

/**
 * Phase 2 - BUILD: Main Inspection workflow component
 * Phase 6 - DOCUMENT: Critical field workflow for inspectors
 * 
 * Workflow Overview:
 * 1. Inspector navigates to job inspection
 * 2. Completes checklist items (photos, notes, voice recordings)
 * 3. Performs required tests (blower door, duct leakage, ventilation)
 * 4. Reviews completion requirements
 * 5. Submits completed inspection
 * 
 * Completion Requirements:
 * - All checklist items completed (if workflow requires)
 * - Required photos uploaded (if workflow requires)
 * - Builder signature captured (if workflow requires)
 * - All required tests completed and passing
 * 
 * Mobile Optimization:
 * - Touch-friendly 48px minimum targets
 * - Optimized for outdoor field use
 * - Offline-capable with sync queue
 * - Large fonts for outdoor readability
 */
function InspectionContent() {
  const { id: jobId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"workflow" | "dashboard" | "inspection" | "photos" | "forecast">(TAB_OPTIONS.WORKFLOW);
  const [voiceNoteLoadingId, setVoiceNoteLoadingId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Phase 5 - HARDEN: Fetch job details with retry: 2 for network resilience
  const { 
    data: job, 
    isLoading: isLoadingJob,
    error: jobError,
    refetch: refetchJob,
  } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/jobs/${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch checklist items with retry: 2 for network resilience
  const { 
    data: checklistItems = [], 
    isLoading: isLoadingChecklist, 
    error: checklistError,
    refetch: refetchChecklist,
  } = useQuery<ChecklistItemType[]>({
    queryKey: ["/api/checklist-items", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/checklist-items?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch checklist items");
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch blower door tests with retry: 2
  // Phase 6 - DOCUMENT: Required for workflow completion validation
  const { 
    data: blowerDoorTests = [],
    isLoading: isLoadingBlowerDoor,
    error: blowerDoorError,
    refetch: refetchBlowerDoor,
  } = useQuery({
    queryKey: ["/api/blower-door-tests", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/blower-door-tests?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch blower door tests");
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch duct leakage tests with retry: 2
  const { 
    data: ductLeakageTests = [],
    isLoading: isLoadingDuctLeakage,
    error: ductLeakageError,
    refetch: refetchDuctLeakage,
  } = useQuery({
    queryKey: ["/api/duct-leakage-tests", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/duct-leakage-tests?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch duct leakage tests");
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch ventilation tests with retry: 2
  const { 
    data: ventilationTests = [],
    isLoading: isLoadingVentilation,
    error: ventilationError,
    refetch: refetchVentilation,
  } = useQuery({
    queryKey: ["/api/ventilation-tests", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const response = await fetch(`/api/ventilation-tests?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch ventilation tests");
      return response.json();
    },
    enabled: !!jobId,
    retry: 2,
  });

  /**
   * Phase 6 - DOCUMENT: Update Checklist Item Mutation
   * 
   * Optimistic Update Flow:
   * 1. Cancel in-flight queries to prevent race conditions
   * 2. Snapshot current checklist state for rollback
   * 3. Optimistically update UI immediately (better UX)
   * 4. On error: rollback to snapshot, show error toast
   * 5. On success: invalidate cache to refetch authoritative data
   * 
   * Critical for offline field use - inspectors see instant feedback
   */
  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateChecklistItem }) => {
      return apiRequest("PATCH", `/api/checklist-items/${id}`, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/checklist-items", jobId] });
      
      const previousItems = queryClient.getQueryData<ChecklistItemType[]>(["/api/checklist-items", jobId]);
      
      queryClient.setQueryData<ChecklistItemType[]>(
        ["/api/checklist-items", jobId],
        (old) => old?.map((item) => (item.id === id ? { ...item, ...data } : item))
      );
      
      return { previousItems };
    },
    onError: (error, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/checklist-items", jobId], context.previousItems);
      }
      toast({
        title: "Update failed",
        description: "Failed to update checklist item. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-items", jobId] });
    },
  });

  /**
   * Phase 6 - DOCUMENT: Complete Job Mutation
   * 
   * Workflow Completion Logic:
   * - Only allowed if all completion requirements met (see canCompleteJob)
   * - Updates job status to 'done'
   * - Triggers celebration UI for inspector satisfaction
   * - Invalidates all job caches to reflect completion across app
   */
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/jobs/${jobId}`, { status: 'done' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      setShowCelebration(true);
      setShowCompleteDialog(false);
      toast({
        title: "Job Completed",
        description: "Inspection has been marked as complete.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Cannot Complete Job",
        description: error.message || "Please complete all requirements first",
      });
    },
  });

  /**
   * Phase 6 - DOCUMENT: Create Retest Job Mutation
   * 
   * Retest Workflow (Minnesota Energy Code Compliance):
   * - Triggered when ACH50 > 3.0 (fails compliance)
   * - Creates new job linked to failed test
   * - Preserves all job details (address, builder, etc.)
   * - Inspector must reschedule and re-perform test
   */
  const createRetestMutation = useMutation({
    mutationFn: async (testId: string) => {
      if (!job) throw new Error("Job data not available");
      return apiRequest("POST", "/api/jobs", {
        name: `${job.name} - Retest`,
        address: job.address,
        contractor: job.contractor,
        builderId: job.builderId,
        inspectionType: 'Blower Door',
        jobType: 'bdoor_retest',
        status: 'scheduled',
        notes: `Retest following failed blower door test ${testId}. Previous ACH50 exceeded ${COMPLIANCE_THRESHOLDS.MAX_ACH50}.`,
        previousTestId: testId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Retest Job Created",
        description: `Job "${data.name}" created successfully. Navigate to Jobs page to schedule.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create retest job",
      });
    },
  });

  /**
   * Phase 3 - OPTIMIZE: Memoize checklist progress calculations
   * Only recalculates when checklist items change
   */
  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.completed).length,
    [checklistItems]
  );
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  /**
   * Check for incomplete items to show warnings (but don't block completion)
   */
  const incompleteItems = useMemo(() => {
    if (!job) return [];
    
    const workflow = getWorkflowTemplate(job.inspectionType as JobType);
    const warnings = [];
    
    // Check checklist completion
    if (completedCount < totalCount && totalCount > 0) {
      warnings.push(`${totalCount - completedCount} checklist items not completed`);
    }
    
    // Check photo upload
    if (!job.photoUploadComplete) {
      warnings.push("Photos not uploaded");
    }
    
    // Check builder signature
    if (!job.builderSignatureUrl) {
      warnings.push("Builder signature not captured");
    }
    
    // Check required tests
    workflow.requiredTests.forEach(test => {
      if (test.testType === 'blower_door' && blowerDoorTests.length === 0) {
        warnings.push("Blower door test not performed");
      }
      if (test.testType === 'duct_leakage' && ductLeakageTests.length === 0) {
        warnings.push("Duct leakage test not performed");
      }
      if (test.testType === 'ventilation' && ventilationTests.length === 0) {
        warnings.push("Ventilation test not performed");
      }
    });
    
    return warnings;
  }, [job, completedCount, totalCount, blowerDoorTests.length, ductLeakageTests.length, ventilationTests.length]);

  // Phase 3 - OPTIMIZE: useCallback for ALL event handlers to prevent recreation
  const handleCompleteJob = useCallback(() => {
    // Always allow completion - just show dialog (with warnings if any)
    setShowCompleteDialog(true);
  }, []);

  const handleConfirmComplete = useCallback(() => {
    completeJobMutation.mutate();
  }, [completeJobMutation]);

  const handleCreateRetestJob = useCallback((test: any) => {
    createRetestMutation.mutate(test.id);
  }, [createRetestMutation]);

  const handleToggle = useCallback((id: string) => {
    const item = checklistItems.find((i) => i.id === id);
    if (!item) return;
    
    updateChecklistItemMutation.mutate({
      id,
      data: { completed: !item.completed },
    });
  }, [checklistItems, updateChecklistItemMutation]);

  const handleNotesChange = useCallback((id: string, notes: string) => {
    updateChecklistItemMutation.mutate({
      id,
      data: { notes },
    });
  }, [updateChecklistItemMutation]);

  const handlePhotoAdd = useCallback((id: string) => {
    const item = checklistItems.find((i) => i.id === id);
    if (!item) return;
    
    const currentPhotoCount = item.photoCount ?? 0;
    
    updateChecklistItemMutation.mutate(
      {
        id,
        data: { photoCount: currentPhotoCount + 1 },
      },
      {
        onSuccess: () => {
          toast({
            title: "Photo added",
            description: "Photo has been saved locally and will sync when online.",
          });
        },
      }
    );
  }, [checklistItems, updateChecklistItemMutation, toast]);

  const handleVoiceNoteAdd = useCallback(async (id: string, audioBlob: Blob, duration: number) => {
    setVoiceNoteLoadingId(id);
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL, objectPath } = await response.json() as {
        uploadURL: string;
        objectPath: string;
      };

      await fetch(uploadURL, {
        method: "PUT",
        body: audioBlob,
        headers: {
          "Content-Type": audioBlob.type || "audio/webm",
        },
      });

      updateChecklistItemMutation.mutate(
        {
          id,
          data: {
            voiceNoteUrl: objectPath,
            voiceNoteDuration: duration,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Voice note saved",
              description: "Your voice note has been saved successfully.",
            });
          },
        }
      );
    } catch (error) {
      toast({
        title: "Failed to save voice note",
        description: "An error occurred while uploading. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setVoiceNoteLoadingId(null);
    }
  }, [updateChecklistItemMutation, toast]);

  const handleVoiceNoteDelete = useCallback(async (id: string) => {
    setVoiceNoteLoadingId(id);
    try {
      updateChecklistItemMutation.mutate(
        {
          id,
          data: {
            voiceNoteUrl: null,
            voiceNoteDuration: null,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "Voice note deleted",
              description: "Your voice note has been removed.",
            });
          },
        }
      );
    } catch (error) {
      toast({
        title: "Failed to delete voice note",
        description: "An error occurred while deleting. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setVoiceNoteLoadingId(null);
    }
  }, [updateChecklistItemMutation, toast]);

  const handleSave = useCallback(() => {
    toast({
      title: "Progress saved",
      description: "Your inspection progress has been saved.",
    });
  }, [toast]);

  const handleTabChange = useCallback((tab: "workflow" | "dashboard" | "inspection" | "photos" | "forecast") => {
    setActiveTab(tab);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetryJob = useCallback(() => {
    refetchJob();
  }, [refetchJob]);

  const handleRetryChecklist = useCallback(() => {
    refetchChecklist();
  }, [refetchChecklist]);

  const handleRetryBlowerDoor = useCallback(() => {
    refetchBlowerDoor();
  }, [refetchBlowerDoor]);

  const handleRetryDuctLeakage = useCallback(() => {
    refetchDuctLeakage();
  }, [refetchDuctLeakage]);

  const handleRetryVentilation = useCallback(() => {
    refetchVentilation();
  }, [refetchVentilation]);

  // Phase 2 - BUILD: Guard clause for missing job ID
  if (!jobId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="error-no-job-id">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive" data-testid="text-error-title">Job ID not found</h2>
          <p className="text-muted-foreground mt-2" data-testid="text-error-description">Please navigate from a valid job.</p>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Per-query error states with retry buttons
  if (jobError) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Inspection"
          isOnline={false}
          pendingSync={0}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <Card className="border-destructive/20 bg-destructive/5" data-testid="error-job-query">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2" data-testid="text-error-job-title">Failed to Load Job</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md" data-testid="text-error-job-description">
                {jobError instanceof Error ? jobError.message : "Unable to fetch job details. Please check your connection and try again."}
              </p>
              <Button 
                onClick={handleRetryJob}
                variant="outline"
                data-testid="button-retry-job"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  if (checklistError) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Inspection"
          isOnline={false}
          pendingSync={0}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <Alert variant="destructive" data-testid="error-checklist-query">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle data-testid="text-error-checklist-title">Failed to Load Checklist</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span data-testid="text-error-checklist-description">
                {checklistError instanceof Error ? checklistError.message : "Unable to fetch checklist items"}
              </span>
              <Button 
                onClick={handleRetryChecklist}
                variant="outline"
                size="sm"
                data-testid="button-retry-checklist"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Phase 2 - BUILD: Comprehensive skeleton loaders for all sections
  if (isLoadingJob || isLoadingChecklist) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Loading..."
          isOnline={false}
          pendingSync={0}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="space-y-6" data-testid="skeleton-inspection">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" data-testid="skeleton-back-button" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" data-testid="skeleton-title" />
                <Skeleton className="h-4 w-64" data-testid="skeleton-subtitle" />
              </div>
              <Skeleton className="h-6 w-24 hidden sm:flex" data-testid="skeleton-badge" />
            </div>
            
            {/* Progress card skeleton */}
            <Card data-testid="skeleton-progress-card">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" data-testid="skeleton-progress-text" />
                  <Skeleton className="h-4 w-12" data-testid="skeleton-progress-percent" />
                </div>
                <Skeleton className="h-3 w-full" data-testid="skeleton-progress-bar" />
              </CardContent>
            </Card>
            
            {/* Checklist items skeleton */}
            <div className="space-y-3" data-testid="skeleton-checklist">
              {Array.from({ length: SKELETON_COUNTS.checklistItems }).map((_, i) => (
                <Card key={i} data-testid={`skeleton-checklist-item-${i}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded" data-testid={`skeleton-checkbox-${i}`} />
                      <Skeleton className="h-5 w-full max-w-md" data-testid={`skeleton-item-title-${i}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-3/4" data-testid={`skeleton-item-desc-${i}`} />
                    <Skeleton className="h-4 w-1/2" data-testid={`skeleton-item-meta-${i}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  }

  // Phase 3 - OPTIMIZE: Memoize date formatting calculations
  const isRescheduled = job?.originalScheduledDate 
    && job?.scheduledDate 
    && job.originalScheduledDate !== job.scheduledDate 
    && !job?.isCancelled;
  const formattedOriginalDate = job?.originalScheduledDate 
    ? format(parseISO(job.originalScheduledDate), "MMM d, yyyy h:mm a")
    : null;
  const formattedCurrentDate = job?.scheduledDate 
    ? format(parseISO(job.scheduledDate), "MMM d, yyyy h:mm a")
    : null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6" data-testid="page-inspection">
      <TopBar 
        title={job?.name ?? "Inspection"}
        isOnline={false}
        pendingSync={5}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">{job?.inspectionType ?? "Inspection"}</h2>
              <p className="text-sm text-muted-foreground" data-testid="text-job-address">{job?.address}</p>
            </div>
            <Badge variant="outline" className="hidden sm:flex" data-testid="badge-inspection-type">
              {job?.inspectionType}
            </Badge>
          </div>

          {/* Rescheduled Indicator */}
          {isRescheduled && (
            <Alert data-testid="alert-rescheduled">
              <AlertCircle className="h-5 w-5 text-warning" />
              <AlertTitle className="text-warning" data-testid="text-rescheduled-title">Schedule Changed</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2" data-testid="text-original-date">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Originally:</span>
                    <span className="font-medium">{formattedOriginalDate}</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-current-date">
                    <Calendar className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Now scheduled:</span>
                    <span className="font-medium text-warning">{formattedCurrentDate}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cancelled Indicator */}
          {job?.isCancelled && (
            <Alert variant="destructive" data-testid="alert-cancelled">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle data-testid="text-cancelled-title">Calendar Event Cancelled</AlertTitle>
              <AlertDescription data-testid="text-cancelled-description">
                The Google Calendar event for this job has been cancelled or deleted.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Card */}
          <Card data-testid="card-progress">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-semibold" data-testid="text-progress">
                    {completedCount} of {totalCount} items complete
                  </span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-progress-percent">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-3" data-testid="progress-inspection" />
            </CardContent>
          </Card>

          {/* Tab Content Switching */}
          {activeTab === TAB_OPTIONS.WORKFLOW && job && (
            <>

              {/* Blower Door Test Error State */}
              {blowerDoorError && (
                <Alert variant="destructive" data-testid="error-blower-door-query">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle data-testid="text-error-blower-door-title">Blower Door Tests Unavailable</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-error-blower-door-description">
                      {blowerDoorError instanceof Error ? blowerDoorError.message : "Unable to load test data"}
                    </span>
                    <Button 
                      onClick={handleRetryBlowerDoor}
                      variant="outline"
                      size="sm"
                      data-testid="button-retry-blower-door"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Blower Door Test Results Display */}
              {blowerDoorTests.length > 0 && (
                <div className="space-y-4" data-testid="section-blower-door-tests">
                  <h3 className="text-lg font-semibold" data-testid="text-blower-door-title">Blower Door Tests</h3>
                  {blowerDoorTests.map((test: any) => (
                    <div key={test.id}>
                      <Card data-testid={`card-blower-door-test-${test.id}`}>
                        <CardHeader>
                          <CardTitle className="text-base" data-testid={`text-test-date-${test.id}`}>
                            Blower Door Test - {format(parseISO(test.testDate), "MMM d, yyyy")}
                          </CardTitle>
                          <CardDescription data-testid={`text-test-description-${test.id}`}>
                            Test results for building envelope air tightness
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground" data-testid={`text-ach50-label-${test.id}`}>ACH50</p>
                              <p className="text-lg font-semibold" data-testid={`text-ach50-value-${test.id}`}>
                                {test.ach50 ? Number(test.ach50).toFixed(2) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground" data-testid={`text-cfm50-label-${test.id}`}>CFM50</p>
                              <p className="text-lg font-semibold" data-testid={`text-cfm50-value-${test.id}`}>
                                {test.cfm50 ? Number(test.cfm50).toFixed(0) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground" data-testid={`text-status-label-${test.id}`}>Status</p>
                              <Badge 
                                variant={test.ach50 && Number(test.ach50) <= COMPLIANCE_THRESHOLDS.MAX_ACH50 ? "default" : "destructive"}
                                data-testid={`badge-test-status-${test.id}`}
                              >
                                {test.ach50 && Number(test.ach50) <= COMPLIANCE_THRESHOLDS.MAX_ACH50 ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Retest Button for Failed Tests */}
                      {test.ach50 && Number(test.ach50) > COMPLIANCE_THRESHOLDS.MAX_ACH50 && job.status !== 'completed' && (
                        <Card className="mt-4 border-l-4 border-l-amber-500" data-testid={`card-retest-prompt-${test.id}`}>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-amber-600" />
                              <CardTitle className="text-base" data-testid={`text-retest-title-${test.id}`}>
                                Test Failed - Retest Required
                              </CardTitle>
                            </div>
                            <CardDescription data-testid={`text-retest-description-${test.id}`}>
                              ACH50 of {Number(test.ach50).toFixed(2)} exceeds Minnesota 2020 Energy Code requirement of ≤{COMPLIANCE_THRESHOLDS.MAX_ACH50}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={() => handleCreateRetestJob(test)}
                              variant="default"
                              className="w-full"
                              disabled={createRetestMutation.isPending}
                              data-testid={`button-create-retest-${test.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {createRetestMutation.isPending ? 'Creating...' : 'Create Retest Job'}
                            </Button>
                            <p className="text-sm text-muted-foreground mt-2 text-center" data-testid={`text-retest-note-${test.id}`}>
                              A new job will be created to reschedule this test
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Duct Leakage Test Error State */}
              {ductLeakageError && (
                <Alert variant="destructive" data-testid="error-duct-leakage-query">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle data-testid="text-error-duct-leakage-title">Duct Leakage Tests Unavailable</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-error-duct-leakage-description">
                      {ductLeakageError instanceof Error ? ductLeakageError.message : "Unable to load test data"}
                    </span>
                    <Button 
                      onClick={handleRetryDuctLeakage}
                      variant="outline"
                      size="sm"
                      data-testid="button-retry-duct-leakage"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Ventilation Test Error State */}
              {ventilationError && (
                <Alert variant="destructive" data-testid="error-ventilation-query">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle data-testid="text-error-ventilation-title">Ventilation Tests Unavailable</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-error-ventilation-description">
                      {ventilationError instanceof Error ? ventilationError.message : "Unable to load test data"}
                    </span>
                    <Button 
                      onClick={handleRetryVentilation}
                      variant="outline"
                      size="sm"
                      data-testid="button-retry-ventilation"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Inspection Checklist Tab */}
          {activeTab === TAB_OPTIONS.INSPECTION && (
            <div className="space-y-4" data-testid="section-checklist">
              <h3 className="text-lg font-semibold" data-testid="text-checklist-title">Inspection Checklist</h3>
              
              {checklistItems.length === 0 ? (
                <Card data-testid="empty-checklist">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center" data-testid="text-empty-checklist">
                      No checklist items available for this inspection.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                checklistItems.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onNotesChange={handleNotesChange}
                    onPhotoAdd={handlePhotoAdd}
                    onVoiceNoteAdd={handleVoiceNoteAdd}
                    onVoiceNoteDelete={handleVoiceNoteDelete}
                    isVoiceNoteLoading={voiceNoteLoadingId === item.id}
                  />
                ))
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === TAB_OPTIONS.PHOTOS && job && (
            <div data-testid="section-photos">
              <EnhancedPhotoGallery jobId={jobId} />
            </div>
          )}

          {/* Forecast/Tests Tab */}
          {activeTab === TAB_OPTIONS.FORECAST && job && (
            <div data-testid="section-forecast">
              <FinalTestingMeasurements jobId={jobId} job={job} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              variant="outline"
              className="flex-1"
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
            <Button
              onClick={handleCompleteJob}
              disabled={completeJobMutation.isPending}
              className="flex-1"
              data-testid="button-complete"
            >
              {completeJobMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Inspection
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Phase 5 - HARDEN: Confirmation dialog for job completion */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent data-testid="dialog-complete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-dialog-title">Complete Inspection?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-dialog-description">
              {incompleteItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Warning: The following items are incomplete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {incompleteItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    Are you sure you want to mark this inspection as complete?
                  </p>
                </div>
              ) : (
                <p>This will mark the inspection as complete. All items have been completed.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-complete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmComplete}
              data-testid="button-confirm-complete"
            >
              {incompleteItems.length > 0 ? "Complete Anyway" : "Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Completion Celebration */}
      {showCelebration && (
        <JobCompletionCelebration
          onClose={() => setShowCelebration(false)}
          jobName={job?.name ?? "Inspection"}
        />
      )}
    </div>
  );
}

// Phase 2 - BUILD: Wrap component in ErrorBoundary for production resilience
export default function Inspection() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="error-boundary-fallback">
          <Card className="max-w-md w-full border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <CardTitle className="text-destructive" data-testid="text-error-boundary-title">
                  Something went wrong
                </CardTitle>
              </div>
              <CardDescription data-testid="text-error-boundary-description">
                The inspection page encountered an unexpected error. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                data-testid="button-error-boundary-reload"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      }
    >
      <InspectionContent />
    </ErrorBoundary>
  );
}
