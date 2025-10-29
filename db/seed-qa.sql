-- Quality Assurance System - Seed Data
-- Purpose: Realistic test scenarios for QA checklists, scores, and performance metrics
-- Scenarios: 12 comprehensive test cases covering all QA workflows

-- ==============================================
-- SCENARIO 1: Pre-Inspection Checklist (Active)
-- ==============================================
INSERT INTO qa_checklists (id, name, category, description, is_active, required_for_job_types, created_at, updated_at)
VALUES (
  'qa-ckl-pre-insp-001',
  'Pre-Inspection Site Verification',
  'pre_inspection',
  'Verify all site conditions and preparation before beginning inspection work',
  true,
  ARRAY['Final', 'Rough', 'Blower Door'],
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- Pre-Inspection Checklist Items
INSERT INTO qa_checklist_items (id, checklist_id, item_text, is_critical, category, sort_order, help_text, required_evidence)
VALUES
  ('qa-item-pre-001', 'qa-ckl-pre-insp-001', 'Equipment loaded in vehicle', true, 'Preparation', 0, 'Verify all required diagnostic equipment is loaded and secured', 'photo'),
  ('qa-item-pre-002', 'qa-ckl-pre-insp-001', 'Calibration stickers verified current', true, 'Equipment', 1, 'Check all equipment calibration dates are within last 12 months', 'photo'),
  ('qa-item-pre-003', 'qa-ckl-pre-insp-001', 'Customer contact confirmed', false, 'Communication', 2, 'Call customer 30 minutes before arrival to confirm appointment', 'note'),
  ('qa-item-pre-004', 'qa-ckl-pre-insp-001', 'Route and parking verified', false, 'Logistics', 3, 'Review site address, parking availability, and access instructions', 'none'),
  ('qa-item-pre-005', 'qa-ckl-pre-insp-001', 'Weather conditions acceptable', false, 'Site Conditions', 4, 'Verify weather is suitable for testing (no high winds, extreme temps)', 'note');

-- ==============================================
-- SCENARIO 2: Blower Door Compliance Checklist
-- ==============================================
INSERT INTO qa_checklists (id, name, category, description, is_active, required_for_job_types, created_at, updated_at)
VALUES (
  'qa-ckl-blower-001',
  'Blower Door Test Verification',
  'compliance',
  'RESNET and Minnesota Code compliance verification for blower door testing',
  true,
  ARRAY['Blower Door'],
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- Blower Door Checklist Items
INSERT INTO qa_checklist_items (id, checklist_id, item_text, is_critical, category, sort_order, help_text, required_evidence)
VALUES
  ('qa-item-bd-001', 'qa-ckl-blower-001', 'Equipment calibration current (<1 year)', true, 'Equipment', 0, 'Verify blower door and manometer calibration stickers', 'photo'),
  ('qa-item-bd-002', 'qa-ckl-blower-001', 'House volume calculated correctly', true, 'Calculations', 1, 'Verify conditioned space volume using floor plans or measurements', 'measurement'),
  ('qa-item-bd-003', 'qa-ckl-blower-001', 'All openings sealed per RESNET standards', true, 'Setup', 2, 'Verify doors, windows, fireplace dampers, and exhaust vents sealed', 'photo'),
  ('qa-item-bd-004', 'qa-ckl-blower-001', 'Baseline pressure measured', true, 'Testing', 3, 'Record baseline house pressure before testing', 'measurement'),
  ('qa-item-bd-005', 'qa-ckl-blower-001', 'Multi-point test performed (minimum 5 points)', true, 'Testing', 4, 'Record flow and pressure at 5+ test points for regression analysis', 'measurement'),
  ('qa-item-bd-006', 'qa-ckl-blower-001', 'ACH50 ≤ 3.0 (Minnesota Code)', true, 'Compliance', 5, 'Verify final ACH50 meets or exceeds Minnesota 2020 Energy Code requirement', 'measurement'),
  ('qa-item-bd-007', 'qa-ckl-blower-001', 'Weather corrections applied', false, 'Calculations', 6, 'Apply temperature and altitude corrections per RESNET standards', 'measurement'),
  ('qa-item-bd-008', 'qa-ckl-blower-001', 'Photos of setup and equipment', true, 'Documentation', 7, 'Document blower door installation, manometer, and test setup', 'photo');

-- ==============================================
-- SCENARIO 3: Post-Inspection Cleanup Checklist
-- ==============================================
INSERT INTO qa_checklists (id, name, category, description, is_active, required_for_job_types, created_at, updated_at)
VALUES (
  'qa-ckl-post-001',
  'Post-Inspection Cleanup & Documentation',
  'post',
  'Ensure all post-inspection procedures completed before leaving site',
  true,
  ARRAY['Final', 'Rough', 'Blower Door', 'Duct Leakage'],
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- Post-Inspection Checklist Items
INSERT INTO qa_checklist_items (id, checklist_id, item_text, is_critical, category, sort_order, help_text, required_evidence)
VALUES
  ('qa-item-post-001', 'qa-ckl-post-001', 'All required photos taken', true, 'Documentation', 0, 'Verify all required photo tags are present with clear images', 'photo'),
  ('qa-item-post-002', 'qa-ckl-post-001', 'Measurements recorded in system', true, 'Data Entry', 1, 'Enter all test results, measurements, and calculations in system', 'none'),
  ('qa-item-post-003', 'qa-ckl-post-001', 'Customer signature obtained', true, 'Documentation', 2, 'Get customer signature on inspection completion form', 'signature'),
  ('qa-item-post-004', 'qa-ckl-post-001', 'Site cleaned and restored', false, 'Cleanup', 3, 'Remove all equipment, tape, and materials from site', 'photo'),
  ('qa-item-post-005', 'qa-ckl-post-001', 'Next steps explained to customer', false, 'Communication', 4, 'Explain report timeline and any follow-up actions required', 'note');

-- ==============================================
-- SCENARIO 4: During Inspection Safety Checklist
-- ==============================================
INSERT INTO qa_checklists (id, name, category, description, is_active, required_for_job_types, created_at, updated_at)
VALUES (
  'qa-ckl-safety-001',
  'Safety Protocols & Hazard Assessment',
  'during',
  'Document safety hazards and protocols during inspection',
  true,
  ARRAY['Final', 'Rough', 'Blower Door', 'Duct Leakage'],
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- Safety Checklist Items
INSERT INTO qa_checklist_items (id, checklist_id, item_text, is_critical, category, sort_order, help_text, required_evidence)
VALUES
  ('qa-item-safe-001', 'qa-ckl-safety-001', 'Site safety hazards identified', true, 'Safety', 0, 'Document any electrical, structural, or environmental hazards', 'photo'),
  ('qa-item-safe-002', 'qa-ckl-safety-001', 'PPE worn as required', true, 'Safety', 1, 'Wear hard hat, safety glasses, gloves as site conditions require', 'none'),
  ('qa-item-safe-003', 'qa-ckl-safety-001', 'Carbon monoxide levels checked', true, 'Safety', 2, 'Verify CO levels safe before and during testing (<35 ppm)', 'measurement'),
  ('qa-item-safe-004', 'qa-ckl-safety-001', 'Combustion appliance zone isolated', false, 'Safety', 3, 'Close doors to furnace rooms during depressurization testing', 'note');

-- ==============================================
-- SCENARIO 5: Excellent Performance Score (A)
-- Inspector: John Expert
-- Job: 123 Main St - Final Inspection
-- ==============================================
INSERT INTO qa_inspection_scores (
  id, job_id, inspector_id, report_instance_id, 
  total_score, max_score, percentage, grade,
  completeness_score, accuracy_score, compliance_score, photo_quality_score, timeliness_score,
  review_status, reviewed_by, review_date, review_notes, created_at
)
VALUES (
  'qa-score-001',
  'job-001', -- Assuming this job exists from job seed data
  'user-001', -- Inspector ID
  'report-inst-001',
  95.5, 100, 95.5, 'A',
  98.0, 96.0, 95.0, 92.0, 95.0,
  'approved', 'user-admin', NOW() - INTERVAL '2 days',
  'Excellent work! All requirements exceeded. Outstanding photo documentation.',
  NOW() - INTERVAL '3 days'
);

-- ==============================================
-- SCENARIO 6: Good Performance Score (B)
-- Inspector: Sarah Competent
-- Job: 456 Oak Ave - Blower Door
-- ==============================================
INSERT INTO qa_inspection_scores (
  id, job_id, inspector_id, report_instance_id,
  total_score, max_score, percentage, grade,
  completeness_score, accuracy_score, compliance_score, photo_quality_score, timeliness_score,
  review_status, reviewed_by, review_date, review_notes, created_at
)
VALUES (
  'qa-score-002',
  'job-002',
  'user-002',
  'report-inst-002',
  87.3, 100, 87.3, 'B',
  92.0, 88.0, 90.0, 85.0, 78.0,
  'approved', 'user-admin', NOW() - INTERVAL '1 day',
  'Good work overall. Focus on timeliness - job completed 1 day late.',
  NOW() - INTERVAL '2 days'
);

-- ==============================================
-- SCENARIO 7: Needs Improvement Score (C)
-- Inspector: Mike Learning
-- Job: 789 Elm St - Duct Leakage
-- ==============================================
INSERT INTO qa_inspection_scores (
  id, job_id, inspector_id, report_instance_id,
  total_score, max_score, percentage, grade,
  completeness_score, accuracy_score, compliance_score, photo_quality_score, timeliness_score,
  review_status, reviewed_by, review_date, review_notes, created_at
)
VALUES (
  'qa-score-003',
  'job-003',
  'user-003',
  'report-inst-003',
  74.5, 100, 74.5, 'C',
  85.0, 68.0, 75.0, 72.0, 72.0,
  'needs_improvement', 'user-admin', NOW() - INTERVAL '6 hours',
  'Calculation errors in duct leakage CFM25/100 sq ft. Review Minneapolis Duct Blaster calibration factors. Also missing several required photo tags. Schedule training session.',
  NOW() - INTERVAL '1 day'
);

-- ==============================================
-- SCENARIO 8: Pending Review Score
-- Inspector: Lisa Diligent
-- Job: 321 Pine St - Final
-- ==============================================
INSERT INTO qa_inspection_scores (
  id, job_id, inspector_id, report_instance_id,
  total_score, max_score, percentage, grade,
  completeness_score, accuracy_score, compliance_score, photo_quality_score, timeliness_score,
  review_status, reviewed_by, review_date, review_notes, created_at
)
VALUES (
  'qa-score-004',
  'job-004',
  'user-004',
  'report-inst-004',
  89.2, 100, 89.2, 'B',
  95.0, 90.0, 88.0, 86.0, 82.0,
  'pending', NULL, NULL, NULL,
  NOW() - INTERVAL '3 hours'
);

-- ==============================================
-- SCENARIO 9: Failed Critical Items (F)
-- Inspector: Bob Rushed
-- Job: 555 Birch Rd - Blower Door
-- ==============================================
INSERT INTO qa_inspection_scores (
  id, job_id, inspector_id, report_instance_id,
  total_score, max_score, percentage, grade,
  completeness_score, accuracy_score, compliance_score, photo_quality_score, timeliness_score,
  review_status, reviewed_by, review_date, review_notes, created_at
)
VALUES (
  'qa-score-005',
  'job-005',
  'user-005',
  NULL, -- No report instance - incomplete
  58.0, 100, 58.0, 'F',
  45.0, 62.0, 55.0, 68.0, 60.0,
  'needs_improvement', 'user-admin', NOW() - INTERVAL '30 minutes',
  'CRITICAL: Equipment calibration expired. Cannot certify results until re-tested with calibrated equipment. Also missing house volume calculation and multi-point test data. Job must be re-inspected.',
  NOW() - INTERVAL '4 hours'
);

-- ==============================================
-- SCENARIO 10: Monthly Performance Metrics
-- Inspector: John Expert (Top Performer)
-- ==============================================
INSERT INTO qa_performance_metrics (
  id, user_id, period, period_start, period_end,
  avg_score, jobs_completed, jobs_reviewed, on_time_rate, first_pass_rate, customer_satisfaction,
  strong_areas, improvement_areas, calculated_at
)
VALUES (
  'qa-perf-001',
  'user-001',
  'month',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  94.2, 42, 42, 97.6, 95.2, 4.9,
  ARRAY['completeness', 'compliance', 'photo_quality'],
  ARRAY[]::text[], -- No improvement areas - top performer
  NOW()
);

-- ==============================================
-- SCENARIO 11: Monthly Performance Metrics
-- Inspector: Sarah Competent (Solid Performer)
-- ==============================================
INSERT INTO qa_performance_metrics (
  id, user_id, period, period_start, period_end,
  avg_score, jobs_completed, jobs_reviewed, on_time_rate, first_pass_rate, customer_satisfaction,
  strong_areas, improvement_areas, calculated_at
)
VALUES (
  'qa-perf-002',
  'user-002',
  'month',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  86.8, 38, 38, 89.5, 92.1, 4.6,
  ARRAY['completeness', 'accuracy'],
  ARRAY['timeliness'], -- Needs improvement in timeliness
  NOW()
);

-- ==============================================
-- SCENARIO 12: Monthly Performance Metrics
-- Inspector: Mike Learning (Needs Training)
-- ==============================================
INSERT INTO qa_performance_metrics (
  id, user_id, period, period_start, period_end,
  avg_score, jobs_completed, jobs_reviewed, on_time_rate, first_pass_rate, customer_satisfaction,
  strong_areas, improvement_areas, calculated_at
)
VALUES (
  'qa-perf-003',
  'user-003',
  'month',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  73.5, 28, 28, 85.7, 75.0, 4.2,
  ARRAY['completeness'],
  ARRAY['accuracy', 'compliance'], -- Needs training in calculations and code requirements
  NOW()
);

-- ==============================================
-- CHECKLIST RESPONSES: Sample Completions
-- ==============================================
-- Job 001: John Expert - All items completed with evidence
INSERT INTO qa_checklist_responses (id, job_id, checklist_id, item_id, user_id, response, notes, evidence_ids, completed_at)
VALUES
  ('qa-resp-001', 'job-001', 'qa-ckl-pre-insp-001', 'qa-item-pre-001', 'user-001', 'completed', 'All equipment loaded and verified', ARRAY['photo-001'], NOW() - INTERVAL '3 days'),
  ('qa-resp-002', 'job-001', 'qa-ckl-pre-insp-001', 'qa-item-pre-002', 'user-001', 'completed', 'Calibration current on all equipment', ARRAY['photo-002', 'photo-003'], NOW() - INTERVAL '3 days'),
  ('qa-resp-003', 'job-001', 'qa-ckl-pre-insp-001', 'qa-item-pre-003', 'user-001', 'completed', 'Customer confirmed, will be home', ARRAY['photo-004'], NOW() - INTERVAL '3 days'),
  ('qa-resp-004', 'job-001', 'qa-ckl-pre-insp-001', 'qa-item-pre-004', 'user-001', 'completed', 'Route mapped, driveway parking available', ARRAY[]::text[], NOW() - INTERVAL '3 days'),
  ('qa-resp-005', 'job-001', 'qa-ckl-pre-insp-001', 'qa-item-pre-005', 'user-001', 'completed', 'Clear skies, 45°F, no wind', ARRAY['photo-005'], NOW() - INTERVAL '3 days');

-- Job 002: Sarah Competent - Mostly completed, one skipped
INSERT INTO qa_checklist_responses (id, job_id, checklist_id, item_id, user_id, response, notes, evidence_ids, completed_at)
VALUES
  ('qa-resp-006', 'job-002', 'qa-ckl-pre-insp-001', 'qa-item-pre-001', 'user-002', 'completed', 'Equipment loaded', ARRAY['photo-010'], NOW() - INTERVAL '2 days'),
  ('qa-resp-007', 'job-002', 'qa-ckl-pre-insp-001', 'qa-item-pre-002', 'user-002', 'completed', 'Calibration OK', ARRAY['photo-011'], NOW() - INTERVAL '2 days'),
  ('qa-resp-008', 'job-002', 'qa-ckl-pre-insp-001', 'qa-item-pre-003', 'user-002', 'skipped', 'Unable to reach customer by phone', ARRAY[]::text[], NOW() - INTERVAL '2 days'),
  ('qa-resp-009', 'job-002', 'qa-ckl-pre-insp-001', 'qa-item-pre-004', 'user-002', 'completed', 'Route confirmed', ARRAY[]::text[], NOW() - INTERVAL '2 days');

-- Job 003: Mike Learning - Critical item skipped (causes low score)
INSERT INTO qa_checklist_responses (id, job_id, checklist_id, item_id, user_id, response, notes, evidence_ids, completed_at)
VALUES
  ('qa-resp-010', 'job-003', 'qa-ckl-blower-001', 'qa-item-bd-001', 'user-003', 'completed', 'Equipment calibrated', ARRAY['photo-020'], NOW() - INTERVAL '1 day'),
  ('qa-resp-011', 'job-003', 'qa-ckl-blower-001', 'qa-item-bd-002', 'user-003', 'completed', 'Volume calculated', ARRAY['photo-021'], NOW() - INTERVAL '1 day'),
  ('qa-resp-012', 'job-003', 'qa-ckl-blower-001', 'qa-item-bd-005', 'user-003', 'skipped', 'Only performed 3-point test, ran out of time', ARRAY[]::text[], NOW() - INTERVAL '1 day');

-- Job 005: Bob Rushed - Multiple critical failures
INSERT INTO qa_checklist_responses (id, job_id, checklist_id, item_id, user_id, response, notes, evidence_ids, completed_at)
VALUES
  ('qa-resp-013', 'job-005', 'qa-ckl-blower-001', 'qa-item-bd-001', 'user-005', 'skipped', 'Forgot to photograph calibration sticker', ARRAY[]::text[], NOW() - INTERVAL '4 hours'),
  ('qa-resp-014', 'job-005', 'qa-ckl-blower-001', 'qa-item-bd-002', 'user-005', 'skipped', 'Used rough estimate instead of calculation', ARRAY[]::text[], NOW() - INTERVAL '4 hours'),
  ('qa-resp-015', 'job-005', 'qa-ckl-blower-001', 'qa-item-bd-005', 'user-005', 'skipped', 'Only 2 test points recorded', ARRAY[]::text[], NOW() - INTERVAL '4 hours');

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify checklists created
SELECT 
  'Checklists' as entity,
  COUNT(*) as count
FROM qa_checklists
WHERE id LIKE 'qa-ckl-%'

UNION ALL

-- Verify checklist items created
SELECT 
  'Checklist Items' as entity,
  COUNT(*) as count
FROM qa_checklist_items
WHERE id LIKE 'qa-item-%'

UNION ALL

-- Verify scores created
SELECT 
  'Inspection Scores' as entity,
  COUNT(*) as count
FROM qa_inspection_scores
WHERE id LIKE 'qa-score-%'

UNION ALL

-- Verify responses created
SELECT 
  'Checklist Responses' as entity,
  COUNT(*) as count
FROM qa_checklist_responses
WHERE id LIKE 'qa-resp-%'

UNION ALL

-- Verify performance metrics created
SELECT 
  'Performance Metrics' as entity,
  COUNT(*) as count
FROM qa_performance_metrics
WHERE id LIKE 'qa-perf-%';

-- Summary: Team Performance Statistics
SELECT 
  'Team QA Summary' as metric,
  ROUND(AVG(percentage), 2) as team_avg_score,
  COUNT(*) as total_jobs_scored,
  COUNT(*) FILTER (WHERE review_status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE review_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE review_status = 'needs_improvement') as needs_improvement_count,
  COUNT(*) FILTER (WHERE compliance_score >= 80) as compliant_count,
  ROUND(COUNT(*) FILTER (WHERE compliance_score >= 80)::decimal / COUNT(*)::decimal * 100, 2) as compliance_rate
FROM qa_inspection_scores
WHERE id LIKE 'qa-score-%';

-- Summary: Inspector Rankings
SELECT 
  user_id,
  ROUND(AVG(avg_score), 2) as avg_qa_score,
  SUM(jobs_completed) as total_jobs,
  ROUND(AVG(on_time_rate), 2) as avg_on_time_rate,
  ROUND(AVG(first_pass_rate), 2) as avg_first_pass_rate,
  array_agg(DISTINCT unnested_area) FILTER (WHERE unnested_area IS NOT NULL) as all_strong_areas,
  array_agg(DISTINCT unnested_improvement) FILTER (WHERE unnested_improvement IS NOT NULL) as all_improvement_areas
FROM qa_performance_metrics
CROSS JOIN LATERAL unnest(strong_areas) as unnested_area
CROSS JOIN LATERAL unnest(improvement_areas) as unnested_improvement
WHERE id LIKE 'qa-perf-%'
GROUP BY user_id
ORDER BY avg_qa_score DESC;

-- Summary: Checklist Completion Rates
SELECT 
  c.name as checklist_name,
  c.category,
  COUNT(DISTINCT r.job_id) as jobs_using_checklist,
  COUNT(r.id) as total_responses,
  COUNT(r.id) FILTER (WHERE r.response = 'completed') as completed_count,
  COUNT(r.id) FILTER (WHERE r.response = 'skipped') as skipped_count,
  COUNT(r.id) FILTER (WHERE r.response = 'na') as na_count,
  ROUND(COUNT(r.id) FILTER (WHERE r.response = 'completed')::decimal / COUNT(r.id)::decimal * 100, 2) as completion_rate
FROM qa_checklists c
LEFT JOIN qa_checklist_responses r ON r.checklist_id = c.id
WHERE c.id LIKE 'qa-ckl-%'
GROUP BY c.id, c.name, c.category
ORDER BY c.category, c.name;

-- Summary: Critical Items Compliance
SELECT 
  i.item_text,
  i.category,
  COUNT(r.id) as total_responses,
  COUNT(r.id) FILTER (WHERE r.response = 'completed') as completed_count,
  COUNT(r.id) FILTER (WHERE r.response = 'skipped') as skipped_count,
  ROUND(COUNT(r.id) FILTER (WHERE r.response = 'completed')::decimal / COUNT(r.id)::decimal * 100, 2) as compliance_rate
FROM qa_checklist_items i
LEFT JOIN qa_checklist_responses r ON r.item_id = i.id
WHERE i.is_critical = true AND i.id LIKE 'qa-item-%'
GROUP BY i.id, i.item_text, i.category
ORDER BY compliance_rate ASC, i.category;
