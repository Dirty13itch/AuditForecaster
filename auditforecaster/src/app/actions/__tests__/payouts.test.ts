import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculatePayout, createPayout, markPayoutAsPaid } from '../payouts'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn(),
            updateMany: vi.fn()
        },
        user: {
            findUnique: vi.fn()
        },
        payout: {
            create: vi.fn(),
            update: vi.fn()
        },
        $transaction: vi.fn((callback) => callback(prisma))
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('Payouts Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } } as any)
    })

    describe('calculatePayout', () => {
        it('should calculate payout correctly', async () => {
            const mockJobs = [
                {
                    id: 'job-1',
                    address: '123 Main',
                    scheduledDate: new Date(),
                    subdivision: {
                        priceLists: [{
                            items: [{ price: 200 }]
                        }]
                    }
                }
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)
            vi.mocked(prisma.user.findUnique).mockResolvedValue({ baseRate: 1000 } as any)

            const result = await calculatePayout('user-1', new Date(), new Date())

            // Job total = 200
            // Payout = 200 * 0.70 = 140
            expect(result.totalAmount).toBe(140)
            expect(result.baseRate).toBe(1000)
            expect(result.jobCount).toBe(1)
            expect(result.jobs[0].payoutAmount).toBe(140)
        })

        it('should use builder price list if subdivision missing', async () => {
            const mockJobs = [
                {
                    id: 'job-1',
                    builder: {
                        priceLists: [{
                            items: [{ price: 300 }]
                        }]
                    }
                }
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await calculatePayout('user-1', new Date(), new Date())

            // Payout = 300 * 0.70 = 210
            expect(result.totalAmount).toBe(210)
        })
    })

    describe('createPayout', () => {
        it('should create payout and link jobs', async () => {
            vi.mocked(prisma.payout.create).mockResolvedValue({ id: 'payout-1' } as any)

            const result = await createPayout('user-1', ['job-1'], 500, new Date(), new Date())

            expect(result.success).toBe(true)
            expect(prisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    amount: 500,
                    userId: 'user-1'
                })
            }))
            expect(prisma.job.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: { in: ['job-1'] } },
                data: { payoutId: 'payout-1' }
            }))
        })
    })

    describe('markPayoutAsPaid', () => {
        it('should update status to PAID', async () => {
            await markPayoutAsPaid('payout-1')

            expect(prisma.payout.update).toHaveBeenCalledWith({
                where: { id: 'payout-1' },
                data: expect.objectContaining({
                    status: 'PAID',
                    paidAt: expect.any(Date)
                })
            })
        })
    })
})
