import { motion } from "framer-motion";
import {
  JobCardSkeleton,
  TableRowSkeleton,
  PhotoGridSkeleton,
  FormSkeleton,
  ChartSkeleton,
  DashboardCardSkeleton,
  DashboardStatsCardSkeleton,
  InspectionListSkeleton,
  CalendarEventSkeleton,
  SettingsSectionSkeleton,
  NavigationSkeleton,
  TimelineSkeleton,
  ActivityFeedSkeleton,
  MetricCardSkeleton,
} from "@/components/ui/skeleton-variants";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Centralized loading states for consistent UX across the app
 * Prevents layout shift by matching the dimensions of loaded content
 * Uses shimmer animations for better perceived performance
 */

// Page loading with centered spinner - used for initial page loads
export const PageLoadingFallback = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex h-full items-center justify-center min-h-[400px]"
  >
    <div className="text-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"
      />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </motion.div>
);

// Route loading fallback with proper header and content skeletons
export const RouteLoadingFallback = ({ title = "Loading" }: { title?: string }) => (
  <div className="min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="h-16 bg-card border-b flex items-center px-4">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    
    {/* Content area */}
    <div className="container mx-auto p-4 space-y-6">
      {/* Page title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Content cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <DashboardCardSkeleton />
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

// Dashboard loading with metrics, charts and activity feed
export const DashboardLoadingFallback = () => (
  <div className="container mx-auto p-4 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Metric cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <DashboardStatsCardSkeleton />
        </motion.div>
      ))}
    </div>
    
    {/* Charts and tables */}
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartSkeleton />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <ActivityFeedSkeleton items={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Chart loading fallback with animated bars
export const ChartLoadingFallback = () => (
  <ChartSkeleton height={300} />
);

// Table loading with proper structure
export const TableLoadingFallback = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <div className="rounded-lg border bg-card">
    <div className="p-4 border-b flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <div>
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/50">
        <Skeleton className="h-4 w-4 rounded" />
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <Skeleton 
            key={i}
            className={`h-4 ${i === 0 ? 'w-32' : i === columns - 2 ? 'w-20' : 'flex-1'}`}
          />
        ))}
      </div>
      {/* Table rows */}
      {[...Array(rows)].map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  </div>
);

// Photo grid loading with aspect ratio preservation
export const PhotoGridLoadingFallback = ({ count = 12 }: { count?: number }) => (
  <PhotoGridSkeleton count={count} />
);

// Form loading with proper field structure
export const FormLoadingFallback = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <FormSkeleton fields={4} />
    </CardContent>
  </Card>
);

// Calendar loading with week/month view
export const CalendarLoadingFallback = () => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    {/* Calendar days grid */}
    <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-muted p-2">
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      ))}
      {/* Calendar days */}
      {[...Array(35)].map((_, i) => (
        <div key={i} className="bg-background p-2 min-h-[80px]">
          <Skeleton className="h-5 w-5 mb-2" />
          <div className="space-y-1">
            {i % 7 === 0 && <Skeleton className="h-3 w-full" />}
            {i % 5 === 0 && <Skeleton className="h-3 w-3/4" />}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Canvas/Editor loading
export const CanvasLoadingFallback = () => (
  <div className="flex h-screen">
    {/* Tool panel */}
    <div className="w-16 bg-muted border-r p-2 space-y-2">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-12 rounded" />
      ))}
    </div>
    
    {/* Canvas area */}
    <div className="flex-1 relative bg-muted/10">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Skeleton className="h-32 w-32 rounded-lg mx-auto" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-lg border-2 border-primary/20"
            />
          </div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    </div>
    
    {/* Properties panel */}
    <div className="w-64 bg-background border-l p-4 space-y-4">
      <Skeleton className="h-6 w-32" />
      <FormSkeleton fields={3} />
    </div>
  </div>
);

// Job list loading skeleton
export const JobListLoadingFallback = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <JobCardSkeleton />
      </motion.div>
    ))}
  </div>
);

// Settings loading skeleton
export const SettingsLoadingFallback = () => (
  <div className="space-y-6">
    <SettingsSectionSkeleton />
    <SettingsSectionSkeleton />
  </div>
);

// Inspection checklist loading
export const InspectionLoadingFallback = ({ items = 5 }: { items?: number }) => (
  <InspectionListSkeleton items={items} />
);

// Calendar events loading
export const CalendarEventsLoadingFallback = ({ count = 3 }: { count?: number }) => (
  <CalendarEventSkeleton count={count} />
);

// Activity/Timeline loading
export const TimelineLoadingFallback = ({ items = 4 }: { items?: number }) => (
  <TimelineSkeleton items={items} />
);

// Navigation/Sidebar loading
export const NavigationLoadingFallback = ({ items = 6 }: { items?: number }) => (
  <NavigationSkeleton items={items} />
);