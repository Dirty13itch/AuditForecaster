-- Equipment Management Seed Data
-- Provides 10 realistic equipment scenarios for Minnesota energy auditing
-- Covers various equipment types, calibration states, maintenance schedules, and checkout patterns
--
-- Usage: psql $DATABASE_URL -f db/seed-equipment.sql
--
-- Equipment Scenarios:
-- 1. Blower Door #1 (blower_door) - Current calibration, recently maintained, excellent condition
-- 2. Blower Door #2 (blower_door) - Calibration due in 15 days, needs attention
-- 3. Duct Blaster #1 (duct_tester) - Current calibration, actively checked out
-- 4. Duct Blaster #2 (duct_tester) - Calibration overdue by 10 days, maintenance required
-- 5. Manometer DG-700 (manometer) - Current calibration, high usage
-- 6. Manometer DG-1000 (manometer) - Maintenance due soon
-- 7. Infrared Camera (infrared_camera) - No calibration required, good condition
-- 8. Digital Camera (camera) - Recently checked out and returned
-- 9. Flow Hood (flow_hood) - Calibration due in 30 days, moderate usage
-- 10. Combustion Analyzer (combustion_analyzer) - Failed last calibration, in maintenance

DO $$
DECLARE
  v_user_id VARCHAR;
  v_job1_id VARCHAR := 'eq-test-job-001';
  v_job2_id VARCHAR := 'eq-test-job-002';
  v_job3_id VARCHAR := 'eq-test-job-003';
  
  v_equip1_id VARCHAR := 'eq-bd-001';
  v_equip2_id VARCHAR := 'eq-bd-002';
  v_equip3_id VARCHAR := 'eq-db-001';
  v_equip4_id VARCHAR := 'eq-db-002';
  v_equip5_id VARCHAR := 'eq-man-001';
  v_equip6_id VARCHAR := 'eq-man-002';
  v_equip7_id VARCHAR := 'eq-ir-001';
  v_equip8_id VARCHAR := 'eq-cam-001';
  v_equip9_id VARCHAR := 'eq-fh-001';
  v_equip10_id VARCHAR := 'eq-ca-001';
