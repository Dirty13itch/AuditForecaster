-- Report Templates Seed Data
-- Creates sample report templates, instances, and field values for testing and demonstration
-- Compatible with PostgreSQL + Drizzle ORM schema

-- Note: This script assumes a user with id 'dev-user' exists (from dev login)
-- Run after: npm run db:push

BEGIN;

-- ============================================================================
-- 1. Pre-Drywall Inspection Template
-- ============================================================================

INSERT INTO report_templates (id, name, description, category, version, status, is_active, components, layout, metadata, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Pre-Drywall Inspection',
  'RESNET-compliant pre-drywall inspection checklist for new construction',
  'pre_drywall',
  1,
  'published',
  true,
  '[
    {
      "id": "property_address",
      "type": "text",
      "label": "Property Address",
      "properties": { "required": true, "placeholder": "123 Main St, City, State ZIP" }
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Inspection Date",
      "properties": { "required": true }
    },
    {
      "id": "conditioned_floor_area",
      "type": "number",
      "label": "Conditioned Floor Area (sq ft)",
      "properties": { "required": true, "min": 0, "max": 50000 }
    },
    {
      "id": "insulation_grade",
      "type": "select",
      "label": "Insulation Installation Grade",
      "properties": {
        "required": true,
        "options": [
          { "value": "grade_1", "label": "Grade I - Excellent" },
          { "value": "grade_2", "label": "Grade II - Good" },
          { "value": "grade_3", "label": "Grade III - Acceptable" }
        ]
      }
    },
    {
      "id": "wall_insulation_r_value",
      "type": "number",
      "label": "Wall Insulation R-Value",
      "properties": { "required": true, "min": 0, "max": 100 }
    },
    {
      "id": "ceiling_insulation_r_value",
      "type": "number",
      "label": "Ceiling Insulation R-Value",
      "properties": { "required": true, "min": 0, "max": 100 }
    },
    {
      "id": "air_sealing_complete",
      "type": "checkbox",
      "label": "Air Sealing Complete",
      "properties": { "required": true }
    },
    {
      "id": "hvac_ducts_sealed",
      "type": "checkbox",
      "label": "HVAC Ducts Properly Sealed",
      "properties": { "required": true }
    },
    {
      "id": "notes",
      "type": "textarea",
      "label": "Inspection Notes",
      "properties": { "required": false, "placeholder": "Additional observations..." }
    }
  ]'::jsonb,
  '{ "columns": 2, "spacing": "medium" }'::jsonb,
  '{ "version": "1.0", "author": "RESNET", "lastModified": "2025-10-29" }'::jsonb,
  'dev-user',
  NOW(),
  NOW()
);

-- ============================================================================
-- 2. Final Inspection Template
-- ============================================================================

INSERT INTO report_templates (id, name, description, category, version, status, is_active, components, layout, metadata, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Final Energy Audit',
  'Comprehensive final energy audit for HERS rating certification',
  'final',
  1,
  'published',
  true,
  '[
    {
      "id": "property_address",
      "type": "text",
      "label": "Property Address",
      "properties": { "required": true }
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Final Inspection Date",
      "properties": { "required": true }
    },
    {
      "id": "hers_index_target",
      "type": "number",
      "label": "Target HERS Index",
      "properties": { "required": true, "min": 0, "max": 150 }
    },
    {
      "id": "hers_index_actual",
      "type": "number",
      "label": "Actual HERS Index",
      "properties": { "required": true, "min": 0, "max": 150 }
    },
    {
      "id": "blower_door_cfm50",
      "type": "number",
      "label": "Blower Door Result (CFM50)",
      "properties": { "required": true, "min": 0 }
    },
    {
      "id": "duct_leakage_total",
      "type": "number",
      "label": "Total Duct Leakage (CFM25)",
      "properties": { "required": true, "min": 0 }
    },
    {
      "id": "heating_system_type",
      "type": "select",
      "label": "Heating System Type",
      "properties": {
        "required": true,
        "options": [
          { "value": "furnace_gas", "label": "Gas Furnace" },
          { "value": "furnace_electric", "label": "Electric Furnace" },
          { "value": "heat_pump", "label": "Heat Pump" },
          { "value": "boiler", "label": "Boiler" }
        ]
      }
    },
    {
      "id": "cooling_system_afue",
      "type": "number",
      "label": "Cooling System SEER/AFUE",
      "properties": { "required": true, "min": 0, "max": 30 }
    },
    {
      "id": "ventilation_system",
      "type": "select",
      "label": "Ventilation System",
      "properties": {
        "required": true,
        "options": [
          { "value": "hrv", "label": "HRV - Heat Recovery Ventilator" },
          { "value": "erv", "label": "ERV - Energy Recovery Ventilator" },
          { "value": "exhaust_only", "label": "Exhaust Only" },
          { "value": "balanced", "label": "Balanced Ventilation" }
        ]
      }
    },
    {
      "id": "pass_fail",
      "type": "select",
      "label": "Overall Result",
      "properties": {
        "required": true,
        "options": [
          { "value": "pass", "label": "Pass" },
          { "value": "fail", "label": "Fail - Requires Remediation" },
          { "value": "conditional", "label": "Conditional Pass" }
        ]
      }
    },
    {
      "id": "final_notes",
      "type": "textarea",
      "label": "Final Notes & Recommendations",
      "properties": { "required": false }
    }
  ]'::jsonb,
  '{ "columns": 2, "spacing": "medium" }'::jsonb,
  '{ "version": "1.0", "critical": true }'::jsonb,
  'dev-user',
  NOW(),
  NOW()
);

