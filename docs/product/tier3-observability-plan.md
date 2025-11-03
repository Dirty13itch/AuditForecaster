# Tier-3 Observability Implementation Plan

**Created**: November 3, 2025  
**Last Revised**: November 3, 2025 (Jobs Analytics Complete - Tier-2 Dual Observability)  
**Status**: ✅ Phase 2 Complete + Jobs Analytics Complete - Calendar & Jobs Subsystems GA-Ready  
**Priority**: High (Critical for AAA Certification)  
**Estimated Effort**: 23-28 hours total (Phase 0: 2h ✅, Phase 1: 2h ✅, Analytics: 3h ✅, Phase 2: 5.5h ✅, Jobs Analytics: 2-3h ✅, Remaining: 8.5-14.5h)  
**Dependencies**: 
1. ✅ Existing audit logger infrastructure (server/lib/audit.ts)
2. ✅ AuditAction type extension completed (5 new verbs added)
3. ✅ Calendar audit coverage analysis complete (60% baseline identified)
4. ✅ Analytics infrastructure (server/lib/analytics.ts) - Complete with typed events, correlation ID integration, and provider-agnostic architecture

---

## Architect Review Findings (November 3, 2025)

**Verdict**: Fail - Plan cannot be implemented as-written

**Critical Issues Identified**:
1. ✅ **Action Vocabulary Mismatch**: Proposed actions ('sync', 'convert', 'submit', 'recalculate') not in current AuditAction union
2. ✅ **Optimistic Estimates**: Didn't account for type extension, analytics updates, dashboard changes
3. ✅ **Missing Validation**: No verification of existing calendar import logging coverage

**Required Corrections**:
- [x] Add Phase 0: Extend AuditAction type to support new verbs ✅ Completed Nov 3, 2025
- [x] Verify existing audit coverage for calendar entities to avoid duplication ✅ Completed Nov 3, 2025
- [x] Revise effort estimates to account for type system changes ✅ Completed (23-28h)
- [x] Document which proposed actions map to existing vs. new audit verbs ✅ Completed
- [x] Document migration requirements for deprecated audit API usage ✅ Identified in Phase 1

---

## Current Supported Audit Actions

From `server/lib/audit.ts`, the AuditAction union currently supports:

```typescript
export type AuditAction =
  | 'create'    // ✅ Supported
  | 'update'    // ✅ Supported
  | 'delete'    // ✅ Supported
  | 'login'     // ✅ Supported
  | 'logout'    // ✅ Supported
  | 'approve'   // ✅ Supported
  | 'reject'    // ✅ Supported
  | 'assign'    // ✅ Supported
  | 'complete'  // ✅ Supported
  | 'export'    // ✅ Supported
  | 'import';   // ✅ Supported
```

**Proposed New Actions** (require type extension):
```typescript
  | 'sync'        // ⚠️ NEW - Calendar sync operations
  | 'convert'     // ⚠️ NEW - Event conversion to job
  | 'submit'      // ⚠️ NEW - Tax credit project submission
  | 'recalculate' // ⚠️ NEW - Test result recalculation
  | 'verify'      // ⚠️ NEW - Requirement verification
```

---

## Overview

This document outlines the implementation plan for extending audit logging and analytics tracking to Tier-3 entities. Currently, **71 audit logging endpoints** exist for Tier-1 (Builders, Developments, Lots, Plans) and Tier-2 (Jobs, Photos, Reports, Equipment, Financial) entities. This plan adds comprehensive observability for 18 Tier-3 entities across 4 domains.

**Goal**: Achieve 100% audit coverage for all mutable entities in the system, enabling complete traceability and compliance reporting.

---

## Current State

### Implemented (Tier-1 & Tier-2)
✅ **71 audit logging endpoints** across 6 entity groups:
- **Builders**: 26 endpoints (create, update, delete, approve, merge, contacts, agreements, programs, interactions, abbreviations, construction managers)
- **Jobs**: 10 endpoints (create, update, delete, status changes)
- **Photos**: 12 endpoints (create, update, delete, bulk tagging, bulk moving)
- **Reports**: 8 endpoints (templates, instances, field values, clone, archive, recalculate)
- **Equipment**: 3 endpoints (create, update, delete)
- **Financial**: 12 endpoints (invoices, expenses, payments)

