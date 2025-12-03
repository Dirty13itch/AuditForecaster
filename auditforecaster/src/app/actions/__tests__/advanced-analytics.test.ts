import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRevenueForecast, getInspectorPerformance } from '../advanced-analytics'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { isFeatureEnabled } from '@/lib/feature-flags'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findMany: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/feature-flags', () => ({
    isFeatureEnabled: vi.fn()
}))

describe('Advanced Analytics Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { role: 'ADMIN' } } as any)
        vi.mocked(isFeatureEnabled).mockReturnValue(true)
    })

    describe('getRevenueForecast', () => {
        it('should return forecast data when enabled', async () => {
            const result = await getRevenueForecast()
            expect(Array.isArray(result)).toBe(true)
            if (Array.isArray(result)) {
                expect(result).toHaveLength(6)
                expect(result[0]).toHaveProperty('projected')
            }
        })

        it('should return error if feature disabled', async () => {
            vi.mocked(isFeatureEnabled).mockReturnValue(false)
            const result = await getRevenueForecast()
            expect(result).toEqual({ error: 'Feature disabled' })
        })

        it('should return error if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { role: 'INSPECTOR' } } as any)
            const result = await getRevenueForecast()
            expect(result).toEqual({ error: 'Unauthorized' })
        })
    })

    describe('getInspectorPerformance', () => {
        it('should return performance data', async () => {
            vi.mocked(prisma.user.findMany).mockResolvedValue([
                {
                    name: 'Inspector Gadget',
                    jobs: [
                        { inspections: [{ score: 95 }] },
                        { inspections: [{ score: 90 }] }
                    ]
                }
            ] as any)

            const result = await getInspectorPerformance()
            expect(Array.isArray(result)).toBe(true)
            if (Array.isArray(result)) {
                expect(result[0].name).toBe('Inspector Gadget')
                expect(result[0].jobsCompleted).toBe(2)
                expect(result[0].avgScore).toBe(92.5)
            }
        })
    })
})
