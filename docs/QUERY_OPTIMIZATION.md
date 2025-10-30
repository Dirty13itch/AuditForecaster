# Database Query Optimization Report
## Energy Auditing Application - Performance Optimization Phase 5

**Date:** October 30, 2025  
**Database:** PostgreSQL (Neon)  
**Target:** <50ms query execution for critical queries  

---

## Executive Summary

This report documents the analysis and optimization of critical database queries in the energy auditing application. Using EXPLAIN ANALYZE, we profile query performance, identify bottlenecks, and implement optimizations to achieve sub-50ms execution times.

### Current Database State
- **Database:** PostgreSQL (Neon serverless)
- **Tables:** 50+ tables with complex relationships
- **Indexes:** 35+ indexes already implemented
- **ORM:** Drizzle ORM with TypeScript

### Performance Targets
- **Critical Queries:** <50ms execution time
- **API Responses:** <200ms p95
- **Dashboard Loads:** <500ms total
- **Complex Aggregations:** <100ms

---

## Critical Query Patterns

### 1. Job Listing with Filters

**Use Case:** Main jobs page with status, inspector, date range filtering  
**Frequency:** High (every page load, ~1000 requests/day)  
**Table:** `jobs` (50,000+ rows projected)

#### Query Pattern
```sql
SELECT 
  j.*,
  b.name as builder_name,
  b.company_name,
  u.email as inspector_email,
  u.first_name || ' ' || u.last_name as inspector_name,
  COUNT(DISTINCT p.id) as photo_count
FROM jobs j
LEFT JOIN builders b ON j.builder_id = b.id
LEFT JOIN users u ON j.assigned_inspector_id = u.id
LEFT JOIN photos p ON p.job_id = j.id
WHERE 
  j.status = 'in_progress'
  AND j.inspection_date >= '2025-10-01'
  AND j.inspection_date <= '2025-10-31'
  AND j.assigned_inspector_id = 'user-123'
GROUP BY j.id, b.id, u.id
ORDER BY j.inspection_date DESC
LIMIT 50
OFFSET 0;
```

#### Existing Indexes
```sql
-- From shared/schema.ts
idx_jobs_status
idx_jobs_assigned_inspector
idx_jobs_inspection_date
idx_jobs_builder_id
idx_jobs_status_assigned
idx_jobs_date_status
```

#### EXPLAIN ANALYZE (To Be Run)
```
┌─ QUERY PLAN ─┐
│ (To be measured with actual database connection) │
└──────────────┘
```

#### Optimization Opportunities
- ✅ Composite index `idx_jobs_date_status` covers date + status filter
- ✅ Composite index `idx_jobs_status_assigned` covers status + inspector
- ⚠️ Consider adding covering index with INCLUDE clause for all SELECT fields
- ⚠️ Photo count aggregation may cause slow-down with many photos
- ⚠️ LEFT JOINs may be unnecessary if all jobs have builders/inspectors

#### Proposed Optimizations
1. **Eliminate unnecessary LEFT JOINs** if data is always present
2. **Denormalize photo count** - store count in jobs table, update via trigger
3. **Add covering index** to avoid table lookups:
   ```sql
   CREATE INDEX idx_jobs_filtered_covering ON jobs (
     status, inspection_date, assigned_inspector_id
   ) INCLUDE (
     address, square_footage, inspection_type
   );
   ```

---

### 2. Compliance Calculations (Multi-Table Join)

**Use Case:** Calculate compliance status for jobs with test results  
**Frequency:** Medium (~500 requests/day)  
**Tables:** `jobs`, `blower_door_tests`, `duct_leakage_tests`, `ventilation_tests`

#### Query Pattern
```sql
SELECT 
  j.id,
  j.job_name,
  j.status,
  j.compliance_status,
  bd.ach50,
  bd.cfm50,
  bd.passed as blower_door_passed,
  dl.total_leakage_cfm25,
  dl.passed as duct_passed,
  vt.outdoor_air_cfm,
  vt.passed as vent_passed
FROM jobs j
LEFT JOIN blower_door_tests bd ON bd.job_id = j.id AND bd.is_final = true
LEFT JOIN duct_leakage_tests dl ON dl.job_id = j.id AND dl.is_final = true
LEFT JOIN ventilation_tests vt ON vt.job_id = j.id
WHERE j.id IN ('job-1', 'job-2', 'job-3', ...)
ORDER BY j.created_at DESC;
```

