import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Job, Photo, ReportInstance, ReportTemplate, Builder } from '@shared/schema';

// Database version
const DB_VERSION = 1;
const DB_NAME = 'FieldInspectionDB';

// Define sync operation types
export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncPriority = 'critical' | 'normal' | 'low';
export type ConflictResolution = 'local' | 'remote' | 'merge' | 'both';

// Sync queue item interface
export interface SyncQueueItem {
  id: string;
  entityType: 'job' | 'photo' | 'report' | 'builder';
  entityId: string;
  operation: SyncOperation;
  priority: SyncPriority;
  data: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
  headers?: Record<string, string>;
  endpoint: string;
  method: string;
}

// Conflict item interface
export interface ConflictItem {
  id: string;
  entityType: 'job' | 'photo' | 'report';
  entityId: string;
  localData: any;
  remoteData: any;
  baseData?: any; // For three-way merge
  detectedAt: Date;
  resolution?: ConflictResolution;
  resolvedAt?: Date;
  resolvedBy?: string;
  mergedData?: any;
}

// Offline metadata interface
export interface OfflineMetadata {
  version: number;
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'error';
  isDirty: boolean;
  localOnly: boolean;
}

// Extended interfaces with offline metadata
export interface OfflineJob extends Job {
  _offline?: OfflineMetadata;
}

export interface OfflinePhoto extends Partial<Photo> {
  id: string;
  jobId?: string;
  base64Data?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  capturedAt: Date;
  _offline?: OfflineMetadata;
}

export interface OfflineReport extends ReportInstance {
  _offline?: OfflineMetadata;
}

// Database schema
interface FieldInspectionDB extends DBSchema {
  jobs: {
    key: string;
    value: OfflineJob;
    indexes: {
      'by-sync-status': string;
      'by-date': Date;
      'by-builder': string;
    };
  };
  photos: {
    key: string;
    value: OfflinePhoto;
    indexes: {
      'by-job': string;
      'by-sync-status': string;
      'by-date': Date;
    };
  };
  reports: {
    key: string;
    value: OfflineReport;
    indexes: {
      'by-job': string;
      'by-template': string;
      'by-sync-status': string;
    };
  };
  reportTemplates: {
    key: string;
    value: ReportTemplate;
  };
  builders: {
    key: string;
    value: Builder & { _offline?: OfflineMetadata };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-priority': SyncPriority;
      'by-timestamp': Date;
      'by-entity': string;
    };
  };
  conflicts: {
    key: string;
    value: ConflictItem;
    indexes: {
      'by-entity': string;
      'by-type': string;
      'by-date': Date;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      timestamp: Date;
    };
  };
}

class IndexedDBManager {
  private db: IDBPDatabase<FieldInspectionDB> | null = null;
  private initPromise: Promise<IDBPDatabase<FieldInspectionDB>> | null = null;

  // Initialize database
  async init(): Promise<IDBPDatabase<FieldInspectionDB>> {
    if (this.db) return this.db;
    
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = openDB<FieldInspectionDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Jobs store
        if (!db.objectStoreNames.contains('jobs')) {
          const jobStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobStore.createIndex('by-sync-status', '_offline.syncStatus');
          jobStore.createIndex('by-date', 'scheduledDate');
          jobStore.createIndex('by-builder', 'builderId');
        }

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('by-job', 'jobId');
          photoStore.createIndex('by-sync-status', '_offline.syncStatus');
          photoStore.createIndex('by-date', 'capturedAt');
        }

        // Reports store
        if (!db.objectStoreNames.contains('reports')) {
          const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportStore.createIndex('by-job', 'jobId');
          reportStore.createIndex('by-template', 'templateId');
          reportStore.createIndex('by-sync-status', '_offline.syncStatus');
        }

        // Report templates store
        if (!db.objectStoreNames.contains('reportTemplates')) {
          db.createObjectStore('reportTemplates', { keyPath: 'id' });
        }

        // Builders store
        if (!db.objectStoreNames.contains('builders')) {
          db.createObjectStore('builders', { keyPath: 'id' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-priority', 'priority');
          syncStore.createIndex('by-timestamp', 'timestamp');
          syncStore.createIndex('by-entity', ['entityType', 'entityId']);
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('by-entity', ['entityType', 'entityId']);
          conflictStore.createIndex('by-type', 'entityType');
          conflictStore.createIndex('by-date', 'detectedAt');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
      blocked() {
        // Database upgrade blocked by open connections
      },
      blocking() {
        // Database upgrade blocking other connections
      },
      terminated() {
        // Database connection terminated unexpectedly
      }
    });
    
    this.db = await this.initPromise;
    return this.db;
  }

  // Get database instance
  async getDB(): Promise<IDBPDatabase<FieldInspectionDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Jobs operations
  async getJob(id: string): Promise<OfflineJob | undefined> {
    const db = await this.getDB();
    return db.get('jobs', id);
  }

