import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDailyRoute, getRoutes, getRouteDetails } from '../routes'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        job: {
            findMany: vi.fn()
        },
        route: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

const MOCK_USER_ID = 'cm0000000000000000user001'
const MOCK_DRIVER_ID = 'cm0000000000000000driver1'
const MOCK_ROUTE_ID = 'cm00000000000000route001'

describe('Routes Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'ADMIN' } } as any)
    })

    describe('generateDailyRoute', () => {
        it('should generate a route with sorted jobs', async () => {
            const date = new Date('2025-06-15')
            const mockJobs = [
                {
                    id: 'cm000000000000000000job01',
                    address: '123 Main St',
                    latitude: 30.0,
                    longitude: -97.0,
                    createdAt: new Date()
                },
                {
                    id: 'cm000000000000000000job02',
                    address: '456 Oak Ave',
                    latitude: 31.0,
                    longitude: -97.5,
                    createdAt: new Date()
                }
            ]

            vi.mocked(prisma.job.findMany as any).mockResolvedValue(mockJobs)
            vi.mocked(prisma.route.create as any).mockResolvedValue({
                id: MOCK_ROUTE_ID,
                driverId: MOCK_DRIVER_ID,
                status: 'PENDING'
            })

            const result = await generateDailyRoute(MOCK_DRIVER_ID, date)

            expect(result).toEqual({ success: true, routeId: MOCK_ROUTE_ID })
            expect(prisma.job.findMany).toHaveBeenCalledWith({
                where: {
                    inspectorId: MOCK_DRIVER_ID,
                    scheduledDate: {
                        gte: expect.any(Date),
                        lte: expect.any(Date)
                    },
                    status: { not: 'CANCELED' }
                },
                take: 100,
                orderBy: { createdAt: 'desc' }
            })
            expect(prisma.route.create).toHaveBeenCalledWith({
                data: {
                    driverId: MOCK_DRIVER_ID,
                    date: expect.any(Date),
                    status: 'PENDING',
                    stops: {
                        create: expect.arrayContaining([
                            expect.objectContaining({ order: 1, status: 'PENDING' }),
                            expect.objectContaining({ order: 2, status: 'PENDING' })
                        ])
                    }
                }
            })
        })

        it('should return error when no jobs found for the date', async () => {
            vi.mocked(prisma.job.findMany as any).mockResolvedValue([])

            const result = await generateDailyRoute(MOCK_DRIVER_ID, new Date('2025-06-15'))

            expect(result).toEqual({ success: false, message: 'No jobs found for this date.' })
            expect(prisma.route.create).not.toHaveBeenCalled()
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(generateDailyRoute(MOCK_DRIVER_ID, new Date())).rejects.toThrow('Unauthorized')
        })

        it('should handle jobs without coordinates', async () => {
            const mockJobs = [
                { id: 'cm000000000000000000job01', address: '123 Main St', latitude: null, longitude: null, createdAt: new Date() },
                { id: 'cm000000000000000000job02', address: '456 Oak Ave', latitude: null, longitude: null, createdAt: new Date() }
            ]

            vi.mocked(prisma.job.findMany as any).mockResolvedValue(mockJobs)
            vi.mocked(prisma.route.create as any).mockResolvedValue({
                id: MOCK_ROUTE_ID,
                driverId: MOCK_DRIVER_ID,
                status: 'PENDING'
            })

            const result = await generateDailyRoute(MOCK_DRIVER_ID, new Date('2025-06-15'))

            expect(result).toEqual({ success: true, routeId: MOCK_ROUTE_ID })
        })

        it('should create route with single job', async () => {
            const mockJobs = [
                { id: 'cm000000000000000000job01', address: '123 Main St', latitude: 30.0, longitude: -97.0, createdAt: new Date() }
            ]

            vi.mocked(prisma.job.findMany as any).mockResolvedValue(mockJobs)
            vi.mocked(prisma.route.create as any).mockResolvedValue({
                id: MOCK_ROUTE_ID,
                driverId: MOCK_DRIVER_ID,
                status: 'PENDING'
            })

            const result = await generateDailyRoute(MOCK_DRIVER_ID, new Date('2025-06-15'))

            expect(result).toEqual({ success: true, routeId: MOCK_ROUTE_ID })
            expect(prisma.route.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    stops: {
                        create: [expect.objectContaining({ order: 1, status: 'PENDING' })]
                    }
                })
            })
        })
    })

    describe('getRoutes', () => {
        it('should return all routes for admin without date filter', async () => {
            const mockRoutes = [
                {
                    id: MOCK_ROUTE_ID,
                    driverId: MOCK_DRIVER_ID,
                    date: new Date('2025-06-15'),
                    driver: { name: 'John', email: 'john@example.com' },
                    stops: []
                }
            ]

            vi.mocked(prisma.route.findMany as any).mockResolvedValue(mockRoutes)

            const result = await getRoutes()

            expect(result).toEqual(mockRoutes)
            expect(prisma.route.findMany).toHaveBeenCalledWith({
                where: {},
                take: 50,
                include: {
                    driver: { select: { name: true, email: true } },
                    stops: { include: { job: true }, orderBy: { order: 'asc' } }
                },
                orderBy: { date: 'desc' }
            })
        })

        it('should filter routes by date when provided', async () => {
            vi.mocked(prisma.route.findMany as any).mockResolvedValue([])

            const date = new Date('2025-06-15')
            await getRoutes(date)

            expect(prisma.route.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: {
                            gte: expect.any(Date),
                            lte: expect.any(Date)
                        }
                    })
                })
            )
        })

        it('should filter routes by driverId for INSPECTOR role', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'INSPECTOR' } } as any)
            vi.mocked(prisma.route.findMany as any).mockResolvedValue([])

            await getRoutes()

            expect(prisma.route.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        driverId: MOCK_USER_ID
                    })
                })
            )
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getRoutes()).rejects.toThrow('Unauthorized')
        })
    })

    describe('getRouteDetails', () => {
        it('should return route details with stops', async () => {
            const mockRoute = {
                id: MOCK_ROUTE_ID,
                driverId: MOCK_DRIVER_ID,
                date: new Date('2025-06-15'),
                status: 'PENDING',
                driver: { name: 'John', email: 'john@example.com' },
                stops: [
                    { id: 'cm00000000000000000stop01', order: 1, job: { address: '123 Main St' } }
                ]
            }

            vi.mocked(prisma.route.findUnique as any).mockResolvedValue(mockRoute)

            const result = await getRouteDetails(MOCK_ROUTE_ID)

            expect(result).toEqual(mockRoute)
            expect(prisma.route.findUnique).toHaveBeenCalledWith({
                where: { id: MOCK_ROUTE_ID },
                include: {
                    driver: { select: { name: true, email: true } },
                    stops: {
                        include: { job: true },
                        orderBy: { order: 'asc' }
                    }
                }
            })
        })

        it('should return null when route not found', async () => {
            vi.mocked(prisma.route.findUnique as any).mockResolvedValue(null)

            const result = await getRouteDetails('cm00000000000000nonexist')

            expect(result).toBeNull()
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getRouteDetails(MOCK_ROUTE_ID)).rejects.toThrow('Unauthorized')
        })
    })
})
