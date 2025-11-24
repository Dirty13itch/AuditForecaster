import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
}

const DB_NAME = 'audit-forecaster-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const inspectionStore = db.createObjectStore('inspections', { keyPath: 'id' });
                inspectionStore.createIndex('by-job', 'jobId');

                const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
                photoStore.createIndex('by-inspection', 'inspectionId');
            },
        });
    }
    return dbPromise;
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
