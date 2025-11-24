'use server'

import { getGmailClient } from '@/lib/google'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

type SendEmailParams = {
    to: string
    subject: string
    body: string
    attachments?: {
        filename: string
        content: Buffer | string // Base64 string or Buffer
        contentType: string
    }[]
}

export async function sendEmail({ to, subject, body, attachments = [] }: SendEmailParams) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const client = await getGmailClient()

    // Construct email in RFC 2822 format
    const boundary = 'foo_bar_baz'
    const messageParts = [
        `From: "AuditForecaster" <${session.user.email}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        body,
        ''
    ]

    if (attachments.length > 0) {
        for (const attachment of attachments) {
            const content = typeof attachment.content === 'string'
                ? attachment.content
                : attachment.content.toString('base64')

            messageParts.push(
                `--${boundary}`,
                `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
                `Content-Disposition: attachment; filename="${attachment.filename}"`,
                `Content-Transfer-Encoding: base64`,
                '',
                content,
                ''
            )
        }
    }

    messageParts.push(`--${boundary}--`)

    const rawMessage = messageParts.join('\r\n')
    const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    try {
        await client.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        })
        return { success: true }
    } catch (error) {
        logger.error('Failed to send email:', { error, to, subject })
        return { success: false, error: 'Failed to send email' }
    }
}

export async function sendInvoiceEmail(jobId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorized' }

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { builder: true }
        })

        if (!job) {
            logger.warn(`Invoice generation failed: Job ${jobId} not found`)
            return { error: 'Job not found' }
        }

        // TODO: Generate actual PDF invoice
        // For now, we send a detailed notification
        const subject = `Invoice for Job: ${job.lotNumber} - ${job.streetAddress}`
        const body = `
            Invoice Generated
            
            Job Details:
            - Lot: ${job.lotNumber}
            - Address: ${job.streetAddress}
            - Builder: ${job.builder?.name || 'Unknown'}
            - Date: ${new Date().toLocaleDateString()}
            
            (PDF generation coming soon)
        `

        return sendEmail({
            to: session.user.email || '', // Send to self for testing
            subject,
            body
        })
    } catch (error) {
        logger.error('Failed to send invoice email', { error, jobId })
        return { error: 'Failed to send invoice' }
    }
}
