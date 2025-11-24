import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateInspection, createReinspection } from '../inspections'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { sendInspectionCompletedEmail } from '@/lib/email'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/email', () => ({
    sendInspectionCompletedEmail: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn()
}))

describe('inspections actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('updateInspection', () => {
        it('should create new inspection with valid data', async () => {
            const formData = new FormData()
            formData.set('jobId', 'job-123')
            formData.set('cfm50', '1000')
            formData.set('houseVolume', '20000')
            formData.set('notes', 'Test notes')
            formData.set('checklist', JSON.stringify([{ id: '1', checked: true }]))

            // Mock no existing inspection
            prismaMock.inspection.findFirst.mockResolvedValue(null)

            // Mock job update return
            prismaMock.job.update.mockResolvedValue({
                id: 'job-123',
                streetAddress: '123 Main St',
                city: 'Test City'
            } as any)

            try {
                await updateInspection(formData)
            } catch (e) {
                // Redirect throws an error in Next.js, catch it
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            // Verify creation
            expect(prismaMock.inspection.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    jobId: 'job-123',
                    type: 'BLOWER_DOOR',
                    data: expect.stringContaining('"cfm50":1000'),
                    checklist: expect.stringContaining('"checked":true')
                })
            })

            // Verify calculations (1000 * 60 / 20000 = 3.0 ACH50)
            expect(prismaMock.inspection.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    data: expect.stringContaining('"ach50":3')
                })
            })

            // Verify email sent
            expect(sendInspectionCompletedEmail).toHaveBeenCalled()
        })

        it('should update existing inspection', async () => {
            const formData = new FormData()
            formData.set('jobId', 'job-123')
            formData.set('cfm50', '1200')

            // Mock existing inspection
            prismaMock.inspection.findFirst.mockResolvedValue({
                id: 'insp-123',
                jobId: 'job-123'
            } as any)

            prismaMock.job.update.mockResolvedValue({
                id: 'job-123',
                streetAddress: '123 Main St',
                city: 'Test City'
            } as any)

            try {
                await updateInspection(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prismaMock.inspection.update).toHaveBeenCalledWith({
                where: { id: 'insp-123' },
                data: expect.objectContaining({
                    data: expect.stringContaining('"cfm50":1200')
                })
            })
        })

        it('should fail validation with missing fields', async () => {
            const formData = new FormData()
            // Missing jobId and cfm50

            await expect(updateInspection(formData)).rejects.toThrow('Please check all required fields')
        })

        it('should throw unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(updateInspection(formData)).rejects.toThrow('Unauthorized')
        })
    })

    describe('createReinspection', () => {
        it('should create reinspection and update job status', async () => {
            prismaMock.inspection.create.mockResolvedValue({
                id: 'new-insp-123'
            } as any)

            try {
                await createReinspection('job-123')
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prismaMock.inspection.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    jobId: 'job-123',
                    data: '{}'
                })
            })

            expect(prismaMock.job.update).toHaveBeenCalledWith({
                where: { id: 'job-123' },
                data: { status: 'IN_PROGRESS' }
            })
        })

        it('should throw unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(createReinspection('job-123')).rejects.toThrow('You must be logged in')
        })
    })
})
