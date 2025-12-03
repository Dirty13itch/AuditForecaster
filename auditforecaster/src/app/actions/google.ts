'use server'

import { auth } from '@/auth'
import { getCalendarClient } from '@/lib/google'
import { watchCalendar } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logger } from "@/lib/logger"

export async function listGoogleCalendars() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    try {
        const client = await getCalendarClient()
        const response = await client.calendarList.list()
        return response.data.items || []
    } catch (error) {
        logger.error('Failed to enable sync', { error })
        return []
    }
}

export async function enableCalendarSync(calendarId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    try {
        await watchCalendar(session.user.id, calendarId)
        revalidatePath('/dashboard/admin/integrations')
        return { success: true }
    } catch (error) {
        console.error('Failed to enable sync:', error)
        return { success: false, error: 'Failed to enable sync' }
    }
}

export async function getSyncStatus(): Promise<{ googleCalendarId: string | null, nextSyncToken: string | null } | null> {
    const session = await auth()
    if (!session?.user?.id) return null

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { googleCalendarId: true, nextSyncToken: true }
    })

    // Cast the result because Prisma types might be lagging or strict
    return user as { googleCalendarId: string | null, nextSyncToken: string | null } | null
}
