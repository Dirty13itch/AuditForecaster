'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { assertValidId } from "@/lib/utils"

const DEFAULT_PAGE_SIZE = 50

interface GetPlansOptions {
    builderId?: string
    query?: string
    page?: number
    limit?: number
}

export async function getPlans(options: GetPlansOptions = {}) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const {
        builderId,
        query,
        page = 1,
        limit = DEFAULT_PAGE_SIZE,
    } = options

    const take = Math.min(100, Math.max(1, limit))
    const skip = (Math.max(1, page) - 1) * take

    const where: Record<string, unknown> = {}

    // Multi-Tenancy: BUILDER role users can only see their own builder's plans
    if (session.user.role === 'BUILDER' && session.user.builderId) {
        where.builderId = session.user.builderId
    } else if (builderId) {
        assertValidId(builderId, 'Builder ID')
        where.builderId = builderId
    }

    if (query) {
        where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { builder: { name: { contains: query, mode: 'insensitive' } } },
        ]
    }

    try {
        const [plans, totalCount] = await Promise.all([
            prisma.plan.findMany({
                where,
                include: {
                    builder: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.plan.count({ where }),
        ])

        const totalPages = Math.ceil(totalCount / take)

        return {
            plans,
            totalCount,
            totalPages,
            currentPage: page,
        }
    } catch (error) {
        logger.error('Failed to fetch plans', {
            error: error instanceof Error ? error.message : String(error),
        })
        throw new Error('Failed to fetch plans')
    }
}

export async function getPlanById(id: string) {
    assertValidId(id, 'Plan ID')

    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    try {
        const plan = await prisma.plan.findUnique({
            where: { id },
            include: {
                builder: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        if (!plan) throw new Error("Plan not found")

        // Multi-Tenancy: BUILDER role users can only see their own builder's plans
        if (
            session.user.role === 'BUILDER' &&
            session.user.builderId &&
            plan.builderId !== session.user.builderId
        ) {
            throw new Error("Unauthorized: You do not have access to this plan")
        }

        return plan
    } catch (error) {
        logger.error('Failed to fetch plan', {
            planId: id,
            error: error instanceof Error ? error.message : String(error),
        })
        throw error
    }
}

export async function deletePlan(id: string) {
    assertValidId(id, 'Plan ID')

    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    // RBAC: Only ADMIN can delete plans
    if (session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized: Admin access required")
    }

    try {
        const plan = await prisma.plan.findUnique({
            where: { id },
            select: { id: true, title: true },
        })

        if (!plan) throw new Error("Plan not found")

        await prisma.plan.delete({ where: { id } })

        revalidatePath('/dashboard/builders/plans')
        return { message: 'Plan deleted successfully' }
    } catch (error) {
        logger.error('Failed to delete plan', {
            planId: id,
            error: error instanceof Error ? error.message : String(error),
        })
        return { message: 'Failed to delete plan' }
    }
}
