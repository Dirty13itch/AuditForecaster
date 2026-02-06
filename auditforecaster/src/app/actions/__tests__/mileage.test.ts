import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logTrip, getMileageLogs, getVehicles } from '../mileage'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        mileageLog: {
            create: vi.fn(),
            findMany: vi.fn()
        },
        vehicle: {
            update: vi.fn(),
            findMany: vi.fn()
        },
        $transaction: vi.fn((callback) => callback(prisma))
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

const MOCK_USER_ID = 'cm0000000000000000user001'
const MOCK_VEHICLE_ID = 'cm000000000000000vehicle1'
const MOCK_LOG_ID = 'cm00000000000000mileage1'

describe('Mileage Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'ADMIN' } } as any)
        // Re-establish $transaction mock after clearAllMocks
        vi.mocked(prisma.$transaction as any).mockImplementation(async (callback: any) => callback(prisma))
    })

    describe('logTrip', () => {
        it('should log a trip successfully with default purpose', async () => {
            const tripData = {
                vehicleId: MOCK_VEHICLE_ID,
                date: new Date('2025-06-15'),
                distance: 45.5,
                startLocation: 'Office',
                endLocation: 'Job Site A'
            }

            const mockLog = {
                id: MOCK_LOG_ID,
                ...tripData,
                purpose: 'BUSINESS',
                status: 'CLASSIFIED'
            }

            vi.mocked(prisma.mileageLog.create as any).mockResolvedValue(mockLog)
            vi.mocked(prisma.vehicle.update as any).mockResolvedValue({})

            const result = await logTrip(tripData)

            expect(result).toEqual({ success: true, log: mockLog })
            expect(prisma.mileageLog.create).toHaveBeenCalledWith({
                data: {
                    vehicleId: MOCK_VEHICLE_ID,
                    date: tripData.date,
                    distance: 45.5,
                    startLocation: 'Office',
                    endLocation: 'Job Site A',
                    purpose: 'BUSINESS',
                    status: 'CLASSIFIED'
                }
            })
            expect(prisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: MOCK_VEHICLE_ID },
                data: { mileage: { increment: 46 } }
            })
        })

        it('should log a trip with custom purpose', async () => {
            const tripData = {
                vehicleId: MOCK_VEHICLE_ID,
                date: new Date('2025-06-15'),
                distance: 20,
                purpose: 'PERSONAL'
            }

            const mockLog = {
                id: MOCK_LOG_ID,
                ...tripData,
                status: 'CLASSIFIED'
            }

            vi.mocked(prisma.mileageLog.create as any).mockResolvedValue(mockLog)
            vi.mocked(prisma.vehicle.update as any).mockResolvedValue({})

            const result = await logTrip(tripData)

            expect(result).toEqual({ success: true, log: mockLog })
            expect(prisma.mileageLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    purpose: 'PERSONAL'
                })
            })
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const tripData = {
                vehicleId: MOCK_VEHICLE_ID,
                date: new Date(),
                distance: 10
            }

            await expect(logTrip(tripData)).rejects.toThrow('Unauthorized')
        })

        it('should return error when transaction fails', async () => {
            vi.mocked(prisma.$transaction as any).mockRejectedValue(new Error('DB error'))

            const tripData = {
                vehicleId: MOCK_VEHICLE_ID,
                date: new Date(),
                distance: 10
            }

            const result = await logTrip(tripData)

            expect(result).toEqual({ success: false, error: 'Failed to log trip' })
        })

        it('should round distance for vehicle mileage increment', async () => {
            const tripData = {
                vehicleId: MOCK_VEHICLE_ID,
                date: new Date(),
                distance: 33.7
            }

            vi.mocked(prisma.mileageLog.create as any).mockResolvedValue({ id: MOCK_LOG_ID })
            vi.mocked(prisma.vehicle.update as any).mockResolvedValue({})

            await logTrip(tripData)

            expect(prisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: MOCK_VEHICLE_ID },
                data: { mileage: { increment: 34 } }
            })
        })
    })

    describe('getMileageLogs', () => {
        it('should return mileage logs for all vehicles when no vehicleId', async () => {
            const mockLogs = [
                { id: MOCK_LOG_ID, vehicleId: MOCK_VEHICLE_ID, distance: 30, vehicle: { name: 'Truck 1' } }
            ]

            vi.mocked(prisma.mileageLog.findMany as any).mockResolvedValue(mockLogs)

            const result = await getMileageLogs()

            expect(result).toEqual(mockLogs)
            expect(prisma.mileageLog.findMany).toHaveBeenCalledWith({
                where: {},
                take: 200,
                orderBy: { date: 'desc' },
                include: { vehicle: true }
            })
        })

        it('should filter logs by vehicleId when provided', async () => {
            vi.mocked(prisma.mileageLog.findMany as any).mockResolvedValue([])

            await getMileageLogs(MOCK_VEHICLE_ID)

            expect(prisma.mileageLog.findMany).toHaveBeenCalledWith({
                where: { vehicleId: MOCK_VEHICLE_ID },
                take: 200,
                orderBy: { date: 'desc' },
                include: { vehicle: true }
            })
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getMileageLogs()).rejects.toThrow('Unauthorized')
        })
    })

    describe('getVehicles', () => {
        it('should return active vehicles', async () => {
            const mockVehicles = [
                { id: MOCK_VEHICLE_ID, name: 'Truck 1', status: 'ACTIVE' }
            ]

            vi.mocked(prisma.vehicle.findMany as any).mockResolvedValue(mockVehicles)

            const result = await getVehicles()

            expect(result).toEqual(mockVehicles)
            expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
                where: { status: 'ACTIVE' },
                take: 100,
                orderBy: { createdAt: 'desc' }
            })
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getVehicles()).rejects.toThrow('Unauthorized')
        })

        it('should return empty array when no active vehicles', async () => {
            vi.mocked(prisma.vehicle.findMany as any).mockResolvedValue([])

            const result = await getVehicles()

            expect(result).toEqual([])
        })
    })
})
