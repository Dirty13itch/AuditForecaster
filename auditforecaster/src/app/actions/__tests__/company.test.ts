/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCompanyInfo, updateCompanyInfo, updateNotificationPreferences } from '../company'
import { prisma } from '@/lib/prisma'

// Mock @/auth - required for auth() calls in server actions
// Note: Mock must be defined before import for proper hoisting
vi.mock('@/auth', () => ({
    auth: vi.fn()
}))
import { auth } from '@/auth'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn()
    }
}))

vi.mock('@/lib/audit', () => ({
    logAudit: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $executeRawUnsafe: vi.fn(),
        $queryRaw: vi.fn(),
        $executeRaw: vi.fn()
    }
}))

describe('Company Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getCompanyInfo', () => {
        it('should return null if user is not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const result = await getCompanyInfo()

            expect(result).toBeNull()
        })

        it('should return default values when no company info exists', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([])

            const result = await getCompanyInfo()

            expect(result).toEqual({
                companyName: '',
                address: '',
                phone: '',
                licenseNumber: '',
                emailNotifications: true,
                inAppNotifications: true
            })
        })

        it('should return company info when it exists', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                {
                    id: 'company-1',
                    userId: 'user-1',
                    companyName: 'Test Company',
                    address: '123 Test St',
                    phone: '555-1234',
                    licenseNumber: 'LIC123',
                    emailNotifications: 1,
                    inAppNotifications: 0
                }
            ])

            const result = await getCompanyInfo()

            expect(result).toEqual({
                companyName: 'Test Company',
                address: '123 Test St',
                phone: '555-1234',
                licenseNumber: 'LIC123',
                emailNotifications: true,
                inAppNotifications: false
            })
        })

        it('should handle null values in company info', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([
                {
                    id: 'company-1',
                    userId: 'user-1',
                    companyName: null,
                    address: null,
                    phone: null,
                    licenseNumber: null,
                    emailNotifications: 1,
                    inAppNotifications: 1
                }
            ])

            const result = await getCompanyInfo()

            expect(result).toEqual({
                companyName: '',
                address: '',
                phone: '',
                licenseNumber: '',
                emailNotifications: true,
                inAppNotifications: true
            })
        })

        it('should return null on error', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database error'))

            const result = await getCompanyInfo()

            expect(result).toBeNull()
        })
    })

    describe('updateCompanyInfo', () => {
        it('should throw if user is not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(updateCompanyInfo(formData)).rejects.toThrow('Unauthorized')
        })

        it('should create new company info if none exists', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([])
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1)

            const formData = new FormData()
            formData.append('companyName', 'New Company')
            formData.append('address', '456 New St')
            formData.append('phone', '555-5678')
            formData.append('licenseNumber', 'LIC456')

            const result = await updateCompanyInfo(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Company information updated successfully')
        })

        it('should update existing company info', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'company-1' }])
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1)

            const formData = new FormData()
            formData.append('companyName', 'Updated Company')

            const result = await updateCompanyInfo(formData)

            expect(result.success).toBe(true)
        })
    })

    describe('updateNotificationPreferences', () => {
        it('should throw if user is not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)
            const formData = new FormData()

            await expect(updateNotificationPreferences(formData)).rejects.toThrow('Unauthorized')
        })

        it('should update notification preferences', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: 'user-1', role: 'ADMIN' }
            } as any)
            vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0)
            vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'company-1' }])
            vi.mocked(prisma.$executeRaw).mockResolvedValue(1)

            const formData = new FormData()
            formData.append('emailNotifications', 'true')
            formData.append('inAppNotifications', 'false')

            const result = await updateNotificationPreferences(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Notification preferences updated successfully')
        })
    })
})
