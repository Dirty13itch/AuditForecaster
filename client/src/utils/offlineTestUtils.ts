/**
 * Offline Testing Utilities
 * Tools for testing offline functionality in development
 */

import { indexedDB } from "./indexedDB";
import { syncQueue } from "./syncQueue";
import { cacheManager } from "./cacheManager";

class OfflineTestUtils {
  private originalOnLine?: boolean;
  private networkThrottle?: number;
  
  /**
   * Toggle offline mode for testing
   */
  async toggleOfflineMode(isOffline: boolean): Promise<void> {
    if (isOffline) {
      // Save original state
      this.originalOnLine = navigator.onLine;
      
      // Override navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Dispatch offline event
      window.dispatchEvent(new Event('offline'));
      
      console.log('🔌 Offline mode enabled for testing');
    } else {
      // Restore original state
      if (this.originalOnLine !== undefined) {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: this.originalOnLine
        });
      }
      
      // Dispatch online event
      window.dispatchEvent(new Event('online'));
      
      console.log('🌐 Online mode restored');
    }
  }
  
  /**
   * Simulate slow network conditions
   */
  async simulateSlowNetwork(delayMs: number = 3000): Promise<void> {
    this.networkThrottle = delayMs;
    
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, this.networkThrottle));
      return originalFetch(...args);
    };
    
    console.log(`🐢 Network throttled to ${delayMs}ms delay`);
  }
  
  /**
   * Restore normal network speed
   */
  async restoreNetworkSpeed(): Promise<void> {
    this.networkThrottle = undefined;
    // Restore will happen on next page reload
    console.log('⚡ Network speed restored (reload page to take effect)');
  }
  
  /**
   * Force a sync error for testing
   */
  async forceSyncError(): Promise<void> {
    // Add a malformed request to the queue
    await syncQueue.queueRequest({
      url: '/api/test-error',
      method: 'POST',
      body: { error: 'forced' },
      headers: { 'X-Force-Error': 'true' },
      priority: 'critical' as any,
      timestamp: Date.now(),
      retries: 0,
    });
    
    console.log('❌ Forced sync error added to queue');
  }
  
  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    // Clear IndexedDB
    await indexedDB.clearAll();
    
    // Clear sync queue
    const queue = await syncQueue.getQueue();
    for (const item of queue) {
      await syncQueue.removeFromQueue(item.id);
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
    
    console.log('🗑️ All offline data cleared');
  }
  
  /**
   * Export offline data for debugging
   */
  async exportOfflineData(): Promise<any> {
    const data = {
      timestamp: new Date().toISOString(),
      indexedDB: {
        jobs: await indexedDB.getAllJobs(),
        photos: await indexedDB.getAllPhotos(),
        reports: await indexedDB.getAllReportInstances(),
        conflicts: await indexedDB.getConflicts(),
        settings: await indexedDB.getSetting('app-settings'),
      },
      syncQueue: await syncQueue.getQueue(),
      cacheStatistics: await cacheManager.getStatistics(),
    };
    
    // Create downloadable blob
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📤 Offline data exported', data);
    return data;
  }
  
  /**
   * Import offline data for testing
   */
  async importOfflineData(data: any): Promise<void> {
    // Clear existing data first
    await this.clearAllOfflineData();
    
    // Import jobs
    if (data.indexedDB?.jobs) {
      for (const job of data.indexedDB.jobs) {
        await indexedDB.saveJob(job);
      }
    }
    
    // Import photos
    if (data.indexedDB?.photos) {
      for (const photo of data.indexedDB.photos) {
        await indexedDB.savePhoto(photo);
      }
    }
    
    // Import reports
    if (data.indexedDB?.reports) {
      for (const report of data.indexedDB.reports) {
        await indexedDB.saveReportInstance(report);
      }
    }
    
    // Import settings
    if (data.indexedDB?.settings) {
      await indexedDB.saveSetting('app-settings', data.indexedDB.settings);
    }
    
    console.log('📥 Offline data imported');
  }
  
  /**
   * Generate test data for offline scenarios
   */
  async generateTestData(): Promise<void> {
    // Add test jobs
    const testJobs = [
      {
        id: 99991,
        address: '123 Test St (Offline)',
        builder_id: 1,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 99992,
        address: '456 Demo Ave (Offline)',
        builder_id: 2,
        status: 'done',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    
    for (const job of testJobs) {
      await indexedDB.saveJob(job);
    }
    
    // Add test sync queue items
    await syncQueue.queueRequest({
      url: '/api/jobs',
      method: 'POST',
      body: { address: '789 Queue St', builder_id: 3 },
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('🧪 Test data generated');
  }
  
  /**
   * Monitor sync progress
   */
  async monitorSyncProgress(): Promise<void> {
    const startTime = Date.now();
    let lastQueueSize = 0;
    
    const interval = setInterval(async () => {
      const queue = await syncQueue.getQueue();
      const queueSize = queue.length;
      
      if (queueSize !== lastQueueSize) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏱️ [${elapsed}s] Sync queue size: ${queueSize}`);
        lastQueueSize = queueSize;
      }
      
      if (queueSize === 0) {
        console.log('✅ Sync complete!');
        clearInterval(interval);
      }
    }, 1000);
    
    // Stop monitoring after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  }
  
  /**
   * Test conflict resolution
   */
  async createTestConflict(): Promise<void> {
    const conflictData = {
      entityType: 'job',
      entityId: '99999',
      localVersion: {
        address: '123 Local St',
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      },
      remoteVersion: {
        address: '123 Remote St',
        status: 'done',
        updated_at: new Date().toISOString(),
      },
      detectedAt: new Date().toISOString(),
      resolved: false,
    };
    
    await indexedDB.saveConflict(conflictData);
    console.log('⚔️ Test conflict created');
  }
}

// Export singleton instance
export const offlineTestUtils = new OfflineTestUtils();

// Expose to window in development mode
if (import.meta.env.DEV) {
  (window as any).offlineTestUtils = offlineTestUtils;
  console.log('🔧 Offline test utilities available at window.offlineTestUtils');
}