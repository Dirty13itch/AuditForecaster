/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        integrationSettings: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

import { getIntegrationSettings, updateIntegrationSettings } from '../integrations'

// ---------------------------------------------------------------------------
// Valid CUID-format IDs
// ---------------------------------------------------------------------------
const mockUserId = 'cm0000000000000000user001'
const mockSettingsId = 'cm0000000000000settings01'

describe('Integration Settings Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: mockUserId, role: 'ADMIN' },
        } as any)
    })

    describe('getIntegrationSettings', () => {
        it('should reject non-admin users', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'INSPECTOR' },
            } as any)

            const result = await getIntegrationSettings()

            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: Admin access required',
            })
        })

        it('should reject unauthenticated users', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await getIntegrationSettings()

            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: Admin access required',
            })
        })

        it('should return existing settings', async () => {
            const mockSettings = {
                id: mockSettingsId,
                ekotropeEnabled: true,
                supplyProEnabled: false,
                autoCreateJobsFromBuildPro: true,
                autoSyncToEkotrope: true,
                autoGenerateHERSCerts: false,
            }
            vi.mocked(prisma.integrationSettings.findFirst).mockResolvedValue(mockSettings as any)

            const result = await getIntegrationSettings()

            expect(result).toEqual({ success: true, data: mockSettings })
        })

        it('should create default settings when none exist', async () => {
            const defaultSettings = {
                id: mockSettingsId,
                ekotropeEnabled: false,
                supplyProEnabled: false,
                autoCreateJobsFromBuildPro: true,
                autoSyncToEkotrope: true,
                autoGenerateHERSCerts: true,
            }
            vi.mocked(prisma.integrationSettings.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.integrationSettings.create).mockResolvedValue(defaultSettings as any)

            const result = await getIntegrationSettings()

            expect(result).toEqual({ success: true, data: defaultSettings })
            expect(prisma.integrationSettings.create).toHaveBeenCalledWith({
                data: {
                    ekotropeEnabled: false,
                    supplyProEnabled: false,
                    autoCreateJobsFromBuildPro: true,
                    autoSyncToEkotrope: true,
                    autoGenerateHERSCerts: true,
                },
            })
        })

        it('should handle database errors', async () => {
            vi.mocked(prisma.integrationSettings.findFirst).mockRejectedValue(new Error('DB Error'))

            const result = await getIntegrationSettings()

            expect(result).toEqual({ success: false, error: 'Failed to load settings' })
        })
    })

    describe('updateIntegrationSettings', () => {
        it('should reject non-admin users', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { id: mockUserId, role: 'INSPECTOR' },
            } as any)

            const result = await updateIntegrationSettings({ ekotropeEnabled: true })

            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: Admin access required',
            })
        })

        it('should update existing settings', async () => {
            const existingSettings = { id: mockSettingsId }
            vi.mocked(prisma.integrationSettings.findFirst).mockResolvedValue(existingSettings as any)
            vi.mocked(prisma.integrationSettings.update).mockResolvedValue({} as any)

            const updateData = { ekotropeEnabled: true, supplyProEnabled: false }
            const result = await updateIntegrationSettings(updateData)

            expect(result).toEqual({ success: true })
            expect(prisma.integrationSettings.update).toHaveBeenCalledWith({
                where: { id: mockSettingsId },
                data: updateData,
            })
        })

        it('should create settings when none exist', async () => {
            vi.mocked(prisma.integrationSettings.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.integrationSettings.create).mockResolvedValue({} as any)

            const createData = { ekotropeEnabled: true }
            const result = await updateIntegrationSettings(createData)

            expect(result).toEqual({ success: true })
            expect(prisma.integrationSettings.create).toHaveBeenCalledWith({ data: createData })
        })

        it('should handle database errors', async () => {
            vi.mocked(prisma.integrationSettings.findFirst).mockRejectedValue(new Error('DB Error'))

            const result = await updateIntegrationSettings({ ekotropeEnabled: true })

            expect(result).toEqual({ success: false, error: 'Failed to update settings' })
        })
    })
})
