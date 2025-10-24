import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import { getConfig } from "./config";

const getOidcConfig = memoize(
  async () => {
    const config = getConfig();
    return await client.discovery(
      new URL(config.issuerUrl),
      config.replId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const config = getConfig();
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore;
  
  // Use PostgreSQL session store in production, in-memory store in development
  if (config.databaseUrl) {
    serverLogger.info('[ReplitAuth] Using PostgreSQL session store');
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: config.databaseUrl,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    serverLogger.warn('[ReplitAuth] Using in-memory session store (development only - sessions will be lost on restart)');
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  return session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
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

async function upsertUser(
  claims: any,
) {
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
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const serverConfig = getConfig();
  const oidcConfig = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of serverConfig.replitDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config: oidcConfig,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => {
    serverLogger.debug('[ReplitAuth] Serializing user session');
    cb(null, user);
  });
  
  passport.deserializeUser((user: Express.User, cb) => {
    serverLogger.debug('[ReplitAuth] Deserializing user session');
    cb(null, user);
  });

  function getStrategyForHostname(hostname: string): string {
    const domains = serverConfig.replitDomains;
    
    serverLogger.debug(`[ReplitAuth] Finding strategy for hostname: ${hostname}`);
    
    // In Replit development environment, allow localhost to use the Replit domain
    if (hostname === 'localhost' && process.env.REPLIT_DEV_DOMAIN) {
      const devDomain = process.env.REPLIT_DEV_DOMAIN;
      const devMatch = domains.find(domain => domain === devDomain);
      if (devMatch) {
        serverLogger.debug(`[ReplitAuth] Development mode: localhost → ${devMatch}`);
        return devMatch;
      }
    }
    
    // Try exact match first
    const exactMatch = domains.find(domain => domain === hostname);
    if (exactMatch) {
      serverLogger.debug(`[ReplitAuth] Exact match found: ${exactMatch}`);
      return exactMatch;
    }
    
    // Try ends-with match for subdomains
    const endsWithMatch = domains.find(domain => hostname.endsWith(domain));
    if (endsWithMatch) {
      serverLogger.debug(`[ReplitAuth] Subdomain match found: ${endsWithMatch}`);
      return endsWithMatch;
    }
    
    // In development mode with localhost, use first domain as fallback
    if (hostname === 'localhost' && domains.length > 0) {
      serverLogger.debug(`[ReplitAuth] Development mode: localhost → ${domains[0]} (fallback)`);
      return domains[0];
    }
    
    // No match found - throw error instead of falling back
    serverLogger.error(`[ReplitAuth] Domain ${hostname} is not registered. Available domains: ${domains.join(', ')}`);
    throw new Error(`Domain ${hostname} is not registered for authentication. Please add it to the Replit Auth connector and REPLIT_DOMAINS environment variable.`);
  }

  app.get("/api/login", (req, res, next) => {
    serverLogger.info(`[ReplitAuth] Login request received from ${req.hostname}`);
    
    try {
      const strategy = getStrategyForHostname(req.hostname);
      passport.authenticate(`replitauth:${strategy}`, {
        prompt: "select_account consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      serverLogger.error(`[ReplitAuth] Login failed for domain ${req.hostname}:`, error);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Domain Not Registered</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 600px;
                margin: 100px auto;
                padding: 20px;
                text-align: center;
              }
              h1 { color: #dc3545; }
              p { color: #6c757d; line-height: 1.6; }
              code {
                background: #f8f9fa;
                padding: 2px 8px;
                border-radius: 4px;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <h1>⚠️ Domain Not Registered</h1>
            <p>The domain <code>${req.hostname}</code> is not registered for authentication.</p>
            <p>To use this domain, please add it to the Replit Auth connector configuration and ensure it's included in the <code>REPLIT_DOMAINS</code> environment variable.</p>
            <p><small>Error: ${error instanceof Error ? error.message : 'Unknown error'}</small></p>
          </body>
        </html>
      `);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    serverLogger.info(`[ReplitAuth] OAuth callback received from ${req.hostname}`);
    
    try {
      const strategy = getStrategyForHostname(req.hostname);
      passport.authenticate(`replitauth:${strategy}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch (error) {
      serverLogger.error(`[ReplitAuth] Callback failed for domain ${req.hostname}:`, error);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Domain Not Registered</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 600px;
                margin: 100px auto;
                padding: 20px;
                text-align: center;
              }
              h1 { color: #dc3545; }
              p { color: #6c757d; line-height: 1.6; }
              code {
                background: #f8f9fa;
                padding: 2px 8px;
                border-radius: 4px;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <h1>⚠️ Domain Not Registered</h1>
            <p>The domain <code>${req.hostname}</code> is not registered for authentication.</p>
            <p>To use this domain, please add it to the Replit Auth connector configuration and ensure it's included in the <code>REPLIT_DOMAINS</code> environment variable.</p>
            <p><small>Error: ${error instanceof Error ? error.message : 'Unknown error'}</small></p>
          </body>
        </html>
      `);
    }
  });

  app.get("/api/logout", (req, res) => {
    serverLogger.info('[ReplitAuth] Logout request received');
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(oidcConfig, {
          client_id: serverConfig.replId,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Refresh tokens 5 minutes before they expire (proactive refresh)
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    serverLogger.warn(`[ReplitAuth] Unauthorized request to ${req.path}`);
    return res.status(401).json({ 
      message: "Unauthorized",
      error: "authentication_required",
      redirect: "/api/login"
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = user.expires_at - now;
  
  // Token is still valid and not close to expiring
  if (timeUntilExpiry > TOKEN_REFRESH_BUFFER_SECONDS) {
    serverLogger.debug(`[ReplitAuth] ✓ Token valid for ${Math.floor(timeUntilExpiry / 60)}m - ${req.path}`);
    return next();
  }

  // Token expired or expiring soon - refresh it
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    serverLogger.warn(`[ReplitAuth] No refresh token available for ${req.path}`);
    return res.status(401).json({ 
      message: "Unauthorized - Session expired",
      error: "session_expired",
      redirect: "/api/login"
    });
  }

  try {
    if (timeUntilExpiry <= 0) {
      serverLogger.info(`[ReplitAuth] Token expired ${Math.abs(timeUntilExpiry)}s ago - refreshing`);
    } else {
      serverLogger.info(`[ReplitAuth] Token expires in ${timeUntilExpiry}s - proactively refreshing`);
    }
    
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    const newExpiry = user.claims?.exp;
    if (newExpiry) {
      const newTimeUntilExpiry = newExpiry - Math.floor(Date.now() / 1000);
      serverLogger.info(`[ReplitAuth] ✓ Token refreshed successfully - valid for ${Math.floor(newTimeUntilExpiry / 60)}m`);
    } else {
      serverLogger.info('[ReplitAuth] ✓ Token refreshed successfully');
    }
    
    return next();
  } catch (error) {
    serverLogger.error('[ReplitAuth] Token refresh failed:', error);
    
    // Provide helpful error message based on error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
    
    return res.status(401).json({ 
      message: isNetworkError 
        ? "Authentication service temporarily unavailable" 
        : "Session expired - Please log in again",
      error: isNetworkError ? "service_unavailable" : "token_refresh_failed",
      redirect: "/api/login",
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};
