# ADR-003: Structured Logging Strategy

**Status:** Accepted

**Date:** 2025-11-24

**Deciders:** Development Team

**Technical Story:** Production logging and observability implementation

---

## Context and Problem Statement

AuditForecaster requires production-grade logging that enables:
- Debugging production issues
- Performance monitoring
- Security audit trails
- Integration with monitoring tools (Sentry)
- Structured data for querying and analysis

**Driving Forces:**
- `console.log/error` insufficient for production
- Need context-rich error logging
- Sentry integration for error tracking
- Compliance requirements (audit trails)

## Decision Drivers

* Production observability
* Error tracking and debugging
* Performance monitoring
* Structured data (JSON) for analysis
* Integration with monitoring services
* Developer experience (easy to use)

## Considered Options

* **Custom structured logger** (current approach)
* **Winston**
* **Pino**
* **Bunyan**
* **Console only** (not acceptable for production)

## Decision Outcome

**Chosen option:** "Custom structured logger with Sentry integration"

**Rationale:**
- Lightweight custom implementation
- Perfect fit for Next.js App Router
- Easy Sentry integration
- Structured JSON logging
- Minimal dependencies
- Full control over log format

### Positive Consequences

* Consistent logging across application
* Structured metadata for debugging
* Sentry integration ready
* Low overhead
* Easy to extend
* Type-safe logging
* Context-aware error tracking

### Negative Consequences

* Custom code to maintain
* Must manually replace console.* usage
* Need discipline for consistent adoption

## Implementation Details

### Logger Interface

```typescript
// lib/logger.ts
interface LogContext {
  [key: string]: any
  error?: Error | string
}

export const logger = {
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
}
```

### Usage Patterns

**Server Actions:**
```typescript
try {
  await prisma.builder.create({ data })
} catch (e) {
  logger.error('Failed to create builder', {
    error: e instanceof Error ? e.message : String(e),
    builderName: data.name,
    userId: session.user.id
  })
}
```

**API Routes:**
```typescript
catch (error) {
  logger.error('Photo upload failed', {
    jobId: params.id,
    fileName: file.name,
    error: error instanceof Error ? error.message : String(error)
  })
}
```

### Production Integration

**Sentry Setup:**
```typescript
// Logs automatically sent to Sentry in production
// Error context preserved
```

### Migration Strategy

**Phase 1 (Complete):**
- ✅ Upgrade critical server actions (builders, fleet, equipment, email)

**Phase 2 (Future):**
- Upgrade remaining server actions
- Upgrade API routes
- Add performance logging

**Acceptable console.* Usage:**
- Error boundaries (React error handling)
- Dev-only debugging (conditionally)
- Service worker registration

## Pros and Cons of the Options

### Custom Structured Logger

**Pros:**
* Lightweight (< 50 lines)
* Perfect Next.js fit
* Full control
* Easy Sentry integration
* Zero extra dependencies

**Cons:**
* Custom maintenance
* Missing advanced features (log levels, transports)
* Requires team discipline

### Winston

**Pros:**
* Feature-rich
* Multiple transports
* Mature ecosystem

**Cons:**
* Heavy dependency
* Overkill for our needs
* Less TypeScript-friendly

### Pino

**Pros:**
* Very fast (JSON logging)
* Low overhead

**Cons:**
* Requires additional configuration
* Less intuitive API

## Links

* [Logger Implementation](../../src/lib/logger.ts)
* [Sentry Documentation](https://docs.sentry.io/)
* Related: [Hardening Report](../../../.gemini/antigravity/brain/6ed8d7fe-da8f-48d7-9fa1-fff7fe9d31d4/hardening_report.md)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-24 | Development Team | Initial creation after hardening phase |
