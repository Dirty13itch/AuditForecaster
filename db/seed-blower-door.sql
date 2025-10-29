-- Blower Door Testing Seed Data
-- Provides 8 realistic test scenarios for Minnesota energy auditing
-- Tests cover various building types, ACH50 values, and compliance outcomes
--
-- Usage: psql $DATABASE_URL -f db/seed-blower-door.sql
--
-- Scenarios:
-- 1. Excellent airtightness (1.8 ACH50) - New construction with advanced sealing
-- 2. Good airtightness (2.5 ACH50) - Modern home, standard construction
-- 3. Marginal pass (2.9 ACH50) - Just under code limit
-- 4. Exact code limit (3.0 ACH50) - Passes by a hair
-- 5. Marginal fail (3.2 ACH50) - Just over code limit
-- 6. Poor airtightness (3.8 ACH50) - Older home needing remediation
-- 7. Large home (2.1 ACH50) - 4000+ sq ft, multiple stories
-- 8. Small home (2.6 ACH50) - 1200 sq ft, single story

-- Create prerequisite test jobs if they don't exist
-- These jobs represent typical Minnesota residential construction

DO $$
DECLARE
  v_user_id VARCHAR;
  v_job1_id VARCHAR := 'bd-test-job-001';
  v_job2_id VARCHAR := 'bd-test-job-002';
  v_job3_id VARCHAR := 'bd-test-job-003';
  v_job4_id VARCHAR := 'bd-test-job-004';
  v_job5_id VARCHAR := 'bd-test-job-005';
  v_job6_id VARCHAR := 'bd-test-job-006';
  v_job7_id VARCHAR := 'bd-test-job-007';
  v_job8_id VARCHAR := 'bd-test-job-008';
BEGIN
  -- Get a user ID for assignments (use first available user)
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- If no users exist, create a test user
  IF v_user_id IS NULL THEN
    INSERT INTO users (id, email, name, role)
    VALUES ('bd-test-user-001', 'inspector@example.com', 'Test Inspector', 'field_inspector')
    ON CONFLICT (id) DO NOTHING;
    v_user_id := 'bd-test-user-001';
  END IF;

  -- Job 1: Excellent airtightness - New construction with advanced sealing
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job1_id, '1234 Oakwood Ave', 'Minneapolis', 'MN', '55417',
    'Sarah Johnson', 'sarah.j@email.com', '612-555-0101',
    'completed', NOW() - INTERVAL '3 days', v_user_id,
    '30000', '2000', '4200', '2',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 2: Good airtightness - Modern home, standard construction
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job2_id, '5678 Maple Dr', 'St. Paul', 'MN', '55105',
    'Michael Chen', 'mchen@email.com', '651-555-0202',
    'completed', NOW() - INTERVAL '7 days', v_user_id,
    '36000', '2400', '5200', '2',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 3: Marginal pass - Just under code limit
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job3_id, '910 Birch Ln', 'Bloomington', 'MN', '55420',
    'Jennifer Martinez', 'jmartinez@email.com', '952-555-0303',
    'completed', NOW() - INTERVAL '2 days', v_user_id,
    '33000', '2200', '4800', '2',
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 4: Exact code limit - Passes by a hair
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job4_id, '1122 Cedar St', 'Edina', 'MN', '55424',
    'David Thompson', 'dthompson@email.com', '952-555-0404',
    'completed', NOW() - INTERVAL '5 days', v_user_id,
    '34000', '2300', '4900', '2',
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 5: Marginal fail - Just over code limit
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job5_id, '3344 Elm Blvd', 'Richfield', 'MN', '55423',
    'Lisa Anderson', 'landerson@email.com', '612-555-0505',
    'in_progress', NOW() - INTERVAL '1 days', v_user_id,
    '32000', '2100', '4600', '2',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 6: Poor airtightness - Older home needing remediation
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job6_id, '5566 Willow Way', 'Hopkins', 'MN', '55343',
    'Robert Wilson', 'rwilson@email.com', '952-555-0606',
    'in_progress', NOW() - INTERVAL '1 days', v_user_id,
    '35000', '2350', '5000', '1.5',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 7: Large home - 4000+ sq ft, multiple stories
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job7_id, '7788 Summit Ave', 'Minnetonka', 'MN', '55345',
    'Patricia Davis', 'pdavis@email.com', '952-555-0707',
    'completed', NOW() - INTERVAL '6 days', v_user_id,
    '50000', '4200', '7500', '3',
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

  -- Job 8: Small home - 1200 sq ft, single story
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job8_id, '9900 Lake St', 'Plymouth', 'MN', '55441',
    'Christopher Lee', 'clee@email.com', '763-555-0808',
    'completed', NOW() - INTERVAL '4 days', v_user_id,
    '14400', '1200', '2600', '1',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '4 days'
  ) ON CONFLICT (id) DO UPDATE SET
    house_volume = EXCLUDED.house_volume,
    floor_area = EXCLUDED.floor_area,
    surface_area = EXCLUDED.surface_area;

