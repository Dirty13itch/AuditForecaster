-- ================================================
-- BUILDERS HIERARCHY & CONTACTS - SEED DATA
-- ================================================
-- Generated: 2025-10-30
-- Purpose: Comprehensive test data for builder management
-- Scenarios: 8 realistic builder profiles
-- Dependencies: Users table (for interactions created_by)
--
-- Usage:
--   psql $DATABASE_URL -f db/seed-builders.sql
--
-- Test Coverage:
--   - 8+ builders across volume tiers
--   - 12+ developments across Minneapolis/St Paul metro
--   - 80+ lots in various statuses
--   - 20+ contacts across roles
--   - 10+ agreements (active/expiring/expired)
--   - 15+ program enrollments
--   - 25+ interaction logs
-- ================================================

BEGIN;

-- ================================================
-- CLEANUP: Remove existing seed data
-- ================================================
-- Uses cascade deletes to clean all related records
-- Safe to re-run multiple times

DELETE FROM builder_interactions 
WHERE builder_id IN (
  SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
);

DELETE FROM builder_programs 
WHERE builder_id IN (
  SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
);

DELETE FROM builder_agreements 
WHERE builder_id IN (
  SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
);

DELETE FROM lots 
WHERE development_id IN (
  SELECT id FROM developments WHERE builder_id IN (
    SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
  )
);

DELETE FROM developments 
WHERE builder_id IN (
  SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
);

DELETE FROM builder_contacts 
WHERE builder_id IN (
  SELECT id FROM builders WHERE email LIKE '%@builders-seed.com'
);

DELETE FROM builders WHERE email LIKE '%@builders-seed.com';

-- ================================================
-- SCENARIO 1: M/I Homes - Large Volume Builder
-- ================================================
-- Profile: Premium volume builder, 500+ homes/year
-- Features:
--   - 3 developments in different municipalities
--   - 73 lots across developments (Maple Ridge: 30, Oak Valley: 25, Cedar Creek: 18)
--   - 5 contacts (superintendent, 2 PMs, office manager, owner)
--   - 2 active agreements
--   - 3 active programs (ENERGY STAR, tax credit, utility rebate)
--   - 4 interactions showing regular engagement
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-mi-homes',
  'M/I Homes',
  'M/I Homes of Minnesota LLC',
  'info@mihomes.builders-seed.com',
  '952-555-1001',
  '7500 Wayzata Blvd, Suite 200, Minneapolis, MN 55426',
  'Production Builder',
  5,
  287,
  'Premium production builder. High volume, excellent quality. Prefers 7-day lead time for all inspections. Primary contact: Tom Peterson (Superintendent).',
  'premium',
  'Net 30',
  7,
  ARRAY['MI', 'MIH', 'M/I', 'MI Homes']
);

-- M/I Homes Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-mi-001',
    'builder-mi-homes',
    'Tom Peterson',
    'superintendent',
    'tom.peterson@mihomes.builders-seed.com',
    '952-555-1002',
    '612-555-1002',
    true,
    'phone',
    'Primary contact for all inspections. Available 7am-5pm weekdays. Prefers morning calls.'
  ),
  (
    'contact-mi-002',
    'builder-mi-homes',
    'Sarah Williams',
    'project_manager',
    'sarah.williams@mihomes.builders-seed.com',
    '952-555-1003',
    '612-555-1003',
    false,
    'email',
    'Manages Maple Ridge development. Handles scheduling and permitting.'
  ),
  (
    'contact-mi-003',
    'builder-mi-homes',
    'Mike Rodriguez',
    'project_manager',
    'mike.rodriguez@mihomes.builders-seed.com',
    '952-555-1004',
    '612-555-1004',
    false,
    'phone',
    'Manages Oak Valley and Cedar Creek developments.'
  ),
  (
    'contact-mi-004',
    'builder-mi-homes',
    'Jennifer Chen',
    'office_manager',
    'jennifer.chen@mihomes.builders-seed.com',
    '952-555-1005',
    NULL,
    false,
    'email',
    'Handles invoicing and payment processing. CC on all inspection reports.'
  ),
  (
    'contact-mi-005',
    'builder-mi-homes',
    'David Thompson',
    'owner',
    'david.thompson@mihomes.builders-seed.com',
    '952-555-1001',
    '612-555-1001',
    false,
    'email',
    'Regional owner. Only contact for contract negotiations and program enrollments.'
  );

-- M/I Homes Developments
INSERT INTO developments (
  id, builder_id, name, region, municipality, address,
  status, total_lots, completed_lots, start_date, target_completion_date, notes
) VALUES
  (
    'dev-mi-001',
    'builder-mi-homes',
    'Maple Ridge',
    'North Metro',
    'Minneapolis',
    'Maple Ridge Drive & 52nd Avenue N, Minneapolis, MN 55429',
    'active',
    30,
    12,
    '2024-04-01',
    '2026-08-31',
    'Premium single-family development. 2-story homes, 2200-2800 sq ft. Energy Star certified.'
  ),
  (
    'dev-mi-002',
    'builder-mi-homes',
    'Oak Valley Estates',
    'East Metro',
    'St Paul',
    'Oak Valley Road & White Bear Ave, St Paul, MN 55110',
    'active',
    25,
    8,
    '2024-06-15',
    '2026-12-31',
    'Luxury homes with full basements. 2400-3200 sq ft. All homes include HERS rating.'
  ),
  (
    'dev-mi-003',
    'builder-mi-homes',
    'Cedar Creek',
    'West Metro',
    'Minnetonka',
    'Cedar Creek Lane, Minnetonka, MN 55345',
    'planning',
    18,
    0,
    '2025-03-01',
    '2027-06-30',
    'New development. Permitting in progress. Rambler and 2-story models available.'
  );

-- M/I Homes Lots - Maple Ridge (30 lots)
INSERT INTO lots (
  id, development_id, lot_number, phase, block, street_address,
  status, square_footage, notes
) VALUES
  ('lot-mi-001', 'dev-mi-001', '101', 'Phase 1', 'A', '5201 Maple Ridge Dr', 'completed', 2400.00, 'Model Oakmont - completed 2024-08'),
  ('lot-mi-002', 'dev-mi-001', '102', 'Phase 1', 'A', '5203 Maple Ridge Dr', 'completed', 2200.00, 'Model Aspen - completed 2024-09'),
  ('lot-mi-003', 'dev-mi-001', '103', 'Phase 1', 'A', '5205 Maple Ridge Dr', 'completed', 2600.00, 'Model Brighton - completed 2024-10'),
  ('lot-mi-004', 'dev-mi-001', '104', 'Phase 1', 'A', '5207 Maple Ridge Dr', 'under_construction', 2400.00, 'Est completion 2025-02'),
  ('lot-mi-005', 'dev-mi-001', '105', 'Phase 1', 'A', '5209 Maple Ridge Dr', 'under_construction', 2200.00, 'Est completion 2025-02'),
  ('lot-mi-006', 'dev-mi-001', '106', 'Phase 1', 'B', '5211 Maple Ridge Dr', 'sold', 2800.00, 'Starting construction 2025-01'),
  ('lot-mi-007', 'dev-mi-001', '107', 'Phase 1', 'B', '5213 Maple Ridge Dr', 'sold', 2400.00, 'Starting construction 2025-01'),
  ('lot-mi-008', 'dev-mi-001', '108', 'Phase 1', 'B', '5215 Maple Ridge Dr', 'sold', 2200.00, 'Starting construction 2025-02'),
  ('lot-mi-009', 'dev-mi-001', '109', 'Phase 1', 'B', '5217 Maple Ridge Dr', 'sold', 2600.00, 'Starting construction 2025-02'),
  ('lot-mi-010', 'dev-mi-001', '110', 'Phase 1', 'B', '5219 Maple Ridge Dr', 'available', 2400.00, NULL),
  ('lot-mi-011', 'dev-mi-001', '201', 'Phase 2', 'C', '5221 Maple Ridge Dr', 'completed', 2400.00, 'Model Oakmont - completed 2024-11'),
  ('lot-mi-012', 'dev-mi-001', '202', 'Phase 2', 'C', '5223 Maple Ridge Dr', 'completed', 2800.00, 'Model Brighton XL - completed 2024-12'),
  ('lot-mi-013', 'dev-mi-001', '203', 'Phase 2', 'C', '5225 Maple Ridge Dr', 'under_construction', 2200.00, 'Est completion 2025-03'),
  ('lot-mi-014', 'dev-mi-001', '204', 'Phase 2', 'C', '5227 Maple Ridge Dr', 'under_construction', 2600.00, 'Est completion 2025-03'),
  ('lot-mi-015', 'dev-mi-001', '205', 'Phase 2', 'C', '5229 Maple Ridge Dr', 'sold', 2400.00, 'Starting construction 2025-03'),
  ('lot-mi-016', 'dev-mi-001', '206', 'Phase 2', 'D', '5231 Maple Ridge Dr', 'sold', 2200.00, 'Starting construction 2025-03'),
  ('lot-mi-017', 'dev-mi-001', '207', 'Phase 2', 'D', '5233 Maple Ridge Dr', 'sold', 2800.00, 'Starting construction 2025-04'),
  ('lot-mi-018', 'dev-mi-001', '208', 'Phase 2', 'D', '5235 Maple Ridge Dr', 'available', 2600.00, NULL),
  ('lot-mi-019', 'dev-mi-001', '209', 'Phase 2', 'D', '5237 Maple Ridge Dr', 'available', 2400.00, NULL),
  ('lot-mi-020', 'dev-mi-001', '210', 'Phase 2', 'D', '5239 Maple Ridge Dr', 'available', 2200.00, NULL),
  ('lot-mi-021', 'dev-mi-001', '301', 'Phase 3', 'E', '5241 Maple Ridge Dr', 'available', 2400.00, NULL),
  ('lot-mi-022', 'dev-mi-001', '302', 'Phase 3', 'E', '5243 Maple Ridge Dr', 'available', 2800.00, NULL),
  ('lot-mi-023', 'dev-mi-001', '303', 'Phase 3', 'E', '5245 Maple Ridge Dr', 'available', 2600.00, NULL),
  ('lot-mi-024', 'dev-mi-001', '304', 'Phase 3', 'E', '5247 Maple Ridge Dr', 'available', 2200.00, NULL),
  ('lot-mi-025', 'dev-mi-001', '305', 'Phase 3', 'E', '5249 Maple Ridge Dr', 'available', 2400.00, NULL),
  ('lot-mi-026', 'dev-mi-001', '306', 'Phase 3', 'F', '5251 Maple Ridge Dr', 'available', 2800.00, NULL),
  ('lot-mi-027', 'dev-mi-001', '307', 'Phase 3', 'F', '5253 Maple Ridge Dr', 'available', 2200.00, NULL),
  ('lot-mi-028', 'dev-mi-001', '308', 'Phase 3', 'F', '5255 Maple Ridge Dr', 'available', 2600.00, NULL),
  ('lot-mi-029', 'dev-mi-001', '309', 'Phase 3', 'F', '5257 Maple Ridge Dr', 'available', 2400.00, NULL),
  ('lot-mi-030', 'dev-mi-001', '310', 'Phase 3', 'F', '5259 Maple Ridge Dr', 'available', 2200.00, NULL);

