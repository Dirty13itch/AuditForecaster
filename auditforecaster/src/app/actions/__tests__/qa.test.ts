import { describe, it, expect, vi, beforeEach } from 'vitest'
import { approveJob, rejectJob } from '../qa'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { sendQARejectionEmail } from '@/lib/email'
import { mockReset } from 'vitest-mock-extended'

// Mock dependencies
// prisma is already mocked in setup.ts

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/email', () => ({
    sendQARejectionEmail: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn()
}))

describe('qa actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        mockReset(prisma as any)
    })

    describe('approveJob', () => {
        it('should approve job', async () => {
            const formData = new FormData()
            formData.set('jobId', '123e4567-e89b-12d3-a456-426614174000')

            try {
                await approveJob(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prisma.job.update).toHaveBeenCalledWith({
                where: { id: '123e4567-e89b-12d3-a456-426614174000' },
                data: { status: 'INVOICED' }
            })
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(approveJob(formData)).rejects.toThrow('Unauthorized')
        })
    })

    describe('rejectJob', () => {
        it('should reject job and send email', async () => {
            const formData = new FormData()
            formData.set('jobId', '123e4567-e89b-12d3-a456-426614174000')
            formData.set('reason', 'Missing photos')

                ; (prisma.job.update as any).mockResolvedValue({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    streetAddress: '123 Main St',
                    city: 'Test City',
                    inspector: { email: 'inspector@example.com' }
                } as any)

            try {
                await rejectJob(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: '123e4567-e89b-12d3-a456-426614174000' },
                data: expect.objectContaining({
                    status: 'IN_PROGRESS',
                    rejectionReason: 'Missing photos'
                })
            }))

            expect(sendQARejectionEmail).toHaveBeenCalledWith(
                'inspector@example.com',
                expect.stringContaining('123 Main St'),
                'Missing photos',
                expect.any(String)
            )
        })

        it('should fail validation without reason', async () => {
            const formData = new FormData()
            formData.set('jobId', '123e4567-e89b-12d3-a456-426614174000')
            // Missing reason

            await expect(rejectJob(formData)).rejects.toThrow('Rejection reason is required')
        })
    })
})
