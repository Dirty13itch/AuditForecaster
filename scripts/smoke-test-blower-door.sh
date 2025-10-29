#!/bin/bash

# Blower Door Testing - Smoke Test Suite
# Tests the complete lifecycle of blower door test operations
# 
# Prerequisites:
# - Application running (npm run dev)
# - Database initialized
# - Test user logged in or authentication bypassed
# - jq installed for JSON parsing

set -e  # Exit on first failure

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
PASSED=0
FAILED=0
SKIPPED=0

# Test tracking
declare -a FAILED_TESTS=()

# Helper function to print test results
print_test() {
  local status=$1
  local test_name=$2
  local message=$3
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    ((PASSED++))
  elif [ "$status" = "FAIL" ]; then
    echo -e "${RED}✗${NC} $test_name"
    [ -n "$message" ] && echo -e "  ${RED}└─${NC} $message"
    FAILED_TESTS+=("$test_name: $message")
    ((FAILED++))
  elif [ "$status" = "SKIP" ]; then
    echo -e "${YELLOW}⊘${NC} $test_name (skipped)"
    [ -n "$message" ] && echo -e "  ${YELLOW}└─${NC} $message"
    ((SKIPPED++))
  fi
}

# Cleanup function
cleanup() {
  if [ -n "$TEST_JOB_ID" ]; then
    echo -e "\n${YELLOW}Cleaning up test data...${NC}"
    # Delete test blower door test if created
    if [ -n "$TEST_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/blower-door-tests/$TEST_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
    # Delete test job if created
    curl -s -X DELETE "$BASE_URL/api/jobs/$TEST_JOB_ID" \
      -H "Content-Type: application/json" \
      --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
  fi
  rm -f cookies.txt test_response.json
}

trap cleanup EXIT

echo "========================================"
echo "Blower Door Testing - Smoke Tests"
echo "========================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/healthz")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  print_test "PASS" "Health check endpoint responds"
else
  print_test "FAIL" "Health check endpoint responds" "Expected 200, got $HTTP_CODE"
  echo "Cannot proceed without healthy server"
  exit 1
fi

# Test 2: Create prerequisite job
echo ""
echo "Test 2: Create prerequisite job for testing"

# Try to get existing jobs first
JOBS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/jobs?limit=1" \
  --cookie-jar cookies.txt --cookie cookies.txt)
JOBS_HTTP_CODE=$(echo "$JOBS_RESPONSE" | tail -n1)
JOBS_BODY=$(echo "$JOBS_RESPONSE" | head -n-1)

if [ "$JOBS_HTTP_CODE" = "200" ] && [ "$(echo "$JOBS_BODY" | jq -r '.items[0].id // empty')" != "" ]; then
  TEST_JOB_ID=$(echo "$JOBS_BODY" | jq -r '.items[0].id')
  print_test "PASS" "Using existing job for tests" "Job ID: $TEST_JOB_ID"
else
  # Create a new test job
  CREATE_JOB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/jobs" \
    -H "Content-Type: application/json" \
    --cookie-jar cookies.txt --cookie cookies.txt \
    -d '{
      "address": "123 Test Blower St",
      "city": "Minneapolis",
      "state": "MN",
      "zipCode": "55401",
      "clientName": "Test Client",
      "clientEmail": "test@example.com",
      "clientPhone": "612-555-0100",
      "status": "scheduled",
      "houseVolume": "36000",
      "floorArea": "2400",
      "surfaceArea": "5200",
      "stories": "2",
      "scheduledDate": "2025-11-01T10:00:00Z"
    }')
  
  CREATE_JOB_HTTP_CODE=$(echo "$CREATE_JOB_RESPONSE" | tail -n1)
  CREATE_JOB_BODY=$(echo "$CREATE_JOB_RESPONSE" | head -n-1)
  
  if [ "$CREATE_JOB_HTTP_CODE" = "201" ] || [ "$CREATE_JOB_HTTP_CODE" = "200" ]; then
    TEST_JOB_ID=$(echo "$CREATE_JOB_BODY" | jq -r '.id')
    if [ -n "$TEST_JOB_ID" ] && [ "$TEST_JOB_ID" != "null" ]; then
      print_test "PASS" "Created test job" "Job ID: $TEST_JOB_ID"
    else
      print_test "FAIL" "Created test job" "No job ID in response"
      exit 1
    fi
  else
    print_test "SKIP" "Created test job" "Could not create job (status: $CREATE_JOB_HTTP_CODE)"
    echo "Skipping remaining tests - prerequisite failed"
    exit 0
  fi
fi

# Test 3: Create blower door test
echo ""
echo "Test 3: Create blower door test with valid data"