END $$;

-- Insert blower door test data
-- All tests use realistic multi-point readings and proper regression analysis

-- Test 1: Excellent airtightness (1.8 ACH50)
-- New construction with spray foam insulation and meticulous air sealing
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-001',
  NOW() - INTERVAL '3 days', '10:15',
  'EC-MODEL3-001', NOW() - INTERVAL '60 days',
  30000, 2000, 4200, 2, 'conditioned',
  28, 68, 35, 32, 8,
  29.92, 900,
  '[
    {"housePressure": 50, "fanPressure": 48.2, "cfm": 900, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 43.8, "cfm": 860, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 39.1, "cfm": 815, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 34.0, "cfm": 765, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 28.5, "cfm": 710, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 22.6, "cfm": 650, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 16.2, "cfm": 580, "ringConfiguration": "Open"}
  ]'::jsonb,
  900, 1.8, 82.5, 0.645, 0.9992,
  '2020', 3.0, true, 1.2, 'Excellent airtightness. Spray foam insulation throughout. Advanced air sealing techniques used. Exceeds code requirements significantly.',
  true, 1.032,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
);

-- Test 2: Good airtightness (2.5 ACH50)
-- Modern home with standard construction practices
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-002',
  NOW() - INTERVAL '7 days', '14:30',
  'EC-MODEL3-001', NOW() - INTERVAL '60 days',
  36000, 2400, 5200, 2, 'unconditioned',
  35, 68, 40, 35, 10,
  29.85, 900,
  '[
    {"housePressure": 50, "fanPressure": 62.5, "cfm": 1500, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 57.2, "cfm": 1425, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 51.8, "cfm": 1350, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 46.0, "cfm": 1270, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 39.5, "cfm": 1180, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 32.5, "cfm": 1090, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 24.8, "cfm": 985, "ringConfiguration": "Open"}
  ]'::jsonb,
  1500, 2.5, 125.5, 0.650, 0.9985,
  '2020', 3.0, true, 0.5, 'Good airtightness performance. Meets Minnesota 2020 Energy Code comfortably. Standard fiberglass insulation with housewrap and proper sealing.',
  true, 1.032,
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
);

-- Test 3: Marginal pass (2.9 ACH50)
-- Just under code limit, minimal safety margin
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-003',
  NOW() - INTERVAL '2 days', '09:00',
  'EC-MODEL3-002', NOW() - INTERVAL '45 days',
  33000, 2200, 4800, 2, 'unconditioned',
  32, 69, 38, 33, 12,
  29.88, 900,
  '[
    {"housePressure": 50, "fanPressure": 68.5, "cfm": 1595, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 63.0, "cfm": 1515, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 57.2, "cfm": 1432, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 50.8, "cfm": 1345, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 43.8, "cfm": 1252, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 36.2, "cfm": 1155, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 27.8, "cfm": 1045, "ringConfiguration": "Open"}
  ]'::jsonb,
  1595, 2.9, 138.2, 0.655, 0.9978,
  '2020', 3.0, true, 0.1, 'Marginal pass - just under code limit. Recommend additional air sealing in attic and rim joist areas. Minor gaps around electrical penetrations.',
  true, 1.032,
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
);

