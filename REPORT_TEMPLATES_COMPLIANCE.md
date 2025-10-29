# Report Templates - Vertical Slice Compliance Checklist

## Overview
This checklist verifies that the Report Template System meets all vertical development standards established by the Mileage and Expenses features. Each item includes verification commands for auditing.

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
# Expected: All tables created/updated successfully
```
**Verification**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('report_templates', 'report_instances', 'report_field_values')
ORDER BY table_name;
```
**Expected**: 3 rows (report_field_values, report_instances, report_templates)  
**Status**: ✅ Pass

### 1.3 Seed Data Available
```bash
ls -lh db/seed-report-templates.sql
# Expected: File exists, ~15-20KB
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

### 2.1 Create Template (POST /api/report-templates)
```bash
curl -X POST http://localhost:5000/api/report-templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{
    "name": "Test Template",
    "category": "Testing",
    "inspectionType": "Test",
    "components": []
  }'
# Expected: 201 Created with template object
```
**Status**: ✅ Pass

### 2.2 List Templates (GET /api/report-templates)
```bash
curl http://localhost:5000/api/report-templates \
  -H "Cookie: $SESSION"
# Expected: 200 OK with array of templates
```
**Status**: ✅ Pass

### 2.3 Get Template (GET /api/report-templates/:id)
```bash
curl http://localhost:5000/api/report-templates/{template-id} \
  -H "Cookie: $SESSION"
# Expected: 200 OK with single template, or 404 if not found
```
**Status**: ✅ Pass

### 2.4 Update Template (PUT /api/report-templates/:id)
```bash
curl -X PUT http://localhost:5000/api/report-templates/{template-id} \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"name": "Updated Name"}'
# Expected: 200 OK with updated template
```
**Status**: ✅ Pass

### 2.5 Delete Template (DELETE /api/report-templates/:id)
```bash
curl -X DELETE http://localhost:5000/api/report-templates/{template-id} \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF"
# Expected: 204 No Content
```
**Status**: ✅ Pass

### 2.6 Clone Template (POST /api/report-templates/:id/clone)
```bash
curl -X POST http://localhost:5000/api/report-templates/{template-id}/clone \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"name": "Cloned Template"}'
# Expected: 201 Created with cloned template
```
**Status**: ✅ Pass

### 2.7 Create Report Instance (POST /api/report-instances)
```bash
curl -X POST http://localhost:5000/api/report-instances \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{
    "templateId": "{template-id}",
    "status": "draft"
  }'
# Expected: 201 Created with instance object (jobId can be null)
```
**Status**: ✅ Pass

### 2.8 Save Field Values (POST /api/report-field-values)
```bash
curl -X POST http://localhost:5000/api/report-field-values \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{
    "reportInstanceId": "{instance-id}",
    "componentId": "test_field",
    "valueText": "Test Value"
  }'
# Expected: 201 Created with field value object
```
**Status**: ✅ Pass

---

## 3. UI Components (6/6) ✅

### 3.1 Template Designer Page
```
URL: /report-template-designer
Expected: Page loads with drag-drop component palette
Visual: Component library on left, canvas on right
```
**Status**: ✅ Pass

### 3.2 Template List Page
```
URL: /report-templates
Expected: Table/grid showing all active templates
Features: Click to view details, create new button
```
**Status**: ✅ Pass

### 3.3 Template Detail Page
```
URL: /report-templates/:id
Expected: Template info, component list, "Create Report" button
```
**Status**: ✅ Pass

### 3.4 Report Fillout Page
```
URL: /reports/fillout/:instanceId
Expected: Dynamic form rendered from template components
Features: Field inputs, save functionality, status updates
```
**Status**: ✅ Pass

### 3.5 Template Status Indicators
```
Expected: Visual badges for draft/published/archived states
Colors: Gray (draft), Green (published), Yellow (archived)
```
**Status**: ✅ Pass

### 3.6 Component Type Support
```
Expected: Support for text, number, date, checkbox, select, textarea
Visual: Proper rendering with labels, validation, required indicators
```
**Status**: ✅ Pass

---

## 4. Testing (4/4) ✅

### 4.1 Smoke Tests Available
```bash
ls -lh scripts/smoke-test-report-templates.sh
# Expected: Executable shell script exists
```
**Status**: ✅ Pass

### 4.2 Smoke Tests Pass
```bash
./scripts/smoke-test-report-templates.sh
# Expected: All 12 tests pass (exit code 0)
# Tests: Health checks, CRUD, cloning, instances, field values
```
**Status**: ✅ Pass

### 4.3 Seed Data Loads Successfully
```bash
psql $DATABASE_URL -f db/seed-report-templates.sql
# Expected: 5 templates inserted without errors
```
**Verification**:
```sql
SELECT COUNT(*) FROM report_templates WHERE created_by = 'dev-user';
```
**Expected**: 5 templates  
**Status**: ✅ Pass

### 4.4 Seed Data Has Realistic Content
```sql
SELECT name, category, inspection_type, 
       jsonb_array_length(components) as component_count
FROM report_templates
WHERE created_by = 'dev-user'
ORDER BY name;
```
**Expected**:
- Air Sealing Checklist (14 components)
- Final Energy Audit (11 components)
- HVAC Performance Test (10 components)
- Insulation Verification (9 components)
- Pre-Drywall Inspection (9 components)

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
# Expected: Request IDs, timestamps, severity levels
```
**Status**: ✅ Pass

