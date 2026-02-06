/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportJobsCSV, exportInvoicesCSV, exportExpensesCSV } from '../export'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn(),
        },
        invoice: {
            findMany: vi.fn(),
        },
        expense: {
            findMany: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

describe('export actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'user-1', role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // exportJobsCSV
    // -----------------------------------------------------------------------
    describe('exportJobsCSV', () => {
        it('should export jobs as CSV successfully', async () => {
            const mockJobs = [
                {
                    id: 'job-1',
                    lotNumber: 'Lot 5',
                    streetAddress: '123 Main St',
                    city: 'Austin',
                    address: '123 Main St, Austin',
                    status: 'COMPLETED',
                    scheduledDate: new Date('2025-06-15'),
                    builder: { name: 'Acme Builders', email: 'acme@test.com' },
                    subdivision: { name: 'Sunset Ridge' },
                    inspector: { id: 'insp-1', name: 'John Smith', email: 'john@test.com' },
                    hersScore: 55,
                    payoutAmount: 150.0,
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-06-15'),
                },
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await exportJobsCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"ID"')
                expect(result.csv).toContain('"Lot Number"')
                expect(result.csv).toContain('"Street Address"')
                expect(result.csv).toContain('"City"')
                expect(result.csv).toContain('"Status"')
                expect(result.csv).toContain('"Builder Name"')
                expect(result.csv).toContain('"Inspector Name"')
                expect(result.csv).toContain('"HERS Score"')
                expect(result.csv).toContain('"Payout Amount"')
                expect(result.csv).toContain('"job-1"')
                expect(result.csv).toContain('"Lot 5"')
                expect(result.csv).toContain('"Acme Builders"')
                expect(result.csv).toContain('"Sunset Ridge"')
                expect(result.csv).toContain('"John Smith"')
                expect(result.csv).toContain('"55"')
                expect(result.csv).toContain('"150.00"')
                expect(result.filename).toMatch(/^jobs-export-\d{4}-\d{2}-\d{2}\.csv$/)
            }
        })

        it('should export empty CSV with only headers when no jobs exist', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            const result = await exportJobsCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                // Should contain header row only
                expect(result.csv).toContain('"ID"')
                const lines = result.csv.split('\n')
                expect(lines).toHaveLength(1) // header only, no data rows
            }
        })

        it('should handle jobs with null optional fields', async () => {
            const mockJobs = [
                {
                    id: 'job-2',
                    lotNumber: '',
                    streetAddress: '',
                    city: '',
                    address: '',
                    status: 'PENDING',
                    scheduledDate: null,
                    builder: null,
                    subdivision: null,
                    inspector: null,
                    hersScore: null,
                    payoutAmount: null,
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01'),
                },
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await exportJobsCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"job-2"')
                // Null payoutAmount should become "0.00"
                expect(result.csv).toContain('"0.00"')
            }
        })

        it('should apply date range filter when provided', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            const startDate = new Date('2025-01-01')
            const endDate = new Date('2025-06-30')
            await exportJobsCSV({ startDate, endDate })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: { gte: startDate, lte: endDate },
                    }),
                })
            )
        })

        it('should apply startDate only filter', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            const startDate = new Date('2025-01-01')
            await exportJobsCSV({ startDate })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: { gte: startDate },
                    }),
                })
            )
        })

        it('should apply endDate only filter', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            const endDate = new Date('2025-06-30')
            await exportJobsCSV({ endDate })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: { lte: endDate },
                    }),
                })
            )
        })

        it('should not apply date filter when no filters provided', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            await exportJobsCSV()

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                })
            )
        })

        it('should return error when unauthenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await exportJobsCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Authentication required')
            }
            expect(prisma.job.findMany).not.toHaveBeenCalled()
        })

        it('should return error when non-admin', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'USER', email: 'user@test.com' },
            } as any)

            const result = await exportJobsCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Admin access required')
            }
            expect(prisma.job.findMany).not.toHaveBeenCalled()
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.job.findMany).mockRejectedValue(new Error('DB error'))

            const result = await exportJobsCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Failed to export jobs data')
            }
        })

        it('should order jobs by createdAt desc', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            await exportJobsCSV()

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: 'desc' },
                    take: 10000,
                })
            )
        })
    })

    // -----------------------------------------------------------------------
    // exportInvoicesCSV
    // -----------------------------------------------------------------------
    describe('exportInvoicesCSV', () => {
        it('should export invoices as CSV successfully', async () => {
            const mockInvoices = [
                {
                    id: 'inv-1',
                    number: 'INV-001',
                    date: new Date('2025-03-01'),
                    dueDate: new Date('2025-04-01'),
                    status: 'PAID',
                    totalAmount: 500.0,
                    builder: { id: 'b-1', name: 'Acme Builders', email: 'acme@test.com' },
                    items: [
                        {
                            id: 'item-1',
                            job: { id: 'job-1', address: '123 Main St', lotNumber: 'Lot 5' },
                        },
                        {
                            id: 'item-2',
                            job: { id: 'job-2', address: '456 Oak Ave', lotNumber: 'Lot 6' },
                        },
                    ],
                    notes: 'Payment received',
                    sentAt: new Date('2025-03-01'),
                    paidAt: new Date('2025-03-15'),
                    createdAt: new Date('2025-03-01'),
                },
            ]
            vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices as any)

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"Invoice ID"')
                expect(result.csv).toContain('"Invoice Number"')
                expect(result.csv).toContain('"Total Amount"')
                expect(result.csv).toContain('"Builder Name"')
                expect(result.csv).toContain('"Line Items Count"')
                expect(result.csv).toContain('"Job Addresses"')
                expect(result.csv).toContain('"inv-1"')
                expect(result.csv).toContain('"INV-001"')
                expect(result.csv).toContain('"500.00"')
                expect(result.csv).toContain('"Acme Builders"')
                expect(result.csv).toContain('"2"')
                expect(result.csv).toContain('123 Main St; 456 Oak Ave')
                expect(result.filename).toMatch(/^invoices-export-\d{4}-\d{2}-\d{2}\.csv$/)
            }
        })

        it('should export empty CSV when no invoices exist', async () => {
            vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                const lines = result.csv.split('\n')
                expect(lines).toHaveLength(1) // header only
            }
        })

        it('should handle invoices with null builder and no items', async () => {
            const mockInvoices = [
                {
                    id: 'inv-2',
                    number: 'INV-002',
                    date: new Date('2025-03-01'),
                    dueDate: null,
                    status: 'DRAFT',
                    totalAmount: 0,
                    builder: null,
                    items: [],
                    notes: null,
                    sentAt: null,
                    paidAt: null,
                    createdAt: new Date('2025-03-01'),
                },
            ]
            vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices as any)

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"inv-2"')
                expect(result.csv).toContain('"0"') // 0 items
            }
        })

        it('should deduplicate job addresses in line items', async () => {
            const mockInvoices = [
                {
                    id: 'inv-3',
                    number: 'INV-003',
                    date: new Date('2025-03-01'),
                    dueDate: null,
                    status: 'SENT',
                    totalAmount: 200.0,
                    builder: null,
                    items: [
                        { id: 'i1', job: { id: 'j1', address: '123 Main', lotNumber: 'L1' } },
                        { id: 'i2', job: { id: 'j1', address: '123 Main', lotNumber: 'L1' } },
                        { id: 'i3', job: { id: 'j2', address: '456 Oak', lotNumber: 'L2' } },
                    ],
                    notes: null,
                    sentAt: null,
                    paidAt: null,
                    createdAt: new Date('2025-03-01'),
                },
            ]
            vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoices as any)

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                // Should have deduplicated "123 Main"
                expect(result.csv).toContain('123 Main; 456 Oak')
            }
        })

        it('should exclude soft-deleted invoices', async () => {
            vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

            await exportInvoicesCSV()

            expect(prisma.invoice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        deletedAt: null,
                    }),
                })
            )
        })

        it('should apply date range filter', async () => {
            vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

            const startDate = new Date('2025-01-01')
            const endDate = new Date('2025-06-30')
            await exportInvoicesCSV({ startDate, endDate })

            expect(prisma.invoice.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: { gte: startDate, lte: endDate },
                    }),
                })
            )
        })

        it('should return error when unauthenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Authentication required')
            }
            expect(prisma.invoice.findMany).not.toHaveBeenCalled()
        })

        it('should return error when non-admin', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'INSPECTOR', email: 'inspector@test.com' },
            } as any)

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Admin access required')
            }
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.invoice.findMany).mockRejectedValue(new Error('DB error'))

            const result = await exportInvoicesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Failed to export invoices data')
            }
        })
    })

    // -----------------------------------------------------------------------
    // exportExpensesCSV
    // -----------------------------------------------------------------------
    describe('exportExpensesCSV', () => {
        it('should export expenses as CSV successfully', async () => {
            const mockExpenses = [
                {
                    id: 'exp-1',
                    date: new Date('2025-04-10'),
                    amount: 75.5,
                    category: 'FUEL',
                    status: 'APPROVED',
                    description: 'Gas for inspection trip',
                    user: { id: 'u-1', name: 'Jane Doe', email: 'jane@test.com' },
                    job: { id: 'j-1', address: '789 Pine Rd', lotNumber: 'Lot 10' },
                    receiptUrl: 'https://example.com/receipt.jpg',
                    rejectionReason: null,
                    createdAt: new Date('2025-04-10'),
                },
            ]
            vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses as any)

            const result = await exportExpensesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"Expense ID"')
                expect(result.csv).toContain('"Date"')
                expect(result.csv).toContain('"Amount"')
                expect(result.csv).toContain('"Category"')
                expect(result.csv).toContain('"Status"')
                expect(result.csv).toContain('"Description"')
                expect(result.csv).toContain('"User Name"')
                expect(result.csv).toContain('"Job Address"')
                expect(result.csv).toContain('"Receipt URL"')
                expect(result.csv).toContain('"exp-1"')
                expect(result.csv).toContain('"75.50"')
                expect(result.csv).toContain('"FUEL"')
                expect(result.csv).toContain('"Jane Doe"')
                expect(result.csv).toContain('"789 Pine Rd"')
                expect(result.csv).toContain('"Lot 10"')
                expect(result.filename).toMatch(/^expenses-export-\d{4}-\d{2}-\d{2}\.csv$/)
            }
        })

        it('should export empty CSV when no expenses exist', async () => {
            vi.mocked(prisma.expense.findMany).mockResolvedValue([])

            const result = await exportExpensesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                const lines = result.csv.split('\n')
                expect(lines).toHaveLength(1) // header only
            }
        })

        it('should handle expenses with null optional fields', async () => {
            const mockExpenses = [
                {
                    id: 'exp-2',
                    date: new Date('2025-05-01'),
                    amount: 25.0,
                    category: null,
                    status: 'PENDING',
                    description: null,
                    user: null,
                    job: null,
                    receiptUrl: null,
                    rejectionReason: null,
                    createdAt: new Date('2025-05-01'),
                },
            ]
            vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses as any)

            const result = await exportExpensesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"exp-2"')
                expect(result.csv).toContain('"25.00"')
            }
        })

        it('should apply date range filter', async () => {
            vi.mocked(prisma.expense.findMany).mockResolvedValue([])

            const startDate = new Date('2025-01-01')
            const endDate = new Date('2025-12-31')
            await exportExpensesCSV({ startDate, endDate })

            expect(prisma.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: { gte: startDate, lte: endDate },
                    }),
                })
            )
        })

        it('should apply startDate only filter', async () => {
            vi.mocked(prisma.expense.findMany).mockResolvedValue([])

            const startDate = new Date('2025-01-01')
            await exportExpensesCSV({ startDate })

            expect(prisma.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: { gte: startDate },
                    }),
                })
            )
        })

        it('should not apply date filter when no range provided', async () => {
            vi.mocked(prisma.expense.findMany).mockResolvedValue([])

            await exportExpensesCSV()

            expect(prisma.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                })
            )
        })

        it('should return error when unauthenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await exportExpensesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Authentication required')
            }
            expect(prisma.expense.findMany).not.toHaveBeenCalled()
        })

        it('should return error when non-admin', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'USER', email: 'user@test.com' },
            } as any)

            const result = await exportExpensesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Unauthorized: Admin access required')
            }
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.expense.findMany).mockRejectedValue(new Error('DB error'))

            const result = await exportExpensesCSV()

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.message).toBe('Failed to export expenses data')
            }
        })

        it('should order expenses by date desc and limit to 10000', async () => {
            vi.mocked(prisma.expense.findMany).mockResolvedValue([])

            await exportExpensesCSV()

            expect(prisma.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { date: 'desc' },
                    take: 10000,
                })
            )
        })

        it('should handle expense with rejection reason', async () => {
            const mockExpenses = [
                {
                    id: 'exp-3',
                    date: new Date('2025-05-15'),
                    amount: 100.0,
                    category: 'MEALS',
                    status: 'REJECTED',
                    description: 'Team lunch',
                    user: { id: 'u-1', name: 'Bob', email: 'bob@test.com' },
                    job: null,
                    receiptUrl: null,
                    rejectionReason: 'Not a business expense',
                    createdAt: new Date('2025-05-15'),
                },
            ]
            vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses as any)

            const result = await exportExpensesCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.csv).toContain('"Not a business expense"')
                expect(result.csv).toContain('"REJECTED"')
            }
        })
    })

    // -----------------------------------------------------------------------
    // CSV escaping
    // -----------------------------------------------------------------------
    describe('CSV format', () => {
        it('should properly escape double quotes in CSV output', async () => {
            const mockJobs = [
                {
                    id: 'job-q',
                    lotNumber: 'Lot "5"',
                    streetAddress: '123 "Main" St',
                    city: 'Austin',
                    address: '123 "Main" St, Austin',
                    status: 'PENDING',
                    scheduledDate: null,
                    builder: { name: 'Builder "Inc"', email: 'b@test.com' },
                    subdivision: null,
                    inspector: null,
                    hersScore: null,
                    payoutAmount: null,
                    createdAt: new Date('2025-01-01'),
                    updatedAt: new Date('2025-01-01'),
                },
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await exportJobsCSV()

            expect(result.success).toBe(true)
            if (result.success) {
                // Quotes inside values should be doubled
                expect(result.csv).toContain('"Lot ""5"""')
                expect(result.csv).toContain('"Builder ""Inc"""')
            }
        })
    })
})
