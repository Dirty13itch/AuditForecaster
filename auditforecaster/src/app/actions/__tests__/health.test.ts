/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkSystemHealth } from '../health'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const ADMIN_ID = 'cm0000000000000000user001'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $queryRaw: vi.fn(),
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
    },
}))

// Mock Redis - the health action imports Redis from @upstash/redis
vi.mock('@upstash/redis', () => ({
    Redis: {
        fromEnv: vi.fn(() => ({
            ping: vi.fn().mockResolvedValue('PONG'),
        })),
    },
}))

describe('health actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: ADMIN_ID, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
        // Clear env vars that affect health check results
        delete process.env.UPSTASH_REDIS_REST_URL
        delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        delete process.env.WEATHER_API_KEY
        delete process.env.RESEND_API_KEY
        delete process.env.SUPPLYPRO_API_KEY
    })

    // -----------------------------------------------------------------------
    // checkSystemHealth
    // -----------------------------------------------------------------------
    describe('checkSystemHealth', () => {
        it('should return healthy status when database is up', async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }] as any)

            const result = await checkSystemHealth()

            expect(result.database).toBe('healthy')
            expect(result.redis).toBe('not-configured')
            expect(result.integrations).toEqual({
                googleMaps: false,
                weather: false,
                email: false,
                supplyPro: false,
            })
            expect(result.version).toBeDefined()
        })

        it('should return unhealthy database when query fails', async () => {
            vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'))

            const result = await checkSystemHealth()

            expect(result.database).toBe('unhealthy')
        })

        it('should throw Unauthorized for non-admin users', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: ADMIN_ID, role: 'INSPECTOR', email: 'inspector@test.com' },
            } as any)

            await expect(checkSystemHealth()).rejects.toThrow('Unauthorized')
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(checkSystemHealth()).rejects.toThrow('Unauthorized')
        })

        it('should detect configured integrations from env vars', async () => {
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }] as any)
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key'
            process.env.WEATHER_API_KEY = 'test-weather'
            process.env.RESEND_API_KEY = 'real-key'
            process.env.SUPPLYPRO_API_KEY = 'supply-key'

            const result = await checkSystemHealth()

            expect(result.integrations.googleMaps).toBe(true)
            expect(result.integrations.weather).toBe(true)
            expect(result.integrations.email).toBe(true)
            expect(result.integrations.supplyPro).toBe(true)
        })
    })
})
