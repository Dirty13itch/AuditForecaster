/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJob, updateJobStatus } from '../jobs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn()
}))

vi.mock('next/headers', () => ({
    headers: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue('127.0.0.1')
    })
}))

describe('Jobs Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } } as any)
    })

    describe('createJob', () => {
        it('should create job successfully', async () => {
            const formData = new FormData()
            formData.append('builderId', 'builder-1')
            formData.append('lotNumber', '123')
            formData.append('streetAddress', '123 Main St')
            formData.append('city', 'Austin')

            vi.mocked(prisma.job.create).mockResolvedValue({ id: 'cm000000000000000000job01' } as any)

            const result = await createJob(formData)

            expect(prisma.job.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    builderId: 'builder-1',
                    lotNumber: '123',
                    streetAddress: '123 Main St',
                    city: 'Austin',
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
            vi.mocked(prisma.job.findUnique).mockResolvedValue({ id: 'cm000000000000000000job01', status: 'PENDING' } as any)
            vi.mocked(prisma.job.update).mockResolvedValue({ id: 'cm000000000000000000job01' } as any)

            await updateJobStatus('cm000000000000000000job01', 'COMPLETED')

            expect(prisma.job.update).toHaveBeenCalledWith({
                where: { id: 'cm000000000000000000job01' },
                data: { status: 'COMPLETED' }
            })
        })
    })
})
