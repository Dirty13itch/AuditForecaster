#!/usr/bin/env bash

# Jobs Management System - Smoke Test Suite
# Tests all critical job management workflows
# Usage: bash scripts/smoke-test-jobs.sh

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Base URL (use environment variable or default to localhost)
BASE_URL="${API_BASE_URL:-http://localhost:5000}"

# Test function
run_test() {
    local test_name="$1"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${BLUE}[TEST $TESTS_RUN]${NC} $test_name"
}

pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC}\n"
}

fail_test() {
    local message="$1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗ FAIL${NC}: $message\n"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up test data...${NC}"
    # Delete test jobs created during smoke tests
    # Note: In production, you'd want to track created IDs and delete them
    # For now, we'll leave cleanup to manual database reset
    echo "Cleanup complete"
}

trap cleanup EXIT

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Jobs Management System Smoke Tests ${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "Testing against: ${BASE_URL}\n"

# Check if server is running
if ! curl -s --head  --request GET "${BASE_URL}/api/health" | grep "200 OK" > /dev/null; then 
   echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
   echo "Please start the server with: npm run dev"
   exit 1
fi

echo -e "${GREEN}✓ Server is running${NC}\n"

# ============================================================================
# TEST 1: Create Job (POST /api/jobs)
# ============================================================================
run_test "Create Job - POST /api/jobs"

CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Smoke Test Job - Final Inspection",
    "address": "123 Test Street, Minneapolis, MN 55401",
    "contractor": "Test Construction Co",
    "status": "pending",
    "inspectionType": "Final",
    "pricing": "450.00",
    "floorArea": "2400.00",
    "stories": "2.0",
    "notes": "Automated smoke test job"
  }')

JOB_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [ -z "$JOB_ID" ]; then
    fail_test "Failed to create job. Response: $CREATE_RESPONSE"
    exit 1
fi

if echo "$CREATE_RESPONSE" | jq -e '.name == "Smoke Test Job - Final Inspection"' > /dev/null; then
    pass_test
else
    fail_test "Job name mismatch"
fi

# ============================================================================
# TEST 2: Get All Jobs (GET /api/jobs)
# ============================================================================
run_test "Get All Jobs - GET /api/jobs"

JOBS_LIST=$(curl -s -X GET "${BASE_URL}/api/jobs" \
  -H "X-Test-User-Id: test-admin-1")

if echo "$JOBS_LIST" | jq -e 'type == "array" or (type == "object" and has("data"))' > /dev/null; then
    # Check if we got an array or pagination object
    JOB_COUNT=$(echo "$JOBS_LIST" | jq -r 'if type == "array" then length elif has("data") then .data | length else 0 end')
    if [ "$JOB_COUNT" -gt 0 ]; then
        pass_test
    else
        fail_test "No jobs returned"
    fi
else
    fail_test "Invalid response format. Expected array or pagination object"
fi

# ============================================================================
# TEST 3: Get Single Job (GET /api/jobs/:id)
# ============================================================================
run_test "Get Single Job - GET /api/jobs/:id"

SINGLE_JOB=$(curl -s -X GET "${BASE_URL}/api/jobs/${JOB_ID}" \
  -H "X-Test-User-Id: test-admin-1")

if echo "$SINGLE_JOB" | jq -e ".id == \"$JOB_ID\"" > /dev/null; then
    pass_test
else
    fail_test "Job ID mismatch or job not found"
fi

# ============================================================================
# TEST 4: Get Non-Existent Job (404 Test)
# ============================================================================
run_test "Get Non-Existent Job - 404 Error Handling"

NOT_FOUND_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/jobs/non-existent-id-12345" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$NOT_FOUND_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$NOT_FOUND_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "404" ]; then
    pass_test
else
    fail_test "Expected 404 status code, got $HTTP_CODE"
fi

# ============================================================================
# TEST 5: Update Job (PUT /api/jobs/:id)
# ============================================================================
run_test "Update Job - PUT /api/jobs/:id"

UPDATE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/api/jobs/${JOB_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "UPDATED - Smoke Test Job",
    "notes": "Updated during smoke test"
  }')

if echo "$UPDATE_RESPONSE" | jq -e '.name == "UPDATED - Smoke Test Job"' > /dev/null; then
    pass_test
else
    fail_test "Job update failed or name not updated"
fi

# ============================================================================
# TEST 6: Update Job Status (PATCH /api/jobs/:id/status)
# ============================================================================
run_test "Update Job Status - PATCH /api/jobs/:id/status"

STATUS_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/jobs/${JOB_ID}/status" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{"status": "scheduled"}')

if echo "$STATUS_RESPONSE" | jq -e '.status == "scheduled"' > /dev/null; then
    pass_test
else
    fail_test "Status update failed"
fi

# ============================================================================
# TEST 7: Complete Job and Check Auto-Set completedDate
# ============================================================================
run_test "Complete Job - Auto-Set completedDate"

COMPLETE_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/jobs/${JOB_ID}/status" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{"status": "completed"}')

if echo "$COMPLETE_RESPONSE" | jq -e '.status == "completed" and .completedDate != null' > /dev/null; then
    pass_test
else
    fail_test "CompletedDate not auto-set"
