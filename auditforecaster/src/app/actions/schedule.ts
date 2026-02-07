'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { assertValidId } from "@/lib/utils"
import { logAudit } from "@/lib/audit"
import { startOfWeek, addWeeks, format } from "date-fns"

export type ScheduleJob = {
    id: string
    streetAddress: string
    city: string
    lotNumber: string | null
    status: string
    scheduledDate: string | null
    inspectorId: string | null
    inspectorName: string | null
    builderName: string | null
    source: string
    googleEventId: string | null
    updatedAt: string
    lastUpdatedBy: string | null
}

const VALID_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RESCHEDULED', 'POSTPONED', 'REMOVED'] as const

export async function getWeekJobs(weekOffset: number = 0) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated", jobs: [] as ScheduleJob[] }
    }

    const now = new Date()
    const targetWeek = addWeeks(now, weekOffset)
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 }) // Monday
    // Limit to Friday
    const friday = new Date(weekStart)
    friday.setDate(friday.getDate() + 4)
    friday.setHours(23, 59, 59, 999)

    const jobs = await prisma.job.findMany({
        where: {
            scheduledDate: {
                gte: weekStart,
                lte: friday,
            },
        },
        include: {
            inspector: { select: { id: true, name: true } },
            builder: { select: { id: true, name: true } },
        },
        orderBy: { scheduledDate: 'asc' },
    })

    const scheduleJobs: ScheduleJob[] = jobs.map(job => ({
        id: job.id,
        streetAddress: job.streetAddress,
        city: job.city,
        lotNumber: job.lotNumber,
        status: job.status,
        scheduledDate: job.scheduledDate ? format(job.scheduledDate, 'yyyy-MM-dd') : null,
        inspectorId: job.inspectorId,
        inspectorName: job.inspector?.name ?? null,
        builderName: job.builder?.name ?? null,
        source: job.googleEventId ? 'Building Knowledge' : 'Manual',
        googleEventId: job.googleEventId,
        updatedAt: job.updatedAt.toISOString(),
        lastUpdatedBy: null, // TODO: pull from audit log
    }))

    return {
        success: true as const,
        jobs: scheduleJobs,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(friday, 'yyyy-MM-dd'),
    }
}

export async function getInspectors() {
    const session = await auth()
    if (!session?.user) {
        return []
    }

    const inspectors = await prisma.user.findMany({
        where: {
            role: { in: ['ADMIN', 'INSPECTOR'] },
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
    })

    return inspectors
}

export async function assignJob(jobId: string, inspectorId: string | null) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated" }
    }

    try {
        assertValidId(jobId, 'Job ID')
        if (inspectorId !== null) {
            assertValidId(inspectorId, 'Inspector ID')
        }
    } catch {
        return { success: false as const, message: "Invalid ID format" }
    }

    try {
        const before = await prisma.job.findUnique({ where: { id: jobId } })
        if (!before) {
            return { success: false as const, message: "Job not found" }
        }

        const updated = await prisma.job.update({
            where: { id: jobId },
            data: {
                inspectorId: inspectorId,
                status: inspectorId ? 'ASSIGNED' : 'PENDING',
            },
            include: {
                inspector: { select: { name: true } },
            },
        })

        await logAudit({
            entityType: 'Job',
            entityId: jobId,
            action: 'UPDATE',
            before: { inspectorId: before.inspectorId, status: before.status },
            after: { inspectorId: updated.inspectorId, status: updated.status },
            userId: session.user.id,
        })

        return {
            success: true as const,
            inspectorName: updated.inspector?.name ?? null,
        }
    } catch {
        return { success: false as const, message: "Failed to assign job" }
    }
}

export async function updateJobStatus(jobId: string, status: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated" }
    }

    try {
        assertValidId(jobId, 'Job ID')
    } catch {
        return { success: false as const, message: "Invalid ID format" }
    }

    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        return { success: false as const, message: "Invalid status" }
    }

    try {
        const before = await prisma.job.findUnique({ where: { id: jobId } })
        if (!before) {
            return { success: false as const, message: "Job not found" }
        }

        await prisma.job.update({
            where: { id: jobId },
            data: { status },
        })

        await logAudit({
            entityType: 'Job',
            entityId: jobId,
            action: 'UPDATE',
            before: { status: before.status },
            after: { status },
            userId: session.user.id,
        })

        return { success: true as const }
    } catch {
        return { success: false as const, message: "Failed to update status" }
    }
}
