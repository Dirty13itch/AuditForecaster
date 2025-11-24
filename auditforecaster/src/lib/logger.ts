/**
 * Production-grade logger
 * Provides structured logging with different levels and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
    [key: string]: unknown
}

class Logger {
    private context: LogContext = {}

    constructor(defaultContext: LogContext = {}) {
        this.context = defaultContext
    }

    private log(level: LogLevel, message: string, context: LogContext = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.context,
            ...context,
            environment: process.env.NODE_ENV,
            version: '0.1.0', // Could be imported from package.json
        }

        // In production, send to logging service (e.g., Sentry, DataDog)
        if (process.env.NODE_ENV === 'production') {
            // Log to console in JSON format for log aggregation
            const jsonLog = JSON.stringify(logEntry);

            if (level === 'error') {
                console.error(jsonLog);
            } else {
                console.log(jsonLog);
            }

            // Send errors to Sentry (if configured)
            if (level === 'error' && context.error instanceof Error) {
                // Sentry is configured globally via next.config.ts (when enabled)
                // We can also explicitly capture here if needed
            }
        } else {
            // Development: Pretty print
            const emoji = {
                debug: '🔍',
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌',
            }[level]

            const stream = level === 'error' ? console.error : console.log;

            stream(
                `${emoji} [${level.toUpperCase()}]`,
                message,
                context
            )
        }
    }

    debug(message: string, context?: LogContext) {
        this.log('debug', message, context)
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context)
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context)
    }

    error(message: string, error?: Error | unknown, context?: LogContext) {
        this.log('error', message, {
            ...context,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : error,
        })
    }

    child(additionalContext: LogContext) {
        return new Logger({ ...this.context, ...additionalContext })
    }
}

// Export singleton logger
export const logger = new Logger({
    service: 'auditforecaster',
})

// Export Logger class for creating child loggers
export { Logger }
