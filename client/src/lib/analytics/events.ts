/**
 * Typed Analytics Events Infrastructure
 * 
 * Implements AAA Blueprint observability schema with typed event emission.
 * 
 * Event Taxonomy:
 * - view_{route}: Page views
 * - search_{entity}: Search operations
 * - create_{entity}: Entity creation
 * - update_{entity}: Entity updates
 * - delete_{entity}: Entity deletion
 * - export_{kind}: Data exports
 * - import_{kind}: Data imports
 */

import { nanoid } from 'nanoid';
import { getLastCorrelationId } from '../queryClient';

// ============================================================================
// Core Event Types
// ============================================================================

export interface BaseAnalyticsEvent {
  actorId: string;          // User ID
  tenantId?: string;        // Organization ID (future multi-tenant)
  entityId?: string;        // Related entity (job, photo, etc.)
  route: string;            // Current route
  ts: number;               // Timestamp (Unix epoch)
  corrId: string;           // Correlation ID (UUID)
  metadata?: Record<string, unknown>; // Event-specific data
}

// ============================================================================
// Route View Events
// ============================================================================

export interface ViewRouteEvent extends BaseAnalyticsEvent {
  eventType: 'view_route';
  routeName: string;
}

// ============================================================================
// Search Events
// ============================================================================

export interface SearchEntityEvent extends BaseAnalyticsEvent {
  eventType: 'search_entity';
  entityType: 'jobs' | 'photos' | 'builders' | 'plans' | 'equipment' | 'routes';
  query: string;
  resultCount: number;
  filters?: Record<string, unknown>;
}

// ============================================================================
// CRUD Events
// ============================================================================

export interface CreateEntityEvent extends BaseAnalyticsEvent {
  eventType: 'create_entity';
  entityType: string;
  entityId: string;
}

export interface UpdateEntityEvent extends BaseAnalyticsEvent {
  eventType: 'update_entity';
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface DeleteEntityEvent extends BaseAnalyticsEvent {
  eventType: 'delete_entity';
  entityType: string;
  entityId: string;
}

// ============================================================================
// Import/Export Events
// ============================================================================

export interface ExportDataEvent extends BaseAnalyticsEvent {
  eventType: 'export_data';
  exportType: 'csv' | 'pdf' | 'xlsx';
  entityType: string;
  recordCount: number;
}

export interface ImportDataEvent extends BaseAnalyticsEvent {
  eventType: 'import_data';
  importType: 'calendar_events' | 'csv_expenses' | 'tec_test';
  recordCount: number;
  successCount: number;
  errorCount: number;
}

// ============================================================================
// Union Type for All Events
// ============================================================================

export type AnalyticsEvent =
  | ViewRouteEvent
  | SearchEntityEvent
  | CreateEntityEvent
  | UpdateEntityEvent
  | DeleteEntityEvent
  | ExportDataEvent
  | ImportDataEvent;

// ============================================================================
// Event Emission Functions
// ============================================================================

function generateCorrelationId(): string {
  return nanoid();
}

function getActorId(): string {
  // Note: Backend will inject real actorId from req.user.id
  // This is just a placeholder for client-side fallback
  return 'client-placeholder';
}

function getCurrentRoute(): string {
  return window.location.pathname;
}

/**
 * Emit an analytics event
 * Sends events to backend for persistence and correlation with audit logs
 */
export function emitAnalyticsEvent(event: AnalyticsEvent): void {
  const enrichedEvent = {
    ...event,
    ts: event.ts || Date.now(),
    // Use server-provided correlation ID when available, fallback to local generation
    corrId: event.corrId || getLastCorrelationId() || generateCorrelationId(),
    actorId: event.actorId || getActorId(),
    route: event.route || getCurrentRoute(),
  };

  // Log to console for development debugging
  console.log('[Analytics]', enrichedEvent.eventType, enrichedEvent);

  // Send to analytics backend for persistence
  // Note: Fire-and-forget pattern (no await) to avoid blocking UI
  const payload: Record<string, any> = {
    eventType: enrichedEvent.eventType,
    route: enrichedEvent.route,
  };
  
  // Only include defined optional fields
  if ('entityType' in enrichedEvent && enrichedEvent.entityType) {
    payload.entityType = enrichedEvent.entityType;
  }
  if ('entityId' in enrichedEvent && enrichedEvent.entityId) {
    payload.entityId = enrichedEvent.entityId;
  }
  if (enrichedEvent.corrId) {
    payload.correlationId = enrichedEvent.corrId;
  }
  if (enrichedEvent.metadata) {
    payload.metadata = enrichedEvent.metadata;
  }
  
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(error => {
    // Silently fail analytics errors (don't disrupt user experience)
    console.warn('[Analytics] Failed to send event:', error);
  });
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function trackPageView(routeName: string, actorId?: string): void {
  emitAnalyticsEvent({
    eventType: 'view_route',
    routeName,
    actorId: actorId || getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackSearch(
  entityType: SearchEntityEvent['entityType'],
  query: string,
  resultCount: number,
  filters?: Record<string, unknown>
): void {
  emitAnalyticsEvent({
    eventType: 'search_entity',
    entityType,
    query,
    resultCount,
    filters,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackCreate(entityType: string, entityId: string): void {
  emitAnalyticsEvent({
    eventType: 'create_entity',
    entityType,
    entityId,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackUpdate(
  entityType: string,
  entityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): void {
  emitAnalyticsEvent({
    eventType: 'update_entity',
    entityType,
    entityId,
    before,
    after,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackDelete(entityType: string, entityId: string): void {
  emitAnalyticsEvent({
    eventType: 'delete_entity',
    entityType,
    entityId,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackExport(
  exportType: ExportDataEvent['exportType'],
  entityType: string,
  recordCount: number
): void {
  emitAnalyticsEvent({
    eventType: 'export_data',
    exportType,
    entityType,
    recordCount,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}

export function trackImport(
  importType: ImportDataEvent['importType'],
  recordCount: number,
  successCount: number,
  errorCount: number
): void {
  emitAnalyticsEvent({
    eventType: 'import_data',
    importType,
    recordCount,
    successCount,
    errorCount,
    actorId: getActorId(),
    route: getCurrentRoute(),
    ts: Date.now(),
  });
}
