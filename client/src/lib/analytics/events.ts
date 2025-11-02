/**
 * Typed Analytics Events Schema
 * 
 * Defines all analytics events emitted by the application.
 * Used for product analytics, user behavior tracking, and performance monitoring.
 * 
 * @module client/src/lib/analytics/events
 */

import { z } from 'zod';

/**
 * Base properties required for all analytics events
 */
export interface BaseEventProperties {
  actorId: string;        // User ID performing the action
  route: string;          // Current route path
  ts: number;             // Unix timestamp (milliseconds)
  corrId: string;         // Correlation ID (UUID)
  sessionId?: string;     // Session ID (optional)
  tenantId?: string;      // Organization ID (future multi-tenant)
}

/**
 * Event Types (Naming Convention: {verb}_{entity})
 */

// ============================================================================
// Route View Events
// ============================================================================

export interface ViewRouteEvent extends BaseEventProperties {
  type: 'view_route';
  routeName: string;
  category: string;
  maturity: string;
  isMobile: boolean;
  referrer?: string;
}

// ============================================================================
// Search Events
// ============================================================================

export interface SearchEvent extends BaseEventProperties {
  type: 'search_jobs' | 'search_photos' | 'search_builders' | 'search_reports';
  query: string;
  resultCount: number;
  filters?: Record<string, unknown>;
  duration: number; // milliseconds
}

// ============================================================================
// Entity CRUD Events
// ============================================================================

