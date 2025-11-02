import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface GeolocationError {
  code: number;
  message: string;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isPermissionDenied: boolean;
  getPosition: () => Promise<GeolocationPosition>;
  requestPermission: () => Promise<void>;
  hasPermission: boolean;
  isSupported: boolean;
}

/**
 * Hook for capturing GPS location with permission handling
 * Optimized for field operations with high accuracy requirements
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watchPosition = false
  } = options;

  const { toast } = useToast();
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const isSupported = 'geolocation' in navigator;

  // Check permission status
  useEffect(() => {
    if (!isSupported) return;

    // Check if permission API is available
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setHasPermission(result.state === 'granted');
          setIsPermissionDenied(result.state === 'denied');
          
          // Watch for permission changes
          result.addEventListener('change', () => {
            setHasPermission(result.state === 'granted');
            setIsPermissionDenied(result.state === 'denied');
          });
        })
        .catch(() => {
          // Permission API not supported, will check when trying to get location
        });
    }
  }, [isSupported]);

  // Get single position
  const getPosition = useCallback(async (): Promise<GeolocationPosition> => {
    if (!isSupported) {
      const error = { code: 0, message: 'Geolocation is not supported' };
      setError(error);
      throw new Error(error.message);
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          };
          
          setPosition(position);
          setError(null);
          setIsLoading(false);
          setHasPermission(true);
          setIsPermissionDenied(false);
          
          // Log accuracy for field debugging
          console.log(`GPS accuracy: ${position.accuracy}m`);
          
          // Warn if accuracy is poor (>50m)
          if (position.accuracy > 50) {
            toast({
              title: "Low GPS Accuracy",
              description: `Current accuracy: ${Math.round(position.accuracy)}m. Move to an open area for better signal.`,
              variant: "default"
            });
          }
          
          resolve(position);
        },
        (err) => {
          const error: GeolocationError = {
            code: err.code,
            message: err.message
          };
          
          setError(error);
          setIsLoading(false);
          
          if (err.code === 1) {
            setIsPermissionDenied(true);
            setHasPermission(false);
            toast({
              title: "Location Permission Denied",
              description: "Please enable location services in your device settings to capture job locations.",
              variant: "destructive"
            });
          } else if (err.code === 2) {
            toast({
              title: "Location Unavailable",
              description: "Unable to get GPS signal. Please check your device location settings.",
              variant: "destructive"
            });
          } else if (err.code === 3) {
            toast({
              title: "Location Timeout",
              description: "GPS signal took too long. Please try again in an open area.",
              variant: "destructive"
            });
          }
          
          reject(error);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    });
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, toast]);

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Geolocation is not supported');
    }

    try {
      // Trigger permission prompt by requesting location
      await getPosition();
    } catch (error) {
      // Permission was denied or another error occurred
      console.error('Permission request failed:', error);
      throw error;
    }
  }, [isSupported, getPosition]);

  // Watch position if enabled
  useEffect(() => {
    if (!watchPosition || !isSupported) return;

    let watchId: number;
    
    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          };
          
          setPosition(position);
          setError(null);
          setHasPermission(true);
          setIsPermissionDenied(false);
        },
        (err) => {
          const error: GeolocationError = {
            code: err.code,
            message: err.message
          };
          
          setError(error);
          
          if (err.code === 1) {
            setIsPermissionDenied(true);
            setHasPermission(false);
          }
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );
    };

    startWatching();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchPosition, isSupported, enableHighAccuracy, timeout, maximumAge]);

  return {
    position,
    error,
    isLoading,
    isPermissionDenied,
    getPosition,
    requestPermission,
    hasPermission,
    isSupported
  };
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Format GPS coordinates for display
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
}

/**
 * Open native maps app with directions to location
 */
export function navigateToLocation(latitude: number, longitude: number, label?: string) {
  // Check if on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check if on Android (including Samsung devices)
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let url: string;
  
  if (isIOS) {
    // Apple Maps URL scheme
    url = `maps://maps.apple.com/?daddr=${latitude},${longitude}`;
    if (label) {
      url += `&q=${encodeURIComponent(label)}`;
    }
  } else if (isAndroid) {
    // Google Maps URL for Android
    url = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    if (label) {
      url += `(${encodeURIComponent(label)})`;
    }
  } else {
    // Fallback to Google Maps web
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    if (label) {
      url += `&destination_place_id=${encodeURIComponent(label)}`;
    }
  }
  
  window.open(url, '_blank');
}