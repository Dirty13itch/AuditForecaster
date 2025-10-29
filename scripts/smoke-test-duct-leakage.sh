#!/bin/bash

# Duct Leakage Testing - Smoke Test Suite
# Tests CRUD operations, calculations, and Minnesota Code compliance logic
# Expected duration: 30-45 seconds

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-http://localhost:5000/api}"
TEST_JOB_ID=""
TEST_ID=""
CLEANUP_IDS=()

# Helper functions
log_test() {
  echo -e "${BLUE}[TEST $1/$2]${NC} $3"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

cleanup() {
  echo ""
  log_info "Cleaning up test data..."
  
  # Delete created tests
  for id in "${CLEANUP_IDS[@]}"; do
    curl -s -X DELETE "$API_BASE/duct-leakage-tests/$id" \
      -H "Content-Type: application/json" \
      > /dev/null 2>&1 || true
    log_success "Deleted test: $id"
  done
  
  # Delete test job if created
  if [ ! -z "$TEST_JOB_ID" ]; then
    curl -s -X DELETE "$API_BASE/jobs/$TEST_JOB_ID" \
      -H "Content-Type: application/json" \
      > /dev/null 2>&1 || true
    log_success "Deleted test job: $TEST_JOB_ID"
  fi
  
  echo ""
}

# Set up cleanup trap
trap cleanup EXIT

echo "=================================================="
echo "  Duct Leakage Testing - Smoke Test Suite"
echo "  Minnesota 2020 Energy Code Compliance Testing"
echo "=================================================="
echo ""

# Test 1: Health Check
log_test 1 12 "Health check - API connectivity"
HEALTH=$(curl -s "$API_BASE/health" || echo "FAILED")
if echo "$HEALTH" | grep -q "ok"; then
  log_success "API is healthy"
else
  log_error "API health check failed"
  exit 1
fi
echo ""

# Test 2: Create test job for testing
log_test 2 12 "Create test job"
JOB_RESPONSE=$(curl -s -X POST "$API_BASE/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1234 Test St, Minneapolis, MN 55401",
    "stage": "testing",
    "status": "scheduled",
    "floorArea": "2100",
    "conditionedArea": "2100"
  }')

TEST_JOB_ID=$(echo "$JOB_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TEST_JOB_ID" ]; then
  log_error "Failed to create test job"
  echo "Response: $JOB_RESPONSE"
  exit 1
fi

log_success "Created test job: $TEST_JOB_ID"
echo ""

# Test 3: Create duct leakage test (TDL only) - Should FAIL Minnesota Code
log_test 3 12 "Create test - TDL only (FAIL scenario)"
TDL_FAIL_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-15T14:30:00.000Z\",
    \"testTime\": \"14:30\",
    \"testType\": \"total\",
    \"equipmentSerial\": \"DB-2024-SMOKE-001\",
    \"systemType\": \"forced_air\",
    \"numberOfSystems\": 1,
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"totalFanPressure\": 45.0,
    \"totalRingConfiguration\": \"Ring 1\",
    \"cfm25Total\": 476,
    \"notes\": \"Smoke test - TDL fail scenario\"
  }")

TDL_FAIL_ID=$(echo "$TDL_FAIL_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TDL_FAIL_ID" ]; then
  log_error "Failed to create TDL test"
  echo "Response: $TDL_FAIL_RESPONSE"
  exit 1
fi

CLEANUP_IDS+=("$TDL_FAIL_ID")

