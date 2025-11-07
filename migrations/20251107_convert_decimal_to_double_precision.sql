-- Migration: Convert NUMERIC/DECIMAL columns to DOUBLE PRECISION
-- Created: 2025-11-07
-- Purpose: Fix TypeScript type mismatches between Drizzle schema (string) and application code (number)
-- 
-- IMPORTANT: This migration converts financial precision NUMERIC to DOUBLE PRECISION
-- For critical financial calculations, consider keeping NUMERIC and using string handling in code
-- or using a dedicated money library like dinero.js

-- Backup recommendation: Take a full database backup before running
-- Test recommendation: Run on staging/dev environment first

BEGIN;

-- ============================================================================
-- BUILDER AGREEMENTS & PROGRAMS
-- ============================================================================

ALTER TABLE builder_agreements
  ALTER COLUMN default_inspection_price TYPE DOUBLE PRECISION USING default_inspection_price::DOUBLE PRECISION;

ALTER TABLE builder_programs  
  ALTER COLUMN rebate_amount TYPE DOUBLE PRECISION USING rebate_amount::DOUBLE PRECISION;

-- ============================================================================
-- DEVELOPMENTS & LOTS
-- ============================================================================

ALTER TABLE developments
  ALTER COLUMN square_footage TYPE DOUBLE PRECISION USING square_footage::DOUBLE PRECISION;

ALTER TABLE lots
  ALTER COLUMN floor_area TYPE DOUBLE PRECISION USING floor_area::DOUBLE PRECISION,
  ALTER COLUMN surface_area TYPE DOUBLE PRECISION USING surface_area::DOUBLE PRECISION,
  ALTER COLUMN house_volume TYPE DOUBLE PRECISION USING house_volume::DOUBLE PRECISION,
  ALTER COLUMN stories TYPE DOUBLE PRECISION USING stories::DOUBLE PRECISION,
  ALTER COLUMN floor_area_delta TYPE DOUBLE PRECISION USING floor_area_delta::DOUBLE PRECISION,
  ALTER COLUMN volume_delta TYPE DOUBLE PRECISION USING volume_delta::DOUBLE PRECISION;

-- ============================================================================
-- PLANS & OPTIONAL FEATURES
-- ============================================================================

ALTER TABLE plans
  ALTER COLUMN pricing TYPE DOUBLE PRECISION USING pricing::DOUBLE PRECISION,
  ALTER COLUMN floor_area TYPE DOUBLE PRECISION USING floor_area::DOUBLE PRECISION,
  ALTER COLUMN surface_area TYPE DOUBLE PRECISION USING surface_area::DOUBLE PRECISION,
  ALTER COLUMN house_volume TYPE DOUBLE PRECISION USING house_volume::DOUBLE PRECISION,
  ALTER COLUMN stories TYPE DOUBLE PRECISION USING stories::DOUBLE PRECISION;

ALTER TABLE plan_optional_features
  ALTER COLUMN base_pricing TYPE DOUBLE PRECISION USING base_pricing::DOUBLE PRECISION;

-- ============================================================================
-- JOBS
-- ============================================================================

ALTER TABLE jobs
  ALTER COLUMN adjusted_floor_area TYPE DOUBLE PRECISION USING adjusted_floor_area::DOUBLE PRECISION,
  ALTER COLUMN adjusted_volume TYPE DOUBLE PRECISION USING adjusted_volume::DOUBLE PRECISION,
  ALTER COLUMN adjusted_surface_area TYPE DOUBLE PRECISION USING adjusted_surface_area::DOUBLE PRECISION;

-- ============================================================================
-- EXPENSES
-- ============================================================================

ALTER TABLE expenses
  ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION,
  ALTER COLUMN ocr_confidence TYPE DOUBLE PRECISION USING ocr_confidence::DOUBLE PRECISION,
  ALTER COLUMN gps_latitude TYPE DOUBLE PRECISION USING gps_latitude::DOUBLE PRECISION,
  ALTER COLUMN gps_longitude TYPE DOUBLE PRECISION USING gps_longitude::DOUBLE PRECISION,
  ALTER COLUMN ocr_amount TYPE DOUBLE PRECISION USING ocr_amount::DOUBLE PRECISION;

-- ============================================================================
-- MILEAGE
-- ============================================================================

