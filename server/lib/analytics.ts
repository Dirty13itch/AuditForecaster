/**
 * Analytics Event System - AAA Blueprint Observability
 * 
 * Typed analytics event infrastructure for tracking user actions and system operations.
 * Integrates with correlation ID middleware for end-to-end tracing.
 * 
 * Event Taxonomy (per AAA Blueprint):
 * - view_route: Page/route views
 * - search_entity: Entity search operations
 * - create_entity: Entity creation
 * - update_entity: Entity updates
 * - delete_entity: Entity deletion
 * - import_data: Data import operations
 * - export_data: Data export operations
 * 
 * Required fields: actorId, route, timestamp, correlationId, metadata
 */

import { serverLogger } from '../logger';

/**
 * Optional Analytics Provider Integration
 * 
 * Supports PostHog, Mixpanel, or Segment based on environment configuration.
 * Falls back to logging-only mode if no provider is configured.
 */
let analyticsProvider: 'posthog' | 'mixpanel' | 'segment' | null = null;
let posthog: any = null;
let mixpanel: any = null;
let segmentAnalytics: any = null;

// Initialize analytics provider based on environment
const ANALYTICS_PROVIDER = process.env.ANALYTICS_PROVIDER;
const POSTHOG_KEY = process.env.POSTHOG_API_KEY;
const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN;
const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY;

async function initializeAnalyticsProvider() {
  if (ANALYTICS_PROVIDER === 'posthog' && POSTHOG_KEY) {
    try {
      const { PostHog } = await import('posthog-node');
      posthog = new PostHog(POSTHOG_KEY, {
        host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      });
      analyticsProvider = 'posthog';
      serverLogger.info('[Analytics] PostHog provider initialized');
    } catch (error) {
      serverLogger.warn('[Analytics] PostHog initialization failed', { error });
    }
  } else if (ANALYTICS_PROVIDER === 'mixpanel' && MIXPANEL_TOKEN) {
    try {
      const Mixpanel = await import('mixpanel');
      mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
      analyticsProvider = 'mixpanel';
      serverLogger.info('[Analytics] Mixpanel provider initialized');
    } catch (error) {
      serverLogger.warn('[Analytics] Mixpanel initialization failed', { error });
    }
  } else if (ANALYTICS_PROVIDER === 'segment' && SEGMENT_WRITE_KEY) {
    try {
      const { Analytics } = await import('@segment/analytics-node');
      segmentAnalytics = new Analytics({ writeKey: SEGMENT_WRITE_KEY });
      analyticsProvider = 'segment';
      serverLogger.info('[Analytics] Segment provider initialized');
    } catch (error) {
      serverLogger.warn('[Analytics] Segment initialization failed', { error });
    }
  }
  
  if (!analyticsProvider) {
    serverLogger.info('[Analytics] No provider configured - using logging-only mode');
  }
}

// Initialize on module load
initializeAnalyticsProvider().catch((error) => {
  serverLogger.error('[Analytics] Provider initialization error', { error });
});

/**
 * Entity types tracked by analytics
 */
export type EntityType =
  | 'job'
  | 'builder'
  | 'plan'
  | 'address'
  | 'photo'
  | 'report'
  | 'schedule_event'
  | 'pending_event'
  | 'google_event'
  | 'calendar_preference'
  | 'user'
  | 'qa_item'
  | 'qa_checklist'
  | 'qa_checklist_item'
  | 'qa_checklist_response'
  | 'qa_inspection_score'
  | 'expense'
  | 'equipment'
  | 'test_result'
  | 'blower_door_test'
  | 'duct_leakage_test'
  | 'ventilation_test'
  | 'tax_credit_project'
  | 'tax_credit_requirement'
  | 'tax_credit_document'
  | 'unit_certification'
  | 'inspector_preferences'
  | 'financial_settings';

/**
 * Analytics event types following AAA Blueprint taxonomy
 */
export type AnalyticsEventType =
  | 'view_route'
  | 'search_entity'
  | 'create_entity'
  | 'update_entity'
  | 'delete_entity'
  | 'import_data'
  | 'export_data';

/**
 * Import/Export types for data operations
 */
export type ImportExportType =
  | 'calendar_events'
  | 'jobs_csv'
  | 'builders_csv'
  | 'photos_zip'
  | 'reports_pdf'
  | 'tec_auto_test';

/**
 * Base analytics event structure (all events extend this)
 */
export interface BaseAnalyticsEvent {
  /** User who performed the action */
  actorId: string;
  
  /** Route/page where action occurred */
  route: string;
  
  /** Event timestamp (ISO 8601) */
  timestamp: string;
  
  /** Correlation ID for request tracing */
  correlationId: string;
  