-- M/I Homes Lots - Oak Valley (25 lots)
INSERT INTO lots (
  id, development_id, lot_number, phase, block, street_address,
  status, square_footage, notes
) VALUES
  ('lot-mi-031', 'dev-mi-002', '1', 'Phase 1', 'A', '1101 Oak Valley Rd', 'completed', 2800.00, 'Completed 2024-09'),
  ('lot-mi-032', 'dev-mi-002', '2', 'Phase 1', 'A', '1103 Oak Valley Rd', 'completed', 2600.00, 'Completed 2024-10'),
  ('lot-mi-033', 'dev-mi-002', '3', 'Phase 1', 'A', '1105 Oak Valley Rd', 'completed', 3200.00, 'Completed 2024-11'),
  ('lot-mi-034', 'dev-mi-002', '4', 'Phase 1', 'A', '1107 Oak Valley Rd', 'under_construction', 2800.00, 'Est completion 2025-02'),
  ('lot-mi-035', 'dev-mi-002', '5', 'Phase 1', 'A', '1109 Oak Valley Rd', 'under_construction', 2400.00, 'Est completion 2025-02'),
  ('lot-mi-036', 'dev-mi-002', '6', 'Phase 1', 'B', '1111 Oak Valley Rd', 'sold', 3000.00, 'Starting construction 2025-01'),
  ('lot-mi-037', 'dev-mi-002', '7', 'Phase 1', 'B', '1113 Oak Valley Rd', 'sold', 2600.00, 'Starting construction 2025-02'),
  ('lot-mi-038', 'dev-mi-002', '8', 'Phase 1', 'B', '1115 Oak Valley Rd', 'sold', 2800.00, 'Starting construction 2025-02'),
  ('lot-mi-039', 'dev-mi-002', '9', 'Phase 2', 'C', '1117 Oak Valley Rd', 'completed', 3200.00, 'Completed 2024-12'),
  ('lot-mi-040', 'dev-mi-002', '10', 'Phase 2', 'C', '1119 Oak Valley Rd', 'under_construction', 2400.00, 'Est completion 2025-03'),
  ('lot-mi-041', 'dev-mi-002', '11', 'Phase 2', 'C', '1121 Oak Valley Rd', 'sold', 2800.00, 'Starting construction 2025-03'),
  ('lot-mi-042', 'dev-mi-002', '12', 'Phase 2', 'C', '1123 Oak Valley Rd', 'sold', 3000.00, 'Starting construction 2025-03'),
  ('lot-mi-043', 'dev-mi-002', '13', 'Phase 2', 'C', '1125 Oak Valley Rd', 'available', 2600.00, NULL),
  ('lot-mi-044', 'dev-mi-002', '14', 'Phase 2', 'D', '1127 Oak Valley Rd', 'available', 3200.00, NULL),
  ('lot-mi-045', 'dev-mi-002', '15', 'Phase 2', 'D', '1129 Oak Valley Rd', 'available', 2400.00, NULL),
  ('lot-mi-046', 'dev-mi-002', '16', 'Phase 2', 'D', '1131 Oak Valley Rd', 'available', 2800.00, NULL),
  ('lot-mi-047', 'dev-mi-002', '17', 'Phase 2', 'D', '1133 Oak Valley Rd', 'available', 3000.00, NULL),
  ('lot-mi-048', 'dev-mi-002', '18', 'Phase 2', 'D', '1135 Oak Valley Rd', 'available', 2600.00, NULL),
  ('lot-mi-049', 'dev-mi-002', '19', 'Phase 3', 'E', '1137 Oak Valley Rd', 'available', 3200.00, NULL),
  ('lot-mi-050', 'dev-mi-002', '20', 'Phase 3', 'E', '1139 Oak Valley Rd', 'available', 2400.00, NULL),
  ('lot-mi-051', 'dev-mi-002', '21', 'Phase 3', 'E', '1141 Oak Valley Rd', 'available', 2800.00, NULL),
  ('lot-mi-052', 'dev-mi-002', '22', 'Phase 3', 'E', '1143 Oak Valley Rd', 'available', 3000.00, NULL),
  ('lot-mi-053', 'dev-mi-002', '23', 'Phase 3', 'E', '1145 Oak Valley Rd', 'available', 2600.00, NULL),
  ('lot-mi-054', 'dev-mi-002', '24', 'Phase 3', 'E', '1147 Oak Valley Rd', 'available', 3200.00, NULL),
  ('lot-mi-055', 'dev-mi-002', '25', 'Phase 3', 'E', '1149 Oak Valley Rd', 'available', 2400.00, NULL);

-- M/I Homes Lots - Cedar Creek (18 lots, all planning)
INSERT INTO lots (
  id, development_id, lot_number, phase, status, square_footage
) VALUES
  ('lot-mi-056', 'dev-mi-003', '1', 'Phase 1', 'available', 2200.00),
  ('lot-mi-057', 'dev-mi-003', '2', 'Phase 1', 'available', 2400.00),
  ('lot-mi-058', 'dev-mi-003', '3', 'Phase 1', 'available', 2600.00),
  ('lot-mi-059', 'dev-mi-003', '4', 'Phase 1', 'available', 2200.00),
  ('lot-mi-060', 'dev-mi-003', '5', 'Phase 1', 'available', 2800.00),
  ('lot-mi-061', 'dev-mi-003', '6', 'Phase 1', 'available', 2400.00),
  ('lot-mi-062', 'dev-mi-003', '7', 'Phase 2', 'available', 2600.00),
  ('lot-mi-063', 'dev-mi-003', '8', 'Phase 2', 'available', 2200.00),
  ('lot-mi-064', 'dev-mi-003', '9', 'Phase 2', 'available', 2800.00),
  ('lot-mi-065', 'dev-mi-003', '10', 'Phase 2', 'available', 2400.00),
  ('lot-mi-066', 'dev-mi-003', '11', 'Phase 2', 'available', 2600.00),
  ('lot-mi-067', 'dev-mi-003', '12', 'Phase 2', 'available', 2200.00),
  ('lot-mi-068', 'dev-mi-003', '13', 'Phase 3', 'available', 2400.00),
  ('lot-mi-069', 'dev-mi-003', '14', 'Phase 3', 'available', 2800.00),
  ('lot-mi-070', 'dev-mi-003', '15', 'Phase 3', 'available', 2600.00),
  ('lot-mi-071', 'dev-mi-003', '16', 'Phase 3', 'available', 2200.00),
  ('lot-mi-072', 'dev-mi-003', '17', 'Phase 3', 'available', 2400.00),
  ('lot-mi-073', 'dev-mi-003', '18', 'Phase 3', 'available', 2800.00);

