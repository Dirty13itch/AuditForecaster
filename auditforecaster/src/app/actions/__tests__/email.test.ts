import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, sendInvoiceEmail } from '../email'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { getGmailClient } from '@/lib/google'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('@/lib/google', () => ({
    getGmailClient: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn()
    }
}))

describe('email actions', () => {
    const mockGmailClient = {
        users: {
            messages: {
                send: vi.fn().mockResolvedValue({})
            }
        }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        vi.mocked(getGmailClient).mockResolvedValue(mockGmailClient as any)
    })

    describe('sendEmail', () => {
        it('should send email successfully', async () => {
            const params = {
                to: 'test@example.com',
                subject: 'Test Subject',
                body: 'Test Body'
            }

            const result = await sendEmail(params)

            expect(result.success).toBe(true)
            expect(mockGmailClient.users.messages.send).toHaveBeenCalled()
        })

        it('should handle attachments', async () => {
            const params = {
                to: 'test@example.com',
                subject: 'Test Subject',
                body: 'Test Body',
                attachments: [{
                    filename: 'test.txt',
                    content: 'test content',
                    contentType: 'text/plain'
                }]
            }

            const result = await sendEmail(params)

            expect(result.success).toBe(true)
            expect(mockGmailClient.users.messages.send).toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const params = {
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test'
            }

            await expect(sendEmail(params)).rejects.toThrow('Unauthorized')
        })

        it('should handle errors gracefully', async () => {
            mockGmailClient.users.messages.send.mockRejectedValue(new Error('Gmail Error'))

            const params = {
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test'
            }

            const result = await sendEmail(params)

            expect(result.success).toBe(false)
            expect(logger.error).toHaveBeenCalled()
        })
    })

    describe('sendInvoiceEmail', () => {
        it('should send invoice email', async () => {
            prismaMock.job.findUnique.mockResolvedValue({
                id: 'job-1',
                lotNumber: '123',
                streetAddress: '123 Main St',
                builder: { name: 'Test Builder' }
            } as any)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ success: true })
            expect(mockGmailClient.users.messages.send).toHaveBeenCalled()
        })

        it('should fail if job not found', async () => {
            prismaMock.job.findUnique.mockResolvedValue(null)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'Job not found' })
            expect(logger.warn).toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'Unauthorized' })
        })
    })
})
