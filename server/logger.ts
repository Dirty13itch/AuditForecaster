import winston from 'winston';

// Define log format (JSON for production, pretty for development)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
  process.env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, metadata }) => {
        const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
        return `${timestamp} [${level}]: ${message}${meta}`;
      })
);

// Create Winston logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'energy-audit-api' },
  transports: [
    new winston.transports.Console(),
    // Add file transports for production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' })
        ]
      : [])
  ]
});

// Create child logger with context and optional correlation ID
export function createLogger(context: string, correlationId?: string) {
  return logger.child({
    context,
    ...(correlationId && { correlationId })
  });
}

/**
 * Backward-compatible Logger class wrapper around Winston
 * Maintains the same interface as the previous console.log-based logger
 */
class Logger {
  private winstonLogger: winston.Logger;

  constructor(config: { prefix?: string } = {}) {
    // Create child logger with context
    this.winstonLogger = logger.child({
      context: config.prefix || 'Server'
    });
  }

  debug(message: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === 'object') {
      this.winstonLogger.debug(message, args[0]);
    } else {
      this.winstonLogger.debug(message, { args });
    }
  }

  info(message: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === 'object') {
      this.winstonLogger.info(message, args[0]);
    } else {
      this.winstonLogger.info(message, { args });
    }
  }

  warn(message: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === 'object') {
      this.winstonLogger.warn(message, args[0]);
    } else {
      this.winstonLogger.warn(message, { args });
    }
  }

  error(message: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === 'object') {
      this.winstonLogger.error(message, args[0]);
    } else {
      this.winstonLogger.error(message, { args });
    }
  }
}

// Export serverLogger for backward compatibility
export const serverLogger = new Logger({ prefix: 'Server' });
