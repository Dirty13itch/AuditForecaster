import { EquipmentClientInput } from '@/lib/schemas';

interface ActionResult {
    success: boolean;
    message?: string;
    [key: string]: unknown;
}

// Adapter to convert JSON payload back to FormData for Server Actions
async function updateInspectionAdapter(payload: unknown): Promise<ActionResult> {
    const { updateInspection } = await import('@/app/actions/inspections');
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('Invalid payload: expected object');
    }

    const formData = new FormData();
    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            // Handle arrays/objects if necessary (e.g. checklist is JSON stringified in form)
            formData.append(key, String(value));
        }
    });
    // Cast return type of updateInspection to match ActionResult (it returns Promise<never> on success due to redirect, or throws)
    // Actually updateInspection redirects, so it might not return.
    // But we are calling it from sync engine. If it redirects, it throws NEXT_REDIRECT.
    // We need to handle that.
    try {
        await updateInspection(formData);
        return { success: true };
    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            return { success: true };
        }
        throw error;
    }
}

async function updateEquipmentAdapter(payload: unknown): Promise<ActionResult> {
    const { updateEquipment } = await import('@/app/actions/equipment');
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('Invalid payload');
    }
    const { id, data } = payload as { id: string, data: EquipmentClientInput };
    return await updateEquipment(id, data);
}

async function createEquipmentAdapter(payload: unknown): Promise<ActionResult> {
    const { createEquipment } = await import('@/app/actions/equipment');
    return await createEquipment(payload as EquipmentClientInput);
}

async function createJobAdapter(payload: unknown): Promise<ActionResult> {
    const { createJob } = await import('@/app/actions/jobs');
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('Invalid payload');
    }

    const formData = new FormData();
    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            // Handle Date objects if they exist in payload (IndexedDB can store Dates)
            if (value instanceof Date) {
                formData.append(key, value.toISOString());
            } else {
                formData.append(key, String(value));
            }
        }
    });

    return await createJob(formData);
}

// Map of resource+type to server action
export const ACTION_MAP: Record<string, (payload: unknown) => Promise<ActionResult>> = {
    'equipment:CREATE': createEquipmentAdapter,
    'equipment:UPDATE': updateEquipmentAdapter,
    'inspection:UPDATE': updateInspectionAdapter,
    'job:CREATE': createJobAdapter,
};