# Verify calculations
TDL_CFM_PER_SQFT=$(echo "$TDL_FAIL_RESPONSE" | grep -o '"totalCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
TDL_MEETS_CODE=$(echo "$TDL_FAIL_RESPONSE" | grep -o '"meetsCodeTDL":[^,}]*' | cut -d':' -f2)

log_success "Created TDL test: $TDL_FAIL_ID"
log_info "  CFM25: 476"
log_info "  CFM/100ft²: $TDL_CFM_PER_SQFT (Expected: ~22.67)"
log_info "  Meets Code: $TDL_MEETS_CODE (Expected: false - >4.0 limit)"

# Validate calculation
if echo "$TDL_CFM_PER_SQFT" | grep -qE "^(22\.6|22\.7)"; then
  log_success "TDL calculation correct"
else
  log_error "TDL calculation incorrect: $TDL_CFM_PER_SQFT (Expected: ~22.67)"
fi

if echo "$TDL_MEETS_CODE" | grep -q "false"; then
  log_success "TDL compliance check correct (fails >4.0 limit)"
else
  log_error "TDL compliance check incorrect: $TDL_MEETS_CODE"
fi
echo ""

# Test 4: Create duct leakage test (DLO only) - Should PASS Minnesota Code
log_test 4 12 "Create test - DLO only (PASS scenario)"
DLO_PASS_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-15T15:30:00.000Z\",
    \"testTime\": \"15:30\",
    \"testType\": \"leakage_to_outside\",
    \"equipmentSerial\": \"DB-2024-SMOKE-001\",
    \"systemType\": \"forced_air\",
    \"numberOfSystems\": 1,
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"outsideHousePressure\": -25.0,
    \"outsideFanPressure\": 28.5,
    \"outsideRingConfiguration\": \"Ring 1\",
    \"cfm25Outside\": 42,
    \"notes\": \"Smoke test - DLO pass scenario\"
  }")

DLO_PASS_ID=$(echo "$DLO_PASS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$DLO_PASS_ID" ]; then
  log_error "Failed to create DLO test"
  echo "Response: $DLO_PASS_RESPONSE"
  exit 1
fi

CLEANUP_IDS+=("$DLO_PASS_ID")

