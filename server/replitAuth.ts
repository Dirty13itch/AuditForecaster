import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { serverLogger } from "./logger";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
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
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    
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
        prompt: "login consent",
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
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    serverLogger.warn(`[ReplitAuth] Unauthorized request to ${req.path}`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    serverLogger.debug(`[ReplitAuth] ✓ Authenticated request to ${req.path}`);
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    serverLogger.warn(`[ReplitAuth] No refresh token available for ${req.path}`);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    serverLogger.info('[ReplitAuth] Refreshing expired token');
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    serverLogger.info('[ReplitAuth] Token refreshed successfully');
    return next();
  } catch (error) {
    serverLogger.error('[ReplitAuth] Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
