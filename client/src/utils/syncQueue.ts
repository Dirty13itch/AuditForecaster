import { indexedDB, SyncQueueItem, SyncPriority, ConflictItem, ConflictResolution } from './indexedDB';
import { queryClientLogger } from '@/lib/logger';

// Sync queue configuration
const SYNC_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  batchSize: 10,
  syncInterval: 5 * 60 * 1000, // 5 minutes
};

// Sync state
interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  queueSize: number;
  failedCount: number;
  syncProgress: number;
  syncError: string | null;
}

// Event types
type SyncEvent = 
  | { type: 'sync-started' }
  | { type: 'sync-progress'; progress: number; message: string }
  | { type: 'sync-completed'; synced: number; failed: number }
  | { type: 'sync-error'; error: string }
  | { type: 'conflict-detected'; conflict: ConflictItem }
  | { type: 'queue-updated'; size: number }
  | { type: 'online-status-changed'; isOnline: boolean };

// Sync queue manager class
class SyncQueueManager {
  private state: SyncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    queueSize: 0,
    failedCount: 0,
    syncProgress: 0,
    syncError: null,
  };

  private listeners = new Set<(event: SyncEvent) => void>();
  private syncTimer: number | null = null;
  private retryDelays = new Map<string, number>();

  constructor() {
    this.init();
  }

  private init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
    }

    // Start periodic sync if online
    if (this.state.isOnline) {
      this.startPeriodicSync();
    }

    // Load queue size on init
    this.updateQueueSize();
  }

  // Event handling
  private handleOnline = () => {
    queryClientLogger.info('[SyncQueue] Connection restored');
    this.state.isOnline = true;
    this.emit({ type: 'online-status-changed', isOnline: true });
    
    // Start immediate sync
    this.syncNow();
    
    // Start periodic sync
    this.startPeriodicSync();
  };

  private handleOffline = () => {
    queryClientLogger.info('[SyncQueue] Connection lost');
    this.state.isOnline = false;
    this.emit({ type: 'online-status-changed', isOnline: false });
    
    // Stop periodic sync
    this.stopPeriodicSync();
  };

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, request } = event.data;
    
    if (type === 'QUEUE_REQUEST') {
      // Add request to queue from service worker
      this.queueRequest(request);
    } else if (type === 'PROCESS_SYNC_QUEUE') {
      // Process sync queue request from service worker
      this.syncNow().then(() => {
        // Respond to service worker
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'SYNC_COMPLETE' });
        }
      });
    }
  };

  // Queue management
  async queueRequest(request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }): Promise<void> {
    const { url, method, headers, body } = request;
    
    // Parse the URL to determine entity type
    const entityInfo = this.parseEntityFromUrl(url);
    
    if (!entityInfo) {
      queryClientLogger.warn('[SyncQueue] Could not determine entity type from URL:', url);
      return;
    }
    
    const { entityType, entityId, operation } = entityInfo;
    
    // Create sync queue item
    const item: Omit<SyncQueueItem, 'id'> = {
      entityType,
      entityId,
      operation,
      priority: this.determinePriority(entityType, operation),
      data: body,
      timestamp: new Date(),
      retryCount: 0,
      endpoint: url,
      method,
      headers,
    };
    
    // Add to queue
    await indexedDB.addToSyncQueue(item);
    
    // Update queue size
    await this.updateQueueSize();
    
    queryClientLogger.info('[SyncQueue] Request queued:', { entityType, operation });
  }

  private parseEntityFromUrl(url: string): { 
    entityType: 'job' | 'photo' | 'report' | 'builder';
    entityId: string;
    operation: 'create' | 'update' | 'delete';
  } | null {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const method = urlObj.searchParams.get('_method') || 'POST';
    
    // Parse entity type from path
    if (path.includes('/api/jobs')) {
      const match = path.match(/\/api\/jobs\/?([\w-]*)/);
      return {
        entityType: 'job',
        entityId: match?.[1] || 'new',
        operation: method === 'DELETE' ? 'delete' : (match?.[1] ? 'update' : 'create')
      };
    } else if (path.includes('/api/photos')) {
      const match = path.match(/\/api\/photos\/?([\w-]*)/);
      return {
        entityType: 'photo',
        entityId: match?.[1] || 'new',
        operation: method === 'DELETE' ? 'delete' : (match?.[1] ? 'update' : 'create')
      };
    } else if (path.includes('/api/report')) {
      const match = path.match(/\/api\/report-instances\/?([\w-]*)/);
      return {
        entityType: 'report',
        entityId: match?.[1] || 'new',
        operation: method === 'DELETE' ? 'delete' : (match?.[1] ? 'update' : 'create')
      };
    } else if (path.includes('/api/builders')) {
      const match = path.match(/\/api\/builders\/?([\w-]*)/);
      return {
        entityType: 'builder',
        entityId: match?.[1] || 'new',
        operation: method === 'DELETE' ? 'delete' : (match?.[1] ? 'update' : 'create')
      };
    }
    
    return null;
  }

  private determinePriority(
    entityType: string,
    operation: string
  ): SyncPriority {
    // Critical: Jobs and reports creation/updates
    if ((entityType === 'job' || entityType === 'report') && operation !== 'delete') {
      return 'critical';
    }
    
    // Low: Deletions
    if (operation === 'delete') {
      return 'low';
    }
    
    // Normal: Everything else
    return 'normal';
  }

  // Sync operations
  async syncNow(): Promise<void> {
    if (!this.state.isOnline) {
      queryClientLogger.warn('[SyncQueue] Cannot sync while offline');
      return;
    }
    
    if (this.state.isSyncing) {
      queryClientLogger.info('[SyncQueue] Sync already in progress');
      return;
    }
    
    this.state.isSyncing = true;
    this.state.syncProgress = 0;
    this.state.syncError = null;
    this.emit({ type: 'sync-started' });
    
    try {
      const results = await this.processSyncQueue();
      
      this.state.lastSyncAt = new Date();
      this.state.failedCount = results.failed;
      
      this.emit({ 
        type: 'sync-completed', 
        synced: results.synced, 
        failed: results.failed 
      });
      
      queryClientLogger.info('[SyncQueue] Sync completed:', results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.syncError = errorMessage;
      
      this.emit({ type: 'sync-error', error: errorMessage });
      
      queryClientLogger.error('[SyncQueue] Sync failed:', error);
    } finally {
      this.state.isSyncing = false;
      this.state.syncProgress = 0;
      await this.updateQueueSize();
    }
  }

  private async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    // Get queue items by priority
    const criticalItems = await indexedDB.getSyncQueue('critical');
    const normalItems = await indexedDB.getSyncQueue('normal');
    const lowItems = await indexedDB.getSyncQueue('low');
    
    const allItems = [...criticalItems, ...normalItems, ...lowItems];
    const totalItems = allItems.length;
    
    if (totalItems === 0) {
      return { synced: 0, failed: 0 };
    }
    
    let synced = 0;
    let failed = 0;
    
    // Process in batches
    for (let i = 0; i < allItems.length; i += SYNC_CONFIG.batchSize) {
      const batch = allItems.slice(i, i + SYNC_CONFIG.batchSize);
      
      const results = await Promise.allSettled(
        batch.map(item => this.processSyncItem(item))
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          synced++;
        } else {
          failed++;
          queryClientLogger.warn('[SyncQueue] Failed to sync item:', batch[index].id);
        }
      });
      
      // Update progress
      const progress = Math.round(((i + batch.length) / totalItems) * 100);
      this.state.syncProgress = progress;
      
      this.emit({ 
        type: 'sync-progress', 
        progress, 
        message: `Syncing ${i + batch.length} of ${totalItems} items...` 
      });
    }
    
    return { synced, failed };
  }

  private async processSyncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      // Check for retry limit
      if (item.retryCount >= SYNC_CONFIG.maxRetries) {
        queryClientLogger.error('[SyncQueue] Max retries exceeded for item:', item.id);
        
        // Move to conflicts if it's an update operation
        if (item.operation === 'update') {
          await this.createConflict(item);
        }
        
        // Remove from queue
        await indexedDB.removeSyncQueueItem(item.id);
        return false;
      }
      
      // Calculate retry delay with exponential backoff
      const delay = this.calculateRetryDelay(item.id, item.retryCount);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Attempt to sync
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: item.data ? JSON.stringify(item.data) : undefined,
        credentials: 'include',
      });
      
      if (response.ok) {
        // Success - remove from queue
        await indexedDB.removeSyncQueueItem(item.id);
        this.retryDelays.delete(item.id);
        
        // Update local data with server response
        const responseData = await response.json();
        await this.updateLocalData(item, responseData);
        
        return true;
      } else if (response.status === 409) {
        // Conflict detected
        queryClientLogger.warn('[SyncQueue] Conflict detected for item:', item.id);
        
        const remoteData = await response.json();
        await this.createConflict(item, remoteData);
        
        // Remove from queue (will be handled through conflict resolution)
        await indexedDB.removeSyncQueueItem(item.id);
        return false;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        queryClientLogger.error('[SyncQueue] Client error for item:', item.id, response.status);
        
        // Remove from queue
        await indexedDB.removeSyncQueueItem(item.id);
        return false;
      } else {
        // Server error - retry
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      // Network or other error - retry
      queryClientLogger.warn('[SyncQueue] Failed to sync item, will retry:', item.id, error);
      
      // Update retry count
      item.retryCount++;
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      await indexedDB.updateSyncQueueItem(item);
      
      return false;
    }
  }

  private calculateRetryDelay(itemId: string, retryCount: number): number {
    if (retryCount === 0) return 0;
    
    const baseDelay = SYNC_CONFIG.baseDelay;
    const delay = Math.min(
      baseDelay * Math.pow(2, retryCount - 1),
      SYNC_CONFIG.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);
    
    this.retryDelays.set(itemId, finalDelay);
    return finalDelay;
  }

  private async createConflict(item: SyncQueueItem, remoteData?: any): Promise<void> {
    const conflict: Omit<ConflictItem, 'id'> = {
      entityType: item.entityType as 'job' | 'photo' | 'report',
      entityId: item.entityId,
      localData: item.data,
      remoteData: remoteData || null,
      detectedAt: new Date(),
    };
    
    await indexedDB.addConflict(conflict);
    
    this.emit({ 
      type: 'conflict-detected', 
      conflict: { ...conflict, id: 'temp' } as ConflictItem 
    });
  }

  private async updateLocalData(item: SyncQueueItem, serverData: any): Promise<void> {
    // Update local IndexedDB with server response
    switch (item.entityType) {
      case 'job':
        await indexedDB.saveJob(serverData, false); // Mark as synced
        break;
      case 'photo':
        await indexedDB.savePhoto({ ...serverData, _offline: { syncStatus: 'synced' } });
        break;
      case 'report':
        await indexedDB.saveReport(serverData);
        break;
      case 'builder':
        await indexedDB.saveBuilder(serverData);
        break;
    }
  }

  // Conflict resolution
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    mergedData?: any
  ): Promise<void> {
    const conflict = (await indexedDB.getConflicts()).find(c => c.id === conflictId);
    
    if (!conflict) {
      throw new Error('Conflict not found');
    }
    
    let dataToSave: any;
    
    switch (resolution) {
      case 'local':
        dataToSave = conflict.localData;
        break;
      case 'remote':
        dataToSave = conflict.remoteData;
        break;
      case 'merge':
        dataToSave = mergedData || this.autoMerge(conflict.localData, conflict.remoteData);
        break;
      case 'both':
        // Create a new version with local data
        await this.createNewVersion(conflict.entityType, conflict.localData);
        dataToSave = conflict.remoteData;
        break;
    }
    
    // Save resolved data
    await this.saveResolvedData(conflict.entityType, conflict.entityId, dataToSave);
    
    // Mark conflict as resolved
    await indexedDB.resolveConflict(conflictId, resolution, dataToSave);
    
    // Remove from conflicts
    await indexedDB.removeConflict(conflictId);
    
    queryClientLogger.info('[SyncQueue] Conflict resolved:', conflictId, resolution);
  }

  private autoMerge(localData: any, remoteData: any): any {
    // Simple last-write-wins merge strategy
    // In a real implementation, this would be more sophisticated
    const merged = { ...remoteData };
    
    // Preserve local changes that don't conflict
    Object.keys(localData).forEach(key => {
      if (localData[key] !== remoteData[key] && !remoteData[key]) {
        merged[key] = localData[key];
      }
    });
    
    return merged;
  }

  private async createNewVersion(entityType: string, data: any): Promise<void> {
    // Create a new entity with local data
    const newData = {
      ...data,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${data.name || 'Unnamed'} (Local Copy)`,
    };
    
    switch (entityType) {
      case 'job':
        await indexedDB.saveJob(newData);
        break;
      case 'photo':
        await indexedDB.savePhoto(newData);
        break;
      case 'report':
        await indexedDB.saveReport(newData);
        break;
    }
  }

  private async saveResolvedData(entityType: string, entityId: string, data: any): Promise<void> {
    switch (entityType) {
      case 'job':
        await indexedDB.saveJob({ ...data, id: entityId });
        break;
      case 'photo':
        await indexedDB.savePhoto({ ...data, id: entityId });
        break;
      case 'report':
        await indexedDB.saveReport({ ...data, id: entityId });
        break;
    }
  }

  // Periodic sync
  private startPeriodicSync() {
    this.stopPeriodicSync();
    
    this.syncTimer = window.setInterval(() => {
      if (this.state.isOnline && !this.state.isSyncing) {
        this.syncNow();
      }
    }, SYNC_CONFIG.syncInterval);
    
    queryClientLogger.info('[SyncQueue] Periodic sync started');
  }

  private stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      queryClientLogger.info('[SyncQueue] Periodic sync stopped');
    }
  }

  // Event emitter
  private emit(event: SyncEvent) {
    this.listeners.forEach(listener => listener(event));
  }

  subscribe(listener: (event: SyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // State management
  getState(): Readonly<SyncState> {
    return { ...this.state };
  }

  private async updateQueueSize() {
    const items = await indexedDB.getSyncQueue();
    this.state.queueSize = items.length;
    this.emit({ type: 'queue-updated', size: items.length });
  }

  // Public API
  async clearQueue(): Promise<void> {
    await indexedDB.clearSyncQueue();
    await this.updateQueueSize();
    queryClientLogger.info('[SyncQueue] Queue cleared');
  }

  async getQueueItems(): Promise<SyncQueueItem[]> {
    return indexedDB.getSyncQueue();
  }

  async getConflicts(): Promise<ConflictItem[]> {
    return indexedDB.getConflicts();
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  isSyncing(): boolean {
    return this.state.isSyncing;
  }

  getLastSyncTime(): Date | null {
    return this.state.lastSyncAt;
  }

  // Cleanup
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
    }
    
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncQueue = new SyncQueueManager();

// Export helper functions
export function queueApiCall(url: string, method: string, data?: any, headers?: Record<string, string>): Promise<void> {
  return syncQueue.queueRequest({ url, method, body: data, headers });
}

export function subscribeToSyncEvents(listener: (event: SyncEvent) => void): () => void {
  return syncQueue.subscribe(listener);
}

export async function forceSyncNow(): Promise<void> {
  return syncQueue.syncNow();
}

export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution,
  mergedData?: any
): Promise<void> {
  return syncQueue.resolveConflict(conflictId, resolution, mergedData);
}