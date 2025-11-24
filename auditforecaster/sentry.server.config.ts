import * as Sentry from "@sentry/nextjs"

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

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
