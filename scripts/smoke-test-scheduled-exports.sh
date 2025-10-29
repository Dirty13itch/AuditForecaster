#!/bin/bash
# ================================================================
# Scheduled Exports Feature - Smoke Test
# ================================================================
# Purpose: Automated verification of Scheduled Exports API endpoints
# Usage: bash scripts/smoke-test-scheduled-exports.sh
# Exit Codes: 0 = success, 1 = failure
# ================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (override with BASE_URL env var)
BASE_URL="${BASE_URL:-http://localhost:5000}"

# Temp files
COOKIE_FILE=$(mktemp)
COOKIE_FILE_USER2=$(mktemp)
RESPONSE_FILE=$(mktemp)

# Cleanup function
cleanup() {
  rm -f "$COOKIE_FILE" "$COOKIE_FILE_USER2" "$RESPONSE_FILE"
}
trap cleanup EXIT

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
test_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Helper function to check HTTP status
check_status() {
  local expected=$1
  local actual=$2
  local test_name=$3
  
  if [ "$actual" -eq "$expected" ]; then
    test_result "$test_name"
  else
    echo -e "${RED}❌ $test_name (Expected: $expected, Got: $actual)${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo "================================================"
echo "Scheduled Exports Feature - Smoke Test"
echo "================================================"
echo "Base URL: $BASE_URL"
echo "Started: $(date)"
echo ""

# ================================================================
# Test 1: Health Check
# ================================================================
echo "Test 1: Health check..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/healthz")
check_status 200 "$HTTP_STATUS" "Health endpoint returns 200"

# ================================================================
# Test 2: Status Endpoint
# ================================================================
echo "Test 2: Status endpoint..."
HTTP_STATUS=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" "$BASE_URL/api/status")
check_status 200 "$HTTP_STATUS" "Status endpoint returns 200"

# Verify response contains version and commitSha
if grep -q '"version"' "$RESPONSE_FILE" && grep -q '"commitSha"' "$RESPONSE_FILE"; then
  test_result "Status endpoint returns version and commitSha"
else
  echo -e "${RED}❌ Status endpoint missing version or commitSha${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 3: Dev Login (Authentication Setup)
# ================================================================
echo "Test 3: Dev login (User 1)..."

# Check if we have a user in the database
USER_ID=$(psql "${DATABASE_URL}" -t -c "SELECT id FROM users LIMIT 1" 2>/dev/null | tr -d '[:space:]' || echo "")

if [ -z "$USER_ID" ]; then
  echo -e "${YELLOW}⚠️  No users found in database. Creating test user...${NC}"
  USER_ID="test-user-$(date +%s)"
  psql "${DATABASE_URL}" -c "INSERT INTO users (id, email, role) VALUES ('$USER_ID', 'user1@test.com', 'inspector') ON CONFLICT DO NOTHING" 2>/dev/null || true
fi

# Dev login to get session cookie
HTTP_STATUS=$(curl -s -c "$COOKIE_FILE" -o /dev/null -w "%{http_code}" "$BASE_URL/api/dev-login/$USER_ID")
check_status 200 "$HTTP_STATUS" "Dev login successful (User 1)"

# Create second user for cross-tenant isolation test
echo "Test 3b: Dev login (User 2 for cross-tenant test)..."
USER2_ID="test-user-2-$(date +%s)"
psql "${DATABASE_URL}" -c "INSERT INTO users (id, email, role) VALUES ('$USER2_ID', 'user2@test.com', 'inspector') ON CONFLICT DO NOTHING" 2>/dev/null || true
HTTP_STATUS=$(curl -s -c "$COOKIE_FILE_USER2" -o /dev/null -w "%{http_code}" "$BASE_URL/api/dev-login/$USER2_ID")
check_status 200 "$HTTP_STATUS" "Dev login successful (User 2)"

# ================================================================
# Test 4: List Scheduled Exports (GET /api/scheduled-exports)
# ================================================================
echo "Test 4: List scheduled exports..."
HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" -o "$RESPONSE_FILE" -w "%{http_code}" "$BASE_URL/api/scheduled-exports")
check_status 200 "$HTTP_STATUS" "Scheduled exports list endpoint accessible"

