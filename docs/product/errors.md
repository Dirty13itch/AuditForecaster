# Error Code Taxonomy & HTTP Semantics

**Last Updated**: November 2, 2025  
**Purpose**: Document all error codes, 4xx vs 5xx semantics, and correlation ID propagation  
**Enforcement**: API error handlers + TypeScript types + Unit tests

---

## Error Response Envelope

### Standard Format

All API errors MUST use this envelope:

```typescript
interface ErrorResponse {
  code: string;           // Error code (SCREAMING_SNAKE_CASE)
  message: string;        // Human-readable message
  details?: object;       // Additional context (optional)
  correlationId: string;  // Request correlation ID (UUID)
  timestamp?: number;     // Unix epoch timestamp
}
```

### Example

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Job with ID 'abc123' does not exist",
  "details": {
    "entityType": "job",
    "entityId": "abc123"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1699000000000
}
```

---

## HTTP Status Semantics

### 4xx: Client Errors (User/Request Problems)

The request is malformed or the client lacks permission.  
**Action**: Client should fix the request and retry.

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 400 Bad Request | Invalid input data | Schema validation failure, malformed JSON |
| 401 Unauthorized | Not authenticated | Missing or invalid session/token |
| 403 Forbidden | Authenticated but insufficient permissions | Role/ownership checks fail |
| 404 Not Found | Resource doesn't exist | Entity ID not in database |
| 409 Conflict | State conflict | Duplicate create, version mismatch |
| 422 Unprocessable Entity | Semantic validation failure | Business logic constraints violated |
| 429 Too Many Requests | Rate limit exceeded | Too many requests from IP/user |

### 5xx: Server Errors (Our Problems)

The server encountered an unexpected condition.  
**Action**: Client should retry with exponential backoff. Server should alert/log.

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 500 Internal Server Error | Unhandled exception | Database errors, null pointer, etc. |
| 502 Bad Gateway | Upstream service failed | External API unavailable |
| 503 Service Unavailable | Temporarily unavailable | Database maintenance, overload |
| 504 Gateway Timeout | Upstream timeout | External API took too long |

---

## Error Code Categories

### Authentication Errors (AUTH_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `AUTH_REQUIRED` | 401 | Authentication required | No session/token provided |
| `AUTH_INVALID_TOKEN` | 401 | Invalid authentication token | Token expired or malformed |
| `AUTH_SESSION_EXPIRED` | 401 | Your session has expired | Session timeout (>7 days) |
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password | Login attempt failed |
| `AUTH_ACCOUNT_DISABLED` | 403 | Your account has been disabled | User account deactivated |
| `AUTH_MFA_REQUIRED` | 403 | Multi-factor authentication required | MFA not completed |

**Examples**:
```typescript
// Missing session
if (!req.user) {
  return res.status(401).json({
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
    correlationId: req.correlationId
  });
}

// Session expired
if (session.expiresAt < Date.now()) {
  return res.status(401).json({
    code: 'AUTH_SESSION_EXPIRED',
    message: 'Your session has expired. Please log in again.',
    correlationId: req.correlationId
  });
}
```

---

### Authorization Errors (FORBIDDEN_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `FORBIDDEN` | 403 | Insufficient permissions | Generic permission failure |
| `FORBIDDEN_ROLE` | 403 | Your role does not allow this action | Role check failed |
| `FORBIDDEN_OWNERSHIP` | 403 | You do not own this resource | Ownership check failed |
| `FORBIDDEN_ADMIN_ONLY` | 403 | Admin access required | Admin-only endpoint |
| `FORBIDDEN_BUILDER_MISMATCH` | 403 | You can only access your builder's data | BuilderViewer accessing other builder |
| `FORBIDDEN_INSPECTOR_MISMATCH` | 403 | You can only access your assigned jobs | Inspector accessing other's job |

**Examples**:
```typescript
// Role check
if (!['admin', 'lead'].includes(req.user.role)) {
  return res.status(403).json({
    code: 'FORBIDDEN_ROLE',
    message: 'Your role does not allow this action',
    details: { requiredRoles: ['admin', 'lead'], userRole: req.user.role },
    correlationId: req.correlationId
  });
}

