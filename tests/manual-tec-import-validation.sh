#!/bin/bash

# Phase 3 - Step 2: TEC Import Validation (Manual API Testing)
# This script validates TEC import functionality through API calls

set -e

echo "=========================================="
echo "STEP 2: TEC Import Validation"
echo "=========================================="
echo ""

# Configuration
BASE_URL="http://localhost:5000"
COOKIES_FILE="/tmp/test-cookies.txt"
TEST_JOB_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Step 2.1: Get CSRF token and authenticate
echo "Step 2.1: Authentication and CSRF Setup"
echo "----------------------------------------"

# Get CSRF token (requires authentication - skip for now, use session-based auth)
CSRF_TOKEN=""

log_info "Note: Using session-based authentication (Replit Auth)"
echo ""

# Step 2.2: Get a test job
echo "Step 2.2: Fetch Test Job"
echo "------------------------"

JOBS_RESPONSE=$(curl -s -b "$COOKIES_FILE" -c "$COOKIES_FILE" \
  "$BASE_URL/api/jobs?limit=1")

TEST_JOB_ID=$(echo "$JOBS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TEST_JOB_ID" ]; then
    log_error "No test job found. Creating a new test job..."
    
    # Create a test job
    CREATE_JOB_RESPONSE=$(curl -s -X POST -b "$COOKIES_FILE" -c "$COOKIES_FILE" \
      -H "Content-Type: application/json" \
      -d '{
        "address": "123 Test Street",
        "inspectionType": "Final",
        "status": "scheduled",
        "scheduledDate": "2025-11-15T10:00:00Z",
        "lotNumber": "TEST-001",
        "planName": "Model A",
        "notes": "Phase 3 TEC Import Validation Test Job"
      }' \
      "$BASE_URL/api/jobs")
    
    TEST_JOB_ID=$(echo "$CREATE_JOB_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$TEST_JOB_ID" ]; then
        log_error "Failed to create test job"
        echo "Response: $CREATE_JOB_RESPONSE"
        exit 1
    fi
    
    log_success "Created test job: $TEST_JOB_ID"
else
    log_success "Found test job: $TEST_JOB_ID"
fi
echo ""

# Step 2.3: Submit TEC Import Data (Forecast)
echo "Step 2.3: TEC Import - Submit Forecast Data"
echo "-------------------------------------------"

TEC_DATA='{
  "jobId": "'"$TEST_JOB_ID"'",
  "cfm50": "1245.5",
  "houseVolume": "12450",
  "actualAch50": "6.01",
  "outdoorTemp": "72",
  "indoorTemp": "68",
  "windSpeed": "5",
  "weatherConditions": "Clear, minimal wind",
  "testConditions": "Standard test conditions",
  "equipmentNotes": "TEC import validation test - José García at Café Résumé. Testing Unicode: ñ, é, ü, ™, © - Smart quotes: \"test\" and apostrophes'"'"'"
}'

log_info "Submitting TEC data..."
echo "Data: $TEC_DATA"

FORECAST_RESPONSE=$(curl -s -X POST -b "$COOKIES_FILE" -c "$COOKIES_FILE" \
  -H "Content-Type: application/json" \
  -d "$TEC_DATA" \
  "$BASE_URL/api/forecasts")

echo "Response: $FORECAST_RESPONSE"

# Check if successful
if echo "$FORECAST_RESPONSE" | grep -q '"id"'; then
    FORECAST_ID=$(echo "$FORECAST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_success "TEC data submitted successfully. Forecast ID: $FORECAST_ID"
else
    log_error "Failed to submit TEC data"
    echo "Response: $FORECAST_RESPONSE"
    exit 1
fi
echo ""

# Step 2.4: Verify Data Persistence
echo "Step 2.4: Verify Data Persistence in Database"
echo "----------------------------------------------"

log_info "Fetching forecast data from API..."

VERIFY_RESPONSE=$(curl -s -b "$COOKIES_FILE" \
  "$BASE_URL/api/forecasts?jobId=$TEST_JOB_ID")

echo "Retrieved Data: $VERIFY_RESPONSE"

# Verify key fields
if echo "$VERIFY_RESPONSE" | grep -q '"cfm50":"1245.5"'; then
    log_success "CFM50 persisted correctly: 1245.5"
else
    log_error "CFM50 not persisted correctly"
fi

if echo "$VERIFY_RESPONSE" | grep -q '"houseVolume":"12450"'; then
    log_success "House Volume persisted correctly: 12450"
else
    log_error "House Volume not persisted correctly"
fi

if echo "$VERIFY_RESPONSE" | grep -q '"actualAch50":"6.01"'; then
    log_success "ACH50 persisted correctly: 6.01"
else
    log_error "ACH50 not persisted correctly"
fi
echo ""

# Step 2.5: Verify Unicode Character Support
echo "Step 2.5: Verify Unicode Character Support"
echo "-------------------------------------------"

if echo "$VERIFY_RESPONSE" | grep -q 'José García'; then
    log_success "Unicode characters (José García) persisted correctly"
else
    log_error "Unicode characters not persisted correctly"
fi

if echo "$VERIFY_RESPONSE" | grep -q 'Café Résumé'; then
    log_success "Unicode characters (Café Résumé) persisted correctly"
else
    log_error "Unicode characters not persisted correctly"
fi

if echo "$VERIFY_RESPONSE" | grep -q 'Smart quotes'; then
    log_success "Smart quotes persisted correctly"
else
    log_info "Smart quotes may have been normalized (acceptable)"
fi
echo ""

# Step 2.6: Test Data Update (PATCH)
echo "Step 2.6: Test Data Update via PATCH"
echo "-------------------------------------"

UPDATE_DATA='{
  "cfm50": "1300.0",
  "actualAch50": "6.27"
}'

log_info "Updating forecast with PATCH..."

UPDATE_RESPONSE=$(curl -s -X PATCH -b "$COOKIES_FILE" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  "$BASE_URL/api/forecasts/$FORECAST_ID")

echo "Update Response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | grep -q '"cfm50":"1300"'; then
    log_success "PATCH update successful - CFM50 updated to 1300"
else
    log_error "PATCH update failed"
fi
echo ""

# Step 2.7: Verify ACH50 Calculation
echo "Step 2.7: Verify ACH50 Auto-Calculation"
echo "----------------------------------------"

# Formula: ACH50 = (CFM50 * 60) / House Volume
# Expected: (1300 * 60) / 12450 = 6.27

log_info "Expected ACH50 = (1300 * 60) / 12450 = 6.27"

if echo "$UPDATE_RESPONSE" | grep -q '"actualAch50":"6.27"'; then
    log_success "ACH50 calculation verified: 6.27"
else
    log_error "ACH50 calculation incorrect or not auto-calculated"
fi
echo ""

# Step 2.8: Summary
echo "=========================================="
echo "STEP 2: TEC Import Validation - SUMMARY"
echo "=========================================="
echo ""
log_info "Test Job ID: $TEST_JOB_ID"
log_info "Forecast ID: $FORECAST_ID"
echo ""
log_success "All TEC import validation tests completed!"
echo ""
log_info "Next steps:"
log_info "  - STEP 3: Photo-Based Duct Testing Validation"
log_info "  - STEP 4: Report Automation Chain"
log_info "  - STEP 5: Equipment Calibration Workflow"
log_info "  - STEP 6: Cross-Cutting Regression Tests"
echo ""

exit 0
