/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardStats } from '../dashboard'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            count: vi.fn(),
        },
        inspection: {
            count: vi.fn(),
        },
        invoice: {
            aggregate: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUserId = 'cm0000000000000000user001'

function mockAuthenticated(role = 'ADMIN') {
    vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role },
    } as any)
}

/**
 * The dashboard action calls prisma.$transaction with an array of 9 promises.
 * This helper builds the expected resolved array shape.
 */
function buildTransactionResult(overrides: Partial<{
    totalJobs: number
    completedThisMonth: number
    completedLastMonth: number
    pendingInspections: number
    pendingInspectionsLastMonth: number
    revenueThisMonth: number | null
    revenueLastMonth: number | null
    jobsCreatedThisMonth: number
    jobsCreatedLastMonth: number
}> = {}) {
    const {
        totalJobs = 42,
        completedThisMonth = 10,
        completedLastMonth = 8,
        pendingInspections = 5,
        pendingInspectionsLastMonth = 3,
        revenueThisMonth = 15000,
        revenueLastMonth = 12000,
        jobsCreatedThisMonth = 15,
        jobsCreatedLastMonth = 10,
    } = overrides

    return [
        totalJobs,                                               // totalJobs
        completedThisMonth,                                      // completedThisMonth
        completedLastMonth,                                      // completedLastMonth
        pendingInspections,                                      // pendingInspections
        pendingInspectionsLastMonth,                              // pendingInspectionsLastMonth
        { _sum: { totalAmount: revenueThisMonth } },             // revenueThisMonth
        { _sum: { totalAmount: revenueLastMonth } },             // revenueLastMonth
        jobsCreatedThisMonth,                                    // jobsCreatedThisMonth
        jobsCreatedLastMonth,                                    // jobsCreatedLastMonth
    ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getDashboardStats', () => {
        it('returns stats for authenticated user', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult()
            )

            const result = await getDashboardStats()

            expect(result).toBeDefined()
            expect(result.totalJobs).toBe(42)
            expect(result.completedThisMonth).toBe(10)
            expect(result.pendingInspections).toBe(5)
            expect(result.monthlyRevenue).toBe(15000)
        })

        it('throws when unauthorized (null session)', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getDashboardStats()).rejects.toThrow('Unauthorized')
        })

        it('calculates positive trends correctly', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult({
                    completedThisMonth: 12,
                    completedLastMonth: 8,
                    pendingInspections: 6,
                    pendingInspectionsLastMonth: 4,
                    revenueThisMonth: 20000,
                    revenueLastMonth: 10000,
                    jobsCreatedThisMonth: 20,
                    jobsCreatedLastMonth: 10,
                })
            )

            const result = await getDashboardStats()

            // (12-8)/8 = 50%
            expect(result.trends.completed).toBe(50)
            // (6-4)/4 = 50%
            expect(result.trends.inspections).toBe(50)
            // (20000-10000)/10000 = 100%
            expect(result.trends.revenue).toBe(100)
            // (20-10)/10 = 100%
            expect(result.trends.totalJobs).toBe(100)
        })

        it('calculates negative trends correctly', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult({
                    completedThisMonth: 4,
                    completedLastMonth: 8,
                    pendingInspections: 2,
                    pendingInspectionsLastMonth: 4,
                    revenueThisMonth: 5000,
                    revenueLastMonth: 10000,
                    jobsCreatedThisMonth: 5,
                    jobsCreatedLastMonth: 10,
                })
            )

            const result = await getDashboardStats()

            // (4-8)/8 = -50%
            expect(result.trends.completed).toBe(-50)
            // (2-4)/4 = -50%
            expect(result.trends.inspections).toBe(-50)
            // (5000-10000)/10000 = -50%
            expect(result.trends.revenue).toBe(-50)
            // (5-10)/10 = -50%
            expect(result.trends.totalJobs).toBe(-50)
        })

        it('handles zero previous values (trend = 100 when current > 0)', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult({
                    completedThisMonth: 5,
                    completedLastMonth: 0,
                    pendingInspections: 3,
                    pendingInspectionsLastMonth: 0,
                    revenueThisMonth: 8000,
                    revenueLastMonth: 0,
                    jobsCreatedThisMonth: 7,
                    jobsCreatedLastMonth: 0,
                })
            )

            const result = await getDashboardStats()

            expect(result.trends.completed).toBe(100)
            expect(result.trends.inspections).toBe(100)
            expect(result.trends.revenue).toBe(100)
            expect(result.trends.totalJobs).toBe(100)
        })

        it('handles zero previous and zero current (trend = 0)', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult({
                    completedThisMonth: 0,
                    completedLastMonth: 0,
                    pendingInspections: 0,
                    pendingInspectionsLastMonth: 0,
                    revenueThisMonth: 0,
                    revenueLastMonth: 0,
                    jobsCreatedThisMonth: 0,
                    jobsCreatedLastMonth: 0,
                })
            )

            const result = await getDashboardStats()

            expect(result.trends.completed).toBe(0)
            expect(result.trends.inspections).toBe(0)
            expect(result.trends.revenue).toBe(0)
            expect(result.trends.totalJobs).toBe(0)
        })

        it('handles null revenue sums (no invoices)', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult({
                    revenueThisMonth: null,
                    revenueLastMonth: null,
                })
            )

            const result = await getDashboardStats()

            expect(result.monthlyRevenue).toBe(0)
            expect(result.trends.revenue).toBe(0)
        })

        it('calls $transaction with the correct number of queries', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult()
            )

            await getDashboardStats()

            expect(prisma.$transaction).toHaveBeenCalledTimes(1)
            // The transaction should receive an array of 9 queries
            const transactionArg = vi.mocked(prisma.$transaction).mock.calls[0][0]
            expect(Array.isArray(transactionArg)).toBe(true)
            expect((transactionArg as any[]).length).toBe(9)
        })

        it('returns correct DashboardStats shape', async () => {
            mockAuthenticated()
            vi.mocked(prisma.$transaction).mockResolvedValue(
                buildTransactionResult()
            )

            const result = await getDashboardStats()

            // Verify all top-level keys exist
            expect(result).toHaveProperty('totalJobs')
            expect(result).toHaveProperty('completedThisMonth')
            expect(result).toHaveProperty('pendingInspections')
            expect(result).toHaveProperty('monthlyRevenue')
            expect(result).toHaveProperty('trends')

            // Verify trend sub-keys
            expect(result.trends).toHaveProperty('totalJobs')
            expect(result.trends).toHaveProperty('completed')
            expect(result.trends).toHaveProperty('inspections')
            expect(result.trends).toHaveProperty('revenue')
        })
    })
})
