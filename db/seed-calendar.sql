-- Calendar Integration Seed Data
-- Creates sample schedule events, Google Calendar events, and pending events
-- Compatible with PostgreSQL + Drizzle ORM schema

-- This script is self-contained: it creates prerequisite data (builder, user, job)
-- if they don't exist, ensuring it works in a clean database environment.
-- Run after: npm run db:push

BEGIN;

-- ============================================================================
-- 0. Create Prerequisite Data (Builder, User, Job) if Missing
-- ============================================================================

-- Create a test builder if none exists
INSERT INTO builders (id, name, company_name, notes)
SELECT 
  'calendar-test-builder',
  'Calendar Test Builder',
  'Calendar Test Builder Co.',
  'Test builder for calendar seed data'
WHERE NOT EXISTS (SELECT 1 FROM builders LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Create a dev user if none exists  
INSERT INTO users (id, email, first_name, last_name, role)
SELECT 
  'calendar-dev-user',
  'calendar-dev@test.com',
  'Calendar Dev',
  'User',
  'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Create a test inspector if none exists
INSERT INTO users (id, email, first_name, last_name, role)
SELECT 
  'calendar-test-inspector',
  'calendar-inspector@test.com',
  'Calendar Test',
  'Inspector',
  'inspector'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'inspector' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- Create a test job if none exists
DO $$
DECLARE
  sample_builder_id VARCHAR;
  admin_user_id VARCHAR;
BEGIN
  -- Get any builder (preferring our test builder)
  SELECT id INTO sample_builder_id 
  FROM builders 
  ORDER BY CASE WHEN id = 'calendar-test-builder' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Get any admin user
  SELECT id INTO admin_user_id 
  FROM users 
  WHERE role = 'admin'
  ORDER BY CASE WHEN id = 'calendar-dev-user' THEN 0 ELSE 1 END
  LIMIT 1;
  
  IF sample_builder_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    INSERT INTO jobs (id, name, address, builder_id, inspection_type, status, contractor, created_by)
    SELECT 
      'calendar-test-job',
      'Calendar Test Job - 123 Test Street',
      '123 Test Street, Minneapolis, MN 55401',
      sample_builder_id,
      'pre_drywall',
      'scheduled',
      'TBD',
      admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM jobs LIMIT 1)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 1. Schedule Events (Linked to Jobs)
-- ============================================================================

-- Get sample job IDs and user IDs for foreign key references
DO $$
DECLARE
  sample_job_id VARCHAR;
  admin_user_id VARCHAR;
