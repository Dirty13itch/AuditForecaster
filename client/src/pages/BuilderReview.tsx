import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, GitMerge, Edit, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BuilderDialog } from "@/components/BuilderDialog";
import type { Builder, InsertBuilder } from "@shared/schema";
import { format } from "date-fns";

interface BuilderWithJobCount extends Builder {
  jobCount: number;
}

export default function BuilderReview() {
  const { toast } = useToast();
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderWithJobCount | null>(null);
  const [targetBuilderId, setTargetBuilderId] = useState<string>("");
  const [unknownBuilderId, setUnknownBuilderId] = useState<string>("");

  const { data: reviewBuilders = [], isLoading } = useQuery<BuilderWithJobCount[]>({
    queryKey: ["/api/builders/review"],
  });

  const { data: allBuilders = [] } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
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

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) {
      return (
        <Badge variant="outline" data-testid={`badge-confidence-unknown`}>
          Unknown
        </Badge>
      );
    }

    if (confidence >= 80) {
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700" data-testid={`badge-confidence-high`}>
          {confidence}% High
        </Badge>
      );
    } else if (confidence >= 60) {
      return (
        <Badge className="bg-yellow-600 text-white hover:bg-yellow-700" data-testid={`badge-confidence-medium`}>
          {confidence}% Medium
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700" data-testid={`badge-confidence-low`}>
          {confidence}% Low
        </Badge>
      );
    }
  };

  const handleApprove = (builder: BuilderWithJobCount) => {
    approveMutation.mutate(builder.id);
  };

  const handleMerge = (builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setMergeDialogOpen(true);
  };

  const handleReject = (builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setRejectDialogOpen(true);
  };

  const handleEditAndApprove = (builder: BuilderWithJobCount) => {
    setSelectedBuilder(builder);
    setEditDialogOpen(true);
  };

  const confirmMerge = () => {
    if (selectedBuilder && targetBuilderId) {
      mergeMutation.mutate({
        sourceId: selectedBuilder.id,
        targetId: targetBuilderId,
      });
    }
  };

  const confirmReject = () => {
    if (selectedBuilder && unknownBuilderId) {
      rejectMutation.mutate({
        builderId: selectedBuilder.id,
        unknownBuilderId,
      });
    }
  };

  const handleEditSubmit = (data: InsertBuilder) => {
    if (selectedBuilder) {
      updateMutation.mutate({ id: selectedBuilder.id, data });
    }
  };

  // Filter out temporary builders from merge target options
  const activeBuilders = allBuilders.filter(b => b.status === 'active' && !b.needsReview);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-builder-review">
      <div className="flex items-center justify-between">
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

      {reviewBuilders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-no-pending">
              No Pending Reviews
            </h3>
            <p className="text-muted-foreground" data-testid="text-all-reviewed">
              All temporary builders have been reviewed
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-table-title">Pending Builder Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
                        <Badge variant="outline">{builder.abbreviations[0]}</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-job-count-${builder.id}`}>
                      <Badge variant="secondary">{builder.jobCount}</Badge>
                    </TableCell>
                    <TableCell data-testid={`text-created-date-${builder.id}`}>
                      {builder.createdAt ? format(new Date(builder.createdAt), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
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
          <div className="py-4">
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialogOpen(false)}
              data-testid="button-cancel-merge"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMerge}
              disabled={!targetBuilderId || mergeMutation.isPending}
              data-testid="button-confirm-merge"
            >
              Merge Builders
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
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">Select the "Unknown Builder" placeholder:</p>
            <Select value={unknownBuilderId} onValueChange={setUnknownBuilderId}>
              <SelectTrigger data-testid="select-unknown-builder">
                <SelectValue placeholder="Select Unknown Builder" />
              </SelectTrigger>
              <SelectContent>
                {activeBuilders
                  .filter(b => b.name.toLowerCase().includes('unknown'))
                  .map((builder) => (
                    <SelectItem key={builder.id} value={builder.id} data-testid={`option-unknown-${builder.id}`}>
                      {builder.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
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
              Delete & Reassign
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
