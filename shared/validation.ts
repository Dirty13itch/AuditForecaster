import { z } from "zod";

/**
 * Reusable Zod validation schemas for common API input patterns
 * These ensure consistent validation across all endpoints
 */

/**
 * UUID validation - used for strict UUID entity IDs
 */
export const uuidSchema = z.string().uuid({
  message: "Invalid ID format. Must be a valid UUID."
});

/**
 * Flexible ID validation - accepts UUID v4 OR slug format
 * Used for entities that support custom IDs (jobs, builders, etc.)
 * Accepts:
 * - UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (where y is 8, 9, a, or b)
 * - Slug format: lowercase alphanumeric with hyphens (e.g., "job-123", "mi-homes-001")
 */
export const flexibleIdSchema = z.string().regex(
  /^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|[a-z0-9-]+)$/i,
  {
    message: "Invalid ID format. Must be a valid UUID v4 or slug format (lowercase letters, numbers, and hyphens)."
  }
);

/**
 * ISO date string validation - accepts both full datetime and date-only formats
 * Examples: "2025-01-15", "2025-01-15T10:30:00Z", "2025-01-15T10:30:00.000Z"
 */
export const isoDateSchema = z.string().refine(
  (val) => {
    // Accept YYYY-MM-DD or ISO 8601 datetime formats
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(val)) {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }
    // Accept full ISO datetime
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  {
    message: "Invalid date format. Use YYYY-MM-DD or ISO 8601 datetime (e.g., 2025-01-15 or 2025-01-15T10:30:00Z)"
  }
);

/**
 * Path parameter validation for single ID (UUID format required)
 * Usage: const { id } = idParamSchema.parse(req.params);
 */
export const idParamSchema = z.object({
  id: uuidSchema
});

/**
 * Path parameter validation for flexible IDs (any string)
 * Used for entities that support custom IDs like jobs
 * Usage: const { id } = flexibleIdParamSchema.parse(req.params);
 */
export const flexibleIdParamSchema = z.object({
  id: flexibleIdSchema
});

/**
 * Query parameter validation for date ranges
 * Usage: const { startDate, endDate } = dateRangeQuerySchema.parse(req.query);
 */
export const dateRangeQuerySchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  },
  {
    message: "startDate must be before or equal to endDate",
    path: ["startDate"]
  }
);

/**
 * Optional query parameter for job ID
 */
export const jobIdQuerySchema = z.object({
  jobId: z.string().uuid().optional()
});

/**
 * Query parameter validation for schedule events endpoint
 * Supports either jobId OR date range, not both
 */
export const scheduleEventsQuerySchema = z.union([
  z.object({
    jobId: uuidSchema,
    startDate: z.undefined().optional(),
    endDate: z.undefined().optional()
  }),
  z.object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    jobId: z.undefined().optional()
  }).refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start <= end;
    },
    {
      message: "startDate must be before or equal to endDate",
      path: ["startDate"]
    }
  )
]);

/**
 * Query parameter validation for Google events endpoint
 */
export const googleEventsQuerySchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  forceSync: z.enum(['true', 'false']).optional()
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  },
  {
    message: "startDate must be before or equal to endDate",
    path: ["startDate"]
  }
);