BEGIN
  -- Get any job (preferring our test job)
  SELECT id INTO sample_job_id 
  FROM jobs 
  ORDER BY CASE WHEN id = 'calendar-test-job' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Get admin user
  SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
  
  -- Only create schedule events if we have required data
  IF sample_job_id IS NOT NULL THEN
    -- Schedule Event 1: Pre-Drywall Inspection (Tomorrow)
    INSERT INTO schedule_events (id, job_id, title, start_time, end_time, notes, color)
    VALUES (
      gen_random_uuid(),
      sample_job_id,
      'Pre-Drywall Inspection - Smith Residence',
      (CURRENT_TIMESTAMP + INTERVAL '1 day')::timestamp AT TIME ZONE 'UTC',
      (CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '2 hours')::timestamp AT TIME ZONE 'UTC',
      'Inspection includes insulation verification, air sealing check, and framing review',
      'blue'
    ) ON CONFLICT DO NOTHING;
    
    -- Schedule Event 2: Final Inspection (Next Week)
    INSERT INTO schedule_events (id, job_id, title, start_time, end_time, notes, color)
    VALUES (
      gen_random_uuid(),
      sample_job_id,
      'Final Energy Audit - Johnson Build',
      (CURRENT_TIMESTAMP + INTERVAL '7 days')::timestamp AT TIME ZONE 'UTC',
      (CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours')::timestamp AT TIME ZONE 'UTC',
      'Complete HERS rating, blower door test, duct leakage test',
      'green'
    ) ON CONFLICT DO NOTHING;
    
    -- Schedule Event 3: HVAC Performance Test (Next Week)
    INSERT INTO schedule_events (id, job_id, title, start_time, end_time, notes, color)
    VALUES (
      gen_random_uuid(),
      sample_job_id,
      'HVAC Performance Verification',
      (CURRENT_TIMESTAMP + INTERVAL '5 days')::timestamp AT TIME ZONE 'UTC',
      (CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '1.5 hours')::timestamp AT TIME ZONE 'UTC',
      'Airflow measurement, static pressure, temperature split verification',
      'orange'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 2. Google Calendar Events (Imported from Google)
-- ============================================================================

-- Simulated Google Calendar events that would be imported via API
INSERT INTO google_events (id, google_event_id, google_calendar_id, title, description, location, start_time, end_time, is_converted, last_synced_at, created_at)
VALUES
  (
    gen_random_uuid(),
    'google_event_001',
    'primary',
    'M/I Homes - SV2 Inspection - 123 Oak Street',
    'Pre-drywall inspection for M/I Homes development',
    '123 Oak Street, Minneapolis, MN 55401',
    (CURRENT_TIMESTAMP + INTERVAL '3 days')::timestamp AT TIME ZONE 'UTC',
    (CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '2 hours')::timestamp AT TIME ZONE 'UTC',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'google_event_002',
    'primary',
    'Lennar - Test - 456 Maple Ave',
    'Final inspection for Lennar Homes property',
    '456 Maple Ave, St. Paul, MN 55102',
    (CURRENT_TIMESTAMP + INTERVAL '4 days')::timestamp AT TIME ZONE 'UTC',
    (CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '3 hours')::timestamp AT TIME ZONE 'UTC',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'google_event_003',
    'primary',
    'Taylor Morrison - Test-Spec - 789 Birch Lane',
    'Special final inspection for Taylor Morrison',
    '789 Birch Lane, Bloomington, MN 55420',
    (CURRENT_TIMESTAMP + INTERVAL '6 days')::timestamp AT TIME ZONE 'UTC',
    (CURRENT_TIMESTAMP + INTERVAL '6 days' + INTERVAL '2.5 hours')::timestamp AT TIME ZONE 'UTC',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'google_event_004',
    'primary',
    'Pulte Homes - MF Inspection',
    'Multifamily inspection for Pulte development',
    'Building 4, Suite 201, Edina, MN 55435',
    (CURRENT_TIMESTAMP + INTERVAL '8 days')::timestamp AT TIME ZONE 'UTC',
    (CURRENT_TIMESTAMP + INTERVAL '8 days' + INTERVAL '4 hours')::timestamp AT TIME ZONE 'UTC',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ============================================================================
-- 3. Pending Calendar Events (Awaiting Manual Review)
-- ============================================================================

-- Events that need manual review and assignment
DO $$
DECLARE
  sample_builder_id VARCHAR;
  admin_user_id VARCHAR;
BEGIN
  -- Get any builder (preferring our test builder)
  SELECT id INTO sample_builder_id 
  FROM builders 
  ORDER BY CASE WHEN id = 'calendar-test-builder' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Get admin user for imported_by (preferring our dev user)
  SELECT id INTO admin_user_id 
  FROM users 
  WHERE role = 'admin'
  ORDER BY CASE WHEN id = 'calendar-dev-user' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Only create if we have required data
  IF sample_builder_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    -- High Confidence Event (≥80%) - Auto-created job
    INSERT INTO pending_calendar_events (
      id, google_event_id, raw_title, raw_description, event_date, event_time,
      parsed_builder_name, parsed_builder_id, parsed_job_type, confidence_score,
      status, metadata, imported_at, imported_by
    )
    VALUES (
      gen_random_uuid(),
      'pending_event_001',
      'M/I Homes - SV2 - 321 Cedar Road',
      'Pre-drywall inspection scheduled',
      (CURRENT_TIMESTAMP + INTERVAL '10 days')::timestamp AT TIME ZONE 'UTC',
      '09:00 AM',
      'M/I Homes',
      sample_builder_id,
      'pre_drywall',
      85,
      'pending',
      '{"location": "321 Cedar Road, Minneapolis, MN", "autoCreated": true}'::jsonb,
      CURRENT_TIMESTAMP,
      admin_user_id
    ) ON CONFLICT DO NOTHING;
    
    -- Medium Confidence Event (60-79%) - Needs review
    INSERT INTO pending_calendar_events (
      id, google_event_id, raw_title, raw_description, event_date, event_time,
      parsed_builder_name, parsed_builder_id, parsed_job_type, confidence_score,
      status, metadata, imported_at, imported_by
    )
    VALUES (
      gen_random_uuid(),
      'pending_event_002',
      'Inspection - 654 Pine Street',
      'Final walkthrough needed',
      (CURRENT_TIMESTAMP + INTERVAL '12 days')::timestamp AT TIME ZONE 'UTC',
      '02:00 PM',
      'Unknown Builder',
      NULL,
      'final',
      65,
      'pending',
      '{"location": "654 Pine Street, St. Paul, MN", "needsReview": true}'::jsonb,
      CURRENT_TIMESTAMP,
      admin_user_id
    ) ON CONFLICT DO NOTHING;
    
    -- Low Confidence Event (<60%) - Manual review required
    INSERT INTO pending_calendar_events (
      id, google_event_id, raw_title, raw_description, event_date, event_time,
      parsed_builder_name, parsed_builder_id, parsed_job_type, confidence_score,
      status, metadata, imported_at, imported_by
    )
    VALUES (
      gen_random_uuid(),
      'pending_event_003',
      'Appointment - TBD Location',
      'Follow-up inspection',
      (CURRENT_TIMESTAMP + INTERVAL '14 days')::timestamp AT TIME ZONE 'UTC',
      '10:30 AM',
      NULL,
      NULL,
      'other',
      45,
      'pending',
      '{"needsReview": true, "missingInfo": ["builder", "location", "inspectionType"]}'::jsonb,
      CURRENT_TIMESTAMP,
      admin_user_id
    ) ON CONFLICT DO NOTHING;
    
    -- Assigned Event (already assigned to inspector)
    INSERT INTO pending_calendar_events (
      id, google_event_id, raw_title, raw_description, event_date, event_time,
      parsed_builder_name, parsed_builder_id, parsed_job_type, confidence_score,
      status, metadata, imported_at, imported_by, processed_at, processed_by
    )
    VALUES (
      gen_random_uuid(),
      'pending_event_004',
      'Lennar - Test - 987 Elm Drive',
      'Final energy audit',
      (CURRENT_TIMESTAMP + INTERVAL '9 days')::timestamp AT TIME ZONE 'UTC',
      '11:00 AM',
      'Lennar',
      sample_builder_id,
      'final',
      90,
      'assigned',
      '{"location": "987 Elm Drive, Minnetonka, MN", "assignedInspector": "John Doe"}'::jsonb,
      CURRENT_TIMESTAMP,
      admin_user_id,
      CURRENT_TIMESTAMP + INTERVAL '1 hour',
      admin_user_id
    ) ON CONFLICT DO NOTHING;
    
    -- Rejected Event (marked for exclusion)
    INSERT INTO pending_calendar_events (
      id, google_event_id, raw_title, raw_description, event_date, event_time,
      parsed_builder_name, parsed_builder_id, parsed_job_type, confidence_score,
      status, metadata, imported_at, imported_by, processed_at, processed_by
    )
    VALUES (
      gen_random_uuid(),
      'pending_event_005',
      'Personal Appointment - Dentist',
      'Personal calendar event',
      (CURRENT_TIMESTAMP + INTERVAL '15 days')::timestamp AT TIME ZONE 'UTC',
      '03:00 PM',
      NULL,
      NULL,
      'other',
      10,
      'rejected',
      '{"rejectionReason": "Personal appointment, not business-related"}'::jsonb,
      CURRENT_TIMESTAMP,
      admin_user_id,
      CURRENT_TIMESTAMP + INTERVAL '30 minutes',
      admin_user_id
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Uncomment to verify the seed data:

-- Check schedule events
-- SELECT id, title, start_time, end_time, color 
-- FROM schedule_events 
-- ORDER BY start_time 
-- LIMIT 5;

-- Check Google Calendar events
-- SELECT id, google_event_id, title, location, start_time, is_converted
-- FROM google_events
-- ORDER BY start_time
-- LIMIT 5;

-- Check pending calendar events by status
-- SELECT status, COUNT(*) as count, 
--        AVG(confidence_score) as avg_confidence
-- FROM pending_calendar_events
-- GROUP BY status;

-- Check pending calendar events details
-- SELECT id, raw_title, parsed_builder_name, parsed_job_type, 
--        confidence_score, status, event_date
-- FROM pending_calendar_events
-- ORDER BY confidence_score DESC
-- LIMIT 5;
