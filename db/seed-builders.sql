-- Builder Hierarchy System - Seed Data
-- Purpose: Realistic builders, contacts, agreements, programs, interactions, developments, lots, abbreviations
-- Scenarios: 12 test cases covering CRM and geographic hierarchy workflows

-- ==============================================
-- SCENARIO 1: Large Production Builder (M/I Homes)
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, address, trade_specialization, rating, total_jobs, volume_tier, billing_terms, preferred_lead_time, abbreviations)
VALUES
  ('builder-001', 'John Smith', 'M/I Homes of Minnesota', 'jsmith@mihomes.com', '612-555-1001', '1000 Corporate Dr, Minneapolis, MN 55401', 'Production Builder', 5, 245, 'high', 'Net 30', 7, ARRAY['MI', 'MIH', 'M/I']);

INSERT INTO builder_contacts (id, builder_id, name, role, email, phone, mobile_phone, is_primary, preferred_contact, notes)
VALUES
  ('contact-001', 'builder-001', 'Mike Johnson', 'superintendent', 'mjohnson@mihomes.com', '612-555-1002', '612-555-1003', true, 'text', 'Primary superintendent for all projects'),
  ('contact-002', 'builder-001', 'Sarah Williams', 'project_manager', 'swilliams@mihomes.com', '612-555-1004', '612-555-1005', false, 'email', 'Manages Oak Ridge and Pine Valley developments'),
  ('contact-003', 'builder-001', 'Tom Davis', 'office_manager', 'tdavis@mihomes.com', '612-555-1006', NULL, false, 'phone', 'Handles scheduling and invoicing');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms, inspection_types_included, notes)
VALUES
  ('agreement-001', 'builder-001', '2025 Annual Pricing Agreement', '2025-01-01', '2025-12-31', 'active', 225.00, 'Net 30', ARRAY['pre_drywall', 'final', 'multifamily'], 'Volume discount: $225 per inspection (standard $250)');

INSERT INTO builder_programs (id, builder_id, program_name, program_type, enrollment_date, expiration_date, status, certification_number, rebate_amount, requires_documentation, notes)
VALUES
  ('program-001', 'builder-001', 'Energy Star v3.2', 'energy_star', '2023-06-01', '2026-06-01', 'active', 'ES-MN-12345', NULL, true, 'All homes certified Energy Star'),
  ('program-002', 'builder-001', 'IRS 45L Tax Credit', 'tax_credit', '2024-01-01', '2026-12-31', 'active', NULL, 2000.00, true, '$2,000 per qualified home');

INSERT INTO builder_interactions (id, builder_id, interaction_type, subject, description, interaction_date, contact_id, outcome, follow_up_required, follow_up_date, created_by)
VALUES
  ('interaction-001', 'builder-001', 'call', 'Q1 2025 Schedule Planning', 'Discussed upcoming homes for January-March. Builder confirmed 15 pre-drywall and 12 final inspections needed.', NOW() - INTERVAL '7 days', 'contact-001', 'Scheduled 27 inspections', true, NOW() + INTERVAL '7 days', 'user-001'),
  ('interaction-002', 'builder-001', 'meeting', 'Quarterly Business Review', 'Reviewed 2024 performance (198 inspections), discussed 2025 goals (250 inspections). Renewed annual agreement.', NOW() - INTERVAL '30 days', 'contact-002', 'Agreement renewed for 2025', false, NULL, 'user-001');

INSERT INTO developments (id, builder_id, name, region, municipality, address, status, total_lots, completed_lots, start_date, target_completion_date)
VALUES
  ('development-001', 'builder-001', 'Oak Ridge Estates', 'Southwest Metro', 'Chaska', 'Oak Ridge Blvd, Chaska, MN 55318', 'active', 50, 28, '2024-06-01', '2026-12-31'),
  ('development-002', 'builder-001', 'Pine Valley', 'Northwest Metro', 'Maple Grove', 'Pine Valley Dr, Maple Grove, MN 55311', 'active', 40, 15, '2024-09-01', '2027-03-31');

