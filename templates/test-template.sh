#!/bin/bash

# [FEATURE NAME] - Smoke Test Suite
# Tests critical [feature] workflows to ensure basic functionality
# Usage: bash scripts/smoke-test-[feature].sh
#
# TODO: Replace [FEATURE], [RESOURCE], [ENDPOINT] placeholders
# TODO: Customize test data and assertions for your feature
# TODO: Add feature-specific tests beyond basic CRUD

set -e  # Exit immediately if any command fails
set -o pipefail  # Catch failures in pipes

# ============================================================================
# CONFIGURATION
# ============================================================================

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Base URL (override with environment variable)
BASE_URL="${API_BASE_URL:-http://localhost:5000}"

# Test data storage (IDs captured during tests)
# TODO: Add variables for your feature's IDs
RESOURCE_ID=""
RELATED_RESOURCE_ID=""

# Cleanup tracking (IDs to delete after tests)
CLEANUP_IDS=()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Start a new test
run_test() {
    local test_name="$1"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${BLUE}[TEST $TESTS_RUN]${NC} $test_name"
}

# Mark test as passed
pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC}\n"
}

# Mark test as failed and exit
fail_test() {
    local message="$1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗ FAIL${NC}: $message\n"
    exit 1
}

# Log informational message
log_info() {
    echo -e "${YELLOW}  ℹ${NC} $1"
}

# Log success message
log_success() {
    echo -e "${GREEN}  ✓${NC} $1"
}

# Log warning message
log_warn() {
    echo -e "${YELLOW}  ⚠${NC} $1"
}

# Cleanup function (runs on script exit)
cleanup() {
    if [ ${#CLEANUP_IDS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}Cleaning up test data...${NC}"
        
        # TODO: Delete test resources created during tests
        # Example: Delete main resource (may cascade to related resources)
        if [ -n "$RESOURCE_ID" ]; then
            curl -s -X DELETE "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
                -H "X-Test-User-Id: test-admin-1" > /dev/null 2>&1 || true
            log_success "Deleted test [resource] and related data"
        fi
    fi
}

# Register cleanup to run on script exit
trap cleanup EXIT

# ============================================================================
# HEADER
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  [FEATURE NAME] Smoke Test Suite     ${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "Testing against: ${BASE_URL}\n"

# ============================================================================
# SETUP: Health Check
# ============================================================================

echo -e "${YELLOW}[SETUP]${NC} Checking server health..."

if ! curl -s --head --request GET "${BASE_URL}/api/health" | grep "200 OK" > /dev/null; then 
   echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
   echo "Please start the server with: npm run dev"
   exit 1
fi

log_success "Server is running"
echo ""

# ============================================================================
# SETUP: Authentication
# ============================================================================

echo -e "${YELLOW}[SETUP]${NC} Authenticating test user..."

# TODO: Update authentication method if different
# Option 1: Dev mode login (for development)
# AUTH_COOKIE=$(curl -s "${BASE_URL}/api/dev-login/test-admin" | grep -o 'session=[^;]*')

# Option 2: Manual header (for testing)
AUTH_HEADER="X-Test-User-Id: test-admin-1"

# Verify authentication works
AUTH_TEST=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/auth/user" \
  -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$AUTH_TEST" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Authentication failed (HTTP $HTTP_CODE)"
fi

log_success "Authenticated as test-admin"
echo ""

# ============================================================================
# TEST 1: Create [Resource] (POST /api/[resources])
# ============================================================================

run_test "Create [Resource] - POST /api/[resources]"

# TODO: Customize request body for your feature
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/[resources]" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Smoke Test [Resource]",
    "description": "Automated test - DO NOT DELETE MANUALLY",
    "field1": "value1",
    "field2": 123
  }')

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

# Validate HTTP status code
if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE. Response: $RESPONSE_BODY"
fi

# Extract resource ID from response
RESOURCE_ID=$(echo "$RESPONSE_BODY" | jq -r '.id // empty')

if [ -z "$RESOURCE_ID" ]; then
    fail_test "No resource ID in response. Response: $RESPONSE_BODY"
fi

# Track for cleanup
CLEANUP_IDS+=("$RESOURCE_ID")

# Validate response data
# TODO: Customize assertions for your feature
if echo "$RESPONSE_BODY" | jq -e '.name == "Smoke Test [Resource]"' > /dev/null; then
    log_info "Resource ID: $RESOURCE_ID"
    log_info "Name: Smoke Test [Resource]"
    pass_test
else
    fail_test "Resource data mismatch"
fi

# ============================================================================
# TEST 2: Get [Resource] by ID (GET /api/[resources]/:id)
# ============================================================================

run_test "Get [Resource] by ID - GET /api/[resources]/:id"

GET_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
  -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate retrieved data matches created data
# TODO: Customize validation for your feature
if echo "$RESPONSE_BODY" | jq -e ".id == \"$RESOURCE_ID\" and .name == \"Smoke Test [Resource]\"" > /dev/null; then
    log_success "Successfully retrieved [resource]"
    pass_test
else
    fail_test "[Resource] data mismatch on retrieval"
fi

# ============================================================================
# TEST 3: Update [Resource] (PUT/PATCH /api/[resources]/:id)
# ============================================================================

run_test "Update [Resource] - PUT /api/[resources]/:id"

# TODO: Customize update payload
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Updated Smoke Test [Resource]",
    "field1": "updated_value",
    "field2": 456
  }')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate update was applied
# TODO: Customize validation
if echo "$RESPONSE_BODY" | jq -e '.name == "Updated Smoke Test [Resource]" and .field2 == 456' > /dev/null; then
    log_info "Name updated: 'Smoke Test' → 'Updated Smoke Test'"
    log_info "field2 updated: 123 → 456"
    pass_test
else
    fail_test "[Resource] update failed"
fi

# ============================================================================
# TEST 4: List [Resources] (GET /api/[resources])
# ============================================================================

run_test "List [Resources] - GET /api/[resources]"

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/[resources]" \
  -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate response is array or paginated object
if echo "$RESPONSE_BODY" | jq -e 'type == "array" or (type == "object" and has("data"))' > /dev/null; then
    RESOURCE_COUNT=$(echo "$RESPONSE_BODY" | jq -r 'if type == "array" then length elif has("data") then .data | length else 0 end')
    
    if [ "$RESOURCE_COUNT" -gt 0 ]; then
        log_info "Total [resources] returned: $RESOURCE_COUNT"
        
        # Verify our test resource is in the list
        if echo "$RESPONSE_BODY" | jq -e ".[] | select(.id == \"$RESOURCE_ID\")" > /dev/null 2>&1 || \
           echo "$RESPONSE_BODY" | jq -e ".data[] | select(.id == \"$RESOURCE_ID\")" > /dev/null 2>&1; then
            log_success "Test [resource] found in list"
        fi
        
        pass_test
    else
        fail_test "No [resources] returned"
    fi
else
    fail_test "Invalid response format"
fi

# ============================================================================
# TEST 5: [Feature-Specific Test 1]
# ============================================================================

# TODO: Add feature-specific tests beyond basic CRUD
# Examples:
# - Test business logic (validation rules, calculations)
# - Test relationships (create related resource, verify association)
# - Test authorization (inspector can only see their own data)
# - Test error cases (invalid input, duplicate creation, etc.)

run_test "[Feature-Specific Test - TODO: Describe]"

# TODO: Implement feature-specific test
# Example structure:
# RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/[resources]/${RESOURCE_ID}/[action]" \
#   -H "Content-Type: application/json" \
#   -H "$AUTH_HEADER" \
#   -d '{ "key": "value" }')
#
# HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# BODY=$(echo "$RESPONSE" | head -n-1)
#
# if [ "$HTTP_CODE" != "200" ]; then
#     fail_test "Expected 200, got $HTTP_CODE"
# fi
#
# Validate expected behavior
# if echo "$BODY" | jq -e '.someField == "expectedValue"' > /dev/null; then
#     log_info "Feature-specific logic validated"
#     pass_test
# else
#     fail_test "Feature validation failed"
# fi

log_warn "TODO: Implement feature-specific test"
pass_test  # Remove this when implementing real test

# ============================================================================
# TEST 6: Authorization Check (403 Forbidden)
# ============================================================================

run_test "Authorization Check - Inspector cannot delete (admin-only action)"

# TODO: Customize for your feature's authorization rules
# Try to delete with inspector credentials (should fail)
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
  -H "X-Test-User-Id: test-inspector1")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

