import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEquipment, updateEquipment, deleteEquipment } from '../equipment'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { mockReset } from 'vitest-mock-extended'

// Mock @/auth - required for auth() calls in server actions
vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

import { auth } from '@/auth'

// Mock dependencies
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.unmock('../equipment')

describe('equipment actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        mockReset(prisma as any)
    })

    describe('createEquipment', () => {
        it('should create equipment with valid data', async () => {
            const input = {
                name: 'Blower Door',
                type: 'Testing',
                serialNumber: 'SN123456',
                status: 'ACTIVE' as const
            }

                ; (prisma.equipment.findUnique as any).mockResolvedValue(null)
                ; (prisma.equipment.create as any).mockResolvedValue({
                    id: '1',
                    ...input,
                    lastCalibration: null,
                    nextCalibration: null,
                    assignedTo: null,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await createEquipment(input)

            expect(result.message).toBe('Equipment added to inventory')
            expect(prisma.equipment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Blower Door',
                    serialNumber: 'SN123456'
                })
            })
        })

        it('should reject duplicate serial number', async () => {
            const input = {
                name: 'Blower Door',
                type: 'Testing',
                serialNumber: 'SN123456',
                status: 'ACTIVE' as const
            }

            // Mock P2002 error - must match Prisma.PrismaClientKnownRequestError shape
            // The source checks: error instanceof Prisma.PrismaClientKnownRequestError
            // Import the actual error class for proper instanceof check
            const { Prisma } = await import('@prisma/client')
            const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0'
            })
                ; (prisma.equipment.create as any).mockRejectedValue(error)

            const result = await createEquipment(input)

            expect(result.message).toBe('Serial Number already exists')
        })
    })

    describe('updateEquipment', () => {
        it('should update equipment', async () => {
            const input = {
                name: 'Updated Blower Door',
                type: 'Testing',
                serialNumber: 'SN123456',
                status: 'REPAIR' as const
            }

                ; (prisma.equipment.update as any).mockResolvedValue({
                    id: '1',
                    ...input,
                    lastCalibration: null,
                    nextCalibration: null,
                    assignedTo: null,
                    notes: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await updateEquipment('1', input)

            expect(result.message).toBe('Equipment updated successfully')
            expect(prisma.equipment.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: expect.objectContaining({
                    status: 'REPAIR'
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