ALTER TABLE mileage_logs
  ALTER COLUMN distance TYPE DOUBLE PRECISION USING distance::DOUBLE PRECISION,
  ALTER COLUMN rate TYPE DOUBLE PRECISION USING rate::DOUBLE PRECISION,
  ALTER COLUMN average_speed TYPE DOUBLE PRECISION USING average_speed::DOUBLE PRECISION,
  ALTER COLUMN business_probability TYPE DOUBLE PRECISION USING business_probability::DOUBLE PRECISION;

-- ============================================================================
-- REPORT MEASUREMENTS
-- ============================================================================

ALTER TABLE report_measurements
  ALTER COLUMN value_number TYPE DOUBLE PRECISION USING value_number::DOUBLE PRECISION;

-- ============================================================================
-- FORECAST ACCURACY
-- ============================================================================

ALTER TABLE forecast_accuracy
  ALTER COLUMN predicted_tdl TYPE DOUBLE PRECISION USING predicted_tdl::DOUBLE PRECISION,
  ALTER COLUMN predicted_dlo TYPE DOUBLE PRECISION USING predicted_dlo::DOUBLE PRECISION,
  ALTER COLUMN predicted_ach50 TYPE DOUBLE PRECISION USING predicted_ach50::DOUBLE PRECISION,
  ALTER COLUMN actual_tdl TYPE DOUBLE PRECISION USING actual_tdl::DOUBLE PRECISION,
  ALTER COLUMN actual_dlo TYPE DOUBLE PRECISION USING actual_dlo::DOUBLE PRECISION,
  ALTER COLUMN actual_ach50 TYPE DOUBLE PRECISION USING actual_ach50::DOUBLE PRECISION,
  ALTER COLUMN cfm50 TYPE DOUBLE PRECISION USING cfm50::DOUBLE PRECISION,
  ALTER COLUMN house_volume TYPE DOUBLE PRECISION USING house_volume::DOUBLE PRECISION,
  ALTER COLUMN house_surface_area TYPE DOUBLE PRECISION USING house_surface_area::DOUBLE PRECISION,
  ALTER COLUMN total_duct_leakage_cfm25 TYPE DOUBLE PRECISION USING total_duct_leakage_cfm25::DOUBLE PRECISION,
  ALTER COLUMN duct_leakage_to_outside_cfm25 TYPE DOUBLE PRECISION USING duct_leakage_to_outside_cfm25::DOUBLE PRECISION,
  ALTER COLUMN outdoor_temp TYPE DOUBLE PRECISION USING outdoor_temp::DOUBLE PRECISION,
  ALTER COLUMN indoor_temp TYPE DOUBLE PRECISION USING indoor_temp::DOUBLE PRECISION,
  ALTER COLUMN wind_speed TYPE DOUBLE PRECISION USING wind_speed::DOUBLE PRECISION;

-- ============================================================================
-- PHOTOS
-- ============================================================================

ALTER TABLE photos
  ALTER COLUMN ocr_confidence TYPE DOUBLE PRECISION USING ocr_confidence::DOUBLE PRECISION;

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

ALTER TABLE achievement_thresholds
  ALTER COLUMN threshold TYPE DOUBLE PRECISION USING threshold::DOUBLE PRECISION;

-- ============================================================================
-- BLOWER DOOR TESTS
-- ============================================================================

