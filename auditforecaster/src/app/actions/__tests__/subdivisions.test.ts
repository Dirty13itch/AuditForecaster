import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubdivision, updateSubdivision, getSubdivisions, deleteSubdivision } from '../subdivisions'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { mockReset } from 'vitest-mock-extended'

// Mock dependencies
// prisma is already mocked in setup.ts

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
        mockReset(prisma as any)
    })

    describe('createSubdivision', () => {
        it('should create subdivision with valid data', async () => {
            const data = {
                name: 'New Subdivision',
                builderId: '123e4567-e89b-12d3-a456-426614174000'
            }

                ; (prisma.subdivision.create as any).mockResolvedValue({
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    name: 'New Subdivision',
                    builderId: '123e4567-e89b-12d3-a456-426614174000',
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await createSubdivision(data)

            expect(result.success).toBe(true)
            expect(prisma.subdivision.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'New Subdivision',
                    builderId: '123e4567-e89b-12d3-a456-426614174000'
                })
            })
        })

        it('should fail validation with missing name', async () => {
            const data = {
                name: '',
                builderId: '123e4567-e89b-12d3-a456-426614174000'
            }

            const result = await createSubdivision(data)

            expect(result.success).toBe(false)
            expect(prisma.subdivision.create).not.toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const data = {
                name: 'New Subdivision',
                builderId: '123e4567-e89b-12d3-a456-426614174000'
            }

            const result = await createSubdivision(data)
            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })
    })

    describe('updateSubdivision', () => {
        it('should update subdivision', async () => {
            const data = { name: 'Updated Name' }

                ; (prisma.subdivision.update as any).mockResolvedValue({
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    name: 'Updated Name',
                    builderId: '123e4567-e89b-12d3-a456-426614174000',
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await updateSubdivision('123e4567-e89b-12d3-a456-426614174001', data)

            expect(result.success).toBe(true)
            expect(prisma.subdivision.update).toHaveBeenCalledWith({
                where: { id: '123e4567-e89b-12d3-a456-426614174001' },
                data: { name: 'Updated Name' }
            })
        })
    })

    describe('getSubdivisions', () => {
        it('should fetch subdivisions', async () => {
            ; (prisma.subdivision.findMany as any).mockResolvedValue([
                { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Sub 1' }
            ] as any)

            const result = await getSubdivisions('123e4567-e89b-12d3-a456-426614174000')

            expect(result.success).toBe(true)
            expect(prisma.subdivision.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { builderId: '123e4567-e89b-12d3-a456-426614174000' }
            }))
        })
    })

    describe('deleteSubdivision', () => {
        it('should delete subdivision', async () => {
            ; (prisma.subdivision.delete as any).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174001' } as any)

            const validUuid = '123e4567-e89b-12d3-a456-426614174001'
            const result2 = await deleteSubdivision(validUuid)

            expect(result2.success).toBe(true)
            expect(prisma.subdivision.delete).toHaveBeenCalledWith({
                where: { id: validUuid }
            })
        })
    })
})
