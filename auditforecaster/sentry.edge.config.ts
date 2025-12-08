import * as Sentry from "@sentry/nextjs"

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust sample rate based on environment
    // Production: 10% to manage costs, Staging: 100% for debugging
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    environment: process.env.NODE_ENV,

    beforeSend(event, hint) {
        // Filter out development errors
        if (process.env.NODE_ENV === 'development') {
            console.error('Sentry Error:', hint.originalException || hint.syntheticException)
            return null // Don't send to Sentry in development
        }
        return event
    },
})
