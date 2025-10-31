import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, CheckCircle2, Loader2, Calendar, AlertCircle, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import TopBar from "@/components/TopBar";
import ChecklistItem from "@/components/ChecklistItem";
import BottomNav from "@/components/BottomNav";
import { FinalTestingMeasurements } from "@/components/FinalTestingMeasurements";
import { EnhancedPhotoGallery } from "@/components/photos/EnhancedPhotoGallery";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { CompletionGate } from "@/components/CompletionGate";
import { JobCompletionCelebration } from "@/components/JobCompletionCelebration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { clientLogger } from "@/lib/logger";
import { getWorkflowTemplate, type JobType } from '@shared/workflowTemplates';
import type { ChecklistItem as ChecklistItemType, UpdateChecklistItem, Job } from "@shared/schema";

export default function Inspection() {
  const { id: jobId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"workflow" | "dashboard" | "inspection" | "photos" | "forecast">("workflow");
  const [voiceNoteLoadingId, setVoiceNoteLoadingId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: job, isLoading: isLoadingJob } = useQuery<Job>({
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
  });

  const { data: checklistItems = [], isLoading, isError } = useQuery<ChecklistItemType[]>({
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
  });

  // Query for test data to determine workflow progress
  const { data: blowerDoorTests = [] } = useQuery({
    queryKey: ["/api/blower-door-tests", jobId],
    enabled: !!jobId,
  });

  const { data: ductLeakageTests = [] } = useQuery({
    queryKey: ["/api/duct-leakage-tests", jobId],
    enabled: !!jobId,
  });

  const { data: ventilationTests = [] } = useQuery({
    queryKey: ["/api/ventilation-tests", jobId],
    enabled: !!jobId,
  });

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
      clientLogger.error("Error updating checklist item:", error);
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

  const completeJobMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/jobs/${jobId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      setShowCelebration(true);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Cannot Complete Job",
        description: error.message || "Please complete all requirements first",
      });
    },
  });

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
        status: 'pending',
        notes: `Retest following failed blower door test ${testId}. Previous ACH50 exceeded 3.0.`,
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

  const handleCompleteJob = () => {
    completeJobMutation.mutate();
  };

  const handleCreateRetestJob = (test: any) => {
    createRetestMutation.mutate(test.id);
  };

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Check if all workflow requirements are met
  const canCompleteJob = job ? (() => {
    const workflow = getWorkflowTemplate(job.inspectionType as JobType);
    
    // Check completion requirements
    const requirementsMet = 
      (!workflow.completionRequirements.allChecklistItemsCompleted || 
        (completedCount === totalCount && totalCount > 0)) &&
      (!workflow.completionRequirements.photoUploadRequired || 
        job.photoUploadComplete === true) &&
      (!workflow.completionRequirements.builderSignatureRequired || 
        !!job.builderSignatureUrl);
    
    // Check required tests
    const testsMet = workflow.requiredTests.every(test => {
      if (test.testType === 'blower_door') return blowerDoorTests.length > 0;
      if (test.testType === 'duct_leakage') return ductLeakageTests.length > 0;
      if (test.testType === 'ventilation') return ventilationTests.length > 0;
      return true;
    });
    
    return requirementsMet && testsMet;
  })() : false;

  const handleToggle = (id: string) => {
    const item = checklistItems.find((i) => i.id === id);
    if (!item) return;
    
    updateChecklistItemMutation.mutate({
      id,
      data: { completed: !item.completed },
    });
  };

  const handleNotesChange = (id: string, notes: string) => {
    updateChecklistItemMutation.mutate({
      id,
      data: { notes },
    });
  };

  const handlePhotoAdd = (id: string) => {
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
  };

  const handleVoiceNoteAdd = async (id: string, audioBlob: Blob, duration: number) => {
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
      clientLogger.error("Error uploading voice note:", error);
      toast({
        title: "Failed to save voice note",
        description: "An error occurred while uploading. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setVoiceNoteLoadingId(null);
    }
  };

  const handleVoiceNoteDelete = async (id: string) => {
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
      clientLogger.error("Error deleting voice note:", error);
      toast({
        title: "Failed to delete voice note",
        description: "An error occurred while deleting. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setVoiceNoteLoadingId(null);
    }
  };

  const handleSave = () => {
    toast({
      title: "Progress saved",
      description: "Your inspection progress has been saved.",
    });
  };

  if (!jobId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Job ID not found</h2>
          <p className="text-muted-foreground mt-2">Please navigate from a valid job.</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Inspection"
          isOnline={false}
          pendingSync={0}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-6 text-center">
            <h2 className="text-xl font-bold text-destructive">Failed to load inspection</h2>
            <p className="text-muted-foreground mt-2">
              There was an error loading the checklist items. Please try again.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/checklist-items", jobId] })}
              data-testid="button-retry"
            >
              Retry
            </Button>
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  if (isLoading || isLoadingJob) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-6">
        <TopBar 
          title="Loading..."
          isOnline={false}
          pendingSync={0}
        />
        <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

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
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title={job?.name ?? "Inspection"}
        isOnline={false}
        pendingSync={5}
      />
      
      <main className="pt-20 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold" data-testid="text-page-title">{job?.inspectionType ?? "Inspection"}</h2>
              <p className="text-sm text-muted-foreground">{job?.address}</p>
            </div>
            <Badge variant="outline" className="hidden sm:flex" data-testid="badge-inspection-type">
              {job?.inspectionType}
            </Badge>
          </div>

          {/* Rescheduled Indicator */}
          {isRescheduled && (
            <div className="bg-warning/10 border border-warning/20 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-warning">Schedule Changed</h3>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Rescheduled
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Originally:</span>
                    <span className="font-medium">{formattedOriginalDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">Now scheduled:</span>
                    <span className="font-medium text-warning">{formattedCurrentDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Indicator */}
          {job?.isCancelled && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-destructive">Calendar Event Cancelled</h3>
                  <Badge variant="destructive">
                    Cancelled
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Google Calendar event for this job has been cancelled or deleted.
                </p>
              </div>
            </div>
          )}

          <div className="bg-card rounded-md border border-card-border p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold" data-testid="text-progress">
                  {completedCount} of {totalCount} items complete
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-inspection" />
          </div>

          {/* Tab Content Switching */}
          {activeTab === "workflow" && job && (
            <>
              <WorkflowProgress
                job={job}
                checklistProgress={{
                  completed: completedCount,
                  total: totalCount,
                }}
                hasBlowerDoorTest={Array.isArray(blowerDoorTests) && blowerDoorTests.length > 0}
                hasDuctLeakageTest={Array.isArray(ductLeakageTests) && ductLeakageTests.length > 0}
                hasVentilationTest={Array.isArray(ventilationTests) && ventilationTests.length > 0}
              />
              
              {/* Completion Requirements */}
              <CompletionGate
                job={job}
                checklistProgress={{ completed: completedCount, total: totalCount }}
                hasBlowerDoorTest={blowerDoorTests.length > 0}
                hasDuctLeakageTest={ductLeakageTests.length > 0}
                hasVentilationTest={ventilationTests.length > 0}
              />

              {/* Blower Door Test Results Display */}
              {blowerDoorTests.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Blower Door Tests</h3>
                  {blowerDoorTests.map((test: any) => (
                    <div key={test.id}>
                      <Card data-testid={`card-blower-door-test-${test.id}`}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Blower Door Test - {format(parseISO(test.testDate), "MMM d, yyyy")}
                          </CardTitle>
                          <CardDescription>
                            Test results for building envelope air tightness
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">ACH50</p>
                              <p className="text-lg font-semibold">{test.ach50?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">CFM50</p>
                              <p className="text-lg font-semibold">{test.cfm50?.toFixed(0) || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <Badge variant={test.ach50 && test.ach50 <= 3.0 ? "default" : "destructive"}>
                                {test.ach50 && test.ach50 <= 3.0 ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Retest Button for Failed Tests */}
                      {test.ach50 && test.ach50 > 3.0 && job.status !== 'completed' && (
                        <Card className="mt-4 border-l-4 border-l-amber-500" data-testid={`card-retest-prompt-${test.id}`}>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-amber-600" />
                              <CardTitle className="text-base">Test Failed - Retest Required</CardTitle>
                            </div>
                            <CardDescription>
                              ACH50 of {test.ach50.toFixed(2)} exceeds Minnesota 2020 Energy Code requirement of ≤3.0
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
                            <p className="text-sm text-muted-foreground mt-2 text-center">
                              Automatically creates bdoor_retest job with previous results linked
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "inspection" && (
            <>
              {/* Final Testing Measurements Section - Only show for Final Testing jobs */}
              {job?.inspectionType === 'Final Testing' && (
                <FinalTestingMeasurements jobId={jobId!} />
              )}

              {checklistItems.length === 0 ? (
                <div className="bg-card rounded-md border border-card-border p-8 text-center">
                  <p className="text-muted-foreground">No checklist items found for this job.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      id={item.id}
                      itemNumber={item.itemNumber}
                      title={item.title}
                      completed={item.completed ?? false}
                      notes={item.notes || ""}
                      photoCount={item.photoCount ?? 0}
                      voiceNoteUrl={item.voiceNoteUrl}
                      voiceNoteDuration={item.voiceNoteDuration}
                      onToggle={handleToggle}
                      onNotesChange={handleNotesChange}
                      onPhotoAdd={handlePhotoAdd}
                      onVoiceNoteAdd={handleVoiceNoteAdd}
                      onVoiceNoteDelete={handleVoiceNoteDelete}
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleSave}
                  data-testid="button-save-draft"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                  disabled={completedCount < totalCount || updateChecklistItemMutation.isPending}
                  data-testid="button-complete"
                >
                  {updateChecklistItemMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Inspection
                </Button>
              </div>
            </>
          )}

          {activeTab === "photos" && jobId && (
            <EnhancedPhotoGallery
              jobId={jobId}
              inspectionType={job?.inspectionType || "General Inspection"}
              enableCapture={true}
              showUploadButton={true}
              data-testid="photo-gallery-inspection"
            />
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inspection Overview</CardTitle>
                  <CardDescription>Quick stats and summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{completedCount}/{totalCount}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <Badge variant={job?.status === 'completed' ? 'default' : 'secondary'}>
                      {job?.status || 'In Progress'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {job?.status !== 'completed' && (
                <Card data-testid="card-complete-job">
                  <CardHeader>
                    <CardTitle className="text-base">Complete Inspection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="default"
                      disabled={!canCompleteJob}
                      onClick={handleCompleteJob}
                      data-testid="button-complete-job"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Job Complete
                    </Button>
                    {!canCompleteJob && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        Complete all workflow requirements first
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "forecast" && (
            <div className="bg-card rounded-md border border-card-border p-8 text-center">
              <p className="text-muted-foreground">Forecast feature coming soon</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Completion Celebration */}
      {showCelebration && job && (
        <JobCompletionCelebration
          job={job}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
