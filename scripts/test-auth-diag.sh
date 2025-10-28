#!/bin/bash
# Test script for /__auth/diag endpoint
# This script verifies the diagnostic endpoint works and doesn't expose secrets

echo "=================================="
echo "Auth Diagnostic Endpoint Test"
echo "=================================="
echo ""

# Test without ENABLE_AUTH_DIAG (should not exist)
echo "1. Testing without ENABLE_AUTH_DIAG=true (endpoint should not exist)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/__auth/diag)
if [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "000" ]; then
  echo "   ✓ Endpoint correctly disabled when feature flag is not set"
else
  echo "   ✗ WARNING: Endpoint exists without feature flag (status: $RESPONSE)"
fi
echo ""

# Set feature flag and test endpoint
echo "2. Testing with ENABLE_AUTH_DIAG=true..."
echo "   Note: You need to restart server with ENABLE_AUTH_DIAG=true in environment"
echo ""

# Test endpoint response
echo "3. Testing endpoint response structure..."
RESPONSE=$(curl -s http://localhost:5000/__auth/diag 2>/dev/null)

if [ -z "$RESPONSE" ]; then
  echo "   ⚠️  No response - make sure ENABLE_AUTH_DIAG=true and server is running"
else
  echo "   ✓ Endpoint returned response"
  
  # Check for secrets (should NOT be present)
  echo ""
  echo "4. Security check - verifying no secrets are exposed..."
  
  SECRETS_FOUND=0
  
  if echo "$RESPONSE" | grep -q "SESSION_SECRET"; then
    echo "   ✗ CRITICAL: SESSION_SECRET exposed in response!"
    SECRETS_FOUND=1
  fi
  
  if echo "$RESPONSE" | grep -q "DATABASE_URL.*postgres://.*:.*@"; then
    echo "   ✗ CRITICAL: Full DATABASE_URL with credentials exposed!"
    SECRETS_FOUND=1
  fi
  
  # Check for full REPL_ID (should be truncated)
  FULL_REPL_ID_PATTERN='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  if echo "$RESPONSE" | grep -E "\"replId\".*$FULL_REPL_ID_PATTERN" | grep -v "replIdPrefix"; then
    echo "   ⚠️  Full REPL_ID may be exposed (should be truncated)"
  fi
  
  if [ $SECRETS_FOUND -eq 0 ]; then
    echo "   ✓ No critical secrets found in response"
  fi
  
  # Check that useful diagnostic info IS present
  echo ""
  echo "5. Checking for expected diagnostic information..."
  
  if echo "$RESPONSE" | grep -q "\"hostname\""; then
    echo "   ✓ Request hostname present"
  fi
  
  if echo "$RESPONSE" | grep -q "\"forwardedProto\""; then
    echo "   ✓ Forwarded headers present"
  fi
  
  if echo "$RESPONSE" | grep -q "\"cookieSettings\""; then
    echo "   ✓ Cookie settings present"
  fi
  
  if echo "$RESPONSE" | grep -q "\"domains\""; then
    echo "   ✓ Configured domains present"
  fi
  
  # Pretty print the response
  echo ""
  echo "6. Full diagnostic response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo "=================================="
echo "Test Complete"
echo "=================================="