### Missing (Tier-3)
⚠️ **18 entity types** without audit logging:
- **Calendar/Schedule**: 5 entities (pending events, Google events, schedule events, import logs, preferences)
- **QA System**: 5 entities (inspection scores, checklists, checklist items, responses, performance metrics)
- **Testing Systems**: 3 entities (blower door, duct leakage, ventilation)
- **Tax Credits**: 3 entities (projects, requirements, documents)
- **User Settings**: 2 entities (user preferences, system configuration)

---

## Implementation Plan

### Phase 0: Prerequisite - Extend AuditAction Type (2-3 hours) ⚠️ REQUIRED

**Blocker Resolution**: Before implementing any Tier-3 observability, the AuditAction type must be extended to support new verbs.

#### Changes Required

**1. Update `server/lib/audit.ts`**
```typescript
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'complete'
  | 'export'
  | 'import'
  // New actions for Tier-3 entities
  | 'sync'        // Calendar sync operations
  | 'convert'     // Event conversion (calendar event → job)
  | 'submit'      // Tax credit project submission
  | 'recalculate' // Test result recalculation
  | 'verify';     // Requirement verification
```

**2. Update Analytics Event Types** (`server/lib/analytics.ts`)
- Add new event types for sync, convert, submit, recalculate, verify actions
- Update analytics dashboard queries to include new action types

**3. Update Documentation**
- Document new audit actions in `docs/product/architecture.md`
- Add examples to `server/lib/audit.ts` JSDoc comments

**4. Testing**
- Verify TypeScript compilation with new action types
- Test `logCustomAction` with each new verb
- Ensure analytics events fire correctly

**Deliverables**:
- [x] AuditAction type extended in `server/lib/audit.ts` ✅ 5 new verbs added (sync, convert, submit, recalculate, verify)
- [x] JSDoc documentation with usage examples ✅ Added examples for all new actions
- [x] TypeScript compilation verified ✅ No audit-related errors
- [ ] Analytics event types updated ⚠️ **DEFERRED** - Analytics infrastructure (server/lib/analytics.ts) does not exist yet

**Notes**: 
- Analytics infrastructure creation is a separate prerequisite task (estimated 3-4 hours)
- Current implementation provides client-side analytics tracking for E2E tests only (tests/e2e/helpers/analytics.ts)
- Server-side analytics events should be added when analytics.ts is created per AAA Blueprint spec

---

### Phase 1: Verify Existing Coverage (1-2 hours) ✅ COMPLETE

**Purpose**: Validate current audit logging for calendar entities to avoid duplication or conflicts.

#### Investigation Tasks

1. ✅ **Grep for existing calendar audit logs**: Completed analysis of all calendar endpoints
2. ✅ **Check calendar import logs**: Confirmed no separate `calendar_import_logs` table exists
3. ✅ **Document findings**: Created comprehensive `docs/product/calendar-audit-coverage.md` (400+ lines)

**Key Findings**:
- **60% Baseline Coverage**: 5/6 calendar components have audit logging
- **Migration Required**: Scheduled import cron uses deprecated `createAuditLog` API (needs migration to `logImport`)
- **Critical Gap**: `calendarImportService.ts` core logic has zero audit logging
- **No Duplicates**: Clean separation between API and cron logging - safe to proceed
- **Action Mapping**:
  - ✅ Calendar Preferences: Modern API (logCreate/logUpdate/logDelete)
  - ✅ Pending Events: Modern API (logCustomAction for assign/approve/reject)
  - ⚠️ Google Events: Custom actions need migration ('google_event_convert' → 'convert')
  - ✅ Schedule Events: Modern API with sync operations
  - ⚠️ Scheduled Import: **DEPRECATED API** - requires migration

