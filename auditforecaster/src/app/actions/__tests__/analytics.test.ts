/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAnalyticsData } from '../analytics'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getJobPrice } from '@/lib/pricing'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        invoice: {
            aggregate: vi.fn()
        },
        job: {
            findMany: vi.fn(),
            groupBy: vi.fn()
        },
        user: {
            findMany: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/pricing', () => ({
    getJobPrice: vi.fn()
}))

describe('Analytics Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    })

    describe('getAnalyticsData', () => {
        it('should aggregate metrics correctly', async () => {
            // Mock Current Revenue (Invoices)
            vi.mocked(prisma.invoice.aggregate).mockResolvedValueOnce({
                _sum: { totalAmount: 5000 }
            } as any)

            // Mock Current Uninvoiced Jobs
            vi.mocked(prisma.job.findMany).mockResolvedValueOnce([
                { builderId: 'b1', subdivisionId: 's1' }
            ] as any)

            // Mock Last Month Revenue (Invoices)
            vi.mocked(prisma.invoice.aggregate).mockResolvedValueOnce({
                _sum: { totalAmount: 4000 }
            } as any)

            // Mock Last Month Uninvoiced Jobs
            vi.mocked(prisma.job.findMany).mockResolvedValueOnce([] as any)

            // Mock Job Status Distribution
            vi.mocked(prisma.job.groupBy).mockResolvedValueOnce([
                { status: 'COMPLETED', _count: { status: 10 } }
            ] as any)

            // Mock Top Inspectors
            vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
                { name: 'Inspector 1', _count: { jobs: 5 } }
            ] as any)

            // Mock Recent Jobs (Daily Trend)
            vi.mocked(prisma.job.findMany).mockResolvedValueOnce([
                { createdAt: new Date() }
            ] as any)

            // Mock Pricing
            vi.mocked(getJobPrice).mockResolvedValue(100)

            const result = await getAnalyticsData()

            // Current Revenue = 5000 + 100 = 5100
            // Last Month Revenue = 4000 + 0 = 4000
            // Growth = ((5100 - 4000) / 4000) * 100 = 27.5%

            expect(result.revenue.current).toBe(5100)
            expect(result.revenue.last).toBe(4000)
            expect(result.revenue.growth).toBe(27.5)
            expect(result.jobDistribution).toHaveLength(1)
            expect(result.topInspectors).toHaveLength(1)
            expect(result.dailyTrend.length).toBeGreaterThan(0)
        })

        it('should throw forbidden if not admin', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'INSPECTOR' } } as any)
            await expect(getAnalyticsData()).rejects.toThrow('Forbidden: Insufficient permissions')
        })
    })
})
