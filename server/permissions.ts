import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from './logger';

export type UserRole = 'admin' | 'inspector' | 'manager' | 'viewer';

/**
 * Middleware to require specific roles for route access
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userRole = (user.role as UserRole) || 'inspector';
    
    if (!allowedRoles.includes(userRole)) {
      serverLogger.warn('Permission denied', {
        userId: user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({ 
        message: 'Forbidden: Insufficient permissions' 
      });
    }
    
    next();
  };
}

/**
 * Check if a user has permission to access a resource based on ownership
 * @param resourceUserId - The ID of the user who owns the resource
 * @param requestUserId - The ID of the user making the request
 * @param userRole - The role of the user making the request
 * @returns true if the user can access the resource
 */
export function checkResourceOwnership(
  resourceUserId: string | null | undefined,
  requestUserId: string,
  userRole: UserRole
): boolean {
  // Admins can access everything
  if (userRole === 'admin') return true;
  
  // Managers can view (but not edit) everything
  if (userRole === 'manager') return true;
  
  // Inspectors and viewers can only access their own resources
  return resourceUserId === requestUserId;
}

/**
 * Check if a user can edit resources
 * @param userRole - The role to check
 * @returns true if the role can edit
 */
export function canEdit(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'inspector';
}

/**
 * Check if a user can view resources
 * @param userRole - The role to check
 * @returns true if the role can view
 */
export function canView(userRole: UserRole): boolean {
  return true; // All authenticated roles can view
}

/**
 * Check if a user can delete resources
 * @param userRole - The role to check
 * @returns true if the role can delete
 */
export function canDelete(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'inspector';
}

/**
 * Check if a user can create resources
 * @param userRole - The role to check
 * @returns true if the role can create
 */
export function canCreate(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'inspector';
}

/**
 * Check if a user can manage system settings
 * @param userRole - The role to check
 * @returns true if the role can manage settings
 */
export function canManageSettings(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Check if a user can view audit logs
 * @param userRole - The role to check
 * @returns true if the role can view audit logs
 */
export function canViewAuditLogs(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'manager';
}

/**
 * Check if a user can export data
 * @param userRole - The role to check
 * @returns true if the role can export data
 */
export function canExportData(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'manager' || userRole === 'inspector';
}
