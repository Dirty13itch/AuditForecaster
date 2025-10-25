import type { Request, Response } from 'express';
import { serverLogger } from '../logger';
import { storage } from '../storage';
import { getConfig } from '../config';

/**
 * Check if dev mode bypass is enabled
 * Only works in development environment
 */
export function isDevModeEnabled(): boolean {
  const config = getConfig();
  const devModeBypass = process.env.DEV_MODE_BYPASS === 'true';
  
  // Only allow in development
  if (config.isProduction && devModeBypass) {
    serverLogger.error('[DevMode] DEV_MODE_BYPASS is enabled in production! This is a security risk.');
    return false;
  }
  
  return config.isDevelopment && devModeBypass;
}

/**
 * Development mode login endpoint
 * Bypasses OAuth and creates a mock session for testing
 * ONLY WORKS IN DEVELOPMENT MODE
 */
export async function devModeLogin(req: Request, res: Response) {
  // Check if dev mode is enabled
  if (!isDevModeEnabled()) {
    serverLogger.error('[DevMode] Attempted to use dev login but DEV_MODE_BYPASS is not enabled');
    return res.status(403).json({
      error: 'Development mode is not enabled',
      message: 'Set DEV_MODE_BYPASS=true in development environment to use this endpoint',
    });
  }
  
  const { userId, email } = req.query;
  
  if (!userId && !email) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Provide either userId or email query parameter',
      example: '/api/dev/login-as?userId=123 or /api/dev/login-as?email=test@example.com',
    });
  }
  
  try {
    let user;
    
    // Find or create user
    if (userId) {
      user = await storage.getUser(userId as string);
      if (!user) {
        // Create mock user with userId
        await storage.upsertUser({
          id: userId as string,
          email: `dev-${userId}@example.com`,
          firstName: 'Dev',
          lastName: 'User',
          profileImageUrl: null,
        });
        user = await storage.getUser(userId as string);
      }
    } else if (email) {
      // Try to find user by email
      const users = await storage.getUsers();
      user = users.find(u => u.email === email);
      
      if (!user) {
        // Create mock user with email
        const mockUserId = `dev-${Date.now()}`;
        await storage.upsertUser({
          id: mockUserId,
          email: email as string,
          firstName: 'Dev',
          lastName: 'User',
          profileImageUrl: null,
        });
        user = await storage.getUser(mockUserId);
      }
    }
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not find or create user',
      });
    }
    
    // Create mock session
    const mockUser = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      },
      access_token: 'dev-mode-token',
      refresh_token: 'dev-mode-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };
    
    // Attach to session
    (req as any).user = mockUser;
    
    // Save session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    serverLogger.warn('[DevMode] ⚠️  DEV MODE LOGIN BYPASS USED', {
      userId: user.id,
      email: user.email,
      warning: 'This bypasses OAuth authentication - DEVELOPMENT ONLY',
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      warning: '⚠️  Development mode bypass - not a real OAuth login',
      message: 'Mock session created. You are now logged in without OAuth.',
    });
  } catch (error) {
    serverLogger.error('[DevMode] Error during dev login:', error);
    res.status(500).json({
      error: 'Dev login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check if current session is using dev mode auth
 */
export function isDevModeSession(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return false;
  
  return user.access_token === 'dev-mode-token' || user.refresh_token === 'dev-mode-refresh';
}

/**
 * Get dev mode status for client
 */
export function getDevModeStatus(req: Request) {
  return {
    enabled: isDevModeEnabled(),
    activeSession: isDevModeSession(req),
  };
}
