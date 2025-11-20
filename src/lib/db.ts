import Dexie, { Table } from 'dexie';

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
    data: any;
    updatedAt: string;
    syncStatus: 'synced' | 'pending' | 'error';
}

export class UlrichDB extends Dexie {
    jobs!: Table<LocalJob>;
    inspections!: Table<LocalInspection>;

    constructor() {
        super('UlrichDB');
        this.version(1).stores({
            jobs: 'id, status, inspectorId, syncStatus',
            inspections: '++id, jobId, syncStatus'
        });
    }
}

export const db = new UlrichDB();
