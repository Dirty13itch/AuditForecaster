import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { jobId, templateId } = body

        if (!jobId || !templateId) {
            return NextResponse.json({ error: 'Missing jobId or templateId' }, { status: 400 })
        }

        const inspection = await prisma.inspection.create({
            data: {
                jobId,
                reportTemplateId: templateId,
                data: '{}',
                answers: '{}',
                score: 0,
            }
        })

        return NextResponse.json({ inspectionId: inspection.id })

    } catch (error) {
        logger.error('API: createInspection failed', { error })
        return NextResponse.json(
            { error: 'Failed to create inspection' },
            { status: 500 }
        )
    }
}
