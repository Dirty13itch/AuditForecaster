/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/auth'

const { mockClaimTask, mockReleaseTask } = vi.hoisted(() => ({
    mockClaimTask: vi.fn(),
    mockReleaseTask: vi.fn(),
}))

// Mock dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/task-claiming', () => ({
    claimTask: mockClaimTask,
    releaseTask: mockReleaseTask,
}))

import { claimTaskAction, releaseTaskAction } from '../task-claiming'

// ---------------------------------------------------------------------------
// Valid CUID-format IDs
// ---------------------------------------------------------------------------
const mockUserId = 'cm0000000000000000user001'
const mockTaskId = 'cm00000000000000task0001'

describe('Task Claiming Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: mockUserId, role: 'ADMIN' },
        } as any)
    })

    describe('claimTaskAction', () => {
        it('should return Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await claimTaskAction(mockTaskId)

            expect(result).toEqual({ success: false, message: 'Unauthorized' })
        })

        it('should return Unauthorized for non-admin/inspector roles', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'VIEWER' },
            } as any)

            const result = await claimTaskAction(mockTaskId)

            expect(result).toEqual({
                success: false,
                message: 'Unauthorized: Insufficient permissions',
            })
        })

        it('should allow ADMIN to claim a task', async () => {
            const expiresAt = new Date(Date.now() + 300_000)
            mockClaimTask.mockResolvedValue({ success: true, claimed: true, expiresAt })

            const result = await claimTaskAction(mockTaskId)

            expect(result).toEqual({ success: true, claimed: true, expiresAt })
            expect(mockClaimTask).toHaveBeenCalledWith(mockTaskId, mockUserId)
        })

        it('should allow INSPECTOR to claim a task', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'INSPECTOR' },
            } as any)
            mockClaimTask.mockResolvedValue({ success: true, claimed: true })

            const result = await claimTaskAction(mockTaskId)

            expect(result).toEqual({ success: true, claimed: true })
            expect(mockClaimTask).toHaveBeenCalledWith(mockTaskId, mockUserId)
        })

        it('should return failure when task is already claimed', async () => {
            mockClaimTask.mockResolvedValue({
                success: false,
                claimedBy: 'Other User',
                expiresAt: new Date(),
            })

            const result = await claimTaskAction(mockTaskId)

            expect(result.success).toBe(false)
        })
    })

    describe('releaseTaskAction', () => {
        it('should return Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await releaseTaskAction(mockTaskId)

            expect(result).toEqual({ success: false, message: 'Unauthorized' })
        })

        it('should return Unauthorized for non-admin/inspector roles', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'VIEWER' },
            } as any)

            const result = await releaseTaskAction(mockTaskId)

            expect(result).toEqual({
                success: false,
                message: 'Unauthorized: Insufficient permissions',
            })
        })

        it('should release task successfully for ADMIN', async () => {
            mockReleaseTask.mockResolvedValue(undefined)

            const result = await releaseTaskAction(mockTaskId)

            expect(result).toEqual({ success: true })
            expect(mockReleaseTask).toHaveBeenCalledWith(mockTaskId, mockUserId)
        })

        it('should release task successfully for INSPECTOR', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'INSPECTOR' },
            } as any)
            mockReleaseTask.mockResolvedValue(undefined)

            const result = await releaseTaskAction(mockTaskId)

            expect(result).toEqual({ success: true })
            expect(mockReleaseTask).toHaveBeenCalledWith(mockTaskId, mockUserId)
        })
    })
})
