import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { UnclassifiedDriveCard } from '@/components/mileage/UnclassifiedDriveCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import type { MileageLog } from '@shared/schema';

export default function MileageClassify() {
  const { toast } = useToast();
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(new Set());

  const { data: unclassifiedDrives, isLoading } = useQuery<MileageLog[]>({
    queryKey: ['/api/mileage/unclassified'],
  });

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

  const handleClassify = (id: string, purpose: 'business' | 'personal') => {
    classifyMutation.mutate({ id, purpose });
  };

  const handleRemoveOptimistic = (id: string) => {
    setOptimisticRemovals(prev => new Set(prev).add(id));
  };

  const displayedDrives = unclassifiedDrives?.filter(drive => !optimisticRemovals.has(drive.id)) || [];
  const totalCount = unclassifiedDrives?.length || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" data-testid={`skeleton-drive-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!unclassifiedDrives || totalCount === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mileage">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">Classify Drives</h1>
            <p className="text-muted-foreground text-sm">Swipe to categorize your trips</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="div-empty-state">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">All caught up!</h2>
            <p className="text-muted-foreground">
              You don't have any unclassified drives right now.
            </p>
          </div>
          <Link href="/mileage">
            <Button data-testid="button-back-to-mileage">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mileage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mileage">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" data-testid="text-title">Classify Drives</h1>
            <Badge variant="secondary" data-testid="badge-count">
              {displayedDrives.length}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Swipe to categorize your trips</p>
        </div>
      </div>

      <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-instructions">
        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          Swipe <span className="font-semibold">right</span> for Business, <span className="font-semibold">left</span> for Personal
        </AlertDescription>
      </Alert>

      <div className="space-y-4" data-testid="div-drive-stack">
        {displayedDrives.map((drive) => (
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
          />
        ))}
      </div>

      {displayedDrives.length === 0 && totalCount > 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="div-all-classified">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">All caught up!</h2>
            <p className="text-muted-foreground">
              You've classified all your drives.
            </p>
          </div>
          <Link href="/mileage">
            <Button data-testid="button-back-to-mileage">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mileage
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
