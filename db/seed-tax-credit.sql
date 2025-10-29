-- Tax Credit 45L System - Seed Data
-- Purpose: Realistic 45L projects, units, requirements, documents
-- Scenarios: 10 test cases covering multi-unit certification workflows

-- ==============================================
-- SCENARIO 1: Single-Family Development (Pending)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-001', 'builder-001', 'Maple Ridge Phase 2', 'single_family', 50, 0, 0, 2025, 'pending', 'REM/Rate v16', 'user-001', NOW() - INTERVAL '30 days');

INSERT INTO tax_credit_requirements (id, project_id, requirement_type, description, status, created_at)
VALUES
  ('tax-req-001', 'tax-proj-001', 'envelope', 'R-49 attic, R-21 walls, R-30 basement insulation', 'pending', NOW() - INTERVAL '30 days'),
  ('tax-req-002', 'tax-proj-001', 'hvac', '96% AFUE furnace, SEER 16 AC minimum', 'pending', NOW() - INTERVAL '30 days'),
  ('tax-req-003', 'tax-proj-001', 'air_sealing', 'Blower door test ACH50 ≤3.0 per Minnesota 2020 Energy Code', 'pending', NOW() - INTERVAL '30 days'),
  ('tax-req-004', 'tax-proj-001', 'duct_sealing', 'Total duct leakage ≤4.0 CFM25/100 sq ft', 'pending', NOW() - INTERVAL '30 days');

-- ==============================================
-- SCENARIO 2: Multifamily Project (Certified)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, certification_date, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-002', 'builder-002', 'Oak Hill Apartments', 'multifamily', 24, 24, 48000.00, NOW() - INTERVAL '10 days', 2025, 'certified', 'EnergyGauge USA', 'user-001', NOW() - INTERVAL '90 days');

INSERT INTO tax_credit_requirements (id, project_id, requirement_type, description, status, completed_date, notes, created_at)
VALUES
  ('tax-req-005', 'tax-proj-002', 'envelope', 'R-49 attic, R-21 walls, Low-E windows (U≤0.30)', 'completed', NOW() - INTERVAL '15 days', 'All specs verified', NOW() - INTERVAL '90 days'),
  ('tax-req-006', 'tax-proj-002', 'hvac', '96% AFUE, SEER 16', 'completed', NOW() - INTERVAL '15 days', '24/24 units compliant', NOW() - INTERVAL '90 days'),
  ('tax-req-007', 'tax-proj-002', 'air_sealing', 'ACH50 ≤3.0', 'completed', NOW() - INTERVAL '12 days', 'All units tested 1.8-2.5 ACH50', NOW() - INTERVAL '90 days'),
  ('tax-req-008', 'tax-proj-002', 'duct_sealing', 'CFM25 ≤4.0', 'completed', NOW() - INTERVAL '12 days', 'All units tested 2.1-3.8 CFM25', NOW() - INTERVAL '90 days');

INSERT INTO unit_certifications (id, project_id, unit_address, unit_number, heating_load, cooling_load, annual_energy_use, percent_savings, blower_door_ach50, duct_leakage_cfm25, hers_index, qualified, certification_date, created_at)
VALUES
  ('tax-unit-001', 'tax-proj-002', '100 Oak Hill Dr, Unit 101', '101', 32000, 24000, 22000, 15.5, 2.1, 2.8, 64, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '60 days'),
  ('tax-unit-002', 'tax-proj-002', '100 Oak Hill Dr, Unit 102', '102', 32000, 24000, 21800, 16.2, 1.9, 3.1, 62, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '60 days'),
  ('tax-unit-003', 'tax-proj-002', '100 Oak Hill Dr, Unit 103', '103', 32000, 24000, 22200, 14.8, 2.3, 2.5, 66, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '60 days'),
  ('tax-unit-004', 'tax-proj-002', '100 Oak Hill Dr, Unit 201', '201', 32000, 24000, 21500, 17.0, 2.0, 3.4, 61, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '58 days');

