# Authentication System Documentation

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Configuration Guide](#configuration-guide)
3. [Domain Management](#domain-management)
4. [Troubleshooting Common Issues](#troubleshooting-common-issues)
5. [Monitoring and Metrics](#monitoring-and-metrics)
6. [Development Mode](#development-mode)
7. [Circuit Breaker](#circuit-breaker)
8. [Security Considerations](#security-considerations)
9. [API Reference](#api-reference)

---

## System Architecture Overview

The application uses **Replit Authentication** (OpenID Connect) for user authentication and session management.

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  User clicks     │
                    │  "Login"         │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  GET /api/login  │
                    │  (Route Handler) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Passport.js     │
                    │  Strategy        │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  OIDC Discovery  │      │  Domain Matching │
    │  (Circuit Break) │      │  Validation      │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             └────────────┬────────────┘
                          ▼
                 ┌──────────────────┐
                 │  Redirect to     │
                 │  Replit OAuth    │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  User Authorizes │
                 │  on Replit       │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Callback to     │
                 │  /api/auth/      │
                 │  callback        │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Token Exchange  │
                 │  User Claims     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Upsert User     │
                 │  to Database     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Create Session  │
                 │  Set Cookies     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  Redirect to     │
                 │  Application     │
                 └──────────────────┘
```

### Core Files

- **`server/replitAuth.ts`**: Main authentication setup, OIDC configuration, session management
- **`server/auth/validation.ts`**: Environment and configuration validation
- **`server/auth/monitoring.ts`**: Authentication metrics and event tracking
- **`server/auth/circuitBreaker.ts`**: Circuit breaker for OIDC discovery
- **`server/auth/devMode.ts`**: Development mode authentication bypass
- **`server/auth/troubleshooting.ts`**: Troubleshooting guides and error documentation

### Session Management

Sessions are stored in one of two ways:

1. **PostgreSQL (Production)**: Persistent sessions survive application restarts
2. **In-Memory (Development)**: Fast but sessions are lost on restart

Session cookies are:
- **HTTP-Only**: Cannot be accessed via JavaScript (XSS protection)
- **Secure**: Only sent over HTTPS
- **SameSite: Lax**: Allows OAuth redirects while preventing CSRF
- **TTL**: 7 days by default

---

## Configuration Guide

### Required Environment Variables

All sensitive configuration should be stored in **Replit Secrets** (Tools → Secrets):

#### `REPLIT_DOMAINS` (Required)
**Purpose**: List of domains authorized for authentication

**Format**: Comma-separated domain names (no http:// or https://)

**Examples**:
```
Single domain:
your-repl.username.repl.co

Multiple domains:
my-app.user.repl.co,my-app-staging.user.repl.co,localhost

Custom domains:
myapp.com,www.myapp.com
```

**Important Notes**:
- Domain matching is exact OR subdomain matching
- `api.example.com` will match `example.com` (subdomain)
- `example.com` will NOT match `api.example.com` (parent)
- `localhost` is supported for local development

#### `SESSION_SECRET` (Required)
**Purpose**: Cryptographic key for signing session cookies

**Generation**:
```bash
openssl rand -base64 32
```

**Requirements**:
- At least 32 characters
- Cryptographically random
- Never commit to source control

**Example**:
```
x7K9mP3nQ8wY2fL5vB6tR4jN1hZ0sA9c
```

#### `REPL_ID` (Auto-generated)
**Purpose**: Unique identifier for your Repl

**Notes**:
- Automatically set by Replit platform
- UUID format: `12345678-1234-1234-1234-123456789abc`
- Used as OAuth client_id for OIDC
- Do NOT manually override unless necessary

#### `DATABASE_URL` (Optional, Recommended for Production)
**Purpose**: PostgreSQL connection string for persistent sessions

**Format**:
```
postgresql://user:password@host:port/database
```

**Notes**:
- Automatically set when creating a Replit PostgreSQL database
- If not set, application uses in-memory session store
- In-memory sessions are lost on application restart

#### `ISSUER_URL` (Optional)
**Purpose**: OpenID Connect issuer URL

**Default**: `https://replit.com/oidc`

**When to Override**:
- Using a custom OIDC provider
- Testing with a different authentication service
- Working with Replit staging environment

#### `NODE_ENV` (Auto-generated)
**Purpose**: Environment mode

**Values**:
- `development`: Local development
- `production`: Deployed application

**Notes**:
- Automatically set by Replit
- Affects session store selection and dev mode availability

---

## Domain Management

### How Domain Matching Works

When a user attempts to log in, the system:

1. Extracts the hostname from the request (e.g., `my-app.user.repl.co`)
2. Checks if hostname exactly matches any registered domain
3. If no exact match, checks if hostname ends with any registered domain (subdomain match)
4. If `localhost` and domains are registered, allows as fallback
5. Creates a Passport strategy for the matched domain

### Adding a New Domain

1. **Get Your Repl URL**:
   - Published Repl: `your-repl.username.repl.co`
   - Custom domain: `yourdomain.com`

2. **Add to REPLIT_DOMAINS**:
   ```
   Tools → Secrets → Edit REPLIT_DOMAINS
   
   Existing: old-domain.repl.co
   Updated: old-domain.repl.co,new-domain.repl.co
   ```

3. **Restart Application**:
   - Stop and start your Repl
   - Or kill the server process

4. **Verify Domain Registration**:
   ```bash
   curl https://your-repl.repl.co/api/health
   ```
   
   Check the response:
   ```json
   {
     "components": {
       "domains": {
         "registered": ["old-domain.repl.co", "new-domain.repl.co"],
         "status": "valid"
       }
     }
   }
   ```

### Testing Domain Recognition (Admin Only)

Use the domain testing endpoint to verify a domain would be recognized:

```bash
curl -X POST https://your-repl.repl.co/api/auth/test-domain \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"domain": "test.repl.co"}'
```

Response:
```json
{
  "domain": "test.repl.co",
  "recognized": true,
  "strategy": "replitauth:test.repl.co",
  "matchType": "exact",
  "matchedDomain": "test.repl.co",
  "registeredDomains": ["test.repl.co", "prod.repl.co"],
  "explanation": "Exact match found"
}
```

---

## Troubleshooting Common Issues

### Quick Diagnostics

1. **Check Health Status**:
   ```bash
   curl https://your-repl.repl.co/api/health
   ```

2. **View All Troubleshooting Guides**:
   ```bash
   curl https://your-repl.repl.co/api/auth/troubleshooting
   ```

3. **Get Specific Guide**:
   ```bash
   curl https://your-repl.repl.co/api/auth/troubleshooting/DOMAIN_NOT_REGISTERED
   ```

### Common Error Codes

| Error Code | Severity | Quick Fix |
|-----------|----------|-----------|
| `DOMAIN_NOT_REGISTERED` | Critical | Add domain to REPLIT_DOMAINS |
| `OIDC_DISCOVERY_FAILURE` | Critical | Check internet connection, verify ISSUER_URL |
| `TOKEN_REFRESH_FAILURE` | High | User needs to re-login |
| `SESSION_EXPIRED` | Medium | User needs to re-login |
| `COOKIE_ISSUES` | Medium | Check browser settings, ensure HTTPS |
| `DATABASE_CONNECTIVITY` | High | Verify DATABASE_URL, create database |
| `INVALID_REPL_ID` | Critical | Contact Replit support |
| `MISSING_ENV_VARS` | Critical | Set required secrets |
| `CIRCUIT_BREAKER_OPEN` | High | Wait 30 seconds, check network |
| `CALLBACK_FAILURE` | High | Check cookies, verify session |

### Interactive Troubleshooting

The application includes an interactive troubleshooting panel on error pages:

- **Symptoms**: What the user sees
- **Common Causes**: Why it might be happening
- **Step-by-Step Fixes**: Actionable instructions with checkboxes
- **Related Diagnostics**: Links to diagnostic endpoints
- **Severity & Category**: Visual indicators

---

## Monitoring and Metrics

### Health Check Endpoint

**Endpoint**: `GET /api/health`

**Public Access**: Yes (no authentication required)

**Response Structure**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "components": {
    "oidc": {
      "status": "working",
      "message": "OIDC discovery successful"
    },
    "database": {
      "status": "connected",
      "message": "Database connected and sessions table exists"
    },
    "sessionStore": {
      "status": "postgresql",
      "message": "Using PostgreSQL session store"
    },
    "domains": {
      "registered": ["my-app.repl.co"],
      "status": "valid"
    },
    "currentDomain": {
      "hostname": "my-app.repl.co",
      "status": "recognized"
    }
  }
}
```

### Diagnostics Endpoint (Admin Only)

**Endpoint**: `GET /api/auth/diagnostics`

**Authentication**: Required (admin role only)

**Provides**:
- Full validation report
- OIDC configuration details
- Registered strategies
- Domain mapping tests
- Session store statistics
- Recent authentication errors
- Environment variables (masked)

### Metrics Endpoint (Admin Only)

**Endpoint**: `GET /api/auth/metrics`

**Authentication**: Required (admin role only)

**Response Structure**:
```json
{
  "totalAttempts": 150,
  "totalSuccesses": 145,
  "totalFailures": 5,
  "successRate": 96.67,
  "failureRate": 3.33,
  "averageLatency": {
    "login": 245,
    "callback": 180,
    "refresh": 120
  },
  "recentEvents": [...],
  "errorBreakdown": {
    "Session expired": 3,
    "OIDC discovery timeout": 2
  },
  "lastHourStats": {
    "attempts": 25,
    "successes": 24,
    "failures": 1
  }
}
```

### Monitoring Events

The system tracks the following authentication events:

- `login_attempt`: User initiates login
- `login_success`: Login completed successfully
- `login_failure`: Login failed
- `callback_attempt`: OAuth callback received
- `callback_success`: Callback processed successfully
- `callback_failure`: Callback processing failed
- `token_refresh_attempt`: Attempting to refresh access token
- `token_refresh_success`: Token refresh successful
- `token_refresh_failure`: Token refresh failed
- `logout`: User logged out

All events include:
- Correlation ID for request tracing
- User ID (if available)
- Domain
- Error message (if applicable)
- Latency (if applicable)

---

## Development Mode

### Overview

Development mode allows bypassing OAuth for faster development iteration.

**⚠️ WARNING**: Only available in `NODE_ENV=development`

### Enabling Dev Mode

Dev mode is automatically enabled when:
1. `NODE_ENV=development`
2. No additional configuration needed

### Using Dev Mode

**Check Status**:
```bash
curl http://localhost:5000/api/dev/status
```

Response:
```json
{
  "enabled": true,
  "environment": "development",
  "message": "Dev mode is enabled. Use /api/dev/login-as?userId=USER_ID"
}
```

**Login as Any User**:
```bash
curl http://localhost:5000/api/dev/login-as?userId=123456789
```

This will:
1. Create or retrieve the user with ID `123456789`
2. Create a session for that user
3. Set session cookie
4. Redirect to application

**Optional Parameters**:
- `userId`: User ID to login as (required)
- `email`: Override email
- `firstName`: Override first name
- `lastName`: Override last name
- `role`: Override role (admin, auditor, field_tech, contractor)

**Example**:
```bash
http://localhost:5000/api/dev/login-as?userId=admin-123&role=admin&email=admin@test.com
```

### Production Behavior

In production (`NODE_ENV=production`):
- Dev mode endpoints return 403 Forbidden
- Dev mode status shows `enabled: false`
- All authentication must go through proper OAuth flow

---

## Circuit Breaker

### Purpose

The circuit breaker protects the application from cascading failures when the OIDC provider is unavailable.

### States

#### CLOSED (Normal Operation)
- All requests pass through to OIDC provider
- Failures are counted
- Threshold: 5 failures in 60 seconds

#### OPEN (Protection Mode)
- Requests do NOT reach OIDC provider
- Cached OIDC configuration is used
- Prevents overwhelming a struggling service
- Duration: 30 seconds

#### HALF_OPEN (Testing Recovery)
- After cooldown period, allows limited test requests
- If successful: Circuit closes, normal operation resumes
- If fails: Circuit reopens, cooldown restarts
- Max test attempts: 3

### Configuration

Default settings (in `server/auth/circuitBreaker.ts`):

```typescript
{
  failureThreshold: 5,        // Failures before opening
  failureWindowMs: 60000,     // 60 seconds
  cooldownPeriodMs: 30000,    // 30 seconds
  halfOpenMaxAttempts: 3      // Test attempts
}
```

### Monitoring Circuit Breaker

Check health endpoint for circuit breaker state:

```bash
curl http://your-repl.repl.co/api/health
```

If circuit is open, you'll see warnings in the logs:
```
[CircuitBreaker] Circuit is OPEN, using cached result or fallback
```

### Manual Reset

Circuit breaker automatically resets after successful requests. No manual intervention required.

---

## Security Considerations

### Session Security

1. **HTTP-Only Cookies**: Prevents XSS attacks from stealing sessions
2. **Secure Flag**: Ensures cookies only sent over HTTPS
3. **SameSite: Lax**: Protects against CSRF while allowing OAuth
4. **Session Expiration**: 7-day TTL, auto-refresh on activity

### CSRF Protection

- CSRF tokens are implemented using `csrf-sync`
- Token must be included in state-changing requests (POST, PUT, DELETE)
- Token endpoint: `GET /api/csrf-token` (authenticated)

### Password Hashing

This application uses OAuth (no passwords stored). For local auth implementations:
- Use bcrypt with minimum 12 rounds
- Never store plaintext passwords
- Never log passwords

### Rate Limiting

Consider implementing rate limiting on:
- `/api/login` endpoint (prevent brute force)
- `/api/auth/callback` (prevent abuse)
- All public endpoints

Example (using `express-rate-limit`):
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts'
});

app.get('/api/login', loginLimiter, ...);
```

### Secret Management

- **Never commit secrets to git**
- Use Replit Secrets for all sensitive data
- Rotate `SESSION_SECRET` periodically
- Use environment-specific secrets (dev vs prod)

### Logging Best Practices

- **Never log**: Passwords, tokens, full session IDs
- **Always log**: Correlation IDs, timestamps, IP addresses (hashed)
- **Conditionally log**: User IDs (with user consent)

### Audit Trail

Authentication events are logged with:
- Correlation ID for tracing
- Timestamp
- Event type
- Success/failure status
- Error details (if applicable)

---

## API Reference

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/healthz` | Basic health check |
| `GET` | `/readyz` | Readiness check |
| `GET` | `/api/status` | API status |
| `GET` | `/api/health` | Comprehensive health check |
| `GET` | `/api/login` | Initiate login flow |
| `GET` | `/api/logout` | Logout and clear session |
| `GET` | `/api/auth/callback` | OAuth callback handler |
| `GET` | `/api/auth/troubleshooting` | Get all troubleshooting guides |
| `GET` | `/api/auth/troubleshooting/:code` | Get specific guide |

### Protected Endpoints (Authentication Required)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/csrf-token` | Any | Get CSRF token |
| `GET` | `/api/auth/user` | Any | Get current user |
| `GET` | `/api/auth/diagnostics` | Admin | Full diagnostics |
| `GET` | `/api/auth/metrics` | Admin | Authentication metrics |
| `POST` | `/api/auth/test-domain` | Admin | Test domain recognition |

### Development Endpoints (Dev Mode Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dev/status` | Check dev mode status |
| `GET` | `/api/dev/login-as` | Login as specific user |

---

## Validation and Startup

### Startup Validation

On application startup, the system validates:

1. **Environment Variables**: Required secrets present
2. **REPL_ID**: Valid UUID format
3. **SESSION_SECRET**: Sufficient length and security
4. **Registered Domains**: Valid format, not empty
5. **Database Connectivity**: (if DATABASE_URL set)
6. **OIDC Discovery**: Can reach authentication provider

### Handling Validation Failures

**Critical Failures** (application will not start):
- Missing REPL_ID
- Missing SESSION_SECRET
- Missing REPLIT_DOMAINS
- Invalid domain format
- OIDC discovery failed (no cache)

**Warnings** (application starts with degraded functionality):
- Database not connected (uses in-memory sessions)
- SESSION_SECRET too short
- Circuit breaker using cached OIDC config

### Emergency Bypass

To bypass validation in emergencies:

```bash
SKIP_AUTH_VALIDATION=true npm run dev
```

**⚠️ WARNING**: Only use in development for debugging!

---

## Additional Resources

### External Documentation

- [Replit Auth Documentation](https://docs.replit.com/hosting/authenticating-users)
- [OpenID Connect Specification](https://openid.net/connect/)
- [Passport.js Documentation](http://www.passportjs.org/)

### Internal Files

- `server/replitAuth.ts` - Main authentication implementation
- `server/auth/validation.ts` - Configuration validation
- `server/auth/troubleshooting.ts` - Troubleshooting guides
- `server/auth/monitoring.ts` - Metrics and events
- `server/auth/circuitBreaker.ts` - Circuit breaker logic
- `tests/auth.integration.test.ts` - Integration tests

### Support

For authentication issues:
1. Check `/api/health` endpoint
2. Review troubleshooting guides at `/api/auth/troubleshooting`
3. Check application logs for correlation IDs
4. Contact Replit support with correlation ID and error details

---

## Changelog

### Version 1.0.0 (October 2025)

Initial authentication system with:
- Replit OAuth integration
- Multi-domain support
- Circuit breaker protection
- Comprehensive troubleshooting system
- Health monitoring and metrics
- Development mode
- Integration test suite
- Complete documentation