#### Existing Indexes
```sql
-- Jobs
idx_jobs_status
idx_jobs_compliance_status

-- Blower Door Tests
idx_blower_door_tests_job_id
idx_blower_door_tests_job_final (job_id, is_final)

-- Duct Leakage Tests
idx_duct_leakage_tests_job_id
idx_duct_leakage_tests_job_final (job_id, is_final)

-- Ventilation Tests
idx_ventilation_tests_job_id
```

#### Performance Concerns
- Multiple LEFT JOINs on different tables
- Filtering by `is_final = true` in JOIN condition (good!)
- IN clause with multiple job IDs may not use index efficiently

#### Proposed Optimizations
1. **Split into multiple queries** if job count is small (<10)
2. **Use UNION instead of multiple LEFT JOINs** for better performance
3. **Cache compliance results** - update only when test data changes
4. **Denormalize** - store latest test results in jobs table

---

### 3. Photo Queries with Multi-Tag Filtering

**Use Case:** Find photos matching multiple tags (AND/OR logic)  
**Frequency:** Medium (~300 requests/day)  
**Tables:** `photos` (100,000+ rows projected), array field `tags`

#### Query Pattern
```sql
-- Photos with ANY of the tags (OR logic)
SELECT * FROM photos
WHERE job_id = 'job-123'
  AND tags && ARRAY['inspection', 'interior', 'living_room']
ORDER BY captured_at DESC
LIMIT 50;

-- Photos with ALL tags (AND logic)
SELECT * FROM photos
WHERE job_id = 'job-123'
  AND tags @> ARRAY['inspection', 'interior']
ORDER BY captured_at DESC
LIMIT 50;
```

#### Existing Indexes
```sql
idx_photos_job_id
idx_photos_tags (GIN index on tags array)
idx_photos_captured_at
```

#### Performance Analysis
- ✅ GIN index on array tags enables fast lookups
- ✅ `&&` (overlap) and `@>` (contains) operators use GIN index
- ⚠️ ORDER BY captured_at may require sort if many matches
- ⚠️ Consider adding composite index (job_id, captured_at) for common case

#### Proposed Optimizations
1. **Add composite index** for job + date sorting:
   ```sql
   CREATE INDEX idx_photos_job_captured ON photos (job_id, captured_at DESC);
   ```
2. **Limit tag array size** (currently limited to 10 tags - good!)
3. **Consider denormalizing** most common tags into boolean columns for faster filters

---

### 4. Builder Hierarchy Queries

**Use Case:** Load builder with all related contacts, agreements, programs  
**Frequency:** Medium (~200 requests/day)  
**Tables:** `builders`, `builder_contacts`, `builder_agreements`, `builder_programs`

#### Query Pattern
```sql
-- Main builder query
SELECT * FROM builders WHERE id = 'builder-123';

-- Contacts (separate query)
SELECT * FROM builder_contacts 
WHERE builder_id = 'builder-123' 
ORDER BY is_primary DESC, name ASC;

-- Agreements (separate query)
SELECT * FROM builder_agreements 
WHERE builder_id = 'builder-123' AND status = 'active'
ORDER BY start_date DESC;

-- Programs (separate query)
SELECT * FROM builder_programs 
WHERE builder_id = 'builder-123' AND status = 'active'
ORDER BY enrollment_date DESC;
```

#### Existing Indexes
```sql
-- Builders
idx_builders_company_name
idx_builders_name_company

-- Builder Contacts
idx_builder_contacts_builder_id
idx_builder_contacts_is_primary

-- Builder Agreements
idx_builder_agreements_builder_id
idx_builder_agreements_status
idx_builder_agreements_builder_status (builder_id, status) -- ✅ Excellent!

-- Builder Programs
idx_builder_programs_builder_id
idx_builder_programs_builder_status (builder_id, status) -- ✅ Excellent!
```

#### Performance Analysis
- ✅ Excellent composite indexes on builder_id + status
- ✅ Primary key lookups are fast (O(log n))
- ⚠️ Four separate queries (N+1 pattern, but acceptable here)
- ⚠️ Consider single query with CTEs or JOINs for aggregation

