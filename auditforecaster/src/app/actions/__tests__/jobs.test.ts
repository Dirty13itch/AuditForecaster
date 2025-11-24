import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJob, updateJobStatus, updateJob } from '../jobs'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { getCoordinates } from '@/lib/geocoding'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
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

describe('jobs actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createJob', () => {
        it('should create job with geocoding', async () => {
            const formData = new FormData()
            formData.set('builderId', 'builder-1')
            formData.set('lotNumber', '123')
            formData.set('streetAddress', '123 Main St')
            formData.set('city', 'Test City')

            vi.mocked(getCoordinates).mockResolvedValue({ lat: 40.7128, lng: -74.0060 } as any)

            try {
                await createJob(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(getCoordinates).toHaveBeenCalledWith('123 Main St, Test City')
            expect(prismaMock.job.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    builderId: 'builder-1',
                    lotNumber: '123',
                    latitude: 40.7128,
                    longitude: -74.0060,
                    status: 'PENDING'
                })
            })
        })

        it('should set status to ASSIGNED if inspectorId provided', async () => {
            const formData = new FormData()
            formData.set('builderId', 'builder-1')
            formData.set('lotNumber', '123')
            formData.set('streetAddress', '123 Main St')
            formData.set('city', 'Test City')
            formData.set('inspectorId', 'insp-1')

            try {
                await createJob(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prismaMock.job.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    status: 'ASSIGNED',
                    inspectorId: 'insp-1'
                })
            })
        })

        it('should throw unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(createJob(formData)).rejects.toThrow('Unauthorized')
        })
    })

    describe('updateJobStatus', () => {
        it('should update job status', async () => {
            await updateJobStatus('job-1', 'COMPLETED')

            expect(prismaMock.job.update).toHaveBeenCalledWith({
                where: { id: 'job-1' },
                data: { status: 'COMPLETED' }
            })
        })
    })

    describe('updateJob', () => {
        it('should update job details', async () => {
            const formData = new FormData()
            formData.set('id', 'job-1')
            formData.set('status', 'IN_PROGRESS')
            formData.set('streetAddress', '456 New St')
            formData.set('city', 'New City')

            try {
                await updateJob(formData)
            } catch (e) {
                if ((e as Error).message !== 'NEXT_REDIRECT') throw e
            }

            expect(prismaMock.job.update).toHaveBeenCalledWith({
                where: { id: 'job-1' },
                data: expect.objectContaining({
                    status: 'IN_PROGRESS',
                    streetAddress: '456 New St',
                    city: 'New City',
                    address: '456 New St, New City'
                })
            })
        })
    })
})
