import { prisma } from '@/lib/prisma';
import { SupplyProWebhookSchema, normalizeBuilderName } from '@/lib/integrations/supplypro';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Verify webhook signature using HMAC-SHA256
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature || !secret) return false;
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

export async function POST(req: Request) {
    const bodyText = await req.text();
    let bodyJson: unknown;

    // Authenticate webhook request
    const webhookSecret = process.env.SUPPLYPRO_WEBHOOK_SECRET;
    const signature = req.headers.get('x-supplypro-signature');

    // If webhook secret is configured, require valid signature
    if (webhookSecret) {
        if (!verifyWebhookSignature(bodyText, signature, webhookSecret)) {
            logger.warn('SupplyPro webhook signature verification failed', {
                hasSignature: !!signature,
                ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
            });
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    } else {
        // Log warning if webhook secret is not configured (not secure)
        logger.warn('SUPPLYPRO_WEBHOOK_SECRET not configured - webhook authentication disabled');
    }

    try {
        bodyJson = JSON.parse(bodyText);
    } catch {
        // Log malformed JSON attempt
        await prisma.integrationLog.create({
            data: {
                service: 'SUPPLYPRO',
                action: 'JOB_INGESTION',
                success: false,
                request: bodyText.slice(0, 1000), // Truncate if too long
                response: 'Invalid JSON',
                error: 'JSON parse error',
            },
        });
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate Payload
    const result = SupplyProWebhookSchema.safeParse(bodyJson);

    if (!result.success) {
        // Log validation failure
        await prisma.integrationLog.create({
            data: {
                service: 'SUPPLYPRO',
                action: 'JOB_INGESTION',
                success: false,
                request: JSON.stringify(bodyJson).slice(0, 1000),
                response: 'Validation Error',
                error: JSON.stringify(result.error.format()),
            },
        });
        return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    const payload = result.data;

    try {
        // 1. Find or Create Builder
        // In a real scenario, we might want to be stricter here, but for auto-ingestion:
        const builderName = normalizeBuilderName(payload.builderName);
        let builder = await prisma.builder.findFirst({
            where: { name: { equals: builderName, mode: 'insensitive' } },
        });

        if (!builder) {
            builder = await prisma.builder.create({
                data: {
                    name: payload.builderName, // Use original casing for creation
                    address: payload.city, // Placeholder
                },
            });
        }

        // 2. Create or Update Job
        // We use buildProOrderId as the unique key
        const job = await prisma.job.upsert({
            where: { buildProOrderId: payload.orderId },
            update: {
                // Update mutable fields if they change? For now, let's just update status if needed
                // scheduledDate: payload.scheduledDate ? new Date(payload.scheduledDate) : undefined,
            },
            create: {
                buildProOrderId: payload.orderId,
                buildProSyncedAt: new Date(),
                builderId: builder.id,
                lotNumber: payload.lotNumber,
                streetAddress: payload.streetAddress,
                city: payload.city,
                address: `${payload.streetAddress}, ${payload.city} ${payload.zipCode || ''}`.trim(),
                scheduledDate: payload.scheduledDate ? new Date(payload.scheduledDate) : null,
                status: 'PENDING',
            },
        });

        // 3. Log Success
        await prisma.integrationLog.create({
            data: {
                service: 'SUPPLYPRO',
                action: 'JOB_INGESTION',
                jobId: job.id,
                success: true,
                request: JSON.stringify(bodyJson).slice(0, 1000),
                response: 'Job Created/Updated',
            },
        });

        return NextResponse.json({ success: true, jobId: job.id });

    } catch (error: unknown) {
        logger.error('SupplyPro Webhook Error', { error });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log System Error
        await prisma.integrationLog.create({
            data: {
                service: 'SUPPLYPRO',
                action: 'JOB_INGESTION',
                success: false,
                request: JSON.stringify(bodyJson).slice(0, 1000),
                response: 'Internal Server Error',
                error: errorMessage,
            },
        });

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
