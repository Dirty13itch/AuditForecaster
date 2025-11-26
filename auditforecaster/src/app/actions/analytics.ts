'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, format } from "date-fns"

export async function getExecutiveMetrics(dateRange?: { from: Date, to: Date }) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    const start = dateRange?.from || startOfMonth(new Date())
    const end = dateRange?.to || endOfMonth(new Date())

    // 1. Revenue (Sum of Invoice Items)
    // We need to join Invoice -> InvoiceItems
    const revenueAgg = await prisma.invoiceItem.aggregate({
        _sum: {
            totalPrice: true
        },
        where: {
            invoice: {
                status: { not: 'VOID' },
                date: {
                    gte: start,
                    lte: end
                }
            }
        }
    })
    const revenue = revenueAgg._sum.totalPrice || 0

    // 2. Costs (Payouts + Expenses)
    // Payouts
    const payoutsAgg = await prisma.payout.aggregate({
        _sum: {
            amount: true
        },
        where: {
            status: 'PAID',
            periodEnd: {
                gte: start,
                lte: end
            }
        }
    })
    const payouts = payoutsAgg._sum.amount || 0

    // Expenses
    const expensesAgg = await prisma.expense.aggregate({
        _sum: {
            amount: true
        },
        where: {
            status: 'APPROVED',
            date: {
                gte: start,
                lte: end
            }
        }
    })
    const expenses = expensesAgg._sum.amount || 0

    const totalCosts = payouts + expenses
    const netProfit = revenue - totalCosts
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    // 3. Inspection Volume
    const inspectionCount = await prisma.job.count({
        where: {
            status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] },
            scheduledDate: {
                gte: start,
                lte: end
            }
        }
    })

    return {
        revenue,
        costs: totalCosts,
        netProfit,
        margin,
        inspectionCount
    }
}

export async function getRevenueTrend() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    // Last 30 days trend
    const end = new Date()
    const start = subMonths(end, 1)

    const invoices = await prisma.invoice.findMany({
        where: {
            status: { not: 'VOID' },
            date: {
                gte: start,
                lte: end
            }
        },
        include: {
            items: true
        }
    })

    // Group by day
    const days = eachDayOfInterval({ start, end })
    const trend = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dailyRevenue = invoices
            .filter(inv => format(inv.date, 'yyyy-MM-dd') === dateStr)
            .reduce((sum, inv) => sum + inv.totalAmount, 0)

        return {
            date: format(day, 'MMM dd'),
            revenue: dailyRevenue
        }
    })

    return trend
}