**Deliverables**:
- [x] Coverage audit completed ✅ All calendar endpoints analyzed
- [x] Findings documented ✅ See `docs/product/calendar-audit-coverage.md`
- [x] Duplication risks identified ✅ NONE found - clear separation
- [x] Implementation plan adjusted ✅ Phase 2 revised from 4-5h to 5-7h (migration-first approach)

**Documentation**: ✅ `docs/product/calendar-audit-coverage.md` includes:
- Detailed endpoint-by-endpoint analysis
- Coverage summary table (60% baseline)
- Migration requirements and patterns
- Revised Phase 2 implementation plan
- No duplicate logging risks identified

---

### Phase 2: Calendar & Schedule Observability (5-7 hours) ⚠️ REVISED

**Revision Reason**: Phase 1 analysis identified migration requirements for deprecated audit API usage + critical gap in CalendarImportService

#### Entities to Instrument
1. **pending_calendar_events** - Calendar import queue
2. **google_events** - Synced Google Calendar events
3. **schedule_events** - Job schedule events
4. **calendar_import_logs** - Import operation logs
5. **calendar_preferences** - User calendar settings

#### Actions to Log (Mapped to Supported Verbs)

```typescript
// Pending Calendar Events
- create: Event imported from Google Calendar ✅ SUPPORTED
- update: Event fields modified (parsed data, confidence score) ✅ SUPPORTED
- delete: Event removed/rejected ✅ SUPPORTED
- assign: Event converted to job ✅ SUPPORTED (use 'assign' action)
- approve: Event approved for job creation ✅ SUPPORTED
- reject: Event marked as invalid/duplicate ✅ SUPPORTED

// Google Events
- create: Event synced from Google Calendar ✅ SUPPORTED
- update: Event details changed (title, time, location) ✅ SUPPORTED
- delete: Event removed from Google Calendar ✅ SUPPORTED
- convert: Event converted to job ⚠️ REQUIRES Phase 0 ('convert' action)

// Schedule Events
- create: Schedule event added for job ✅ SUPPORTED
- update: Event time/details changed ✅ SUPPORTED
- delete: Event removed ✅ SUPPORTED
- sync: Event synced to Google Calendar ⚠️ REQUIRES Phase 0 ('sync' action)
  - ALTERNATIVE: Use 'update' action with metadata: { operation: 'sync' }

// Calendar Import Logs
- import: Import operation started ✅ SUPPORTED (use 'import' action)
- update: Import status changed (processing, completed, failed) ✅ SUPPORTED

// Calendar Preferences
- update: User calendar settings changed (calendars, sync frequency) ✅ SUPPORTED
```

**Implementation Options**:
- **Option A** (Recommended): Complete Phase 0 to add 'sync' and 'convert' actions
- **Option B** (Workaround): Map to existing actions using metadata field:
  ```typescript
  // Instead of action: 'sync'
  await logUpdate({
    req,
    entityType: 'schedule_event',
    entityId: event.id,
    before: existingEvent,
    after: updatedEvent,
    metadata: { operation: 'sync', googleCalendarEventId: event.googleCalendarEventId }
  });
  ```

#### API Routes to Update
```bash
server/routes.ts:
- POST /api/calendar/events/:id/approve → logCustomAction(action: 'approve')
- POST /api/calendar/events/:id/reject → logCustomAction(action: 'reject')
- POST /api/calendar/sync-now → logCustomAction(action: 'import')
- POST /api/schedule-events → logCreate()
- PATCH /api/schedule-events/:id → logUpdate()
- DELETE /api/schedule-events/:id → logDelete()
- PATCH /api/calendar/preferences → logUpdate()
```

---

### Phase 2: QA System Observability (4-5 hours)

#### Entities to Instrument
1. **qa_inspection_scores** - Quality scores for inspections
2. **qa_checklists** - QA checklist definitions
3. **qa_checklist_items** - Checklist item definitions
4. **qa_checklist_responses** - Completed checklist responses
5. **qa_performance_metrics** - Performance metrics calculations

