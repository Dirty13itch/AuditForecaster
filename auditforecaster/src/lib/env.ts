import { z } from 'zod'

// Helper to treat empty strings as undefined (for optional fields)
const optionalString = z.string().optional().transform(val => val === '' ? undefined : val)
const optionalUrl = z.string().url().optional().or(z.literal(''))
const optionalEmail = z.string().email().optional().or(z.literal(''))

const envSchema = z.object({
    // Server-side
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Google Integration (Optional but recommended)
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,

    // Email (Optional) - can be plain email or "Name <email>" format
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: optionalString, // Don't validate format, can be "Name <email@example.com>"

    // Sentry (Optional)
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,

    // Redis for BullMQ queues (Optional - for background job processing)
    REDIS_HOST: optionalString,
    REDIS_PORT: z.string().regex(/^\d+$/).optional().or(z.literal('')),
    REDIS_PASSWORD: optionalString,

    // Upstash Redis for rate limiting (Optional)
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalString,
})

const processEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
}

// Validate on import (Server only)
const isServer = typeof window === 'undefined'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parsed = isServer ? envSchema.safeParse(processEnv) : { success: true, data: processEnv as any, error: undefined }

if (!parsed.success) {
    console.error(
        '❌ Invalid environment variables:',
        JSON.stringify(parsed.error?.format(), null, 4)
    )
    // Only throw in production to prevent dev crashes if optional vars are missing
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment variables')
    }
}

export const env = parsed.success ? parsed.data : processEnv as z.infer<typeof envSchema>
