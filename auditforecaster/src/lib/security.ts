import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// --- Rate Limiting ---

// Initialize Redis if credentials exist
const redis = (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Create Rate Limiters
export const rateLimiters = {
    // Public: 5 req / 10s (Login, Register)
    public: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/public',
    }) : null,

    // Authenticated: 20 req / 10s (Mutations)
    authenticated: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '10 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/auth',
    }) : null,

    // Core: 100 req / 10s (Queries)
    core: redis ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '10 s'),
        analytics: true,
        prefix: '@upstash/ratelimit/core',
    }) : null,
};

// Fallback In-Memory Limiter (if Redis is down or not configured)
const memoryStore = new Map<string, { count: number; lastReset: number }>();
const MEMORY_WINDOW = 10000; // 10s
const MEMORY_STORE_MAX_ENTRIES = 10000;

function cleanupMemoryStore() {
    if (memoryStore.size <= MEMORY_STORE_MAX_ENTRIES) return;

    const now = Date.now();
    for (const [key, record] of memoryStore) {
        if (now - record.lastReset > MEMORY_WINDOW) {
            memoryStore.delete(key);
        }
    }
}

export async function checkRateLimit(identifier: string, type: 'public' | 'authenticated' | 'core' = 'core') {
    // 0. Bypass in Development/Test
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return { success: true, limit: 1000, remaining: 1000, reset: Date.now() + 10000 };
    }

    // 1. Try Upstash Redis
    if (rateLimiters[type]) {
        try {
            const { success, limit, remaining, reset } = await rateLimiters[type]!.limit(identifier);
            return { success, limit, remaining, reset };
        } catch (error) {
            logger.error('Upstash rate limit failed (fail open)', { error });
            // Fail Open: If security service is down, don't block users
        }
    }

    // 2. Fallback to Memory
    const now = Date.now();
    const record = memoryStore.get(identifier) || { count: 0, lastReset: now };

    if (now - record.lastReset > MEMORY_WINDOW) {
        record.count = 0;
        record.lastReset = now;
    }

    record.count++;
    memoryStore.set(identifier, record);

    // 3. Prevent memory leak: clean up stale entries when map grows too large
    cleanupMemoryStore();

    const limits = { public: 5, authenticated: 20, core: 100 };
    const limit = limits[type];

    return {
        success: record.count <= limit,
        limit,
        remaining: Math.max(0, limit - record.count),
        reset: record.lastReset + MEMORY_WINDOW
    };
}

// Sanitization moved to security-client.ts
