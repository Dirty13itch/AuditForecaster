import { Worker, Job } from 'bullmq';
import { QueueConnection } from '@/lib/queue';
import { prisma } from '@/lib/prisma';
import { JobSchema, EquipmentClientSchema } from '@/lib/schemas';
import { getCoordinates } from '@/lib/geocoding';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { safeJsonParse, safeParseFloat } from '@/lib/utils';
import { z } from 'zod';
import { addYears } from 'date-fns';

const WORKER_NAME = 'sync-queue';

interface MutationPayload {
    [key: string]: unknown;
}

interface SyncJobData {
    mutations: {
        id: string;
        resource: string;
        type: string;
        payload: MutationPayload;
    }[];
    userId: string;
}

const InspectionWorkerSchema = z.object({
    jobId: z.string().min(1),
    cfm50: z.string().min(1),
    houseVolume: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    checklist: z.string().nullable().optional(),
    signature: z.string().nullable().optional(),
});

export const syncWorker = new Worker(
    WORKER_NAME,
    async (job: Job<SyncJobData>) => {
        const { mutations, userId } = job.data;
        logger.info(`[SyncWorker] Processing job ${job.id} for user ${userId} with ${mutations.length} mutations`);

        const results = [];

        for (const mutation of mutations) {
            const { id, resource, type, payload } = mutation;
            const actionKey = `${resource}:${type}`;

            try {
                let result;
                switch (actionKey) {
                    case 'job:CREATE':
                        result = await handleCreateJob(payload, userId);
                        break;
                    case 'inspection:UPDATE':
                        result = await handleUpdateInspection(payload);
                        break;
                    case 'equipment:CREATE':
                        result = await handleCreateEquipment(payload, userId);
                        break;
                    case 'equipment:UPDATE':
                        result = await handleUpdateEquipment(payload, userId);
                        break;
                    default:
                        throw new Error(`Unknown action: ${actionKey}`);
                }
                results.push({ id, status: 'COMPLETED', result });
            } catch (error) {
                logger.error(`[SyncWorker] Mutation ${id} failed`, { error });
                results.push({ id, status: 'FAILED', error: String(error) });
            }
        }

        return results;
    },
    {
        connection: QueueConnection,
        concurrency: 5,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
    }
);

async function handleCreateJob(payload: unknown, userId: string) {
    const data = payload as Record<string, unknown>;
    const validated = JobSchema.parse({
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate as string) : undefined
    });

    const fullAddress = `${validated.streetAddress}, ${validated.city}`;
    const coords = await getCoordinates(fullAddress);

    const job = await prisma.job.create({
        data: {
            builderId: validated.builderId,
            lotNumber: validated.lotNumber,
            streetAddress: validated.streetAddress,
            address: fullAddress,
            city: validated.city,
            scheduledDate: validated.scheduledDate || new Date(),
            status: validated.inspectorId ? 'ASSIGNED' : 'PENDING',
            inspectorId: validated.inspectorId || null,
            latitude: coords?.lat || null,
            longitude: coords?.lng || null,
        }
    });

    await logAudit({
        entityType: 'JOB',
        entityId: job.id,
        action: 'CREATE',
        changes: validated,
        actorId: userId
    });

    return { success: true, id: job.id };
}

async function handleUpdateInspection(payload: unknown) {
    const validated = InspectionWorkerSchema.parse(payload);
    const fields = validated;

    const houseVolume = fields.houseVolume ? safeParseFloat(fields.houseVolume, 0) : null;
    const checklist = safeJsonParse<unknown[] | null>(fields.checklist, null);
    const cfm50Val = safeParseFloat(fields.cfm50, 0);

    let ach50: number | null = null;
    let compliant: boolean | undefined = undefined;
    let margin: number | undefined = undefined;

    if (houseVolume && houseVolume > 0) {
        ach50 = (cfm50Val * 60) / houseVolume;
        ach50 = Math.round(ach50 * 100) / 100;
        const TARGET_ACH50 = 3.0;
        compliant = ach50 <= TARGET_ACH50;
        margin = Math.round((TARGET_ACH50 - ach50) * 100) / 100;
    }

    const inspectionData = {
        cfm50: cfm50Val,
        houseVolume,
        ach50,
        compliant,
        margin,
        notes: fields.notes,
        timestamp: new Date().toISOString(),
    };

    const existingInspection = await prisma.inspection.findFirst({
        where: { jobId: fields.jobId },
        orderBy: { createdAt: 'desc' }
    });

    if (existingInspection) {
        await prisma.inspection.update({
            where: { id: existingInspection.id },
            data: {
                data: JSON.stringify(inspectionData),
                checklist: JSON.stringify(checklist),
                signatureUrl: fields.signature,
            }
        });
    } else {
        await prisma.inspection.create({
            data: {
                jobId: fields.jobId,
                type: 'BLOWER_DOOR',
                data: JSON.stringify(inspectionData),
                checklist: JSON.stringify(checklist),
                signatureUrl: fields.signature,
            }
        });
    }

    await prisma.job.update({
        where: { id: fields.jobId },
        data: { status: 'COMPLETED' }
    });

    return { success: true };
}

async function handleCreateEquipment(payload: unknown, userId: string) {
    const data = payload as Record<string, unknown>;
    const validated = EquipmentClientSchema.parse({
        ...data,
        lastCalibration: data.lastCalibration ? new Date(data.lastCalibration as string) : undefined,
        nextCalibration: data.nextCalibration ? new Date(data.nextCalibration as string) : undefined,
    });

    let nextCal = validated.nextCalibration;
    if (!nextCal && validated.lastCalibration) {
        nextCal = addYears(validated.lastCalibration, 1);
    }

    const equipment = await prisma.equipment.create({
        data: {
            ...validated,
            nextCalibration: nextCal
        },
    });

    await logAudit({
        entityType: 'EQUIPMENT',
        entityId: equipment.id,
        action: 'CREATE',
        changes: validated,
        actorId: userId
    });

    return { success: true, id: equipment.id };
}

async function handleUpdateEquipment(payload: unknown, userId: string) {
    const { id, data } = payload as { id: string, data: Record<string, unknown> };
    if (!id) throw new Error("Missing Equipment ID");

    const validated = EquipmentClientSchema.parse({
        ...data,
        lastCalibration: data.lastCalibration ? new Date(data.lastCalibration as string) : undefined,
        nextCalibration: data.nextCalibration ? new Date(data.nextCalibration as string) : undefined,
    });

    await prisma.equipment.update({
        where: { id },
        data: validated,
    });

    await logAudit({
        entityType: 'EQUIPMENT',
        entityId: id,
        action: 'UPDATE',
        changes: validated,
        actorId: userId
    });

    return { success: true };
}

syncWorker.on('completed', (job: Job) => {
    logger.info(`[SyncWorker] Job ${job.id} completed`);
});

syncWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[SyncWorker] Job ${job?.id} failed: ${err.message}`);
});
