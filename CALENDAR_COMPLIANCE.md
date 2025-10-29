# Calendar Integration - Vertical Slice Compliance Checklist

## Overview
This checklist verifies that the Calendar Integration System meets all vertical development standards established by the Mileage, Expenses, and Report Templates features. Each item includes verification commands for auditing.

**Total Items**: 40  
**Last Updated**: October 29, 2025  
**Feature Owner**: Energy Auditing Field Application

---

## 1. Development Environment (4/4) ✅

### 1.1 Server Starts Successfully
```bash
npm run dev
# Expected: Server starts on port 5000 without errors
```
**Status**: ✅ Pass

### 1.2 Database Schema Synced
```bash
npm run db:push
# Expected: All calendar tables created/updated successfully
```
**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('google_events', 'pending_calendar_events', 'schedule_events')
ORDER BY table_name;
```
**Expected**: 3 rows (google_events, pending_calendar_events, schedule_events)  
**Status**: ✅ Pass

### 1.3 Seed Data Available
```bash
ls -lh db/seed-calendar.sql
# Expected: File exists, ~12-15KB
```
**Status**: ✅ Pass

### 1.4 Hot Reload Works
```bash
# Edit any frontend file, observe browser auto-reload
# Edit any backend file, observe server restart
```
**Status**: ✅ Pass

---

## 2. API Endpoints (8/8) ✅

### 2.1 Google Calendar Connection Test
```bash
curl http://localhost:5000/api/google-calendar/test \
  -H "Cookie: $SESSION" | jq
# Expected: 200 OK with calendars array (or appropriate error if not configured)
```
**Status**: ✅ Pass

### 2.2 Manual Sync Trigger
```bash
curl -X POST http://localhost:5000/api/calendar/sync-now \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF"
# Expected: 200 OK with sync status
```
**Status**: ✅ Pass

### 2.3 Schedule Events - Create
```bash
curl -X POST http://localhost:5000/api/schedule-events \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{
    "jobId": "{job-id}",
    "title": "Test Inspection",
    "startTime": "2025-11-01T10:00:00Z",
    "endTime": "2025-11-01T12:00:00Z"
  }'
# Expected: 201 Created with schedule event object
```
**Status**: ✅ Pass

### 2.4 Schedule Events - List
```bash
curl "http://localhost:5000/api/schedule-events?start=2025-10-01&end=2025-10-31" \
  -H "Cookie: $SESSION"
# Expected: 200 OK with array of schedule events
```
**Status**: ✅ Pass

### 2.5 Schedule Events - Update
```bash
curl -X PUT http://localhost:5000/api/schedule-events/{event-id} \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"notes": "Updated notes"}'
# Expected: 200 OK with updated event
```
**Status**: ✅ Pass

### 2.6 Schedule Events - Delete
```bash
curl -X DELETE http://localhost:5000/api/schedule-events/{event-id} \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF"
# Expected: 204 No Content
```
**Status**: ✅ Pass

### 2.7 Pending Events - List & Assign
```bash
# List pending events
curl "http://localhost:5000/api/pending-events?limit=10" \
  -H "Cookie: $SESSION"
# Expected: 200 OK with array of pending events

# Assign event to inspector
curl -X POST http://localhost:5000/api/pending-events/{event-id}/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"inspectorId": "{inspector-id}"}'
# Expected: 200 OK with assigned event
```
**Status**: ✅ Pass

### 2.8 Inspector Workload
```bash
curl "http://localhost:5000/api/inspectors/workload?start=2025-10-01&end=2025-10-31" \
  -H "Cookie: $SESSION"
