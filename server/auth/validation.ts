import * as client from "openid-client";
import { getConfig } from "../config";
import { serverLogger } from "../logger";
import { db } from "../db";
import { sql } from "drizzle-orm";

export interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  error?: string;
  fix?: string;
}

export interface ValidationReport {
  overall: 'pass' | 'fail' | 'degraded';
  timestamp: string;
  results: ValidationResult[];
  criticalFailures: string[];
}

export interface AuthError {
  timestamp: string;
  error: string;
  context?: string;
}

const recentAuthErrors: AuthError[] = [];
const MAX_ERROR_HISTORY = 100;

export function logAuthError(error: string, context?: string): void {
  const authError: AuthError = {
    timestamp: new Date().toISOString(),
    error,
    context,
  };
  
  recentAuthErrors.unshift(authError);
  
  if (recentAuthErrors.length > MAX_ERROR_HISTORY) {
    recentAuthErrors.pop();
  }
}

export function getRecentAuthErrors(): AuthError[] {
  return [...recentAuthErrors];
}

/**
 * SECURITY: Sanitizes environment variables for client-facing responses
 * WARNING: Never expose actual secret values to the client, even for admin users
 * This function removes or masks all sensitive data to prevent security vulnerabilities
 */
export interface SanitizedEnvironment {
  NODE_ENV: string;
  REPL_ID: {
    present: boolean;
    masked: string;
    length: number;
  };
  SESSION_SECRET: {
    present: boolean;
    length: number;
  };
  DATABASE_URL: {
    present: boolean;
    masked: string | null;
    length: number;
  };
  ISSUER_URL: string;
  REPLIT_DOMAINS: string[];
}

export function sanitizeEnvironmentForClient(): SanitizedEnvironment {
  const config = getConfig();
  
  // REPL_ID: Show only first 8 chars
  const replIdMasked = config.replId 
    ? config.replId.substring(0, 8) + '...' 
    : '[not set]';
  
  // DATABASE_URL: Show only first/last 10 chars if present
  let databaseUrlMasked: string | null = null;
  if (config.databaseUrl) {
    if (config.databaseUrl.length <= 30) {
      // If too short to safely mask, just show presence
      databaseUrlMasked = '***configured***';
    } else {
      // Show first 10 and last 10 chars with *** in between
      const first10 = config.databaseUrl.substring(0, 10);
      const last10 = config.databaseUrl.substring(config.databaseUrl.length - 10);
      databaseUrlMasked = `${first10}***${last10}`;
    }
  }
  
  // SESSION_SECRET: NEVER expose the value, only metadata
  // Even for admin users, showing the actual secret enables account takeover
  
  return {
    NODE_ENV: config.nodeEnv,
    REPL_ID: {
      present: !!config.replId,
      masked: replIdMasked,
      length: config.replId?.length || 0,
    },
    SESSION_SECRET: {
      present: !!config.sessionSecret,
      length: config.sessionSecret?.length || 0,
      // SECURITY: Never include the actual value
    },
    DATABASE_URL: {
      present: !!config.databaseUrl,
      masked: databaseUrlMasked,
      length: config.databaseUrl?.length || 0,
    },
    ISSUER_URL: config.issuerUrl,
    REPLIT_DOMAINS: config.replitDomains,
  };
}

async function validateEnvironmentVariables(): Promise<ValidationResult> {
  const config = getConfig();
  const missing: string[] = [];
  
  if (!process.env.REPL_ID) missing.push('REPL_ID');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.REPLIT_DOMAINS) missing.push('REPLIT_DOMAINS');
  
  if (missing.length > 0) {
    return {
      component: 'Environment Variables',
      status: 'fail',
      message: `Missing required environment variables: ${missing.join(', ')}`,
      error: `Required variables not set: ${missing.join(', ')}`,
      fix: `Add the following to your Replit Secrets:\n${missing.map(v => `  - ${v}`).join('\n')}`,
    };
  }
  
  const warnings: string[] = [];
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters');
  }
  
  if (config.replitDomains.length === 0) {
    return {
      component: 'Environment Variables',
      status: 'fail',
      message: 'REPLIT_DOMAINS is empty',
      error: 'No domains configured for authentication',
      fix: 'Add your Repl URL to REPLIT_DOMAINS (e.g., "your-repl.username.repl.co")',
    };
  }
  
  if (warnings.length > 0) {
    return {
      component: 'Environment Variables',
      status: 'warning',
      message: `Environment variables set with warnings: ${warnings.join(', ')}`,
    };
  }
  
  return {
    component: 'Environment Variables',
    status: 'pass',
    message: `All required environment variables present (REPL_ID, SESSION_SECRET, REPLIT_DOMAINS with ${config.replitDomains.length} domain(s))`,
  };
}

