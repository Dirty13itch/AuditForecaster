import { enqueueSyncJob } from '@/app/actions/sync';

interface ActionResult {
    success: boolean;
    message?: string;
    jobId?: string;
    [key: string]: unknown;
}

async function updateInspectionAdapter(payload: unknown): Promise<ActionResult> {
    return await enqueueSyncJob('inspection', 'UPDATE', payload);
}

async function updateEquipmentAdapter(payload: unknown): Promise<ActionResult> {
    return await enqueueSyncJob('equipment', 'UPDATE', payload);
}

async function createEquipmentAdapter(payload: unknown): Promise<ActionResult> {
    return await enqueueSyncJob('equipment', 'CREATE', payload);
}

async function createJobAdapter(payload: unknown): Promise<ActionResult> {
    return await enqueueSyncJob('job', 'CREATE', payload);
}

// Map of resource+type to server action
export const ACTION_MAP: Record<string, (payload: unknown) => Promise<ActionResult>> = {
    'equipment:CREATE': createEquipmentAdapter,
    'equipment:UPDATE': updateEquipmentAdapter,
    'inspection:UPDATE': updateInspectionAdapter,
    'job:CREATE': createJobAdapter,
};
