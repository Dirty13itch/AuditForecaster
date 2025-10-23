import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, CheckCircle2, Loader2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import ChecklistItem from "@/components/ChecklistItem";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { clientLogger } from "@/lib/logger";
import type { ChecklistItem as ChecklistItemType, UpdateChecklistItem } from "@shared/schema";

export default function Inspection() {
  const { id: jobId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inspection" | "photos" | "forecast">("inspection");
  const [voiceNoteLoadingId, setVoiceNoteLoadingId] = useState<string | null>(null);

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

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <TopBar 
        title="Johnson Residence - Pre-Drywall"
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
              <h2 className="text-xl font-bold" data-testid="text-page-title">Pre-Drywall Inspection</h2>
              <p className="text-sm text-muted-foreground">1234 Oak Street, Minneapolis, MN</p>
            </div>
            <Badge variant="outline" className="hidden sm:flex" data-testid="badge-inspection-type">
              Pre-Drywall
            </Badge>
          </div>

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
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
