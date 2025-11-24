import { z } from "zod"

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Auth
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),

    // Email (Optional for development)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    // Sentry (Optional for development)
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

    // Node Environment
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export type Env = z.infer<typeof envSchema>

// Validate environment variables at build/startup time
function validateEnv(): Env {
    try {
        const parsed = envSchema.parse(process.env)

        // Warn if Sentry is not configured in production
        if (parsed.NODE_ENV === "production" && !parsed.NEXT_PUBLIC_SENTRY_DSN) {
            console.warn("⚠️  WARNING: NEXT_PUBLIC_SENTRY_DSN not set in production")
            console.warn("   Error tracking will not be available")
        }

        return parsed
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Invalid environment variables:")
            console.error(JSON.stringify(error.errors, null, 2))
            throw new Error("Environment validation failed")
        }
        throw error
    }
}

// Export validated env (this will throw if invalid)
export const env = validateEnv()

