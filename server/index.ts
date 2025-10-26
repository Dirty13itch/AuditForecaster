import { initSentry, Sentry, isSentryEnabled, captureException } from "./sentry";
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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

const app = express();

if (isSentryEnabled()) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

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
    
    // Register notification routes before other routes
    registerNotificationRoutes(app);
    app.use(testNotificationRoutes);
    serverLogger.info('[Server] Notification routes registered');
    
    // Register main API routes (this creates the HTTP server)
    const server = await registerRoutes(app);
    
    // Setup WebSocket server for real-time notifications
    setupWebSocket(server);
    serverLogger.info('[Server] WebSocket server initialized');
    
    // Store server instance for graceful shutdown
    serverInstance = server;

    app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      captureException(err);
      serverLogger.error(`[Server] Request error: ${message}`, err);

      res.status(status).json({ message });
    });

    if (isSentryEnabled()) {
      app.use(Sentry.Handlers.errorHandler());
    }

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
          startScheduledEmails();
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
