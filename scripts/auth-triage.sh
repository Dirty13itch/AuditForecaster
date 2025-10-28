#!/usr/bin/env bash
set -euo pipefail

printf "\n=== AUTH TRIAGE ===\n"

# Check environment variables
for v in REPL_ID SESSION_SECRET REPLIT_DOMAINS; do
  if [ -z "${!v:-}" ]; then 
    echo "❌ MISSING: $v"
  else 
    echo "✅ OK: $v"
  fi
done

# Get diagnostic endpoint
echo -e "\n[Diagnostics] /__auth/diag"
curl -fsS "http://localhost:5000/__auth/diag" | jq '.' || echo "⚠️  Diagnostic endpoint unavailable (set ENABLE_AUTH_DIAG=true)"

# Check server is running
echo -e "\n[Health Check]"
curl -fsS "http://localhost:5000/api/health" || echo "⚠️  Server not responding"
