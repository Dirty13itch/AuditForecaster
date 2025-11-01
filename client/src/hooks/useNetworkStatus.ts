import { useState, useEffect } from 'react';
import { getSyncQueueCount, processSyncQueue } from '@/utils/syncQueue';
import { clientLogger } from '@/lib/logger';

export interface NetworkStatus {
  isOnline: boolean;
  pendingSync: number;
  isSyncing: boolean;
}

/**
 * Singleton state management for network status
 * This prevents multiple hook instances from creating duplicate event listeners
 * and ensures sync queue is processed only once per online event
 */
class NetworkStatusManager {
  private static instance: NetworkStatusManager;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    pendingSync: 0,
    isSyncing: false,
  };
  private isInitialized = false;
  private isSyncInProgress = false; // Global lock to prevent concurrent sync
  private pendingCountInterval: number | null = null;

  private constructor() {
    // Singleton pattern - prevent direct instantiation
  }

  static getInstance(): NetworkStatusManager {
    if (!NetworkStatusManager.instance) {
      NetworkStatusManager.instance = new NetworkStatusManager();
    }
    return NetworkStatusManager.instance;
  }

  /**
   * Initialize global event listeners - called only once
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    clientLogger.info('[NetworkStatusManager] Initializing singleton');

    // Set up global online/offline event listeners (only once)
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Start polling for pending count
    this.updatePendingCount();
    this.pendingCountInterval = window.setInterval(() => {
      this.updatePendingCount();
    }, 5000);

    this.isInitialized = true;
  }

  /**
   * Global online event handler - processes sync queue with concurrency protection
   */
  private handleOnline = async () => {
    clientLogger.info('[NetworkStatusManager] Network is online');
    
    this.updateStatus({ isOnline: true });

    const count = await getSyncQueueCount();
    if (count > 0) {
      // Check global lock to prevent concurrent processing
      if (this.isSyncInProgress) {
        clientLogger.info('[NetworkStatusManager] Sync already in progress, skipping duplicate call');
        return;
      }

      // Acquire lock
      this.isSyncInProgress = true;
      this.updateStatus({ isSyncing: true });

      try {
        const result = await processSyncQueue((current, total) => {
          clientLogger.debug(`[NetworkStatusManager] Syncing: ${current}/${total}`);
        });

        clientLogger.info('[NetworkStatusManager] Sync complete:', result);

        const remainingCount = await getSyncQueueCount();
        this.updateStatus({
          pendingSync: remainingCount,
          isSyncing: false,
        });
      } catch (error) {
        clientLogger.error('[NetworkStatusManager] Error during sync:', error);
        this.updateStatus({ isSyncing: false });
      } finally {
        // Release lock
        this.isSyncInProgress = false;
      }
    }
  };

  private handleOffline = () => {
    clientLogger.info('[NetworkStatusManager] Network is offline');
    this.updateStatus({ isOnline: false, isSyncing: false });
  };

  private async updatePendingCount() {
    try {
      const count = await getSyncQueueCount();
      this.updateStatus({ pendingSync: count });
    } catch (error) {
      clientLogger.error('[NetworkStatusManager] Error getting pending count:', error);
    }
  }

  /**
   * Update internal status and notify all listeners
   */
  private updateStatus(partial: Partial<NetworkStatus>) {
    this.status = { ...this.status, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current status
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Force sync with concurrency protection
   */
  async forceSync(): Promise<{ success: number; failed: number } | null> {
    if (!navigator.onLine) {
      clientLogger.warn('[NetworkStatusManager] Cannot sync while offline');
      return null;
    }

    // Check global lock
    if (this.isSyncInProgress) {
      clientLogger.info('[NetworkStatusManager] Sync already in progress, skipping force sync');
      return null;
    }

    // Acquire lock
    this.isSyncInProgress = true;
    this.updateStatus({ isSyncing: true });

    try {
      const result = await processSyncQueue((current, total) => {
        clientLogger.debug(`[NetworkStatusManager] Force syncing: ${current}/${total}`);
      });

      clientLogger.info('[NetworkStatusManager] Force sync complete:', result);

      const remainingCount = await getSyncQueueCount();
      this.updateStatus({
        pendingSync: remainingCount,
        isSyncing: false,
      });

      return result;
    } catch (error) {
      clientLogger.error('[NetworkStatusManager] Error during force sync:', error);
      this.updateStatus({ isSyncing: false });
      throw error;
    } finally {
      // Release lock
      this.isSyncInProgress = false;
    }
  }

  /**
   * Cleanup - called when app unmounts (rarely needed in SPAs)
   */
  cleanup() {
    if (this.pendingCountInterval) {
      clearInterval(this.pendingCountInterval);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.isInitialized = false;
  }
}

// Get singleton instance
const manager = NetworkStatusManager.getInstance();

/**
 * React hook for network status
 * Multiple components can use this hook safely - all share the same singleton state
 * and event listeners, preventing duplicate sync operations
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() => manager.getStatus());

  useEffect(() => {
    // Initialize manager once (subsequent calls are no-ops)
    manager.initialize();

    // Subscribe to status changes
    const unsubscribe = manager.subscribe(setStatus);

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const forceSync = async () => {
    return manager.forceSync();
  };

  return {
    ...status,
    forceSync,
  };
}
