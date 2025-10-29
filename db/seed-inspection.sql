-- Inspection Workflows - Seed Data
-- Purpose: Realistic jobs and checklists covering complete inspection lifecycle
-- Scenarios: 10 test cases covering status workflow, assignment, completion, compliance

-- ==============================================
-- SCENARIO 1: Pending Job (Newly Created)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, completed_items, total_items, created_by)
VALUES
  ('job-001', '123 Oak Street - Pre-Drywall', '123 Oak Street, Minneapolis, MN 55401', 'M/I Homes', 'pending', 'pre_drywall', 225.00, NOW() + INTERVAL '7 days', 'medium', 0, 52, 'user-001');

-- ==============================================
-- SCENARIO 2: Scheduled Job (Assigned to Inspector)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, assigned_at, assigned_by, completed_items, total_items, created_by)
VALUES
  ('job-002', '125 Oak Street - Final', '125 Oak Street, Minneapolis, MN 55402', 'M/I Homes', 'scheduled', 'final', 225.00, NOW() + INTERVAL '2 days', 'high', 'user-002', NOW() - INTERVAL '1 day', 'user-001', 0, 52, 'user-001');

-- ==============================================
-- SCENARIO 3: In Progress Job (Inspector Working)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, completed_items, total_items, created_by, builder_id)
VALUES
  ('job-003', '789 Pine Valley Dr - Pre-Drywall', '789 Pine Valley Dr, Maple Grove, MN 55311', 'Pulte Homes', 'in_progress', 'pre_drywall', 240.00, NOW(), 'high', 'user-002', 28, 52, 'user-001', 'builder-002');

INSERT INTO checklist_items (id, job_id, item_number, title, completed, status, photo_count, photo_required)
VALUES
  ('item-001', 'job-003', 1, 'Foundation inspection', true, 'pass', 2, true),
  ('item-002', 'job-003', 2, 'Framing inspection', true, 'pass', 3, true),
  ('item-003', 'job-003', 3, 'Insulation installation', true, 'pass', 2, true),
  ('item-004', 'job-003', 4, 'Air sealing', false, 'pending', 0, true);

-- ==============================================
-- SCENARIO 4: Completed Job (Builder Signed)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, completed_date, priority, assigned_to, completed_items, total_items, builder_signature_url, builder_signed_at, builder_signer_name, compliance_status, created_by)
VALUES
  ('job-004', '456 Heritage Dr - Final', '456 Heritage Dr, Eden Prairie, MN 55346', 'Taylor Homes', 'completed', 'final', 250.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'medium', 'user-002', 52, 52, 'https://storage.example.com/signatures/job-004.png', NOW() - INTERVAL '1 day', 'Mike Johnson, Superintendent', 'pass', 'user-001');

-- ==============================================
-- SCENARIO 5: Completed Job with Failed Compliance
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, completed_date, priority, assigned_to, completed_items, total_items, builder_signature_url, builder_signed_at, builder_signer_name, compliance_status, compliance_flags, created_by)
VALUES
  ('job-005', '100 Test Ave - Final', '100 Test Ave, Lakeville, MN 55044', 'Lennar', 'completed', 'final', 200.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', 'high', 'user-003', 52, 52, 'https://storage.example.com/signatures/job-005.png', NOW() - INTERVAL '2 days', 'Sarah Williams, PM', 'fail', '{"blowerDoor": "fail", "ductLeakage": "pass"}', 'user-001');

-- ==============================================
-- SCENARIO 6: High Priority Job (Rush)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, assigned_at, completed_items, total_items, created_by)
VALUES
  ('job-006', 'RUSH - 888 Main St - Pre-Drywall', '888 Main St, Minneapolis, MN 55408', 'Johnson Custom Homes', 'scheduled', 'pre_drywall', 275.00, NOW() + INTERVAL '1 day', 'urgent', 'user-002', NOW(), 0, 52, 'user-001');

-- ==============================================
-- SCENARIO 7: Multifamily Job (Large Property)
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, completed_items, total_items, floor_area, stories, created_by)
VALUES
  ('job-007', 'Sunset Ridge Townhomes Unit 12', '100 Sunset Ridge Dr Unit 12, Minnetonka, MN 55345', 'Pulte Homes', 'in_progress', 'multifamily', 240.00, NOW(), 'medium', 'user-003', 15, 52, 1800.00, 2.0, 'user-001');

-- ==============================================
-- SCENARIO 8: Cancelled Job
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, is_cancelled, completed_items, total_items, created_by)
VALUES
  ('job-008', '200 Cancelled St - Final', '200 Cancelled St, Chaska, MN 55318', 'White Construction', 'cancelled', 'final', 250.00, NOW() - INTERVAL '10 days', 'low', true, 0, 52, 'user-001');

