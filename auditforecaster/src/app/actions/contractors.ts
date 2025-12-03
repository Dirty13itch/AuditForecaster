'use server'

import { prisma } from "@/lib/prisma"
import { SubcontractorSchema, SubcontractorInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logger"

export async function createSubcontractor(data: SubcontractorInput) {
    try {
        const validated = SubcontractorSchema.parse(data)

        await prisma.subcontractor.create({
            data: validated,
        })

        revalidatePath("/dashboard/contractors")
        return { success: true, message: "Subcontractor created successfully" }
    } catch (error) {
        logger.error("Failed to create subcontractor", { error })
        if (error instanceof z.ZodError) {
            return { success: false, message: "Invalid data", errors: error.errors }
        }
        return { success: false, message: "Failed to create subcontractor" }
    }
}

export async function updateSubcontractor(id: string, data: SubcontractorInput) {
    try {
        const validated = SubcontractorSchema.parse(data)

        await prisma.subcontractor.update({
            where: { id },
            data: validated,
        })

        revalidatePath("/dashboard/contractors")
        return { success: true, message: "Subcontractor updated successfully" }
    } catch (error) {
        logger.error("Failed to update subcontractor", { error })
        if (error instanceof z.ZodError) {
            return { success: false, message: "Invalid data", errors: error.errors }
        }
        return { success: false, message: "Failed to update subcontractor" }
    }
}

export async function deleteSubcontractor(id: string) {
    try {
        await prisma.subcontractor.delete({
            where: { id },
        })

        revalidatePath("/dashboard/contractors")
        return { success: true, message: "Subcontractor deleted successfully" }
    } catch (error) {
        logger.error("Failed to delete subcontractor", { error })
        return { success: false, message: "Failed to delete subcontractor" }
    }
}
