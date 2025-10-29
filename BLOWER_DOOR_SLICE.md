# Blower Door Testing - Production Runbook

## Overview
Production-grade Blower Door Testing system for RESNET-certified energy auditors in Minnesota (Climate Zone 6). Enables multi-point pressure testing with automated ACH50 calculations, weather/altitude corrections, and Minnesota 2020 Energy Code compliance verification (≤3.0 ACH50 limit).

## Core Capabilities
- **Multi-Point Regression Testing**: 5-7 pressure readings with log-log regression analysis
- **Automated Calculations**: CFM50, ACH50, ELA, n-factor, correlation coefficient (R²)
- **Weather Corrections**: Temperature, barometric pressure, and wind speed adjustments
- **Altitude Compensation**: Minneapolis-specific corrections (900 ft elevation)
- **Minnesota Code Compliance**: Automatic pass/fail against 3.0 ACH50 limit
- **Ring Configuration Support**: Open, Ring A-D with calibrated flow coefficients
- **PDF Report Generation**: Professional test reports with calculations and compliance status
- **Test History Tracking**: View/edit previous tests, compare results over time

## Technology Stack
- **Frontend**: React + TypeScript, TanStack Query, React Hook Form
- **Backend**: Express.js + Node.js (TypeScript)
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Validation**: Zod schemas
- **PDF Generation**: @react-pdf/renderer
- **Testing**: Vitest + Supertest
- **Package Manager**: npm
- **Deployment**: Replit Deploy

## Prerequisites

### Environment
- Node.js 20+
- PostgreSQL database (configured via `DATABASE_URL` env var)
- Replit Auth configured (for user authentication)
- Session store (uses PostgreSQL by default)

### Required Packages
```bash
# Backend
express
drizzle-orm
@neondatabase/serverless
zod  # Validation
@react-pdf/renderer  # PDF export

# Frontend
react
@tanstack/react-query
react-hook-form
@hookform/resolvers/zod
lucide-react  # Icons

# Testing/Development Tools
jq  # JSON parsing for smoke tests
psql  # PostgreSQL client for seed data
```

### Environment Variables
```bash
# Standard application variables
DATABASE_URL=postgresql://...
SESSION_SECRET=your_session_secret

# No additional variables required for blower door testing
# All configuration handled in application code
```

## Database Schema

### Core Table

```sql
-- Blower Door Tests (59 columns)
CREATE TABLE blower_door_tests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  report_instance_id VARCHAR REFERENCES report_instances(id) ON DELETE SET NULL,
  
  -- Test Information
  test_date TIMESTAMP NOT NULL,
  test_time TEXT NOT NULL,
  equipment_serial TEXT,
  equipment_calibration_date TIMESTAMP,
  
  -- Building Information
  house_volume DECIMAL(10,2) NOT NULL,  -- cubic feet
  conditioned_area DECIMAL(10,2) NOT NULL,  -- square feet
  surface_area DECIMAL(10,2),  -- square feet
  number_of_stories DECIMAL(3,1) NOT NULL,
  basement_type TEXT NOT NULL,  -- 'none', 'unconditioned', 'conditioned'
  
  -- Weather Conditions (for corrections)
  outdoor_temp DECIMAL(5,1),  -- Fahrenheit
  indoor_temp DECIMAL(5,1),  -- Fahrenheit
  outdoor_humidity DECIMAL(5,1),  -- percentage
  indoor_humidity DECIMAL(5,1),  -- percentage
  wind_speed DECIMAL(5,1),  -- mph
  barometric_pressure DECIMAL(6,2),  -- inches Hg
  altitude DECIMAL(8,1),  -- feet above sea level
  
  -- Multi-point test data (JSON array)
  test_points JSONB,  -- [{housePressure, fanPressure, cfm, ringConfiguration}, ...]
  
  -- Calculated Results
  cfm50 DECIMAL(10,2) NOT NULL,  -- CFM at 50 Pa
  ach50 DECIMAL(6,2) NOT NULL,  -- Air changes per hour at 50 Pa
  ela DECIMAL(8,2),  -- Effective Leakage Area (sq inches)
  n_factor DECIMAL(4,3),  -- Flow exponent (typically 0.5-0.7)
  correlation_coefficient DECIMAL(4,3),  -- R² value for regression quality
  
  -- Minnesota Code Compliance (2020 Energy Code)
  code_year TEXT DEFAULT '2020',
  code_limit DECIMAL(6,2),  -- ACH50 limit (3.0 for Minnesota)
  meets_code BOOLEAN NOT NULL,
  margin DECIMAL(6,2),  -- How much under/over the limit
  
  -- Additional Fields
  notes TEXT,
  weather_correction_applied BOOLEAN DEFAULT false,
  altitude_correction_factor DECIMAL(4,3),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_blower_door_tests_job_id ON blower_door_tests(job_id);
CREATE INDEX idx_blower_door_tests_report_instance_id ON blower_door_tests(report_instance_id);
CREATE INDEX idx_blower_door_tests_test_date ON blower_door_tests(test_date);
CREATE INDEX idx_blower_door_tests_meets_code ON blower_door_tests(meets_code);
```

