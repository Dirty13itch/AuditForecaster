'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export interface DashboardStats {
    totalJobs: number
    completedThisMonth: number
    pendingInspections: number
    monthlyRevenue: number
    trends: {
        totalJobs: number        // percentage change from last month
        completed: number        // percentage change from last month
        inspections: number      // percentage change from last month
        revenue: number          // percentage change from last month
    }
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [
        totalJobs,
        completedThisMonth,
        completedLastMonth,
        pendingInspections,
        pendingInspectionsLastMonth,
        revenueThisMonth,
        revenueLastMonth,
        jobsCreatedThisMonth,
        jobsCreatedLastMonth,
    ] = await prisma.$transaction([
        // Total jobs across all time
        prisma.job.count(),

        // Jobs completed this month (status moved to COMPLETED, REVIEWED, or INVOICED)
        prisma.job.count({
            where: {
                status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] },
                updatedAt: { gte: currentMonthStart },
            },
        }),

        // Jobs completed last month (for trend)
        prisma.job.count({
            where: {
                status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] },
                updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
            },
        }),

        // Pending inspections (inspections still in progress)
        prisma.inspection.count({
            where: { status: 'IN_PROGRESS' },
        }),

        // Pending inspections last month (for trend)
        prisma.inspection.count({
            where: {
                status: 'IN_PROGRESS',
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
            },
        }),

        // Revenue this month from paid/sent invoices
        prisma.invoice.aggregate({
            where: {
                status: { in: ['PAID', 'SENT'] },
                createdAt: { gte: currentMonthStart },
                deletedAt: null,
            },
            _sum: { totalAmount: true },
        }),

        // Revenue last month (for trend)
        prisma.invoice.aggregate({
            where: {
                status: { in: ['PAID', 'SENT'] },
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
                deletedAt: null,
            },
            _sum: { totalAmount: true },
        }),

        // Jobs created this month (for total jobs trend)
        prisma.job.count({
            where: { createdAt: { gte: currentMonthStart } },
        }),

        // Jobs created last month (for total jobs trend)
        prisma.job.count({
            where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        }),
    ])

    const currentRevenue = revenueThisMonth._sum.totalAmount ?? 0
    const previousRevenue = revenueLastMonth._sum.totalAmount ?? 0

    function calcTrend(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100)
    }

    return {
        totalJobs,
        completedThisMonth,
        pendingInspections,
        monthlyRevenue: currentRevenue,
        trends: {
            totalJobs: calcTrend(jobsCreatedThisMonth, jobsCreatedLastMonth),
            completed: calcTrend(completedThisMonth, completedLastMonth),
            inspections: calcTrend(pendingInspections, pendingInspectionsLastMonth),
            revenue: calcTrend(currentRevenue, previousRevenue),
        },
    }
}
