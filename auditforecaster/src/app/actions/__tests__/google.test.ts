/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const { mockCalendarListList, mockWatchCalendar } = vi.hoisted(() => ({
    mockCalendarListList: vi.fn(),
    mockWatchCalendar: vi.fn(),
}))

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

vi.mock('@/lib/google', () => ({
    getCalendarClient: vi.fn().mockResolvedValue({
        calendarList: {
            list: mockCalendarListList,
        },
    }),
}))

vi.mock('@/lib/google-calendar', () => ({
    watchCalendar: mockWatchCalendar,
}))

import { listGoogleCalendars, enableCalendarSync, getSyncStatus } from '../google'

// ---------------------------------------------------------------------------
// Valid CUID-format IDs
// ---------------------------------------------------------------------------
const mockUserId = 'cm0000000000000000user001'

describe('Google Calendar Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: mockUserId, role: 'ADMIN' },
        } as any)
    })

    describe('listGoogleCalendars', () => {
        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            await expect(listGoogleCalendars()).rejects.toThrow('Unauthorized')
        })

        it('should return calendar list on success', async () => {
            const mockCalendars = [
                { id: 'cal-1', summary: 'Work Calendar' },
                { id: 'cal-2', summary: 'Personal Calendar' },
            ]
            mockCalendarListList.mockResolvedValue({
                data: { items: mockCalendars },
            })

            const result = await listGoogleCalendars()

            expect(result).toEqual(mockCalendars)
            expect(mockCalendarListList).toHaveBeenCalled()
        })

        it('should return empty array when API returns no items', async () => {
            mockCalendarListList.mockResolvedValue({
                data: { items: null },
            })

            const result = await listGoogleCalendars()

            expect(result).toEqual([])
        })

        it('should return empty array on API error', async () => {
            mockCalendarListList.mockRejectedValue(new Error('API Error'))

            const result = await listGoogleCalendars()

            expect(result).toEqual([])
        })
    })

    describe('enableCalendarSync', () => {
        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            await expect(enableCalendarSync('calendar-id')).rejects.toThrow('Unauthorized')
        })

        it('should enable sync and return success', async () => {
            mockWatchCalendar.mockResolvedValue(undefined)

            const result = await enableCalendarSync('calendar-id')

            expect(result).toEqual({ success: true })
            expect(mockWatchCalendar).toHaveBeenCalledWith(mockUserId, 'calendar-id')
        })

        it('should return error on failure', async () => {
            mockWatchCalendar.mockRejectedValue(new Error('Watch failed'))

            const result = await enableCalendarSync('calendar-id')

            expect(result).toEqual({ success: false, error: 'Failed to enable sync' })
        })
    })

    describe('getSyncStatus', () => {
        it('should return null when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await getSyncStatus()

            expect(result).toBeNull()
        })

        it('should return sync status for authenticated user', async () => {
            const mockUser = {
                googleCalendarId: 'cal-123',
                nextSyncToken: 'sync-token-abc',
            }
            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

            const result = await getSyncStatus()

            expect(result).toEqual({
                googleCalendarId: 'cal-123',
                nextSyncToken: 'sync-token-abc',
            })
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: mockUserId },
                select: { googleCalendarId: true, nextSyncToken: true },
            })
        })

        it('should return null when user not found in DB', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

            const result = await getSyncStatus()

            expect(result).toBeNull()
        })
    })
})
