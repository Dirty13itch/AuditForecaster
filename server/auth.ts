import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import memoize from "memoizee";

/**
 * Required Environment Variables:
 * - REPL_ID: Replit application ID (OAuth client_id)
 * - SESSION_SECRET: Secret for session encryption
 * - REPLIT_DOMAINS: Comma-separated list of allowed domains
 * 
 * Optional:
 * - ENABLE_AUTH_DIAG: Enable /__auth/diag endpoint (default: false)
 * - ISSUER_URL: OIDC issuer URL (default: https://replit.com/oidc)
 * - NODE_ENV: Environment mode (development/production)
 */

// =============================================================================
// SESSION MANAGEMENT TYPES & VALIDATION
// =============================================================================

/**
 * Complete session user interface with all required fields
 * This defines the structure of a valid session
 */
export interface SessionUser {
  // Core user identity
  id: string;
  email: string;
  role: "admin" | "inspector" | "viewer";
  
  // User profile
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  
  // OIDC session data
  claims: any;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  
  // Session metadata
  sessionVersion?: number; // For tracking schema changes
  sessionCreatedAt?: number; // When session was created
  lastValidated?: number; // Last validation timestamp
  validationFailures?: number; // Count of consecutive failures
}

/**
 * Session validation result
 */
interface SessionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recoverable: boolean;
  sanitizedUser?: Partial<SessionUser>;
}

/**
 * Session health metrics
 */
interface SessionHealthMetrics {
  totalValidations: number;
  failedValidations: number;
  recoveredSessions: number;
  corruptedSessions: number;
  lastCheck: number;
}

// Global session health metrics
const sessionHealthMetrics: SessionHealthMetrics = {
  totalValidations: 0,
  failedValidations: 0,
  recoveredSessions: 0,
  corruptedSessions: 0,
  lastCheck: Date.now(),
};

// Session schema version for migration handling
const CURRENT_SESSION_VERSION = 2;

// Critical admin users that must maintain admin role
const CRITICAL_ADMIN_USERS = [
  { email: 'shaun.ulrich@ulrichenergyauditing.com', id: '3pve-s' }
];

/**
 * Validates if a value is a non-empty string
 */
function isValidString(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is null or undefined` };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return { valid: false, error: `${fieldName} is an empty string` };
  }
  return { valid: true };
}

/**
 * Validates user role
 */
function isValidRole(role: any): boolean {
  return role === 'admin' || role === 'inspector' || role === 'viewer';
}

/**
 * Comprehensive session validation function
 * Checks all required fields and data integrity
 */
function validateSessionUser(data: any): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let recoverable = true;
  
  // Track validation
  sessionHealthMetrics.totalValidations++;
  
  // Check if data exists
  if (!data || typeof data !== 'object') {
    errors.push('Session data is null or not an object');
    sessionHealthMetrics.failedValidations++;
    return { 
      valid: false, 
      errors, 
      warnings, 
      recoverable: false 
    };
  }
  
  // Validate required string fields
  const requiredStringFields = ['id', 'email', 'firstName', 'lastName'];
  for (const field of requiredStringFields) {
    const validation = isValidString(data[field], field);
    if (!validation.valid) {
      errors.push(validation.error!);
      if (field === 'id' || field === 'email') {
        recoverable = false; // Can't recover without ID or email
      }
    }
  }
  
  // Validate email format
  if (data.email && typeof data.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push(`Invalid email format: ${data.email}`);
    }
  }
  
  // Validate role
  if (!isValidRole(data.role)) {
    errors.push(`Invalid role: ${data.role}. Must be admin, inspector, or viewer`);
    // Role is recoverable by fetching from database
  }
  
  // Check for critical admin users
  const isCriticalAdmin = CRITICAL_ADMIN_USERS.some(
    admin => admin.email === data.email || admin.id === data.id
  );
  if (isCriticalAdmin && data.role !== 'admin') {
    errors.push(`Critical admin user ${data.email} has incorrect role: ${data.role}`);
    warnings.push('Attempting to restore admin role for critical user');
  }
  
  // Validate OIDC claims if present
  if (data.claims) {
    if (typeof data.claims !== 'object') {
      warnings.push('Claims field is not an object');
    } else {
      if (!data.claims.sub) {
        warnings.push('Claims missing sub field');
      }
      if (data.claims.sub && data.claims.sub !== data.id) {
        errors.push(`Claims sub (${data.claims.sub}) doesn't match user ID (${data.id})`);
      }
    }
  }
  
  // Check token expiration
  if (data.expires_at && typeof data.expires_at === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (data.expires_at < now) {
      warnings.push('Session token has expired');
      // Expired tokens are recoverable through refresh
    }
  }
  
  // Check session age
  if (data.sessionCreatedAt && typeof data.sessionCreatedAt === 'number') {
    const ageMs = Date.now() - data.sessionCreatedAt;
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (ageMs > maxAgeMs) {
      warnings.push('Session is older than 30 days');
    }
  }
  
  // Check validation failure count
  if (data.validationFailures && data.validationFailures > 5) {
    warnings.push(`Session has failed validation ${data.validationFailures} times`);
    if (data.validationFailures > 10) {
      recoverable = false; // Too many failures
    }
  }
  
  // Create sanitized user object with valid fields
  const sanitizedUser: Partial<SessionUser> = {};
  if (data.id && typeof data.id === 'string') sanitizedUser.id = data.id;
  if (data.email && typeof data.email === 'string') sanitizedUser.email = data.email;
  if (isValidRole(data.role)) sanitizedUser.role = data.role;
  if (data.firstName && typeof data.firstName === 'string') sanitizedUser.firstName = data.firstName;
  if (data.lastName && typeof data.lastName === 'string') sanitizedUser.lastName = data.lastName;
  if (data.profileImageUrl && typeof data.profileImageUrl === 'string') sanitizedUser.profileImageUrl = data.profileImageUrl;
  if (data.claims && typeof data.claims === 'object') sanitizedUser.claims = data.claims;
  if (data.access_token && typeof data.access_token === 'string') sanitizedUser.access_token = data.access_token;
  if (data.refresh_token && typeof data.refresh_token === 'string') sanitizedUser.refresh_token = data.refresh_token;
  if (data.expires_at && typeof data.expires_at === 'number') sanitizedUser.expires_at = data.expires_at;
  
  const isValid = errors.length === 0;
  
  if (!isValid) {
    sessionHealthMetrics.failedValidations++;
  }
  
  return {
    valid: isValid,
    errors,
    warnings,
    recoverable: recoverable && (isValid || (errors.length < 3 && sanitizedUser.id)),
    sanitizedUser
  };
}

