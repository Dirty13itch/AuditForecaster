'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logger"

const EquipmentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.string().min(1, "Type is required"),
    serialNumber: z.string().min(1, "Serial Number is required"),
    status: z.string().min(1, "Status is required"),
    lastCalibration: z.string().optional().nullable(),
    nextCalibration: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

import { auth } from "@/auth"

export async function createEquipment(prevState: unknown, formData: FormData) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        const rawData = {
            name: formData.get('name'),
            type: formData.get('type'),
            serialNumber: formData.get('serialNumber'),
            status: formData.get('status'),
            lastCalibration: formData.get('lastCalibration') || null,
            nextCalibration: formData.get('nextCalibration') || null,
            assignedTo: formData.get('assignedTo') || null,
            notes: formData.get('notes'),
        }

        const validatedFields = EquipmentSchema.parse(rawData)

        // Check for duplicate serial number
        const existing = await prisma.equipment.findUnique({
            where: { serialNumber: validatedFields.serialNumber }
        })

        if (existing) {
            return { message: 'Equipment with this Serial Number already exists' }
        }

        await prisma.equipment.create({
            data: {
                name: validatedFields.name,
                type: validatedFields.type,
                serialNumber: validatedFields.serialNumber,
                status: validatedFields.status,
                lastCalibration: validatedFields.lastCalibration ? new Date(validatedFields.lastCalibration) : null,
                nextCalibration: validatedFields.nextCalibration ? new Date(validatedFields.nextCalibration) : null,
                assignedTo: validatedFields.assignedTo === "unassigned" ? null : validatedFields.assignedTo,
                notes: validatedFields.notes,
            }
        })

        revalidatePath('/dashboard/assets/equipment')
        return { message: 'Equipment added successfully' }
    } catch (e) {
        logger.error('Failed to add equipment', {
            error: e instanceof Error ? e.message : String(e),
            equipmentName: formData.get('name'),
            serialNumber: formData.get('serialNumber')
        })
        return { message: 'Failed to add equipment' }
    }
}

export async function updateEquipment(id: string, prevState: unknown, formData: FormData) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        const rawData = {
            name: formData.get('name'),
            type: formData.get('type'),
            serialNumber: formData.get('serialNumber'),
            status: formData.get('status'),
            lastCalibration: formData.get('lastCalibration') || null,
            nextCalibration: formData.get('nextCalibration') || null,
            assignedTo: formData.get('assignedTo') || null,
            notes: formData.get('notes'),
        }

        const validatedFields = EquipmentSchema.parse(rawData)

        await prisma.equipment.update({
            where: { id },
            data: {
                name: validatedFields.name,
                type: validatedFields.type,
                serialNumber: validatedFields.serialNumber,
                status: validatedFields.status,
                lastCalibration: validatedFields.lastCalibration ? new Date(validatedFields.lastCalibration) : null,
                nextCalibration: validatedFields.nextCalibration ? new Date(validatedFields.nextCalibration) : null,
                assignedTo: validatedFields.assignedTo === "unassigned" ? null : validatedFields.assignedTo,
                notes: validatedFields.notes,
            }
        })

        revalidatePath('/dashboard/assets/equipment')
        return { message: 'Equipment updated successfully' }
    } catch (e) {
        logger.error('Failed to update equipment', {
            equipmentId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to update equipment' }
    }
}

export async function deleteEquipment(id: string) {
    const session = await auth()
    if (!session) return { message: 'Unauthorized' }
    try {
        await prisma.equipment.delete({
            where: { id }
        })
        revalidatePath('/dashboard/assets/equipment')
        return { message: 'Equipment deleted successfully' }
    } catch (e) {
        logger.error('Failed to delete equipment', {
            equipmentId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to delete equipment' }
    }
}