INSERT INTO tax_credit_documents (id, project_id, document_type, file_name, file_url, upload_date, status, uploaded_by)
VALUES
  ('tax-doc-001', 'tax-proj-002', 'energy_model', 'oak_hill_energy_gauge.pdf', 'https://storage.googleapis.com/tax-docs/oak_hill_energy_gauge.pdf', NOW() - INTERVAL '75 days', 'active', 'user-001'),
  ('tax-doc-002', 'tax-proj-002', 'blower_door_test', 'oak_hill_blower_door_results.pdf', 'https://storage.googleapis.com/tax-docs/oak_hill_blower_door.pdf', NOW() - INTERVAL '12 days', 'active', 'user-001'),
  ('tax-doc-003', 'tax-proj-002', 'form_8909', 'oak_hill_form_8909_2025.pdf', 'https://storage.googleapis.com/tax-docs/oak_hill_8909.pdf', NOW() - INTERVAL '10 days', 'active', 'user-001');

-- ==============================================
-- SCENARIO 3: Zero Energy Ready Project ($5k/unit)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, reference_home, qualified_home, created_by, created_at)
VALUES
  ('tax-proj-003', 'builder-003', 'Greenview Estates', 'single_family', 12, 12, 60000.00, 2025, 'certified',
   'REM/Rate v16',
   jsonb_build_object('heatingBTU', 48000, 'coolingBTU', 36000, 'annualEnergy', 28500),
   jsonb_build_object('heatingBTU', 20000, 'coolingBTU', 18000, 'annualEnergy', 13800, 'percentSavings', 51.6),
   'user-001', NOW() - INTERVAL '120 days');

INSERT INTO tax_credit_requirements (id, project_id, requirement_type, description, status, completed_date, created_at)
VALUES
  ('tax-req-009', 'tax-proj-003', 'envelope', 'R-60 attic, R-27 walls (50%+ energy savings required)', 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '120 days'),
  ('tax-req-010', 'tax-proj-003', 'hvac', 'Heat pump HSPF 10, SEER 18', 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '120 days'),
  ('tax-req-011', 'tax-proj-003', 'air_sealing', 'ACH50 ≤3.0 (Zero Energy Ready target ≤2.0)', 'completed', NOW() - INTERVAL '18 days', NOW() - INTERVAL '120 days');

INSERT INTO unit_certifications (id, project_id, unit_address, percent_savings, blower_door_ach50, duct_leakage_cfm25, hers_index, qualified, certification_date, created_at)
VALUES
  ('tax-unit-005', 'tax-proj-003', '500 Greenview Ln, Lot 1', 52.1, 1.5, 2.1, 42, true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '80 days'),
  ('tax-unit-006', 'tax-proj-003', '502 Greenview Ln, Lot 2', 51.8, 1.7, 2.3, 43, true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '78 days');

-- ==============================================
-- SCENARIO 4: Partial Qualification (2 Units Failed)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-004', 'builder-001', 'Pine Valley Subdivision', 'single_family', 30, 28, 56000.00, 2025, 'certified', 'REM/Rate v16', 'user-001', NOW() - INTERVAL '45 days');

INSERT INTO unit_certifications (id, project_id, unit_address, blower_door_ach50, duct_leakage_cfm25, qualified, notes, created_at)
VALUES
  ('tax-unit-007', 'tax-proj-004', '1000 Pine Valley Dr, Lot 1', 2.2, 3.1, true, 'Passed', NOW() - INTERVAL '40 days'),
  ('tax-unit-008', 'tax-proj-004', '1002 Pine Valley Dr, Lot 2', 3.5, 4.8, false, 'Failed duct leakage test (>4.0)', NOW() - INTERVAL '40 days'),
  ('tax-unit-009', 'tax-proj-004', '1004 Pine Valley Dr, Lot 3', 2.8, 3.4, true, 'Passed', NOW() - INTERVAL '39 days'),
  ('tax-unit-010', 'tax-proj-004', '1006 Pine Valley Dr, Lot 4', 3.8, 3.2, false, 'Failed blower door test (>3.0)', NOW() - INTERVAL '39 days');

