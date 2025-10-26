import { useMutation } from "@tanstack/react-query";
import {
  Download,
  Trash2,
  Tag,
  FolderPlus,
  MoveHorizontal,
  Star,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@shared/schema";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { cn } from "@/lib/utils";

interface BulkOperationsToolbarProps {
  photos: Photo[];
  selectedCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
}

export function BulkOperationsToolbar({
  photos,
  selectedCount,
  selectedIds,
  onClearSelection,
  onSelectAll,
  isAllSelected,
}: BulkOperationsToolbarProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showAlbumDialog, setShowAlbumDialog] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [tagMode, setTagMode] = useState<'add' | 'remove' | 'replace'>('add');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => 
      apiRequest("/api/photos/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: "Photos deleted",
        description: `Successfully deleted ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete photos",
        variant: "destructive",
      });
    },
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ ids, jobId }: { ids: string[], jobId: string }) =>
      apiRequest("/api/photos/bulk-move", {
        method: "POST",
        body: JSON.stringify({ ids, jobId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: "Photos moved",
        description: `Successfully moved ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`,
      });
      onClearSelection();
      setShowMoveDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move photos",
        variant: "destructive",
      });
    },
  });

  // Tag mutation
  const tagMutation = useMutation({
    mutationFn: async ({ ids, mode, tags }: { ids: string[], mode: string, tags: string[] }) =>
      apiRequest("/api/photos/bulk-tag", {
        method: "POST",
        body: JSON.stringify({ ids, mode, tags }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: "Tags updated",
        description: `Successfully updated tags for ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`,
      });
      onClearSelection();
      setShowTagDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    },
  });

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ ids, isFavorite }: { ids: string[], isFavorite: boolean }) =>
      apiRequest("/api/photos/bulk-favorites", {
        method: "POST",
        body: JSON.stringify({ ids, isFavorite }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
      toast({
        title: variables.isFavorite ? "Added to favorites" : "Removed from favorites",
        description: `Updated ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  // Album mutation
  const albumMutation = useMutation({
    mutationFn: async ({ albumId, photoIds }: { albumId: string, photoIds: string[] }) =>
      apiRequest(`/api/photo-albums/${albumId}/photos`, {
        method: "POST",
        body: JSON.stringify({ photoIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photo-albums"] });
      toast({
        title: "Added to album",
        description: `Successfully added ${selectedCount} photo${selectedCount > 1 ? 's' : ''} to album`,
      });
      onClearSelection();
      setShowAlbumDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add photos to album",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(Array.from(selectedIds));
    setShowDeleteDialog(false);
  };

  const handleMove = () => {
    if (!selectedJobId) return;
    moveMutation.mutate({ ids: Array.from(selectedIds), jobId: selectedJobId });
  };

  const handleTag = () => {
    if (selectedTags.length === 0) return;
    tagMutation.mutate({ ids: Array.from(selectedIds), mode: tagMode, tags: selectedTags });
  };

  const handleAddToAlbum = () => {
    if (!selectedAlbumId) return;
    albumMutation.mutate({ albumId: selectedAlbumId, photoIds: Array.from(selectedIds) });
  };

  const handleExport = async () => {
    try {
      const response = await apiRequest("/api/photos/export", {
        method: "POST",
        body: JSON.stringify({ 
          photoIds: Array.from(selectedIds),
          format: 'zip'
        }),
      });
      
      // Handle download URL
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
        toast({
          title: "Export started",
          description: "Your photos are being prepared for download",
        });
        onClearSelection();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export photos",
        variant: "destructive",
      });
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? onClearSelection : onSelectAll}
            className="gap-2"
            data-testid="button-select-all"
          >
            {isAllSelected ? (
              <>
                <CheckSquare className="h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                Select All
              </>
            )}
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <Badge variant="secondary" className="gap-1">
            <span data-testid="text-selected-count">{selectedCount}</span>
            selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => favoriteMutation.mutate({ ids: Array.from(selectedIds), isFavorite: true })}
            disabled={favoriteMutation.isPending}
            data-testid="button-bulk-favorite"
          >
            <Star className="h-4 w-4 mr-2" />
            Favorite
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagDialog(true)}
            data-testid="button-bulk-tag"
          >
            <Tag className="h-4 w-4 mr-2" />
            Tag
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoveDialog(true)}
            data-testid="button-bulk-move"
          >
            <MoveHorizontal className="h-4 w-4 mr-2" />
            Move
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAlbumDialog(true)}
            data-testid="button-bulk-album"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Add to Album
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="button-bulk-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteMutation.isPending}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            data-testid="button-clear-selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} photo{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected photos will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedCount} photo{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Select the job to move these photos to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="job-select">Select Job</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger id="job-select" data-testid="select-job">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {/* Jobs will be loaded here */}
                <SelectItem value="job1">Job 1</SelectItem>
                <SelectItem value="job2">Job 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMove}
              disabled={!selectedJobId || moveMutation.isPending}
            >
              Move Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag {selectedCount} photo{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Add, remove, or replace tags for the selected photos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tag-mode">Tag Mode</Label>
              <Select value={tagMode} onValueChange={(value: any) => setTagMode(value)}>
                <SelectTrigger id="tag-mode" data-testid="select-tag-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Tags</SelectItem>
                  <SelectItem value="remove">Remove Tags</SelectItem>
                  <SelectItem value="replace">Replace All Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tag-input">Tags (comma-separated)</Label>
              <Input
                id="tag-input"
                placeholder="exterior, before, kitchen"
                onChange={(e) => setSelectedTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                data-testid="input-tags"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTag}
              disabled={selectedTags.length === 0 || tagMutation.isPending}
            >
              Update Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}