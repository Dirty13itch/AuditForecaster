# Analytics Integration Guide

**Created**: November 3, 2025  
**Status**: ✅ Complete - Analytics Infrastructure Operational  
**Purpose**: AAA Blueprint Tier-3 Observability - Analytics Event System

---

## Overview

The analytics system tracks user actions and system operations for product insights, behavioral analysis, and observability. It integrates with the audit logging system and correlation ID middleware for end-to-end tracing.

**Key Features**:
- ✅ Typed event taxonomy (18 operations)
- ✅ Correlation ID propagation for request tracing
- ✅ Actor identification for all events
- ✅ Metadata enrichment for contextual analysis
- ✅ Production-ready architecture (provider-agnostic)

---

## Event Taxonomy

### Core Events (AAA Blueprint Standard)

| Event Type | Description | Required Fields | Use Cases |
|------------|-------------|-----------------|-----------|
| `view_route` | Page/route view | actorId, route, correlationId | Traffic analysis, user journeys |
| `search_entity` | Entity search | actorId, route, entityType, query, resultCount | Search optimization, relevance tuning |
| `create_entity` | Entity creation | actorId, route, entityType, entityId | Conversion tracking, feature adoption |
| `update_entity` | Entity update | actorId, route, entityType, entityId | User engagement, field usage patterns |
| `delete_entity` | Entity deletion | actorId, route, entityType, entityId | Data lifecycle, deletion patterns |
| `import_data` | Data import | actorId, route, importType, recordCount, successCount | Import effectiveness, error rates |
| `export_data` | Data export | actorId, route, exportType, recordCount | Export usage, data access patterns |

### Supported Entity Types

```typescript
type EntityType =
  | 'job'                   // Inspection jobs
  | 'builder'               // Builder contacts
  | 'plan'                  // Floor plans
  | 'address'               // Job addresses
  | 'photo'                 // Evidence photos
  | 'report'                // PDF reports
  | 'schedule_event'        // Calendar events
  | 'pending_event'         // Unmatched calendar events
  | 'google_event'          // Google Calendar events
  | 'calendar_preference'   // Calendar settings
  | 'user'                  // System users
  | 'qa_item'               // QA issues
  | 'expense'               // Financial expenses
  | 'equipment'             // Equipment inventory
  | 'test_result';          // Test results (blower door, duct leakage, etc.)
```

### Import/Export Types

```typescript
type ImportExportType =
  | 'calendar_events'       // Google Calendar import
  | 'jobs_csv'              // Job data CSV import/export
  | 'builders_csv'          // Builder data CSV import/export
  | 'photos_zip'            // Photo archive export
  | 'reports_pdf'           // PDF report export
  | 'tec_auto_test';        // TEC Auto Test import
```

---

## Integration Patterns

### Pattern 1: Route View Tracking (Frontend)

**Location**: Client-side route components (useEffect)

```typescript
import { useEffect } from 'react';
import { useLocation } from 'wouter';

function JobListPage() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Track route view on mount
    fetch('/api/analytics/route-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: location,
        referrer: document.referrer,
      }),
    });
  }, [location]);
  
  // ... component implementation
}
```

### Pattern 2: Search Tracking (Frontend)

**Location**: Search components, filter interactions

```typescript
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

function JobSearch() {
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/jobs/search?q=${query}`);
      const data = await response.json();
      
      // Track search event
      await apiRequest('/api/analytics/search', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'job',
          query,
          resultCount: data.jobs.length,
        }),
      });
      
      return data;
    },
  });
  
  // ... component implementation
}
```

### Pattern 3: Entity Mutation Tracking (Backend)

**Location**: API route handlers (after successful mutation)

```typescript
import { analytics } from '../lib/analytics';

// Create entity
app.post('/api/jobs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const job = await storage.createJob(jobData);
    
    // Audit log (immutable record)
    await logCreate({
      req,
      entityType: 'job',
      entityId: job.id,
      data: job,
    });
    
    // Analytics event (behavioral insights)
    analytics.trackCreate({
      actorId: req.user.id,
      route: req.path,
      correlationId: req.correlationId || 'unknown',
      entityType: 'job',
      entityId: job.id,
      metadata: {
        source: 'manual_creation',
        status: job.status,
      },
    });
    
    res.json({ success: true, job });
  } catch (error) {
    // ... error handling
  }
});

// Update entity
app.put('/api/jobs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const before = await storage.getJob(req.params.id);
    const updated = await storage.updateJob(req.params.id, updates);
    
    // Audit log
    await logUpdate({
      req,
      entityType: 'job',
      entityId: req.params.id,
      before,
      after: updated,
    });
    
    // Analytics event
    analytics.trackUpdate({
      actorId: req.user.id,
      route: req.path,
      correlationId: req.correlationId || 'unknown',
      entityType: 'job',
      entityId: req.params.id,
      metadata: {
        fieldsChanged: Object.keys(updates),
      },
    });
    
    res.json({ success: true, job: updated });
  } catch (error) {
    // ... error handling
  }
});

