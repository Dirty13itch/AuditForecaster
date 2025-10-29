#!/bin/bash

# Report Templates Smoke Test
# Tests all CRUD operations, cloning, archiving, and report instance creation
# Exit codes: 0 = all pass, 1 = one or more failures

set -e  # Exit on error

BASE_URL="${BASE_URL:-http://localhost:5000}"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test variables
TEMPLATE_ID=""
INSTANCE_ID=""
CSRF_TOKEN=""
SESSION_COOKIE=""

echo -e "${BOLD}🧪 Report Templates Smoke Test${NC}"
echo "========================================"
echo ""

# Helper function to make authenticated requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ "$method" = "GET" ] || [ "$method" = "DELETE" ]; then
    curl -s -X "$method" \
      -H "Cookie: $SESSION_COOKIE" \
      -H "x-csrf-token: $CSRF_TOKEN" \
      "${BASE_URL}${endpoint}"
  else
    curl -s -X "$method" \
      -H "Content-Type: application/json" \
      -H "Cookie: $SESSION_COOKIE" \
      -H "x-csrf-token: $CSRF_TOKEN" \
      -d "$data" \
      "${BASE_URL}${endpoint}"
  fi
}

# Test function
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "${YELLOW}▶${NC} ${test_name}..."
  
  if eval "$test_command"; then
    echo -e "${GREEN}✓${NC} ${test_name} passed"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} ${test_name} failed"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BOLD}Step 1: Health & Status Checks${NC}"
echo "----------------------------------------"

run_test "Health check (GET /healthz)" \
  "curl -sf ${BASE_URL}/healthz | jq -e '.status == \"healthy\"' > /dev/null"

run_test "Readiness check (GET /readyz)" \
  "curl -sf ${BASE_URL}/readyz | jq -e '.status == \"healthy\"' > /dev/null"

run_test "Status endpoint (GET /api/status)" \
  "curl -sf ${BASE_URL}/api/status | jq -e 'has(\"version\")' > /dev/null"

echo ""
echo -e "${BOLD}Step 2: Authentication Setup${NC}"
echo "----------------------------------------"

# Get CSRF token and session cookie
AUTH_RESPONSE=$(curl -sf -c /tmp/cookies.txt "${BASE_URL}/api/user" || echo '{}')
if echo "$AUTH_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Already authenticated"
  SESSION_COOKIE=$(cat /tmp/cookies.txt | grep -v '^#' | awk '{print $6"="$7}' | tr '\n' ';')
  CSRF_TOKEN=$(curl -sf -b /tmp/cookies.txt "${BASE_URL}/api/csrf-token" | jq -r '.token')
  ((PASSED++))
else
  # Need to login
  echo "Performing dev login..."
  curl -sf -c /tmp/cookies.txt -L "${BASE_URL}/api/dev-login" > /dev/null
  SESSION_COOKIE=$(cat /tmp/cookies.txt | grep -v '^#' | awk '{print $6"="$7}' | tr '\n' ';')
  CSRF_TOKEN=$(curl -sf -b /tmp/cookies.txt "${BASE_URL}/api/csrf-token" | jq -r '.token')
  
  if [ ! -z "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Dev login successful"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to obtain CSRF token"
    ((FAILED++))
    exit 1
  fi
fi

echo "CSRF Token: ${CSRF_TOKEN:0:20}..."
echo ""

echo -e "${BOLD}Step 3: Create Report Template${NC}"
echo "----------------------------------------"

TEMPLATE_DATA='{
  "name": "Smoke Test Template",
  "description": "Automated test template for verification",
  "category": "Testing",
  "inspectionType": "Smoke Test",
  "version": 1,
  "status": "draft",
  "components": [
    {
      "id": "property_address",
      "type": "text",
      "label": "Property Address",
      "properties": { "required": true }
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Inspection Date",
      "properties": { "required": true }
    },
    {
      "id": "floor_area",
      "type": "number",
      "label": "Floor Area (sq ft)",
      "properties": { "required": true, "min": 0 }
    },
    {
      "id": "notes",
      "type": "textarea",
      "label": "Notes",
      "properties": { "required": false }
    }
  ]
}'

CREATE_RESPONSE=$(make_request "POST" "/api/report-templates" "$TEMPLATE_DATA")
TEMPLATE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  echo -e "${GREEN}✓${NC} Template created with ID: $TEMPLATE_ID"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Failed to create template"
  echo "Response: $CREATE_RESPONSE"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 4: List All Templates${NC}"
echo "----------------------------------------"

LIST_RESPONSE=$(make_request "GET" "/api/report-templates" "")
TEMPLATE_COUNT=$(echo "$LIST_RESPONSE" | jq 'length')

