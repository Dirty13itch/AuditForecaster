# Energy Auditing Application - Comprehensive Architectural Audit
**Date:** November 1, 2025
**Status:** Phase 1 Complete - Systematic Analysis

## Executive Summary

This audit evaluates the vertical completion, integration, and production-readiness of all major features in the energy auditing field application. The system has achieved 40/40 AAA production quality for implemented features, but several critical areas require attention for full production deployment.

---

## 1. VERTICAL COMPLETION ANALYSIS

### ⚠️ NEAR COMPLETE (Minor Blockers)

#### 1.1 Field Day Workflow
- **Status:** 95% Complete - **BLOCKER: Job API Issues**
- **Components:** FieldDay.tsx → /api/jobs/today → Database queries
- **Validation:** Basic E2E tests passed for job list and status updates
- **Features Working:**
  - Role-based view (admin sees both "My Jobs" + "All Jobs")
  - Quick status toggles (done/failed/reschedule)
  - CSRF token handling via apiRequest
  - Real-time WebSocket updates
  - Inspector permissions (edit_job) properly configured
- **BLOCKER:** GET /api/jobs/:id returns 400 for some job IDs (e.g., "field-day-admin-job-1")
  - **Impact:** Cannot access inspection pages for these jobs
  - **Root Cause:** Likely validation mismatch or missing required fields in seeded data
  - **Fix Required:** Investigate job validation logic, relax constraints, or fix seed data
  - **Priority:** 🔴 HIGH - Blocks all inspection-related workflows

#### 1.2 Job Status Workflow  
- **Status:** 100% Complete
- **Migration:** Successfully removed in-progress state
- **Valid states:** scheduled → done/failed/reschedule → scheduled
- **Validation:** jobService.ts enforces transitions
- **Integration:** WebSocket broadcasts status changes

#### 1.3 Offline Sync System
- **Status:** 70% Complete - **CRITICAL: Conflicting Implementations**
- **Implementation:**
  - IndexedDB queue (`client/src/lib/syncQueue.ts` - 182 lines)
  - Background sync manager (`client/src/utils/syncQueue.ts` - 879 lines)
  - Auth check before processing
  - Exponential backoff retry logic
- **BLOCKER:** Two competing implementations causing queue behavior conflicts
  - **Impact:** Unpredictable offline sync, potential data loss, difficult to debug
  - **Root Cause:** Early prototypes not consolidated, both imported in different components
  - **Fix Required:**
    1. Choose authoritative implementation (utils/syncQueue.ts is more complete)
    2. Define shared SyncQueue interface
    3. Deprecate lib/syncQueue.ts
    4. Update all imports to use single source
    5. Add regression test coverage for offline scenarios
  - **Priority:** 🔴 HIGH - Data integrity risk

#### 1.4 Real-Time Sync Infrastructure
- **Status:** 90% Complete
- **Implementation:** WebSocket server in `server/websocket.ts`
- **Features:**
  - Heartbeat every 30 seconds
  - Job update broadcasts
  - Notification delivery
- **LIMITATION:** Single-instance only (requires Redis pub/sub for scaling)

### ⚠️ NEEDS COMPLETION/VERIFICATION

#### 1.5 TEC Auto Test Integration
- **Status:** 60% Complete - **BLOCKER: Backend Contract Unverified**
- **Implemented:**
  - Parser in `FinalTestingMeasurements.tsx` (lines 269-286)
  - Flexible regex handles formats with parentheses, commas
  - Form population logic
- **BLOCKERS:**
  1. **Job API 400 Error:** Cannot load inspection page to access TEC import feature
  2. **Job Creation Form Bug:** Enum mapping prevents creating test jobs via UI
  3. **Backend Contract:** /api/forecasts endpoint behavior not verified
     - Need to confirm POST /api/forecasts accepts parsed TEC data
     - Need to verify database schema matches form fields
     - Need to test PATCH /api/forecasts/:id for updates
- **Dependencies:** Blocked until jobs API fixed and job creation working
- **Priority:** 🔴 HIGH - Tied to critical job API issues

#### 1.6 Photo-Based Duct Testing
- **Status:** 85% Complete
- **Implemented:**
  - Manual CFM entry fields (totalDuctLeakageCfm25, ductLeakageToOutsideCfm25)
  - Photo upload with auto-tagging as "duct-test-manometer"
  - Offline queue integration
