import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBuilder, updateBuilder, deleteBuilder } from '../builders'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

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

describe('builders actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default to authenticated
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createBuilder', () => {
        it('should create builder with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'Test Builder')
            formData.set('email', 'test@example.com')

            prismaMock.builder.create.mockResolvedValue({
                id: '1',
                name: 'Test Builder',
                email: 'test@example.com',
                phone: null,
                address: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await createBuilder(formData)

            expect(result.message).toBe('Builder created successfully')
            expect(prismaMock.builder.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Test Builder',
                    email: 'test@example.com'
                })
            })
        })

        it('should fail validation with empty name', async () => {
            const formData = new FormData()
            formData.set('name', '')

            const result = await createBuilder(formData)

            expect(result.message).toBe('Failed to create builder')
            expect(logger.error).toHaveBeenCalled()
        })

        it('should throw unauthorized if no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(createBuilder(formData)).rejects.toThrow('Unauthorized')
        })
    })

    describe('updateBuilder', () => {
        it('should update builder with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'Updated Builder')

            prismaMock.builder.update.mockResolvedValue({
                id: '1',
                name: 'Updated Builder',
                email: null,
                phone: null,
                address: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await updateBuilder('1', null, formData)

            expect(result.message).toBe('Builder updated successfully')
            expect(prismaMock.builder.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: expect.objectContaining({
                    name: 'Updated Builder'
                })
            })
        })
    })

    describe('deleteBuilder', () => {
        it('should delete builder', async () => {
            prismaMock.builder.delete.mockResolvedValue({
                id: '1',
                name: 'Deleted Builder',
                email: null,
                phone: null,
                address: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await deleteBuilder('1')

            expect(result.message).toBe('Builder deleted successfully')
            expect(prismaMock.builder.delete).toHaveBeenCalledWith({
                where: { id: '1' }
            })
        })
    })
})
