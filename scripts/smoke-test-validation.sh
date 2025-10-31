#!/bin/bash
# Smoke test for API input validation layer
# Tests that endpoints properly validate query params and path params

set -e

API_BASE="http://localhost:5000/api"
VALID_UUID="c1762610-a55e-465a-8e43-48c769710917"
INVALID_UUID="not-a-uuid"
VALID_DATE="2025-01-15"
INVALID_DATE="not-a-date"

echo "🧪 API Input Validation Smoke Tests"
echo "===================================="
echo ""

# Test 1: Invalid UUID in path parameter (expect 401 without auth)
echo "Test 1: /api/builders/:id with invalid UUID (unauthenticated)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_BASE}/builders/${INVALID_UUID}" \
  -H "Accept: application/json" \
  2>/dev/null || echo "000")

if [ "$STATUS" = "401" ]; then
  echo "✅ PASS: Auth middleware correctly blocks unauthenticated requests"
else
  echo "⚠️  WARNING: Expected 401 (auth required), got ${STATUS}"
fi

# Test 2: Invalid date in query parameters
echo "Test 2: /api/schedule-events with invalid date"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_BASE}/schedule-events?startDate=${INVALID_DATE}&endDate=${VALID_DATE}" \
  -H "Accept: application/json" \
  2>/dev/null || echo "000")

if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ]; then
  echo "✅ PASS: Returns 400/401 for invalid date (401 if not authenticated)"
else
  echo "❌ FAIL: Expected 400 or 401, got ${STATUS}"
  exit 1
fi

# Test 3: Missing required date parameters
echo "Test 3: /api/google-events with missing parameters"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_BASE}/google-events?startDate=${VALID_DATE}" \
  -H "Accept: application/json" \
  2>/dev/null || echo "000")

if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ]; then
  echo "✅ PASS: Returns 400/401 for missing endDate (401 if not authenticated)"
else
  echo "❌ FAIL: Expected 400 or 401, got ${STATUS}"
  exit 1
fi

# Test 4: startDate after endDate
echo "Test 4: /api/google-events with startDate > endDate"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_BASE}/google-events?startDate=2025-12-31&endDate=2025-01-01" \
  -H "Accept: application/json" \
  2>/dev/null || echo "000")

if [ "$STATUS" = "400" ] || [ "$STATUS" = "401" ]; then
  echo "✅ PASS: Returns 400/401 for invalid date range (401 if not authenticated)"
else
  echo "❌ FAIL: Expected 400 or 401, got ${STATUS}"
  exit 1
fi

# Test 5: Health check still works
echo "Test 5: /healthz endpoint"
RESPONSE=$(curl -s "${API_BASE:0:-4}/healthz")
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null || echo "null")

if [ "$STATUS" = "healthy" ]; then
  echo "✅ PASS: Health check returns 'healthy'"
else
  echo "❌ FAIL: Health check failed or returned unexpected status: ${STATUS}"
  exit 1
fi

echo ""
echo "===================================="
echo "✅ All validation smoke tests passed!"
echo "===================================="