INSERT INTO lots (id, development_id, lot_number, phase, block, street_address, status, square_footage)
VALUES
  ('lot-001', 'development-001', '14', 'Phase 2', 'B', '125 Oak Ridge Dr', 'under_construction', 2400),
  ('lot-002', 'development-001', '15', 'Phase 2', 'B', '127 Oak Ridge Dr', 'completed', 2200),
  ('lot-003', 'development-001', '16', 'Phase 2', 'B', '129 Oak Ridge Dr', 'sold', 2600),
  ('lot-004', 'development-002', '1', 'Phase 1', 'A', '100 Pine Valley Dr', 'available', 2800);

INSERT INTO builder_abbreviations (id, builder_id, abbreviation, is_primary)
VALUES
  ('abbr-001', 'builder-001', 'MI', true),
  ('abbr-002', 'builder-001', 'MIH', false),
  ('abbr-003', 'builder-001', 'M/I', false);

-- ==============================================
-- SCENARIO 2: Medium Volume Builder (Pulte Homes)
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier, billing_terms, preferred_lead_time, abbreviations)
VALUES
  ('builder-002', 'Lisa Anderson', 'Pulte Homes', 'landerson@pulte.com', '952-555-2001', 'Production Builder', 4, 128, 'medium', 'Net 15', 5, ARRAY['PULTE', 'PH']);

INSERT INTO builder_contacts (id, builder_id, name, role, email, phone, is_primary, preferred_contact)
VALUES
  ('contact-004', 'builder-002', 'Mark Thompson', 'superintendent', 'mthompson@pulte.com', '952-555-2002', true, 'phone'),
  ('contact-005', 'builder-002', 'Emily Chen', 'estimator', 'echen@pulte.com', '952-555-2003', false, 'email');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms, inspection_types_included)
VALUES
  ('agreement-002', 'builder-002', '2025 Pricing Agreement', '2025-01-01', '2025-12-31', 'active', 240.00, 'Net 15', ARRAY['pre_drywall', 'final']);

INSERT INTO builder_programs (id, builder_id, program_name, program_type, enrollment_date, status, certification_number, requires_documentation)
VALUES
  ('program-003', 'builder-002', 'Xcel Energy Rebate Program', 'utility_rebate', '2024-06-01', 'active', 'XCEL-2024-456', true);

INSERT INTO developments (id, builder_id, name, municipality, status, total_lots, completed_lots, start_date)
VALUES
  ('development-003', 'builder-002', 'Sunset Ridge Townhomes', 'Minnetonka', 'active', 24, 10, '2024-08-01');

INSERT INTO builder_abbreviations (id, builder_id, abbreviation, is_primary)
VALUES
  ('abbr-004', 'builder-002', 'PULTE', true),
  ('abbr-005', 'builder-002', 'PH', false);

-- ==============================================
-- SCENARIO 3: Premium Volume Builder (Lennar)
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier, billing_terms, preferred_lead_time, abbreviations)
VALUES
  ('builder-003', 'David Martinez', 'Lennar Corporation', 'dmartinez@lennar.com', '763-555-3001', 'Production Builder', 5, 320, 'premium', 'Net 45', 10, ARRAY['LENNAR', 'LEN']);

INSERT INTO builder_contacts (id, builder_id, name, role, email, phone, is_primary, preferred_contact)
VALUES
  ('contact-006', 'builder-003', 'Rachel Green', 'project_manager', 'rgreen@lennar.com', '763-555-3002', true, 'email');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms, inspection_types_included)
VALUES
  ('agreement-003', 'builder-003', '2025 Enterprise Agreement', '2025-01-01', '2025-12-31', 'active', 200.00, 'Net 45', ARRAY['pre_drywall', 'final', 'final_special', 'multifamily']);

INSERT INTO developments (id, builder_id, name, region, municipality, status, total_lots, completed_lots, start_date)
VALUES
  ('development-004', 'builder-003', 'Greenview Heights', 'South Metro', 'Lakeville', 'active', 80, 45, '2023-05-01'),
  ('development-005', 'builder-003', 'River Oaks', 'East Metro', 'Woodbury', 'active', 60, 20, '2024-04-01');

