'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { z } from "zod"

// --- Schemas ---

const ServiceItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    basePrice: z.number().min(0, "Price must be positive")
})

const PriceListSchema = z.object({
    name: z.string().min(1, "Name is required"),
    builderId: z.string().optional(),
    subdivisionId: z.string().optional()
})

const PriceListItemSchema = z.object({
    priceListId: z.string().uuid(),
    serviceItemId: z.string().uuid(),
    price: z.number().min(0)
})

// --- Service Items ---

export async function createServiceItem(data: z.infer<typeof ServiceItemSchema>) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = ServiceItemSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: result.error.errors[0]?.message || "Validation failed" }
    }

    try {
        const serviceItem = await prisma.serviceItem.create({
            data: result.data
        })
        revalidatePath('/dashboard/settings/pricing')
        return { success: true, data: serviceItem }
    } catch (error) {
        logger.error('Failed to upsert price list item', { error })
        return { success: false, error: 'Failed to create service item' }
    }
}

export async function updateServiceItem(id: string, data: Partial<z.infer<typeof ServiceItemSchema>>) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = ServiceItemSchema.partial().safeParse(data)
    if (!result.success) {
        return { success: false, error: result.error.errors[0]?.message || "Validation failed" }
    }

    try {
        const serviceItem = await prisma.serviceItem.update({
            where: { id },
            data: result.data
        })
        revalidatePath('/dashboard/settings/pricing')
        return { success: true, data: serviceItem }
    } catch (error) {
        console.error('Failed to update service item:', error)
        return { success: false, error: 'Failed to update service item' }
    }
}

export async function getServiceItems() {
    try {
        const items = await prisma.serviceItem.findMany({
            orderBy: { name: 'asc' }
        })
        return { success: true, data: items }
    } catch (error) {
        console.error('Failed to fetch service items:', error)
        return { success: false, error: 'Failed to fetch service items' }
    }
}

// --- Price Lists ---

export async function createPriceList(data: z.infer<typeof PriceListSchema>) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = PriceListSchema.safeParse(data)
    if (!result.success) {
        return { success: false, error: result.error.errors[0]?.message || "Validation failed" }
    }

    try {
        const priceList = await prisma.priceList.create({
            data: {
                name: result.data.name,
                builderId: result.data.builderId || null,
                subdivisionId: result.data.subdivisionId || null
            }
        })
        revalidatePath('/dashboard/settings/pricing')
        return { success: true, data: priceList }
    } catch (error) {
        console.error('Failed to create price list:', error)
        return { success: false, error: 'Failed to create price list' }
    }
}

export async function getPriceLists() {
    try {
        const priceLists = await prisma.priceList.findMany({
            include: {
                builder: true,
                subdivision: true,
                _count: {
                    select: { items: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })
        return { success: true, data: priceLists }
    } catch (error) {
        console.error('Failed to fetch price lists:', error)
        return { success: false, error: 'Failed to fetch price lists' }
    }
}

export async function getPriceList(id: string) {
    try {
        const priceList = await prisma.priceList.findUnique({
            where: { id },
            include: {
                builder: true,
                subdivision: true,
                items: {
                    include: {
                        serviceItem: true
                    }
                }
            }
        })
        return { success: true, data: priceList }
    } catch (error) {
        console.error('Failed to fetch price list:', error)
        return { success: false, error: 'Failed to fetch price list' }
    }
}

// --- Price List Items ---

export async function upsertPriceListItem(priceListId: string, serviceItemId: string, price: number) {
    const session = await auth()
    if (!session) return { success: false, error: 'Unauthorized' }

    const result = PriceListItemSchema.safeParse({ priceListId, serviceItemId, price })
    if (!result.success) {
        return { success: false, error: result.error.errors[0]?.message || "Validation failed" }
    }

    try {
        const item = await prisma.priceListItem.upsert({
            where: {
                priceListId_serviceItemId: {
                    priceListId,
                    serviceItemId
                }
            },
            update: { price },
            create: {
                priceListId,
                serviceItemId,
                price
            }
        })
        revalidatePath(`/dashboard/settings/pricing/${priceListId}`)
        return { success: true, data: item }
    } catch (error) {
        console.error('Failed to upsert price list item:', error)
        return { success: false, error: 'Failed to upsert price list item' }
    }
}

