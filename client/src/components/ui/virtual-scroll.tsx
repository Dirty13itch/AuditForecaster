import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

interface VirtualScrollProps<T> {
  items: T[];
  height: number | string;
  itemHeight?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
  gap?: number;
  loading?: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
}

export function VirtualScroll<T>({
  items,
  height,
  itemHeight = 60,
  renderItem,
  className,
  overscan = 5,
  gap = 0,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualScrollProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    gap,
  });

  if (loading && loadingComponent) {
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
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <motion.div
              key={virtualItem.key}
              initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: virtualItem.index * 0.05 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Infinite scroll wrapper
export function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  loading,
  threshold = 200,
  className,
  loadingComponent,
  endComponent,
}: {
  children: ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  className?: string;
  loadingComponent?: ReactNode;
  endComponent?: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn("overflow-auto", className)}
    >
      {children}
      {loading && loadingComponent && (
        <div className="flex justify-center py-4">
          {loadingComponent}
        </div>
      )}
      {!hasMore && endComponent && (
        <div className="flex justify-center py-4">
          {endComponent}
        </div>
      )}
    </div>
  );
}