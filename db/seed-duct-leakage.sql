-- Duct Leakage Testing - Seed Data
-- Production-ready test scenarios for Minnesota 2020 Energy Code compliance
-- Demonstrates pass/fail conditions for both TDL and DLO testing

-- Prerequisites: Requires existing jobs in the database
-- These seed tests are linked to job IDs that should exist in your system

-- ============================================================================
-- Test Scenario 1: Excellent Airtightness (Both Pass with Margin)
-- TDL: 2.86 CFM25/100 sq ft (Well under 4.0 limit)
-- DLO: 1.90 CFM25/100 sq ft (Well under 3.0 limit)
-- Result: PASS - Exceptional duct system
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  equipment_calibration_date,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  -- Total Duct Leakage (TDL)
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  -- Duct Leakage to Outside (DLO)
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  -- Pressure Pan Testing
  pressure_pan_readings,
  -- Minnesota Code Compliance
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  -- Additional
  notes,
  recommendations,
  created_at
) 
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '10 days',
  '09:30',
  'both',
  'DB-2024-1001',
  CURRENT_DATE - INTERVAL '90 days',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 60 CFM25 → 2.86 CFM25/100 sq ft
  15.5,
  'Ring 1',
  60.00,
  2.86,
  4.29,
  -- DLO: 40 CFM25 → 1.90 CFM25/100 sq ft
  -25.00,
  10.2,
  'Ring 1',
  40.00,
  1.90,
  2.86,
  -- Pressure pan - all registers pass
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 0.3, "passFail": "pass"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 0.5, "passFail": "pass"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 0.4, "passFail": "pass"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 0.6, "passFail": "pass"},
    {"location": "Hallway Return", "supplyReturn": "return", "reading": 0.8, "passFail": "pass"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Excellent duct system - new construction by premium builder. All boots properly sealed, ducts well-connected. No visible issues in attic or basement.',
  'No remediation needed - system exceeds Minnesota code requirements',
  CURRENT_TIMESTAMP - INTERVAL '10 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1;

-- ============================================================================
-- Test Scenario 2: Good Performance (Both Pass)
-- TDL: 3.57 CFM25/100 sq ft (Under 4.0 limit)
-- DLO: 2.43 CFM25/100 sq ft (Under 3.0 limit)
-- Result: PASS - Good duct system
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  equipment_calibration_date,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '8 days',
  '10:45',
  'both',
  'DB-2024-1001',
  CURRENT_DATE - INTERVAL '90 days',
  'heat_pump',
  1,
  2100.00,
  1400.00,
  -- TDL: 75 CFM25 → 3.57 CFM25/100 sq ft
  19.8,
  'Ring 1',
  75.00,
  3.57,
  5.36,
  -- DLO: 51 CFM25 → 2.43 CFM25/100 sq ft
  -25.00,
  13.8,
  'Ring 1',
  51.00,
  2.43,
  3.64,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 0.7, "passFail": "pass"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 0.9, "passFail": "pass"},
    {"location": "Bedroom 3", "supplyReturn": "supply", "reading": 1.8, "passFail": "marginal"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 0.5, "passFail": "pass"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 0.6, "passFail": "pass"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Good duct system. Bedroom 3 shows minor leakage (1.8 Pa) but still within acceptable range. Heat pump installation by experienced contractor.',
  'Monitor Bedroom 3 register - may want to seal boot connection as preventive maintenance',
  CURRENT_TIMESTAMP - INTERVAL '8 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 1;

-- ============================================================================
-- Test Scenario 3: Marginal TDL Pass (Exactly at 4.0 limit)
-- TDL: 4.00 CFM25/100 sq ft (Exactly at limit - passes by a hair)
-- DLO: 2.10 CFM25/100 sq ft (Good - under 3.0 limit)
-- Result: PASS - But barely
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '6 days',
  '13:15',
  'both',
  'DB-2024-1002',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 84 CFM25 → 4.00 CFM25/100 sq ft (EXACTLY at limit)
  22.5,
  'Ring 1',
  84.00,
  4.00,
  6.00,
  -- DLO: 44 CFM25 → 2.10 CFM25/100 sq ft
  -25.00,
  11.5,
  'Ring 1',
  44.00,
  2.10,
  3.14,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 1.2, "passFail": "marginal"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 2.8, "passFail": "marginal"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 0.9, "passFail": "pass"},
    {"location": "Return Grille", "supplyReturn": "return", "reading": 2.5, "passFail": "marginal"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Marginal pass - TDL exactly at code limit (4.00 CFM25/100 sq ft). Multiple registers show marginal leakage. Consider sealing as preventive measure.',
  'Recommended: Seal Master BR and Bedroom 2 boots, seal return grille to prevent future failures during remediation or modifications',
  CURRENT_TIMESTAMP - INTERVAL '6 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 2;

-- ============================================================================
-- Test Scenario 4: Marginal DLO Pass (Exactly at 3.0 limit)
-- TDL: 3.33 CFM25/100 sq ft (Good - under 4.0 limit)
-- DLO: 3.00 CFM25/100 sq ft (Exactly at limit - passes by a hair)
-- Result: PASS - But barely on DLO
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '4 days',
  '14:30',
  'both',
  'DB-2024-1002',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 70 CFM25 → 3.33 CFM25/100 sq ft
  18.2,
  'Ring 1',
  70.00,
  3.33,
  5.00,
  -- DLO: 63 CFM25 → 3.00 CFM25/100 sq ft (EXACTLY at limit)
  -25.00,
  16.8,
  'Ring 1',
  63.00,
  3.00,
  4.50,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 2.9, "passFail": "marginal"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 2.7, "passFail": "marginal"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 3.1, "passFail": "fail"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 0.8, "passFail": "pass"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Marginal pass - DLO exactly at code limit (3.00 CFM25/100 sq ft). Living room register shows significant leakage (3.1 Pa) to unconditioned attic. System barely passes.',
  'Critical: Seal living room supply boot in attic to prevent future failures. Even minor degradation will cause code failure.',
  CURRENT_TIMESTAMP - INTERVAL '4 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 3;

-- ============================================================================
-- Test Scenario 5: TDL Fail, DLO Pass
-- TDL: 8.00 CFM25/100 sq ft (FAIL - exceeds 4.0 limit)
-- DLO: 2.00 CFM25/100 sq ft (PASS - under 3.0 limit)
-- Result: FAIL - Leakage within conditioned space
-- Interpretation: Leaky return air system or supply boots within conditioned space
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '3 days',
  '10:00',
  'both',
  'DB-2024-1003',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 168 CFM25 → 8.00 CFM25/100 sq ft (FAIL)
  42.5,
  'Ring 1',
  168.00,
  8.00,
  12.00,
  -- DLO: 42 CFM25 → 2.00 CFM25/100 sq ft (PASS)
  -25.00,
  10.2,
  'Ring 1',
  42.00,
  2.00,
  3.00,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 0.5, "passFail": "pass"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 0.7, "passFail": "pass"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 0.6, "passFail": "pass"},
    {"location": "Return Grille", "supplyReturn": "return", "reading": 8.5, "passFail": "fail"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  false,
  true,
  'FAILED - TDL exceeds code limit (8.00 vs 4.00). DLO passes (2.00 vs 3.0). Leakage is primarily within conditioned space. Return grille shows severe leakage (8.5 Pa) - likely panned return using building cavity.',
  'REQUIRED: Seal return air system - replace panned return with proper return duct or seal building cavity. Estimated cost: $400-$800. Retest required after remediation.',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 4;

-- ============================================================================
-- Test Scenario 6: TDL Pass, DLO Fail
-- TDL: 4.00 CFM25/100 sq ft (PASS - at limit)
-- DLO: 4.00 CFM25/100 sq ft (FAIL - exceeds 3.0 limit)
-- Result: FAIL - All leakage to unconditioned spaces
-- Interpretation: All ductwork leakage is to attic/outside
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '2 days',
  '11:30',
  'both',
  'DB-2024-1003',
  'heat_pump',
  1,
  2100.00,
  1400.00,
  -- TDL: 84 CFM25 → 4.00 CFM25/100 sq ft (PASS)
  22.5,
  'Ring 1',
  84.00,
  4.00,
  6.00,
  -- DLO: 84 CFM25 → 4.00 CFM25/100 sq ft (FAIL - all leakage to outside!)
  -25.00,
  22.5,
  'Ring 1',
  84.00,
  4.00,
  6.00,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 5.2, "passFail": "fail"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 4.8, "passFail": "fail"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 6.5, "passFail": "fail"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 0.8, "passFail": "pass"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  false,
  'FAILED - DLO exceeds code limit (4.00 vs 3.00). TDL at exact limit (4.00). TDL = DLO indicates ALL duct leakage is to unconditioned spaces (attic). Master BR, Bedroom 2, and Living Room all show high pressure pan readings - likely disconnected flex ducts in attic.',
  'REQUIRED: Inspect all second-floor supply registers in attic. Reconnect flex ducts and seal with mastic. Typical Minneapolis issue with flex duct pulling off collars. Estimated cost: $600-$1,000. Retest required.',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 5;

-- ============================================================================
-- Test Scenario 7: Both Fail (Moderate)
-- TDL: 6.19 CFM25/100 sq ft (FAIL - exceeds 4.0 limit)
-- DLO: 4.52 CFM25/100 sq ft (FAIL - exceeds 3.0 limit)
-- Result: FAIL - Comprehensive sealing needed
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '1 day',
  '09:15',
  'both',
  'DB-2024-1004',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 130 CFM25 → 6.19 CFM25/100 sq ft (FAIL)
  32.8,
  'Ring 1',
  130.00,
  6.19,
  9.29,
  -- DLO: 95 CFM25 → 4.52 CFM25/100 sq ft (FAIL)
  -25.00,
  25.2,
  'Ring 1',
  95.00,
  4.52,
  6.79,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 3.5, "passFail": "fail"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 4.2, "passFail": "fail"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 2.8, "passFail": "marginal"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 3.8, "passFail": "fail"},
    {"location": "Return Grille", "supplyReturn": "return", "reading": 5.5, "passFail": "fail"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  false,
  false,
  'FAILED - Both TDL (6.19 vs 4.00) and DLO (4.52 vs 3.00) exceed code limits. Multiple locations show significant leakage. Combination of attic supply issues and return system problems. Builder quality control issue.',
  'REQUIRED: Comprehensive duct sealing project. 1) Reconnect/seal all attic supplies (Master BR, BR2, Kitchen). 2) Seal return grille and inspect return system. 3) Seal all trunk line joints. Estimated cost: $1,200-$1,800. 2-3 days work. Retest required.',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 6;

-- ============================================================================
-- Test Scenario 8: Both Fail (Severe)
-- TDL: 12.00 CFM25/100 sq ft (FAIL - severe)
-- DLO: 8.00 CFM25/100 sq ft (FAIL - severe)
-- Result: FAIL - Major duct system issues
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE,
  '08:00',
  'both',
  'DB-2024-1004',
  'forced_air',
  1,
  2100.00,
  1400.00,
  -- TDL: 252 CFM25 → 12.00 CFM25/100 sq ft (SEVERE FAIL)
  55.0,
  'Ring 1',
  252.00,
  12.00,
  18.00,
  -- DLO: 168 CFM25 → 8.00 CFM25/100 sq ft (SEVERE FAIL)
  -25.00,
  42.5,
  'Ring 1',
  168.00,
  8.00,
  12.00,
  '[
    {"location": "Master Bedroom", "supplyReturn": "supply", "reading": 12.5, "passFail": "fail"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 10.8, "passFail": "fail"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 9.2, "passFail": "fail"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 11.0, "passFail": "fail"},
    {"location": "Return Grille", "supplyReturn": "return", "reading": 15.0, "passFail": "fail"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  false,
  false,
  'SEVERE FAILURE - TDL (12.00 vs 4.00) is 3X over limit. DLO (8.00 vs 3.00) is 2.7X over limit. All registers show severe pressure pan failures (>9 Pa). Major disconnections throughout system. Possible trunk line separation or multiple disconnected flex ducts.',
  'CRITICAL: Full duct system inspection required. Likely major issues: 1) Trunk line disconnect from furnace/air handler. 2) Multiple disconnected flex ducts. 3) Unsealed return system. Consider Aeroseal duct sealing technology. Estimated cost: $2,500-$4,000. Builder must address immediately. Retest required.',
  CURRENT_TIMESTAMP
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 7;

-- ============================================================================
-- Test Scenario 9: Small Home - Excellent Performance
-- Area: 1,200 sq ft (smaller home)
-- TDL: 2.50 CFM25/100 sq ft (PASS)
-- DLO: 1.67 CFM25/100 sq ft (PASS)
-- Result: PASS - Excellent for small home
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '5 days',
  '15:00',
  'both',
  'DB-2024-1001',
  'heat_pump',
  1,
  1200.00,  -- Smaller home
  800.00,   -- Smaller system
  -- TDL: 30 CFM25 → 2.50 CFM25/100 sq ft
  8.5,
  'Ring 2',
  30.00,
  2.50,
  3.75,
  -- DLO: 20 CFM25 → 1.67 CFM25/100 sq ft
  -25.00,
  5.8,
  'Ring 2',
  20.00,
  1.67,
  2.50,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Small home (1,200 sq ft) with excellent duct performance. Single-story ranch with all ductwork in basement (conditioned space). Easier to achieve tight ducts with shorter runs.',
  'No remediation needed - system significantly exceeds Minnesota code requirements',
  CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 8;

-- ============================================================================
-- Test Scenario 10: Large Home - Good Performance
-- Area: 4,000 sq ft (larger home)
-- TDL: 3.75 CFM25/100 sq ft (PASS)
-- DLO: 2.75 CFM25/100 sq ft (PASS)
-- Result: PASS - Good for large home
-- ============================================================================

INSERT INTO duct_leakage_tests (
  id,
  job_id,
  test_date,
  test_time,
  test_type,
  equipment_serial,
  system_type,
  number_of_systems,
  conditioned_area,
  system_airflow,
  total_fan_pressure,
  total_ring_configuration,
  cfm25_total,
  total_cfm_per_sqft,
  total_percent_of_flow,
  outside_house_pressure,
  outside_fan_pressure,
  outside_ring_configuration,
  cfm25_outside,
  outside_cfm_per_sqft,
  outside_percent_of_flow,
  pressure_pan_readings,
  code_year,
  total_duct_leakage_limit,
  outside_leakage_limit,
  meets_code_tdl,
  meets_code_dlo,
  notes,
  recommendations,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '7 days',
  '11:00',
  'both',
  'DB-2024-1005',
  'forced_air',
  2,  -- Two-zone system
  4000.00,  -- Large home
  2400.00,  -- Larger system
  -- TDL: 150 CFM25 → 3.75 CFM25/100 sq ft
  38.0,
  'Ring 1',
  150.00,
  3.75,
  6.25,
  -- DLO: 110 CFM25 → 2.75 CFM25/100 sq ft
  -25.00,
  29.5,
  'Ring 1',
  110.00,
  2.75,
  4.58,
  '[
    {"location": "Master Suite", "supplyReturn": "supply", "reading": 0.9, "passFail": "pass"},
    {"location": "Bedroom 2", "supplyReturn": "supply", "reading": 1.1, "passFail": "marginal"},
    {"location": "Bedroom 3", "supplyReturn": "supply", "reading": 0.7, "passFail": "pass"},
    {"location": "Bedroom 4", "supplyReturn": "supply", "reading": 1.8, "passFail": "marginal"},
    {"location": "Living Room", "supplyReturn": "supply", "reading": 0.5, "passFail": "pass"},
    {"location": "Kitchen", "supplyReturn": "supply", "reading": 0.6, "passFail": "pass"},
    {"location": "Main Return", "supplyReturn": "return", "reading": 1.5, "passFail": "marginal"},
    {"location": "Upstairs Return", "supplyReturn": "return", "reading": 1.2, "passFail": "marginal"}
  ]'::jsonb,
  '2020',
  4.00,
  3.00,
  true,
  true,
  'Large home (4,000 sq ft) with two-zone HVAC system. Good overall duct performance given system size. Longer duct runs make perfect sealing more challenging but system meets code requirements. Several registers show marginal readings but acceptable.',
  'No immediate remediation required. Consider preventive sealing of marginal locations (BR2, BR4, returns) during future maintenance to improve system longevity.',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1
OFFSET 9;

-- Summary Query: View all seeded tests with compliance status
-- Run this to verify seed data loaded correctly
/*
SELECT 
  id,
  test_date,
  test_type,
  system_type,
  conditioned_area,
  cfm25_total,
  total_cfm_per_sqft,
  CASE WHEN meets_code_tdl THEN 'PASS' ELSE 'FAIL' END AS tdl_status,
  cfm25_outside,
  outside_cfm_per_sqft,
  CASE WHEN meets_code_dlo THEN 'PASS' ELSE 'FAIL' END AS dlo_status,
  LEFT(notes, 80) AS notes_preview
FROM duct_leakage_tests
WHERE equipment_serial LIKE 'DB-2024-%'
ORDER BY test_date DESC;
*/
