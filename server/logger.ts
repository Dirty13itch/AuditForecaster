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
  private isProduction: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      minLevel: this.isProduction ? 'warn' : 'debug',
      enabledInProduction: true,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isProduction || this.config.enabledInProduction) {
      return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
    }
    return false;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix || 'Server';
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
  }
}

export const serverLogger = new Logger({ prefix: 'Server' });
