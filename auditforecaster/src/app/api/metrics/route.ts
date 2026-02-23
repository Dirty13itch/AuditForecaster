import { register, collectDefaultMetrics } from 'prom-client';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Initialize default metrics collection
collectDefaultMetrics({ prefix: 'auditforecaster_' });

export async function GET(request: NextRequest) {
    // Require same token as health endpoint
    const token = process.env.HEALTH_CHECK_TOKEN
    if (token) {
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        const metrics = await register.metrics();
        return new NextResponse(metrics, {
            headers: {
                'Content-Type': register.contentType,
            },
        });
    } catch (error) {
        logger.error('Metrics endpoint failed', { error });
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
