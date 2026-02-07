import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    const start = Date.now()

    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            dbLatencyMs: Date.now() - start,
        })
    } catch {
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
        }, { status: 503 })
    }
}
