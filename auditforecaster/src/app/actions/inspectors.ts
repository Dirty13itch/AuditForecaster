'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"
import { InspectorSchema, InspectorInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { auth } from "@/auth"

export async function createInspector(data: InspectorInput) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    try {
        const validated = InspectorSchema.parse(data)

        // Hash default password
        const hashedPassword = await bcrypt.hash("ChangeMe123!", 10)

        await prisma.user.create({
            data: {
                name: validated.name,
                email: validated.email,
                role: "INSPECTOR",
                passwordHash: hashedPassword,
                hersRaterId: validated.hersRaterId,
                baseRate: validated.baseRate,
                certifications: {
                    create: validated.certifications?.map(cert => ({
                        name: cert.name,
                        licenseNumber: cert.licenseNumber,
                        expirationDate: cert.expirationDate
                    }))
                },
                onboarding: validated.onboarding ? {
                    create: validated.onboarding
                } : undefined
            },
        })

        revalidatePath("/dashboard/team/inspectors")
        return { success: true, message: "Inspector onboarded successfully" }
    } catch (error) {
        logger.error("Failed to create inspector", { error })
        if (error instanceof z.ZodError) {
            return { success: false, message: "Invalid data", errors: error.errors }
        }
        // Handle unique email constraint
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, message: "Email already exists" }
        }
        return { success: false, message: "Failed to create inspector" }
    }
}

export async function updateInspector(id: string, data: InspectorInput) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    try {
        const validated = InspectorSchema.parse(data)

        // Transaction to handle certifications update (delete all and recreate is simplest for MVP)
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: {
                    name: validated.name,
                    email: validated.email,
                    hersRaterId: validated.hersRaterId,
                    baseRate: validated.baseRate,
                }
            })

            // Handle certifications if provided
            if (validated.certifications) {
                await tx.certification.deleteMany({ where: { userId: id } })
                if (validated.certifications.length > 0) {
                    await tx.certification.createMany({
                        data: validated.certifications.map(cert => ({
                            userId: id,
                            name: cert.name,
                            licenseNumber: cert.licenseNumber,
                            expirationDate: cert.expirationDate
                        }))
                    })
                }
            }

            // Handle Onboarding Checklist
            if (validated.onboarding) {
                await tx.onboardingChecklist.upsert({
                    where: { userId: id },
                    create: {
                        userId: id,
                        ...validated.onboarding
                    },
                    update: {
                        ...validated.onboarding
                    }
                })
            }
        })

        revalidatePath("/dashboard/team/inspectors")
        return { success: true, message: "Inspector updated successfully" }
    } catch (error) {
        logger.error("Failed to update inspector", { error })
        return { success: false, message: "Failed to update inspector" }
    }
}

export async function deleteInspector(id: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    try {
        await prisma.user.delete({
            where: { id },
        })

        revalidatePath("/dashboard/team/inspectors")
        return { success: true, message: "Inspector offboarded successfully" }
    } catch (error) {
        logger.error("Failed to delete inspector", { error })
        return { success: false, message: "Failed to delete inspector" }
    }
}