# Should return 403 Forbidden (or 401 if auth middleware rejects first)
if [ "$HTTP_CODE" == "403" ] || [ "$HTTP_CODE" == "401" ]; then
    log_info "Correctly denied delete operation for inspector"
    pass_test
else
    fail_test "Expected 403/401, got $HTTP_CODE (authorization not enforced)"
fi

# ============================================================================
# TEST 7: Validation Error (400 Bad Request)
# ============================================================================

run_test "Validation Error - Missing required field returns 400"

# TODO: Customize for your feature's validation rules
# Try to create resource with missing required field
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/[resources]" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "description": "Missing required name field"
  }')

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "400" ]; then
    log_info "Validation error correctly returned"
    
    # Optionally validate error message content
    if echo "$RESPONSE_BODY" | jq -e '.message' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.message')
        log_info "Error message: $ERROR_MSG"
    fi
    
    pass_test
else
    fail_test "Expected 400, got $HTTP_CODE (validation not working)"
fi

# ============================================================================
# TEST 8: Delete [Resource] (DELETE /api/[resources]/:id)
# ============================================================================

run_test "Delete [Resource] - DELETE /api/[resources]/:id"

# Note: Cleanup function will also try to delete, but we test explicit delete here
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
  -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "204" ]; then
    log_info "Resource deleted successfully"
    
    # Verify deletion (GET should return 404)
    VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/[resources]/${RESOURCE_ID}" \
      -H "$AUTH_HEADER")
    VERIFY_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
    
    if [ "$VERIFY_CODE" == "404" ]; then
        log_success "Verified resource no longer exists"
        RESOURCE_ID=""  # Clear ID so cleanup doesn't try to delete again
        pass_test
    else
        fail_test "Resource still exists after deletion (got HTTP $VERIFY_CODE)"
    fi
else
    fail_test "Expected 200/204, got $HTTP_CODE"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary                         ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total tests run:    ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed:       ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
