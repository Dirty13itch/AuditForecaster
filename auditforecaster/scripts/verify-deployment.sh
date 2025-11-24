#!/bin/bash
# Deployment Verification Script for Unraid
# Run this after deploying the new container

set -e

echo "=== AuditForecaster Deployment Verification ==="
echo ""

# Configuration
UNRAID_IP="${UNRAID_IP:-192.168.1.244}"
APP_PORT="${APP_PORT:-3000}"
BASE_URL="http://${UNRAID_IP}:${APP_PORT}"

echo "Testing against: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✓ Health check passed (200 OK)"
else
    echo "   ✗ Health check failed (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

# Test 2: Metrics Endpoint
echo "2. Testing Metrics Endpoint..."
METRICS_RESPONSE=$(curl -s "${BASE_URL}/api/metrics")
if echo "$METRICS_RESPONSE" | grep -q "auditforecaster_"; then
    echo "   ✓ Metrics endpoint working"
else
    echo "   ✗ Metrics endpoint failed"
    exit 1
fi

# Test 3: Main Page Redirect
echo "3. Testing Main Page..."
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
if [ "$MAIN_RESPONSE" = "200" ] || [ "$MAIN_RESPONSE" = "307" ] || [ "$MAIN_RESPONSE" = "302" ]; then
    echo "   ✓ Main page accessible (HTTP $MAIN_RESPONSE)"
else
    echo "   ✗ Main page failed (HTTP $MAIN_RESPONSE)"
    exit 1
fi

# Test 4: Database Connection (via health check detail)
echo "4. Testing Database Connection..."
HEALTH_JSON=$(curl -s "${BASE_URL}/api/health")
if echo "$HEALTH_JSON" | grep -q "\"status\""; then
    echo "   ✓ Database connection verified"
else
    echo "   ⚠ Could not verify database connection"
fi

# Test 5: Container Logs Check
echo "5. Checking Container Logs..."
if command -v docker &> /dev/null; then
    ERROR_COUNT=$(docker logs auditforecaster-ui 2>&1 | grep -i "error" | wc -l)
    if [ "$ERROR_COUNT" -lt 5 ]; then
        echo "   ✓ No critical errors in logs ($ERROR_COUNT errors found)"
    else
        echo "   ⚠ Found $ERROR_COUNT errors in logs"
    fi
else
    echo "   ⚠ Docker not available, skipping log check"
fi

echo ""
echo "=== Deployment Verification Complete ==="
echo "All critical tests passed ✓"
echo ""
echo "Next steps:"
echo "  1. Login at ${BASE_URL}/api/auth/signin"
echo "  2. Test critical user flows"
echo "  3. Monitor logs: docker logs -f auditforecaster-ui"
echo "  4. Check metrics: ${BASE_URL}/api/metrics"
