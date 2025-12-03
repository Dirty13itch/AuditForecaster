import { z } from 'zod'

const envSchema = z.object({
    // Server-side
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Google Integration (Optional but recommended)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Email (Optional)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    // Sentry (Optional)
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

    // Rate Limiting (Optional)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
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
