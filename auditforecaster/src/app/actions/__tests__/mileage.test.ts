import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logTrip, getMileageLogs, getVehicles } from '../mileage'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

describe('Mileage Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: 'test-user', email: 'admin@test.com', role: 'ADMIN', name: 'Admin' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as any)
    })

    describe('logTrip', () => {
        it('creates a mileage log and updates vehicle mileage', async () => {
            const mockLog = { id: 'log-1', distance: 25 }
            vi.mocked(prisma.mileageLog.create).mockResolvedValue(mockLog as any)
            vi.mocked(prisma.vehicle.update).mockResolvedValue({} as any)

            const result = await logTrip({
                vehicleId: 'v-1',
                date: new Date('2025-01-15'),
                distance: 25,
                startLocation: 'Office',
                endLocation: 'Job Site',
                purpose: 'Inspection',
            })

            expect(result.success).toBe(true)
            expect(prisma.mileageLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    vehicleId: 'v-1',
                    distance: 25,
                    status: 'CLASSIFIED',
                }),
            })
            expect(prisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: 'v-1' },
                data: { mileage: { increment: 25 } },
            })
        })

        it('defaults purpose to Business', async () => {
            vi.mocked(prisma.mileageLog.create).mockResolvedValue({ id: 'log-1' } as any)
            vi.mocked(prisma.vehicle.update).mockResolvedValue({} as any)

            await logTrip({
                vehicleId: 'v-1',
                date: new Date(),
                distance: 10,
            })

            expect(prisma.mileageLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ purpose: 'Business' }),
            })
        })

        it('throws when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue({ user: null } as any)

            await expect(logTrip({
                vehicleId: 'v-1',
                date: new Date(),
                distance: 10,
            })).rejects.toThrow('Unauthorized')
        })

        it('handles database errors gracefully', async () => {
            vi.mocked(prisma.mileageLog.create).mockRejectedValue(new Error('DB error'))

            const result = await logTrip({
                vehicleId: 'v-1',
                date: new Date(),
                distance: 10,
            })

            expect(result.success).toBe(false)
        })
    })

    describe('getMileageLogs', () => {
        it('returns all logs when no vehicleId specified', async () => {
            const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }]
            vi.mocked(prisma.mileageLog.findMany).mockResolvedValue(mockLogs as any)

            const result = await getMileageLogs()

            expect(prisma.mileageLog.findMany).toHaveBeenCalledWith({
                where: {},
                orderBy: { date: 'desc' },
                include: { vehicle: true },
            })
            expect(result).toHaveLength(2)
        })

        it('filters by vehicleId when specified', async () => {
            vi.mocked(prisma.mileageLog.findMany).mockResolvedValue([] as any)

            await getMileageLogs('v-1')

            expect(prisma.mileageLog.findMany).toHaveBeenCalledWith({
                where: { vehicleId: 'v-1' },
                orderBy: { date: 'desc' },
                include: { vehicle: true },
            })
        })

        it('throws when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue({ user: null } as any)

            await expect(getMileageLogs()).rejects.toThrow('Unauthorized')
        })
    })

    describe('getVehicles', () => {
        it('returns active vehicles', async () => {
            const mockVehicles = [{ id: 'v-1', status: 'ACTIVE' }]
            vi.mocked(prisma.vehicle.findMany).mockResolvedValue(mockVehicles as any)

            const result = await getVehicles()

            expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
                where: { status: 'ACTIVE' },
            })
            expect(result).toHaveLength(1)
        })

        it('throws when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue({ user: null } as any)

            await expect(getVehicles()).rejects.toThrow('Unauthorized')
        })
    })
})