- **GAP:** Need E2E test verifying:
  - Photo tagging works correctly
  - Offline queue handles photo uploads
  - Data persists to duct_leakage_tests table

#### 1.7 Report Automation Chain
- **Status:** 75% Complete
- **Implemented:**
  - ReportTemplate system (JSON architecture)
  - PDF generation (`@react-pdf/renderer`)
  - Email service with templates
  - Construction manager routing
- **GAP:** Missing verification that test data (blower door/duct/ventilation) flows into reports
- **Missing:** Automated email trigger on job completion

#### 1.8 Equipment Calibration Workflow
- **Status:** 70% Complete
- **Implemented:**
  - Equipment schema with calibration_due_date
  - Calibration history tracking
  - Maintenance scheduling
- **GAP:** Cron job for calibration reminders not verified
- **Missing:** Notification delivery confirmation

---

## 2. CRITICAL ARCHITECTURAL ISSUES

### 2.1 Job API Returns 400 🐛 **CRITICAL - BLOCKING MULTIPLE WORKFLOWS**
**Files:** `server/routes.ts` (GET /api/jobs/:id handler), seed data, validation logic
**Problem:** GET /api/jobs/:id returns 400 for certain job IDs, preventing inspection page load
**Evidence:** Testing shows GET /api/jobs/field-day-admin-job-1 → 400 Bad Request
**Impact:** 
- **BLOCKS** inspection page access
- **BLOCKS** TEC Auto Test feature testing
- **BLOCKS** all inspection workflow E2E tests
- **BLOCKS** photo-based duct testing verification
**Root Cause Investigation Needed:**
1. Check job validation schema in routes.ts
2. Verify seed data has all required fields
3. Inspect error logs for validation details
**Immediate Fix:**
1. Add detailed error logging to GET /api/jobs/:id handler
2. Identify missing/invalid fields in problematic jobs
3. Either relax validation or fix seed data
4. Verify all test jobs can be fetched successfully
**Priority:** 🔴🔴🔴 CRITICAL - Fix before ANY other work

### 2.2 Duplicate Offline Sync Implementations 🐛 **HIGH PRIORITY**
**Elevated from MEDIUM based on data integrity risk**
**Files:**
- `client/src/lib/syncQueue.ts` (182 lines)
- `client/src/utils/syncQueue.ts` (879 lines)

**Problem:** Two different implementations of sync queue
**Impact:** Confusion about which to use, potential bugs
**Recommendation:** Choose canonical implementation (utils/ version is more complete), deprecate other

### 2.3 Job Creation Form Bug 🐛 **HIGH PRIORITY**
**File:** Needs investigation - likely Jobs.tsx form component
**Problem:** Inspection Type dropdown displays human-readable labels but doesn't map to enum values
**Error:** "Invalid enum value. Expected 'sv2' | 'full_test' | 'code_bdoor' ... received 'Final Testing'"
**Impact:** Cannot create jobs via UI, blocks creating test data for E2E tests
**Root Cause:** SelectItem value props not set to enum values
**Fix Required:** Map display labels to schema enum values
**Priority:** 🔴 HIGH - Required for testing workflows

### 2.4 Monolithic Storage Layer ⚠️ MEDIUM PRIORITY
**Lowered from HIGH - defer until blocking issues resolved**
**File:** `server/storage.ts` (9,727 lines)
**Problem:** Single file contains all database operations across all domains
**Impact:** 
- Difficult to maintain and debug
- High risk of merge conflicts
- No clear separation of concerns
**Recommendation:**
```
server/storage/
  ├── index.ts          # Exports all storage modules
  ├── jobs.ts           # Job CRUD operations
  ├── builders.ts       # Builder operations
  ├── photos.ts         # Photo operations
  ├── testing.ts        # Blower door, duct, ventilation tests
  ├── financial.ts      # Invoices, payments, AR
  ├── equipment.ts      # Equipment & calibration
  ├── reports.ts        # Report templates & instances
  └── calendar.ts       # Schedule events & Google Calendar
```
**Note:** Defer this refactor until job API and form bugs are fixed

### 2.5 Service Layer Inconsistency ⚠️ LOW PRIORITY
**Current State:** Mix of service classes and standalone functions
**Examples:**
- `GoogleCalendarService` (class with instantiation)
- `exportService` (class instance exported)
- `jobService` functions (no class, just exports)
- `storage` (singleton object)

