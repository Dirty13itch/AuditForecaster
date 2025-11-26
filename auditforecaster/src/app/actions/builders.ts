'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logger"

const BuilderSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
})

import { auth } from "@/auth"

export async function createBuilder(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    try {
        const rawData = {
            name: formData.get('name'),
            email: formData.get('email') || undefined,
            phone: formData.get('phone') || undefined,
            address: formData.get('address') || undefined,
        }

        const validatedFields = BuilderSchema.parse(rawData)

        await prisma.builder.create({
            data: {
                name: validatedFields.name,
                email: validatedFields.email || null,
                phone: validatedFields.phone || null,
                address: validatedFields.address || null,
            }
        })

        revalidatePath('/dashboard/builders')
        return { message: 'Builder created successfully' }
    } catch (e) {
        logger.error('Failed to create builder', {
            error: e instanceof Error ? e.message : String(e),
            builderName: formData.get('name')
        })
        return { message: 'Failed to create builder' }
    }
}

export async function updateBuilder(id: string, prevState: unknown, formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    try {
        const rawData = {
            name: formData.get('name'),
            email: formData.get('email') || undefined,
            phone: formData.get('phone') || undefined,
            address: formData.get('address') || undefined,
        }

        const validatedFields = BuilderSchema.parse(rawData)

        await prisma.builder.update({
            where: { id },
            data: {
                name: validatedFields.name,
                email: validatedFields.email || null,
                phone: validatedFields.phone || null,
                address: validatedFields.address || null,
            }
        })

        revalidatePath('/dashboard/builders')
        return { message: 'Builder updated successfully' }
    } catch (e) {
        logger.error('Failed to update builder', {
            builderId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to update builder' }
    }
}

export async function deleteBuilder(id: string) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    try {
        await prisma.builder.delete({
            where: { id }
        })
        revalidatePath('/dashboard/builders')
        return { message: 'Builder deleted successfully' }
    } catch (e) {
        logger.error('Failed to delete builder', {
            builderId: id,
            error: e instanceof Error ? e.message : String(e)
        })
        return { message: 'Failed to delete builder' }
    }
}
