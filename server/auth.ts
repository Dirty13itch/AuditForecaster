import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import memoize from "memoizee";

// Store for OIDC config
let oidcConfigCache: any = null;

// Helper function for diagnostics endpoint
export const getOidcConfig = memoize(
  async () => {
    if (oidcConfigCache) return oidcConfigCache;
    
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    serverLogger.info(`[Auth] Discovering OIDC configuration from ${issuerUrl}`);
    
    oidcConfigCache = await client.discovery(
      new URL(issuerUrl),
      process.env.REPL_ID!
    );
    
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
      secure: true,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// CRITICAL: This function ensures we properly store the database user data
async function upsertUserAndStoreInSession(claims: any) {
  const email = claims["email"];
  const id = claims["sub"];
  
  serverLogger.info(`[Auth] Processing login for user: ${email} (ID: ${id})`);
  
  // Check if this is the critical admin user
  if (email === "shaun.ulrich@ulrichenergyauditing.com") {
    serverLogger.info(`[Auth] ADMIN USER DETECTED: ${email}`);
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
  
  // Build user data for upsert - DO NOT override existing role
  const userData: any = {
    id: id,
    email: email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  
  // CRITICAL FIX: Always ensure shaun.ulrich@ulrichenergyauditing.com is admin
  if (email === "shaun.ulrich@ulrichenergyauditing.com" || id === "3pve-s") {
    userData.role = "admin";
    serverLogger.info(`[Auth] FORCING ADMIN ROLE for ${email} (ID: ${id})`);
  } else if (!existingUser) {
    // For new users (not the special admin), set default role
    userData.role = "inspector"; // Default role for new users
  }
  // If user exists and is not the special admin, preserve their existing role by not including it
  
  // Upsert the user
  const user = await storage.upsertUser(userData);
  
  serverLogger.info(`[Auth] User after upsert:`, {
    id: user.id,
    email: user.email,
    role: user.role,
  });
  
  // CRITICAL: Return the full database user object with the correct role
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

  // OIDC discovery
  const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
  const config = await client.discovery(
    new URL(issuerUrl),
    process.env.REPL_ID!
  );

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      // Get the full user from database with their correct role
      const dbUser = await upsertUserAndStoreInSession(tokens.claims());
      
      // Create the session user object with ALL database fields
      const sessionUser = {
        // Include ALL database user fields
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        role: dbUser.role, // CRITICAL: Include the database role
        // Add OIDC session data
        claims: tokens.claims(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.claims()?.exp,
      };
      
      serverLogger.info(`[Auth] Session user created with role: ${sessionUser.role}`);
      
      return verified(null, sessionUser);
    } catch (error) {
      serverLogger.error('[Auth] Error in verify function:', error);
      return verified(error as Error);
    }
  };

  // Register strategies for each domain
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const trimmedDomain = domain.trim();
    const strategyName = `replitauth:${trimmedDomain}`;
    
    passport.use(
      strategyName,
      new Strategy(
        {
          config,
          client_id: process.env.REPL_ID!,
          params: {
            redirect_uri: `https://${trimmedDomain}/api/callback`,
            scope: "openid email profile",
          },
        },
        verify
      )
    );
    
    serverLogger.info(`[Auth] Registered strategy: ${strategyName}`);
  }

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    // Store the entire user object in session
    done(null, user);
  });

  passport.deserializeUser(async (sessionUser: any, done) => {
    try {
      // Refresh user data from database to ensure role is current
      const currentUser = await storage.getUser(sessionUser.id);
      
      if (currentUser) {
        // Update session with current database values
        sessionUser.role = currentUser.role;
        sessionUser.firstName = currentUser.firstName;
        sessionUser.lastName = currentUser.lastName;
        sessionUser.email = currentUser.email;
        
        // CRITICAL FIX: Always ensure the special admin user has admin role
        if (sessionUser.email === "shaun.ulrich@ulrichenergyauditing.com" || sessionUser.id === "3pve-s") {
          sessionUser.role = "admin";
          serverLogger.info(`[Auth] Ensuring admin role in deserialization for ${sessionUser.email}`);
        }
        
        serverLogger.debug(`[Auth] Deserialized user with role: ${sessionUser.role}`);
      }
      
      done(null, sessionUser);
    } catch (error) {
      serverLogger.error('[Auth] Error deserializing user:', error);
      done(error);
    }
  });

  // Auth routes
  app.get("/api/login", (req, res) => {
    const hostname = req.hostname;
    const strategy = `replitauth:${hostname}`;
    
    serverLogger.info(`[Auth] Login initiated for domain: ${hostname}`);
    
    passport.authenticate(strategy)(req, res);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    const strategy = `replitauth:${hostname}`;
    
    passport.authenticate(strategy, async (err: any, user: any) => {
      if (err || !user) {
        serverLogger.error('[Auth] Callback error:', err);
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

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Return user data including role
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role, // CRITICAL: Include role in response
    });
  });
}

// Middleware to protect routes
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user) {
    serverLogger.warn('[Auth] Unauthenticated request');
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Verify token hasn't expired
  const now = Math.floor(Date.now() / 1000);
  if (user.expires_at && user.expires_at < now) {
    serverLogger.warn('[Auth] Token expired for user:', user.email);
    return res.status(401).json({ message: "Session expired" });
  }
  
  next();
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