  /** Event-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Route view event
 */
export interface RouteViewEvent extends BaseAnalyticsEvent {
  type: 'view_route';
  metadata?: {
    referrer?: string;
    duration?: number;
  };
}

/**
 * Entity search event
 */
export interface SearchEntityEvent extends BaseAnalyticsEvent {
  type: 'search_entity';
  entityType: EntityType;
  metadata: {
    query: string;
    resultCount: number;
    filters?: Record<string, unknown>;
  };
}

/**
 * Entity creation event
 */
export interface CreateEntityEvent extends BaseAnalyticsEvent {
  type: 'create_entity';
  entityType: EntityType;
  entityId: string;
  metadata?: {
    source?: string;
    [key: string]: unknown;
  };
}

/**
 * Entity update event
 */
export interface UpdateEntityEvent extends BaseAnalyticsEvent {
  type: 'update_entity';
  entityType: EntityType;
  entityId: string;
  metadata?: {
    fieldsChanged?: string[];
    [key: string]: unknown;
  };
}

/**
 * Entity deletion event
 */
export interface DeleteEntityEvent extends BaseAnalyticsEvent {
  type: 'delete_entity';
  entityType: EntityType;
  entityId: string;
  metadata?: {
    reason?: string;
    [key: string]: unknown;
  };
}

/**
 * Data import event
 */
export interface ImportDataEvent extends BaseAnalyticsEvent {
  type: 'import_data';
  importType: ImportExportType;
  metadata: {
    source: string;
    recordCount: number;
    successCount: number;
    errorCount: number;
    [key: string]: unknown;
  };
}

/**
 * Data export event
 */
export interface ExportDataEvent extends BaseAnalyticsEvent {
  type: 'export_data';
  exportType: ImportExportType;
  metadata: {
    recordCount: number;
    format: string;
    [key: string]: unknown;
  };
}

/**
 * Union of all analytics event types
 */
export type AnalyticsEvent =
  | RouteViewEvent
  | SearchEntityEvent
  | CreateEntityEvent
  | UpdateEntityEvent
  | DeleteEntityEvent
  | ImportDataEvent
  | ExportDataEvent;

/**
 * Analytics event emitter interface
 * 
 * Production implementation would integrate with analytics providers:
 * - PostHog
 * - Mixpanel
 * - Amplitude
 * - Segment
 * 
 * Current implementation logs to console for development/debugging.
 */
export class AnalyticsService {
  private enabled: boolean;
  
  constructor() {
    // Enable analytics in all environments except test
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  /**
   * Track route view
   */
  trackRouteView(event: Omit<RouteViewEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'view_route',
      timestamp: new Date().toISOString(),
    } as RouteViewEvent);
  }

  /**
   * Track entity search
   */
  trackSearch(event: Omit<SearchEntityEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'search_entity',
      timestamp: new Date().toISOString(),
    } as SearchEntityEvent);
  }

  /**
   * Track entity creation
   */
  trackCreate(event: Omit<CreateEntityEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'create_entity',
      timestamp: new Date().toISOString(),
    } as CreateEntityEvent);
  }

  /**
   * Track entity update
   */
  trackUpdate(event: Omit<UpdateEntityEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'update_entity',
      timestamp: new Date().toISOString(),
    } as UpdateEntityEvent);
  }

  /**
   * Track entity deletion
   */
  trackDelete(event: Omit<DeleteEntityEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'delete_entity',
      timestamp: new Date().toISOString(),
    } as DeleteEntityEvent);
  }

  /**
   * Track data import
   */
  trackImport(event: Omit<ImportDataEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'import_data',
      timestamp: new Date().toISOString(),
    } as ImportDataEvent);
  }

  /**
   * Track data export
   */
  trackExport(event: Omit<ExportDataEvent, 'type' | 'timestamp'>): void {
    this.track({
      ...event,
      type: 'export_data',
      timestamp: new Date().toISOString(),
    } as ExportDataEvent);
  }

  /**
   * Internal track method - sends event to analytics provider
   * 
   * @param event - Complete analytics event with all required fields
   */
  private track(event: AnalyticsEvent): void {
    if (!this.enabled) {
      return;
    }

    // Log to server logger for development/debugging
    serverLogger.info('[Analytics]', {
      eventType: event.type,
      actorId: event.actorId,
      route: event.route,
      correlationId: event.correlationId,
      ...(('entityType' in event) && { entityType: event.entityType }),
      ...(('entityId' in event) && { entityId: event.entityId }),
      metadata: event.metadata,
    });

    // Prepare common properties
    const properties = {
      route: event.route,
      correlationId: event.correlationId,
      ...(('entityType' in event) && { entityType: event.entityType }),
      ...(('entityId' in event) && { entityId: event.entityId }),
      ...event.metadata,
    };

    // Send to configured analytics provider
    try {
      if (analyticsProvider === 'posthog' && posthog) {
        posthog.capture({
          distinctId: event.actorId,
          event: event.type,
          properties,
        });
      } else if (analyticsProvider === 'mixpanel' && mixpanel) {
        mixpanel.track(event.type, {
          distinct_id: event.actorId,
          ...properties,
        });
      } else if (analyticsProvider === 'segment' && segmentAnalytics) {
        segmentAnalytics.track({
          userId: event.actorId,
          event: event.type,
          properties,
        });
      }
    } catch (error) {
      serverLogger.error('[Analytics] Error sending event to provider', {
        error,
        provider: analyticsProvider,
        eventType: event.type,
      });
    }
  }

  /**
   * Shutdown analytics provider and flush pending events
   * Should be called before application exit
   */
  async shutdown(): Promise<void> {
    try {
      if (analyticsProvider === 'posthog' && posthog) {
        await posthog.shutdown();
        serverLogger.info('[Analytics] PostHog shutdown complete');
      } else if (analyticsProvider === 'segment' && segmentAnalytics) {
        await segmentAnalytics.closeAndFlush();
        serverLogger.info('[Analytics] Segment shutdown complete');
      }
    } catch (error) {
      serverLogger.error('[Analytics] Error during shutdown', { error });
    }
  }
}

/**
 * Singleton analytics service instance
 */
export const analytics = new AnalyticsService();
