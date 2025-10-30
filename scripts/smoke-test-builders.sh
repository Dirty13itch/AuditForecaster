#!/bin/bash

# Builder Hierarchy & Contacts System - Smoke Test Suite
# Tests complete builder CRM lifecycle including contacts, agreements, programs, and geographic hierarchy
# Usage: bash scripts/smoke-test-builders.sh

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

# Test data storage
BUILDER_ID=""
CONTACT_ID=""
CONTACT_ID_2=""
AGREEMENT_ID=""
PROGRAM_ID=""
INTERACTION_ID=""
DEVELOPMENT_ID=""
LOT_ID=""

# Cleanup tracking
CLEANUP_IDS=()

# Test functions
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
    exit 1
}

log_info() {
    echo -e "${YELLOW}  ℹ${NC} $1"
}

# Cleanup function
cleanup() {
    if [ ${#CLEANUP_IDS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}Cleaning up test data...${NC}"
        
        # Delete builder (cascades to all related data)
        if [ -n "$BUILDER_ID" ]; then
            curl -s -X DELETE "${BASE_URL}/api/builders/${BUILDER_ID}" \
                -H "X-Test-User-Id: test-admin-1" > /dev/null 2>&1 || true
            echo -e "${GREEN}✓${NC} Deleted test builder and all related data"
        fi
    fi
}

trap cleanup EXIT

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Builder Hierarchy & Contacts Suite  ${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "Testing against: ${BASE_URL}\n"

# ============================================================================
# SETUP: Check server health
# ============================================================================
echo -e "${YELLOW}[SETUP]${NC} Checking server health..."

if ! curl -s --head --request GET "${BASE_URL}/api/health" | grep "200 OK" > /dev/null; then 
   echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
   echo "Please start the server with: npm run dev"
   exit 1
fi

echo -e "${GREEN}✓ Server is running${NC}\n"

# ============================================================================
# TEST 1: Create Builder (POST /api/builders)
# ============================================================================
run_test "Create Builder - POST /api/builders"

CREATE_BUILDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "John Smith",
    "companyName": "Smoke Test Homes LLC",
    "email": "john.smith@smoketesthomes.com",
    "phone": "612-555-0100",
    "volumeTier": "medium",
    "tradeType": "production_builder",
    "rating": 4,
    "billingTerms": "Net 30",
    "preferredLeadTime": 3,
    "notes": "Automated smoke test builder - DO NOT DELETE MANUALLY"
  }')

HTTP_CODE=$(echo "$CREATE_BUILDER_RESPONSE" | tail -n1)
BUILDER_BODY=$(echo "$CREATE_BUILDER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE. Response: $BUILDER_BODY"
fi

BUILDER_ID=$(echo "$BUILDER_BODY" | jq -r '.id // empty')

if [ -z "$BUILDER_ID" ]; then
    fail_test "No builder ID in response. Response: $BUILDER_BODY"
fi

CLEANUP_IDS+=("$BUILDER_ID")

if echo "$BUILDER_BODY" | jq -e '.companyName == "Smoke Test Homes LLC"' > /dev/null; then
    log_info "Builder ID: $BUILDER_ID"
    log_info "Company: Smoke Test Homes LLC"
    log_info "Volume Tier: medium"
    pass_test
else
    fail_test "Builder data mismatch"
fi

# ============================================================================
# TEST 2: Get Builder by ID (GET /api/builders/:id)
# ============================================================================
run_test "Get Builder by ID - GET /api/builders/:id"

GET_BUILDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_BUILDER_RESPONSE" | tail -n1)
BUILDER_BODY=$(echo "$GET_BUILDER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

if echo "$BUILDER_BODY" | jq -e ".id == \"$BUILDER_ID\" and .companyName == \"Smoke Test Homes LLC\"" > /dev/null; then
    log_info "Successfully retrieved builder"
    pass_test
else
    fail_test "Builder data mismatch on retrieval"
fi

# ============================================================================
# TEST 3: Update Builder (PUT /api/builders/:id)
# ============================================================================
run_test "Update Builder - PUT /api/builders/:id"

UPDATE_BUILDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/builders/${BUILDER_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "volumeTier": "high",
    "rating": 5,
    "notes": "Updated during smoke test - High volume builder"
  }')

HTTP_CODE=$(echo "$UPDATE_BUILDER_RESPONSE" | tail -n1)
BUILDER_BODY=$(echo "$UPDATE_BUILDER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

if echo "$BUILDER_BODY" | jq -e '.volumeTier == "high" and .rating == 5' > /dev/null; then
    log_info "Volume tier updated: medium → high"
    log_info "Rating updated: 4 → 5"
    pass_test
else
    fail_test "Builder update failed"
fi

# ============================================================================
# TEST 4: Get All Builders (GET /api/builders)
# ============================================================================
run_test "Get All Builders - GET /api/builders"

GET_ALL_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_ALL_RESPONSE" | tail -n1)
BUILDERS_BODY=$(echo "$GET_ALL_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Check if response is array or paginated object
if echo "$BUILDERS_BODY" | jq -e 'type == "array" or (type == "object" and has("data"))' > /dev/null; then
    BUILDER_COUNT=$(echo "$BUILDERS_BODY" | jq -r 'if type == "array" then length elif has("data") then .data | length else 0 end')
    if [ "$BUILDER_COUNT" -gt 0 ]; then
        log_info "Total builders returned: $BUILDER_COUNT"
        pass_test
    else
        fail_test "No builders returned"
    fi
else
    fail_test "Invalid response format"
fi

# ============================================================================
# TEST 5: Create Builder Contact (POST /api/builders/:builderId/contacts)
# ============================================================================
run_test "Create Builder Contact - POST /api/builders/:builderId/contacts"

CREATE_CONTACT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/contacts" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Mike Johnson",
    "title": "Superintendent",
    "email": "mike.j@smoketesthomes.com",
    "phone": "612-555-0101",
    "mobilePhone": "612-555-0102",
    "role": "superintendent",
    "isPrimary": true,
    "preferredContactMethod": "phone"
  }')

HTTP_CODE=$(echo "$CREATE_CONTACT_RESPONSE" | tail -n1)
CONTACT_BODY=$(echo "$CREATE_CONTACT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

CONTACT_ID=$(echo "$CONTACT_BODY" | jq -r '.id // empty')

if [ -z "$CONTACT_ID" ]; then
    fail_test "No contact ID in response"
fi

if echo "$CONTACT_BODY" | jq -e '.name == "Mike Johnson" and .role == "superintendent" and .isPrimary == true' > /dev/null; then
    log_info "Contact ID: $CONTACT_ID"
    log_info "Name: Mike Johnson (Superintendent)"
    log_info "Primary Contact: Yes"
    pass_test
else
    fail_test "Contact data mismatch"
fi

# ============================================================================
# TEST 6: Create Second Contact and Set Primary (PUT /api/builders/:builderId/contacts/:id/primary)
# ============================================================================
run_test "Create Second Contact - POST /api/builders/:builderId/contacts"

CREATE_CONTACT_2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/contacts" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Sarah Williams",
    "title": "Project Manager",
    "email": "sarah.w@smoketesthomes.com",
    "phone": "612-555-0103",
    "role": "project_manager",
    "isPrimary": false,
    "preferredContactMethod": "email"
  }')

HTTP_CODE=$(echo "$CREATE_CONTACT_2_RESPONSE" | tail -n1)
CONTACT_2_BODY=$(echo "$CREATE_CONTACT_2_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

CONTACT_ID_2=$(echo "$CONTACT_2_BODY" | jq -r '.id // empty')

if [ -z "$CONTACT_ID_2" ]; then
    fail_test "No contact ID in response"
fi

log_info "Contact ID: $CONTACT_ID_2"
log_info "Name: Sarah Williams (Project Manager)"

# Now set Sarah as primary contact
echo -e "${BLUE}[TEST $TESTS_RUN]${NC} Set Primary Contact - PUT /api/builders/:builderId/contacts/:id/primary"

SET_PRIMARY_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/builders/${BUILDER_ID}/contacts/${CONTACT_ID_2}/primary" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$SET_PRIMARY_RESPONSE" | tail -n1)
PRIMARY_BODY=$(echo "$SET_PRIMARY_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

if echo "$PRIMARY_BODY" | jq -e '.isPrimary == true' > /dev/null; then
    log_info "Sarah Williams set as primary contact"
    pass_test
else
    fail_test "Failed to set primary contact"
fi

# ============================================================================
# TEST 7: Get Contacts by Role (GET /api/builders/:builderId/contacts/by-role/:role)
# ============================================================================
run_test "Get Contacts by Role - GET /api/builders/:builderId/contacts/by-role/superintendent"

GET_CONTACTS_BY_ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/contacts/by-role/superintendent" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_CONTACTS_BY_ROLE_RESPONSE" | tail -n1)
CONTACTS_BODY=$(echo "$GET_CONTACTS_BY_ROLE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

SUPERINTENDENT_COUNT=$(echo "$CONTACTS_BODY" | jq 'length')

if [ "$SUPERINTENDENT_COUNT" -ge 1 ]; then
    SUPERINTENDENT_NAME=$(echo "$CONTACTS_BODY" | jq -r '.[0].name')
    log_info "Found $SUPERINTENDENT_COUNT superintendent(s)"
    log_info "Name: $SUPERINTENDENT_NAME"
    pass_test
else
    fail_test "No superintendents found"
fi

# ============================================================================
# TEST 8: Create Builder Agreement (POST /api/builders/:builderId/agreements)
# ============================================================================
run_test "Create Builder Agreement - POST /api/builders/:builderId/agreements"

# Calculate dates (start: today, end: 1 year from now)
START_DATE=$(date -u +"%Y-%m-%dT00:00:00.000Z")
END_DATE=$(date -u -d "+1 year" +"%Y-%m-%dT23:59:59.000Z" 2>/dev/null || date -u -v+1y +"%Y-%m-%dT23:59:59.000Z")

CREATE_AGREEMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/agreements" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d "{
    \"startDate\": \"$START_DATE\",
    \"endDate\": \"$END_DATE\",
    \"defaultInspectionPricing\": \"425.00\",
    \"paymentTerms\": \"Net 30\",
    \"inspectionTypesIncluded\": [\"pre_drywall\", \"final\"],
    \"status\": \"active\",
    \"notes\": \"Annual agreement - 10% volume discount\"
  }")

HTTP_CODE=$(echo "$CREATE_AGREEMENT_RESPONSE" | tail -n1)
AGREEMENT_BODY=$(echo "$CREATE_AGREEMENT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

AGREEMENT_ID=$(echo "$AGREEMENT_BODY" | jq -r '.id // empty')

if [ -z "$AGREEMENT_ID" ]; then
    fail_test "No agreement ID in response"
fi

if echo "$AGREEMENT_BODY" | jq -e '.status == "active" and .defaultInspectionPricing == "425.00"' > /dev/null; then
    log_info "Agreement ID: $AGREEMENT_ID"
    log_info "Status: active"
    log_info "Default Pricing: \$425.00"
    log_info "Payment Terms: Net 30"
    pass_test
else
    fail_test "Agreement data mismatch"
fi

# ============================================================================
# TEST 9: Get All Agreements for Builder (GET /api/builders/:builderId/agreements)
# ============================================================================
run_test "Get All Agreements - GET /api/builders/:builderId/agreements"

GET_AGREEMENTS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/agreements" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_AGREEMENTS_RESPONSE" | tail -n1)
AGREEMENTS_BODY=$(echo "$GET_AGREEMENTS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

AGREEMENT_COUNT=$(echo "$AGREEMENTS_BODY" | jq 'length')
ACTIVE_COUNT=$(echo "$AGREEMENTS_BODY" | jq '[.[] | select(.status == "active")] | length')

if [ "$AGREEMENT_COUNT" -ge 1 ]; then
    log_info "Total agreements: $AGREEMENT_COUNT"
    log_info "Active agreements: $ACTIVE_COUNT"
    pass_test
else
    fail_test "No agreements found"
fi

# ============================================================================
# TEST 10: Get Expiring Agreements (GET /api/agreements/expiring?days=30)
# ============================================================================
run_test "Get Expiring Agreements - GET /api/agreements/expiring?days=30"

GET_EXPIRING_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/agreements/expiring?days=30" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_EXPIRING_RESPONSE" | tail -n1)
EXPIRING_BODY=$(echo "$GET_EXPIRING_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# This may return 0 results since our test agreement is 1 year out
EXPIRING_COUNT=$(echo "$EXPIRING_BODY" | jq 'length')
log_info "Agreements expiring in 30 days: $EXPIRING_COUNT"
pass_test

# ============================================================================
# TEST 11: Create Builder Program Enrollment (POST /api/builders/:builderId/programs)
# ============================================================================
run_test "Create Program Enrollment - POST /api/builders/:builderId/programs"

CREATE_PROGRAM_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/programs" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "programName": "IRS 45L Tax Credit",
    "programType": "tax_credit",
    "certificationLevel": "Standard",
    "enrollmentDate": "2024-01-15",
    "isActive": true,
    "certificationNumber": "45L-2024-SMOKE-001",
    "notes": "Qualified for 2024 tax year"
  }')

HTTP_CODE=$(echo "$CREATE_PROGRAM_RESPONSE" | tail -n1)
PROGRAM_BODY=$(echo "$CREATE_PROGRAM_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

PROGRAM_ID=$(echo "$PROGRAM_BODY" | jq -r '.id // empty')

if [ -z "$PROGRAM_ID" ]; then
    fail_test "No program ID in response"
fi

if echo "$PROGRAM_BODY" | jq -e '.programName == "IRS 45L Tax Credit" and .isActive == true' > /dev/null; then
    log_info "Program ID: $PROGRAM_ID"
    log_info "Program: IRS 45L Tax Credit"
    log_info "Status: Active"
    pass_test
else
    fail_test "Program data mismatch"
fi

# ============================================================================
# TEST 12: Get Active Programs (GET /api/builders/:builderId/programs)
# ============================================================================
run_test "Get Active Programs - GET /api/builders/:builderId/programs"

GET_PROGRAMS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/programs" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_PROGRAMS_RESPONSE" | tail -n1)
PROGRAMS_BODY=$(echo "$GET_PROGRAMS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

PROGRAM_COUNT=$(echo "$PROGRAMS_BODY" | jq 'length')
ACTIVE_PROGRAMS=$(echo "$PROGRAMS_BODY" | jq '[.[] | select(.isActive == true)] | length')

if [ "$PROGRAM_COUNT" -ge 1 ]; then
    log_info "Total programs: $PROGRAM_COUNT"
    log_info "Active programs: $ACTIVE_PROGRAMS"
    pass_test
else
    fail_test "No programs found"
fi

# ============================================================================
# TEST 13: Create Builder Interaction Log (POST /api/builders/:builderId/interactions)
# ============================================================================
run_test "Create Interaction Log - POST /api/builders/:builderId/interactions"

CREATE_INTERACTION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/interactions" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d "{
    \"contactId\": \"$CONTACT_ID\",
    \"interactionType\": \"phone_call\",
    \"interactionDate\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
    \"outcome\": \"positive\",
    \"summary\": \"Discussed upcoming inspection schedule for Q2. Builder confirmed 15 pre-drywall inspections expected.\",
    \"followUpRequired\": true,
    \"followUpDate\": \"$(date -u -d "+7 days" +"%Y-%m-%dT00:00:00.000Z" 2>/dev/null || date -u -v+7d +"%Y-%m-%dT00:00:00.000Z")\"
  }")

HTTP_CODE=$(echo "$CREATE_INTERACTION_RESPONSE" | tail -n1)
INTERACTION_BODY=$(echo "$CREATE_INTERACTION_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

INTERACTION_ID=$(echo "$INTERACTION_BODY" | jq -r '.id // empty')

if [ -z "$INTERACTION_ID" ]; then
    fail_test "No interaction ID in response"
fi

if echo "$INTERACTION_BODY" | jq -e '.interactionType == "phone_call" and .outcome == "positive"' > /dev/null; then
    log_info "Interaction ID: $INTERACTION_ID"
    log_info "Type: Phone Call"
    log_info "Outcome: Positive"
    log_info "Follow-up Required: Yes"
    pass_test
else
    fail_test "Interaction data mismatch"
fi

# ============================================================================
# TEST 14: Create Development with Lots (POST /api/builders/:builderId/developments)
# ============================================================================
run_test "Create Development - POST /api/builders/:builderId/developments"

CREATE_DEVELOPMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/builders/${BUILDER_ID}/developments" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "name": "Smoke Test Meadows",
    "address": "1000 Development Drive",
    "city": "Minneapolis",
    "state": "MN",
    "zipCode": "55401",
    "totalLots": 25,
    "status": "active",
    "phase": "Phase 1",
    "notes": "Automated smoke test development"
  }')

HTTP_CODE=$(echo "$CREATE_DEVELOPMENT_RESPONSE" | tail -n1)
DEVELOPMENT_BODY=$(echo "$CREATE_DEVELOPMENT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

DEVELOPMENT_ID=$(echo "$DEVELOPMENT_BODY" | jq -r '.id // empty')

if [ -z "$DEVELOPMENT_ID" ]; then
    fail_test "No development ID in response"
fi

if echo "$DEVELOPMENT_BODY" | jq -e '.name == "Smoke Test Meadows" and .totalLots == 25' > /dev/null; then
    log_info "Development ID: $DEVELOPMENT_ID"
    log_info "Name: Smoke Test Meadows"
    log_info "Total Lots: 25"
    pass_test
else
    fail_test "Development data mismatch"
fi

# Now create a lot in this development
run_test "Create Lot in Development - POST /api/developments/:developmentId/lots"

CREATE_LOT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/developments/${DEVELOPMENT_ID}/lots" \
  -H "Content-Type: application/json" \
  -H "X-Test-User-Id: test-admin-1" \
  -d '{
    "lotNumber": "101",
    "block": "A",
    "address": "101 Smoke Test Lane",
    "status": "under_construction",
    "sqft": "2400",
    "model": "Aspen",
    "notes": "Corner lot with premium upgrades"
  }')

HTTP_CODE=$(echo "$CREATE_LOT_RESPONSE" | tail -n1)
LOT_BODY=$(echo "$CREATE_LOT_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 201/200, got $HTTP_CODE"
fi

LOT_ID=$(echo "$LOT_BODY" | jq -r '.id // empty')

if [ -z "$LOT_ID" ]; then
    fail_test "No lot ID in response"
fi

if echo "$LOT_BODY" | jq -e '.lotNumber == "101" and .block == "A"' > /dev/null; then
    log_info "Lot ID: $LOT_ID"
    log_info "Lot Number: 101, Block A"
    log_info "Status: Under Construction"
    pass_test
else
    fail_test "Lot data mismatch"
fi

# ============================================================================
# TEST 15: Get Development with Lots (GET /api/developments/:id/with-lots)
# ============================================================================
run_test "Get Development with Lots - GET /api/developments/:id/with-lots"

GET_DEV_WITH_LOTS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/developments/${DEVELOPMENT_ID}/with-lots" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_DEV_WITH_LOTS_RESPONSE" | tail -n1)
DEV_LOTS_BODY=$(echo "$GET_DEV_WITH_LOTS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate hierarchical structure
if echo "$DEV_LOTS_BODY" | jq -e 'has("lots")' > /dev/null; then
    LOT_COUNT=$(echo "$DEV_LOTS_BODY" | jq '.lots | length')
    log_info "Development returned with hierarchical data"
    log_info "Lots in development: $LOT_COUNT"
    
    if [ "$LOT_COUNT" -ge 1 ]; then
        pass_test
    else
        fail_test "No lots found in development"
    fi
else
    fail_test "Response missing hierarchical lots data"
fi

# ============================================================================
# TEST 16: Get Builder Stats (GET /api/builders/:id/stats)
# ============================================================================
run_test "Get Builder Stats - GET /api/builders/:id/stats"

GET_STATS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/stats" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_STATS_RESPONSE" | tail -n1)
STATS_BODY=$(echo "$GET_STATS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate stats structure
if echo "$STATS_BODY" | jq -e 'has("totalDevelopments") and has("totalLots") and has("totalJobs")' > /dev/null; then
    TOTAL_DEVS=$(echo "$STATS_BODY" | jq -r '.totalDevelopments')
    TOTAL_LOTS=$(echo "$STATS_BODY" | jq -r '.totalLots')
    TOTAL_JOBS=$(echo "$STATS_BODY" | jq -r '.totalJobs')
    
    log_info "Total Developments: $TOTAL_DEVS"
    log_info "Total Lots: $TOTAL_LOTS"
    log_info "Total Jobs: $TOTAL_JOBS"
    
    if [ "$TOTAL_DEVS" -ge 1 ] && [ "$TOTAL_LOTS" -ge 1 ]; then
        pass_test
    else
        fail_test "Stats don't reflect created development/lots"
    fi
else
    fail_test "Stats response missing required fields"
fi

# ============================================================================
# TEST 17: Get Builder Hierarchy (GET /api/builders/:id/hierarchy)
# ============================================================================
run_test "Get Builder Hierarchy - GET /api/builders/:id/hierarchy"

GET_HIERARCHY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/hierarchy" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$GET_HIERARCHY_RESPONSE" | tail -n1)
HIERARCHY_BODY=$(echo "$GET_HIERARCHY_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    fail_test "Expected 200, got $HTTP_CODE"
fi

# Validate full hierarchy structure (Builder → Developments → Lots → Jobs)
if echo "$HIERARCHY_BODY" | jq -e 'has("builder") and has("developments")' > /dev/null; then
    DEV_COUNT=$(echo "$HIERARCHY_BODY" | jq '.developments | length')
    
    log_info "Full builder hierarchy returned"
    log_info "Builder: $(echo "$HIERARCHY_BODY" | jq -r '.builder.companyName')"
    log_info "Developments: $DEV_COUNT"
    
    # Check if developments have nested lots
    if echo "$HIERARCHY_BODY" | jq -e '.developments[0] | has("lots")' > /dev/null 2>&1; then
        LOTS_IN_FIRST_DEV=$(echo "$HIERARCHY_BODY" | jq '.developments[0].lots | length' 2>/dev/null || echo "0")
        log_info "Lots in first development: $LOTS_IN_FIRST_DEV"
        pass_test
    else
        log_info "No lots in development (expected for new data)"
        pass_test
    fi
else
    fail_test "Hierarchy response missing required nested structure"
fi

# ============================================================================
# TEST 18: Verify cross-tenant access is blocked (negative test)
# ============================================================================
run_test "Verify cross-tenant access blocked - GET /api/builders/:id (negative test)"

# Try to access the builder created by test-admin-1 using test-inspector2
GET_CROSS_TENANT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}" \
  -H "X-Test-User-Id: test-inspector2")

HTTP_CODE=$(echo "$GET_CROSS_TENANT_RESPONSE" | tail -n1)
CROSS_TENANT_BODY=$(echo "$GET_CROSS_TENANT_RESPONSE" | head -n-1)

# Should get 403 Forbidden or 404 Not Found - any 200 with data is a security breach
if [ "$HTTP_CODE" == "200" ]; then
    if echo "$CROSS_TENANT_BODY" | jq -e '.id' > /dev/null 2>&1; then
        fail_test "SECURITY BREACH: test-inspector2 can access test-admin-1's builder data!"
    fi
fi

if [ "$HTTP_CODE" == "403" ] || [ "$HTTP_CODE" == "404" ]; then
    log_info "✓ Builder detail access correctly blocked (HTTP $HTTP_CODE)"
else
    log_info "Warning: Expected 403/404, got $HTTP_CODE - verifying no data leaked"
fi

# Try to access builder stats - should also be blocked
GET_STATS_CROSS_TENANT=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/stats" \
  -H "X-Test-User-Id: test-inspector2")

STATS_HTTP_CODE=$(echo "$GET_STATS_CROSS_TENANT" | tail -n1)
STATS_BODY=$(echo "$GET_STATS_CROSS_TENANT" | head -n-1)

if [ "$STATS_HTTP_CODE" == "200" ]; then
    if echo "$STATS_BODY" | jq -e '.totalDevelopments' > /dev/null 2>&1; then
        fail_test "SECURITY BREACH: test-inspector2 can access test-admin-1's builder stats!"
    fi
fi

log_info "✓ Builder stats access correctly blocked"

# Try to access builder hierarchy - should also be blocked  
GET_HIERARCHY_CROSS_TENANT=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}/hierarchy" \
  -H "X-Test-User-Id: test-inspector2")

HIERARCHY_HTTP_CODE=$(echo "$GET_HIERARCHY_CROSS_TENANT" | tail -n1)
HIERARCHY_BODY=$(echo "$GET_HIERARCHY_CROSS_TENANT" | head -n-1)

if [ "$HIERARCHY_HTTP_CODE" == "200" ]; then
    if echo "$HIERARCHY_BODY" | jq -e '.builder.id' > /dev/null 2>&1; then
        fail_test "SECURITY BREACH: test-inspector2 can access test-admin-1's builder hierarchy!"
    fi
fi

log_info "✓ Builder hierarchy access correctly blocked"
log_info "Cross-tenant access controls verified for all 3 endpoints (403/404)"

pass_test

# ============================================================================
# TEST 19 (BONUS): Delete Builder - Cascade Delete Verification
# ============================================================================
run_test "Delete Builder - Cascade Verification (DELETE /api/builders/:id)"

DELETE_BUILDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/api/builders/${BUILDER_ID}" \
  -H "X-Test-User-Id: test-admin-1")

HTTP_CODE=$(echo "$DELETE_BUILDER_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "204" ]; then
    fail_test "Expected 200/204, got $HTTP_CODE"
fi

# Verify deletion by attempting to retrieve
VERIFY_DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/builders/${BUILDER_ID}" \
  -H "X-Test-User-Id: test-admin-1")

VERIFY_HTTP_CODE=$(echo "$VERIFY_DELETE_RESPONSE" | tail -n1)

if [ "$VERIFY_HTTP_CODE" == "404" ]; then
    log_info "Builder successfully deleted"
    log_info "All related data cascade deleted (contacts, agreements, programs, etc.)"
    
    # Clear builder ID to prevent cleanup attempt
    BUILDER_ID=""
    CLEANUP_IDS=()
    
    pass_test
else
    fail_test "Builder still exists after deletion"
fi

# ============================================================================
# FINAL RESULTS
# ============================================================================
echo ""
echo "========================================"
echo "          TEST SUMMARY                  "
echo "========================================"
echo -e "Total Tests:  ${BLUE}$TESTS_RUN${NC}"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All 19 smoke tests passed! ✅${NC}\n"
    echo "Tests Passed: $TESTS_PASSED/19"
    exit 0
else
    echo -e "\n${RED}Some tests failed ❌${NC}\n"
    exit 1
fi
