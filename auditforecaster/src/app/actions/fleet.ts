'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"

export async function addMaintenanceLog(data: {
    vehicleId: string
    date: Date
    type: string
    cost: number
    description?: string
    mileage?: number
}) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.vehicleMaintenance.create({
        data: {
            vehicleId: data.vehicleId,
            date: data.date,
            type: data.type,
            cost: data.cost,
            description: data.description,
            mileage: data.mileage
        }
    })

    revalidatePath(`/dashboard/assets/fleet/${data.vehicleId}`)
    return { success: true }
}

export async function getVehicleDetails(id: string) {
    return prisma.vehicle.findUnique({
        where: { id },
        include: {
            assignedUser: { select: { name: true, email: true } },
            maintenance: { orderBy: { date: 'desc' } },
            mileageLogs: { orderBy: { date: 'desc' }, take: 5 } // Recent trips
        }
    })
}

export async function createVehicle(_prevState: unknown, formData: FormData) {
    try {
        const session = await auth()
        if (!session?.user) throw new Error("Unauthorized")

        const name = formData.get('name') as string
        const make = formData.get('make') as string
        const model = formData.get('model') as string
        const year = parseInt(formData.get('year') as string)
        const licensePlate = formData.get('licensePlate') as string
        const mileage = parseInt(formData.get('mileage') as string)
        const status = formData.get('status') as string

        if (!name || !make || !model || !year || !licensePlate || !status) {
            throw new Error("Missing required fields")
        }

        await prisma.vehicle.create({
            data: {
                name,
                make,
                model,
                year,
                licensePlate,
                mileage: mileage || 0,
                status,
            }
        })

        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle created successfully' }
    } catch (error) {
        logger.error('Failed to create vehicle:', error)
        return { message: 'Failed to create vehicle' }
    }
}

export async function updateVehicle(id: string, _prevState: unknown, formData: FormData) {
    try {
        const session = await auth()
        if (!session?.user) throw new Error("Unauthorized")

        const name = formData.get('name') as string
        const make = formData.get('make') as string
        const model = formData.get('model') as string
        const year = parseInt(formData.get('year') as string)
        const licensePlate = formData.get('licensePlate') as string
        const mileage = parseInt(formData.get('mileage') as string)
        const status = formData.get('status') as string

        const data: any = {}
        if (name) data.name = name
        if (make) data.make = make
        if (model) data.model = model
        if (year) data.year = year
        if (licensePlate) data.licensePlate = licensePlate
        if (mileage) data.mileage = mileage
        if (status) data.status = status

        await prisma.vehicle.update({
            where: { id },
            data
        })

        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle updated successfully' }
    } catch (error) {
        logger.error('Failed to update vehicle:', error)
        return { message: 'Failed to update vehicle' }
    }
}

export async function deleteVehicle(id: string) {
    try {
        const session = await auth()
        if (!session?.user) throw new Error("Unauthorized")

        await prisma.vehicle.delete({
            where: { id }
        })

        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle deleted successfully' }
    } catch (error) {
        logger.error('Failed to delete vehicle:', error)
        return { message: 'Failed to delete vehicle' }
    }
}
