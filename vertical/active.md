# Auth Doctor: Fix OAuth Login in Preview Deploys

## Current Status
Phase 1: Inventory & Diagnostic Setup - IN PROGRESS

## Inventory Summary

### Authentication Framework
- **Framework**: Express + Passport + openid-client
- **OIDC Provider**: Replit Auth (https://replit.com/oidc)
- **Session Store**: PostgreSQL (with in-memory fallback in dev)
- **Session TTL**: 7 days (1 week)

### Endpoints
- **Login**: Handled by Passport strategies (per-domain)
- **Callback**: `GET /api/callback` (registered per domain)
- **Logout**: `POST /api/logout`
- **Auth User**: `GET /api/auth/user`
- **Session Health**: `GET /api/auth/session-health`
- **Dev Login**: `GET /api/dev-login/:userId` (dev only)

### Redirect URI Configuration
**ISSUE IDENTIFIED**: Redirect URIs are **hard-coded at server startup** based on `REPLIT_DOMAINS` env var:
```typescript
const redirectUri = `https://${trimmedDomain}/api/callback`;
```
- Strategies registered per domain from `REPLIT_DOMAINS`
- One strategy per domain: `replitauth:${domain}`
- Redirect URI pattern: `https://${domain}/api/callback`
- **PROBLEM**: Preview deploys get new domains not in REPLIT_DOMAINS

### Session Configuration
```typescript
cookie: {
  httpOnly: true,      // ✓ Good
  secure: true,        // ✓ Good (requires HTTPS)
  sameSite: 'lax',     // ✓ Good (prevents CSRF)
  maxAge: 604800000    // 7 days
}
```

### Proxy Trust Configuration
```typescript
app.set("trust proxy", 1);  // Trust first proxy
```
- **Setting**: Trust first proxy (value = 1)
- **Impact**: Should work with Replit's reverse proxy
- **To Verify**: Check X-Forwarded-* headers in diagnostics

### CORS Configuration
- **STATUS**: No explicit CORS configuration found
- **ISSUE**: May block preview deploy requests
- **TODO**: Add CORS for preview deploy domains

### Environment Variables
- `REPLIT_DOMAINS`: Comma-separated list of allowed domains
- `REPL_ID`: OAuth client ID
- `SESSION_SECRET`: Session signing secret
- `ISSUER_URL`: OIDC issuer (defaults to https://replit.com/oidc)
- `DATABASE_URL`: PostgreSQL connection string
- `ENABLE_AUTH_DIAG`: Feature flag for diagnostic endpoint (new)

## Checklist
- [x] Inventory complete
- [x] Diagnostic endpoint added (/__auth/diag) - feature-flagged with ENABLE_AUTH_DIAG
- [x] Enhanced error logging with reason codes added
- [ ] Auth triage script created
- [ ] Proxy trust verified (requires testing with ENABLE_AUTH_DIAG=true)
- [ ] Dynamic redirect URI implemented
- [ ] Cookie settings hardened
- [ ] OAuth/OIDC flow validated
- [ ] CORS configured
- [ ] Integration tests passing
- [ ] Preview deploy verified
- [ ] Documentation updated

## Key Findings

### 🔴 Critical Issues
1. **Hard-coded Redirect URIs**: Strategies registered at startup with static domains
   - Prevents preview deploys from working
   - Solution: Implement dynamic redirect URI construction

2. **Missing CORS**: No CORS headers configured
   - May block cross-origin requests from preview deploys
   - Solution: Add CORS middleware with dynamic origin validation

### ⚠️ Warnings
1. **Session Cookie Security**: `secure: true` requires HTTPS
   - Works in production
   - May need adjustment for local development

2. **Proxy Trust**: Set to `1` (trust first proxy)
   - Should work with Replit
   - Verify with diagnostic endpoint

### ✅ Working Correctly
1. Session store using PostgreSQL (persistent)
2. httpOnly and sameSite cookie settings (secure)
3. Comprehensive session validation and recovery system
4. Dev mode authentication bypass for testing

## Diagnostic Tools Implemented

### 1. Diagnostic Endpoint: `/__auth/diag`
**Location**: `server/auth.ts` (lines 570-648)
**Feature Flag**: `ENABLE_AUTH_DIAG=true`

**How to Enable:**
```bash
# Add to Replit Secrets or .env
ENABLE_AUTH_DIAG=true

# Restart the server
```

**Response Structure:**
```json
{
  "request": {
    "secure": boolean,
    "protocol": "http/https",
    "hostname": "current-domain.replit.dev",
    "origin": "origin-header-value",
    "forwardedProto": "x-forwarded-proto header",
    "forwardedHost": "x-forwarded-host header",
    "forwardedFor": "x-forwarded-for header",
    "cookiesPresent": ["array", "of", "cookie", "names"],
    "userAgent": "user agent string",
    "path": "/__auth/diag",
    "method": "GET"
  },
  "environment": {
    "nodeEnv": "development/production",
    "hasSessionSecret": true/false,
    "hasReplId": true/false,
    "hasDatabaseUrl": true/false,
    "issuerUrl": "https://replit.com/oidc",
    "domains": ["configured", "domains"],
    "serverTime": "ISO timestamp",
    "replIdPrefix": "12345678..." (truncated for security)
  },
  "config": {
    "trustProxy": 1,
    "corsOrigins": [],
    "cookieSettings": {
      "httpOnly": true,
      "secure": true,
      "sameSite": "lax"
    },
    "sessionStore": "postgresql/in-memory"
  },
  "session": {
    "exists": true/false,
    "authenticated": true/false,
    "userId": "user-id or 'not authenticated'",
    "userEmail": "user@email or 'not authenticated'",
    "sessionId": "12345678..." (truncated)
  },
  "timestamp": "ISO timestamp",
  "version": "1.0.0"
}
```

**Security Notes:**
- ✅ SESSION_SECRET is NEVER exposed (only boolean hasSessionSecret)
- ✅ DATABASE_URL is NEVER exposed (only boolean hasDatabaseUrl)
- ✅ REPL_ID is truncated (only first 8 chars + "...")
- ✅ Session IDs are truncated for security
- ✅ No token values are exposed

**Testing:**
```bash
# Test the endpoint
curl http://localhost:5000/__auth/diag | jq .

# Or use the test script
bash scripts/test-auth-diag.sh
```

### 2. Enhanced Error Logging with Reason Codes
**Location**: `server/auth.ts` (lines 672-781)

**Reason Codes Implemented:**
- `invalid_token_response`: No claims in OIDC token response
- `missing_subject_claim`: Missing 'sub' claim in token
- `session_validation_failed`: Session data failed validation
- `redirect_uri_mismatch`: Redirect URI doesn't match registered URIs
- `state_missing`: OAuth state parameter missing
- `pkce_missing`: PKCE code_verifier missing
- `cookie_blocked`: Session cookies are blocked
- `csrf_blocked`: CSRF token validation failed
- `invalid_scope`: OAuth scope is invalid
- `database_error`: Database operation failed
- `unknown_auth_error`: Unclassified authentication error

**Log Format:**
```javascript
serverLogger.error('[Auth] {reasonCode}: {description}', {
  reasonCode: 'redirect_uri_mismatch',
  errorMessage: 'truncated to 200 chars',
  errorType: 'Error class name',
  // Additional context without secrets
});
```

**Benefits:**
- Quick identification of auth failure root cause
- Structured logs for debugging preview deploy issues
- Safe logging (no secrets ever exposed)
- Contextual information for troubleshooting

### 3. Test Scripts
**Location**: `scripts/test-auth-diag.sh`

**Usage:**
```bash
chmod +x scripts/test-auth-diag.sh
bash scripts/test-auth-diag.sh
```

**Tests Performed:**
1. Verifies endpoint is disabled without feature flag
2. Tests endpoint response structure
3. Security audit (checks for exposed secrets)
4. Validates diagnostic information is present
5. Pretty-prints full response

## Next Steps (Phase 2)
1. ✅ Test diagnostic endpoint with ENABLE_AUTH_DIAG=true
2. Verify proxy headers are being forwarded correctly (use diagnostic endpoint)
3. Create auth triage script for troubleshooting
4. Implement dynamic redirect URI construction
5. Add CORS configuration for preview deploys

## Notes
- Auth system has robust session validation and recovery
- Critical admin users protected with special handling
- Dev mode provides instant login for testing
- Extensive logging in place for debugging
- Diagnostic endpoint is feature-flagged for production safety
- All error logging includes reason codes for quick troubleshooting
