'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// IRS standard mileage rate for 2024 business use
const MILEAGE_RATE_PER_MILE = 0.67

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
            payout: true,
            mileageLogs: {
                where: { purpose: 'Business' } // Only count business mileage
            }
        }
    })

    if (!job) throw new Error("Job not found")

    // 1. Revenue - Sum of invoice items linked to this job
    const revenue = job.invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)

    // 2. Costs
    // A. Labor (Payout Amount) - use actual if available, otherwise estimate
    const laborCost = job.payoutAmount || (revenue * 0.70)

    // B. Expenses - direct expenses linked to job
    const expenseCost = job.expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // C. Mileage - calculate from linked mileage logs using IRS rate
    const totalMiles = job.mileageLogs.reduce((sum, log) => sum + log.distance, 0)
    const mileageCost = totalMiles * MILEAGE_RATE_PER_MILE

    const totalCost = laborCost + expenseCost + mileageCost
    const netProfit = revenue - totalCost
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return {
        revenue,
        costs: {
            labor: laborCost,
            expenses: expenseCost,
            mileage: mileageCost,
            mileageDetails: {
                totalMiles,
                ratePerMile: MILEAGE_RATE_PER_MILE
            },
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
            expenses: true,
            mileageLogs: {
                where: { purpose: 'Business' }
            }
        }
    })

    let totalRevenue = 0
    let totalCost = 0
    let totalMileage = 0
    const jobPerformance = []

    for (const job of jobs) {
        const revenue = job.invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)

        // Calculate actual costs
        const laborCost = job.payoutAmount || (revenue * 0.70)
        const expenseCost = job.expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const jobMiles = job.mileageLogs.reduce((sum, log) => sum + log.distance, 0)
        const mileageCost = jobMiles * MILEAGE_RATE_PER_MILE
        const cost = laborCost + expenseCost + mileageCost

        totalRevenue += revenue
        totalCost += cost
        totalMileage += jobMiles

        jobPerformance.push({
            id: job.id,
            address: job.address,
            date: job.scheduledDate,
            revenue,
            cost,
            mileage: jobMiles,
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
            totalMileage,
            mileageCost: totalMileage * MILEAGE_RATE_PER_MILE,
            netProfit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        },
        topJobs: jobPerformance.slice(0, 5),
        bottomJobs: jobPerformance.slice(-5).reverse()
    }
}
