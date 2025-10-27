import { useState, useEffect, useCallback } from 'react';
import { tripTrackerService, type TripData, type TripState } from '@/services/tripTrackerService';
import { useToast } from '@/hooks/use-toast';

export interface UseTripTrackerReturn {
  isTracking: boolean;
  currentTrip: TripData | null;
  tripState: TripState;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  startManualTrip: () => Promise<void>;
  stopTrip: () => Promise<TripData | null>;
  clearCurrentTrip: () => Promise<void>;
  error: string | null;
}

export function useTripTracker(): UseTripTrackerReturn {
  const { toast } = useToast();
  const [currentTrip, setCurrentTrip] = useState<TripData | null>(null);
  const [tripState, setTripState] = useState<TripState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTripState(tripTrackerService.getState());
    setCurrentTrip(tripTrackerService.getCurrentTrip());

    const unsubscribeTrip = tripTrackerService.onTripUpdate((trip) => {
      setCurrentTrip(trip);
    });

    const unsubscribeState = tripTrackerService.onStateChange((state) => {
      setTripState(state);
    });

    const unsubscribeError = tripTrackerService.onError((geoError) => {
      let message = 'GPS error occurred';
      
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable location access.';
          break;
        case geoError.POSITION_UNAVAILABLE:
          message = 'Location unavailable. Please check your GPS settings.';
          break;
        case geoError.TIMEOUT:
          message = 'Location request timed out. Please try again.';
          break;
      }

      setError(message);
      toast({
        title: 'GPS Error',
        description: message,
        variant: 'destructive',
      });
    });

    return () => {
      unsubscribeTrip();
      unsubscribeState();
      unsubscribeError();
    };
  }, [toast]);

  const startMonitoring = useCallback(async () => {
    try {
      setError(null);
      await tripTrackerService.startMonitoring();
      toast({
        title: 'Monitoring Started',
        description: 'Trip will auto-start when you begin driving',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start monitoring';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopMonitoring = useCallback(() => {
    tripTrackerService.stopMonitoring();
    toast({
      title: 'Monitoring Stopped',
      description: 'GPS tracking has been disabled',
    });
  }, [toast]);

  const startManualTrip = useCallback(async () => {
    try {
      setError(null);
      await tripTrackerService.startManualTrip();
      toast({
        title: 'Trip Started',
        description: 'Recording your trip',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trip';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopTrip = useCallback(async () => {
    const trip = await tripTrackerService.stopTrip();
    if (trip) {
      toast({
        title: 'Trip Completed',
        description: `${trip.points.length} GPS points recorded`,
      });
    }
    return trip;
  }, [toast]);

  const clearCurrentTrip = useCallback(async () => {
    await tripTrackerService.clearCurrentTrip();
  }, []);

  return {
    isTracking: tripState === 'monitoring' || tripState === 'recording',
    currentTrip,
    tripState,
    startMonitoring,
    stopMonitoring,
    startManualTrip,
    stopTrip,
    clearCurrentTrip,
    error,
  };
}
