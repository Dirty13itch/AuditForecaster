/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCompanyInfo, updateCompanyInfo, updateNotificationPreferences } from '../company'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Valid CUID-format IDs for tests
const USER_ID = 'cm0000000000000000user001'
const COMPANY_ID = 'cm0000000000000000comp01'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $executeRawUnsafe: vi.fn(),
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn(),
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

vi.mock('@/lib/audit', () => ({
    logAudit: vi.fn(),
}))

describe('company actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: USER_ID, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
    })

    // -----------------------------------------------------------------------
    // getCompanyInfo
    // -----------------------------------------------------------------------
    describe('getCompanyInfo', () => {
        it('should return company info for authenticated user', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                {
                    id: COMPANY_ID,
                    userId: USER_ID,
                    companyName: 'Acme Corp',
                    address: '123 Main St',
                    phone: '555-1234',
                    licenseNumber: 'LIC-001',
                    emailNotifications: 1,
                    inAppNotifications: 0,
                },
            ] as any)

            const result = await getCompanyInfo()

            expect(result).toEqual({
                companyName: 'Acme Corp',
                address: '123 Main St',
                phone: '555-1234',
                licenseNumber: 'LIC-001',
                emailNotifications: true,
                inAppNotifications: false,
            })
        })

        it('should return defaults when no row exists', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any)

            const result = await getCompanyInfo()

            expect(result).toEqual({
                companyName: '',
                address: '',
                phone: '',
                licenseNumber: '',
                emailNotifications: true,
                inAppNotifications: true,
            })
        })

        it('should return null when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await getCompanyInfo()

            expect(result).toBeNull()
        })

        it('should return null on database error', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB error'))

            const result = await getCompanyInfo()

            expect(result).toBeNull()
        })
    })

    // -----------------------------------------------------------------------
    // updateCompanyInfo
    // -----------------------------------------------------------------------
    describe('updateCompanyInfo', () => {
        it('should update existing company info', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: COMPANY_ID }] as any)
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as any)

            const formData = new FormData()
            formData.set('companyName', 'Updated Corp')
            formData.set('address', '456 Oak Ave')
            formData.set('phone', '555-9999')
            formData.set('licenseNumber', 'LIC-002')

            const result = await updateCompanyInfo(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Company information updated successfully')
        })

        it('should insert new company info when none exists', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any)
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as any)

            const formData = new FormData()
            formData.set('companyName', 'New Corp')
            formData.set('address', '789 Pine St')
            formData.set('phone', '555-0000')
            formData.set('licenseNumber', 'LIC-003')

            const result = await updateCompanyInfo(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Company information updated successfully')
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const formData = new FormData()
            formData.set('companyName', 'Test')

            await expect(updateCompanyInfo(formData)).rejects.toThrow('Unauthorized')
        })

        it('should return validation error for company name over 200 chars', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)

            const formData = new FormData()
            formData.set('companyName', 'A'.repeat(201))
            formData.set('address', '')
            formData.set('phone', '')
            formData.set('licenseNumber', '')

            const result = await updateCompanyInfo(formData)

            expect(result.success).toBe(false)
            expect(result.message).toContain('200 characters')
        })
    })

    // -----------------------------------------------------------------------
    // updateNotificationPreferences
    // -----------------------------------------------------------------------
    describe('updateNotificationPreferences', () => {
        it('should update notification preferences (existing row)', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: COMPANY_ID }] as any)
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as any)

            const formData = new FormData()
            formData.set('emailNotifications', 'true')
            formData.set('inAppNotifications', 'false')

            const result = await updateNotificationPreferences(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification preferences updated successfully')
        })

        it('should insert new row when none exists', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any)
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as any)

            const formData = new FormData()
            formData.set('emailNotifications', 'false')
            formData.set('inAppNotifications', 'true')

            const result = await updateNotificationPreferences(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification preferences updated successfully')
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const formData = new FormData()
            formData.set('emailNotifications', 'true')
            formData.set('inAppNotifications', 'true')

            await expect(updateNotificationPreferences(formData)).rejects.toThrow('Unauthorized')
        })

        it('should return error on database failure', async () => {
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(undefined as any)
            vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB error'))

            const formData = new FormData()
            formData.set('emailNotifications', 'true')
            formData.set('inAppNotifications', 'true')

            const result = await updateNotificationPreferences(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Failed to update notification preferences')
        })
    })
})
