import Dexie, { Table } from 'dexie';

/**
 * Local database for offline field inspection functionality (PWA)
 * Stores jobs and inspection data when offline, syncs when connection restored
 */

export interface LocalJob {
    id: string;
    address: string;
    status: string;
    scheduledDate: string;
    inspectorId: string;
    builderName: string;
    syncStatus: 'synced' | 'pending' | 'error';
}

export interface LocalInspection {
    id?: number;
    jobId: string;
    data: Record<string, unknown>;
    updatedAt: string;
    syncStatus: 'synced' | 'pending' | 'error';
}

/**
 * IndexedDB database for AuditForecaster field inspector app
 * Enables offline-first PWA functionality
 */
export class FieldInspectorDB extends Dexie {
    jobs!: Table<LocalJob>;
    inspections!: Table<LocalInspection>;

    constructor() {
        super('FieldInspectorDB');
        this.version(1).stores({
            jobs: 'id, status, inspectorId, syncStatus',
            inspections: '++id, jobId, syncStatus'
        });
    }
}

export const db = new FieldInspectorDB();
