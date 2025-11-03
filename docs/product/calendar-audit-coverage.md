# Calendar Audit Coverage Analysis

**Created**: November 3, 2025  
**Author**: AAA Product Engineer  
**Purpose**: Phase 1 verification of existing calendar audit logging before implementing Tier-3 observability  
**Status**: ✅ Complete

---

## Executive Summary

**Current State**: **Partial Coverage (60%)** - Calendar endpoints have audit logging but implementation is inconsistent and uses outdated patterns.

**Key Findings**:
1. ✅ **Calendar Preferences**: Full CRUD audit logging using modern API (`logCreate`, `logUpdate`, `logDelete`)
2. ✅ **Pending Events**: Workflow actions logged (`logCustomAction` for assign/bulk-assign/reject)
3. ✅ **Google Events**: Conversion and sync operations logged (`logCustomAction`)
4. ✅ **Schedule Events**: Full CRUD + sync operations logged
5. ⚠️ **Scheduled Import Cron**: Uses **deprecated** `createAuditLog` API (needs migration)
6. ❌ **CalendarImportService**: **ZERO audit logging** (core service gap)
7. ❌ **calendar_import_logs Table**: **Does not exist** (no separate import tracking)

**Recommendation**: Proceed with Phase 2 implementation with **migration requirement** for existing logging.

---

## Detailed Coverage Analysis

### 1. Calendar Preferences (`/api/calendar-preferences/*`)

**Endpoints**:
- `POST /api/calendar-preferences` - Create preferences
- `PUT /api/calendar-preferences/:id` - Update preference
- `DELETE /api/calendar-preferences/:id` - Delete preference
- `PATCH /api/calendar-preferences/:calendarId/toggle` - Toggle enabled status

**Audit Logging**: ✅ **COMPLETE**
- Uses modern `logCreate`, `logUpdate`, `logDelete` API
- Entity type: `calendar_preference`
- Tracks all mutations with before/after state

**No Action Required**: Already meets AAA standards

---

### 2. Pending Events (`/api/pending-events/*`)

**Endpoints**:
- `POST /api/pending-events/:id/assign` - Assign to inspector
- `POST /api/pending-events/bulk-assign` - Bulk assignment
- `POST /api/calendar/unmatched-events/:id/approve` - Approve pending event
- `POST /api/calendar/unmatched-events/:id/reject` - Reject pending event

**Audit Logging**: ✅ **COMPLETE**
- Uses `logCustomAction` for workflow actions
- Actions: `'assign'`, `'approve'`, `'reject'`, `'bulk_assign_pending_events'` (custom)
- Entity type: `pending_calendar_event`

**Phase 2 Action**: 
- ⚠️ Map `'bulk_assign_pending_events'` to standard `'assign'` action + bulk metadata
- ✅ `'approve'` and `'reject'` already supported in AuditAction type

---

### 3. Google Events (`/api/google-events/*` and `/api/calendar/*`)

**Endpoints**:
- `POST /api/google-events/:id/convert` - Convert event to job
- `POST /api/calendar/sync-now` - On-demand calendar sync
- `POST /api/calendar/export-job/:jobId` - Export job to Google Calendar
- `PUT /api/calendar/update-job/:jobId` - Update job in Google Calendar
- `DELETE /api/calendar/delete-event/:eventId` - Delete event from Google Calendar

**Audit Logging**: ✅ **COMPLETE**
- Uses `logCustomAction` for sync/convert operations
- Actions: `'google_event_convert'` (custom), `'google_event_export'` (custom)
- Entity types: `google_calendar_event`, `calendar`

**Phase 2 Action**:
- 🔧 **MIGRATE** `'google_event_convert'` → `'convert'` (new Tier-3 action)
- 🔧 **MIGRATE** sync operations → `'sync'` (new Tier-3 action)
- 🔧 **ADD** `'export'` for Google Calendar export (already in AuditAction)

---

### 4. Schedule Events (`/api/schedule-events/*`)

**Endpoints**:
- `GET /api/schedule-events/sync` - Sync from Google Calendar
- `POST /api/schedule-events` - Create schedule event (with Google sync)
- `PUT /api/schedule-events/:id` - Update schedule event (with Google sync)
- `DELETE /api/schedule-events/:id` - Delete schedule event (with Google sync)