### 5.3 Error Tracking
```
Expected: Errors logged with stack traces
Format: JSON with error.message, error.code, error.stack
```
**Status**: ✅ Pass

### 5.4 API Response Times
```sql
-- Monitor slow queries (if logging enabled)
SELECT COUNT(*) FROM report_templates WHERE is_active = true;
```
**Expected**: Query completes in <50ms  
**Status**: ✅ Pass

### 5.5 Database Connection Monitoring
```
Expected: /readyz checks database connectivity
Failure mode: Returns 503 if database unreachable
```
**Status**: ✅ Pass

---

## 6. Security (5/5) ✅

### 6.1 CSRF Protection
```bash
# POST without CSRF token should fail
curl -X POST http://localhost:5000/api/report-templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -d '{"name": "Test"}'
# Expected: 403 Forbidden
```
**Status**: ✅ Pass

### 6.2 Authentication Required
```bash
# Request without session cookie should redirect
curl http://localhost:5000/api/report-templates
# Expected: 401 or redirect to login
```
**Status**: ✅ Pass

### 6.3 Rate Limiting
```
Expected: Express rate limiting configured (100 req/15min standard)
Verify: Rate limit headers in responses
```
**Status**: ✅ Pass

### 6.4 Input Validation (Zod)
```bash
# Invalid template data should be rejected
curl -X POST http://localhost:5000/api/report-templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d '{"name": "", "category": "Test"}'
# Expected: 400 Bad Request with validation error
```
**Status**: ✅ Pass

### 6.5 SQL Injection Protection
```
Expected: All queries use parameterized statements via Drizzle ORM
Verification: No raw SQL string concatenation in codebase
```
**Status**: ✅ Pass

---

## 7. Performance (4/4) ✅

### 7.1 List Templates Performance
```bash
time curl http://localhost:5000/api/report-templates \
  -H "Cookie: $SESSION"
# Expected: Response time < 200ms (P95)
```
**Status**: ✅ Pass

### 7.2 Template Creation Performance
```bash
# Create template with 20 components
time curl -X POST http://localhost:5000/api/report-templates \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -H "x-csrf-token: $CSRF" \
  -d @large-template.json
# Expected: Response time < 500ms
```
**Status**: ✅ Pass

### 7.3 Field Values Batch Insert
```
Expected: Can save multiple field values efficiently
Performance: <100ms per field value saved
```
**Status**: ✅ Pass

### 7.4 Database Indexes
```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('report_templates', 'report_instances', 'report_field_values')
ORDER BY tablename, indexname;
```
**Expected**: Indexes on:
- report_templates.id (PRIMARY KEY)
- report_instances.id (PRIMARY KEY)
- report_instances.template_id
- report_instances.job_id (for filtering)
- report_field_values.id (PRIMARY KEY)
- report_field_values.report_instance_id

**Status**: ✅ Pass

---

## 8. Documentation (4/4) ✅

### 8.1 Runbook Exists
```bash
ls -lh REPORT_TEMPLATE_SLICE.md
# Expected: File exists, ~30-40KB, comprehensive documentation
```
**Status**: ✅ Pass

### 8.2 API Contract Documented
```
Expected: REPORT_TEMPLATE_SLICE.md contains:
- All endpoint signatures
- Request/response examples
- Error response formats
- Status codes
```
**Status**: ✅ Pass

### 8.3 Database Schema Documented
```
Expected: REPORT_TEMPLATE_SLICE.md contains:
- Table definitions with column types
- Foreign key relationships
- JSONB structure for components/layout/metadata
```
**Status**: ✅ Pass

### 8.4 UI Navigation Flows Documented
```
Expected: REPORT_TEMPLATE_SLICE.md contains:
- Page URLs and purposes
- User actions and expected behaviors
- Navigation flows between pages
```
**Status**: ✅ Pass

---

## 9. Deployment (4/4) ✅

### 9.1 Environment Variables
```bash
echo $DATABASE_URL
echo $SESSION_SECRET
# Expected: Both variables are set
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
Rollback: Documented in REPORT_TEMPLATE_SLICE.md
```
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
| **Total** | **40/40** | **✅ Production Ready** |

---

## Smoke Test Quick Run

```bash
# Complete verification in one command
./scripts/smoke-test-report-templates.sh && echo "✅ All tests passed"
```

## Database Verification

```sql
-- Quick health check
SELECT 
  (SELECT COUNT(*) FROM report_templates WHERE is_active = true) as active_templates,
  (SELECT COUNT(*) FROM report_instances) as total_instances,
  (SELECT COUNT(*) FROM report_field_values) as total_field_values;
```

## Next Steps for New Features

When adding new functionality to the Report Templates system:

1. **Add API endpoint** → Update REPORT_TEMPLATE_SLICE.md API Contract section
2. **Add UI component** → Update UI Navigation section
3. **Add test case** → Update smoke-test-report-templates.sh
4. **Add database column** → Update Database Schema section
5. **Re-run compliance** → Verify all 40 checkpoints still pass

---

**Compliance Last Verified**: October 29, 2025  
**Next Review**: Before next major release
