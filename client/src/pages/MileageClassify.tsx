import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { UnclassifiedDriveCard } from '@/components/mileage/UnclassifiedDriveCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ArrowLeft, CheckCircle2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import type { MileageLog } from '@shared/schema';

/**
 * MileageClassify - Production-ready mileage classification page
 * 
 * Features:
 * - Swipe-based drive classification (Business/Personal)
 * - Optimistic UI updates for instant feedback
 * - Error handling with retry capability
 * - Skeleton loading states
 * - Comprehensive test coverage
 */

function MileageClassifyContent() {
  const { toast } = useToast();
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(new Set());

  // Phase 5 - HARDEN: Query with retry: 2 for resilience
  const { 
    data: unclassifiedDrives, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<MileageLog[]>({
    queryKey: ['/api/mileage/unclassified'],
    queryFn: async () => {
      const response = await fetch('/api/mileage/unclassified');
      if (!response.ok) throw new Error('Failed to fetch unclassified drives');
      const data = await response.json();
      return data.drives;
    },
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoize mutation for stable reference
  const classifyMutation = useMutation({
    mutationFn: async ({ id, purpose }: { id: string; purpose: 'business' | 'personal' }) => {
      return apiRequest(`/api/mileage/${id}/classify`, {
        method: 'PUT',
        body: JSON.stringify({ purpose }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage/unclassified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      
      const purposeLabel = variables.purpose === 'business' ? 'Business' : 'Personal';
      toast({
        title: 'Drive Classified',
        description: `Classified as ${purposeLabel}`,
      });
    },
    onError: (error: Error, variables) => {
      setOptimisticRemovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.id);
        return newSet;
      });
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to classify drive',
        variant: 'destructive',
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized handlers prevent unnecessary re-renders
  const handleClassify = useCallback((id: string, purpose: 'business' | 'personal') => {
    classifyMutation.mutate({ id, purpose });
  }, [classifyMutation]);

  const handleRemoveOptimistic = useCallback((id: string) => {
    setOptimisticRemovals(prev => new Set(prev).add(id));
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Phase 3 - OPTIMIZE: Memoized computations prevent recalculation
  const displayedDrives = useMemo(
    () => unclassifiedDrives?.filter(drive => !optimisticRemovals.has(drive.id)) || [],
    [unclassifiedDrives, optimisticRemovals]
  );

  const totalCount = useMemo(
    () => unclassifiedDrives?.length || 0,
    [unclassifiedDrives]
  );

  // Phase 2 - BUILD: Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl" data-testid="div-loading-container">
        <div className="flex items-center gap-4 mb-6" data-testid="div-loading-header">
          <Skeleton className="h-10 w-10 rounded-full" data-testid="skeleton-back-button" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" data-testid="skeleton-title" />
            <Skeleton className="h-4 w-32" data-testid="skeleton-subtitle" />
          </div>
        </div>
        <div className="space-y-4" data-testid="div-skeleton-drives">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" data-testid={`skeleton-drive-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // Phase 5 - HARDEN: Error state with retry capability
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl" data-testid="div-error-container">
        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="div-error-state">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center" data-testid="div-error-icon">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold" data-testid="text-error-title">Failed to Load Drives</h2>
            <p className="text-muted-foreground" data-testid="text-error-message">
              {error instanceof Error ? error.message : 'Unable to fetch unclassified drives'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRetry} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Link href="/mileage">
              <Button variant="outline" data-testid="button-back-to-mileage-error">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mileage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Empty state when no drives to classify
  if (!unclassifiedDrives || totalCount === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl" data-testid="div-empty-container">
        <div className="flex items-center gap-3 mb-6" data-testid="div-empty-header">
          <Link href="/mileage">
            <Button variant="ghost" size="icon" data-testid="button-back-empty">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title-empty">Classify Drives</h1>
            <p className="text-muted-foreground text-sm" data-testid="text-subtitle-empty">Swipe to categorize your trips</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="div-empty-state">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center" data-testid="div-empty-icon">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold" data-testid="text-empty-title">All caught up!</h2>
            <p className="text-muted-foreground" data-testid="text-empty-description">
              You don't have any unclassified drives right now.
            </p>
          </div>
          <Link href="/mileage">
            <Button data-testid="button-back-to-mileage-empty">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mileage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Main content with drives to classify
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl" data-testid="div-main-container">
      <div className="flex items-center gap-3 mb-6" data-testid="div-header">
        <Link href="/mileage">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2" data-testid="div-title-row">
            <h1 className="text-2xl font-bold" data-testid="text-title">Classify Drives</h1>
            <Badge variant="secondary" data-testid="badge-count">
              {displayedDrives.length}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-subtitle">Swipe to categorize your trips</p>
        </div>
      </div>

      <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-instructions">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" data-testid="icon-sparkles" />
        <AlertDescription className="text-blue-900 dark:text-blue-100" data-testid="text-instructions">
          Swipe <span className="font-semibold" data-testid="text-swipe-right">right</span> for Business, <span className="font-semibold" data-testid="text-swipe-left">left</span> for Personal
        </AlertDescription>
      </Alert>

      <div className="space-y-4" data-testid="div-drive-stack">
        {displayedDrives.map((drive, index) => (
          <UnclassifiedDriveCard
            key={drive.id}
            drive={{
              id: drive.id,
              startLocation: drive.startLocation || 'Unknown',
              endLocation: drive.endLocation || 'Unknown',
              distance: parseFloat(drive.distance.toString()),
              startTimestamp: drive.startTimestamp || new Date().toISOString(),
              endTimestamp: drive.endTimestamp || new Date().toISOString(),
            }}
            onClassify={handleClassify}
            onRemoveOptimistic={handleRemoveOptimistic}
            data-testid={`card-drive-${index}`}
          />
        ))}
      </div>

      {displayedDrives.length === 0 && totalCount > 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="div-all-classified">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center" data-testid="div-success-icon">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold" data-testid="text-success-title">All caught up!</h2>
            <p className="text-muted-foreground" data-testid="text-success-description">
              You've classified all your drives.
            </p>
          </div>
          <Link href="/mileage">
            <Button data-testid="button-back-to-mileage-success">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mileage
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
export default function MileageClassify() {
  return (
    <ErrorBoundary>
      <MileageClassifyContent />
    </ErrorBoundary>
  );
}