// Ownership check
if (job.inspectorId !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({
    code: 'FORBIDDEN_OWNERSHIP',
    message: 'You do not own this resource',
    details: { entityType: 'job', entityId: job.id },
    correlationId: req.correlationId
  });
}
```

---

### Resource Errors (RESOURCE_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `RESOURCE_NOT_FOUND` | 404 | Resource not found | Entity ID doesn't exist |
| `RESOURCE_ALREADY_EXISTS` | 409 | Resource already exists | Duplicate unique constraint |
| `RESOURCE_CONFLICT` | 409 | Resource state conflict | Version mismatch, concurrent edit |
| `RESOURCE_GONE` | 410 | Resource has been deleted | Soft-deleted entity |
| `RESOURCE_LOCKED` | 423 | Resource is locked | Edit lock held by another user |
| `RESOURCE_IMMUTABLE` | 422 | Resource cannot be modified | Trying to edit immutable entity (audit log) |

**Examples**:
```typescript
// Not found
const job = await storage.getJob(id);
if (!job) {
  return res.status(404).json({
    code: 'RESOURCE_NOT_FOUND',
    message: `Job with ID '${id}' does not exist`,
    details: { entityType: 'job', entityId: id },
    correlationId: req.correlationId
  });
}

// Duplicate
try {
  await storage.createBuilder(data);
} catch (error) {
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      code: 'RESOURCE_ALREADY_EXISTS',
      message: 'A builder with this name already exists',
      details: { builderName: data.name },
      correlationId: req.correlationId
    });
  }
}
```

---

### Validation Errors (VALIDATION_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input data | Generic validation failure |
| `VALIDATION_REQUIRED_FIELD` | 400 | Required field missing | Field is required but not provided |
| `VALIDATION_INVALID_FORMAT` | 400 | Invalid format | Email format, phone number, etc. |
| `VALIDATION_OUT_OF_RANGE` | 400 | Value out of range | Number too large/small |
| `VALIDATION_INVALID_ENUM` | 400 | Invalid enum value | Value not in allowed set |
| `VALIDATION_MALFORMED_JSON` | 400 | Malformed JSON | JSON parsing failed |
| `VALIDATION_SCHEMA_MISMATCH` | 400 | Schema validation failed | Zod schema error |

**Examples**:
```typescript
// Zod validation
const result = insertJobSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    code: 'VALIDATION_SCHEMA_MISMATCH',
    message: 'Schema validation failed',
    details: { errors: result.error.flatten() },
    correlationId: req.correlationId
  });
}

// Custom validation
if (req.body.scheduledDate < Date.now()) {
  return res.status(400).json({
    code: 'VALIDATION_OUT_OF_RANGE',
    message: 'Scheduled date cannot be in the past',
    details: { scheduledDate: req.body.scheduledDate },
    correlationId: req.correlationId
  });
}
```

---

### Business Logic Errors (BUSINESS_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `BUSINESS_RULE_VIOLATION` | 422 | Business rule violated | Generic business constraint |
| `BUSINESS_INVALID_STATE_TRANSITION` | 422 | Invalid state transition | Job status change not allowed |
| `BUSINESS_PREREQUISITE_NOT_MET` | 422 | Prerequisite not met | Checklist incomplete before report |
| `BUSINESS_DEADLINE_PASSED` | 422 | Deadline has passed | Action after deadline |
| `BUSINESS_CAPACITY_EXCEEDED` | 422 | Capacity limit exceeded | Max photos per job |
| `BUSINESS_DUPLICATE_OPERATION` | 409 | Operation already performed | Idempotency check |

**Examples**:
```typescript
// State transition
if (job.status === 'done' && newStatus === 'scheduled') {
  return res.status(422).json({
    code: 'BUSINESS_INVALID_STATE_TRANSITION',
    message: 'Cannot change status from done to scheduled',
    details: { currentStatus: 'done', requestedStatus: 'scheduled' },
    correlationId: req.correlationId
  });
}