# Verify response is valid JSON array
if jq -e '. | type == "array"' "$RESPONSE_FILE" > /dev/null 2>&1; then
  test_result "Scheduled exports list returns valid JSON array"
else
  echo -e "${RED}❌ Scheduled exports list does not return valid JSON array${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 5: Create Scheduled Export (POST /api/scheduled-exports)
# ================================================================
echo "Test 5: Create new scheduled export..."

# Get CSRF token
CSRF_TOKEN=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/csrf-token" | jq -r '.csrfToken')

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
  echo -e "${RED}❌ Failed to get CSRF token${NC}"
  ((TESTS_FAILED++))
else
  test_result "CSRF token retrieved"
fi

# Create daily jobs export
EXPORT_DATA='{
  "name": "Daily Jobs Export - Smoke Test",
  "dataType": "jobs",
  "format": "csv",
  "frequency": "daily",
  "time": "08:00",
  "recipients": ["inspector@example.com"],
  "options": {
    "filters": {
      "status": "completed"
    }
  },
  "enabled": true
}'

HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/scheduled-exports" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "$EXPORT_DATA" \
  -o "$RESPONSE_FILE" \
  -w "%{http_code}")

check_status 201 "$HTTP_STATUS" "Scheduled export creation successful"

# Extract export ID for later tests
EXPORT_ID=$(jq -r '.id' "$RESPONSE_FILE" 2>/dev/null || echo "")

if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  test_result "Scheduled export ID returned: $EXPORT_ID"
else
  echo -e "${RED}❌ No scheduled export ID returned${NC}"
  ((TESTS_FAILED++))
fi

# Verify nextRun was calculated
NEXT_RUN=$(jq -r '.nextRun' "$RESPONSE_FILE" 2>/dev/null || echo "")
if [ -n "$NEXT_RUN" ] && [ "$NEXT_RUN" != "null" ]; then
  test_result "nextRun timestamp calculated"
else
  echo -e "${RED}❌ nextRun timestamp not calculated${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 6: Get Single Scheduled Export (GET /api/scheduled-exports/:id)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 6: Get single scheduled export..."
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}" \
    "$BASE_URL/api/scheduled-exports/$EXPORT_ID")
  
  check_status 200 "$HTTP_STATUS" "Scheduled export retrieval working"
  
  # Verify export data
  NAME=$(jq -r '.name' "$RESPONSE_FILE" 2>/dev/null)
  if echo "$NAME" | grep -q "Daily Jobs Export"; then
    test_result "Scheduled export data correct (name matches)"
  else
    echo -e "${RED}❌ Scheduled export name incorrect (got: $NAME)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 6 (no export ID)${NC}"
fi

# ================================================================
# Test 7: Update Scheduled Export (PATCH /api/scheduled-exports/:id)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 7: Update scheduled export..."
  
  UPDATE_DATA='{
    "name": "Daily Jobs Export - UPDATED",
    "recipients": ["inspector@example.com", "manager@example.com"]
  }'
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X PATCH "$BASE_URL/api/scheduled-exports/$EXPORT_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d "$UPDATE_DATA" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "Scheduled export update successful"
  
  # Verify update
  UPDATED_NAME=$(jq -r '.name' "$RESPONSE_FILE" 2>/dev/null)
  if echo "$UPDATED_NAME" | grep -q "UPDATED"; then
    test_result "Scheduled export name updated correctly"
  else
    echo -e "${RED}❌ Scheduled export update not reflected${NC}"
    ((TESTS_FAILED++))
  fi
  
  # Verify recipients updated
  RECIPIENT_COUNT=$(jq -r '.recipients | length' "$RESPONSE_FILE" 2>/dev/null)
  if [ "$RECIPIENT_COUNT" -eq 2 ]; then
    test_result "Recipients list updated correctly (2 recipients)"
  else
    echo -e "${RED}❌ Recipients not updated (expected: 2, got: $RECIPIENT_COUNT)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 7 (no export ID)${NC}"
