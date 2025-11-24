import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTemplate, updateTemplate, deleteTemplate } from '../templates'
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

describe('templates actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createTemplate', () => {
        it('should create template with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'New Template')
            formData.set('checklistItems', JSON.stringify([{ label: 'Item 1' }]))

            prismaMock.reportTemplate.create.mockResolvedValue({
                id: 'temp-1',
                name: 'New Template',
                checklistItems: JSON.stringify([{ label: 'Item 1' }]),
                isDefault: false,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            await createTemplate(formData)

            expect(prismaMock.reportTemplate.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'New Template',
                    checklistItems: expect.stringContaining('"label":"Item 1"')
                })
            })
        })

        it('should fail validation with invalid checklist items', async () => {
            const formData = new FormData()
            formData.set('name', 'New Template')
            formData.set('checklistItems', 'invalid-json')

            await expect(createTemplate(formData)).rejects.toThrow('Invalid checklist items format')
        })

        it('should fail validation with empty name', async () => {
            const formData = new FormData()
            formData.set('name', '')
            formData.set('checklistItems', '[]')

            await expect(createTemplate(formData)).rejects.toThrow('Name is required')
        })
    })

    describe('updateTemplate', () => {
        it('should update template', async () => {
            const formData = new FormData()
            formData.set('name', 'Updated Template')
            formData.set('checklistItems', JSON.stringify([{ label: 'Item 1' }]))
            formData.set('isDefault', 'false')

            await updateTemplate('temp-1', formData)

            expect(prismaMock.reportTemplate.update).toHaveBeenCalledWith({
                where: { id: 'temp-1' },
                data: expect.objectContaining({
                    name: 'Updated Template'
                })
            })
        })

        it('should handle setting as default', async () => {
            const formData = new FormData()
            formData.set('name', 'Default Template')
            formData.set('checklistItems', '[]')
            formData.set('isDefault', 'true')

            await updateTemplate('temp-1', formData)

            // Should unset other defaults
            expect(prismaMock.reportTemplate.updateMany).toHaveBeenCalledWith({
                where: { isDefault: true },
                data: { isDefault: false }
            })

            // Should set this one as default
            expect(prismaMock.reportTemplate.update).toHaveBeenCalledWith({
                where: { id: 'temp-1' },
                data: expect.objectContaining({
                    isDefault: true
                })
            })
        })
    })

    describe('deleteTemplate', () => {
        it('should delete template', async () => {
            // Use valid UUID for test
            const validUuid = '123e4567-e89b-12d3-a456-426614174000'

            await deleteTemplate(validUuid)

            expect(prismaMock.reportTemplate.delete).toHaveBeenCalledWith({
                where: { id: validUuid }
            })
        })

        it('should throw on invalid ID', async () => {
            await expect(deleteTemplate('invalid-id')).rejects.toThrow('Invalid template ID')
        })
    })
})
