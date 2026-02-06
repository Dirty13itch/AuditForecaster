'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from './email'
import { revalidatePath } from 'next/cache'
import { logger } from "@/lib/logger"
import { assertValidId } from "@/lib/utils"

export async function createActionItem(data: {
    inspectionId: string
    title: string
    description?: string
    priority: string
    assignedToEmail?: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    try {
        // 1. Create Record
        const actionItem = await prisma.actionItem.create({
            data: {
                inspectionId: data.inspectionId,
                title: data.title,
                description: data.description,
                priority: data.priority,
                assignedToEmail: data.assignedToEmail,
                status: 'OPEN'
            }
        })

        // 2. Send Email Notification
        if (data.assignedToEmail) {
            const subject = `Action Required: ${data.title}`
            const body = `
Hello,

An action item has been assigned to you during an inspection.

Title: ${data.title}
Priority: ${data.priority}
Description: ${data.description || 'No description provided.'}

Please address this issue as soon as possible.

- AuditForecaster Team
      `

            // Fire and forget email to not block UI
            sendEmail({
                to: data.assignedToEmail,
                subject,
                body
            }).catch(err => logger.error('Failed to send email', { error: err }))
        }

        revalidatePath(`/dashboard/inspections/${data.inspectionId}`)
        return { success: true, actionItem }
    } catch (error) {
        logger.error('Failed to create action item', { error })
        return { success: false, error: 'Failed to create action item' }
    }
}

export async function getActionItems(inspectionId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    return await prisma.actionItem.findMany({
        where: { inspectionId },
        take: 100,
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateActionItemStatus(id: string, status: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    assertValidId(id, 'Action Item ID')

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
    if (!validStatuses.includes(status)) {
        throw new Error("Invalid status")
    }

    await prisma.actionItem.update({
        where: { id },
        data: { status }
    })

    revalidatePath('/dashboard/inspections')
    return { success: true }
}