/**
 * Attempts to recover a partially valid session
 */
async function recoverSession(sessionData: any): Promise<SessionUser | null> {
  serverLogger.info('[Session Recovery] Starting session recovery attempt', {
    hasId: !!sessionData?.id,
    hasEmail: !!sessionData?.email,
  });
  
  try {
    // We need at least an ID or email to recover
    if (!sessionData?.id && !sessionData?.email) {
      serverLogger.error('[Session Recovery] Cannot recover: missing both ID and email');
      return null;
    }
    
    // Try to fetch user from database
    let dbUser;
    if (sessionData.id) {
      dbUser = await storage.getUser(sessionData.id);
    } else if (sessionData.email) {
      dbUser = await storage.getUserByEmail(sessionData.email);
    }
    
    if (!dbUser) {
      serverLogger.error('[Session Recovery] User not found in database', {
        id: sessionData.id,
        email: sessionData.email,
      });
      return null;
    }
    
    serverLogger.info('[Session Recovery] Found user in database, rebuilding session', {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    });
    
    // Check if this is a critical admin user
    const isCriticalAdmin = CRITICAL_ADMIN_USERS.some(
      admin => admin.email === dbUser.email || admin.id === dbUser.id
    );
    
    // Rebuild session with fresh database data
    const recoveredSession: SessionUser = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName || 'Unknown',
      lastName: dbUser.lastName || 'User',
      role: isCriticalAdmin ? 'admin' : (dbUser.role as any || 'inspector'),
      profileImageUrl: dbUser.profileImageUrl || sessionData.profileImageUrl,
      
      // Preserve OIDC data if available
      claims: sessionData.claims || { 
        sub: dbUser.id, 
        email: dbUser.email,
        first_name: dbUser.firstName,
        last_name: dbUser.lastName,
      },
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      expires_at: sessionData.expires_at || Math.floor(Date.now() / 1000) + 86400,
      
      // Update metadata
      sessionVersion: CURRENT_SESSION_VERSION,
      sessionCreatedAt: sessionData.sessionCreatedAt || Date.now(),
      lastValidated: Date.now(),
      validationFailures: 0, // Reset failure count on successful recovery
    };
    
    // Force admin role for critical users
    if (isCriticalAdmin && recoveredSession.role !== 'admin') {
      serverLogger.warn('[Session Recovery] Forcing admin role for critical user', {
        email: dbUser.email,
        previousRole: recoveredSession.role,
      });
      recoveredSession.role = 'admin';
      
      // Also update in database
      await storage.upsertUser({
        id: dbUser.id,
        role: 'admin',
      });
    }
    
    sessionHealthMetrics.recoveredSessions++;
    serverLogger.info('[Session Recovery] Session successfully recovered', {
      id: recoveredSession.id,
      email: recoveredSession.email,
      role: recoveredSession.role,
    });
    
    return recoveredSession;
  } catch (error) {
    serverLogger.error('[Session Recovery] Recovery failed with error:', error);
    return null;
  }
}

/**
 * Logs session health metrics periodically
 */
function logSessionHealth() {
  const now = Date.now();
  const timeSinceLastCheck = now - sessionHealthMetrics.lastCheck;
  
  if (timeSinceLastCheck > 60000) { // Log every minute
    const failureRate = sessionHealthMetrics.totalValidations > 0 
      ? (sessionHealthMetrics.failedValidations / sessionHealthMetrics.totalValidations * 100).toFixed(2)
      : 0;
    
    serverLogger.info('[Session Health] Metrics Report', {
      totalValidations: sessionHealthMetrics.totalValidations,
      failedValidations: sessionHealthMetrics.failedValidations,
      recoveredSessions: sessionHealthMetrics.recoveredSessions,
      corruptedSessions: sessionHealthMetrics.corruptedSessions,
      failureRate: `${failureRate}%`,
      period: `${(timeSinceLastCheck / 1000).toFixed(0)}s`,
    });
    
    // Alert on high failure rates
    if (sessionHealthMetrics.totalValidations > 10 && Number(failureRate) > 20) {
      serverLogger.error('[Session Health] HIGH FAILURE RATE DETECTED', {
        failureRate: `${failureRate}%`,
        total: sessionHealthMetrics.totalValidations,
        failed: sessionHealthMetrics.failedValidations,
      });
    }
    
    sessionHealthMetrics.lastCheck = now;
  }
}

// Store for OIDC config
let oidcConfigCache: any = null;

