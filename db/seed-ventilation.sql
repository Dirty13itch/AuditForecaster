-- Ventilation Testing - Seed Data
-- Production-ready test scenarios for ASHRAE 62.2 and Minnesota 2020 Energy Code compliance
-- Demonstrates pass/fail conditions for whole-house ventilation, kitchen exhaust, and bathroom exhaust

-- Prerequisites: Requires existing jobs in the database
-- These seed tests are linked to job IDs that should exist in your system

-- ============================================================================
-- Test Scenario 1: Fully Compliant System (ALL PASS)
-- House: 1800 sq ft, 3 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 1800 + 7.5 × (3+1) = 54 + 30 = 84 cfm
-- Kitchen: 100 cfm intermittent (≥100 required) ✓
-- Bathrooms: 50 cfm each intermittent (≥50 required) ✓
-- HRV: 90 cfm continuous ✓
-- Total Provided: 90 cfm (HRV takes precedence over exhausts)
-- Result: PASS - All requirements met
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  equipment_calibration_date,
  
  -- House Characteristics
  floor_area,
  bedrooms,
  stories,
  
  -- ASHRAE 62.2 Calculations
  required_ventilation_rate,
  required_continuous_rate,
  infiltration_credit,
  adjusted_required_rate,
  
  -- Kitchen Exhaust
  kitchen_exhaust_type,
  kitchen_rated_cfm,
  kitchen_measured_cfm,
  kitchen_meets_code,
  kitchen_notes,
  
  -- Bathroom Exhausts
  bathroom1_type,
  bathroom1_rated_cfm,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  
  bathroom2_type,
  bathroom2_rated_cfm,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  
  bathroom3_type,
  bathroom3_rated_cfm,
  bathroom3_measured_cfm,
  bathroom3_meets_code,
  
  -- Mechanical Ventilation
  mechanical_ventilation_type,
  mechanical_rated_cfm,
  mechanical_measured_supply_cfm,
  mechanical_measured_exhaust_cfm,
  mechanical_operating_schedule,
  mechanical_controls,
  mechanical_notes,
  
  -- Totals and Compliance
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  
  -- Additional
  weather_conditions,
  inspector_notes,
  created_at
) 
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '5 days',
  '09:30',
  'VT-2024-1001',
  CURRENT_DATE - INTERVAL '60 days',
  
  -- House: 1800 sq ft, 3 bedrooms, 2 stories
  1800.00,
  3,
  2.0,
  
  -- ASHRAE 62.2: 0.03 × 1800 + 7.5 × 4 = 54 + 30 = 84 cfm
  84.00,
  84.00,
  0.00,
  84.00,
  
  -- Kitchen: 100 cfm intermittent (PASS)
  'intermittent',
  100.00,
  100.00,
  true,
  'New Broan range hood, tested with calibrated flow hood',
  
  -- Bathrooms: All 50 cfm intermittent (PASS)
  'intermittent',
  50.00,
  50.00,
  true,
  
  'intermittent',
  50.00,
  50.00,
  true,
  
  'intermittent',
  50.00,
  50.00,
  true,
  
  -- HRV: 90 cfm balanced continuous
  'balanced_hrv',
  100.00,
  90.00,
  90.00,
  'continuous',
  'Automatic humidity control, manual override',
  'Zehnder HRV system, excellent efficiency',
  
  -- Total: HRV provides 90 cfm (exceeds 84 cfm required)
  90.00,
  true,
  '2020',
  true,
  'Excellent ventilation system - exceeds all code requirements. HRV provides energy-efficient continuous ventilation.',
  
  -- Additional
  '42°F, overcast, light wind',
  'New construction, premium builder. All exhaust fans and HRV operating correctly. Homeowner educated on HRV controls.',
  CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM jobs j
WHERE j.status = 'in_progress'
LIMIT 1;