## Run Instructions

### 1. Development Mode

```bash
# Start the development server
npm run dev

# Server starts at http://localhost:5000
# Auto-restarts on file changes
```

### 2. Seed Database

```bash
# Load sample blower door test data using psql
psql $DATABASE_URL -f db/seed-blower-door.sql

# Or using npm script (if configured)
npm run seed:blower-door

# The seed file creates:
# - 8 realistic test scenarios (pass/fail, various building types)
# - Tests with different ACH50 values (1.8 to 3.8)
# - Various building configurations (stories, basements, volumes)
```

### 3. Run Tests

```bash
# Run all tests once
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### 4. Type Checking

```bash
# Check TypeScript types
npm run typecheck
```

### 5. Smoke Tests

```bash
# Run automated smoke tests (12 tests)
./scripts/smoke-test-blower-door.sh

# Tests include:
# - Health & API connectivity
# - Test CRUD operations (create, read, update, delete)
# - Calculation accuracy verification (ACH50, CFM50, ELA)
# - Minnesota code compliance checking
# - Weather/altitude corrections
# - Multi-point regression validation

# Exit codes:
# - 0: All tests passed ✓
# - 1: One or more tests failed ✗
```

### 6. Build for Production

```bash
# Build frontend + backend
npm run build

# Start production server
npm run start
```

## API Contract

### Health & Status

```bash
# Basic liveness check
GET /healthz
Response 200: { "status": "healthy", "uptime": 123.45 }

# Readiness check with dependencies
GET /readyz
Response 200: {
  "status": "healthy",
  "checks": {
    "database": "ok"
  }
}
```

### Blower Door Test Operations

```bash
# List tests for a job
GET /api/blower-door-tests?jobId={jobId}
Headers:
  Cookie: session_cookie
Response 200: [
  {
    "id": "test-uuid",
    "jobId": "job-uuid",
    "testDate": "2025-10-29T10:00:00Z",
    "cfm50": 1500,
    "ach50": 2.5,
    "meetsCode": true,
    "margin": 0.5,
    "codeLimit": 3.0,
    "houseVolume": 36000,
    "conditionedArea": 2400,
    "createdAt": "2025-10-29T10:30:00Z"
  }
]

# Get specific test
GET /api/blower-door-tests/:id
Headers:
  Cookie: session_cookie
Response 200: {
  "id": "test-uuid",
  "jobId": "job-uuid",
  "testDate": "2025-10-29T10:00:00Z",
  "testTime": "10:00",
  "equipmentSerial": "EC-12345",
  "equipmentCalibrationDate": "2025-01-15T00:00:00Z",
  "houseVolume": 36000,
  "conditionedArea": 2400,
  "surfaceArea": 5200,
  "numberOfStories": 2,
  "basementType": "unconditioned",
  "outdoorTemp": 35,
  "indoorTemp": 68,
  "outdoorHumidity": 40,
  "indoorHumidity": 35,
  "windSpeed": 10,
  "barometricPressure": 29.85,
  "altitude": 900,
  "testPoints": [
    {"housePressure": 50, "fanPressure": 62.5, "cfm": 1500, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 57.2, "cfm": 1425, "ringConfiguration": "Open"},
    {"housePressure": 40, "fanPressure": 51.8, "cfm": 1350, "ringConfiguration": "Open"},
    {"housePressure": 35, "fanPressure": 46.0, "cfm": 1270, "ringConfiguration": "Open"},
    {"housePressure": 30, "fanPressure": 39.5, "cfm": 1180, "ringConfiguration": "Open"},
    {"housePressure": 25, "fanPressure": 32.5, "cfm": 1090, "ringConfiguration": "Open"},
    {"housePressure": 20, "fanPressure": 24.8, "cfm": 985, "ringConfiguration": "Open"}
  ],
  "cfm50": 1500,
  "ach50": 2.5,
  "ela": 125.5,
  "nFactor": 0.650,
  "correlationCoefficient": 0.9985,
  "codeYear": "2020",
  "codeLimit": 3.0,
  "meetsCode": true,
  "margin": 0.5,
  "notes": "Good airtightness performance",
  "weatherCorrectionApplied": true,
  "altitudeCorrectionFactor": 1.032,
  "createdAt": "2025-10-29T10:30:00Z",
  "updatedAt": "2025-10-29T10:30:00Z"
}

