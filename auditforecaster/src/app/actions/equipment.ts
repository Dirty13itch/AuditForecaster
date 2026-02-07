'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { EquipmentClientSchema, EquipmentClientInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { addYears } from "date-fns"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { assertValidId } from "@/lib/utils"
import { logAudit } from "@/lib/audit"

export async function createEquipment(data: EquipmentClientInput) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        const validated = EquipmentClientSchema.parse(data)

        // Auto-calc next calibration if not provided
        let nextCal = validated.nextCalibration
        if (!nextCal && validated.lastCalibration) {
            nextCal = addYears(validated.lastCalibration, 1)
        }

        const equipment = await prisma.equipment.create({
            data: {
                ...validated,
                nextCalibration: nextCal
            },
        })

        await logAudit({
            entityType: 'Equipment',
            entityId: equipment.id,
            action: 'CREATE',
            after: { name: validated.name, serialNumber: validated.serialNumber },
            userId: session.user.id,
        })

        revalidatePath("/dashboard/equipment")
        return { success: true, message: "Equipment added to inventory" }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: "Invalid data", errors: error.errors }
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, message: "Serial Number already exists" }
        }
        logger.error("Failed to create equipment", { error })
        return { success: false, message: "Failed to create equipment" }
    }
}

export async function updateEquipment(id: string, data: EquipmentClientInput) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        try {
            assertValidId(id, 'Equipment ID')
        } catch {
            return { success: false, message: "Invalid ID format" }
        }

        const validated = EquipmentClientSchema.parse(data)

        const before = await prisma.equipment.findUnique({ where: { id } })
        if (!before) {
            return { success: false, message: "Equipment not found" }
        }

        await prisma.equipment.update({
            where: { id },
            data: validated,
        })

        await logAudit({
            entityType: 'Equipment',
            entityId: id,
            action: 'UPDATE',
            before: { name: before.name, status: before.status },
            after: { name: validated.name, status: validated.status },
            userId: session.user.id,
        })

        revalidatePath("/dashboard/equipment")
        return { success: true, message: "Equipment updated successfully" }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: "Invalid data", errors: error.errors }
        }
        logger.error("Failed to update equipment", { error })
        return { success: false, message: "Failed to update equipment" }
    }
}

export async function assignEquipment(equipmentId: string, userId: string) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        try {
            assertValidId(equipmentId, 'Equipment ID')
            assertValidId(userId, 'User ID')
        } catch {
            return { success: false, message: "Invalid ID format" }
        }

        const equipment = await prisma.equipment.findUnique({
            where: { id: equipmentId }
        })

        if (!equipment) {
            return { success: false, message: "Equipment not found" }
        }

        if (equipment.status === 'CALIBRATION_DUE' || equipment.status === 'REPAIR' || equipment.status === 'RETIRED') {
            return { success: false, message: `Cannot assign: Equipment is ${equipment.status}` }
        }

        if (equipment.nextCalibration && equipment.nextCalibration < new Date()) {
            return { success: false, message: "Compliance Alert: Calibration is overdue" }
        }

        await prisma.$transaction([
            prisma.equipment.update({
                where: { id: equipmentId },
                data: { assignedTo: userId }
            }),
            prisma.equipmentAssignment.create({
                data: {
                    equipmentId,
                    userId,
                    assignedAt: new Date()
                }
            })
        ])

        await logAudit({
            entityType: 'Equipment',
            entityId: equipmentId,
            action: 'UPDATE',
            before: { assignedTo: equipment.assignedTo },
            after: { assignedTo: userId },
            userId: session.user.id,
        })

        revalidatePath("/dashboard/equipment")
        return { success: true, message: "Equipment checked out successfully" }
    } catch (error) {
        logger.error("Failed to assign equipment", { error })
        return { success: false, message: "Failed to assign equipment" }
    }
}

export async function returnEquipment(equipmentId: string) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        try {
            assertValidId(equipmentId, 'Equipment ID')
        } catch {
            return { success: false, message: "Invalid ID format" }
        }

        const activeAssignment = await prisma.equipmentAssignment.findFirst({
            where: {
                equipmentId,
                returnedAt: null
            }
        })

        const queries: Prisma.PrismaPromise<any>[] = [
            prisma.equipment.update({
                where: { id: equipmentId },
                data: { assignedTo: null }
            })
        ]

        if (activeAssignment) {
            queries.push(
                prisma.equipmentAssignment.update({
                    where: { id: activeAssignment.id },
                    data: { returnedAt: new Date() }
                })
            )
        }

        await prisma.$transaction(queries)

        await logAudit({
            entityType: 'Equipment',
            entityId: equipmentId,
            action: 'UPDATE',
            after: { assignedTo: null, returned: true },
            userId: session.user.id,
        })

        revalidatePath("/dashboard/equipment")
        return { success: true, message: "Equipment returned to inventory" }
    } catch (error) {
        logger.error("Failed to return equipment", { error })
        return { success: false, message: "Failed to return equipment" }
    }
}

export async function deleteEquipment(id: string) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        try {
            assertValidId(id, 'Equipment ID')
        } catch {
            return { success: false, message: "Invalid ID format" }
        }

        const equipment = await prisma.equipment.findUnique({ where: { id } })
        if (!equipment) {
            return { success: false, message: "Equipment not found" }
        }

        await prisma.equipment.delete({
            where: { id }
        })

        await logAudit({
            entityType: 'Equipment',
            entityId: id,
            action: 'DELETE',
            before: { name: equipment.name, serialNumber: equipment.serialNumber },
            userId: session.user.id,
        })

        revalidatePath("/dashboard/equipment")
        return { success: true, message: "Equipment deleted successfully" }
    } catch (error) {
        logger.error("Failed to delete equipment", { error })
        return { success: false, message: "Failed to delete equipment" }
    }
}