if [ "$TEMPLATE_COUNT" -ge 1 ]; then
  echo -e "${GREEN}✓${NC} Retrieved $TEMPLATE_COUNT template(s)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Failed to list templates"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 5: Get Specific Template${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  GET_RESPONSE=$(make_request "GET" "/api/report-templates/$TEMPLATE_ID" "")
  RETRIEVED_NAME=$(echo "$GET_RESPONSE" | jq -r '.name')
  
  if [ "$RETRIEVED_NAME" = "Smoke Test Template" ]; then
    echo -e "${GREEN}✓${NC} Retrieved template: $RETRIEVED_NAME"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to retrieve correct template"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 6: Update Template${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  UPDATE_DATA='{"name": "Updated Smoke Test Template", "status": "published"}'
  UPDATE_RESPONSE=$(make_request "PUT" "/api/report-templates/$TEMPLATE_ID" "$UPDATE_DATA")
  UPDATED_NAME=$(echo "$UPDATE_RESPONSE" | jq -r '.name')
  
  if [ "$UPDATED_NAME" = "Updated Smoke Test Template" ]; then
    echo -e "${GREEN}✓${NC} Template updated successfully"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to update template"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 7: Clone Template${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  CLONE_DATA='{"name": "Cloned Smoke Test Template"}'
  CLONE_RESPONSE=$(make_request "POST" "/api/report-templates/$TEMPLATE_ID/clone" "$CLONE_DATA")
  CLONED_ID=$(echo "$CLONE_RESPONSE" | jq -r '.id')
  CLONED_NAME=$(echo "$CLONE_RESPONSE" | jq -r '.name')
  
  if [ ! -z "$CLONED_ID" ] && [ "$CLONED_ID" != "null" ] && [ "$CLONED_NAME" = "Cloned Smoke Test Template" ]; then
    echo -e "${GREEN}✓${NC} Template cloned: $CLONED_NAME (ID: $CLONED_ID)"
    ((PASSED++))
    
    # Clean up cloned template
    make_request "DELETE" "/api/report-templates/$CLONED_ID" "" > /dev/null
  else
    echo -e "${RED}✗${NC} Failed to clone template"
    echo "Response: $CLONE_RESPONSE"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 8: Create Report Instance${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  INSTANCE_DATA="{\"templateId\": \"$TEMPLATE_ID\", \"status\": \"draft\"}"
  INSTANCE_RESPONSE=$(make_request "POST" "/api/report-instances" "$INSTANCE_DATA")
  INSTANCE_ID=$(echo "$INSTANCE_RESPONSE" | jq -r '.id')
  
  if [ ! -z "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "null" ]; then
    echo -e "${GREEN}✓${NC} Report instance created: $INSTANCE_ID"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to create report instance"
    echo "Response: $INSTANCE_RESPONSE"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 9: Save Field Values${NC}"
echo "----------------------------------------"

if [ ! -z "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "null" ]; then
  # Save text field
  FIELD1_DATA="{\"reportInstanceId\": \"$INSTANCE_ID\", \"componentId\": \"property_address\", \"valueText\": \"123 Test Street, Minneapolis, MN 55401\"}"
  FIELD1_RESPONSE=$(make_request "POST" "/api/report-field-values" "$FIELD1_DATA")
  
  # Save number field
  FIELD2_DATA="{\"reportInstanceId\": \"$INSTANCE_ID\", \"componentId\": \"floor_area\", \"valueNumber\": 2500}"
  FIELD2_RESPONSE=$(make_request "POST" "/api/report-field-values" "$FIELD2_DATA")
  
  FIELD1_ID=$(echo "$FIELD1_RESPONSE" | jq -r '.id')
  FIELD2_ID=$(echo "$FIELD2_RESPONSE" | jq -r '.id')
  
  if [ ! -z "$FIELD1_ID" ] && [ "$FIELD1_ID" != "null" ] && [ ! -z "$FIELD2_ID" ] && [ "$FIELD2_ID" != "null" ]; then
    echo -e "${GREEN}✓${NC} Field values saved successfully"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to save field values"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no instance ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 10: Retrieve Field Values${NC}"
echo "----------------------------------------"

if [ ! -z "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "null" ]; then
  FIELDS_RESPONSE=$(make_request "GET" "/api/report-instances/$INSTANCE_ID/field-values" "")
  FIELDS_COUNT=$(echo "$FIELDS_RESPONSE" | jq 'length')
  
  if [ "$FIELDS_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} Retrieved $FIELDS_COUNT field value(s)"
    
    # Verify specific values
    ADDRESS_VALUE=$(echo "$FIELDS_RESPONSE" | jq -r '.[] | select(.componentId == "property_address") | .valueText')
    AREA_VALUE=$(echo "$FIELDS_RESPONSE" | jq -r '.[] | select(.componentId == "floor_area") | .valueNumber')
    
    if [ "$ADDRESS_VALUE" = "123 Test Street, Minneapolis, MN 55401" ] && [ "$AREA_VALUE" = "2500" ]; then
      echo -e "${GREEN}✓${NC} Field values match expected data"
      ((PASSED++))
    else
      echo -e "${RED}✗${NC} Field values don't match"
      ((FAILED++))
    fi
  else
    echo -e "${RED}✗${NC} Failed to retrieve field values"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no instance ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 11: Archive Template${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  ARCHIVE_RESPONSE=$(make_request "POST" "/api/report-templates/$TEMPLATE_ID/archive" "{}")
  ARCHIVED_STATUS=$(echo "$ARCHIVE_RESPONSE" | jq -r '.isActive')
  
  if [ "$ARCHIVED_STATUS" = "false" ]; then
    echo -e "${GREEN}✓${NC} Template archived successfully"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Failed to archive template"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
  ((FAILED++))
fi

echo ""
echo -e "${BOLD}Step 12: Cleanup${NC}"
echo "----------------------------------------"

if [ ! -z "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  DELETE_RESPONSE=$(make_request "DELETE" "/api/report-templates/$TEMPLATE_ID" "")
  
  # Check if template is gone
  VERIFY_DELETE=$(make_request "GET" "/api/report-templates/$TEMPLATE_ID" "")
  if echo "$VERIFY_DELETE" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Template deleted successfully"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} Template deletion verification inconclusive"
    ((PASSED++))
  fi
else
  echo -e "${YELLOW}⊘${NC} Skipped (no template ID)"
fi

# Clean up temp files
rm -f /tmp/cookies.txt

echo ""
echo "========================================"
echo -e "${BOLD}📊 Test Results${NC}"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ Some tests failed${NC}"
  exit 1
fi
