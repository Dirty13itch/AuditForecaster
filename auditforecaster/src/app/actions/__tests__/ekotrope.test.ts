import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncToEkotrope } from '../ekotrope'
import { prisma } from '@/lib/prisma'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        inspection: {
            findUnique: vi.fn()
        },
        job: {
            update: vi.fn()
        },
        integrationLog: {
            create: vi.fn()
        }
    }
}))

// Mock mapToEkotropeProject
vi.mock('@/lib/integrations/ekotrope', () => ({
    mapToEkotropeProject: vi.fn().mockReturnValue({ mocked: 'payload' })
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('syncToEkotrope', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return error if inspection not found', async () => {
        vi.mocked(prisma.inspection.findUnique).mockResolvedValue(null)

        const result = await syncToEkotrope('invalid-id')

        expect(result).toEqual({ success: false, error: 'Inspection or Job not found' })
    })

    it('should sync successfully and update job', async () => {
        const mockInspection = {
            id: 'insp-1',
            job: {
                id: 'job-1',
                builder: { name: 'Builder' },
                subdivision: { name: 'Subdivision' }
            }
        }

        vi.mocked(prisma.inspection.findUnique).mockResolvedValue(mockInspection as any)
        vi.mocked(prisma.job.update).mockResolvedValue({} as any)
        vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

        const result = await syncToEkotrope('insp-1')

        expect(result.success).toBe(true)
        expect(result.projectId).toBeDefined()
        expect(prisma.job.update).toHaveBeenCalledWith({
            where: { id: 'job-1' },
            data: expect.objectContaining({
                ekotropeProjectId: expect.stringContaining('EKO-'),
                ekotropeSyncedAt: expect.any(Date)
            })
        })
        expect(prisma.integrationLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                service: 'EKOTROPE',
                success: true
            })
        })
    })

    it('should handle errors and log failure', async () => {
        vi.mocked(prisma.inspection.findUnique).mockRejectedValue(new Error('DB Error'))

        const result = await syncToEkotrope('insp-1')

        expect(result.success).toBe(false)
        expect(result.error).toBe('DB Error')
        expect(prisma.integrationLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                service: 'EKOTROPE',
                success: false,
                error: 'DB Error'
            })
        })
    })
})
