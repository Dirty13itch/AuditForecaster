import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { EquipmentClientInput } from './schemas';

export interface ChecklistItem {
    id: string;
    label: string;
    status: 'PASS' | 'FAIL' | 'NA' | null;
    note: string;
}

export interface InspectionDraft {
    id: string;
    jobId: string;
    data: Record<string, unknown>;
    checklist: ChecklistItem[];
    updatedAt?: number;
    synced?: boolean;
}

export interface OfflinePhoto {
    id: string;
    inspectionId: string;
    file: Blob;
    caption: string;
    category: string;
    createdAt?: number;
    synced?: boolean;
}

export interface EquipmentDraft {
    id: string; // Temporary ID (e.g., uuid)
    data: EquipmentClientInput;
    createdAt: number;
    synced: boolean;
}

export interface MutationQueueItem {
    id: string; // UUID
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    resource: 'equipment' | 'inspector' | 'job' | 'vehicle' | 'inspection';
    payload: unknown;
    createdAt: number;
    retryCount: number;
    error?: string;
}

export interface FieldLog {
    id: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
    synced: boolean;
}

interface OfflineDB extends DBSchema {
    inspections: {
        key: string;
        value: InspectionDraft;
        indexes: { 'by-job': string };
    };
    photos: {
        key: string;
        value: OfflinePhoto;
        indexes: { 'by-inspection': string };
    };
    equipment: {
        key: string;
        value: EquipmentDraft;
    };
    mutation_queue: {
        key: string;
        value: MutationQueueItem;
        indexes: { 'by-created': number };
    };
    logs: {
        key: string;
        value: FieldLog;
        indexes: { 'by-timestamp': number };
    };
    failed_mutations: {
        key: string;
        value: MutationQueueItem;
        indexes: { 'by-created': number };
    };
}

const DB_NAME = 'audit-forecaster-offline';
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<OfflineDB>>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    const inspectionStore = db.createObjectStore('inspections', { keyPath: 'id' });
                    inspectionStore.createIndex('by-job', 'jobId');

                    const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
                    photoStore.createIndex('by-inspection', 'inspectionId');
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains('equipment')) {
                        db.createObjectStore('equipment', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains('mutation_queue')) {
                        const queueStore = db.createObjectStore('mutation_queue', { keyPath: 'id' });
                        queueStore.createIndex('by-created', 'createdAt');
                    }
                }
                if (oldVersion < 4) {
                    if (!db.objectStoreNames.contains('logs')) {
                        const logStore = db.createObjectStore('logs', { keyPath: 'id' });
                        logStore.createIndex('by-timestamp', 'timestamp');
                    }
                }
                if (oldVersion < 5) {
                    if (!db.objectStoreNames.contains('failed_mutations')) {
                        const failedStore = db.createObjectStore('failed_mutations', { keyPath: 'id' });
                        failedStore.createIndex('by-created', 'createdAt');
                    }
                }
            },
        });
    }
    return dbPromise;
}

export async function logFieldEvent(level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
    const db = await getDB();
    await db.put('logs', {
        id: crypto.randomUUID(),
        level,
        message,
        details,
        timestamp: Date.now(),
        synced: false
    });
}

export async function getFieldLogs() {
    const db = await getDB();
    return db.getAllFromIndex('logs', 'by-timestamp');
}

export async function clearFieldLogs() {
    const db = await getDB();
    await db.clear('logs');
}

export async function enqueueMutation(item: MutationQueueItem) {
    const db = await getDB();
    await db.put('mutation_queue', item);
}

export async function getMutationQueue() {
    const db = await getDB();
    return db.getAllFromIndex('mutation_queue', 'by-created');
}

export async function removeMutation(id: string) {
    const db = await getDB();
    await db.delete('mutation_queue', id);
}

export async function addFailedMutation(item: MutationQueueItem) {
    const db = await getDB();
    await db.put('failed_mutations', item);
}

export async function getFailedMutations() {
    const db = await getDB();
    return db.getAllFromIndex('failed_mutations', 'by-created');
}

export async function removeFailedMutation(id: string) {
    const db = await getDB();
    await db.delete('failed_mutations', id);
}

export async function saveInspectionDraft(inspection: InspectionDraft) {
    const db = await getDB();
    await db.put('inspections', {
        ...inspection,
        updatedAt: Date.now(),
        synced: false,
    });
}

export async function getInspectionDraft(id: string) {
    const db = await getDB();
    return db.get('inspections', id);
}

export async function getInspectionDraftByJobId(jobId: string) {
    const db = await getDB();
    return db.getFromIndex('inspections', 'by-job', jobId);
}

export async function saveOfflinePhoto(photo: OfflinePhoto) {
    const db = await getDB();
    await db.put('photos', {
        ...photo,
        createdAt: Date.now(),
        synced: false,
    });
}

export async function getOfflinePhotos(inspectionId: string) {
    const db = await getDB();
    return db.getAllFromIndex('photos', 'by-inspection', inspectionId);
}

export async function getAllUnsyncedInspections() {
    const db = await getDB();
    const all = await db.getAll('inspections');
    return all.filter(i => !i.synced);
}

export async function markInspectionSynced(id: string) {
    const db = await getDB();
    const inspection = await db.get('inspections', id);
    if (inspection) {
        await db.put('inspections', { ...inspection, synced: true });
    }
}

// --- Equipment Offline Logic ---

export async function saveEquipmentDraft(draft: EquipmentDraft) {
    const db = await getDB();
    await db.put('equipment', {
        ...draft,
        createdAt: Date.now(),
        synced: false,
    });
}

export async function getEquipmentDraft(id: string) {
    const db = await getDB();
    return db.get('equipment', id);
}

export async function getAllUnsyncedEquipment() {
    const db = await getDB();
    const all = await db.getAll('equipment');
    return all.filter(e => !e.synced);
}

export async function markEquipmentSynced(id: string) {
    const db = await getDB();
    const item = await db.get('equipment', id);
    if (item) {
        await db.put('equipment', { ...item, synced: true });
    }
}
