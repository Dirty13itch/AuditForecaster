import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from '../logger';

// Define user roles
export type UserRole = 'admin' | 'inspector' | 'partner_contractor';

// Permission constants for each role
export const PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'], // All permissions
  inspector: [
    'view_jobs',
    'complete_inspections',
    'upload_photos',
    'log_time',
    'view_schedule',
  ],
  partner_contractor: [
    'view_jobs',
    'complete_inspections',
    'upload_photos',
    'log_time',
    'view_schedule',
    'create_job',
    'edit_job',
    'upload_plans',
    'download_reports',
  ],
};

/**
 * Check if a user has a specific permission
 * @param userRole - The role of the user
 * @param permission - The permission to check
 * @returns true if the user has the permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = PERMISSIONS[userRole] || [];
  
  // Admin has all permissions
  if (rolePermissions.includes('*')) {
    return true;
  }
  
  return rolePermissions.includes(permission);
}

/**
 * Middleware to require specific permission for route access
 * @param permission - The permission required to access the route
 * @returns Express middleware function
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userRole = (user.role as UserRole) || 'inspector';
    
    if (!hasPermission(userRole, permission)) {
      serverLogger.warn('Permission denied', {
        userId: user.id,
        userRole,
        requiredPermission: permission,
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({ 
        message: 'Forbidden: You do not have permission to perform this action' 
      });
    }
    
    next();
  };
}

/**
 * Middleware to block non-admin users from accessing financial routes
 * SECURITY: Only admin users can access financial data
 * This prevents access to:
 * - /api/invoices
 * - /api/payments
 * - /api/analytics
 * - /api/expenses/approve
 */
export function blockFinancialAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userRole = (user.role as UserRole) || 'inspector';
    
    // Only admins can access financial routes
    if (userRole !== 'admin') {
      serverLogger.warn('Financial access blocked for non-admin user', {
        userId: user.id,
        userRole,
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({ 
        message: 'Forbidden: You do not have access to financial data' 
      });
    }
    
    next();
  };
}
