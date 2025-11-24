import { register, collectDefaultMetrics } from 'prom-client';
import { NextResponse } from 'next/server';

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
        console.error('Metrics endpoint error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
