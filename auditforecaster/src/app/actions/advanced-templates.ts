'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { TemplateStructure } from "@/lib/reporting/engine"
import { logger } from "@/lib/logger"

export async function saveAdvancedTemplate(data: {
    name: string
    description?: string
    structure: TemplateStructure
    templateId?: string
}) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    if (data.templateId) {
        // Update existing
        await prisma.reportTemplate.update({
            where: { id: data.templateId },
            data: {
                name: data.name,
                description: data.description,
                structure: JSON.stringify(data.structure),
            }
        })
    } else {
        // Create new
        await prisma.reportTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                structure: JSON.stringify(data.structure),
                checklistItems: '[]', // Keep for backwards compatibility
            }
        })
    }

    revalidatePath('/dashboard/reports/templates')
    return { success: true }
}



export async function createInspectionWithTemplate(jobId: string, templateId: string) {
    try {
        const session = await auth()
        const msg = `Creating inspection for job ${jobId} with template ${templateId}`
        logger.info(msg)

        const inspection = await prisma.inspection.create({
            data: {
                jobId,
                reportTemplateId: templateId,
                data: '{}',
                answers: '{}',
                score: 0,
            }
        })

        logger.info(`Inspection created: ${inspection.id}`)
        return { inspectionId: inspection.id }
    } catch (error) {
        logger.error("createInspectionWithTemplate ERROR", { error })
        throw error
    }
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

