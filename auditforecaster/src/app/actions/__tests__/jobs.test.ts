import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJob, updateJobStatus } from '../jobs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getCoordinates } from '@/lib/geocoding'
import { redirect } from 'next/navigation'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            create: vi.fn(),
            update: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/geocoding', () => ({
    getCoordinates: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn()
}))

describe('Jobs Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    describe('createJob', () => {
        it('should create job successfully', async () => {
            const formData = new FormData()
            formData.append('builderId', 'builder-1')
            formData.append('lotNumber', '123')
            formData.append('streetAddress', '123 Main St')
            formData.append('city', 'Austin')

            vi.mocked(getCoordinates).mockResolvedValue({ lat: 30, lng: -97 })
            vi.mocked(prisma.job.create).mockResolvedValue({ id: 'job-1' } as any)


            const result = await createJob(formData)

            expect(prisma.job.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    builderId: 'builder-1',
                    lotNumber: '123',
                    streetAddress: '123 Main St',
                    city: 'Austin',
                    latitude: 30,
                    longitude: -97,
                    status: 'PENDING'
                })
            }))
            expect(result).toEqual({ success: true, message: 'Job created successfully' })
        })

        it('should throw error if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(createJob(formData)).rejects.toThrow('Unauthorized')
        })

        it('should validate required fields', async () => {
            const formData = new FormData()
            // Missing required fields

            await expect(createJob(formData)).rejects.toThrow()
        })
    })

    describe('updateJobStatus', () => {
        it('should update status successfully', async () => {
            vi.mocked(prisma.job.update).mockResolvedValue({ id: 'job-1' } as any)

            await updateJobStatus('job-1', 'COMPLETED')

            expect(prisma.job.update).toHaveBeenCalledWith({
                where: { id: 'job-1' },
                data: { status: 'COMPLETED' }
            })
        })
    })
})
