'use server'

import { getGmailClient } from '@/lib/google'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { generateInvoicePDF } from './pdf'

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

// Sanitize email headers to prevent header injection attacks
function sanitizeEmailHeader(value: string): string {
    // Remove any newlines, carriage returns that could inject headers
    return value.replace(/[\r\n]/g, '').trim()
}

function validateEmail(email: string): boolean {
    // Basic email validation - no newlines, has @ symbol
    return /^[^\r\n@]+@[^\r\n@]+\.[^\r\n@]+$/.test(email)
}

export async function sendEmail({ to, subject, body, attachments = [] }: SendEmailParams) {
    const session = await auth()

    if (!session?.user?.id) throw new Error('Unauthorized')

    // Validate and sanitize email parameters to prevent header injection
    if (!validateEmail(to)) {
        throw new Error('Invalid recipient email address')
    }
    const sanitizedTo = sanitizeEmailHeader(to)
    const sanitizedSubject = sanitizeEmailHeader(subject)
    const sanitizedFrom = session.user.email ? sanitizeEmailHeader(session.user.email) : ''

    if (!sanitizedFrom || !validateEmail(sanitizedFrom)) {
        throw new Error('Invalid sender email address')
    }

    const client = await getGmailClient()

    // Construct email in RFC 2822 format
    const boundary = 'foo_bar_baz'
    const messageParts = [
        `From: "AuditForecaster" <${sanitizedFrom}>`,
        `To: ${sanitizedTo}`,
        `Subject: ${sanitizedSubject}`,
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

        // Find the latest invoice for this job
        const invoice = await prisma.invoice.findFirst({
            where: {
                items: {
                    some: {
                        jobId: jobId
                    }
                }
            },
            orderBy: { date: 'desc' }
        })

        if (!invoice) {
            return { error: 'No invoice found for this job' }
        }

        const pdfResult = await generateInvoicePDF(invoice.id)

        if (pdfResult.error) {
            logger.error('Failed to queue PDF generation', { error: pdfResult.error })
            return { error: 'Failed to queue invoice generation' }
        }

        return { success: true, message: 'Invoice email queued' }
    } catch (error) {
        logger.error('Failed to send invoice email', { error, jobId })
        return { error: 'Failed to send invoice' }
    }
}