-- ============================================================================
-- Test Scenario 2: Non-Compliant Kitchen (FAIL)
-- House: 1500 sq ft, 2 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 1500 + 7.5 × (2+1) = 45 + 22.5 = 67.5 cfm
-- Kitchen: 80 cfm intermittent (FAIL - <100 required)
-- Bathrooms: 50 cfm each intermittent (PASS)
-- No mechanical ventilation
-- Total Provided: 80 + 50 + 50 = 180 cfm (meets ventilation, but kitchen fails local exhaust)
-- Result: FAIL - Kitchen exhaust under 100 cfm
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  equipment_calibration_date,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  infiltration_credit,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_rated_cfm,
  kitchen_measured_cfm,
  kitchen_meets_code,
  kitchen_notes,
  bathroom1_type,
  bathroom1_rated_cfm,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_rated_cfm,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  mechanical_ventilation_type,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  non_compliance_notes,
  recommendations,
  weather_conditions,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '8 days',
  '14:15',
  'VT-2024-1001',
  CURRENT_DATE - INTERVAL '60 days',
  1500.00,
  2,
  1.0,
  67.50,
  67.50,
  0.00,
  67.50,
  'intermittent',
  90.00, -- Rated
  80.00, -- Measured (FAIL)
  false,
  'Underpowered range hood, does not meet code minimum',
  'intermittent',
  50.00,
  50.00,
  true,
  'intermittent',
  50.00,
  50.00,
  true,
  'none',
  180.00, -- Total from exhausts
  true, -- Meets whole-house requirement
  '2020',
  false, -- Overall fails due to kitchen
  'Kitchen exhaust fan measured at 80 cfm, below the 100 cfm minimum required for intermittent operation',
  'Replace kitchen range hood with unit rated for ≥100 cfm. Recommend installing inline booster fan or upgrading to higher-capacity model.',
  '38°F, clear, calm',
  'Older home renovation. Kitchen fan appears original to house, underperforming. Bathrooms recently upgraded and compliant.',
  CURRENT_TIMESTAMP - INTERVAL '8 days'
FROM jobs j
WHERE j.status = 'completed'
LIMIT 1;

-- ============================================================================
-- Test Scenario 3: Non-Compliant Bathrooms (FAIL)
-- House: 2500 sq ft, 4 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 2500 + 7.5 × (4+1) = 75 + 37.5 = 112.5 cfm
-- Kitchen: 100 cfm intermittent (PASS)
-- Bathrooms: 40, 40, 35, none (FAIL - under 50 cfm)
-- No mechanical ventilation
-- Total Provided: 100 + 40 + 40 + 35 = 215 cfm
-- Result: FAIL - Bathrooms under-ventilated
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_measured_cfm,
  kitchen_meets_code,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  bathroom3_type,
  bathroom3_measured_cfm,
  bathroom3_meets_code,
  bathroom4_type,
  bathroom4_meets_code,
  mechanical_ventilation_type,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  non_compliance_notes,
  recommendations,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '3 days',
  '11:00',
  'VT-2024-1002',
  2500.00,
  4,
  2.0,
  112.50,
  112.50,
  112.50,
  'intermittent',
  100.00,
  true,
  'intermittent',
  40.00, -- FAIL
  false,
  'intermittent',
  40.00, -- FAIL
  false,
  'intermittent',
  35.00, -- FAIL
  false,
  'none', -- No fan installed (FAIL)
  false,
  'none',
  215.00,
  true, -- Meets whole-house
  '2020',
  false, -- Overall fails
  'Bathroom exhaust fans measured below 50 cfm minimum: Bath1=40cfm, Bath2=40cfm, Bath3=35cfm, Bath4=no fan',
  'Upgrade all bathroom exhaust fans to ≥50 cfm capacity. Install exhaust fan in master bathroom (Bath4). Consider installing continuous fans at ≥20 cfm as alternative.',
  'Large luxury home with inadequate bathroom ventilation. Builder cut costs on exhaust fans.',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM jobs j
WHERE j.status = 'scheduled'
LIMIT 1;

-- ============================================================================
-- Test Scenario 4: Minimal Compliance (BARELY PASS)
-- House: 1200 sq ft, 2 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 1200 + 7.5 × (2+1) = 36 + 22.5 = 58.5 cfm
-- Kitchen: 100 cfm intermittent (exactly meets minimum)
-- Bathrooms: 50 cfm each intermittent (exactly meets minimum)
-- No mechanical ventilation
-- Total Provided: 100 + 50 + 50 = 200 cfm
-- Result: PASS - All requirements met at minimums
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_measured_cfm,
  kitchen_meets_code,
  kitchen_notes,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  mechanical_ventilation_type,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '12 days',
  '15:45',
  'VT-2024-1003',
  1200.00,
  2,
  1.0,
  58.50,
  58.50,
  58.50,
  'intermittent',
  100.00,
  true,
  'Basic code-minimum fan',
  'intermittent',
  50.00,
  true,
  'intermittent',
  50.00,
  true,
  'none',
  200.00,
  true,
  '2020',
  true,
  'System meets minimum code requirements. Consider upgrading to continuous ventilation system for improved air quality.',
  'Small starter home, all fans operating at code minimums. Adequate but not exceptional.',
  CURRENT_TIMESTAMP - INTERVAL '12 days'
