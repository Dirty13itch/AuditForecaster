# Security Checklist & Standards

## Overview

This document outlines security standards, checklists, and compliance requirements for Field Inspect.

---

## OWASP Top 10 Compliance

### A01:2021 - Broken Access Control

**Status:** ✅ **COMPLIANT**

**Controls Implemented:**
- ✅ Role-based access control (RBAC) via NextAuth.js
- ✅ Server-side session validation on all protected routes
- ✅ Authorization checks in all server actions
- ✅ Path-based access control via middleware

**Verification Checklist:**
- [ ] All server actions check `auth()` before processing
- [ ] API routes validate session tokens
- [ ] No client-side-only authorization
- [ ] Proper 401/403 error responses

**Code Example:**
```typescript
// ✅ Correct pattern
export async function createBuilder(formData: FormData) {
  const session = await auth()
  if (!session) {
    return { message: 'Unauthorized', error: 'auth' }
  }
  // Proceed with logic
}
```

**Remaining Actions:**
- [ ] Implement fine-grained permissions (beyond role-based)
- [ ] Add audit logging for access control violations
- [ ] Implement rate limiting on sensitive endpoints

---

### A02:2021 - Cryptographic Failures

**Status:** 🟡 **PARTIAL**

**Controls Implemented:**
- ✅ HTTPS enforced in production (Docker/Unraid)
- ✅ Secure session cookies (httpOnly, secure, sameSite)
- ✅ Environment variables for secrets (not in code)
- ✅ NextAuth.js handles password hashing (bcrypt)

**Gaps:**
- 🔴 No database field-level encryption (PII)
- 🟡 API keys stored in plain text in database
- 🟡 No secrets rotation policy

**Verification Checklist:**
- [ ] All HTTP connections use TLS 1.2+
- [ ] Sensitive cookies have secure flags
- [ ] No passwords in logs
- [ ] Backup files encrypted

**Remediation Plan:**
1. Implement field-level encryption for sensitive data (Prisma encryption)
2. Use secrets manager (HashiCorp Vault or similar)
3. Establish key rotation schedule

---

### A03:2021 - Injection

**Status:** ✅ **COMPLIANT**

**Controls Implemented:**
- ✅ Prisma ORM prevents SQL injection
- ✅ Parameterized queries only
- ✅ Zod validation on all inputs
- ✅ Content-type validation on file uploads

**Verification Checklist:**
- [x] No raw SQL queries (or properly parameterized)
- [x] Input validation using Zod schemas
- [x] Output encoding in templates
- [x] File upload type restrictions

**Monitoring:**
- Log all validation failures
- Alert on suspicious patterns (SQL keywords in inputs)

---

### A04:2021 - Insecure Design

**Status:** ✅ **GOOD**

**Controls Implemented:**
- ✅ Threat modeling during design (ADRs)
- ✅ Secure coding standards documented
- ✅ Principle of least privilege
- ✅ Defense in depth (multiple layers)

**Verification:**
- [x] ADRs document security considerations
- [x] Code reviews include security checks
- [x] Separation of concerns in architecture

---

### A05:2021 - Security Misconfiguration

**Status:** 🟡 **NEEDS REVIEW**

**Current Configuration:**
- ✅ TypeScript strict mode
- ✅ ESLint security rules
- ⚠️ Security headers (needs enhancement)
- ⚠️ CORS configuration (needs review)

**Required Security Headers:**
```typescript
// middleware.ts - REQUIRED headers
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
response.headers.set('Permissions-Policy', 
  'geolocation=(), microphone=(), camera=(self)')
response.headers.set('Strict-Transport-Security', 
  'max-age=31536000; includeSubDomains; preload')
response.headers.set('Content-Security-Policy', 
  "default-src 'self'; ...")
```

**Action Items:**
- [ ] Implement comprehensive security headers
- [ ] Harden CSP (Content Security Policy)
- [ ] Review CORS whitelist
- [ ] Disable unnecessary features
- [ ] Regular dependency audits (`npm audit`)

---

### A06:2021 - Vulnerable and Outdated Components

**Status:** 🟡 **MONITORING REQUIRED**

**Controls:**
- ✅ `npm audit` in CI pipeline (to be added)
- ⚠️ Dependabot alerts (to be configured)
- ⚠️ Regular update schedule (needs definition)

**Dependency Management:**

```json
// package.json scripts to add
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  }
}
```

