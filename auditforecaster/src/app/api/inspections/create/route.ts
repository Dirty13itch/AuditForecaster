import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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
                answers: {},
                score: 0,
            }
        })

        return NextResponse.json({ inspectionId: inspection.id })

    } catch (error) {
        console.error('API: createInspection error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create inspection' },
            { status: 500 }
        )
    }
}
