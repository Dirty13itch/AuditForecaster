# Audit API Migration Pattern

**Created**: November 3, 2025  
**Purpose**: Guide for migrating from deprecated `storage.createAuditLog()` to modern audit API  
**Status**: ✅ Complete - Pattern established from scheduledCalendarImport.ts migration

---

## Overview

This document provides the migration pattern for updating code from the deprecated `storage.createAuditLog()` API to the modern typed audit logging system (`server/lib/audit.ts`).

**Migration Completed**: `server/scheduledCalendarImport.ts` (✅ November 3, 2025)

---

## Migration Pattern

### Step 1: Import Modern Audit API

**Before** (deprecated):
```typescript
import { storage } from './storage';
```

**After** (modern):
```typescript
import crypto from 'crypto';
import { storage } from './storage';
import { logImport, type AuditRequest } from './lib/audit';
```

---

### Step 2: Create Synthetic Request for System Actions

For system-initiated actions (cron jobs, background tasks), create a synthetic `AuditRequest` object:

```typescript
// Create synthetic request for system-initiated audit logging
const systemReq = {
  user: { id: SYSTEM_USER_ID },
  correlationId: crypto.randomUUID(),
  ip: '127.0.0.1', // localhost for system actions
  get: () => 'System/Automated Calendar Import',
} as AuditRequest;
```

**Key Components**:
- `user.id`: System user ID (e.g., `'test-admin'`, `'system'`)
- `correlationId`: Unique UUID for tracing
- `ip`: `'127.0.0.1'` for localhost (system actions)
- `get()`: Returns user agent string describing the system action

---

### Step 3: Replace Deprecated Calls

#### Example 1: Import Success

**Before** (deprecated):
```typescript
await storage.createAuditLog({
  userId: SYSTEM_USER_ID,
  action: 'calendar_import_automated',
  resourceType: 'calendar',
  resourceId: buildingKnowledgeCalendarId,
  metadata: {
    eventsProcessed: events.length,
    jobsCreated: result.jobsCreated,
    eventsQueued: result.eventsQueued,
    errors: result.errors.length,
    importLogId: result.importLogId,
    source: 'automated_cron_job',
  },
});
```

**After** (modern):
```typescript
const systemReq = {
  user: { id: SYSTEM_USER_ID },
  correlationId: crypto.randomUUID(),
  ip: '127.0.0.1',
  get: () => 'System/Automated Calendar Import',
} as AuditRequest;

await logImport({
  req: systemReq,
  importType: 'calendar_events',
  recordCount: events.length,
  successCount: result.jobsCreated + result.eventsQueued,
  errorCount: result.errors.length,
  errors: result.errors.length > 0 ? result.errors.map(e => e.toString()) : undefined,
  metadata: {
    source: BUILDING_KNOWLEDGE_CALENDAR_NAME,
    calendarId: buildingKnowledgeCalendarId,
    jobsCreated: result.jobsCreated,
    eventsQueued: result.eventsQueued,
    importLogId: result.importLogId,
  },
});
```

**Changes**:
- ✅ Action: `'calendar_import_automated'` → `'import'` (standardized)
- ✅ Typed: Uses `logImport()` with typed parameters
- ✅ Correlation ID: Auto-generated for tracing
- ✅ Metadata: Structured and enriched

---

#### Example 2: Import Failure

**Before** (deprecated):
```typescript
catch (error) {
  await storage.createAuditLog({
    userId: SYSTEM_USER_ID,
    action: 'calendar_import_automated_failed',
    resourceType: 'calendar',
    resourceId: 'unknown',
    metadata: {
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'automated_cron_job',
    },
  });
}
```

**After** (modern):
```typescript
catch (error) {
  const systemReq = {
    user: { id: SYSTEM_USER_ID },
    correlationId: crypto.randomUUID(),
    ip: '127.0.0.1',
    get: () => 'System/Automated Calendar Import',
  } as AuditRequest;
  
  await logImport({
    req: systemReq,
    importType: 'calendar_events',
    recordCount: 0,
    successCount: 0,
    errorCount: 1,
    errors: [error instanceof Error ? error.message : 'Unknown error'],
    metadata: {
      source: BUILDING_KNOWLEDGE_CALENDAR_NAME,
      calendarId: buildingKnowledgeCalendarId || 'unknown',
      failed: true,
    },
  });
}
```

**Changes**:
- ✅ Action: `'calendar_import_automated_failed'` → `'import'` (unified)
- ✅ Errors: Structured array format
- ✅ Metadata: Includes `failed: true` flag
- ✅ Counts: Explicit zero values for clarity

---

## Migration Checklist

When migrating code to modern audit API:

- [ ] Import `crypto` module for UUID generation
- [ ] Import `logImport`, `logCreate`, `logUpdate`, `logDelete`, or `logCustomAction` from `server/lib/audit`
- [ ] Import `AuditRequest` type for TypeScript safety
- [ ] Create synthetic `AuditRequest` for system-initiated actions
- [ ] Replace deprecated `storage.createAuditLog()` calls with typed functions
- [ ] Update action names to standard types (`'import'`, `'export'`, `'create'`, `'update'`, `'delete'`)
- [ ] Structure metadata consistently
- [ ] Generate unique correlation IDs for tracing
- [ ] Test migration by restarting application
- [ ] Verify audit logs appear correctly in database