// Prerequisite
const incompleteItems = checklistItems.filter(item => !item.completed && item.required);
if (incompleteItems.length > 0 && req.body.action === 'generate_report') {
  return res.status(422).json({
    code: 'BUSINESS_PREREQUISITE_NOT_MET',
    message: 'All required checklist items must be completed before generating report',
    details: { incompleteCount: incompleteItems.length },
    correlationId: req.correlationId
  });
}
```

---

### Rate Limiting Errors (RATE_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded | Too many requests |
| `RATE_LIMIT_PER_MINUTE` | 429 | Too many requests per minute | Per-minute limit |
| `RATE_LIMIT_PER_HOUR` | 429 | Too many requests per hour | Per-hour limit |
| `RATE_LIMIT_PER_DAY` | 429 | Too many requests per day | Per-day limit |

**Examples**:
```typescript
// Rate limiter middleware
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again in 15 minutes.',
      details: { retryAfter: 900 }, // seconds
      correlationId: req.correlationId
    });
  }
}));
```

---

### External Service Errors (EXTERNAL_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `EXTERNAL_SERVICE_UNAVAILABLE` | 502 | External service unavailable | Upstream API down |
| `EXTERNAL_SERVICE_TIMEOUT` | 504 | External service timeout | Upstream timeout |
| `EXTERNAL_GOOGLE_CALENDAR_ERROR` | 502 | Google Calendar API error | Calendar API failed |
| `EXTERNAL_SENDGRID_ERROR` | 502 | Email service error | SendGrid failed |
| `EXTERNAL_STORAGE_ERROR` | 502 | Object storage error | GCS upload failed |
| `EXTERNAL_SENTRY_ERROR` | 500 | Error reporting failed | Sentry unavailable (log only) |

**Examples**:
```typescript
// Google Calendar API
try {
  const events = await calendar.events.list({ ... });
} catch (error) {
  return res.status(502).json({
    code: 'EXTERNAL_GOOGLE_CALENDAR_ERROR',
    message: 'Failed to fetch calendar events from Google',
    details: { error: error.message },
    correlationId: req.correlationId
  });
}

// Object storage
try {
  await bucket.upload(file);
} catch (error) {
  return res.status(502).json({
    code: 'EXTERNAL_STORAGE_ERROR',
    message: 'Failed to upload file to object storage',
    details: { filename: file.name },
    correlationId: req.correlationId
  });
}
```

---

### Database Errors (DATABASE_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `DATABASE_ERROR` | 500 | Database error occurred | Generic DB error |
| `DATABASE_CONNECTION_ERROR` | 503 | Database connection failed | Connection pool exhausted |
| `DATABASE_QUERY_TIMEOUT` | 504 | Database query timeout | Slow query exceeded limit |
| `DATABASE_CONSTRAINT_VIOLATION` | 409 | Database constraint violation | Foreign key, check constraint |
| `DATABASE_DEADLOCK` | 500 | Database deadlock detected | Concurrent transaction conflict |

**Examples**:
```typescript
// Connection error
try {
  const result = await db.select().from(jobs);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      code: 'DATABASE_CONNECTION_ERROR',
      message: 'Database is temporarily unavailable',
      correlationId: req.correlationId
    });
  }
  
  // Generic database error
  return res.status(500).json({
    code: 'DATABASE_ERROR',
    message: 'An unexpected database error occurred',
    details: { error: error.message },
    correlationId: req.correlationId
  });
}
```

---

### File Upload Errors (UPLOAD_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `UPLOAD_FILE_TOO_LARGE` | 413 | File size exceeds limit | File > max size |
| `UPLOAD_INVALID_FILE_TYPE` | 415 | Invalid file type | MIME type not allowed |
| `UPLOAD_VIRUS_DETECTED` | 422 | File failed security scan | Virus scanner flagged file |
| `UPLOAD_CORRUPTED_FILE` | 422 | File is corrupted | File cannot be processed |
| `UPLOAD_QUOTA_EXCEEDED` | 422 | Storage quota exceeded | User storage limit reached |

**Examples**:
```typescript
// File size check
if (file.size > 50 * 1024 * 1024) { // 50MB
  return res.status(413).json({
    code: 'UPLOAD_FILE_TOO_LARGE',
    message: 'File size exceeds 50MB limit',
    details: { fileSize: file.size, maxSize: 50 * 1024 * 1024 },
    correlationId: req.correlationId
  });
}

