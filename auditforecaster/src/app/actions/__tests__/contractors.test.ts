import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from '../contractors'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

describe('Contractor Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'test-user', email: 'admin@test.com', role: 'ADMIN', name: 'Admin' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as any)
    })

    describe('createSubcontractor', () => {
        it('creates a subcontractor with valid data', async () => {
            vi.mocked(prisma.subcontractor.create).mockResolvedValue({ id: 'new-id' } as any)

            const result = await createSubcontractor({
                name: 'Test Contractor',
                type: 'Company',
                email: 'contractor@test.com',
                phone: '555-0100',
                status: 'ACTIVE',
            } as any)

            expect(result.success).toBe(true)
            expect(prisma.subcontractor.create).toHaveBeenCalled()
        })

        it('returns error when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await createSubcontractor({
                name: 'Test',
                type: 'Company',
                status: 'ACTIVE',
            } as any)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Unauthorized')
        })

        it('returns validation error for invalid data', async () => {
            const result = await createSubcontractor({} as any)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Invalid data')
        })
    })

    describe('updateSubcontractor', () => {
        it('updates a subcontractor with valid data', async () => {
            vi.mocked(prisma.subcontractor.update).mockResolvedValue({ id: '123' } as any)

            const result = await updateSubcontractor('123', {
                name: 'Updated Name',
                type: 'Individual',
                status: 'ACTIVE',
            } as any)

            expect(result.success).toBe(true)
            expect(prisma.subcontractor.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: '123' } })
            )
        })

        it('returns error when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await updateSubcontractor('123', { name: 'Test' } as any)
            expect(result.success).toBe(false)
            expect(result.message).toBe('Unauthorized')
        })
    })

    describe('deleteSubcontractor', () => {
        it('deletes a subcontractor', async () => {
            vi.mocked(prisma.subcontractor.delete).mockResolvedValue({ id: '123' } as any)

            const result = await deleteSubcontractor('123')

            expect(result.success).toBe(true)
            expect(prisma.subcontractor.delete).toHaveBeenCalledWith({ where: { id: '123' } })
        })

        it('returns error when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await deleteSubcontractor('123')
            expect(result.success).toBe(false)
            expect(result.message).toBe('Unauthorized')
        })

        it('handles database errors gracefully', async () => {
            vi.mocked(prisma.subcontractor.delete).mockRejectedValue(new Error('DB error'))

            const result = await deleteSubcontractor('nonexistent')
            expect(result.success).toBe(false)
        })
    })
})