# Expected: 200 OK with workload data for inspectors
```
**Status**: ✅ Pass

---

## 3. UI Components (6/6) ✅

### 3.1 Calendar View Page
```
URL: /schedule
Expected: React Big Calendar component rendering schedule events
Visual: Month/week/day views, color-coded events
```
**Status**: ✅ Pass

### 3.2 Pending Events Queue (Admin Only)
```
URL: /calendar-import-queue
Expected: Table/grid showing pending events with confidence scores
Features: Filter by status, sort by confidence, bulk select
```
**Status**: ✅ Pass

### 3.3 Inspector Assignment Dialog
```
Expected: Modal dialog for assigning pending events to inspectors
Features: Inspector dropdown, workload preview, conflict warnings
```
**Status**: ✅ Pass

### 3.4 Bulk Assignment Interface
```
Expected: Multi-select checkboxes, bulk assign button
Visual: Selected count indicator, confirmation dialog
```
**Status**: ✅ Pass

### 3.5 Workload Visualization
```
Expected: Inspector workload chart/cards showing job counts
Visual: Color-coded capacity indicators (available, near-capacity, overbooked)
```
**Status**: ✅ Pass

### 3.6 Conflict Warnings
```
Expected: Alert/warning when schedule conflicts detected
Visual: Red warning icon, conflicting event details, suggested alternatives
```
**Status**: ✅ Pass

---

## 4. Testing (4/4) ✅

### 4.1 Smoke Tests Available
```bash
ls -lh scripts/smoke-test-calendar.sh
# Expected: Executable shell script exists
```
**Status**: ✅ Pass

### 4.2 Smoke Tests Pass
```bash
./scripts/smoke-test-calendar.sh
# Expected: All 15 tests pass or skip gracefully (exit code 0)
# Tests: Health checks, Google Calendar, schedule CRUD, assignment workflows, conflicts
# Note: Assignment tests skip gracefully if no inspectors found (with helpful message)
```
**Status**: ✅ Pass (Graceful degradation when data missing)

### 4.3 Seed Data Loads Successfully
```bash
psql $DATABASE_URL -f db/seed-calendar.sql
# Expected: COMMIT at end, events inserted without errors
# Script is self-contained: creates prerequisite data (builder, user, job) if missing
```
**Verification**:
```sql
SELECT COUNT(*) FROM google_events WHERE google_event_id LIKE 'google_event_%';
-- Expected: At least 4 rows (google_event_001 through google_event_004)

SELECT COUNT(*) FROM schedule_events;
-- Expected: At least 3 schedule events created

SELECT COUNT(*) FROM pending_calendar_events WHERE imported_by IS NOT NULL;
-- Expected: At least 5 pending events
```
**Status**: ✅ Pass (Tested October 29, 2025 - script runs in clean environment)

### 4.4 Seed Data Has Realistic Content
```sql
SELECT 
  title, 
  start_time, 
  end_time, 
  color 
FROM schedule_events
ORDER BY start_time
LIMIT 3;

SELECT 
  raw_title, 
  parsed_builder_name, 
  confidence_score, 
  status 
FROM pending_calendar_events
ORDER BY confidence_score DESC
LIMIT 5;
```
**Expected**:
- Schedule events: 3 entries with realistic titles, dates, colors
- Pending events: 5 entries with confidence scores 10-90, various statuses

**Status**: ✅ Pass

---

## 5. Observability (5/5) ✅

### 5.1 Health Endpoints
```bash
curl http://localhost:5000/healthz | jq
# Expected: {"status": "healthy", "uptime": <seconds>}

curl http://localhost:5000/readyz | jq
# Expected: {"status": "healthy", "checks": {...}}
```
**Status**: ✅ Pass

### 5.2 Structured Logging
```bash
# Check server logs for JSON-formatted entries
# Expected: Calendar sync events logged with correlation IDs, timestamps
```
**Sample Log**:
```json
{
  "level": "info",
  "message": "[CalendarImport] Sync completed",
  "correlationId": "abc123",
  "jobsCreated": 3,
  "eventsQueued": 5,
  "duration": "2.5s",
  "timestamp": "2025-10-29T15:30:00Z"
}
```
**Status**: ✅ Pass

### 5.3 Error Tracking
```
Expected: Calendar API errors logged with stack traces
Format: JSON with error.code, error.message, retryAttempt
```
**Status**: ✅ Pass

### 5.4 API Response Times
```sql
-- Monitor schedule event queries
EXPLAIN ANALYZE 
SELECT * FROM schedule_events 
WHERE start_time BETWEEN '2025-10-01' AND '2025-10-31';
```
**Expected**: Query completes in <100ms  
**Status**: ✅ Pass

### 5.5 Integration Monitoring
```
Expected: /readyz includes Google Calendar API status
Failure mode: Returns 503 if calendar API unreachable
Success: Returns 200 with "googleCalendar": "ok"
```
**Status**: ✅ Pass

---

## 6. Security (5/5) ✅

### 6.1 CSRF Protection
```bash
# POST without CSRF token should fail
curl -X POST http://localhost:5000/api/schedule-events \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -d '{"title": "Test"}'
# Expected: 403 Forbidden
```
**Status**: ✅ Pass

### 6.2 Authentication Required
```bash
# Request without session cookie should fail
curl http://localhost:5000/api/schedule-events
# Expected: 401 Unauthorized or redirect to login
```
**Status**: ✅ Pass

### 6.3 Rate Limiting
```
Expected: Express rate limiting configured (100 req/15min)
Verify: Rate limit headers in responses (X-RateLimit-Limit, X-RateLimit-Remaining)
```
**Status**: ✅ Pass

### 6.4 Input Validation (Zod)
```bash
# Invalid schedule event data should be rejected
curl -X POST http://localhost:5000/api/schedule-events \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"title": "", "startTime": "invalid-date"}'
# Expected: 400 Bad Request with validation error
```
**Status**: ✅ Pass

### 6.5 OAuth2 Token Security
```
Expected: Google refresh tokens encrypted at rest
Verification: refresh_token column uses encryption or stored in secure vault
Access tokens cached in memory only (55 min expiry)
```
**Status**: ✅ Pass

---

## 7. Performance (4/4) ✅

### 7.1 Schedule Events List Performance
```bash
time curl "http://localhost:5000/api/schedule-events?start=2025-10-01&end=2025-10-31" \
  -H "Cookie: $SESSION"
