-- Jobs Management System - Seed Data
-- 8+ Realistic Job Scenarios for Testing and Development
--
-- Prerequisites:
--   - Users table must have test users: admin-user-id, inspector-1, inspector-2
--   - Builders table should have test builders: builder-sunrise-homes, builder-quality-homes
--
-- Usage: psql $DATABASE_URL -f db/seed-jobs.sql

-- ============================================================================
-- Scenario 1: Pending Job with No Builder
-- ============================================================================
-- Use Case: Job created before builder information known
-- Tests: Handling of null builderId, pending status workflow

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    priority,
    created_by,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-pending-no-builder',
    '123 Main St - Final Inspection',
    '123 Main Street, Minneapolis, MN 55401',
    'ABC Construction',
    'pending',
    'Final',
    'medium',
    'admin-user-id',
    0,
    52,
    'New construction final inspection. Builder information pending from office.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 2: Scheduled Job with Future Date
-- ============================================================================
-- Use Case: Pre-scheduled inspection with high priority
-- Tests: Future date handling, assignment workflow, priority tracking

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    original_scheduled_date,
    assigned_to,
    assigned_at,
    assigned_by,
    created_by,
    priority,
    pricing,
    floor_area,
    stories,
    estimated_duration,
    territory,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-scheduled-future',
    '456 Oak Ave - Pre-Drywall',
    '456 Oak Avenue, St. Paul, MN 55104',
    'XYZ Builders LLC',
    'scheduled',
    'Pre-Drywall',
    NOW() + INTERVAL '7 days',  -- Scheduled 7 days in future
    NOW() + INTERVAL '7 days',
    'inspector-1',
    NOW() - INTERVAL '2 days',  -- Assigned 2 days ago
    'admin-user-id',
    'admin-user-id',
    'high',  -- High priority
    '350.00',
    '1800.00',  -- 1800 sq ft
    '1.0',
    90,  -- 90 minute estimated duration
    'North Metro',
    0,
    28,  -- Pre-Drywall has 28 checklist items
    'High priority - builder needs inspection before drywall delivery. Access code: 1234#'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 3: In-Progress Job with Partial Completion
-- ============================================================================
-- Use Case: Inspector currently on-site, mid-inspection
-- Tests: Progress tracking (completedItems/totalItems), in-progress status

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    assigned_to,
    assigned_at,
    created_by,
    priority,
    pricing,
    floor_area,
    surface_area,
    house_volume,
    stories,
    latitude,
    longitude,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-in-progress',
    '789 Pine St - Final Inspection',
    '789 Pine Street, Minneapolis, MN 55401',
    'Quality Homes',
    'in-progress',
    'Final',
    NOW(),  -- Happening right now
    'inspector-1',
    NOW() - INTERVAL '30 minutes',
    'inspector-1',
    'medium',
    '450.00',
    '2400.00',  -- 2400 sq ft
    '3200.00',  -- Surface area for insulation calculations
    '19200.00',  -- House volume (2400 sq ft × 8 ft ceiling)
    '2.0',  -- 2 stories
    44.9778,  -- Minneapolis latitude
    -93.2650,  -- Minneapolis longitude
    35,  -- 35 out of 52 items completed
    52,
    'Inspector arrived at 9:00 AM. Checklist in progress. Minor issue with vapor barrier in bathroom, builder addressing on-site.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 4: Completed Job with Passing Compliance