fi

# ============================================================================
# TEST 8: Pagination (GET /api/jobs?limit=5&offset=0)
# ============================================================================
run_test "Pagination - GET /api/jobs?limit=5&offset=0"

PAGINATED_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/jobs?limit=5&offset=0" \
  -H "X-Test-User-Id: test-admin-1")

if echo "$PAGINATED_RESPONSE" | jq -e 'has("data") and has("pagination")' > /dev/null; then
    # Check if pagination metadata is present
    LIMIT=$(echo "$PAGINATED_RESPONSE" | jq -r '.pagination.limit')
    if [ "$LIMIT" == "5" ]; then
        pass_test
    else
        fail_test "Pagination limit not respected. Expected 5, got $LIMIT"
    fi
else
    fail_test "Pagination response format incorrect"
fi

# ============================================================================
# TEST 9: Create Additional Jobs for Bulk Operations
# ============================================================================
run_test "Create Additional Jobs for Bulk Tests"

JOB_ID_2=$(curl -s -X POST "${BASE_URL}/api/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Bulk Test Job 1",
    "address": "456 Bulk Test St, Minneapolis, MN 55402",
    "contractor": "Bulk Test Co",
    "status": "pending",
    "inspectionType": "Pre-Drywall"
  }' | jq -r '.id // empty')

JOB_ID_3=$(curl -s -X POST "${BASE_URL}/api/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Bulk Test Job 2",
    "address": "789 Bulk Test Ave, Minneapolis, MN 55403",
    "contractor": "Bulk Test Co",
    "status": "pending",
    "inspectionType": "Rough"
  }' | jq -r '.id // empty')

if [ -n "$JOB_ID_2" ] && [ -n "$JOB_ID_3" ]; then
    pass_test
else
    fail_test "Failed to create additional jobs for bulk tests"
fi

# ============================================================================
# TEST 10: Bulk Delete (DELETE /api/jobs/bulk)
# ============================================================================
run_test "Bulk Delete - DELETE /api/jobs/bulk"

BULK_DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/jobs/bulk" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d "{\"ids\": [\"$JOB_ID_2\", \"$JOB_ID_3\"]}")

DELETED_COUNT=$(echo "$BULK_DELETE_RESPONSE" | jq -r '.deleted // 0')

if [ "$DELETED_COUNT" == "2" ]; then
    pass_test
else
    fail_test "Expected 2 jobs deleted, got $DELETED_COUNT"
fi

# ============================================================================
# TEST 11: Export Jobs CSV (POST /api/jobs/export)
# ============================================================================
run_test "Export Jobs CSV - POST /api/jobs/export"

EXPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/jobs/export" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d "{\"ids\": [\"$JOB_ID\"], \"format\": \"csv\"}")

# Check if response starts with CSV header
if echo "$EXPORT_RESPONSE" | head -n 1 | grep -q "ID,Name,Address"; then
    pass_test
else
    fail_test "CSV export failed or header missing"
fi

# ============================================================================
# TEST 12: Export Jobs JSON (POST /api/jobs/export)
# ============================================================================
run_test "Export Jobs JSON - POST /api/jobs/export"

JSON_EXPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/jobs/export" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d "{\"ids\": [\"$JOB_ID\"], \"format\": \"json\"}")

if echo "$JSON_EXPORT_RESPONSE" | jq -e 'type == "array" and length > 0' > /dev/null; then
    pass_test
else
    fail_test "JSON export failed or empty array"
fi

# ============================================================================
# TEST 13: Delete Job (DELETE /api/jobs/:id)
# ============================================================================
run_test "Delete Job - DELETE /api/jobs/:id"

DELETE_RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}/api/jobs/${JOB_ID}" \
  -H "X-Test-User-Id: test-admin-1")

if [ "$DELETE_RESPONSE_CODE" == "204" ] || [ "$DELETE_RESPONSE_CODE" == "200" ]; then
    pass_test
else
    fail_test "Expected 204 or 200 status code, got $DELETE_RESPONSE_CODE"
fi

# ============================================================================
# TEST 14: Verify Job Deleted (404 Test)
# ============================================================================
run_test "Verify Job Deleted - GET /api/jobs/:id (404 Expected)"

DELETED_CHECK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/jobs/${JOB_ID}" \
  -H "X-Test-User-Id: test-admin-1")

if [ "$DELETED_CHECK_CODE" == "404" ]; then
    pass_test
else
    fail_test "Job still exists after deletion. Status: $DELETED_CHECK_CODE"
fi

# ============================================================================
# TEST 15: Create Job with Missing Required Fields (400 Test)
# ============================================================================
run_test "Create Job with Missing Required Fields - Validation Error"

VALIDATION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/jobs" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Incomplete Job"
  }')

VALIDATION_HTTP_CODE=$(echo "$VALIDATION_RESPONSE" | tail -n1)

if [ "$VALIDATION_HTTP_CODE" == "400" ]; then
    pass_test
else
    fail_test "Expected 400 validation error, got $VALIDATION_HTTP_CODE"
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary               ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests Run:    ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:       ${RED}$TESTS_FAILED${NC}"
echo -e "${BLUE}========================================${NC}\n"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