# Get latest test for a job
GET /api/jobs/:jobId/blower-door-tests/latest
Headers:
  Cookie: session_cookie
Response 200: { (same structure as GET by ID) }

# Create new test
POST /api/blower-door-tests
Headers:
  Content-Type: application/json
  Cookie: session_cookie
  x-csrf-token: csrf_token
Body: {
  "jobId": "job-uuid",
  "testDate": "2025-10-29T10:00:00Z",
  "testTime": "10:00",
  "equipmentSerial": "EC-12345",
  "houseVolume": 36000,
  "conditionedArea": 2400,
  "surfaceArea": 5200,
  "numberOfStories": 2,
  "basementType": "unconditioned",
  "outdoorTemp": 35,
  "indoorTemp": 68,
  "windSpeed": 10,
  "barometricPressure": 29.85,
  "altitude": 900,
  "testPoints": [
    {"housePressure": 50, "fanPressure": 62.5, "cfm": 1500, "ringConfiguration": "Open"},
    {"housePressure": 45, "fanPressure": 57.2, "cfm": 1425, "ringConfiguration": "Open"},
    // ... more test points
  ],
  "cfm50": 1500,
  "ach50": 2.5,
  "ela": 125.5,
  "nFactor": 0.650,
  "correlationCoefficient": 0.9985,
  "notes": "Good airtightness performance"
}
Response 201: { (created test object) }

# Update existing test
PATCH /api/blower-door-tests/:id
Headers:
  Content-Type: application/json
  Cookie: session_cookie
  x-csrf-token: csrf_token
Body: {
  "notes": "Updated notes after review",
  "cfm50": 1520,
  "ach50": 2.53
}
Response 200: { (updated test object) }

# Delete test
DELETE /api/blower-door-tests/:id
Headers:
  Cookie: session_cookie
  x-csrf-token: csrf_token
Response 204: (no content)
```

## Technical Architecture

### ACH50 Calculation Algorithm

The Air Changes per Hour at 50 Pascals (ACH50) is the primary metric for building airtightness:

```typescript
// Formula: ACH50 = (CFM50 × 60) / Volume
// Where:
//   CFM50 = Cubic feet per minute at 50 Pa pressure
//   60 = Minutes per hour
//   Volume = Building volume in cubic feet

// Example:
const cfm50 = 1500;  // CFM at 50 Pa
const houseVolume = 36000;  // cubic feet
const ach50 = (cfm50 * 60) / houseVolume;
// Result: 2.5 ACH50
```

### Multi-Point Regression Analysis

Tests use 5-7 pressure readings to calculate an accurate power-law relationship:

```typescript
// Power law equation: Q = C × ΔP^n
// Where:
//   Q = Airflow (CFM)
//   C = Flow coefficient
//   ΔP = Pressure difference (Pa)
//   n = Flow exponent (typically 0.5-0.7)

// Log-log regression: log(Q) = log(C) + n × log(ΔP)

// Example test points:
const testPoints = [
  {housePressure: 50, fanPressure: 62.5, cfm: 1500},
  {housePressure: 45, fanPressure: 57.2, cfm: 1425},
  {housePressure: 40, fanPressure: 51.8, cfm: 1350},
  {housePressure: 35, fanPressure: 46.0, cfm: 1270},
  {housePressure: 30, fanPressure: 39.5, cfm: 1180},
  {housePressure: 25, fanPressure: 32.5, cfm: 1090},
  {housePressure: 20, fanPressure: 24.8, cfm: 985}
];

// Regression calculates:
// - n-factor (flow exponent): typically 0.650
// - C (flow coefficient): typically 235 for open configuration
// - R² (correlation coefficient): should be > 0.99 for quality test
```

### Ring Configuration Calibration

Different ring configurations have specific flow coefficients:

```typescript
const ringFactors = {
  "Open": { C: 235, n: 0.5 },      // No restriction
  "Ring A": { C: 176, n: 0.5 },    // 74% of open flow
  "Ring B": { C: 127, n: 0.5 },    // 54% of open flow
  "Ring C": { C: 85, n: 0.5 },     // 36% of open flow
  "Ring D": { C: 56, n: 0.5 }      // 24% of open flow
};

