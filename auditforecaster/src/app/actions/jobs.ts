'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from "zod"
import { auth } from "@/auth"
import { logAudit } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { assertValidId } from "@/lib/utils"

const JobSchema = z.object({
    builderId: z.string().min(1, "Builder is required"),
    lotNumber: z.string().min(1, "Lot Number is required"),
    streetAddress: z.string().min(1, "Street Address is required"),
    city: z.string().min(1, "City is required"),
    scheduledDate: z.string().optional(),
    inspectorId: z.string().optional(),
})

export async function createJob(formData: FormData) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    const validatedFields = JobSchema.parse({
        builderId: formData.get('builderId'),
        lotNumber: formData.get('lotNumber'),
        streetAddress: formData.get('streetAddress'),
        city: formData.get('city'),
        scheduledDate: formData.get('scheduledDate') || undefined,
        inspectorId: formData.get('inspectorId') || undefined,
    })

    const fullAddress = `${validatedFields.streetAddress}, ${validatedFields.city}`

    try {
        const job = await prisma.job.create({
            data: {
                builderId: validatedFields.builderId,
                lotNumber: validatedFields.lotNumber,
                streetAddress: validatedFields.streetAddress,
                address: fullAddress,
                city: validatedFields.city,
                scheduledDate: validatedFields.scheduledDate ? new Date(validatedFields.scheduledDate) : new Date(),
                status: validatedFields.inspectorId ? 'ASSIGNED' : 'PENDING',
                inspectorId: validatedFields.inspectorId || null,
            }
        })

        await logAudit({
            entityType: 'JOB',
            entityId: job.id,
            action: 'CREATE',
            changes: validatedFields
        })

        revalidatePath('/dashboard/jobs')
        return { success: true, message: 'Job created successfully' }
    } catch (error) {
        logger.error('Failed to create job', { error })
        return { success: false, message: 'Failed to create job' }
    }
}

const UpdateJobSchema = JobSchema.partial().extend({
    id: z.string(),
    status: z.string().optional(),
})

export async function updateJobStatus(id: string, status: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    assertValidId(id, 'Job ID')

    // RBAC: Only Admin or Inspector can update status
    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'INSPECTOR') {
        throw new Error("Unauthorized: Insufficient permissions")
    }

    // Validation
    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
    if (!validStatuses.includes(status)) {
        throw new Error("Invalid status")
    }

    const oldJob = await prisma.job.findUnique({
        where: { id },
        select: { status: true }
    })

    if (!oldJob) throw new Error("Job not found")

    await prisma.job.update({
        where: { id },
        data: { status }
    })

    await logAudit({
        entityType: 'JOB',
        entityId: id,
        action: 'UPDATE',
        changes: {
            field: 'status',
            from: oldJob.status,
            to: status,
            actor: session.user.id
        }
    })

    revalidatePath('/dashboard/jobs')
}

export async function updateJob(formData: FormData) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    const rawData = {
        id: formData.get('id'),
        builderId: formData.get('builderId'),
        lotNumber: formData.get('lotNumber'),
        streetAddress: formData.get('streetAddress'),
        city: formData.get('city'),
        scheduledDate: formData.get('scheduledDate'),
        inspectorId: formData.get('inspectorId'),
        status: formData.get('status'),
    }

    // Filter out empty strings/nulls for partial update
    const cleanData = Object.fromEntries(
        Object.entries(rawData).filter(([_, v]) => v != null && v !== '')
    )

    const validated = UpdateJobSchema.parse(cleanData)
    const { id, ...data } = validated

    const updateData: any = { ...data }

    if (data.streetAddress || data.city) {
        // If address changed, we might want to re-geocode, but for now just update the full string
        // Fetch existing if one is missing?
        // For simplicity, we assume if one is updated, the full address is rebuilt from available data
        // But we need the OTHER part if it's not in the form.
        // Let's just update what we have.
        // Actually, let's fetch the current job to merge address parts if needed.
        const current = await prisma.job.findUnique({ where: { id } })
        if (current) {
            const street = data.streetAddress || current.streetAddress
            const city = data.city || current.city
            updateData.address = `${street}, ${city}`

            // Address updated - could add geocoding here in future
        }
    }

    if (data.scheduledDate) {
        updateData.scheduledDate = new Date(data.scheduledDate)
    }

    const oldJob = await prisma.job.findUnique({ where: { id } })

    await prisma.job.update({
        where: { id },
        data: updateData
    })

    await logAudit({
        entityType: 'JOB',
        entityId: id,
        action: 'UPDATE',
        changes: {
            from: oldJob,
            to: updateData,
            actor: session.user.id
        }
    })

    revalidatePath('/dashboard/jobs')
    redirect('/dashboard/jobs')
}

export async function getTemplatesForSelection() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const templates = await prisma.reportTemplate.findMany({
        take: 100,
        select: {
            id: true,
            name: true,
            description: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return templates
}
