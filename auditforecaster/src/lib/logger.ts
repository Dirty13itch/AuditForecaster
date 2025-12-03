import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogContext {
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: unknown;
}

class Logger {
    private async log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...context
        };

        // Console Output (JSON for machine readability in production)
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(logEntry));
        } else {
            // Pretty print for development
            const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
            console.log(`${color}[${level}] \x1b[0m${message}`, context || '');
        }

        // Persist Errors to DB (Async, fire-and-forget)
        if (level === 'ERROR' || level === 'WARN') {
            try {
                // We use a detached promise to not block the main thread
                // In a serverless env, we might need to await this or use a queue
                prisma.systemLog.create({
                    data: {
                        level,
                        message,
                        context: context as unknown as Prisma.InputJsonValue,
                        userId: context?.userId,
                    }
                }).catch(err => console.error('Failed to write log to DB:', err));
            } catch (e) {
                // Fallback if Prisma fails
                console.error('Logger failed to persist:', e);
            }
        }
    }

    info(message: string, context?: LogContext) {
        this.log("INFO", message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log("WARN", message, context);
    }

    error(message: string, context?: LogContext) {
        this.log("ERROR", message, context);
    }

    debug(message: string, context?: LogContext) {
        if (process.env.NODE_ENV !== 'production') {
            this.log("DEBUG", message, context);
        }
    }
}

export const logger = new Logger();
