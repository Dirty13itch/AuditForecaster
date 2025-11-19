import { serverLogger } from "./logger";

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  sessionSecret: string;
  replitDomains: string[];
  issuerUrl: string;
  replId: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Validates and returns server configuration
 * Throws descriptive errors if required environment variables are missing
 */
export function validateConfig(): ServerConfig {
  const errors: string[] = [];
  
  // Check DATABASE_URL (required for production, optional for dev)
  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  if (!databaseUrl) {
    if (isProduction) {
      errors.push('DATABASE_URL is required in production');
    } else {
      serverLogger.warn('[Config] DATABASE_URL not set - using in-memory session store (dev only)');
    }
  }
  
  // Check SESSION_SECRET (always required)
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    errors.push('SESSION_SECRET environment variable is required');
  }
  
  // Check REPLIT_DOMAINS (required in production, optional in development)
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (!replitDomains) {
    if (isProduction) {
      errors.push('REPLIT_DOMAINS is required for authentication in production');
    } else {
      serverLogger.warn('[Config] REPLIT_DOMAINS not set - using localhost for development');
    }
  }
  
  // Check REPL_ID (required in production, optional in development)
  const replId = process.env.REPL_ID;
  if (!replId) {
    if (isProduction) {
      errors.push('REPL_ID environment variable is required in production');
    } else {
      serverLogger.warn('[Config] REPL_ID not set - using default for development');
    }
  }
  
  // If there are errors, throw with helpful message
  if (errors.length > 0) {
    const errorMessage = [
      '',
      '╔════════════════════════════════════════════════════════════════╗',
      '║  CONFIGURATION ERROR - Missing Required Environment Variables  ║',
      '╚════════════════════════════════════════════════════════════════╝',
      '',
      'The following environment variables are missing or invalid:',
      '',
      ...errors.map(err => `  ❌ ${err}`),
      '',
      'How to fix:',
      '  1. Check your Replit Secrets (lock icon in sidebar)',
      '  2. Ensure all required variables are set',
      '  3. For DATABASE_URL: create a PostgreSQL database in Replit',
      '  4. For SESSION_SECRET: generate with: openssl rand -base64 32',
      '  5. For REPLIT_DOMAINS: add your repl URL from Replit Auth connector',
      '',
      'Documentation: https://docs.replit.com/category/authentication',
      '',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  // Parse and return validated config
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv,
    databaseUrl: databaseUrl || '',
    sessionSecret: sessionSecret!,
    replitDomains: replitDomains ? replitDomains.split(',').map(d => d.trim()) : ['localhost:5000', 'localhost:3000'],
    issuerUrl: process.env.ISSUER_URL || 'https://replit.com/oidc',
    replId: replId || 'dev-repl-id',
    isDevelopment,
    isProduction,
  };
  
  // Log configuration summary (without secrets)
  serverLogger.info('[Config] Server configuration validated:');
  serverLogger.info(`[Config]   Environment: ${config.nodeEnv}`);
  serverLogger.info(`[Config]   Port: ${config.port}`);
  serverLogger.info(`[Config]   Database: ${config.databaseUrl ? '✓ Connected' : '✗ Not configured (using in-memory store)'}`);
  serverLogger.info(`[Config]   Auth Domains: ${config.replitDomains.length} configured`);
  serverLogger.info(`[Config]   OIDC Issuer: ${config.issuerUrl}`);
  
  return config;
}

// Singleton config instance
let configInstance: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  if (!configInstance) {
    configInstance = validateConfig();
  }
  return configInstance;
}

/**
 * Helper function to check if running in development mode
 * Used by dev-only endpoints to ensure they're not accessible in production
 */
export function isDevelopment(): boolean {
  return getConfig().isDevelopment;
}