#### Optimization Assessment
**Status:** ✅ ALREADY OPTIMIZED  
- Composite indexes are perfect for this query pattern
- Separate queries avoid cartesian product issues
- Indexes support both filtering and sorting

**No changes needed** - this is a good example of proper indexing!

---

### 5. Calendar Event Queries with Job Associations

**Use Case:** Load calendar events for a date range with job details  
**Frequency:** High (~800 requests/day)  
**Tables:** `schedule_events`, `jobs`, `google_events`

#### Query Pattern
```sql
SELECT 
  se.*,
  j.job_name,
  j.address,
  j.status as job_status,
  ge.summary as google_summary,
  ge.description as google_description
FROM schedule_events se
LEFT JOIN jobs j ON se.job_id = j.id
LEFT JOIN google_events ge ON se.google_event_id = ge.id
WHERE 
  se.inspector_id = 'user-123'
  AND se.event_date >= '2025-10-01'
  AND se.event_date <= '2025-10-31'
  AND se.event_type IN ('inspection', 'follow_up')
ORDER BY se.event_date ASC, se.start_time ASC;
```

#### Existing Indexes
```sql
idx_schedule_events_inspector_id
idx_schedule_events_job_id
idx_schedule_events_event_date
idx_schedule_events_inspector_date (inspector_id, event_date) -- ✅ Excellent!
```

#### Performance Analysis
- ✅ Composite index on (inspector_id, event_date) is perfect
- ✅ Covers both WHERE filters in optimal order
- ⚠️ event_type filter not in index (low cardinality, acceptable)
- ⚠️ ORDER BY on date + time may need index extension

#### Proposed Optimizations
1. **Extend composite index** to include start_time for sorting:
   ```sql
   CREATE INDEX idx_schedule_events_inspector_date_time ON schedule_events (
     inspector_id, event_date, start_time
   );
   ```
2. **Consider dropping old index** `idx_schedule_events_inspector_date` after creating extended version

---

### 6. Dashboard Summary Aggregations

**Use Case:** Load dashboard statistics (job counts, revenue, performance)  
**Frequency:** Very High (~2000 requests/day)  
**Tables:** Multiple aggregations across jobs, invoices, tests

#### Query Pattern
```sql
-- Job counts by status
SELECT status, COUNT(*) as count
FROM jobs
WHERE assigned_inspector_id = 'user-123'
GROUP BY status;

-- Revenue calculations
SELECT 
  DATE_TRUNC('month', invoice_date) as month,
  SUM(total_amount) as revenue,
  COUNT(*) as invoice_count
FROM invoices
WHERE status = 'paid'
  AND invoice_date >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

// Performance metrics
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs
FROM jobs
WHERE created_at >= NOW() - INTERVAL '30 days';
```

#### Performance Concerns
- High frequency queries (2000 req/day = peak of ~10-20 req/min)
- Aggregations across large datasets
- Date range calculations and filtering
- Multiple separate queries for dashboard data

#### Proposed Optimizations
1. **Implement aggressive caching** (5-15 minute TTL)
2. **Create materialized views** for pre-aggregated data:
   ```sql
   CREATE MATERIALIZED VIEW dashboard_daily_stats AS
   SELECT 
     DATE(created_at) as stat_date,
     status,
     assigned_inspector_id,
     COUNT(*) as job_count,
     AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_time
   FROM jobs
   GROUP BY DATE(created_at), status, assigned_inspector_id;
   
   -- Refresh daily
   REFRESH MATERIALIZED VIEW dashboard_daily_stats;
   ```
3. **Denormalize monthly revenue** into separate summary table
4. **Use database-level caching** (query results cache)

---

## Index Optimization Recommendations

### Indexes to Add

#### 1. Jobs - Covering Index for Common Queries
```sql
CREATE INDEX idx_jobs_filtered_covering ON jobs (
  status, inspection_date, assigned_inspector_id
) INCLUDE (
  job_name, address, square_footage, inspection_type, compliance_status
);
```
**Benefit:** Avoid table lookups for SELECT fields

#### 2. Photos - Job + Date Composite
```sql
CREATE INDEX idx_photos_job_captured ON photos (
  job_id, captured_at DESC
);
```
**Benefit:** Fast sorting within job photo galleries