FROM jobs j
OFFSET 1
LIMIT 1;

-- ============================================================================
-- Test Scenario 5: Over-Ventilated (EXCELLENT)
-- House: 3200 sq ft, 4 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 3200 + 7.5 × (4+1) = 96 + 37.5 = 133.5 cfm
-- Kitchen: 150 cfm intermittent (exceeds minimum)
-- Bathrooms: 80, 80, 80, 80 cfm intermittent (exceeds minimum)
-- ERV: 140 cfm balanced continuous
-- Total Provided: 140 cfm (ERV provides primary ventilation)
-- Result: PASS - Exceeds all requirements
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_rated_cfm,
  kitchen_measured_cfm,
  kitchen_meets_code,
  kitchen_notes,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  bathroom3_type,
  bathroom3_measured_cfm,
  bathroom3_meets_code,
  bathroom4_type,
  bathroom4_measured_cfm,
  bathroom4_meets_code,
  mechanical_ventilation_type,
  mechanical_rated_cfm,
  mechanical_measured_supply_cfm,
  mechanical_measured_exhaust_cfm,
  mechanical_operating_schedule,
  mechanical_controls,
  mechanical_notes,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  weather_conditions,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '2 days',
  '10:00',
  'VT-2024-1004',
  3200.00,
  4,
  2.5,
  133.50,
  133.50,
  133.50,
  'intermittent',
  150.00,
  150.00,
  true,
  'High-capacity range hood, professional grade',
  'intermittent',
  80.00,
  true,
  'intermittent',
  80.00,
  true,
  'intermittent',
  80.00,
  true,
  'intermittent',
  80.00,
  true,
  'balanced_erv',
  150.00,
  140.00,
  140.00,
  'continuous',
  'Automatic controls with humidity and CO2 sensors',
  'Panasonic Intelli-Balance ERV, premium installation',
  140.00,
  true,
  '2020',
  true,
  'Excellent ventilation system. No improvements needed. System exceeds code by significant margin.',
  '45°F, partly cloudy',
  'Luxury custom home. Premium ERV system with advanced controls. All exhaust fans high-capacity. Outstanding indoor air quality expected.',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM jobs j
OFFSET 2
LIMIT 1;

-- ============================================================================
-- Test Scenario 6: No Mechanical Ventilation (Exhaust Only)
-- House: 1600 sq ft, 3 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 1600 + 7.5 × (3+1) = 48 + 30 = 78 cfm
-- Kitchen: 100 cfm intermittent (PASS)
-- Bathrooms: 50, 50, 50 cfm intermittent (PASS)
-- No mechanical ventilation (relying on exhaust fans)
-- Total Provided: 100 + 50 + 50 + 50 = 250 cfm
-- Result: PASS - Meets requirements with local exhaust only
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_measured_cfm,
  kitchen_meets_code,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  bathroom3_type,
  bathroom3_measured_cfm,
  bathroom3_meets_code,
  mechanical_ventilation_type,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '15 days',
  '13:30',
  'VT-2024-1001',
  1600.00,
  3,
  1.5,
  78.00,
  78.00,
  78.00,
  'intermittent',
  100.00,
  true,
  'intermittent',
  50.00,
  true,
  'intermittent',
  50.00,
  true,
  'intermittent',
  50.00,
  true,
  'none',
  250.00,
  true,
  '2020',
  true,
  'System meets code requirements. Consider adding continuous mechanical ventilation (HRV/ERV) for improved air quality and energy efficiency.',
  'Mid-range home, standard exhaust fan ventilation. Meets code but lacks continuous ventilation benefits.',
  CURRENT_TIMESTAMP - INTERVAL '15 days'
