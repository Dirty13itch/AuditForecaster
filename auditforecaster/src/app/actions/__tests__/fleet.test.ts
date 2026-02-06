import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVehicle, updateVehicle, deleteVehicle } from '../fleet'
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

describe('fleet actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        mockReset(prisma as any)
    })

    describe('createVehicle', () => {
        it('should create vehicle with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'Test Truck')
            formData.set('make', 'Ford')
            formData.set('model', 'F-150')
            formData.set('year', '2023')
            formData.set('licensePlate', 'ABC-123')
            formData.set('mileage', '1000')
            formData.set('status', 'ACTIVE')

                ; (prisma.vehicle.create as any).mockResolvedValue({
                    id: 'cm0000000000000000fleet01',
                    name: 'Test Truck',
                    make: 'Ford',
                    model: 'F-150',
                    year: 2023,
                    licensePlate: 'ABC-123',
                    vin: null,
                    mileage: 1000,
                    status: 'ACTIVE',
                    nextService: null,
                    assignedTo: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await createVehicle(null, formData)

            expect(result.message).toBe('Vehicle created successfully')
            expect(prisma.vehicle.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Test Truck',
                    licensePlate: 'ABC-123'
                })
            })
        })

        it('should fail validation with missing required fields', async () => {
            const formData = new FormData()
            formData.set('name', 'Test Truck')
            // Missing make, model, etc.

            const result = await createVehicle(null, formData)

            expect(result.message).toBe('Missing required fields')
        })
    })

    describe('updateVehicle', () => {
        it('should update vehicle', async () => {
            const formData = new FormData()
            formData.set('name', 'Updated Truck')
            formData.set('make', 'Ford')
            formData.set('model', 'F-150')
            formData.set('year', '2023')
            formData.set('licensePlate', 'ABC-123')
            formData.set('mileage', '2000')
            formData.set('status', 'ACTIVE')

                ; (prisma.vehicle.update as any).mockResolvedValue({
                    id: 'cm0000000000000000fleet01',
                    name: 'Updated Truck',
                    make: 'Ford',
                    model: 'F-150',
                    year: 2023,
                    licensePlate: 'ABC-123',
                    vin: null,
                    mileage: 2000,
                    status: 'ACTIVE',
                    nextService: null,
                    assignedTo: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })

            const result = await updateVehicle('cm0000000000000000fleet01', null, formData)

            expect(result.message).toBe('Vehicle updated successfully')
            expect(prisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: 'cm0000000000000000fleet01' },
                data: expect.objectContaining({
                    name: 'Updated Truck',
                    mileage: 2000
                })
            })
        })
    })

    describe('deleteVehicle', () => {
        it('should delete vehicle', async () => {
            ; (prisma.vehicle.delete as any).mockResolvedValue({
                id: 'cm0000000000000000fleet01',
                name: 'Deleted Truck',
                make: 'Ford',
                model: 'F-150',
                year: 2023,
                licensePlate: 'ABC-123',
                vin: null,
                mileage: 1000,
                status: 'RETIRED',
                nextService: null,
                assignedTo: null,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await deleteVehicle('cm0000000000000000fleet01')

            expect(result.message).toBe('Vehicle deleted successfully')
            expect(prisma.vehicle.delete).toHaveBeenCalledWith({
                where: { id: 'cm0000000000000000fleet01' }
            })
        })
    })
})