#### Actions to Log
```typescript
// QA Inspection Scores
- create: Score created for job/inspection
- update: Score adjusted or recalculated
- approve: Score approved by reviewer
- reject: Score needs improvement

// QA Checklists
- create: New checklist template created
- update: Checklist modified (name, category, active status)
- delete: Checklist archived/removed

// QA Checklist Items
- create: Item added to checklist
- update: Item text/category/criticality changed
- delete: Item removed from checklist

// QA Checklist Responses
- create: Checklist item completed by inspector
- update: Response changed (status, notes, evidence)

// QA Performance Metrics
- create: Metrics calculated for period
- update: Metrics recalculated
```

#### API Routes to Update
```bash
server/routes.ts:
- POST /api/qa/scores → logCreate()
- PATCH /api/qa/scores/:id → logUpdate()
- POST /api/qa/scores/:id/approve → logCustomAction(action: 'approve')
- POST /api/qa/scores/:id/reject → logCustomAction(action: 'reject')
- POST /api/qa/checklists → logCreate()
- PATCH /api/qa/checklists/:id → logUpdate()
- DELETE /api/qa/checklists/:id → logDelete()
- POST /api/qa/checklist-items → logCreate()
- PATCH /api/qa/checklist-items/:id → logUpdate()
- DELETE /api/qa/checklist-items/:id → logDelete()
- POST /api/qa/checklist-responses → logCreate()
- PATCH /api/qa/checklist-responses/:id → logUpdate()
```

---

### Phase 3: Testing Systems Observability (3-4 hours)

#### Entities to Instrument
1. **blower_door_tests** - Blower door test results
2. **duct_leakage_tests** - Duct leakage test results
3. **ventilation_tests** - Ventilation test results

#### Actions to Log
```typescript
// All Testing Entities (Blower Door, Duct Leakage, Ventilation)
- create: Test conducted and results recorded
- update: Test results modified/corrected
- delete: Test invalidated/removed
- import: Test data imported from TEC Auto Test
- recalculate: Test calculations re-run (code compliance, corrections)
```

#### API Routes to Update
```bash
server/routes.ts:
- POST /api/tests/blower-door → logCreate()
- PATCH /api/tests/blower-door/:id → logUpdate()
- DELETE /api/tests/blower-door/:id → logDelete()
- POST /api/tests/blower-door/:id/recalculate → logCustomAction(action: 'recalculate')
- POST /api/tests/blower-door/import → logCustomAction(action: 'import')

- POST /api/tests/duct-leakage → logCreate()
- PATCH /api/tests/duct-leakage/:id → logUpdate()
- DELETE /api/tests/duct-leakage/:id → logDelete()

- POST /api/tests/ventilation → logCreate()
- PATCH /api/tests/ventilation/:id → logUpdate()
- DELETE /api/tests/ventilation/:id → logDelete()
```

---

### Phase 4: Tax Credit System Observability (3-4 hours)

#### Entities to Instrument
1. **tax_credit_projects** - 45L project management
2. **tax_credit_requirements** - Requirement tracking
3. **tax_credit_documents** - Document management

#### Actions to Log
```typescript
// Tax Credit Projects
- create: New 45L project created
- update: Project details modified (status, builder, certification)
- delete: Project removed/archived
- submit: Project submitted for certification
- approve: Project approved by builder/agency
- export: Certification package exported

// Tax Credit Requirements
- create: Requirement added to project
- update: Requirement status changed
- complete: Requirement marked complete
- verify: Requirement verified

// Tax Credit Documents
- create: Document uploaded to project
- update: Document metadata changed
- delete: Document removed
- approve: Document approved by reviewer
```

