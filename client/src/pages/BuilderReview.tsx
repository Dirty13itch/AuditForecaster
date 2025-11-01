import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, GitMerge, Edit, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BuilderDialog } from "@/components/BuilderDialog";
import type { Builder, InsertBuilder } from "@shared/schema";
import { format } from "date-fns";

interface BuilderWithJobCount extends Builder {
  jobCount: number;
}

/**
 * Phase 2 - BUILD: BuilderReviewContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Manages review queue for temporary builders auto-created from calendar events.
 */
function BuilderReviewContent() {
  const { toast } = useToast();
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderWithJobCount | null>(null);
  const [targetBuilderId, setTargetBuilderId] = useState<string>("");
  const [unknownBuilderId, setUnknownBuilderId] = useState<string>("");

  /**
   * Phase 5 - HARDEN: Fetch review builders with retry: 2
   */
  const { 
    data: reviewBuilders = [], 
    isLoading,
    error: reviewError,
    refetch: refetchReviewBuilders
  } = useQuery<BuilderWithJobCount[]>({
    queryKey: ["/api/builders/review"],
    retry: 2,
  });

  /**
   * Phase 5 - HARDEN: Fetch all builders with retry: 2
   */
  const { 
    data: allBuilders = [],
    error: buildersError,
    refetch: refetchAllBuilders
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  const approveMutation = useMutation({
    mutationFn: async (builderId: string) => {
      const res = await apiRequest("POST", `/api/builders/${builderId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders/review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      toast({
        title: "Builder Approved",
        description: "Builder has been approved and is now active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve builder",
        variant: "destructive",
      });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      const res = await apiRequest("POST", `/api/builders/${sourceId}/merge`, {
        targetBuilderId: targetId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders/review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setMergeDialogOpen(false);
      setSelectedBuilder(null);
      setTargetBuilderId("");
      toast({
        title: "Builders Merged",
        description: "Temporary builder has been merged successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to merge builders",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ builderId, unknownBuilderId }: { builderId: string; unknownBuilderId: string }) => {
      const res = await apiRequest("DELETE", `/api/builders/${builderId}/reject`, {
        unknownBuilderId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders/review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setRejectDialogOpen(false);
      setSelectedBuilder(null);
      setUnknownBuilderId("");
      toast({
        title: "Builder Rejected",
        description: "Temporary builder has been deleted and jobs reassigned",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject builder",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBuilder> }) => {
      const res = await apiRequest("PUT", `/api/builders/${id}`, data);
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builders"] });
      setEditDialogOpen(false);
      
      // After updating, approve the builder
      if (selectedBuilder) {
        await approveMutation.mutateAsync(selectedBuilder.id);
      }
      setSelectedBuilder(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update builder",
        variant: "destructive",
      });
    },
  });

  /**
   * Phase 3 - OPTIMIZE: Memoized callback for confidence badge rendering
   */
  const getConfidenceBadge = useCallback((confidence: number | null) => {
    if (!confidence) {
      return (
        <Badge variant="outline" data-testid="badge-confidence-unknown">
          Unknown
        </Badge>
      );
    }

    if (confidence >= 80) {
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700" data-testid="badge-confidence-high">
          {confidence}% High
        </Badge>
      );
    } else if (confidence >= 60) {
      return (
        <Badge className="bg-yellow-600 text-white hover:bg-yellow-700" data-testid="badge-confidence-medium">
          {confidence}% Medium
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700" data-testid="badge-confidence-low">
          {confidence}% Low
        </Badge>
      );
    }
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized callbacks for all action handlers
   */
  const handleApprove = useCallback((builder: BuilderWithJobCount) => {
    approveMutation.mutate(builder.id);
  }, [approveMutation]);

  const handleMerge = useCallback((builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setMergeDialogOpen(true);
  }, []);

  const handleReject = useCallback((builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setRejectDialogOpen(true);
  }, []);

  const handleEditAndApprove = useCallback((builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setEditDialogOpen(true);
  }, []);

  const confirmMerge = useCallback(() => {
    if (selectedBuilder && targetBuilderId) {
      mergeMutation.mutate({
        sourceId: selectedBuilder.id,
        targetId: targetBuilderId,
      });
    }
  }, [selectedBuilder, targetBuilderId, mergeMutation]);

  const confirmReject = useCallback(() => {
    if (selectedBuilder && unknownBuilderId) {
      rejectMutation.mutate({
        builderId: selectedBuilder.id,
        unknownBuilderId,
      });
    }
  }, [selectedBuilder, unknownBuilderId, rejectMutation]);

  const handleEditSubmit = useCallback((data: InsertBuilder) => {
    if (selectedBuilder) {
      updateMutation.mutate({ id: selectedBuilder.id, data });
    }
  }, [selectedBuilder, updateMutation]);

  const handleRetryReview = useCallback(() => {
    refetchReviewBuilders();
  }, [refetchReviewBuilders]);

  const handleRetryBuilders = useCallback(() => {
    refetchAllBuilders();
  }, [refetchAllBuilders]);

  const handleCloseMergeDialog = useCallback(() => {
    setMergeDialogOpen(false);
  }, []);

  const handleCloseRejectDialog = useCallback(() => {
    setRejectDialogOpen(false);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized active builders list
   */
  const activeBuilders = useMemo(() => 
    allBuilders.filter(b => b.status === 'active' && !b.needsReview),
    [allBuilders]
  );

  /**
   * Phase 3 - OPTIMIZE: Memoized unknown builders list for reject dialog
   */
  const unknownBuilders = useMemo(() =>
    activeBuilders.filter(b => b.name.toLowerCase().includes('unknown')),
    [activeBuilders]
  );

  /**
   * Phase 2 - BUILD: Loading state with enhanced skeleton loaders
   */
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-builder-review-loading">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" data-testid="skeleton-title" />
            <Skeleton className="h-5 w-96" data-testid="skeleton-description" />
          </div>
          <Skeleton className="h-10 w-32" data-testid="skeleton-badge" />
        </div>

        <Card data-testid="card-skeleton">
          <CardHeader>
            <Skeleton className="h-6 w-48" data-testid="skeleton-card-title" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4" data-testid={`skeleton-row-${i}`}>
                  <Skeleton className="h-12 flex-1" data-testid={`skeleton-row-content-${i}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Phase 2 - BUILD: Error state with retry button for review builders
   */
  if (reviewError) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-builder-review-error">
        <Alert variant="destructive" data-testid="alert-review-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Failed to load builder reviews</p>
              <p className="text-sm mt-1">
                {reviewError instanceof Error ? reviewError.message : 'Unknown error occurred'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryReview}
              data-testid="button-retry-review"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-builder-review">
      <div className="flex items-center justify-between" data-testid="section-header">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Builder Review Queue
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            Review and approve temporary builders auto-created from calendar events
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-pending-count">
          {reviewBuilders.length} Pending
        </Badge>
      </div>

      {/* Phase 2 - BUILD: Error state for builders list with retry */}
      {buildersError && (
        <Alert variant="destructive" data-testid="alert-builders-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Failed to load active builders</p>
              <p className="text-sm mt-1">
                {buildersError instanceof Error ? buildersError.message : 'Unknown error occurred'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryBuilders}
              data-testid="button-retry-builders"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {reviewBuilders.length === 0 ? (
        <Card data-testid="card-no-pending">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" data-testid="icon-no-pending" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-no-pending">
              No Pending Reviews
            </h3>
            <p className="text-muted-foreground" data-testid="text-all-reviewed">
              All temporary builders have been reviewed
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-pending-reviews">
          <CardHeader>
            <CardTitle data-testid="text-table-title">Pending Builder Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Table data-testid="table-builders">
              <TableHeader>
                <TableRow data-testid="row-header">
                  <TableHead data-testid="header-builder-name">Builder Name</TableHead>
                  <TableHead data-testid="header-confidence">Confidence</TableHead>
                  <TableHead data-testid="header-abbreviation">Abbreviation</TableHead>
                  <TableHead data-testid="header-jobs">Jobs</TableHead>
                  <TableHead data-testid="header-created">Created</TableHead>
                  <TableHead data-testid="header-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewBuilders.map((builder) => (
                  <TableRow key={builder.id} data-testid={`row-builder-${builder.id}`}>
                    <TableCell className="font-medium" data-testid={`text-builder-name-${builder.id}`}>
                      {builder.name}
                    </TableCell>
                    <TableCell data-testid={`cell-confidence-${builder.id}`}>
                      {getConfidenceBadge(builder.confidence)}
                    </TableCell>
                    <TableCell data-testid={`text-abbreviation-${builder.id}`}>
                      {builder.abbreviations && builder.abbreviations.length > 0 ? (
                        <Badge variant="outline" data-testid={`badge-abbreviation-${builder.id}`}>
                          {builder.abbreviations[0]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-job-count-${builder.id}`}>
                      <Badge variant="secondary" data-testid={`badge-job-count-${builder.id}`}>
                        {builder.jobCount}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-created-date-${builder.id}`}>
                      {builder.createdAt ? format(new Date(builder.createdAt), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell data-testid={`cell-actions-${builder.id}`}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(builder)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${builder.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAndApprove(builder)}
                          data-testid={`button-edit-${builder.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMerge(builder)}
                          data-testid={`button-merge-${builder.id}`}
                        >
                          <GitMerge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(builder)}
                          data-testid={`button-reject-${builder.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent data-testid="dialog-merge">
          <DialogHeader>
            <DialogTitle data-testid="text-merge-title">Merge Builder</DialogTitle>
            <DialogDescription data-testid="text-merge-description">
              Select an existing active builder to merge <strong>{selectedBuilder?.name}</strong> into.
              All jobs will be reassigned to the selected builder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4" data-testid="section-merge-select">
            <Select value={targetBuilderId} onValueChange={setTargetBuilderId}>
              <SelectTrigger data-testid="select-target-builder">
                <SelectValue placeholder="Select a builder" />
              </SelectTrigger>
              <SelectContent>
                {activeBuilders.map((builder) => (
                  <SelectItem key={builder.id} value={builder.id} data-testid={`option-builder-${builder.id}`}>
                    {builder.name} ({builder.companyName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter data-testid="footer-merge">
            <Button
              variant="outline"
              onClick={handleCloseMergeDialog}
              data-testid="button-cancel-merge"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMerge}
              disabled={!targetBuilderId || mergeMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                'Merge Builders'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-reject-title">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Builder
            </DialogTitle>
            <DialogDescription data-testid="text-reject-description">
              This will delete <strong>{selectedBuilder?.name}</strong> and reassign all {selectedBuilder?.jobCount} job(s) 
              to an "Unknown Builder" placeholder. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4" data-testid="section-reject-select">
            <p className="text-sm text-muted-foreground mb-2" data-testid="text-unknown-label">
              Select the "Unknown Builder" placeholder:
            </p>
            <Select value={unknownBuilderId} onValueChange={setUnknownBuilderId}>
              <SelectTrigger data-testid="select-unknown-builder">
                <SelectValue placeholder="Select Unknown Builder" />
              </SelectTrigger>
              <SelectContent>
                {unknownBuilders.map((builder) => (
                  <SelectItem key={builder.id} value={builder.id} data-testid={`option-unknown-${builder.id}`}>
                    {builder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter data-testid="footer-reject">
            <Button
              variant="outline"
              onClick={handleCloseRejectDialog}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!unknownBuilderId || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Delete & Reassign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Approve Dialog */}
      {selectedBuilder && (
        <BuilderDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          builder={selectedBuilder}
          onSubmit={handleEditSubmit}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for BuilderReview
 * 
 * Catches and handles React errors gracefully, preventing full page crashes.
 * Provides user-friendly error message with reload option.
 */
export default function BuilderReview() {
  return (
    <ErrorBoundary>
      <BuilderReviewContent />
    </ErrorBoundary>
  );
}
