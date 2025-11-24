import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createActionItem, getActionItems, updateActionItemStatus } from '../action-items'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import { sendEmail } from '../email'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('../email', () => ({
    sendEmail: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('action-items actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createActionItem', () => {
        it('should create action item and send email', async () => {
            const data = {
                inspectionId: 'insp-1',
                title: 'Fix Window',
                priority: 'HIGH',
                assignedToEmail: 'contractor@example.com'
            }

            prismaMock.actionItem.create.mockResolvedValue({
                id: 'item-1',
                ...data,
                status: 'OPEN',
                description: null,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any)

            const result = await createActionItem(data)

            expect(result.success).toBe(true)
            expect(prismaMock.actionItem.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'Fix Window',
                    assignedToEmail: 'contractor@example.com'
                })
            })

            expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'contractor@example.com',
                subject: expect.stringContaining('Action Required')
            }))
        })

        it('should create action item without email if not assigned', async () => {
            const data = {
                inspectionId: 'insp-1',
                title: 'Fix Window',
                priority: 'LOW'
            }

            prismaMock.actionItem.create.mockResolvedValue({
                id: 'item-1',
                ...data,
                status: 'OPEN',
                assignedToEmail: null,
                description: null,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any)

            const result = await createActionItem(data)

            expect(result.success).toBe(true)
            expect(sendEmail).not.toHaveBeenCalled()
        })

        it('should fail if unauthorized', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const data = {
                inspectionId: 'insp-1',
                title: 'Fix Window',
                priority: 'HIGH'
            }

            await expect(createActionItem(data)).rejects.toThrow('Unauthorized')
        })
    })

    describe('getActionItems', () => {
        it('should fetch action items', async () => {
            prismaMock.actionItem.findMany.mockResolvedValue([
                { id: 'item-1', title: 'Fix Window' }
            ] as any)

            const result = await getActionItems('insp-1')

            expect(result).toHaveLength(1)
            expect(prismaMock.actionItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { inspectionId: 'insp-1' }
            }))
        })
    })

    describe('updateActionItemStatus', () => {
        it('should update status', async () => {
            await updateActionItemStatus('item-1', 'COMPLETED')

            expect(prismaMock.actionItem.update).toHaveBeenCalledWith({
                where: { id: 'item-1' },
                data: { status: 'COMPLETED' }
            })
        })
    })
})
