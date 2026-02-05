import { register, collectDefaultMetrics } from 'prom-client';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Initialize default metrics collection
collectDefaultMetrics({ prefix: 'auditforecaster_' });

export async function GET(req: NextRequest) {
    // Require a bearer token for metrics access
    const authHeader = req.headers.get('authorization');
    const metricsToken = process.env.METRICS_SECRET;

    if (metricsToken) {
        if (!authHeader || authHeader !== `Bearer ${metricsToken}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    } else if (process.env.NODE_ENV === 'production') {
        // In production, require METRICS_SECRET to be configured
        logger.warn('METRICS_SECRET not configured - metrics endpoint disabled in production');
        return new NextResponse('Metrics endpoint not configured', { status: 503 });
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
