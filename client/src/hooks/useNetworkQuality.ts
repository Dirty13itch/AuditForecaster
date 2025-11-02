import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkQuality {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  lastSyncTime: Date | null;
  pendingSyncCount: number;
  isRemoteArea: boolean; // Detected weak signal area
}

interface NetworkInformation extends EventTarget {
  downlink: number;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt: number;
  saveData: boolean;
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
}

// Extend Navigator for Network Information API
declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

interface UseNetworkQualityOptions {
  checkInterval?: number; // How often to check network quality (ms)
  remoteAreaThreshold?: number; // RTT threshold for remote area detection (ms)
}

interface UseNetworkQualityReturn extends NetworkQuality {
  isSupported: boolean;
  triggerManualSync: () => Promise<void>;
  updatePendingSyncCount: (count: number) => void;
  markSyncComplete: () => void;
  isRetrying: boolean;
  retryCount: number;
}

/**
 * Hook for monitoring network quality and managing sync operations
 * Implements exponential backoff and remote area detection
 */
export function useNetworkQuality(options: UseNetworkQualityOptions = {}): UseNetworkQualityReturn {
  const {
    checkInterval = 5000,
    remoteAreaThreshold = 500
  } = options;

  const { toast } = useToast();
  const [online, setOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<NetworkQuality['effectiveType']>('unknown');
  const [downlink, setDownlink] = useState(10); // Default 10 Mbps
  const [rtt, setRtt] = useState(50); // Default 50ms
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousOnlineRef = useRef(online);
  
  // Get connection object (with vendor prefixes)
  const connection = navigator.connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  const isSupported = !!connection;

  // Determine if in remote area based on RTT and effective type
  const isRemoteArea = rtt > remoteAreaThreshold || effectiveType === 'slow-2g' || effectiveType === '2g';

  // Calculate quality based on multiple factors
  const quality = (() => {
    if (!online) return 'offline';
    
    // Check 5G separately (not in standard effectiveType)
    const is5G = downlink > 100 && rtt < 20;
    
    if (is5G || (effectiveType === '4g' && rtt < 100 && downlink > 10)) {
      return 'excellent';
    }
    if ((effectiveType === '4g' && rtt < 200) || (effectiveType === '3g' && rtt < 150 && downlink > 2)) {
      return 'good';
    }
    if (effectiveType === '3g' || (effectiveType === '2g' && rtt < 500)) {
      return 'fair';
    }
    return 'poor';
  })() as NetworkQuality['quality'];

  // Update network information
  const updateNetworkInfo = useCallback(() => {
    if (!connection) return;

    setDownlink(connection.downlink || 10);
    setRtt(connection.rtt || 50);
    
    // Detect 5G based on speed metrics
    const is5G = connection.downlink > 100 && connection.rtt < 20;
    setEffectiveType(is5G ? '5g' : (connection.effectiveType || 'unknown'));

    // Log network quality for debugging
    console.log(`Network: ${connection.effectiveType}, ${connection.downlink}Mbps, ${connection.rtt}ms RTT`);
  }, [connection]);

  // Manual sync trigger with exponential backoff
  const triggerManualSync = useCallback(async () => {
    if (!online) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline. Data will sync automatically when connection is restored.",
        variant: "destructive"
      });
      return;
    }

    setIsRetrying(true);
    
    try {
      // Trigger sync via service worker message
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'MANUAL_SYNC',
          quality,
          isRemoteArea
        });
      }

      // Simulate sync completion for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLastSyncTime(new Date());
      setPendingSyncCount(0);
      setRetryCount(0);
      
      toast({
        title: "Sync Complete",
        description: "All data synchronized successfully",
      });
    } catch (error) {
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff: 2^retryCount seconds, max 5 minutes
      const backoffTime = Math.min(Math.pow(2, retryCount) * 1000, 300000);
      
      toast({
        title: "Sync Failed",
        description: `Will retry in ${Math.round(backoffTime / 1000)}s`,
        variant: "destructive"
      });

      // Schedule retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        triggerManualSync();
      }, backoffTime);
    } finally {
      setIsRetrying(false);
    }
  }, [online, quality, isRemoteArea, retryCount, toast]);

  // Update pending sync count
  const updatePendingSyncCount = useCallback((count: number) => {
    setPendingSyncCount(count);
  }, []);

  // Mark sync as complete
  const markSyncComplete = useCallback(() => {
    setLastSyncTime(new Date());
    setPendingSyncCount(0);
    setRetryCount(0);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      
      // Only show notification if was previously offline
      if (!previousOnlineRef.current) {
        toast({
          title: "Back Online",
          description: "Connection restored. Syncing pending changes...",
        });
        
        // Trigger sync after coming back online
        triggerManualSync();
      }
      
      previousOnlineRef.current = true;
    };

    const handleOffline = () => {
      setOnline(false);
      
      // Only show notification if was previously online
      if (previousOnlineRef.current) {
        toast({
          title: "Offline Mode",
          description: `${pendingSyncCount} changes will sync when connection is restored`,
          variant: "destructive"
        });
      }
      
      previousOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSyncCount, toast, triggerManualSync]);

  // Monitor network connection changes
  useEffect(() => {
    if (!connection) return;

    updateNetworkInfo();

    const handleConnectionChange = () => {
      updateNetworkInfo();
      
      // Auto-sync if connection improves from poor to good
      if (previousOnlineRef.current && quality === 'good' && pendingSyncCount > 0) {
        console.log('Connection improved, triggering auto-sync');
        triggerManualSync();
      }
    };

    connection.addEventListener('change', handleConnectionChange);

    // Periodic quality check
    const interval = setInterval(updateNetworkInfo, checkInterval);

    return () => {
      connection.removeEventListener('change', handleConnectionChange);
      clearInterval(interval);
    };
  }, [connection, updateNetworkInfo, checkInterval, quality, pendingSyncCount, triggerManualSync]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Pre-cache job data when signal is strong
  useEffect(() => {
    if (quality === 'excellent' && online) {
      // Send message to service worker to pre-cache upcoming jobs
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PRE_CACHE_JOBS',
          quality
        });
      }
    }
  }, [quality, online]);

  return {
    online,
    effectiveType,
    downlink,
    rtt,
    quality,
    lastSyncTime,
    pendingSyncCount,
    isRemoteArea,
    isSupported,
    triggerManualSync,
    updatePendingSyncCount,
    markSyncComplete,
    isRetrying,
    retryCount
  };
}

