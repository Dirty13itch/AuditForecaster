/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchJobs } from '../search'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockJob(overrides: Record<string, any> = {}) {
    return {
        id: 'job-1',
        lotNumber: 'Lot 5',
        address: '123 Main St',
        streetAddress: '123 Main St',
        city: 'Austin',
        status: 'PENDING',
        scheduledDate: new Date('2025-06-15'),
        builder: { name: 'Acme Builders' },
        inspector: { name: 'John Smith' },
        createdAt: new Date('2025-01-01'),
        ...overrides,
    }
}

describe('search actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'user-1', role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // searchJobs
    // -----------------------------------------------------------------------
    describe('searchJobs', () => {
        it('should return paginated search results with defaults', async () => {
            const mockJobs = [makeMockJob()]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)
            vi.mocked(prisma.job.count).mockResolvedValue(1)

            const result = await searchJobs({})

            expect(result.jobs).toHaveLength(1)
            expect(result.total).toBe(1)
            expect(result.page).toBe(1)
            expect(result.pageSize).toBe(25)
            expect(result.totalPages).toBe(1)
            expect(result.jobs[0]).toEqual({
                id: 'job-1',
                lotNumber: 'Lot 5',
                address: '123 Main St',
                city: 'Austin',
                status: 'PENDING',
                scheduledDate: new Date('2025-06-15'),
                builder: { name: 'Acme Builders' },
                inspector: { name: 'John Smith' },
            })
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 0,
                    take: 25,
                    orderBy: { createdAt: 'desc' },
                })
            )
        })

        it('should apply text query filter across multiple fields', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ query: 'Main' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { address: { contains: 'Main' } },
                            { streetAddress: { contains: 'Main' } },
                            { lotNumber: { contains: 'Main' } },
                            { city: { contains: 'Main' } },
                            { builder: { name: { contains: 'Main' } } },
                        ],
                    }),
                })
            )
        })

        it('should trim whitespace from query', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ query: '  Main  ' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { address: { contains: 'Main' } },
                        ]),
                    }),
                })
            )
        })

        it('should skip query filter when query is empty or whitespace', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ query: '   ' })

            const call = vi.mocked(prisma.job.findMany).mock.calls[0][0] as any
            expect(call.where.OR).toBeUndefined()
        })

        it('should apply status filter', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ status: ['PENDING', 'COMPLETED'] })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: { in: ['PENDING', 'COMPLETED'] },
                    }),
                })
            )
        })

        it('should skip status filter when empty array is provided', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ status: [] })

            const call = vi.mocked(prisma.job.findMany).mock.calls[0][0] as any
            expect(call.where.status).toBeUndefined()
        })

        it('should apply builderId filter', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ builderId: 'builder-1' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        builderId: 'builder-1',
                    }),
                })
            )
        })

        it('should apply inspectorId filter', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ inspectorId: 'inspector-1' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        inspectorId: 'inspector-1',
                    }),
                })
            )
        })

        it('should apply date range filter with both dates', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({
                dateFrom: '2025-01-01',
                dateTo: '2025-12-31',
            })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        scheduledDate: {
                            gte: new Date('2025-01-01'),
                            lte: new Date('2025-12-31'),
                        },
                    }),
                })
            )
        })

        it('should apply date range filter with dateFrom only', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ dateFrom: '2025-06-01' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        scheduledDate: {
                            gte: new Date('2025-06-01'),
                        },
                    }),
                })
            )
        })

        it('should apply date range filter with dateTo only', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ dateTo: '2025-12-31' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        scheduledDate: {
                            lte: new Date('2025-12-31'),
                        },
                    }),
                })
            )
        })

        it('should handle pagination correctly', async () => {
            const mockJobs = Array.from({ length: 10 }, (_, i) =>
                makeMockJob({ id: `job-${i + 1}` })
            )
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)
            vi.mocked(prisma.job.count).mockResolvedValue(50)

            const result = await searchJobs({ page: 3, pageSize: 10 })

            expect(result.page).toBe(3)
            expect(result.pageSize).toBe(10)
            expect(result.total).toBe(50)
            expect(result.totalPages).toBe(5)
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 20,
                    take: 10,
                })
            )
        })

        it('should clamp page to minimum of 1', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            const result = await searchJobs({ page: -5 })

            expect(result.page).toBe(1)
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 0 })
            )
        })

        it('should clamp pageSize to maximum of 100', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            const result = await searchJobs({ pageSize: 500 })

            expect(result.pageSize).toBe(100)
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 100 })
            )
        })

        it('should clamp pageSize to minimum of 1', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            const result = await searchJobs({ pageSize: 0 })

            expect(result.pageSize).toBe(1)
            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 1 })
            )
        })

        it('should sort by date', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'date', sortOrder: 'asc' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { scheduledDate: 'asc' },
                })
            )
        })

        it('should sort by address', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'address', sortOrder: 'asc' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { address: 'asc' },
                })
            )
        })

        it('should sort by status', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'status', sortOrder: 'desc' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { status: 'desc' },
                })
            )
        })

        it('should sort by builder name', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'builder', sortOrder: 'asc' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { builder: { name: 'asc' } },
                })
            )
        })

        it('should default sort order to desc when not specified', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'date' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { scheduledDate: 'desc' },
                })
            )
        })

        it('should use createdAt desc for unknown sortBy values', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({ sortBy: 'nonexistent' })

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: 'desc' },
                })
            )
        })

        it('should include builder and inspector in select', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({})

            expect(prisma.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: {
                        builder: { select: { name: true } },
                        inspector: { select: { name: true } },
                    },
                })
            )
        })

        it('should handle jobs with null builder and inspector', async () => {
            const mockJob = makeMockJob({
                builder: null,
                inspector: null,
            })
            vi.mocked(prisma.job.findMany).mockResolvedValue([mockJob] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(1)

            const result = await searchJobs({})

            expect(result.jobs[0].builder).toBeNull()
            expect(result.jobs[0].inspector).toBeNull()
        })

        it('should handle inspector with null name', async () => {
            const mockJob = makeMockJob({
                inspector: { name: null },
            })
            vi.mocked(prisma.job.findMany).mockResolvedValue([mockJob] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(1)

            const result = await searchJobs({})

            expect(result.jobs[0].inspector).toEqual({ name: '' })
        })

        it('should throw error when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(searchJobs({})).rejects.toThrow('Unauthorized')
        })

        it('should throw error when session has no user', async () => {
            vi.mocked(auth).mockResolvedValue({ user: undefined } as any)

            await expect(searchJobs({})).rejects.toThrow('Unauthorized')
        })

        it('should calculate totalPages correctly', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(51)

            const result = await searchJobs({ pageSize: 25 })

            expect(result.totalPages).toBe(3)
        })

        it('should combine multiple filters', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.job.count).mockResolvedValue(0)

            await searchJobs({
                query: 'Main',
                status: ['PENDING'],
                builderId: 'builder-1',
                inspectorId: 'inspector-1',
                dateFrom: '2025-01-01',
                dateTo: '2025-12-31',
            })

            const call = vi.mocked(prisma.job.findMany).mock.calls[0][0] as any
            expect(call.where.OR).toBeDefined()
            expect(call.where.status).toEqual({ in: ['PENDING'] })
            expect(call.where.builderId).toBe('builder-1')
            expect(call.where.inspectorId).toBe('inspector-1')
            expect(call.where.scheduledDate).toEqual({
                gte: new Date('2025-01-01'),
                lte: new Date('2025-12-31'),
            })
        })
    })
})
