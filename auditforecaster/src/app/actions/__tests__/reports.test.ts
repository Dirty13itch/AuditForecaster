import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveReport, getSavedReports, deleteReport } from '../reports'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        savedReport: {
            create: vi.fn(),
            findMany: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

describe('Reports Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveReport', () => {
        it('should create a report when authenticated', async () => {
            // Arrange
            const mockSession = { user: { id: 'user-1' } }
            vi.mocked(auth).mockResolvedValue(mockSession as any)
            vi.mocked(prisma.savedReport.create).mockResolvedValue({ id: 'report-1' } as any)

            const reportData = {
                name: 'Test Report',
                description: 'A test report',
                config: { type: 'financial' },
            }

            // Act
            const result = await saveReport(reportData)

            // Assert
            expect(result).toEqual({ success: true, message: "Report saved successfully" })
            expect(prisma.savedReport.create).toHaveBeenCalledWith({
                data: {
                    ...reportData,
                    userId: 'user-1',
                },
            })
        })

        it('should return unauthorized when unauthenticated', async () => {
            // Arrange
            vi.mocked(auth).mockResolvedValue(null)

            // Act
            const result = await saveReport({ name: 'Test', config: {} })

            // Assert - source returns error object, does not throw
            expect(result).toEqual({ success: false, message: "Unauthorized" })
        })
    })

    describe('getSavedReports', () => {
        it('should return reports for the user', async () => {
            // Arrange
            const mockSession = { user: { id: 'user-1' } }
            const mockReports = [{ id: 'report-1', name: 'Report 1' }]
            vi.mocked(auth).mockResolvedValue(mockSession as any)
            vi.mocked(prisma.savedReport.findMany).mockResolvedValue(mockReports as any)

            // Act
            const result = await getSavedReports()

            // Assert
            expect(result).toEqual(mockReports)
            expect(prisma.savedReport.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                take: 50,
                orderBy: { createdAt: 'desc' },
            })
        })
    })

    describe('deleteReport', () => {
        it('should delete report when authenticated', async () => {
            // Arrange
            const mockSession = { user: { id: 'user-1' } }
            vi.mocked(auth).mockResolvedValue(mockSession as any)

            // Act
            const result = await deleteReport('report-1')

            // Assert
            expect(result).toEqual({ success: true, message: "Report deleted successfully" })
            expect(prisma.savedReport.delete).toHaveBeenCalledWith({
                where: { id: 'report-1', userId: 'user-1' },
            })
        })
    })
})