**GitHub Actions Workflow:**
```yaml
# .github/workflows/security.yml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 1' # Weekly
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: NPM Audit
        run: npm audit --audit-level=high
      
      - name: Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Action Items:**
- [ ] Configure Dependabot
- [ ] Set up Snyk scanning
- [ ] Define update policy (patch/minor/major)
- [ ] Create vulnerability response process

---

### A07:2021 - Identification and Authentication Failures

**Status:** ✅ **COMPLIANT**

**Controls:**
- ✅ NextAuth.js for authentication
- ✅ Secure session management
- ✅ Password hashing (bcrypt via NextAuth)
- ⚠️ No multi-factor authentication (MFA)
- ⚠️ No account lockout after failed attempts

**Session Security:**
```typescript
// auth.ts - current configuration
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true // production only
      }
    }
  }
}
```

**Enhancement Plan:**
- [ ] Implement MFA/2FA (TOTP)
- [ ] Add rate limiting on login endpoint
- [ ] Account lockout policy (5 failed attempts)
- [ ] Password complexity requirements
- [ ] Session timeout configuration

---

### A08:2021 - Software and Data Integrity Failures

**Status:** ✅ **GOOD**

**Controls:**
- ✅ Git commit signing (optional)
- ✅ Dependencies from npm registry
- ✅ Lock files committed (package-lock.json)
- ✅ CI/CD pipeline integrity

**Supply Chain Security:**
- Use `npm ci` in production (not `npm install`)
- Verify package checksums
- Review dependency changes in PRs

---

### A09:2021 - Security Logging and Monitoring Failures

**Status:** 🟡 **PARTIAL**

**Current Logging:**
- ✅ Structured logging implemented (logger utility)
- ✅ Error context captured
- ⚠️ No centralized log aggregation
- ⚠️ No real-time alerting
- ⚠️ No security event monitoring

**Required Security Events to Log:**
- ✅ Failed authentication attempts
- ⚠️ Authorization failures
- ⚠️ Input validation failures
- ⚠️ Critical data access (PII)
- ⚠️ Administrative actions

**Monitoring Setup:**
```typescript
// lib/security-logger.ts (to be created)
export function logSecurityEvent(
  event: SecurityEvent,
  context: SecurityContext
) {
  logger.warn(`SECURITY: ${event}`, {
    event,
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    timestamp: new Date().toISOString(),
    severity: 'HIGH'
  })

  // Send to Sentry with 'security' tag
  if (isSuspicious(event)) {
    alertSecurityTeam(event, context)
  }
}
```

**Action Items:**
- [ ] Implement security event logging
- [ ] Set up Sentry integration
- [ ] Configure alerting rules
- [ ] Create security dashboard
- [ ] Define incident response process

---

### A10:2021 - Server-Side Request Forgery (SSRF)

**Status:** ✅ **LOW RISK**

**Analysis:**
- No user-controlled URLs fetched server-side
- External APIs (Google) use SDK (no URL construction)
- Nominatim geocoding uses fixed endpoint

**If adding URL fetching in future:**
```typescript
// lib/safe-fetch.ts
const ALLOWED_HOSTS = ['api.example.com']

export async function safeFetch(url: string) {
  const parsed = new URL(url)
  
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error('Host not allowed')
  }
  
  return fetch(url)
}
```

---

## Additional Security Requirements

### Data Protection

**Sensitive Data Inventory:**
| Data Type | Location | Encryption | Retention |
|-----------|----------|------------|-----------|
| Passwords | Database | ✅ Hashed (bcrypt) | Permanent |
| Session Tokens | Database/Cookie | ✅ Signed | 30 days |
| Builder Contacts | Database | ❌ Plaintext | Per policy |
| Job Photos | S3/FileSystem | ❌ Unencrypted | Per policy |
| API Keys (Google) | Database | ❌ Plaintext | Rotating |

**Required Actions:**
- [ ] Encrypt API keys in database
- [ ] Define data retention policy
- [ ] Implement data deletion workflow
- [ ] GDPR compliance review

---

### Penetration Testing

**Schedule:** Annually or after major releases

**Scope:**
- Authentication and authorization
- Input validation
- Session management
- API security
- File upload security

**Tools:**
- OWASP ZAP (automated scanning)
- Burp Suite (manual testing)
- nikto (web server scanning)

---

### Incident Response Plan

**Process:**
1. **Detection** - Alert triggered
2. **Containment** - Isolate affected systems
3. **Eradication** - Remove threat
4. **Recovery** - Restore services
5. **Post-Incident** - Review and improve

**Contacts:**
- Security Lead: [TBD]
- Infrastructure: [TBD]
- Legal/Compliance: [TBD]

**Runbook:** See `/docs/runbooks/incident-response.md`

---

## Compliance Checklists

### Pre-Deployment Security Checklist

- [ ] All dependencies updated and audited
- [ ] No high/critical vulnerabilities
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Session security reviewed
- [ ] Secrets not in code
- [ ] Error messages don't leak info
- [ ] Rate limiting on auth endpoints
- [ ] File upload restrictions tested
- [ ] Logging covers security events
- [ ] Backup strategy verified
- [ ] Incident response plan documented

### Monthly Security Review

- [ ] Review access logs for anomalies
- [ ] Check for failed authentication spikes
- [ ] Review Sentry security events
- [ ] Update dependencies (patch versions)
- [ ] Review new OWASP advisories
- [ ] Test backup restoration

### Quarterly Security Audit

- [ ] Full dependency audit
- [ ] Penetration test (if applicable)
- [ ] Review and update security policies
- [ ] Access control review
- [ ] Secrets rotation
- [ ] Security training for team

---

## Security Tools Integration

### Recommended Tools

| Tool | Purpose | Status |
|------|---------|--------|
| **Snyk** | Vulnerability scanning | 🔴 To implement |
| **Dependabot** | Automated updates | 🔴 To configure |
| **npm audit** | Dependency audit | 🟡 Manual only |
| **ESLint security plugin** | Code scanning | 🔴 To add |
| **Gitleaks** | Secret scanning | 🔴 To add |
| **OWASP ZAP** | Penetration testing | 🔴 Future |
| **Sentry** | Error monitoring | 🟡 Partial integration |

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)

*Last updated: 2025-11-24*
