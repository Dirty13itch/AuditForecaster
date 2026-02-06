/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    saveAdvancedTemplate,
    createInspectionWithTemplate,
    getTemplatesForSelection,
} from '../advanced-templates'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const USER_ID = 'cm0000000000000000user001'
const TEMPLATE_ID = 'cm0000000000000000tmpl01'
const TEMPLATE_ID_2 = 'cm0000000000000000tmpl02'
const JOB_ID = 'cm0000000000000000jobb01'
const INSPECTION_ID = 'cm0000000000000000insp01'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        reportTemplate: {
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        inspection: {
            create: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
    },
}))

const mockStructure = {
    pages: [
        {
            id: 'page-1',
            name: 'Cover',
            sections: [],
        },
    ],
    logic: [],
}

describe('advanced-templates actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: USER_ID, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // saveAdvancedTemplate
    // -----------------------------------------------------------------------
    describe('saveAdvancedTemplate', () => {
        it('should create a new template when no templateId is provided', async () => {
            vi.mocked(prisma.reportTemplate.create).mockResolvedValue({
                id: TEMPLATE_ID,
                name: 'My Template',
            } as any)

            const result = await saveAdvancedTemplate({
                name: 'My Template',
                description: 'A test template',
                structure: mockStructure as any,
            })

            expect(result.success).toBe(true)
            expect(prisma.reportTemplate.create).toHaveBeenCalledWith({
                data: {
                    name: 'My Template',
                    description: 'A test template',
                    structure: JSON.stringify(mockStructure),
                    checklistItems: '[]',
                },
            })
        })

        it('should update an existing template when templateId is provided', async () => {
            vi.mocked(prisma.reportTemplate.update).mockResolvedValue({
                id: TEMPLATE_ID,
                name: 'Updated Template',
            } as any)

            const result = await saveAdvancedTemplate({
                name: 'Updated Template',
                description: 'Updated description',
                structure: mockStructure as any,
                templateId: TEMPLATE_ID,
            })

            expect(result.success).toBe(true)
            expect(prisma.reportTemplate.update).toHaveBeenCalledWith({
                where: { id: TEMPLATE_ID },
                data: {
                    name: 'Updated Template',
                    description: 'Updated description',
                    structure: JSON.stringify(mockStructure),
                },
            })
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(
                saveAdvancedTemplate({
                    name: 'Test',
                    structure: mockStructure as any,
                })
            ).rejects.toThrow('Unauthorized')
        })
    })

    // -----------------------------------------------------------------------
    // createInspectionWithTemplate
    // -----------------------------------------------------------------------
    describe('createInspectionWithTemplate', () => {
        it('should create an inspection linked to a job and template', async () => {
            vi.mocked(prisma.inspection.create).mockResolvedValue({
                id: INSPECTION_ID,
                jobId: JOB_ID,
                reportTemplateId: TEMPLATE_ID,
            } as any)

            const result = await createInspectionWithTemplate(JOB_ID, TEMPLATE_ID)

            expect(result.inspectionId).toBe(INSPECTION_ID)
            expect(prisma.inspection.create).toHaveBeenCalledWith({
                data: {
                    jobId: JOB_ID,
                    reportTemplateId: TEMPLATE_ID,
                    data: '{}',
                    answers: '{}',
                    score: 0,
                },
            })
        })

        it('should propagate database errors', async () => {
            vi.mocked(prisma.inspection.create).mockRejectedValue(
                new Error('Foreign key constraint failed')
            )

            await expect(
                createInspectionWithTemplate(JOB_ID, TEMPLATE_ID)
            ).rejects.toThrow('Foreign key constraint failed')
        })
    })

    // -----------------------------------------------------------------------
    // getTemplatesForSelection
    // -----------------------------------------------------------------------
    describe('getTemplatesForSelection', () => {
        it('should return templates for selection', async () => {
            const mockTemplates = [
                { id: TEMPLATE_ID, name: 'Template A', description: 'First' },
                { id: TEMPLATE_ID_2, name: 'Template B', description: null },
            ]
            vi.mocked(prisma.reportTemplate.findMany).mockResolvedValue(mockTemplates as any)

            const result = await getTemplatesForSelection()

            expect(result).toEqual(mockTemplates)
            expect(prisma.reportTemplate.findMany).toHaveBeenCalledWith({
                take: 100,
                select: { id: true, name: true, description: true },
                orderBy: { createdAt: 'desc' },
            })
        })

        it('should return empty array when no templates exist', async () => {
            vi.mocked(prisma.reportTemplate.findMany).mockResolvedValue([])

            const result = await getTemplatesForSelection()

            expect(result).toEqual([])
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getTemplatesForSelection()).rejects.toThrow('Unauthorized')
        })
    })
})