-- M/I Homes Agreements
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-mi-001',
    'builder-mi-homes',
    'Master Service Agreement 2025',
    '2025-01-01',
    '2025-12-31',
    'active',
    350.00,
    'Net 30',
    ARRAY['pre_drywall', 'final', 'final_special'],
    'Volume pricing: $350 pre-drywall, $450 final. Guaranteed 7-day turnaround on reports.'
  ),
  (
    'agr-mi-002',
    'builder-mi-homes',
    'ENERGY STAR Program Agreement',
    '2024-07-01',
    '2026-06-30',
    'active',
    400.00,
    'Net 30',
    ARRAY['final'],
    'ENERGY STAR certification inspections. Includes HERS rating and blower door testing.'
  );

-- M/I Homes Programs
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  expiration_date, status, certification_number, notes
) VALUES
  (
    'prog-mi-001',
    'builder-mi-homes',
    'ENERGY STAR Certified Homes Version 3.2',
    'energy_star',
    '2024-07-01',
    '2026-06-30',
    'active',
    'ES-MN-2024-1001',
    'All homes in Maple Ridge and Oak Valley. Requires HERS rating ≤ 50.'
  ),
  (
    'prog-mi-002',
    'builder-mi-homes',
    'IRS 45L Tax Credit',
    'tax_credit',
    '2025-01-01',
    NULL,
    'active',
    '45L-2025-MN-1001',
    'Eligible homes receive $2,500 tax credit. Certification required for all qualifying units.'
  ),
  (
    'prog-mi-003',
    'builder-mi-homes',
    'Xcel Energy Conservation Improvement Program',
    'utility_rebate',
    '2024-04-01',
    '2025-12-31',
    'active',
    'XCEL-CIP-2024-1001',
    '$1,500 rebate per home. Requires blower door ≤ 2.5 ACH50.'
  );

-- M/I Homes Interactions
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  -- Get first available user for created_by
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- If no users exist, create a test user
  IF v_user_id IS NULL THEN
    INSERT INTO users (id, email, first_name, last_name, role)
    VALUES ('seed-user-001', 'admin@example.com', 'Admin', 'User', 'admin')
    ON CONFLICT (id) DO NOTHING;
    v_user_id := 'seed-user-001';
  END IF;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-mi-001',
      'builder-mi-homes',
      'phone',
      'Inspection schedule for Maple Ridge Phase 2',
      'Discussed upcoming inspections for lots 201-205. Tom confirmed all homes will be ready for pre-drywall inspections week of Jan 13.',
      NOW() - INTERVAL '5 days',
      'contact-mi-001',
      'Scheduled 5 inspections',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-mi-002',
      'builder-mi-homes',
      'email',
      'Energy Star documentation',
      'Sent updated Energy Star checklist requirements. Jennifer acknowledged receipt and will distribute to PMs.',
      NOW() - INTERVAL '12 days',
      'contact-mi-004',
      'Documentation sent',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-mi-003',
      'builder-mi-homes',
      'site_visit',
      'Oak Valley walkthrough',
      'Walked Oak Valley development with Sarah. Reviewed construction quality on completed homes. Discussed minor air sealing improvements for upcoming lots.',
      NOW() - INTERVAL '20 days',
      'contact-mi-002',
      'Quality review complete',
      true,
      NOW() + INTERVAL '30 days',
      v_user_id
    ),
    (
      'int-mi-004',
      'builder-mi-homes',
      'meeting',
      '2025 pricing and contract renewal',
      'Met with David to discuss 2025 contract renewal. Agreed on volume pricing structure and 7-day turnaround guarantee.',
      NOW() - INTERVAL '45 days',
      'contact-mi-005',
      'Contract renewed',
      false,
      NULL,
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 2: Lennar Homes - Mid-Size Builder
-- ================================================
-- Profile: Mid-size production builder, 200 homes/year
-- Features:
--   - 2 developments (Woodland Hills: 18 lots, Prairie View: 12 lots = 30 total)
--   - Active agreement expiring in 45 days (WARNING threshold)
--   - 3 contacts
--   - 1 active program
--   - Total jobs: 124
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-lennar',
  'Lennar Homes',
  'Lennar Corporation - Twin Cities Division',
  'info@lennar.builders-seed.com',
  '952-555-2001',
  '10000 Viking Drive, Suite 100, Eden Prairie, MN 55344',
  'Production Builder',
  4,
  124,
  'Reliable mid-volume builder. Good communication. Prefers 5-day lead time.',
  'high',
  'Net 30',
  5,
  ARRAY['Lennar', 'LH', 'LHomes']
);

-- Lennar Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-lennar-001',
    'builder-lennar',
    'Mark Johnson',
    'superintendent',
    'mark.johnson@lennar.builders-seed.com',
    '952-555-2002',
    '612-555-2002',
    true,
    'phone',
    'Primary contact. Manages both developments. Available 6am-4pm.'
  ),
  (
    'contact-lennar-002',
    'builder-lennar',
    'Lisa Martinez',
    'project_manager',
    'lisa.martinez@lennar.builders-seed.com',
    '952-555-2003',
    '612-555-2003',
    false,
    'email',
    'Handles scheduling and permitting. Email preferred for non-urgent matters.'
  ),
  (
    'contact-lennar-003',
    'builder-lennar',
    'Robert Davis',
    'owner',
    'robert.davis@lennar.builders-seed.com',
    '952-555-2001',
    NULL,
    false,
    'email',
    'Division President. Contact only for contract issues.'
  );

-- Lennar Developments
INSERT INTO developments (
  id, builder_id, name, region, municipality, address,
  status, total_lots, completed_lots, start_date, target_completion_date, notes
) VALUES
  (
    'dev-lennar-001',
    'builder-lennar',
    'Woodland Hills',
    'Southwest Metro',
    'Chanhassen',
    'Woodland Hills Blvd, Chanhassen, MN 55317',
    'active',
    18,
    7,
    '2024-03-01',
    '2026-04-30',
    'Family-friendly community. 1800-2400 sq ft homes. Near schools and parks.'
  ),
  (
    'dev-lennar-002',
    'builder-lennar',
    'Prairie View',
    'South Metro',
    'Lakeville',
    'Prairie View Drive, Lakeville, MN 55044',
    'active',
    12,
    3,
    '2024-08-01',
    '2026-10-31',
    'New development. Rambler and 2-story models. City utilities.'
  );

-- Lennar Lots - Woodland Hills (18 lots)
INSERT INTO lots (
  id, development_id, lot_number, phase, block, street_address,
  status, square_footage, notes
) VALUES
  ('lot-lennar-001', 'dev-lennar-001', '1', 'Phase 1', 'A', '2101 Woodland Hills Blvd', 'completed', 1800.00, 'Completed 2024-07'),
  ('lot-lennar-002', 'dev-lennar-001', '2', 'Phase 1', 'A', '2103 Woodland Hills Blvd', 'completed', 2000.00, 'Completed 2024-08'),
  ('lot-lennar-003', 'dev-lennar-001', '3', 'Phase 1', 'A', '2105 Woodland Hills Blvd', 'completed', 2200.00, 'Completed 2024-09'),
  ('lot-lennar-004', 'dev-lennar-001', '4', 'Phase 1', 'A', '2107 Woodland Hills Blvd', 'completed', 1800.00, 'Completed 2024-10'),
  ('lot-lennar-005', 'dev-lennar-001', '5', 'Phase 1', 'A', '2109 Woodland Hills Blvd', 'under_construction', 2400.00, 'Est completion 2025-02'),
  ('lot-lennar-006', 'dev-lennar-001', '6', 'Phase 1', 'B', '2111 Woodland Hills Blvd', 'under_construction', 2000.00, 'Est completion 2025-03'),
  ('lot-lennar-007', 'dev-lennar-001', '7', 'Phase 1', 'B', '2113 Woodland Hills Blvd', 'sold', 2200.00, 'Starting construction 2025-02'),
  ('lot-lennar-008', 'dev-lennar-001', '8', 'Phase 1', 'B', '2115 Woodland Hills Blvd', 'sold', 1800.00, 'Starting construction 2025-02'),
  ('lot-lennar-009', 'dev-lennar-001', '9', 'Phase 1', 'B', '2117 Woodland Hills Blvd', 'sold', 2400.00, 'Starting construction 2025-03'),
  ('lot-lennar-010', 'dev-lennar-001', '10', 'Phase 2', 'C', '2119 Woodland Hills Blvd', 'completed', 2000.00, 'Completed 2024-11'),
  ('lot-lennar-011', 'dev-lennar-001', '11', 'Phase 2', 'C', '2121 Woodland Hills Blvd', 'completed', 2200.00, 'Completed 2024-12'),
  ('lot-lennar-012', 'dev-lennar-001', '12', 'Phase 2', 'C', '2123 Woodland Hills Blvd', 'under_construction', 1800.00, 'Est completion 2025-03'),
  ('lot-lennar-013', 'dev-lennar-001', '13', 'Phase 2', 'C', '2125 Woodland Hills Blvd', 'sold', 2400.00, 'Starting construction 2025-03'),
  ('lot-lennar-014', 'dev-lennar-001', '14', 'Phase 2', 'C', '2127 Woodland Hills Blvd', 'available', 2000.00, NULL),
  ('lot-lennar-015', 'dev-lennar-001', '15', 'Phase 2', 'D', '2129 Woodland Hills Blvd', 'available', 2200.00, NULL),
  ('lot-lennar-016', 'dev-lennar-001', '16', 'Phase 2', 'D', '2131 Woodland Hills Blvd', 'available', 1800.00, NULL),
  ('lot-lennar-017', 'dev-lennar-001', '17', 'Phase 2', 'D', '2133 Woodland Hills Blvd', 'available', 2400.00, NULL),
  ('lot-lennar-018', 'dev-lennar-001', '18', 'Phase 2', 'D', '2135 Woodland Hills Blvd', 'available', 2000.00, NULL);

