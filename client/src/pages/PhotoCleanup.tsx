import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Smartphone, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  HardDrive,
  Clock,
  RotateCcw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { PhotoUploadSession } from "@shared/schema";

export default function PhotoCleanup() {
  const { toast } = useToast();
  const [confirmingSession, setConfirmingSession] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Fetch pending cleanup sessions
  const { data: sessions, isLoading } = useQuery<PhotoUploadSession[]>({
    queryKey: ["/api/photos/cleanup-sessions"],
  });

  // Confirm cleanup mutation
  const confirmCleanupMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/photos/cleanup-sessions/${sessionId}/confirm`, {
        method: "POST",
      });
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos/cleanup-sessions"] });
      toast({
        title: "Cleanup Confirmed",
        description: "Session marked as cleaned up. Thank you for managing your device storage!",
      });
      setSelectedSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Confirmation Failed",
        description: "Failed to confirm cleanup. Please try again.",
      });
    },
  });

  // Bulk confirm mutation
  const bulkConfirmMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      return await Promise.all(
        sessionIds.map(id =>
          apiRequest(`/api/photos/cleanup-sessions/${id}/confirm`, {
            method: "POST",
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos/cleanup-sessions"] });
      toast({
        title: "Bulk Cleanup Confirmed",
        description: `${selectedSessions.size} sessions marked as cleaned up.`,
      });
      setSelectedSessions(new Set());
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Bulk Confirmation Failed",
        description: "Failed to confirm some sessions. Please try again.",
      });
    },
  });

  const handleConfirmCleanup = (sessionId: string) => {
    setConfirmingSession(sessionId);
  };

  const confirmCleanup = () => {
    if (confirmingSession) {
      confirmCleanupMutation.mutate(confirmingSession);
      setConfirmingSession(null);
    }
  };

  const handleBulkConfirm = () => {
    if (selectedSessions.size > 0) {
      bulkConfirmMutation.mutate(Array.from(selectedSessions));
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (sessions) {
      setSelectedSessions(new Set(sessions.filter(s => !s.cleanupConfirmed).map(s => s.id)));
    }
  };

  const deselectAll = () => {
    setSelectedSessions(new Set());
  };

  const estimateStorageSize = (photoCount: number): string => {
    // Estimate average photo size: 3-5 MB per photo
    const avgSizeMB = 4;
    const totalMB = photoCount * avgSizeMB;
    
    if (totalMB < 1000) {
      return `~${totalMB} MB`;
    } else {
      return `~${(totalMB / 1000).toFixed(1)} GB`;
    }
  };

  const getDeviceIcon = (deviceInfo?: string) => {
    if (!deviceInfo) return <Smartphone className="h-5 w-5" />;
    
    const info = deviceInfo.toLowerCase();
    if (info.includes("iphone") || info.includes("ipad")) {
      return <Smartphone className="h-5 w-5 text-gray-600" />;
    } else if (info.includes("android")) {
      return <Smartphone className="h-5 w-5 text-green-600" />;
    } else {
      return <Camera className="h-5 w-5" />;
    }
  };

  const pendingSessions = sessions?.filter(s => !s.cleanupConfirmed) || [];
  const totalPhotos = pendingSessions.reduce((sum, s) => sum + s.photoCount, 0);
  const estimatedSpace = estimateStorageSize(totalPhotos);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardDrive className="h-6 w-6" />
              Device Storage Cleanup
            </h1>
            <p className="text-muted-foreground">
              Manage photo cleanup reminders to free up space on your device
            </p>
          </div>

          {pendingSessions.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Storage Reminder</AlertTitle>
              <AlertDescription>
                You have {pendingSessions.length} upload session{pendingSessions.length !== 1 ? "s" : ""} with {totalPhotos} photos 
                that may still be on your device, using approximately {estimatedSpace} of storage.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Summary</CardTitle>
              <CardDescription>
                Overview of pending cleanup sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{pendingSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPhotos}</p>
                  <p className="text-sm text-muted-foreground">Total Photos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{estimatedSpace}</p>
                  <p className="text-sm text-muted-foreground">Est. Storage</p>
                </div>
              </div>
              
              {totalPhotos > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Usage</span>
                    <span className="font-medium">{estimatedSpace}</span>
                  </div>
                  <Progress value={Math.min((totalPhotos * 4) / 1000 * 100, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Based on average photo size of 4 MB
                  </p>
                </div>
              )}
            </CardContent>
            {pendingSessions.length > 0 && (
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  {selectedSessions.size === 0 ? (
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={deselectAll}>
                        Deselect All
                      </Button>
                      <Badge>{selectedSessions.size} selected</Badge>
                    </>
                  )}
                </div>
                {selectedSessions.size > 0 && (
                  <Button
                    onClick={handleBulkConfirm}
                    disabled={bulkConfirmMutation.isPending}
                    data-testid="button-bulk-confirm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Selected
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>

          {/* Session List */}
          {pendingSessions.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pending Cleanup Sessions</h2>
              {pendingSessions.map((session) => (
                <Card key={session.id} className={selectedSessions.has(session.id) ? "ring-2 ring-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSessions.has(session.id)}
                          onChange={() => toggleSessionSelection(session.id)}
                          className="rounded"
                          data-testid={`checkbox-session-${session.id}`}
                        />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {getDeviceIcon(session.deviceInfo)}
                            {session.deviceInfo || "Unknown Device"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            Uploaded {formatDistanceToNow(new Date(session.uploadDate), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={session.reminderSent ? "secondary" : "default"}>
                        {session.reminderSent ? "Reminder Sent" : "New"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Photos Uploaded</p>
                        <p className="font-medium">{session.photoCount} photos</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estimated Size</p>
                        <p className="font-medium">{estimateStorageSize(session.photoCount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Upload Date</p>
                        <p className="font-medium">{format(new Date(session.uploadDate), "MMM d, yyyy h:mm a")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Session ID</p>
                        <p className="font-mono text-xs">{session.sessionId}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleConfirmCleanup(session.id)}
                      disabled={confirmCleanupMutation.isPending}
                      className="w-full"
                      data-testid={`button-confirm-${session.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Mark as Cleaned
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  No pending cleanup sessions. Your device storage is well managed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cleanup Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Storage Management Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Photos are automatically uploaded to the cloud when you add them to a job</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>After confirming upload, you can safely delete photos from your device gallery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Use your device's "Recently Deleted" folder to recover photos if needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Enable automatic cleanup in your device settings for better storage management</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmingSession} onOpenChange={() => setConfirmingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Device Cleanup</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you have deleted these photos from your device to free up storage space.
              The photos are safely stored in the cloud and can be accessed through this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCleanup} data-testid="button-confirm-cleanup">
              Yes, I've Cleaned My Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}