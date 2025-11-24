'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function getTodaysRoute() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await prisma.job.findMany({
        where: {
            scheduledDate: {
                gte: today,
                lt: tomorrow
            },
            status: {
                not: 'COMPLETED'
            }
        },
        orderBy: {
            scheduledDate: 'asc'
        },
        select: {
            id: true,
            streetAddress: true,
            city: true,
            lotNumber: true,
            subdivision: {
                select: { name: true }
            }
        }
    })
}

export async function logTrip(data: {
    vehicleId: string
    date: Date
    distance: number
    startLocation: string
    endLocation: string
    purpose: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    await prisma.mileageLog.create({
        data: {
            vehicleId: data.vehicleId,
            date: data.date,
            distance: data.distance,
            startLocation: data.startLocation,
            endLocation: data.endLocation,
            purpose: data.purpose,
            status: 'PENDING'
        }
    })

    return { success: true }
}