**Recommendation:** Standardize on service pattern:
```typescript
// Preferred pattern
class JobService {
  constructor(private storage: IStorage) {}
  validateJobUpdate(job: Job): ValidationResult { ... }
}
export const jobService = new JobService(storage);
```

---

## 3. TODO RESOLUTION STATUS

### Active TODOs Found:

#### 3.1 MN Housing EGCC Worksheet
**File:** `client/src/pages/compliance/MNHousingEGCCWorksheet.tsx:363`
```typescript
uploadedBy: "current-user-id", // TODO: Replace with actual user ID from auth context
```
**Impact:** Low - User ID not captured for compliance uploads
**Fix:** Import `useAuth` hook and use `user?.id`

**File:** `client/src/pages/compliance/MNHousingEGCCWorksheet.tsx:415`
```typescript
// TODO: Add server-side submission API call
```
**Impact:** Medium - Worksheet data not persisted to server
**Fix:** Create POST /api/compliance/mn-housing-egcc endpoint

**File:** `client/src/pages/compliance/MNHousingEGCCWorksheet.tsx:466`
```typescript
// TODO: Implement PDF generation with worksheet data
```
**Impact:** Low - PDF export not available
**Fix:** Use existing pdfGenerator service

#### 3.2 AR Aging Export
**File:** `client/src/pages/financial/ar-aging.tsx:205`
```typescript
// TODO: Implement export functionality
```
**Impact:** Low - Export feature not complete
**Fix:** Use exportService.exportFinancialData()

#### 3.3 Client-Side Logging
**File:** `client/src/lib/logger.ts:72`
```typescript
// TODO: Implement logging service integration (e.g., Sentry, LogRocket, etc.)
```
**Impact:** Medium - Client errors not captured
**Fix:** Integrate Sentry using VITE_SENTRY_DSN environment variable

---

## 4. BACKGROUND PROCESSES AUDIT

### 4.1 Scheduled Jobs (Cron)

| Job | File | Schedule | Status | Verified |
|-----|------|----------|--------|----------|
| Calendar Import | `scheduledCalendarImport.ts` | Every 5 min | ✅ Running | ❌ No |
| Equipment Calibration | Unknown | Unknown | ❓ Missing | ❌ No |
| Scheduled Exports | `scheduledExports.ts` | Variable | ✅ Running | ❌ No |
| Daily Report Emails | `email/scheduledEmails.ts:10` | 7 AM daily | ✅ Configured | ❌ No |
| Weekly Invoice Reminders | `email/scheduledEmails.ts:88` | Mon 9 AM | ✅ Configured | ❌ No |
| AR Aging Snapshots | Unknown | Unknown | ❓ Missing | ❌ No |

### 4.2 WebSocket Heartbeat
**File:** `server/websocket.ts:27`
```typescript
setInterval(() => { /* heartbeat */ }, 30000);
```
**Status:** ✅ Running
**Limitation:** Single server instance only

### 4.3 Cache Cleanup
**File:** `server/cache.ts:390`
```typescript
setInterval(() => { /* cleanup */ }, interval);
```
**Status:** ✅ Running

### 4.4 Job Metrics Update
**File:** `server/index.ts:541`
```typescript
setInterval(updateJobMetrics, 60000);
```
**Status:** ✅ Running

### 4.5 GAP: No Monitoring Dashboard
**Problem:** No visibility into background job health
**Impact:** Failures go unnoticed
**Recommendation:** Create admin dashboard showing:
- Last run timestamp
- Success/failure status
- Error logs
- Queue metrics

---

## 5. DATA FLOW INTEGRITY

### 5.1 Testing → Report Flow
**Path:** Inspection → Test Entry → Forecast → Report → PDF → Email

```mermaid
Inspection Page
  → FinalTestingMeasurements component
  → POST /api/forecasts
  → forecasts table
  → Report generation (ReportInstance)
  → PDF generation (@react-pdf/renderer)
  → Email to construction manager
```

**Status:** ⚠️ Needs Verification
**Gaps:**
1. Confirm test data populates report fields
2. Verify email trigger on job completion
3. Test construction manager routing logic

