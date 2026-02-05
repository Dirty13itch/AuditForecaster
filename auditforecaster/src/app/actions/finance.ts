'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const ClassifySchema = z.object({
    id: z.string(),
    type: z.enum(['BUSINESS', 'PERSONAL'])
})

export async function classifyMileageLog(id: string, type: 'BUSINESS' | 'PERSONAL') {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorized' }

    const parsed = ClassifySchema.safeParse({ id, type })
    if (!parsed.success) return { error: 'Invalid input' }

    try {
        await prisma.mileageLog.update({
            where: {
                id,
                vehicle: { assignedTo: session.user.id } // Ensure ownership
            },
            data: {
                purpose: type,
                status: 'CLASSIFIED'
            }
        })

        revalidatePath('/dashboard/finance')
        return { success: true }
    } catch (error) {
        logger.error('Failed to classify mileage log', { error })
        return { error: 'Failed to update log' }
    }
}

export async function autoClassifyLogs() {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorized' }

    try {
        // Fetch unclassified logs
        const logs = await prisma.mileageLog.findMany({
            where: {
                vehicle: { assignedTo: session.user.id },
                status: 'PENDING'
            }
        })

        // Mock Work Hours (9 AM - 5 PM)
        // In a real app, this would come from User settings
        const WORK_START = 9
        const WORK_END = 17

        // Classify logs and batch updates in a transaction
        const businessIds: string[] = []
        const personalIds: string[] = []

        for (const log of logs) {
            const hour = new Date(log.date).getHours()

            if (hour >= WORK_START && hour < WORK_END) {
                businessIds.push(log.id)
            } else {
                personalIds.push(log.id)
            }
        }

        const operations = []

        if (businessIds.length > 0) {
            operations.push(
                prisma.mileageLog.updateMany({
                    where: { id: { in: businessIds } },
                    data: {
                        purpose: 'BUSINESS',
                        status: 'CLASSIFIED'
                    }
                })
            )
        }

        if (personalIds.length > 0) {
            operations.push(
                prisma.mileageLog.updateMany({
                    where: { id: { in: personalIds } },
                    data: {
                        purpose: 'PERSONAL',
                        status: 'CLASSIFIED'
                    }
                })
            )
        }

        if (operations.length > 0) {
            await prisma.$transaction(operations)
        }

        const classifiedCount = businessIds.length + personalIds.length

        revalidatePath('/dashboard/finance')
        return { success: true, count: classifiedCount }
    } catch (error) {
        logger.error('Failed to auto-classify logs', { error })
        return { error: 'Failed to auto-classify' }
    }
}
