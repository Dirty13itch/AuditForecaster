import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from './contractors'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        subcontractor: {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

describe('Contractor Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should create a subcontractor', async () => {
        const mockData = {
            name: 'Test Contractor',
            type: 'Company' as const,
            email: 'test@example.com',
            phone: '1234567890',
            status: 'ACTIVE' as const,
        }

        await createSubcontractor(mockData)

        expect(prisma.subcontractor.create).toHaveBeenCalledWith({
            data: mockData,
        })
    })

    it('should update a subcontractor', async () => {
        const mockData = {
            name: 'Updated Name',
            type: 'Individual' as const,
            status: 'ACTIVE' as const,
        }

        await updateSubcontractor('123', mockData)

        expect(prisma.subcontractor.update).toHaveBeenCalledWith({
            where: { id: '123' },
            data: mockData,
        })
    })

    it('should delete a subcontractor', async () => {
        await deleteSubcontractor('123')

        expect(prisma.subcontractor.delete).toHaveBeenCalledWith({
            where: { id: '123' },
        })
    })
})