ALTER TABLE blower_door_tests
  ALTER COLUMN house_volume TYPE DOUBLE PRECISION USING house_volume::DOUBLE PRECISION,
  ALTER COLUMN conditioned_area TYPE DOUBLE PRECISION USING conditioned_area::DOUBLE PRECISION,
  ALTER COLUMN surface_area TYPE DOUBLE PRECISION USING surface_area::DOUBLE PRECISION,
  ALTER COLUMN number_of_stories TYPE DOUBLE PRECISION USING number_of_stories::DOUBLE PRECISION,
  ALTER COLUMN outdoor_temp TYPE DOUBLE PRECISION USING outdoor_temp::DOUBLE PRECISION,
  ALTER COLUMN indoor_temp TYPE DOUBLE PRECISION USING indoor_temp::DOUBLE PRECISION,
  ALTER COLUMN outdoor_humidity TYPE DOUBLE PRECISION USING outdoor_humidity::DOUBLE PRECISION,
  ALTER COLUMN indoor_humidity TYPE DOUBLE PRECISION USING indoor_humidity::DOUBLE PRECISION,
  ALTER COLUMN wind_speed TYPE DOUBLE PRECISION USING wind_speed::DOUBLE PRECISION,
  ALTER COLUMN barometric_pressure TYPE DOUBLE PRECISION USING barometric_pressure::DOUBLE PRECISION,
  ALTER COLUMN altitude TYPE DOUBLE PRECISION USING altitude::DOUBLE PRECISION,
  ALTER COLUMN cfm50 TYPE DOUBLE PRECISION USING cfm50::DOUBLE PRECISION,
  ALTER COLUMN ach50 TYPE DOUBLE PRECISION USING ach50::DOUBLE PRECISION,
  ALTER COLUMN ela TYPE DOUBLE PRECISION USING ela::DOUBLE PRECISION,
  ALTER COLUMN n_factor TYPE DOUBLE PRECISION USING n_factor::DOUBLE PRECISION,
  ALTER COLUMN correlation_coefficient TYPE DOUBLE PRECISION USING correlation_coefficient::DOUBLE PRECISION,
  ALTER COLUMN code_limit TYPE DOUBLE PRECISION USING code_limit::DOUBLE PRECISION,
  ALTER COLUMN margin TYPE DOUBLE PRECISION USING margin::DOUBLE PRECISION,
  ALTER COLUMN altitude_correction_factor TYPE DOUBLE PRECISION USING altitude_correction_factor::DOUBLE PRECISION;

-- ============================================================================
-- DUCT LEAKAGE TESTS
-- ============================================================================

ALTER TABLE duct_leakage_tests
  ALTER COLUMN conditioned_area TYPE DOUBLE PRECISION USING conditioned_area::DOUBLE PRECISION,
  ALTER COLUMN system_airflow TYPE DOUBLE PRECISION USING system_airflow::DOUBLE PRECISION,
  ALTER COLUMN total_fan_pressure TYPE DOUBLE PRECISION USING total_fan_pressure::DOUBLE PRECISION,
  ALTER COLUMN cfm25_total TYPE DOUBLE PRECISION USING cfm25_total::DOUBLE PRECISION,
  ALTER COLUMN total_cfm_per_sqft TYPE DOUBLE PRECISION USING total_cfm_per_sqft::DOUBLE PRECISION,
  ALTER COLUMN total_percent_of_flow TYPE DOUBLE PRECISION USING total_percent_of_flow::DOUBLE PRECISION,
  ALTER COLUMN outside_house_pressure TYPE DOUBLE PRECISION USING outside_house_pressure::DOUBLE PRECISION,
  ALTER COLUMN outside_fan_pressure TYPE DOUBLE PRECISION USING outside_fan_pressure::DOUBLE PRECISION,
  ALTER COLUMN cfm25_outside TYPE DOUBLE PRECISION USING cfm25_outside::DOUBLE PRECISION,
  ALTER COLUMN outside_cfm_per_sqft TYPE DOUBLE PRECISION USING outside_cfm_per_sqft::DOUBLE PRECISION,
  ALTER COLUMN outside_percent_of_flow TYPE DOUBLE PRECISION USING outside_percent_of_flow::DOUBLE PRECISION,
  ALTER COLUMN total_duct_leakage_limit TYPE DOUBLE PRECISION USING total_duct_leakage_limit::DOUBLE PRECISION,
  ALTER COLUMN outside_leakage_limit TYPE DOUBLE PRECISION USING outside_leakage_limit::DOUBLE PRECISION;

-- ============================================================================
-- VENTILATION TESTS
-- ============================================================================