export interface CreateEntityEvent extends BaseEventProperties {
  type: 'create_job' | 'create_photo' | 'create_report' | 'create_expense' | 'create_builder' | 'create_qa_item';
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEntityEvent extends BaseEventProperties {
  type: 'update_job' | 'update_checklist_item' | 'update_photo' | 'update_report';
  entityId: string;
  entityType: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
}

export interface DeleteEntityEvent extends BaseEventProperties {
  type: 'delete_photo' | 'delete_expense' | 'delete_qa_item';
  entityId: string;
  entityType: string;
  reason?: string;
}

// ============================================================================
// Job Status Events
// ============================================================================

export interface UpdateJobStatusEvent extends BaseEventProperties {
  type: 'update_job_status';
  jobId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

// ============================================================================
// Photo Events
// ============================================================================

export interface CapturePhotoEvent extends BaseEventProperties {
  type: 'capture_photo';
  photoId: string;
  jobId: string;
  source: 'camera' | 'upload' | 'webcam';
  fileSize: number;
  tags?: string[];
  isOffline: boolean;
}

export interface AnnotatePhotoEvent extends BaseEventProperties {
  type: 'annotate_photo';
  photoId: string;
  annotationType: 'arrow' | 'text' | 'circle' | 'rectangle';
  annotationCount: number;
}

export interface TagPhotoEvent extends BaseEventProperties {
  type: 'tag_photo';
  photoId: string;
  tagsAdded: string[];
  tagsRemoved: string[];
  totalTags: number;
}

// ============================================================================
// Testing Events
// ============================================================================

export interface CompleteTestEvent extends BaseEventProperties {
  type: 'complete_blower_door_test' | 'complete_duct_leakage_test' | 'complete_ventilation_test';
  testId: string;
  jobId: string;
  testType: string;
  result: 'pass' | 'fail';
  measurements: Record<string, number>;
  duration: number; // milliseconds
}

// ============================================================================
// Report Events
// ============================================================================

export interface GenerateReportEvent extends BaseEventProperties {
  type: 'generate_report';
  reportId: string;
  jobId: string;
  templateId: string;
  format: 'pdf' | 'csv';
  pageCount?: number;
  generationTime: number; // milliseconds
}

export interface ExportReportEvent extends BaseEventProperties {
  type: 'export_report';
  reportId: string;
  format: 'pdf' | 'csv';
  destination: 'download' | 'email';
  recipientCount?: number;
}

// ============================================================================
// Calendar Import Events
// ============================================================================

export interface ImportCalendarEventsEvent extends BaseEventProperties {
  type: 'import_calendar_events';
  calendarId: string;
  eventCount: number;
  successCount: number;
  errorCount: number;
  duration: number;
  errors?: string[];
}

export interface ApproveCalendarEventEvent extends BaseEventProperties {
  type: 'approve_calendar_event';
  eventId: string;
  jobId?: string;
  action: 'approve' | 'reject';
}

// ============================================================================
// Sync Events (Offline)
// ============================================================================

export interface SyncQueueEvent extends BaseEventProperties {
  type: 'sync_queue_upload' | 'sync_queue_complete' | 'sync_queue_error';
  itemCount: number;
  itemType: 'photo' | 'job' | 'expense';
  duration?: number;
  errorMessage?: string;
}

// ============================================================================
// Export Events
// ============================================================================

export interface ExportDataEvent extends BaseEventProperties {
  type: 'export_csv_jobs' | 'export_csv_photos' | 'export_csv_expenses' | 'export_pdf_report';
  exportType: string;
  recordCount: number;
  filters?: Record<string, unknown>;
  fileSize?: number;
}

// ============================================================================
// QA Events
// ============================================================================

export interface CreateQAItemEvent extends BaseEventProperties {
  type: 'create_qa_item';
  qaItemId: string;
  jobId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  assignedTo?: string;
}

export interface ResolveQAItemEvent extends BaseEventProperties {
  type: 'resolve_qa_item';
  qaItemId: string;
  resolution: string;
  resolutionTime: number; // milliseconds since creation
}

// ============================================================================
// Financial Events
// ============================================================================

export interface CreateExpenseEvent extends BaseEventProperties {
  type: 'create_expense';
  expenseId: string;
  amount: number;
  category: string;
  merchant?: string;
  hasReceipt: boolean;
  ocrExtracted: boolean;
}

export interface CreateInvoiceEvent extends BaseEventProperties {
  type: 'create_invoice';
  invoiceId: string;
  builderId: string;
  amount: number;
  lineItemCount: number;
  dueDate: string;
}

// ============================================================================
// Authentication Events
// ============================================================================

export interface LoginEvent extends BaseEventProperties {
  type: 'login';
  provider: 'replit' | 'google';
  isFirstLogin: boolean;
}

export interface LogoutEvent extends BaseEventProperties {
  type: 'logout';
  sessionDuration: number; // milliseconds
}

// ============================================================================
// Error Events
// ============================================================================

export interface ErrorEvent extends BaseEventProperties {
  type: 'error';
  errorCode: string;
  errorMessage: string;
  errorStack?: string;
  errorBoundary?: string;
  recoverable: boolean;
}

// ============================================================================
// Performance Events
// ============================================================================

export interface PerformanceEvent extends BaseEventProperties {
  type: 'performance_lcp' | 'performance_fid' | 'performance_cls' | 'performance_ttfb';
  metricName: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
}

// ============================================================================
// Union Type for All Events
// ============================================================================

export type AnalyticsEvent =
  | ViewRouteEvent
  | SearchEvent
  | CreateEntityEvent
  | UpdateEntityEvent
  | DeleteEntityEvent
  | UpdateJobStatusEvent
  | CapturePhotoEvent
  | AnnotatePhotoEvent
  | TagPhotoEvent
  | CompleteTestEvent
  | GenerateReportEvent
  | ExportReportEvent
  | ImportCalendarEventsEvent
  | ApproveCalendarEventEvent
  | SyncQueueEvent
  | ExportDataEvent
  | CreateQAItemEvent
  | ResolveQAItemEvent
  | CreateExpenseEvent
  | CreateInvoiceEvent
  | LoginEvent
  | LogoutEvent
  | ErrorEvent
  | PerformanceEvent;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const baseEventPropertiesSchema = z.object({
  actorId: z.string(),
  route: z.string(),
  ts: z.number(),
  corrId: z.string().uuid(),
  sessionId: z.string().optional(),
  tenantId: z.string().optional(),
});

export const viewRouteEventSchema = baseEventPropertiesSchema.extend({
  type: z.literal('view_route'),
  routeName: z.string(),
  category: z.string(),
  maturity: z.string(),
  isMobile: z.boolean(),
  referrer: z.string().optional(),
});

export const searchEventSchema = baseEventPropertiesSchema.extend({
  type: z.enum(['search_jobs', 'search_photos', 'search_builders', 'search_reports']),
  query: z.string(),
  resultCount: z.number(),
  filters: z.record(z.unknown()).optional(),
  duration: z.number(),
});

// ============================================================================
// Analytics Client
// ============================================================================

/**
 * Analytics client for emitting events
 */
export class AnalyticsClient {
  private endpoint: string;
  private batchSize: number;
  private batchTimeout: number;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options?: {
    endpoint?: string;
    batchSize?: number;
    batchTimeout?: number;
  }) {
    this.endpoint = options?.endpoint || '/api/analytics/events';
    this.batchSize = options?.batchSize || 10;
    this.batchTimeout = options?.batchTimeout || 5000; // 5 seconds
  }

  /**
   * Track an analytics event
   */
  track(event: Omit<AnalyticsEvent, 'ts' | 'corrId'>): void {
    const enrichedEvent: AnalyticsEvent = {
      ...event,
      ts: Date.now(),
      corrId: crypto.randomUUID(),
    } as AnalyticsEvent;

    this.eventQueue.push(enrichedEvent);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    } else {
      // Schedule flush
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.batchTimeout);
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Take events from queue
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error('Failed to send analytics events', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Flush on page unload
   */
  flushBeforeUnload(): void {
    if (this.eventQueue.length === 0) return;

    // Use sendBeacon for reliable delivery on page unload
    const blob = new Blob([JSON.stringify({ events: this.eventQueue })], {
      type: 'application/json',
    });
    
    navigator.sendBeacon(this.endpoint, blob);
    this.eventQueue = [];
  }
}

/**
 * Global analytics instance
 */
export const analytics = new AnalyticsClient();

/**
 * Initialize analytics with page unload handler
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analytics.flushBeforeUnload();
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate correlation ID
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Get current user ID from session
 */
export function getCurrentUserId(): string | undefined {
  // This should be replaced with actual session logic
  return undefined;
}

/**
 * Get current route
 */
export function getCurrentRoute(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
}
