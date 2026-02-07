import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createReinspection } from '../inspections'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// Mock dependencies - include $transaction for atomic operations
vi.mock('@/lib/prisma', () => {
    const prismaMock: any = {
        inspection: {
            create: vi.fn(),
        },
        job: {
            update: vi.fn(),
        },
        $transaction: vi.fn()
    }
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    return { prisma: prismaMock }
})

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

// Mock isRedirectError to prevent issues
vi.mock('next/dist/client/components/redirect-error', () => ({
    isRedirectError: vi.fn().mockReturnValue(false)
}))

describe('createReinspection', () => {
    const mockJobId = 'cm00000000000000000000job1'
    const mockUserId = 'user-123'

    beforeEach(() => {
        vi.clearAllMocks()
        // Re-setup $transaction mock after clearAllMocks
        vi.mocked(prisma.$transaction as any).mockImplementation(async (cb: any) => cb(prisma))
    })

    it('creates a new inspection and updates job status', async () => {
        // Mock auth session - include role for RBAC check
        vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId, role: 'ADMIN' } } as any)

        // Mock prisma responses
        const mockNewInspection = { id: 'inspection-new' }
        vi.mocked(prisma.inspection.create).mockResolvedValue(mockNewInspection as any)
        vi.mocked(prisma.job.update).mockResolvedValue({ id: mockJobId } as any)

        await createReinspection(mockJobId)

        // Verify inspection creation (called via tx inside $transaction)
        expect(prisma.inspection.create).toHaveBeenCalledWith({
            data: {
                jobId: mockJobId,
                type: 'BLOWER_DOOR',
                data: '{}',
                answers: '[]',
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
