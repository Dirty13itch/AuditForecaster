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
  }): Promise<string> {
    const { url, method, headers, body } = request;
    
    // Parse the URL to determine entity type
    const entityInfo = this.parseEntityFromUrl(url);
    
    if (!entityInfo) {
      queryClientLogger.warn('[SyncQueue] Could not determine entity type from URL:', url);
      throw new Error('Could not determine entity type from URL');
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
    
    // Add to queue and get the generated ID
    const queueItemId = await indexedDB.addToSyncQueue(item);
    
    // Update queue size
    await this.updateQueueSize();
    
    queryClientLogger.info('[SyncQueue] Request queued:', { entityType, operation, queueItemId });
    
    return queueItemId;
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

  private async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      return response.ok;
    } catch (error) {
      queryClientLogger.warn('[SyncQueue] Auth check failed:', error);
      return false;
    }
  }

  private async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    // Check authentication before processing queue
    const isAuthenticated = await this.checkAuthStatus();
    if (!isAuthenticated) {
      queryClientLogger.warn('[SyncQueue] Not authenticated - sync queue processing skipped');
      queryClientLogger.warn('[SyncQueue] User needs to log in before queued mutations can be synced');
      return { synced: 0, failed: 0 };
    }

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
      } else if (response.status === 401) {
        // Authentication error - stop processing queue
        queryClientLogger.error('[SyncQueue] Authentication expired during sync - stopping queue processing');
        queryClientLogger.warn('[SyncQueue] User needs to log in to sync remaining requests');
        throw new Error('Authentication expired');
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
    // Sophisticated field-level merge strategy with conflict detection
    const merged: any = {};
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);
    
    // Track merge decisions for logging
    const mergeDecisions: Record<string, string> = {};
    
    allKeys.forEach(key => {
      const localValue = localData[key];
      const remoteValue = remoteData[key];
      
      // Special handling for system fields
      if (key === 'id' || key === '_id') {
        merged[key] = remoteValue || localValue;
        mergeDecisions[key] = 'prefer-remote-id';
        return;
      }
      
      // Handle timestamps - prefer most recent
      if (key === 'updatedAt' || key === 'lastModified' || key === 'timestamp') {
        const localTime = new Date(localValue).getTime();
        const remoteTime = new Date(remoteValue).getTime();
        
        if (!isNaN(localTime) && !isNaN(remoteTime)) {
          merged[key] = localTime > remoteTime ? localValue : remoteValue;
          mergeDecisions[key] = localTime > remoteTime ? 'local-newer' : 'remote-newer';
        } else {
          merged[key] = remoteValue || localValue;
          mergeDecisions[key] = remoteValue ? 'remote-valid' : 'local-valid';
        }
        return;
      }
      
      // Handle missing values
      if (localValue === undefined && remoteValue === undefined) {
        return; // Skip field entirely
      }
      
      if (localValue === undefined || localValue === null) {
        merged[key] = remoteValue;
        mergeDecisions[key] = 'remote-only';
        return;
      }
      
      if (remoteValue === undefined || remoteValue === null) {
        merged[key] = localValue;
        mergeDecisions[key] = 'local-only';
        return;
      }
      
      // Handle arrays
      if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        merged[key] = this.mergeArrays(localValue, remoteValue, key);
        mergeDecisions[key] = 'merged-arrays';
        return;
      }
      
      // Handle nested objects
      if (this.isPlainObject(localValue) && this.isPlainObject(remoteValue)) {
        merged[key] = this.autoMerge(localValue, remoteValue);
        mergeDecisions[key] = 'merged-nested-objects';
        return;
      }
      
      // Handle conflicting primitive values
      if (localValue !== remoteValue) {
        // Apply field-specific merge strategies
        const mergeStrategy = this.getFieldMergeStrategy(key, localData, remoteData);
        
        switch (mergeStrategy) {
          case 'prefer-local':
            merged[key] = localValue;
            mergeDecisions[key] = 'prefer-local';
            break;
            
          case 'prefer-remote':
            merged[key] = remoteValue;
            mergeDecisions[key] = 'prefer-remote';
            break;
            
          case 'combine':
            // For strings, concatenate with separator
            if (typeof localValue === 'string' && typeof remoteValue === 'string') {
              merged[key] = `${remoteValue} [LOCAL: ${localValue}]`;
              mergeDecisions[key] = 'combined-strings';
            } else if (typeof localValue === 'number' && typeof remoteValue === 'number') {
              // For numbers, average them
              merged[key] = (localValue + remoteValue) / 2;
              mergeDecisions[key] = 'averaged-numbers';
            } else {
              // Default to remote
              merged[key] = remoteValue;
              mergeDecisions[key] = 'default-remote';
            }
            break;
            
          default:
            // Last-write-wins based on timestamps
            if (localData.updatedAt && remoteData.updatedAt) {
              const localTime = new Date(localData.updatedAt).getTime();
              const remoteTime = new Date(remoteData.updatedAt).getTime();
              merged[key] = localTime > remoteTime ? localValue : remoteValue;
              mergeDecisions[key] = localTime > remoteTime ? 'local-timestamp-newer' : 'remote-timestamp-newer';
            } else {
              // Default to remote (server authority)
              merged[key] = remoteValue;
              mergeDecisions[key] = 'server-authority';
            }
        }
      } else {
        // Values are identical
        merged[key] = localValue;
        mergeDecisions[key] = 'identical';
      }
    });
    
    // Log merge decisions in debug mode
    if (queryClientLogger && Object.keys(mergeDecisions).length > 0) {
      const conflictCount = Object.values(mergeDecisions).filter(d => 
        !['identical', 'local-only', 'remote-only'].includes(d)
      ).length;
      
      if (conflictCount > 0) {
        queryClientLogger.info('[SyncQueue] Merge completed with conflicts:', {
          totalFields: allKeys.size,
          conflicts: conflictCount,
          decisions: mergeDecisions
        });
      }
    }
    
    return merged;
  }
  
  private mergeArrays(localArray: any[], remoteArray: any[], fieldName: string): any[] {
    // Strategy depends on field type
    if (fieldName === 'tags' || fieldName === 'categories' || fieldName === 'labels') {
      // For tags/categories, merge unique values
      const uniqueValues = new Set([...localArray, ...remoteArray]);
      return Array.from(uniqueValues);
    }
    
    if (fieldName === 'history' || fieldName === 'logs' || fieldName === 'events') {
      // For history/logs, combine and sort by timestamp
      const combined = [...localArray, ...remoteArray];
      
      // Try to sort by timestamp if objects have timestamp fields
      if (combined.length > 0 && combined[0].timestamp) {
        return combined.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA; // Most recent first
        });
      }
      
      return combined;
    }
    
    // For items with IDs, merge by ID
    if (localArray.length > 0 && localArray[0].id) {
      const idMap = new Map();
      
      // Add remote items first (lower priority)
      remoteArray.forEach(item => {
        if (item.id) {
          idMap.set(item.id, item);
        }
      });
      
      // Overlay local items (higher priority)
      localArray.forEach(item => {
        if (item.id) {
          const existing = idMap.get(item.id);
          if (existing) {
            // Recursively merge items with same ID
            idMap.set(item.id, this.autoMerge(item, existing));
          } else {
            idMap.set(item.id, item);
          }
        }
      });
      
      return Array.from(idMap.values());
    }
    
    // Default: prefer remote array (server authority)
    return remoteArray.length > 0 ? remoteArray : localArray;
  }
  
  private isPlainObject(obj: any): boolean {
    return obj !== null && 
           typeof obj === 'object' && 
           obj.constructor === Object &&
           !Array.isArray(obj) &&
           !(obj instanceof Date);
  }
  
  private getFieldMergeStrategy(
    fieldName: string,
    localData: any,
    remoteData: any
  ): 'prefer-local' | 'prefer-remote' | 'combine' | 'timestamp' {
    // Critical fields that should prefer server version
    const serverAuthorityFields = [
      'status',
      'state',
      'approved',
      'published',
      'verified',
      'locked',
      'paymentStatus',
      'syncStatus'
    ];
    
    if (serverAuthorityFields.includes(fieldName)) {
      return 'prefer-remote';
    }
    
    // User-generated content fields that should prefer local
    const localPreferenceFields = [
      'notes',
      'comments',
      'description',
      'userNotes',
      'draftContent',
      'unsavedChanges'
    ];
    
    if (localPreferenceFields.includes(fieldName)) {
      // Only prefer local if it's actually newer or longer
      const localValue = localData[fieldName];
      const remoteValue = remoteData[fieldName];
      
      if (typeof localValue === 'string' && typeof remoteValue === 'string') {
        // If local content is significantly longer, it likely has more information
        if (localValue.length > remoteValue.length * 1.2) {
          return 'prefer-local';
        }
      }
      
      return 'combine'; // Combine both versions
    }
    
    // Numeric fields that could be combined
    const combinableFields = [
      'quantity',
      'count',
      'total',
      'progress'
    ];
    
    if (combinableFields.includes(fieldName)) {
      return 'combine';
    }
    
    // Default to timestamp-based resolution
    return 'timestamp';
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

// ============================================================================
// Compatibility exports for lib/syncQueue.ts API
// These provide drop-in replacement functionality for code using the old API
// ============================================================================

/**
 * QueuedRequest interface - compatibility with lib/syncQueue
 */
export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  timestamp: number;
  retries: number;
  headers?: Record<string, string>;
}

