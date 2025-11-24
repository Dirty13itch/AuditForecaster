'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { TemplateStructure } from "@/lib/reporting/engine"

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
                structure: data.structure as any,
            }
        })
    } else {
        // Create new
        await prisma.reportTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                structure: data.structure as any,
                checklistItems: '[]', // Keep for backwards compatibility
            }
        })
    }

    revalidatePath('/dashboard/reports/templates')
    return { success: true }
}

export async function createInspectionWithTemplate(jobId: string, templateId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const inspection = await prisma.inspection.create({
        data: {
            jobId,
            reportTemplateId: templateId,
            data: '{}',
            answers: {},
            score: 0,
        }
    })

    return { inspectionId: inspection.id }
}

export async function getTemplatesForSelection() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    return await prisma.reportTemplate.findMany({
        select: {
            id: true,
            name: true,
            description: true,
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
}
