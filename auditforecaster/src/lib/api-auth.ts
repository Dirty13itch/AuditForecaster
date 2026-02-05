import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import crypto from "crypto"
import { logger } from "@/lib/logger"

/**
 * Hash an API key using SHA-256 for storage comparison.
 * API keys are hashed for security - we never store them in plaintext.
 */
export function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Validate an API key from the Authorization header.
 * Expected format: "Bearer sk_live_xxxxx" or "Bearer sk_test_xxxxx"
 */
export async function validateApiKey(requiredScope?: string) {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const rawKey = authHeader.split(' ')[1]

    // Validate key format
    if (!rawKey || (!rawKey.startsWith('sk_live_') && !rawKey.startsWith('sk_test_'))) {
        logger.warn('Invalid API key format', { keyPrefix: rawKey?.substring(0, 8) })
        return null
    }

    // Hash the key to compare with stored hash
    const keyHash = hashApiKey(rawKey)

    const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash }
    })

    if (!apiKey) {
        return null
    }

    // Check expiration if the field exists on the model
    if ('expiresAt' in apiKey && apiKey.expiresAt) {
        const expiresAt = apiKey.expiresAt as Date
        if (expiresAt < new Date()) {
            logger.warn('Expired API key used', { keyId: apiKey.id })
            return null
        }
    }

    // Check Scope
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
        return null
    }

    // Update last used (fire and forget)
    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() }
    })

    return apiKey
}