ALTER TABLE ventilation_tests
  ALTER COLUMN floor_area TYPE DOUBLE PRECISION USING floor_area::DOUBLE PRECISION,
  ALTER COLUMN stories TYPE DOUBLE PRECISION USING stories::DOUBLE PRECISION,
  ALTER COLUMN required_ventilation_rate TYPE DOUBLE PRECISION USING required_ventilation_rate::DOUBLE PRECISION,
  ALTER COLUMN required_continuous_rate TYPE DOUBLE PRECISION USING required_continuous_rate::DOUBLE PRECISION,
  ALTER COLUMN infiltration_credit TYPE DOUBLE PRECISION USING infiltration_credit::DOUBLE PRECISION,
  ALTER COLUMN adjusted_required_rate TYPE DOUBLE PRECISION USING adjusted_required_rate::DOUBLE PRECISION,
  ALTER COLUMN kitchen_rated_cfm TYPE DOUBLE PRECISION USING kitchen_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN kitchen_measured_cfm TYPE DOUBLE PRECISION USING kitchen_measured_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom1_rated_cfm TYPE DOUBLE PRECISION USING bathroom1_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom1_measured_cfm TYPE DOUBLE PRECISION USING bathroom1_measured_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom2_rated_cfm TYPE DOUBLE PRECISION USING bathroom2_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom2_measured_cfm TYPE DOUBLE PRECISION USING bathroom2_measured_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom3_rated_cfm TYPE DOUBLE PRECISION USING bathroom3_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom3_measured_cfm TYPE DOUBLE PRECISION USING bathroom3_measured_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom4_rated_cfm TYPE DOUBLE PRECISION USING bathroom4_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN bathroom4_measured_cfm TYPE DOUBLE PRECISION USING bathroom4_measured_cfm::DOUBLE PRECISION,
  ALTER COLUMN mechanical_rated_cfm TYPE DOUBLE PRECISION USING mechanical_rated_cfm::DOUBLE PRECISION,
  ALTER COLUMN mechanical_measured_supply_cfm TYPE DOUBLE PRECISION USING mechanical_measured_supply_cfm::DOUBLE PRECISION,
  ALTER COLUMN mechanical_measured_exhaust_cfm TYPE DOUBLE PRECISION USING mechanical_measured_exhaust_cfm::DOUBLE PRECISION,
  ALTER COLUMN total_ventilation_provided TYPE DOUBLE PRECISION USING total_ventilation_provided::DOUBLE PRECISION;

-- ============================================================================
-- FINANCIAL - BUILDER RATE AGREEMENTS
-- ============================================================================

ALTER TABLE builder_rate_agreements
  ALTER COLUMN base_rate TYPE DOUBLE PRECISION USING base_rate::DOUBLE PRECISION,
  ALTER COLUMN volume_discount TYPE DOUBLE PRECISION USING volume_discount::DOUBLE PRECISION;

-- ============================================================================
-- FINANCIAL - INVOICES
-- ============================================================================

ALTER TABLE invoices
  ALTER COLUMN subtotal TYPE DOUBLE PRECISION USING subtotal::DOUBLE PRECISION,
  ALTER COLUMN tax TYPE DOUBLE PRECISION USING tax::DOUBLE PRECISION,
  ALTER COLUMN total TYPE DOUBLE PRECISION USING total::DOUBLE PRECISION;

ALTER TABLE invoice_line_items
  ALTER COLUMN unit_price TYPE DOUBLE PRECISION USING unit_price::DOUBLE PRECISION,
  ALTER COLUMN line_total TYPE DOUBLE PRECISION USING line_total::DOUBLE PRECISION;

ALTER TABLE invoice_payments
  ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

-- ============================================================================
-- FINANCIAL - AR AGING
-- ============================================================================

ALTER TABLE ar_aging_snapshots
  ALTER COLUMN current TYPE DOUBLE PRECISION USING current::DOUBLE PRECISION,
  ALTER COLUMN days_30 TYPE DOUBLE PRECISION USING days_30::DOUBLE PRECISION,
  ALTER COLUMN days_60 TYPE DOUBLE PRECISION USING days_60::DOUBLE PRECISION,
  ALTER COLUMN days_90_plus TYPE DOUBLE PRECISION USING days_90_plus::DOUBLE PRECISION,
  ALTER COLUMN total_ar TYPE DOUBLE PRECISION USING total_ar::DOUBLE PRECISION;

-- ============================================================================
-- FINANCIAL - APPROVAL POLICIES
-- ============================================================================

ALTER TABLE financial_approval_policies
  ALTER COLUMN max_auto_approve_amount TYPE DOUBLE PRECISION USING max_auto_approve_amount::DOUBLE PRECISION;

ALTER TABLE builder_retainers
  ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION;

ALTER TABLE mileage_rates
  ALTER COLUMN rate_per_mile TYPE DOUBLE PRECISION USING rate_per_mile::DOUBLE PRECISION;

ALTER TABLE tax_jurisdictions
  ALTER COLUMN tax_rate TYPE DOUBLE PRECISION USING tax_rate::DOUBLE PRECISION;

-- ============================================================================
-- EQUIPMENT
-- ============================================================================

ALTER TABLE equipment
  ALTER COLUMN purchase_cost TYPE DOUBLE PRECISION USING purchase_cost::DOUBLE PRECISION,
  ALTER COLUMN current_value TYPE DOUBLE PRECISION USING current_value::DOUBLE PRECISION;