async function validateOIDCDiscovery(): Promise<ValidationResult> {
  try {
    const config = getConfig();
    serverLogger.debug(`[Validation] Testing OIDC discovery at ${config.issuerUrl}`);
    
    const configuration = await client.discovery(
      new URL(config.issuerUrl),
      config.replId
    );
    
    const metadata = configuration.serverMetadata();
    
    if (!metadata.authorization_endpoint) {
      return {
        component: 'OIDC Discovery',
        status: 'fail',
        message: 'OIDC discovery succeeded but missing authorization_endpoint',
        error: 'Invalid OIDC configuration',
        fix: 'Verify ISSUER_URL is correct (default: https://replit.com/oidc)',
      };
    }
    
    return {
      component: 'OIDC Discovery',
      status: 'pass',
      message: `OIDC discovery successful (issuer: ${metadata.issuer})`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAuthError(`OIDC discovery failed: ${errorMessage}`, 'validation');
    
    return {
      component: 'OIDC Discovery',
      status: 'fail',
      message: 'OIDC discovery failed',
      error: errorMessage,
      fix: 'Check your internet connection and verify ISSUER_URL is correct',
    };
  }
}

async function validateDatabaseConnectivity(): Promise<ValidationResult> {
  try {
    const config = getConfig();
    
    if (!config.databaseUrl) {
      return {
        component: 'Database Connectivity',
        status: 'warning',
        message: 'No database configured - using in-memory session store (development only)',
        fix: config.isProduction 
          ? 'Create a PostgreSQL database in Replit and set DATABASE_URL'
          : undefined,
      };
    }
    
    serverLogger.debug('[Validation] Testing database connectivity');
    
    await db.execute(sql`SELECT 1`);
    
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM pg_tables 
      WHERE tablename = 'sessions'
    `);
    
    const sessionTableExists = result.rows[0]?.count === '1';
    
    if (!sessionTableExists) {
      return {
        component: 'Database Connectivity',
        status: 'warning',
        message: 'Database connected but sessions table does not exist yet',
        fix: 'Sessions table will be created automatically on first session',
      };
    }
    
    return {
      component: 'Database Connectivity',
      status: 'pass',
      message: 'Database connected and sessions table exists',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAuthError(`Database connectivity check failed: ${errorMessage}`, 'validation');
    
    return {
      component: 'Database Connectivity',
      status: 'fail',
      message: 'Database connection failed',
      error: errorMessage,
      fix: 'Verify DATABASE_URL is correct and database is running',
    };
  }
}

async function validateRegisteredDomains(): Promise<ValidationResult> {
  try {
    const config = getConfig();
    const domains = config.replitDomains;
    
    if (domains.length === 0) {
      return {
        component: 'Registered Domains',
        status: 'fail',
        message: 'No domains registered',
        error: 'REPLIT_DOMAINS is empty',
        fix: 'Add your Repl URL to REPLIT_DOMAINS environment variable',
      };
    }
    
    const invalidDomains = domains.filter(domain => {
      try {
        new URL(`https://${domain}`);
        return false;
      } catch {
        return true;
      }
    });
    
    if (invalidDomains.length > 0) {
      return {
        component: 'Registered Domains',
        status: 'fail',
        message: `Invalid domain format: ${invalidDomains.join(', ')}`,
        error: 'Domain validation failed',
        fix: 'Ensure domains are in format: "your-repl.username.repl.co" (no http:// or https://)',
      };
    }
    
    return {
      component: 'Registered Domains',
      status: 'pass',
      message: `${domains.length} domain(s) registered and valid: ${domains.join(', ')}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      component: 'Registered Domains',
      status: 'fail',
      message: 'Domain validation failed',
      error: errorMessage,
    };
  }
}

async function validateReplId(): Promise<ValidationResult> {
  try {
    const config = getConfig();
    
    if (!config.replId) {
      return {
        component: 'REPL_ID',
        status: 'fail',
        message: 'REPL_ID not set',
        error: 'Missing REPL_ID environment variable',
        fix: 'REPL_ID should be automatically set by Replit. If missing, contact Replit support.',
      };
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(config.replId)) {
      return {
        component: 'REPL_ID',
        status: 'warning',
        message: 'REPL_ID format is unusual (expected UUID format)',
      };
    }
    
    return {
      component: 'REPL_ID',
      status: 'pass',
      message: `REPL_ID is valid: ${config.replId.substring(0, 8)}...`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      component: 'REPL_ID',
      status: 'fail',
      message: 'REPL_ID validation failed',
      error: errorMessage,
    };
  }
}

async function validateSessionSecret(): Promise<ValidationResult> {
  try {
    const config = getConfig();
    
    if (!config.sessionSecret) {
      return {
        component: 'SESSION_SECRET',
        status: 'fail',
        message: 'SESSION_SECRET not set',
        error: 'Missing SESSION_SECRET environment variable',
        fix: 'Generate a secret with: openssl rand -base64 32',
      };
    }
    
    if (config.sessionSecret.length < 32) {
      return {
        component: 'SESSION_SECRET',
        status: 'warning',
        message: `SESSION_SECRET is too short (${config.sessionSecret.length} chars, recommend 32+)`,
        fix: 'Generate a stronger secret with: openssl rand -base64 32',
      };
    }
    
    if (config.sessionSecret === 'change-me' || config.sessionSecret === 'secret') {
      return {
        component: 'SESSION_SECRET',
        status: 'fail',
        message: 'SESSION_SECRET is using a default/insecure value',
        error: 'Insecure session secret',
        fix: 'Generate a secure secret with: openssl rand -base64 32',
      };
    }
    
    return {
      component: 'SESSION_SECRET',
      status: 'pass',
      message: `SESSION_SECRET is set and secure (${config.sessionSecret.length} characters)`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      component: 'SESSION_SECRET',
      status: 'fail',
      message: 'SESSION_SECRET validation failed',
      error: errorMessage,
    };
  }
}

export async function validateAuthConfig(options: { 
  skipOIDC?: boolean;
  skipDatabase?: boolean;
} = {}): Promise<ValidationReport> {
  serverLogger.info('[Validation] Starting authentication configuration validation...');
  
  const results: ValidationResult[] = [];
  
  results.push(await validateEnvironmentVariables());
  results.push(await validateReplId());
  results.push(await validateSessionSecret());
  results.push(await validateRegisteredDomains());
  
  if (!options.skipDatabase) {
    results.push(await validateDatabaseConnectivity());
  }
  
  if (!options.skipOIDC) {
    results.push(await validateOIDCDiscovery());
  }
  
  const failures = results.filter(r => r.status === 'fail');
  const warnings = results.filter(r => r.status === 'warning');
  const passes = results.filter(r => r.status === 'pass');
  
  let overall: 'pass' | 'fail' | 'degraded';
  if (failures.length > 0) {
    overall = 'fail';
  } else if (warnings.length > 0) {
    overall = 'degraded';
  } else {
    overall = 'pass';
  }
  
  const criticalFailures = failures
    .filter(f => f.component !== 'Database Connectivity')
    .map(f => f.component);
  
  const report: ValidationReport = {
    overall,
    timestamp: new Date().toISOString(),
    results,
    criticalFailures,
  };
  
  serverLogger.info(`[Validation] Validation complete: ${overall.toUpperCase()}`);
  serverLogger.info(`[Validation]   ✓ Pass: ${passes.length}, ⚠ Warning: ${warnings.length}, ✗ Fail: ${failures.length}`);
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    serverLogger.info(`[Validation]   ${icon} ${result.component}: ${result.message}`);
    if (result.fix) {
      serverLogger.info(`[Validation]      Fix: ${result.fix}`);
    }
  }
  
  if (criticalFailures.length > 0) {
    const errorMessage = [
      '',
      '╔════════════════════════════════════════════════════════════════╗',
      '║        CRITICAL: Authentication Configuration Failed          ║',
      '╚════════════════════════════════════════════════════════════════╝',
      '',
      'The following critical components failed validation:',
      '',
      ...failures.map(f => [
        `  ✗ ${f.component}`,
        `    Error: ${f.error || f.message}`,
        f.fix ? `    Fix: ${f.fix}` : null,
        '',
      ].filter(Boolean).join('\n')),
      'Server cannot start until these issues are resolved.',
      'Set SKIP_AUTH_VALIDATION=true to bypass validation in emergency.',
      '',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  return report;
}
