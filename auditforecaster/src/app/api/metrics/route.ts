import { register, collectDefaultMetrics } from 'prom-client';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Initialize default metrics collection
collectDefaultMetrics({ prefix: 'auditforecaster_' });

export async function GET() {
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