INSERT INTO builder_abbreviations (id, builder_id, abbreviation, is_primary)
VALUES
  ('abbr-006', 'builder-003', 'LENNAR', true),
  ('abbr-007', 'builder-003', 'LEN', false);

-- ==============================================
-- SCENARIO 4: Small Custom Builder
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier, billing_terms, preferred_lead_time)
VALUES
  ('builder-004', 'Robert Johnson', 'Johnson Custom Homes', 'robert@johnsoncustom.com', '651-555-4001', 'Custom Homes', 4, 12, 'low', 'Due on completion', 14);

INSERT INTO builder_contacts (id, builder_id, name, role, email, phone, is_primary, preferred_contact)
VALUES
  ('contact-007', 'builder-004', 'Robert Johnson', 'owner', 'robert@johnsoncustom.com', '651-555-4001', true, 'phone');

INSERT INTO developments (id, builder_id, name, municipality, status, total_lots, completed_lots, start_date)
VALUES
  ('development-006', 'builder-004', 'Custom Homes 2025', 'Various', 'active', 12, 3, '2025-01-01');

-- ==============================================
-- SCENARIO 5: Builder with Expired Agreement
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, total_jobs, volume_tier, billing_terms)
VALUES
  ('builder-005', 'Amanda White', 'White Construction', 'amanda@whiteconstruction.com', '952-555-5001', 'General Contractor', 45, 'low', 'Net 30');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms)
VALUES
  ('agreement-004', 'builder-005', '2024 Annual Agreement', '2024-01-01', '2024-12-31', 'expired', 250.00, 'Net 30');

-- ==============================================
-- SCENARIO 6: Builder with Multiple Programs
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier)
VALUES
  ('builder-006', 'Michael Brown', 'Brown Development Group', 'mbrown@browndevelopment.com', '763-555-6001', 'Production Builder', 5, 95, 'medium');

INSERT INTO builder_programs (id, builder_id, program_name, program_type, enrollment_date, status, certification_number)
VALUES
  ('program-004', 'builder-006', 'Energy Star v3.2', 'energy_star', '2024-01-01', 'active', 'ES-MN-789'),
  ('program-005', 'builder-006', 'IRS 45L Tax Credit', 'tax_credit', '2024-01-01', 'active', NULL),
  ('program-006', 'builder-006', 'LEED Certification', 'certification', '2024-06-01', 'active', 'LEED-456'),
  ('program-007', 'builder-006', 'CenterPoint Energy Rebate', 'utility_rebate', '2024-03-01', 'active', 'CP-2024-123');

-- ==============================================
-- SCENARIO 7: Builder with Recent Interactions
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, total_jobs, volume_tier)
VALUES
  ('builder-007', 'Jennifer Lee', 'Lee Construction Services', 'jlee@leeconstruction.com', '612-555-7001', 'General Contractor', 67, 'medium');

INSERT INTO builder_contacts (id, builder_id, name, role, email, phone, is_primary)
VALUES
  ('contact-008', 'builder-007', 'Jennifer Lee', 'owner', 'jlee@leeconstruction.com', '612-555-7001', true);

INSERT INTO builder_interactions (id, builder_id, interaction_type, subject, description, interaction_date, outcome, follow_up_required, follow_up_date, created_by)
VALUES
  ('interaction-003', 'builder-007', 'email', 'Q2 2025 Pricing Discussion', 'Builder inquired about volume discount for Q2. Discussed potential for 20+ homes.', NOW() - INTERVAL '3 days', 'Quoted $230/inspection for 20+ homes', true, NOW() + INTERVAL '7 days', 'user-001'),
  ('interaction-004', 'builder-007', 'site_visit', 'Job Site Visit - 456 Main St', 'Met superintendent on-site to discuss inspection timing for upcoming phase.', NOW() - INTERVAL '10 days', 'Scheduled 8 inspections over next 4 weeks', false, NULL, 'user-001');

-- ==============================================
-- SCENARIO 8: Builder with Large Development
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier)
VALUES
  ('builder-008', 'Christopher Taylor', 'Taylor Homes', 'ctaylor@taylorhomes.com', '952-555-8001', 'Production Builder', 4, 156, 'high');