ALTER TABLE equipment_maintenance
  ALTER COLUMN cost TYPE DOUBLE PRECISION USING cost::DOUBLE PRECISION;

ALTER TABLE equipment_checkouts
  ALTER COLUMN cost TYPE DOUBLE PRECISION USING cost::DOUBLE PRECISION;

-- ============================================================================
-- QA INSPECTION SCORES
-- ============================================================================

ALTER TABLE qa_inspection_scores
  ALTER COLUMN total_score TYPE DOUBLE PRECISION USING total_score::DOUBLE PRECISION,
  ALTER COLUMN max_score TYPE DOUBLE PRECISION USING max_score::DOUBLE PRECISION,
  ALTER COLUMN percentage TYPE DOUBLE PRECISION USING percentage::DOUBLE PRECISION,
  ALTER COLUMN overall_score TYPE DOUBLE PRECISION USING overall_score::DOUBLE PRECISION,
  ALTER COLUMN completeness_score TYPE DOUBLE PRECISION USING completeness_score::DOUBLE PRECISION,
  ALTER COLUMN accuracy_score TYPE DOUBLE PRECISION USING accuracy_score::DOUBLE PRECISION,
  ALTER COLUMN compliance_score TYPE DOUBLE PRECISION USING compliance_score::DOUBLE PRECISION,
  ALTER COLUMN photo_quality_score TYPE DOUBLE PRECISION USING photo_quality_score::DOUBLE PRECISION,
  ALTER COLUMN timeliness_score TYPE DOUBLE PRECISION USING timeliness_score::DOUBLE PRECISION;

-- ============================================================================
-- QA PERFORMANCE METRICS
-- ============================================================================

ALTER TABLE qa_performance_metrics
  ALTER COLUMN avg_score TYPE DOUBLE PRECISION USING avg_score::DOUBLE PRECISION,
  ALTER COLUMN on_time_rate TYPE DOUBLE PRECISION USING on_time_rate::DOUBLE PRECISION,
  ALTER COLUMN first_pass_rate TYPE DOUBLE PRECISION USING first_pass_rate::DOUBLE PRECISION,
  ALTER COLUMN customer_satisfaction TYPE DOUBLE PRECISION USING customer_satisfaction::DOUBLE PRECISION;

-- ============================================================================
-- TAX CREDITS
-- ============================================================================

ALTER TABLE tax_credit_45l_certifications
  ALTER COLUMN credit_amount TYPE DOUBLE PRECISION USING credit_amount::DOUBLE PRECISION;

ALTER TABLE energy_model_results
  ALTER COLUMN heating_load TYPE DOUBLE PRECISION USING heating_load::DOUBLE PRECISION,
  ALTER COLUMN cooling_load TYPE DOUBLE PRECISION USING cooling_load::DOUBLE PRECISION,
  ALTER COLUMN annual_energy_use TYPE DOUBLE PRECISION USING annual_energy_use::DOUBLE PRECISION,
  ALTER COLUMN percent_savings TYPE DOUBLE PRECISION USING percent_savings::DOUBLE PRECISION,
  ALTER COLUMN blower_door_ach50 TYPE DOUBLE PRECISION USING blower_door_ach50::DOUBLE PRECISION,
  ALTER COLUMN duct_leakage_cfm25 TYPE DOUBLE PRECISION USING duct_leakage_cfm25::DOUBLE PRECISION;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify data integrity:

-- Check for NULL values that shouldn't be NULL
-- SELECT 'blower_door_tests' as table_name, COUNT(*) as null_ach50_count 
-- FROM blower_door_tests WHERE ach50 IS NULL;

-- SELECT 'qa_inspection_scores' as table_name, COUNT(*) as null_total_score_count
-- FROM qa_inspection_scores WHERE total_score IS NULL;

-- Check sample conversions
-- SELECT id, ach50, cfm50 FROM blower_door_tests LIMIT 5;
-- SELECT id, total_score, percentage FROM qa_inspection_scores LIMIT 5;
-- SELECT id, amount FROM expenses LIMIT 5;

-- Check for any data loss (compare row counts before/after)
-- SELECT 'blower_door_tests' as table_name, COUNT(*) as row_count FROM blower_door_tests;
-- SELECT 'qa_inspection_scores' as table_name, COUNT(*) as row_count FROM qa_inspection_scores;
