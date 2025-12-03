import { google, calendar_v3 } from 'googleapis'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function getGoogleClient(userId?: string) {
    let accessToken: string | undefined
    let refreshToken: string | undefined

    if (userId) {
        // Background context: Fetch from DB
        const account = await prisma.account.findFirst({
            where: {
                userId,
                provider: 'google'
            }
        })

        if (!account || !account.access_token) {
            throw new Error(`No Google account linked for user ${userId}`)
        }

        accessToken = account.access_token
        refreshToken = account.refresh_token || undefined
    } else {
        // User session context
        const session = await auth()
        if (!session?.accessToken) {
            throw new Error('No access token found. Please sign in with Google.')
        }
        accessToken = session.accessToken as string
        // Note: session usually doesn't have refresh token unless customized, 
        // but for session-based calls we usually rely on the access token being fresh enough 
        // or NextAuth handling rotation (which it does if configured right).
        // For now, we'll assume access token is enough for immediate actions.
    }

    const authClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    )

    authClient.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    return authClient
}

export async function getCalendarClient(userId?: string): Promise<calendar_v3.Calendar> {
    const authClient = await getGoogleClient(userId)
    return google.calendar({ version: 'v3', auth: authClient })
}

export async function getPhotosClient(userId?: string) {
    const authClient = await getGoogleClient(userId)
    return authClient
}

export async function getGmailClient(userId?: string) {
    const authClient = await getGoogleClient(userId)
    return google.gmail({ version: 'v1', auth: authClient })
}
