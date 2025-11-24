
import { generatePDF } from '@/app/actions/pdf'
import { prisma } from '@/lib/prisma'

// Mock puppeteer
jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            goto: jest.fn().mockResolvedValue(null),
            pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
            close: jest.fn().mockResolvedValue(null)
        }),
        close: jest.fn().mockResolvedValue(null)
    })
}))

describe('PDF Generation Server Action', () => {
    let testJobId: string
    let testBuilderId: string

    beforeAll(async () => {
        // Create test data
        const builder = await prisma.builder.create({
            data: {
                name: 'PDF Test Builder',
                email: 'pdf@test.com'
            }
        })
        testBuilderId = builder.id

        const job = await prisma.job.create({
            data: {
                lotNumber: 'PDF-TEST-001',
                streetAddress: '456 PDF Lane',
                city: 'Testville',
                address: '456 PDF Lane, Testville',
                status: 'COMPLETED',
                builderId: testBuilderId
            }
        })
        testJobId = job.id

        // Create an inspection for the job
        await prisma.inspection.create({
            data: {
                jobId: testJobId,
                type: 'BLOWER_DOOR',
                data: JSON.stringify({ cfm50: 1200 }),
                checklist: JSON.stringify([]),
            }
        })
    })

    afterAll(async () => {
        // Clean up
        await prisma.inspection.deleteMany({ where: { jobId: testJobId } })
        await prisma.job.delete({ where: { id: testJobId } })
        await prisma.builder.delete({ where: { id: testBuilderId } })
        await prisma.$disconnect()
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
