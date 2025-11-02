import { useState, useEffect } from 'react';

interface NetworkStatus {
  online: boolean;
  type: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

/**
 * Custom hook for monitoring network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(navigator.onLine);
  const [type, setType] = useState<string | null>(null);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [saveData, setSaveData] = useState(false);

  const updateNetworkInfo = () => {
    // @ts-ignore - Network Information API is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      setType(connection.type || null);
      setEffectiveType(connection.effectiveType || null);
      setDownlink(connection.downlink || null);
      setRtt(connection.rtt || null);
      setSaveData(connection.saveData || false);
    }
  };

  useEffect(() => {
    // Set initial network info
    updateNetworkInfo();

    // Handle online/offline events
    const handleOnline = () => {
      setOnline(true);
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setOnline(false);
    };

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
    };
  }, []);

  return {
    online,
    type,
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
}