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

import * as fs from 'fs'

export async function createInspectionWithTemplate(jobId: string, templateId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            const msg = "createInspectionWithTemplate: No session or user ID\n"
            fs.appendFileSync('debug.log', msg)
            console.error(msg)
            throw new Error("Unauthorized")
        }

        const msg = `Creating inspection for job ${jobId} with template ${templateId}\n`
        fs.appendFileSync('debug.log', msg)
        console.log(msg)

        const inspection = await prisma.inspection.create({
            data: {
                jobId,
                reportTemplateId: templateId,
                data: '{}',
                answers: {},
                score: 0,
            }
        })

        fs.appendFileSync('debug.log', `Inspection created: ${inspection.id}\n`)
        console.log(`Inspection created: ${inspection.id}`)
        return { inspectionId: inspection.id }
    } catch (error) {
        const msg = `createInspectionWithTemplate ERROR: ${error instanceof Error ? error.message : String(error)}\nStack: ${error instanceof Error ? error.stack : ''}\n`
        fs.appendFileSync('debug.log', msg)
        console.error("createInspectionWithTemplate ERROR:", error)
        throw error
    }
}

export async function getTemplatesForSelection() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const templates = await prisma.reportTemplate.findMany({
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

