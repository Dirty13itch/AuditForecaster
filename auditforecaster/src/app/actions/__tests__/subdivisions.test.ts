import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubdivision, updateSubdivision, getSubdivisions, deleteSubdivision } from '../subdivisions'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('subdivisions actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createSubdivision', () => {
        it('should create subdivision with valid data', async () => {
            const data = {
                name: 'New Subdivision',
                builderId: 'builder-1'
            }

            prismaMock.subdivision.create.mockResolvedValue({
                id: 'sub-1',
                name: 'New Subdivision',
                builderId: 'builder-1',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await createSubdivision(data)

            expect(result.success).toBe(true)
            expect(prismaMock.subdivision.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'New Subdivision',
                    builderId: 'builder-1'
                })
            })
        })

        it('should fail validation with missing name', async () => {
            const data = {
                name: '',
                builderId: 'builder-1'
            }

            const result = await createSubdivision(data)

            expect(result.success).toBe(false)
            expect(prismaMock.subdivision.create).not.toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const data = {
                name: 'New Subdivision',
                builderId: 'builder-1'
            }

            const result = await createSubdivision(data)
            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })
    })

    describe('updateSubdivision', () => {
        it('should update subdivision', async () => {
            const data = { name: 'Updated Name' }

            prismaMock.subdivision.update.mockResolvedValue({
                id: 'sub-1',
                name: 'Updated Name',
                builderId: 'builder-1',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await updateSubdivision('sub-1', data)

            expect(result.success).toBe(true)
            expect(prismaMock.subdivision.update).toHaveBeenCalledWith({
                where: { id: 'sub-1' },
                data: { name: 'Updated Name' }
            })
        })
    })

    describe('getSubdivisions', () => {
        it('should fetch subdivisions', async () => {
            prismaMock.subdivision.findMany.mockResolvedValue([
                { id: 'sub-1', name: 'Sub 1' }
            ] as any)

            const result = await getSubdivisions('builder-1')

            expect(result.success).toBe(true)
            expect(prismaMock.subdivision.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { builderId: 'builder-1' }
            }))
        })
    })

    describe('deleteSubdivision', () => {
        it('should delete subdivision', async () => {
            prismaMock.subdivision.delete.mockResolvedValue({ id: 'sub-1' } as any)

            const result = await deleteSubdivision('sub-1') // Invalid UUID format in test but mocked

            // We need to pass a valid UUID to pass validation
            const validUuid = '123e4567-e89b-12d3-a456-426614174000'
            const result2 = await deleteSubdivision(validUuid)

            expect(result2.success).toBe(true)
            expect(prismaMock.subdivision.delete).toHaveBeenCalledWith({
                where: { id: validUuid }
            })
        })
    })
})