// Helper function for diagnostics endpoint
export const getOidcConfig = memoize(
  async () => {
    if (oidcConfigCache) return oidcConfigCache;
    
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    const replId = process.env.REPL_ID;
    
    serverLogger.info(`[Auth] Discovering OIDC configuration`, {
      issuerUrl,
      replId,
      hasReplId: !!replId,
    });
    
    if (!replId) {
      throw new Error("REPL_ID environment variable is required for OIDC discovery");
    }
    
    oidcConfigCache = await client.discovery(
      new URL(issuerUrl),
      replId
    );
    
    serverLogger.info(`[Auth] OIDC configuration discovered`, {
      authorizationEndpoint: oidcConfigCache.serverMetadata().authorization_endpoint,
      tokenEndpoint: oidcConfigCache.serverMetadata().token_endpoint,
    });
    
    return oidcConfigCache;
  },
  { maxAge: 3600 * 1000 }
);

// Helper function to get registered strategies
export function getRegisteredStrategies(): string[] {
  if (!process.env.REPLIT_DOMAINS) {
    return [];
  }
  return process.env.REPLIT_DOMAINS.split(",").map(d => `replitauth:${d.trim()}`);
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore;
  
  // Use PostgreSQL session store if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    serverLogger.info('[Auth] Using PostgreSQL session store');
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    serverLogger.warn('[Auth] DATABASE_URL not set - using in-memory session store');
    const createMemoryStore = require("memorystore");
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

// CRITICAL: This function ensures we properly store the database user data
async function upsertUserAndStoreInSession(claims: any): Promise<SessionUser> {
  const email = claims["email"];
  const id = claims["sub"];
  
  serverLogger.info(`[Auth] Processing login for user: ${email} (ID: ${id})`);
  
  // Validate basic claims
  if (!id || typeof id !== 'string') {
    throw new Error(`Invalid user ID in claims: ${id}`);
  }
  
  if (!email || typeof email !== 'string') {
    throw new Error(`Invalid email in claims: ${email}`);
  }
  
  // Check if this is a critical admin user
  const isCriticalAdmin = CRITICAL_ADMIN_USERS.some(
    admin => admin.email === email || admin.id === id
  );
  
  if (isCriticalAdmin) {
    serverLogger.info(`[Auth] CRITICAL ADMIN USER DETECTED: ${email} (${id})`);
  }
  
  // First, try to get the existing user from database
  let existingUser = await storage.getUser(id);
  
  if (existingUser) {
    serverLogger.info(`[Auth] Found existing user in database:`, {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    });
  }
  
  // Build user data for upsert - DO NOT override existing role unless critical admin
  const userData: any = {
    id: id,
    email: email,
    firstName: claims["first_name"] || "Unknown",
    lastName: claims["last_name"] || "User",
    profileImageUrl: claims["profile_image_url"],
  };
  
  // CRITICAL FIX: Always ensure critical admin users have admin role
  if (isCriticalAdmin) {
    userData.role = "admin";
    serverLogger.info(`[Auth] ENFORCING ADMIN ROLE for critical user ${email} (ID: ${id})`);
  } else if (!existingUser) {
    // For new users (not critical admin), set default role
    userData.role = "inspector"; // Default role for new users
    serverLogger.info(`[Auth] Setting default role for new user ${email}: inspector`);
  }
  // If user exists and is not critical admin, preserve their existing role by not including it
  
  // Upsert the user
  const user = await storage.upsertUser(userData);
  
  serverLogger.info(`[Auth] User after upsert:`, {
    id: user.id,
    email: user.email,
    role: user.role,
  });
  
  // Build validated SessionUser object
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName || claims["first_name"] || "Unknown",
    lastName: user.lastName || claims["last_name"] || "User",
    role: isCriticalAdmin ? 'admin' : (user.role as any || 'inspector'),
    profileImageUrl: user.profileImageUrl,
    claims: claims,
    sessionVersion: CURRENT_SESSION_VERSION,
    sessionCreatedAt: Date.now(),
    lastValidated: Date.now(),
    validationFailures: 0,
  };
  
  // Validate the session before returning
  const validation = validateSessionUser(sessionUser);
  if (!validation.valid) {
    serverLogger.error(`[Auth] Created invalid session during login:`, {
      errors: validation.errors,
      warnings: validation.warnings,
    });
    // Attempt to fix critical issues
    if (isCriticalAdmin && sessionUser.role !== 'admin') {
      sessionUser.role = 'admin';
      serverLogger.warn(`[Auth] Fixed critical admin role during session creation`);
    }
  }
  
  return sessionUser;
}

