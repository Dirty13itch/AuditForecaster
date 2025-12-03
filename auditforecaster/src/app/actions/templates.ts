'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { z } from "zod"

const TemplateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    checklistItems: z.array(z.object({
        label: z.string().min(1)
    }))
})

export async function createTemplate(formData: FormData) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    const name = formData.get('name') as string
    const checklistItemsJson = formData.get('checklistItems') as string

    let checklistItems
    try {
        checklistItems = JSON.parse(checklistItemsJson)
    } catch {
        throw new Error("Invalid checklist items format")
    }

    const result = TemplateSchema.safeParse({ name, checklistItems })
    if (!result.success) {
        throw new Error(result.error.errors[0]?.message || "Validation failed")
    }

    await prisma.reportTemplate.create({
        data: {
            name: result.data.name,
            checklistItems: JSON.stringify(result.data.checklistItems),
        }
    })

    revalidatePath('/dashboard/reports/templates')
}

export async function updateTemplate(id: string, formData: FormData) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    const name = formData.get('name') as string
    const checklistItemsJson = formData.get('checklistItems') as string
    const isDefault = formData.get('isDefault') === 'true'

    let checklistItems
    try {
        checklistItems = JSON.parse(checklistItemsJson)
    } catch {
        throw new Error("Invalid checklist items format")
    }

    const result = TemplateSchema.safeParse({ name, checklistItems })
    if (!result.success) {
        throw new Error(result.error.errors[0]?.message || "Validation failed")
    }

    // If setting as default, unset all others
    if (isDefault) {
        await prisma.reportTemplate.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        })
    }

    await prisma.reportTemplate.update({
        where: { id },
        data: {
            name: result.data.name,
            checklistItems: JSON.stringify(result.data.checklistItems),
            isDefault,
        }
    })

    revalidatePath('/dashboard/reports/templates')
}

export async function deleteTemplate(id: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== 'ADMIN') throw new Error("Unauthorized: Admin access required")

    const result = z.string().uuid().safeParse(id)
    if (!result.success) {
        throw new Error("Invalid template ID")
    }

    await prisma.reportTemplate.delete({
        where: { id: result.data }
    })

    revalidatePath('/dashboard/reports/templates')
}


