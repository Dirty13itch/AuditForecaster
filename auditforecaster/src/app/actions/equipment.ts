'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { EquipmentClientSchema, EquipmentClientInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { addYears } from "date-fns"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { checkRateLimit } from "@/lib/security"

export async function createEquipment(data: EquipmentClientInput) {
    try {
        const session = await auth()
        if (session?.user?.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" }
        }

        const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
        if (!allowed) return { success: false, message: 'Too many requests. Please try again later.' }

        const validated = EquipmentClientSchema.parse(data)

        // Auto-calc next calibration if not provided
        let nextCal = validated.nextCalibration
        if (!nextCal && validated.lastCalibration) {
            nextCal = addYears(validated.lastCalibration, 1)
        }

        await prisma.equipment.create({
            data: {
                ...validated,
                nextCalibration: nextCal
            },
        })

        revalidatePath("/dashboard/assets/equipment")
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

        const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
        if (!allowed) return { success: false, message: 'Too many requests. Please try again later.' }

        const validated = EquipmentClientSchema.parse(data)

        await prisma.equipment.update({
            where: { id },
            data: validated,
        })

        revalidatePath("/dashboard/assets/equipment")
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

        const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
        if (!allowed) return { success: false, message: 'Too many requests. Please try again later.' }

        // Deep Layer Check: Verify Calibration Status
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

        // Transaction: Update Equipment AND Create Assignment Log
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

        revalidatePath("/dashboard/assets/equipment")
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

        const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
        if (!allowed) return { success: false, message: 'Too many requests. Please try again later.' }

        // Find the active assignment
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

        revalidatePath("/dashboard/assets/equipment")
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

        const { success: allowed } = await checkRateLimit(`user:${session.user.id}`, 'authenticated')
        if (!allowed) return { success: false, message: 'Too many requests. Please try again later.' }

        await prisma.equipment.delete({
            where: { id }
        })

        revalidatePath("/dashboard/assets/equipment")
        return { success: true, message: "Equipment deleted successfully" }
    } catch (error) {
        logger.error("Failed to delete equipment", { error })
        return { success: false, message: "Failed to delete equipment" }
    }
}
