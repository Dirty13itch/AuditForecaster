'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

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

    try {
        const log = await prisma.$transaction(async (tx) => {
            const mileageLog = await tx.mileageLog.create({
                data: {
                    vehicleId: data.vehicleId,
                    date: data.date,
                    distance: data.distance,
                    startLocation: data.startLocation,
                    endLocation: data.endLocation,
                    purpose: data.purpose || 'BUSINESS',
                    status: 'CLASSIFIED'
                }
            })

            await tx.vehicle.update({
                where: { id: data.vehicleId },
                data: {
                    mileage: { increment: Math.round(data.distance) }
                }
            })

            return mileageLog
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
        take: 200,
        orderBy: { date: 'desc' },
        include: { vehicle: true }
    })
}

export async function getVehicles() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    return await prisma.vehicle.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        orderBy: { createdAt: 'desc' }
    })
}
