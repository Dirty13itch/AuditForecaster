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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import {
  TAG_CATEGORIES,
  INSPECTION_TAGS,
  STATUS_TAGS,
  PRIORITY_TAGS,
  LOCATION_TAGS,
  getCategoryLabel,
  type PhotoTag,
  type TagCategory,
} from "@shared/photoTags";
import { AlertTriangle, Tag, Download } from "lucide-react";

// Organize tags by category for UI display
const TAG_GROUPS: Array<{ name: string; tags: readonly PhotoTag[] }> = [
  { name: getCategoryLabel(TAG_CATEGORIES.INSPECTION), tags: INSPECTION_TAGS },
  { name: getCategoryLabel(TAG_CATEGORIES.STATUS), tags: STATUS_TAGS },
  { name: getCategoryLabel(TAG_CATEGORIES.PRIORITY), tags: PRIORITY_TAGS },
  { name: getCategoryLabel(TAG_CATEGORIES.LOCATION), tags: LOCATION_TAGS },
];

// ==================== Delete Confirmation Dialog ====================

export interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  entityName?: string;
  isPending?: boolean;
  warningMessage?: string;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  entityName = "items",
  isPending = false,
  warningMessage,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-bulk-delete">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete {selectedCount} {entityName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            selected {entityName} from the system.
            {warningMessage && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                <strong>Warning:</strong> {warningMessage}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} data-testid="button-cancel-delete">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ==================== Tag Management Dialog ====================

export type TagOperationMode = "add" | "remove" | "replace";

export interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: TagOperationMode, tags: string[]) => void;
  selectedCount: number;
  isPending?: boolean;
}

export function BulkTagDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isPending = false,
}: BulkTagDialogProps) {
  const [mode, setMode] = useState<TagOperationMode>("add");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Reset state when dialog closes to ensure clean state for next invocation
  useEffect(() => {
    if (!open) {
      setMode("add");
      setSelectedTags(new Set());
    }
  }, [open]);

  const handleConfirm = () => {
    if (selectedTags.size === 0) return;
    onConfirm(mode, Array.from(selectedTags));
    // Reset state after confirm
    setMode("add");
    setSelectedTags(new Set());
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-bulk-tag">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <DialogTitle>Manage Tags for {selectedCount} Photos</DialogTitle>
          </div>
          <DialogDescription>
            Select tags and choose how to apply them to the selected photos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Operation Mode */}
          <div className="space-y-3">
            <Label>Operation</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as TagOperationMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="mode-add" data-testid="radio-mode-add" />
                <Label htmlFor="mode-add" className="font-normal cursor-pointer">
                  <strong>Add</strong> selected tags to photos (keeps existing tags)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="mode-remove" data-testid="radio-mode-remove" />
                <Label htmlFor="mode-remove" className="font-normal cursor-pointer">
                  <strong>Remove</strong> selected tags from photos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="mode-replace" data-testid="radio-mode-replace" />
                <Label htmlFor="mode-replace" className="font-normal cursor-pointer">
                  <strong>Replace</strong> all tags with selected tags
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Tag Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Tags</Label>
              <Badge variant="secondary" data-testid="text-selected-tag-count">
                {selectedTags.size} selected
              </Badge>
            </div>

            <div className="space-y-6">
              {TAG_GROUPS.map((group) => (
                <div key={group.name} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {group.name}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {group.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={selectedTags.has(tag)}
                          onCheckedChange={() => handleTagToggle(tag)}
                          data-testid={`checkbox-tag-${tag}`}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-tag"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || selectedTags.size === 0}
            data-testid="button-confirm-tag"
          >
            {isPending ? "Applying..." : "Apply Tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Export Options Dialog ====================

export type ExportFormat = "csv" | "json";

export interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (format: ExportFormat) => void;
  selectedCount: number;
  entityName?: string;
  isPending?: boolean;
}

export function BulkExportDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  entityName = "items",
  isPending = false,
}: BulkExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");

  const handleConfirm = () => {
    onConfirm(format);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-bulk-export">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <DialogTitle>Export {selectedCount} {entityName}</DialogTitle>
          </div>
          <DialogDescription>
            Choose the format for your export file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="format-csv" data-testid="radio-format-csv" />
              <Label htmlFor="format-csv" className="font-normal cursor-pointer">
                <strong>CSV</strong> - Comma-separated values (for Excel, Google Sheets)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="format-json" data-testid="radio-format-json" />
              <Label htmlFor="format-json" className="font-normal cursor-pointer">
                <strong>JSON</strong> - JavaScript Object Notation (for developers)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="button-confirm-export"
          >
            {isPending ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
