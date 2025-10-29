-- Scheduled Exports Feature - Seed Data
-- Creates sample scheduled export configurations for testing and demonstration

-- Ensure test-admin user exists (should be created by dev mode seeding)
-- This script assumes user 'test-admin' exists

-- Clear existing test scheduled export data
DELETE FROM scheduled_exports WHERE name LIKE '%- Demo';

-- ================================================================
-- Seed 1: Daily Jobs Export (CSV, enabled, 08:00, all jobs)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Daily Jobs Export - Demo',
  'jobs',
  'csv',
  'daily',
  '08:00',
  '["inspector@example.com", "manager@example.com"]'::jsonb,
  '{
    "filters": {
      "status": ["scheduled", "in_progress", "completed"],
      "dateRange": "current_week"
    },
    "columns": ["jobName", "address", "status", "inspector", "scheduledDate"]
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '1 hour',
  CURRENT_TIMESTAMP - INTERVAL '7 days',
  CURRENT_TIMESTAMP
);

-- ================================================================
-- Seed 2: Weekly Financial Report (XLSX, enabled, Monday 09:00, revenue/expenses)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  day_of_week,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Weekly Financial Report - Demo',
  'financial',
  'xlsx',
  'weekly',
  '09:00',
  1, -- Monday
  '["finance@example.com", "shaun@energyaudit.com"]'::jsonb,
  '{
    "filters": {
      "dataType": "revenue_expenses",
      "dateRange": "last_week",
      "includeProjections": true
    },
    "includeSummary": true,
    "groupBy": "category"
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '3 days',
  CURRENT_TIMESTAMP - INTERVAL '21 days',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
);

-- ================================================================
-- Seed 3: Monthly Analytics (PDF, enabled, 1st of month, KPIs)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  day_of_month,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Monthly Analytics Report - Demo',
  'analytics',
  'pdf',
  'monthly',
  '07:00',
  1, -- 1st of month
  '["analytics@example.com", "shaun.ulrich@example.com"]'::jsonb,
  '{
    "filters": {
      "reportType": "comprehensive_kpi",
      "dateRange": "last_month",
      "metrics": ["job_completion_rate", "revenue", "inspector_productivity", "qa_scores"]
    },
    "includeCharts": true,
    "includeComparisons": true
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '15 days',
  CURRENT_TIMESTAMP - INTERVAL '90 days',
  CURRENT_TIMESTAMP - INTERVAL '30 days'
);

-- ================================================================
-- Seed 4: Daily Equipment Status (JSON, enabled, 18:00)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Daily Equipment Status - Demo',
  'equipment',
  'json',
  'daily',
  '18:00',
  '["maintenance@example.com", "inventory@example.com"]'::jsonb,
  '{
    "filters": {
      "status": ["in_use", "needs_calibration", "out_of_service"],
      "includeCalibrationDue": true,
      "daysAhead": 14
    },
    "includeCheckoutHistory": true
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '8 hours',
  CURRENT_TIMESTAMP - INTERVAL '14 days',
  CURRENT_TIMESTAMP
);

-- ================================================================
-- Seed 5: Weekly QA Scores (CSV, enabled, Friday 17:00)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  day_of_week,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Weekly QA Scores - Demo',
  'qa-scores',
  'csv',
  'weekly',
  '17:00',
  5, -- Friday
  '["qa@example.com", "inspectors@example.com"]'::jsonb,
  '{
    "filters": {
      "dateRange": "current_week",
      "minScore": 0,
      "includeInspectorBreakdown": true
    },
    "groupBy": "inspector",
    "includeTrends": true
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '28 days',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
);

-- ================================================================
-- Seed 6: Disabled Export (any type, disabled state)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Archived Photos Export - Demo',
  'photos',
  'json',
  'weekly',
  '22:00',
  '["archive@example.com"]'::jsonb,
  '{
    "filters": {
      "dateRange": "last_month",
      "includeMetadata": true,
      "tags": ["inspection", "completion"]
    }
  }'::jsonb,
  false, -- Disabled
  CURRENT_TIMESTAMP - INTERVAL '60 days',
  NULL, -- No next run (disabled)
  CURRENT_TIMESTAMP - INTERVAL '120 days',
  CURRENT_TIMESTAMP - INTERVAL '60 days'
);

-- ================================================================
-- Seed 7: Recent Successful Run (last_run populated, success)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  failure_log,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Daily Inspection Summary - Demo',
  'jobs',
  'xlsx',
  'daily',
  '16:00',
  '["operations@example.com"]'::jsonb,
  '{
    "filters": {
      "status": "completed",
      "dateRange": "today"
    },
    "includePhotos": false,
    "includeSummaryStats": true
  }'::jsonb,
  true,
  CURRENT_TIMESTAMP - INTERVAL '2 hours', -- Recent successful run
  CURRENT_TIMESTAMP + INTERVAL '22 hours',
  NULL, -- No failures
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- ================================================================
-- Seed 8: Recent Failed Run (last_run populated, failure_log with error)
-- ================================================================
INSERT INTO scheduled_exports (
  id,
  user_id,
  name,
  data_type,
  format,
  frequency,
  time,
  day_of_week,
  recipients,
  options,
  enabled,
  last_run,
  next_run,
  failure_log,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'Weekly Builder Performance - Demo',
  'analytics',
  'xlsx',
  'weekly',
  '10:00',
  1, -- Monday
  '["builders@example.com", "invalid-email"]'::jsonb,
  '{
    "filters": {
      "reportType": "builder_performance",
      "dateRange": "last_week"
    }
  }'::jsonb,
  true, -- Still enabled despite failure
  CURRENT_TIMESTAMP - INTERVAL '3 days',
  CURRENT_TIMESTAMP + INTERVAL '4 days',
  '[
    {
      "timestamp": "' || (CURRENT_TIMESTAMP - INTERVAL '3 days')::text || '",
      "error": "Email delivery failed: Invalid recipient address - invalid-email",
      "attemptCount": 1
    },
    {
      "timestamp": "' || (CURRENT_TIMESTAMP - INTERVAL '10 days')::text || '",
      "error": "Export generation timeout: Analytics data query exceeded 30s limit",
      "attemptCount": 1
    }
  ]'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '35 days',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- ================================================================
-- Verification Query
-- ================================================================
SELECT 
  name,
  data_type,
  format,
  frequency,
  enabled,
  CASE 
    WHEN last_run IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_run,
  CASE
    WHEN failure_log IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_failures,
  created_at
FROM scheduled_exports
WHERE name LIKE '%- Demo'
ORDER BY created_at DESC;

-- Expected output:
-- 8 scheduled exports created
-- Mix of frequencies: 4 daily, 3 weekly, 1 monthly
-- Mix of formats: 3 CSV, 3 XLSX, 1 PDF, 2 JSON
-- 1 disabled export
-- 1 with failure log
-- All with realistic options and recipients