// CFM calculation from fan pressure:
const cfm = C * Math.pow(fanPressure, n);
```

### Weather Corrections

Atmospheric conditions affect test results and require corrections:

```typescript
// Temperature correction (indoor/outdoor)
const indoorTempK = (indoorTempF - 32) * 5/9 + 273.15;
const outdoorTempK = (outdoorTempF - 32) * 5/9 + 273.15;
const tempCorrection = Math.sqrt(indoorTempK / outdoorTempK);

// Barometric pressure correction
const standardPressure = 29.92;  // inHg
const pressureCorrection = actualPressure / standardPressure;

// Wind speed correction (ASTM E779)
const windSpeedMs = windSpeedMph * 0.44704;  // Convert to m/s
const windCorrection = 1 + (0.015 * windSpeedMs);

// Combined correction factor
const weatherCorrection = (tempCorrection * pressureCorrection) / windCorrection;
```

### Altitude Correction

Minneapolis elevation (900 ft) requires pressure adjustment:

```typescript
// Standard atmospheric pressure at sea level: 14.696 psi
// Pressure decreases ~0.5 psi per 1000 feet

const calculateAltitudeCorrection = (altitudeFeet) => {
  const seaLevelPressure = 14.696;
  const altitudePressure = seaLevelPressure * 
    Math.pow((1 - 0.0000068756 * altitudeFeet), 5.2559);
  return seaLevelPressure / altitudePressure;
};

// At 900 feet: correction factor ≈ 1.032
```

### ELA Calculation

Effective Leakage Area (ELA) at 4 Pa reference pressure:

```typescript
// First, calculate CFM at 4 Pa using power law
const cfm4 = C * Math.pow(4, nFactor);

// ELA formula (ASTM E779)
const ela = (cfm4 * 144) / (
  Math.sqrt(2 * 32.2 * 4 / 0.075) * 0.61
);
// Result in square inches
```

### Minnesota 2020 Energy Code Compliance

Climate Zone 6 requirements:

```typescript
// Code limit for Minnesota (2020 Energy Code)
const CODE_LIMIT_ACH50 = 3.0;

// Compliance check
const meetsCode = ach50 <= CODE_LIMIT_ACH50;
const margin = CODE_LIMIT_ACH50 - ach50;

// Examples:
// ACH50 2.5 → PASS (margin: +0.5)
// ACH50 3.0 → PASS (margin: 0.0)
// ACH50 3.5 → FAIL (margin: -0.5)
```

### Test Quality Indicators

```typescript
// Minimum test points required
const MIN_TEST_POINTS = 5;

// Correlation coefficient quality thresholds
const EXCELLENT = 0.99;  // R² ≥ 0.99
const GOOD = 0.95;       // R² ≥ 0.95
const ACCEPTABLE = 0.90; // R² ≥ 0.90
// Below 0.90 indicates test quality issues

// N-factor typical ranges
const TYPICAL_N_MIN = 0.50;
const TYPICAL_N_MAX = 0.70;
// Outside this range may indicate measurement errors
```

## Security

### Authentication & Authorization
- **Replit Auth (OIDC)**: Primary user authentication
- **CSRF Protection**: Token validation on all mutating endpoints
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Session Security**: HTTP-only cookies, secure flag in production

### Data Protection
- **Parameterized Queries**: All database queries use Drizzle ORM (SQL injection prevention)
- **Input Validation**: Zod schemas validate all API inputs
- **Session Security**: HTTP-only cookies, secure flag in production

### API Security Headers
```javascript
// Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

## Performance Optimizations

### Database Query Optimization
```sql
-- Indexes for common queries
CREATE INDEX idx_blower_door_tests_job_id ON blower_door_tests(job_id);
CREATE INDEX idx_blower_door_tests_test_date ON blower_door_tests(test_date);
CREATE INDEX idx_blower_door_tests_meets_code ON blower_door_tests(meets_code);
```

### Calculation Performance
```typescript
// Pre-calculate commonly used values
const cachedRingFactors = new Map();
const cachedAltitudeCorrections = new Map();

// Memoize expensive calculations
const memoizedRegression = useMemo(() => 
  calculateRegression(testPoints), 
  [testPoints]
);
```

