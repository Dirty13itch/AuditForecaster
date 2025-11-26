'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function saveReport(data: {
    name: string
    description?: string
    config: Prisma.InputJsonValue
}) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.savedReport.create({
        data: {
            name: data.name,
            description: data.description,
            config: data.config,
            userId: session.user.id
        }
    })

    revalidatePath('/dashboard/analytics/reports')
    return { success: true }
}

export async function getSavedReports() {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    return prisma.savedReport.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    })
}

export async function deleteReport(id: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.savedReport.delete({
        where: { id, userId: session.user.id }
    })

    revalidatePath('/dashboard/analytics/reports')
    return { success: true }
}
