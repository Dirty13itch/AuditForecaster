import { initSentry, Sentry, isSentryEnabled, captureException, sentryUserMiddleware, sentryErrorHandler } from "./sentry";
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { serverLogger } from "./logger";
import { storage } from "./storage";
import { getConfig } from "./config";
import { validateAuthConfig } from "./auth/validation";
import { setupWebSocket } from "./websocket";
import { registerNotificationRoutes } from "./notificationRoutes";
import testNotificationRoutes from "./testNotifications";
import { createServer } from "http";
import { logFailedAuth } from "./security-audit";

const app = express();

if (isSentryEnabled()) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Export app for testing
export { app };

// Enhanced helmet configuration for production-grade security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow images from various sources
      connectSrc: ["'self'", "https://storage.googleapis.com"], // Allow API calls
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some third-party services
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource loading
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' }, // Prevent clickjacking
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));

// Add response compression for better network performance
app.use(compression({
  level: 6, // Compression level 1-9 (6 is good balance of speed/size)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  }
}));

// Production-grade CORS configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
  // Add Replit domains
  ...((process.env.REPLIT_DOMAINS || '').split(',').filter(Boolean).map(d => `https://${d.trim()}`))
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is explicitly allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin is a valid .replit.dev subdomain (must END with .replit.dev, not just contain it)
    // This prevents attacks like https://preview.replit.dev.attacker.com
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      if (hostname.endsWith('.replit.dev') || hostname === 'replit.dev') {
        return callback(null, true);
      }
    } catch (err) {
      // Malformed origin URL - reject it
      serverLogger.warn(`[CORS] Malformed origin: ${origin}`, { error: err });
      return callback(new Error('Not allowed by CORS'));
    }
    
    serverLogger.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

serverLogger.info('[Server] CORS configured', {
  allowedOrigins,
  allowPreviewDeploys: true,
});

// Rate limiting for authentication endpoints
// In development: very lenient to allow testing/debugging
// In production: strict limits to prevent abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 100 in dev, 5 in prod
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for easier testing
    return process.env.NODE_ENV === 'development';
  },
});

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 in dev, 100 in prod
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and in development
    if (process.env.NODE_ENV === 'development') return true;
    return req.path === '/healthz' || req.path === '/readyz' || req.path === '/api/status';
  },
});

// Apply rate limiters
app.use('/api/login', authLimiter);
app.use('/api/callback', authLimiter);
app.use('/api', apiLimiter);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware with correlation IDs
import { requestLoggingMiddleware } from "./middleware/requestLogging";
app.use(requestLoggingMiddleware);

// Prometheus metrics middleware
import { metricsMiddleware } from "./middleware/metricsMiddleware";
app.use(metricsMiddleware);

