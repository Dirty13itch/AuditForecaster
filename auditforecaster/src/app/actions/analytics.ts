'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfMonth, subMonths, endOfMonth, eachDayOfInterval, format } from "date-fns"
import { predictNextMonth } from "@/lib/forecasting"
import { getJobPrice } from "@/lib/pricing"

export async function getAnalyticsData() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    // RBAC: Only Admins can view global analytics
    if (session.user.role !== 'ADMIN') {
        throw new Error("Forbidden: Insufficient permissions")
    }

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Layer 6: Observability - Performance Tracing
    const startTime = performance.now()

    // Parallelize Independent Queries
    const [
        invoicesCurrent,
        uninvoicedJobsCurrent,
        invoicesLast,
        uninvoicedJobsLast,
        jobCounts,
        topInspectors,
        recentJobs
    ] = await Promise.all([
        // 1. Current Revenue (Invoices)
        prisma.invoice.aggregate({
            where: {
                status: { in: ['PAID', 'SENT'] },
                createdAt: { gte: currentMonthStart },
                deletedAt: null // Soft Delete Filter
            },
            _sum: { totalAmount: true }
        }),
        // 2. Current Revenue (Uninvoiced)
        prisma.job.findMany({
            where: {
                status: 'COMPLETED',
                updatedAt: { gte: currentMonthStart },
                invoiceItems: { none: {} }
            },
            select: { builderId: true, subdivisionId: true }
        }),
        // 3. Last Month Revenue (Invoices)
        prisma.invoice.aggregate({
            where: {
                status: { in: ['PAID', 'SENT'] },
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
                deletedAt: null // Soft Delete Filter
            },
            _sum: { totalAmount: true }
        }),
        // 4. Last Month Revenue (Uninvoiced)
        prisma.job.findMany({
            where: {
                status: { in: ['COMPLETED', 'REVIEWED'] },
                updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
                invoiceItems: { none: {} }
            },
            select: { builderId: true, subdivisionId: true }
        }),
        // 5. Job Status Distribution
        prisma.job.groupBy({
            by: ['status'],
            _count: { status: true }
        }),
        // 6. Top Inspectors
        prisma.user.findMany({
            where: { role: 'INSPECTOR' },
            take: 5,
            include: {
                _count: {
                    select: { jobs: { where: { status: 'COMPLETED' } } }
                }
            },
            orderBy: {
                jobs: { _count: 'desc' }
            }
        }),
        // 7. Daily Trend
        prisma.job.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true }
        })
    ])

    const duration = performance.now() - startTime
    // Only log slow queries in development - use structured logging in production
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`[Performance] getAnalyticsData took ${duration.toFixed(2)}ms`)
    }

    // Process Revenue Calculations (Sequential due to pricing logic)

    let revenueFromUninvoiced = 0
    for (const job of uninvoicedJobsCurrent) {
        // @ts-expect-error - TS struggles with optional second arg here
        const price = await getJobPrice(job.builderId, job.subdivisionId)
        revenueFromUninvoiced += price
    }

    let revenueFromUninvoicedLast = 0
    for (const job of uninvoicedJobsLast) {
        // @ts-expect-error - TS struggles with optional second arg here
        const price = await getJobPrice(job.builderId, job.subdivisionId)
        revenueFromUninvoicedLast += price
    }

    const revenueCurrent = (invoicesCurrent._sum.totalAmount || 0) + revenueFromUninvoiced
    const revenueLast = (invoicesLast._sum.totalAmount || 0) + revenueFromUninvoicedLast
    const revenueGrowth = revenueLast === 0 ? 100 : ((revenueCurrent - revenueLast) / revenueLast) * 100

    // Forecasting
    // We use last month and current month (projected to end of month) to predict next month
    // Simple 2-point trend for now, but scalable to more history
    const projectedNextMonth = predictNextMonth([revenueLast, revenueCurrent])

    // Transform Daily Trend
    const dailyTrend = eachDayOfInterval({ start: thirtyDaysAgo, end: now }).map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const count = recentJobs.filter(job => format(job.createdAt, 'yyyy-MM-dd') === dateStr).length
        return { date: format(day, 'MMM dd'), count }
    })

    return {
        revenue: {
            current: revenueCurrent,
            last: revenueLast,
            growth: revenueGrowth,
            projected: projectedNextMonth
        },
        jobDistribution: jobCounts.map(j => ({ name: j.status, value: j._count.status })),
        topInspectors: topInspectors.map(i => ({ name: i.name || 'Unknown', completed: i._count.jobs })),
        dailyTrend
    }
}

export async function getPredictiveInsights() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    // Parallelize Insights Queries
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [atRiskJobs, calibrationWarning] = await Promise.all([
        prisma.job.findMany({
            where: {
                status: 'PENDING',
                createdAt: { lte: yesterday }
            },
            take: 5,
            select: { id: true, address: true, createdAt: true }
        }),
        prisma.equipment.findMany({
            where: {
                nextCalibration: { lte: nextWeek }
            },
            take: 5,
            select: { id: true, name: true, nextCalibration: true }
        })
    ])

    return {
        atRiskJobs: atRiskJobs.map(j => ({
            id: j.id,
            type: 'RISK',
            message: `Job at ${j.address} pending for > 24h`,
            severity: 'HIGH'
        })),
        calibrationWarnings: calibrationWarning.map(e => ({
            id: e.id,
            type: 'MAINTENANCE',
            message: `${e.name} requires calibration soon`,
            severity: 'MEDIUM'
        }))
    }
}