### Frontend Query Caching (TanStack Query)
```typescript
// Blower door tests: 5 minute stale time
queryClient.setQueryDefaults(['/api/blower-door-tests'], {
  staleTime: 5 * 60 * 1000
});
```

## Error Handling

### Validation Errors

```typescript
// Missing required fields
// → 400 Bad Request with field-specific errors

// Invalid test points (< 5 points)
// → 400 Bad Request: "Need at least 5 valid test points"

// CFM50/ACH50 calculation errors
// → 400 Bad Request with calculation details
```

### Database Errors

```typescript
// Test not found
// → 404 Not Found: "Blower door test not found"

// Foreign key violation (invalid jobId)
// → 400 Bad Request: "Invalid job ID"

// Duplicate test (unique constraint)
// → 409 Conflict: "Test already exists for this date/time"
```

### Calculation Errors

```typescript
// Insufficient test points
toast({
  title: "Insufficient data",
  description: "Need at least 5 valid test points for accurate calculation",
  variant: "destructive"
});

// Poor correlation coefficient (R² < 0.90)
toast({
  title: "Test quality warning",
  description: "Low correlation coefficient. Consider retaking measurements.",
  variant: "destructive"
});

// N-factor out of range (< 0.5 or > 0.7)
toast({
  title: "Calculation warning",
  description: "Flow exponent outside typical range. Verify measurements.",
  variant: "destructive"
});
```

## Monitoring & Observability

### Structured Logging

```typescript
// All test operations logged with:
// - User ID (audit trail)
// - Job ID (correlation)
// - Test ID (tracking)
// - Timestamp (millisecond precision)
// - Operation type (create, update, delete, calculate)
// - Result (success, failure, validation error)

serverLogger.info('[BlowerDoorTest] Test created', {
  userId: 'user-uuid',
  jobId: 'job-uuid',
  testId: 'test-uuid',
  ach50: 2.5,
  meetsCode: true,
  timestamp: '2025-10-29T10:30:00Z'
});
```

### Metrics to Monitor

```sql
-- Test success rate
SELECT 
  COUNT(CASE WHEN meets_code = true THEN 1 END) as passed,
  COUNT(CASE WHEN meets_code = false THEN 1 END) as failed,
  COUNT(*) as total
FROM blower_door_tests
WHERE test_date > NOW() - INTERVAL '30 days';

-- Average ACH50 by building type
SELECT 
  number_of_stories,
  basement_type,
  AVG(ach50) as avg_ach50,
  COUNT(*) as test_count
FROM blower_door_tests
GROUP BY number_of_stories, basement_type
ORDER BY avg_ach50;

-- Test quality distribution (correlation coefficient)
SELECT 
  CASE 
    WHEN correlation_coefficient >= 0.99 THEN 'Excellent'
    WHEN correlation_coefficient >= 0.95 THEN 'Good'
    WHEN correlation_coefficient >= 0.90 THEN 'Acceptable'
    ELSE 'Poor'
  END as quality,
  COUNT(*) as count
FROM blower_door_tests
GROUP BY quality;

-- Compliance rate over time
SELECT 
  DATE(test_date) as date,
  COUNT(CASE WHEN meets_code THEN 1 END)::FLOAT / COUNT(*) * 100 as pass_rate,
  COUNT(*) as tests_performed
FROM blower_door_tests
WHERE test_date > NOW() - INTERVAL '90 days'
GROUP BY DATE(test_date)
ORDER BY date DESC;
```

## Troubleshooting

### Common Issues

**Issue**: ACH50 calculation shows unrealistic values (< 0.5 or > 10.0)
```bash
# Solution 1: Check house volume
SELECT house_volume, conditioned_area 
FROM blower_door_tests 
WHERE id = 'test-uuid';

# Solution 2: Verify test points data quality
SELECT test_points 
FROM blower_door_tests 
WHERE id = 'test-uuid';

# Solution 3: Check for data entry errors
# - Ensure house_volume is in cubic feet (not square feet)
# - Verify cfm50 values are reasonable (typically 800-5000 for residential)
```

**Issue**: Poor correlation coefficient (R² < 0.90)
```bash
# Possible causes:
# 1. Too few test points (need 5+ valid points)
# 2. Inconsistent pressure readings
# 3. Equipment calibration issues
# 4. Wind interference during test

# Solution: Review test_points array
# - Check for outliers
# - Ensure fan pressure increases with house pressure
# - Verify ring configuration consistency
```