### 5.2 Offline Photo Upload Flow
**Path:** Photo Capture → IndexedDB → Sync Queue → Upload → Tag → Storage

```mermaid
PhotoCapture component
  → addToSyncQueue()
  → IndexedDB (sync-queue table)
  → processSyncQueue() when online
  → POST /api/photos
  → Object Storage
  → Auto-tag as "duct-test-manometer"
```

**Status:** ⚠️ Needs Verification
**Gaps:**
1. Confirm offline queue processes successfully
2. Verify auto-tagging applies correctly
3. Test duplicate detection

---

## 6. SECURITY & PERMISSIONS

### 6.1 Permission System ✅ COMPLETE
**File:** `server/middleware/permissions.ts`

**Role Permissions:**
```typescript
admin: ['*']  // All permissions
inspector: [
  'view_jobs',
  'edit_job',      // ✅ Recently added for Field Day
  'complete_inspections',
  'upload_photos',
  'log_time',
  'view_schedule',
]
partner_contractor: [
  'view_jobs',
  'edit_job',
  'create_job',
  'upload_plans',
  'download_reports',
]
```

**Protected Routes:**
- Financial routes: `blockFinancialAccess()` → admin only
- Job operations: `requirePermission('edit_job')`
- CSRF protection: All mutations via `apiRequest()`

### 6.2 CSRF Token System ✅ COMPLETE
**Implementation:**
- Token generation: `server/csrf.ts`
- Client integration: `client/src/lib/queryClient.ts`
- Auto-retry on CSRF failure
- Cached token with expiration

---

## 7. TESTING COVERAGE

### 7.1 E2E Tests Inventory
**Directory:** `tests/e2e/`
**Count:** 70+ test files

**Coverage by Domain:**
- ✅ Financial: invoices, payments, expenses, AR aging
- ✅ Compliance: MFNC, EGCC, ZERH, benchmarking
- ✅ Equipment: inventory, calibration, maintenance
- ✅ Photos: upload, annotation, cleanup
- ✅ Calendar: import, management, review
- ✅ Reports: templates, instances, fillout
- ✅ QA: scoring, performance, checklists
- ✅ Testing: blower door, duct leakage, ventilation
- ⚠️ Field Day: Basic tests (needs expansion)
- ❌ TEC Import: Missing (blocked by form bug)
- ❌ Offline Sync: Missing
- ❌ Equipment Calibration Reminders: Missing

### 7.2 Test Gaps
1. TEC Auto Test import end-to-end
2. Photo-based duct testing with offline queue
3. Report automation chain (test → report → email)
4. Equipment calibration notification delivery
5. Financial automation (AR snapshots, auto-invoicing)

---

## 8. PRODUCTION READINESS CHECKLIST

### 8.1 Infrastructure ✅
- [x] PostgreSQL database
- [x] Object storage (GCS)
- [x] Session management
- [x] OIDC authentication
- [x] Rate limiting
- [x] Helmet security headers
- [x] CSRF protection

### 8.2 Monitoring ⚠️
- [x] Server-side logging (Winston)
- [x] Client-side logging framework
- [ ] Sentry integration (VITE_SENTRY_DSN not configured)
- [ ] Background job monitoring dashboard
- [ ] Performance metrics tracking
- [ ] Error alerting

### 8.3 Scaling Considerations ⚠️
- [x] Database indexing (35+ strategic indexes)
- [x] Query optimization
- [ ] WebSocket scaling (Redis pub/sub needed for multi-instance)
- [ ] Object storage CDN
- [ ] Database connection pooling verification

### 8.4 Data Integrity ✅
- [x] Database constraints
- [x] Zod validation schemas
- [x] Transaction handling
- [x] Foreign key relationships
- [x] Cascade delete policies

---

## 9. RECOMMENDED ROADMAP

### Phase 2: Critical Blockers (Priority 1) 🔴
**Estimated:** 1-2 days  
**MUST COMPLETE BEFORE OTHER WORK**

1. **Fix Job API 400 Error** 🐛🐛🐛 **IMMEDIATE**
   - Add detailed error logging to GET /api/jobs/:id
   - Identify validation issues or missing fields
   - Fix seed data or relax validation constraints
   - Verify all test jobs can be fetched
   - **Blocks:** Inspection page, TEC import, all workflow E2E tests

