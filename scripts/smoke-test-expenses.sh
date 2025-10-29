#!/bin/bash
# ================================================================
# Expenses Feature - Smoke Test
# ================================================================
# Purpose: Automated verification of Expenses API endpoints
# Usage: bash scripts/smoke-test-expenses.sh
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
RESPONSE_FILE=$(mktemp)

# Cleanup function
cleanup() {
  rm -f "$COOKIE_FILE" "$RESPONSE_FILE"
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
echo "Expenses Feature - Smoke Test"
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
# Test 2: Status Endpoint (with version + commit SHA)
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
echo "Test 3: Dev login..."

# Check if we have a user in the database
USER_ID=$(psql "${DATABASE_URL}" -t -c "SELECT id FROM users LIMIT 1" 2>/dev/null | tr -d '[:space:]' || echo "")

if [ -z "$USER_ID" ]; then
  echo -e "${YELLOW}⚠️  No users found in database. Creating test user...${NC}"
  # Create a test user (dev mode only)
  USER_ID="test-user-$(date +%s)"
  psql "${DATABASE_URL}" -c "INSERT INTO users (id, email, role) VALUES ('$USER_ID', 'test@example.com', 'inspector') ON CONFLICT DO NOTHING" 2>/dev/null || true
fi

# Dev login to get session cookie
HTTP_STATUS=$(curl -s -c "$COOKIE_FILE" -o /dev/null -w "%{http_code}" "$BASE_URL/api/dev-login/$USER_ID")
check_status 200 "$HTTP_STATUS" "Dev login successful"

# ================================================================
# Test 4: List Expenses (GET /api/expenses)
# ================================================================
echo "Test 4: List expenses..."
HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" -o "$RESPONSE_FILE" -w "%{http_code}" "$BASE_URL/api/expenses")
check_status 200 "$HTTP_STATUS" "Expenses list endpoint accessible"

# Verify response is valid JSON array
if jq -e '. | type == "array"' "$RESPONSE_FILE" > /dev/null 2>&1; then
  test_result "Expenses list returns valid JSON array"
else
  echo -e "${RED}❌ Expenses list does not return valid JSON array${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 5: Create Expense (POST /api/expenses)
# ================================================================
echo "Test 5: Create new expense..."

# Get CSRF token
CSRF_TOKEN=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/csrf-token" | jq -r '.csrfToken')

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
  echo -e "${RED}❌ Failed to get CSRF token${NC}"
  ((TESTS_FAILED++))
else
  test_result "CSRF token retrieved"
fi

# Create expense
EXPENSE_DATA='{
  "category": "fuel",
  "amount": 50.00,
  "date": "2025-10-29T10:00:00Z",
  "description": "Smoke test expense - safe to delete",
  "isDeductible": true
}'

HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/expenses" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "$EXPENSE_DATA" \
  -o "$RESPONSE_FILE" \
  -w "%{http_code}")

check_status 201 "$HTTP_STATUS" "Expense creation successful"

# Extract expense ID for later tests
EXPENSE_ID=$(jq -r '.id' "$RESPONSE_FILE" 2>/dev/null || echo "")

if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then
  test_result "Expense ID returned: $EXPENSE_ID"
else
  echo -e "${RED}❌ No expense ID returned${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 6: Get Single Expense (GET /api/expenses/:id)
# ================================================================
if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then
  echo "Test 6: Get single expense..."
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}" \
    "$BASE_URL/api/expenses/$EXPENSE_ID")
  
  check_status 200 "$HTTP_STATUS" "Expense retrieval working"
  
  # Verify expense data
  AMOUNT=$(jq -r '.amount' "$RESPONSE_FILE" 2>/dev/null)
  if [ "$AMOUNT" == "50.00" ] || [ "$AMOUNT" == "50" ]; then
    test_result "Expense data correct (amount: $AMOUNT)"
  else
    echo -e "${RED}❌ Expense amount incorrect (expected: 50.00, got: $AMOUNT)${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 6 (no expense ID)${NC}"
fi

# ================================================================
# Test 7: Monthly Stats (GET /api/expenses-by-category)
# ================================================================
echo "Test 7: Monthly stats..."
MONTH=$(date +%Y-%m)
HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
  -o "$RESPONSE_FILE" \
  -w "%{http_code}" \
  "$BASE_URL/api/expenses-by-category?month=$MONTH")

check_status 200 "$HTTP_STATUS" "Monthly stats endpoint functional"

# Verify response structure
if jq -e '.stats | type == "array"' "$RESPONSE_FILE" > /dev/null 2>&1 && \
   jq -e '.totals | type == "object"' "$RESPONSE_FILE" > /dev/null 2>&1; then
  test_result "Monthly stats returns valid structure"
else
  echo -e "${RED}❌ Monthly stats response structure invalid${NC}"
  ((TESTS_FAILED++))
fi

# ================================================================
# Test 8: CSV Export (POST /api/expenses/export)
# ================================================================
if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then
  echo "Test 8: CSV export..."
  
  EXPORT_DATA="{
    \"ids\": [\"$EXPENSE_ID\"],
    \"format\": \"csv\"
  }"
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X POST "$BASE_URL/api/expenses/export" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d "$EXPORT_DATA" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "CSV export successful"
  
  # Verify CSV format (should have headers)
  if head -n 1 "$RESPONSE_FILE" | grep -q "ID,Date,Category,Amount"; then
    test_result "CSV export format valid"
  else
    echo -e "${RED}❌ CSV export format invalid${NC}"
    cat "$RESPONSE_FILE"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 8 (no expense ID)${NC}"
fi

# ================================================================
# Test 9: Update Expense (PUT /api/expenses/:id)
# ================================================================
if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then
  echo "Test 9: Update expense..."
  
  UPDATE_DATA='{
    "description": "Smoke test expense - UPDATED"
  }'
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X PUT "$BASE_URL/api/expenses/$EXPENSE_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d "$UPDATE_DATA" \
    -o "$RESPONSE_FILE" \
    -w "%{http_code}")
  
  check_status 200 "$HTTP_STATUS" "Expense update successful"
  
  # Verify update
  UPDATED_DESC=$(jq -r '.description' "$RESPONSE_FILE" 2>/dev/null)
  if echo "$UPDATED_DESC" | grep -q "UPDATED"; then
    test_result "Expense description updated correctly"
  else
    echo -e "${RED}❌ Expense update not reflected${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  Skipping Test 9 (no expense ID)${NC}"
fi

# ================================================================
# Test 10: Delete Expense (DELETE /api/expenses/:id)
# ================================================================
if [ -n "$EXPENSE_ID" ] && [ "$EXPENSE_ID" != "null" ]; then
  echo "Test 10: Delete expense..."
  
  HTTP_STATUS=$(curl -s -b "$COOKIE_FILE" \
    -X DELETE "$BASE_URL/api/expenses/$EXPENSE_ID" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -o /dev/null \
    -w "%{http_code}")
  
  check_status 204 "$HTTP_STATUS" "Expense deletion successful"
  
  # Verify expense is deleted (should return 404)
  HTTP_STATUS_VERIFY=$(curl -s -b "$COOKIE_FILE" \
    -o /dev/null \
    -w "%{http_code}" \
    "$BASE_URL/api/expenses/$EXPENSE_ID")
  
  check_status 404 "$HTTP_STATUS_VERIFY" "Deleted expense returns 404"
else
  echo -e "${YELLOW}⚠️  Skipping Test 10 (no expense ID)${NC}"
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
