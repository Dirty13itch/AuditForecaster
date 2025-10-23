import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { syncQueueLogger } from './logger';

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  timestamp: number;
  retries: number;
  headers?: Record<string, string>;
}

interface SyncQueueDB extends DBSchema {
  'sync-queue': {
    key: string;
    value: QueuedRequest;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'field-inspection-sync';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

let dbPromise: Promise<IDBPDatabase<SyncQueueDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<SyncQueueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SyncQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function addToSyncQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queuedRequest: QueuedRequest = {
    ...request,
    id,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.add(STORE_NAME, queuedRequest);
  syncQueueLogger.debug('Added request to queue:', id);
  return id;
}

export async function getSyncQueue(): Promise<QueuedRequest[]> {
  const db = await getDB();
  const requests = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
  return requests;
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
  syncQueueLogger.debug('Removed request from queue:', id);
}

export async function updateRetryCount(id: string, retries: number): Promise<void> {
  const db = await getDB();
  const request = await db.get(STORE_NAME, id);
  if (request) {
    request.retries = retries;
    await db.put(STORE_NAME, request);
  }
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
  syncQueueLogger.info('Cleared all queued requests');
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  const count = await db.count(STORE_NAME);
  return count;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processSyncQueue(
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  syncQueueLogger.info('Processing sync queue...');
  
  if (!navigator.onLine) {
    syncQueueLogger.info('Offline, skipping sync');
    return { success: 0, failed: 0 };
  }

  const queue = await getSyncQueue();
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const request = queue[i];
    
    if (onProgress) {
      onProgress(i + 1, queue.length);
    }

    if (request.retries >= MAX_RETRIES) {
      syncQueueLogger.warn('Max retries reached for request:', request.id);
      await removeFromSyncQueue(request.id);
      failedCount++;
      continue;
    }

    try {
      syncQueueLogger.debug('Syncing request:', request.id, request.method, request.url);
      
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: request.data ? JSON.stringify(request.data) : undefined,
        credentials: 'include',
      });

      if (response.ok) {
        await removeFromSyncQueue(request.id);
        successCount++;
        syncQueueLogger.info('Successfully synced request:', request.id);
      } else {
        await updateRetryCount(request.id, request.retries + 1);
        failedCount++;
        syncQueueLogger.error('Failed to sync request:', request.id, response.status);
      }
    } catch (error) {
      syncQueueLogger.error('Error syncing request:', request.id, error);
      await updateRetryCount(request.id, request.retries + 1);
      failedCount++;
      
      await delay(RETRY_DELAY * Math.pow(2, request.retries));
    }
  }

  syncQueueLogger.info(`Sync complete: ${successCount} success, ${failedCount} failed`);
  return { success: successCount, failed: failedCount };
}