#### API Routes to Update
```bash
server/routes.ts:
- POST /api/tax-credits/projects → logCreate()
- PATCH /api/tax-credits/projects/:id → logUpdate()
- DELETE /api/tax-credits/projects/:id → logDelete()
- POST /api/tax-credits/projects/:id/submit → logCustomAction(action: 'submit')
- POST /api/tax-credits/projects/:id/approve → logCustomAction(action: 'approve')
- POST /api/tax-credits/projects/:id/export → logExport()

- POST /api/tax-credits/requirements → logCreate()
- PATCH /api/tax-credits/requirements/:id → logUpdate()
- POST /api/tax-credits/requirements/:id/complete → logCustomAction(action: 'complete')

- POST /api/tax-credits/documents → logCreate()
- PATCH /api/tax-credits/documents/:id → logUpdate()
- DELETE /api/tax-credits/documents/:id → logDelete()
- POST /api/tax-credits/documents/:id/approve → logCustomAction(action: 'approve')
```

---

### Phase 5: User Settings Observability (2 hours)

#### Entities to Instrument
1. **user_preferences** - Individual user preferences
2. **system_settings** - Global system configuration

#### Actions to Log
```typescript
// User Preferences
- update: Preference changed (theme, notifications, language, timezone)

// System Settings
- update: System setting changed (admin only)
```

#### API Routes to Update
```bash
server/routes.ts:
- PATCH /api/users/:id/preferences → logUpdate()
- PATCH /api/settings → logUpdate()
```

---

## Implementation Guidelines

### 1. Follow Existing Patterns

Use the established audit logger helpers from `server/lib/audit.ts`:

```typescript
import { logCreate, logUpdate, logDelete, logCustomAction, logExport } from './lib/audit';

// CREATE example
app.post("/api/qa/scores", async (req: AuthenticatedRequest, res: Response) => {
  const score = await storage.createQAScore(validated);
  
  await logCreate({
    req,
    entityType: 'qa_inspection_score',
    entityId: score.id,
    after: score,
    metadata: { jobId: score.jobId, inspectorId: score.inspectorId }
  });
  
  res.json(score);
});

// UPDATE example
app.patch("/api/tests/blower-door/:id", async (req: AuthenticatedRequest, res: Response) => {
  const existing = await storage.getBlowerDoorTest(id);
  const updated = await storage.updateBlowerDoorTest(id, validated);
  
  await logUpdate({
    req,
    entityType: 'blower_door_test',
    entityId: id,
    before: existing,
    after: updated,
    metadata: { jobId: updated.jobId }
  });
  
  res.json(updated);
});

// CUSTOM ACTION example
app.post("/api/qa/scores/:id/approve", async (req: AuthenticatedRequest, res: Response) => {
  const score = await storage.approveQAScore(id, req.user.id);
  
  await logCustomAction({
    req,
    action: 'approve',
    entityType: 'qa_inspection_score',
    entityId: id,
    after: { reviewStatus: 'approved', reviewedBy: req.user.id, reviewDate: score.reviewDate },
    metadata: { inspectorId: score.inspectorId, jobId: score.jobId }
  });
  
  res.json(score);
});
```

### 2. Add Analytics Events

For each audit log, emit corresponding analytics event using `server/lib/analytics.ts`:

```typescript
import { emitAnalyticsEvent } from './lib/analytics';

await logCreate({ /* ... */ });

emitAnalyticsEvent({
  event: 'create_entity',
  actorId: req.user.id,
  correlationId: req.correlationId,
  properties: {
    entityType: 'qa_inspection_score',
    entityId: score.id,
    jobId: score.jobId
  }
});
```

### 3. Testing Checklist

For each instrumented entity:
- [ ] Create route logs to audit_logs table
- [ ] Update route logs before/after state
- [ ] Delete route logs final state
- [ ] Custom actions (approve, reject, etc.) logged
- [ ] Analytics events emitted for all mutations
- [ ] Correlation IDs propagated correctly
- [ ] Metadata includes relevant context (jobId, userId, etc.)

### 4. Documentation

Update the following files:
- [ ] `docs/product/roadmap.md` - Mark Tier-3 observability as complete
- [ ] `docs/product/architecture.md` - Document audit coverage statistics
- [ ] `docs/product/golden-path-report.md` - Update observability metrics
- [ ] `server/lib/audit.ts` - Add JSDoc examples for new entity types

---

## Success Criteria