-- Test 4: Exact code limit (3.0 ACH50)
-- Passes by a hair, at the exact threshold
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-004',
  NOW() - INTERVAL '5 days', '11:45',
  'EC-MODEL3-002', NOW() - INTERVAL '45 days',
  34000, 2300, 4900, 2, 'unconditioned',
  30, 67, 42, 36, 9,
  29.90, 900,
  '[
    {"housePressure": 50, "fanPressure": 72.0, "cfm": 1700, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 66.2, "cfm": 1618, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 60.0, "cfm": 1532, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 53.5, "cfm": 1442, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 46.2, "cfm": 1345, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 38.5, "cfm": 1242, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 29.8, "cfm": 1128, "ringConfiguration": "Open"}
  ]'::jsonb,
  1700, 3.0, 143.8, 0.658, 0.9982,
  '2020', 3.0, true, 0.0, 'Passes exactly at code limit. No margin for error. Strongly recommend additional air sealing work. Identified leaks around windows, doors, and basement sill plate.',
  true, 1.032,
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
);

-- Test 5: Marginal fail (3.2 ACH50)
-- Just over code limit, needs remediation
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-005',
  NOW() - INTERVAL '1 days', '13:20',
  'EC-MODEL3-003', NOW() - INTERVAL '30 days',
  32000, 2100, 4600, 2, 'none',
  38, 70, 45, 38, 15,
  29.82, 900,
  '[
    {"housePressure": 50, "fanPressure": 75.8, "cfm": 1707, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 69.8, "cfm": 1625, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 63.2, "cfm": 1538, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 56.5, "cfm": 1447, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 48.8, "cfm": 1348, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 40.5, "cfm": 1242, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 31.2, "cfm": 1125, "ringConfiguration": "Open"}
  ]'::jsonb,
  1707, 3.2, 146.2, 0.660, 0.9975,
  '2020', 3.0, false, -0.2, 'FAILS Minnesota 2020 Energy Code. Requires air sealing remediation. Major leaks identified: attic hatch unsealed, recessed lights without IC-rated housings, gaps in rim joist insulation.',
  true, 1.032,
  NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'
);

-- Test 6: Poor airtightness (3.8 ACH50)
-- Older home, significant remediation needed
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-006',
  NOW() - INTERVAL '1 days', '15:00',
  'EC-MODEL3-003', NOW() - INTERVAL '30 days',
  35000, 2350, 5000, 1.5, 'unconditioned',
  25, 65, 30, 28, 5,
  29.95, 900,
  '[
    {"housePressure": 50, "fanPressure": 92.5, "cfm": 2217, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 85.2, "cfm": 2115, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 77.5, "cfm": 2008, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 69.2, "cfm": 1895, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 60.0, "cfm": 1772, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 50.0, "cfm": 1640, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 38.8, "cfm": 1495, "ringConfiguration": "Open"}
  ]'::jsonb,
  2217, 3.8, 192.5, 0.668, 0.9970,
  '2020', 3.0, false, -0.8, 'FAILS - Poor airtightness. Extensive remediation required. Multiple issues: uninsulated attic, no air sealing around chimney chase, open soffit vents into attic space, gaps around all penetrations. Recommend comprehensive air sealing project.',
  true, 1.032,
  NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'
);