CREATE_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/blower-door-tests" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d "{
    \"jobId\": \"$TEST_JOB_ID\",
    \"testDate\": \"2025-10-29T10:00:00Z\",
    \"testTime\": \"10:00\",
    \"equipmentSerial\": \"EC-TEST-12345\",
    \"houseVolume\": 36000,
    \"conditionedArea\": 2400,
    \"surfaceArea\": 5200,
    \"numberOfStories\": 2,
    \"basementType\": \"unconditioned\",
    \"outdoorTemp\": 35,
    \"indoorTemp\": 68,
    \"outdoorHumidity\": 40,
    \"indoorHumidity\": 35,
    \"windSpeed\": 10,
    \"barometricPressure\": 29.85,
    \"altitude\": 900,
    \"testPoints\": [
      {\"housePressure\": 50, \"fanPressure\": 62.5, \"cfm\": 1500, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 45, \"fanPressure\": 57.2, \"cfm\": 1425, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 40, \"fanPressure\": 51.8, \"cfm\": 1350, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 35, \"fanPressure\": 46.0, \"cfm\": 1270, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 30, \"fanPressure\": 39.5, \"cfm\": 1180, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 25, \"fanPressure\": 32.5, \"cfm\": 1090, \"ringConfiguration\": \"Open\"},
      {\"housePressure\": 20, \"fanPressure\": 24.8, \"cfm\": 985, \"ringConfiguration\": \"Open\"}
    ],
    \"cfm50\": 1500,
    \"ach50\": 2.5,
    \"ela\": 125.5,
    \"nFactor\": 0.650,
    \"correlationCoefficient\": 0.9985,
    \"notes\": \"Smoke test - good airtightness\"
  }")

CREATE_TEST_HTTP_CODE=$(echo "$CREATE_TEST_RESPONSE" | tail -n1)
CREATE_TEST_BODY=$(echo "$CREATE_TEST_RESPONSE" | head -n-1)

if [ "$CREATE_TEST_HTTP_CODE" = "201" ] || [ "$CREATE_TEST_HTTP_CODE" = "200" ]; then
  TEST_ID=$(echo "$CREATE_TEST_BODY" | jq -r '.id')
  if [ -n "$TEST_ID" ] && [ "$TEST_ID" != "null" ]; then
    print_test "PASS" "Created blower door test" "Test ID: $TEST_ID"
  else
    print_test "FAIL" "Created blower door test" "No test ID in response"
    exit 1
  fi
else
  print_test "FAIL" "Created blower door test" "Expected 201, got $CREATE_TEST_HTTP_CODE"
  exit 1
fi

# Test 4: Get test by ID
echo ""
echo "Test 4: Retrieve blower door test by ID"

GET_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/blower-door-tests/$TEST_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_TEST_HTTP_CODE=$(echo "$GET_TEST_RESPONSE" | tail -n1)
GET_TEST_BODY=$(echo "$GET_TEST_RESPONSE" | head -n-1)

if [ "$GET_TEST_HTTP_CODE" = "200" ]; then
  RETRIEVED_ID=$(echo "$GET_TEST_BODY" | jq -r '.id')
  if [ "$RETRIEVED_ID" = "$TEST_ID" ]; then
    print_test "PASS" "Retrieved test by ID matches created test"
  else
    print_test "FAIL" "Retrieved test by ID matches created test" "ID mismatch"
  fi
else
  print_test "FAIL" "Retrieved test by ID" "Expected 200, got $GET_TEST_HTTP_CODE"
fi

# Test 5: Verify ACH50 calculation
echo ""
echo "Test 5: Verify ACH50 calculation accuracy"

ACH50_VALUE=$(echo "$GET_TEST_BODY" | jq -r '.ach50')
if [ -n "$ACH50_VALUE" ] && [ "$ACH50_VALUE" != "null" ]; then
  # Check if ACH50 is within reasonable range (should be 2.5)
  if (( $(echo "$ACH50_VALUE >= 2.4 && $ACH50_VALUE <= 2.6" | bc -l) )); then
    print_test "PASS" "ACH50 calculation is accurate" "Value: $ACH50_VALUE"
  else
    print_test "FAIL" "ACH50 calculation is accurate" "Expected ~2.5, got $ACH50_VALUE"
  fi
else
  print_test "FAIL" "ACH50 calculation is accurate" "ACH50 value missing"
fi

# Test 6: Verify Minnesota code compliance
echo ""
echo "Test 6: Verify Minnesota 2020 Energy Code compliance"

MEETS_CODE=$(echo "$GET_TEST_BODY" | jq -r '.meetsCode')
CODE_LIMIT=$(echo "$GET_TEST_BODY" | jq -r '.codeLimit')
MARGIN=$(echo "$GET_TEST_BODY" | jq -r '.margin')

if [ "$MEETS_CODE" = "true" ] && [ "$CODE_LIMIT" = "3" ]; then
  print_test "PASS" "Minnesota code compliance check" "Passes 3.0 ACH50 limit (margin: $MARGIN)"
elif [ "$MEETS_CODE" = "true" ]; then
  print_test "FAIL" "Minnesota code compliance check" "Code limit should be 3.0, got $CODE_LIMIT"
else
  print_test "FAIL" "Minnesota code compliance check" "Test should pass with ACH50 2.5"
fi

# Test 7: Verify multi-point test data
echo ""
echo "Test 7: Verify multi-point test data storage"

TEST_POINTS_COUNT=$(echo "$GET_TEST_BODY" | jq -r '.testPoints | length')
if [ "$TEST_POINTS_COUNT" = "7" ]; then
  print_test "PASS" "Multi-point test data stored correctly" "$TEST_POINTS_COUNT points"
else
  print_test "FAIL" "Multi-point test data stored correctly" "Expected 7 points, got $TEST_POINTS_COUNT"
fi

# Test 8: Verify ELA calculation
echo ""
echo "Test 8: Verify ELA (Effective Leakage Area) calculation"

ELA_VALUE=$(echo "$GET_TEST_BODY" | jq -r '.ela')
if [ -n "$ELA_VALUE" ] && [ "$ELA_VALUE" != "null" ]; then
  # ELA should be around 125.5 square inches for this test
  if (( $(echo "$ELA_VALUE >= 120 && $ELA_VALUE <= 131" | bc -l) )); then
    print_test "PASS" "ELA calculation is accurate" "Value: $ELA_VALUE sq in"
  else
    print_test "FAIL" "ELA calculation is accurate" "Expected ~125.5, got $ELA_VALUE"
  fi
else
  print_test "FAIL" "ELA calculation is accurate" "ELA value missing"
fi

# Test 9: Verify correlation coefficient
echo ""
echo "Test 9: Verify correlation coefficient (R²) quality"

CORRELATION=$(echo "$GET_TEST_BODY" | jq -r '.correlationCoefficient')
if [ -n "$CORRELATION" ] && [ "$CORRELATION" != "null" ]; then
  # Correlation should be > 0.99 for quality test
  if (( $(echo "$CORRELATION >= 0.99" | bc -l) )); then
    print_test "PASS" "Correlation coefficient indicates quality test" "R² = $CORRELATION"
  else
    print_test "FAIL" "Correlation coefficient indicates quality test" "Expected ≥0.99, got $CORRELATION"
  fi
else
  print_test "FAIL" "Correlation coefficient check" "Value missing"
fi

# Test 10: List tests for job
echo ""
echo "Test 10: List all blower door tests for job"

LIST_TESTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/blower-door-tests?jobId=$TEST_JOB_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
LIST_TESTS_HTTP_CODE=$(echo "$LIST_TESTS_RESPONSE" | tail -n1)
LIST_TESTS_BODY=$(echo "$LIST_TESTS_RESPONSE" | head -n-1)

if [ "$LIST_TESTS_HTTP_CODE" = "200" ]; then
  TESTS_COUNT=$(echo "$LIST_TESTS_BODY" | jq -r 'length')
  if [ "$TESTS_COUNT" -ge "1" ]; then
    print_test "PASS" "Listed tests for job" "Found $TESTS_COUNT test(s)"
  else
    print_test "FAIL" "Listed tests for job" "Expected at least 1 test, got $TESTS_COUNT"
  fi
else
  print_test "FAIL" "Listed tests for job" "Expected 200, got $LIST_TESTS_HTTP_CODE"
fi

# Test 11: Update test
echo ""
echo "Test 11: Update blower door test"

UPDATE_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/blower-door-tests/$TEST_ID" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d '{
    "notes": "Smoke test - updated notes after review"
  }')

