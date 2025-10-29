-- Forecast System - Seed Data
-- Purpose: Test result predictions and actuals for blower door and duct leakage tests
-- Scenarios: 8 test cases covering prediction accuracy, variance analysis, confidence levels

-- NOTE: forecasts table stores TEST RESULT FORECASTING (predicted vs actual ACH50/TDL/DLO)
-- This is NOT business forecasting (revenue/capacity planning)

-- ==============================================
-- SCENARIO 1: Accurate Prediction (High Confidence)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, predicted_tdl, actual_tdl, predicted_dlo, actual_dlo, confidence, weather_conditions, outdoor_temp, indoor_temp)
VALUES
  ('forecast-001', 'job-004', 2.5, 2.6, 3.8, 3.7, 2.8, 2.9, 85, 'Clear skies, light wind', 42.0, 68.0);

-- ==============================================
-- SCENARIO 2: Poor Prediction (Low Confidence)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, predicted_tdl, actual_tdl, confidence, weather_conditions)
VALUES
  ('forecast-002', 'job-003', 2.0, 3.2, 3.0, 4.5, 50, 'Windy conditions, challenging test day');

-- ==============================================
-- SCENARIO 3: Perfect Prediction (Expert Inspector)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, predicted_tdl, actual_tdl, predicted_dlo, actual_dlo, confidence, weather_conditions)
VALUES
  ('forecast-003', 'job-002', 2.8, 2.8, 3.5, 3.5, 2.7, 2.7, 95, 'Ideal testing conditions');

-- ==============================================
-- SCENARIO 4: Blower Door Only (No Duct Leakage)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, cfm50, house_volume, confidence, weather_conditions)
VALUES
  ('forecast-004', 'job-001', 3.0, 2.9, 480.00, 14400.00, 70, 'Moderate wind, good sealing observed');

-- ==============================================
-- SCENARIO 5: Duct Leakage Only (No Blower Door)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_tdl, actual_tdl, predicted_dlo, actual_dlo, total_duct_leakage_cfm25, duct_leakage_to_outside_cfm25, confidence)
VALUES
  ('forecast-005', 'job-010', 4.0, 3.8, 3.0, 2.8, 280.00, 210.00, 80);

-- ==============================================
-- SCENARIO 6: High Variance (Unexpected Air Leakage)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, predicted_tdl, actual_tdl, confidence, test_conditions, equipment_notes)
VALUES
  ('forecast-006', 'job-009', 2.2, 4.5, 3.0, 5.2, 75, 'Discovered unsealed penetrations during test', 'Minneapolis Duct Blaster used');

-- ==============================================
-- SCENARIO 7: Aeroseal Treatment (Low Leakage)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_tdl, actual_tdl, predicted_dlo, actual_dlo, aerosealed, total_led_count, supplies_inside_conditioned, return_registers_count, confidence)
VALUES
  ('forecast-007', 'job-007', 2.0, 1.8, 1.5, 1.4, true, 45, 12, 4, 90);

-- ==============================================
-- SCENARIO 8: Minimal Data (Testing)
-- ==============================================
INSERT INTO forecasts (id, job_id, predicted_ach50, actual_ach50, confidence)
VALUES
  ('forecast-008', 'job-006', 2.5, 2.7, 60);

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify forecasts created
SELECT 
  'Forecasts' as entity,
  COUNT(*) as total_forecasts,
  COUNT(*) FILTER (WHERE predicted_ach50 IS NOT NULL) as ach50_predictions,
  COUNT(*) FILTER (WHERE predicted_tdl IS NOT NULL) as tdl_predictions,
  COUNT(*) FILTER (WHERE actual_ach50 IS NOT NULL) as ach50_actuals,
  COUNT(*) FILTER (WHERE actual_tdl IS NOT NULL) as tdl_actuals,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM forecasts
WHERE id LIKE 'forecast-%';

-- Variance analysis - ACH50
SELECT 
  'ACH50 Variance' as metric,
  COUNT(*) FILTER (WHERE predicted_ach50 IS NOT NULL AND actual_ach50 IS NOT NULL) as total_with_actuals,
  ROUND(AVG(ABS(actual_ach50 - predicted_ach50)), 2) as avg_absolute_variance,
  ROUND(MAX(ABS(actual_ach50 - predicted_ach50)), 2) as max_variance,
  ROUND(MIN(ABS(actual_ach50 - predicted_ach50)), 2) as min_variance
FROM forecasts
WHERE id LIKE 'forecast-%'
  AND predicted_ach50 IS NOT NULL 
  AND actual_ach50 IS NOT NULL;

-- Variance analysis - TDL
SELECT 
  'TDL Variance' as metric,
  COUNT(*) FILTER (WHERE predicted_tdl IS NOT NULL AND actual_tdl IS NOT NULL) as total_with_actuals,
  ROUND(AVG(ABS(actual_tdl - predicted_tdl)), 2) as avg_absolute_variance,
  ROUND(MAX(ABS(actual_tdl - predicted_tdl)), 2) as max_variance
FROM forecasts
WHERE id LIKE 'forecast-%'
  AND predicted_tdl IS NOT NULL 
  AND actual_tdl IS NOT NULL;

-- Confidence vs Accuracy
SELECT 
  CASE
    WHEN confidence < 60 THEN 'Low Confidence (<60)'
    WHEN confidence < 80 THEN 'Medium Confidence (60-80)'
    ELSE 'High Confidence (80+)'
  END as confidence_level,
  COUNT(*) as forecast_count,
  ROUND(AVG(ABS(actual_ach50 - predicted_ach50)), 2) as avg_ach50_variance
FROM forecasts
WHERE id LIKE 'forecast-%'
  AND predicted_ach50 IS NOT NULL 
  AND actual_ach50 IS NOT NULL
  AND confidence IS NOT NULL
GROUP BY 
  CASE
    WHEN confidence < 60 THEN 'Low Confidence (<60)'
    WHEN confidence < 80 THEN 'Medium Confidence (60-80)'
    ELSE 'High Confidence (80+)'
  END
ORDER BY MIN(confidence);

-- Forecast details
SELECT 
  id,
  predicted_ach50,
  actual_ach50,
  ROUND(ABS(actual_ach50 - predicted_ach50), 2) as ach50_variance,
  predicted_tdl,
  actual_tdl,
  ROUND(ABS(actual_tdl - predicted_tdl), 2) as tdl_variance,
  confidence,
  weather_conditions
FROM forecasts
WHERE id LIKE 'forecast-%'
ORDER BY confidence DESC;
