import { describe, it, expect, vi, beforeEach } from 'vitest'
import { claimTask } from '../task-claiming'
import { prisma } from '@/lib/prisma'
import { isFeatureEnabled } from '@/lib/feature-flags'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        taskClaim: {
            deleteMany: vi.fn(),
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn()
        }
    }
}))

vi.mock('@/lib/feature-flags', () => ({
    FeatureFlags: {},
    isFeatureEnabled: vi.fn()
}))

describe('Task Claiming', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(isFeatureEnabled).mockReturnValue(true)
    })

    it('should allow access if feature disabled', async () => {
        vi.mocked(isFeatureEnabled).mockReturnValue(false)
        const result = await claimTask('task-1', 'user-1')
        expect(result.success).toBe(true)
        expect(result.claimed).toBe(false)
        expect(prisma.taskClaim.create).not.toHaveBeenCalled()
    })

    it('should claim task successfully', async () => {
        vi.mocked(prisma.taskClaim.create).mockResolvedValue({} as any)
        const result = await claimTask('task-1', 'user-1')
        expect(result.success).toBe(true)
        expect(result.claimed).toBe(true)
    })

    it('should return failure if already claimed by another', async () => {
        vi.mocked(prisma.taskClaim.create).mockRejectedValue(new Error('Unique constraint'))
        vi.mocked(prisma.taskClaim.findUnique).mockResolvedValue({
            userId: 'user-2',
            user: { name: 'Other User' }
        } as any)

        const result = await claimTask('task-1', 'user-1')
        expect(result.success).toBe(false)
        expect(result.claimedBy).toBe('Other User')
    })

    it('should extend claim if already claimed by self', async () => {
        vi.mocked(prisma.taskClaim.create).mockRejectedValue(new Error('Unique constraint'))
        vi.mocked(prisma.taskClaim.findUnique).mockResolvedValue({
            id: 'claim-1',
            userId: 'user-1',
            user: { name: 'Me' }
        } as any)

        const result = await claimTask('task-1', 'user-1')
        expect(result.success).toBe(true)
        expect(prisma.taskClaim.update).toHaveBeenCalled()
    })
})
