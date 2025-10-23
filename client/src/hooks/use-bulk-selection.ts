import { useState, useMemo, useCallback, useEffect } from "react";

export interface BulkSelectionMetadata {
  selectedIds: Set<string>;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  hasSelection: boolean;
}

export interface BulkSelectionActions {
  toggle: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  select: (id: string) => void;
  deselect: (id: string) => void;
}

export interface BulkSelectionReturn {
  metadata: BulkSelectionMetadata;
  actions: BulkSelectionActions;
  selectedIds: string[];
}

/**
 * Hook for managing bulk selection state across multiple items
 * @param allItemIds - Array of all available item IDs
 * @returns Selection metadata, action handlers, and selected IDs array
 */
export function useBulkSelection(allItemIds: string[]): BulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reconcile selection with available items when allItemIds changes
  // This prevents stale selections when filters/pagination changes
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(allItemIds);
      const reconciled = new Set<string>();
      
      // Keep only selections that are still in allItemIds
      prev.forEach((id) => {
        if (validIds.has(id)) {
          reconciled.add(id);
        }
      });
      
      // Only update if something changed
      return reconciled.size !== prev.size ? reconciled : prev;
    });
  }, [allItemIds]);

  // Memoized metadata
  const metadata = useMemo<BulkSelectionMetadata>(() => {
    const selectedCount = selectedIds.size;
    const totalCount = allItemIds.length;
    
    return {
      selectedIds,
      selectedCount,
      totalCount,
      isAllSelected: selectedCount > 0 && selectedCount === totalCount,
      hasSelection: selectedCount > 0,
    };
  }, [selectedIds, allItemIds.length]);

  // Action: Toggle single item selection
  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Action: Select single item
  const select = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Action: Deselect single item
  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Action: Select all items
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allItemIds));
  }, [allItemIds]);

  // Action: Deselect all items
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Query: Check if item is selected
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const actions: BulkSelectionActions = {
    toggle,
    select,
    deselect,
    selectAll,
    deselectAll,
    isSelected,
  };

  return {
    metadata,
    actions,
    selectedIds: Array.from(selectedIds),
  };
}