-- ============================================================================
-- 3. HVAC Performance Test Template
-- ============================================================================

INSERT INTO report_templates (id, name, description, category, version, status, is_active, components, layout, metadata, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'HVAC Performance Test',
  'Detailed HVAC system performance testing and diagnostics',
  'energy_audit',
  1,
  'published',
  true,
  '[
    {
      "id": "test_date",
      "type": "date",
      "label": "Test Date",
      "properties": { "required": true }
    },
    {
      "id": "outdoor_temp",
      "type": "number",
      "label": "Outdoor Temperature (°F)",
      "properties": { "required": true, "min": -40, "max": 120 }
    },
    {
      "id": "indoor_temp",
      "type": "number",
      "label": "Indoor Temperature (°F)",
      "properties": { "required": true, "min": 50, "max": 90 }
    },
    {
      "id": "airflow_cfm",
      "type": "number",
      "label": "Total Airflow (CFM)",
      "properties": { "required": true, "min": 0 }
    },
    {
      "id": "static_pressure",
      "type": "number",
      "label": "Total External Static Pressure (in w.c.)",
      "properties": { "required": true, "min": 0, "max": 2 }
    },
    {
      "id": "supply_temp",
      "type": "number",
      "label": "Supply Air Temperature (°F)",
      "properties": { "required": true }
    },
    {
      "id": "return_temp",
      "type": "number",
      "label": "Return Air Temperature (°F)",
      "properties": { "required": true }
    },
    {
      "id": "temperature_split",
      "type": "number",
      "label": "Temperature Split (°F)",
      "properties": { "required": false }
    },
    {
      "id": "filter_condition",
      "type": "select",
      "label": "Filter Condition",
      "properties": {
        "required": true,
        "options": [
          { "value": "clean", "label": "Clean" },
          { "value": "dirty", "label": "Dirty - Needs Replacement" },
          { "value": "missing", "label": "Missing" }
        ]
      }
    },
    {
      "id": "performance_notes",
      "type": "textarea",
      "label": "Performance Notes",
      "properties": { "required": false }
    }
  ]'::jsonb,
  '{ "columns": 2, "spacing": "compact" }'::jsonb,
  '{ "version": "1.0" }'::jsonb,
  'dev-user',
  NOW(),
  NOW()
);

-- ============================================================================
-- 4. Insulation Verification Template
-- ============================================================================

