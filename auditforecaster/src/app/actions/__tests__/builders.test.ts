import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBuilder, updateBuilder, deleteBuilder } from '../builders'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { mockReset } from 'vitest-mock-extended'

// Mock dependencies
// prisma is already mocked in setup.ts

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
        mockReset(prisma as any)
    })

    describe('createBuilder', () => {
        it('should create builder with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'Test Builder')
            formData.set('email', 'test@example.com')

                ; (prisma.builder.create as any).mockResolvedValue({
                    id: 'cm0000000000000000blder01',
                    name: 'Test Builder',
                    email: 'test@example.com',
                    phone: null,
                    address: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await createBuilder(formData)

            expect(result.message).toBe('Builder created successfully')
            expect(prisma.builder.create).toHaveBeenCalledWith({
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

                ; (prisma.builder.update as any).mockResolvedValue({
                    id: 'cm0000000000000000blder01',
                    name: 'Updated Builder',
                    email: null,
                    phone: null,
                    address: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await updateBuilder('cm0000000000000000blder01', null, formData)

            expect(result.message).toBe('Builder updated successfully')
            expect(prisma.builder.update).toHaveBeenCalledWith({
                where: { id: 'cm0000000000000000blder01' },
                data: expect.objectContaining({
                    name: 'Updated Builder'
                })
            })
        })
    })

    describe('deleteBuilder', () => {
        it('should delete builder', async () => {
            ; (prisma.builder.delete as any).mockResolvedValue({
                id: 'cm0000000000000000blder01',
                name: 'Deleted Builder',
                email: null,
                phone: null,
                address: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await deleteBuilder('cm0000000000000000blder01')

            expect(result.message).toBe('Builder deleted successfully')
            expect(prisma.builder.delete).toHaveBeenCalledWith({
                where: { id: 'cm0000000000000000blder01' }
            })
        })
    })
})
