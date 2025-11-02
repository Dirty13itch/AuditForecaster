import { useState, useEffect, useCallback } from 'react';

interface BatteryStatus {
  level: number; // Battery level from 0 to 1 (0-100%)
  charging: boolean;
  chargingTime: number | null; // Time remaining until fully charged (in seconds)
  dischargingTime: number | null; // Time remaining until discharged (in seconds)
}

interface UseBatteryStatusReturn {
  battery: BatteryStatus | null;
  isSupported: boolean;
  batteryPercentage: number;
  batteryLevel: 'critical' | 'low' | 'medium' | 'high' | 'full';
  shouldSyncFull: boolean; // Whether to perform full sync based on battery
  shouldSyncCritical: boolean; // Whether to only sync critical data
  shouldPauseSync: boolean; // Whether to pause all non-critical sync
}

// Battery Manager type for TypeScript (not in standard lib)
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

// Extend Navigator for Battery API
declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }
}

/**
 * Hook for monitoring battery status and implementing battery-aware sync strategies
 * Optimized for field operations where battery conservation is critical
 */
export function useBatteryStatus(): UseBatteryStatusReturn {
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [batteryManager, setBatteryManager] = useState<BatteryManager | null>(null);
  
  const isSupported = 'getBattery' in navigator;

  // Calculate battery percentage
  const batteryPercentage = battery ? Math.round(battery.level * 100) : 100;

  // Determine battery level category
  const batteryLevel = (() => {
    if (!battery) return 'full';
    const level = battery.level * 100;
    if (level <= 10) return 'critical';
    if (level <= 20) return 'low';
    if (level <= 50) return 'medium';
    if (level <= 80) return 'high';
    return 'full';
  })();

  // Sync strategy based on battery status
  const shouldSyncFull = !battery || battery.charging || batteryPercentage > 50;
  const shouldSyncCritical = battery && !battery.charging && batteryPercentage <= 50 && batteryPercentage > 20;
  const shouldPauseSync = battery && !battery.charging && batteryPercentage <= 20;

  // Update battery status from BatteryManager
  const updateBatteryStatus = useCallback((batteryManager: BatteryManager) => {
    setBattery({
      level: batteryManager.level,
      charging: batteryManager.charging,
      chargingTime: batteryManager.chargingTime === Infinity ? null : batteryManager.chargingTime,
      dischargingTime: batteryManager.dischargingTime === Infinity ? null : batteryManager.dischargingTime
    });
  }, []);

  // Initialize battery monitoring
  useEffect(() => {
    if (!isSupported) {
      console.log('Battery Status API not supported');
      return;
    }

    let mounted = true;

    const initBattery = async () => {
      try {
        const battery = await navigator.getBattery!();
        
        if (!mounted) return;

        setBatteryManager(battery);
        updateBatteryStatus(battery);

        // Set up event listeners
        const handleChange = () => updateBatteryStatus(battery);
        
        battery.addEventListener('levelchange', handleChange);
        battery.addEventListener('chargingchange', handleChange);
        battery.addEventListener('chargingtimechange', handleChange);
        battery.addEventListener('dischargingtimechange', handleChange);

        // Log initial battery status
        console.log(`Battery: ${Math.round(battery.level * 100)}%, ${battery.charging ? 'Charging' : 'Not charging'}`);

        // Cleanup
        return () => {
          battery.removeEventListener('levelchange', handleChange);
          battery.removeEventListener('chargingchange', handleChange);
          battery.removeEventListener('chargingtimechange', handleChange);
          battery.removeEventListener('dischargingtimechange', handleChange);
        };
      } catch (error) {
        console.error('Failed to get battery status:', error);
      }
    };

    initBattery();

    return () => {
      mounted = false;
    };
  }, [isSupported, updateBatteryStatus]);

  // Log sync strategy changes
  useEffect(() => {
    if (!battery) return;

    const strategy = shouldPauseSync 
      ? 'PAUSED (Battery Critical)'
      : shouldSyncCritical
      ? 'CRITICAL ONLY (Battery Low)'
      : 'FULL SYNC';

    console.log(`Sync strategy: ${strategy} (${batteryPercentage}% battery, ${battery.charging ? 'charging' : 'not charging'})`);
  }, [shouldPauseSync, shouldSyncCritical, batteryPercentage, battery]);

  return {
    battery,
    isSupported,
    batteryPercentage,
    batteryLevel,
    shouldSyncFull,
    shouldSyncCritical,
    shouldPauseSync
  };
}

/**
 * Get battery icon name based on level and charging status
 */
export function getBatteryIcon(level: number, charging: boolean): string {
  if (charging) return 'BatteryCharging';
  
  if (level >= 90) return 'BatteryFull';
  if (level >= 60) return 'BatteryMedium';
  if (level >= 30) return 'BatteryLow';
  return 'BatteryWarning';
}

/**
 * Get battery color based on level
 */
export function getBatteryColor(level: number): string {
  if (level >= 50) return 'text-green-500';
  if (level >= 20) return 'text-yellow-500';
  if (level >= 10) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Format battery time remaining
 */
export function formatBatteryTime(seconds: number | null): string {
  if (seconds === null || seconds === Infinity) return '—';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

/**
 * Battery-aware sync configuration
 */
export interface SyncConfig {
  syncPhotos: boolean;
  syncReports: boolean;
  syncAnalytics: boolean;
  syncInterval: number; // milliseconds
  compressionLevel: 'none' | 'low' | 'high';
}

/**
 * Get sync configuration based on battery status
 */
export function getSyncConfig(battery: BatteryStatus | null): SyncConfig {
  if (!battery) {
    // Default config when battery status unavailable
    return {
      syncPhotos: true,
      syncReports: true,
      syncAnalytics: true,
      syncInterval: 30000, // 30 seconds
      compressionLevel: 'none'
    };
  }

  const level = battery.level * 100;

  // Charging - full sync
  if (battery.charging) {
    return {
      syncPhotos: true,
      syncReports: true,
      syncAnalytics: true,
      syncInterval: 30000, // 30 seconds
      compressionLevel: 'none'
    };
  }

  // High battery (>50%) - full sync
  if (level > 50) {
    return {
      syncPhotos: true,
      syncReports: true,
      syncAnalytics: true,
      syncInterval: 60000, // 1 minute
      compressionLevel: 'low'
    };
  }

  // Medium battery (20-50%) - critical only
  if (level > 20) {
    return {
      syncPhotos: false, // Pause photo sync
      syncReports: true, // Keep syncing reports
      syncAnalytics: false, // Pause analytics
      syncInterval: 120000, // 2 minutes
      compressionLevel: 'high'
    };
  }

  // Low battery (<20%) - minimal sync
  return {
    syncPhotos: false,
    syncReports: false,
    syncAnalytics: false,
    syncInterval: 300000, // 5 minutes
    compressionLevel: 'high'
  };
}