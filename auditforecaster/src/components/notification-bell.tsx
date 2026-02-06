'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '@/app/actions/notifications'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    link: string | null
    createdAt: Date
}

function timeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(date).toLocaleDateString()
}

function typeBadgeColor(type: string): string {
    switch (type) {
        case 'SUCCESS':
            return 'bg-green-100 text-green-800'
        case 'WARNING':
            return 'bg-amber-100 text-amber-800'
        case 'ERROR':
            return 'bg-red-100 text-red-800'
        case 'INFO':
        default:
            return 'bg-blue-100 text-blue-800'
    }
}

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchUnreadCount = useCallback(async () => {
        const result = await getUnreadCount()
        if (result.success) {
            setUnreadCount(result.count)
        }
    }, [])

    // Poll unread count every 30 seconds
    useEffect(() => {
        fetchUnreadCount()
        const interval = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(interval)
    }, [fetchUnreadCount])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleToggle = async () => {
        const opening = !isOpen
        setIsOpen(opening)

        if (opening) {
            setLoading(true)
            const result = await getNotifications()
            if (result.success && result.data) {
                setNotifications(result.data as Notification[])
            }
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (id: string) => {
        const result = await markAsRead(id)
        if (result.success) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            )
            setUnreadCount((prev) => Math.max(0, prev - 1))
        }
    }

    const handleMarkAllAsRead = async () => {
        const result = await markAllAsRead()
        if (result.success) {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            setUnreadCount(0)
        }
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification.id)
        }
        if (notification.link) {
            window.location.href = notification.link
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() =>
                                        handleNotificationClick(notification)
                                    }
                                    className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                                        !notification.read ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p
                                                    className={`truncate text-sm ${
                                                        !notification.read
                                                            ? 'font-semibold text-gray-900'
                                                            : 'font-medium text-gray-700'
                                                    }`}
                                                >
                                                    {notification.title}
                                                </p>
                                                <span
                                                    className={`inline-flex flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeBadgeColor(notification.type)}`}
                                                >
                                                    {notification.type}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="mt-1 text-[10px] text-gray-400">
                                                {timeAgo(notification.createdAt)}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
