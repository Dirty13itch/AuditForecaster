/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPlans, getPlanById, deletePlan } from '../plans'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        plan: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Valid CUID-format IDs (assertValidId requires CUID or UUID format, 25+ chars)
// ---------------------------------------------------------------------------

const mockUserId = 'cm0000000000000000user001'
const mockBuilderId = 'cm000000000000000builder1'
const mockOtherBuilderId = 'cm000000000000000builder2'
const mockPlanId = 'cm0000000000000000plan001'
const mockPlanId2 = 'cm0000000000000000plan002'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthenticated(overrides: Record<string, unknown> = {}) {
    vi.mocked(auth).mockResolvedValue({
        user: {
            id: mockUserId,
            role: 'ADMIN',
            ...overrides,
        },
    } as any)
}

function mockBuilderUser(builderId = mockBuilderId) {
    vi.mocked(auth).mockResolvedValue({
        user: {
            id: mockUserId,
            role: 'BUILDER',
            builderId,
        },
    } as any)
}

const mockPlan = {
    id: mockPlanId,
    title: 'Floor Plan A',
    description: 'Standard 3-bedroom layout',
    builderId: mockBuilderId,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    builder: { id: mockBuilderId, name: 'Acme Builders' },
}

const mockPlan2 = {
    id: mockPlanId2,
    title: 'Floor Plan B',
    description: 'Luxury 4-bedroom layout',
    builderId: mockBuilderId,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    builder: { id: mockBuilderId, name: 'Acme Builders' },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plans Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // -----------------------------------------------------------------------
    // getPlans
    // -----------------------------------------------------------------------
    describe('getPlans', () => {
        it('returns paginated plans for authenticated admin', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan, mockPlan2] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(2)

            const result = await getPlans()

            expect(result).toBeDefined()
            expect(result.plans).toHaveLength(2)
            expect(result.totalCount).toBe(2)
            expect(result.totalPages).toBe(1)
            expect(result.currentPage).toBe(1)
        })

        it('throws when unauthorized (null session)', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getPlans()).rejects.toThrow('Unauthorized')
        })

        it('filters by builderId for BUILDER role users', async () => {
            mockBuilderUser(mockBuilderId)
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(1)

            const result = await getPlans()

            expect(result.plans).toHaveLength(1)
            // Verify builderId was passed in the where clause
            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        builderId: mockBuilderId,
                    }),
                })
            )
            expect(prisma.plan.count).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    builderId: mockBuilderId,
                }),
            })
        })

        it('admin can filter by explicit builderId option', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(1)

            await getPlans({ builderId: mockBuilderId })

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        builderId: mockBuilderId,
                    }),
                })
            )
        })

        it('rejects invalid builderId format', async () => {
            mockAuthenticated()

            await expect(getPlans({ builderId: 'bad-id' })).rejects.toThrow('Invalid Builder ID format')
        })

        it('applies search query across title, description, and builder name', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(1)

            await getPlans({ query: 'Floor' })

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { title: { contains: 'Floor', mode: 'insensitive' } },
                            { description: { contains: 'Floor', mode: 'insensitive' } },
                            { builder: { name: { contains: 'Floor', mode: 'insensitive' } } },
                        ],
                    }),
                })
            )
        })

        it('paginates correctly with page and limit', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan2] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(51)

            const result = await getPlans({ page: 2, limit: 50 })

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 50,
                    skip: 50,
                })
            )
            expect(result.currentPage).toBe(2)
            expect(result.totalPages).toBe(2)
        })

        it('clamps limit to max 100', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(0)

            await getPlans({ limit: 500 })

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 100,
                })
            )
        })

        it('clamps limit to min 1', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(0)

            await getPlans({ limit: -5 })

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 1,
                })
            )
        })

        it('returns empty results when no plans exist', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([])
            vi.mocked(prisma.plan.count).mockResolvedValue(0)

            const result = await getPlans()

            expect(result.plans).toHaveLength(0)
            expect(result.totalCount).toBe(0)
            expect(result.totalPages).toBe(0)
        })

        it('wraps prisma errors into a generic error message', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockRejectedValue(new Error('DB connection lost'))

            await expect(getPlans()).rejects.toThrow('Failed to fetch plans')
        })

        it('orders plans by createdAt descending', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(0)

            await getPlans()

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: 'desc' },
                })
            )
        })

        it('includes builder relation in results', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findMany).mockResolvedValue([mockPlan] as any)
            vi.mocked(prisma.plan.count).mockResolvedValue(1)

            await getPlans()

            expect(prisma.plan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: {
                        builder: {
                            select: { id: true, name: true },
                        },
                    },
                })
            )
        })
    })

    // -----------------------------------------------------------------------
    // getPlanById
    // -----------------------------------------------------------------------
    describe('getPlanById', () => {
        it('returns plan for authenticated user', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                ...mockPlan,
                builder: { id: mockBuilderId, name: 'Acme Builders', email: 'acme@example.com' },
            } as any)

            const result = await getPlanById(mockPlanId)

            expect(result).toBeDefined()
            expect(result.id).toBe(mockPlanId)
            expect(result.title).toBe('Floor Plan A')
            expect(prisma.plan.findUnique).toHaveBeenCalledWith({
                where: { id: mockPlanId },
                include: {
                    builder: {
                        select: { id: true, name: true, email: true },
                    },
                },
            })
        })

        it('throws when unauthorized (null session)', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getPlanById(mockPlanId)).rejects.toThrow('Unauthorized')
        })

        it('throws when plan not found', async () => {
            mockAuthenticated()
            vi.mocked(prisma.plan.findUnique).mockResolvedValue(null)

            await expect(getPlanById(mockPlanId)).rejects.toThrow('Plan not found')
        })

        it('rejects invalid ID format', async () => {
            await expect(getPlanById('bad')).rejects.toThrow('Invalid Plan ID format')
        })

        it('allows BUILDER to see their own plan', async () => {
            mockBuilderUser(mockBuilderId)
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                ...mockPlan,
                builderId: mockBuilderId,
                builder: { id: mockBuilderId, name: 'Acme Builders', email: 'acme@example.com' },
            } as any)

            const result = await getPlanById(mockPlanId)

            expect(result).toBeDefined()
            expect(result.id).toBe(mockPlanId)
        })

        it('denies BUILDER access to another builder plan', async () => {
            mockBuilderUser(mockBuilderId)
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                ...mockPlan,
                builderId: mockOtherBuilderId,
                builder: { id: mockOtherBuilderId, name: 'Other Builders', email: 'other@example.com' },
            } as any)

            await expect(getPlanById(mockPlanId)).rejects.toThrow(
                'Unauthorized: You do not have access to this plan'
            )
        })

        it('allows ADMIN to see any plan regardless of builderId', async () => {
            mockAuthenticated({ role: 'ADMIN' })
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                ...mockPlan,
                builderId: mockOtherBuilderId,
                builder: { id: mockOtherBuilderId, name: 'Other Builders', email: 'other@example.com' },
            } as any)

            const result = await getPlanById(mockPlanId)

            expect(result).toBeDefined()
            expect(result.id).toBe(mockPlanId)
        })
    })

    // -----------------------------------------------------------------------
    // deletePlan
    // -----------------------------------------------------------------------
    describe('deletePlan', () => {
        it('deletes plan successfully for admin', async () => {
            mockAuthenticated({ role: 'ADMIN' })
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                id: mockPlanId,
                title: 'Floor Plan A',
            } as any)
            vi.mocked(prisma.plan.delete).mockResolvedValue({ id: mockPlanId } as any)

            const result = await deletePlan(mockPlanId)

            expect(result.message).toBe('Plan deleted successfully')
            expect(prisma.plan.findUnique).toHaveBeenCalledWith({
                where: { id: mockPlanId },
                select: { id: true, title: true },
            })
            expect(prisma.plan.delete).toHaveBeenCalledWith({
                where: { id: mockPlanId },
            })
        })

        it('throws when unauthorized (null session)', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(deletePlan(mockPlanId)).rejects.toThrow('Unauthorized')
        })

        it('throws when non-admin user attempts delete', async () => {
            mockAuthenticated({ role: 'AUDITOR' })

            await expect(deletePlan(mockPlanId)).rejects.toThrow(
                'Unauthorized: Admin access required'
            )
        })

        it('throws when BUILDER user attempts delete', async () => {
            mockBuilderUser(mockBuilderId)

            await expect(deletePlan(mockPlanId)).rejects.toThrow(
                'Unauthorized: Admin access required'
            )
        })

        it('rejects invalid ID format', async () => {
            await expect(deletePlan('short')).rejects.toThrow('Invalid Plan ID format')
        })

        it('returns failure message when plan not found', async () => {
            mockAuthenticated({ role: 'ADMIN' })
            vi.mocked(prisma.plan.findUnique).mockResolvedValue(null)

            // The function catches the "Plan not found" error and returns a failure message
            // because the catch block returns { message: 'Failed to delete plan' }
            const result = await deletePlan(mockPlanId)
            expect(result.message).toBe('Failed to delete plan')
        })

        it('returns failure message when prisma delete fails', async () => {
            mockAuthenticated({ role: 'ADMIN' })
            vi.mocked(prisma.plan.findUnique).mockResolvedValue({
                id: mockPlanId,
                title: 'Floor Plan A',
            } as any)
            vi.mocked(prisma.plan.delete).mockRejectedValue(new Error('FK constraint'))

            const result = await deletePlan(mockPlanId)

            expect(result.message).toBe('Failed to delete plan')
        })

        it('does not call delete when plan not found', async () => {
            mockAuthenticated({ role: 'ADMIN' })
            vi.mocked(prisma.plan.findUnique).mockResolvedValue(null)

            await deletePlan(mockPlanId)

            expect(prisma.plan.delete).not.toHaveBeenCalled()
        })
    })
})