-- Lennar Lots - Prairie View (12 lots)
INSERT INTO lots (
  id, development_id, lot_number, phase, block, street_address,
  status, square_footage, notes
) VALUES
  ('lot-lennar-019', 'dev-lennar-002', '101', 'Phase 1', 'A', '3201 Prairie View Dr', 'completed', 1800.00, 'Completed 2024-11'),
  ('lot-lennar-020', 'dev-lennar-002', '102', 'Phase 1', 'A', '3203 Prairie View Dr', 'completed', 2000.00, 'Completed 2024-12'),
  ('lot-lennar-021', 'dev-lennar-002', '103', 'Phase 1', 'A', '3205 Prairie View Dr', 'under_construction', 2200.00, 'Est completion 2025-02'),
  ('lot-lennar-022', 'dev-lennar-002', '104', 'Phase 1', 'A', '3207 Prairie View Dr', 'sold', 1800.00, 'Starting construction 2025-02'),
  ('lot-lennar-023', 'dev-lennar-002', '105', 'Phase 1', 'A', '3209 Prairie View Dr', 'sold', 2000.00, 'Starting construction 2025-03'),
  ('lot-lennar-024', 'dev-lennar-002', '106', 'Phase 1', 'B', '3211 Prairie View Dr', 'available', 2200.00, NULL),
  ('lot-lennar-025', 'dev-lennar-002', '107', 'Phase 1', 'B', '3213 Prairie View Dr', 'completed', 1800.00, 'Completed 2025-01'),
  ('lot-lennar-026', 'dev-lennar-002', '108', 'Phase 1', 'B', '3215 Prairie View Dr', 'available', 2000.00, NULL),
  ('lot-lennar-027', 'dev-lennar-002', '109', 'Phase 1', 'B', '3217 Prairie View Dr', 'available', 2200.00, NULL),
  ('lot-lennar-028', 'dev-lennar-002', '110', 'Phase 1', 'B', '3219 Prairie View Dr', 'available', 1800.00, NULL),
  ('lot-lennar-029', 'dev-lennar-002', '111', 'Phase 1', 'B', '3221 Prairie View Dr', 'available', 2000.00, NULL),
  ('lot-lennar-030', 'dev-lennar-002', '112', 'Phase 1', 'B', '3223 Prairie View Dr', 'available', 2200.00, NULL);

-- Lennar Agreement (WARNING - expires in 45 days)
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-lennar-001',
    'builder-lennar',
    'Annual Service Agreement 2024-2025',
    '2024-03-15',
    NOW() + INTERVAL '45 days',  -- WARNING threshold (30-60 days)
    'active',
    325.00,
    'Net 30',
    ARRAY['pre_drywall', 'final'],
    'WARNING: Agreement expires in 45 days. Need to schedule renewal meeting with Robert Davis.'
  );

-- Lennar Program
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  expiration_date, status, certification_number, notes
) VALUES
  (
    'prog-lennar-001',
    'builder-lennar',
    'Minnesota Energy Code 2020 IRC',
    'certification',
    '2024-03-01',
    NULL,
    'active',
    'IRC-2020-MN-2001',
    'All homes comply with 2020 IRC energy requirements. ACH50 ≤ 3.0 required.'
  );

-- Lennar Interactions
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-lennar-001',
      'builder-lennar',
      'phone',
      'Agreement renewal discussion',
      'Called Mark to discuss upcoming agreement expiration. He will coordinate meeting with Robert for contract renewal.',
      NOW() - INTERVAL '3 days',
      'contact-lennar-001',
      'Meeting scheduled',
      true,
      NOW() + INTERVAL '7 days',
      v_user_id
    ),
    (
      'int-lennar-002',
      'builder-lennar',
      'email',
      'Prairie View inspection schedule',
      'Coordinated with Lisa for upcoming inspections. 3 pre-drywall inspections needed week of Feb 3.',
      NOW() - INTERVAL '10 days',
      'contact-lennar-002',
      'Inspections scheduled',
      false,
      NULL,
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 3: Restore Builder - Small Custom Builder
-- ================================================
-- Profile: Small custom home builder, 15-20 homes/year
-- Features:
--   - 1 small development (10 lots)
--   - Expired agreement (needs renewal)
--   - 2 contacts
--   - No active programs
--   - Low volume tier
--   - Total jobs: 47
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-restore',
  'Restore Builder',
  'Restore Custom Homes LLC',
  'info@restore.builders-seed.com',
  '651-555-3001',
  '450 Main Street, Stillwater, MN 55082',
  'Custom Homes',
  4,
  47,
  'Small custom builder. High-end finishes. Slower pace, excellent craftsmanship.',
  'low',
  'Due on completion',
  10,
  ARRAY['Restore', 'RCH', 'Restore Custom']
);

-- Restore Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-restore-001',
    'builder-restore',
    'James Anderson',
    'owner',
    'james@restore.builders-seed.com',
    '651-555-3001',
    '651-555-3002',
    true,
    'phone',
    'Owner/operator. Handles all aspects of business. Prefers phone calls over email.'
  ),
  (
    'contact-restore-002',
    'builder-restore',
    'Emily Wilson',
    'office_manager',
    'emily@restore.builders-seed.com',
    '651-555-3003',
    NULL,
    false,
    'email',
    'Part-time office manager. Handles scheduling and invoicing. Works Mon/Wed/Fri.'
  );

-- Restore Development
INSERT INTO developments (
  id, builder_id, name, region, municipality, address,
  status, total_lots, completed_lots, start_date, target_completion_date, notes
) VALUES
  (
    'dev-restore-001',
    'builder-restore',
    'Heritage Oaks',
    'East Metro',
    'Stillwater',
    'Heritage Oaks Circle, Stillwater, MN 55082',
    'active',
    10,
    4,
    '2023-05-01',
    '2026-12-31',
    'Upscale custom homes. 2800-3500 sq ft. Wooded lots near St Croix River.'
  );

-- Restore Lots (10 total)
INSERT INTO lots (
  id, development_id, lot_number, phase, street_address,
  status, square_footage, notes
) VALUES
  ('lot-restore-001', 'dev-restore-001', '1', 'Phase 1', '101 Heritage Oaks Circle', 'completed', 3200.00, 'Completed 2024-03'),
  ('lot-restore-002', 'dev-restore-001', '2', 'Phase 1', '102 Heritage Oaks Circle', 'completed', 2800.00, 'Completed 2024-06'),
  ('lot-restore-003', 'dev-restore-001', '3', 'Phase 1', '103 Heritage Oaks Circle', 'completed', 3500.00, 'Completed 2024-09'),
  ('lot-restore-004', 'dev-restore-001', '4', 'Phase 1', '104 Heritage Oaks Circle', 'completed', 3000.00, 'Completed 2024-12'),
  ('lot-restore-005', 'dev-restore-001', '5', 'Phase 1', '105 Heritage Oaks Circle', 'under_construction', 3200.00, 'Est completion 2025-04'),
  ('lot-restore-006', 'dev-restore-001', '6', 'Phase 2', '106 Heritage Oaks Circle', 'sold', 2800.00, 'Starting construction 2025-03'),
  ('lot-restore-007', 'dev-restore-001', '7', 'Phase 2', '107 Heritage Oaks Circle', 'sold', 3500.00, 'Starting construction 2025-05'),
  ('lot-restore-008', 'dev-restore-001', '8', 'Phase 2', '108 Heritage Oaks Circle', 'available', 3000.00, NULL),
  ('lot-restore-009', 'dev-restore-001', '9', 'Phase 2', '109 Heritage Oaks Circle', 'available', 3200.00, NULL),
  ('lot-restore-010', 'dev-restore-001', '10', 'Phase 2', '110 Heritage Oaks Circle', 'available', 2800.00, NULL);

