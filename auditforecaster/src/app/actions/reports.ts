'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

import { z } from "zod"
import { logger } from "@/lib/logger"

const SavedReportSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    config: z.any() // JSON
})

export async function saveReport(data: {
    name: string
    description?: string
    config: Prisma.InputJsonValue
}) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Unauthorized" }

    try {
        const validated = SavedReportSchema.parse(data)

        await prisma.savedReport.create({
            data: {
                name: validated.name,
                description: validated.description,
                config: validated.config,
                userId: session.user.id
            }
        })

        revalidatePath('/dashboard/analytics/reports')
        return { success: true, message: "Report saved successfully" }
    } catch (error) {
        logger.error("Failed to save report", { error })
        return { success: false, message: "Failed to save report" }
    }
}

export async function getSavedReports() {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    return prisma.savedReport.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    })
}

export async function deleteReport(id: string) {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Unauthorized" }

    try {
        await prisma.savedReport.delete({
            where: { id, userId: session.user.id }
        })

        revalidatePath('/dashboard/analytics/reports')
        return { success: true, message: "Report deleted successfully" }
    } catch (error) {
        logger.error("Failed to delete report", { error })
        return { success: false, message: "Failed to delete report" }
    }
}