---

## Standard Actions Mapping

| Deprecated Action | Modern Action | Function to Use |
|-------------------|---------------|-----------------|
| `'calendar_import_automated'` | `'import'` | `logImport()` |
| `'calendar_import_automated_failed'` | `'import'` | `logImport()` (with errors) |
| `'google_event_convert'` | `'convert'` | `logCustomAction()` |
| `'google_event_export'` | `'export'` | `logExport()` |
| `'google_event_sync'` | `'sync'` | `logCustomAction()` |
| `'bulk_assign_pending_events'` | `'assign'` | `logCustomAction()` (with metadata.bulk: true) |

---

## Available Modern Audit Functions

### logCreate()
```typescript
await logCreate({
  req: AuthenticatedRequest,
  entityType: string,
  entityId: string,
  data: object,
  metadata?: object,
});
```

### logUpdate()
```typescript
await logUpdate({
  req: AuthenticatedRequest,
  entityType: string,
  entityId: string,
  before: object,
  after: object,
  metadata?: object,
});
```

### logDelete()
```typescript
await logDelete({
  req: AuthenticatedRequest,
  entityType: string,
  entityId: string,
  data: object,
  metadata?: object,
});
```

### logImport()
```typescript
await logImport({
  req: AuditRequest,
  importType: string,
  recordCount: number,
  successCount: number,
  errorCount: number,
  errors?: string[],
  metadata?: object,
});
```

### logExport()
```typescript
await logExport({
  req: AuditRequest,
  exportType: string,
  recordCount: number,
  format: string,
  filters?: object,
  metadata?: object,
});
```

### logCustomAction()
```typescript
await logCustomAction({
  req: AuditRequest,
  action: AuditAction, // 'sync' | 'convert' | 'submit' | 'recalculate' | 'verify' | etc.
  entityType: string,
  entityId: string,
  before?: object,
  after?: object,
  metadata?: object,
});
```

---

## System User Patterns

### Development Environment

```typescript
const SYSTEM_USER_ID = 'test-admin'; // Default for development

// Auto-create system user if doesn't exist
if (!user && process.env.NODE_ENV === 'development') {
  await storage.upsertUser({
    id: SYSTEM_USER_ID,
    email: 'system@automated-imports.local',
    firstName: 'Automated',
    lastName: 'Import System',
    role: 'admin',
  });
}
```

### Production Environment

```typescript
// Require explicit system user configuration
const SYSTEM_USER_ID = process.env.CALENDAR_IMPORT_USER_ID;

if (process.env.NODE_ENV === 'production' && !SYSTEM_USER_ID) {
  throw new Error('CALENDAR_IMPORT_USER_ID must be set in production');
}
```

---

## Testing Migration

After migration, verify:

1. **Application Starts**: No TypeScript errors or runtime crashes
2. **Audit Logs Created**: Check `audit_logs` table for new entries
3. **Correlation IDs**: Verify each log has unique `corrId`
4. **Action Types**: Confirm standard actions (`'import'`, not `'calendar_import_automated'`)
5. **Metadata**: Verify structured metadata fields

**SQL Query to Verify**:
```sql
SELECT 
  action,
  entity_ref,
  metadata,
  corr_id,
  created_at
FROM audit_logs
WHERE action = 'import'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Benefits of Modern API

| Feature | Deprecated API | Modern API |
|---------|---------------|------------|
| **Type Safety** | ❌ Untyped `action` string | ✅ `AuditAction` union type |
| **Correlation IDs** | ❌ Manual generation | ✅ Auto-generated |
| **Structured Errors** | ❌ String only | ✅ Array of errors with counts |
| **Entity Reference** | ❌ Separate fields | ✅ Unified `entityRef` format |
| **Metadata Schema** | ❌ Arbitrary object | ✅ Typed, structured |
| **Import/Export Tracking** | ❌ Generic action | ✅ Dedicated functions |
| **Request Context** | ❌ Manual extraction | ✅ Automatic from `AuditRequest` |

---

## Next Migration Candidates

Based on Phase 1 calendar coverage analysis:

1. **Google Events** (`server/routes.ts` lines 4581-4725)
   - Replace `'google_event_convert'` → `'convert'` via `logCustomAction()`
   - Replace sync operations → `'sync'` via `logCustomAction()`
   - Add `'export'` for Google Calendar exports

2. **Pending Events** (`server/routes.ts` lines 4768-4850)
   - Replace `'bulk_assign_pending_events'` → `'assign'` via `logCustomAction()` with `metadata.bulk: true`

3. **Schedule Events** (`server/routes.ts` lines 5316-5662)
   - Replace sync operations → `'sync'` via `logCustomAction()`

---

## Related Documents

- `server/lib/audit.ts` - Modern audit logging API
- `server/lib/analytics.ts` - Analytics event system (complementary)
- `docs/product/calendar-audit-coverage.md` - Coverage analysis identifying migration needs
- `docs/product/tier3-observability-plan.md` - Overall observability roadmap
- `server/scheduledCalendarImport.ts` - Reference implementation (✅ migrated)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| Nov 3, 2025 | 1.0 | Initial migration pattern created from scheduledCalendarImport.ts migration. Established synthetic `AuditRequest` pattern for system-initiated actions. |