-- Restore Agreement (EXPIRED - needs renewal)
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-restore-001',
    'builder-restore',
    'Service Agreement 2024',
    '2024-01-01',
    '2024-12-31',
    'expired',
    300.00,
    'Due on completion',
    ARRAY['pre_drywall', 'final'],
    'EXPIRED: Agreement expired Dec 31, 2024. Need to contact James for renewal. Working on verbal agreement currently.'
  );

-- Restore Interactions
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-restore-001',
      'builder-restore',
      'phone',
      'Agreement renewal needed',
      'Left voicemail for James about expired contract. Need to schedule meeting to discuss 2025 agreement.',
      NOW() - INTERVAL '8 days',
      'contact-restore-001',
      'No answer - left voicemail',
      true,
      NOW() + INTERVAL '2 days',
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 4: Summit Builders - Expiring Agreement (CRITICAL)
-- ================================================
-- Profile: Medium builder with CRITICAL agreement expiration
-- Features:
--   - Agreement expiring in 15 days (CRITICAL threshold)
--   - 1 development (15 lots)
--   - Multiple programs enrolled
--   - Follow-up required urgently
--   - Total jobs: 89
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-summit',
  'Summit Builders',
  'Summit Custom Homes Inc',
  'info@summit.builders-seed.com',
  '763-555-4001',
  '12500 Central Ave NE, Blaine, MN 55434',
  'Production Builder',
  4,
  89,
  'Solid mid-size builder. Good quality. Agreement expiring soon - urgent renewal needed.',
  'medium',
  'Net 30',
  5,
  ARRAY['Summit', 'SCH', 'Summit Custom']
);

-- Summit Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-summit-001',
    'builder-summit',
    'Michael Thompson',
    'superintendent',
    'michael@summit.builders-seed.com',
    '763-555-4002',
    '612-555-4002',
    true,
    'phone',
    'Primary day-to-day contact. Handles all inspections and site coordination.'
  ),
  (
    'contact-summit-002',
    'builder-summit',
    'Patricia Brown',
    'owner',
    'patricia@summit.builders-seed.com',
    '763-555-4001',
    '612-555-4001',
    false,
    'email',
    'Owner. Contact for contract renewals and business decisions. URGENT: Need to meet for contract renewal.'
  );

-- Summit Development
INSERT INTO developments (
  id, builder_id, name, region, municipality, address,
  status, total_lots, completed_lots, start_date, notes
) VALUES
  (
    'dev-summit-001',
    'builder-summit',
    'River Bend',
    'North Metro',
    'Blaine',
    'River Bend Parkway, Blaine, MN 55434',
    'active',
    15,
    6,
    '2024-02-01',
    'Active development. 2000-2600 sq ft homes. Near riverfront park.'
  );

-- Summit Lots (15 total)
INSERT INTO lots (
  id, development_id, lot_number, street_address, status, square_footage
) VALUES
  ('lot-summit-001', 'dev-summit-001', '1', '801 River Bend Pkwy', 'completed', 2000.00),
  ('lot-summit-002', 'dev-summit-001', '2', '803 River Bend Pkwy', 'completed', 2200.00),
  ('lot-summit-003', 'dev-summit-001', '3', '805 River Bend Pkwy', 'completed', 2400.00),
  ('lot-summit-004', 'dev-summit-001', '4', '807 River Bend Pkwy', 'completed', 2600.00),
  ('lot-summit-005', 'dev-summit-001', '5', '809 River Bend Pkwy', 'completed', 2000.00),
  ('lot-summit-006', 'dev-summit-001', '6', '811 River Bend Pkwy', 'completed', 2200.00),
  ('lot-summit-007', 'dev-summit-001', '7', '813 River Bend Pkwy', 'under_construction', 2400.00),
  ('lot-summit-008', 'dev-summit-001', '8', '815 River Bend Pkwy', 'under_construction', 2600.00),
  ('lot-summit-009', 'dev-summit-001', '9', '817 River Bend Pkwy', 'sold', 2000.00),
  ('lot-summit-010', 'dev-summit-001', '10', '819 River Bend Pkwy', 'sold', 2200.00),
  ('lot-summit-011', 'dev-summit-001', '11', '821 River Bend Pkwy', 'available', 2400.00),
  ('lot-summit-012', 'dev-summit-001', '12', '823 River Bend Pkwy', 'available', 2600.00),
  ('lot-summit-013', 'dev-summit-001', '13', '825 River Bend Pkwy', 'available', 2000.00),
  ('lot-summit-014', 'dev-summit-001', '14', '827 River Bend Pkwy', 'available', 2200.00),
  ('lot-summit-015', 'dev-summit-001', '15', '829 River Bend Pkwy', 'available', 2400.00);

-- Summit Agreement (CRITICAL - expires in 15 days)
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-summit-001',
    'builder-summit',
    'Master Agreement 2024-2025',
    '2024-02-15',
    NOW() + INTERVAL '15 days',  -- CRITICAL threshold (<30 days)
    'active',
    325.00,
    'Net 30',
    ARRAY['pre_drywall', 'final'],
    'CRITICAL: Agreement expires in 15 days! Urgent meeting needed with Patricia to renew.'
  );

-- Summit Programs (multiple enrollments)
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  expiration_date, status, certification_number, notes
) VALUES
  (
    'prog-summit-001',
    'builder-summit',
    'ENERGY STAR Certified Homes Version 3.1',
    'energy_star',
    '2024-02-01',
    '2026-01-31',
    'active',
    'ES-MN-2024-4001',
    'All River Bend homes. Version 3.1 requirements.'
  ),
  (
    'prog-summit-002',
    'builder-summit',
    'CenterPoint Energy Rebate Program',
    'utility_rebate',
    '2024-02-01',
    '2025-12-31',
    'active',
    'CPE-2024-4001',
    '$1,000 rebate per home. Requires blower door ≤ 2.8 ACH50.'
  );

-- Summit Interactions (showing urgency)
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-summit-001',
      'builder-summit',
      'phone',
      'URGENT: Contract renewal',
      'Called Patricia about contract expiring in 15 days. She is reviewing terms and will respond by end of week.',
      NOW() - INTERVAL '2 days',
      'contact-summit-002',
      'Awaiting response',
      true,
      NOW() + INTERVAL '3 days',
      v_user_id
    ),
    (
      'int-summit-002',
      'builder-summit',
      'email',
      'Contract renewal proposal sent',
      'Sent 2025 contract proposal to Patricia. Included volume pricing and program incentives.',
      NOW() - INTERVAL '5 days',
      'contact-summit-002',
      'Proposal sent',
      true,
      NOW() + INTERVAL '3 days',
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 5: New Horizon Homes - New Builder Onboarding
-- ================================================
-- Profile: Brand new builder, just starting relationship
-- Features:
--   - No developments yet
--   - 1 contact (owner only)
--   - No active agreements (pending)
--   - No programs
--   - Total jobs: 0
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-newhorizon',
  'New Horizon Homes',
  'New Horizon Custom Builders LLC',
  'info@newhorizon.builders-seed.com',
  '952-555-5001',
  '8200 Penn Ave S, Bloomington, MN 55431',
  'Custom Homes',
  NULL,  -- No rating yet
  0,     -- No jobs yet
  'New builder. Just signed up. Planning first development in Shakopee. Projected 8-10 homes in 2025.',
  'low',
  'Due on completion',
  7,
  ARRAY['New Horizon', 'NH', 'NHH']
);

-- New Horizon Contact (owner only at this stage)
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-newhorizon-001',
    'builder-newhorizon',
    'Andrew Mitchell',
    'owner',
    'andrew@newhorizon.builders-seed.com',
    '952-555-5001',
    '612-555-5001',
    true,
    'phone',
    'New builder. First year in business. Previously worked for large production builder. Eager to establish good relationship.'
  );

-- New Horizon Agreement (pending)
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-newhorizon-001',
    'builder-newhorizon',
    'Initial Service Agreement 2025',
    NOW(),
    NOW() + INTERVAL '1 year',
    'pending',
    300.00,
    'Due on completion',
    ARRAY['pre_drywall', 'final'],
    'Pending signature. Sent to Andrew for review. Follow up next week.'
  );

-- New Horizon Interaction
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-newhorizon-001',
      'builder-newhorizon',
      'meeting',
      'Initial consultation',
      'Met with Andrew to discuss services and pricing. He is planning 8-10 homes in Shakopee starting March 2025. Sent contract for review.',
      NOW() - INTERVAL '7 days',
      'contact-newhorizon-001',
      'Contract sent',
      true,
      NOW() + INTERVAL '7 days',
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 6: Grand Homes - Complex Hierarchy
-- ================================================
-- Profile: Builder demonstrating full geographic hierarchy
-- Features:
--   - 2 developments in different phases (Lakeview Heights: 20 lots, Sunset Ridge: 12 lots planning = 32 total)
--   - Mix of lot statuses (available, sold, under_construction, completed)
--   - Various square footages
--   - Total jobs: 156
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-grand',
  'Grand Homes',
  'Grand Homes Minnesota Inc',
  'info@grand.builders-seed.com',
  '952-555-6001',
  '15200 Minnetonka Blvd, Minnetonka, MN 55345',
  'Production Builder',
  5,
  156,
  'Well-established builder. Multiple active developments. Excellent organization and communication.',
  'high',
  'Net 30',
  5,
  ARRAY['Grand', 'GH', 'Grand Homes']
);