// Security audit logging middleware
app.use(logFailedAuth);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Singleton server instance to prevent duplicate listeners
let serverInstance: Server | null = null;
let isShuttingDown = false;

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    serverLogger.debug(`[Server] Already shutting down, ignoring ${signal}`);
    return;
  }
  
  isShuttingDown = true;
  serverLogger.info(`[Server] ${signal} received, starting graceful shutdown...`);

  if (serverInstance) {
    serverInstance.close((err) => {
      if (err) {
        serverLogger.error('[Server] Error during server shutdown:', err);
        process.exit(1);
      }
      serverLogger.info('[Server] HTTP server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      serverLogger.warn('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  serverLogger.error('[Server] Uncaught exception:', err);
  captureException(err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  serverLogger.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  captureException(reason);
});

async function startServer() {
  try {
    // Validate configuration first - will throw if missing required env vars
    const config = getConfig();
    
    // Run authentication validation before starting server
    const skipAuthValidation = process.env.SKIP_AUTH_VALIDATION === 'true';
    
    if (skipAuthValidation) {
      serverLogger.warn('╔════════════════════════════════════════════════════════════════╗');
      serverLogger.warn('║  WARNING: Authentication validation bypassed!                 ║');
      serverLogger.warn('║  SKIP_AUTH_VALIDATION=true is set                              ║');
      serverLogger.warn('║  Authentication may not work correctly                         ║');
      serverLogger.warn('╚════════════════════════════════════════════════════════════════╝');
    } else {
      serverLogger.info('╔════════════════════════════════════════════════════════════════╗');
      serverLogger.info('║  Starting Authentication Configuration Validation             ║');
      serverLogger.info('╚════════════════════════════════════════════════════════════════╝');
      
      try {
        const validationReport = await validateAuthConfig({
          skipOIDC: false,
          skipDatabase: false,
        });
        
        if (validationReport.overall === 'pass') {
          serverLogger.info('╔════════════════════════════════════════════════════════════════╗');
          serverLogger.info('║  ✓ Authentication Configuration Valid                          ║');
          serverLogger.info('╚════════════════════════════════════════════════════════════════╝');
        } else if (validationReport.overall === 'degraded') {
          serverLogger.warn('╔════════════════════════════════════════════════════════════════╗');
          serverLogger.warn('║  ⚠ Authentication Configuration Degraded                       ║');
          serverLogger.warn('║  Server will start but some features may not work correctly   ║');
          serverLogger.warn('╚════════════════════════════════════════════════════════════════╝');
          
          const warnings = validationReport.results.filter(r => r.status === 'warning');
          warnings.forEach(w => {
            serverLogger.warn(`  ⚠ ${w.component}: ${w.message}`);
            if (w.fix) {
              serverLogger.warn(`    Fix: ${w.fix}`);
            }
          });
        }
      } catch (validationError) {
        serverLogger.error('[Server] Authentication validation failed');
        serverLogger.error(validationError instanceof Error ? validationError.message : String(validationError));
        serverLogger.error('');
        serverLogger.error('To bypass validation in emergency, set:');
        serverLogger.error('  SKIP_AUTH_VALIDATION=true');
        serverLogger.error('');
        throw validationError;
      }
    }
    
    // Run critical user integrity check
    serverLogger.info('╔════════════════════════════════════════════════════════════════╗');
    serverLogger.info('║  Running Critical User Integrity Check                        ║');
    serverLogger.info('╚════════════════════════════════════════════════════════════════╝');
    
    try {
      const integrityCheck = await storage.verifyCriticalUsersIntegrity();
      if (!integrityCheck.success) {
        serverLogger.error('[Server] Critical user integrity check failed:');
        integrityCheck.errors.forEach(error => serverLogger.error(`  - ${error}`));
        
        if (process.env.NODE_ENV === 'production') {
          serverLogger.error('╔════════════════════════════════════════════════════════════════╗');
          serverLogger.error('║  CRITICAL: User integrity check failed in production!         ║');
          serverLogger.error('║  Admin access may be compromised.                             ║');
          serverLogger.error('╚════════════════════════════════════════════════════════════════╝');
        }
      } else {
        serverLogger.info('╔════════════════════════════════════════════════════════════════╗');
        serverLogger.info('║  ✓ Critical User Integrity Check Passed                       ║');
        serverLogger.info('╚════════════════════════════════════════════════════════════════╝');
      }
    } catch (error) {
      serverLogger.error('[Server] Failed to run critical user integrity check:', error);
      // Don't stop the server, but log the error
    }
    
    // Register main API routes (this creates the HTTP server)
    const server = await registerRoutes(app);
    
    // Register notification routes after authentication is set up
    registerNotificationRoutes(app);
    app.use(testNotificationRoutes);
    serverLogger.info('[Server] Notification routes registered');
    
    // Setup WebSocket server for real-time notifications
    setupWebSocket(server);
    serverLogger.info('[Server] WebSocket server initialized');
    
    // Store server instance for graceful shutdown
    serverInstance = server;

    // Add Sentry error handler (only reports 5xx errors)
    if (isSentryEnabled()) {
      app.use(sentryErrorHandler);
    }

    // Final error handler
    app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      captureException(err);
      serverLogger.error(`[Server] Request error: ${message}`, err);

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    return new Promise<void>((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          serverLogger.error(`[Server] Port ${port} is already in use. Another process may be running.`);
          
          // In development, try to recover gracefully
          if (process.env.NODE_ENV === 'development') {
            serverLogger.warn('[Server] Development mode: attempting to kill existing process and retry...');
            setTimeout(() => {
              server.listen(port, '0.0.0.0', () => {
                serverLogger.info(`[Server] Successfully recovered and listening on port ${port}`);
                resolve();
              });
            }, 2000);
          } else {
            reject(err);
          }
        } else {
          serverLogger.error('[Server] Failed to start:', err);
          reject(err);
        }
      };

      server.once('error', onError);
      
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, async () => {
        server.removeListener('error', onError);
        log(`serving on port ${port}`);
        
        // Recalculate scores for all existing reports in development
        if (process.env.NODE_ENV === 'development') {
          try {
            const jobs = await storage.getAllJobs();
            let recalculated = 0;
            for (const job of jobs) {
              const instances = await storage.getReportInstancesByJob(job.id);
              for (const instance of instances) {
                await storage.recalculateReportScore(instance.id);
                recalculated++;
              }
            }
            if (recalculated > 0) {
              log(`Recalculated scores for ${recalculated} existing reports`);
            }
          } catch (error) {
            serverLogger.error('Failed to recalculate scores on startup:', error);
          }
          
          // Evaluate compliance for all existing jobs
          try {
            const { updateJobComplianceStatus, updateReportComplianceStatus } = await import('./complianceService');
            const jobs = await storage.getAllJobs();
            let jobsEvaluated = 0;
            let reportsEvaluated = 0;
            
            for (const job of jobs) {
              await updateJobComplianceStatus(storage, job.id);
              jobsEvaluated++;
              
              const instances = await storage.getReportInstancesByJob(job.id);
              for (const instance of instances) {
                await updateReportComplianceStatus(storage, instance.id);
                reportsEvaluated++;
              }
            }
            
            if (jobsEvaluated > 0 || reportsEvaluated > 0) {
              log(`Evaluated compliance for ${jobsEvaluated} jobs and ${reportsEvaluated} reports`);
            }
          } catch (error) {
            serverLogger.error('Failed to evaluate compliance on startup:', error);
          }
          
          // Seed achievements on startup
          try {
            const { ACHIEVEMENT_DEFINITIONS } = await import('@shared/achievementDefinitions');
            const achievementInserts = ACHIEVEMENT_DEFINITIONS.map(def => ({
              id: def.id,
              name: def.name,
              description: def.description,
              type: def.type,
              iconName: def.iconName,
              criteria: def.criteria as any,
              tier: def.tier || null,
            }));
            await storage.seedAchievements(achievementInserts);
            log(`Seeded ${achievementInserts.length} achievement definitions`);
          } catch (error) {
            serverLogger.error('Failed to seed achievements on startup:', error);
          }
          
          // Seed builder abbreviations for M/I Homes
          try {
            const allBuilders = await storage.getAllBuilders();
            const miHomes = allBuilders.find(b => b.companyName.toLowerCase().includes('m/i homes'));
            
            if (miHomes) {
              await storage.seedBuilderAbbreviations(miHomes.id, ['MI', 'M/I', 'M.I.', 'MIHomes']);
              log('Seeded builder abbreviations for M/I Homes');
            }
          } catch (error) {
            serverLogger.error('Failed to seed builder abbreviations:', error);
          }
          
          // DEV MODE: Seed test users for development authentication bypass
          try {
            serverLogger.warn('╔════════════════════════════════════════════════════════════════╗');
            serverLogger.warn('║  ⚠️  DEV MODE ACTIVE - Test Authentication Enabled            ║');
            serverLogger.warn('╚════════════════════════════════════════════════════════════════╝');
            
            const testUsers = [
              {
                id: 'test-admin',
                email: 'admin@test.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin' as const,
              },
              {
                id: 'test-inspector1',
                email: 'inspector1@test.com',
                firstName: 'Inspector',
                lastName: 'One',
                role: 'inspector' as const,
              },
              {
                id: 'test-inspector2',
                email: 'inspector2@test.com',
                firstName: 'Inspector',
                lastName: 'Two',
                role: 'inspector' as const,
              },
            ];
            
            let seededCount = 0;
            for (const testUser of testUsers) {
              await storage.upsertUser(testUser);
              seededCount++;
            }
            
            serverLogger.warn(`[DevMode] Seeded ${seededCount} test users for development authentication`);
            serverLogger.warn('[DevMode] Quick login URLs:');
            serverLogger.warn(`[DevMode]   Admin:      /api/dev-login/test-admin`);
            serverLogger.warn(`[DevMode]   Inspector1: /api/dev-login/test-inspector1`);
            serverLogger.warn(`[DevMode]   Inspector2: /api/dev-login/test-inspector2`);
          } catch (error) {
            serverLogger.error('Failed to seed test users:', error);
          }
        }
        
        // Initialize scheduled email jobs
        try {
          const { startScheduledEmails } = await import('./email/scheduledEmails');
          await startScheduledEmails();
          serverLogger.info('[Server] Email notification cron jobs initialized');
        } catch (error) {
          serverLogger.error('[Server] Failed to initialize scheduled emails:', error);
        }

        // Initialize automated calendar import job
        try {
          const { startScheduledCalendarImport } = await import('./scheduledCalendarImport');
          await startScheduledCalendarImport();
          serverLogger.info('[Server] Automated calendar import cron job initialized');
        } catch (error) {
          serverLogger.error('[Server] Failed to initialize calendar import cron job:', error);
        }

        // Initialize periodic job status metrics update
        try {
          const { jobStatusGauge } = await import('./metrics');
          
          const updateJobMetrics = async () => {
            try {
              // Try to get jobs with error handling for missing columns
              let jobs = [];
              try {
                jobs = await storage.getAllJobs();
              } catch (dbError: any) {
                // Handle database column missing errors gracefully
                if (dbError?.code === '42703') {
                  serverLogger.warn('[Metrics] Database schema out of sync. Please run npm run db:push to sync the schema.', { error: dbError?.message });
                  // Return early to avoid further errors
                  return;
                }
                // Re-throw other errors
                throw dbError;
              }

              const statusCounts: Record<string, number> = {};
              
              for (const job of jobs) {
                const status = job.status || 'unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
              }
              
              jobStatusGauge.reset();
              Object.entries(statusCounts).forEach(([status, count]) => {
                jobStatusGauge.set({ status }, count);
              });
              
              serverLogger.debug('[Metrics] Job status gauge updated', { statusCounts });
            } catch (error) {
              serverLogger.error('[Metrics] Failed to update job status gauge', { error });
            }
          };
          
          // Update immediately on startup
          await updateJobMetrics();
          
          // Update every 60 seconds
          setInterval(updateJobMetrics, 60000);
          
          serverLogger.info('[Server] Periodic job status metrics initialized');
        } catch (error) {
          serverLogger.error('[Server] Failed to initialize job status metrics:', error);
        }

        // Initialize financial cron jobs
        try {
          // Daily AR snapshot at midnight
          cron.schedule('0 0 * * *', async () => {
            try {
              serverLogger.info('[ARSnapshot] Running daily AR snapshot');
              await storage.createARSnapshot();
              serverLogger.info('[ARSnapshot] Daily AR snapshot completed successfully');
            } catch (error) {
              serverLogger.error('[ARSnapshot] Failed to create daily AR snapshot', { error });
            }
          });

          // Weekly unbilled work reminder on Monday 9am
          cron.schedule('0 9 * * 1', async () => {
            try {
              serverLogger.info('[UnbilledWorkReminder] Running weekly unbilled work check');
              const { count, amount } = await storage.getUnbilledWorkValue();
              
              if (count > 10) {
                serverLogger.warn('[UnbilledWorkReminder] High unbilled work detected', { count, amount });
                
                // Get admin users
                const adminUsers = await storage.getUsersByRole('admin');
                const adminEmail = adminUsers[0]?.email;
                
                if (!adminEmail) {
                  serverLogger.error('[UnbilledWorkReminder] No admin email found');
                  return;
                }
                
                // Prepare email content
                const emailSubject = 'Weekly Unbilled Work Reminder';
                const emailBody = `You have ${count} completed jobs worth $${amount.toFixed(2)} that haven't been invoiced yet. Visit /financial/unbilled-work to create invoices.`;
                
                // Log email details to console
                serverLogger.info('[UnbilledWorkReminder] Unbilled work email notification', { 
                  email: adminEmail, 
                  subject: emailSubject, 
                  body: emailBody,
                  count,
                  amount: amount.toFixed(2)
                });
                
                // Send actual email if SENDGRID_API_KEY is configured
                if (process.env.SENDGRID_API_KEY) {
                  try {
                    const { emailService } = await import('./email/emailService');
                    await emailService.sendEmail(adminEmail, emailSubject, emailBody);
                    serverLogger.info('[UnbilledWorkReminder] Email sent successfully', { email: adminEmail });
                  } catch (emailError) {
                    serverLogger.error('[UnbilledWorkReminder] Failed to send email', { error: emailError });
                  }
                } else {
                  serverLogger.info('[UnbilledWorkReminder] SENDGRID_API_KEY not configured, email not sent');
                }
              } else {
                serverLogger.info('[UnbilledWorkReminder] Unbilled work below threshold', { count });
              }
            } catch (error) {
              serverLogger.error('[UnbilledWorkReminder] Failed to check unbilled work', { error });
            }
          });

          serverLogger.info('[Server] Financial cron jobs initialized', { 
            arSnapshot: '0 0 * * *',
            unbilledWorkReminder: '0 9 * * 1'
          });
        } catch (error) {
          serverLogger.error('[Server] Failed to initialize financial cron jobs:', error);
        }
        
        resolve();
      });
    });
  } catch (error) {
    serverLogger.error('[Server] Startup failed:', error);
    throw error;
  }
}

// Start the server
startServer().catch((error) => {
  serverLogger.error('[Server] Fatal error during startup:', error);
  process.exit(1);
});
