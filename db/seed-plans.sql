-- Plans Management - Seed Data
-- Purpose: Realistic floor plans for production and custom builders
-- Scenarios: 8 test cases covering various plan types and builder associations

-- ==============================================
-- SCENARIO 1: Production Builder Standard Plans (M/I Homes)
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-001', 'builder-001', 'Rambler 1600', 1600.00, 3800.00, 12800.00, 1.0, 'Single-story rambler with 3 bedrooms'),
  ('plan-002', 'builder-001', 'Rambler 1800', 1800.00, 4200.00, 14400.00, 1.0, 'Single-story rambler with 4 bedrooms, open concept'),
  ('plan-003', 'builder-001', 'Two-Story 2200', 2200.00, 5000.00, 35200.00, 2.0, 'Two-story colonial with 4 bedrooms, 2.5 baths'),
  ('plan-004', 'builder-001', 'Two-Story 2400', 2400.00, 5400.00, 38400.00, 2.0, 'Two-story with finished basement option');

-- ==============================================
-- SCENARIO 2: Production Builder Standard Plans (Pulte Homes)
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories)
VALUES
  ('plan-005', 'builder-002', 'Townhome 1650', 1650.00, 3900.00, 26400.00, 2.0),
  ('plan-006', 'builder-002', 'Townhome 1850', 1850.00, 4100.00, 29600.00, 2.0);

-- ==============================================
-- SCENARIO 3: Premium Builder Large Plans (Lennar)
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-007', 'builder-003', 'Executive 2800', 2800.00, 6200.00, 44800.00, 2.0, 'Executive two-story with 5 bedrooms, luxury finishes'),
  ('plan-008', 'builder-003', 'Executive 3200', 3200.00, 6800.00, 51200.00, 2.0, 'Premium plan with main floor master suite');

-- ==============================================
-- SCENARIO 4: Custom Builder Unique Plans (Johnson Custom Homes)
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-009', 'builder-004', 'Custom Lakeside Home', 3500.00, 7200.00, 56000.00, 2.0, 'Custom design with walkout basement and lake views'),
  ('plan-010', 'builder-004', 'Custom Modern Farmhouse', 2900.00, 6400.00, 46400.00, 2.0, 'Modern farmhouse with vaulted ceilings');

-- ==============================================
-- SCENARIO 5: Split-Entry Plans
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-011', 'builder-001', 'Split-Entry 2000', 2000.00, 4800.00, 24000.00, 1.5, 'Split-entry with finished lower level');

-- ==============================================
-- SCENARIO 6: Small Starter Home Plans
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-012', 'builder-002', 'Starter Home 1400', 1400.00, 3400.00, 11200.00, 1.0, 'Affordable starter home, 2 bedrooms');

-- ==============================================
-- SCENARIO 7: Large Estate Plans
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, surface_area, house_volume, stories, notes)
VALUES
  ('plan-013', 'builder-003', 'Estate 4500', 4500.00, 9200.00, 72000.00, 2.0, 'Luxury estate with 6 bedrooms, 4.5 baths, 4-car garage');

-- ==============================================
-- SCENARIO 8: Plan with Minimal Data (Testing)
-- ==============================================
INSERT INTO plans (id, builder_id, plan_name, floor_area, house_volume, stories)
VALUES
  ('plan-014', 'builder-001', 'Test Plan Minimal', 1500.00, 12000.00, 1.0);

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify plans created
SELECT 
  'Plans' as entity,
  COUNT(*) as total_plans,
  COUNT(*) FILTER (WHERE stories = 1.0) as single_story,
  COUNT(*) FILTER (WHERE stories = 1.5) as split_entry,
  COUNT(*) FILTER (WHERE stories = 2.0) as two_story,
  ROUND(AVG(floor_area::numeric), 2) as avg_floor_area,
  ROUND(AVG(house_volume::numeric), 2) as avg_house_volume
FROM plans
WHERE id LIKE 'plan-%';

-- Verify plans by builder
SELECT 
  'Plans by Builder' as entity,
  b.company_name as builder,
  COUNT(*) as plan_count,
  ROUND(AVG(p.floor_area::numeric), 2) as avg_floor_area
FROM plans p
JOIN builders b ON p.builder_id = b.id
WHERE p.id LIKE 'plan-%'
GROUP BY b.id, b.company_name
ORDER BY plan_count DESC;

-- Floor area distribution
SELECT 
  'Floor Area Distribution' as entity,
  CASE
    WHEN floor_area < 1500 THEN '<1,500 sq ft'
    WHEN floor_area < 2000 THEN '1,500-2,000 sq ft'
    WHEN floor_area < 2500 THEN '2,000-2,500 sq ft'
    WHEN floor_area < 3000 THEN '2,500-3,000 sq ft'
    ELSE '3,000+ sq ft'
  END as floor_area_range,
  COUNT(*) as plan_count
FROM plans
WHERE id LIKE 'plan-%'
GROUP BY 
  CASE
    WHEN floor_area < 1500 THEN '<1,500 sq ft'
    WHEN floor_area < 2000 THEN '1,500-2,000 sq ft'
    WHEN floor_area < 2500 THEN '2,000-2,500 sq ft'
    WHEN floor_area < 3000 THEN '2,500-3,000 sq ft'
    ELSE '3,000+ sq ft'
  END
ORDER BY MIN(floor_area);

-- Plans with specifications
SELECT 
  plan_name,
  floor_area,
  surface_area,
  house_volume,
  stories,
  ROUND((house_volume / NULLIF(floor_area, 0)), 2) as volume_per_sq_ft
FROM plans
WHERE id LIKE 'plan-%'
ORDER BY floor_area;