export async function setupAuth(app: Express) {
  // Validate required environment variables
  if (!process.env.REPLIT_DOMAINS) {
    throw new Error("Environment variable REPLIT_DOMAINS not provided");
  }
  if (!process.env.REPL_ID) {
    throw new Error("Environment variable REPL_ID not provided");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("Environment variable SESSION_SECRET not provided");
  }

  // Log environment configuration for debugging
  serverLogger.info(`[Auth] Initializing authentication system`, {
    domains: process.env.REPLIT_DOMAINS.split(",").map(d => d.trim()),
    replId: process.env.REPL_ID,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    issuerUrl: process.env.ISSUER_URL || "https://replit.com/oidc",
  });

  app.set("trust proxy", 1);
  
  // Add diagnostic endpoint (feature-flagged)
  if (process.env.ENABLE_AUTH_DIAG === 'true') {
    serverLogger.info('[Auth] Diagnostic endpoint enabled at /__auth/diag');
    
    app.get("/__auth/diag", (req, res) => {
      try {
        // Get session configuration
        const sessionConfig = getSession();
        
        // Safely extract cookie settings without exposing secrets
        const cookieSettings = {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        };
        
        // Build diagnostic response
        const diagnostics = {
          request: {
            secure: req.secure,
            protocol: req.protocol,
            hostname: req.hostname,
            origin: req.get('origin') || 'not set',
            forwardedProto: req.get('x-forwarded-proto') || 'not set',
            forwardedHost: req.get('x-forwarded-host') || 'not set',
            forwardedFor: req.get('x-forwarded-for') || 'not set',
            cookiesPresent: Object.keys(req.cookies || {}),
            userAgent: req.get('user-agent') || 'not set',
            path: req.path,
            method: req.method,
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            hasSessionSecret: !!process.env.SESSION_SECRET,
            hasReplId: !!process.env.REPL_ID,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            issuerUrl: process.env.ISSUER_URL || 'https://replit.com/oidc',
            domains: process.env.REPLIT_DOMAINS?.split(',').map(d => d.trim()) || [],
            serverTime: new Date().toISOString(),
            replIdPrefix: process.env.REPL_ID ? process.env.REPL_ID.substring(0, 8) + '...' : 'not set',
          },
          config: {
            trustProxy: app.get('trust proxy'),
            corsOrigins: [], // Will be populated when CORS is configured
            cookieSettings: {
              httpOnly: cookieSettings.httpOnly,
              secure: cookieSettings.secure,
              sameSite: cookieSettings.sameSite,
            },
            sessionStore: process.env.DATABASE_URL ? 'postgresql' : 'in-memory',
          },
          session: {
            exists: !!req.session,
            authenticated: !!(req as any).user,
            userId: (req as any).user?.id || 'not authenticated',
            userEmail: (req as any).user?.email || 'not authenticated',
            sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'no session',
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        };
        
        serverLogger.info('[Auth Diagnostics] Diagnostic request', {
          hostname: req.hostname,
          secure: req.secure,
          forwardedProto: req.get('x-forwarded-proto'),
        });
        
        res.json(diagnostics);
      } catch (error) {
        serverLogger.error('[Auth Diagnostics] Error generating diagnostics:', error);
        res.status(500).json({
          error: 'Failed to generate diagnostics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }
  
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // OIDC discovery
  const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
  serverLogger.info(`[Auth] Starting OIDC discovery`, {
    issuerUrl,
    replId: process.env.REPL_ID,
  });
  
  const config = await client.discovery(
    new URL(issuerUrl),
    process.env.REPL_ID!
  );
  
  serverLogger.info(`[Auth] OIDC discovery completed`, {
    authEndpoint: config.serverMetadata().authorization_endpoint,
    tokenEndpoint: config.serverMetadata().token_endpoint,
    jwksUri: config.serverMetadata().jwks_uri,
  });

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      // Validate OIDC token response
      const claims = tokens.claims();
      
      if (!claims) {
        const errorCode = 'invalid_token_response';
        serverLogger.error(`[Auth] ${errorCode}: No claims in token response`, {
          reasonCode: errorCode,
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
        });
        return verified(new Error('Invalid token response: no claims'));
      }
      
      if (!claims.sub) {
        const errorCode = 'missing_subject_claim';
        serverLogger.error(`[Auth] ${errorCode}: Missing sub claim in token`, {
          reasonCode: errorCode,
          claimsPresent: Object.keys(claims),
        });
        return verified(new Error('Invalid token: missing subject claim'));
      }
      
      // Get the full user from database with their correct role
      const dbUser = await upsertUserAndStoreInSession(claims);
      
      // Add OIDC tokens to session
      const sessionUser: SessionUser = {
        ...dbUser,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims?.exp || Math.floor(Date.now() / 1000) + 86400,
      };
      
      // Validate the complete session
      const validation = validateSessionUser(sessionUser);
      
      if (!validation.valid) {
        const errorCode = 'session_validation_failed';
        serverLogger.error(`[Auth] ${errorCode}: Session validation failed during login`, {
          reasonCode: errorCode,
          errors: validation.errors,
          warnings: validation.warnings,
          userId: sessionUser.id,
          recoverable: validation.recoverable,
        });
        
        // If recoverable, attempt to fix
        if (validation.recoverable) {
          const recovered = await recoverSession(sessionUser);
          if (recovered) {
            serverLogger.info(`[Auth] Session recovered during login`, {
              userId: recovered.id,
              email: recovered.email,
            });
            return verified(null, recovered);
          }
        }
        
        // Session is not recoverable
        const error = new Error(`Invalid session: ${validation.errors.join(', ')}`);
        return verified(error);
      }
      
      serverLogger.info(`[Auth] Session user authenticated successfully`, {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role,
      });
      
      // Log session health periodically
      logSessionHealth();
      
      return verified(null, sessionUser);
    } catch (error) {
      // Determine error reason code
      let reasonCode = 'unknown_auth_error';
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('redirect_uri')) {
        reasonCode = 'redirect_uri_mismatch';
      } else if (errorMessage.includes('state')) {
        reasonCode = 'state_missing';
      } else if (errorMessage.includes('PKCE') || errorMessage.includes('code_verifier')) {
        reasonCode = 'pkce_missing';
      } else if (errorMessage.includes('cookie')) {
        reasonCode = 'cookie_blocked';
      } else if (errorMessage.includes('csrf') || errorMessage.includes('CSRF')) {
        reasonCode = 'csrf_blocked';
      } else if (errorMessage.includes('scope')) {
        reasonCode = 'invalid_scope';
      } else if (errorMessage.includes('database') || errorMessage.includes('storage')) {
        reasonCode = 'database_error';
      }
      
      serverLogger.error('[Auth] Error in verify function', {
        reasonCode,
        errorMessage: errorMessage.substring(0, 200), // Limit message length
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        // Never log secrets - only log if claims exist and redact sensitive fields
        hasClaims: !!(error as any).claims,
      });
      
      return verified(error as Error);
    }
  };

  // Track registered strategies to avoid duplicates
  const registeredStrategies = new Set<string>();

  /**
   * Dynamically register a strategy for a given hostname
   * This allows preview deploys to work since strategies are created on-demand
   */
  const ensureStrategy = (hostname: string) => {
    if (!isTrustedHost(hostname)) {
      throw new Error(`Untrusted hostname: ${hostname}`);
    }
    
    const strategyName = `replitauth:${hostname}`;
    
    if (!registeredStrategies.has(strategyName)) {
      // Determine protocol - use HTTPS for all Replit domains, HTTP for localhost
      const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1');
      const protocol = isLocalhost ? 'http' : 'https';
      const callbackURL = `${protocol}://${hostname}/api/callback`;
      
      serverLogger.info(`[Auth] Registering new strategy dynamically`, {
        strategyName,
        hostname,
        callbackURL,
        protocol,
        isLocalhost,
        client_id: process.env.REPL_ID,
        issuer_url: issuerUrl,
      });
      
      const strategy = new Strategy(
        {
          config,
          client_id: process.env.REPL_ID!,
          callbackURL, // Set callback URL in constructor (not as runtime param)
          params: {
            scope: "openid email profile",
          },
        },
        verify
      );
      
      passport.use(strategyName, strategy);
      registeredStrategies.add(strategyName);
      
      serverLogger.info(`[Auth] Successfully registered strategy: ${strategyName}`);
    }
    
    return strategyName;
  };

  // Pre-register strategies for known domains
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const trimmedDomain = domain.trim();
    try {
      ensureStrategy(trimmedDomain);
    } catch (error) {
      serverLogger.error(`[Auth] Failed to register strategy for domain: ${trimmedDomain}`, { error });
    }
  }

  // Serialize/deserialize user for session with comprehensive validation
  passport.serializeUser((user: any, done) => {
    try {
      serverLogger.info('[Session Serialize] Starting serialization', {
        id: user?.id,
        email: user?.email,
        role: user?.role,
      });
      
      // Validate user before serialization
      const validation = validateSessionUser(user);
      
      if (!validation.valid) {
        serverLogger.error('[Session Serialize] Invalid user data for serialization', {
          errors: validation.errors,
          warnings: validation.warnings,
        });
        
        // If we have sanitized data and it's recoverable, use that
        if (validation.recoverable && validation.sanitizedUser) {
          serverLogger.warn('[Session Serialize] Using sanitized user data');
          
          // Add metadata for tracking
          const sessionData = {
            ...validation.sanitizedUser,
            sessionVersion: CURRENT_SESSION_VERSION,
            sessionCreatedAt: Date.now(),
            lastValidated: Date.now(),
            validationFailures: 0,
          };
          
          return done(null, sessionData);
        }
        
        // Cannot serialize invalid data
        return done(new Error(`Cannot serialize invalid user: ${validation.errors.join(', ')}`));
      }
      
      // Add session metadata
      const sessionData = {
        ...user,
        sessionVersion: CURRENT_SESSION_VERSION,
        sessionCreatedAt: user.sessionCreatedAt || Date.now(),
        lastValidated: Date.now(),
      };
      
      serverLogger.info('[Session Serialize] User serialized successfully', {
        id: sessionData.id,
        email: sessionData.email,
        role: sessionData.role,
        sessionVersion: sessionData.sessionVersion,
      });
      
      done(null, sessionData);
    } catch (error) {
      serverLogger.error('[Session Serialize] Serialization error:', error);
      done(error as Error);
    }
  });

  passport.deserializeUser(async (sessionData: any, done) => {
    try {
      serverLogger.info('[Session Deserialize] Starting deserialization', {
        hasData: !!sessionData,
        dataType: typeof sessionData,
      });
      
      // CRITICAL: Check if sessionData exists
      if (!sessionData) {
        serverLogger.error('[Session Deserialize] Called with null/undefined data - clearing session');
        sessionHealthMetrics.corruptedSessions++;
        return done(null, null); // Return null to clear the session
      }
      
      // Comprehensive validation
      const validation = validateSessionUser(sessionData);
      
      serverLogger.info('[Session Deserialize] Validation result', {
        valid: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        recoverable: validation.recoverable,
      });
      
      // Log validation issues
      if (validation.errors.length > 0) {
        serverLogger.error('[Session Deserialize] Validation errors:', {
          errors: validation.errors,
        });
      }
      
      if (validation.warnings.length > 0) {
        serverLogger.warn('[Session Deserialize] Validation warnings:', {
          warnings: validation.warnings,
        });
      }
      
      // Handle invalid sessions
      if (!validation.valid) {
        // Track failure
        const failures = (sessionData.validationFailures || 0) + 1;
        sessionData.validationFailures = failures;
        
        serverLogger.error('[Session Deserialize] Session validation failed', {
          failureCount: failures,
          recoverable: validation.recoverable,
        });
        
        // Attempt recovery if possible
        if (validation.recoverable) {
          serverLogger.info('[Session Deserialize] Attempting session recovery');
          const recovered = await recoverSession(sessionData);
          
          if (recovered) {
            serverLogger.info('[Session Deserialize] Session recovered successfully', {
              id: recovered.id,
              email: recovered.email,
              role: recovered.role,
            });
            
            // Log health metrics
            logSessionHealth();
            
            return done(null, recovered);
          }
          
          serverLogger.error('[Session Deserialize] Session recovery failed');
        }
        
        // Session is not recoverable
        sessionHealthMetrics.corruptedSessions++;
        serverLogger.error('[Session Deserialize] Session corrupted beyond recovery - clearing');
        return done(null, null); // Clear the corrupt session
      }
      
      // Valid session - refresh from database for integrity
      try {
        const currentUser = await storage.getUser(sessionData.id);
        
        if (currentUser) {
          // Check for critical admin users
          const isCriticalAdmin = CRITICAL_ADMIN_USERS.some(
            admin => admin.email === currentUser.email || admin.id === currentUser.id
          );
          
          // Update session with fresh database values
          const refreshedSession: SessionUser = {
            ...sessionData,
            // Override with fresh database values
            email: currentUser.email,
            firstName: currentUser.firstName || sessionData.firstName,
            lastName: currentUser.lastName || sessionData.lastName,
            role: isCriticalAdmin ? 'admin' : (currentUser.role as any || sessionData.role),
            profileImageUrl: currentUser.profileImageUrl || sessionData.profileImageUrl,
            // Update metadata
            lastValidated: Date.now(),
            validationFailures: 0, // Reset on successful validation
          };
          
          // Force admin role for critical users
          if (isCriticalAdmin && refreshedSession.role !== 'admin') {
            serverLogger.warn('[Session Deserialize] Enforcing admin role for critical user', {
              email: refreshedSession.email,
              previousRole: refreshedSession.role,
            });
            refreshedSession.role = 'admin';
            
            // Update database as well
            await storage.upsertUser({
              id: currentUser.id,
              role: 'admin',
            });
          }
          
          serverLogger.info('[Session Deserialize] Session refreshed from database', {
            id: refreshedSession.id,
            email: refreshedSession.email,
            role: refreshedSession.role,
            lastValidated: refreshedSession.lastValidated,
          });
          
          // Log health metrics periodically
          logSessionHealth();
          
          return done(null, refreshedSession);
        } else {
          // User not found in database
          serverLogger.warn('[Session Deserialize] User not found in database', {
            id: sessionData.id,
            email: sessionData.email,
          });
          
          // Check if we should preserve the session or clear it
          const sessionAge = Date.now() - (sessionData.sessionCreatedAt || 0);
          const maxStaleAge = 60 * 60 * 1000; // 1 hour
          
          if (sessionAge > maxStaleAge) {
            serverLogger.error('[Session Deserialize] Stale session for non-existent user - clearing');
            sessionHealthMetrics.corruptedSessions++;
            return done(null, null);
          }
          
          // Preserve session temporarily but mark as needing validation
          sessionData.validationFailures = (sessionData.validationFailures || 0) + 1;
          serverLogger.warn('[Session Deserialize] Preserving session temporarily for non-existent user');
          return done(null, sessionData);
        }
      } catch (dbError) {
        serverLogger.error('[Session Deserialize] Database error during refresh:', dbError);
        
        // If database is unavailable, preserve session if it was previously valid
        if (validation.valid) {
          serverLogger.warn('[Session Deserialize] Database unavailable, using cached session');
          sessionData.lastValidated = Date.now();
          return done(null, sessionData);
        }
        
        // Invalid session and no database - clear it
        sessionHealthMetrics.corruptedSessions++;
        return done(null, null);
      }
    } catch (error) {
      serverLogger.error('[Session Deserialize] Critical error:', error);
      sessionHealthMetrics.corruptedSessions++;
      // Return null to clear corrupt session and allow recovery
      done(null, null);
    }
  });

  /**
   * Validates that a host is trusted (either in REPLIT_DOMAINS or a valid .replit.dev subdomain)
   * Prevents host header injection attacks
   */
  function isTrustedHost(host: string | undefined): boolean {
    if (!host) return false;
    
    // Extract just the hostname (remove port if present)
    const hostname = host.split(':')[0];
    
    // Check if host is in explicitly configured domains
    const configuredDomains = process.env.REPLIT_DOMAINS?.split(',').map(d => d.trim()) || [];
    if (configuredDomains.includes(hostname)) {
      return true;
    }
    
    // Check if host is a valid .replit.dev subdomain (must END with .replit.dev, not just contain it)
    if (hostname.endsWith('.replit.dev') || hostname === 'replit.dev') {
      return true;
    }
    
    // Allow localhost for development
    if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
      return true;
    }
    
    return false;
  }

  /**
   * Safely constructs redirect_uri from request headers with validation
   * Returns null if host validation fails
   */
  function buildValidatedRedirectUri(req: any): string | null {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    
    // Validate host is trusted
    if (!isTrustedHost(host)) {
      serverLogger.error('[Auth] Untrusted host detected in redirect_uri construction', {
        host,
        forwardedHost: req.headers['x-forwarded-host'],
        actualHost: req.get('host'),
      });
      return null;
    }
    
    // Validate protocol is https in production
    if (process.env.NODE_ENV === 'production' && protocol !== 'https') {
      serverLogger.error('[Auth] Non-HTTPS protocol in production', { protocol });
      return null;
    }
    
    return `${protocol}://${host}/api/callback`;
  }

  // Auth routes
  app.get("/api/login", (req, res, next) => {
    try {
      // Use req.hostname which Express parses correctly from headers
      const hostname = req.hostname;
      
      serverLogger.info(`[Auth] Login initiated`, {
        hostname,
        protocol: req.protocol,
        secure: req.secure,
        forwardedProto: req.headers['x-forwarded-proto'],
        forwardedHost: req.headers['x-forwarded-host'],
      });
      
      // Dynamically register strategy for this hostname (or use existing one)
      ensureStrategy(hostname);
      const strategyName = `replitauth:${hostname}`;
      
      serverLogger.info(`[Auth] Using strategy: ${strategyName}`);
      
      // Authenticate using the dynamically registered strategy
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile"],
      })(req, res, next);
    } catch (error) {
      serverLogger.error('[Auth] Login failed:', {
        error: error instanceof Error ? error.message : error,
        hostname: req.hostname,
      });
      return res.status(400).send('Invalid redirect configuration');
    }
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      // Use req.hostname which Express parses correctly from headers
      const hostname = req.hostname;
      
      serverLogger.info(`[Auth] Callback invoked`, {
        hostname,
        protocol: req.protocol,
        secure: req.secure,
        queryParams: Object.keys(req.query),
        hasCode: !!req.query.code,
        hasState: !!req.query.state,
        forwardedProto: req.headers['x-forwarded-proto'],
        forwardedHost: req.headers['x-forwarded-host'],
      });
      
      // Dynamically register strategy for this hostname (or use existing one)
      ensureStrategy(hostname);
      const strategyName = `replitauth:${hostname}`;
      
      serverLogger.info(`[Auth] Using strategy for callback: ${strategyName}`);
      
      // Authenticate using the dynamically registered strategy
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/?error=auth_failed",
      }, async (err: any, user: any) => {
      if (err || !user) {
        serverLogger.error('[Auth] Callback authentication failed:', {
          error: err?.message || err,
          hasUser: !!user,
          hostname,
        });
        return res.redirect("/?error=authentication_failed");
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          serverLogger.error('[Auth] Login error:', loginErr);
          return res.redirect("/?error=login_failed");
        }
        
        serverLogger.info(`[Auth] User logged in successfully:`, {
          id: user.id,
          email: user.email,
          role: user.role,
        });
        
        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            serverLogger.error('[Auth] Session save error:', saveErr);
          }
          res.redirect("/");
        });
      });
    })(req, res, next);
    } catch (error) {
      serverLogger.error('[Auth] Callback failed:', {
        error: error instanceof Error ? error.message : error,
        host: req.get('host'),
      });
      return res.redirect('/?error=invalid_redirect');
    }
  });

  app.post("/api/logout", (req, res) => {
    const user = (req as any).user;
    
    if (user) {
      serverLogger.info(`[Auth] User logging out:`, {
        id: user.id,
        email: user.email,
      });
    }
    
    req.logout((err) => {
      if (err) {
        serverLogger.error('[Auth] Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          serverLogger.error('[Auth] Session destroy error:', destroyErr);
        }
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint with enhanced validation
  app.get("/api/auth/user", (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Validate session before returning
    const validation = validateSessionUser(user);
    
    if (!validation.valid) {
      serverLogger.warn('[Auth] Current user session has validation warnings', {
        warnings: validation.warnings,
        errors: validation.errors,
      });
    }
    
    // Return user data including role and session health
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role, // CRITICAL: Include role in response
      sessionHealth: {
        valid: validation.valid,
        warnings: validation.warnings.length,
        lastValidated: user.lastValidated,
      },
    });
  });
  
  // Session health monitoring endpoint
  app.get("/api/auth/session-health", async (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Validate current session
    const validation = validateSessionUser(user);
    
    // Get global metrics
    const globalMetrics = {
      ...sessionHealthMetrics,
      uptime: Date.now() - sessionHealthMetrics.lastCheck,
      failureRate: sessionHealthMetrics.totalValidations > 0 
        ? (sessionHealthMetrics.failedValidations / sessionHealthMetrics.totalValidations * 100).toFixed(2)
        : 0,
    };
    
    // Check database connectivity
    let databaseHealthy = false;
    let userInDatabase = false;
    
    try {
      const dbUser = await storage.getUser(user.id);
      databaseHealthy = true;
      userInDatabase = !!dbUser;
    } catch (error) {
      serverLogger.error('[Session Health] Database check failed:', error);
    }
    
    // Prepare detailed response
    const healthReport = {
      sessionValid: validation.valid,
      sessionRecoverable: validation.recoverable,
      sessionDetails: {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion || 'unknown',
        sessionAge: user.sessionCreatedAt 
          ? Math.floor((Date.now() - user.sessionCreatedAt) / 1000)
          : 'unknown',
        lastValidated: user.lastValidated 
          ? Math.floor((Date.now() - user.lastValidated) / 1000) + ' seconds ago'
          : 'never',
        validationFailures: user.validationFailures || 0,
        tokenExpired: user.expires_at ? user.expires_at < Math.floor(Date.now() / 1000) : 'unknown',
      },
      validation: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
      systemHealth: {
        databaseHealthy,
        userInDatabase,
        globalMetrics,
      },
    };
    
    // Determine overall health status
    const status = validation.valid && databaseHealthy && userInDatabase 
      ? 'healthy'
      : validation.recoverable && databaseHealthy
      ? 'degraded' 
      : 'unhealthy';
    
    // Log session health check
    serverLogger.info('[Session Health] Health check performed', {
      status,
      userId: user.id,
      sessionValid: validation.valid,
      databaseHealthy,
    });
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      report: healthReport,
    });
  });
  
  // Session recovery endpoint for manual recovery attempts
  app.post("/api/auth/session-recover", async (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    serverLogger.info('[Session Recovery API] Manual recovery requested', {
      userId: user.id,
      email: user.email,
    });
    
    try {
      // Attempt recovery
      const recovered = await recoverSession(user);
      
      if (recovered) {
        // Update the session with recovered data
        req.logIn(recovered, (err) => {
          if (err) {
            serverLogger.error('[Session Recovery API] Failed to update session:', err);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to update session with recovered data" 
            });
          }
          
          req.session.save((saveErr) => {
            if (saveErr) {
              serverLogger.error('[Session Recovery API] Failed to save session:', saveErr);
            }
            
            serverLogger.info('[Session Recovery API] Session recovered successfully', {
              userId: recovered.id,
              role: recovered.role,
            });
            
            res.json({
              success: true,
              message: "Session recovered successfully",
              user: {
                id: recovered.id,
                email: recovered.email,
                role: recovered.role,
                firstName: recovered.firstName,
                lastName: recovered.lastName,
              },
            });
          });
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Session recovery failed - please log in again",
        });
      }
    } catch (error) {
      serverLogger.error('[Session Recovery API] Recovery error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred during session recovery",
      });
    }
  });
}

