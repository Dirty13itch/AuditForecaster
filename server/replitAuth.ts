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
  serverLogger.info(`[ReplitAuth] Upserting user: ${claims["sub"]}`);
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
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
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
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
      prompt: "select_account consent", // Show account picker + consent screen
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