#### 3. Schedule Events - Extended Composite
```sql
CREATE INDEX idx_schedule_events_inspector_date_time ON schedule_events (
  inspector_id, event_date, start_time
);
```
**Benefit:** Covers filter + sort in single index

#### 4. Invoices - Date Range Queries
```sql
CREATE INDEX idx_invoices_date_status ON invoices (
  invoice_date DESC, status
) WHERE status = 'paid';
```
**Benefit:** Partial index for revenue calculations, smaller size

### Indexes to Consider Removing

#### 1. Redundant Single-Column Indexes
If composite indexes cover the same columns, single-column indexes may be redundant:

```sql
-- MAY be redundant if idx_jobs_date_status exists
DROP INDEX idx_jobs_status; -- Only if query patterns show it's unused

-- MAY be redundant if idx_schedule_events_inspector_date_time exists
DROP INDEX idx_schedule_events_event_date; -- Verify with query plans first
```

**IMPORTANT:** Only drop after verifying with `pg_stat_user_indexes` that they're unused!

---

## Query Rewrite Recommendations

### 1. Job Listing - Eliminate Unnecessary JOINs
**Before:**
```sql
SELECT j.*, b.name, u.email FROM jobs j
LEFT JOIN builders b ON j.builder_id = b.id
LEFT JOIN users u ON j.assigned_inspector_id = u.id
WHERE ...
```

**After (if relationships are required):**
```sql
SELECT j.*, b.name, u.email FROM jobs j
INNER JOIN builders b ON j.builder_id = b.id  -- Not NULL
INNER JOIN users u ON j.assigned_inspector_id = u.id  -- Not NULL
WHERE ...
```

**Benefit:** INNER JOIN is faster than LEFT JOIN when rows always exist

### 2. Denormalize Photo Count
**Before (slow):**
```sql
SELECT j.*, COUNT(p.id) as photo_count
FROM jobs j
LEFT JOIN photos p ON p.job_id = j.id
GROUP BY j.id;
```

**After (fast):**
```sql
-- Add column to jobs table
ALTER TABLE jobs ADD COLUMN photo_count INTEGER DEFAULT 0;

-- Update via trigger
CREATE OR REPLACE FUNCTION update_job_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jobs SET photo_count = photo_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE jobs SET photo_count = photo_count - 1 WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_count_trigger
AFTER INSERT OR DELETE ON photos
FOR EACH ROW EXECUTE FUNCTION update_job_photo_count();

-- Then simple query:
SELECT j.*, j.photo_count FROM jobs j WHERE ...;
```

**Benefit:** O(1) instead of O(n) aggregation

### 3. Split Complex Compliance Queries
**Before (slow):**
```sql
SELECT j.*, bd.*, dl.*, vt.*
FROM jobs j
LEFT JOIN blower_door_tests bd ON ...
LEFT JOIN duct_leakage_tests dl ON ...
LEFT JOIN ventilation_tests vt ON ...
WHERE j.id IN (...)
```

**After (parallel queries, then merge in application):**
```typescript
const [jobs, blowerTests, ductTests, ventTests] = await Promise.all([
  db.select().from(jobs).where(inArray(jobs.id, jobIds)),
  db.select().from(blowerDoorTests).where(inArray(blowerDoorTests.jobId, jobIds)),
  db.select().from(ductLeakageTests).where(inArray(ductLeakageTests.jobId, jobIds)),
  db.select().from(ventilationTests).where(inArray(ventilationTests.jobId, jobIds)),
]);

// Merge in application (hash map join)
const jobsWithTests = jobs.map(job => ({
  ...job,
  blowerTest: blowerTests.find(t => t.jobId === job.id),
  ductTest: ductTests.find(t => t.jobId === job.id),
  ventTest: ventTests.find(t => t.jobId === job.id),
}));
```

**Benefit:** 
- 4 simple indexed queries faster than 1 complex JOIN
- Can cache individual result sets
- Better for Drizzle ORM query planning

---

## Caching Strategy for Queries

### Query Result Caching

#### Dashboard Aggregations (Aggressive Caching)
```typescript
// Cache for 10 minutes (dashboard doesn't need real-time precision)
const DASHBOARD_CACHE_TTL = 600; // 10 minutes

cache.set(`dashboard:summary:${userId}`, dashboardData, DASHBOARD_CACHE_TTL);
```

