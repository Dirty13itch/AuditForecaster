import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createReinspection } from '../inspections'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        inspection: {
            create: vi.fn(),
        },
        job: {
            update: vi.fn(),
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

// Mock email to prevent Resend initialization
vi.mock('@/lib/email', () => ({
    sendInspectionCompletedEmail: vi.fn(),
}))

describe('createReinspection', () => {
    const mockJobId = 'job-123'
    const mockUserId = 'user-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates a new inspection and updates job status', async () => {
        // Mock auth session
        vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any)

        // Mock prisma responses
        const mockNewInspection = { id: 'inspection-new' }
        vi.mocked(prisma.inspection.create).mockResolvedValue(mockNewInspection as any)
        vi.mocked(prisma.job.update).mockResolvedValue({ id: mockJobId } as any)

        await createReinspection(mockJobId)

        // Verify inspection creation
        expect(prisma.inspection.create).toHaveBeenCalledWith({
            data: {
                jobId: mockJobId,
                type: 'BLOWER_DOOR',
                data: '{}',
                checklist: '[]',
            }
        })

        // Verify job status update
        expect(prisma.job.update).toHaveBeenCalledWith({
            where: { id: mockJobId },
            data: { status: 'IN_PROGRESS' }
        })

        // Verify redirect
        expect(redirect).toHaveBeenCalledWith(`/dashboard/inspections/${mockNewInspection.id}`)
    })

    it('throws error if not authenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null)

        await expect(createReinspection(mockJobId)).rejects.toThrow('You must be logged in')
    })
})