  async getAllJobs(): Promise<OfflineJob[]> {
    const db = await this.getDB();
    return db.getAll('jobs');
  }

  async saveJob(job: Job, markDirty = true): Promise<void> {
    const db = await this.getDB();
    
    const offlineJob: OfflineJob = {
      ...job,
      _offline: {
        version: 1,
        lastModified: new Date(),
        syncStatus: markDirty ? 'pending' : 'synced',
        isDirty: markDirty,
        localOnly: !job.id || job.id.startsWith('local_')
      }
    };
    
    await db.put('jobs', offlineJob);
  }

  async deleteJob(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('jobs', id);
  }

  async getUnsyncedJobs(): Promise<OfflineJob[]> {
    const db = await this.getDB();
    const tx = db.transaction('jobs', 'readonly');
    const index = tx.objectStore('jobs').index('by-sync-status');
    return index.getAll('pending');
  }

  // Photos operations
  async getPhoto(id: string): Promise<OfflinePhoto | undefined> {
    const db = await this.getDB();
    return db.get('photos', id);
  }

  async getPhotosByJob(jobId: string): Promise<OfflinePhoto[]> {
    const db = await this.getDB();
    const tx = db.transaction('photos', 'readonly');
    const index = tx.objectStore('photos').index('by-job');
    return index.getAll(jobId);
  }

  async savePhoto(photo: OfflinePhoto): Promise<void> {
    const db = await this.getDB();
    
    const offlinePhoto: OfflinePhoto = {
      ...photo,
      _offline: {
        version: 1,
        lastModified: new Date(),
        syncStatus: 'pending',
        isDirty: true,
        localOnly: !photo.id || photo.id.startsWith('local_')
      }
    };
    
    await db.put('photos', offlinePhoto);
  }

  async deletePhoto(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('photos', id);
  }

  async bulkSavePhotos(photos: OfflinePhoto[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('photos', 'readwrite');
    
    await Promise.all(photos.map(photo => {
      const offlinePhoto: OfflinePhoto = {
        ...photo,
        _offline: {
          version: 1,
          lastModified: new Date(),
          syncStatus: 'pending',
          isDirty: true,
          localOnly: !photo.id || photo.id.startsWith('local_')
        }
      };
      return tx.objectStore('photos').put(offlinePhoto);
    }));
    
    await tx.done;
  }

  // Reports operations
  async getReport(id: string): Promise<OfflineReport | undefined> {
    const db = await this.getDB();
    return db.get('reports', id);
  }

  async getReportsByJob(jobId: string): Promise<OfflineReport[]> {
    const db = await this.getDB();
    const tx = db.transaction('reports', 'readonly');
    const index = tx.objectStore('reports').index('by-job');
    return index.getAll(jobId);
  }

  async saveReport(report: ReportInstance): Promise<void> {
    const db = await this.getDB();
    
    const offlineReport: OfflineReport = {
      ...report,
      _offline: {
        version: 1,
        lastModified: new Date(),
        syncStatus: 'pending',
        isDirty: true,
        localOnly: !report.id || report.id.startsWith('local_')
      }
    };
    
    await db.put('reports', offlineReport);
  }

  async deleteReport(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('reports', id);
  }

  // Report templates operations
  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const db = await this.getDB();
    return db.get('reportTemplates', id);
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    const db = await this.getDB();
    return db.getAll('reportTemplates');
  }

  async saveReportTemplate(template: ReportTemplate): Promise<void> {
    const db = await this.getDB();
    await db.put('reportTemplates', template);
  }

  // Builders operations
  async getAllBuilders(): Promise<Builder[]> {
    const db = await this.getDB();
    return db.getAll('builders');
  }

  async saveBuilder(builder: Builder): Promise<void> {
    const db = await this.getDB();
    await db.put('builders', {
      ...builder,
      _offline: {
        version: 1,
        lastModified: new Date(),
        syncStatus: 'synced',
        isDirty: false,
        localOnly: false
      }
    });
  }

