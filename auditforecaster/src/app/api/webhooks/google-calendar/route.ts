import { NextRequest, NextResponse } from 'next/server'
import { syncEvents } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const resourceId = req.headers.get('x-goog-resource-id')
    const channelToken = req.headers.get('x-goog-channel-token')

    logger.info('Received Google Calendar Webhook', { channelId, resourceState, resourceId })

    if (!channelId || !resourceState) {
        return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    // 1. Verify Channel ID format: auditforecaster-{userId}
    if (!channelId.startsWith('auditforecaster-')) {
        logger.warn('Invalid channel ID format', { channelId })
        return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
    }

    const userId = channelId.replace('auditforecaster-', '')

    // 2. Verify channel token (required in production)
    const expectedToken = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN
    if (expectedToken) {
        if (channelToken !== expectedToken) {
            logger.warn('Google Calendar webhook token mismatch', {
                userId,
                hasToken: !!channelToken
            })
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
    } else if (process.env.NODE_ENV === 'production') {
        logger.warn('GOOGLE_CALENDAR_WEBHOOK_TOKEN not configured in production')
        return NextResponse.json({ error: 'Webhook token not configured' }, { status: 503 })
    }

    // 3. Handle Sync
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