fi

# ================================================================
# Test 8: Disable Scheduled Export (POST /api/scheduled-exports/:id/disable)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 8: Disable scheduled export..."
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X POST "$BASE_URL/api/scheduled-exports/$EXPORT_ID/disable" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "Scheduled export disable successful"
  
  # Verify enabled=false
  ENABLED=$(jq -r '.enabled' "$RESPONSE_FILE" 2>/dev/null)
  if [ "$ENABLED" == "false" ]; then
    test_result "Scheduled export disabled correctly"
  else
    echo -e "${RED}❌ Scheduled export not disabled (enabled: $ENABLED)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 8 (no export ID)${NC}"
fi

# ================================================================
# Test 9: Enable Scheduled Export (POST /api/scheduled-exports/:id/enable)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 9: Enable scheduled export..."
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X POST "$BASE_URL/api/scheduled-exports/$EXPORT_ID/enable" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "Scheduled export enable successful"
  
  # Verify enabled=true
  ENABLED=$(jq -r '.enabled' "$RESPONSE_FILE" 2>/dev/null)
  if [ "$ENABLED" == "true" ]; then
    test_result "Scheduled export enabled correctly"
  else
    echo -e "${RED}❌ Scheduled export not enabled (enabled: $ENABLED)${NC}"
    ((TESTS_FAILED++))
  fi
  
  # Verify nextRun recalculated
  NEXT_RUN_NEW=$(jq -r '.nextRun' "$RESPONSE_FILE" 2>/dev/null)
  if [ -n "$NEXT_RUN_NEW" ] && [ "$NEXT_RUN_NEW" != "null" ]; then
    test_result "nextRun recalculated after enable"
  else
    echo -e "${RED}❌ nextRun not recalculated${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 9 (no export ID)${NC}"
fi

# ================================================================
# Test 10: Test Run (POST /api/scheduled-exports/:id/test)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 10: Test run scheduled export..."
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X POST "$BASE_URL/api/scheduled-exports/$EXPORT_ID/test" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "Test run executed successfully"
  
  # Verify success message
  MESSAGE=$(jq -r '.message' "$RESPONSE_FILE" 2>/dev/null)
  if echo "$MESSAGE" | grep -qi "queued\|executed\|running"; then
    test_result "Test run confirmation message received"
  else
    echo -e "${YELLOW}⚠️  Test run message unclear: $MESSAGE${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 10 (no export ID)${NC}"
fi

# ================================================================
# Test 11: Cross-Tenant Isolation (User B cannot access User A's export)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 11: Cross-tenant isolation..."
  
  # User 2 tries to access User 1's export
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE_USER2" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}" \
    "$BASE_URL/api/scheduled-exports/$EXPORT_ID")
  
  check_status 403 "$HTTP_STATUS" "User 2 blocked from accessing User 1's export"
else
  echo -e "${YELLOW}⚠️  Skipping Test 11 (no export ID)${NC}"
fi

# ================================================================
# Test 12: userId Cannot Be Reassigned via PATCH
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 12: userId reassignment protection..."
  
  # Attempt to reassign userId
  MALICIOUS_UPDATE='{
    "userId": "malicious-user-id"
  }'
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X PATCH "$BASE_URL/api/scheduled-exports/$EXPORT_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d "$MALICIOUS_UPDATE" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  # Should still return 200 but userId should not change
  if [ "$HTTP_STATUS" -eq 200 ]; then
    USER_ID_RESPONSE=$(jq -r '.userId' "$RESPONSE_FILE" 2>/dev/null)
    if [ "$USER_ID_RESPONSE" == "$USER_ID" ]; then
      test_result "userId protected from reassignment"
    else
      echo -e "${RED}❌ userId was reassigned (security issue!)${NC}"
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠️  Unexpected status: $HTTP_STATUS${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 12 (no export ID)${NC}"
fi

# ================================================================
# Test 13: Next Run Calculation (Weekly)
# ================================================================
echo "Test 13: Next run calculation (weekly)..."

WEEKLY_EXPORT='{
  "name": "Weekly Financial Report - Smoke Test",
  "dataType": "financial",
  "format": "xlsx",
  "frequency": "weekly",
  "time": "09:00",
  "dayOfWeek": 1,
  "recipients": ["finance@example.com"],
  "options": {},
  "enabled": true
}'

HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/scheduled-exports" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "$WEEKLY_EXPORT" \
  -o "$RESPONSE_FILE" \
  -w "%{http_code}")

check_status 201 "$HTTP_STATUS" "Weekly export created successfully"

WEEKLY_EXPORT_ID=$(jq -r '.id' "$RESPONSE_FILE" 2>/dev/null || echo "")
WEEKLY_NEXT_RUN=$(jq -r '.nextRun' "$RESPONSE_FILE" 2>/dev/null || echo "")

if [ -n "$WEEKLY_NEXT_RUN" ] && [ "$WEEKLY_NEXT_RUN" != "null" ]; then
  test_result "Weekly export nextRun calculated"
else
  echo -e "${RED}❌ Weekly export nextRun not calculated${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 14: Next Run Calculation (Monthly)
# ================================================================
echo "Test 14: Next run calculation (monthly)..."

MONTHLY_EXPORT='{
  "name": "Monthly Analytics - Smoke Test",
  "dataType": "analytics",
  "format": "pdf",
  "frequency": "monthly",
  "time": "07:00",
  "dayOfMonth": 1,
  "recipients": ["analytics@example.com"],
  "options": {},
  "enabled": true
}'

HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/scheduled-exports" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "$MONTHLY_EXPORT" \
  -o "$RESPONSE_FILE" \
  -w "%{http_code}")

check_status 201 "$HTTP_STATUS" "Monthly export created successfully"

MONTHLY_EXPORT_ID=$(jq -r '.id' "$RESPONSE_FILE" 2>/dev/null || echo "")
MONTHLY_NEXT_RUN=$(jq -r '.nextRun' "$RESPONSE_FILE" 2>/dev/null || echo "")

if [ -n "$MONTHLY_NEXT_RUN" ] && [ "$MONTHLY_NEXT_RUN" != "null" ]; then
  test_result "Monthly export nextRun calculated"
else
  echo -e "${RED}❌ Monthly export nextRun not calculated${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 15: Delete Scheduled Export (DELETE /api/scheduled-exports/:id)
# ================================================================
if [ -n "$EXPORT_ID" ] && [ "$EXPORT_ID" != "null" ]; then
  echo "Test 15: Delete scheduled export..."
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X DELETE "$BASE_URL/api/scheduled-exports/$EXPORT_ID" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o /dev/null \
    -w "%{http_code}")
  
  check_status 204 "$HTTP_STATUS" "Scheduled export deletion successful"
  
  # Verify export is deleted (should return 404)
  HTTP_STATUS_VERIFY=$(curl -s -b "$COOKIE_FILE" \
    -o /dev/null \
    -w "%{http_code}" \
    "$BASE_URL/api/scheduled-exports/$EXPORT_ID")
  
  check_status 404 "$HTTP_STATUS_VERIFY" "Deleted export returns 404"
else
  echo -e "${YELLOW}⚠️  Skipping Test 15 (no export ID)${NC}"
fi

# Cleanup test exports
if [ -n "$WEEKLY_EXPORT_ID" ] && [ "$WEEKLY_EXPORT_ID" != "null" ]; then
  curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/api/scheduled-exports/$WEEKLY_EXPORT_ID" -H "X-CSRF-Token: $CSRF_TOKEN" -o /dev/null
fi

if [ -n "$MONTHLY_EXPORT_ID" ] && [ "$MONTHLY_EXPORT_ID" != "null" ]; then
  curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/api/scheduled-exports/$MONTHLY_EXPORT_ID" -H "X-CSRF-Token: $CSRF_TOKEN" -o /dev/null
fi

# ================================================================
# Summary
# ================================================================
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Completed: $(date)"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
