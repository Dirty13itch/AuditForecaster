/**
 * API Endpoints for [FEATURE NAME]
 * 
 * This file contains all API route handlers for [feature] with:
 * - Authentication & authorization
 * - Request validation (Zod schemas)
 * - Error handling & logging
 * - CSRF protection
 * - Performance tracking
 * 
 * TODO: Replace [FEATURE], [Resource], [table] placeholders
 * TODO: Customize validation schemas, authorization rules, business logic
 * TODO: Add to server/routes.ts registerRoutes() function
 * 
 * @see {@link ../PRODUCTION_STANDARDS.md Production Standards}
 * @see {@link ../shared/schema.ts Database Schema}
 */

import type { Express } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { isAuthenticated, requireRole, canEdit, canDelete } from './permissions';
import { csrfSynchronisedProtection } from './csrf';
import { createAuditLog } from './auditLogger';
import { serverLogger } from './logger';
import * as Sentry from '@sentry/node';
import { 
  insert[Resource]Schema, 
  update[Resource]Schema, 
  type Select[Resource] 
} from '@shared/schema';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Query parameters for listing resources (pagination, filtering)
 * TODO: Customize filters for your feature
 */
const list[Resources]QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Feature-specific filters
  // TODO: Add filters relevant to your feature
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().max(100).optional(),
  userId: z.string().uuid().optional(), // Filter by user
});

/**
 * Route parameter validation (e.g., :id in URL)
 */
