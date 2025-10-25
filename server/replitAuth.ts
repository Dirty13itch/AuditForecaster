import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import { getConfig } from "./config";
import { CircuitBreaker } from "./auth/circuitBreaker";
import { authMonitoring } from "./auth/monitoring";
import { getCorrelationId, logAuthEvent, logAuthError } from "./middleware/requestLogging";

// Circuit breaker for OIDC discovery
const oidcCircuitBreaker = new CircuitBreaker<client.Configuration>();

export const getOidcConfig = memoize(
  async () => {
    const config = getConfig();
    serverLogger.info(`[ReplitAuth] Discovering OIDC configuration from ${config.issuerUrl}`);
    
    return oidcCircuitBreaker.execute(
      async () => {
        // Use the openid-client v6 pattern: discovery with issuer URL and client_id
        const configuration = await client.discovery(
          new URL(config.issuerUrl),
          config.replId
        );
        
        const metadata = configuration.serverMetadata();
        serverLogger.info(`[ReplitAuth] OIDC configuration discovered successfully`);
        serverLogger.info(`[ReplitAuth] Server issuer: ${metadata.issuer}`);
        serverLogger.info(`[ReplitAuth] RFC 9207 support: ${metadata.authorization_response_iss_parameter_supported ? 'enabled' : 'disabled'}`);
        
        return configuration;
      },
      async () => {
        // Fallback: return cached result if available
        const cached = oidcCircuitBreaker.getCachedResult();
        if (cached) {
          serverLogger.warn('[ReplitAuth] Using cached OIDC configuration (circuit breaker fallback)');
          return cached;
        }
        throw new Error('OIDC discovery failed and no cached configuration available');
      }
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
      secure: true, // Always use secure cookies (Replit uses HTTPS)
      sameSite: 'lax', // 'lax' allows cookies to be sent on OAuth redirects
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
  req?: Request
) {
  const correlationId = req ? getCorrelationId(req) : undefined;
  serverLogger.info(`[ReplitAuth] Upserting user: ${claims["sub"]}`, { correlationId });
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

function generateErrorPage(options: {
  title: string;
  heading: string;
  message: string;
  errorDetails?: string;
  correlationId?: string;
  timestamp?: string;
  domain?: string;
  strategy?: string;
  troubleshootingSteps?: string[];
  showCopyDebugInfo?: boolean;
  showDiagnosticsLink?: boolean;
  showHealthLink?: boolean;
  ctaButtons?: Array<{ href: string; text: string; testId?: string }>;
}) {
  const {
    title,
    heading,
    message,
    errorDetails,
    correlationId,
    timestamp = new Date().toISOString(),
    domain,
    strategy,
    troubleshootingSteps = [],
    showCopyDebugInfo = false,
    showDiagnosticsLink = false,
    showHealthLink = false,
    ctaButtons = [{ href: '/api/login', text: 'Try Again', testId: 'button-retry-login' }],
  } = options;

  const debugInfo = JSON.stringify({
    error: errorDetails || 'Unknown error',
    correlationId: correlationId || 'N/A',
    timestamp,
    domain: domain || 'N/A',
    strategy: strategy || 'N/A',
  }, null, 2);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 700px;
            margin: 50px auto;
            padding: 20px;
            background: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #dc3545; margin-top: 0; }
          p { color: #6c757d; line-height: 1.6; }
          .error-details {
            background: #f8d7da;
            border: 1px solid #f5c2c7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 13px;
            word-break: break-word;
            color: #842029;
          }
          .meta-info {
            background: #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
          }
          .meta-info div {
            margin: 5px 0;
          }
          .meta-info strong {
            color: #495057;
          }
          .btn {
            display: inline-block;
            background: #0969da;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 10px 0 0;
            cursor: pointer;
            border: none;
            font-size: 14px;
          }
          .btn:hover { background: #0860ca; }
          .btn-secondary {
            background: #6c757d;
          }
          .btn-secondary:hover { background: #5c636a; }
          code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
          }
          ol {
            padding-left: 20px;
          }
          li {
            margin: 8px 0;
            color: #495057;
          }
          .links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
          }
          .links a {
            color: #0969da;
            text-decoration: none;
            margin-right: 15px;
          }
          .links a:hover {
            text-decoration: underline;
          }
          .success-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <div class="success-toast" id="toast">✓ Debug info copied to clipboard!</div>
        <div class="container">
          <h1>${heading}</h1>
          <p>${message}</p>
          
          ${errorDetails ? `
            <div class="error-details">
              <strong>Error:</strong> ${errorDetails}
            </div>
          ` : ''}
          
          ${correlationId || domain || strategy ? `
            <div class="meta-info">
              ${correlationId ? `<div><strong>Correlation ID:</strong> <code>${correlationId}</code></div>` : ''}
              ${timestamp ? `<div><strong>Timestamp:</strong> ${timestamp}</div>` : ''}
              ${domain ? `<div><strong>Domain:</strong> <code>${domain}</code></div>` : ''}
              ${strategy ? `<div><strong>Strategy:</strong> <code>${strategy}</code></div>` : ''}
            </div>
          ` : ''}
          
          ${troubleshootingSteps.length > 0 ? `
            <h3>Troubleshooting Steps:</h3>
            <ol>
              ${troubleshootingSteps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          ` : ''}
          
          <div>
            ${ctaButtons.map(btn => `
              <a href="${btn.href}" class="btn" ${btn.testId ? `data-testid="${btn.testId}"` : ''}>${btn.text}</a>
            `).join('')}
            ${showCopyDebugInfo ? `
              <button onclick="copyDebugInfo()" class="btn btn-secondary" data-testid="button-copy-debug">
                📋 Copy Debug Info
              </button>
            ` : ''}
          </div>
          
          ${showDiagnosticsLink || showHealthLink ? `
            <div class="links">
              ${showHealthLink ? '<a href="/api/health" target="_blank">Health Status</a>' : ''}
              ${showDiagnosticsLink ? '<a href="/api/auth/diagnostics" target="_blank">Admin Diagnostics</a>' : ''}
            </div>
          ` : ''}
        </div>
        
        ${showCopyDebugInfo ? `
          <script>
            const debugInfo = ${JSON.stringify(debugInfo)};
            
            function copyDebugInfo() {
              navigator.clipboard.writeText(debugInfo).then(() => {
                const toast = document.getElementById('toast');
                toast.style.display = 'block';
                setTimeout(() => {
                  toast.style.display = 'none';
                }, 3000);
              });
            }
          </script>
        ` : ''}
      </body>
    </html>
  `;
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
    serverLogger.info(`[ReplitAuth] Registering strategy for domain: ${domain}`);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config: oidcConfig,
        scope: "openid email profile offline_access",
        callbackURL: new URL(`https://${domain}/api/callback`),
      },
      verify,
    );
    passport.use(strategy);
    serverLogger.info(`[ReplitAuth] Strategy registered: replitauth:${domain}`);
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
    const startTime = Date.now();
    const correlationId = getCorrelationId(req);
    
    logAuthEvent(req, 'Login attempt started', { hostname: req.hostname });
    authMonitoring.recordEvent('login_attempt', {
      correlationId,
      domain: req.hostname,
    });
    
    try {
      const strategy = getStrategyForHostname(req.hostname);
      passport.authenticate(`replitauth:${strategy}`, {
        prompt: "select_account consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
      
      const latency = Date.now() - startTime;
      authMonitoring.recordEvent('login_success', {
        correlationId,
        domain: req.hostname,
        latency,
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logAuthError(req, 'Login failed', {
        hostname: req.hostname,
        error: errorMessage,
      });
      
      authMonitoring.recordEvent('login_failure', {
        correlationId,
        domain: req.hostname,
        error: errorMessage,
        latency,
      });
      
      return res.status(400).send(generateErrorPage({
        title: 'Domain Not Registered',
        heading: '⚠️ Domain Not Registered',
        message: `The domain <code>${req.hostname}</code> is not registered for authentication.`,
        errorDetails: errorMessage,
        correlationId,
        domain: req.hostname,
        troubleshootingSteps: [
          'Add this domain to the Replit Auth connector configuration',
          `Ensure <code>REPLIT_DOMAINS</code> environment variable includes <code>${req.hostname}</code>`,
          'Restart the application after updating environment variables',
          'Check the Replit Auth connector is properly configured',
        ],
        showCopyDebugInfo: true,
        showHealthLink: true,
        showDiagnosticsLink: true,
      }));
    }
  });

  app.get("/api/callback", (req, res, next) => {
    const startTime = Date.now();
    const correlationId = getCorrelationId(req);
    
    logAuthEvent(req, 'OAuth callback received', { hostname: req.hostname });
    authMonitoring.recordEvent('callback_attempt', {
      correlationId,
      domain: req.hostname,
    });
    
    try {
      const strategy = getStrategyForHostname(req.hostname);
      logAuthEvent(req, `Using strategy: replitauth:${strategy}`);
      
      passport.authenticate(`replitauth:${strategy}`, (err, user, info) => {
        const latency = Date.now() - startTime;
        
        if (err) {
          const errorMessage = err.message || 'Unknown authentication error';
          
          logAuthError(req, 'Authentication error', {
            error: errorMessage,
            stack: err.stack,
            hostname: req.hostname,
            strategy,
          });
          
          authMonitoring.recordEvent('callback_failure', {
            correlationId,
            domain: req.hostname,
            error: errorMessage,
            latency,
          });
          
          return res.status(500).send(generateErrorPage({
            title: 'Authentication Error',
            heading: '🔐 Authentication Failed',
            message: 'We encountered an error while trying to sign you in to the Energy Auditing application.',
            errorDetails: errorMessage,
            correlationId,
            domain: req.hostname,
            strategy: `replitauth:${strategy}`,
            troubleshootingSteps: [
              'Clear your browser cookies and try again',
              'Ensure you\'re accessing the app from the correct Replit domain',
              `Check that the <code>REPLIT_DOMAINS</code> environment variable includes <code>${req.hostname}</code>`,
              'Verify the Replit Auth connector is properly configured',
              'Check the circuit breaker status in admin diagnostics',
            ],
            showCopyDebugInfo: true,
            showHealthLink: true,
            showDiagnosticsLink: true,
          }));
        }
        
        if (!user) {
          logAuthEvent(req, 'No user returned from authentication', { info });
          authMonitoring.recordEvent('callback_failure', {
            correlationId,
            domain: req.hostname,
            error: 'No user returned',
            latency,
          });
          return res.redirect('/api/login');
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            logAuthError(req, 'Login failed', loginErr);
            authMonitoring.recordEvent('callback_failure', {
              correlationId,
              domain: req.hostname,
              error: loginErr.message,
              latency,
            });
            return next(loginErr);
          }
          
          logAuthEvent(req, 'User logged in successfully');
          authMonitoring.recordEvent('callback_success', {
            correlationId,
            userId: (user as any).claims?.sub,
            domain: req.hostname,
            latency,
          });
          
          return res.redirect('/');
        });
      })(req, res, next);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logAuthError(req, 'Callback failed', {
        hostname: req.hostname,
        error: errorMessage,
      });
      
      authMonitoring.recordEvent('callback_failure', {
        correlationId,
        domain: req.hostname,
        error: errorMessage,
        latency,
      });
      
      return res.status(400).send(generateErrorPage({
        title: 'Domain Not Registered',
        heading: '⚠️ Domain Not Registered',
        message: `The domain <code>${req.hostname}</code> is not registered for authentication.`,
        errorDetails: errorMessage,
        correlationId,
        domain: req.hostname,
        troubleshootingSteps: [
          'Add this domain to the Replit Auth connector configuration',
          `Ensure <code>REPLIT_DOMAINS</code> environment variable includes <code>${req.hostname}</code>`,
          'Restart the application after updating environment variables',
        ],
        showCopyDebugInfo: true,
        showHealthLink: true,
        showDiagnosticsLink: true,
      }));
    }
  });

  app.get("/api/logout", (req, res) => {
    const correlationId = getCorrelationId(req);
    const userId = (req as any).user?.claims?.sub;
    
    logAuthEvent(req, 'Logout request received');
    authMonitoring.recordEvent('logout', {
      correlationId,
      userId,
      domain: req.hostname,
    });
    
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
  const correlationId = getCorrelationId(req);

  if (!req.isAuthenticated() || !user?.expires_at) {
    logAuthEvent(req, 'Unauthorized request', { path: req.path });
    return res.status(401).json({ 
      message: "Unauthorized",
      error: "authentication_required",
      redirect: "/api/login",
      correlationId,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = user.expires_at - now;
  
  // Token is still valid and not close to expiring
  if (timeUntilExpiry > TOKEN_REFRESH_BUFFER_SECONDS) {
    return next();
  }

  // Token expired or expiring soon - refresh it
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    logAuthEvent(req, 'No refresh token available', { path: req.path });
    return res.status(401).json({ 
      message: "Unauthorized - Session expired",
      error: "session_expired",
      redirect: "/api/login",
      correlationId,
    });
  }

  const startTime = Date.now();
  authMonitoring.recordEvent('token_refresh_attempt', {
    correlationId,
    userId: user.claims?.sub,
  });

  try {
    if (timeUntilExpiry <= 0) {
      logAuthEvent(req, `Token expired ${Math.abs(timeUntilExpiry)}s ago - refreshing`);
    } else {
      logAuthEvent(req, `Token expires in ${timeUntilExpiry}s - proactively refreshing`);
    }
    
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    const latency = Date.now() - startTime;
    const newExpiry = user.claims?.exp;
    const newTimeUntilExpiry = newExpiry ? newExpiry - Math.floor(Date.now() / 1000) : 0;
    
    logAuthEvent(req, `Token refreshed successfully - valid for ${Math.floor(newTimeUntilExpiry / 60)}m`);
    authMonitoring.recordEvent('token_refresh_success', {
      correlationId,
      userId: user.claims?.sub,
      latency,
    });
    
    return next();
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logAuthError(req, 'Token refresh failed', { error: errorMessage });
    authMonitoring.recordEvent('token_refresh_failure', {
      correlationId,
      userId: user.claims?.sub,
      error: errorMessage,
      latency,
    });
    
    // Provide helpful error message based on error type
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
    
    return res.status(401).json({ 
      message: isNetworkError 
        ? "Authentication service temporarily unavailable" 
        : "Session expired - Please log in again",
      error: isNetworkError ? "service_unavailable" : "token_refresh_failed",
      redirect: "/api/login",
      correlationId,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

export function getRegisteredStrategies(): string[] {
  const config = getConfig();
  return config.replitDomains.map(domain => `replitauth:${domain}`);
}
