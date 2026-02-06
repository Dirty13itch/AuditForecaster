import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPendingExpenses, processExpense } from '../expenses'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        expense: {
            findMany: vi.fn(),
            update: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

const MOCK_USER_ID = 'cm0000000000000000user001'
const MOCK_EXPENSE_ID = 'cm000000000000000expense1'

describe('Expenses Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'ADMIN' } } as any)
    })

    describe('getPendingExpenses', () => {
        it('should return pending expenses for admin user', async () => {
            const mockExpenses = [
                {
                    id: MOCK_EXPENSE_ID,
                    amount: 150.00,
                    status: 'PENDING',
                    date: new Date('2025-01-15'),
                    user: { name: 'John Doe', email: 'john@example.com', image: null },
                    job: { address: '123 Main St', lotNumber: 'LOT-001' }
                }
            ]

            vi.mocked(prisma.expense.findMany as any).mockResolvedValue(mockExpenses)

            const result = await getPendingExpenses()

            expect(result).toEqual(mockExpenses)
            expect(prisma.expense.findMany).toHaveBeenCalledWith({
                where: { status: 'PENDING' },
                take: 100,
                include: {
                    user: { select: { name: true, email: true, image: true } },
                    job: { select: { address: true, lotNumber: true } }
                },
                orderBy: { date: 'desc' }
            })
        })

        it('should throw Unauthorized for non-admin user', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'INSPECTOR' } } as any)

            await expect(getPendingExpenses()).rejects.toThrow('Unauthorized')
        })

        it('should throw Unauthorized when no session', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            await expect(getPendingExpenses()).rejects.toThrow('Unauthorized')
        })

        it('should return empty array when no pending expenses', async () => {
            vi.mocked(prisma.expense.findMany as any).mockResolvedValue([])

            const result = await getPendingExpenses()

            expect(result).toEqual([])
        })
    })

    describe('processExpense', () => {
        it('should approve an expense successfully', async () => {
            vi.mocked(prisma.expense.update as any).mockResolvedValue({
                id: MOCK_EXPENSE_ID,
                status: 'APPROVED',
                rejectionReason: null
            })

            const result = await processExpense(MOCK_EXPENSE_ID, 'APPROVED')

            expect(result).toEqual({ success: true })
            expect(prisma.expense.update).toHaveBeenCalledWith({
                where: { id: MOCK_EXPENSE_ID },
                data: {
                    status: 'APPROVED',
                    rejectionReason: null
                }
            })
        })

        it('should reject an expense with a reason', async () => {
            vi.mocked(prisma.expense.update as any).mockResolvedValue({
                id: MOCK_EXPENSE_ID,
                status: 'REJECTED',
                rejectionReason: 'Not a valid business expense'
            })

            const result = await processExpense(MOCK_EXPENSE_ID, 'REJECTED', 'Not a valid business expense')

            expect(result).toEqual({ success: true })
            expect(prisma.expense.update).toHaveBeenCalledWith({
                where: { id: MOCK_EXPENSE_ID },
                data: {
                    status: 'REJECTED',
                    rejectionReason: 'Not a valid business expense'
                }
            })
        })

        it('should throw Unauthorized for non-admin user', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { id: MOCK_USER_ID, role: 'INSPECTOR' } } as any)

            await expect(processExpense(MOCK_EXPENSE_ID, 'APPROVED')).rejects.toThrow('Unauthorized')
        })

        it('should throw error for invalid ID format', async () => {
            await expect(processExpense('invalid-id!', 'APPROVED')).rejects.toThrow('Invalid Expense ID format')
        })

        it('should return error when database update fails', async () => {
            vi.mocked(prisma.expense.update as any).mockRejectedValue(new Error('DB error'))

            const result = await processExpense(MOCK_EXPENSE_ID, 'APPROVED')

            expect(result).toEqual({ success: false, error: 'Failed to process expense' })
        })
    })
})