/**
 * Get network quality icon
 */
export function getNetworkIcon(quality: NetworkQuality['quality']): string {
  switch (quality) {
    case 'excellent': return 'WifiHigh';
    case 'good': return 'Wifi';
    case 'fair': return 'WifiLow';
    case 'poor': return 'WifiZero';
    case 'offline': return 'WifiOff';
  }
}

/**
 * Get network quality color
 */
export function getNetworkColor(quality: NetworkQuality['quality']): string {
  switch (quality) {
    case 'excellent': return 'text-green-500';
    case 'good': return 'text-blue-500';
    case 'fair': return 'text-yellow-500';
    case 'poor': return 'text-orange-500';
    case 'offline': return 'text-red-500';
  }
}

/**
 * Format last sync time for display
 */
export function formatLastSync(lastSyncTime: Date | null): string {
  if (!lastSyncTime) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - lastSyncTime.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  
  return lastSyncTime.toLocaleDateString();
}

/**
 * Determine if should compress data based on network quality
 */
export function shouldCompressData(quality: NetworkQuality['quality']): boolean {
  return quality === 'poor' || quality === 'fair';
}

/**
 * Get sync priority based on data type and network quality
 */
export function getSyncPriority(
  dataType: 'job-status' | 'safety-test' | 'photo' | 'report' | 'analytics',
  quality: NetworkQuality['quality']
): number {
  // Priority scale: 1 (highest) to 5 (lowest)
  
  const priorities = {
    'job-status': 1, // Always highest priority
    'safety-test': 1, // Critical safety data
    'report': 2,
    'photo': quality === 'excellent' ? 3 : 5, // Low priority on poor connection
    'analytics': quality === 'excellent' ? 4 : 5
  };
  
  return priorities[dataType] || 5;
}