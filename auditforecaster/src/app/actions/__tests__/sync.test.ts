/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/auth'

const { mockQueueAdd } = vi.hoisted(() => ({
    mockQueueAdd: vi.fn(),
}))

// Mock dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/queue', () => ({
    syncQueue: {
        add: mockQueueAdd,
    },
}))

import { enqueueSyncJob } from '../sync'

// ---------------------------------------------------------------------------
// Valid CUID-format IDs
// ---------------------------------------------------------------------------
const mockUserId = 'cm0000000000000000user001'

describe('Sync Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: mockUserId, role: 'ADMIN' },
        } as any)
    })

    describe('enqueueSyncJob', () => {
        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            await expect(
                enqueueSyncJob('jobs', 'CREATE', { title: 'New Job' })
            ).rejects.toThrow('Unauthorized')
        })

        it('should throw Unauthorized when session has no user id', async () => {
            vi.mocked(auth).mockResolvedValue({ user: {} } as any)

            await expect(
                enqueueSyncJob('jobs', 'UPDATE', { id: '1' })
            ).rejects.toThrow('Unauthorized')
        })

        it('should enqueue a sync job and return success with jobId', async () => {
            mockQueueAdd.mockResolvedValue({ id: 'queue-job-42' })

            const result = await enqueueSyncJob('inspections', 'CREATE', { data: 'test' })

            expect(result).toEqual({ success: true, jobId: 'queue-job-42' })
            expect(mockQueueAdd).toHaveBeenCalledWith('sync-mutation', {
                resource: 'inspections',
                type: 'CREATE',
                payload: { data: 'test' },
                userId: mockUserId,
                timestamp: expect.any(Number),
            })
        })

        it('should pass correct resource and type to queue', async () => {
            mockQueueAdd.mockResolvedValue({ id: 'queue-job-99' })

            await enqueueSyncJob('photos', 'DELETE', { photoId: 'p-1' })

            expect(mockQueueAdd).toHaveBeenCalledWith('sync-mutation', expect.objectContaining({
                resource: 'photos',
                type: 'DELETE',
                payload: { photoId: 'p-1' },
                userId: mockUserId,
            }))
        })

        it('should propagate queue errors', async () => {
            mockQueueAdd.mockRejectedValue(new Error('Redis connection failed'))

            await expect(
                enqueueSyncJob('jobs', 'UPDATE', {})
            ).rejects.toThrow('Redis connection failed')
        })
    })
})
