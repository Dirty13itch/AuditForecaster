type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
  enabledInProduction: boolean;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.config = {
      minLevel: this.isDevelopment ? 'debug' : 'warn',
      enabledInProduction: false,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && !this.config.enabledInProduction) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix || 'App';
    const formattedMessage = `[${timestamp}] [${prefix}] [${level.toUpperCase()}] ${message}`;
    return [formattedMessage, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
    
    // In production, this could send to a logging service
    // Example: this.sendToLoggingService(message, args);
  }

  // Placeholder for future logging service integration
  private sendToLoggingService(message: string, args: any[]): void {
    // TODO: Implement logging service integration (e.g., Sentry, LogRocket, etc.)
    // This could be configured to send errors to a remote service in production
  }
}

// Create logger instances for different modules
export const queryClientLogger = new Logger({ prefix: 'QueryClient' });
export const syncQueueLogger = new Logger({ prefix: 'SyncQueue' });
export const analyticsLogger = new Logger({ prefix: 'Analytics' });

// Default logger for general use
export const logger = new Logger();

export default logger;