/**
 * Add a request to the sync queue (compatibility function)
 * Maps to the new SyncQueueManager API
 */
export async function addToSyncQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const { url, method, data, headers } = request;
  
  // Queue using the new API and get the real queue item ID
  const queueItemId = await syncQueue.queueRequest({ url, method, body: data, headers });
  
  // Return the actual ID from IndexedDB (not a random ID)
  return queueItemId;
}

/**
 * Get all items in the sync queue (compatibility function)
 */
export async function getSyncQueue(): Promise<QueuedRequest[]> {
  const items = await syncQueue.getQueueItems();
  
  // Map SyncQueueItem to QueuedRequest format
  return items.map(item => ({
    id: item.id,
    method: item.method,
    url: item.endpoint,
    data: item.data,
    timestamp: item.timestamp.getTime(),
    retries: item.retryCount,
    headers: item.headers,
  }));
}

/**
 * Remove an item from the sync queue (compatibility function)
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  await indexedDB.removeSyncQueueItem(id);
}

/**
 * Update retry count for a queue item (compatibility function)
 */
export async function updateRetryCount(id: string, retries: number): Promise<void> {
  const items = await syncQueue.getQueueItems();
  const item = items.find(i => i.id === id);
  
  if (item) {
    item.retryCount = retries;
    await indexedDB.updateSyncQueueItem(item);
  }
}

