import { useState, useCallback, useEffect, useRef } from 'react';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

interface UseGeolocation {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  hasPermission: boolean | null;
  getPosition: () => Promise<GeolocationPosition>;
  watchPosition: () => void;
  clearWatch: () => void;
  requestPermission: () => Promise<boolean>;
}

/**
 * Custom hook for accessing device geolocation
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocation {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Check permission status
  useEffect(() => {
    const checkPermission = async () => {
      if (!isSupported) {
        setHasPermission(false);
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setHasPermission(result.state === 'granted');
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted');
        });
      } catch (err) {
        // Permissions API might not be available
        console.warn('Unable to check geolocation permission:', err);
      }
    };

    checkPermission();
  }, [isSupported]);

  // Success callback
  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const position: GeolocationPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };

    setPosition(position);
    setError(null);
    setLoading(false);
    setHasPermission(true);
  }, []);

  // Error callback
  const handleError = useCallback((err: GeolocationPositionError) => {
    const error: GeolocationError = {
      code: err.code,
      message: err.message,
    };

    setError(error);
    setLoading(false);

    // Update permission status based on error
    if (err.code === err.PERMISSION_DENIED) {
      setHasPermission(false);
    }
  }, []);

  // Get current position
  const getPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSuccess(pos);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Watch position
  const watchPosition = useCallback(() => {
    if (!isSupported || watchIdRef.current !== null) return;

    setLoading(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Clear watch
  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setHasPermission(false);
      return false;
    }

    try {
      // Trigger permission prompt by requesting position
      await getPosition();
      return true;
    } catch {
      return false;
    }
  }, [isSupported, getPosition]);

  // Auto-watch if enabled
  useEffect(() => {
    if (watch && isSupported) {
      watchPosition();
      return () => clearWatch();
    }
  }, [watch, isSupported, watchPosition, clearWatch]);

  return {
    position,
    error,
    loading,
    hasPermission,
    getPosition,
    watchPosition,
    clearWatch,
    requestPermission,
  };
}