// Delete entity
app.delete('/api/jobs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const job = await storage.getJob(req.params.id);
    await storage.deleteJob(req.params.id);
    
    // Audit log
    await logDelete({
      req,
      entityType: 'job',
      entityId: req.params.id,
      data: job,
    });
    
    // Analytics event
    analytics.trackDelete({
      actorId: req.user.id,
      route: req.path,
      correlationId: req.correlationId || 'unknown',
      entityType: 'job',
      entityId: req.params.id,
      metadata: {
        reason: 'user_deleted',
      },
    });
    
    res.status(204).send();
  } catch (error) {
    // ... error handling
  }
});
```

### Pattern 4: Import/Export Tracking (Backend)

**Location**: Import/export endpoints and cron jobs

```typescript
import { analytics } from '../lib/analytics';

// Calendar import (cron job)
cron.schedule('0 */6 * * *', async () => {
  const result = await processCalendarEvents(storage, events, calendarId, SYSTEM_USER_ID);
  
  // Create synthetic request for system user
  const systemReq = {
    user: { id: SYSTEM_USER_ID },
    correlationId: crypto.randomUUID(),
    path: '/system/calendar-import',
    ip: '127.0.0.1',
    get: () => 'System/Automated Import',
  } as AuditRequest;
  
  // Audit log
  await logImport({
    req: systemReq,
    importType: 'calendar_events',
    source: BUILDING_KNOWLEDGE_CALENDAR_NAME,
    recordCount: events.length,
    successCount: result.jobsCreated + result.eventsQueued,
    errorCount: result.errors.length,
  });
  
  // Analytics event
  analytics.trackImport({
    actorId: SYSTEM_USER_ID,
    route: '/system/calendar-import',
    correlationId: systemReq.correlationId,
    importType: 'calendar_events',
    metadata: {
      source: BUILDING_KNOWLEDGE_CALENDAR_NAME,
      recordCount: events.length,
      successCount: result.jobsCreated + result.eventsQueued,
      errorCount: result.errors.length,
      importLogId: result.importLogId,
    },
  });
});

// CSV export (user-initiated)
app.post('/api/jobs/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobs = await storage.getJobs(filters);
    const csv = await generateJobsCSV(jobs);
    
    // Analytics event
    analytics.trackExport({
      actorId: req.user.id,
      route: req.path,
      correlationId: req.correlationId || 'unknown',
      exportType: 'jobs_csv',
      metadata: {
        recordCount: jobs.length,
        format: 'csv',
        filters,
      },
    });
    
    res.attachment('jobs-export.csv').send(csv);
  } catch (error) {
    // ... error handling
  }
});
```

---

## Audit vs Analytics

**When to use both**:

| System | Purpose | Retention | Queryable | Immutable |
|--------|---------|-----------|-----------|-----------|
| **Audit Logs** | Compliance, security, debugging | Permanent | By entity, actor, action | ✅ Yes |
| **Analytics Events** | Product insights, behavior analysis | Time-limited (30-90 days) | By event type, time, cohort | ❌ No (aggregated) |

**Best Practice**: Always emit BOTH an audit log AND an analytics event for mutations.

```typescript
// ✅ CORRECT: Both audit and analytics
await logCreate({ req, entityType, entityId, data });
analytics.trackCreate({ actorId, route, correlationId, entityType, entityId });

// ❌ INCORRECT: Only audit (missing behavioral insights)
await logCreate({ req, entityType, entityId, data });

// ❌ INCORRECT: Only analytics (missing compliance trail)
analytics.trackCreate({ actorId, route, correlationId, entityType, entityId });
```

---

## Correlation ID Propagation

**Architecture**: Correlation IDs flow through the entire request lifecycle for end-to-end tracing.

```
Client Request
  ↓ (generates X-Correlation-ID header)
Express Middleware (correlationIdMiddleware)
  ↓ (attaches req.correlationId)
Route Handler
  ↓ (passes to audit log + analytics)
Audit Log Entry (corrId field)
Analytics Event (correlationId field)
  ↓
Log Aggregation (Sentry, Prometheus, etc.)
```

**Implementation**:

```typescript
// Middleware automatically attaches correlation ID
app.use(correlationIdMiddleware);

// Route handler accesses correlation ID
app.post('/api/jobs', async (req: AuthenticatedRequest, res: Response) => {
  // req.correlationId is automatically available
  console.log('Processing request:', req.correlationId);
  
  // Pass to audit and analytics
  await logCreate({ req, ... }); // Uses req.correlationId
  analytics.trackCreate({ 
    correlationId: req.correlationId || 'unknown',
    ...
  });
});
```

---

## Analytics Provider Integration

### Current Implementation (Development)

Events are logged to `serverLogger` for debugging:

```typescript
serverLogger.info('[Analytics]', {
  eventType: event.type,
  actorId: event.actorId,
  route: event.route,
  correlationId: event.correlationId,
  metadata: event.metadata,
});
```

### Production Integration (Future)

**Option 1: PostHog**
```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY);

