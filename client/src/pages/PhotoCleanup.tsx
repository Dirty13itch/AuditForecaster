import { useState, useMemo, useCallback } from "react";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  Smartphone, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  HardDrive,
  Clock,
  RotateCcw,
  RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { PhotoUploadSession } from "@shared/schema";

/**
 * PhotoCleanup - Production-ready photo cleanup management page
 * 
 * Features:
 * - Photo upload session tracking
 * - Storage estimation and management
 * - Bulk cleanup confirmation
 * - Error handling with retry capability
 * - Comprehensive test coverage
 */

function PhotoCleanupContent() {
  const { toast } = useToast();
  const [confirmingSession, setConfirmingSession] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Phase 5 - HARDEN: Query with retry: 2 for resilience
  const { data: sessions, isLoading, error, refetch } = useQuery<PhotoUploadSession[]>({
    queryKey: ["/api/photos/cleanup-sessions"],
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoized mutation for stable reference
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

  // Phase 3 - OPTIMIZE: Memoized handlers prevent unnecessary re-renders
  const handleConfirmCleanup = useCallback((sessionId: string) => {
    setConfirmingSession(sessionId);
  }, []);

  const confirmCleanup = useCallback(() => {
    if (confirmingSession) {
      confirmCleanupMutation.mutate(confirmingSession);
      setConfirmingSession(null);
    }
  }, [confirmingSession, confirmCleanupMutation]);

  const handleBulkConfirm = useCallback(() => {
    if (selectedSessions.size > 0) {
      bulkConfirmMutation.mutate(Array.from(selectedSessions));
    }
  }, [selectedSessions, bulkConfirmMutation]);

  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (sessions) {
      setSelectedSessions(new Set(sessions.filter(s => !s.cleanupConfirmed).map(s => s.id)));
    }
  }, [sessions]);

  const deselectAll = useCallback(() => {
    setSelectedSessions(new Set());
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Phase 3 - OPTIMIZE: Memoized utility function
  const estimateStorageSize = useCallback((photoCount: number): string => {
    const avgSizeMB = 4;
    const totalMB = photoCount * avgSizeMB;
    
    if (totalMB < 1000) {
      return `~${totalMB} MB`;
    } else {
      return `~${(totalMB / 1000).toFixed(1)} GB`;
    }
  }, []);

  const getDeviceIcon = useCallback((deviceInfo?: string) => {
    if (!deviceInfo) return <Smartphone className="h-5 w-5" data-testid="icon-device-default" />;
    
    const info = deviceInfo.toLowerCase();
    if (info.includes("iphone") || info.includes("ipad")) {
      return <Smartphone className="h-5 w-5 text-gray-600" data-testid="icon-device-ios" />;
    } else if (info.includes("android")) {
      return <Smartphone className="h-5 w-5 text-green-600" data-testid="icon-device-android" />;
    } else {
      return <Camera className="h-5 w-5" data-testid="icon-device-camera" />;
    }
  }, []);

  // Phase 3 - OPTIMIZE: Memoized computations
  const pendingSessions = useMemo(
    () => sessions?.filter(s => !s.cleanupConfirmed) || [],
    [sessions]
  );

  const totalPhotos = useMemo(
    () => pendingSessions.reduce((sum, s) => sum + s.photoCount, 0),
    [pendingSessions]
  );

  const estimatedSpace = useMemo(
    () => estimateStorageSize(totalPhotos),
    [totalPhotos, estimateStorageSize]
  );

  // Phase 2 - BUILD: Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col" data-testid="div-loading-container">
        <TopBar />
        <div className="flex-1 p-4 space-y-4" data-testid="div-loading-content">
          <Skeleton className="h-32 w-full" data-testid="skeleton-summary" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-session-1" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-session-2" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Phase 5 - HARDEN: Error state with retry capability
  if (error) {
    return (
      <div className="flex h-screen flex-col" data-testid="div-error-container">
        <TopBar />
        <div className="flex-1 flex items-center justify-center p-4" data-testid="div-error-content">
          <Card className="max-w-md w-full" data-testid="card-error">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center text-center" data-testid="div-error-state">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4" data-testid="div-error-icon">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Failed to Load Sessions</h2>
                <p className="text-muted-foreground mb-4" data-testid="text-error-message">
                  {error instanceof Error ? error.message : 'Unable to fetch cleanup sessions'}
                </p>
                <Button onClick={handleRetry} data-testid="button-retry">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" data-testid="div-main-container">
      <TopBar />
      
      <div className="flex-1 overflow-auto p-4 pb-20" data-testid="div-main-content">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2" data-testid="div-page-header">
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <HardDrive className="h-6 w-6" data-testid="icon-hard-drive" />
              Device Storage Cleanup
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Manage photo cleanup reminders to free up space on your device
            </p>
          </div>

          {pendingSessions.length > 0 && (
            <Alert data-testid="alert-storage-reminder">
              <AlertCircle className="h-4 w-4" data-testid="icon-alert" />
              <AlertTitle data-testid="text-alert-title">Storage Reminder</AlertTitle>
              <AlertDescription data-testid="text-alert-description">
                You have {pendingSessions.length} upload session{pendingSessions.length !== 1 ? "s" : ""} with {totalPhotos} photos 
                that may still be on your device, using approximately {estimatedSpace} of storage.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card */}
          <Card data-testid="card-summary">
            <CardHeader>
              <CardTitle data-testid="text-summary-title">Storage Summary</CardTitle>
              <CardDescription data-testid="text-summary-description">
                Overview of pending cleanup sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center" data-testid="div-summary-stats">
                <div data-testid="stat-pending-sessions">
                  <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Sessions</p>
                </div>
                <div data-testid="stat-total-photos">
                  <p className="text-2xl font-bold" data-testid="text-photos-count">{totalPhotos}</p>
                  <p className="text-sm text-muted-foreground">Total Photos</p>
                </div>
                <div data-testid="stat-estimated-space">
                  <p className="text-2xl font-bold" data-testid="text-space-estimate">{estimatedSpace}</p>
                  <p className="text-sm text-muted-foreground">Est. Storage</p>
                </div>
              </div>
              
              {totalPhotos > 0 && (
                <div className="space-y-2" data-testid="div-storage-progress">
                  <div className="flex justify-between text-sm">
                    <span data-testid="text-storage-label">Storage Usage</span>
                    <span className="font-medium" data-testid="text-storage-value">{estimatedSpace}</span>
                  </div>
                  <Progress value={Math.min((totalPhotos * 4) / 1000 * 100, 100)} className="h-2" data-testid="progress-storage" />
                  <p className="text-xs text-muted-foreground" data-testid="text-storage-note">
                    Based on average photo size of 4 MB
                  </p>
                </div>
              )}
            </CardContent>
            {pendingSessions.length > 0 && (
              <CardFooter className="flex justify-between" data-testid="footer-summary">
                <div className="flex gap-2">
                  {selectedSessions.size === 0 ? (
                    <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                      Select All
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                        Deselect All
                      </Button>
                      <Badge data-testid="badge-selected-count">{selectedSessions.size} selected</Badge>
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
            <div className="space-y-4" data-testid="div-sessions-list">
              <h2 className="text-lg font-semibold" data-testid="text-sessions-title">Pending Cleanup Sessions</h2>
              {pendingSessions.map((session, index) => (
                <Card key={session.id} className={selectedSessions.has(session.id) ? "ring-2 ring-primary" : ""} data-testid={`card-session-${session.id}`}>
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
                          <CardTitle className="text-base flex items-center gap-2" data-testid={`text-device-${index}`}>
                            {getDeviceIcon(session.deviceInfo)}
                            {session.deviceInfo || "Unknown Device"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1" data-testid={`text-upload-time-${index}`}>
                            <Clock className="h-3 w-3" />
                            Uploaded {formatDistanceToNow(new Date(session.uploadDate), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={session.reminderSent ? "secondary" : "default"} data-testid={`badge-status-${index}`}>
                        {session.reminderSent ? "Reminder Sent" : "New"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm" data-testid={`div-session-details-${index}`}>
                      <div>
                        <p className="text-muted-foreground">Photos Uploaded</p>
                        <p className="font-medium" data-testid={`text-photo-count-${index}`}>{session.photoCount} photos</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estimated Size</p>
                        <p className="font-medium" data-testid={`text-size-estimate-${index}`}>{estimateStorageSize(session.photoCount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Upload Date</p>
                        <p className="font-medium" data-testid={`text-upload-date-${index}`}>{format(new Date(session.uploadDate), "MMM d, yyyy h:mm a")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Session ID</p>
                        <p className="font-mono text-xs" data-testid={`text-session-id-${index}`}>{session.sessionId}</p>
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
            <Card data-testid="card-empty-state">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" data-testid="icon-empty-success" />
                <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">All Caught Up!</h3>
                <p className="text-muted-foreground" data-testid="text-empty-description">
                  No pending cleanup sessions. Your device storage is well managed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cleanup Tips */}
          <Card data-testid="card-tips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-tips-title">
                <RotateCcw className="h-5 w-5" />
                Storage Management Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground" data-testid="list-tips">
                <li className="flex items-start gap-2" data-testid="tip-1">
                  <span>•</span>
                  <span>Photos are automatically uploaded to the cloud when you add them to a job</span>
                </li>
                <li className="flex items-start gap-2" data-testid="tip-2">
                  <span>•</span>
                  <span>After confirming upload, you can safely delete photos from your device gallery</span>
                </li>
                <li className="flex items-start gap-2" data-testid="tip-3">
                  <span>•</span>
                  <span>Use your device's "Recently Deleted" folder to recover photos if needed</span>
                </li>
                <li className="flex items-start gap-2" data-testid="tip-4">
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
        <AlertDialogContent data-testid="dialog-confirm-cleanup">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-dialog-title">Confirm Device Cleanup</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-dialog-description">
              Please confirm that you have deleted these photos from your device to free up storage space.
              The photos are safely stored in the cloud and can be accessed through this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-cleanup">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCleanup} data-testid="button-confirm-cleanup">
              Yes, I've Cleaned My Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
export default function PhotoCleanup() {
  return (
    <ErrorBoundary>
      <PhotoCleanupContent />
    </ErrorBoundary>
  );
}
