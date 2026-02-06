/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTodaysRoute, logTrip } from '../logistics'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const USER_ID = 'cm0000000000000000user001'
const ROUTE_ID = 'cm0000000000000000rout01'
const JOB_ID_1 = 'cm0000000000000000jobb01'
const JOB_ID_2 = 'cm0000000000000000jobb02'
const VEHICLE_ID = 'cm0000000000000000vehi01'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        route: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        job: {
            findMany: vi.fn(),
        },
        mileageLog: {
            create: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

describe('logistics actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: USER_ID, role: 'INSPECTOR', email: 'inspector@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // getTodaysRoute
    // -----------------------------------------------------------------------
    describe('getTodaysRoute', () => {
        it('should return existing route stops if a route exists for today', async () => {
            const mockRoute = {
                id: ROUTE_ID,
                driverId: USER_ID,
                date: new Date(),
                stops: [
                    {
                        order: 1,
                        job: {
                            id: JOB_ID_1,
                            address: '123 Main St',
                            subdivision: { name: 'Oakwood' },
                        },
                    },
                    {
                        order: 2,
                        job: {
                            id: JOB_ID_2,
                            address: '456 Oak Ave',
                            subdivision: { name: 'Pinecrest' },
                        },
                    },
                ],
            }
            vi.mocked(prisma.route.findFirst).mockResolvedValue(mockRoute as any)

            const result = await getTodaysRoute()

            expect(result).toHaveLength(2)
            expect(result[0].id).toBe(JOB_ID_1)
            expect(result[1].id).toBe(JOB_ID_2)
        })

        it('should create a new optimized route when none exists', async () => {
            // No existing route
            vi.mocked(prisma.route.findFirst).mockResolvedValue(null)

            // Unrouted jobs
            const mockJobs = [
                {
                    id: JOB_ID_1,
                    inspectorId: USER_ID,
                    address: '123 Main St',
                    latitude: 30.27,
                    longitude: -97.74,
                    subdivision: { name: 'Oakwood' },
                    createdAt: new Date(),
                },
                {
                    id: JOB_ID_2,
                    inspectorId: USER_ID,
                    address: '456 Oak Ave',
                    latitude: 30.28,
                    longitude: -97.75,
                    subdivision: { name: 'Pinecrest' },
                    createdAt: new Date(),
                },
            ]
            vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any)
            vi.mocked(prisma.route.create).mockResolvedValue({ id: ROUTE_ID } as any)

            const result = await getTodaysRoute()

            expect(result).toHaveLength(2)
            expect(prisma.route.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        driverId: USER_ID,
                        status: 'PENDING',
                    }),
                })
            )
        })

        it('should return empty array when no jobs exist for today', async () => {
            vi.mocked(prisma.route.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.job.findMany).mockResolvedValue([])

            const result = await getTodaysRoute()

            expect(result).toEqual([])
            expect(prisma.route.create).not.toHaveBeenCalled()
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getTodaysRoute()).rejects.toThrow('Unauthorized')
        })

        it('should throw Unauthorized when session has no user id', async () => {
            vi.mocked(auth).mockResolvedValue({ user: {} } as any)

            await expect(getTodaysRoute()).rejects.toThrow('Unauthorized')
        })
    })

    // -----------------------------------------------------------------------
    // logTrip
    // -----------------------------------------------------------------------
    describe('logTrip', () => {
        it('should create a mileage log entry', async () => {
            vi.mocked(prisma.mileageLog.create).mockResolvedValue({ id: 'ml1' } as any)

            const tripData = {
                vehicleId: VEHICLE_ID,
                date: new Date('2025-06-15'),
                distance: 45.5,
                startLocation: 'Office',
                endLocation: '123 Main St',
                purpose: 'Inspection',
            }

            const result = await logTrip(tripData)

            expect(result).toEqual({ success: true })
            expect(prisma.mileageLog.create).toHaveBeenCalledWith({
                data: {
                    vehicleId: VEHICLE_ID,
                    date: tripData.date,
                    distance: 45.5,
                    startLocation: 'Office',
                    endLocation: '123 Main St',
                    purpose: 'Inspection',
                    status: 'PENDING',
                },
            })
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(
                logTrip({
                    vehicleId: VEHICLE_ID,
                    date: new Date(),
                    distance: 10,
                    startLocation: 'A',
                    endLocation: 'B',
                    purpose: 'Test',
                })
            ).rejects.toThrow('Unauthorized')
        })

        it('should propagate database errors', async () => {
            vi.mocked(prisma.mileageLog.create).mockRejectedValue(new Error('DB error'))

            await expect(
                logTrip({
                    vehicleId: VEHICLE_ID,
                    date: new Date(),
                    distance: 10,
                    startLocation: 'A',
                    endLocation: 'B',
                    purpose: 'Test',
                })
            ).rejects.toThrow('DB error')
        })
    })
})