analytics.track = (event: AnalyticsEvent) => {
  posthog.capture({
    distinctId: event.actorId,
    event: event.type,
    properties: {
      route: event.route,
      correlationId: event.correlationId,
      ...event.metadata,
    },
  });
};
```

**Option 2: Mixpanel**
```typescript
import Mixpanel from 'mixpanel';

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);

analytics.track = (event: AnalyticsEvent) => {
  mixpanel.track(event.type, {
    distinct_id: event.actorId,
    route: event.route,
    correlation_id: event.correlationId,
    ...event.metadata,
  });
};
```

**Option 3: Segment**
```typescript
import Analytics from 'analytics-node';

const segment = new Analytics(process.env.SEGMENT_WRITE_KEY);

analytics.track = (event: AnalyticsEvent) => {
  segment.track({
    userId: event.actorId,
    event: event.type,
    properties: {
      route: event.route,
      correlationId: event.correlationId,
      ...event.metadata,
    },
  });
};
```

---

## Testing Analytics Integration

### Unit Testing

```typescript
import { analytics } from './lib/analytics';
import { jest } from '@jest/globals';

describe('Analytics Integration', () => {
  beforeEach(() => {
    jest.spyOn(analytics, 'trackCreate');
  });

  it('should track job creation', async () => {
    const job = await createJob(jobData);
    
    expect(analytics.trackCreate).toHaveBeenCalledWith({
      actorId: 'test-user-id',
      route: '/api/jobs',
      correlationId: expect.any(String),
      entityType: 'job',
      entityId: job.id,
    });
  });
});
```

### E2E Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('Golden Path: Calendar Import tracks analytics', async ({ page }) => {
  // Navigate to calendar import
  await page.goto('/calendar/import');
  
  // Trigger import
  await page.click('[data-testid="button-import-calendar"]');
  
  // Verify analytics event in server logs
  const response = await page.waitForResponse(
    (res) => res.url().includes('/api/analytics/import')
  );
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.type).toBe('import_data');
  expect(data.importType).toBe('calendar_events');
});
```

---

## Migration Checklist for Existing Endpoints

When adding analytics to an existing endpoint:

- [ ] Import `analytics` from `server/lib/analytics`
- [ ] Identify mutation type (create/update/delete/import/export)
- [ ] Add analytics track call AFTER successful mutation
- [ ] Pass `correlationId` from `req.correlationId`
- [ ] Add relevant metadata for behavioral insights
- [ ] Verify event appears in server logs during development
- [ ] Update E2E tests to assert analytics events
- [ ] Update documentation with analytics integration

---

## Observability Dashboard Integration

### Analytics Queries (Future)

Once analytics provider is integrated, create dashboard queries:

**Top Routes by Traffic**:
```sql
SELECT route, COUNT(*) as views
FROM analytics_events
WHERE type = 'view_route'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY route
ORDER BY views DESC
LIMIT 10;
```

**Entity Creation Funnel**:
```sql
SELECT 
  entityType,
  COUNT(*) as creations,
  COUNT(DISTINCT actorId) as unique_users
FROM analytics_events
WHERE type = 'create_entity'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY entityType
ORDER BY creations DESC;
```

**Search Effectiveness**:
```sql
SELECT 
  entityType,
  AVG(metadata->>'resultCount') as avg_results,
  COUNT(CASE WHEN metadata->>'resultCount' = '0' THEN 1 END) as zero_results
FROM analytics_events
WHERE type = 'search_entity'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY entityType;
```

---

## Next Steps

1. ✅ **Infrastructure Complete**: Analytics service operational
2. ⏳ **Integration Phase**: Add analytics to calendar endpoints (Phase 2C)
3. ⏳ **Provider Setup**: Integrate with PostHog/Mixpanel/Segment
4. ⏳ **Dashboard Creation**: Build observability dashboard queries
5. ⏳ **E2E Testing**: Update Golden Path tests to assert analytics events

---

## Related Documents

- `server/lib/analytics.ts` - Analytics service implementation
- `server/lib/audit.ts` - Audit logging system
- `server/middleware/correlationId.ts` - Correlation ID middleware
- `docs/product/tier3-observability-plan.md` - Observability roadmap
- `docs/product/calendar-audit-coverage.md` - Calendar audit analysis

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| Nov 3, 2025 | 1.0 | Initial analytics infrastructure complete with typed event system, integration patterns, and provider-agnostic architecture |
