'use server';

import { prisma } from '@/lib/prisma';
import { logger } from "@/lib/logger"
import { Redis } from '@upstash/redis';
import { auth } from "@/auth"

export type SystemHealth = {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy' | 'not-configured';
    integrations: {
        googleMaps: boolean;
        weather: boolean;
        email: boolean;
        supplyPro: boolean;
    };
    version: string;
};

export async function checkSystemHealth(): Promise<SystemHealth> {
    // Require admin authentication to view system health
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    // 1. Check Database
    let dbStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'healthy';
    } catch (e) {
        logger.error('Health Check DB Error', { error: e })
    }

    // 2. Check Redis
    let redisStatus: 'healthy' | 'unhealthy' | 'not-configured' = 'not-configured';
    if (process.env.UPSTASH_REDIS_REST_URL) {
        try {
            const redis = Redis.fromEnv();
            await redis.ping();
            redisStatus = 'healthy';
        } catch (e) {
            logger.error('Health Check Redis Error', { error: e })
            redisStatus = 'unhealthy';
        }
    }

    // 3. Check Integrations (Presence of Keys)
    const integrations = {
        googleMaps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        weather: !!process.env.WEATHER_API_KEY,
        email: !!process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your-resend-api-key'),
        supplyPro: !!process.env.SUPPLYPRO_API_KEY,
    };

    return {
        database: dbStatus,
        redis: redisStatus,
        integrations,
        version: process.env.npm_package_version || '0.1.0'
    };
}