-- Grand Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-grand-001',
    'builder-grand',
    'Steven Harris',
    'superintendent',
    'steven@grand.builders-seed.com',
    '952-555-6002',
    '612-555-6002',
    true,
    'phone',
    'Lead superintendent. Oversees all developments. Very organized.'
  ),
  (
    'contact-grand-002',
    'builder-grand',
    'Rachel Green',
    'project_manager',
    'rachel@grand.builders-seed.com',
    '952-555-6003',
    '612-555-6003',
    false,
    'email',
    'PM for Lakeview Heights. Handles permits and scheduling.'
  ),
  (
    'contact-grand-003',
    'builder-grand',
    'Daniel Lee',
    'estimator',
    'daniel@grand.builders-seed.com',
    '952-555-6004',
    NULL,
    false,
    'email',
    'Estimating and bidding. Provides cost projections.'
  );

-- Grand Developments
INSERT INTO developments (
  id, builder_id, name, region, municipality, address,
  status, total_lots, completed_lots, start_date, target_completion_date, notes
) VALUES
  (
    'dev-grand-001',
    'builder-grand',
    'Lakeview Heights',
    'West Metro',
    'Minnetonka',
    'Lakeview Heights Road, Minnetonka, MN 55345',
    'active',
    20,
    9,
    '2023-09-01',
    '2026-06-30',
    'Lakefront community. Premium pricing. 2200-3000 sq ft homes.'
  ),
  (
    'dev-grand-002',
    'builder-grand',
    'Sunset Ridge',
    'South Metro',
    'Apple Valley',
    'Sunset Ridge Boulevard, Apple Valley, MN 55124',
    'planning',
    12,
    0,
    '2025-04-01',
    '2027-08-31',
    'New development. Permitting in progress. Expected to break ground April 2025.'
  );

-- Grand Lots - Lakeview Heights (20 lots demonstrating complex hierarchy)
INSERT INTO lots (
  id, development_id, lot_number, phase, block, street_address,
  status, square_footage, notes
) VALUES
  ('lot-grand-001', 'dev-grand-001', '1', 'Phase 1', 'A', '4501 Lakeview Heights Rd', 'completed', 2200.00, 'Completed 2024-02'),
  ('lot-grand-002', 'dev-grand-001', '2', 'Phase 1', 'A', '4503 Lakeview Heights Rd', 'completed', 2400.00, 'Completed 2024-04'),
  ('lot-grand-003', 'dev-grand-001', '3', 'Phase 1', 'A', '4505 Lakeview Heights Rd', 'completed', 2600.00, 'Completed 2024-06'),
  ('lot-grand-004', 'dev-grand-001', '4', 'Phase 1', 'A', '4507 Lakeview Heights Rd', 'completed', 3000.00, 'Completed 2024-08'),
  ('lot-grand-005', 'dev-grand-001', '5', 'Phase 1', 'B', '4509 Lakeview Heights Rd', 'under_construction', 2200.00, 'Est completion 2025-03'),
  ('lot-grand-006', 'dev-grand-001', '6', 'Phase 1', 'B', '4511 Lakeview Heights Rd', 'under_construction', 2400.00, 'Est completion 2025-03'),
  ('lot-grand-007', 'dev-grand-001', '7', 'Phase 2', 'C', '4513 Lakeview Heights Rd', 'completed', 2600.00, 'Completed 2024-10'),
  ('lot-grand-008', 'dev-grand-001', '8', 'Phase 2', 'C', '4515 Lakeview Heights Rd', 'completed', 2800.00, 'Completed 2024-11'),
  ('lot-grand-009', 'dev-grand-001', '9', 'Phase 2', 'C', '4517 Lakeview Heights Rd', 'completed', 3000.00, 'Completed 2024-12'),
  ('lot-grand-010', 'dev-grand-001', '10', 'Phase 2', 'C', '4519 Lakeview Heights Rd', 'under_construction', 2200.00, 'Est completion 2025-04'),
  ('lot-grand-011', 'dev-grand-001', '11', 'Phase 2', 'D', '4521 Lakeview Heights Rd', 'sold', 2400.00, 'Starting construction 2025-03'),
  ('lot-grand-012', 'dev-grand-001', '12', 'Phase 2', 'D', '4523 Lakeview Heights Rd', 'sold', 2600.00, 'Starting construction 2025-04'),
  ('lot-grand-013', 'dev-grand-001', '13', 'Phase 2', 'D', '4525 Lakeview Heights Rd', 'sold', 2800.00, 'Starting construction 2025-04'),
  ('lot-grand-014', 'dev-grand-001', '14', 'Phase 3', 'E', '4527 Lakeview Heights Rd', 'sold', 3000.00, 'Starting construction 2025-05'),
  ('lot-grand-015', 'dev-grand-001', '15', 'Phase 3', 'E', '4529 Lakeview Heights Rd', 'sold', 2200.00, 'Starting construction 2025-06'),
  ('lot-grand-016', 'dev-grand-001', '16', 'Phase 3', 'E', '4531 Lakeview Heights Rd', 'available', 2400.00, NULL),
  ('lot-grand-017', 'dev-grand-001', '17', 'Phase 3', 'E', '4533 Lakeview Heights Rd', 'available', 2600.00, NULL),
  ('lot-grand-018', 'dev-grand-001', '18', 'Phase 3', 'F', '4535 Lakeview Heights Rd', 'available', 2800.00, NULL),
  ('lot-grand-019', 'dev-grand-001', '19', 'Phase 3', 'F', '4537 Lakeview Heights Rd', 'available', 3000.00, NULL),
  ('lot-grand-020', 'dev-grand-001', '20', 'Phase 3', 'F', '4539 Lakeview Heights Rd', 'available', 2200.00, NULL);

-- Grand Lots - Sunset Ridge (12 lots, all planning/available)
INSERT INTO lots (
  id, development_id, lot_number, phase, status, square_footage
) VALUES
  ('lot-grand-021', 'dev-grand-002', '101', 'Phase 1', 'available', 2400.00),
  ('lot-grand-022', 'dev-grand-002', '102', 'Phase 1', 'available', 2600.00),
  ('lot-grand-023', 'dev-grand-002', '103', 'Phase 1', 'available', 2800.00),
  ('lot-grand-024', 'dev-grand-002', '104', 'Phase 1', 'available', 2400.00),
  ('lot-grand-025', 'dev-grand-002', '105', 'Phase 1', 'available', 2600.00),
  ('lot-grand-026', 'dev-grand-002', '106', 'Phase 1', 'available', 2800.00),
  ('lot-grand-027', 'dev-grand-002', '107', 'Phase 2', 'available', 2400.00),
  ('lot-grand-028', 'dev-grand-002', '108', 'Phase 2', 'available', 2600.00),
  ('lot-grand-029', 'dev-grand-002', '109', 'Phase 2', 'available', 2800.00),
  ('lot-grand-030', 'dev-grand-002', '110', 'Phase 2', 'available', 2400.00),
  ('lot-grand-031', 'dev-grand-002', '111', 'Phase 2', 'available', 2600.00),
  ('lot-grand-032', 'dev-grand-002', '112', 'Phase 2', 'available', 2800.00);

-- Grand Agreement
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-grand-001',
    'builder-grand',
    'Annual Service Agreement 2025',
    '2025-01-01',
    '2025-12-31',
    'active',
    340.00,
    'Net 30',
    ARRAY['pre_drywall', 'final'],
    'Volume pricing. Excellent payment history. Auto-renew clause.'
  );

-- Grand Programs
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  status, notes
) VALUES
  (
    'prog-grand-001',
    'builder-grand',
    'Minnesota Energy Code 2020 IRC',
    'certification',
    '2023-09-01',
    'active',
    'All developments comply with 2020 IRC.'
  );

-- ================================================
-- SCENARIO 7: Meadowbrook Builders - Rich Interaction History
-- ================================================
-- Profile: Builder with extensive interaction log
-- Features:
--   - 12+ interactions
--   - Mix of interaction types (phone, email, site_visit, meeting, text)
--   - Multiple follow-ups
--   - Different contacts involved
--   - Total jobs: 98
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-meadowbrook',
  'Meadowbrook Builders',
  'Meadowbrook Construction LLC',
  'info@meadowbrook.builders-seed.com',
  '763-555-7001',
  '9800 Highway 10, Ramsey, MN 55303',
  'Production Builder',
  4,
  98,
  'Active communication. Frequent interactions. Good partnership.',
  'medium',
  'Net 30',
  5,
  ARRAY['Meadowbrook', 'MB', 'Meadow']
);