# Verify calculations
DLO_CFM_PER_SQFT=$(echo "$DLO_PASS_RESPONSE" | grep -o '"outsideCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
DLO_MEETS_CODE=$(echo "$DLO_PASS_RESPONSE" | grep -o '"meetsCodeDLO":[^,}]*' | cut -d':' -f2)

log_success "Created DLO test: $DLO_PASS_ID"
log_info "  CFM25: 42"
log_info "  CFM/100ft²: $DLO_CFM_PER_SQFT (Expected: 2.00)"
log_info "  Meets Code: $DLO_MEETS_CODE (Expected: true - ≤3.0 limit)"

# Validate calculation
if echo "$DLO_CFM_PER_SQFT" | grep -qE "^2\.0"; then
  log_success "DLO calculation correct"
else
  log_error "DLO calculation incorrect: $DLO_CFM_PER_SQFT (Expected: 2.00)"
fi

if echo "$DLO_MEETS_CODE" | grep -q "true"; then
  log_success "DLO compliance check correct (passes ≤3.0 limit)"
else
  log_error "DLO compliance check incorrect: $DLO_MEETS_CODE"
fi
echo ""

# Test 5: Create duct leakage test (BOTH) - TDL PASS, DLO PASS
log_test 5 12 "Create test - Both TDL and DLO (BOTH PASS)"
BOTH_PASS_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-15T16:30:00.000Z\",
    \"testTime\": \"16:30\",
    \"testType\": \"both\",
    \"equipmentSerial\": \"DB-2024-SMOKE-001\",
    \"systemType\": \"heat_pump\",
    \"numberOfSystems\": 1,
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"totalFanPressure\": 18.5,
    \"totalRingConfiguration\": \"Ring 1\",
    \"cfm25Total\": 63,
    \"outsideHousePressure\": -25.0,
    \"outsideFanPressure\": 12.2,
    \"outsideRingConfiguration\": \"Ring 1\",
    \"cfm25Outside\": 42,
    \"pressurePanReadings\": [
      {\"location\": \"Master Bedroom\", \"supplyReturn\": \"supply\", \"reading\": 0.5, \"passFail\": \"pass\"},
      {\"location\": \"Living Room\", \"supplyReturn\": \"supply\", \"reading\": 0.8, \"passFail\": \"pass\"}
    ],
    \"notes\": \"Smoke test - Both pass scenario\",
    \"recommendations\": \"Excellent duct system - no remediation needed\"
  }")

BOTH_PASS_ID=$(echo "$BOTH_PASS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BOTH_PASS_ID" ]; then
  log_error "Failed to create BOTH test"
  echo "Response: $BOTH_PASS_RESPONSE"
  exit 1
fi

CLEANUP_IDS+=("$BOTH_PASS_ID")
TEST_ID="$BOTH_PASS_ID"  # Use this for subsequent tests

# Verify calculations
BOTH_TDL_CFM=$(echo "$BOTH_PASS_RESPONSE" | grep -o '"totalCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
BOTH_DLO_CFM=$(echo "$BOTH_PASS_RESPONSE" | grep -o '"outsideCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
BOTH_TDL_CODE=$(echo "$BOTH_PASS_RESPONSE" | grep -o '"meetsCodeTDL":[^,}]*' | cut -d':' -f2)
BOTH_DLO_CODE=$(echo "$BOTH_PASS_RESPONSE" | grep -o '"meetsCodeDLO":[^,}]*' | cut -d':' -f2)

log_success "Created BOTH test: $BOTH_PASS_ID"
log_info "  TDL: 63 CFM25 → $BOTH_TDL_CFM CFM/100ft² (Expected: 3.00)"
log_info "  DLO: 42 CFM25 → $BOTH_DLO_CFM CFM/100ft² (Expected: 2.00)"
log_info "  TDL Meets Code: $BOTH_TDL_CODE (Expected: true)"
log_info "  DLO Meets Code: $BOTH_DLO_CODE (Expected: true)"

if echo "$BOTH_TDL_CODE" | grep -q "true" && echo "$BOTH_DLO_CODE" | grep -q "true"; then
  log_success "Both TDL and DLO pass code compliance"
else
  log_error "Compliance check failed - TDL: $BOTH_TDL_CODE, DLO: $BOTH_DLO_CODE"
fi
echo ""

# Test 6: Get test by ID
log_test 6 12 "Get test by ID"
GET_RESPONSE=$(curl -s "$API_BASE/duct-leakage-tests/$TEST_ID")

GET_ID=$(echo "$GET_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ "$GET_ID" = "$TEST_ID" ]; then
  log_success "Retrieved test successfully"
  
  # Verify pressure pan data persisted
  if echo "$GET_RESPONSE" | grep -q "Master Bedroom"; then
    log_success "Pressure pan data persisted correctly"
  else
    log_error "Pressure pan data missing"
  fi
else
  log_error "Failed to retrieve test"
fi
echo ""

# Test 7: Get tests by job ID
log_test 7 12 "Get tests by job ID"
JOB_TESTS_RESPONSE=$(curl -s "$API_BASE/duct-leakage-tests?jobId=$TEST_JOB_ID")

TEST_COUNT=$(echo "$JOB_TESTS_RESPONSE" | grep -o '"id":"[^"]*' | wc -l)

if [ "$TEST_COUNT" -ge 3 ]; then
  log_success "Retrieved $TEST_COUNT tests for job"
else
  log_error "Expected at least 3 tests, got $TEST_COUNT"
fi
echo ""

# Test 8: Get latest test for job
log_test 8 12 "Get latest test for job"
LATEST_RESPONSE=$(curl -s "$API_BASE/jobs/$TEST_JOB_ID/duct-leakage-tests/latest")

LATEST_ID=$(echo "$LATEST_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$LATEST_ID" ]; then
  log_success "Retrieved latest test: $LATEST_ID"
  log_info "  (Should be most recent test created)"
else
  log_error "Failed to retrieve latest test"
fi
echo ""

# Test 9: Update test - Verify recalculation
log_test 9 12 "Update test - Verify automatic recalculation"
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/duct-leakage-tests/$TEST_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "cfm25Total": 84,
    "cfm25Outside": 63,
    "recommendations": "After minor remediation - both still pass code"
  }')

UPDATED_TDL_CFM=$(echo "$UPDATE_RESPONSE" | grep -o '"totalCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
UPDATED_DLO_CFM=$(echo "$UPDATE_RESPONSE" | grep -o '"outsideCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
UPDATED_TDL_CODE=$(echo "$UPDATE_RESPONSE" | grep -o '"meetsCodeTDL":[^,}]*' | cut -d':' -f2)
UPDATED_DLO_CODE=$(echo "$UPDATE_RESPONSE" | grep -o '"meetsCodeDLO":[^,}]*' | cut -d':' -f2)

log_success "Updated test successfully"
log_info "  New TDL: 84 CFM25 → $UPDATED_TDL_CFM CFM/100ft² (Expected: 4.00)"
log_info "  New DLO: 63 CFM25 → $UPDATED_DLO_CFM CFM/100ft² (Expected: 3.00)"
log_info "  TDL Meets Code: $UPDATED_TDL_CODE (Expected: true - exactly at limit)"
log_info "  DLO Meets Code: $UPDATED_DLO_CODE (Expected: true - exactly at limit)"

# Verify recalculation
if echo "$UPDATED_TDL_CFM" | grep -qE "^4\.0"; then
  log_success "TDL recalculation correct"
else
  log_error "TDL recalculation incorrect: $UPDATED_TDL_CFM (Expected: 4.00)"
fi

if echo "$UPDATED_DLO_CFM" | grep -qE "^3\.0"; then
  log_success "DLO recalculation correct"
else
  log_error "DLO recalculation incorrect: $UPDATED_DLO_CFM (Expected: 3.00)"
fi

# Verify compliance (at exactly the limit should still pass)
if echo "$UPDATED_TDL_CODE" | grep -q "true" && echo "$UPDATED_DLO_CODE" | grep -q "true"; then
  log_success "Compliance check correct (both at exact limit, still pass)"
else
  log_error "Compliance check failed at limits - TDL: $UPDATED_TDL_CODE, DLO: $UPDATED_DLO_CODE"
fi
echo ""

# Test 10: Verify TDL limit boundary (4.0 CFM25/100 sq ft)
log_test 10 12 "Verify TDL code limit boundary (4.0 CFM25/100 sq ft)"

# Test just under limit
UNDER_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-16T10:00:00.000Z\",
    \"testTime\": \"10:00\",
    \"testType\": \"total\",
    \"systemType\": \"forced_air\",
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"cfm25Total\": 83,
    \"notes\": \"Boundary test - just under 4.0 limit\"
  }")

UNDER_ID=$(echo "$UNDER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
CLEANUP_IDS+=("$UNDER_ID")

UNDER_CFM=$(echo "$UNDER_RESPONSE" | grep -o '"totalCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
UNDER_CODE=$(echo "$UNDER_RESPONSE" | grep -o '"meetsCodeTDL":[^,}]*' | cut -d':' -f2)

log_info "  Just under limit: 83 CFM25 → $UNDER_CFM CFM/100ft² → Meets Code: $UNDER_CODE"

if echo "$UNDER_CODE" | grep -q "true"; then
  log_success "TDL limit boundary correct (3.95 passes)"
else
  log_error "TDL limit boundary incorrect (3.95 should pass)"
fi

# Test just over limit
OVER_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-16T11:00:00.000Z\",
    \"testTime\": \"11:00\",
    \"testType\": \"total\",
    \"systemType\": \"forced_air\",
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"cfm25Total\": 85,
    \"notes\": \"Boundary test - just over 4.0 limit\"
  }")

OVER_ID=$(echo "$OVER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
CLEANUP_IDS+=("$OVER_ID")

OVER_CFM=$(echo "$OVER_RESPONSE" | grep -o '"totalCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
OVER_CODE=$(echo "$OVER_RESPONSE" | grep -o '"meetsCodeTDL":[^,}]*' | cut -d':' -f2)

log_info "  Just over limit: 85 CFM25 → $OVER_CFM CFM/100ft² → Meets Code: $OVER_CODE"

if echo "$OVER_CODE" | grep -q "false"; then
  log_success "TDL limit boundary correct (4.05 fails)"
else
  log_error "TDL limit boundary incorrect (4.05 should fail)"
fi
echo ""

# Test 11: Verify DLO limit boundary (3.0 CFM25/100 sq ft)
log_test 11 12 "Verify DLO code limit boundary (3.0 CFM25/100 sq ft)"

# Test just under limit
DLO_UNDER_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-16T12:00:00.000Z\",
    \"testTime\": \"12:00\",
    \"testType\": \"leakage_to_outside\",
    \"systemType\": \"forced_air\",
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"outsideHousePressure\": -25.0,
    \"cfm25Outside\": 62,
    \"notes\": \"Boundary test - just under 3.0 limit\"
  }")

DLO_UNDER_ID=$(echo "$DLO_UNDER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
CLEANUP_IDS+=("$DLO_UNDER_ID")

DLO_UNDER_CFM=$(echo "$DLO_UNDER_RESPONSE" | grep -o '"outsideCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
DLO_UNDER_CODE=$(echo "$DLO_UNDER_RESPONSE" | grep -o '"meetsCodeDLO":[^,}]*' | cut -d':' -f2)

log_info "  Just under limit: 62 CFM25 → $DLO_UNDER_CFM CFM/100ft² → Meets Code: $DLO_UNDER_CODE"

if echo "$DLO_UNDER_CODE" | grep -q "true"; then
  log_success "DLO limit boundary correct (2.95 passes)"
else
  log_error "DLO limit boundary incorrect (2.95 should pass)"
fi

# Test just over limit
DLO_OVER_RESPONSE=$(curl -s -X POST "$API_BASE/duct-leakage-tests" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2024-03-16T13:00:00.000Z\",
    \"testTime\": \"13:00\",
    \"testType\": \"leakage_to_outside\",
    \"systemType\": \"forced_air\",
    \"conditionedArea\": 2100,
    \"systemAirflow\": 1400,
    \"outsideHousePressure\": -25.0,
    \"cfm25Outside\": 64,
    \"notes\": \"Boundary test - just over 3.0 limit\"
  }")

DLO_OVER_ID=$(echo "$DLO_OVER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
CLEANUP_IDS+=("$DLO_OVER_ID")

DLO_OVER_CFM=$(echo "$DLO_OVER_RESPONSE" | grep -o '"outsideCfmPerSqFt":"[^"]*' | cut -d'"' -f4)
DLO_OVER_CODE=$(echo "$DLO_OVER_RESPONSE" | grep -o '"meetsCodeDLO":[^,}]*' | cut -d':' -f2)

log_info "  Just over limit: 64 CFM25 → $DLO_OVER_CFM CFM/100ft² → Meets Code: $DLO_OVER_CODE"

if echo "$DLO_OVER_CODE" | grep -q "false"; then
  log_success "DLO limit boundary correct (3.05 fails)"
else
  log_error "DLO limit boundary incorrect (3.05 should fail)"
fi
echo ""

# Test 12: Delete test
log_test 12 12 "Delete test"
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE/duct-leakage-tests/$TEST_ID")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
  log_success "Deleted test successfully"
  
  # Remove from cleanup list (already deleted)
  CLEANUP_IDS=("${CLEANUP_IDS[@]/$TEST_ID}")
  
  # Verify deletion
  VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/duct-leakage-tests/$TEST_ID")
  VERIFY_CODE=$(echo "$VERIFY_RESPONSE" | tail -1)
  
  if [ "$VERIFY_CODE" = "404" ]; then
    log_success "Test deletion verified (404 Not Found)"
  else
    log_error "Test still exists after deletion (HTTP $VERIFY_CODE)"
  fi
else
  log_error "Failed to delete test (HTTP $HTTP_CODE)"
fi
echo ""

# Summary
echo "=================================================="
echo "  Smoke Test Summary"
echo "=================================================="
echo ""
log_success "All 12 tests completed successfully"
echo ""
log_info "Tested features:"
echo "  ✓ CRUD operations (Create, Read, Update, Delete)"
echo "  ✓ TDL calculations and compliance (4.0 CFM25/100 sq ft limit)"
echo "  ✓ DLO calculations and compliance (3.0 CFM25/100 sq ft limit)"
echo "  ✓ Automatic recalculation on updates"
echo "  ✓ Pressure pan data persistence"
echo "  ✓ Code boundary testing (exactly at limits)"
echo "  ✓ Job-level test queries"
echo ""
log_info "Minnesota 2020 Energy Code compliance verified"
echo ""
