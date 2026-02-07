import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInvoice, getUninvoicedJobs } from '../invoices'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn(),
            updateMany: vi.fn()
        },
        invoice: {
            count: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findUnique: vi.fn()
        },
        $transaction: vi.fn((callback) => callback(prisma))
    }
}))

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('invoices actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'user-1', role: 'ADMIN' }
        } as any)
    })

    describe('getUninvoicedJobs', () => {
        it('should return jobs', async () => {
            const mockJobs = [{ id: 'cm0000000000000000000job1', address: '123 Main' }]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)

            const result = await getUninvoicedJobs('cm000000000000000builder1')

            expect(result).toEqual(mockJobs)
            expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ builderId: 'cm000000000000000builder1' })
            }))
        })
    })

    describe('createInvoice', () => {
        it('should create invoice successfully', async () => {
            const mockJobs = [
                {
                    id: 'cm0000000000000000000job1',
                    address: '123 Main',
                    subdivision: null,
                    builder: { name: 'Test Builder' }
                }
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)
            vi.mocked(prisma.invoice.count).mockResolvedValue(0)
            vi.mocked(prisma.invoice.create).mockResolvedValue({ id: 'cm0000000000000000000inv1' } as any)

            const result = await createInvoice({
                builderId: 'cm000000000000000builder1',
                jobIds: ['cm0000000000000000000job1'],
                dueDate: new Date()
            })

            expect(result.success).toBe(true)
            expect(result.invoiceId).toBe('cm0000000000000000000inv1')
            expect(prisma.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    totalAmount: 0,
                    items: {
                        create: expect.arrayContaining([
                            expect.objectContaining({
                                description: 'Inspection - 123 Main',
                                unitPrice: 0,
                                totalPrice: 0
                            })
                        ])
                    }
                })
            }))
        })

        it('should throw error if no jobs found', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            await expect(createInvoice({
                builderId: 'cm000000000000000builder1',
                jobIds: ['cm0000000000000000000job1'],
                dueDate: new Date()
            })).rejects.toThrow('No valid jobs found')
        })
    })
})