// MIME type check
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(415).json({
    code: 'UPLOAD_INVALID_FILE_TYPE',
    message: 'Invalid file type. Only JPEG, PNG, WEBP, and PDF allowed.',
    details: { fileType: file.mimetype, allowedTypes },
    correlationId: req.correlationId
  });
}
```

---

### Sync Errors (SYNC_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `SYNC_CONFLICT` | 409 | Sync conflict detected | Offline changes conflicted |
| `SYNC_VERSION_MISMATCH` | 409 | Version mismatch | Optimistic concurrency failure |
| `SYNC_QUEUE_FULL` | 503 | Sync queue is full | Too many pending syncs |
| `SYNC_CORRUPTED_DATA` | 422 | Synced data is corrupted | Data integrity check failed |

**Examples**:
```typescript
// Version mismatch (optimistic concurrency)
const job = await storage.getJob(id);
if (job.version !== req.body.version) {
  return res.status(409).json({
    code: 'SYNC_VERSION_MISMATCH',
    message: 'This job was modified by another user. Please refresh and try again.',
    details: { 
      expectedVersion: req.body.version, 
      currentVersion: job.version 
    },
    correlationId: req.correlationId
  });
}
```

---

### Internal Errors (INTERNAL_*)

| Code | HTTP Status | Message | Cause |
|------|-------------|---------|-------|
| `INTERNAL_ERROR` | 500 | An unexpected error occurred | Unhandled exception |
| `INTERNAL_NOT_IMPLEMENTED` | 501 | Feature not yet implemented | Stub endpoint |
| `INTERNAL_CONFIGURATION_ERROR` | 500 | Server configuration error | Missing env var, bad config |

**Examples**:
```typescript
// Unhandled exception (global error handler)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack, 
    correlationId: req.correlationId 
  });
  
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Our team has been notified.',
    correlationId: req.correlationId,
    timestamp: Date.now()
  });
});

// Not implemented
app.post('/api/future-feature', (req, res) => {
  res.status(501).json({
    code: 'INTERNAL_NOT_IMPLEMENTED',
    message: 'This feature is not yet available',
    correlationId: req.correlationId
  });
});
```

---

## Correlation ID Propagation

### Request Middleware

Generate and attach correlation ID to every request:

```typescript
// server/middleware/correlationId.ts
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check for existing correlation ID from client
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Attach to request object
  req.correlationId = correlationId;
  
  // Return in response header
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

// Usage
app.use(correlationIdMiddleware);
```

### Logging Integration

Include correlation ID in all log entries:

```typescript
logger.info('Job created', { 
  jobId: job.id, 
  correlationId: req.correlationId 
});