// Middleware to protect routes with enhanced validation
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user) {
    serverLogger.warn('[Auth] Unauthenticated request');
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Validate session
  const validation = validateSessionUser(user);
  
  if (!validation.valid) {
    serverLogger.error('[Auth] Invalid session in protected route', {
      errors: validation.errors,
      userId: user?.id,
    });
    
    // Attempt recovery
    if (validation.recoverable) {
      const recovered = await recoverSession(user);
      if (recovered) {
        // Update request with recovered session
        (req as any).user = recovered;
        serverLogger.info('[Auth] Session recovered in middleware');
        return next();
      }
    }
    
    // Session is invalid and unrecoverable
    return res.status(401).json({ message: "Session invalid - please log in again" });
  }
  
  // Verify token hasn't expired
  const now = Math.floor(Date.now() / 1000);
  if (user.expires_at && user.expires_at < now) {
    serverLogger.warn('[Auth] Token expired for user:', user.email);
    return res.status(401).json({ message: "Session expired" });
  }
  
  // Log session health periodically
  logSessionHealth();
  
  next();
};

// Export session management utilities for use in other modules
export {
  SessionUser,
  validateSessionUser,
  recoverSession,
  sessionHealthMetrics,
};

// CRITICAL: Force admin endpoint for emergencies
export async function setupForceAdminEndpoint(app: Express) {
  // This endpoint can force a user to be admin - use with caution
  app.post("/api/dev/force-admin", async (req, res) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        return res.status(400).json({ 
          message: "Either userId or email must be provided" 
        });
      }
      
      let user;
      if (userId) {
        user = await storage.getUser(userId);
      } else if (email) {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Force update the user's role to admin
      await storage.upsertUser({
        id: user.id,
        role: "admin"
      });
      
      serverLogger.warn(`[Auth] FORCE ADMIN: User ${user.email} (${user.id}) forced to admin role`);
      
      // If user is currently logged in, update their session
      const currentUser = (req as any).user;
      if (currentUser && currentUser.id === user.id) {
        currentUser.role = "admin";
        
        // Save the updated session
        req.session.save((err) => {
          if (err) {
            serverLogger.error('[Auth] Session save error after force admin:', err);
          }
        });
      }
      
      return res.json({ 
        message: "User role updated to admin",
        user: {
          id: user.id,
          email: user.email,
          role: "admin"
        }
      });
    } catch (error) {
      serverLogger.error('[Auth] Force admin error:', error);
      return res.status(500).json({ 
        message: "Failed to update user role" 
      });
    }
  });
  
  // Dev login endpoints for testing
  if (process.env.NODE_ENV === 'development') {
    // Quick login for specific test users
    app.get("/api/dev-login/:userId", async (req, res) => {
      const { userId } = req.params;
      
      const allowedTestUsers = ['test-admin', 'test-inspector1', 'test-inspector2'];
      if (!allowedTestUsers.includes(userId)) {
        return res.status(404).json({ message: "Not found" });
      }
      
      try {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const mockUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            exp: Math.floor(Date.now() / 1000) + 86400,
          },
          access_token: 'dev-token',
          refresh_token: 'dev-refresh',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
        };
        
        req.logIn(mockUser, (err) => {
          if (err) {
            serverLogger.error('[Auth] Dev login error:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          serverLogger.warn(`[Auth] DEV LOGIN: ${user.email} (${user.role})`);
          res.redirect("/");
        });
      } catch (error) {
        serverLogger.error('[Auth] Dev login error:', error);
        res.status(500).json({ message: "Login failed" });
      }
    });
    
    // Get dev mode status
    app.get("/api/dev/status", (req, res) => {
      res.json({
        devMode: true,
        testUsers: [
          { id: 'test-admin', email: 'admin@test.com', role: 'admin' },
          { id: 'test-inspector1', email: 'inspector1@test.com', role: 'inspector' },
          { id: 'test-inspector2', email: 'inspector2@test.com', role: 'inspector' },
        ],
      });
    });
  } else {
    // In production, these endpoints don't exist
    app.get("/api/dev-login/:userId", (req, res) => {
      res.status(404).json({ message: "Not found" });
    });
    
    app.get("/api/dev/status", (req, res) => {
      res.status(404).json({ message: "Not found" });
    });
  }
}