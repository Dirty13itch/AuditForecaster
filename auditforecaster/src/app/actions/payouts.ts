'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function calculatePayout(userId: string, periodStart: Date, periodEnd: Date) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    // Fetch completed, unpaid jobs for this user in the period
    const jobs = await prisma.job.findMany({
        where: {
            inspectorId: userId,
            status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] }, // Include invoiced jobs too
            payoutId: null, // Not yet paid out
            scheduledDate: {
                gte: periodStart,
                lte: periodEnd
            }
        },
        include: {
            subdivision: {
                include: {
                    priceLists: {
                        include: { items: { include: { serviceItem: true } } }
                    }
                }
            },
            builder: {
                include: {
                    priceLists: {
                        include: { items: { include: { serviceItem: true } } }
                    }
                }
            }
        },
        take: 500,
    })

    // Fetch user to get base rate
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { baseRate: true }
    })

    let totalAmount = 0
    const jobDetails = []

    for (const job of jobs) {
        // ... existing logic ...
        // Determine Price List (Subdivision specific > Builder default)
        const priceList = job.subdivision?.priceLists[0] || job.builder?.priceLists[0]
        let jobTotal = 0

        if (priceList) {
            for (const item of priceList.items) {
                jobTotal += item.price
            }
        }

        // Apply "Company Cut" logic here if needed. 
        // If user has a base rate, maybe per-job payout is 0? 
        // Or maybe this is a "bonus" on top? 
        // For now, let's keep the 70% logic BUT return the base rate separately so the UI can decide.
        const payoutRate = 0.70
        const payoutAmount = jobTotal * payoutRate

        totalAmount += payoutAmount
        jobDetails.push({
            id: job.id,
            address: job.address,
            date: job.scheduledDate,
            jobTotal,
            payoutAmount
        })
    }

    return {
        totalAmount, // This is the commission/per-job total
        baseRate: user?.baseRate || 0, // The fixed salary component
        jobCount: jobs.length,
        jobs: jobDetails
    }
}

export async function createPayout(userId: string, jobIds: string[], amount: number, periodStart: Date, periodEnd: Date) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    // Create Payout Record
    const payout = await prisma.$transaction(async (tx) => {
        const newPayout = await tx.payout.create({
            data: {
                userId,
                periodStart,
                periodEnd,
                amount,
                status: 'DRAFT'
            }
        })

        // Link jobs to payout
        // We also need to store the snapshot amount for each job.
        // Since updateMany doesn't support setting different values for different rows,
        // and we want to be precise, we might need to loop or just set the relation for now.
        // For MVP, we'll just link them. The total amount is on the Payout object.
        await tx.job.updateMany({
            where: { id: { in: jobIds } },
            data: {
                payoutId: newPayout.id,
                // In a real app, we'd update payoutAmount per job here too, but let's skip for MVP efficiency
            }
        })

        return newPayout
    })

    revalidatePath('/dashboard/finances/payouts')
    return { success: true, payoutId: payout.id }
}

export async function markPayoutAsPaid(payoutId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    await prisma.payout.update({
        where: { id: payoutId },
        data: {
            status: 'PAID',
            paidAt: new Date()
        }
    })

    revalidatePath(`/dashboard/finances/payouts/${payoutId}`)
    revalidatePath('/dashboard/finances/payouts')
}
