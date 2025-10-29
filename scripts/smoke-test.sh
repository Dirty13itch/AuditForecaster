#!/bin/bash
set -e

# MileIQ Feature - Smoke Test
# Tests the complete vertical slice end-to-end

echo "🚀 Starting MileIQ Smoke Test..."

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
TIMEOUT=30

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1 - FAILED${NC}"
    exit 1
  fi
}

# Wait for server to be ready
echo "⏳ Waiting for server at $BASE_URL..."
for i in {1..30}; do
  if curl -f -s "$BASE_URL/healthz" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Server did not start in time${NC}"
    exit 1
  fi
  sleep 1
done

# Test 1: Health Check
echo ""
echo "📋 Test 1: Health Check"
curl -f -s "$BASE_URL/healthz" > /tmp/health.json
check "Health endpoint returns 200"

# Verify health response structure
if jq -e '.status == "healthy"' /tmp/health.json > /dev/null; then
  echo -e "${GREEN}✅ Health status is healthy${NC}"
else
  echo -e "${RED}❌ Health status check failed${NC}"
  exit 1
fi

# Test 2: Status Endpoint
echo ""
echo "📋 Test 2: Status Endpoint"
curl -f -s "$BASE_URL/api/status" > /tmp/status.json
check "Status endpoint returns 200"

# Verify status has version and commitSha
if jq -e '.version' /tmp/status.json > /dev/null && jq -e '.commitSha' /tmp/status.json > /dev/null; then
  VERSION=$(jq -r '.version' /tmp/status.json)
  COMMIT=$(jq -r '.commitSha' /tmp/status.json)
  echo -e "${GREEN}✅ Version: $VERSION, Commit: $COMMIT${NC}"
else
  echo -e "${RED}❌ Status missing version or commitSha${NC}"
  exit 1
fi

# Test 3: Dev Login (for local testing)
echo ""
echo "📋 Test 3: Authentication"
curl -s -c /tmp/cookies.txt "$BASE_URL/api/dev-login/test-admin" > /dev/null
check "Dev login successful"

# Test 4: Unclassified Drives
echo ""
echo "📋 Test 4: GET /api/mileage/unclassified"
curl -f -s -b /tmp/cookies.txt "$BASE_URL/api/mileage/unclassified" > /tmp/unclassified.json
check "Unclassified drives endpoint accessible"

# Verify response structure
if jq -e '.drives' /tmp/unclassified.json > /dev/null; then
  DRIVE_COUNT=$(jq '.drives | length' /tmp/unclassified.json)
  echo -e "${GREEN}✅ Response has drives array ($DRIVE_COUNT drives)${NC}"
else
  echo -e "${RED}❌ Response missing drives array${NC}"
  exit 1
fi

# Test 5: Monthly Summary
echo ""
echo "📋 Test 5: GET /api/mileage/summary"
CURRENT_MONTH=$(date +%Y-%m)
curl -f -s -b /tmp/cookies.txt "$BASE_URL/api/mileage/summary?month=$CURRENT_MONTH" > /tmp/summary.json
check "Monthly summary endpoint accessible"

# Verify summary structure
if jq -e '.irsRate == 0.7' /tmp/summary.json > /dev/null; then
  echo -e "${GREEN}✅ IRS rate is correct ($0.70/mile)${NC}"
else
  echo -e "${RED}❌ IRS rate check failed${NC}"
  exit 1
fi

if jq -e '.totalDrives' /tmp/summary.json > /dev/null; then
  TOTAL=$(jq '.totalDrives' /tmp/summary.json)
  BUSINESS=$(jq '.businessDrives' /tmp/summary.json)
  PERSONAL=$(jq '.personalDrives' /tmp/summary.json)
  TAX=$(jq '.taxDeduction' /tmp/summary.json)
  echo -e "${GREEN}✅ Summary: $TOTAL total, $BUSINESS business, $PERSONAL personal, \$$TAX deduction${NC}"
else
  echo -e "${RED}❌ Summary structure invalid${NC}"
  exit 1
fi

# Test 6: CSV Export
echo ""
echo "📋 Test 6: GET /api/mileage/export"
curl -f -s -b /tmp/cookies.txt "$BASE_URL/api/mileage/export?month=$CURRENT_MONTH&format=csv" > /tmp/export.csv
check "CSV export endpoint accessible"

# Verify CSV has header
if head -1 /tmp/export.csv | grep -q "Date"; then
  echo -e "${GREEN}✅ CSV has proper header${NC}"
else
  echo -e "${RED}❌ CSV header missing${NC}"
  exit 1
fi

# Test 7: Classification (if drives exist)
echo ""
echo "📋 Test 7: PUT /api/mileage/:id/classify"
DRIVE_ID=$(jq -r '.drives[0].id // empty' /tmp/unclassified.json)
if [ -n "$DRIVE_ID" ]; then
  curl -f -s -X PUT -b /tmp/cookies.txt \
    -H "Content-Type: application/json" \
    -d '{"purpose":"business"}' \
    "$BASE_URL/api/mileage/$DRIVE_ID/classify" > /tmp/classify.json
  check "Classification endpoint works"
  
  if jq -e '.vehicleState == "classified"' /tmp/classify.json > /dev/null; then
    echo -e "${GREEN}✅ Drive successfully classified${NC}"
  else
    echo -e "${RED}❌ Classification state not updated${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}⏭️  Skipped (no unclassified drives)${NC}"
fi

# Cleanup
rm -f /tmp/health.json /tmp/status.json /tmp/cookies.txt /tmp/unclassified.json /tmp/summary.json /tmp/export.csv /tmp/classify.json

# Final summary
echo ""
echo "════════════════════════════════════════════════"
echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
echo "════════════════════════════════════════════════"
echo "MileIQ vertical slice is production-ready!"
echo ""
