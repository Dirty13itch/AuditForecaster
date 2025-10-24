import { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { serverLogger } from "./logger";

// Type guard to check if req.user is a valid User object with an id
function isUserWithId(user: unknown): user is User {
  return (
    typeof user === "object" &&
    user !== null &&
    "id" in user &&
    typeof (user as User).id === "string"
  );
}

// Authentication middleware using passport
// This checks for authenticated user in the session populated by passport
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via passport session
  const isAuth = req.isAuthenticated();
  
  if (isAuth) {
    serverLogger.debug(`[Auth] ✓ Request to ${req.path} authenticated - User: ${(req.user as User)?.username || 'unknown'}`);
    return next();
  }
  
  // Log authentication failure for debugging (redacted for security)
  serverLogger.error(`[Auth] ✗ Request to ${req.path} FAILED authentication`);
  serverLogger.error(`[Auth]   - Session ID: ${req.sessionID?.slice(0, 8)}...`);
  serverLogger.error(`[Auth]   - req.user: ${req.user ? `{id: ${(req.user as any).id}, username: ${(req.user as any).username}}` : 'null/undefined'}`);
  serverLogger.error(`[Auth]   - req.session: ${req.session ? 'exists' : 'null/undefined'}`);
  serverLogger.error(`[Auth]   - req.session.passport: ${req.session?.passport ? JSON.stringify(req.session.passport) : 'not found'}`);
  
  // User is not authenticated, return 401 Unauthorized
  res.status(401).json({ 
    message: "Authentication required. Please log in to access this resource." 
  });
}

// Helper to get user ID from request
// Returns the user ID from the passport session
export function getUserId(req: Request): string | undefined {
  // req.user is populated by passport after successful authentication
  if (isUserWithId(req.user)) {
    return req.user.id;
  }
  return undefined;
}
