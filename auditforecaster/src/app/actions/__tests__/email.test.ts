import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, sendInvoiceEmail } from '../email'
import { generateInvoicePDF } from '../pdf'
import { prisma } from '@/lib/prisma'
import { mockSession } from '@/test/mocks/auth'
import { getGmailClient } from '@/lib/google'
import { logger } from '@/lib/logger'
import { mockReset } from 'vitest-mock-extended'

// Mock @/auth directly
vi.mock('@/auth', () => {
    console.log('MOCK FACTORY EXECUTED')
    const auth = vi.fn()
        ; (auth as any)._id = Math.random()
    return {
        auth,
        signIn: vi.fn(),
        signOut: vi.fn(),
        handlers: { GET: vi.fn(), POST: vi.fn() }
    }
})

import { auth } from '@/auth'

vi.mock('@/lib/google', () => ({
    getGmailClient: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn()
    }
}))

vi.mock('../pdf', () => ({
    generateInvoicePDF: vi.fn()
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
        mockGmailClient.users.messages.send.mockResolvedValue({})
        vi.mocked(auth).mockResolvedValue(mockSession as any)
        vi.mocked(getGmailClient).mockResolvedValue(mockGmailClient as any)
        mockReset(prisma as any)
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
            vi.mocked(auth as any).mockResolvedValue(null)
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
        it('should send invoice email with PDF', async () => {
            ; (prisma.job.findUnique as any).mockResolvedValue({
                id: 'job-1',
                lotNumber: '123',
                streetAddress: '123 Main St',
                builder: { name: 'Test Builder' }
            } as any)

                ; (prisma.invoice.findFirst as any).mockResolvedValue({
                    id: 'invoice-1',
                    number: 'INV-001',
                    totalAmount: 100.00
                } as any)

            vi.mocked(generateInvoicePDF).mockResolvedValue({
                success: true,
                pdf: 'base64pdf',
                filename: 'invoice.pdf'
            })

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ success: true, message: 'Invoice email queued' })
            expect(generateInvoicePDF).toHaveBeenCalledWith('invoice-1')
        })

        it('should fail if job not found', async () => {
            ; (prisma.job.findUnique as any).mockResolvedValue(null)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'Job not found' })
            expect(logger.warn).toHaveBeenCalled()
        })

        it('should fail if invoice not found', async () => {
            ; (prisma.job.findUnique as any).mockResolvedValue({ id: 'job-1' })
                ; (prisma.invoice.findFirst as any).mockResolvedValue(null)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'No invoice found for this job' })
        })

        it('should fail if PDF generation fails', async () => {
            ; (prisma.job.findUnique as any).mockResolvedValue({ id: 'job-1' })
                ; (prisma.invoice.findFirst as any).mockResolvedValue({ id: 'invoice-1' })
            vi.mocked(generateInvoicePDF).mockResolvedValue({ error: 'PDF Error' })

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'Failed to queue invoice generation' })
            expect(logger.error).toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth as any).mockResolvedValue(null)

            const result = await sendInvoiceEmail('job-1')

            expect(result).toEqual({ error: 'Unauthorized' })
        })
    })
})
