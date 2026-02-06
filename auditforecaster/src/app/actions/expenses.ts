'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getPendingExpenses() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const expenses = await prisma.expense.findMany({
        where: {
            status: 'PENDING'
        },
        take: 100,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    image: true
                }
            },
            job: {
                select: {
                    address: true,
                    lotNumber: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    })

    return expenses
}

export async function processExpense(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    await prisma.expense.update({
        where: { id },
        data: {
            status,
            rejectionReason: status === 'REJECTED' ? rejectionReason : null
        }
    })

    revalidatePath('/dashboard/finances/expenses')
    revalidatePath('/dashboard/finances/expenses/approvals')

    return { success: true }
}
