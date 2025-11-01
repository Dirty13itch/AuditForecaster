import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MapPin, Navigation, Clock, AlertCircle, GripVertical, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Job, Builder } from "@shared/schema";
import {
  calculateDistance,
  calculateDriveTime,
  formatDistance,
  formatDriveTime,
  hasValidCoordinates,
} from "@/lib/distanceCalculator";

/**
 * RouteView - Production-ready daily route planning page
 * 
 * Features:
 * - Optimized route planning (closest/farthest/builder/custom)
 * - Drag-and-drop reordering
 * - Distance and drive time calculations
 * - Google Maps integration
 * - Error handling with retry capability
 * - Comprehensive test coverage
 */

const JOB_DRAG_TYPE = 'route-job';
const SORT_PREFERENCE_KEY = 'route-sort-preference';

type SortOption = 'closest' | 'farthest' | 'builder' | 'custom';

interface JobWithBuilder extends Job {
  builderName?: string;
  distanceToNext?: number;
  driveTimeToNext?: number;
}

interface DraggableJobCardProps {
  job: JobWithBuilder;
  index: number;
  moveJob: (dragIndex: number, hoverIndex: number) => void;
  isCustomSort: boolean;
}

function DraggableJobCard({ job, index, moveJob, isCustomSort }: DraggableJobCardProps) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: JOB_DRAG_TYPE,
      item: { index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: isCustomSort,
    }),
    [index, isCustomSort]
  );

  const [, drop] = useDrop(
    () => ({
      accept: JOB_DRAG_TYPE,
      hover: (item: { index: number }) => {
        if (!isCustomSort) return;
        
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) {
          return;
        }

        moveJob(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    }),
    [index, moveJob, isCustomSort]
  );

  const statusColors: Record<string, string> = {
    'scheduled': 'bg-blue-500',
    'reschedule': 'bg-yellow-500',
    'done': 'bg-green-600',
    'failed': 'bg-red-600',
  };

  const priorityVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    'low': 'secondary',
    'medium': 'default',
    'high': 'destructive',
  };

  const handleNavigate = useCallback(() => {
    const encodedAddress = encodeURIComponent(job.address);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }, [job.address]);

  const hasCoords = hasValidCoordinates(job.latitude, job.longitude);

  return (
    <div
      ref={(node) => isCustomSort && drag(drop(node))}
      className={`${isDragging ? 'opacity-50' : ''}`}
      data-testid={`card-route-job-${job.id}`}
    >
      <Card className="hover-elevate">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {isCustomSort && (
              <div className="h-12 w-12 flex items-center justify-center cursor-move flex-shrink-0" data-testid={`handle-drag-${job.id}`}>
                <GripVertical className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <CardTitle className="text-lg line-clamp-1" data-testid={`text-job-name-${job.id}`}>
                  {job.name}
                </CardTitle>
                <Badge variant={priorityVariants[job.priority as keyof typeof priorityVariants] || 'default'} data-testid={`badge-priority-${job.id}`}>
                  {job.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1" data-testid={`div-status-${job.id}`}>
                <div className={`w-2 h-2 rounded-full ${statusColors[job.status] || 'bg-gray-500'}`} />
                <span className="capitalize">{job.status}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2" data-testid={`text-job-address-${job.id}`}>
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="break-words">{job.address}</span>
            </div>
            {job.builderName && (
              <div className="flex items-center gap-2" data-testid={`text-job-builder-${job.id}`}>
                <span className="text-muted-foreground">Builder:</span>
                <span className="font-medium">{job.builderName}</span>
              </div>
            )}
            <div className="flex items-center gap-2" data-testid={`text-job-type-${job.id}`}>
              <span className="text-muted-foreground">Type:</span>
              <span>{job.inspectionType}</span>
            </div>
          </div>

          {!hasCoords && (
            <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-md" data-testid={`alert-no-coords-${job.id}`}>
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <span className="text-xs text-warning">Location coordinates not set</span>
            </div>
          )}

          {job.distanceToNext !== undefined && job.driveTimeToNext !== undefined && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md" data-testid={`text-distance-to-next-${job.id}`}>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{formatDriveTime(job.driveTimeToNext)}</strong> to next job ({formatDistance(job.distanceToNext)})
              </span>
            </div>
          )}

          <Button
            onClick={handleNavigate}
            className="w-full"
            size="lg"
            data-testid={`button-navigate-${job.id}`}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Navigate with Google Maps
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteViewContent() {
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const saved = localStorage.getItem(SORT_PREFERENCE_KEY);
    return (saved as SortOption) || 'closest';
  });
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  // Phase 5 - HARDEN: Queries with retry: 2 for resilience
  const { data: allJobs = [], isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    retry: 2,
  });

  const { data: builders = [], isLoading: buildersLoading, error: buildersError, refetch: refetchBuilders } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoized retry handler
  const handleRetry = useCallback(() => {
    refetchJobs();
    refetchBuilders();
  }, [refetchJobs, refetchBuilders]);

  const todaysActiveJobs = useMemo(() => {
    return allJobs.filter((job) => {
      if (!job.scheduledDate) return false;
      
      const jobDate = new Date(job.scheduledDate);
      jobDate.setHours(0, 0, 0, 0);
      
      const isToday = jobDate.getTime() === today.getTime();
      const isActive = job.status === 'scheduled' || job.status === 'reschedule';
      
      return isToday && isActive;
    });
  }, [allJobs, todayStr]);

  const builderMap = useMemo(() => {
    const map = new Map<string, string>();
    builders.forEach((builder) => {
      map.set(builder.id, builder.name);
    });
    return map;
  }, [builders]);

  const jobsWithBuilders = useMemo(() => {
    return todaysActiveJobs.map((job) => ({
      ...job,
      builderName: job.builderId ? builderMap.get(job.builderId) : undefined,
    }));
  }, [todaysActiveJobs, builderMap]);

  const sortedJobs = useMemo(() => {
    let sorted: JobWithBuilder[] = [...jobsWithBuilders];
    
    sorted.forEach((job) => {
      job.distanceToNext = undefined;
      job.driveTimeToNext = undefined;
    });

    switch (sortOption) {
      case 'closest': {
        const withCoords = sorted.filter((job) => hasValidCoordinates(job.latitude, job.longitude));
        const withoutCoords = sorted.filter((job) => !hasValidCoordinates(job.latitude, job.longitude));
        
        if (withCoords.length > 1) {
          const optimized: JobWithBuilder[] = [withCoords[0]];
          const remaining = withCoords.slice(1);
          
          while (remaining.length > 0) {
            const lastJob = optimized[optimized.length - 1];
            let closestIndex = 0;
            let minDistance = Infinity;
            
            remaining.forEach((job, index) => {
              const distance = calculateDistance(
                lastJob.latitude!,
                lastJob.longitude!,
                job.latitude!,
                job.longitude!
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
              }
            });
            
            optimized.push(remaining[closestIndex]);
            remaining.splice(closestIndex, 1);
          }
          
          sorted = [...optimized, ...withoutCoords];
        } else {
          sorted = [...withCoords, ...withoutCoords];
        }
        break;
      }

      case 'farthest': {
        const withCoords = sorted.filter((job) => hasValidCoordinates(job.latitude, job.longitude));
        const withoutCoords = sorted.filter((job) => !hasValidCoordinates(job.latitude, job.longitude));
        
        if (withCoords.length > 1) {
          const optimized: JobWithBuilder[] = [withCoords[0]];
          const remaining = withCoords.slice(1);
          
          while (remaining.length > 0) {
            const lastJob = optimized[optimized.length - 1];
            let farthestIndex = 0;
            let maxDistance = -Infinity;
            
            remaining.forEach((job, index) => {
              const distance = calculateDistance(
                lastJob.latitude!,
                lastJob.longitude!,
                job.latitude!,
                job.longitude!
              );
              if (distance > maxDistance) {
                maxDistance = distance;
                farthestIndex = index;
              }
            });
            
            optimized.push(remaining[farthestIndex]);
            remaining.splice(farthestIndex, 1);
          }
          
          sorted = [...optimized, ...withoutCoords];
        } else {
          sorted = [...withCoords, ...withoutCoords];
        }
        break;
      }

      case 'builder':
        sorted.sort((a, b) => {
          const nameA = a.builderName || '';
          const nameB = b.builderName || '';
          if (nameA === nameB) {
            return a.name.localeCompare(b.name);
          }
          return nameA.localeCompare(nameB);
        });
        break;

      case 'custom':
        if (customOrder.length > 0) {
          const orderMap = new Map(customOrder.map((id, index) => [id, index]));
          sorted.sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Infinity;
            const indexB = orderMap.get(b.id) ?? Infinity;
            return indexA - indexB;
          });
        }
        break;
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentJob = sorted[i];
      const nextJob = sorted[i + 1];
      
      if (
        hasValidCoordinates(currentJob.latitude, currentJob.longitude) &&
        hasValidCoordinates(nextJob.latitude, nextJob.longitude)
      ) {
        const distance = calculateDistance(
          currentJob.latitude!,
          currentJob.longitude!,
          nextJob.latitude!,
          nextJob.longitude!
        );
        currentJob.distanceToNext = distance;
        currentJob.driveTimeToNext = calculateDriveTime(distance);
      }
    }

    return sorted;
  }, [jobsWithBuilders, sortOption, customOrder]);

  useEffect(() => {
    if (sortOption !== 'custom' && sortedJobs.length > 0) {
      setCustomOrder(sortedJobs.map((job) => job.id));
    }
  }, [sortedJobs, sortOption]);

  const { totalDistance, totalDriveTime } = useMemo(() => {
    let distance = 0;
    let time = 0;
    
    sortedJobs.forEach((job) => {
      if (job.distanceToNext !== undefined && job.driveTimeToNext !== undefined) {
        distance += job.distanceToNext;
        time += job.driveTimeToNext;
      }
    });
    
    return { totalDistance: distance, totalDriveTime: time };
  }, [sortedJobs]);

  const handleSortChange = useCallback((value: SortOption) => {
    setSortOption(value);
    localStorage.setItem(SORT_PREFERENCE_KEY, value);
  }, []);

  const moveJob = useCallback((dragIndex: number, hoverIndex: number) => {
    const newOrder = [...customOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setCustomOrder(newOrder);
  }, [customOrder]);

  const isLoading = jobsLoading || buildersLoading;
  const error = jobsError || buildersError;

  // Phase 5 - HARDEN: Error state with retry capability
  if (error) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-col h-full items-center justify-center p-6" data-testid="div-error-container">
          <Card className="max-w-md w-full" data-testid="card-error">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center text-center" data-testid="div-error-state">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4" data-testid="div-error-icon">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Failed to Load Routes</h2>
                <p className="text-muted-foreground mb-4" data-testid="text-error-message">
                  {error instanceof Error ? error.message : 'Unable to fetch route data'}
                </p>
                <Button onClick={handleRetry} data-testid="button-retry">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DndProvider>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full" data-testid="div-main-container">
        <div className="flex flex-col gap-4 p-4 sm:p-6 border-b" data-testid="div-header">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Daily Route Planner</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">Optimized route for today's inspections</p>
          </div>

          {!isLoading && sortedJobs.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg" data-testid="div-route-summary">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Total Daily Route</div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2" data-testid="text-total-distance">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-lg">{formatDistance(totalDistance)}</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-total-drive-time">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-lg">{formatDriveTime(totalDriveTime)}</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm" data-testid="badge-job-count">
                {sortedJobs.length} {sortedJobs.length === 1 ? 'job' : 'jobs'}
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-3" data-testid="div-sort-controls">
            <label htmlFor="sort-select" className="text-sm font-medium whitespace-nowrap">
              Sort by:
            </label>
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger id="sort-select" className="w-full sm:w-64" data-testid="select-sort-option">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closest">Closest First</SelectItem>
                <SelectItem value="farthest">Farthest First</SelectItem>
                <SelectItem value="builder">By Builder</SelectItem>
                <SelectItem value="custom">Custom Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sortOption === 'custom' && (
            <div className="text-sm text-muted-foreground flex items-center gap-2" data-testid="div-drag-hint">
              <GripVertical className="w-4 h-4" />
              <span>Drag and drop to reorder jobs</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6" data-testid="div-jobs-container">
          {isLoading ? (
            <div className="space-y-4" data-testid="div-loading-skeletons">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" data-testid={`skeleton-job-${i}`} />
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="div-empty-state">
              <MapPin className="w-16 h-16 text-muted-foreground mb-4" data-testid="icon-empty-map" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-title">No Jobs Scheduled Today</h2>
              <p className="text-muted-foreground max-w-md" data-testid="text-empty-description">
                You have no scheduled or pending jobs for today. Jobs will appear here once they're scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="div-jobs-list">
              {sortedJobs.map((job, index) => (
                <DraggableJobCard
                  key={job.id}
                  job={job}
                  index={index}
                  moveJob={moveJob}
                  isCustomSort={sortOption === 'custom'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
export default function RouteView() {
  return (
    <ErrorBoundary>
      <RouteViewContent />
    </ErrorBoundary>
  );
}