-- Test 7: Large home (2.1 ACH50)
-- 4000+ sq ft, excellent performance for size
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-007',
  NOW() - INTERVAL '6 days', '10:00',
  'EC-MODEL3-004', NOW() - INTERVAL '20 days',
  50000, 4200, 7500, 3, 'conditioned',
  22, 68, 28, 30, 6,
  29.98, 900,
  '[
    {"housePressure": 50, "fanPressure": 82.5, "cfm": 1750, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 76.0, "cfm": 1668, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 69.0, "cfm": 1582, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 61.5, "cfm": 1490, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 53.2, "cfm": 1392, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 44.2, "cfm": 1287, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 34.0, "cfm": 1172, "ringConfiguration": "Open"}
  ]'::jsonb,
  1750, 2.1, 148.2, 0.652, 0.9988,
  '2020', 3.0, true, 0.9, 'Excellent airtightness for large 3-story home. Well-executed air barrier system. Closed-cell spray foam in rim joists. Good attention to detail around complex roof transitions.',
  true, 1.032,
  NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
);

-- Test 8: Small home (2.6 ACH50)
-- 1200 sq ft ranch, solid performance
INSERT INTO blower_door_tests (
  id, job_id, test_date, test_time, equipment_serial, equipment_calibration_date,
  house_volume, conditioned_area, surface_area, number_of_stories, basement_type,
  outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, wind_speed,
  barometric_pressure, altitude, test_points,
  cfm50, ach50, ela, n_factor, correlation_coefficient,
  code_year, code_limit, meets_code, margin, notes,
  weather_correction_applied, altitude_correction_factor,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'bd-test-job-008',
  NOW() - INTERVAL '4 days', '16:30',
  'EC-MODEL3-004', NOW() - INTERVAL '20 days',
  14400, 1200, 2600, 1, 'unconditioned',
  40, 72, 48, 40, 18,
  29.78, 900,
  '[
    {"housePressure": 50, "fanPressure": 44.8, "cfm": 624, "ringConfiguration": "Ring A"},
    {"housePressure": 45, "fanPressure": 40.5, "cfm": 595, "ringConfiguration": "Ring A"},
    {"housePressure": 40, "fanPressure": 36.0, "cfm": 565, "ringConfiguration": "Ring A"},
    {"housePressure": 35, "fanPressure": 31.2, "cfm": 532, "ringConfiguration": "Ring A"},
    {"housePressure": 30, "fanPressure": 26.0, "cfm": 496, "ringConfiguration": "Ring A"},
    {"housePressure": 25, "fanPressure": 20.5, "cfm": 458, "ringConfiguration": "Ring A"},
    {"housePressure": 20, "fanPressure": 14.5, "cfm": 415, "ringConfiguration": "Ring A"}
  ]'::jsonb,
  624, 2.6, 54.8, 0.648, 0.9980,
  '2020', 3.0, true, 0.4, 'Good airtightness for small ranch home. Simple building envelope makes air sealing straightforward. Used Ring A configuration due to smaller CFM values. Minor leaks at exterior door thresholds.',
  true, 1.032,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
);

-- Summary output
DO $$
DECLARE
  test_count INTEGER;
  pass_count INTEGER;
  fail_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM blower_door_tests WHERE job_id LIKE 'bd-test-job-%';
  SELECT COUNT(*) INTO pass_count FROM blower_door_tests WHERE job_id LIKE 'bd-test-job-%' AND meets_code = true;
  SELECT COUNT(*) INTO fail_count FROM blower_door_tests WHERE job_id LIKE 'bd-test-job-%' AND meets_code = false;
  
  RAISE NOTICE '✓ Blower door testing seed data loaded successfully';
  RAISE NOTICE '  - % total tests created', test_count;
  RAISE NOTICE '  - % tests passing Minnesota 2020 Code (≤3.0 ACH50)', pass_count;
  RAISE NOTICE '  - % tests failing code requirements', fail_count;
  RAISE NOTICE '  - ACH50 range: 1.8 to 3.8';
  RAISE NOTICE '  - Building types: 1-3 stories, various basement configurations';
  RAISE NOTICE '  - All tests include multi-point regression data';
END $$;