const [resource]IdParamSchema = z.object({
  id: z.string().uuid('Invalid [resource] ID format'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Handle validation errors (Zod errors)
 */
function handleValidationError(error: unknown): { status: number; message: string } {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    const fieldName = firstError.path.join('.');
    return {
      status: 400,
      message: `Validation failed: ${firstError.message}${fieldName ? ` (${fieldName})` : ''}`,
    };
  }
  return { status: 400, message: 'Invalid request data' };
}

/**
 * Handle database errors
 */
function handleDatabaseError(error: unknown, operation: string): { status: number; message: string } {
  serverLogger.error('[Database Error]', { operation, error });
  return {
    status: 500,
    message: 'An error occurred while processing your request. Please try again.',
  };
}

/**
 * Log request performance
 */
function logPerformance(
  operation: string, 
  startTime: number, 
  metadata?: Record<string, any>
) {
  const duration = Date.now() - startTime;
  serverLogger.info(`[Performance] ${operation}`, {
    duration,
    ...metadata,
  });
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * Register all [feature] routes
 * Call this from server/routes.ts registerRoutes() function
 */
export function register[Feature]Routes(app: Express) {
  
  // ============================================================================
  // CREATE [RESOURCE] - POST /api/[resources]
  // ============================================================================
  
  /**
   * Create a new [resource]
   * 
   * @route POST /api/[resources]
   * @auth Required - Admin, Inspector (or customize)
   * @returns 201 - Created [resource]
   * @returns 400 - Validation error
   * @returns 401 - Not authenticated
   * @returns 403 - Not authorized
   * @returns 500 - Server error
   */
  app.post(
    '/api/[resources]',
    isAuthenticated,
    csrfSynchronisedProtection,
    // requireRole(['admin', 'inspector']), // TODO: Customize allowed roles
    async (req: any, res) => {
      const startTime = Date.now();
      const userId = req.user.id;
      const userRole = req.user.role;

      try {
        // 1. Validate request body
        const parseResult = insert[Resource]Schema.safeParse(req.body);
        
        if (!parseResult.success) {
          const { status, message } = handleValidationError(parseResult.error);
          return res.status(status).json({ error: message });
        }

        const data = parseResult.data;

        // 2. Authorization checks
        // TODO: Customize authorization logic for your feature
        
        // Example: Inspectors can only create for themselves
        // if (userRole === 'inspector' && data.userId !== userId) {
        //   return res.status(403).json({ 
        //     error: 'Cannot create [resource] for other users'
        //   });
        // }

        // 3. Business logic validation
        // TODO: Add feature-specific validation
        
        // Example: Check for duplicates
        // const existing = await storage.get[Resource]ByName(data.name);
        // if (existing) {
        //   return res.status(409).json({
        //     error: 'A [resource] with this name already exists',
        //   });
        // }

        // 4. Create resource in database
        const [resource] = await storage.create[Resource](data);

        if (![resource]) {
          throw new Error('[Resource] creation failed');
        }

        // 5. Audit logging
        await createAuditLog({
          userId,
          action: 'create',
          resourceType: '[resource]',
          resourceId: [resource].id,
          metadata: { name: data.name },
        });

        // 6. Performance logging
        logPerformance('Create [Resource]', startTime, {
          [resource]Id: [resource].id,
          userId,
        });

        // 7. Success response
        return res.status(201).json([resource]);

      } catch (error) {
        // Error handling with Sentry context
        Sentry.withScope((scope) => {
          scope.setContext('request', {
            body: req.body,
            userId,
            userRole,
          });
          scope.setLevel('error');
          Sentry.captureException(error);
        });

        serverLogger.error('[API/[Resources]/Create] Failed to create [resource]', {
          error,
          userId,
          requestBody: req.body,
        });

        const { status, message } = handleDatabaseError(error, 'create [resource]');
        return res.status(status).json({ error: message });
      }
    }
  );

  // ============================================================================
  // LIST [RESOURCES] - GET /api/[resources]
  // ============================================================================
  
  /**
   * Get all [resources] with filtering and pagination
   * 
   * @route GET /api/[resources]?page=1&limit=20&status=active
   * @auth Required
   * @returns 200 - List of [resources] with pagination metadata
   * @returns 400 - Invalid query parameters
   * @returns 401 - Not authenticated
   * @returns 500 - Server error
   */
  app.get(
    '/api/[resources]',
    isAuthenticated,
    async (req: any, res) => {
      const startTime = Date.now();
      const userId = req.user.id;
      const userRole = req.user.role;

      try {
        // 1. Validate query parameters
        const parseResult = list[Resources]QuerySchema.safeParse(req.query);
        
        if (!parseResult.success) {
          const { status, message } = handleValidationError(parseResult.error);
          return res.status(status).json({ error: message });
        }

        const { page, limit, sortBy, sortOrder, ...filters } = parseResult.data;

        // 2. Authorization filtering
        // TODO: Customize data access rules
        
        // Example: Inspectors only see their own resources
        // const effectiveFilters = { ...filters };
        // if (userRole === 'inspector') {
        //   effectiveFilters.userId = userId;
        // }

        // 3. Fetch resources from database
        const { data, total } = await storage.get[Resources]({
          page,
          limit,
          sortBy,
          sortOrder,
          ...filters, // or effectiveFilters if using authorization filtering
        });

        // 4. Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // 5. Performance logging
        logPerformance('List [Resources]', startTime, {
          userId,
          resultCount: data.length,
          page,
        });

        // 6. Success response
        return res.status(200).json({
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPreviousPage,
          },
        });

      } catch (error) {
        Sentry.captureException(error);
        
        serverLogger.error('[API/[Resources]/List] Failed to fetch [resources]', {
          error,
          userId,
          queryParams: req.query,
        });

        const { status, message } = handleDatabaseError(error, 'fetch [resources]');
        return res.status(status).json({ error: message });
      }
    }
  );

  // ============================================================================
  // GET [RESOURCE] BY ID - GET /api/[resources]/:id
  // ============================================================================
  
  /**
   * Get a single [resource] by ID
   * 
   * @route GET /api/[resources]/:id
   * @auth Required
   * @returns 200 - [Resource] details
   * @returns 400 - Invalid ID format
   * @returns 401 - Not authenticated
   * @returns 403 - Not authorized to view this [resource]
   * @returns 404 - [Resource] not found
   * @returns 500 - Server error
   */
  app.get(
    '/api/[resources]/:id',
    isAuthenticated,
    async (req: any, res) => {
      const startTime = Date.now();
      const userId = req.user.id;
      const userRole = req.user.role;

      try {
        // 1. Validate URL parameter
        const parseResult = [resource]IdParamSchema.safeParse(req.params);
        
        if (!parseResult.success) {
          const { status, message } = handleValidationError(parseResult.error);
          return res.status(status).json({ error: message });
        }

        const { id } = parseResult.data;

        // 2. Fetch resource from database
        const [resource] = await storage.get[Resource](id);

        if (![resource]) {
          return res.status(404).json({
            error: '[Resource] not found',
            message: 'The requested [resource] does not exist or has been deleted.',
          });
        }

        // 3. Authorization check (resource ownership)
        // TODO: Customize based on your feature's access control
        
        // Example: Inspectors can only view their own resources
        // if (userRole === 'inspector' && [resource].userId !== userId) {
        //   return res.status(403).json({
        //     error: 'Access denied',
        //     message: 'You do not have permission to view this [resource].',
        //   });
        // }

        // 4. Performance logging
        logPerformance('Get [Resource]', startTime, {
          [resource]Id: id,
          userId,
        });

        // 5. Success response
        return res.status(200).json([resource]);

      } catch (error) {
        Sentry.captureException(error);
        
        serverLogger.error('[API/[Resources]/GetById] Failed to fetch [resource]', {
          error,
          [resource]Id: req.params.id,
          userId,
        });

        const { status, message } = handleDatabaseError(error, 'fetch [resource]');
        return res.status(status).json({ error: message });
      }
    }
  );

  // ============================================================================
  // UPDATE [RESOURCE] - PATCH /api/[resources]/:id
  // ============================================================================
  
  /**
   * Update an existing [resource]
   * 
   * @route PATCH /api/[resources]/:id
   * @auth Required
   * @returns 200 - Updated [resource]
   * @returns 400 - Validation error or invalid ID
   * @returns 401 - Not authenticated
   * @returns 403 - Not authorized to update this [resource]
   * @returns 404 - [Resource] not found
   * @returns 500 - Server error
   */
  app.patch(
    '/api/[resources]/:id',
    isAuthenticated,
    csrfSynchronisedProtection,
    async (req: any, res) => {
      const startTime = Date.now();
      const userId = req.user.id;
      const userRole = req.user.role;

      try {
        // 1. Validate URL parameter
        const paramResult = [resource]IdParamSchema.safeParse(req.params);
        if (!paramResult.success) {
          const { status, message } = handleValidationError(paramResult.error);
          return res.status(status).json({ error: message });
        }
        const { id } = paramResult.data;

        // 2. Validate request body
        const bodyResult = update[Resource]Schema.safeParse(req.body);
        if (!bodyResult.success) {
          const { status, message } = handleValidationError(bodyResult.error);
          return res.status(status).json({ error: message });
        }
        const updateData = bodyResult.data;

        // 3. Check resource exists
        const existing[Resource] = await storage.get[Resource](id);
        if (!existing[Resource]) {
          return res.status(404).json({
            error: '[Resource] not found',
            message: 'The requested [resource] does not exist or has been deleted.',
          });
        }

        // 4. Authorization check
        // TODO: Customize authorization logic
        
        // Example: Inspectors can only edit their own resources
        // if (userRole === 'inspector' && existing[Resource].userId !== userId) {
        //   return res.status(403).json({
        //     error: 'Access denied',
        //     message: 'You do not have permission to update this [resource].',
        //   });
        // }

        // Alternative: Use permission helper
        // if (!canEdit(req.user, existing[Resource])) {
        //   return res.status(403).json({
        //     error: 'Access denied',
        //     message: 'You do not have permission to update this [resource].',
        //   });
        // }

        // 5. Business logic validation
        // TODO: Add feature-specific validation
        
        // Example: Prevent status change if [condition]
        // if (updateData.status === 'archived' && existing[Resource].hasActiveDependencies) {
        //   return res.status(400).json({
        //     error: 'Cannot archive [resource] with active dependencies',
        //   });
        // }

        // 6. Update resource in database
        const updated[Resource] = await storage.update[Resource](id, updateData);

        if (!updated[Resource]) {
          throw new Error('[Resource] update failed');
        }

        // 7. Audit logging
        await createAuditLog({
          userId,
          action: 'update',
          resourceType: '[resource]',
          resourceId: id,
          metadata: { 
            changes: updateData,
            previousState: existing[Resource],
          },
        });

        // 8. Performance logging
        logPerformance('Update [Resource]', startTime, {
          [resource]Id: id,
          userId,
        });

        // 9. Success response
        return res.status(200).json(updated[Resource]);

      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setContext('request', {
            body: req.body,
            params: req.params,
            userId,
            userRole,
          });
          Sentry.captureException(error);
        });

        serverLogger.error('[API/[Resources]/Update] Failed to update [resource]', {
          error,
          [resource]Id: req.params.id,
          userId,
          updateData: req.body,
        });

        const { status, message } = handleDatabaseError(error, 'update [resource]');
        return res.status(status).json({ error: message });
      }
    }
  );

  // ============================================================================
  // DELETE [RESOURCE] - DELETE /api/[resources]/:id
  // ============================================================================
  
  /**
   * Delete a [resource]
   * 
   * @route DELETE /api/[resources]/:id
   * @auth Required - Admin only (or customize)
   * @returns 200 - [Resource] deleted successfully
   * @returns 400 - Invalid ID format
   * @returns 401 - Not authenticated
   * @returns 403 - Not authorized (admin only)
   * @returns 404 - [Resource] not found
   * @returns 500 - Server error
   */
  app.delete(
    '/api/[resources]/:id',
    isAuthenticated,
    csrfSynchronisedProtection,
    requireRole(['admin']), // TODO: Customize allowed roles
    async (req: any, res) => {
      const startTime = Date.now();
      const userId = req.user.id;

      try {
        // 1. Validate URL parameter
        const parseResult = [resource]IdParamSchema.safeParse(req.params);
        if (!parseResult.success) {
          const { status, message } = handleValidationError(parseResult.error);
          return res.status(status).json({ error: message });
        }
        const { id } = parseResult.data;

        // 2. Check resource exists
        const existing[Resource] = await storage.get[Resource](id);
        if (!existing[Resource]) {
          return res.status(404).json({
            error: '[Resource] not found',
            message: 'The requested [resource] does not exist or has been deleted.',
          });
        }

        // 3. Business logic validation
        // TODO: Add feature-specific validation
        
        // Example: Prevent deletion if [condition]
        // if (existing[Resource].hasActiveReferences) {
        //   return res.status(400).json({
        //     error: 'Cannot delete [resource] with active references',
        //     message: 'Please remove all references before deleting.',
        //   });
        // }

        // 4. Delete resource from database
        await storage.delete[Resource](id);

        // 5. Audit logging
        await createAuditLog({
          userId,
          action: 'delete',
          resourceType: '[resource]',
          resourceId: id,
          metadata: { 
            deletedResource: existing[Resource],
          },
        });

        // 6. Performance logging
        logPerformance('Delete [Resource]', startTime, {
          [resource]Id: id,
          userId,
        });

        // 7. Success response
        return res.status(200).json({
          message: '[Resource] deleted successfully',
        });

      } catch (error) {
        Sentry.captureException(error);
        
        serverLogger.error('[API/[Resources]/Delete] Failed to delete [resource]', {
          error,
          [resource]Id: req.params.id,
          userId,
        });

        const { status, message } = handleDatabaseError(error, 'delete [resource]');
        return res.status(status).json({ error: message });
      }
    }
  );

  // ============================================================================
  // CUSTOM ENDPOINTS (Feature-Specific)
  // ============================================================================
  
  /**
   * TODO: Add feature-specific endpoints here
   * 
   * Examples:
   * - POST /api/[resources]/:id/archive - Archive a [resource]
   * - POST /api/[resources]/:id/restore - Restore archived [resource]
   * - GET /api/[resources]/:id/history - Get change history
   * - POST /api/[resources]/bulk-delete - Bulk delete [resources]
   * - GET /api/[resources]/stats - Get aggregate statistics
   */

  // Example: Archive endpoint
  // app.post(
  //   '/api/[resources]/:id/archive',
  //   isAuthenticated,
  //   csrfSynchronisedProtection,
  //   async (req: any, res) => {
  //     // Implementation here
  //   }
  // );
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export route registration function
// Import this in server/routes.ts and call in registerRoutes()
// Example: import { register[Feature]Routes } from './[feature]-routes';
//          register[Feature]Routes(app);
