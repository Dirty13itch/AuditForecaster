import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { serverLogger } from "./logger";

// REPLIT_DOMAINS will be validated at runtime during setupAuth()
// Don't throw at module load to allow tests and non-Replit environments

// Export for diagnostics/health endpoints
export const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    serverLogger.info(`[ReplitAuth] Discovering OIDC configuration from ${issuerUrl}`);
    
    return await client.discovery(
      new URL(issuerUrl),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Export for diagnostics - returns list of registered strategy names
export function getRegisteredStrategies(): string[] {
  if (!process.env.REPLIT_DOMAINS) {
    return [];
  }
  return process.env.REPLIT_DOMAINS.split(",").map(d => `replitauth:${d.trim()}`);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore;
  
  // Use PostgreSQL session store if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    serverLogger.info('[ReplitAuth] Using PostgreSQL session store');
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    serverLogger.warn('[ReplitAuth] DATABASE_URL not set - using in-memory session store');
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
      secure: true,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const roleFromClaims = claims["role"];
  
  // Log ALL OIDC claims for debugging
  serverLogger.info(`[ReplitAuth/upsertUser] ====== FULL OIDC CLAIMS RECEIVED ======`);
  serverLogger.info(`[ReplitAuth/upsertUser] sub: ${claims["sub"]}`);
  serverLogger.info(`[ReplitAuth/upsertUser] email: ${claims["email"]}`);
  serverLogger.info(`[ReplitAuth/upsertUser] first_name: ${claims["first_name"]}`);
  serverLogger.info(`[ReplitAuth/upsertUser] last_name: ${claims["last_name"]}`);
  serverLogger.info(`[ReplitAuth/upsertUser] role: ${claims["role"] || "NOT PROVIDED"}`);
  serverLogger.info(`[ReplitAuth/upsertUser] All claims: ${JSON.stringify(claims, null, 2)}`);
  serverLogger.info(`[ReplitAuth/upsertUser] ========================================`);
  
  // Build user data object - only include role if provided in OIDC claims
  // This allows storage.upsertUser to preserve existing database role when claims don't include it
  const userData: any = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  
  // Only set role if explicitly provided in OIDC claims
  // Otherwise, storage.upsertUser will preserve existing DB role
  if (roleFromClaims) {
    userData.role = roleFromClaims;
    serverLogger.info(`[ReplitAuth/upsertUser] Explicit role from claims: ${roleFromClaims}`);
  } else {
    serverLogger.info(`[ReplitAuth/upsertUser] No role in claims - storage will preserve existing DB role`);
  }
  
  const user = await storage.upsertUser(userData);
  serverLogger.info(`[ReplitAuth/upsertUser] FINAL RESULT - User ${user.id} (${user.email}) has role: ${user.role}`);
  return user;
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

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    // CRITICAL FIX: Store the actual database user, not an empty object!
    const dbUser = await upsertUser(tokens.claims());
    
    // Combine database user data with OIDC tokens
    const user = {
      // Include ALL database fields (id, email, role, etc.)
      ...dbUser,
      // Add OIDC session data
      claims: tokens.claims(),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.claims()?.exp,
    };
    
    serverLogger.info(`[ReplitAuth/verify] Session will contain user: ${JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    })}`);
    
    verified(null, user);
  };

  // Register a strategy for each domain
  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const trimmedDomain = domain.trim();
    serverLogger.info(`[ReplitAuth] Registering strategy for domain: ${trimmedDomain}`);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${trimmedDomain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${trimmedDomain}/api/callback`, // String, not URL object!
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Login route - starts OAuth flow
  app.get("/api/login", (req, res, next) => {
    serverLogger.info(`[ReplitAuth] Login attempt from ${req.hostname}`);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent", // Blueprint standard - Replit OIDC doesn't support select_account
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // OAuth callback - uses blueprint's declarative style
  app.get("/api/callback", (req, res, next) => {
    serverLogger.info(`[ReplitAuth] OAuth callback received from ${req.hostname}`);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    serverLogger.info(`[ReplitAuth] Logout request from ${req.hostname}`);
    
    req.logout(() => {
      // Always use HTTPS for production redirects (Replit uses HTTPS)
      // req.protocol may report 'http' behind proxies/CDN
      const protocol = process.env.NODE_ENV === 'development' && req.hostname === 'localhost' 
        ? 'http' 
        : 'https';
      
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Middleware to protect routes
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    serverLogger.debug('[ReplitAuth] Unauthorized request');
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token expired - try to refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    serverLogger.debug('[ReplitAuth] No refresh token available');
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    serverLogger.info('[ReplitAuth] Refreshing expired token');
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    serverLogger.error('[ReplitAuth] Token refresh failed', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