-- ==============================================
-- SCENARIO 5: Large Multifamily (100 Units)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-005', 'builder-004', 'Riverside Towers', 'multifamily', 100, 98, 196000.00, 2025, 'certified', 'EnergyGauge USA', 'user-001', NOW() - INTERVAL '180 days');

INSERT INTO unit_certifications (id, project_id, unit_address, unit_number, blower_door_ach50, duct_leakage_cfm25, percent_savings, qualified, created_at)
VALUES
  ('tax-unit-011', 'tax-proj-005', '1 Riverside Ave, Tower A', '101', 2.1, 2.9, 12.5, true, NOW() - INTERVAL '150 days'),
  ('tax-unit-012', 'tax-proj-005', '1 Riverside Ave, Tower A', '102', 2.3, 3.2, 13.1, true, NOW() - INTERVAL '150 days'),
  ('tax-unit-013', 'tax-proj-005', '1 Riverside Ave, Tower A', '103', 3.4, 4.1, 10.2, false, NOW() - INTERVAL '150 days');

-- ==============================================
-- SCENARIO 6: Manufactured Housing
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-006', 'builder-005', 'Prairie Meadows Mobile Home Community', 'manufactured', 18, 18, 36000.00, 2025, 'certified', 'REScheck', 'user-001', NOW() - INTERVAL '60 days');

-- ==============================================
-- SCENARIO 7: Claimed Project (Tax Filed)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, certification_date, tax_year, status, created_by, created_at)
VALUES
  ('tax-proj-007', 'builder-002', 'Sunset Ridge Townhomes', 'single_family', 16, 16, 32000.00, NOW() - INTERVAL '120 days', 2024, 'claimed', 'user-001', NOW() - INTERVAL '200 days');

INSERT INTO tax_credit_documents (id, project_id, document_type, file_name, file_url, status, uploaded_by, upload_date)
VALUES
  ('tax-doc-004', 'tax-proj-007', 'form_8909', 'sunset_ridge_8909_2024.pdf', 'https://storage.googleapis.com/tax-docs/sunset_ridge_8909.pdf', 'active', 'user-001', NOW() - INTERVAL '120 days'),
  ('tax-doc-005', 'tax-proj-007', 'certification_letter', 'sunset_ridge_45L_cert.pdf', 'https://storage.googleapis.com/tax-docs/sunset_ridge_cert.pdf', 'active', 'user-001', NOW() - INTERVAL '120 days');

-- ==============================================
-- SCENARIO 8: Denied Project
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, created_by, created_at)
VALUES
  ('tax-proj-008', 'builder-001', 'Willow Creek Phase 1', 'single_family', 25, 0, 0, 2025, 'denied', 'user-001', NOW() - INTERVAL '15 days');

INSERT INTO tax_credit_requirements (id, project_id, requirement_type, description, status, notes, created_at)
VALUES
  ('tax-req-012', 'tax-proj-008', 'air_sealing', 'ACH50 ≤3.0', 'failed', 'Only 12/25 units passed blower door test', NOW() - INTERVAL '15 days');

-- ==============================================
-- SCENARIO 9: In-Progress Project
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, tax_year, status, software_tool, created_by, created_at)
VALUES
  ('tax-proj-009', 'builder-003', 'Lakeview Hills', 'single_family', 40, 15, 30000.00, 2025, 'pending', 'REM/Rate v16', 'user-001', NOW() - INTERVAL '20 days');

INSERT INTO unit_certifications (id, project_id, unit_address, blower_door_ach50, duct_leakage_cfm25, qualified, created_at)
VALUES
  ('tax-unit-014', 'tax-proj-009', '100 Lakeview Dr, Lot 1', 2.0, 2.8, true, NOW() - INTERVAL '15 days'),
  ('tax-unit-015', 'tax-proj-009', '102 Lakeview Dr, Lot 2', 2.4, 3.1, true, NOW() - INTERVAL '14 days'),
  ('tax-unit-016', 'tax-proj-009', '104 Lakeview Dr, Lot 3', 2.2, 3.5, true, NOW() - INTERVAL '13 days');

