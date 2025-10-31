import { useState } from 'react';
import { useTripTracker } from '@/hooks/useTripTracker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Square, Navigation, Gauge, Clock, MapPin, AlertTriangle, RefreshCw, Edit } from 'lucide-react';
import { metersToMiles, metersPerSecondToMph } from '@/lib/haversine';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

export function TripController() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const {
    isTracking,
    currentTrip,
    tripState,
    startMonitoring,
    stopMonitoring,
    stopTrip,
    clearCurrentTrip,
  } = useTripTracker();

  const [showCategorize, setShowCategorize] = useState(false);
  const [showGpsFailDialog, setShowGpsFailDialog] = useState(false);
  const [failedTripData, setFailedTripData] = useState<{ startTime: Date } | null>(null);
  const [purpose, setPurpose] = useState<'business' | 'personal'>('business');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const { data: jobs } = useQuery({
    queryKey: ['/api/jobs'],
    select: (data: any[]) => data.filter(j => j.status !== 'completed').slice(0, 20),
  });

  const saveTripMutation = useMutation({
    mutationFn: async (tripData: {
      purpose: string;
      jobId?: string;
      tripId: string;
      startTime: Date;
      endTime: Date;
      distanceMeters: number;
      durationSeconds: number;
      points: any[];
    }) => {
      return apiRequest('/api/mileage-logs/auto', {
        method: 'POST',
        body: JSON.stringify(tripData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: 'Trip Saved',
        description: 'Your trip has been saved successfully',
      });
      clearCurrentTrip();
      setShowCategorize(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStart = async () => {
    try {
      await startMonitoring();
    } catch (error) {
      // Error will be handled by the tracking system
    }
  };

  const handleStop = async () => {
    const trip = await stopTrip();
    if (trip && trip.points.length > 0) {
      setShowCategorize(true);
    } else {
      // GPS failed - show dialog with options instead of just toast
      const startTime = trip?.startTime || new Date();
      setFailedTripData({ startTime });
      setShowGpsFailDialog(true);
    }
  };

  const handleRetryGps = async () => {
    setShowGpsFailDialog(false);
    setFailedTripData(null);
    clearCurrentTrip();
    try {
      await startMonitoring();
      toast({
        title: 'Tracking Restarted',
        description: 'GPS tracking has been restarted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restart GPS tracking',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchToManual = () => {
    setShowGpsFailDialog(false);
    stopMonitoring();
    clearCurrentTrip();
    // Navigate to mileage page where user can manually enter trip
    setLocation('/mileage');
    toast({
      title: 'Switched to Manual Entry',
      description: 'You can now enter your trip details manually',
    });
  };

  const handleCancelFailedTrip = () => {
    setShowGpsFailDialog(false);
    setFailedTripData(null);
    stopMonitoring();
    clearCurrentTrip();
    toast({
      title: 'Trip Cancelled',
      description: 'GPS tracking attempt has been cancelled',
    });
  };

  const handleSaveTrip = () => {
    if (!currentTrip || !currentTrip.startTime || !currentTrip.endTime) {
      toast({
        title: 'Invalid Trip',
        description: 'Trip data is incomplete',
        variant: 'destructive',
      });
      return;
    }

    saveTripMutation.mutate({
      purpose: purpose === 'business' ? 'business' : 'personal',
      jobId: selectedJobId || undefined,
      tripId: currentTrip.id,
      startTime: currentTrip.startTime,
      endTime: currentTrip.endTime,
      distanceMeters: currentTrip.distanceMeters,
      durationSeconds: currentTrip.durationSeconds,
      points: currentTrip.points,
    });
  };

  const getStateColor = () => {
    switch (tripState) {
      case 'monitoring':
        return 'bg-blue-500';
      case 'recording':
        return 'bg-green-500';
      case 'pendingUpload':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStateLabel = () => {
    switch (tripState) {
      case 'monitoring':
        return 'Monitoring';
      case 'recording':
        return 'Recording';
      case 'pendingUpload':
        return 'Pending';
      default:
        return 'Idle';
    }
  };

  return (
    <>
      <Card data-testid="card-trip-controller">
        <CardHeader className="gap-2 space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">GPS Trip Tracker</CardTitle>
            <Badge className={getStateColor()} data-testid="badge-trip-state">
              {getStateLabel()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tripState === 'recording' && currentTrip && (
            <div className="grid grid-cols-3 gap-4" data-testid="div-trip-stats">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span className="text-sm">Distance</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-trip-distance">
                  {metersToMiles(currentTrip.distanceMeters).toFixed(2)} mi
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Duration</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-trip-duration">
                  {Math.floor(currentTrip.durationSeconds / 60)}m
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">Avg Speed</span>
                </div>
                <div className="text-2xl font-bold" data-testid="text-trip-speed">
                  {metersPerSecondToMph(currentTrip.averageSpeed).toFixed(0)} mph
                </div>
              </div>
            </div>
          )}

          {tripState === 'pendingUpload' && currentTrip && (
            <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-950">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Trip Ready to Save
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {metersToMiles(currentTrip.distanceMeters).toFixed(2)} miles • {currentTrip.points.length} GPS points
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowCategorize(true)}
                    data-testid="button-categorize-trip"
                  >
                    Categorize & Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isTracking && tripState !== 'pendingUpload' ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleStart}
                data-testid="button-start-trip"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Auto-Tracking
              </Button>
            ) : tripState === 'monitoring' || tripState === 'recording' ? (
              <Button
                size="lg"
                variant="destructive"
                className="w-full"
                onClick={handleStop}
                data-testid="button-stop-trip"
              >
                <Square className="mr-2 h-5 w-5" />
                Stop Trip
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {tripState === 'idle' && 'Trip will auto-start when you begin driving (>11 mph for 30s)'}
            {tripState === 'monitoring' && 'Waiting for movement to start recording...'}
            {tripState === 'recording' && 'Recording your trip. Will auto-stop after 2 min idle.'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={showCategorize} onOpenChange={setShowCategorize}>
        <DialogContent data-testid="dialog-categorize-trip">
          <DialogHeader>
            <DialogTitle>Categorize Trip</DialogTitle>
            <DialogDescription>
              Classify this trip as business or personal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentTrip && (
              <div className="rounded-md bg-muted p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium">
                    {metersToMiles(currentTrip.distanceMeters).toFixed(2)} miles
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {Math.floor(currentTrip.durationSeconds / 60)} min
                  </span>
                </div>
                {currentTrip.startTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">
                      {format(new Date(currentTrip.startTime), 'h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Purpose</Label>
              <RadioGroup value={purpose} onValueChange={(v) => setPurpose(v as any)} data-testid="radio-trip-purpose">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="font-normal cursor-pointer">
                    Business
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="font-normal cursor-pointer">
                    Personal
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {purpose === 'business' && (
              <div className="space-y-2">
                <Label>Link to Job (Optional)</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-trip-job">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No job</SelectItem>
                    {jobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.address || job.lotNumber || 'Unnamed Job'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCategorize(false)}
                data-testid="button-cancel-categorize"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveTrip}
                disabled={saveTripMutation.isPending}
                data-testid="button-save-trip"
              >
                {saveTripMutation.isPending ? 'Saving...' : 'Save Trip'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGpsFailDialog} onOpenChange={setShowGpsFailDialog}>
        <DialogContent data-testid="dialog-gps-failure">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              GPS Tracking Failed
            </DialogTitle>
            <DialogDescription>
              Not enough GPS data was collected for this trip. What would you like to do?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {failedTripData && (
              <div className="rounded-md bg-muted p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Started at:</span>
                  <span className="font-medium">
                    {format(new Date(failedTripData.startTime), 'h:mm a')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This may be due to GPS timeout, permission issues, or weak signal.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-start"
                onClick={handleSwitchToManual}
                data-testid="button-switch-manual"
              >
                <Edit className="mr-2 h-4 w-4" />
                Switch to Manual Entry
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleRetryGps}
                data-testid="button-retry-gps"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry GPS Tracking
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCancelFailedTrip}
                data-testid="button-cancel-failed"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