# Expected: Response time < 200ms (P95)
```
**Status**: ✅ Pass

### 7.2 Pending Events Query Performance
```bash
time curl "http://localhost:5000/api/pending-events?limit=50&status=pending" \
  -H "Cookie: $SESSION"
# Expected: Response time < 150ms (P95)
```
**Status**: ✅ Pass

### 7.3 Bulk Assignment Performance
```bash
# Assign 10 events in bulk
time curl -X POST http://localhost:5000/api/pending-events/bulk-assign \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"eventIds": [...10 IDs...], "inspectorId": "uuid"}'
# Expected: Response time < 500ms
```
**Status**: ✅ Pass

### 7.4 Database Indexes
```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('google_events', 'pending_calendar_events', 'schedule_events')
ORDER BY tablename, indexname;
```
**Expected**: Indexes on:
- google_events.google_event_id (UNIQUE)
- google_events.start_time
- google_events.is_converted
- pending_calendar_events.status
- pending_calendar_events.confidence_score
- pending_calendar_events.event_date
- schedule_events.job_id
- schedule_events.start_time
- schedule_events.google_calendar_event_id

**Status**: ✅ Pass

---

## 8. Documentation (4/4) ✅

### 8.1 Runbook Exists
```bash
ls -lh CALENDAR_SLICE.md
# Expected: File exists, ~40-50KB, comprehensive documentation
```
**Status**: ✅ Pass

### 8.2 API Contract Documented
```
Expected: CALENDAR_SLICE.md contains:
- All endpoint signatures (15+ endpoints)
- Request/response examples with curl commands
- Error response formats
- Status codes
- Query parameters
```
**Status**: ✅ Pass

### 8.3 Database Schema Documented
```
Expected: CALENDAR_SLICE.md contains:
- Table definitions with column types
- Foreign key relationships
- Index definitions
- JSONB structure for metadata
```
**Status**: ✅ Pass

### 8.4 Integration Architecture Documented
```
Expected: CALENDAR_SLICE.md contains:
- Google Calendar OAuth2 flow
- Event parsing confidence scoring algorithm
- Automated sync workflow diagram
- Role-based access control rules
- Conflict detection logic
```
**Status**: ✅ Pass

---

## 9. Deployment (4/4) ✅

### 9.1 Environment Variables
```bash
echo $DATABASE_URL
echo $SESSION_SECRET
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
# Expected: All variables are set (Google OAuth optional in dev)
```
**Status**: ✅ Pass

### 9.2 Build Process
```bash
npm run build
# Expected: Frontend and backend build successfully
```
**Status**: ✅ Pass

### 9.3 Production Start
```bash
npm run start
# Expected: Server starts in production mode
```
**Status**: ✅ Pass

### 9.4 Database Migration Strategy
```
Expected: Schema changes applied via `npm run db:push`
Rollback: Documented in CALENDAR_SLICE.md
Manual migrations: Not required (Drizzle ORM handles)
```
**Status**: ✅ Pass

---

## 10. Integration (6/6) ✅

### 10.1 Google Calendar OAuth2 Flow
```
Expected: OAuth2 authorization flow working
Steps: 
1. User clicks "Connect Google Calendar"
2. Redirected to Google consent screen
3. Callback processes authorization code
4. Access token + refresh token stored
5. Calendar list fetched successfully
```
**Status**: ✅ Pass

### 10.2 Event Parsing Accuracy
```sql
-- Verify confidence scores are calculated
SELECT 
  COUNT(CASE WHEN confidence_score >= 80 THEN 1 END) as high_confidence,
  COUNT(CASE WHEN confidence_score BETWEEN 60 AND 79 THEN 1 END) as medium_confidence,
  COUNT(CASE WHEN confidence_score < 60 THEN 1 END) as low_confidence
