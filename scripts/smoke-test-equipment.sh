#!/bin/bash

# Equipment Management - Smoke Test Suite
# Tests the complete lifecycle of equipment inventory, calibration, maintenance, and checkout operations
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

# Test data IDs (populated during tests)
TEST_EQUIPMENT_ID=""
TEST_CALIBRATION_ID=""
TEST_MAINTENANCE_ID=""
TEST_CHECKOUT_ID=""
TEST_JOB_ID=""

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
  if [ -n "$TEST_EQUIPMENT_ID" ] || [ -n "$TEST_JOB_ID" ]; then
    echo -e "\n${YELLOW}Cleaning up test data...${NC}"
    
    # Delete checkout if created
    if [ -n "$TEST_CHECKOUT_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/checkouts/$TEST_CHECKOUT_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
    
    # Delete maintenance if created
    if [ -n "$TEST_MAINTENANCE_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/maintenance/$TEST_MAINTENANCE_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
    
    # Delete calibration if created
    if [ -n "$TEST_CALIBRATION_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/calibrations/$TEST_CALIBRATION_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
    
    # Delete equipment if created
    if [ -n "$TEST_EQUIPMENT_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
    
    # Delete test job if created
    if [ -n "$TEST_JOB_ID" ]; then
      curl -s -X DELETE "$BASE_URL/api/jobs/$TEST_JOB_ID" \
        -H "Content-Type: application/json" \
        --cookie-jar cookies.txt --cookie cookies.txt >/dev/null 2>&1 || true
    fi
  fi
  rm -f cookies.txt test_response.json
}

trap cleanup EXIT

echo "========================================"
echo "Equipment Management - Smoke Tests"
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

# Test 2: Create equipment
echo ""
echo "Test 2: Create equipment with valid data"

CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NEXT_YEAR=$(date -u -d "+365 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+365d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "2026-01-29T00:00:00Z")

CREATE_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/equipment" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d "{
    \"name\": \"Test Blower Door - Smoke Test\",
    \"type\": \"blower_door\",
    \"manufacturer\": \"The Energy Conservatory\",
    \"model\": \"Model 3\",
    \"serialNumber\": \"SMOKE-TEST-$(date +%s)\",
    \"purchaseDate\": \"$CURRENT_DATE\",
    \"purchaseCost\": \"3895.00\",
    \"currentValue\": \"3895.00\",
    \"status\": \"available\",
    \"location\": \"Test Location\",
    \"calibrationInterval\": 365,
    \"maintenanceInterval\": 90,
    \"notes\": \"Smoke test equipment - should be deleted after test\"
  }")

CREATE_EQUIPMENT_HTTP_CODE=$(echo "$CREATE_EQUIPMENT_RESPONSE" | tail -n1)
CREATE_EQUIPMENT_BODY=$(echo "$CREATE_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$CREATE_EQUIPMENT_HTTP_CODE" = "201" ] || [ "$CREATE_EQUIPMENT_HTTP_CODE" = "200" ]; then
  TEST_EQUIPMENT_ID=$(echo "$CREATE_EQUIPMENT_BODY" | jq -r '.id')
  QR_CODE=$(echo "$CREATE_EQUIPMENT_BODY" | jq -r '.qrCode')
  if [ -n "$TEST_EQUIPMENT_ID" ] && [ "$TEST_EQUIPMENT_ID" != "null" ]; then
    if [ -n "$QR_CODE" ] && [ "$QR_CODE" != "null" ]; then
      print_test "PASS" "Created equipment with auto-generated QR code" "Equipment ID: $TEST_EQUIPMENT_ID, QR: $QR_CODE"
    else
      print_test "FAIL" "Created equipment with auto-generated QR code" "QR code not generated"
    fi
  else
    print_test "FAIL" "Created equipment" "No equipment ID in response"
    exit 1
  fi
else
  print_test "FAIL" "Created equipment" "Expected 201, got $CREATE_EQUIPMENT_HTTP_CODE"
  exit 1
fi

# Test 3: Get equipment by ID
echo ""
echo "Test 3: Retrieve equipment by ID"

GET_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_EQUIPMENT_HTTP_CODE=$(echo "$GET_EQUIPMENT_RESPONSE" | tail -n1)
GET_EQUIPMENT_BODY=$(echo "$GET_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$GET_EQUIPMENT_HTTP_CODE" = "200" ]; then
  RETRIEVED_ID=$(echo "$GET_EQUIPMENT_BODY" | jq -r '.id')
  RETRIEVED_STATUS=$(echo "$GET_EQUIPMENT_BODY" | jq -r '.status')
  if [ "$RETRIEVED_ID" = "$TEST_EQUIPMENT_ID" ] && [ "$RETRIEVED_STATUS" = "available" ]; then
    print_test "PASS" "Retrieved equipment by ID with correct status"
  else
    print_test "FAIL" "Retrieved equipment by ID" "ID or status mismatch"
  fi
else
  print_test "FAIL" "Retrieved equipment by ID" "Expected 200, got $GET_EQUIPMENT_HTTP_CODE"
fi

# Test 4: List all equipment
echo ""
echo "Test 4: List all equipment"

LIST_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment" \
  --cookie-jar cookies.txt --cookie cookies.txt)
LIST_EQUIPMENT_HTTP_CODE=$(echo "$LIST_EQUIPMENT_RESPONSE" | tail -n1)
LIST_EQUIPMENT_BODY=$(echo "$LIST_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$LIST_EQUIPMENT_HTTP_CODE" = "200" ]; then
  EQUIPMENT_COUNT=$(echo "$LIST_EQUIPMENT_BODY" | jq '. | length')
  if [ "$EQUIPMENT_COUNT" -ge 1 ]; then
    print_test "PASS" "Listed equipment inventory" "Found $EQUIPMENT_COUNT equipment item(s)"
  else
    print_test "FAIL" "Listed equipment inventory" "Expected at least 1 item"
  fi
else
  print_test "FAIL" "Listed equipment inventory" "Expected 200, got $LIST_EQUIPMENT_HTTP_CODE"
fi

# Test 5: Filter equipment by status
echo ""
echo "Test 5: Filter equipment by status (available)"

FILTER_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment?status=available" \
  --cookie-jar cookies.txt --cookie cookies.txt)
FILTER_EQUIPMENT_HTTP_CODE=$(echo "$FILTER_EQUIPMENT_RESPONSE" | tail -n1)
FILTER_EQUIPMENT_BODY=$(echo "$FILTER_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$FILTER_EQUIPMENT_HTTP_CODE" = "200" ]; then
  AVAILABLE_COUNT=$(echo "$FILTER_EQUIPMENT_BODY" | jq '. | length')
  # Check if our test equipment is in the available list
  TEST_IN_LIST=$(echo "$FILTER_EQUIPMENT_BODY" | jq -r ".[] | select(.id==\"$TEST_EQUIPMENT_ID\") | .id")
  if [ "$TEST_IN_LIST" = "$TEST_EQUIPMENT_ID" ]; then
    print_test "PASS" "Filtered equipment by status" "Test equipment found in available list ($AVAILABLE_COUNT total)"
  else
    print_test "FAIL" "Filtered equipment by status" "Test equipment not in available list"
  fi
else
  print_test "FAIL" "Filtered equipment by status" "Expected 200, got $FILTER_EQUIPMENT_HTTP_CODE"
fi

# Test 6: Create calibration record
echo ""
echo "Test 6: Create calibration record"

CALIBRATION_DATE="$CURRENT_DATE"
CALIBRATION_NEXT_DUE="$NEXT_YEAR"

CREATE_CALIBRATION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/calibrations" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d "{
    \"equipmentId\": \"$TEST_EQUIPMENT_ID\",
    \"calibrationDate\": \"$CALIBRATION_DATE\",
    \"nextDue\": \"$CALIBRATION_NEXT_DUE\",
    \"performedBy\": \"Test Lab\",
    \"certificateNumber\": \"TEST-CERT-$(date +%s)\",
    \"cost\": \"275.00\",
    \"passed\": true,
    \"notes\": \"Smoke test calibration\"
  }")

CREATE_CALIBRATION_HTTP_CODE=$(echo "$CREATE_CALIBRATION_RESPONSE" | tail -n1)
CREATE_CALIBRATION_BODY=$(echo "$CREATE_CALIBRATION_RESPONSE" | head -n-1)

if [ "$CREATE_CALIBRATION_HTTP_CODE" = "201" ] || [ "$CREATE_CALIBRATION_HTTP_CODE" = "200" ]; then
  TEST_CALIBRATION_ID=$(echo "$CREATE_CALIBRATION_BODY" | jq -r '.id')
  if [ -n "$TEST_CALIBRATION_ID" ] && [ "$TEST_CALIBRATION_ID" != "null" ]; then
    print_test "PASS" "Created calibration record" "Calibration ID: $TEST_CALIBRATION_ID"
  else
    print_test "FAIL" "Created calibration record" "No calibration ID in response"
  fi
else
  print_test "FAIL" "Created calibration record" "Expected 201, got $CREATE_CALIBRATION_HTTP_CODE"
fi

# Test 7: Verify parent equipment updated after calibration
echo ""
echo "Test 7: Verify equipment calibrationDue updated automatically"

GET_UPDATED_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_UPDATED_EQUIPMENT_HTTP_CODE=$(echo "$GET_UPDATED_EQUIPMENT_RESPONSE" | tail -n1)
GET_UPDATED_EQUIPMENT_BODY=$(echo "$GET_UPDATED_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$GET_UPDATED_EQUIPMENT_HTTP_CODE" = "200" ]; then
  LAST_CALIBRATION=$(echo "$GET_UPDATED_EQUIPMENT_BODY" | jq -r '.lastCalibration')
  CALIBRATION_DUE=$(echo "$GET_UPDATED_EQUIPMENT_BODY" | jq -r '.calibrationDue')
  
  if [ -n "$LAST_CALIBRATION" ] && [ "$LAST_CALIBRATION" != "null" ] && \
     [ -n "$CALIBRATION_DUE" ] && [ "$CALIBRATION_DUE" != "null" ]; then
    print_test "PASS" "Equipment calibration dates auto-updated" "Last: $LAST_CALIBRATION, Due: $CALIBRATION_DUE"
  else
    print_test "FAIL" "Equipment calibration dates auto-updated" "Dates not populated"
  fi
else
  print_test "FAIL" "Equipment calibration dates verification" "Expected 200, got $GET_UPDATED_EQUIPMENT_HTTP_CODE"
fi

# Test 8: Get calibration history
echo ""
echo "Test 8: Get calibration history for equipment"

GET_CALIBRATIONS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID/calibrations" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_CALIBRATIONS_HTTP_CODE=$(echo "$GET_CALIBRATIONS_RESPONSE" | tail -n1)
GET_CALIBRATIONS_BODY=$(echo "$GET_CALIBRATIONS_RESPONSE" | head -n-1)

if [ "$GET_CALIBRATIONS_HTTP_CODE" = "200" ]; then
  CALIBRATION_COUNT=$(echo "$GET_CALIBRATIONS_BODY" | jq '. | length')
  if [ "$CALIBRATION_COUNT" -ge 1 ]; then
    print_test "PASS" "Retrieved calibration history" "Found $CALIBRATION_COUNT calibration(s)"
  else
    print_test "FAIL" "Retrieved calibration history" "Expected at least 1 calibration"
  fi
else
  print_test "FAIL" "Retrieved calibration history" "Expected 200, got $GET_CALIBRATIONS_HTTP_CODE"
fi

# Test 9: Create maintenance record
echo ""
echo "Test 9: Create maintenance record"

MAINTENANCE_DATE="$CURRENT_DATE"
MAINTENANCE_NEXT_DUE=$(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+90d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "2025-04-29T00:00:00Z")

CREATE_MAINTENANCE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/maintenance" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d "{
    \"equipmentId\": \"$TEST_EQUIPMENT_ID\",
    \"maintenanceDate\": \"$MAINTENANCE_DATE\",
    \"performedBy\": \"Test Technician\",
    \"description\": \"Smoke test maintenance - cleaned and inspected\",
    \"cost\": \"45.00\",
    \"nextDue\": \"$MAINTENANCE_NEXT_DUE\",
    \"notes\": \"Equipment in good condition\"
  }")

CREATE_MAINTENANCE_HTTP_CODE=$(echo "$CREATE_MAINTENANCE_RESPONSE" | tail -n1)
CREATE_MAINTENANCE_BODY=$(echo "$CREATE_MAINTENANCE_RESPONSE" | head -n-1)

if [ "$CREATE_MAINTENANCE_HTTP_CODE" = "201" ] || [ "$CREATE_MAINTENANCE_HTTP_CODE" = "200" ]; then
  TEST_MAINTENANCE_ID=$(echo "$CREATE_MAINTENANCE_BODY" | jq -r '.id')
  if [ -n "$TEST_MAINTENANCE_ID" ] && [ "$TEST_MAINTENANCE_ID" != "null" ]; then
    print_test "PASS" "Created maintenance record" "Maintenance ID: $TEST_MAINTENANCE_ID"
  else
    print_test "FAIL" "Created maintenance record" "No maintenance ID in response"
  fi
else
  print_test "FAIL" "Created maintenance record" "Expected 201, got $CREATE_MAINTENANCE_HTTP_CODE"
fi

# Test 10: Create prerequisite job for checkout
echo ""
echo "Test 10: Create job for equipment checkout testing"

JOBS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/jobs?limit=1" \
  --cookie-jar cookies.txt --cookie cookies.txt)
JOBS_HTTP_CODE=$(echo "$JOBS_RESPONSE" | tail -n1)
JOBS_BODY=$(echo "$JOBS_RESPONSE" | head -n-1)

if [ "$JOBS_HTTP_CODE" = "200" ] && [ "$(echo "$JOBS_BODY" | jq -r '.items[0].id // empty')" != "" ]; then
  TEST_JOB_ID=$(echo "$JOBS_BODY" | jq -r '.items[0].id')
  print_test "PASS" "Using existing job for checkout tests" "Job ID: $TEST_JOB_ID"
else
  CREATE_JOB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/jobs" \
    -H "Content-Type: application/json" \
    --cookie-jar cookies.txt --cookie cookies.txt \
    -d '{
      "address": "123 Equipment Test St",
      "city": "Minneapolis",
      "state": "MN",
      "zipCode": "55401",
      "clientName": "Test Client",
      "clientEmail": "test@example.com",
      "status": "scheduled",
      "scheduledDate": "2025-11-01T10:00:00Z"
    }')
  
  CREATE_JOB_HTTP_CODE=$(echo "$CREATE_JOB_RESPONSE" | tail -n1)
  CREATE_JOB_BODY=$(echo "$CREATE_JOB_RESPONSE" | head -n-1)
  
  if [ "$CREATE_JOB_HTTP_CODE" = "201" ] || [ "$CREATE_JOB_HTTP_CODE" = "200" ]; then
    TEST_JOB_ID=$(echo "$CREATE_JOB_BODY" | jq -r '.id')
    if [ -n "$TEST_JOB_ID" ] && [ "$TEST_JOB_ID" != "null" ]; then
      print_test "PASS" "Created test job for checkout" "Job ID: $TEST_JOB_ID"
    else
      print_test "SKIP" "Created test job" "No job ID - skipping checkout tests"
    fi
  else
    print_test "SKIP" "Created test job" "Could not create job - skipping checkout tests"
  fi
fi

# Test 11: Checkout equipment
if [ -n "$TEST_JOB_ID" ] && [ "$TEST_JOB_ID" != "null" ]; then
  echo ""
  echo "Test 11: Checkout equipment to inspector"

  EXPECTED_RETURN=$(date -u -d "+1 day" +"%Y-%m-%dT17:00:00Z" 2>/dev/null || date -u -v+1d +"%Y-%m-%dT17:00:00Z" 2>/dev/null || echo "2025-01-30T17:00:00Z")

  CREATE_CHECKOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/checkouts" \
    -H "Content-Type: application/json" \
    --cookie-jar cookies.txt --cookie cookies.txt \
    -d "{
      \"equipmentId\": \"$TEST_EQUIPMENT_ID\",
      \"jobId\": \"$TEST_JOB_ID\",
      \"expectedReturn\": \"$EXPECTED_RETURN\",
      \"notes\": \"Smoke test checkout\"
    }")

  CREATE_CHECKOUT_HTTP_CODE=$(echo "$CREATE_CHECKOUT_RESPONSE" | tail -n1)
  CREATE_CHECKOUT_BODY=$(echo "$CREATE_CHECKOUT_RESPONSE" | head -n-1)

  if [ "$CREATE_CHECKOUT_HTTP_CODE" = "201" ] || [ "$CREATE_CHECKOUT_HTTP_CODE" = "200" ]; then
    TEST_CHECKOUT_ID=$(echo "$CREATE_CHECKOUT_BODY" | jq -r '.id')
    if [ -n "$TEST_CHECKOUT_ID" ] && [ "$TEST_CHECKOUT_ID" != "null" ]; then
      print_test "PASS" "Checked out equipment" "Checkout ID: $TEST_CHECKOUT_ID"
    else
      print_test "FAIL" "Checked out equipment" "No checkout ID in response"
    fi
  else
    print_test "FAIL" "Checked out equipment" "Expected 201, got $CREATE_CHECKOUT_HTTP_CODE"
  fi
else
  echo ""
  print_test "SKIP" "Checkout equipment" "No job available"
fi

# Test 12: Verify equipment status changed to in_use
echo ""
echo "Test 12: Verify equipment status changed to 'in_use'"

GET_CHECKED_OUT_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_CHECKED_OUT_EQUIPMENT_HTTP_CODE=$(echo "$GET_CHECKED_OUT_EQUIPMENT_RESPONSE" | tail -n1)
GET_CHECKED_OUT_EQUIPMENT_BODY=$(echo "$GET_CHECKED_OUT_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$GET_CHECKED_OUT_EQUIPMENT_HTTP_CODE" = "200" ]; then
  EQUIPMENT_STATUS=$(echo "$GET_CHECKED_OUT_EQUIPMENT_BODY" | jq -r '.status')
  ASSIGNED_TO=$(echo "$GET_CHECKED_OUT_EQUIPMENT_BODY" | jq -r '.assignedTo')
  
  if [ "$EQUIPMENT_STATUS" = "in_use" ] && [ -n "$ASSIGNED_TO" ] && [ "$ASSIGNED_TO" != "null" ]; then
    print_test "PASS" "Equipment status changed to 'in_use'" "Assigned to: $ASSIGNED_TO"
  else
    print_test "FAIL" "Equipment status changed to 'in_use'" "Status: $EQUIPMENT_STATUS, Assigned: $ASSIGNED_TO"
  fi
else
  print_test "FAIL" "Equipment status verification" "Expected 200, got $GET_CHECKED_OUT_EQUIPMENT_HTTP_CODE"
fi

# Test 13: Get active checkouts
echo ""
echo "Test 13: Retrieve active checkouts"

GET_ACTIVE_CHECKOUTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/checkouts/active" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_ACTIVE_CHECKOUTS_HTTP_CODE=$(echo "$GET_ACTIVE_CHECKOUTS_RESPONSE" | tail -n1)
GET_ACTIVE_CHECKOUTS_BODY=$(echo "$GET_ACTIVE_CHECKOUTS_RESPONSE" | head -n-1)

if [ "$GET_ACTIVE_CHECKOUTS_HTTP_CODE" = "200" ]; then
  ACTIVE_COUNT=$(echo "$GET_ACTIVE_CHECKOUTS_BODY" | jq '. | length')
  # Check if our test checkout is in the active list
  TEST_CHECKOUT_IN_LIST=$(echo "$GET_ACTIVE_CHECKOUTS_BODY" | jq -r ".[] | select(.id==\"$TEST_CHECKOUT_ID\") | .id")
  if [ "$TEST_CHECKOUT_IN_LIST" = "$TEST_CHECKOUT_ID" ]; then
    print_test "PASS" "Retrieved active checkouts" "Test checkout found ($ACTIVE_COUNT total active)"
  else
    print_test "FAIL" "Retrieved active checkouts" "Test checkout not in active list"
  fi
else
  print_test "FAIL" "Retrieved active checkouts" "Expected 200, got $GET_ACTIVE_CHECKOUTS_HTTP_CODE"
fi

# Test 14: Check in equipment
if [ -n "$TEST_CHECKOUT_ID" ] && [ "$TEST_CHECKOUT_ID" != "null" ]; then
  echo ""
  echo "Test 14: Check in equipment (return)"

  CHECKIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/checkouts/$TEST_CHECKOUT_ID/checkin" \
    -H "Content-Type: application/json" \
    --cookie-jar cookies.txt --cookie cookies.txt \
    -d '{
      "condition": "good",
      "notes": "Smoke test complete - equipment in good condition"
    }')

  CHECKIN_HTTP_CODE=$(echo "$CHECKIN_RESPONSE" | tail -n1)
  CHECKIN_BODY=$(echo "$CHECKIN_RESPONSE" | head -n-1)

  if [ "$CHECKIN_HTTP_CODE" = "200" ]; then
    ACTUAL_RETURN=$(echo "$CHECKIN_BODY" | jq -r '.actualReturn')
    if [ -n "$ACTUAL_RETURN" ] && [ "$ACTUAL_RETURN" != "null" ]; then
      print_test "PASS" "Checked in equipment" "Return time: $ACTUAL_RETURN"
    else
      print_test "FAIL" "Checked in equipment" "actualReturn not set"
    fi
  else
    print_test "FAIL" "Checked in equipment" "Expected 200, got $CHECKIN_HTTP_CODE"
  fi
else
  echo ""
  print_test "SKIP" "Check in equipment" "No active checkout"
fi

# Test 15: Verify equipment status changed back to available
echo ""
echo "Test 15: Verify equipment status changed back to 'available'"

GET_RETURNED_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_RETURNED_EQUIPMENT_HTTP_CODE=$(echo "$GET_RETURNED_EQUIPMENT_RESPONSE" | tail -n1)
GET_RETURNED_EQUIPMENT_BODY=$(echo "$GET_RETURNED_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$GET_RETURNED_EQUIPMENT_HTTP_CODE" = "200" ]; then
  RETURNED_STATUS=$(echo "$GET_RETURNED_EQUIPMENT_BODY" | jq -r '.status')
  RETURNED_ASSIGNED_TO=$(echo "$GET_RETURNED_EQUIPMENT_BODY" | jq -r '.assignedTo')
  
  if [ "$RETURNED_STATUS" = "available" ] && [ "$RETURNED_ASSIGNED_TO" = "null" ]; then
    print_test "PASS" "Equipment status changed back to 'available'" "Assignment cleared"
  else
    print_test "FAIL" "Equipment status changed back to 'available'" "Status: $RETURNED_STATUS, Assigned: $RETURNED_ASSIGNED_TO"
  fi
else
  print_test "FAIL" "Equipment status verification after return" "Expected 200, got $GET_RETURNED_EQUIPMENT_HTTP_CODE"
fi

# Test 16: Get equipment alerts summary
echo ""
echo "Test 16: Get equipment alerts summary"

GET_ALERTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/equipment/alerts" \
  --cookie-jar cookies.txt --cookie cookies.txt)
GET_ALERTS_HTTP_CODE=$(echo "$GET_ALERTS_RESPONSE" | tail -n1)
GET_ALERTS_BODY=$(echo "$GET_ALERTS_RESPONSE" | head -n-1)

if [ "$GET_ALERTS_HTTP_CODE" = "200" ]; then
  CALIBRATION_DUE=$(echo "$GET_ALERTS_BODY" | jq -r '.calibrationDue')
  MAINTENANCE_DUE=$(echo "$GET_ALERTS_BODY" | jq -r '.maintenanceDue')
  OVERDUE_CALIBRATIONS=$(echo "$GET_ALERTS_BODY" | jq -r '.overdueCalibrations')
  OVERDUE_CHECKOUTS=$(echo "$GET_ALERTS_BODY" | jq -r '.overdueCheckouts')
  
  if [ -n "$CALIBRATION_DUE" ] && [ -n "$MAINTENANCE_DUE" ] && [ -n "$OVERDUE_CALIBRATIONS" ] && [ -n "$OVERDUE_CHECKOUTS" ]; then
    print_test "PASS" "Retrieved alerts summary" "Cal: $CALIBRATION_DUE, Maint: $MAINTENANCE_DUE, Overdue Cal: $OVERDUE_CALIBRATIONS, Overdue CO: $OVERDUE_CHECKOUTS"
  else
    print_test "FAIL" "Retrieved alerts summary" "Missing alert counts"
  fi
else
  print_test "FAIL" "Retrieved alerts summary" "Expected 200, got $GET_ALERTS_HTTP_CODE"
fi

# Test 17: Update equipment details
echo ""
echo "Test 17: Update equipment details"

UPDATE_EQUIPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/equipment/$TEST_EQUIPMENT_ID" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt --cookie cookies.txt \
  -d '{
    "location": "Updated Location - Test Room B",
    "notes": "Equipment updated during smoke test",
    "currentValue": "3500.00"
  }')

UPDATE_EQUIPMENT_HTTP_CODE=$(echo "$UPDATE_EQUIPMENT_RESPONSE" | tail -n1)
UPDATE_EQUIPMENT_BODY=$(echo "$UPDATE_EQUIPMENT_RESPONSE" | head -n-1)

if [ "$UPDATE_EQUIPMENT_HTTP_CODE" = "200" ]; then
  UPDATED_LOCATION=$(echo "$UPDATE_EQUIPMENT_BODY" | jq -r '.location')
  UPDATED_VALUE=$(echo "$UPDATE_EQUIPMENT_BODY" | jq -r '.currentValue')
  
  if [ "$UPDATED_LOCATION" = "Updated Location - Test Room B" ] && [ "$UPDATED_VALUE" = "3500.00" ]; then
    print_test "PASS" "Updated equipment details" "Location and value updated"
  else
    print_test "FAIL" "Updated equipment details" "Updates not reflected"
  fi
else
  print_test "FAIL" "Updated equipment details" "Expected 200, got $UPDATE_EQUIPMENT_HTTP_CODE"
fi

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for failed_test in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}✗${NC} $failed_test"
  done
  exit 1
else
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
fi
