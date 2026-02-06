/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    createNotification,
    deleteNotification,
} from '../notifications'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Valid CUID-format IDs for tests (assertValidId requires CUID or UUID format)
const NOTIF_ID_1 = 'cm000000000000000000notf1'
const NOTIF_ID_2 = 'cm000000000000000000notf2'
const NOTIF_ID_NEW = 'cm000000000000000000nnew1'
const NOTIF_ID_MISSING = 'cm000000000000000000miss1'
const USER_ID_1 = 'cm000000000000000000user1'
const USER_ID_2 = 'cm000000000000000000user2'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        notification: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

describe('notifications actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: USER_ID_1, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // getNotifications
    // -----------------------------------------------------------------------
    describe('getNotifications', () => {
        it('should return notifications for the authenticated user', async () => {
            const mockNotifications = [
                {
                    id: NOTIF_ID_1,
                    userId: USER_ID_1,
                    title: 'New job assigned',
                    message: 'You have been assigned a new job.',
                    type: 'INFO',
                    read: false,
                    link: null,
                    createdAt: new Date('2025-01-01'),
                },
                {
                    id: NOTIF_ID_2,
                    userId: USER_ID_1,
                    title: 'Job completed',
                    message: 'Job #123 has been completed.',
                    type: 'SUCCESS',
                    read: true,
                    link: '/jobs/123',
                    createdAt: new Date('2025-01-02'),
                },
            ]
            vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any)

            const result = await getNotifications()

            expect(result.success).toBe(true)
            expect(result.data).toEqual(mockNotifications)
            expect(prisma.notification.findMany).toHaveBeenCalledWith({
                where: { userId: USER_ID_1 },
                orderBy: { createdAt: 'desc' },
                take: 50,
            })
        })

        it('should return error when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await getNotifications()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })

        it('should return error when session has no user id', async () => {
            vi.mocked(auth).mockResolvedValue({ user: {} } as any)

            const result = await getNotifications()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.notification.findMany).mockRejectedValue(new Error('DB error'))

            const result = await getNotifications()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to fetch notifications')
        })
    })

    // -----------------------------------------------------------------------
    // markAsRead
    // -----------------------------------------------------------------------
    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const mockNotification = {
                id: NOTIF_ID_1,
                userId: USER_ID_1,
                read: false,
            }
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotification as any)
            vi.mocked(prisma.notification.update).mockResolvedValue({ ...mockNotification, read: true } as any)

            const result = await markAsRead(NOTIF_ID_1)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification marked as read')
            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where: { id: NOTIF_ID_1, userId: USER_ID_1 },
            })
            expect(prisma.notification.update).toHaveBeenCalledWith({
                where: { id: NOTIF_ID_1 },
                data: { read: true },
            })
        })

        it('should return error when notification not found', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)

            const result = await markAsRead(NOTIF_ID_MISSING)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Notification not found')
            expect(prisma.notification.update).not.toHaveBeenCalled()
        })

        it('should return error when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await markAsRead(NOTIF_ID_1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })

        it('should throw when given an invalid id format', async () => {
            await expect(markAsRead('bad-id')).rejects.toThrow('Invalid Notification ID format')
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue({
                id: NOTIF_ID_1,
                userId: USER_ID_1,
            } as any)
            vi.mocked(prisma.notification.update).mockRejectedValue(new Error('DB error'))

            const result = await markAsRead(NOTIF_ID_1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to mark notification as read')
        })
    })

    // -----------------------------------------------------------------------
    // markAllAsRead
    // -----------------------------------------------------------------------
    describe('markAllAsRead', () => {
        it('should mark all unread notifications as read', async () => {
            vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as any)

            const result = await markAllAsRead()

            expect(result.success).toBe(true)
            expect(result.message).toBe('All notifications marked as read')
            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: { userId: USER_ID_1, read: false },
                data: { read: true },
            })
        })

        it('should return error when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await markAllAsRead()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.notification.updateMany).mockRejectedValue(new Error('DB error'))

            const result = await markAllAsRead()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to mark all notifications as read')
        })
    })

    // -----------------------------------------------------------------------
    // getUnreadCount
    // -----------------------------------------------------------------------
    describe('getUnreadCount', () => {
        it('should return the unread notification count', async () => {
            vi.mocked(prisma.notification.count).mockResolvedValue(7)

            const result = await getUnreadCount()

            expect(result.success).toBe(true)
            expect(result.count).toBe(7)
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: { userId: USER_ID_1, read: false },
            })
        })

        it('should return zero count when no unread notifications', async () => {
            vi.mocked(prisma.notification.count).mockResolvedValue(0)

            const result = await getUnreadCount()

            expect(result.success).toBe(true)
            expect(result.count).toBe(0)
        })

        it('should return error with count 0 when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await getUnreadCount()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
            expect(result.count).toBe(0)
        })

        it('should return error with count 0 when prisma throws', async () => {
            vi.mocked(prisma.notification.count).mockRejectedValue(new Error('DB error'))

            const result = await getUnreadCount()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to fetch unread count')
            expect(result.count).toBe(0)
        })
    })

    // -----------------------------------------------------------------------
    // createNotification
    // -----------------------------------------------------------------------
    describe('createNotification', () => {
        it('should create a notification as admin', async () => {
            const mockCreated = {
                id: NOTIF_ID_NEW,
                userId: USER_ID_2,
                title: 'Hello',
                message: 'World',
                type: 'INFO',
                link: null,
                read: false,
                createdAt: new Date(),
            }
            vi.mocked(prisma.notification.create).mockResolvedValue(mockCreated as any)

            const result = await createNotification({
                userId: USER_ID_2,
                title: 'Hello',
                message: 'World',
            })

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification created')
            expect(result.data).toEqual(mockCreated)
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: USER_ID_2,
                    title: 'Hello',
                    message: 'World',
                    type: 'INFO',
                    link: null,
                },
            })
        })

        it('should create a notification with custom type and link', async () => {
            const mockCreated = {
                id: NOTIF_ID_NEW,
                userId: USER_ID_2,
                title: 'Alert',
                message: 'Something happened',
                type: 'WARNING',
                link: '/jobs/456',
                read: false,
                createdAt: new Date(),
            }
            vi.mocked(prisma.notification.create).mockResolvedValue(mockCreated as any)

            const result = await createNotification({
                userId: USER_ID_2,
                title: 'Alert',
                message: 'Something happened',
                type: 'WARNING',
                link: '/jobs/456',
            })

            expect(result.success).toBe(true)
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: USER_ID_2,
                    title: 'Alert',
                    message: 'Something happened',
                    type: 'WARNING',
                    link: '/jobs/456',
                },
            })
        })

        it('should return error when non-admin tries to create', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: USER_ID_1, role: 'USER', email: 'user@test.com' },
            } as any)

            const result = await createNotification({
                userId: USER_ID_2,
                title: 'Test',
                message: 'Body',
            })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized: Admin access required')
            expect(prisma.notification.create).not.toHaveBeenCalled()
        })

        it('should return error when unauthenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await createNotification({
                userId: USER_ID_2,
                title: 'Test',
                message: 'Body',
            })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized: Admin access required')
        })

        it('should throw when given an invalid userId format', async () => {
            await expect(
                createNotification({
                    userId: 'bad-id',
                    title: 'Test',
                    message: 'Body',
                })
            ).rejects.toThrow('Invalid User ID format')
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.notification.create).mockRejectedValue(new Error('DB error'))

            const result = await createNotification({
                userId: USER_ID_2,
                title: 'Test',
                message: 'Body',
            })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to create notification')
        })
    })

    // -----------------------------------------------------------------------
    // deleteNotification
    // -----------------------------------------------------------------------
    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue({
                id: NOTIF_ID_1,
                userId: USER_ID_1,
            } as any)
            vi.mocked(prisma.notification.delete).mockResolvedValue({ id: NOTIF_ID_1 } as any)

            const result = await deleteNotification(NOTIF_ID_1)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification deleted')
            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where: { id: NOTIF_ID_1, userId: USER_ID_1 },
            })
            expect(prisma.notification.delete).toHaveBeenCalledWith({
                where: { id: NOTIF_ID_1 },
            })
        })

        it('should return error when notification not found', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)

            const result = await deleteNotification(NOTIF_ID_MISSING)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Notification not found')
            expect(prisma.notification.delete).not.toHaveBeenCalled()
        })

        it('should return error when unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await deleteNotification(NOTIF_ID_1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Unauthorized')
        })

        it('should throw when given an invalid id format', async () => {
            await expect(deleteNotification('bad-id')).rejects.toThrow('Invalid Notification ID format')
        })

        it('should return error when prisma throws', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue({
                id: NOTIF_ID_1,
                userId: USER_ID_1,
            } as any)
            vi.mocked(prisma.notification.delete).mockRejectedValue(new Error('DB error'))

            const result = await deleteNotification(NOTIF_ID_1)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to delete notification')
        })
    })
})
