'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/security'

export async function logTrip(data: {
    vehicleId: string
    date: Date
    distance: number
    startLocation?: string
    endLocation?: string
    purpose?: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
    if (!allowed) return { success: false, error: 'Too many requests. Please try again later.' }

    try {
        const log = await prisma.mileageLog.create({
            data: {
                vehicleId: data.vehicleId,
                date: data.date,
                distance: data.distance,
                startLocation: data.startLocation,
                endLocation: data.endLocation,
                purpose: data.purpose || 'Business',
                status: 'CLASSIFIED'
            }
        })

        // Update vehicle mileage
        await prisma.vehicle.update({
            where: { id: data.vehicleId },
            data: {
                mileage: { increment: Math.round(data.distance) }
            }
        })

        revalidatePath('/dashboard/logistics/mileage')
        return { success: true, log }
    } catch (error) {
        logger.error('Failed to log trip', { error })
        return { success: false, error: 'Failed to log trip' }
    }
}

export async function getMileageLogs(vehicleId?: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const where = vehicleId ? { vehicleId } : {}

    return await prisma.mileageLog.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { vehicle: true }
    })
}

export async function getVehicles() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    return await prisma.vehicle.findMany({
        where: { status: 'ACTIVE' } // Or assigned to user
    })
}
