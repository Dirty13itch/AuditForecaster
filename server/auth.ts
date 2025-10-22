import { Request, Response, NextFunction } from "express";

// Authentication middleware using passport
// This checks for authenticated user in the session populated by passport
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via passport session
  if (req.isAuthenticated()) {
    return next();
  }
  
  // User is not authenticated, return 401 Unauthorized
  res.status(401).json({ 
    message: "Authentication required. Please log in to access this resource." 
  });
}

// Helper to get user ID from request
// Returns the user ID from the passport session
export function getUserId(req: Request): string | undefined {
  // req.user is populated by passport after successful authentication
  return (req.user as any)?.id;
}
