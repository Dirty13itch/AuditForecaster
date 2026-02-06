'use server'

import { prisma } from '@/lib/prisma'
import { mapToEkotropeProject } from '@/lib/integrations/ekotrope'
import { revalidatePath } from 'next/cache'
import { logger } from "@/lib/logger"
import { auth } from "@/auth"

export async function syncToEkotrope(inspectionId: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 1. Fetch Inspection and related data
        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                job: {
                    include: {
                        builder: true,
                        subdivision: true,
                    }
                }
            }
        })

        if (!inspection || !inspection.job) {
            return { success: false, error: 'Inspection or Job not found' }
        }

        // 2. Check Settings (Mocked for now as IntegrationSettings model is missing)
        // const settings = await prisma.integrationSettings.findFirst()
        // if (!settings?.ekotropeEnabled || !settings?.ekotropeApiKey) {
        //     return { success: false, error: 'Ekotrope integration is not enabled or configured' }
        // }

        // 3. Map Data
        // In a real app, we'd fetch the inspector's name too
        const payload = mapToEkotropeProject(inspection.job, inspection, 'Field Inspect User')

        // 4. Send to Ekotrope API
        // MOCK IMPLEMENTATION for now
        // const response = await fetch('https://api.ekotrope.com/v1/projects', { ... })

        logger.info('Sending to Ekotrope', { payload })

        // Simulate API delay and success
        await new Promise(resolve => setTimeout(resolve, 1500)) // Slightly longer for "PDF generation"
        const mockEkotropeId = `EKO-${Date.now()}`
        const mockHersScore = Math.floor(Math.random() * (65 - 45 + 1) + 45) // Random score 45-65
        const mockCertUrl = `https://example.com/certs/${mockEkotropeId}.pdf` // In real app, this would be a real URL or we'd upload the blob to S3

        // 5. Update Job
        await prisma.job.update({
            where: { id: inspection.job.id },
            data: {
                ekotropeProjectId: mockEkotropeId,
                ekotropeSyncedAt: new Date(),
                // hersScore: mockHersScore, // Field might be missing in Job model, check schema if needed
                // hersCertUrl: mockCertUrl, // Field might be missing in Job model, check schema if needed
            }
        })

        // 6. Log Success
        await prisma.integrationLog.create({
            data: {
                service: 'EKOTROPE',
                action: 'SYNC_JOB',
                jobId: inspection.job.id,
                success: true,
                request: JSON.stringify(payload),
                response: JSON.stringify({
                    projectId: mockEkotropeId,
                    status: 'created',
                    hersScore: mockHersScore,
                    certUrl: mockCertUrl
                }),
            }
        })

        revalidatePath(`/dashboard/inspections/${inspectionId}`)
        return { success: true, projectId: mockEkotropeId }

    } catch (error: unknown) {
        logger.error('Ekotrope Sync Error', { error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Log Failure
        await prisma.integrationLog.create({
            data: {
                service: 'EKOTROPE',
                action: 'SYNC_JOB',
                jobId: inspectionId, // Ideally we'd have the job ID here, but might fail before fetching
                success: false,
                request: 'N/A',
                response: 'Error',
                error: errorMessage,
            }
        })

        return { success: false, error: errorMessage || 'Failed to sync to Ekotrope' }
    }
}
