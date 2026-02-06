import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema: required vs optional environment variables
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Base schema shared by all environments.
 *
 * Required vars MUST be present or the server will refuse to start.
 * Optional vars are documented here so they show up in the inferred type and
 * are validated when provided (e.g. URLs must be valid URLs).
 */
const baseSchema = z.object({
    // -- Always required -------------------------------------------------------
    DATABASE_URL: z
        .string({ required_error: 'DATABASE_URL is required. Set it to your database connection string.' })
        .min(1, 'DATABASE_URL must not be empty.'),
    NEXTAUTH_URL: z
        .string({ required_error: 'NEXTAUTH_URL is required. Set it to your app URL (e.g. http://localhost:3000).' })
        .url('NEXTAUTH_URL must be a valid URL.'),
    NEXTAUTH_SECRET: z
        .string({ required_error: 'NEXTAUTH_SECRET is required. Generate one with: openssl rand -base64 32' })
        .min(32, 'NEXTAUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32'),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // -- Google OAuth (required in production) ---------------------------------
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // -- Optional: Email -------------------------------------------------------
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    // -- Optional: Sentry ------------------------------------------------------
    SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

    // -- Optional: Redis (BullMQ) ----------------------------------------------
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().regex(/^\d+$/, 'REDIS_PORT must be a numeric string.').optional(),
    REDIS_PASSWORD: z.string().optional(),

    // -- Optional: Upstash Redis (rate limiting) --------------------------------
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // -- Optional: Endpoint security -------------------------------------------
    METRICS_SECRET: z.string().optional(),
    HEALTH_SECRET: z.string().optional(),
})

/**
 * In production we tighten the schema: Google OAuth credentials are required.
 */
const productionSchema = baseSchema.extend({
    GOOGLE_CLIENT_ID: z
        .string({ required_error: 'GOOGLE_CLIENT_ID is required in production.' })
        .min(1, 'GOOGLE_CLIENT_ID must not be empty in production.'),
    GOOGLE_CLIENT_SECRET: z
        .string({ required_error: 'GOOGLE_CLIENT_SECRET is required in production.' })
        .min(1, 'GOOGLE_CLIENT_SECRET must not be empty in production.'),
})

const envSchema = isProduction ? productionSchema : baseSchema

// ---------------------------------------------------------------------------
// Collect raw values
// ---------------------------------------------------------------------------

const rawEnv: Record<string, string | undefined> = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    METRICS_SECRET: process.env.METRICS_SECRET,
    HEALTH_SECRET: process.env.HEALTH_SECRET,
}

// ---------------------------------------------------------------------------
// Validation helper (called from instrumentation.ts at startup)
// ---------------------------------------------------------------------------

export type Env = z.infer<typeof baseSchema>

/**
 * Validates environment variables and returns the parsed result.
 * Throws a descriptive error in production; logs a warning in development.
 */
export function validateEnv(): Env {
    const result = envSchema.safeParse(rawEnv)

    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n')

        const message = [
            '',
            '=== Environment Validation Failed ===',
            '',
            formatted,
            '',
            'Fix the variables above and restart the server.',
            '=====================================',
            '',
        ].join('\n')

        if (isProduction) {
            throw new Error(message)
        }

        // In dev/test, warn but do not crash so developers can iterate quickly.
        console.warn(message)
    }

    // Return validated data when valid, or the raw values as a fallback in
    // dev/test so the app can still boot with partial configuration.
    return (result.success ? result.data : rawEnv) as Env
}

// ---------------------------------------------------------------------------
// Singleton export -- backward compatible with `import { env } from '@/lib/env'`
// ---------------------------------------------------------------------------

const isServer = typeof window === 'undefined'

/**
 * Typed, validated environment variables.
 *
 * On the server the values are validated on first import. On the client the
 * object is a passthrough (env vars are not available in the browser anyway).
 */
export const env: Env = isServer
    ? validateEnv()
    : (rawEnv as Env)