**Issue**: Test fails Minnesota code but appears airtight
```bash
# Check code limit setting
SELECT ach50, code_limit, meets_code 
FROM blower_door_tests 
WHERE id = 'test-uuid';

# Verify it's using Minnesota 2020 Code (3.0 ACH50)
# If showing 5.0, update:
UPDATE blower_door_tests 
SET code_limit = 3.0, 
    meets_code = (ach50 <= 3.0),
    margin = 3.0 - ach50
WHERE code_limit = 5.0;
```

**Issue**: Weather/altitude corrections not applied
```bash
# Check correction flags
SELECT 
  weather_correction_applied,
  altitude_correction_factor,
  altitude,
  outdoor_temp,
  indoor_temp,
  wind_speed,
  barometric_pressure
FROM blower_door_tests 
WHERE id = 'test-uuid';

# If corrections missing:
# - Ensure all weather fields populated
# - Altitude should be ~900 for Minneapolis
# - Recalculate test with corrections enabled
```

## Deployment Checklist

### Pre-Deployment
- ✅ All smoke tests passing (12/12)
- ✅ Database schema synced (`npm run db:push`)
- ✅ Environment variables set (DATABASE_URL, SESSION_SECRET)
- ✅ Test data validated (realistic ACH50 values, proper test points)
- ✅ Calculation accuracy verified (ACH50, CFM50, ELA formulas)
- ✅ Minnesota code limit set to 3.0 ACH50

### Post-Deployment
- ✅ Verify test creation works (`POST /api/blower-door-tests`)
- ✅ Test calculation accuracy with known values
- ✅ Verify Minnesota code compliance checking
- ✅ Review test history display and filtering
- ✅ Check PDF report generation
- ✅ Monitor test success rate metrics

## Acceptance Checklist

For detailed verification procedures, see: [BLOWER_DOOR_COMPLIANCE.md](./BLOWER_DOOR_COMPLIANCE.md)

### Development (5/5) ✅
- ✅ `npm run dev` starts server without errors
- ✅ Database schema synced (`npm run db:push`)
- ✅ Seed data available (`db/seed-blower-door.sql`)
- ✅ Smoke tests executable (`scripts/smoke-test-blower-door.sh`)
- ✅ TypeScript compilation clean

### API Endpoints (6/6) ✅
- ✅ List tests for job (GET)
- ✅ Get specific test (GET)
- ✅ Get latest test (GET)
- ✅ Create new test (POST)
- ✅ Update existing test (PATCH)
- ✅ Delete test (DELETE)

### Calculations (7/7) ✅
- ✅ ACH50 formula accuracy
- ✅ Multi-point regression
- ✅ Weather corrections
- ✅ Altitude corrections
- ✅ ELA calculation
- ✅ Ring configuration factors
- ✅ Correlation coefficient (R²)

### Compliance (4/4) ✅
- ✅ Minnesota 2020 Code (3.0 ACH50)
- ✅ Automatic pass/fail determination
- ✅ Margin calculation
- ✅ Compliance status updates on job

## Production Artifacts

| Artifact | Description | Location |
|----------|-------------|----------|
| **Runbook** | Comprehensive documentation (this file) | `BLOWER_DOOR_SLICE.md` |
| **Smoke Test** | 12-test automated verification | `scripts/smoke-test-blower-door.sh` |
| **Seed Data** | 8 realistic test scenarios | `db/seed-blower-door.sql` |
| **Compliance** | 40-point vertical slice checklist | `BLOWER_DOOR_COMPLIANCE.md` |
| **Schema** | Database table definition | `shared/schema.ts` (lines 885-941) |
| **API Routes** | Backend endpoint implementations | `server/routes.ts` (lines 6199-6304) |
| **UI Component** | Full-featured test interface | `client/src/pages/BlowerDoorTest.tsx` |

## Related Features

### Dependencies
- **Job System**: Tests must be associated with a job
- **Authentication**: Requires Replit Auth for user login
- **Report Generation**: Tests can be included in PDF reports

### Future Enhancements
- [ ] Multi-building/unit testing (condos, townhomes)
- [ ] Graphical test point visualization
- [ ] Equipment calibration tracking integration
- [ ] Automated weather data import (NOAA API)
- [ ] Comparison with previous tests (improvement tracking)
- [ ] Mobile-optimized data entry
- [ ] Voice-to-text for notes
- [ ] Real-time calculation preview as data entered

---

**Last Updated**: October 29, 2025  
**Compliance Status**: 40/40 ✅  
**Production Ready**: Yes
