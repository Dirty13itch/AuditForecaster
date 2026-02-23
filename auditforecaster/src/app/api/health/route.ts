import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { access, constants, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'

function checkHealthAuth(request: NextRequest): boolean {
    const token = process.env.HEALTH_CHECK_TOKEN
    if (!token) return true // No token configured = public access (backwards compatible)

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return false
    return authHeader.slice(7) === token
}

type CheckResult = {
    status: 'ok' | 'error' | 'skipped'
    latencyMs?: number
    message?: string
}

type HealthResponse = {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    checks: {
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
        // Check if directory is accessible and writable
        await access(uploadDir, constants.W_OK)

        // Test write capability
        await writeFile(testFile, 'health-check')
        await unlink(testFile)

        return { status: 'ok', latencyMs: Date.now() - start }
    } catch (error) {
        // If directory doesn't exist, that's okay - it'll be created on first upload
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

export async function GET(request: NextRequest) {
    if (!checkHealthAuth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()

    // Run all checks in parallel for speed
    const [database, redis, filesystem] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkFilesystem()
    ])

    const checks = { database, redis, filesystem }
    const totalLatencyMs = Date.now() - startTime

    // Determine overall status
    const criticalFailed = database.status === 'error'
    const nonCriticalFailed = redis.status === 'error' || filesystem.status === 'error'

    let status: HealthResponse['status'] = 'healthy'
    if (criticalFailed) {
        status = 'unhealthy'
    } else if (nonCriticalFailed) {
        status = 'degraded'
    }

    const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        checks,
        totalLatencyMs,
        version: process.env.NODE_ENV === 'production' ? 'redacted' : (process.env.npm_package_version || '1.0.0'),
    }

    // Return 503 for unhealthy (critical failure), 200 for healthy/degraded
    const httpStatus = status === 'unhealthy' ? 503 : 200

    return NextResponse.json(response, { status: httpStatus })
}
