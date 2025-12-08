import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

// Schema for Job Creation via API
const CreateJobApiSchema = z.object({
    lotNumber: z.string(),
    streetAddress: z.string(),
    city: z.string(),
    builderId: z.string().optional(), // Optional if we infer from API key owner?
    subdivisionId: z.string().optional()
})

export async function GET(request: Request) {
    const apiKey = await validateApiKey('READ_JOBS')
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter jobs by builder if the API key belongs to a specific builder user?
    // For now, we return all jobs (Admin level key) or we could filter.
    // Let's implement a simple limit/offset
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const jobs = await prisma.job.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            lotNumber: true,
            address: true,
            status: true,
            createdAt: true
        }
    })

    return NextResponse.json({ data: jobs })
}

export async function POST(request: Request) {
    const apiKey = await validateApiKey('WRITE_JOBS')
    if (!apiKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const validated = CreateJobApiSchema.parse(body)

        const job = await prisma.job.create({
            data: {
                lotNumber: validated.lotNumber,
                streetAddress: validated.streetAddress,
                city: validated.city,
                address: `${validated.streetAddress}, ${validated.city}`,
                builderId: validated.builderId,
                subdivisionId: validated.subdivisionId,
                status: 'PENDING'
            }
        })

        // Audit Log
        await logAudit({
            entityType: 'Job',
            entityId: job.id,
            action: 'CREATE',
            changes: validated
        })

        return NextResponse.json({ data: job }, { status: 201 })
    } catch (error) {
        // Don't leak internal error details - log them instead
        console.error('API /v1/jobs POST error:', error)
        const message = error instanceof z.ZodError
            ? 'Validation failed: ' + error.errors.map(e => e.message).join(', ')
            : 'Invalid request'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
