'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logger"

const VehicleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    licensePlate: z.string().min(1, "License Plate is required"),
    vin: z.string().optional(),
    mileage: z.coerce.number().min(0),
    status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]).default("ACTIVE"),
    nextService: z.string().optional().transform(val => val ? new Date(val) : undefined),
    assignedTo: z.string().optional(),
})

import { auth } from "@/auth"

export async function createVehicle(prevState: unknown, formData: FormData) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        const validatedFields = VehicleSchema.parse({
            name: formData.get('name'),
            make: formData.get('make'),
            model: formData.get('model'),
            year: formData.get('year'),
            licensePlate: formData.get('licensePlate'),
            vin: formData.get('vin'),
            mileage: formData.get('mileage'),
            status: formData.get('status'),
            nextService: formData.get('nextService'),
            assignedTo: formData.get('assignedTo') || undefined,
        })

        await prisma.vehicle.create({
            data: validatedFields
        })

        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle created successfully' }
    } catch (e) {
        logger.error('Failed to create vehicle', {
            error: e instanceof Error ? e.message : String(e),
            vehicleName: formData.get('name')
        })
        return { message: 'Failed to create vehicle' }
    }
}

export async function updateVehicle(id: string, prevState: unknown, formData: FormData) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        const validatedFields = VehicleSchema.parse({
            name: formData.get('name'),
            make: formData.get('make'),
            model: formData.get('model'),
            year: formData.get('year'),
            licensePlate: formData.get('licensePlate'),
            vin: formData.get('vin'),
            mileage: formData.get('mileage'),
            status: formData.get('status'),
            nextService: formData.get('nextService'),
            assignedTo: formData.get('assignedTo') || undefined,
        })

        await prisma.vehicle.update({
            where: { id },
            data: validatedFields
        })

        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle updated successfully' }
    } catch (e) {
        logger.error('Failed to update vehicle', {
            vehicleId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to update vehicle' }
    }
}

export async function deleteVehicle(id: string) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        await prisma.vehicle.delete({
            where: { id }
        })
        revalidatePath('/dashboard/assets/fleet')
        return { message: 'Vehicle deleted successfully' }
    } catch (e) {
        logger.error('Failed to delete vehicle', {
            vehicleId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to delete vehicle' }
    }
}
