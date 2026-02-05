import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { access, constants, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'

type CheckResult = {
    status: 'ok' | 'error' | 'skipped'
    latencyMs?: number
    message?: string
}

type HealthResponse = {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    checks?: {
        database: CheckResult
        redis: CheckResult
        filesystem: CheckResult
    }
    totalLatencyMs: number
    version: string
}

async function checkDatabase(): Promise<CheckResult> {
    const start = Date.now()
    try {
        await prisma.$queryRaw`SELECT 1`
        return { status: 'ok', latencyMs: Date.now() - start }
    } catch (error) {
        logger.error('Health check: database failed', { error })
        return {
            status: 'error',
            latencyMs: Date.now() - start,
            message: 'Database connection failed'
        }
    }
}

async function checkRedis(): Promise<CheckResult> {
    const host = process.env.REDIS_HOST
    const port = process.env.REDIS_PORT

    if (!host) {
        return { status: 'skipped', message: 'Redis not configured' }
    }

    const start = Date.now()
    let client: Redis | null = null

    try {
        client = new Redis({
            host,
            port: parseInt(port || '6379'),
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 5000,
            lazyConnect: true,
        })

        await client.connect()
        await client.ping()
        return { status: 'ok', latencyMs: Date.now() - start }
    } catch (error) {
        logger.error('Health check: redis failed', { error })
        return {
            status: 'error',
            latencyMs: Date.now() - start,
            message: 'Redis connection failed'
        }
    } finally {
        if (client) {
            try {
                await client.quit()
            } catch {
                // Ignore quit errors
            }
        }
    }
}

async function checkFilesystem(): Promise<CheckResult> {
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    const testFile = join(uploadDir, `.health-check-${Date.now()}`)
    const start = Date.now()

    try {
        await access(uploadDir, constants.W_OK)
        await writeFile(testFile, 'health-check')
        await unlink(testFile)
        return { status: 'ok', latencyMs: Date.now() - start }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { status: 'ok', latencyMs: Date.now() - start, message: 'Upload dir will be created on demand' }
        }
        logger.error('Health check: filesystem failed', { error })
        return {
            status: 'error',
            latencyMs: Date.now() - start,
            message: 'Filesystem not writable'
        }
    }
}

export async function GET(req: NextRequest) {
    const startTime = Date.now()

    // Check if request is authenticated for detailed info
    const authHeader = req.headers.get('authorization')
    const healthSecret = process.env.HEALTH_SECRET
    const isAuthenticated = healthSecret ? authHeader === `Bearer ${healthSecret}` : false

    const [database, redis, filesystem] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkFilesystem()
    ])

    const checks = { database, redis, filesystem }
    const totalLatencyMs = Date.now() - startTime

    const criticalFailed = database.status === 'error'
    const nonCriticalFailed = redis.status === 'error' || filesystem.status === 'error'

    let status: HealthResponse['status'] = 'healthy'
    if (criticalFailed) {
        status = 'unhealthy'
    } else if (nonCriticalFailed) {
        status = 'degraded'
    }

    // Only include detailed check info for authenticated requests
    const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        totalLatencyMs,
        version: process.env.npm_package_version || '1.0.0',
    }

    if (isAuthenticated) {
        response.checks = checks
    }

    const httpStatus = status === 'unhealthy' ? 503 : 200
    return NextResponse.json(response, { status: httpStatus })
}