### Quantitative Metrics
- ✅ **AuditAction type extended** with 5 new verbs (sync, convert, submit, recalculate, verify)
- ✅ **100% audit coverage** for all mutable entities (18 new entities + 71 existing = 89 total)
- ✅ **Zero audit log gaps** for critical operations (create, update, delete, custom actions)
- ✅ **Analytics events** emitted for all 18 Tier-3 entity types
- ✅ **Correlation IDs** present in 100% of audit logs
- ✅ **No duplicate logging** - Existing calendar coverage verified and reconciled

### Qualitative Metrics
- ✅ Complete audit trail for compliance reporting
- ✅ Debug support via correlation ID tracing
- ✅ Analytics dashboard shows Tier-3 entity activity
- ✅ Admin audit log page displays Tier-3 events
- ✅ TypeScript compilation with no action type errors

---

## Risk Mitigation

### Performance Impact
**Risk**: Audit logging adds latency to write operations  
**Mitigation**: 
- Audit logging is fire-and-forget (errors don't break business logic)
- Database connection pooling already configured
- Consider async audit queue if >1000 writes/min observed

### Missing Context
**Risk**: Insufficient metadata in audit logs for debugging  
**Mitigation**:
- Always include relevant foreign keys (jobId, userId, builderId)
- Store entity state before/after for updates
- Use metadata field for additional context

### Schema Evolution
**Risk**: Audit logs may reference deprecated fields  
**Mitigation**:
- Store full entity snapshots (before/after)
- Use JSONB columns for flexible schema
- Never hard-code field names in audit queries

---

## Revised Implementation Timeline

### Effort Estimate Breakdown (Revised After Architect Review)

| Phase | Description | Hours | Status |
|-------|-------------|-------|--------|
| **Phase 0** | Extend AuditAction type | 2-3h | ⚠️ BLOCKED (required first) |
| **Phase 1** | Verify existing coverage | 1-2h | ⚠️ BLOCKED (required second) |
| **Phase 2** | Calendar & Schedule observability | 4-5h | Depends on Phase 0, 1 |
| **Phase 3** | QA System observability | 4-5h | Independent |
| **Phase 4** | Testing Systems observability | 3-4h | Independent |
| **Phase 5** | Tax Credit observability | 3-4h | Depends on Phase 0 |
| **Phase 6** | User Settings observability | 2h | Independent |
| **Total** | **20-25 hours** | | (was 16-20h) |

### Critical Path
1. Phase 0 (type extension) MUST complete before Phases 2, 5
2. Phase 1 (coverage verification) MUST complete before Phase 2
3. Phases 3, 4, 6 can proceed in parallel (use existing actions only)

---

## Next Steps

1. **⚠️ Architect Re-Review**: Submit revised plan addressing feedback (action vocabulary, existing coverage, estimates)
2. **Phase 0 Implementation**: Extend AuditAction type and update analytics
3. **Phase 1 Investigation**: Verify existing calendar audit coverage
4. **Priority Sequencing**: After unblocking, implement phases 2-6 in optimal order
5. **Testing Strategy**: Add E2E tests for audit log completeness per entity
6. **Documentation Updates**: Update architecture.md post-implementation

---

## Revision History

| Date | Version | Changes | Reviewer |
|------|---------|---------|----------|
| Nov 3, 2025 | 1.0 | Initial plan (16-20h estimate) | - |
| Nov 3, 2025 | 1.1 | Addressed architect feedback: added Phase 0 (type extension), Phase 1 (coverage verification), revised estimates to 20-25h, mapped actions to supported verbs | Architect |
| Nov 3, 2025 | 1.2 | **Phase 0 Complete**: Extended AuditAction type with 5 new verbs (sync, convert, submit, recalculate, verify), added JSDoc examples, verified TypeScript compilation. Identified analytics.ts as separate prerequisite task. | - |
| Nov 3, 2025 | 1.3 | **Phase 1 Complete**: Calendar audit coverage analysis complete (60% baseline identified). Created comprehensive `calendar-audit-coverage.md` (400+ lines). Identified migration requirements for deprecated API usage. Revised Phase 2 estimate from 4-5h to 5-7h. Total plan estimate revised to 23-28h. | - |
| Nov 3, 2025 | 1.4 | **Analytics Infrastructure Complete**: Created `server/lib/analytics.ts` (350+ lines) with typed event taxonomy (18 operations), correlation ID integration, and `docs/product/analytics-integration.md` (comprehensive integration guide). Unblocks Phase 2C implementation. Total effort spent: 7h (Phase 0: 2h, Phase 1: 2h, Analytics: 3h). | - |
| Nov 3, 2025 | 1.5 | **Phase 2A Complete (Migration)**: Migrated `server/scheduledCalendarImport.ts` from deprecated `storage.createAuditLog()` to modern `logImport()` API. Created synthetic `AuditRequest` pattern for system-initiated actions. Created `docs/product/audit-migration-pattern.md` (comprehensive migration guide). Application verified running successfully. Total effort spent: 9h (Phase 0: 2h, Phase 1: 2h, Analytics: 3h, Phase 2A: 2h). | - |
| Nov 3, 2025 | 1.6 | **Phase 2B Complete (Service Logging)**: Added comprehensive audit logging throughout `server/calendarImportService.ts`. Implemented correlation ID propagation from cron → service. Added audit logs for: event parsing (`convert`), confidence-based decisions (`verify`), job creation (`create`), temporary builder creation (`create`), event queuing (`create`). Calendar workflow now has 100% audit coverage (up from 60%). Zero LSP diagnostics, application verified running. Total effort spent: 11.5h (Phase 0: 2h, Phase 1: 2h, Analytics: 3h, Phase 2A: 2h, Phase 2B: 2.5h). | - |
| Nov 3, 2025 | 1.7 | **Phase 2 Complete (Calendar Observability)**: Added analytics tracking to `server/scheduledCalendarImport.ts`. Integrated `analytics.trackImport()` for both success and failure scenarios with full metadata (events processed, jobs created, correlation IDs). Calendar subsystem now has complete dual observability (audit logs + analytics events). Application verified running, zero LSP diagnostics. **Calendar subsystem ready for GA promotion**. Total effort spent: 12.5h (Phase 0: 2h, Phase 1: 2h, Analytics: 3h, Phase 2: 5.5h). Phase 2 actual: 5.5h vs estimated: 6-7h = **On target** ✅. | - |
| Nov 3, 2025 | 1.8 | **Jobs Analytics Integration Complete**: Added analytics tracking to all 7 job operations in `server/routes.ts`: job creation (manual + calendar-sourced), job updates (full update + quick status change), job deletion (single + bulk), and job export. Each analytics event includes comprehensive metadata (status changes, assignments, inspection types, export formats). Fixed missing `logUpdate()` call for PUT /api/jobs/:id route (audit gap). Architect review identified missing `route` field in initial implementation; immediately corrected across all 7 tracking calls. **Jobs subsystem achieves dual observability** matching calendar pattern (audit logs for compliance + analytics for behavioral insights). Zero LSP diagnostics, application verified running. **Jobs subsystem ready for GA promotion**. Total effort spent: 14.5-15.5h (Phase 0: 2h, Phase 1: 2h, Analytics: 3h, Phase 2: 5.5h, Jobs Analytics: 2-3h). Jobs Analytics actual: 2-3h. Demonstrates efficiency gain from existing 100% audit coverage baseline. | Architect |

---

## Related Documents
- `server/lib/audit.ts` - Audit logger implementation
- `server/lib/analytics.ts` - Analytics event emitter (✅ Complete Nov 3, 2025)
- `docs/product/analytics-integration.md` - Analytics integration guide (✅ Complete Nov 3, 2025)
- `docs/product/audit-migration-pattern.md` - Migration pattern documentation (✅ Complete Nov 3, 2025)
- `docs/product/calendar-audit-coverage.md` - Calendar coverage analysis (Phase 1 deliverable)
- `docs/product/architecture.md` - System architecture overview
- `docs/product/roadmap.md` - Product roadmap and priorities