-- Meadowbrook Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-meadow-001',
    'builder-meadowbrook',
    'Chris Nelson',
    'superintendent',
    'chris@meadowbrook.builders-seed.com',
    '763-555-7002',
    '612-555-7002',
    true,
    'phone',
    'Day-to-day contact. Very responsive.'
  ),
  (
    'contact-meadow-002',
    'builder-meadowbrook',
    'Amanda Foster',
    'project_manager',
    'amanda@meadowbrook.builders-seed.com',
    '763-555-7003',
    '612-555-7003',
    false,
    'email',
    'Handles scheduling and logistics.'
  ),
  (
    'contact-meadow-003',
    'builder-meadowbrook',
    'Brian Carter',
    'owner',
    'brian@meadowbrook.builders-seed.com',
    '763-555-7001',
    NULL,
    false,
    'email',
    'Owner. Involved in quality discussions.'
  );

-- Meadowbrook Development
INSERT INTO developments (
  id, builder_id, name, region, municipality, status,
  total_lots, completed_lots, start_date, notes
) VALUES
  (
    'dev-meadow-001',
    'builder-meadowbrook',
    'Parkside Commons',
    'North Metro',
    'Ramsey',
    'active',
    16,
    7,
    '2024-01-15',
    'Active development. 2000-2400 sq ft homes.'
  );

-- Meadowbrook Lots (16 total)
INSERT INTO lots (
  id, development_id, lot_number, status, square_footage
) VALUES
  ('lot-meadow-001', 'dev-meadow-001', '1', 'completed', 2000.00),
  ('lot-meadow-002', 'dev-meadow-001', '2', 'completed', 2200.00),
  ('lot-meadow-003', 'dev-meadow-001', '3', 'completed', 2400.00),
  ('lot-meadow-004', 'dev-meadow-001', '4', 'completed', 2000.00),
  ('lot-meadow-005', 'dev-meadow-001', '5', 'completed', 2200.00),
  ('lot-meadow-006', 'dev-meadow-001', '6', 'completed', 2400.00),
  ('lot-meadow-007', 'dev-meadow-001', '7', 'completed', 2000.00),
  ('lot-meadow-008', 'dev-meadow-001', '8', 'under_construction', 2200.00),
  ('lot-meadow-009', 'dev-meadow-001', '9', 'under_construction', 2400.00),
  ('lot-meadow-010', 'dev-meadow-001', '10', 'sold', 2000.00),
  ('lot-meadow-011', 'dev-meadow-001', '11', 'sold', 2200.00),
  ('lot-meadow-012', 'dev-meadow-001', '12', 'available', 2400.00),
  ('lot-meadow-013', 'dev-meadow-001', '13', 'available', 2000.00),
  ('lot-meadow-014', 'dev-meadow-001', '14', 'available', 2200.00),
  ('lot-meadow-015', 'dev-meadow-001', '15', 'available', 2400.00),
  ('lot-meadow-016', 'dev-meadow-001', '16', 'available', 2000.00);

-- Meadowbrook Agreement
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included
) VALUES
  (
    'agr-meadow-001',
    'builder-meadowbrook',
    'Service Agreement 2025',
    '2025-01-01',
    '2025-12-31',
    'active',
    325.00,
    'Net 30',
    ARRAY['pre_drywall', 'final']
  );

-- Meadowbrook Programs
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  status, notes
) VALUES
  (
    'prog-meadow-001',
    'builder-meadowbrook',
    'Minnesota Energy Code 2020 IRC',
    'certification',
    '2024-01-01',
    'active',
    'Standard IRC compliance.'
  );

-- Meadowbrook Interactions (12+ showing rich history)
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    follow_up_date, created_by
  ) VALUES
    (
      'int-meadow-001',
      'builder-meadowbrook',
      'phone',
      'Weekly inspection schedule',
      'Coordinated with Chris for this week inspections. 3 pre-drywall scheduled for Tuesday.',
      NOW() - INTERVAL '2 days',
      'contact-meadow-001',
      'Inspections scheduled',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-002',
      'builder-meadowbrook',
      'email',
      'Invoice payment confirmation',
      'Received payment for December invoices. All caught up.',
      NOW() - INTERVAL '5 days',
      'contact-meadow-002',
      'Payment received',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-003',
      'builder-meadowbrook',
      'phone',
      'Blower door results discussion',
      'Discussed lot 8 blower door results with Chris. ACH50 = 3.1, just over limit. Recommended additional air sealing.',
      NOW() - INTERVAL '8 days',
      'contact-meadow-001',
      'Remediation scheduled',
      true,
      NOW() + INTERVAL '7 days',
      v_user_id
    ),
    (
      'int-meadow-004',
      'builder-meadowbrook',
      'site_visit',
      'Parkside Commons walkthrough',
      'Walked development with Chris and Amanda. Reviewed construction progress on lots 9-12. Quality looks good.',
      NOW() - INTERVAL '12 days',
      'contact-meadow-001',
      'Quality review complete',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-005',
      'builder-meadowbrook',
      'meeting',
      'Quarterly business review',
      'Met with Brian to review Q4 2024 performance. Discussed 2025 volume projections and pricing.',
      NOW() - INTERVAL '20 days',
      'contact-meadow-003',
      'Contract terms confirmed',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-006',
      'builder-meadowbrook',
      'email',
      'Updated checklist sent',
      'Sent revised RESNET checklist to Amanda. She will distribute to field crews.',
      NOW() - INTERVAL '25 days',
      'contact-meadow-002',
      'Documentation updated',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-007',
      'builder-meadowbrook',
      'phone',
      'Scheduling conflict resolution',
      'Called Chris to reschedule lot 7 final inspection due to weather delay. Moved to next week.',
      NOW() - INTERVAL '30 days',
      'contact-meadow-001',
      'Rescheduled',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-008',
      'builder-meadowbrook',
      'text',
      'Quick lot 6 question',
      'Chris texted asking if we could do lot 6 final tomorrow instead of Thursday. Confirmed yes.',
      NOW() - INTERVAL '35 days',
      'contact-meadow-001',
      'Schedule adjusted',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-009',
      'builder-meadowbrook',
      'site_visit',
      'Lot 5 quality concern follow-up',
      'Returned to lot 5 to verify air sealing improvements. Chris made corrections. Now passes.',
      NOW() - INTERVAL '42 days',
      'contact-meadow-001',
      'Issue resolved',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-010',
      'builder-meadowbrook',
      'email',
      'January inspection forecast',
      'Sent Amanda projected inspection count for January. She confirmed schedule works.',
      NOW() - INTERVAL '50 days',
      'contact-meadow-002',
      'Forecast confirmed',
      false,
      NULL,
      v_user_id
    ),
    (
      'int-meadow-011',
      'builder-meadowbrook',
      'phone',
      'Pre-construction meeting for Phase 2',
      'Discussed Phase 2 timeline with Chris. Expects to start in March 2025.',
      NOW() - INTERVAL '60 days',
      'contact-meadow-001',
      'Phase 2 planning',
      true,
      NOW() + INTERVAL '30 days',
      v_user_id
    ),
    (
      'int-meadow-012',
      'builder-meadowbrook',
      'meeting',
      'Annual contract review',
      'Met with Brian to finalize 2025 contract. Agreed on pricing and terms.',
      NOW() - INTERVAL '75 days',
      'contact-meadow-003',
      'Contract signed',
      false,
      NULL,
      v_user_id
    );
END $$;

-- ================================================
-- SCENARIO 8: Premier Quality Homes - Program-Heavy Builder
-- ================================================
-- Profile: Builder with extensive program enrollments
-- Features:
--   - 7 programs (6 active, 1 inactive)
--   - Different certification types (ENERGY STAR, LEED, PHIUS, ZERH, tax credit, utility rebates)
--   - Mix of active/inactive programs
--   - 2 agreements for different programs
--   - Total jobs: 203
-- ================================================

INSERT INTO builders (
  id, name, company_name, email, phone, address,
  trade_specialization, rating, total_jobs, notes,
  volume_tier, billing_terms, preferred_lead_time,
  abbreviations
) VALUES (
  'builder-premier',
  'Premier Quality Homes',
  'Premier Quality Custom Homes Inc',
  'info@premier.builders-seed.com',
  '952-555-8001',
  '18000 Excelsior Blvd, Minnetonka, MN 55345',
  'Production Builder',
  5,
  203,
  'Premium builder. Heavily involved in energy programs and certifications. Excellent reputation.',
  'premium',
  'Net 30',
  7,
  ARRAY['Premier', 'PQH', 'Premier Quality']
);

