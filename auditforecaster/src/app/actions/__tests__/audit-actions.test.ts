/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuditLogs, getEntityHistory } from '../audit'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Valid CUID-format IDs for tests
const ADMIN_ID = 'cm0000000000000000user001'
const ENTITY_ID = 'cm0000000000000000entity1'
const LOG_ID_1 = 'cm0000000000000000alog01'
const LOG_ID_2 = 'cm0000000000000000alog02'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        auditLog: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/utils')>()
    return {
        ...actual,
    }
})

describe('audit actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: ADMIN_ID, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // getAuditLogs
    // -----------------------------------------------------------------------
    describe('getAuditLogs', () => {
        it('should return paginated audit logs for admin', async () => {
            const mockLogs = [
                {
                    id: LOG_ID_1,
                    entityType: 'Job',
                    entityId: ENTITY_ID,
                    action: 'CREATE',
                    actorId: ADMIN_ID,
                    changes: null,
                    ipAddress: null,
                    createdAt: new Date('2025-01-01'),
                },
                {
                    id: LOG_ID_2,
                    entityType: 'Job',
                    entityId: ENTITY_ID,
                    action: 'UPDATE',
                    actorId: ADMIN_ID,
                    changes: '{"status":"COMPLETED"}',
                    ipAddress: '127.0.0.1',
                    createdAt: new Date('2025-01-02'),
                },
            ]
            vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any)
            vi.mocked(prisma.auditLog.count).mockResolvedValue(2)

            const result = await getAuditLogs()

            expect(result.logs).toEqual(mockLogs)
            expect(result.total).toBe(2)
            expect(result.page).toBe(1)
            expect(result.totalPages).toBe(1)
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: {},
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 25,
            })
        })

        it('should throw Unauthorized for non-admin users', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: ADMIN_ID, role: 'INSPECTOR', email: 'inspector@test.com' },
            } as any)

            await expect(getAuditLogs()).rejects.toThrow('Unauthorized: Admin access required')
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getAuditLogs()).rejects.toThrow('Unauthorized')
        })

        it('should apply filters correctly', async () => {
            vi.mocked(prisma.auditLog.findMany).mockResolvedValue([])
            vi.mocked(prisma.auditLog.count).mockResolvedValue(0)

            await getAuditLogs({
                entityType: 'Job',
                action: 'CREATE',
                userId: ADMIN_ID,
                dateFrom: '2025-01-01',
                dateTo: '2025-01-31',
                page: 2,
                pageSize: 10,
            })

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: {
                    entityType: 'Job',
                    action: 'CREATE',
                    actorId: ADMIN_ID,
                    createdAt: {
                        gte: new Date('2025-01-01'),
                        lte: expect.any(Date),
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: 10,
                take: 10,
            })
        })

        it('should clamp pageSize to max 100', async () => {
            vi.mocked(prisma.auditLog.findMany).mockResolvedValue([])
            vi.mocked(prisma.auditLog.count).mockResolvedValue(0)

            await getAuditLogs({ pageSize: 999 })

            expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 100 })
            )
        })
    })

    // -----------------------------------------------------------------------
    // getEntityHistory
    // -----------------------------------------------------------------------
    describe('getEntityHistory', () => {
        it('should return entity history for admin', async () => {
            const mockLogs = [
                {
                    id: LOG_ID_1,
                    entityType: 'Job',
                    entityId: ENTITY_ID,
                    action: 'CREATE',
                    actorId: ADMIN_ID,
                    changes: null,
                    ipAddress: null,
                    createdAt: new Date('2025-01-01'),
                },
            ]
            vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as any)
            vi.mocked(prisma.auditLog.count).mockResolvedValue(1)

            const result = await getEntityHistory('Job', ENTITY_ID)

            expect(result.logs).toEqual(mockLogs)
            expect(result.total).toBe(1)
            expect(result.page).toBe(1)
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { entityType: 'Job', entityId: ENTITY_ID },
                orderBy: { createdAt: 'desc' },
                skip: 0,
                take: 25,
            })
        })

        it('should throw Unauthorized for non-admin users', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: ADMIN_ID, role: 'USER', email: 'user@test.com' },
            } as any)

            await expect(getEntityHistory('Job', ENTITY_ID)).rejects.toThrow(
                'Unauthorized: Admin access required'
            )
        })

        it('should throw when entityType or entityId is missing', async () => {
            await expect(getEntityHistory('', ENTITY_ID)).rejects.toThrow(
                'entityType and entityId are required'
            )
            await expect(getEntityHistory('Job', '')).rejects.toThrow(
                'entityType and entityId are required'
            )
        })

        it('should throw on invalid entityId format', async () => {
            await expect(getEntityHistory('Job', 'bad-id')).rejects.toThrow(
                'Invalid Entity ID format'
            )
        })
    })
})
