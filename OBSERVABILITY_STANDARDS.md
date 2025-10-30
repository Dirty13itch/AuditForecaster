# OBSERVABILITY STANDARDS
## Production Monitoring & Debugging Requirements for Energy Auditing Field Application

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Active  
**Owner:** Engineering & Operations Team  
**Complements:** [PRODUCTION_STANDARDS.md](./PRODUCTION_STANDARDS.md), [TESTING_STANDARDS.md](./TESTING_STANDARDS.md), [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md)

---

## Table of Contents

1. [Observability Philosophy](#1-observability-philosophy)
2. [Structured Logging](#2-structured-logging)
3. [Sentry Integration](#3-sentry-integration)
4. [Metrics Collection](#4-metrics-collection)
5. [Distributed Tracing](#5-distributed-tracing)
6. [Monitoring Dashboards](#6-monitoring-dashboards)
7. [Alerting Strategy](#7-alerting-strategy)
8. [Performance Monitoring](#8-performance-monitoring)
9. [Query Performance Tracking](#9-query-performance-tracking)
10. [Error Tracking Best Practices](#10-error-tracking-best-practices)
11. [User Session Monitoring](#11-user-session-monitoring)
12. [Synthetic Monitoring](#12-synthetic-monitoring)
13. [Log Aggregation & Search](#13-log-aggregation--search)
14. [Incident Response](#14-incident-response)
15. [Continuous Improvement](#15-continuous-improvement)

---

## 1. Observability Philosophy

### 1.1 The Three Pillars of Observability

Observability is not just monitoring. It's the ability to understand **what's happening inside your system** by examining its outputs. For our energy auditing field application—used by inspectors in basements, attics, and construction sites—observability is mission-critical.

**The three pillars:**

#### **Logs: The "What Happened"**
- **Purpose**: Discrete events that describe what the system did
- **Example**: "Inspector test-inspector1 uploaded photo IMG_1234.jpg for job JOB-2025-001 at 2025-10-30T14:23:45Z"
- **Use Case**: Debugging specific user issues, audit trails, compliance reporting
- **ROI**: Reduce MTTR (Mean Time To Resolution) from hours to minutes

#### **Metrics: The "How Much/How Fast"**
- **Purpose**: Numerical measurements over time (counters, gauges, histograms)
- **Example**: "Photo upload endpoint p95 latency = 850ms, error rate = 0.3%"
- **Use Case**: Performance trending, capacity planning, SLA tracking
- **ROI**: Proactive alerts prevent outages, optimize infrastructure costs

#### **Traces: The "How Did We Get Here"**
- **Purpose**: The path a request takes through the system (distributed request flow)
- **Example**: "Job creation request → API validation (15ms) → DB insert (45ms) → Photo upload (650ms) → Email notification (120ms) = 830ms total"
- **Use Case**: Performance bottleneck identification, debugging complex workflows
- **ROI**: Identify slowest operations, optimize critical paths, reduce latency by 40%+

### 1.2 Why Observability Matters for Field Operations

**"An inspector can't afford a crash during a blower door test."**

Unlike typical web apps, our users:
- **Work offline**: Sync queues must be observable, not black boxes
- **Handle high-value data**: Lost inspection photos = lost revenue
- **Operate in time-pressure**: Slow apps = fewer jobs per day = less profit
- **Face unpredictable conditions**: Weak cellular, gloves, bright sunlight

**Observability delivers:**

1. **Faster debugging**: When an inspector reports "photo won't upload," correlation IDs let you trace the exact failure in seconds
2. **Proactive optimization**: Discover that PDF generation takes 4 seconds → optimize to 800ms → inspectors complete 20% more jobs
3. **Offline resilience**: Track sync queue depth, retry rates, conflict resolution success
4. **User trust**: Surface errors before users notice them (e.g., "3 inspectors can't login" alert fires before 50 can't)

**Real example:**
- **Before observability**: Inspector reports "app crashed." Engineer spends 2 hours reproducing. Can't find root cause.
- **After observability**: Inspector reports "app crashed." Engineer sees: `correlationId=abc123 → Error: Out of memory during PDF generation for job JOB-2025-042 with 87 photos`. Fix deployed in 15 minutes.

### 1.3 Shift Left: Observability from Development

**Observability is not a production afterthought. It starts in development.**

#### **Development Environment Observability**
- **Sentry enabled in development**: See errors immediately, not after deployment
- **Correlation IDs in all requests**: Even localhost requests have traceable IDs
- **Performance metrics in dev tools**: React DevTools Profiler, Network tab timing
- **Structured logging from day one**: No `console.log("here")` technical debt

#### **Code Review Observability Checklist**
Before merging any PR:
- [ ] All async operations wrapped in try-catch with structured logging
- [ ] Business metrics emitted (e.g., "job created," "photo uploaded")
- [ ] Performance-sensitive operations instrumented (e.g., database queries, API calls)
- [ ] Error context includes correlation ID, user ID, operation details
- [ ] PII redacted from logs (passwords, tokens, addresses if required)

**Example: Observability in code review**
```typescript
// ❌ BAD: No observability
router.post('/api/jobs', async (req, res) => {
  const job = await storage.createJob(req.body);
  res.json(job);
});

// ✅ GOOD: Fully observable
router.post('/api/jobs', requireAuth, async (req, res) => {
  const correlationId = req.correlationId;
  const userId = req.user.id;
  
  const start = Date.now();
  
  try {
    logger.info('[Job Creation] Starting', {
      correlationId,
      userId,
      address: req.body.address,
    });
    
    const job = await storage.createJob(req.body);
    const duration = Date.now() - start;
    
    // Emit business metric
    metrics.increment('jobs.created', 1, { inspector: userId });
    metrics.timing('jobs.creation.duration', duration);
    
    logger.info('[Job Creation] Success', {
      correlationId,
      userId,
      jobId: job.id,
      duration: `${duration}ms`,
    });
    
    res.status(201).json(job);
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('[Job Creation] Failed', {
      correlationId,
      userId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    
    captureException(error, {
      tags: { operation: 'job_creation' },
      extra: { correlationId, userId, address: req.body.address },
    });
    
    metrics.increment('jobs.creation.errors', 1);
    
    res.status(500).json({ error: 'Failed to create job' });
  }
});
```

### 1.4 Correlation: Linking Logs, Metrics, and Traces

**The power of observability comes from correlation.** A correlation ID is a unique identifier (e.g., `abc123def456`) attached to every request, allowing you to:

1. **Trace a request across services**: Frontend → API → Database → Email service
2. **Link logs from different systems**: All logs for one user action share the same correlation ID
3. **Debug specific user issues**: User reports error, you search logs by correlation ID from error response
4. **Measure end-to-end latency**: Sum all spans with the same trace ID

**Correlation flow in our application:**

```
[User Action] Inspector uploads photo for job JOB-2025-001
    ↓
[Frontend] correlationId=abc123 → POST /api/photos/upload
    ↓
[API Middleware] Attaches correlationId=abc123 to request, logs "Request Start"
    ↓
[Route Handler] Logs "Photo upload started" with correlationId=abc123
    ↓
[Object Storage] Uploads photo, logs "Upload to bucket succeeded" with correlationId=abc123
    ↓
[Database] Inserts photo metadata, logs "Photo record created" with correlationId=abc123
    ↓
[API Response] Returns photo ID, logs "Request End" with correlationId=abc123, duration=850ms
    ↓
[Frontend] Success toast, logs "Photo upload completed" with correlationId=abc123
```

**Now when debugging**: Search logs for `correlationId=abc123` and see the entire flow in order.

---

## 2. Structured Logging

### 2.1 Why Structured Logging

**Traditional logging:**
```javascript
console.log('User logged in');
console.log('Job created: ' + jobId);
console.error('Failed to upload photo: ' + error.message);
```

**Problems:**
- Not machine-readable (can't query by field)
- Missing context (which user? which job?)
- No correlation (can't link related events)
- Inconsistent format (each developer logs differently)

**Structured logging:**
```typescript
logger.info('User logged in', {
  userId: 'test-inspector1',
  email: 'inspector1@test.com',
  correlationId: 'abc123',
  timestamp: '2025-10-30T14:23:45.123Z',
});

logger.info('Job created', {
  jobId: 'JOB-2025-001',
  userId: 'test-inspector1',
  address: '123 Main St',
  correlationId: 'abc123',
  timestamp: '2025-10-30T14:23:46.456Z',
});

logger.error('Photo upload failed', {
  error: 'Network timeout',
  photoId: 'PHOTO-123',
  jobId: 'JOB-2025-001',
  userId: 'test-inspector1',
  correlationId: 'abc123',
  stack: error.stack,
  timestamp: '2025-10-30T14:23:48.789Z',
});
```

**Benefits:**
- ✅ **Machine-readable**: Query by any field (e.g., "show all errors for userId=test-inspector1")
- ✅ **Consistent format**: Every log has timestamp, level, message, context
- ✅ **Easy correlation**: Link logs by correlationId
- ✅ **Aggregatable**: Count errors by type, measure latency distributions

### 2.2 Log Levels

**Use log levels appropriately to control noise and alert fatigue:**

| Level | When to Use | Example | Production Output |
|-------|-------------|---------|-------------------|
| **DEBUG** | Detailed diagnostic info for developers | "Cache hit for key user:123" | Hidden (too verbose) |
| **INFO** | Normal operations, business events | "Job created successfully" | Yes (important events) |
| **WARN** | Recoverable issues, degraded service | "Slow query detected (850ms)" | Yes (investigate later) |
| **ERROR** | Operation failed, user impacted | "Photo upload failed" | Yes (alert immediately) |
| **FATAL** | System crash, requires restart | "Database connection lost" | Yes (page on-call engineer) |

**Configuration:**
```typescript
// server/logger.ts (enhanced version)
import { nanoid } from 'nanoid';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  correlationId?: string;
  userId?: string;
  jobId?: string;
  operation?: string;
  duration?: string;
  [key: string]: any;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class StructuredLogger {
  private serviceName: string;
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? 'info' : 'debug';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, context: LogContext = {}): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      context: this.redactPII(context),
    };
  }

  private redactPII(context: LogContext): LogContext {
    const redacted = { ...context };
    
    // Redact sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'ssn', 'creditCard'];
    for (const field of sensitiveFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      const log = this.formatLog('debug', message, context);
      console.debug(JSON.stringify(log));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      const log = this.formatLog('info', message, context);
      console.info(JSON.stringify(log));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      const log = this.formatLog('warn', message, context);
      console.warn(JSON.stringify(log));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const log = this.formatLog('error', message, context);
      console.error(JSON.stringify(log));
    }
  }

  fatal(message: string, context?: LogContext): void {
    const log = this.formatLog('fatal', message, context);
    console.error(JSON.stringify(log));
    // In production, fatal logs should trigger alerts
    if (this.isProduction) {
      // Send to alerting system (e.g., PagerDuty, Slack)
      this.sendAlert(log);
    }
  }

  private sendAlert(log: StructuredLog): void {
    // Implementation depends on alerting system
    // Example: POST to Slack webhook
  }
}

export const logger = new StructuredLogger('EnergyAudit-API');
```

### 2.3 Required Fields in Every Log

**Every structured log must include:**

```typescript
interface RequiredLogFields {
  timestamp: string;        // ISO 8601 format
  level: LogLevel;          // debug, info, warn, error, fatal
  message: string;          // Human-readable description
  service: string;          // Service name (e.g., "API", "Worker", "Frontend")
  correlationId: string;    // Unique request ID
  userId?: string;          // Authenticated user (if applicable)
}
```

**Example:**
```json
{
  "timestamp": "2025-10-30T14:23:45.123Z",
  "level": "info",
  "message": "Photo uploaded successfully",
  "service": "API",
  "correlationId": "abc123def456",
  "userId": "test-inspector1",
  "context": {
    "jobId": "JOB-2025-001",
    "photoId": "PHOTO-789",
    "fileSize": 2048576,
    "duration": "850ms"
  }
}
```

### 2.4 Context Enrichment

**Enrich logs with domain-specific context:**

```typescript
// Example: Job creation logging
router.post('/api/jobs', requireAuth, async (req, res) => {
  const correlationId = req.correlationId;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  logger.info('[Job Creation] Started', {
    correlationId,
    userId,
    userRole,
    operation: 'create_job',
    address: req.body.address,
    inspector: req.body.inspectorId,
  });
  
  try {
    const job = await storage.createJob(req.body);
    
    logger.info('[Job Creation] Success', {
      correlationId,
      userId,
      userRole,
      operation: 'create_job',
      jobId: job.id,
      address: job.address,
      status: job.status,
    });
    
    res.status(201).json(job);
  } catch (error) {
    logger.error('[Job Creation] Failed', {
      correlationId,
      userId,
      userRole,
      operation: 'create_job',
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
});
```

**Business-specific context for energy auditing:**
- `jobId`: Which inspection job
- `inspectorId`: Which field inspector
- `testType`: Blower door, duct leakage, ventilation
- `complianceStatus`: Pass/fail status
- `photoCount`: Number of photos in operation
- `syncStatus`: Online/offline, queued/synced

### 2.5 No console.log in Production

**Enforce structured logging discipline:**

```typescript
// ❌ FORBIDDEN: console.log in production code
console.log('Photo uploaded');
console.log('Error:', error);
console.log('User:', user.email); // PII leak!

// ✅ REQUIRED: Structured logging
logger.info('Photo uploaded', {
  correlationId: req.correlationId,
  userId: req.user.id,
  photoId: photo.id,
});

logger.error('Photo upload failed', {
  correlationId: req.correlationId,
  userId: req.user.id,
  error: error.message,
  stack: error.stack,
});

logger.info('User logged in', {
  correlationId: req.correlationId,
  userId: user.id,
  // ✅ Email redacted in logger.redactPII()
});
```

**Lint rule to prevent console.log:**
```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", {
      "allow": ["error", "warn"]
    }]
  }
}
```

### 2.6 Log Sampling for High-Volume Endpoints

**Problem:** Health check endpoint `/healthz` called every 5 seconds = 17,280 logs/day = wasted money

**Solution:** Sample high-volume, low-value logs

```typescript
// server/middleware/healthCheck.ts
let healthCheckCount = 0;
const HEALTH_CHECK_SAMPLE_RATE = 0.01; // Log 1% of health checks

router.get('/healthz', (req, res) => {
  healthCheckCount++;
  
  // Log every 100th health check (1% sample rate)
  if (healthCheckCount % 100 === 0) {
    logger.debug('[Health Check] OK', {
      correlationId: req.correlationId,
      checks: healthCheckCount,
    });
  }
  
  res.status(200).json({ status: 'ok' });
});
```

**Sample rates by endpoint type:**
- Health checks: 1% (low value, high volume)
- Metrics endpoints: 5% (medium value, high volume)
- User actions: 100% (high value, low volume)
- Errors: 100% (always log errors)

### 2.7 PII Redaction

**Automatically redact sensitive data from logs:**

```typescript
// Enhanced redaction in logger
private redactPII(context: LogContext): LogContext {
  const redacted = { ...context };
  
  // Field-based redaction
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'ssn',
    'creditCard',
    'phoneNumber',
  ];
  
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  // Pattern-based redaction (e.g., emails)
  for (const key in redacted) {
    if (typeof redacted[key] === 'string') {
      // Redact email addresses
      redacted[key] = redacted[key].replace(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
        '[EMAIL_REDACTED]'
      );
      
      // Redact phone numbers (various formats)
      redacted[key] = redacted[key].replace(
        /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        '[PHONE_REDACTED]'
      );
      
      // Redact credit card numbers
      redacted[key] = redacted[key].replace(
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        '[CC_REDACTED]'
      );
    }
  }
  
  return redacted;
}
```

**Example:**
```typescript
logger.info('User registered', {
  userId: 'user-123',
  email: 'john.doe@example.com',
  password: 'secret123',
  phone: '555-123-4567',
});

// Logged as:
{
  "timestamp": "2025-10-30T14:23:45.123Z",
  "level": "info",
  "message": "User registered",
  "service": "API",
  "context": {
    "userId": "user-123",
    "email": "[EMAIL_REDACTED]",
    "password": "[REDACTED]",
    "phone": "[PHONE_REDACTED]"
  }
}
```

### 2.8 Performance Logging (Query Timing)

**Log slow operations for performance optimization:**

```typescript
// Middleware to log slow requests
function performanceLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
    
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('[Slow Request] Exceeded threshold', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        threshold: `${SLOW_REQUEST_THRESHOLD}ms`,
        userId: req.user?.id,
      });
    }
  });
  
  next();
}

// Database query timing
async function executeQueryWithLogging<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  context: LogContext = {}
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 100) { // Log queries >100ms
      logger.warn('[Slow Query] Detected', {
        ...context,
        queryName,
        duration: `${duration}ms`,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('[Query Error]', {
      ...context,
      queryName,
      duration: `${duration}ms`,
      error: error.message,
    });
    
    throw error;
  }
}

// Usage:
const jobs = await executeQueryWithLogging(
  'getJobsByInspector',
  () => storage.getJobsByInspector(inspectorId),
  { correlationId, userId, inspectorId }
);
```

---

## 3. Sentry Integration

### 3.1 Enhanced Sentry Configuration

**Backend (server/sentry.ts - enhanced):**

```typescript
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const GIT_SHA = process.env.REPLIT_DEPLOYMENT_ID || 'development';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `energy-audit-api@${GIT_SHA}`,
    enabled: NODE_ENV === 'production',
    
    // Sampling rates
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      nodeProfilingIntegration(),
      // HTTP instrumentation for automatic tracing
      Sentry.httpIntegration(),
      // Database instrumentation (if using Prisma/Drizzle)
      // Sentry.prismaIntegration(),
    ],

    // Tag all events with service name
    initialScope: {
      tags: {
        service: 'api',
        region: process.env.REPLIT_DEPLOYMENT_REGION || 'us-east-1',
      },
    },

    // Filter before sending
    beforeSend(event, hint) {
      // Don't send events in development
      if (NODE_ENV === 'development') {
        console.log('[Sentry] Would send error:', event);
        return null;
      }
      
      // Filter out health check errors
      if (event.request?.url?.includes('/healthz')) {
        return null;
      }
      
      // Scrub sensitive data
      if (event.request?.data) {
        event.request.data = scrubSensitiveData(event.request.data);
      }
      
      return event;
    },
    
    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb, hint) {
      // Reduce noise from frequent operations
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }
      
      return breadcrumb;
    },
  });

  console.log('[Sentry] Initialized', {
    environment: NODE_ENV,
    release: `energy-audit-api@${GIT_SHA}`,
  });
}

function scrubSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const scrubbed = { ...data };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'ssn'];
  
  for (const key of sensitiveKeys) {
    if (scrubbed[key]) {
      scrubbed[key] = '[REDACTED]';
    }
  }
  
  return scrubbed;
}
```

**Frontend (client/src/lib/sentry.ts - enhanced):**

```typescript
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const NODE_ENV = import.meta.env.MODE;
const GIT_SHA = import.meta.env.VITE_GIT_SHA || 'development';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `energy-audit-frontend@${GIT_SHA}`,
    enabled: NODE_ENV === 'production',
    
    // React-specific integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.reactRouterV6BrowserTracingIntegration({
        // Use wouter instead of react-router
        // Custom implementation needed
      }),
    ],

    // Sampling rates
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay sampling
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Tag all events
    initialScope: {
      tags: {
        service: 'frontend',
        device: 'mobile', // Detect based on screen size
      },
    },

    // Filter before sending
    beforeSend(event, hint) {
      if (NODE_ENV === 'development') {
        console.log('[Sentry] Would send error:', event);
        return null;
      }
      
      return event;
    },
  });

  console.log('[Sentry] Initialized', {
    environment: NODE_ENV,
    release: `energy-audit-frontend@${GIT_SHA}`,
  });
}
```

### 3.2 Custom Context on Route Handlers

**Enrich errors with domain-specific context:**

```typescript
// Backend route with Sentry context
router.post('/api/jobs', requireAuth, async (req, res) => {
  // Set Sentry context for this request
  Sentry.setContext('job_creation', {
    address: req.body.address,
    inspectorId: req.body.inspectorId,
    scheduledDate: req.body.scheduledDate,
  });
  
  Sentry.setUser({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
  
  Sentry.setTag('operation', 'job_creation');
  Sentry.setTag('inspector_role', req.user.role);
  
  try {
    const job = await storage.createJob(req.body);
    
    // Success - clear error context
    Sentry.setContext('job_creation', null);
    
    res.status(201).json(job);
  } catch (error) {
    // Error context is automatically included
    Sentry.captureException(error);
    
    res.status(500).json({ error: 'Failed to create job' });
  }
});
```

**Frontend error boundaries with Sentry:**

```typescript
// client/src/components/ErrorBoundary.tsx (enhanced)
import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send to Sentry with React component stack
    Sentry.withScope((scope) => {
      scope.setContext('react_component_stack', {
        componentStack: errorInfo.componentStack,
      });
      
      scope.setTag('error_boundary', 'true');
      
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">
            We've been notified and are working on a fix.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Dashboard
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3.3 Breadcrumb Tracking

**Track user actions leading to errors:**

```typescript
// Frontend: Add breadcrumbs for user navigation
import { Sentry } from '@/lib/sentry';

// Track page navigation
function trackPageView(page: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${page}`,
    level: 'info',
    data: {
      page,
      timestamp: new Date().toISOString(),
    },
  });
}

// Track user actions
function trackUserAction(action: string, details: Record<string, any> = {}) {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

// Usage in components:
function JobCard({ job, onView }: JobCardProps) {
  const handleView = () => {
    trackUserAction('View job details', {
      jobId: job.id,
      address: job.address,
      status: job.status,
    });
    
    onView(job.id);
  };

  return (
    <Card onClick={handleView}>
      {/* ... */}
    </Card>
  );
}

// Track photo uploads
async function uploadPhoto(file: File, jobId: string) {
  trackUserAction('Upload photo started', {
    jobId,
    fileSize: file.size,
    fileType: file.type,
  });
  
  try {
    const result = await api.uploadPhoto(file, jobId);
    
    trackUserAction('Upload photo completed', {
      jobId,
      photoId: result.id,
    });
    
    return result;
  } catch (error) {
    trackUserAction('Upload photo failed', {
      jobId,
      error: error.message,
    });
    
    throw error;
  }
}
```

**Now when an error occurs, Sentry shows:**
```
Breadcrumbs:
1. [navigation] Navigated to /jobs
2. [user_action] View job details (jobId: JOB-2025-001)
3. [navigation] Navigated to /jobs/JOB-2025-001
4. [user_action] Upload photo started (fileSize: 2048576)
5. [network] POST /api/photos/upload (status: 500)
6. [user_action] Upload photo failed (error: "Network timeout")
7. [error] Error: Failed to upload photo
```

### 3.4 Performance Monitoring (Transaction Traces)

**Trace performance of critical operations:**

```typescript
// Backend: Trace API endpoints
router.post('/api/reports/generate', requireAuth, async (req, res) => {
  const transaction = Sentry.startTransaction({
    name: 'Generate Report',
    op: 'report.generate',
    tags: {
      jobId: req.body.jobId,
      reportType: req.body.reportType,
    },
  });
  
  Sentry.getCurrentHub().configureScope((scope) => {
    scope.setSpan(transaction);
  });
  
  try {
    // Span 1: Fetch job data
    const jobSpan = transaction.startChild({
      op: 'db.query',
      description: 'Fetch job data',
    });
    const job = await storage.getJob(req.body.jobId);
    jobSpan.finish();
    
    // Span 2: Fetch photos
    const photosSpan = transaction.startChild({
      op: 'db.query',
      description: 'Fetch job photos',
    });
    const photos = await storage.getPhotosByJob(req.body.jobId);
    photosSpan.finish();
    
    // Span 3: Generate PDF
    const pdfSpan = transaction.startChild({
      op: 'pdf.generate',
      description: 'Generate PDF report',
    });
    const pdf = await generateReportPDF(job, photos);
    pdfSpan.finish();
    
    // Span 4: Upload to storage
    const uploadSpan = transaction.startChild({
      op: 'storage.upload',
      description: 'Upload PDF to object storage',
    });
    const url = await uploadToStorage(pdf);
    uploadSpan.finish();
    
    transaction.finish();
    
    res.json({ url });
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.finish();
    
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
```

**Frontend: Trace user interactions:**

```typescript
import { Sentry } from '@/lib/sentry';

function PhotoUploadComponent({ jobId }: { jobId: string }) {
  const uploadPhoto = async (file: File) => {
    const transaction = Sentry.startTransaction({
      name: 'Upload Photo',
      op: 'photo.upload',
      tags: {
        jobId,
        fileSize: file.size,
      },
    });
    
    try {
      // Span 1: Compress image
      const compressSpan = transaction.startChild({
        op: 'image.compress',
        description: 'Compress photo',
      });
      const compressed = await compressImage(file);
      compressSpan.finish();
      
      // Span 2: Upload to API
      const uploadSpan = transaction.startChild({
        op: 'http.post',
        description: 'POST /api/photos/upload',
      });
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: compressed,
      });
      uploadSpan.finish();
      
      transaction.finish();
      
      return await response.json();
    } catch (error) {
      transaction.setStatus('internal_error');
      transaction.finish();
      
      Sentry.captureException(error);
      throw error;
    }
  };
  
  return <PhotoUploadButton onUpload={uploadPhoto} />;
}
```

### 3.5 Release Tracking

**Track which version introduced an error:**

```bash
# .github/workflows/deploy.yml (or similar CI/CD)
- name: Create Sentry release
  run: |
    npx @sentry/cli releases new "${{ github.sha }}"
    npx @sentry/cli releases set-commits "${{ github.sha }}" --auto
    npx @sentry/cli releases finalize "${{ github.sha }}"
    npx @sentry/cli releases deploys "${{ github.sha }}" new -e production
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: energy-audit
    SENTRY_PROJECT: energy-audit-api
```

**Source maps upload:**

```bash
# Upload source maps for frontend
npx @sentry/cli sourcemaps upload --release="$GIT_SHA" ./dist
```

---

## 4. Metrics Collection

### 4.1 Key Metrics to Track

**API Metrics:**
- **Request rate**: Requests per second (RPS)
- **Response time**: p50, p95, p99 latency
- **Error rate**: 4xx/5xx responses as percentage
- **Status codes**: Distribution of HTTP status codes

**Database Metrics:**
- **Query count**: Queries per second
- **Query time**: Average, p95, p99 query duration
- **Connection pool usage**: Active/idle connections
- **Slow queries**: Queries >100ms

**Business Metrics:**
- **Jobs created**: Count per day/week/month
- **Reports generated**: Count and success rate
- **Photos uploaded**: Count and average file size
- **Compliance pass rate**: % of inspections that pass

**System Metrics:**
- **CPU usage**: Average and peak %
- **Memory usage**: Heap size, RSS
- **Disk usage**: Available space
- **Network I/O**: Bytes in/out

**User Metrics:**
- **Active users**: Daily/weekly/monthly active users
- **Session duration**: Average session length
- **Feature usage**: Which features are used most
- **User retention**: % of users who return

### 4.2 Prometheus Metrics Example

**Install Prometheus client:**
```bash
npm install prom-client
```

**Setup metrics server:**

```typescript
// server/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// API Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_name', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
  registers: [register],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Number of database connections in the pool',
  labelNames: ['state'], // active, idle
  registers: [register],
});

// Business Metrics
export const jobsCreatedTotal = new Counter({
  name: 'jobs_created_total',
  help: 'Total number of jobs created',
  labelNames: ['inspector', 'status'],
  registers: [register],
});

export const photosUploadedTotal = new Counter({
  name: 'photos_uploaded_total',
  help: 'Total number of photos uploaded',
  labelNames: ['job_id'],
  registers: [register],
});

export const reportsGeneratedTotal = new Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['report_type', 'status'],
  registers: [register],
});

export const reportGenerationDuration = new Histogram({
  name: 'report_generation_duration_seconds',
  help: 'Report generation duration in seconds',
  labelNames: ['report_type'],
  buckets: [0.5, 1, 2, 5, 10, 30], // 0.5s to 30s
  registers: [register],
});

// User Metrics
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
  labelNames: ['role'],
  registers: [register],
});

// Export metrics endpoint
export function getMetrics(): string {
  return register.metrics();
}
```

**Middleware to track API metrics:**

```typescript
// server/middleware/metricsMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Increment request counter
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode,
    });
    
    // Record request duration
    httpRequestDuration.observe(
      {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode,
      },
      duration
    );
  });
  
  next();
}
```

**Track business metrics in routes:**

```typescript
// Track job creation
router.post('/api/jobs', requireAuth, async (req, res) => {
  try {
    const job = await storage.createJob(req.body);
    
    // Emit business metric
    jobsCreatedTotal.inc({
      inspector: req.user.id,
      status: job.status,
    });
    
    res.status(201).json(job);
  } catch (error) {
    // ...
  }
});

// Track photo uploads
router.post('/api/photos/upload', requireAuth, async (req, res) => {
  try {
    const photo = await uploadPhoto(req.file);
    
    photosUploadedTotal.inc({
      job_id: req.body.jobId,
    });
    
    res.json(photo);
  } catch (error) {
    // ...
  }
});

// Track report generation
router.post('/api/reports/generate', requireAuth, async (req, res) => {
  const start = Date.now();
  
  try {
    const report = await generateReport(req.body);
    
    const duration = (Date.now() - start) / 1000;
    
    reportsGeneratedTotal.inc({
      report_type: req.body.reportType,
      status: 'success',
    });
    
    reportGenerationDuration.observe(
      { report_type: req.body.reportType },
      duration
    );
    
    res.json(report);
  } catch (error) {
    reportsGeneratedTotal.inc({
      report_type: req.body.reportType,
      status: 'error',
    });
    
    throw error;
  }
});
```

**Expose metrics endpoint:**

```typescript
// server/index.ts
import { getMetrics } from './metrics';

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});
```

### 4.3 Database Query Instrumentation

**Track Drizzle query performance:**

```typescript
// server/db.ts (enhanced)
import { drizzle } from 'drizzle-orm/neon-serverless';
import { dbQueryDuration } from './metrics';

// Wrap Drizzle queries with metrics
export function instrumentQuery<T>(
  queryName: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return queryFn()
    .then((result) => {
      const duration = (Date.now() - start) / 1000;
      
      dbQueryDuration.observe(
        { query_name: queryName, table },
        duration
      );
      
      // Log slow queries
      if (duration > 0.1) { // >100ms
        logger.warn('[Slow Query] Detected', {
          queryName,
          table,
          duration: `${duration * 1000}ms`,
        });
      }
      
      return result;
    })
    .catch((error) => {
      const duration = (Date.now() - start) / 1000;
      
      logger.error('[Query Error]', {
        queryName,
        table,
        duration: `${duration * 1000}ms`,
        error: error.message,
      });
      
      throw error;
    });
}

// Usage in storage layer:
async getJob(id: string): Promise<Job | undefined> {
  return instrumentQuery(
    'getJob',
    'jobs',
    () => this.db.query.jobs.findFirst({
      where: (jobs, { eq }) => eq(jobs.id, id),
    })
  );
}
```

---

## 5. Distributed Tracing

### 5.1 OpenTelemetry Setup

**Install OpenTelemetry:**
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

**Configure tracing (server/tracing.ts):**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'energy-audit-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.GIT_SHA || 'dev',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
    }),
  ],
});

sdk.start();

export { sdk };
```

**Manual span creation:**

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('energy-audit-api');

router.post('/api/jobs', requireAuth, async (req, res) => {
  const span = tracer.startSpan('create_job', {
    attributes: {
      'job.address': req.body.address,
      'job.inspector': req.body.inspectorId,
      'user.id': req.user.id,
      'user.role': req.user.role,
    },
  });
  
  try {
    // Child span for database operation
    const dbSpan = tracer.startSpan('db.insert_job', {
      parent: span,
    });
    const job = await storage.createJob(req.body);
    dbSpan.end();
    
    span.setStatus({ code: 0 }); // OK
    span.end();
    
    res.status(201).json(job);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    span.end();
    
    throw error;
  }
});
```

### 5.2 Trace Context Propagation

**Propagate trace context across HTTP requests:**

```typescript
// Frontend: Attach trace context to API requests
import { trace, context } from '@opentelemetry/api';

async function apiRequest(url: string, options: RequestInit = {}) {
  const span = trace.getActiveSpan();
  
  if (span) {
    const traceId = span.spanContext().traceId;
    const spanId = span.spanContext().spanId;
    
    options.headers = {
      ...options.headers,
      'x-trace-id': traceId,
      'x-span-id': spanId,
    };
  }
  
  return fetch(url, options);
}
```

**Backend: Extract trace context:**

```typescript
// Middleware to extract trace context
function traceContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = req.headers['x-trace-id'];
  const spanId = req.headers['x-span-id'];
  
  if (traceId && spanId) {
    // Attach to current span
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute('parent.trace_id', traceId);
      span.setAttribute('parent.span_id', spanId);
    }
  }
  
  next();
}
```

---

## 6. Monitoring Dashboards

### 6.1 Real-Time Operational Dashboard

**Key metrics to display:**

```yaml
Dashboard: Real-Time Operations
Refresh: Every 15 seconds

Panels:
  - Title: "Current Active Users"
    Metric: active_users
    Visualization: Gauge
    Threshold: Warn if >50, Critical if >100
  
  - Title: "API Error Rate (Last 15 min)"
    Metric: rate(http_requests_total{status=~"5.."}[15m])
    Visualization: Line chart
    Threshold: Warn if >1%, Critical if >5%
  
  - Title: "p95 Response Time"
    Metric: histogram_quantile(0.95, http_request_duration_seconds)
    Visualization: Line chart
    Threshold: Warn if >500ms, Critical if >1s
  
  - Title: "Database Connection Pool"
    Metric: db_connection_pool_size{state="active"}
    Visualization: Gauge
    Threshold: Warn if >80%, Critical if >95%
  
  - Title: "Requests per Second"
    Metric: rate(http_requests_total[1m])
    Visualization: Line chart
  
  - Title: "Top Slow Endpoints"
    Metric: topk(5, http_request_duration_seconds{quantile="0.95"})
    Visualization: Table
```

### 6.2 Performance Dashboard

```yaml
Dashboard: Performance Analysis
Refresh: Every 1 minute

Panels:
  - Title: "Endpoint Latency Trends (24h)"
    Metric: http_request_duration_seconds{quantile="0.95"}
    Visualization: Multi-line chart (per endpoint)
  
  - Title: "Slow Queries (>100ms)"
    Metric: db_query_duration_seconds{quantile="0.95"} > 0.1
    Visualization: Table with query name, table, p95 duration
  
  - Title: "Frontend Bundle Size Trend"
    Metric: Custom metric from build pipeline
    Visualization: Line chart
    Alert: If bundle size >500KB
  
  - Title: "Core Web Vitals"
    Metrics:
      - LCP (Largest Contentful Paint)
      - FID (First Input Delay)
      - CLS (Cumulative Layout Shift)
    Visualization: Gauge for each metric
    Thresholds:
      - LCP: Good <2.5s, Needs improvement <4s, Poor >4s
      - FID: Good <100ms, Needs improvement <300ms, Poor >300ms
      - CLS: Good <0.1, Needs improvement <0.25, Poor >0.25
```

### 6.3 Business Metrics Dashboard

```yaml
Dashboard: Business Analytics
Refresh: Every 5 minutes

Panels:
  - Title: "Jobs Created (Last 7 Days)"
    Metric: increase(jobs_created_total[7d])
    Visualization: Bar chart (per day)
  
  - Title: "Compliance Pass Rate"
    Metric: (jobs_passed / jobs_completed) * 100
    Visualization: Gauge
    Target: >95%
  
  - Title: "Photos Uploaded Today"
    Metric: increase(photos_uploaded_total[1d])
    Visualization: Counter
  
  - Title: "Average Report Generation Time"
    Metric: avg(report_generation_duration_seconds)
    Visualization: Gauge
    Target: <2s
  
  - Title: "Top Inspectors (by job count)"
    Metric: topk(10, jobs_created_total)
    Visualization: Table
  
  - Title: "Report Success Rate"
    Metric: (reports_generated_total{status="success"} / reports_generated_total) * 100
    Visualization: Gauge
    Target: >99%
```

### 6.4 User Analytics Dashboard

```yaml
Dashboard: User Engagement
Refresh: Every 1 hour

Panels:
  - Title: "Daily Active Users (DAU)"
    Metric: count(active_users)
    Visualization: Line chart (30 days)
  
  - Title: "Feature Usage (Last 7 Days)"
    Metrics:
      - page_views{page="/jobs"}
      - page_views{page="/photos"}
      - page_views{page="/reports"}
    Visualization: Pie chart
  
  - Title: "Average Session Duration"
    Metric: avg(user_session_duration_seconds)
    Visualization: Gauge
  
  - Title: "Error Impact (% Users Affected)"
    Metric: (count(distinct user_id in errors) / count(active_users)) * 100
    Visualization: Gauge
    Threshold: Warn if >1%, Critical if >5%
  
  - Title: "User Retention (7-Day)"
    Metric: (users_active_7d_ago AND users_active_today) / users_active_7d_ago
    Visualization: Gauge
    Target: >70%
```

---

## 7. Alerting Strategy

### 7.1 Alert Levels

**Critical (P0) - Page on-call engineer immediately:**
- API error rate >5% for >5 minutes
- Database connections >95% for >2 minutes
- Disk space <10%
- Service completely down (no heartbeat for >2 minutes)
- Data loss detected (sync failures >10)

**Warning (P1) - Notify team, investigate within 1 hour:**
- API error rate >1% for >10 minutes
- p95 latency >1s for >10 minutes
- Database connections >80% for >5 minutes
- Disk space <20%
- Slow queries >500ms for >5 minutes

**Info (P2) - Log for later review:**
- New deployment
- Configuration changes
- Scheduled maintenance
- Performance improvements

### 7.2 Alert Configuration Examples

**Prometheus alert rules (alerts.yml):**

```yaml
groups:
  - name: api_alerts
    interval: 15s
    rules:
      # Critical: High error rate
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High API error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook: "https://docs.example.com/runbooks/high-error-rate"
      
      # Warning: Slow API responses
      - alert: SlowAPIResponses
        expr: |
          histogram_quantile(0.95, http_request_duration_seconds) > 1.0
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "API responses are slow"
          description: "p95 latency is {{ $value }}s (threshold: 1s)"
          runbook: "https://docs.example.com/runbooks/slow-api"
      
      # Critical: Database connection pool exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          db_connection_pool_size{state="active"} / db_connection_pool_size{state="total"} > 0.95
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"
          runbook: "https://docs.example.com/runbooks/db-connections"
      
      # Warning: Slow database queries
      - alert: SlowDatabaseQueries
        expr: |
          histogram_quantile(0.95, db_query_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Database queries are slow"
          description: "p95 query time is {{ $value }}s (threshold: 500ms)"
          runbook: "https://docs.example.com/runbooks/slow-queries"
```

**Sentry alert rules:**

```yaml
# Sentry Alert: Error spike
Rule: Error Spike
Conditions:
  - The number of events is more than 100 in 1 hour
  - AND the percentage change is more than 50% compared to 1 hour ago
Actions:
  - Send a notification to #alerts-critical on Slack
  - Send an email to on-call@example.com
Frequency: At most once every 30 minutes

# Sentry Alert: New error introduced
Rule: New Error Type
Conditions:
  - An event is first seen
  - AND the event severity is error or fatal
Actions:
  - Send a notification to #alerts-new-errors on Slack
Frequency: At most once every 15 minutes

# Sentry Alert: Performance degradation
Rule: Performance Degradation
Conditions:
  - The p95 transaction duration is more than 2 seconds
  - AND the percentage change is more than 30% compared to 1 hour ago
Actions:
  - Send a notification to #alerts-performance on Slack
Frequency: At most once every 1 hour
```

### 7.3 Alert Notification Templates

**Slack notification (using Slack Incoming Webhooks):**

```typescript
// server/alerting.ts
interface Alert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  runbook?: string;
  metric?: {
    name: string;
    value: number;
    threshold: number;
  };
}

async function sendSlackAlert(alert: Alert): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  
  const color = {
    critical: '#dc3545', // Red
    warning: '#ffc107',  // Yellow
    info: '#17a2b8',     // Blue
  }[alert.severity];
  
  const emoji = {
    critical: ':rotating_light:',
    warning: ':warning:',
    info: ':information_source:',
  }[alert.severity];
  
  const message = {
    username: 'Energy Audit Alerts',
    icon_emoji: emoji,
    attachments: [
      {
        color,
        title: alert.title,
        text: alert.description,
        fields: alert.metric ? [
          {
            title: 'Metric',
            value: alert.metric.name,
            short: true,
          },
          {
            title: 'Current Value',
            value: alert.metric.value.toFixed(2),
            short: true,
          },
          {
            title: 'Threshold',
            value: alert.metric.threshold.toFixed(2),
            short: true,
          },
        ] : [],
        footer: 'Energy Audit Monitoring',
        ts: Math.floor(Date.now() / 1000),
        actions: alert.runbook ? [
          {
            type: 'button',
            text: 'View Runbook',
            url: alert.runbook,
          },
        ] : [],
      },
    ],
  };
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

// Example usage:
await sendSlackAlert({
  severity: 'critical',
  title: 'High API Error Rate',
  description: 'API error rate is 8.5% (threshold: 5%)',
  metric: {
    name: 'http_errors_rate',
    value: 0.085,
    threshold: 0.05,
  },
  runbook: 'https://docs.example.com/runbooks/high-error-rate',
});
```

### 7.4 Alert Fatigue Prevention

**Strategies to reduce alert noise:**

1. **Alert aggregation**: Group similar alerts
```yaml
# Prometheus alertmanager.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s      # Wait 30s before sending first alert
  group_interval: 5m   # Wait 5m before sending more alerts for same group
  repeat_interval: 4h  # Resend alert if still firing after 4h
```

2. **Alert suppression during maintenance:**
```yaml
# Silence alerts during deployments
silences:
  - matchers:
      - alertname =~ ".*"
    startsAt: "2025-10-30T14:00:00Z"
    endsAt: "2025-10-30T14:30:00Z"
    createdBy: deploy-bot
    comment: "Deployment in progress"
```

3. **Intelligent thresholds**: Use dynamic thresholds based on time of day
```yaml
# Higher error rate threshold during peak hours
- alert: HighErrorRate
  expr: |
    (hour() >= 8 and hour() <= 17) and rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    or
    (hour() < 8 or hour() > 17) and rate(http_requests_total{status=~"5.."}[5m]) > 0.02
```

4. **Alert dependencies**: Don't alert on downstream failures if root cause is known
```yaml
# Don't alert on API errors if database is down
- alert: HighErrorRate
  expr: |
    rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    unless
    up{job="postgres"} == 0
```

---

## 8. Performance Monitoring

### 8.1 API Endpoint Timing

**Already covered in Section 4.2 (Prometheus metrics)**

Additional middleware for detailed timing:

```typescript
// Track timing for each middleware/handler
function timingMiddleware(name: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      req.timings = req.timings || {};
      req.timings[name] = duration;
      
      // Log cumulative timing on response
      if (name === 'total') {
        logger.info('[Request Timings]', {
          correlationId: req.correlationId,
          path: req.path,
          timings: req.timings,
        });
      }
    });
    
    next();
  };
}

// Usage:
app.use(timingMiddleware('auth'));
app.use(requireAuth);
app.use(timingMiddleware('routing'));
app.use('/api', apiRoutes);
```

### 8.2 Core Web Vitals Tracking

**Frontend performance monitoring:**

```typescript
// client/src/lib/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  });
}

export function initWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// In main.tsx:
import { initWebVitals } from './lib/webVitals';

if (import.meta.env.PROD) {
  initWebVitals();
}
```

### 8.3 Photo Processing Time Tracking

**Track specific domain operations:**

```typescript
// Photo upload with timing
router.post('/api/photos/upload', requireAuth, async (req, res) => {
  const timings: Record<string, number> = {};
  let start = Date.now();
  
  try {
    // Compression timing
    start = Date.now();
    const compressed = await compressImage(req.file);
    timings.compression = Date.now() - start;
    
    // Upload timing
    start = Date.now();
    const uploaded = await uploadToStorage(compressed);
    timings.upload = Date.now() - start;
    
    // OCR timing (if enabled)
    if (req.body.enableOCR) {
      start = Date.now();
      const text = await performOCR(uploaded);
      timings.ocr = Date.now() - start;
    }
    
    // Database insert timing
    start = Date.now();
    const photo = await storage.createPhoto({
      url: uploaded.url,
      jobId: req.body.jobId,
      text: req.body.enableOCR ? text : undefined,
    });
    timings.database = Date.now() - start;
    
    // Total timing
    const total = Object.values(timings).reduce((a, b) => a + b, 0);
    
    logger.info('[Photo Upload] Success', {
      correlationId: req.correlationId,
      photoId: photo.id,
      fileSize: req.file.size,
      timings,
      total: `${total}ms`,
    });
    
    // Emit metrics
    photosUploadedTotal.inc({ job_id: req.body.jobId });
    
    res.json({ photo, timings });
  } catch (error) {
    logger.error('[Photo Upload] Failed', {
      correlationId: req.correlationId,
      error: error.message,
      timings,
    });
    
    throw error;
  }
});
```

---

## 9. Query Performance Tracking

### 9.1 Slow Query Logging

**Drizzle query logging (already started in Section 4.3):**

Enhanced version with EXPLAIN ANALYZE:

```typescript
// server/db.ts (enhanced)
export async function executeQueryWithExplain<T>(
  queryName: string,
  sqlQuery: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 100) { // Slow query threshold: 100ms
      // Run EXPLAIN ANALYZE for slow queries
      const explainResult = await db.execute(`EXPLAIN ANALYZE ${sqlQuery}`);
      
      logger.warn('[Slow Query] Detected', {
        queryName,
        duration: `${duration}ms`,
        sql: sqlQuery,
        explain: explainResult.rows,
      });
    }
    
    return result;
  } catch (error) {
    logger.error('[Query Error]', {
      queryName,
      error: error.message,
      sql: sqlQuery,
    });
    
    throw error;
  }
}
```

### 9.2 N+1 Query Detection

**Detect N+1 query patterns:**

```typescript
// Middleware to detect N+1 queries
let queryCount = 0;
let queryLog: string[] = [];

function resetQueryTracking() {
  queryCount = 0;
  queryLog = [];
}

function trackQuery(query: string) {
  queryCount++;
  queryLog.push(query);
}

function checkForNPlusOne(req: Request) {
  const N_PLUS_ONE_THRESHOLD = 10;
  
  if (queryCount > N_PLUS_ONE_THRESHOLD) {
    logger.warn('[N+1 Query] Potential N+1 detected', {
      correlationId: req.correlationId,
      path: req.path,
      queryCount,
      queries: queryLog,
    });
  }
}

// Request middleware
function queryTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  resetQueryTracking();
  
  res.on('finish', () => {
    checkForNPlusOne(req);
  });
  
  next();
}
```

### 9.3 Connection Pool Monitoring

**Track database connection pool health:**

```typescript
// server/db.ts
import { Pool } from 'pg';
import { dbConnectionPoolSize } from './metrics';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Update metrics every 10 seconds
setInterval(() => {
  dbConnectionPoolSize.set(
    { state: 'total' },
    pool.totalCount
  );
  
  dbConnectionPoolSize.set(
    { state: 'active' },
    pool.totalCount - pool.idleCount
  );
  
  dbConnectionPoolSize.set(
    { state: 'idle' },
    pool.idleCount
  );
  
  dbConnectionPoolSize.set(
    { state: 'waiting' },
    pool.waitingCount
  );
}, 10000);

// Log pool statistics
pool.on('connect', (client) => {
  logger.debug('[DB Pool] Client connected', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('error', (err, client) => {
  logger.error('[DB Pool] Client error', {
    error: err.message,
    totalCount: pool.totalCount,
  });
});
```

---

## 10. Error Tracking Best Practices

### 10.1 Error Categorization

**Categorize errors for better triage:**

```typescript
enum ErrorCategory {
  CLIENT_ERROR = 'client_error',       // 4xx errors
  SERVER_ERROR = 'server_error',       // 5xx errors
  TRANSIENT_ERROR = 'transient_error', // Network, timeout
  PERMANENT_ERROR = 'permanent_error', // Validation, authorization
}

interface CategorizedError extends Error {
  category: ErrorCategory;
  isRetryable: boolean;
  userMessage: string;
  technicalDetails: any;
}

function categorizeError(error: any): CategorizedError {
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return {
      ...error,
      category: ErrorCategory.CLIENT_ERROR,
      isRetryable: false,
      userMessage: 'Invalid request. Please check your input.',
      technicalDetails: error,
    };
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      ...error,
      category: ErrorCategory.TRANSIENT_ERROR,
      isRetryable: true,
      userMessage: 'Network issue. Please try again.',
      technicalDetails: error,
    };
  }
  
  if (error.name === 'ValidationError') {
    return {
      ...error,
      category: ErrorCategory.PERMANENT_ERROR,
      isRetryable: false,
      userMessage: error.message,
      technicalDetails: error,
    };
  }
  
  return {
    ...error,
    category: ErrorCategory.SERVER_ERROR,
    isRetryable: true,
    userMessage: 'Something went wrong. We\'ve been notified.',
    technicalDetails: error,
  };
}

// Usage in error handler:
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const categorized = categorizeError(err);
  
  logger.error('[Request Error]', {
    correlationId: req.correlationId,
    category: categorized.category,
    isRetryable: categorized.isRetryable,
    error: categorized.message,
    technicalDetails: categorized.technicalDetails,
  });
  
  Sentry.captureException(err, {
    tags: {
      error_category: categorized.category,
      is_retryable: categorized.isRetryable,
    },
  });
  
  res.status(err.statusCode || 500).json({
    error: categorized.userMessage,
    retryable: categorized.isRetryable,
  });
});
```

### 10.2 Error Impact Analysis

**Track which errors affect the most users:**

```typescript
// Track errors by user impact
const errorUserImpact = new Map<string, Set<string>>();

function trackErrorImpact(errorFingerprint: string, userId: string) {
  if (!errorUserImpact.has(errorFingerprint)) {
    errorUserImpact.set(errorFingerprint, new Set());
  }
  
  errorUserImpact.get(errorFingerprint)!.add(userId);
}

// Report error impact periodically
setInterval(() => {
  const totalUsers = activeUsers.get();
  
  for (const [fingerprint, users] of errorUserImpact.entries()) {
    const impactPercentage = (users.size / totalUsers) * 100;
    
    if (impactPercentage > 5) { // >5% of users affected
      logger.error('[High Error Impact]', {
        errorFingerprint: fingerprint,
        affectedUsers: users.size,
        totalUsers,
        impactPercentage: impactPercentage.toFixed(2),
      });
      
      // Send alert
      sendSlackAlert({
        severity: 'critical',
        title: 'High Error Impact Detected',
        description: `Error ${fingerprint} is affecting ${impactPercentage.toFixed(2)}% of users`,
      });
    }
  }
  
  // Reset tracking
  errorUserImpact.clear();
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## 11. User Session Monitoring

### 11.1 Session Replay (Already configured in Sentry)

**Enhanced session replay with custom events:**

```typescript
// Track custom session events
function trackSessionEvent(event: string, data: any = {}) {
  Sentry.addBreadcrumb({
    category: 'session',
    message: event,
    level: 'info',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
}

// Examples:
trackSessionEvent('Feature used', { feature: 'photo_upload' });
trackSessionEvent('Workflow completed', { workflow: 'job_creation', duration: 45000 });
trackSessionEvent('Offline mode activated');
```

### 11.2 Funnel Drop-Off Analysis

**Track where users abandon workflows:**

```typescript
// Define funnels
const jobCreationFunnel = [
  'job_creation_started',
  'address_entered',
  'inspector_selected',
  'photos_uploaded',
  'job_created',
];

const funnelCompletions = new Map<string, number>();

function trackFunnelStep(funnelName: string, step: string, userId: string) {
  const key = `${funnelName}:${step}`;
  funnelCompletions.set(key, (funnelCompletions.get(key) || 0) + 1);
  
  logger.info('[Funnel] Step completed', {
    funnel: funnelName,
    step,
    userId,
  });
}

// Analyze funnel drop-off
function analyzeFunnelDropoff(funnelName: string, steps: string[]) {
  const completions = steps.map((step, index) => ({
    step,
    index,
    completions: funnelCompletions.get(`${funnelName}:${step}`) || 0,
  }));
  
  for (let i = 1; i < completions.length; i++) {
    const dropoff = completions[i - 1].completions - completions[i].completions;
    const dropoffPercentage = (dropoff / completions[i - 1].completions) * 100;
    
    if (dropoffPercentage > 20) {
      logger.warn('[Funnel] High drop-off detected', {
        funnel: funnelName,
        fromStep: completions[i - 1].step,
        toStep: completions[i].step,
        dropoffPercentage: dropoffPercentage.toFixed(2),
      });
    }
  }
}
```

---

## 12. Synthetic Monitoring

### 12.1 Health Check Endpoints

**Implement liveness and readiness probes:**

```typescript
// server/health.ts
interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
}

const healthChecks: HealthCheck[] = [
  {
    name: 'database',
    check: async () => {
      try {
        await db.execute('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'object_storage',
    check: async () => {
      try {
        // Test object storage connectivity
        await storage.testConnection();
        return true;
      } catch {
        return false;
      }
    },
  },
];

// Liveness probe (is the service running?)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe (is the service ready to accept traffic?)
app.get('/readyz', async (req, res) => {
  const results = await Promise.all(
    healthChecks.map(async (check) => ({
      name: check.name,
      healthy: await check.check(),
    }))
  );
  
  const allHealthy = results.every((r) => r.healthy);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks: results,
  });
});
```

### 12.2 Uptime Monitoring

**Use external services (e.g., UptimeRobot, Pingdom):**

```yaml
# UptimeRobot configuration
Monitors:
  - Name: "Energy Audit API - Production"
    Type: HTTP(S)
    URL: https://energy-audit.example.com/healthz
    Interval: 5 minutes
    Timeout: 30 seconds
    Alert: If down for 2 consecutive checks
    Notifications:
      - Email: alerts@example.com
      - Slack: #alerts-uptime
  
  - Name: "Energy Audit Frontend - Production"
    Type: HTTP(S)
    URL: https://energy-audit.example.com
    Interval: 5 minutes
    Timeout: 30 seconds
    Keyword: "Energy Audit" (verify page loads correctly)
    Alert: If down for 2 consecutive checks
```

### 12.3 Critical Path Testing

**Scheduled E2E tests using Playwright:**

```typescript
// tests/synthetic/critical-paths.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical User Paths', () => {
  test('Inspector can create a job', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'inspector@test.com');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-login"]');
    
    // Create job
    await page.click('[data-testid="button-create-job"]');
    await page.fill('[data-testid="input-address"]', '123 Test St');
    await page.click('[data-testid="button-save-job"]');
    
    // Verify job created
    await expect(page.locator('[data-testid="text-job-created"]')).toBeVisible();
  });
  
  test('Inspector can upload a photo', async ({ page }) => {
    // Login and navigate to job
    await page.goto('/jobs/test-job-123');
    
    // Upload photo
    const fileInput = page.locator('[data-testid="input-photo-upload"]');
    await fileInput.setInputFiles('./tests/fixtures/test-photo.jpg');
    
    // Verify upload
    await expect(page.locator('[data-testid="text-upload-success"]')).toBeVisible();
  });
});
```

**Run synthetic tests on schedule:**

```yaml
# .github/workflows/synthetic-tests.yml
name: Synthetic Monitoring
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
  workflow_dispatch:

jobs:
  synthetic-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test tests/synthetic/
        env:
          BASE_URL: https://energy-audit.example.com
      
      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"🚨 Synthetic test failure: Critical user path is broken!"}'
```

---

## 13. Log Aggregation & Search

### 13.1 Centralized Logging

**Options for log aggregation:**

1. **Better Stack (formerly Logtail)** - Recommended for Replit
2. **CloudWatch Logs** - If using AWS
3. **Datadog Logs** - Enterprise option

**Better Stack configuration:**

```typescript
// server/logger.ts (enhanced for Better Stack)
const BETTERSTACK_SOURCE_TOKEN = process.env.BETTERSTACK_SOURCE_TOKEN;

class StructuredLogger {
  // ... existing code ...
  
  private async sendToBetterStack(log: StructuredLog): Promise<void> {
    if (!BETTERSTACK_SOURCE_TOKEN || !this.isProduction) return;
    
    try {
      await fetch('https://in.logs.betterstack.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BETTERSTACK_SOURCE_TOKEN}`,
        },
        body: JSON.stringify(log),
      });
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('[Logger] Failed to send to Better Stack:', error);
    }
  }
  
  info(message: string, context?: LogContext): void {
    const log = this.formatLog('info', message, context);
    console.info(JSON.stringify(log));
    this.sendToBetterStack(log);
  }
  
  // ... similar for other log levels ...
}
```

### 13.2 Log Retention Policies

**Define retention based on log importance:**

```yaml
Log Retention Policy:
  
  Hot Storage (Fast search, expensive):
    - Duration: 30 days
    - Logs: All errors, warnings, business events
    - Cost: ~$50/month for 100GB
  
  Warm Storage (Slower search, cheaper):
    - Duration: 90 days
    - Logs: Info logs, debug logs
    - Cost: ~$20/month for 100GB
  
  Cold Storage (Archive, very cheap):
    - Duration: 1 year
    - Logs: Compliance logs, audit trails
    - Cost: ~$5/month for 100GB
  
  Deleted:
    - After 1 year (unless compliance requires longer)
```

### 13.3 Structured Query Examples

**Querying logs in Better Stack:**

```sql
-- Find all errors for a specific user
level:error AND context.userId:"test-inspector1"

-- Find slow requests (>1s)
message:"Request End" AND context.duration:>1000ms

-- Find failed photo uploads
operation:"photo_upload" AND level:error

-- Find all events for a correlation ID
context.correlationId:"abc123def456"

-- Find database connection errors
message:"Database" AND level:error

-- Count errors by endpoint (last 24 hours)
level:error
| stats count() by context.path
| sort count desc
```

---

## 14. Incident Response

### 14.1 Severity Levels

**P0 - Critical (Resolution: <1 hour):**
- Complete service outage
- Data loss or corruption
- Security breach
- >10% of users affected by errors

**P1 - High (Resolution: <4 hours):**
- Major feature broken
- Performance degraded significantly
- 5-10% of users affected

**P2 - Medium (Resolution: <1 business day):**
- Minor feature broken
- Isolated user reports
- <5% of users affected

**P3 - Low (Resolution: <1 week):**
- Cosmetic issues
- Feature enhancement requests
- Documentation updates

**P4 - Trivial (Resolution: Backlog):**
- Minor UI improvements
- Code cleanup
- Performance optimizations

### 14.2 Incident Communication Template

**Slack incident notification:**

```markdown
🚨 INCIDENT DECLARED - P0

**Title:** API High Error Rate - Job Creation Failing

**Status:** Investigating

**Impact:**
- Inspectors cannot create new jobs
- Affecting ~40 users (estimated)
- Started: 2025-10-30 14:23 UTC

**Investigation:**
- Correlation ID: abc123def456
- Error: "Database connection timeout"
- Dashboard: [View Grafana](https://grafana.example.com/incident-123)

**Next Update:** In 15 minutes

**Incident Commander:** @john-doe
**Technical Lead:** @jane-smith

---

**Update 1 (14:35 UTC):**
Root cause identified: Database connection pool exhausted due to slow queries.
Working on fix: Increasing connection pool size and optimizing queries.

**Update 2 (14:50 UTC):**
Fix deployed. Monitoring for recovery.
Error rate dropped from 45% to 2%.

**Update 3 (15:05 UTC):**
✅ RESOLVED
Error rate back to normal (<0.1%).
All services healthy.
Post-mortem scheduled for tomorrow 10:00 AM.
```

### 14.3 Post-Mortem Template

```markdown
# Post-Mortem: API High Error Rate (2025-10-30)

**Date:** 2025-10-30  
**Authors:** John Doe, Jane Smith  
**Status:** Complete  

---

## Summary

On October 30, 2025, between 14:23 and 15:05 UTC, the Energy Audit API experienced a high error rate (45%) affecting job creation. Approximately 40 inspectors were unable to create jobs during this time.

## Impact

- **Duration:** 42 minutes
- **Users Affected:** ~40 inspectors (25% of daily active users)
- **Revenue Impact:** Estimated $500 in lost productivity
- **Reputational Impact:** 3 support tickets filed

## Root Cause

The database connection pool was exhausted due to slow queries introduced in deployment `abc123` (deployed 14:00 UTC). A missing index on `jobs.inspector_id` caused table scans, increasing query time from 10ms to 800ms. With 20 connections and queries taking 800ms, the pool saturated at 25 requests/second.

## Timeline (All times UTC)

| Time  | Event |
|-------|-------|
| 14:00 | Deployment `abc123` (contained slow query) |
| 14:23 | First error alerts fire (error rate >5%) |
| 14:25 | Incident declared (P0) |
| 14:30 | Root cause identified (missing index) |
| 14:35 | Fix prepared (add index, increase pool size) |
| 14:45 | Fix deployed |
| 14:50 | Error rate dropping |
| 15:05 | Incident resolved (error rate <0.1%) |

## What Went Well

- ✅ Alerts fired within 2 minutes of issue
- ✅ Correlation IDs made debugging fast
- ✅ Fix deployed in 20 minutes
- ✅ Rollback plan ready (not needed)

## What Went Wrong

- ❌ Missing index not caught in code review
- ❌ Slow query not detected in staging
- ❌ Database connection pool alerts not configured
- ❌ No automatic rollback on error rate spike

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add missing index to production database | Jane Smith | 2025-10-30 | ✅ Complete |
| Configure connection pool alerts (>80% usage) | John Doe | 2025-10-31 | 🔄 In Progress |
| Implement query performance testing in CI/CD | Team | 2025-11-05 | 📋 Planned |
| Add automatic rollback on >10% error rate | Team | 2025-11-10 | 📋 Planned |
| Update deployment checklist (require index review) | Team | 2025-11-01 | 📋 Planned |

## Lessons Learned

1. **Test query performance in staging**: Run queries against production-sized dataset
2. **Index review in code review**: Require database review for all migrations
3. **Connection pool monitoring**: Add alerts before exhaustion, not after
4. **Automatic rollback**: Implement circuit breaker for high error rates

---

**Follow-up meeting:** November 1, 2025 at 10:00 AM
```

---

## 15. Continuous Improvement

### 15.1 Weekly Metric Reviews

**Every Monday at 10:00 AM:**

```markdown
# Weekly Observability Review - Week of 2025-10-28

## Attendees
- Engineering team
- Product manager
- On-call engineer (previous week)

## Metrics Review

### API Performance
- **p95 latency:** 450ms (target: <500ms) ✅
- **Error rate:** 0.2% (target: <1%) ✅
- **Uptime:** 99.95% (target: >99.9%) ✅

### Database Performance
- **Slow queries (>100ms):** 12 (target: <10) ⚠️
  - Action: Investigate top 3 slow queries
- **Connection pool usage:** Average 65% (peak 85%) ✅

### Business Metrics
- **Jobs created:** 247 (↑ 12% vs last week) ✅
- **Photos uploaded:** 1,834 (↑ 8% vs last week) ✅
- **Reports generated:** 189 (↓ 3% vs last week) ⚠️
  - Action: Investigate report generation drop

### User Experience
- **Core Web Vitals:** All "Good" range ✅
- **Error impact:** 0.3% of users affected ✅
- **Session duration:** Average 18 minutes (target: >15min) ✅

## Incidents
- **1 P2 incident:** Photo upload failures (2 hours, 3 users affected)
  - Root cause: Object storage rate limit
  - Fix: Implemented retry logic

## Action Items
1. Optimize slow queries identified
2. Investigate report generation drop
3. Review object storage rate limits
```

### 15.2 Monthly Performance Analysis

**First Monday of each month:**

```markdown
# Monthly Performance Analysis - October 2025

## Trends (vs September)

### Performance
- **p95 latency:** 450ms → 480ms (↑ 7%) ⚠️
  - Cause: Increased photo sizes
  - Action: Implement photo compression
- **Error rate:** 0.25% → 0.20% (↓ 20%) ✅

### Costs
- **Infrastructure:** $450/month (↑ 12%)
- **Observability tools:** $120/month (→ 0%)
- **Total:** $570/month

### Business Impact
- **Revenue per inspector:** $2,400/month (↑ 8%)
- **Inspections per day:** 3.2 (↑ 0.2)
- **Time saved by app:** 45 minutes/inspection

## Top Optimization Opportunities
1. **Photo compression:** Reduce upload time by 40%
2. **Report caching:** Reduce generation time by 60%
3. **Offline sync optimization:** Reduce battery usage by 25%

## Investments for Next Month
1. Implement photo compression pipeline
2. Add report caching layer
3. Optimize offline sync algorithm
```

### 15.3 Quarterly Observability Audit

**Every 3 months:**

```markdown
# Quarterly Observability Audit - Q4 2025

## Coverage Analysis

### Logs
- **Structured logging coverage:** 95% ✅
- **PII redaction:** 100% ✅
- **Correlation IDs:** 100% ✅
- **Missing:** Voice note transcription logs

### Metrics
- **API metrics:** Complete ✅
- **Database metrics:** Complete ✅
- **Business metrics:** 90% (missing: user retention cohorts)
- **System metrics:** Complete ✅

### Traces
- **Critical paths traced:** 80% ⚠️
- **Missing:** Report generation, offline sync

### Alerts
- **Critical alerts:** 8/8 configured ✅
- **Warning alerts:** 12/15 configured ⚠️
- **False positive rate:** 2% ✅ (target: <5%)

## ROI Analysis

### Time Saved
- **MTTR (Mean Time To Resolution):** 45 minutes (was 4 hours) ✅
- **Debugging time saved:** 15 hours/month ✅
- **Proactive issue prevention:** 8 issues/month ✅

### Cost Savings
- **Prevented outages:** 2 (estimated $2,000 saved)
- **Infrastructure optimization:** $150/month saved
- **Total savings:** $2,150/month

### Tool Costs
- **Sentry:** $50/month
- **Better Stack:** $40/month
- **Uptime monitoring:** $15/month
- **Total:** $105/month

**Net ROI:** $2,045/month ($24,540/year)

## Recommendations
1. Add tracing for report generation
2. Implement user retention cohort metrics
3. Configure missing warning alerts
4. Increase log retention from 30 to 60 days (cost: +$20/month)
```

---

## Summary & Next Steps

This observability standards document provides a comprehensive framework for production monitoring and debugging. The key takeaways:

1. **Start with structured logging** - Foundation for all observability
2. **Leverage existing Sentry setup** - Already configured, just enhance it
3. **Emit business metrics** - Understand product usage, not just system health
4. **Trace critical paths** - Identify performance bottlenecks quickly
5. **Alert on impact, not noise** - Focus on user-affecting issues
6. **Iterate continuously** - Weekly reviews, monthly analysis, quarterly audits

**Immediate next steps:**
1. Enhance server/logger.ts with structured logging (Section 2)
2. Add business metrics to key endpoints (Section 4)
3. Configure basic Prometheus alerts (Section 7)
4. Set up health check endpoints (Section 12)
5. Schedule weekly metric reviews (Section 15)

**Cost estimate:**
- Sentry: $50/month (already configured)
- Better Stack: $40/month (log aggregation)
- Uptime monitoring: $15/month
- **Total: $105/month for complete observability**

**Expected ROI:**
- Reduce MTTR from hours to minutes
- Prevent outages before users notice
- Optimize infrastructure costs by 10-15%
- Increase inspector productivity by 20%

---

**Document maintained by:** Engineering Team  
**Last reviewed:** October 30, 2025  
**Next review:** November 30, 2025
