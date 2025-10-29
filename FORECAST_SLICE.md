# Forecast System - Production Vertical Slice

**Feature:** Test Result Forecasting & Actuals Tracking  
**Status:** Production-Ready (40/40)  
**Date:** January 29, 2025  
**Author:** Field Inspection System  
**Daily Usage:** MODERATE (Test prediction and variance analysis)

---

## Overview

The Forecast System tracks predicted vs. actual test results for blower door (ACH50) and duct leakage (TDL/DLO) tests. It enables inspectors to record predictions before testing, compare against actual results, analyze prediction accuracy, and identify trends for continuous improvement.

### Key Capabilities

1. **Test Predictions** - Record predicted ACH50, TDL, DLO before testing
2. **Actuals Tracking** - Record actual test results after testing
3. **Variance Analysis** - Compare predicted vs. actual (accuracy metrics)
4. **Confidence Scoring** - Track prediction confidence (1-100)
5. **Environmental Data** - Record test conditions (weather, temperature, wind)
6. **Equipment Notes** - Document test equipment and setup details

### Business Value

- **Prediction Accuracy:** Train inspectors to predict test results accurately
- **Trend Analysis:** Identify builders/plans with consistent pass/fail patterns
- **Quality Improvement:** Analyze why predictions deviate from actuals
- **Inspector Training:** Use historical predictions for inspector education
- **Builder Feedback:** Share prediction trends with builders for design improvements

---

## Database Schema

### Table: `forecasts`

**Purpose:** Test result predictions and actuals for blower door and duct leakage tests.

```typescript
export const forecasts = pgTable("forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  // Blower Door Predictions & Actuals
  predictedACH50: decimal("predicted_ach50", { precision: 10, scale: 2 }),
  actualACH50: decimal("actual_ach50", { precision: 10, scale: 2 }),
  cfm50: decimal("cfm50", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  houseSurfaceArea: decimal("house_surface_area", { precision: 10, scale: 2 }),
  // Duct Leakage Predictions & Actuals
  predictedTDL: decimal("predicted_tdl", { precision: 10, scale: 2 }),
  actualTDL: decimal("actual_tdl", { precision: 10, scale: 2 }),
  predictedDLO: decimal("predicted_dlo", { precision: 10, scale: 2 }),
  actualDLO: decimal("actual_dlo", { precision: 10, scale: 2 }),
  totalDuctLeakageCfm25: decimal("total_duct_leakage_cfm25", { precision: 10, scale: 2 }),
  ductLeakageToOutsideCfm25: decimal("duct_leakage_to_outside_cfm25", { precision: 10, scale: 2 }),
  // Duct System Details
  totalLedCount: integer("total_led_count"),
  stripLedCount: integer("strip_led_count"),
  suppliesInsideConditioned: integer("supplies_inside_conditioned"),
  suppliesOutsideConditioned: integer("supplies_outside_conditioned"),
  returnRegistersCount: integer("return_registers_count"),
  centralReturnsCount: integer("central_returns_count"),
  aerosealed: boolean("aerosealed").default(false),
  // Test Conditions
  testConditions: text("test_conditions"),
  equipmentNotes: text("equipment_notes"),
  weatherConditions: text("weather_conditions"),
  outdoorTemp: decimal("outdoor_temp", { precision: 5, scale: 1 }),
  indoorTemp: decimal("indoor_temp", { precision: 5, scale: 1 }),
  windSpeed: decimal("wind_speed", { precision: 5, scale: 1 }),
  confidence: integer("confidence"), // 1-100
  recordedAt: timestamp("recorded_at").default(sql`now()`),
}, (table) => [1 index]);
```

**Key Columns:**
- `predictedACH50` / `actualACH50` - Blower door air changes per hour at 50 Pa
- `predictedTDL` / `actualTDL` - Total duct leakage (CFM25/100 sq ft)
- `predictedDLO` / `actualDLO` - Duct leakage to outside (CFM25/100 sq ft)
- `confidence` - Inspector confidence in prediction (1-100)
- `weatherConditions` - Test day weather (affects blower door results)

**1 Index:** job_id (fast lookup by job)

---

## API Endpoints

### Forecast CRUD

#### `POST /api/forecasts`
**Create forecast** (before testing)

**Request:**
```json
{
  "jobId": "job-123",
  "predictedACH50": 2.5,
  "predictedTDL": 3.8,
  "predictedDLO": 2.7,
  "confidence": 75,
  "weatherConditions": "Sunny, mild wind",
  "outdoorTemp": 45.0,
  "indoorTemp": 68.0
}
```

---

#### `PATCH /api/forecasts/:id`
**Update forecast** with actuals (after testing)

**Request:**
```json
{
  "actualACH50": 2.8,
  "actualTDL": 3.5,
  "actualDLO": 2.9,
  "cfm50": 480.00,
  "totalDuctLeakageCfm25": 245.00
}
```

---

#### `GET /api/forecasts/:id`
**Get forecast** with variance analysis

**Response:**
```json
{
  "id": "forecast-123",
  "jobId": "job-123",
  "predictedACH50": 2.5,
  "actualACH50": 2.8,
  "ach50Variance": 0.3,
  "predictedTDL": 3.8,
  "actualTDL": 3.5,
  "tdlVariance": -0.3,
  "confidence": 75
}
```

---

#### `GET /api/forecasts/variance-report`
**Variance analysis** (prediction accuracy)

**Query Parameters:**
- `inspectorId` - Filter by inspector
- `builderId` - Filter by builder
- `from` / `to` - Date range

**Response:**
```json
{
  "totalForecasts": 45,
  "ach50AvgVariance": 0.4,
  "tdlAvgVariance": 0.3,
  "highConfidenceAccuracy": 85.2,
  "lowConfidenceAccuracy": 62.1
}
```

---

## Workflows

### Workflow 1: Prediction Before Testing

**Scenario:** Inspector predicts test results before blower door/duct leakage testing.

**Steps:**
1. Inspector arrives on-site for final inspection
2. Creates forecast before testing:
   - POST /api/forecasts
   - predictedACH50: 2.5 (based on air sealing quality observed)
   - predictedTDL: 3.8 (based on duct system quality)
   - confidence: 75 (moderately confident)
3. Performs blower door test:
   - ACH50 = 2.8 (actual)
4. Updates forecast with actuals:
   - PATCH /api/forecasts/:id
   - actualACH50: 2.8
   - Variance: 0.3 ACH50 (12% error)
5. System tracks accuracy for inspector training

---

## Integration Points

### Jobs System
- **Link:** forecasts.jobId → jobs.id
- **Data:** CASCADE delete (forecast deleted when job deleted)

### Blower Door Testing
- **Link:** forecast data used for variance analysis
- **Data:** Compare predicted vs. actual ACH50

### Duct Leakage Testing
- **Link:** forecast data used for variance analysis
- **Data:** Compare predicted vs. actual TDL/DLO

---

## Conclusion

Forecast System tracks predicted vs. actual test results for blower door and duct leakage tests, enabling inspector training, quality improvement, and trend analysis. Production-ready with 40/40 compliance (see FORECAST_COMPLIANCE.md).

**Key Features:**
- 1 table (forecasts)
- Test predictions (ACH50, TDL, DLO)
- Actuals tracking
- Variance analysis
- Confidence scoring
- Environmental data

**Daily Impact:** Inspector training, prediction accuracy tracking, trend analysis for builders/plans, quality improvement, continuous inspector education.
