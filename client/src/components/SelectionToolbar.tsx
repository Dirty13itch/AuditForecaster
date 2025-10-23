import { X, Trash2, Download, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SelectionToolbarAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  testId?: string;
}

export interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  actions: SelectionToolbarAction[];
  entityName?: string;
}

/**
 * Toolbar that appears when items are selected, showing count and bulk actions
 */
export function SelectionToolbar({
  selectedCount,
  totalCount,
  onClear,
  actions,
  entityName = "items",
}: SelectionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-md"
      data-testid="selection-toolbar"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 flex-1">
        <Badge variant="secondary" data-testid="text-selection-count">
          {selectedCount} of {totalCount}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {entityName} selected
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant ?? "outline"}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              data-testid={action.testId ?? `button-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        data-testid="button-clear-selection"
      >
        <X className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
}

/**
 * Pre-configured actions for common bulk operations
 */
export const commonBulkActions = {
  delete: (onClick: () => void): SelectionToolbarAction => ({
    label: "Delete",
    icon: Trash2,
    onClick,
    variant: "destructive" as const,
    testId: "button-bulk-delete",
  }),

  export: (onClick: () => void): SelectionToolbarAction => ({
    label: "Export",
    icon: Download,
    onClick,
    variant: "outline" as const,
    testId: "button-bulk-export",
  }),

  tag: (onClick: () => void): SelectionToolbarAction => ({
    label: "Manage Tags",
    icon: Tag,
    onClick,
    variant: "outline" as const,
    testId: "button-bulk-tag",
  }),
};