BEGIN
  -- Get a user ID for assignments (use first available user)
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- If no users exist, create a test user
  IF v_user_id IS NULL THEN
    INSERT INTO users (id, email, name, role)
    VALUES ('eq-test-user-001', 'inspector@example.com', 'Shaun Ulrich', 'field_inspector')
    ON CONFLICT (id) DO NOTHING;
    v_user_id := 'eq-test-user-001';
  END IF;

  -- Create prerequisite test jobs for checkout scenarios
  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job1_id, '1234 Equipment Test Ave', 'Minneapolis', 'MN', '55417',
    'Test Client Alpha', 'alpha@example.com', '612-555-0101',
    'in_progress', NOW(), v_user_id,
    '36000', '2400', '5200', '2',
    NOW() - INTERVAL '1 day', NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job2_id, '5678 Equipment Test Blvd', 'St. Paul', 'MN', '55105',
    'Test Client Beta', 'beta@example.com', '651-555-0202',
    'completed', NOW() - INTERVAL '3 days', v_user_id,
    '32000', '2100', '4600', '2',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO jobs (
    id, address, city, state, zip_code, client_name, client_email, client_phone,
    status, scheduled_date, assigned_to, house_volume, floor_area, surface_area, stories,
    created_at, updated_at
  ) VALUES (
    v_job3_id, '9101 Equipment Test St', 'Bloomington', 'MN', '55420',
    'Test Client Gamma', 'gamma@example.com', '952-555-0303',
    'scheduled', NOW() + INTERVAL '2 days', v_user_id,
    '30000', '2000', '4200', '2',
    NOW() - INTERVAL '2 days', NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 1: Blower Door #1 - Excellent Condition
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip1_id, v_user_id,
    'Minneapolis Blower Door Model 3 with DG-700',
    'blower_door',
    'The Energy Conservatory',
    'Model 3',
    'MBD-2023-1547',
    '2023-01-15',
    3895.00,
    3500.00,
    'available',
    'Main Office - Equipment Room A',
    NOW() + INTERVAL '180 days',  -- Calibration due in 6 months
    NOW() - INTERVAL '185 days',  -- Last calibrated 6 months ago
    365,
    NOW() + INTERVAL '45 days',   -- Maintenance due in 45 days
    NOW() - INTERVAL '45 days',   -- Last maintained 45 days ago
    90,
    'Primary blower door. Includes DG-700 manometer and all rings (Open, A, B, C). Excellent condition.',
    'EQUIP-BD-001-MBD1547',
    NOW() - INTERVAL '2 days',
    147,
    '2023-01-15'
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    status = EXCLUDED.status,
    calibration_due = EXCLUDED.calibration_due,
    last_calibration = EXCLUDED.last_calibration,
    maintenance_due = EXCLUDED.maintenance_due,
    last_maintenance = EXCLUDED.last_maintenance;

  -- Calibration history for Equipment 1 (3 annual calibrations)
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES 
    (
      'eq-cal-001',
      v_equip1_id,
      NOW() - INTERVAL '185 days',
      NOW() + INTERVAL '180 days',
      'The Energy Conservatory Calibration Lab',
      'TEC-2024-0478',
      275.00,
      true,
      'Annual calibration. Fan flow accuracy ±2.1%. All rings within specification. Certificate valid for 12 months.',
      NOW() - INTERVAL '185 days'
    ),
    (
      'eq-cal-002',
      v_equip1_id,
      NOW() - INTERVAL '550 days',
      NOW() - INTERVAL '185 days',
      'The Energy Conservatory Calibration Lab',
      'TEC-2023-0891',
      265.00,
      true,
      'Second annual calibration. Equipment performing excellently. Minor adjustment to Ring B.',
      NOW() - INTERVAL '550 days'
    ),
    (
      'eq-cal-003',
      v_equip1_id,
      NOW() - INTERVAL '915 days',
      NOW() - INTERVAL '550 days',
      'The Energy Conservatory Calibration Lab',
      'TEC-2022-1203',
      255.00,
      true,
      'First annual calibration. Equipment in excellent condition.',
      NOW() - INTERVAL '915 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- Maintenance history for Equipment 1
  INSERT INTO equipment_maintenance (
    id, equipment_id, maintenance_date, performed_by,
    description, cost, next_due, notes, created_at
  ) VALUES 
    (
      'eq-maint-001',
      v_equip1_id,
      NOW() - INTERVAL '45 days',
      'Shaun Ulrich',
      'Quarterly cleaning and inspection: Cleaned fan blades, checked all seals, lubricated moving parts, inspected rings',
      0.00,
      NOW() + INTERVAL '45 days',
      'Equipment in excellent condition. All components functioning properly.',
      NOW() - INTERVAL '45 days'
    ),
    (
      'eq-maint-002',
      v_equip1_id,
      NOW() - INTERVAL '135 days',
      'Shaun Ulrich',
      'Quarterly maintenance: Cleaned fan, replaced worn gasket on Ring B',
      15.50,
      NOW() - INTERVAL '45 days',
      'Ring B gasket showing wear, replaced preventively. Part cost $15.50.',
      NOW() - INTERVAL '135 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 2: Blower Door #2 - Calibration Due Soon
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip2_id, v_user_id,
    'Minneapolis Blower Door Model 4',
    'blower_door',
    'The Energy Conservatory',
    'Model 4',
    'MBD-2024-0892',
    '2024-02-10',
    4195.00,
    4000.00,
    'available',
    'Main Office - Equipment Room A',
    NOW() + INTERVAL '15 days',  -- Calibration due in 15 days (WARNING)
    NOW() - INTERVAL '350 days',
    365,
    NOW() + INTERVAL '60 days',
    NOW() - INTERVAL '30 days',
    90,
    'Backup blower door. Newer model with improved DG-1000 manometer. ALERT: Calibration due soon!',
    'EQUIP-BD-002-MBD0892',
    NOW() - INTERVAL '5 days',
    89,
    '2024-02-10'
  ) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    calibration_due = EXCLUDED.calibration_due,
    last_calibration = EXCLUDED.last_calibration;

  -- Recent calibration for Equipment 2
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-004',
    v_equip2_id,
    NOW() - INTERVAL '350 days',
    NOW() + INTERVAL '15 days',
    'The Energy Conservatory Calibration Lab',
    'TEC-2024-0156',
    285.00,
    true,
    'First annual calibration on new equipment. Factory calibration extended. All components within spec.',
    NOW() - INTERVAL '350 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 3: Duct Blaster #1 - Currently Checked Out
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    assigned_to, notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip3_id, v_user_id,
    'Minneapolis Duct Blaster Standard',
    'duct_tester',
    'The Energy Conservatory',
    'Duct Blaster',
    'DB-2022-0891',
    '2022-06-01',
    2995.00,
    2600.00,
    'in_use',                      -- Currently checked out
    'Field - In Use',
    NOW() + INTERVAL '200 days',
    NOW() - INTERVAL '165 days',
    365,
    NOW() + INTERVAL '50 days',
    NOW() - INTERVAL '40 days',
    90,
    v_user_id,                     -- Assigned to user
    'Primary duct blaster. Currently in field use for Job #001. Includes all rings and calibrated pressure gauge.',
    'EQUIP-DB-001-DB0891',
    NOW(),                         -- Last used today
    203,
    '2022-06-01'
  ) ON CONFLICT (id) DO UPDATE SET
    status = 'in_use',
    assigned_to = v_user_id,
    last_used_date = NOW();

  -- Calibration for Equipment 3
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-005',
    v_equip3_id,
    NOW() - INTERVAL '165 days',
    NOW() + INTERVAL '200 days',
    'The Energy Conservatory Calibration Lab',
    'TEC-2024-0789',
    275.00,
    true,
    'Annual calibration completed. Fan and pressure gauge within specification.',
    NOW() - INTERVAL '165 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Active checkout for Equipment 3
  INSERT INTO equipment_checkouts (
    id, equipment_id, user_id, job_id,
    checkout_date, expected_return, actual_return, condition, notes,
    created_at
  ) VALUES (
    'eq-checkout-001',
    v_equip3_id,
    v_user_id,
    v_job1_id,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '6 hours',  -- Expected back in 6 hours
    NULL,                         -- Not yet returned (active checkout)
    'good',
    'Final inspection at 1234 Equipment Test Ave. Duct leakage testing scheduled.',
    NOW() - INTERVAL '2 hours'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 4: Duct Blaster #2 - Calibration Overdue
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip4_id, v_user_id,
    'Retrotec Duct Blaster 3000',
    'duct_tester',
    'Retrotec',
    'DuctTester 3000',
    'RT-2021-0456',
    '2021-03-15',
    3200.00,
    2400.00,
    'maintenance',                 -- In maintenance due to overdue calibration
    'Calibration Lab - Awaiting Service',
    NOW() - INTERVAL '10 days',   -- Calibration OVERDUE by 10 days
    NOW() - INTERVAL '375 days',
    365,
    NOW() - INTERVAL '15 days',   -- Maintenance also overdue
    NOW() - INTERVAL '105 days',
    90,
    'Backup duct blaster. ALERT: Calibration overdue! Sent for calibration and maintenance on ' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '.',
    'EQUIP-DB-002-RT0456',
    NOW() - INTERVAL '12 days',
    178,
    '2021-03-15'
  ) ON CONFLICT (id) DO UPDATE SET
    status = 'maintenance',
    calibration_due = EXCLUDED.calibration_due;

  -- Last calibration for Equipment 4 (now overdue)
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-006',
    v_equip4_id,
    NOW() - INTERVAL '375 days',
    NOW() - INTERVAL '10 days',  -- Overdue
    'Retrotec Calibration Services',
    'RT-CAL-2023-0234',
    290.00,
    true,
    'Annual calibration. Equipment showing signs of wear but within acceptable limits.',
    NOW() - INTERVAL '375 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 5: Manometer DG-700 - High Usage
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip5_id, v_user_id,
    'Energy Conservatory DG-700 Pressure Gauge',
    'manometer',
    'The Energy Conservatory',
    'DG-700',
    'DG7-2022-1893',
    '2022-08-20',
    695.00,
    550.00,
    'available',
    'Main Office - Equipment Room B',
    NOW() + INTERVAL '190 days',
    NOW() - INTERVAL '175 days',
    365,
    NOW() + INTERVAL '60 days',
    NOW() - INTERVAL '120 days',
    180,  -- Manometers require less frequent maintenance (semi-annual)
    'Primary pressure gauge for all testing. High accuracy. Used daily.',
    'EQUIP-MAN-001-DG71893',
    NOW() - INTERVAL '1 day',
    412,  -- Very high usage
    '2022-08-20'
  ) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

  -- Calibration for Equipment 5
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-007',
    v_equip5_id,
    NOW() - INTERVAL '175 days',
    NOW() + INTERVAL '190 days',
    'The Energy Conservatory Calibration Lab',
    'TEC-2024-0567',
    95.00,
    true,
    'Annual calibration. Pressure sensor accuracy ±0.5%. Battery health excellent.',
    NOW() - INTERVAL '175 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 6: Manometer DG-1000 - Maintenance Due Soon
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip6_id, v_user_id,
    'Energy Conservatory DG-1000 Pressure Gauge',
    'manometer',
    'The Energy Conservatory',
    'DG-1000',
    'DG10-2024-0123',
    '2024-01-10',
    895.00,
    850.00,
    'available',
    'Main Office - Equipment Room B',
    NOW() + INTERVAL '280 days',
    NOW() - INTERVAL '85 days',
    365,
    NOW() + INTERVAL '5 days',   -- Maintenance due in 5 days
    NOW() - INTERVAL '175 days',
    180,
    'Backup pressure gauge. Newer DG-1000 model with enhanced features. Battery check needed soon.',
    'EQUIP-MAN-002-DG100123',
    NOW() - INTERVAL '7 days',
    67,
    '2024-01-10'
  ) ON CONFLICT (id) DO UPDATE SET
    maintenance_due = EXCLUDED.maintenance_due;

  -- ========================================
  -- Equipment 7: Infrared Camera - No Calibration Required
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip7_id, v_user_id,
    'FLIR E8-XT Infrared Camera',
    'infrared_camera',
    'FLIR Systems',
    'E8-XT',
    'FLIR-2023-7845',
    '2023-05-15',
    1995.00,
    1700.00,
    'available',
    'Main Office - Equipment Room C',
    NULL,  -- No calibration required (factory calibrated)
    NULL,
    365,
    NOW() + INTERVAL '90 days',
    NOW() - INTERVAL '90 days',
    180,
    'Primary infrared camera for thermal imaging. Factory calibrated - no field calibration required. Excellent for insulation inspection.',
    'EQUIP-IR-001-FLIR7845',
    NOW() - INTERVAL '4 days',
    94,
    '2023-05-15'
  ) ON CONFLICT (id) DO NOTHING;

  -- Maintenance for Equipment 7 (lens cleaning, battery check)
  INSERT INTO equipment_maintenance (
    id, equipment_id, maintenance_date, performed_by,
    description, cost, next_due, notes, created_at
  ) VALUES (
    'eq-maint-003',
    v_equip7_id,
    NOW() - INTERVAL '90 days',
    'Shaun Ulrich',
    'Semi-annual maintenance: Lens cleaning, battery health check, firmware update to v2.1.5',
    0.00,
    NOW() + INTERVAL '90 days',
    'Lens cleaned with microfiber cloth. Battery health 94%. Firmware updated successfully.',
    NOW() - INTERVAL '90 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 8: Digital Camera - Recently Returned
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip8_id, v_user_id,
    'Canon EOS R6 Mark II',
    'camera',
    'Canon',
    'EOS R6 Mark II',
    'CANON-2024-9012',
    '2024-01-05',
    2499.00,
    2400.00,
    'available',
    'Main Office - Equipment Room C',
    NULL,  -- No calibration required
    NULL,
    365,
    NOW() + INTERVAL '75 days',
    NOW() - INTERVAL '15 days',
    90,
    'Primary camera for photo documentation. 24MP sensor, excellent low-light performance. Includes 24-105mm lens.',
    'EQUIP-CAM-001-CANON9012',
    NOW() - INTERVAL '3 days',
    156,
    '2024-01-05'
  ) ON CONFLICT (id) DO NOTHING;

  -- Completed checkout for Equipment 8
  INSERT INTO equipment_checkouts (
    id, equipment_id, user_id, job_id,
    checkout_date, expected_return, actual_return, condition, notes,
    created_at
  ) VALUES (
    'eq-checkout-002',
    v_equip8_id,
    v_user_id,
    v_job2_id,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '8 hours',
    NOW() - INTERVAL '3 days' + INTERVAL '6 hours',  -- Returned 2 hours early
    'good',
    'Photo documentation for Job #002. Captured 47 photos. Memory card formatted after upload.',
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 9: Flow Hood - Calibration Due in 30 Days
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip9_id, v_user_id,
    'Energy Conservatory FlowBlaster',
    'flow_hood',
    'The Energy Conservatory',
    'FlowBlaster',
    'FB-2021-0567',
    '2021-11-10',
    1795.00,
    1400.00,
    'available',
    'Main Office - Equipment Room A',
    NOW() + INTERVAL '30 days',  -- Calibration due in 30 days
    NOW() - INTERVAL '335 days',
    365,
    NOW() + INTERVAL '60 days',
    NOW() - INTERVAL '30 days',
    90,
    'Flow hood for airflow measurement at registers and grilles. Range: 25-2500 CFM. Schedule calibration soon.',
    'EQUIP-FH-001-FB0567',
    NOW() - INTERVAL '8 days',
    118,
    '2021-11-10'
  ) ON CONFLICT (id) DO UPDATE SET
    calibration_due = EXCLUDED.calibration_due;

  -- Calibration for Equipment 9
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-008',
    v_equip9_id,
    NOW() - INTERVAL '335 days',
    NOW() + INTERVAL '30 days',
    'The Energy Conservatory Calibration Lab',
    'TEC-2024-0345',
    185.00,
    true,
    'Annual calibration. Flow accuracy ±3.2%. Fabric hood in good condition.',
    NOW() - INTERVAL '335 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ========================================
  -- Equipment 10: Combustion Analyzer - Failed Calibration
  -- ========================================
  INSERT INTO equipment (
    id, user_id, name, type, manufacturer, model, serial_number,
    purchase_date, purchase_cost, current_value, status, location,
    calibration_due, last_calibration, calibration_interval,
    maintenance_due, last_maintenance, maintenance_interval,
    notes, qr_code, last_used_date, total_uses, created_at
  ) VALUES (
    v_equip10_id, v_user_id,
    'Bacharach Fyrite InTech',
    'combustion_analyzer',
    'Bacharach',
    'Fyrite InTech',
    'BACH-2020-3421',
    '2020-09-01',
    1495.00,
    800.00,
    'maintenance',                 -- In maintenance due to failed calibration
    'Repair Shop - Sensor Replacement',
    NOW() - INTERVAL '5 days',    -- Calibration overdue
    NOW() - INTERVAL '190 days',  -- Last calibration failed
    180,  -- Combustion analyzers need semi-annual calibration
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '110 days',
    90,
    'CRITICAL: CO sensor out of specification. Failed last calibration. Sent for sensor replacement. DO NOT USE until repaired.',
    'EQUIP-CA-001-BACH3421',
    NOW() - INTERVAL '25 days',
    203,
    '2020-09-01'
  ) ON CONFLICT (id) DO UPDATE SET
    status = 'maintenance';

  -- Failed calibration for Equipment 10
  INSERT INTO equipment_calibrations (
    id, equipment_id, calibration_date, next_due,
    performed_by, certificate_number, cost, passed, notes,
    created_at
  ) VALUES (
    'eq-cal-009',
    v_equip10_id,
    NOW() - INTERVAL '190 days',
    NOW() - INTERVAL '5 days',  -- Should have been calibrated again by now
    'Bacharach Calibration Services',
    'BACH-CAL-2024-0089',
    145.00,
    false,  -- FAILED
    'FAILED CALIBRATION: CO sensor reading out of specification. Measured 150 PPM when exposed to 100 PPM reference gas. Sensor requires replacement. Equipment removed from service.',
    NOW() - INTERVAL '190 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Maintenance record for Equipment 10 (pending repair)
  INSERT INTO equipment_maintenance (
    id, equipment_id, maintenance_date, performed_by,
    description, cost, next_due, notes, created_at
  ) VALUES (
    'eq-maint-004',
    v_equip10_id,
    NOW() - INTERVAL '20 days',
    'Bacharach Service Center',
    'CO sensor replacement - equipment sent to manufacturer for repair',
    325.00,
    NULL,  -- Next due TBD after repair
    'Sensor replacement ordered. Estimated repair completion: 2-3 weeks. Equipment must be re-calibrated after repair.',
    NOW() - INTERVAL '20 days'
  ) ON CONFLICT (id) DO NOTHING;

END $$;

-- Create summary view for quick equipment status check
-- This view is useful for dashboard widgets and alerts

CREATE OR REPLACE VIEW equipment_status_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'available') AS available_count,
  COUNT(*) FILTER (WHERE status = 'in_use') AS in_use_count,
  COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance_count,
  COUNT(*) FILTER (WHERE status = 'retired') AS retired_count,
  COUNT(*) FILTER (WHERE calibration_due IS NOT NULL AND calibration_due < NOW()) AS overdue_calibration_count,
  COUNT(*) FILTER (WHERE calibration_due IS NOT NULL AND calibration_due BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS calibration_due_soon_count,
  COUNT(*) FILTER (WHERE maintenance_due IS NOT NULL AND maintenance_due < NOW()) AS overdue_maintenance_count,
  COUNT(*) FILTER (WHERE maintenance_due IS NOT NULL AND maintenance_due BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS maintenance_due_soon_count,
  COUNT(*) AS total_equipment
FROM equipment;

-- Create view for active equipment usage
CREATE OR REPLACE VIEW active_equipment_usage AS
SELECT 
  e.id,
  e.name,
  e.type,
  e.status,
  e.assigned_to,
  u.name AS assigned_to_name,
  ec.job_id,
  ec.checkout_date,
  ec.expected_return,
  CASE 
    WHEN ec.expected_return < NOW() THEN true
    ELSE false
  END AS is_overdue,
  EXTRACT(EPOCH FROM (NOW() - ec.expected_return)) / 3600 AS hours_overdue
FROM equipment e
LEFT JOIN equipment_checkouts ec ON e.id = ec.equipment_id AND ec.actual_return IS NULL
LEFT JOIN users u ON e.assigned_to = u.id
WHERE e.status = 'in_use';

-- Display summary after seeding
SELECT 
  '=====================================' AS separator,
  'Equipment Management Seed Complete' AS message,
  '=====================================' AS separator
UNION ALL
SELECT 
  '', 
  'Summary:', 
  ''
UNION ALL
SELECT 
  '',
  'Total Equipment: ' || total_equipment::text,
  ''
FROM equipment_status_summary
UNION ALL
SELECT 
  '',
  'Available: ' || available_count::text || ' | In Use: ' || in_use_count::text || ' | Maintenance: ' || maintenance_count::text,
  ''
FROM equipment_status_summary
UNION ALL
SELECT 
  '',
  'Calibration Overdue: ' || overdue_calibration_count::text || ' | Due Soon (30d): ' || calibration_due_soon_count::text,
  ''
FROM equipment_status_summary
UNION ALL
SELECT 
  '',
  'Maintenance Overdue: ' || overdue_maintenance_count::text || ' | Due Soon (30d): ' || maintenance_due_soon_count::text,
  ''
FROM equipment_status_summary;
