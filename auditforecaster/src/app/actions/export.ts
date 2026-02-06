'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// ---------------------------------------------------------------------------
// CSV helper
// ---------------------------------------------------------------------------

function toCSV(headers: string[], rows: string[][]): string {
    const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`
    return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return ''
    const date = typeof d === 'string' ? new Date(d) : d
    return date.toISOString().split('T')[0] ?? ''
}

function formatCurrency(n: number | null | undefined): string {
    if (n == null) return '0.00'
    return n.toFixed(2)
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface DateRangeFilter {
    startDate?: Date
    endDate?: Date
}

type ExportSuccess = { success: true; csv: string; filename: string }
type ExportFailure = { success: false; message: string }
type ExportResult = ExportSuccess | ExportFailure

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<ExportFailure | null> {
    const session = await auth()
    if (!session?.user) {
        return { success: false, message: 'Unauthorized: Authentication required' }
    }
    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Unauthorized: Admin access required' }
    }
    return null
}

// ---------------------------------------------------------------------------
// 1. Export Jobs CSV
// ---------------------------------------------------------------------------

export async function exportJobsCSV(filters?: DateRangeFilter): Promise<ExportResult> {
    const authError = await requireAdmin()
    if (authError) return authError

    try {
        const where: Record<string, unknown> = {}

        if (filters?.startDate || filters?.endDate) {
            const createdAt: Record<string, Date> = {}
            if (filters.startDate) createdAt.gte = filters.startDate
            if (filters.endDate) createdAt.lte = filters.endDate
            where.createdAt = createdAt
        }

        const jobs = await prisma.job.findMany({
            where,
            include: {
                builder: true,
                subdivision: true,
                inspector: {
                    select: { id: true, name: true, email: true }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10000,
        })

        const headers = [
            'ID',
            'Lot Number',
            'Street Address',
            'City',
            'Full Address',
            'Status',
            'Scheduled Date',
            'Builder Name',
            'Builder Email',
            'Subdivision',
            'Inspector Name',
            'Inspector Email',
            'HERS Score',
            'Payout Amount',
            'Created At',
            'Updated At',
        ]

        const rows = jobs.map(job => [
            job.id,
            job.lotNumber,
            job.streetAddress,
            job.city,
            job.address,
            job.status,
            formatDate(job.scheduledDate),
            job.builder?.name ?? '',
            job.builder?.email ?? '',
            job.subdivision?.name ?? '',
            job.inspector?.name ?? '',
            job.inspector?.email ?? '',
            job.hersScore != null ? String(job.hersScore) : '',
            formatCurrency(job.payoutAmount),
            formatDate(job.createdAt),
            formatDate(job.updatedAt),
        ])

        const csv = toCSV(headers, rows)
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `jobs-export-${timestamp}.csv`

        return { success: true, csv, filename }
    } catch (error) {
        console.error('Failed to export jobs CSV:', error)
        return { success: false, message: 'Failed to export jobs data' }
    }
}

// ---------------------------------------------------------------------------
// 2. Export Invoices CSV
// ---------------------------------------------------------------------------

export async function exportInvoicesCSV(filters?: DateRangeFilter): Promise<ExportResult> {
    const authError = await requireAdmin()
    if (authError) return authError

    try {
        const where: Record<string, unknown> = {}

        if (filters?.startDate || filters?.endDate) {
            const date: Record<string, Date> = {}
            if (filters.startDate) date.gte = filters.startDate
            if (filters.endDate) date.lte = filters.endDate
            where.date = date
        }

        // Exclude soft-deleted invoices
        where.deletedAt = null

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                builder: {
                    select: { id: true, name: true, email: true }
                },
                items: {
                    include: {
                        job: {
                            select: { id: true, address: true, lotNumber: true }
                        }
                    }
                },
            },
            orderBy: { date: 'desc' },
            take: 10000,
        })

        const headers = [
            'Invoice ID',
            'Invoice Number',
            'Date',
            'Due Date',
            'Status',
            'Total Amount',
            'Builder Name',
            'Builder Email',
            'Line Items Count',
            'Job Addresses',
            'Notes',
            'Sent At',
            'Paid At',
            'Created At',
        ]

        const rows = invoices.map(invoice => {
            // Collect unique job addresses from line items
            const jobAddresses = invoice.items
                .filter(item => item.job)
                .map(item => item.job!.address)
                .filter((addr, idx, arr) => arr.indexOf(addr) === idx)
                .join('; ')

            return [
                invoice.id,
                invoice.number,
                formatDate(invoice.date),
                formatDate(invoice.dueDate),
                invoice.status,
                formatCurrency(invoice.totalAmount),
                invoice.builder?.name ?? '',
                invoice.builder?.email ?? '',
                String(invoice.items.length),
                jobAddresses,
                invoice.notes ?? '',
                formatDate(invoice.sentAt),
                formatDate(invoice.paidAt),
                formatDate(invoice.createdAt),
            ]
        })

        const csv = toCSV(headers, rows)
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `invoices-export-${timestamp}.csv`

        return { success: true, csv, filename }
    } catch (error) {
        console.error('Failed to export invoices CSV:', error)
        return { success: false, message: 'Failed to export invoices data' }
    }
}

// ---------------------------------------------------------------------------
// 3. Export Expenses CSV
// ---------------------------------------------------------------------------

export async function exportExpensesCSV(dateRange?: DateRangeFilter): Promise<ExportResult> {
    const authError = await requireAdmin()
    if (authError) return authError

    try {
        const where: Record<string, unknown> = {}

        if (dateRange?.startDate || dateRange?.endDate) {
            const date: Record<string, Date> = {}
            if (dateRange.startDate) date.gte = dateRange.startDate
            if (dateRange.endDate) date.lte = dateRange.endDate
            where.date = date
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                job: {
                    select: { id: true, address: true, lotNumber: true }
                },
            },
            orderBy: { date: 'desc' },
            take: 10000,
        })

        const headers = [
            'Expense ID',
            'Date',
            'Amount',
            'Category',
            'Status',
            'Description',
            'User Name',
            'User Email',
            'Job Address',
            'Job Lot Number',
            'Receipt URL',
            'Rejection Reason',
            'Created At',
        ]

        const rows = expenses.map(expense => [
            expense.id,
            formatDate(expense.date),
            formatCurrency(expense.amount),
            expense.category ?? '',
            expense.status,
            expense.description ?? '',
            expense.user?.name ?? '',
            expense.user?.email ?? '',
            expense.job?.address ?? '',
            expense.job?.lotNumber ?? '',
            expense.receiptUrl ?? '',
            expense.rejectionReason ?? '',
            formatDate(expense.createdAt),
        ])

        const csv = toCSV(headers, rows)
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `expenses-export-${timestamp}.csv`

        return { success: true, csv, filename }
    } catch (error) {
        console.error('Failed to export expenses CSV:', error)
        return { success: false, message: 'Failed to export expenses data' }
    }
}
