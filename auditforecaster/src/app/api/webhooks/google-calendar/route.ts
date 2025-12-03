import { NextRequest, NextResponse } from 'next/server'
import { syncEvents } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const resourceId = req.headers.get('x-goog-resource-id')

    logger.info('Received Google Calendar Webhook', { channelId, resourceState, resourceId })

    if (!channelId || !resourceState) {
        return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // 1. Verify Channel ID format: auditforecaster-{userId}
    if (!channelId.startsWith('auditforecaster-')) {
        return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
    }

    const userId = channelId.replace('auditforecaster-', '')

    // 2. Handle Sync
    if (resourceState === 'sync') {
        logger.info(`Initial sync ping for user ${userId}`)
        return NextResponse.json({ status: 'ok' })
    }

    if (resourceState === 'exists') {
        logger.info(`Change detected for user ${userId}, syncing...`)

        // Verify user exists and has this watch active
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user || user.watchResourceId !== resourceId) {
            logger.warn(`User ${userId} not found or resource ID mismatch`)
            // We might want to stop the watch here if it's invalid, but for now just ignore
            return NextResponse.json({ status: 'ignored' })
        }

        // Trigger Sync (Fire and forget to avoid timeout)
        syncEvents(userId).catch(err => {
            logger.error(`Sync failed for user ${userId}`, { error: err })
        })

        return NextResponse.json({ status: 'syncing' })
    }

    return NextResponse.json({ status: 'ignored' })
}
