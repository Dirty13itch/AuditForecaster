import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode, useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Safe wrapper for useReducedMotion that handles errors gracefully
function useSafeReducedMotion() {
  // Check if we're in a browser environment and if the user prefers reduced motion
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  
  useEffect(() => {
    // Check for reduced motion preference using the native browser API
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setShouldReduceMotion(mediaQuery.matches);
    
    // Listen for changes to the preference
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  
  return shouldReduceMotion;
}

interface VirtualGridProps<T> {
  items: T[];
  columns: number;
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  gap?: number;
  loading?: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualGrid<T>({
  items,
  columns,
  height,
  itemHeight,
  renderItem,
  className,
  overscan = 5,
  gap = 16,
  loading = false,
  loadingComponent,
  emptyComponent,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useSafeReducedMotion();

  // Calculate rows from items and columns
  const rows = useMemo(() => {
    const rowCount = Math.ceil(items.length / columns);
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const startIndex = rowIndex * columns;
      return items.slice(startIndex, startIndex + columns);
    });
  }, [items, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  // Handle infinite scroll
  useEffect(() => {
    if (!parentRef.current || !onEndReached) return;

    const handleScroll = () => {
      const element = parentRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      if (scrollHeight - scrollTop - clientHeight < endReachedThreshold && !loading) {
        onEndReached();
      }
    };

    const element = parentRef.current;
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [onEndReached, endReachedThreshold, loading]);

  if (loading && loadingComponent && items.length === 0) {
    return <div className={className}>{loadingComponent}</div>;
  }

  if (!items.length && emptyComponent) {
    return <div className={className}>{emptyComponent}</div>;
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto scrollbar-thin scrollbar-thumb-border", className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {row.map((item, colIndex) => {
                  const itemIndex = virtualRow.index * columns + colIndex;
                  return (
                    <motion.div
                      key={itemIndex}
                      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: colIndex * 0.02 }}
                    >
                      {renderItem(item, itemIndex)}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {loading && loadingComponent && items.length > 0 && (
        <div className="flex justify-center py-4">
          {loadingComponent}
        </div>
      )}
    </div>
  );
}

// Virtual list with dynamic heights
interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  estimateSize?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  gap?: number;
  loading?: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  height,
  estimateSize = 100,
  renderItem,
  className,
  overscan = 5,
  gap = 0,
  loading = false,
  loadingComponent,
  emptyComponent,
  onEndReached,
  endReachedThreshold = 200,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useSafeReducedMotion();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    gap,
  });

  // Handle infinite scroll
  useEffect(() => {
    if (!parentRef.current || !onEndReached) return;

    const handleScroll = () => {
      const element = parentRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      if (scrollHeight - scrollTop - clientHeight < endReachedThreshold && !loading) {
        onEndReached();
      }
    };

    const element = parentRef.current;
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [onEndReached, endReachedThreshold, loading]);

  if (loading && loadingComponent && items.length === 0) {
    return <div className={className}>{loadingComponent}</div>;
  }

  if (!items.length && emptyComponent) {
    return <div className={className}>{emptyComponent}</div>;
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto scrollbar-thin scrollbar-thumb-border", className)}
      style={{ height }}
      data-testid="virtual-list-container"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getItemKey ? getItemKey(item, virtualItem.index) : virtualItem.key;
          
          return (
            <motion.div
              key={key}
              data-index={virtualItem.index}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </motion.div>
          );
        })}
      </div>
      {loading && loadingComponent && items.length > 0 && (
        <div className="flex justify-center py-4">
          {loadingComponent}
        </div>
      )}
    </div>
  );
}

// Window virtualizer for full-page scrolling
export function useWindowVirtualizer<T>(
  items: T[],
  estimateSize: number,
  overscan = 5
) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => window,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin: 0,
  });

  return virtualizer;
}