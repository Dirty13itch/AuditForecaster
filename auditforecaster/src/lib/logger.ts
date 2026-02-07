type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogContext {
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: unknown;
}

class Logger {
    private log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...context
        };

        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(logEntry));
        } else {
            const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m';
            console.log(`${color}[${level}] \x1b[0m${message}`, context || '');
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
