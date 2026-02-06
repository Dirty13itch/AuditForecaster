import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyMileageLog, autoClassifyLogs, classifyMileage, classifyExpense } from '../finance'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        mileageLog: {
            update: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn()
        },
        expense: {
            update: vi.fn()
        },
        $transaction: vi.fn()
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

const MOCK_USER_ID = 'cm0000000000000000user001'
const MOCK_LOG_ID = 'cm00000000000000mileage1'
const MOCK_EXPENSE_ID = 'cm000000000000000expense1'

describe('Finance Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'ADMIN' } } as any)
    })

    describe('classifyMileageLog', () => {
        it('should classify a mileage log as BUSINESS', async () => {
            vi.mocked(prisma.mileageLog.update as any).mockResolvedValue({
                id: MOCK_LOG_ID,
                purpose: 'BUSINESS',
                status: 'CLASSIFIED'
            })

            const result = await classifyMileageLog(MOCK_LOG_ID, 'BUSINESS')

            expect(result).toEqual({ success: true })
            expect(prisma.mileageLog.update).toHaveBeenCalledWith({
                where: {
                    id: MOCK_LOG_ID,
                    vehicle: { assignedTo: MOCK_USER_ID }
                },
                data: {
                    purpose: 'BUSINESS',
                    status: 'CLASSIFIED'
                }
            })
        })

        it('should classify a mileage log as PERSONAL', async () => {
            vi.mocked(prisma.mileageLog.update as any).mockResolvedValue({
                id: MOCK_LOG_ID,
                purpose: 'PERSONAL',
                status: 'CLASSIFIED'
            })

            const result = await classifyMileageLog(MOCK_LOG_ID, 'PERSONAL')

            expect(result).toEqual({ success: true })
        })

        it('should return error for unauthorized user', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await classifyMileageLog(MOCK_LOG_ID, 'BUSINESS')

            expect(result).toEqual({ error: 'Unauthorized' })
        })

        it('should return error for invalid input', async () => {
            // z.enum(['BUSINESS', 'PERSONAL']) rejects invalid enum values
            const result = await classifyMileageLog(MOCK_LOG_ID, 'INVALID' as any)

            expect(result).toEqual({ error: 'Invalid input' })
        })

        it('should return error when database update fails', async () => {
            vi.mocked(prisma.mileageLog.update as any).mockRejectedValue(new Error('DB error'))

            const result = await classifyMileageLog(MOCK_LOG_ID, 'BUSINESS')

            expect(result).toEqual({ error: 'Failed to update log' })
        })
    })

    describe('autoClassifyLogs', () => {
        it('should auto-classify logs based on time of day', async () => {
            const businessDate = new Date('2025-06-15T10:00:00') // 10 AM - business hours
            const personalDate = new Date('2025-06-15T20:00:00') // 8 PM - personal hours

            const mockLogs = [
                { id: 'cm00000000000000mileage1', date: businessDate },
                { id: 'cm00000000000000mileage2', date: personalDate }
            ]

            vi.mocked(prisma.mileageLog.findMany as any).mockResolvedValue(mockLogs)
            vi.mocked(prisma.$transaction as any).mockResolvedValue([])

            const result = await autoClassifyLogs()

            expect(result).toEqual({ success: true, count: 2 })
            expect(prisma.$transaction).toHaveBeenCalled()
        })

        it('should return error for unauthorized user', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await autoClassifyLogs()

            expect(result).toEqual({ error: 'Unauthorized' })
        })

        it('should handle no pending logs gracefully', async () => {
            vi.mocked(prisma.mileageLog.findMany as any).mockResolvedValue([])

            const result = await autoClassifyLogs()

            expect(result).toEqual({ success: true, count: 0 })
            expect(prisma.$transaction).not.toHaveBeenCalled()
        })

        it('should return error when transaction fails', async () => {
            const mockLogs = [
                { id: 'cm00000000000000mileage1', date: new Date('2025-06-15T10:00:00') }
            ]

            vi.mocked(prisma.mileageLog.findMany as any).mockResolvedValue(mockLogs)
            vi.mocked(prisma.$transaction as any).mockRejectedValue(new Error('Transaction failed'))

            const result = await autoClassifyLogs()

            expect(result).toEqual({ error: 'Failed to auto-classify' })
        })
    })

    describe('classifyMileage', () => {
        it('should normalize Business to BUSINESS and delegate to classifyMileageLog', async () => {
            vi.mocked(prisma.mileageLog.update as any).mockResolvedValue({
                id: MOCK_LOG_ID,
                purpose: 'BUSINESS',
                status: 'CLASSIFIED'
            })

            const result = await classifyMileage(MOCK_LOG_ID, 'Business')

            expect(result).toEqual({ success: true })
            expect(prisma.mileageLog.update).toHaveBeenCalledWith({
                where: {
                    id: MOCK_LOG_ID,
                    vehicle: { assignedTo: MOCK_USER_ID }
                },
                data: {
                    purpose: 'BUSINESS',
                    status: 'CLASSIFIED'
                }
            })
        })

        it('should normalize Personal to PERSONAL and delegate to classifyMileageLog', async () => {
            vi.mocked(prisma.mileageLog.update as any).mockResolvedValue({
                id: MOCK_LOG_ID,
                purpose: 'PERSONAL',
                status: 'CLASSIFIED'
            })

            const result = await classifyMileage(MOCK_LOG_ID, 'Personal')

            expect(result).toEqual({ success: true })
        })
    })

    describe('classifyExpense', () => {
        it('should classify an expense with category', async () => {
            vi.mocked(prisma.expense.update as any).mockResolvedValue({
                id: MOCK_EXPENSE_ID,
                status: 'CLASSIFIED',
                category: 'Equipment'
            })

            const result = await classifyExpense(MOCK_EXPENSE_ID, 'CLASSIFIED', 'Equipment')

            expect(result).toEqual({ success: true })
            expect(prisma.expense.update).toHaveBeenCalledWith({
                where: { id: MOCK_EXPENSE_ID },
                data: {
                    status: 'CLASSIFIED',
                    category: 'Equipment'
                }
            })
        })

        it('should return error for unauthorized user', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await classifyExpense(MOCK_EXPENSE_ID, 'CLASSIFIED', 'Equipment')

            expect(result).toEqual({ error: 'Unauthorized' })
        })

        it('should return error for invalid input (empty category)', async () => {
            const result = await classifyExpense(MOCK_EXPENSE_ID, 'CLASSIFIED', '')

            expect(result).toEqual({ error: 'Invalid input' })
        })

        it('should return error when database update fails', async () => {
            vi.mocked(prisma.expense.update as any).mockRejectedValue(new Error('DB error'))

            const result = await classifyExpense(MOCK_EXPENSE_ID, 'CLASSIFIED', 'Equipment')

            expect(result).toEqual({ error: 'Failed to classify expense' })
        })
    })
})