-- ==============================================
-- SCENARIO 10: 2024 Tax Year (Previous Year)
-- ==============================================
INSERT INTO tax_credit_projects (id, builder_id, project_name, project_type, total_units, qualified_units, credit_amount, certification_date, tax_year, status, created_by, created_at)
VALUES
  ('tax-proj-010', 'builder-002', 'Heritage Oaks', 'single_family', 8, 8, 16000.00, NOW() - INTERVAL '200 days', 2024, 'claimed', 'user-001', NOW() - INTERVAL '250 days');

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify projects created
SELECT 
  'Tax Credit Projects' as entity,
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'certified') as certified,
  COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
  COUNT(*) FILTER (WHERE status = 'denied') as denied,
  SUM(total_units) as total_units_all_projects,
  SUM(qualified_units) as total_qualified_units,
  SUM(credit_amount) as total_credit_amount
FROM tax_credit_projects
WHERE id LIKE 'tax-proj-%';

-- Verify units created
SELECT 
  'Unit Certifications' as entity,
  COUNT(*) as total_units,
  COUNT(*) FILTER (WHERE qualified = true) as qualified_units,
  COUNT(*) FILTER (WHERE qualified = false) as failed_units,
  AVG(blower_door_ach50) as avg_ach50,
  AVG(duct_leakage_cfm25) as avg_cfm25,
  AVG(percent_savings) as avg_energy_savings
FROM unit_certifications
WHERE id LIKE 'tax-unit-%';

-- Verify requirements created
SELECT 
  'Requirements' as entity,
  COUNT(*) as total_requirements,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM tax_credit_requirements
WHERE id LIKE 'tax-req-%';

-- Verify documents created
SELECT 
  'Documents' as entity,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE document_type = 'form_8909') as form_8909_count,
  COUNT(*) FILTER (WHERE document_type = 'energy_model') as energy_model_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_documents
FROM tax_credit_documents
WHERE id LIKE 'tax-doc-%';

-- Project Summary by Type
SELECT 
  project_type,
  COUNT(*) as project_count,
  SUM(total_units) as total_units,
  SUM(qualified_units) as qualified_units,
  SUM(credit_amount) as total_credit,
  ROUND(AVG(qualified_units::decimal / NULLIF(total_units, 0) * 100), 2) as avg_qualification_rate
FROM tax_credit_projects
WHERE id LIKE 'tax-proj-%'
GROUP BY project_type
ORDER BY total_credit DESC;

-- Project Summary by Tax Year
SELECT 
  tax_year,
  COUNT(*) as project_count,
  SUM(qualified_units) as qualified_units,
  SUM(credit_amount) as total_credit
FROM tax_credit_projects
WHERE id LIKE 'tax-proj-%'
GROUP BY tax_year
ORDER BY tax_year DESC;

-- Requirements Status Summary
SELECT 
  requirement_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM tax_credit_requirements
WHERE id LIKE 'tax-req-%'
GROUP BY requirement_type
ORDER BY total DESC;

-- Unit Qualification Pass/Fail Analysis
SELECT 
  CASE 
    WHEN blower_door_ach50 <= 3.0 THEN 'ACH50 Pass (≤3.0)'
    ELSE 'ACH50 Fail (>3.0)'
  END as air_sealing_status,
  CASE 
    WHEN duct_leakage_cfm25 <= 4.0 THEN 'CFM25 Pass (≤4.0)'
    ELSE 'CFM25 Fail (>4.0)'
  END as duct_status,
  COUNT(*) as unit_count,
  COUNT(*) FILTER (WHERE qualified = true) as qualified_count
FROM unit_certifications
WHERE id LIKE 'tax-unit-%' AND blower_door_ach50 IS NOT NULL AND duct_leakage_cfm25 IS NOT NULL
GROUP BY air_sealing_status, duct_status
ORDER BY air_sealing_status, duct_status;
