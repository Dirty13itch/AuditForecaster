import { createReinspection } from '../inspections'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        inspection: {
            create: jest.fn(),
        },
        job: {
            update: jest.fn(),
        }
    }
}))

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}))

jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}))

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

describe('createReinspection', () => {
    const mockJobId = 'job-123'
    const mockUserId = 'user-123'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('creates a new inspection and updates job status', async () => {
        // Mock auth session
        (auth as jest.Mock).mockResolvedValue({ user: { id: mockUserId } })

        // Mock prisma responses
        const mockNewInspection = { id: 'inspection-new' }
            ; (prisma.inspection.create as jest.Mock).mockResolvedValue(mockNewInspection)
            ; (prisma.job.update as jest.Mock).mockResolvedValue({ id: mockJobId })

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
        (auth as jest.Mock).mockResolvedValue(null)

        await expect(createReinspection(mockJobId)).rejects.toThrow('You must be logged in')
    })
})
