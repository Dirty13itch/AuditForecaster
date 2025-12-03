'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function exportData(type: 'JOBS' | 'INVOICES' | 'PAYOUTS') {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    let data: unknown[] = []
    let headers: string[] = []

    if (type === 'JOBS') {
        data = await prisma.job.findMany({
            include: { builder: true, subdivision: true, inspector: true },
            orderBy: { createdAt: 'desc' },
            take: 1000 // Limit for MVP
        })
        headers = ['ID', 'Lot Number', 'Address', 'Status', 'Scheduled Date', 'Completed Date', 'Builder', 'Subdivision', 'Inspector', 'Payout Amount']
    } else if (type === 'INVOICES') {
        data = await prisma.invoice.findMany({
            include: { builder: true },
            orderBy: { date: 'desc' },
            take: 1000
        })
        headers = ['ID', 'Invoice Number', 'Date', 'Status', 'Total Amount', 'Builder']
    } else if (type === 'PAYOUTS') {
        data = await prisma.payout.findMany({
            include: { user: true },
            orderBy: { periodEnd: 'desc' },
            take: 1000
        })
        headers = ['ID', 'Period Start', 'Period End', 'Status', 'Amount', 'User']
    }

    // Convert to CSV
    const csvRows = [headers.join(',')]

    for (const r of data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = r as any
        const values = headers.map(header => {
            let val = ''
            if (type === 'JOBS') {
                if (header === 'ID') val = row.id
                if (header === 'Lot Number') val = row.lotNumber
                if (header === 'Address') val = row.address
                if (header === 'Status') val = row.status
                if (header === 'Scheduled Date') val = row.scheduledDate ? new Date(row.scheduledDate).toISOString() : ''
                if (header === 'Completed Date') val = row.completedAt ? new Date(row.completedAt).toISOString() : ''
                if (header === 'Builder') val = row.builder?.name || ''
                if (header === 'Subdivision') val = row.subdivision?.name || ''
                if (header === 'Inspector') val = row.inspector?.name || ''
                if (header === 'Payout Amount') val = row.payoutAmount?.toString() || '0'
            } else if (type === 'INVOICES') {
                if (header === 'ID') val = row.id
                if (header === 'Invoice Number') val = row.invoiceNumber
                if (header === 'Date') val = new Date(row.date).toISOString()
                if (header === 'Status') val = row.status
                if (header === 'Total Amount') val = row.totalAmount.toString()
                if (header === 'Builder') val = row.builder?.name || ''
            } else if (type === 'PAYOUTS') {
                if (header === 'ID') val = row.id
                if (header === 'Period Start') val = new Date(row.periodStart).toISOString()
                if (header === 'Period End') val = new Date(row.periodEnd).toISOString()
                if (header === 'Status') val = row.status
                if (header === 'Amount') val = row.amount.toString()
                if (header === 'User') val = row.user?.name || ''
            }

            // Escape quotes
            const escaped = val.replace(/"/g, '""')
            return `"${escaped}"`
        })
        csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
}