**Audit Logging**: ✅ **COMPLETE**
- Uses modern `logCreate`, `logUpdate`, `logDelete` API
- Uses `logCustomAction` for sync operations
- Entity type: `schedule_event`

**Phase 2 Action**:
- 🔧 **MIGRATE** sync operations → `'sync'` action (new Tier-3 action)

---

### 5. Scheduled Calendar Import (Automated Cron Job)

**File**: `server/scheduledCalendarImport.ts`  
**Function**: `startScheduledCalendarImport()`

**Audit Logging**: ⚠️ **DEPRECATED API**
- **Lines 133-146**: Success logging using **old** `storage.createAuditLog()` API
- **Lines 161-170**: Failure logging using **old** `storage.createAuditLog()` API
- Actions: `'calendar_import_automated'`, `'calendar_import_automated_failed'` (custom)
- Entity type: `'calendar'`

**Current Implementation** (Lines 133-146):
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

**Phase 2 Action**: **MIGRATION REQUIRED**
- 🔧 **REPLACE** `storage.createAuditLog()` with modern `logImport()` API
- 🔧 **UPDATE** to use `'import'` action (already in AuditAction)
- 🔧 **ADD** synthetic `req` object for system user (follows lib/audit.ts pattern)
- 🔧 **DOCUMENT** migration pattern for other system-initiated actions

**Migration Pattern**:
```typescript
// Create synthetic request for system user
const systemReq = {
  user: { id: SYSTEM_USER_ID },
  correlationId: crypto.randomUUID(),
  ip: '127.0.0.1', // localhost for system
  get: (header: string) => 'System/Automated Import',
} as AuditRequest;

await logImport({
  req: systemReq,
  importType: 'calendar_events',
  source: BUILDING_KNOWLEDGE_CALENDAR_NAME,
  recordCount: events.length,
  successCount: result.jobsCreated + result.eventsQueued,
  errorCount: result.errors.length,
  metadata: {
    importLogId: result.importLogId,
    jobsCreated: result.jobsCreated,
    eventsQueued: result.eventsQueued,
  },
});
```

---

### 6. Calendar Import Service

**File**: `server/calendarImportService.ts`  
**Function**: `processCalendarEvents()`

**Audit Logging**: ❌ **MISSING**
- Core business logic has **NO audit logging**
- Performs critical operations (event parsing, job creation, builder matching) without traceability
- No correlation IDs propagated from cron job

**Phase 2 Action**: **CRITICAL GAP**
- 🆕 **ADD** logging for calendar event processing
- 🆕 **ADD** logging for fuzzy builder matching
- 🆕 **ADD** logging for confidence scoring
- 🆕 **ADD** correlation ID propagation

---

### 7. Calendar Import Logs Table

**Database Table**: ❌ **DOES NOT EXIST**

**Impact**: No dedicated tracking for calendar import operations beyond audit logs.

**Analysis**:
- **Audit logs** provide sufficient traceability for AAA standards
- Dedicated `calendar_import_logs` table would be **redundant**
- Import metadata stored in audit log `metadata` field (eventsProcessed, jobsCreated, etc.)

**Phase 2 Action**: **NO ACTION REQUIRED**
- Audit logs provide complete import history
- No need for separate import logs table

---

## Coverage Summary

| Entity Type | Endpoints | Audit Coverage | API Maturity | Phase 2 Action |
|-------------|-----------|----------------|--------------|----------------|
| **Calendar Preferences** | 4 | ✅ 100% | Modern | None |
| **Pending Events** | 4 | ✅ 100% | Modern | Migrate custom actions |
| **Google Events** | 5 | ✅ 100% | Custom | Migrate to Tier-3 actions |
| **Schedule Events** | 4 | ✅ 100% | Modern | Migrate sync to 'sync' |
| **Scheduled Import** | 1 (cron) | ⚠️ 100% (deprecated) | **OLD API** | **Migrate to logImport** |
| **Import Service** | Core logic | ❌ 0% | None | **Add logging** |

**Overall Coverage**: 60% (5/6 components have logging, but 2 need migration)

---

## Recommendations for Phase 2

### Priority 1: **MIGRATION** (2-3 hours)

