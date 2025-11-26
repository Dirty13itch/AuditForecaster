import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobProfitability, getProfitabilityDashboard } from '../profitability'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findUnique: vi.fn(),
            findMany: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

describe('Profitability Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    })

    describe('getJobProfitability', () => {
        it('should calculate profitability correctly', async () => {
            const mockJob = {
                id: 'job-1',
                invoiceItems: [{ totalPrice: 1000 }],
                expenses: [{ amount: 100 }],
                payoutAmount: 600
            }
            vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any)

            const result = await getJobProfitability('job-1')

            // Revenue = 1000
            // Labor = 600
            // Expenses = 100
            // Total Cost = 700
            // Net Profit = 300
            // Margin = 30%

            expect(result.revenue).toBe(1000)
            expect(result.costs.labor).toBe(600)
            expect(result.costs.expenses).toBe(100)
            expect(result.netProfit).toBe(300)
            expect(result.margin).toBe(30)
        })

        it('should estimate labor cost if not set', async () => {
            const mockJob = {
                id: 'job-1',
                invoiceItems: [{ totalPrice: 1000 }],
                expenses: [],
                payoutAmount: null
            }
            vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any)

            const result = await getJobProfitability('job-1')

            // Labor = 1000 * 0.70 = 700
            expect(result.costs.labor).toBe(700)
        })
    })

    describe('getProfitabilityDashboard', () => {
        it('should aggregate metrics correctly', async () => {
            const mockJobs = [
                {
                    id: 'job-1',
                    invoiceItems: [{ totalPrice: 1000 }],
                    expenses: [],
                    payoutAmount: 700
                },
                {
                    id: 'job-2',
                    invoiceItems: [{ totalPrice: 2000 }],
                    expenses: [],
                    payoutAmount: 1400
                }
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await getProfitabilityDashboard(new Date(), new Date())

            // Total Revenue = 3000
            // Total Cost = 2100
            // Net Profit = 900
            // Margin = 30%

            expect(result.metrics.totalRevenue).toBe(3000)
            expect(result.metrics.totalCost).toBe(2100)
            expect(result.metrics.netProfit).toBe(900)
            expect(result.metrics.margin).toBe(30)
            expect(result.topJobs).toHaveLength(2)
        })
    })
})