-- ============================================================================
-- Use Case: Successful final inspection with all tests passing
-- Tests: Completion workflow, compliance tracking, completedDate auto-set

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    completed_date,
    assigned_to,
    assigned_at,
    created_by,
    priority,
    pricing,
    floor_area,
    surface_area,
    house_volume,
    stories,
    latitude,
    longitude,
    completed_items,
    total_items,
    compliance_status,
    compliance_flags,
    last_compliance_check,
    notes
) VALUES (
    'job-completed-passing',
    '321 Elm Dr - Final Inspection',
    '321 Elm Drive, Minneapolis, MN 55402',
    'Premium Builders Inc',
    'completed',
    'Final',
    NOW() - INTERVAL '3 days' + INTERVAL '14 hours',  -- Scheduled 3 days ago at 2 PM
    NOW() - INTERVAL '3 days' + INTERVAL '16 hours' + INTERVAL '30 minutes',  -- Completed 2.5 hours later
    'inspector-1',
    NOW() - INTERVAL '5 days',
    'inspector-1',
    'medium',
    '450.00',
    '2200.00',
    '3000.00',
    '17600.00',
    '2.0',
    44.9536,
    -93.2402,
    52,  -- All items completed
    52,
    'passing',  -- Compliance status: PASSING
    '[]'::jsonb,  -- No compliance issues
    NOW() - INTERVAL '3 days' + INTERVAL '16 hours',  -- Compliance check when completed
    'All RESNET checklist items passed. Blower door: ACH50 = 2.8 (PASS). Duct leakage: DLO = 2.5 (PASS). Ventilation: meets ASHRAE 62.2. Ready for closing.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 5: Review Job with Failing Compliance (ACH50_HIGH)
-- ============================================================================
-- Use Case: Job requiring admin review due to ACH50 > 3.0
-- Tests: Compliance failure handling, review workflow, complianceFlags

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    completed_date,
    assigned_to,
    assigned_at,
    created_by,
    priority,
    pricing,
    floor_area,
    surface_area,
    house_volume,
    stories,
    latitude,
    longitude,
    completed_items,
    total_items,
    compliance_status,
    compliance_flags,
    last_compliance_check,
    notes
) VALUES (
    'job-review-ach50-high',
    '555 Maple Ln - Final Inspection',
    '555 Maple Lane, St. Paul, MN 55104',
    'Budget Homes LLC',
    'review',  -- Status: REVIEW (requires admin approval)
    'Final',
    NOW() - INTERVAL '1 day' + INTERVAL '9 hours',  -- Yesterday morning
    NOW() - INTERVAL '1 day' + INTERVAL '11 hours' + INTERVAL '45 minutes',
    'inspector-2',
    NOW() - INTERVAL '3 days',
    'inspector-2',
    'urgent',  -- Urgent priority to resolve
    '450.00',
    '2600.00',
    '3400.00',
    '20800.00',
    '2.0',
    44.9441,
    -93.0933,
    52,  -- All checklist items completed
    52,
    'failing',  -- Compliance status: FAILING
    '["ACH50_HIGH"]'::jsonb,  -- Compliance flag: ACH50 too high
    NOW() - INTERVAL '1 day' + INTERVAL '11 hours',
    'COMPLIANCE ISSUE: Blower door test shows ACH50 = 3.4 (threshold: ≤3.0). Discussed with builder. Options: (1) Re-seal attic access hatch and re-test, (2) Request variance. Awaiting builder decision.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 6: Cancelled Job
-- ============================================================================
-- Use Case: Job cancelled before inspection
-- Tests: Cancellation workflow, isCancelled flag

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    original_scheduled_date,
    assigned_to,
    assigned_at,
    assigned_by,
    created_by,
    is_cancelled,
    priority,
    pricing,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-cancelled',
    '999 Cedar Ct - Rough Inspection',
    '999 Cedar Court, Minneapolis, MN 55403',
    'Fast Build LLC',
    'pending',
    'Rough',
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days',
    'inspector-1',
    NOW() - INTERVAL '1 day',
    'admin-user-id',
    'admin-user-id',
    true,  -- Job is cancelled
    'low',
    '250.00',
    0,
    18,  -- Rough inspection has 18 items
    'CANCELLED: Builder requested cancellation on 2025-10-29. Reason: Lot sold to different buyer who will use their own inspector. No show fee waived as courtesy.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 7: Job with Builder Signature
-- ============================================================================
-- Use Case: Completed inspection with builder sign-off
-- Tests: Signature capture workflow, signature metadata

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    completed_date,
    assigned_to,
    assigned_at,
    created_by,
    priority,
    pricing,
    floor_area,
    surface_area,
    house_volume,
    stories,
    latitude,
    longitude,
    completed_items,
    total_items,
    compliance_status,
    compliance_flags,
    last_compliance_check,
    builder_signature_url,
    builder_signed_at,
    builder_signer_name,
    notes
) VALUES (
    'job-with-signature',
    '777 Birch Blvd - Final Inspection',
    '777 Birch Boulevard, St. Paul, MN 55105',
    'Signature Homes',
    'completed',
    'Final',
    NOW() - INTERVAL '2 days' + INTERVAL '15 hours',
    NOW() - INTERVAL '2 days' + INTERVAL '16 hours' + INTERVAL '30 minutes',
    'inspector-1',
    NOW() - INTERVAL '4 days',
    'inspector-1',
    'medium',
    '475.00',
    '2800.00',
    '3600.00',
    '22400.00',
    '2.5',  -- Split-level home
    44.9320,
    -93.1030,
    52,
    52,
    'passing',
    '[]'::jsonb,
    NOW() - INTERVAL '2 days' + INTERVAL '16 hours' + INTERVAL '15 minutes',
    'https://storage.example.com/signatures/abc123-signature.png',  -- Signature URL (object storage)
    NOW() - INTERVAL '2 days' + INTERVAL '16 hours' + INTERVAL '30 minutes',  -- Signed immediately after completion
    'John Smith - Signature Homes Project Manager',
    'Excellent inspection. All items passed on first inspection. Builder signature captured digitally on iPad. Copy of signed report emailed to builder.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 8: Job Linked to Google Calendar Event
-- ============================================================================
-- Use Case: Job auto-created from Google Calendar event
-- Tests: Calendar integration, bidirectional sync, sourceGoogleEventId

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    original_scheduled_date,
    assigned_to,
    assigned_at,
    assigned_by,
    created_by,
    google_event_id,
    source_google_event_id,
    priority,
    pricing,
    estimated_duration,
    territory,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-from-calendar',
    '888 Spruce St - Final Inspection',
    '888 Spruce Street, Minneapolis, MN 55404',
    'Calendar Builders Inc',
    'scheduled',
    'Final',
    NOW() + INTERVAL '10 days' + INTERVAL '13 hours',  -- 10 days from now at 1 PM
    NOW() + INTERVAL '10 days' + INTERVAL '13 hours',  -- Original scheduled date (no reschedules yet)
    'inspector-2',
    NOW() - INTERVAL '1 hour',  -- Auto-assigned when created from calendar
    'admin-user-id',
    'admin-user-id',  -- Created by admin from calendar review queue
    'google-event-abc123',  -- Linked to Google Calendar event
    'google-event-abc123',  -- Same as googleEventId (not rescheduled)
    'medium',
    '450.00',
    120,  -- 2 hour inspection
    'West Metro',
    0,
    52,
    'Auto-created from Google Calendar event imported on 2025-10-30. Calendar title: "Final - 888 Spruce St - Calendar Builders". Event synchronized bidirectionally.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 9: Job with Multiple Compliance Flags
-- ============================================================================
-- Use Case: Job with multiple failing tests (ACH50 + DLO)
-- Tests: Multiple complianceFlags handling, severe compliance issues

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    completed_date,
    assigned_to,
    assigned_at,
    created_by,
    priority,
    pricing,
    floor_area,
    surface_area,
    house_volume,
    stories,
    latitude,
    longitude,
    completed_items,
    total_items,
    compliance_status,
    compliance_flags,
    last_compliance_check,
    notes
) VALUES (
    'job-multiple-failures',
    '111 Willow Way - Final Inspection',
    '111 Willow Way, Minneapolis, MN 55405',
    'Discount Builders Co',
    'review',
    'Final',
    NOW() - INTERVAL '5 days' + INTERVAL '10 hours',
    NOW() - INTERVAL '5 days' + INTERVAL '12 hours' + INTERVAL '15 minutes',
    'inspector-2',
    NOW() - INTERVAL '7 days',
    'inspector-2',
    'urgent',
    '450.00',
    '2100.00',
    '2800.00',
    '16800.00',
    '2.0',
    44.9667,
    -93.2833,
    52,
    52,
    'failing',
    '["ACH50_HIGH", "DLO_FAILED"]'::jsonb,  -- Multiple compliance failures
    NOW() - INTERVAL '5 days' + INTERVAL '12 hours',
    'SEVERE COMPLIANCE ISSUES: (1) Blower door ACH50 = 3.7 (threshold ≤3.0), (2) Duct leakage to outside = 3.8 CFM25/100 sq ft (threshold ≤3.0). Builder notified. Re-inspection required after remediation. Estimated 3-5 days for repairs.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Scenario 10: Urgent Job - Same Day Inspection
-- ============================================================================
-- Use Case: Emergency/urgent same-day inspection request
-- Tests: Urgent priority handling, same-day scheduling

INSERT INTO jobs (
    id,
    name,
    address,
    contractor,
    status,
    inspection_type,
    scheduled_date,
    assigned_to,
    assigned_at,
    assigned_by,
    created_by,
    priority,
    pricing,
    floor_area,
    stories,
    estimated_duration,
    territory,
    completed_items,
    total_items,
    notes
) VALUES (
    'job-urgent-same-day',
    '222 Aspen Pl - Final Inspection',
    '222 Aspen Place, St. Paul, MN 55106',
    'Rush Construction LLC',
    'scheduled',
    'Final',
    NOW() + INTERVAL '3 hours',  -- Scheduled for 3 hours from now
    'inspector-1',
    NOW() - INTERVAL '15 minutes',  -- Assigned 15 minutes ago
    'admin-user-id',
    'admin-user-id',
    'urgent',  -- URGENT priority
    '550.00',  -- Higher pricing for same-day rush
    '1900.00',
    '1.5',
    90,
    'South Metro',
    0,
    52,
    'URGENT: Builder has closing scheduled for tomorrow morning. Inspector confirmed available for same-day inspection. Rush fee applied (+$100). Buyer will meet on-site.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Summary Output
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '   Jobs Management - Seed Data Loaded        '
\echo '==============================================='
\echo ''
\echo 'Scenarios Loaded:'
\echo '  1. ✓ Pending job with no builder'
\echo '  2. ✓ Scheduled job with future date (7 days out)'
\echo '  3. ✓ In-progress job (partial completion: 35/52 items)'
\echo '  4. ✓ Completed job with passing compliance'
\echo '  5. ✓ Review job with failing compliance (ACH50_HIGH)'
\echo '  6. ✓ Cancelled job'
\echo '  7. ✓ Job with builder signature'
\echo '  8. ✓ Job linked to Google Calendar event'
\echo '  9. ✓ Job with multiple compliance failures'
\echo ' 10. ✓ Urgent same-day inspection'
\echo ''
\echo 'Total: 10 job scenarios'
\echo ''
\echo 'Query Examples:'
\echo '  -- View all pending jobs'
\echo '  SELECT id, name, status FROM jobs WHERE status = ''pending'';'
\echo ''
\echo '  -- View jobs with compliance issues'
\echo '  SELECT id, name, compliance_status, compliance_flags FROM jobs WHERE compliance_status = ''failing'';'
\echo ''
\echo '  -- View completed jobs from last 7 days'
\echo '  SELECT id, name, completed_date FROM jobs WHERE status = ''completed'' AND completed_date >= NOW() - INTERVAL ''7 days'';'
\echo ''
\echo '==============================================='