FROM jobs j
OFFSET 3
LIMIT 1;

-- ============================================================================
-- Test Scenario 7: Balanced ERV System (Large Home)
-- House: 2800 sq ft, 4 bedrooms
-- ASHRAE 62.2 Required: 0.03 × 2800 + 7.5 × (4+1) = 84 + 37.5 = 121.5 cfm
-- With infiltration credit of 15 cfm: 121.5 - 15 = 106.5 cfm adjusted
-- Kitchen: 120 cfm intermittent (PASS)
-- Bathrooms: 60, 60, 60 cfm intermittent (PASS)
-- ERV: 110 cfm balanced continuous
-- Total Provided: 110 cfm (ERV provides primary ventilation)
-- Result: PASS - All requirements met with infiltration credit
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  infiltration_credit,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_measured_cfm,
  kitchen_meets_code,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  bathroom2_type,
  bathroom2_measured_cfm,
  bathroom2_meets_code,
  bathroom3_type,
  bathroom3_measured_cfm,
  bathroom3_meets_code,
  mechanical_ventilation_type,
  mechanical_rated_cfm,
  mechanical_measured_supply_cfm,
  mechanical_measured_exhaust_cfm,
  mechanical_operating_schedule,
  mechanical_controls,
  mechanical_notes,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  weather_conditions,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '7 days',
  '09:00',
  'VT-2024-1005',
  2800.00,
  4,
  2.0,
  121.50,
  121.50,
  15.00, -- From blower door test
  106.50,
  'intermittent',
  120.00,
  true,
  'intermittent',
  60.00,
  true,
  'intermittent',
  60.00,
  true,
  'intermittent',
  60.00,
  true,
  'balanced_erv',
  120.00,
  110.00,
  110.00,
  'continuous',
  'Smart controls with outdoor temperature compensation',
  'Broan ERV, well-balanced and efficient',
  110.00,
  true,
  '2020',
  true,
  'Excellent system. ERV provides continuous balanced ventilation. Infiltration credit from tight construction reduces required ventilation rate.',
  '40°F, clear, moderate wind',
  'Well-built home with tight envelope (blower door: 2.5 ACH50). ERV properly sized and commissioned. Infiltration credit of 15 cfm calculated from blower door results.',
  CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM jobs j
OFFSET 4
LIMIT 1;

-- ============================================================================
-- Test Scenario 8: Edge Case - Small Home Minimal Requirements
-- House: 800 sq ft, 1 bedroom
-- ASHRAE 62.2 Required: 0.03 × 800 + 7.5 × (1+1) = 24 + 15 = 39 cfm
-- Kitchen: 100 cfm intermittent (PASS)
-- Bathroom: 50 cfm intermittent (PASS)
-- No mechanical ventilation
-- Total Provided: 100 + 50 = 150 cfm
-- Result: PASS - Small space easily meets requirements
-- ============================================================================

INSERT INTO ventilation_tests (
  id,
  job_id,
  test_date,
  test_time,
  equipment_serial,
  floor_area,
  bedrooms,
  stories,
  required_ventilation_rate,
  required_continuous_rate,
  adjusted_required_rate,
  kitchen_exhaust_type,
  kitchen_measured_cfm,
  kitchen_meets_code,
  bathroom1_type,
  bathroom1_measured_cfm,
  bathroom1_meets_code,
  mechanical_ventilation_type,
  total_ventilation_provided,
  meets_ventilation_requirement,
  code_year,
  overall_compliant,
  recommendations,
  inspector_notes,
  created_at
)
SELECT
  gen_random_uuid(),
  j.id,
  CURRENT_DATE - INTERVAL '20 days',
  '16:00',
  'VT-2024-1001',
  800.00,
  1,
  1.0,
  39.00,
  39.00,
  39.00,
  'intermittent',
  100.00,
  true,
  'intermittent',
  50.00,
  true,
  'none',
  150.00,
  true,
  '2020',
  true,
  'Small space adequately ventilated with standard exhaust fans. System meets code requirements.',
  'Small apartment/condo, minimal but compliant. Low ventilation requirement easily met with standard fans.',
  CURRENT_TIMESTAMP - INTERVAL '20 days'
FROM jobs j
OFFSET 5
LIMIT 1;