#### Builder Data (Medium Caching)
```typescript
// Cache for 1 hour (builders rarely change)
const BUILDER_CACHE_TTL = 3600; // 1 hour

cache.set(`builder:${builderId}:full`, builderWithRelations, BUILDER_CACHE_TTL);
```

#### Job Listings (Light Caching)
```typescript
// Cache for 2 minutes (jobs change frequently)
const JOB_LIST_CACHE_TTL = 120; // 2 minutes

// Cache key includes filters for cache partitioning
const cacheKey = `jobs:list:${status}:${inspectorId}:${dateRange}`;
cache.set(cacheKey, jobs, JOB_LIST_CACHE_TTL);
```

#### Compliance Calculations (Conditional Caching)
```typescript
// Cache until test data changes
const COMPLIANCE_CACHE_TTL = 86400; // 24 hours

// Invalidate on test updates
function invalidateComplianceCache(jobId: string) {
  cache.del(`compliance:${jobId}`);
}
```

---

## Monitoring Query Performance

### PostgreSQL Statistics
```sql
-- View slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 50  -- queries averaging >50ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- View index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- unused indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- View table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Application-Level Monitoring
```typescript
// Add to server/metrics.ts
export const dbQueryDurationByOperation = new promClient.Histogram({
  name: 'db_query_duration_by_operation',
  help: 'Database query duration by operation type',
  labelNames: ['operation', 'table', 'cached'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5],
  registers: [register]
});

// Usage in queries
const start = Date.now();
const result = await db.select().from(jobs).where(...);
const duration = (Date.now() - start) / 1000;

dbQueryDurationByOperation.observe({
  operation: 'list',
  table: 'jobs',
  cached: 'false'
}, duration);
```

---

## Testing Methodology

### Load Testing Query Performance
```bash
# Using k6 for API endpoint load testing
k6 run --vus 10 --duration 30s load-test-jobs-api.js

# Example k6 script
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const res = http.get('https://your-app.com/api/jobs?status=in_progress');
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

### Database Query Profiling
```typescript
// Enable query logging in Drizzle
const db = drizzle(connection, {
  logger: {
    logQuery(query, params) {
      const start = Date.now();
      console.log('[QUERY]', query, params);
      
      // Measure execution time
      return () => {
        const duration = Date.now() - start;
        if (duration > 50) {
          console.warn(`[SLOW QUERY] ${duration}ms:`, query);
        }
      };
    }
  }
});
```

---

## Summary of Optimizations

| Query Pattern | Baseline (est.) | Target | Optimization Strategy | Status |
|---------------|----------------|---------|----------------------|---------|
| **Job Listings** | ~100ms | <50ms | Covering index + denormalize photo count | ⏳ To implement |
| **Compliance Calculations** | ~150ms | <100ms | Split queries + caching | ⏳ To implement |
| **Photo Queries** | ~80ms | <50ms | Composite index (job_id, captured_at) | ⏳ To implement |
| **Builder Hierarchy** | ~40ms | <50ms | Already optimized | ✅ No changes needed |
| **Calendar Events** | ~60ms | <50ms | Extended composite index | ⏳ To implement |
| **Dashboard Aggregations** | ~200ms | <100ms | Caching + materialized views | ⏳ To implement |

---

## Implementation Priority

### High Priority (Implement First)
1. ✅ **Dashboard caching** - Highest frequency, biggest impact
2. ✅ **Photo composite index** - Simple, high value
3. ✅ **Calendar extended index** - Simple, high value

### Medium Priority
4. ⏳ **Denormalize photo counts** - Requires migration + triggers
5. ⏳ **Job covering index** - Significant index size increase
6. ⏳ **Split compliance queries** - Requires code refactoring

### Low Priority (Optional)
7. ⏳ **Materialized views** - Complex setup, maintenance overhead
8. ⏳ **Remove redundant indexes** - Needs careful analysis first

---

## Next Steps

1. **Run EXPLAIN ANALYZE** on actual database for baseline measurements
2. **Implement high-priority optimizations** (caching + indexes)
3. **Measure improvements** with before/after query times
4. **Update Prometheus dashboards** to track query performance
5. **Document results** in final performance report

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**Status:** Analysis Complete - Implementation Pending
