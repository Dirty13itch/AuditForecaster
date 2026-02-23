import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Resend before importing
vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
        emails: {
            send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
        },
    })),
}))

import {
    sendInspectionCompletedEmail,
    sendQARejectionEmail,
    sendEmailWithAttachment,
} from '../email'

describe('Email Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('sendInspectionCompletedEmail', () => {
        it('returns mock response when RESEND_API_KEY is not set', async () => {
            delete process.env.RESEND_API_KEY
            const result = await sendInspectionCompletedEmail(
                'test@example.com',
                '123 Main St',
                'John Doe',
                'https://example.com/report/1'
            )
            expect(result.success).toBe(true)
        })

        it('sends email when RESEND_API_KEY is set', async () => {
            process.env.RESEND_API_KEY = 're_test_key'
            const result = await sendInspectionCompletedEmail(
                'test@example.com',
                '123 Main St',
                'John Doe',
                'https://example.com/report/1'
            )
            expect(result.success).toBe(true)
        })
    })

    describe('sendQARejectionEmail', () => {
        it('returns mock response when RESEND_API_KEY is not set', async () => {
            delete process.env.RESEND_API_KEY
            const result = await sendQARejectionEmail(
                'inspector@example.com',
                '456 Oak Ave',
                'Missing blower door readings',
                'https://example.com/job/1'
            )
            expect(result.success).toBe(true)
        })
    })

    describe('sendEmailWithAttachment', () => {
        it('returns mock response when RESEND_API_KEY is not set', async () => {
            delete process.env.RESEND_API_KEY
            const result = await sendEmailWithAttachment(
                'test@example.com',
                'Test Subject',
                '<p>Test body</p>',
                [{ filename: 'report.pdf', content: Buffer.from('pdf content') }]
            )
            expect(result.success).toBe(true)
        })
    })
})
