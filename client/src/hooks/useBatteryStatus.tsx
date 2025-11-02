import { useState, useEffect } from 'react';

interface BatteryStatus {
  battery: BatteryManager | null;
  batteryPercentage: number;
  batteryLevel: 'critical' | 'low' | 'medium' | 'high';
  isCharging: boolean;
  shouldSyncFull: boolean;
  shouldPauseSync: boolean;
}

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Custom hook for monitoring battery status and adjusting sync behavior
 */
export function useBatteryStatus(): BatteryStatus {
  const [battery, setBattery] = useState<BatteryManager | null>(null);
  const [batteryPercentage, setBatteryPercentage] = useState(100);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    let batteryManager: BatteryManager | null = null;

    const updateBatteryStatus = () => {
      if (batteryManager) {
        const percentage = Math.round(batteryManager.level * 100);
        setBatteryPercentage(percentage);
        setIsCharging(batteryManager.charging);
      }
    };

    const initBattery = async () => {
      try {
        // Check if Battery API is available
        if ('getBattery' in navigator) {
          // @ts-ignore - Battery API is not yet in TypeScript definitions
          batteryManager = await navigator.getBattery();
          setBattery(batteryManager);
          
          // Set initial status
          updateBatteryStatus();
          
          // Add event listeners
          if (batteryManager) {
            batteryManager.addEventListener('levelchange', updateBatteryStatus);
            batteryManager.addEventListener('chargingchange', updateBatteryStatus);
          }
        }
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    };

    initBattery();

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBatteryStatus);
        batteryManager.removeEventListener('chargingchange', updateBatteryStatus);
      }
    };
  }, []);

  // Determine battery level category
  const batteryLevel: 'critical' | 'low' | 'medium' | 'high' = 
    batteryPercentage <= 10 ? 'critical' :
    batteryPercentage <= 20 ? 'low' :
    batteryPercentage <= 50 ? 'medium' : 'high';

  // Sync strategy based on battery
  const shouldSyncFull = isCharging || batteryPercentage > 50;
  const shouldPauseSync = batteryPercentage <= 10 && !isCharging;

  return {
    battery,
    batteryPercentage,
    batteryLevel,
    isCharging,
    shouldSyncFull,
    shouldPauseSync,
  };
}