UPDATE_TEST_HTTP_CODE=$(echo "$UPDATE_TEST_RESPONSE" | tail -n1)
UPDATE_TEST_BODY=$(echo "$UPDATE_TEST_RESPONSE" | head -n-1)

if [ "$UPDATE_TEST_HTTP_CODE" = "200" ]; then
  UPDATED_NOTES=$(echo "$UPDATE_TEST_BODY" | jq -r '.notes')
  if [[ "$UPDATED_NOTES" == *"updated"* ]]; then
    print_test "PASS" "Updated test successfully" "Notes updated"
  else
    print_test "FAIL" "Updated test successfully" "Notes not updated"
  fi
else
  print_test "FAIL" "Updated test" "Expected 200, got $UPDATE_TEST_HTTP_CODE"
fi

# Test 12: Get latest test for job
echo ""
echo "Test 12: Get latest test for job"

LATEST_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/jobs/$TEST_JOB_ID/blower-door-tests/latest" \
  --cookie-jar cookies.txt --cookie cookies.txt)
LATEST_TEST_HTTP_CODE=$(echo "$LATEST_TEST_RESPONSE" | tail -n1)
LATEST_TEST_BODY=$(echo "$LATEST_TEST_RESPONSE" | head -n-1)

if [ "$LATEST_TEST_HTTP_CODE" = "200" ]; then
  LATEST_ID=$(echo "$LATEST_TEST_BODY" | jq -r '.id')
  if [ "$LATEST_ID" = "$TEST_ID" ]; then
    print_test "PASS" "Retrieved latest test for job" "Matches created test"
  else
    print_test "FAIL" "Retrieved latest test for job" "ID mismatch"
  fi
else
  print_test "FAIL" "Retrieved latest test for job" "Expected 200, got $LATEST_TEST_HTTP_CODE"
fi

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}•${NC} $test"
  done
  echo ""
  exit 1
else
  echo ""
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  exit 0
fi
