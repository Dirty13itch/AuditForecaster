'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type IntegrationSettingsData = {
    ekotropeApiKey?: string | null
    ekotropeEnabled?: boolean
    supplyProApiKey?: string | null
    supplyProEnabled?: boolean
    autoCreateJobsFromBuildPro?: boolean
    autoSyncToEkotrope?: boolean
    autoGenerateHERSCerts?: boolean
}

export async function getIntegrationSettings() {
    try {
        let settings = await prisma.integrationSettings.findFirst()

        if (!settings) {
            settings = await prisma.integrationSettings.create({
                data: {
                    // Defaults are already set in schema, but being explicit here
                    ekotropeEnabled: false,
                    supplyProEnabled: false,
                    autoCreateJobsFromBuildPro: true,
                    autoSyncToEkotrope: true,
                    autoGenerateHERSCerts: true,
                },
            })
        }

        return { success: true, data: settings }
    } catch (error) {
        console.error('SERVER ACTION ERROR: Failed to get integration settings:', error)
        return { success: false, error: 'Failed to load settings' }
    }
}

export async function updateIntegrationSettings(data: IntegrationSettingsData) {
    try {
        const current = await prisma.integrationSettings.findFirst()

        if (!current) {
            await prisma.integrationSettings.create({ data })
        } else {
            await prisma.integrationSettings.update({
                where: { id: current.id },
                data,
            })
        }

        revalidatePath('/dashboard/admin/integrations')
        return { success: true }
    } catch (error) {
        console.error('Failed to update integration settings:', error)
        return { success: false, error: 'Failed to update settings' }
    }
}
