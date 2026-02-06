'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { isFeatureEnabled } from "@/lib/feature-flags"

export type RevenueForecast = {
    month: string
    actual: number
    projected: number
}

export type InspectorPerformance = {
    name: string
    jobsCompleted: number
    avgScore: number
    revenueGenerated: number
}

export async function getRevenueForecast(): Promise<RevenueForecast[] | { error: string }> {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') return { error: "Unauthorized" }

    if (!isFeatureEnabled('ENABLE_ADVANCED_ANALYTICS')) {
        return { error: "Feature disabled" }
    }

    // Mock forecast logic (Real implementation would use historical trends)
    // In a real app, we'd query invoices grouped by month and apply a linear regression
    const today = new Date()
    const forecast: RevenueForecast[] = []

    for (let i = 0; i < 6; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const monthName = date.toLocaleString('default', { month: 'short' })

        forecast.push({
            month: monthName,
            actual: i === 0 ? 5000 : 0, // Mock current month actual
            projected: 5000 + (i * 500) // Simple linear growth
        })
    }

    return forecast
}

export async function getInspectorPerformance(): Promise<InspectorPerformance[] | { error: string }> {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') return { error: "Unauthorized" }

    if (!isFeatureEnabled('ENABLE_ADVANCED_ANALYTICS')) {
        return { error: "Feature disabled" }
    }

    const inspectors = await prisma.user.findMany({
        where: { role: 'INSPECTOR' },
        take: 50,
        include: {
            jobs: {
                where: { status: 'COMPLETED' },
                take: 200,
                include: {
                    inspections: { take: 1 }
                }
            }
        }
    })

    return inspectors.map(inspector => {
        const jobsCompleted = inspector.jobs.length
        // Calculate avg score from inspections (mock logic if score is missing)
        const totalScore = inspector.jobs.reduce((acc, job) => {
            const score = job.inspections[0]?.score || 0
            return acc + score
        }, 0)

        const avgScore = jobsCompleted > 0 ? totalScore / jobsCompleted : 0
        const revenueGenerated = jobsCompleted * 150 // Mock $150 per job

        return {
            name: inspector.name || 'Unknown',
            jobsCompleted,
            avgScore,
            revenueGenerated
        }
    })
}