-- Premier Contacts
INSERT INTO builder_contacts (
  id, builder_id, name, role, email, phone, mobile_phone,
  is_primary, preferred_contact, notes
) VALUES
  (
    'contact-premier-001',
    'builder-premier',
    'William Anderson',
    'superintendent',
    'william@premier.builders-seed.com',
    '952-555-8002',
    '612-555-8002',
    true,
    'phone',
    'Lead superintendent. Expert in energy-efficient construction.'
  ),
  (
    'contact-premier-002',
    'builder-premier',
    'Margaret Thompson',
    'owner',
    'margaret@premier.builders-seed.com',
    '952-555-8001',
    '612-555-8001',
    false,
    'email',
    'Owner/CEO. Very involved in program compliance and certifications.'
  ),
  (
    'contact-premier-003',
    'builder-premier',
    'Jessica Miller',
    'office_manager',
    'jessica@premier.builders-seed.com',
    '952-555-8003',
    NULL,
    false,
    'email',
    'Handles all program documentation and certification paperwork.'
  );

-- Premier Development
INSERT INTO developments (
  id, builder_id, name, region, municipality, status,
  total_lots, completed_lots, start_date, notes
) VALUES
  (
    'dev-premier-001',
    'builder-premier',
    'Luxury Estates',
    'West Metro',
    'Minnetonka',
    'active',
    10,
    5,
    '2024-06-01',
    'Ultra-premium homes. All ENERGY STAR, LEED certified. 3500-5000 sq ft.'
  );

-- Premier Lots (10 total)
INSERT INTO lots (
  id, development_id, lot_number, status, square_footage
) VALUES
  ('lot-premier-001', 'dev-premier-001', '1', 'completed', 3500.00),
  ('lot-premier-002', 'dev-premier-001', '2', 'completed', 4000.00),
  ('lot-premier-003', 'dev-premier-001', '3', 'completed', 4500.00),
  ('lot-premier-004', 'dev-premier-001', '4', 'completed', 5000.00),
  ('lot-premier-005', 'dev-premier-001', '5', 'completed', 3500.00),
  ('lot-premier-006', 'dev-premier-001', '6', 'under_construction', 4000.00),
  ('lot-premier-007', 'dev-premier-001', '7', 'under_construction', 4500.00),
  ('lot-premier-008', 'dev-premier-001', '8', 'sold', 5000.00),
  ('lot-premier-009', 'dev-premier-001', '9', 'available', 3500.00),
  ('lot-premier-010', 'dev-premier-001', '10', 'available', 4000.00);

-- Premier Agreements (multiple for different programs)
INSERT INTO builder_agreements (
  id, builder_id, agreement_name, start_date, end_date, status,
  default_inspection_price, payment_terms, inspection_types_included, notes
) VALUES
  (
    'agr-premier-001',
    'builder-premier',
    'Master Service Agreement 2025',
    '2025-01-01',
    '2025-12-31',
    'active',
    400.00,
    'Net 30',
    ARRAY['pre_drywall', 'final', 'final_special'],
    'Premium pricing for comprehensive inspections and certifications.'
  ),
  (
    'agr-premier-002',
    'builder-premier',
    'LEED Certification Agreement',
    '2024-06-01',
    '2026-05-31',
    'active',
    450.00,
    'Net 30',
    ARRAY['final_special'],
    'Additional LEED documentation and verification. $450 per LEED inspection.'
  );

-- Premier Programs (7 total: 6 active, 1 inactive)
INSERT INTO builder_programs (
  id, builder_id, program_name, program_type, enrollment_date,
  expiration_date, status, certification_number, rebate_amount, notes
) VALUES
  (
    'prog-premier-001',
    'builder-premier',
    'ENERGY STAR Certified Homes Version 3.2',
    'energy_star',
    '2024-06-01',
    '2026-05-31',
    'active',
    'ES-MN-2024-8001',
    NULL,
    'All Luxury Estates homes. Version 3.2 with HERS rating ≤ 45.'
  ),
  (
    'prog-premier-002',
    'builder-premier',
    'IRS 45L Tax Credit',
    'tax_credit',
    '2024-06-01',
    NULL,
    'active',
    '45L-2024-MN-8001',
    2500.00,
    '$2,500 tax credit per qualifying home. All Luxury Estates qualify.'
  ),
  (
    'prog-premier-003',
    'builder-premier',
    'LEED for Homes Gold Certification',
    'certification',
    '2024-06-01',
    '2026-05-31',
    'active',
    'LEED-H-2024-8001',
    NULL,
    'All homes achieve LEED Gold minimum. Some targeting Platinum.'
  ),
  (
    'prog-premier-004',
    'builder-premier',
    'Xcel Energy Conservation Improvement Program',
    'utility_rebate',
    '2024-06-01',
    '2025-12-31',
    'active',
    'XCEL-CIP-2024-8001',
    2000.00,
    '$2,000 rebate per home. Premium tier for ACH50 ≤ 1.5.'
  ),
  (
    'prog-premier-005',
    'builder-premier',
    'Passive House Institute US (PHIUS)',
    'certification',
    '2024-06-01',
    NULL,
    'active',
    'PHIUS-2024-8001',
    NULL,
    'Lots 9-10 targeting PHIUS certification. Requires rigorous energy modeling.'
  ),
  (
    'prog-premier-006',
    'builder-premier',
    'DOE Zero Energy Ready Home',
    'certification',
    '2024-06-01',
    '2026-05-31',
    'active',
    'ZERH-2024-8001',
    NULL,
    'Lots 8-10 targeting Zero Energy Ready certification.'
  ),
  (
    'prog-premier-007',
    'builder-premier',
    'CenterPoint Energy Rebate Program',
    'utility_rebate',
    '2023-01-01',
    '2024-12-31',
    'inactive',
    'CPE-2023-8001',
    1500.00,
    'Previous program expired. Replaced by Xcel program in 2024.'
  );

-- Premier Interactions
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  SELECT id INTO v_user_id FROM users LIMIT 1;

  INSERT INTO builder_interactions (
    id, builder_id, interaction_type, subject, description,
    interaction_date, contact_id, outcome, follow_up_required,
    created_by
  ) VALUES
    (
      'int-premier-001',
      'builder-premier',
      'meeting',
      'LEED certification strategy',
      'Met with Margaret to discuss LEED Gold vs Platinum targets for lots 9-10. Reviewed point requirements.',
      NOW() - INTERVAL '15 days',
      'contact-premier-002',
      'Strategy confirmed',
      false,
      v_user_id
    ),
    (
      'int-premier-002',
      'builder-premier',
      'email',
      'PHIUS documentation requirements',
      'Sent Jessica updated PHIUS certification checklist and modeling requirements.',
      NOW() - INTERVAL '22 days',
      'contact-premier-003',
      'Documentation sent',
      false,
      v_user_id
    ),
    (
      'int-premier-003',
      'builder-premier',
      'phone',
      'Lot 6 blower door test coordination',
      'Coordinated with William for lot 6 blower door test. Targeting ACH50 ≤ 1.2 for PHIUS.',
      NOW() - INTERVAL '5 days',
      'contact-premier-001',
      'Test scheduled',
      true,
      v_user_id
    );
END $$;

COMMIT;

-- ================================================
-- SEED DATA SUMMARY
-- ================================================
-- Builders created: 8
--   - M/I Homes (premium, 287 jobs, 3 developments, 73 lots)
--   - Lennar Homes (high, 124 jobs, 2 developments, 30 lots, WARNING agreement)
--   - Restore Builder (low, 47 jobs, 1 development, 10 lots, EXPIRED agreement)
--   - Summit Builders (medium, 89 jobs, 1 development, 15 lots, CRITICAL agreement)
--   - New Horizon Homes (low, 0 jobs, onboarding, pending agreement)
--   - Grand Homes (high, 156 jobs, 2 developments, 32 lots, complex hierarchy)
--   - Meadowbrook Builders (medium, 98 jobs, 1 development, 16 lots, 12 interactions)
--   - Premier Quality Homes (premium, 203 jobs, 1 development, 10 lots, 7 programs)
--
-- Totals:
--   - 8 builders
--   - 12 developments
--   - 186 lots
--   - 20 contacts
--   - 10 agreements (6 active, 1 pending, 1 expired, 1 WARNING, 1 CRITICAL)
--   - 15 programs (14 active, 1 inactive)
--   - 28 interactions
--
-- Test coverage achieved:
--   ✓ All volume tiers (low, medium, high, premium)
--   ✓ All agreement statuses (active, pending, expired)
--   ✓ All expiration thresholds (CRITICAL <30d, WARNING 30-60d)
--   ✓ All contact roles (owner, superintendent, project_manager, estimator, office_manager)
--   ✓ All interaction types (phone, email, meeting, text, site_visit)
--   ✓ All lot statuses (available, sold, under_construction, completed)
--   ✓ All development statuses (planning, active)
--   ✓ Multiple municipalities (Minneapolis, St Paul, Minnetonka, Chanhassen, Lakeville, Stillwater, Blaine, Ramsey, Apple Valley)
--   ✓ Multiple program types (energy_star, tax_credit, utility_rebate, certification)
--   ✓ Calendar abbreviations for automated matching
--
-- Ready for production use
-- ================================================