logger.error('Failed to upload photo', { 
  photoId: photo.id, 
  error: error.message, 
  correlationId: req.correlationId 
});
```

### Frontend Propagation

Client should send correlation ID in requests:

```typescript
// client/src/lib/queryClient.ts
export async function apiRequest(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': generateCorrelationId(), // Generate on client
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }
  
  return response.json();
}
```

### Error Boundary Integration

Display correlation ID to users in error boundaries:

```typescript
// client/src/components/ErrorBoundary.tsx
function ErrorBoundary({ error }: { error: ApiError }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>An error occurred</AlertTitle>
      <AlertDescription>
        {error.message}
        <p className="text-xs mt-2 text-muted-foreground">
          Error Code: {error.code} | Correlation ID: {error.correlationId}
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Error Logging Strategy

### Log Levels

| Level | When to Use | Examples |
|-------|-------------|----------|
| ERROR | 5xx errors, unhandled exceptions | Database crashes, null pointer |
| WARN | 4xx errors (client issues) | Validation failures, permission denied |
| INFO | Successful operations | Job created, photo uploaded |
| DEBUG | Development diagnostics | Query parameters, intermediate values |

### Structured Logging

```typescript
// ERROR level (5xx)
logger.error('Database connection failed', {
  correlationId: req.correlationId,
  userId: req.user?.id,
  error: error.message,
  stack: error.stack
});

// WARN level (4xx)
logger.warn('Unauthorized access attempt', {
  correlationId: req.correlationId,
  userId: req.user?.id,
  resource: 'job',
  resourceId: jobId,
  action: 'update'
});

// INFO level (2xx)
logger.info('Job completed successfully', {
  correlationId: req.correlationId,
  userId: req.user?.id,
  jobId: job.id,
  duration: completionTime - scheduledTime
});
```

---

## Sentry Integration

### Error Capture

```typescript
import * as Sentry from '@sentry/node';

// Capture 5xx errors
if (statusCode >= 500) {
  Sentry.captureException(error, {
    tags: {
      correlationId: req.correlationId,
      userId: req.user?.id
    },
    extra: {
      url: req.url,
      method: req.method,
      body: req.body
    }
  });
}

// Capture 4xx errors as breadcrumbs (not alerts)
if (statusCode >= 400 && statusCode < 500) {
  Sentry.addBreadcrumb({
    category: 'client-error',
    message: `${statusCode} ${errorCode}`,
    level: 'warning',
    data: {
      correlationId: req.correlationId,
      url: req.url
    }
  });
}
```

---

## Client-Side Error Handling

### API Error Class

```typescript
// client/src/lib/errors.ts
export class ApiError extends Error {
  code: string;
  details?: object;
  correlationId: string;
  timestamp?: number;
  
  constructor(response: ErrorResponse) {
    super(response.message);
    this.code = response.code;
    this.details = response.details;
    this.correlationId = response.correlationId;
    this.timestamp = response.timestamp;
  }
  
  isAuthError() {
    return this.code.startsWith('AUTH_');
  }
  
  isForbiddenError() {
    return this.code.startsWith('FORBIDDEN_');
  }
  
  isValidationError() {
    return this.code.startsWith('VALIDATION_');
  }
  
  isServerError() {
    return this.code.startsWith('INTERNAL_') || this.code.startsWith('DATABASE_');
  }
}
```

### Usage in Components

```typescript
import { ApiError } from '@/lib/errors';

function JobForm() {
  const mutation = useMutation({
    mutationFn: async (data) => apiRequest('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onError: (error: ApiError) => {
      if (error.isValidationError()) {
        toast({
          title: 'Invalid Input',
          description: error.message,
          variant: 'destructive'
        });
      } else if (error.isForbiddenError()) {
        toast({
          title: 'Permission Denied',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: `${error.message} (ID: ${error.correlationId})`,
          variant: 'destructive'
        });
      }
    }
  });
}
```

---

## Testing Error Codes

### Unit Tests

```typescript
// server/__tests__/errors/validation.test.ts
describe('Validation Errors', () => {
  it('returns VALIDATION_REQUIRED_FIELD for missing required field', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .send({ /* missing required field */ });
    
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_REQUIRED_FIELD');
    expect(response.body.correlationId).toBeDefined();
  });
  
  it('returns VALIDATION_INVALID_FORMAT for bad email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email' });
    
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_INVALID_FORMAT');
    expect(response.body.details).toMatchObject({
      field: 'email',
      value: 'not-an-email'
    });
  });
});
```

### E2E Tests

```typescript
// tests/e2e/errors.spec.ts
test('displays correlation ID on error', async ({ page }) => {
  // Trigger an error
  await page.goto('/jobs/invalid-id');
  
  // Check error message includes correlation ID
  const errorText = await page.locator('[role="alert"]').textContent();
  expect(errorText).toMatch(/Correlation ID: [0-9a-f-]{36}/i);
});
```

---

## Implementation Checklist

### Backend
- [ ] Create `server/middleware/correlationId.ts`
- [ ] Create `server/middleware/errorHandler.ts`
- [ ] Create `server/lib/errors.ts` with error classes
- [ ] Add correlation ID to all log entries
- [ ] Standardize all API error responses
- [ ] Integrate Sentry error capture
- [ ] Add error code to existing error handlers

### Frontend
- [ ] Create `client/src/lib/errors.ts` with ApiError class
- [ ] Add correlation ID to API requests
- [ ] Update ErrorBoundary to show correlation ID
- [ ] Add error code handling to forms
- [ ] Create toast notification variants per error type

### Testing
- [ ] Unit tests for each error code
- [ ] E2E tests for error display
- [ ] Load test rate limiting errors
- [ ] Test correlation ID propagation

### Documentation
- [ ] Document error codes in API docs
- [ ] Add troubleshooting guide for common errors
- [ ] Update runbook with error resolution steps

---

## Error Code Registry

**Total Defined**: 60+ error codes across 11 categories

### Quick Reference

- **AUTH_*** (6 codes): Authentication failures
- **FORBIDDEN_*** (6 codes): Authorization failures
- **RESOURCE_*** (6 codes): Resource operations
- **VALIDATION_*** (7 codes): Input validation
- **BUSINESS_*** (6 codes): Business logic
- **RATE_*** (4 codes): Rate limiting
- **EXTERNAL_*** (6 codes): Third-party services
- **DATABASE_*** (5 codes): Database operations
- **UPLOAD_*** (5 codes): File uploads
- **SYNC_*** (4 codes): Offline sync
- **INTERNAL_*** (3 codes): Server errors

---

**Document Version**: 1.0  
**Next Review**: December 1, 2025  
**Maintained By**: Product Engineering Team
