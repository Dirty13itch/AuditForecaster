import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateInspection, createReinspection } from '../inspections'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { sendInspectionCompletedEmail } from '@/lib/email'
import { redirect } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        inspection: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        job: {
            update: vi.fn()
        }
    }
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

describe('Inspections Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', name: 'Inspector Gadget' } } as any)
    })

    describe('updateInspection', () => {
        it('should create new inspection and calculate ACH50 correctly', async () => {
            const formData = new FormData()
            formData.append('jobId', 'job-1')
            formData.append('cfm50', '1000')
            formData.append('houseVolume', '20000') // ACH50 = (1000 * 60) / 20000 = 3.0
            formData.append('checklist', JSON.stringify([{ id: '1', status: 'PASS' }]))

            vi.mocked(prisma.inspection.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.inspection.create).mockResolvedValue({ id: 'insp-1' } as any)
            vi.mocked(prisma.job.update).mockResolvedValue({
                id: 'job-1',
                streetAddress: '123 Main',
                city: 'Austin'
            } as any)

            try {
                await updateInspection(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            // Verify calculation
            expect(prisma.inspection.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    data: expect.stringContaining('"ach50":3'),
                    jobId: 'job-1'
                })
            }))

            // Verify job update
            expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'job-1' },
                data: { status: 'COMPLETED' }
            }))

            // Verify email
            expect(sendInspectionCompletedEmail).toHaveBeenCalled()
            expect(redirect).toHaveBeenCalledWith('/dashboard/jobs/job-1')
        })

        it('should update existing inspection', async () => {
            const formData = new FormData()
            formData.append('jobId', 'job-1')
            formData.append('cfm50', '1200')
            formData.append('houseVolume', '20000')

            vi.mocked(prisma.inspection.findFirst).mockResolvedValue({ id: 'existing-id' } as any)
            vi.mocked(prisma.job.update).mockResolvedValue({ streetAddress: '123 Main' } as any)

            try {
                await updateInspection(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prisma.inspection.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'existing-id' }
            }))
            expect(prisma.inspection.create).not.toHaveBeenCalled()
        })

        it('should fail validation if fields missing', async () => {
            const formData = new FormData()
            // Missing jobId and cfm50

            await expect(updateInspection(formData)).rejects.toThrow('Please check all required fields')
        })
    })

    describe('createReinspection', () => {
        it('should create reinspection and update job status', async () => {
            vi.mocked(prisma.inspection.create).mockResolvedValue({ id: 'new-insp-1' } as any)

            try {
                await createReinspection('job-1')
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prisma.inspection.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ jobId: 'job-1' })
            }))
            expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'job-1' },
                data: { status: 'IN_PROGRESS' }
            }))
            expect(redirect).toHaveBeenCalledWith('/dashboard/inspections/new-insp-1')
        })
    })
})
