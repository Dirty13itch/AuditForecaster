'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns"

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

export async function getWeekJobs(weekOffset: number = 0) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated", jobs: [] }
    }

    const now = new Date()
    const targetWeek = addWeeks(now, weekOffset)
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 }) // Sunday
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

export async function assignJob(jobId: string, inspectorId: string | null) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated" }
    }

    await prisma.job.update({
        where: { id: jobId },
        data: {
            inspectorId: inspectorId,
            status: inspectorId ? 'ASSIGNED' : 'PENDING',
        },
    })

    return { success: true as const }
}

export async function updateJobStatus(jobId: string, status: string, notes?: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false as const, message: "Not authenticated" }
    }

    await prisma.job.update({
        where: { id: jobId },
        data: { status },
    })

    return { success: true as const }
}