-- ==============================================
-- SCENARIO 9: Job with Geographic Data
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, latitude, longitude, territory, completed_items, total_items, created_by, lot_id)
VALUES
  ('job-009', 'Oak Ridge Estates Lot 14', '125 Oak Ridge Dr, Chaska, MN 55318', 'M/I Homes', 'scheduled', 'pre_drywall', 225.00, NOW() + INTERVAL '3 days', 'medium', 'user-002', 44.8172, -93.5986, 'Southwest Metro', 0, 52, 'user-001', 'lot-001');

-- ==============================================
-- SCENARIO 10: Job with Partial Checklist Completion
-- ==============================================
INSERT INTO jobs (id, name, address, contractor, status, inspection_type, pricing, scheduled_date, priority, assigned_to, completed_items, total_items, created_by)
VALUES
  ('job-010', '555 Partial Completion Ave', '555 Partial Completion Ave, Woodbury, MN 55125', 'Lennar', 'in_progress', 'final', 200.00, NOW(), 'medium', 'user-003', 40, 52, 'user-001');

INSERT INTO checklist_items (id, job_id, item_number, title, completed, status, notes, photo_count, photo_required)
VALUES
  ('item-010', 'job-010', 1, 'Final walkthrough', true, 'pass', 'All systems operational', 4, true),
  ('item-011', 'job-010', 2, 'HVAC final inspection', true, 'pass', 'System tested and balanced', 2, true),
  ('item-012', 'job-010', 3, 'Electrical final', true, 'pass', NULL, 1, false),
  ('item-013', 'job-010', 4, 'Plumbing final', true, 'pass', NULL, 1, false),
  ('item-014', 'job-010', 5, 'Blower door test', false, 'in_progress', 'Test in progress', 0, true),
  ('item-015', 'job-010', 6, 'Duct leakage test', false, 'pending', NULL, 0, true);

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify jobs created
SELECT 
  'Jobs' as entity,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  ROUND(AVG(pricing::numeric), 2) as avg_pricing,
  SUM(completed_items) as total_completed_items,
  SUM(total_items) as total_items_all_jobs
FROM jobs
WHERE id LIKE 'job-%';

-- Verify jobs by inspection type
SELECT 
  'Jobs by Type' as entity,
  inspection_type,
  COUNT(*) as job_count,
  ROUND(AVG(pricing::numeric), 2) as avg_pricing
FROM jobs
WHERE id LIKE 'job-%'
GROUP BY inspection_type
ORDER BY job_count DESC;

-- Verify jobs by priority
SELECT 
  'Jobs by Priority' as entity,
  priority,
  COUNT(*) as job_count
FROM jobs
WHERE id LIKE 'job-%'
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- Verify checklist items
SELECT 
  'Checklist Items' as entity,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE completed = true) as completed_items,
  COUNT(*) FILTER (WHERE status = 'pass') as passed_items,
  COUNT(*) FILTER (WHERE status = 'fail') as failed_items,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_items,
  COUNT(*) FILTER (WHERE photo_required = true) as photo_required_items,
  SUM(photo_count) as total_photos
FROM checklist_items
WHERE id LIKE 'item-%';

-- Verify compliance status
SELECT 
  'Compliance Status' as entity,
  compliance_status,
  COUNT(*) as job_count
FROM jobs
WHERE id LIKE 'job-%'
  AND compliance_status IS NOT NULL
GROUP BY compliance_status;

-- Verify inspector assignments
SELECT 
  'Inspector Assignments' as entity,
  assigned_to as inspector_id,
  COUNT(*) as assigned_jobs,
  SUM(completed_items) as total_completed_items
FROM jobs
WHERE id LIKE 'job-%'
  AND assigned_to IS NOT NULL
GROUP BY assigned_to
ORDER BY assigned_jobs DESC;

-- Verify builder signatures
SELECT 
  'Builder Signatures' as entity,
  COUNT(*) as jobs_with_signature,
  COUNT(*) FILTER (WHERE builder_signed_at IS NOT NULL) as signed_count
FROM jobs
WHERE id LIKE 'job-%'
  AND builder_signature_url IS NOT NULL;

-- Job progress summary
SELECT 
  j.id,
  j.name,
  j.status,
  j.completed_items,
  j.total_items,
  ROUND((j.completed_items::decimal / NULLIF(j.total_items, 0) * 100), 2) as completion_percentage,
  j.compliance_status
FROM jobs j
WHERE j.id LIKE 'job-%'
ORDER BY completion_percentage DESC;

-- Photo-required items completion
SELECT 
  j.name as job_name,
  COUNT(*) FILTER (WHERE ci.photo_required = true) as photo_required_items,
  COUNT(*) FILTER (WHERE ci.photo_required = true AND ci.photo_count > 0) as photo_required_completed,
  COUNT(*) FILTER (WHERE ci.photo_required = true AND ci.photo_count = 0) as photo_required_missing
FROM jobs j
LEFT JOIN checklist_items ci ON ci.job_id = j.id
WHERE j.id LIKE 'job-%'
GROUP BY j.id, j.name
HAVING COUNT(*) FILTER (WHERE ci.photo_required = true) > 0;
