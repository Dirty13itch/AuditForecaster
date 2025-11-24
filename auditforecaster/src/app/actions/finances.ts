'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { z } from "zod"

const ClassifyMileageSchema = z.object({
    id: z.string().uuid(),
    purpose: z.enum(["Business", "Personal"])
})

const ClassifyExpenseSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["CLASSIFIED"]),
    category: z.string().min(1)
})

export async function classifyMileage(id: string, purpose: "Business" | "Personal") {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const result = ClassifyMileageSchema.safeParse({ id, purpose })
    if (!result.success) {
        throw new Error(result.error.errors[0].message)
    }

    await prisma.mileageLog.update({
        where: { id },
        data: {
            status: "APPROVED",
            purpose
        }
    })
    revalidatePath('/dashboard/finances/mileage/classify')
    revalidatePath('/dashboard/finances')
}

export async function classifyExpense(id: string, status: "CLASSIFIED", category: string) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const result = ClassifyExpenseSchema.safeParse({ id, status, category })
    if (!result.success) {
        throw new Error(result.error.errors[0].message)
    }

    // In a real app, you might map "Business" / "Personal" to specific GL codes
    // For now, we just save the category string
    await prisma.expense.update({
        where: { id },
        data: {
            status,
            category
        }
    })
    revalidatePath('/dashboard/finances/expenses/classify')
    revalidatePath('/dashboard/finances')
}

