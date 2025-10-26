import { syncQueue } from './syncQueue';
import { indexedDB } from './indexedDB';
import { queryClientLogger } from '@/lib/logger';

// Background sync configuration
const BACKGROUND_SYNC_CONFIG = {
  syncInterval: 5 * 60 * 1000, // 5 minutes
  immediateSyncDelay: 1000, // 1 second after coming online
  batteryThreshold: 0.2, // 20% battery
  syncTag: 'field-inspection-sync',
  periodicSyncTag: 'field-inspection-periodic-sync',
};

// Background sync manager
class BackgroundSyncManager {
  private syncTimer: number | null = null;
  private isRegistered = false;
  private syncInProgress = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Check for service worker support
    if (!('serviceWorker' in navigator)) {
      queryClientLogger.warn('[BackgroundSync] Service Worker not supported');
      return;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Register background sync
    await this.registerBackgroundSync();

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

    // Start periodic sync if online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    queryClientLogger.info('[BackgroundSync] Initialized');
  }

  // Register background sync with service worker
  private async registerBackgroundSync(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Check for sync support
      if (!('sync' in registration)) {
        queryClientLogger.warn('[BackgroundSync] Background Sync API not supported');
        return false;
      }

      // Register one-time sync
      await (registration as any).sync.register(BACKGROUND_SYNC_CONFIG.syncTag);

      // Try to register periodic sync if supported
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });

        if (status.state === 'granted') {
          await (registration as any).periodicSync.register(
            BACKGROUND_SYNC_CONFIG.periodicSyncTag,
            {
              minInterval: BACKGROUND_SYNC_CONFIG.syncInterval,
            }
          );
          queryClientLogger.info('[BackgroundSync] Periodic sync registered');
        }
      }

      this.isRegistered = true;
      queryClientLogger.info('[BackgroundSync] Registered successfully');
      return true;
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Registration failed:', error);
      return false;
    }
  }

  // Handle online event
  private handleOnline = async () => {
    queryClientLogger.info('[BackgroundSync] Connection restored');

    // Wait a moment for connection to stabilize
    setTimeout(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        await this.triggerSync();
      }
    }, BACKGROUND_SYNC_CONFIG.immediateSyncDelay);

    // Restart periodic sync
    this.startPeriodicSync();
  };

  // Handle offline event
  private handleOffline = () => {
    queryClientLogger.info('[BackgroundSync] Connection lost');
    this.stopPeriodicSync();
  };

  // Handle visibility change
  private handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      queryClientLogger.debug('[BackgroundSync] App became visible, checking sync');
      
      // Check if we need to sync
      const queueSize = (await syncQueue.getQueueItems()).length;
      const lastSync = syncQueue.getLastSyncTime();
      const timeSinceLastSync = lastSync ? Date.now() - lastSync.getTime() : Infinity;
      
      if (queueSize > 0 || timeSinceLastSync > BACKGROUND_SYNC_CONFIG.syncInterval) {
        await this.triggerSync();
      }
    }
  };

  // Handle service worker messages
  private handleServiceWorkerMessage = async (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'BACKGROUND_SYNC':
        if (data === 'triggered') {
          queryClientLogger.info('[BackgroundSync] Sync triggered by service worker');
          await this.performSync();
        }
        break;

      case 'SW_ACTIVATED':
        // Re-register sync after service worker update
        await this.registerBackgroundSync();
        break;
    }
  };

  // Trigger immediate sync
  async triggerSync(): Promise<void> {
    if (this.syncInProgress) {
      queryClientLogger.debug('[BackgroundSync] Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      queryClientLogger.warn('[BackgroundSync] Cannot sync while offline');
      return;
    }

    // Check battery level if available
    if (await this.shouldDelayForBattery()) {
      queryClientLogger.info('[BackgroundSync] Delaying sync due to low battery');
      return;
    }

    queryClientLogger.info('[BackgroundSync] Triggering sync');

    try {
      // Try to use Background Sync API
      if (this.isRegistered) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register(BACKGROUND_SYNC_CONFIG.syncTag);
          return;
        }
      }

      // Fallback to direct sync
      await this.performSync();
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Failed to trigger sync:', error);
    }
  }

  // Perform actual sync
  private async performSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    queryClientLogger.info('[BackgroundSync] Starting sync');

    try {
      // Sync queued requests
      await syncQueue.syncNow();

      // Sync offline data
      await this.syncOfflineData();

      // Update cache
      await this.updateCachedData();

      queryClientLogger.info('[BackgroundSync] Sync completed');
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync offline data from IndexedDB
  private async syncOfflineData(): Promise<void> {
    try {
      // Sync unsynced jobs
      const unsyncedJobs = await indexedDB.getUnsyncedJobs();
      for (const job of unsyncedJobs) {
        if (job._offline?.localOnly) {
          await this.syncLocalJob(job);
        }
      }

      // Sync unsynced photos
      const allPhotos = await Promise.all(
        unsyncedJobs.map(job => indexedDB.getPhotosByJob(job.id))
      );
      
      const unsyncedPhotos = allPhotos.flat().filter(
        photo => photo._offline?.syncStatus === 'pending'
      );
      
      for (const photo of unsyncedPhotos) {
        await this.syncLocalPhoto(photo);
      }

      queryClientLogger.info('[BackgroundSync] Offline data synced');
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Failed to sync offline data:', error);
    }
  }

  // Sync local job to server
  private async syncLocalJob(job: any): Promise<void> {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(job),
      });

      if (response.ok) {
        const serverJob = await response.json();
        await indexedDB.saveJob(serverJob, false); // Mark as synced
        queryClientLogger.info('[BackgroundSync] Job synced:', serverJob.id);
      }
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Failed to sync job:', error);
    }
  }

  // Sync local photo to server
  private async syncLocalPhoto(photo: any): Promise<void> {
    try {
      // Create FormData for photo upload
      const formData = new FormData();
      
      if (photo.base64Data) {
        // Convert base64 to blob
        const base64Response = await fetch(photo.base64Data);
        const blob = await base64Response.blob();
        formData.append('file', blob, photo.fileName);
      }
      
      formData.append('jobId', photo.jobId || '');
      formData.append('metadata', JSON.stringify({
        capturedAt: photo.capturedAt,
        tags: photo.tags || [],
      }));

      const response = await fetch('/api/photos', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const serverPhoto = await response.json();
        await indexedDB.savePhoto({
          ...serverPhoto,
          _offline: { syncStatus: 'synced' }
        });
        queryClientLogger.info('[BackgroundSync] Photo synced:', serverPhoto.id);
      }
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Failed to sync photo:', error);
    }
  }

  // Update cached data from server
  private async updateCachedData(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    try {
      // Update critical data
      const endpoints = [
        '/api/jobs',
        '/api/builders',
        '/api/report-templates',
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update IndexedDB
            switch (endpoint) {
              case '/api/jobs':
                for (const job of data) {
                  await indexedDB.saveJob(job, false);
                }
                break;
              case '/api/builders':
                await indexedDB.bulkSaveBuilders(data);
                break;
              case '/api/report-templates':
                for (const template of data) {
                  await indexedDB.saveReportTemplate(template);
                }
                break;
            }

            queryClientLogger.debug(`[BackgroundSync] Updated cache for ${endpoint}`);
          }
        } catch (error) {
          queryClientLogger.warn(`[BackgroundSync] Failed to update ${endpoint}:`, error);
        }
      }
    } catch (error) {
      queryClientLogger.error('[BackgroundSync] Failed to update cached data:', error);
    }
  }

  // Check battery status
  private async shouldDelayForBattery(): Promise<boolean> {
    if (!('getBattery' in navigator)) {
      return false;
    }

    try {
      const battery = await (navigator as any).getBattery();
      
      // Delay if battery is low and not charging
      if (battery.level < BACKGROUND_SYNC_CONFIG.batteryThreshold && !battery.charging) {
        return true;
      }
    } catch (error) {
      queryClientLogger.debug('[BackgroundSync] Could not check battery status');
    }

    return false;
  }

  // Start periodic sync
  private startPeriodicSync() {
    this.stopPeriodicSync();

    this.syncTimer = window.setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        const shouldDelay = await this.shouldDelayForBattery();
        if (!shouldDelay) {
          await this.triggerSync();
        }
      }
    }, BACKGROUND_SYNC_CONFIG.syncInterval);

    queryClientLogger.info('[BackgroundSync] Periodic sync started');
  }

  // Stop periodic sync
  private stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      queryClientLogger.info('[BackgroundSync] Periodic sync stopped');
    }
  }

  // Cleanup
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
    }

    this.stopPeriodicSync();
    queryClientLogger.info('[BackgroundSync] Destroyed');
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncManager();

// Export helper functions
export async function triggerBackgroundSync(): Promise<void> {
  return backgroundSync.triggerSync();
}

export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
}

export function isPeriodicSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
}