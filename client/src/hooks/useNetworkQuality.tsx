import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkQuality {
  online: boolean;
  quality: 'high' | 'medium' | 'low' | 'offline';
  effectiveType: string | null;
  rtt: number | null;
  downlink: number | null;
  lastSyncTime: Date | null;
  pendingSyncCount: number;
  isRemoteArea: boolean;
  triggerManualSync: () => Promise<void>;
  updatePendingSyncCount: (delta: number) => void;
  markSyncComplete: () => void;
  isRetrying: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
}

/**
 * Custom hook for monitoring network quality and managing sync behavior
 */
export function useNetworkQuality(): NetworkQuality {
  const [online, setOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Update network information
  const updateNetworkInfo = useCallback(() => {
    // @ts-ignore - Network Information API is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection as NetworkInformation) {
      setEffectiveType(connection.effectiveType || null);
      setRtt(connection.rtt || null);
      setDownlink(connection.downlink || null);
    }
  }, []);

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      setOnline(true);
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // Set initial network info
    updateNetworkInfo();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [updateNetworkInfo]);

  // Determine quality based on effective type and metrics
  const quality = !online ? 'offline' :
    effectiveType === '4g' && (rtt === null || rtt < 150) ? 'high' :
    effectiveType === '3g' || (rtt && rtt < 300) ? 'medium' : 'low';

  // Check if in remote area (poor network quality)
  const isRemoteArea = quality === 'low' || (rtt !== null && rtt > 500);

  // Trigger manual sync
  const triggerManualSync = useCallback(async () => {
    if (!online) {
      throw new Error('Cannot sync while offline');
    }

    setIsRetrying(true);
    
    try {
      // This would trigger actual sync logic
      // For now, just simulate a sync operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSyncTime(new Date());
      setPendingSyncCount(0);
    } finally {
      setIsRetrying(false);
    }
  }, [online]);

  // Update pending sync count
  const updatePendingSyncCount = useCallback((delta: number) => {
    setPendingSyncCount(prev => Math.max(0, prev + delta));
  }, []);

  // Mark sync as complete
  const markSyncComplete = useCallback(() => {
    setLastSyncTime(new Date());
    setPendingSyncCount(0);
  }, []);

  return {
    online,
    quality,
    effectiveType,
    rtt,
    downlink,
    lastSyncTime,
    pendingSyncCount,
    isRemoteArea,
    triggerManualSync,
    updatePendingSyncCount,
    markSyncComplete,
    isRetrying,
  };
}