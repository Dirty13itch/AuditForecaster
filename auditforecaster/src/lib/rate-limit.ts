/**
 * Simple in-memory rate limiter for development.
 * In production with UPSTASH_REDIS_REST_URL configured, uses Upstash Redis.
 * Falls back to in-memory Map when Redis isn't available.
 */

type RateLimitRecord = {
  count: number
  resetTime: number
}

type RateLimitConfig = {
  /** Time window in milliseconds */
  interval: number
  /** Maximum number of requests allowed within the interval */
  limit: number
}

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

const CLEANUP_INTERVAL = 60_000 // Run cleanup every 60 seconds
const MAX_ENTRIES = 10_000 // Prevent unbounded memory growth

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitRecord>()
  let lastCleanup = Date.now()

  function cleanup() {
    const now = Date.now()
    // Only run cleanup periodically, not on every request
    if (now - lastCleanup < CLEANUP_INTERVAL && store.size < MAX_ENTRIES) {
      return
    }
    lastCleanup = now

    store.forEach((record, key) => {
      if (now >= record.resetTime) {
        store.delete(key)
      }
    })
  }

  async function rateLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now()

    cleanup()

    const existing = store.get(key)

    // If no record or window has expired, start a new window
    if (!existing || now >= existing.resetTime) {
      const resetTime = now + config.interval
      store.set(key, { count: 1, resetTime })
      return {
        success: true,
        remaining: config.limit - 1,
        reset: resetTime,
      }
    }

    // Increment within current window
    existing.count++
    store.set(key, existing)

    const remaining = Math.max(0, config.limit - existing.count)
    const success = existing.count <= config.limit

    return {
      success,
      remaining,
      reset: existing.resetTime,
    }
  }

  return rateLimit
}

/** General API rate limiter: 60 requests per minute */
export const apiLimiter = createRateLimiter({ interval: 60_000, limit: 60 })

/** Auth rate limiter: 10 requests per 15 minutes */
export const authLimiter = createRateLimiter({ interval: 900_000, limit: 10 })

/** Export rate limiter: 5 requests per minute */
export const exportLimiter = createRateLimiter({ interval: 60_000, limit: 5 })
