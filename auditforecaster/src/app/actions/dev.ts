'use server'

import { promises as fs } from 'fs'
import path from 'path'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'

export type FeatureStatus = 'todo' | 'in-progress' | 'done' | 'failed'

export interface Feature {
    id: string
    category: string
    description: string
    status: FeatureStatus
    verification_steps: string[]
}

export interface FeaturesData {
    features: Feature[]
}

export async function getDevFeatures(): Promise<{ success: boolean; data?: FeaturesData; error?: string }> {
    // Dev features are only visible to admins or in development
    const session = await auth()
    if (process.env.NODE_ENV === 'production' && session?.user?.role !== 'ADMIN') {
        return { success: true, data: { features: [] } }
    }

    try {
        const featuresPath = path.join(process.cwd(), '.agent/harness/features.json')
        const fileContent = await fs.readFile(featuresPath, 'utf-8')
        const data = JSON.parse(fileContent) as FeaturesData
        return { success: true, data }
    } catch (error) {
        logger.warn('Failed to read features.json', { error })
        return { success: true, data: { features: [] } }
    }
}