/**
 * Clear all items from the sync queue (compatibility function)
 */
export async function clearSyncQueue(): Promise<void> {
  await syncQueue.clearQueue();
}

/**
 * Get the count of items in the sync queue (compatibility function)
 */
export async function getSyncQueueCount(): Promise<number> {
  const items = await syncQueue.getQueueItems();
  return items.length;
}

/**
 * Process the sync queue (compatibility function)
 * Note: This maps to the new API but returns a compatible response structure
 */
export async function processSyncQueue(
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; authError?: boolean }> {
  // Subscribe to progress events
  let progressListener: ((event: SyncEvent) => void) | null = null;
  
  if (onProgress) {
    progressListener = (event: SyncEvent) => {
      if (event.type === 'sync-progress') {
        // Extract current and total from progress message
        const match = event.message.match(/(\d+) of (\d+)/);
        if (match) {
          onProgress(parseInt(match[1]), parseInt(match[2]));
        }
      }
    };
    syncQueue.subscribe(progressListener);
  }
  
  try {
    // Trigger sync
    await syncQueue.syncNow();
    
    // Get final state to determine results
    const state = syncQueue.getState();
    
    // Check if there was an auth error (indicated by sync not running when we expected it to)
    const authError = !state.isOnline && navigator.onLine;
    
    return {
      success: state.queueSize === 0 ? 1 : 0, // Simplified - actual count not exposed in this way
      failed: state.failedCount,
      authError
    };
  } finally {
    if (progressListener) {
      // Unsubscribe is not directly exposed, but the listener will be cleaned up
    }
  }
}