INSERT INTO developments (id, builder_id, name, region, municipality, status, total_lots, completed_lots, start_date, target_completion_date)
VALUES
  ('development-007', 'builder-008', 'Heritage Oaks', 'West Metro', 'Eden Prairie', 'active', 120, 75, '2023-03-01', '2027-12-31');

INSERT INTO lots (id, development_id, lot_number, phase, street_address, status, square_footage)
VALUES
  ('lot-005', 'development-007', '1', 'Phase 1', '1001 Heritage Dr', 'sold', 2500),
  ('lot-006', 'development-007', '2', 'Phase 1', '1003 Heritage Dr', 'sold', 2400),
  ('lot-007', 'development-007', '76', 'Phase 3', '2001 Heritage Dr', 'under_construction', 2800),
  ('lot-008', 'development-007', '77', 'Phase 3', '2003 Heritage Dr', 'available', 2600);

-- ==============================================
-- SCENARIO 9: Builder with Terminated Agreement
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, total_jobs, volume_tier)
VALUES
  ('builder-009', 'Patricia Miller', 'Miller Construction', 'pmiller@millerconstruction.com', '651-555-9001', 'General Contractor', 23, 'low');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms, notes)
VALUES
  ('agreement-005', 'builder-009', '2024-2025 Agreement', '2024-07-01', '2025-06-30', 'terminated', 260.00, 'Net 15', 'Terminated early due to business closure');

-- ==============================================
-- SCENARIO 10: Builder with Pending Agreement
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, volume_tier)
VALUES
  ('builder-010', 'Kevin Wilson', 'Wilson Builders', 'kwilson@wilsonbuilders.com', '763-555-1000', 'Production Builder', 'medium');

INSERT INTO builder_agreements (id, builder_id, agreement_name, start_date, end_date, status, default_inspection_price, payment_terms)
VALUES
  ('agreement-006', 'builder-010', '2025 Annual Agreement', '2025-02-01', '2026-01-31', 'pending', 235.00, 'Net 30');

-- ==============================================
-- SCENARIO 11: Builder with Completed Development
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, rating, total_jobs, volume_tier)
VALUES
  ('builder-011', 'Nancy Garcia', 'Garcia Development', 'ngarcia@garciadev.com', '952-555-1100', 'Production Builder', 5, 89, 'medium');

INSERT INTO developments (id, builder_id, name, municipality, status, total_lots, completed_lots, start_date, target_completion_date)
VALUES
  ('development-008', 'builder-011', 'Meadowbrook Estates', 'Bloomington', 'completed', 35, 35, '2022-04-01', '2024-11-30');

-- ==============================================
-- SCENARIO 12: Builder with Multiple Abbreviations
-- ==============================================
INSERT INTO builders (id, name, company_name, email, phone, trade_specialization, total_jobs, volume_tier, abbreviations)
VALUES
  ('builder-012', 'Steven Clark', 'DR Horton Minnesota', 'sclark@drhorton.com', '612-555-1200', 'Production Builder', 178, 'high', ARRAY['DRH', 'HORTON', 'DR']);

INSERT INTO builder_abbreviations (id, builder_id, abbreviation, is_primary)
VALUES
  ('abbr-008', 'builder-012', 'DRH', true),
  ('abbr-009', 'builder-012', 'HORTON', false),
  ('abbr-010', 'builder-012', 'DR', false);

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify builders created
SELECT 
  'Builders' as entity,
  COUNT(*) as total_builders,
  COUNT(*) FILTER (WHERE volume_tier = 'low') as low_volume,
  COUNT(*) FILTER (WHERE volume_tier = 'medium') as medium_volume,
  COUNT(*) FILTER (WHERE volume_tier = 'high') as high_volume,
  COUNT(*) FILTER (WHERE volume_tier = 'premium') as premium_volume,
  SUM(total_jobs) as total_jobs_all_builders,
  ROUND(AVG(rating), 2) as avg_rating
FROM builders
WHERE id LIKE 'builder-%';

