'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getJobProfitability(jobId: string) {
    const session = await auth()
    if (!session?.user) {
        throw new Error("Unauthorized")
    }

    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            invoiceItems: true,
            expenses: true,
            payout: true, // To check if paid
            // We need mileage. MileageLog is linked to Vehicle, not Job directly in schema?
            // Let's check schema. MileageLog has no Job relation. 
            // We might need to approximate mileage based on job distance or check if we added a relation.
            // Checking schema... MileageLog is linked to Vehicle. 
            // For now, let's assume we use the 'distance' from the job if we had it, or just 0 for MVP if not linked.
            // Wait, Job has latitude/longitude. We can calculate distance from "Office" (Settings) or just use a placeholder.
            // Actually, let's look at the Expense model. It has a jobId.
            // Maybe we should add a 'mileage' field to Job or link MileageLog to Job?
            // For this phase, let's rely on Expenses linked to the Job.
        }
    })

    if (!job) throw new Error("Job not found")

    // 1. Revenue
    // Sum of invoice items linked to this job
    // Note: InvoiceItems might be linked to the job.
    const revenue = job.invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)

    // 2. Costs
    // A. Labor (Payout Amount)
    // If payoutAmount is stored (snapshot), use it. 
    // If not, and there is a payout linked, maybe we can infer? 
    // Or if not paid yet, estimate based on 70% rule?
    // Let's use payoutAmount if available, else estimate 70% of revenue as "Estimated Labor"
    const laborCost = job.payoutAmount || (revenue * 0.70)

    // B. Expenses
    const expenseCost = job.expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // C. Mileage
    // Placeholder for now as we don't have direct Job->MileageLog link yet.
    // We'll assume 0 or add a fixed "Trip Charge" cost if we wanted.
    const mileageCost = 0

    const totalCost = laborCost + expenseCost + mileageCost
    const netProfit = revenue - totalCost
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return {
        revenue,
        costs: {
            labor: laborCost,
            expenses: expenseCost,
            mileage: mileageCost,
            total: totalCost
        },
        netProfit,
        margin
    }
}

export async function getProfitabilityDashboard(startDate: Date, endDate: Date) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const jobs = await prisma.job.findMany({
        where: {
            status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] },
            scheduledDate: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            invoiceItems: true,
            expenses: true
        }
    })

    let totalRevenue = 0
    let totalCost = 0
    const jobPerformance = []

    for (const job of jobs) {
        const revenue = job.invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)

        // Estimate labor if not set (using same logic as above)
        const laborCost = job.payoutAmount || (revenue * 0.70)
        const expenseCost = job.expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const cost = laborCost + expenseCost

        totalRevenue += revenue
        totalCost += cost

        jobPerformance.push({
            id: job.id,
            address: job.address,
            date: job.scheduledDate,
            revenue,
            cost,
            profit: revenue - cost,
            margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
        })
    }

    // Sort by profit
    jobPerformance.sort((a, b) => b.profit - a.profit)

    return {
        metrics: {
            totalRevenue,
            totalCost,
            netProfit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        },
        topJobs: jobPerformance.slice(0, 5),
        bottomJobs: jobPerformance.slice(-5).reverse()
    }
}
