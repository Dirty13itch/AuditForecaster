import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEquipment, updateEquipment, deleteEquipment } from '../equipment'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { mockReset } from 'vitest-mock-extended'

// Mock dependencies
// prisma is already mocked in setup.ts



vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.unmock('../equipment')

describe('equipment actions', () => {
    console.log('DEBUG: createEquipment type:', typeof createEquipment)
    console.log('DEBUG: createEquipment:', createEquipment)
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        mockReset(prisma as any)
    })

    describe('createEquipment', () => {
        it('should create equipment with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'Blower Door')
            formData.set('type', 'Testing')
            formData.set('serialNumber', 'SN123456')
            formData.set('status', 'ACTIVE')

                ; (prisma.equipment.findUnique as any).mockResolvedValue(null)
                ; (prisma.equipment.create as any).mockResolvedValue({
                    id: '1',
                    name: 'Blower Door',
                    type: 'Testing',
                    serialNumber: 'SN123456',
                    status: 'ACTIVE',
                    lastCalibration: null,
                    nextCalibration: null,
                    assignedTo: null,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await createEquipment(null, formData)

            expect(result.message).toBe('Equipment added successfully')
            expect(prisma.equipment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Blower Door',
                    serialNumber: 'SN123456'
                })
            })
        })

        it('should reject duplicate serial number', async () => {
            const formData = new FormData()
            formData.set('name', 'Blower Door')
            formData.set('type', 'Testing')
            formData.set('serialNumber', 'SN123456')
            formData.set('status', 'ACTIVE')

                ; (prisma.equipment.findUnique as any).mockResolvedValue({
                    id: '2',
                    serialNumber: 'SN123456'
                } as any)

            const result = await createEquipment(null, formData)

            expect(result.message).toContain('already exists')
            expect(prisma.equipment.create).not.toHaveBeenCalled()
        })
    })

    describe('updateEquipment', () => {
        it('should update equipment', async () => {
            const formData = new FormData()
            formData.set('name', 'Updated Blower Door')
            formData.set('type', 'Testing')
            formData.set('serialNumber', 'SN123456')
            formData.set('status', 'MAINTENANCE')

                ; (prisma.equipment.update as any).mockResolvedValue({
                    id: '1',
                    name: 'Updated Blower Door',
                    type: 'Testing',
                    serialNumber: 'SN123456',
                    status: 'MAINTENANCE',
                    lastCalibration: null,
                    nextCalibration: null,
                    assignedTo: null,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await updateEquipment('1', null, formData)

            expect(result.message).toBe('Equipment updated successfully')
            expect(prisma.equipment.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: expect.objectContaining({
                    status: 'MAINTENANCE'
                })
            })
        })
    })

    describe('deleteEquipment', () => {
        it('should delete equipment', async () => {
            ; (prisma.equipment.delete as any).mockResolvedValue({
                id: '1',
                name: 'Deleted Equipment',
                type: 'Testing',
                serialNumber: 'SN123456',
                status: 'RETIRED',
                lastCalibration: null,
                nextCalibration: null,
                assignedTo: null,
                notes: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await deleteEquipment('1')

            expect(result.message).toBe('Equipment deleted successfully')
            expect(prisma.equipment.delete).toHaveBeenCalledWith({
                where: { id: '1' }
            })
        })
    })
})