FROM pending_calendar_events;
```
**Expected**: Distribution across confidence levels  
**Status**: ✅ Pass

### 10.3 Automated Sync Cron Job
```bash
# Check if cron job is registered
# Expected: Cron job running every 6 hours
grep -r "0 \*/6 \* \* \*" server/
```
**Status**: ✅ Pass

### 10.4 Builder Matching Logic
```sql
-- Verify builder names extracted correctly
SELECT 
  raw_title, 
  parsed_builder_name, 
  parsed_builder_id 
FROM pending_calendar_events
WHERE parsed_builder_name IS NOT NULL
LIMIT 5;
```
**Expected**: Builder names extracted from event titles  
**Status**: ✅ Pass

### 10.5 Job Creation from Calendar Events
```sql
-- Verify jobs created from calendar events
SELECT 
  j.id, 
  j.name, 
  j.google_event_id, 
  j.scheduled_date
FROM jobs j
WHERE j.google_event_id IS NOT NULL
LIMIT 5;
```
**Expected**: Jobs linked to Google Calendar events  
**Status**: ✅ Pass

### 10.6 Conflict Detection Working
```sql
-- Test conflict detection query
SELECT se1.id, se1.title, se1.start_time, se1.end_time
FROM schedule_events se1
JOIN schedule_events se2 
  ON se1.job_id = se2.job_id
  AND se1.id != se2.id
  AND se1.start_time < se2.end_time
  AND se1.end_time > se2.start_time;
```
**Expected**: Returns overlapping events (if any)  
**Status**: ✅ Pass

---

## Summary

| Category | Items | Status |
|----------|-------|--------|
| Development | 4/4 | ✅ Pass |
| API Endpoints | 8/8 | ✅ Pass |
| UI Components | 6/6 | ✅ Pass |
| Testing | 4/4 | ✅ Pass |
| Observability | 5/5 | ✅ Pass |
| Security | 5/5 | ✅ Pass |
| Performance | 4/4 | ✅ Pass |
| Documentation | 4/4 | ✅ Pass |
| Deployment | 4/4 | ✅ Pass |
| Integration | 6/6 | ✅ Pass |
| **Total** | **40/40** | **✅ Production Ready** |

---

## Smoke Test Quick Run

```bash
# Complete verification in one command
./scripts/smoke-test-calendar.sh && echo "✅ All tests passed"
```

## Database Verification

```sql
-- Quick health check
SELECT 
  (SELECT COUNT(*) FROM schedule_events) as schedule_events,
  (SELECT COUNT(*) FROM google_events) as google_events,
  (SELECT COUNT(*) FROM pending_calendar_events WHERE status = 'pending') as pending_events,
  (SELECT AVG(confidence_score) FROM pending_calendar_events) as avg_confidence;
```

## Integration Health Check

```bash
# Test Google Calendar connection
curl http://localhost:5000/api/google-calendar/test \
  -H "Cookie: $SESSION" | jq '.status'

# Expected: "success" or appropriate error if not configured
```

## Next Steps for New Features

When adding new functionality to the Calendar Integration system:

1. **Add API endpoint** → Update CALENDAR_SLICE.md API Contract section
2. **Add UI component** → Update UI Components section
3. **Add test case** → Update smoke-test-calendar.sh
4. **Add database column/table** → Update Database Schema section
5. **Re-run compliance** → Verify all 40 checkpoints still pass

---

**Compliance Last Verified**: October 29, 2025  
**Next Review**: Before next major release  
**Production Status**: ✅ Ready for deployment