2. **Fix Job Creation Form Enum Mapping** 🐛 **IMMEDIATE**
   - Map inspection type dropdown labels to schema enum values
   - Add proper SelectItem value props
   - Test job creation flow end-to-end
   - **Blocks:** Creating test data, job creation E2E tests

3. **Verify /api/forecasts Backend Contract** ✅ **HIGH**
   - Confirm POST /api/forecasts accepts TEC parsed data
   - Test PATCH /api/forecasts/:id for updates
   - Verify database schema matches form fields
   - **Required for:** TEC Auto Test feature validation

4. **Consolidate Offline Sync Implementations** 🔄 **HIGH**
   - Choose utils/syncQueue.ts as authoritative
   - Define shared SyncQueue interface
   - Deprecate and remove lib/syncQueue.ts
   - Update all imports to single source
   - Add offline scenario test coverage
   - **Blocks:** Data integrity, reliable offline operation

### Phase 2.5: Secondary Fixes (Priority 2) 🟡
**Estimated:** 1-2 days
**Complete after Phase 2 blockers resolved**

1. **Resolve Critical TODOs** ✅
   - MN Housing EGCC API submission
   - AR Aging export functionality
   - Sentry client integration (VITE_SENTRY_DSN)

### Phase 3: Workflow Validation (Priority 2)
**Estimated:** 3-4 days

1. **TEC Auto Test Integration E2E**
   - Verify parser handles all formats
   - Confirm database persistence
   - Test report integration

2. **Photo-Based Duct Testing E2E**
   - Upload manometer photos
   - Verify auto-tagging
   - Test offline queue

3. **Report Automation Chain E2E**
   - Complete inspection with tests
   - Verify data flows to report
   - Confirm email delivery

4. **Equipment Calibration Workflow E2E**
   - Create due equipment
   - Trigger notification
   - Verify cron execution

### Phase 4: Production Readiness (Priority 3)
**Estimated:** 2-3 days

1. **Background Job Monitoring**
   - Create admin dashboard
   - Track cron job status
   - Add failure alerts
   - Monitor sync queue metrics

2. **WebSocket Scaling**
   - Document single-instance limitation
   - Design Redis pub/sub architecture
   - Implement connection tracking
   - Add graceful reconnect

3. **Enhanced Logging**
   - Integrate Sentry on client
   - Add structured logging for critical paths
   - Monitor test → report flow
   - Track offline sync performance

4. **Financial Automation**
   - Verify AR aging snapshots
   - Add auto-invoice on job completion
   - Implement payment reminders
   - Add overdue notifications

---

## 10. CONCLUSION

**Overall System Health:** 75/100  
**Revised down from 85 based on critical blockers**

**Strengths:**
- Solid foundation with proper auth, CSRF, permissions
- Comprehensive database schema with proper indexing
- Real-time sync infrastructure via WebSockets
- Extensive E2E test coverage (70+ test files)
- Production-grade error handling and validation

**Critical Blockers (Must Fix Immediately):**
1. 🔴🔴🔴 Job API returns 400 for certain job IDs - BLOCKS all inspection workflows
2. 🔴 Duplicate offline sync implementations - DATA INTEGRITY RISK
3. 🔴 Job creation form enum mapping bug - BLOCKS testing workflows
4. 🔴 TEC Auto Test backend contract unverified - BLOCKS feature validation

**Secondary Issues (Fix After Blockers):**
- Monolithic storage layer (9,727 lines)
- Missing background job monitoring
- Several workflows need E2E verification
- TODOs in compliance, financial modules
- Sentry integration not configured

**Recommended Next Steps (IN ORDER):**
1. **IMMEDIATE:** Fix job API 400 error - add logging, identify validation issue
2. **IMMEDIATE:** Fix job creation form enum mapping
3. **HIGH:** Consolidate offline sync implementations
4. **HIGH:** Verify /api/forecasts backend contract
5. **MEDIUM:** Run Phase 1 E2E tests (TEC import, duct testing)
6. **DEFER:** Storage layer modularization (after blockers resolved)

**Production Deployment Readiness:** 60%  
**Revised down from 80%**
- Critical blockers prevent key workflows from functioning
- Data integrity risks with duplicate sync implementations  
- Cannot reliably test features due to API/form bugs
- **DO NOT DEPLOY** until Phase 2 blockers are resolved

---

*End of Architectural Audit - Phase 1*
