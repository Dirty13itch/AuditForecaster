import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Centralized loading states for consistent UX across the app
 * Prevents layout shift by matching the dimensions of loaded content
 */

export const PageLoadingFallback = () => (
  <div className="flex h-full items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export const RouteLoadingFallback = ({ title = "Loading" }: { title?: string }) => (
  <div className="min-h-screen bg-background">
    <div className="h-16 bg-primary flex items-center px-4">
      <Skeleton className="h-8 w-32 bg-primary-foreground/20" />
    </div>
    <div className="container mx-auto p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export const ChartLoadingFallback = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <div className="h-[300px] relative">
        <Skeleton className="absolute bottom-0 left-0 h-full w-1" />
        <Skeleton className="absolute bottom-0 left-0 w-full h-1" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const TableLoadingFallback = ({ rows = 5 }: { rows?: number }) => (
  <div className="rounded-lg border">
    <div className="p-4 border-b">
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="divide-y">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center p-4 gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const PhotoGridLoadingFallback = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="aspect-square relative">
        <Skeleton className="absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
          <Skeleton className="h-3 w-2/3 bg-white/50" />
          <Skeleton className="h-3 w-1/2 bg-white/50" />
        </div>
      </div>
    ))}
  </div>
);

export const FormLoadingFallback = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </CardContent>
  </Card>
);

export const CalendarLoadingFallback = () => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="h-full w-full" />
        </div>
      ))}
    </div>
  </div>
);

export const CanvasLoadingFallback = () => (
  <div className="flex h-screen">
    <div className="w-16 bg-muted p-2 space-y-2">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-12" />
      ))}
    </div>
    <div className="flex-1 relative bg-muted/30">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    </div>
    <div className="w-64 bg-background p-4 border-l space-y-4">
      <Skeleton className="h-6 w-32" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardLoadingFallback = () => (
  <div className="container mx-auto p-4 space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartLoadingFallback />
      <TableLoadingFallback rows={3} />
    </div>
  </div>
);