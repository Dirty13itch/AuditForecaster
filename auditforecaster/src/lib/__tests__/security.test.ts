import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit } from '../security'

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('bypasses rate limiting in test environment', async () => {
        const result = await checkRateLimit('test-ip', 'public')
        expect(result.success).toBe(true)
        expect(result.limit).toBe(1000)
        expect(result.remaining).toBe(1000)
    })

    it('returns success for all rate limit types in test', async () => {
        const types = ['public', 'authenticated', 'core', 'login', 'webhook'] as const
        for (const type of types) {
            const result = await checkRateLimit('test-ip', type)
            expect(result.success).toBe(true)
        }
    })

    it('supports user-prefixed identifiers for per-user rate limiting', async () => {
        const result = await checkRateLimit('user:user-123', 'authenticated')
        expect(result.success).toBe(true)
    })

    it('supports webhook-prefixed identifiers', async () => {
        const result = await checkRateLimit('webhook:supplypro:1.2.3.4', 'webhook')
        expect(result.success).toBe(true)
    })

    it('defaults to core type when no type specified', async () => {
        const result = await checkRateLimit('test-ip')
        expect(result.success).toBe(true)
    })

    it('includes reset timestamp in response', async () => {
        const result = await checkRateLimit('test-ip', 'public')
        expect(result.reset).toBeGreaterThan(Date.now())
    })
})