-- Verify contacts created
SELECT 
  'Builder Contacts' as entity,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE is_primary = true) as primary_contacts,
  COUNT(*) FILTER (WHERE role = 'superintendent') as superintendents,
  COUNT(*) FILTER (WHERE role = 'project_manager') as project_managers,
  COUNT(*) FILTER (WHERE role = 'owner') as owners
FROM builder_contacts
WHERE id LIKE 'contact-%';

-- Verify agreements created
SELECT 
  'Builder Agreements' as entity,
  COUNT(*) as total_agreements,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE status = 'terminated') as terminated,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  ROUND(AVG(default_inspection_price::numeric), 2) as avg_price
FROM builder_agreements
WHERE id LIKE 'agreement-%';

-- Verify programs created
SELECT 
  'Builder Programs' as entity,
  COUNT(*) as total_programs,
  COUNT(*) FILTER (WHERE program_type = 'energy_star') as energy_star,
  COUNT(*) FILTER (WHERE program_type = 'tax_credit') as tax_credit,
  COUNT(*) FILTER (WHERE program_type = 'utility_rebate') as utility_rebate,
  COUNT(*) FILTER (WHERE program_type = 'certification') as certification,
  COUNT(*) FILTER (WHERE status = 'active') as active_programs
FROM builder_programs
WHERE id LIKE 'program-%';

-- Verify interactions created
SELECT 
  'Builder Interactions' as entity,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE interaction_type = 'call') as calls,
  COUNT(*) FILTER (WHERE interaction_type = 'email') as emails,
  COUNT(*) FILTER (WHERE interaction_type = 'meeting') as meetings,
  COUNT(*) FILTER (WHERE interaction_type = 'site_visit') as site_visits,
  COUNT(*) FILTER (WHERE follow_up_required = true) as follow_ups_required
FROM builder_interactions
WHERE id LIKE 'interaction-%';

-- Verify developments created
SELECT 
  'Developments' as entity,
  COUNT(*) as total_developments,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  SUM(total_lots) as total_lots_all_developments,
  SUM(completed_lots) as total_completed_lots
FROM developments
WHERE id LIKE 'development-%';

-- Verify lots created
SELECT 
  'Lots' as entity,
  COUNT(*) as total_lots,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE status = 'under_construction') as under_construction,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'sold') as sold
FROM lots
WHERE id LIKE 'lot-%';

-- Verify abbreviations created
SELECT 
  'Builder Abbreviations' as entity,
  COUNT(*) as total_abbreviations,
  COUNT(*) FILTER (WHERE is_primary = true) as primary_abbreviations,
  COUNT(DISTINCT builder_id) as builders_with_abbreviations
FROM builder_abbreviations
WHERE id LIKE 'abbr-%';

-- Builder Volume Tier Analysis
SELECT 
  volume_tier,
  COUNT(*) as builder_count,
  SUM(total_jobs) as total_jobs,
  ROUND(AVG(total_jobs), 2) as avg_jobs_per_builder,
  ROUND(AVG(rating), 2) as avg_rating
FROM builders
WHERE id LIKE 'builder-%'
GROUP BY volume_tier
ORDER BY 
  CASE volume_tier
    WHEN 'premium' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- Agreement Status Summary
SELECT 
  status,
  COUNT(*) as agreement_count,
  ROUND(AVG(default_inspection_price::numeric), 2) as avg_price
FROM builder_agreements
WHERE id LIKE 'agreement-%'
GROUP BY status
ORDER BY agreement_count DESC;

-- Program Type Summary
SELECT 
  program_type,
  COUNT(*) as program_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM builder_programs
WHERE id LIKE 'program-%'
GROUP BY program_type
ORDER BY program_count DESC;

-- Development Progress
SELECT 
  d.name as development_name,
  b.company_name as builder,
  d.total_lots,
  d.completed_lots,
  ROUND((d.completed_lots::decimal / NULLIF(d.total_lots, 0) * 100), 2) as completion_percentage,
  d.status
FROM developments d
JOIN builders b ON d.builder_id = b.id
WHERE d.id LIKE 'development-%'
ORDER BY completion_percentage DESC;
