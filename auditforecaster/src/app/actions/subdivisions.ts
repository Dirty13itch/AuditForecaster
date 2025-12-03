'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { z } from "zod"

const SubdivisionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    builderId: z.string().uuid()
})

export async function createSubdivision(data: z.infer<typeof SubdivisionSchema>) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = SubdivisionSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: result.error.errors[0].message }
    }

    try {
        const subdivision = await prisma.subdivision.create({
            data: {
                name: result.data.name,
                builderId: result.data.builderId
            }
        })
        revalidatePath('/dashboard/builders')
        return { success: true, data: subdivision }
    } catch (error) {
        logger.error('Failed to create subdivision', { error })
        return { success: false, error: 'Failed to create subdivision' }
    }
}

export async function updateSubdivision(id: string, data: { name?: string }) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = z.object({ name: z.string().min(1).optional() }).safeParse(data)
    if (!result.success) {
        return { success: false, error: result.error.errors[0].message }
    }

    try {
        const subdivision = await prisma.subdivision.update({
            where: { id },
            data: result.data
        })
        revalidatePath('/dashboard/builders')
        return { success: true, data: subdivision }
    } catch (error) {
        console.error('Failed to update subdivision:', error)
        return { success: false, error: 'Failed to update subdivision' }
    }
}

export async function getSubdivisions(builderId?: string) {
    try {
        const where = builderId ? { builderId } : {}
        const subdivisions = await prisma.subdivision.findMany({
            where,
            include: {
                builder: true,
                _count: {
                    select: { jobs: true }
                }
            },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: subdivisions }
    } catch (error) {
        console.error('Failed to fetch subdivisions:', error)
        return { success: false, error: 'Failed to fetch subdivisions' }
    }
}

export async function deleteSubdivision(id: string) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = z.string().uuid().safeParse(id)
    if (!result.success) {
        return { success: false, error: "Invalid ID" }
    }

    try {
        await prisma.subdivision.delete({
            where: { id: result.data }
        })
        revalidatePath('/dashboard/builders')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete subdivision:', error)
        return { success: false, error: 'Failed to delete subdivision' }
    }
}

