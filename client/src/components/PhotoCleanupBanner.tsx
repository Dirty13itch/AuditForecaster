import { useQuery, useMutation } from "@tanstack/react-query";
import { ImageIcon, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UploadSession } from "@shared/schema";

export function PhotoCleanupBanner() {
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery<UploadSession[]>({
    queryKey: ['/api/upload-sessions'],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      await Promise.all(
        sessionIds.map(id => 
          apiRequest('PATCH', `/api/upload-sessions/${id}/acknowledge`)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/upload-sessions'] });
      toast({
        title: "Reminder dismissed",
        description: "Great job keeping your Google Photos organized!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to dismiss reminder",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return null;
  }

  const unacknowledgedSessions = sessions?.filter(s => !s.acknowledged) ?? [];
  
  if (unacknowledgedSessions.length === 0) {
    return null;
  }

  const totalPhotos = unacknowledgedSessions.reduce((sum, session) => sum + session.photoCount, 0);
  const sessionCount = unacknowledgedSessions.length;

  const handleAcknowledge = () => {
    const sessionIds = unacknowledgedSessions.map(s => s.id);
    acknowledgeMutation.mutate(sessionIds);
  };

  return (
    <Alert className="border-primary/30 bg-primary/5 mb-6" data-testid="alert-photo-cleanup">
      <ImageIcon className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">
        Remember to clean up your Google Photos
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4 mt-2">
        <span className="text-sm text-muted-foreground">
          You've uploaded <strong className="text-foreground">{totalPhotos}</strong> photo{totalPhotos !== 1 ? 's' : ''} in{' '}
          <strong className="text-foreground">{sessionCount}</strong> session{sessionCount !== 1 ? 's' : ''}.
          Consider deleting them from your personal Google Photos to free up space.
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAcknowledge}
            disabled={acknowledgeMutation.isPending}
            data-testid="button-mark-cleaned"
          >
            {acknowledgeMutation.isPending ? (
              <>
                <span className="mr-2">Marking...</span>
              </>
            ) : (
              <>
                <X className="h-3 w-3 mr-2" />
                Mark as Cleaned Up
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