INSERT INTO report_templates (id, name, description, category, version, status, is_active, components, layout, metadata, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Insulation Verification',
  'Thermal insulation installation quality verification',
  'post_insulation',
  1,
  'published',
  true,
  '[
    {
      "id": "location",
      "type": "text",
      "label": "Property Location",
      "properties": { "required": true }
    },
    {
      "id": "verification_date",
      "type": "date",
      "label": "Verification Date",
      "properties": { "required": true }
    },
    {
      "id": "attic_r_value",
      "type": "number",
      "label": "Attic Insulation R-Value",
      "properties": { "required": true, "min": 0, "max": 100 }
    },
    {
      "id": "wall_r_value",
      "type": "number",
      "label": "Wall Insulation R-Value",
      "properties": { "required": true, "min": 0, "max": 50 }
    },
    {
      "id": "foundation_r_value",
      "type": "number",
      "label": "Foundation/Basement R-Value",
      "properties": { "required": true, "min": 0, "max": 50 }
    },
    {
      "id": "gaps_or_voids",
      "type": "checkbox",
      "label": "Gaps or Voids Detected",
      "properties": { "required": true }
    },
    {
      "id": "compression_issues",
      "type": "checkbox",
      "label": "Compression Issues Found",
      "properties": { "required": true }
    },
    {
      "id": "installation_quality",
      "type": "select",
      "label": "Overall Installation Quality",
      "properties": {
        "required": true,
        "options": [
          { "value": "excellent", "label": "Excellent - Grade I" },
          { "value": "good", "label": "Good - Grade II" },
          { "value": "acceptable", "label": "Acceptable - Grade III" },
          { "value": "unacceptable", "label": "Unacceptable - Rework Required" }
        ]
      }
    },
    {
      "id": "remediation_notes",
      "type": "textarea",
      "label": "Remediation Notes (if applicable)",
      "properties": { "required": false }
    }
  ]'::jsonb,
  '{ "columns": 2, "spacing": "medium" }'::jsonb,
  '{ "version": "1.0", "climate_zone": 6 }'::jsonb,
  'dev-user',
  NOW(),
  NOW()
);

-- ============================================================================
-- 5. Air Sealing Checklist Template
-- ============================================================================

INSERT INTO report_templates (id, name, description, category, version, status, is_active, components, layout, metadata, created_by, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Air Sealing Checklist',
  'Comprehensive air sealing inspection for building envelope',
  'blower_door',
  1,
  'draft',
  true,
  '[
    {
      "id": "project_address",
      "type": "text",
      "label": "Project Address",
      "properties": { "required": true }
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Inspection Date",
      "properties": { "required": true }
    },
    {
      "id": "top_plates_sealed",
      "type": "checkbox",
      "label": "Top Plates Sealed",
      "properties": { "required": true }
    },
    {
      "id": "bottom_plates_sealed",
      "type": "checkbox",
      "label": "Bottom Plates/Sill Plate Sealed",
      "properties": { "required": true }
    },
    {
      "id": "rim_joists_sealed",
      "type": "checkbox",
      "label": "Rim Joists Sealed",
      "properties": { "required": true }
    },
    {
      "id": "electrical_penetrations",
      "type": "checkbox",
      "label": "Electrical Penetrations Sealed",
      "properties": { "required": true }
    },
    {
      "id": "plumbing_penetrations",
      "type": "checkbox",
      "label": "Plumbing Penetrations Sealed",
      "properties": { "required": true }
    },
    {
      "id": "hvac_penetrations",
      "type": "checkbox",
      "label": "HVAC Penetrations Sealed",
      "properties": { "required": true }
    },
    {
      "id": "windows_sealed",
      "type": "checkbox",
      "label": "Window Rough Openings Sealed",
      "properties": { "required": true }
    },
    {
      "id": "doors_sealed",
      "type": "checkbox",
      "label": "Door Rough Openings Sealed",
      "properties": { "required": true }
    },
    {
      "id": "attic_access_weatherstripped",
      "type": "checkbox",
      "label": "Attic Access Weatherstripped",
      "properties": { "required": true }
    },
    {
      "id": "recessed_lights_sealed",
      "type": "checkbox",
      "label": "Recessed Lights IC-Rated & Sealed",
      "properties": { "required": true }
    },
    {
      "id": "completion_percentage",
      "type": "number",
      "label": "Estimated Completion (%)",
      "properties": { "required": true, "min": 0, "max": 100 }
    },
    {
      "id": "deficiencies",
      "type": "textarea",
      "label": "Deficiencies Found",
      "properties": { "required": false, "placeholder": "List any air sealing deficiencies..." }
    }
  ]'::jsonb,
  '{ "columns": 2, "spacing": "compact" }'::jsonb,
  '{ "version": "1.0", "checklist_type": "pre_blower_door" }'::jsonb,
  'dev-user',
  NOW(),
  NOW()
);

COMMIT;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Uncomment to verify the seed data:
-- SELECT id, name, category, inspection_type, status, is_active,
--        jsonb_array_length(components) as component_count
-- FROM report_templates
-- ORDER BY created_at DESC
-- LIMIT 5;
