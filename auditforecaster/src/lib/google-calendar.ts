import { calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { getCalendarClient } from './google'
import { logger } from '@/lib/logger'

const CALENDAR_WEBHOOK_URL = `${process.env.NEXTAUTH_URL}/api/webhooks/google-calendar`

export async function watchCalendar(userId: string, calendarId: string) {
    const client = await getCalendarClient(userId)

    // 1. Stop existing watch if any
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (user?.watchResourceId) {
        try {
            await client.channels.stop({
                requestBody: {
                    id: `fieldinspect-${userId}`,
                    resourceId: user.watchResourceId,
                },
            })
        } catch (e) {
            logger.warn('Failed to stop existing watch', { error: e })
        }
    }

    // 2. Start new watch
    const response = await client.events.watch({
        calendarId,
        requestBody: {
            id: `fieldinspect-${userId}`, // Unique Channel ID
            type: 'web_hook',
            address: CALENDAR_WEBHOOK_URL,
            params: {
                ttl: '604800', // 7 days (max allowed)
            },
        },
    })

    // 3. Save watch details
    await prisma.user.update({
        where: { id: userId },
        data: {
            googleCalendarId: calendarId,
            watchResourceId: response.data.resourceId,
            watchExpiration: BigInt(Date.now() + 604800 * 1000),
        },
    })

    // 4. Perform initial full sync
    await syncEvents(userId)
}

export async function syncEvents(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.googleCalendarId) return

    const client = await getCalendarClient(userId)

    let syncToken = user.nextSyncToken
    let pageToken: string | undefined = undefined

    do {
        try {
            const response = await client.events.list({
                calendarId: user.googleCalendarId,
                syncToken: syncToken || undefined,
                pageToken: pageToken || undefined,
                singleEvents: true, // Expand recurring events
            }) as unknown as {
                data: {
                    items?: calendar_v3.Schema$Event[];
                    nextPageToken?: string | null;
                    nextSyncToken?: string | null;
                }
            }

            const events = response.data.items || []

            for (const event of events) {
                if (event.status === 'cancelled') {
                    // Handle deletion
                    if (event.id) {
                        await prisma.job.deleteMany({
                            where: { googleEventId: event.id },
                        })
                    }
                    continue
                }

                // Parse Event to Job
                const jobData = parseEventToJob(event)
                if (!jobData || !event.id) continue

                // Upsert Job
                await prisma.job.upsert({
                    where: { googleEventId: event.id },
                    update: jobData,
                    create: {
                        ...jobData,
                        googleEventId: event.id,
                        googleHtmlLink: event.htmlLink || null,
                        status: 'PENDING', // Default status for new imports
                    },
                })
            }

            pageToken = response.data.nextPageToken || undefined
            syncToken = response.data.nextSyncToken || null

        } catch (e: unknown) {
            if (typeof e === 'object' && e && 'code' in e && (e as { code: number }).code === 410) {
                // Sync token invalid, full sync required
                logger.warn('Sync token invalid, clearing...', { userId })
                await prisma.user.update({
                    where: { id: userId },
                    data: { nextSyncToken: null },
                })
                return syncEvents(userId) // Retry full sync
            }
            throw e
        }
    } while (pageToken)

    // Update sync token
    if (syncToken) {
        await prisma.user.update({
            where: { id: userId },
            data: { nextSyncToken: syncToken || null },
        })
    }
}

function parseEventToJob(event: calendar_v3.Schema$Event) {
    const title = event.summary || ''
    // const description = event.description || ''
    const location = event.location || ''
    const start = event.start?.dateTime || event.start?.date

    // Regex to extract Lot Number (e.g., "Lot 123 - ...")
    const lotMatch = title.match(/Lot\s*(\w+)/i)
    const lotNumber = (lotMatch && lotMatch[1]) ? `Lot ${lotMatch[1]}` : 'Unknown Lot'

    // Simple address extraction (everything after " - " or just the title)
    const addressParts = title.split(' - ')
    const streetAddress = (addressParts.length > 1 && addressParts[1]) ? addressParts[1] : title

    // Basic validation
    if (!title) return null

    return {
        lotNumber,
        streetAddress,
        address: location || streetAddress, // Fallback to title address if location empty
        city: extractCity(location) || 'Unknown', // Helper needed
        // notes: description, // Job model does not have notes field
        scheduledDate: start ? new Date(start) : null,
    }
}

function extractCity(address: string): string {
    if (!address) return ''
    // Very basic extraction, assumes "City, State" format
    const parts = address.split(',')
    if (parts.length >= 2) {
        const cityPart = parts[parts.length - 2]
        return cityPart ? cityPart.trim() : 'Unknown'
    }
    return 'Unknown'
}
