import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Skeleton } from "./skeleton";

// Dashboard card skeleton
export function DashboardCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card"
    >
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </motion.div>
  );
}

// Chart skeleton with animated bars
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div 
          className="relative" 
          style={{ height: `${height}px` }}
        >
          {/* Axes */}
          <Skeleton className="absolute bottom-0 left-0 w-full h-0.5" />
          <Skeleton className="absolute bottom-0 left-0 h-full w-0.5" />
          
          {/* Animated bars */}
          <div className="absolute bottom-0 left-0 right-0 top-0 flex items-end justify-around px-8">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ 
                  height: `${40 + Math.random() * 40}%` 
                }}
                transition={{ 
                  delay: i * 0.1,
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="w-[12%]"
              >
                <Skeleton className="h-full w-full" />
              </motion.div>
            ))}
          </div>
          
          {/* Grid lines */}
          {[...Array(4)].map((_, i) => (
            <Skeleton 
              key={i}
              className="absolute left-8 right-8 h-px opacity-20" 
              style={{ bottom: `${(i + 1) * 25}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Activity feed skeleton
export function ActivityFeedSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(items)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-3 pb-3 border-b last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </motion.div>
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} className={i === 0 ? "h-4 w-32" : i === columns - 1 ? "h-4 w-20" : "h-4 flex-1"} />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, j) => (
                <Skeleton key={j} className={j === 0 ? "h-4 w-32" : j === columns - 1 ? "h-4 w-20" : "h-4 flex-1"} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// Job Card Skeleton - Matches SwipeableFieldDayCard layout
export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Job name */}
            <Skeleton className="h-7 w-3/4" />
            {/* Address */}
            <Skeleton className="h-5 w-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              {/* Builder name */}
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {/* Status badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          {/* Job type */}
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            {/* Date */}
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            {/* Time */}
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          {/* Action button */}
          <Skeleton className="h-10 w-24" />
          {/* Icon button */}
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

// Table Row Skeleton - For data tables with proper structure
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b">
      {/* Checkbox */}
      <Skeleton className="h-4 w-4 rounded" />
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-32" : 
            i === columns - 2 ? "w-20" :
            "flex-1"
          )}
        />
      ))}
    </div>
  );
}

// Photo Grid Skeleton - Matches actual photo gallery layout
export function PhotoGridSkeleton({ 
  count = 12, 
  columns = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
}: { 
  count?: number; 
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-4", columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02 }}
          className="relative group"
        >
          <Skeleton className="aspect-square rounded-lg" />
          <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
            <Skeleton className="h-3 w-2/3 bg-white/20" />
            <Skeleton className="h-3 w-1/2 bg-white/20" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Enhanced Form Skeleton with labels and multiple field types
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          {i === fields - 1 ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
          {i === 0 && (
            <Skeleton className="h-3 w-48" />
          )}
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Dashboard Stats Card Skeleton
export function DashboardStatsCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

// Inspection List Skeleton
export function InspectionListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

// Calendar Event Skeleton
export function CalendarEventSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-2 p-3 border-l-4 border-l-primary/50 bg-card rounded">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings Section Skeleton
export function SettingsSectionSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 space-y-4">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Navigation Skeleton for sidebar/menu
export function NavigationSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// Timeline/Activity Feed Skeleton
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-6">
        {Array.from({ length: items }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-4 relative"
          >
            <Skeleton className="h-8 w-8 rounded-full z-10" />
            <div className="flex-1 space-y-2 pb-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              {i === 1 && (
                <Skeleton className="h-20 w-full rounded-lg mt-2" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}