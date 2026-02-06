'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getNotifications() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        return { success: true, data: notifications }
    } catch {
        return { success: false, error: 'Failed to fetch notifications' }
    }
}

export async function markAsRead(id: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Ensure the notification belongs to the current user
        const notification = await prisma.notification.findFirst({
            where: { id, userId: session.user.id },
        })

        if (!notification) {
            return { success: false, error: 'Notification not found' }
        }

        await prisma.notification.update({
            where: { id },
            data: { read: true },
        })

        return { success: true, message: 'Notification marked as read' }
    } catch {
        return { success: false, error: 'Failed to mark notification as read' }
    }
}

export async function markAllAsRead() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true },
        })

        return { success: true, message: 'All notifications marked as read' }
    } catch {
        return { success: false, error: 'Failed to mark all notifications as read' }
    }
}

export async function getUnreadCount() {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized', count: 0 }
    }

    try {
        const count = await prisma.notification.count({
            where: { userId: session.user.id, read: false },
        })

        return { success: true, count }
    } catch {
        return { success: false, error: 'Failed to fetch unread count', count: 0 }
    }
}

export async function createNotification(data: {
    userId: string
    title: string
    message: string
    type?: string
    link?: string
}) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Unauthorized: Admin access required' }
    }

    try {
        const notification = await prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type || 'INFO',
                link: data.link || null,
            },
        })

        return { success: true, message: 'Notification created', data: notification }
    } catch {
        return { success: false, error: 'Failed to create notification' }
    }
}

export async function deleteNotification(id: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Ensure the notification belongs to the current user
        const notification = await prisma.notification.findFirst({
            where: { id, userId: session.user.id },
        })

        if (!notification) {
            return { success: false, error: 'Notification not found' }
        }

        await prisma.notification.delete({
            where: { id },
        })

        return { success: true, message: 'Notification deleted' }
    } catch {
        return { success: false, error: 'Failed to delete notification' }
    }
}
