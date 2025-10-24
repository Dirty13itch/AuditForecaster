import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { serverLogger } from "./logger";

const app = express();

// Validate SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

// Configure passport local strategy with bcrypt password verification
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      // In development, accept any password for convenience
      if (process.env.NODE_ENV === 'development') {
        return done(null, user);
      }
      
      // In production, verify password with bcrypt
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Type guard to check if user is a valid User object
function isUser(user: Express.User): user is User {
  return (
    typeof user === "object" &&
    user !== null &&
    "id" in user &&
    typeof (user as User).id === "string"
  );
}

// Serialize user to session
passport.serializeUser((user: Express.User, done) => {
  if (isUser(user)) {
    serverLogger.info(`[Passport] Serializing user: ${user.id}`);
    done(null, user.id);
  } else {
    serverLogger.error('[Passport] Cannot serialize - invalid user object');
    done(new Error("Invalid user object"));
  }
});

// Deserialize user from session using storage layer
passport.deserializeUser(async (id: string, done) => {
  try {
    serverLogger.info(`[Passport] Deserializing user ID: ${id}`);
    const user = await storage.getUser(id);
    if (user) {
      serverLogger.info(`[Passport] Successfully deserialized user: ${user.username}`);
    } else {
      serverLogger.warn(`[Passport] User not found for ID: ${id}`);
    }
    done(null, user || null);
  } catch (error) {
    serverLogger.error('[Passport] Deserialization error:', error);
    done(error);
  }
});

// Configure PostgreSQL session store
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  tableName: 'session',
});

// Configure session middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'development-secret-only',
  resave: false,
  saveUninitialized: process.env.NODE_ENV === 'development', // Allow session creation in dev
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Critical for Replit preview environment
  }
}));

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Development auto-login middleware
app.use(async (req, res, next) => {
  const isAuth = req.isAuthenticated();
  serverLogger.info(`[AutoLogin] Request to ${req.path} - isAuthenticated: ${isAuth}, sessionID: ${req.sessionID?.slice(0, 8)}...`);
  
  if (!isAuth && process.env.NODE_ENV === 'development') {
    serverLogger.info('[AutoLogin] User not authenticated, attempting auto-login');
    try {
      // Try to get or create a dev user
      let devUser = await storage.getUserByUsername('dev-user');
      if (!devUser) {
        serverLogger.info('[AutoLogin] Creating new dev-user');
        devUser = await storage.createUser({
          username: 'dev-user',
          password: 'dev-password' // Not hashed in dev mode for convenience
        });
      }
      
      req.login(devUser, (err) => {
        if (err) {
          serverLogger.error('[AutoLogin] Login failed:', err);
          return next();
        }
        
        // Explicitly save the session to ensure it persists
        req.session.save((saveErr) => {
          if (saveErr) {
            serverLogger.error('[AutoLogin] Session save failed:', saveErr);
          } else {
            serverLogger.info(`[AutoLogin] Successfully logged in as dev-user, session saved`);
          }
          next();
        });
      });
    } catch (error) {
      serverLogger.error('[AutoLogin] Error during auto-login:', error);
      next();
    }
  } else {
    if (isAuth) {
      serverLogger.debug(`[AutoLogin] User already authenticated, user: ${(req.user as User)?.username}`);
    }
    next();
  }
});

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
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
    }
  });
})();