  async bulkSaveBuilders(builders: Builder[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('builders', 'readwrite');
    
    await Promise.all(builders.map(builder => 
      tx.objectStore('builders').put({
        ...builder,
        _offline: {
          version: 1,
          lastModified: new Date(),
          syncStatus: 'synced',
          isDirty: false,
          localOnly: false
        }
      })
    ));
    
    await tx.done;
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<string> {
    const db = await this.getDB();
    
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    await db.put('syncQueue', queueItem);
    return queueItem.id;
  }

  async getSyncQueue(priority?: SyncPriority): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    
    if (priority) {
      const tx = db.transaction('syncQueue', 'readonly');
      const index = tx.objectStore('syncQueue').index('by-priority');
      return index.getAll(priority);
    }
    
    return db.getAll('syncQueue');
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('syncQueue', id);
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.getDB();
    await db.put('syncQueue', item);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    await tx.objectStore('syncQueue').clear();
    await tx.done;
  }

  // Conflict operations
  async addConflict(conflict: Omit<ConflictItem, 'id'>): Promise<void> {
    const db = await this.getDB();
    
    const conflictItem: ConflictItem = {
      ...conflict,
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    await db.put('conflicts', conflictItem);
  }

  async getConflicts(entityType?: string): Promise<ConflictItem[]> {
    const db = await this.getDB();
    
    if (entityType) {
      const tx = db.transaction('conflicts', 'readonly');
      const index = tx.objectStore('conflicts').index('by-type');
      return index.getAll(entityType);
    }
    
    return db.getAll('conflicts');
  }

  async resolveConflict(id: string, resolution: ConflictResolution, mergedData?: any): Promise<void> {
    const db = await this.getDB();
    const conflict = await db.get('conflicts', id);
    
    if (conflict) {
      conflict.resolution = resolution;
      conflict.resolvedAt = new Date();
      conflict.mergedData = mergedData;
      await db.put('conflicts', conflict);
    }
  }

  async removeConflict(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('conflicts', id);
  }

  // Metadata operations
  async getMetadata(key: string): Promise<any> {
    const db = await this.getDB();
    const entry = await db.get('metadata', key);
    return entry?.value;
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    await db.put('metadata', {
      key,
      value,
      timestamp: new Date()
    });
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    
    const tx = db.transaction(
      ['jobs', 'photos', 'reports', 'reportTemplates', 'builders', 'syncQueue', 'conflicts', 'metadata'],
      'readwrite'
    );
    
    await Promise.all([
      tx.objectStore('jobs').clear(),
      tx.objectStore('photos').clear(),
      tx.objectStore('reports').clear(),
      tx.objectStore('reportTemplates').clear(),
      tx.objectStore('builders').clear(),
      tx.objectStore('syncQueue').clear(),
      tx.objectStore('conflicts').clear(),
      tx.objectStore('metadata').clear(),
    ]);
    
    await tx.done;
  }

  // Storage statistics
  async getStorageStats(): Promise<{
    jobs: number;
    photos: number;
    reports: number;
    syncQueue: number;
    conflicts: number;
    estimatedSize?: number;
  }> {
    const db = await this.getDB();
    
    const [jobs, photos, reports, syncQueue, conflicts] = await Promise.all([
      db.count('jobs'),
      db.count('photos'),
      db.count('reports'),
      db.count('syncQueue'),
      db.count('conflicts')
    ]);
    
    let estimatedSize: number | undefined;
    
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      estimatedSize = estimate.usage;
    }
    
    return {
      jobs,
      photos,
      reports,
      syncQueue,
      conflicts,
      estimatedSize
    };
  }

  // Mileage trip methods (stored in metadata for now to avoid schema migration)
  async saveMileageTrip(trip: any): Promise<void> {
    const db = await this.init();
    await db.put('metadata', {
      key: `mileage_trip_${trip.id}`,
      value: trip,
      timestamp: new Date(),
    });
  }

  async getMileageTrips(): Promise<any[]> {
    const db = await this.init();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const allKeys = await store.getAllKeys();
    const tripKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('mileage_trip_'));
    
    const trips = [];
    for (const key of tripKeys) {
      const record = await store.get(key);
      if (record) {
        trips.push(record.value);
      }
    }
    
    return trips;
  }

  async saveMileagePoint(tripId: string, point: any): Promise<void> {
    const db = await this.init();
    const pointKey = `mileage_point_${tripId}_${point.timestamp.getTime()}`;
    await db.put('metadata', {
      key: pointKey,
      value: { tripId, ...point },
      timestamp: new Date(),
    });
  }

  async getMileagePoints(tripId: string): Promise<any[]> {
    const db = await this.init();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const allKeys = await store.getAllKeys();
    const pointKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith(`mileage_point_${tripId}_`)
    );
    
    const points = [];
    for (const key of pointKeys) {
      const record = await store.get(key);
      if (record) {
        points.push(record.value);
      }
    }
    
    return points.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async markMileageTripSynced(tripId: string): Promise<void> {
    const db = await this.init();
    const trip = await db.get('metadata', `mileage_trip_${tripId}`);
    if (trip) {
      trip.value.synced = true;
      await db.put('metadata', trip);
    }
  }

  async deleteMileageTrip(tripId: string): Promise<void> {
    const db = await this.init();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    const allKeys = await store.getAllKeys();
    
    for (const key of allKeys) {
      if (typeof key === 'string' && 
          (key === `mileage_trip_${tripId}` || key.startsWith(`mileage_point_${tripId}_`))) {
        await store.delete(key);
      }
    }
    
    await tx.done;
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBManager();

// Export helper functions
export async function initializeOfflineStorage(): Promise<void> {
  await indexedDB.init();
}

export async function clearOfflineStorage(): Promise<void> {
  await indexedDB.clearAllData();
}