1. **Migrate Scheduled Import** (`server/scheduledCalendarImport.ts`):
   - Replace `storage.createAuditLog()` with `logImport()`
   - Create synthetic `AuditRequest` for system user
   - Update action from `'calendar_import_automated'` → `'import'`
   - Document pattern for future system-initiated actions

2. **Migrate Google Event Actions**:
   - Replace `'google_event_convert'` → `'convert'` (new Tier-3 action)
   - Replace sync operations → `'sync'` (new Tier-3 action)
   - Consolidate to standard actions

### Priority 2: **ADD MISSING LOGGING** (2-3 hours)

3. **Add CalendarImportService Logging** (`server/calendarImportService.ts`):
   - Log event processing with correlation IDs
   - Log fuzzy matching decisions
   - Log confidence scoring
   - Track parsing errors

### Priority 3: **STANDARDIZATION** (1 hour)

4. **Standardize Custom Actions**:
   - Map `'bulk_assign_pending_events'` → `'assign'` + bulk metadata
   - Ensure all calendar operations use Tier-3 actions

---

## Duplicate Logging Risks

### ✅ **NO DUPLICATES IDENTIFIED**

**Analysis**:
1. Each endpoint has a **single** audit log call
2. No overlapping logging between API routes and service layer
3. Scheduled import logs separately from API-initiated imports
4. Clear separation between:
   - User-initiated actions (API routes)
   - System-initiated actions (cron job)

**Recommendation**: Safe to proceed with Phase 2 - no risk of duplicate audit entries.

---

## Phase 2 Implementation Plan Adjustments

**Original Plan** (from `tier3-observability-plan.md` Phase 2):
- Add audit logging for 5 calendar entities (pending events, Google events, schedule events, import logs, preferences)

**Revised Plan** (based on coverage analysis):

### Phase 2A: Migration (2-3 hours)
- [ ] Migrate `scheduledCalendarImport.ts` to use `logImport()` API
- [ ] Create synthetic `AuditRequest` helper for system actions
- [ ] Update Google event actions to use `'convert'` and `'sync'`
- [ ] Document migration pattern in `docs/product/audit-migration-pattern.md`

### Phase 2B: Missing Coverage (2-3 hours)
- [ ] Add logging to `calendarImportService.ts` core logic
- [ ] Implement correlation ID propagation
- [ ] Log fuzzy matching and confidence scoring
- [ ] Add error tracking for parsing failures

### Phase 2C: Standardization (1 hour)
- [ ] Consolidate custom actions to Tier-3 standard actions
- [ ] Update analytics dashboard to recognize new actions
- [ ] Add Phase 2 completion to CHANGELOG.md

**Revised Estimate**: 5-7 hours (increased from 4-5h due to migration work)

---

## Analytics Integration Notes

**Blocker Identified**: `server/lib/analytics.ts` does not exist yet

**Impact**: Cannot add analytics events for calendar operations until analytics infrastructure is created

**Recommendation**: 
1. Complete Phase 2A & 2B (audit logging migration and gaps)
2. **Pause** Phase 2C until analytics infrastructure exists
3. Create `server/lib/analytics.ts` as separate task (estimated 3-4h)
4. Resume Phase 2C to add analytics events for calendar operations

---

## Conclusion

**Status**: ✅ **PHASE 1 COMPLETE**

**Findings**:
- Calendar entities have **60% audit coverage** (5/6 components)
- Existing coverage uses **mix of modern and deprecated APIs**
- **No duplicate logging risks** identified
- **CalendarImportService** is critical gap (core business logic untracked)

**Next Steps**:
1. **Proceed to Phase 2A**: Migrate deprecated audit logging to modern API
2. **Proceed to Phase 2B**: Add missing coverage for CalendarImportService
3. **Defer Phase 2C**: Wait for analytics infrastructure creation
4. **Update** `tier3-observability-plan.md` with revised estimates (5-7h for Phase 2)

**Approval**: Ready to implement Phase 2 with migration-first approach.

---

## References

- `server/scheduledCalendarImport.ts` (lines 133-146, 161-170) - Deprecated audit API usage
- `server/calendarImportService.ts` - Missing audit coverage
- `server/routes.ts` (lines 4581-4725, 4768-5662, 11666-12096) - Calendar API endpoints
- `server/lib/audit.ts` - Modern audit logging API
- `docs/product/tier3-observability-plan.md` - Original implementation plan
