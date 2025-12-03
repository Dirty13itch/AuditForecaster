/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { generatePDF } from '@/app/actions/pdf'
import { prisma } from '@/lib/prisma'

vi.mock('puppeteer', () => ({
    default: {
        launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
                goto: vi.fn().mockResolvedValue(null),
                pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
                close: vi.fn().mockResolvedValue(null),
                setCookie: vi.fn().mockResolvedValue(null)
            }),
            close: vi.fn().mockResolvedValue(null)
        })
    }
}))

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: 'test-user', role: 'ADMIN' }
    })
}))

vi.mock('next/headers', () => ({
    cookies: vi.fn().mockResolvedValue({
        getAll: vi.fn().mockReturnValue([
            { name: 'next-auth.session-token', value: 'mock-token' }
        ])
    })
}))

describe('PDF Generation Server Action', () => {
    let testJobId: string
    let testBuilderId: string

    beforeAll(async () => {
        // Mock prisma responses
        const mockBuilder = {
            id: 'builder-1',
            name: 'PDF Test Builder',
            email: 'pdf@test.com'
        }
            ; (prisma.builder.create as any).mockResolvedValue(mockBuilder)
        testBuilderId = mockBuilder.id

        const mockJob = {
            id: 'job-1',
            lotNumber: 'PDF-TEST-001',
            streetAddress: '456 PDF Lane',
            city: 'Testville',
            address: '456 PDF Lane, Testville',
            status: 'COMPLETED',
            builderId: testBuilderId,
            builder: mockBuilder,
            inspections: [{
                id: 'insp-1',
                type: 'BLOWER_DOOR',
                createdAt: new Date()
            }]
        }
            ; (prisma.job.create as any).mockResolvedValue(mockJob)
        testJobId = mockJob.id

            ; (prisma.inspection.create as any).mockResolvedValue({
                id: 'insp-1',
                jobId: testJobId,
                type: 'BLOWER_DOOR',
                data: JSON.stringify({ cfm50: 1200 }),
                checklist: JSON.stringify([]),
            })

            // Mock findUnique for generatePDF
            ; (prisma.job.findUnique as any).mockImplementation((args: any) => {
                if (args.where.id === testJobId) {
                    return Promise.resolve(mockJob)
                }
                return Promise.resolve(null)
            })
    })

    afterAll(async () => {
        vi.clearAllMocks()
    })

    it('should generate a PDF for a valid job', async () => {
        const result = await generatePDF(testJobId)

        expect(result.success).toBe(true)
        expect(result.pdf).toBeDefined()
        expect(typeof result.pdf).toBe('string')
        expect(result.filename).toContain('Report-PDF-TEST-001')
    })

    it('should return error for non-existent job', async () => {
        const result = await generatePDF('non-existent-id')

        expect(result.error).toBeDefined()
        expect(result.success).toBeUndefined()
    })
})
