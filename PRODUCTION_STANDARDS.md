# PRODUCTION STANDARDS
## AAA-Level Quality Framework for Energy Auditing Platform

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Active  
**Owner:** Engineering Team

---

## Table of Contents

1. [Introduction & Philosophy](#1-introduction--philosophy)
2. [The 40/40 Production Standard](#2-the-4040-production-standard)
3. [Performance Budgets](#3-performance-budgets)
4. [Testing Standards](#4-testing-standards)
5. [Code Quality Requirements](#5-code-quality-requirements)
6. [Observability Requirements](#6-observability-requirements)
7. [Security Standards](#7-security-standards)
8. [Accessibility Standards](#8-accessibility-standards)
9. [UX Polish Requirements](#9-ux-polish-requirements)
10. [Documentation Requirements](#10-documentation-requirements)
11. [Operational Requirements](#11-operational-requirements)
12. [Continuous Improvement](#12-continuous-improvement)

---

## 1. Introduction & Philosophy

### 1.1 What is AAA Production Quality?

AAA production quality means building software that doesn't just work, but **delights users, respects their time, and operates reliably under real-world conditions**. It's the difference between a feature that "technically functions" and one that feels polished, thoughtful, and professional.

In the context of our energy auditing platform—used by field inspectors wearing gloves in bright sunlight, working offline in basements, and racing against tight schedules—AAA quality is not optional. It's essential.

**AAA quality means:**
- **Zero ambiguity**: Users never wonder what went wrong or what to do next
- **Zero surprises**: Edge cases are handled, errors are anticipated, recovery is automatic
- **Zero friction**: Every interaction feels immediate, every workflow feels natural
- **Zero regrets**: Decisions are reversible, data is never lost, mistakes are recoverable

### 1.2 Why We Aim Higher Than "Just Working"

**"Just working" is not enough because:**

1. **Field inspectors can't afford downtime.** When an app crashes during an inspection, it's not just an inconvenience—it's lost revenue, rescheduled appointments, and frustrated customers.

2. **Trust is earned through reliability.** Users who experience data loss even once will never fully trust the app again. They'll keep paper backups, double-check everything, and eventually look for alternatives.

3. **Technical debt compounds exponentially.** A "quick fix" today becomes a maintenance nightmare tomorrow. Cutting corners on quality means spending 10x the time fixing production issues later.

4. **Your reputation is your product.** In a competitive market, the difference between "good enough" and "excellent" is the difference between churn and loyalty, between cost center and profit driver.

5. **Engineers deserve to be proud of their work.** Building something exceptional is more fulfilling, more motivating, and more sustainable than perpetually firefighting broken systems.

### 1.3 Learning From World-Class Products

We don't have to invent excellence from scratch. We can study and learn from products that have set the standard:

#### **Stripe: API Quality & Developer Experience**
- **Error messages that teach**: Every API error includes a description, fix suggestion, and link to docs
- **Obsessive consistency**: Naming conventions, response formats, and behavior patterns never surprise
- **Versioning done right**: Old versions keep working; new features opt-in gracefully
- **What we learn**: Consistency builds trust. Documentation is a feature, not an afterthought.

#### **Vercel: Deployment UX & Speed**
- **Zero-config deployments**: Git push → live site in seconds, no YAML hell
- **Instant rollbacks**: One click to undo any deployment, zero downtime
- **Preview URLs for every PR**: See changes before they go live
- **What we learn**: Speed matters. Reduce friction at every step. Make the safe path the easy path.

#### **Linear: Speed & Keyboard-First Design**
- **Instant UI responses**: No spinners, no waiting—everything feels local-first
- **Keyboard shortcuts for everything**: Power users never touch the mouse
- **Obsessive performance budgets**: Every release is faster than the last
- **What we learn**: Speed is a feature. Optimize for the expert user. Remove every unnecessary click.

#### **GitHub: Collaboration & Trust**
- **Audit logs for everything**: Every action is traceable, every change reversible
- **Graceful degradation**: Features fail independently; one broken service doesn't crash the whole platform
- **Transparent status pages**: When things break, users know immediately
- **What we learn**: Trust through transparency. Design for failure. Communicate proactively.

#### **Figma: Real-Time Collaboration & Polish**
- **Multiplayer by default**: See what teammates are doing in real-time
- **Conflict-free editing**: Multiple people can work simultaneously without stepping on each other
- **Undo that actually works**: Every action reversible, even complex multi-step operations
- **What we learn**: Collaboration is a first-class feature. State management is critical. Never lose user work.

### 1.4 The Field Inspector Lens

While we learn from developer tools and SaaS platforms, we must never forget our primary users: **field inspectors in high-pressure, unpredictable environments.**

**Our quality bar includes:**
- ✅ Works reliably offline (no network !== broken app)
- ✅ Readable in direct sunlight (high-contrast mode, large touch targets)
- ✅ Operable with gloves (48px minimum touch targets, no tiny buttons)
- ✅ Fast on 3G networks (optimized bundle sizes, progressive loading)
- ✅ Recovers from interruptions (phone calls, low battery, app backgrounding)
- ✅ Never loses data (auto-save, conflict resolution, sync queue)

**If a feature doesn't work reliably in these conditions, it doesn't ship.**

---

## 2. The 40/40 Production Standard

The 40/40 Standard is a **point-based checklist** that ensures every feature meets production-ready criteria across three tiers. Each feature must achieve **40 out of 40 points** before it's considered "done."

### 2.1 Scoring Philosophy

- **Tier 1 (20 points)**: Core functionality that makes the feature work
- **Tier 2 (10 points)**: Production hardening that makes it reliable
- **Tier 3 (10 points)**: Operational excellence that makes it maintainable

**A feature is not production-ready unless it achieves all 40 points.**

### 2.2 Tier 1: Core Functionality (20 Points)

These are the fundamentals. Without these, the feature doesn't work at all.

#### ✅ Database Schema (3 points)
- [ ] Tables defined with appropriate column types
- [ ] Primary keys and foreign keys established
- [ ] Indexes added for common query patterns
- [ ] Relationships (one-to-many, many-to-many) properly modeled
- [ ] NOT NULL constraints where appropriate
- [ ] Default values set for optional fields

**Example: Jobs table**
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  inspector_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_inspector ON jobs(inspector_id);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status != 'completed';
```

**Why it matters:** A well-designed schema prevents performance issues, data inconsistencies, and future migration headaches.

---

#### ✅ API Endpoints (3 points)
- [ ] RESTful routes follow conventions (GET /jobs, POST /jobs, PATCH /jobs/:id)
- [ ] Authentication required for protected routes
- [ ] Authorization checks prevent unauthorized access
- [ ] Request validation using Zod schemas
- [ ] Consistent response formats (success, error)
- [ ] HTTP status codes used correctly (200, 201, 400, 401, 403, 404, 500)

**Example: Create Job endpoint**
```typescript
// ✅ Good: Validated, authenticated, authorized
router.post('/api/jobs', requireAuth, async (req, res) => {
  // Validate input
  const result = insertJobSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: result.error.format() 
    });
  }

  // Check authorization (inspectors can only create jobs for themselves)
  if (req.user.role === 'inspector' && result.data.inspectorId !== req.user.id) {
    return res.status(403).json({ error: 'Cannot create jobs for other inspectors' });
  }

  const job = await storage.createJob(result.data);
  res.status(201).json(job);
});
```

**Why it matters:** Consistent, validated APIs prevent bugs, security vulnerabilities, and confusing client behavior.

---

#### ✅ Frontend UI (3 points)
- [ ] TypeScript types defined for all props and state
- [ ] Component follows existing design system (Shadcn/Radix)
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] Touch targets meet 48x48px minimum (field usability)
- [ ] Dark mode support (if app supports it)
- [ ] Accessibility attributes (ARIA labels, semantic HTML)

**Example: Job Card component**
```typescript
// ✅ Good: Typed, accessible, responsive
interface JobCardProps {
  job: SelectJob; // Type from schema
  onView: (jobId: string) => void;
  onEdit: (jobId: string) => void;
}

export function JobCard({ job, onView, onEdit }: JobCardProps) {
  return (
    <Card className="hover-elevate">
      <CardHeader>
        <CardTitle className="text-lg">{job.address}</CardTitle>
        <Badge variant={getStatusVariant(job.status)}>
          {job.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(job.scheduledDate)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={() => onView(job.id)} size="default" data-testid={`button-view-${job.id}`}>
          View Details
        </Button>
        <Button onClick={() => onEdit(job.id)} variant="outline" size="default">
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**Why it matters:** Consistent UI/UX reduces cognitive load, prevents accessibility barriers, and works reliably across devices.

---

#### ✅ Basic Error Handling (3 points)
- [ ] Try-catch blocks around async operations
- [ ] Database errors caught and logged
- [ ] API errors return meaningful messages
- [ ] Frontend displays user-friendly error messages
- [ ] Errors don't expose sensitive information
- [ ] Fallback UI when data fails to load

**Example: Error handling in API route**
```typescript
// ✅ Good: Caught, logged, user-friendly
router.get('/api/jobs/:id', requireAuth, async (req, res) => {
  try {
    const job = await storage.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        message: 'The requested job does not exist or has been deleted.'
      });
    }

    // Authorization check
    if (!canAccessJob(req.user, job)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to view this job.'
      });
    }

    res.json(job);
  } catch (error) {
    logger.error('Failed to fetch job', { jobId: req.params.id, error });
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
});
```

**Why it matters:** Graceful error handling prevents crashes, aids debugging, and maintains user trust.

---

#### ✅ Loading States (2 points)
- [ ] Skeleton loaders for initial page load
- [ ] Spinner/progress indicators for actions
- [ ] Disabled buttons during async operations
- [ ] Loading states match content structure
- [ ] No flickering or layout shifts

**Example: Jobs list with loading state**
```typescript
export function JobsList() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ['/api/jobs'] });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
```

**Why it matters:** Users need feedback that something is happening. Silence creates anxiety and confusion.

---

#### ✅ Empty States (2 points)
- [ ] Helpful message when no data exists
- [ ] Call-to-action to create first item
- [ ] Illustration or icon (not just text)
- [ ] Guidance on what to do next
- [ ] Consistent with overall design language

**Example: Empty jobs list**
```typescript
if (!jobs || jobs.length === 0) {
  return (
    <Card className="text-center p-12">
      <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
      <p className="text-muted-foreground mb-6">
        Get started by creating your first inspection job.
      </p>
      <Button onClick={onCreateJob} size="lg">
        <Plus className="h-5 w-5 mr-2" />
        Create Job
      </Button>
    </Card>
  );
}
```

**Why it matters:** Empty states are the first impression for new users. Make them inviting, not confusing.

---

#### ✅ Smoke Test Coverage (2 points)
- [ ] Bash script tests the happy path
- [ ] Tests run in CI/CD pipeline
- [ ] Covers create, read, update operations
- [ ] Validates expected response structure
- [ ] Returns non-zero exit code on failure

**Example: Smoke test for jobs**
```bash
#!/bin/bash
# scripts/smoke-test-jobs.sh

API_URL="http://localhost:5000"
ADMIN_TOKEN=$(curl -s "$API_URL/api/dev-login/test-admin" | grep -o 'session=[^;]*')

echo "✅ Creating job..."
JOB_ID=$(curl -s -X POST "$API_URL/api/jobs" \
  -H "Cookie: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address": "123 Test St", "inspectorId": "test-inspector1"}' \
  | jq -r '.id')

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job"
  exit 1
fi

echo "✅ Fetching job..."
curl -s "$API_URL/api/jobs/$JOB_ID" -H "Cookie: $ADMIN_TOKEN" | jq

echo "✅ Smoke test passed"
exit 0
```

**Why it matters:** Smoke tests catch regressions quickly and serve as executable documentation.

---

#### ✅ Basic Runbook Documentation (2 points)
- [ ] Feature purpose and scope documented
- [ ] API endpoints listed with examples
- [ ] Database tables and key relationships explained
- [ ] Common troubleshooting scenarios
- [ ] Known limitations noted

**Example: Jobs runbook section**
```markdown
## Jobs Feature

### Purpose
Manages inspection jobs assigned to field inspectors.

### API Endpoints
- `GET /api/jobs` - List all jobs (filtered by user role)
- `POST /api/jobs` - Create new job (admin/inspector)
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job (admin only)

### Database Schema
- Table: `jobs`
- Key relationships: `inspector_id` → `users.id`
- Indexes: `idx_jobs_inspector`, `idx_jobs_status`

### Troubleshooting
**Problem:** Inspector can't see their jobs  
**Solution:** Check `inspector_id` filter in query, verify user role

**Problem:** Job creation fails with 403  
**Solution:** Inspectors can only create jobs for themselves
```

**Why it matters:** Future you (and your teammates) will thank you when debugging production issues at 2 AM.

---

### 2.3 Tier 2: Production Hardening (10 Points)

Tier 2 transforms working features into **reliable, maintainable, observable** systems.

#### ✅ Unit Tests (2 points)
- [ ] Business logic tested in isolation
- [ ] Edge cases covered (null, empty, invalid inputs)
- [ ] 80% coverage minimum for feature code
- [ ] 100% coverage for critical paths (auth, payments, data integrity)
- [ ] Tests run in CI/CD pipeline
- [ ] Fast execution (<5s for unit test suite)

**Example: Compliance scoring unit test**
```typescript
// shared/scoring.test.ts
import { describe, test, expect } from 'vitest';
import { calculateComplianceScore } from './scoring';

describe('calculateComplianceScore', () => {
  test('returns 100% when all items pass', () => {
    const items = [
      { passed: true, required: true },
      { passed: true, required: true },
      { passed: true, required: false }
    ];
    expect(calculateComplianceScore(items)).toBe(100);
  });

  test('returns 0% when all required items fail', () => {
    const items = [
      { passed: false, required: true },
      { passed: false, required: true }
    ];
    expect(calculateComplianceScore(items)).toBe(0);
  });

  test('ignores optional items in score calculation', () => {
    const items = [
      { passed: true, required: true },
      { passed: false, required: false }
    ];
    expect(calculateComplianceScore(items)).toBe(100);
  });

  test('handles empty array', () => {
    expect(calculateComplianceScore([])).toBe(0);
  });
});
```

**Why it matters:** Unit tests catch regressions instantly, enable safe refactoring, and serve as living documentation.

---

#### ✅ Integration Tests (1 point)
- [ ] API endpoints tested end-to-end
- [ ] Database interactions verified
- [ ] Authentication/authorization tested
- [ ] Error cases covered (400, 401, 403, 404, 500)
- [ ] Tests use isolated test database
- [ ] Cleanup after each test (no pollution)

**Example: Integration test for job creation**
```typescript
// server/__tests__/jobs.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { testDb } from './testSetup';

describe('POST /api/jobs', () => {
  beforeEach(async () => {
    await testDb.reset(); // Clean slate for each test
  });

  test('creates job with valid data', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', testAdminSession)
      .send({
        address: '123 Main St',
        inspectorId: 'test-inspector1'
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      address: '123 Main St',
      inspectorId: 'test-inspector1',
      status: 'pending'
    });
    expect(response.body.id).toBeDefined();
  });

  test('returns 400 when address is missing', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', testAdminSession)
      .send({ inspectorId: 'test-inspector1' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('address');
  });

  test('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .send({ address: '123 Main St', inspectorId: 'test-inspector1' });

    expect(response.status).toBe(401);
  });

  test('returns 403 when inspector creates job for another inspector', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Cookie', testInspectorSession)
      .send({
        address: '123 Main St',
        inspectorId: 'other-inspector' // Not self
      });

    expect(response.status).toBe(403);
  });
});
```

**Why it matters:** Integration tests verify that components work together correctly, catching issues unit tests miss.

---

#### ✅ E2E Playwright Tests (1 point)
- [ ] Critical user journeys tested (happy path)
- [ ] Tests run against real UI in browser
- [ ] Mobile and desktop viewports covered
- [ ] Screenshots captured on failure
- [ ] Tests run in CI/CD pipeline
- [ ] Flaky tests fixed or marked as such

**Example: E2E test for job creation**
```typescript
// tests/jobs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:5000/api/dev-login/test-admin');
    await page.goto('http://localhost:5000/jobs');
  });

  test('creates new job successfully', async ({ page }) => {
    // Click create button
    await page.getByTestId('button-create-job').click();

    // Fill form
    await page.getByTestId('input-address').fill('456 Test Ave');
    await page.getByTestId('select-inspector').selectOption('test-inspector1');
    await page.getByTestId('input-scheduled-date').fill('2025-11-01');

    // Submit
    await page.getByTestId('button-submit-job').click();

    // Verify success
    await expect(page.getByText('Job created successfully')).toBeVisible();
    await expect(page.getByText('456 Test Ave')).toBeVisible();
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.getByTestId('button-create-job').click();
    await page.getByTestId('button-submit-job').click(); // Submit without filling

    await expect(page.getByText('Address is required')).toBeVisible();
    await expect(page.getByText('Inspector is required')).toBeVisible();
  });
});
```

**Why it matters:** E2E tests verify the entire stack works from the user's perspective, catching integration issues.

---

#### ✅ API Documentation (1 point)
- [ ] OpenAPI/Swagger spec generated
- [ ] Request/response examples provided
- [ ] Authentication requirements documented
- [ ] Error responses documented
- [ ] Hosted at `/api/docs` endpoint
- [ ] Kept in sync with actual implementation

**Example: OpenAPI spec**
```yaml
# server/openapi.yaml
paths:
  /api/jobs:
    post:
      summary: Create a new job
      tags: [Jobs]
      security:
        - sessionAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [address, inspectorId]
              properties:
                address:
                  type: string
                  example: "123 Main St"
                inspectorId:
                  type: string
                  example: "test-inspector1"
                scheduledDate:
                  type: string
                  format: date
                  example: "2025-11-01"
      responses:
        201:
          description: Job created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Job'
        400:
          description: Validation error
        401:
          description: Not authenticated
        403:
          description: Not authorized
```

**Why it matters:** Good documentation reduces support burden, accelerates integration, and prevents misuse.

---

#### ✅ Performance Benchmarks (1 point)
- [ ] Baseline performance metrics established
- [ ] API response times measured (p50, p95, p99)
- [ ] Database query times tracked
- [ ] Frontend bundle size monitored
- [ ] Load testing performed (target: 100 concurrent users)
- [ ] Results documented in runbook

**Example: Performance benchmarks**
```markdown
## Performance Benchmarks (as of 2025-10-30)

### API Endpoints
| Endpoint          | p50   | p95   | p99   | Notes              |
|-------------------|-------|-------|-------|--------------------|
| GET /api/jobs     | 45ms  | 120ms | 180ms | Includes auth check|
| POST /api/jobs    | 65ms  | 150ms | 220ms | Includes DB write  |
| GET /api/jobs/:id | 30ms  | 80ms  | 120ms | Single row lookup  |

### Database Queries
| Query             | p95   | Notes                      |
|-------------------|-------|----------------------------|
| List jobs         | 35ms  | Index on inspector_id used |
| Create job        | 12ms  | Single INSERT              |
| Get job by ID     | 8ms   | Primary key lookup         |

### Frontend Bundle
| Metric            | Size   | Budget | Status |
|-------------------|--------|--------|--------|
| Initial JS        | 380KB  | 500KB  | ✅ Pass |
| Initial CSS       | 45KB   | 100KB  | ✅ Pass |
| Total transferred | 425KB  | 600KB  | ✅ Pass |

### Load Testing (100 concurrent users, 5min duration)
- Total requests: 50,000
- Success rate: 99.8%
- Error rate: 0.2% (mostly timeouts)
- p95 response time: 180ms
```

**Why it matters:** You can't improve what you don't measure. Benchmarks prevent performance regressions.

---

#### ✅ Comprehensive Error Handling (1 point)
- [ ] All error paths tested
- [ ] Errors logged to Sentry with context
- [ ] User-facing errors are actionable
- [ ] Errors don't expose internals
- [ ] Retry logic for transient failures
- [ ] Circuit breakers for external dependencies

**Example: Sentry integration with context**
```typescript
import * as Sentry from '@sentry/node';

router.post('/api/jobs', requireAuth, async (req, res) => {
  try {
    const job = await storage.createJob(req.body);
    res.status(201).json(job);
  } catch (error) {
    // Add context for debugging
    Sentry.withScope((scope) => {
      scope.setContext('request', {
        body: req.body,
        userId: req.user.id,
        userRole: req.user.role
      });
      scope.setContext('job', {
        address: req.body.address,
        inspectorId: req.body.inspectorId
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });

    logger.error('Failed to create job', { error, userId: req.user.id });
    
    res.status(500).json({
      error: 'Failed to create job',
      message: 'An unexpected error occurred. Our team has been notified.'
    });
  }
});
```

**Why it matters:** Rich error context accelerates debugging and reduces mean time to resolution (MTTR).

---

#### ✅ Structured Logging (1 point)
- [ ] JSON-formatted logs (not console.log)
- [ ] Correlation IDs for request tracing
- [ ] Log levels used appropriately (DEBUG, INFO, WARN, ERROR)
- [ ] Sensitive data redacted
- [ ] Logs queryable in production
- [ ] Performance overhead measured

**Example: Structured logger**
```typescript
// server/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'energy-auditing-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Usage
logger.info('Job created', {
  correlationId: req.correlationId,
  jobId: job.id,
  userId: req.user.id,
  duration: Date.now() - req.startTime
});
```

**Why it matters:** Structured logs enable powerful queries, alerting, and debugging in production.

---

#### ✅ Input Validation (1 point)
- [ ] All inputs validated with Zod schemas
- [ ] SQL injection prevented (parameterized queries only)
- [ ] XSS prevented (proper escaping)
- [ ] File uploads validated (size, type, content)
- [ ] Rate limiting on all endpoints
- [ ] CSRF tokens required for state-changing operations

**Example: Comprehensive validation**
```typescript
// Zod schema with strict validation
const insertJobSchema = z.object({
  address: z.string().min(5).max(200),
  inspectorId: z.string().uuid(),
  scheduledDate: z.string().date().optional(),
  notes: z.string().max(5000).optional(),
  photos: z.array(z.string().url()).max(50).optional()
});

// SQL injection prevention (Drizzle uses parameterized queries)
const job = await db.query.jobs.findFirst({
  where: eq(jobs.id, jobId) // Safe: parameterized
});

// XSS prevention (React escapes by default, but verify)
<div>{job.notes}</div> // ✅ Auto-escaped
<div dangerouslySetInnerHTML={{ __html: job.notes }} /> // ❌ Never do this

// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

**Why it matters:** Input validation is your first line of defense against attacks and data corruption.

---

#### ✅ Accessibility Audit (1 point)
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/JAWS)
- [ ] Color contrast ratios measured (4.5:1 minimum)
- [ ] Focus indicators visible
- [ ] ARIA labels present on interactive elements
- [ ] Automated accessibility tests (axe-core)

**Example: Accessibility checklist**
```markdown
## Accessibility Audit: Jobs Feature

### Keyboard Navigation
- ✅ Tab order logical and complete
- ✅ All buttons reachable via keyboard
- ✅ Form inputs focusable and submittable with Enter
- ✅ Modal dialogs trappable (focus stays inside)
- ✅ Escape closes dialogs

### Screen Reader
- ✅ Job cards announce status and address
- ✅ Buttons have descriptive labels
- ✅ Form errors announced on submission
- ✅ Loading states announced

### Color Contrast
- ✅ Text: 7.2:1 (exceeds 4.5:1 minimum)
- ✅ Buttons: 5.8:1
- ✅ Status badges: 4.9:1

### ARIA Labels
- ✅ Icon buttons have aria-label
- ✅ Form inputs have associated labels
- ✅ Status indicators have aria-live regions
```

**Why it matters:** Accessibility is a legal requirement and a moral imperative. Everyone deserves access.

---

### 2.4 Tier 3: Operational Excellence (10 Points)

Tier 3 ensures features are **observable, scalable, and maintainable** in production.

#### ✅ Monitoring Dashboards (2 points)
- [ ] Key metrics visualized (requests/sec, error rate, latency)
- [ ] Real-time dashboards for operations team
- [ ] Historical trends tracked
- [ ] Drill-down capabilities for debugging
- [ ] Dashboards accessible to all engineers
- [ ] Mobile-friendly for on-call engineers

**Example: Monitoring dashboard (Grafana/Datadog)**
```markdown
## Jobs Feature Dashboard

### Top-Line Metrics
- Total jobs created (last 24h): 347
- Active inspections: 42
- Completion rate: 87%

### Performance
- API latency (p95): 145ms ✅ (target: <200ms)
- Database query time (p95): 38ms ✅ (target: <50ms)
- Error rate: 0.3% ✅ (target: <1%)

### User Activity
- Jobs created by hour (chart)
- Top inspectors by job count
- Most common job types

### Alerts
- 🟢 All systems operational
```

**Why it matters:** Real-time visibility enables proactive problem-solving before users notice issues.

---

#### ✅ Alerting (1 point)
- [ ] Critical errors trigger alerts (Slack/PagerDuty)
- [ ] Thresholds defined (error rate >5%, latency >500ms)
- [ ] Alerts include runbook links
- [ ] On-call rotation defined
- [ ] Alert fatigue prevented (no flapping alerts)
- [ ] Escalation policies configured

**Example: Alert configuration**
```yaml
# Alert: High error rate on job creation
alert: HighJobCreationErrors
expr: rate(job_creation_errors[5m]) > 0.05
for: 5m
labels:
  severity: critical
  team: backend
annotations:
  summary: "High error rate on job creation"
  description: "Job creation error rate is {{ $value }}% (threshold: 5%)"
  runbook: "https://docs.example.com/runbooks/high-job-errors"
  action: |
    1. Check Sentry for recent errors
    2. Verify database connectivity
    3. Review recent deployments
    4. Escalate to on-call engineer if unresolved in 15min
```

**Why it matters:** Fast detection → fast resolution → minimal user impact.

---

#### ✅ Load Testing (1 point)
- [ ] Tested with 100 concurrent users minimum
- [ ] Peak load scenarios tested (3x normal traffic)
- [ ] Database connection pool sizing validated
- [ ] Memory leaks checked (24-hour soak test)
- [ ] Results documented with recommendations
- [ ] Load tests run before major releases

**Example: Load test results**
```markdown
## Load Test Results: Job Creation Endpoint

### Test Configuration
- Tool: k6
- Duration: 10 minutes
- Concurrent users: 100
- Ramp-up: 30 seconds
- Request rate: 50 req/sec

### Results
| Metric           | Value   | Target  | Status |
|------------------|---------|---------|--------|
| Total requests   | 30,000  | -       | ✅      |
| Success rate     | 99.9%   | >99%    | ✅      |
| Error rate       | 0.1%    | <1%     | ✅      |
| p50 latency      | 78ms    | <100ms  | ✅      |
| p95 latency      | 145ms   | <200ms  | ✅      |
| p99 latency      | 220ms   | <500ms  | ✅      |

### Observations
- Database connection pool (max 20) never exhausted
- Memory usage stable at ~180MB
- No errors logged after initial ramp-up
- Recommendation: Current capacity sufficient for 3x growth
```

**Why it matters:** Load testing prevents outages during traffic spikes (product launches, viral growth).

---

#### ✅ Incident Response Runbook (1 point)
- [ ] Step-by-step troubleshooting guide
- [ ] Common failure modes documented
- [ ] Recovery procedures tested
- [ ] Escalation contacts listed
- [ ] Postmortem template included
- [ ] Runbook accessible during outages (offline copy)

**Example: Incident runbook**
```markdown
## Incident Response: Job Creation Failures

### Symptoms
- Users report "Failed to create job" errors
- Sentry alert: `JobCreationError`
- Dashboard shows error rate >5%

### Immediate Actions
1. **Check Sentry** for stack traces and frequency
2. **Verify database connectivity**: `SELECT 1 FROM jobs LIMIT 1`
3. **Check resource usage**: CPU, memory, disk on DB and API servers
4. **Review recent deployments**: Any changes to jobs feature in last 2 hours?

### Common Root Causes

#### Database Connection Pool Exhausted
- **Symptom**: "Connection pool timeout" errors
- **Fix**: Restart API server to reset pool
- **Prevention**: Increase pool size in `db.ts`

#### Validation Schema Mismatch
- **Symptom**: "Validation failed" with unexpected field errors
- **Fix**: Check if recent schema migration changed required fields
- **Prevention**: Better test coverage for schema changes

#### Rate Limiting Triggered
- **Symptom**: 429 errors, "Too many requests"
- **Fix**: Temporarily increase rate limit if legitimate traffic spike
- **Prevention**: Implement per-user rate limiting instead of IP-based

### Escalation
- If unresolved in 15 minutes → Page on-call backend engineer
- If database issue → Page on-call DBA
- If widespread outage → Notify incident commander

### Postmortem Template
- What happened?
- What was the impact?
- What was the root cause?
- What did we do to fix it?
- How do we prevent it in the future?
```

**Why it matters:** Runbooks reduce downtime by guiding responders through proven recovery steps.

---

#### ✅ Backup & Restore Procedures (1 point)
- [ ] Automated daily backups configured
- [ ] Backups tested monthly (restore to staging)
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Backup retention policy defined (30 days)
- [ ] Offsite backup storage (different region/cloud)
- [ ] Recovery time objective (RTO) documented

**Example: Backup strategy**
```markdown
## Backup & Restore Strategy

### Automated Backups
- **Frequency**: Daily at 2 AM UTC
- **Retention**: 30 daily, 12 monthly, 7 yearly
- **Storage**: AWS S3 (us-west-2) + replicated to us-east-1
- **Encryption**: AES-256 at rest, TLS in transit

### Point-in-Time Recovery (PITR)
- **Enabled**: Yes (Neon database supports PITR)
- **Granularity**: 1-minute intervals
- **Retention**: 7 days

### Restore Procedures
1. Identify target restore point (timestamp or backup ID)
2. Notify team (Slack #incidents channel)
3. Create new database instance from backup
4. Verify data integrity (row counts, checksums)
5. Update connection string in API server
6. Test read/write operations
7. Switch production traffic to restored database
8. Document incident in postmortem

### Recovery Metrics
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 24 hours (daily backups)
- **Last Tested**: 2025-10-15 ✅
- **Next Test**: 2025-11-15
```

**Why it matters:** Data loss is catastrophic. Tested backups are the only backups that matter.

---

#### ✅ Rollback Procedures (1 point)
- [ ] One-click rollback in deployment system
- [ ] Database migrations reversible
- [ ] Feature flags for gradual rollout
- [ ] Rollback tested in staging
- [ ] Maximum rollback time documented (target: <5 minutes)
- [ ] Rollback playbook accessible during incidents

**Example: Rollback playbook**
```markdown
## Rollback Playbook

### When to Rollback
- New deployment causes error rate >5%
- Critical functionality broken
- Performance degradation >50%
- Data corruption detected

### Rollback Steps (API/Frontend)
1. Open deployment dashboard (Vercel/Replit)
2. Click "Rollback" on previous working deployment
3. Confirm rollback in modal
4. Monitor error rate and latency for 5 minutes
5. If issues persist, escalate to engineering lead

**Expected time:** 2-3 minutes

### Rollback Steps (Database Migration)
1. Identify migration to rollback (check `migrations/` folder)
2. Run: `npm run db:migrate:rollback`
3. Verify schema reverted: `npm run db:migrate:status`
4. Restart API server
5. Monitor for errors

**Expected time:** 5-10 minutes

### Post-Rollback Actions
- Notify team in Slack #deployments channel
- Create incident ticket with details
- Schedule postmortem meeting within 24 hours
- Document root cause and prevention plan
```

**Why it matters:** Fast rollbacks minimize blast radius of bad deployments.

---

#### ✅ Performance Budgets Enforced (1 point)
- [ ] API p95 latency <200ms enforced in CI
- [ ] Frontend bundle size <500KB enforced
- [ ] Lighthouse score >90 for performance
- [ ] Database query analysis (<50ms p95)
- [ ] Automated performance regression tests
- [ ] Failing builds block deployment

**Example: Performance budget enforcement**
```yaml
# .github/workflows/performance-check.yml
name: Performance Budget Check

on: [pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build frontend
        run: npm run build
      
      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sb dist/assets/*.js | awk '{sum+=$1} END {print sum}')
          MAX_SIZE=512000  # 500KB
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "❌ Bundle size $BUNDLE_SIZE bytes exceeds limit $MAX_SIZE bytes"
            exit 1
          fi
          echo "✅ Bundle size: $BUNDLE_SIZE bytes (limit: $MAX_SIZE bytes)"
      
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: http://localhost:5000
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**Why it matters:** Performance budgets prevent regressions and ensure fast user experiences.

---

#### ✅ Security Audit (1 point)
- [ ] OWASP Top 10 vulnerabilities checked
- [ ] Dependency vulnerabilities scanned (`npm audit`)
- [ ] Secrets rotation tested
- [ ] Authentication flows audited
- [ ] Authorization matrix verified
- [ ] Penetration testing performed (if customer-facing)

**Example: Security audit checklist**
```markdown
## Security Audit: Jobs Feature

### Authentication
- ✅ All endpoints require authentication (except public APIs)
- ✅ Session tokens expire after 7 days
- ✅ CSRF protection enabled
- ✅ Logout invalidates session

### Authorization
- ✅ Inspectors can only access their own jobs
- ✅ Admins can access all jobs
- ✅ Role checks implemented server-side (not just UI)
- ✅ Resource ownership verified before updates/deletes

### Input Validation
- ✅ All inputs validated with Zod schemas
- ✅ SQL injection prevented (parameterized queries)
- ✅ XSS prevented (React auto-escaping)
- ✅ File uploads validated (type, size)

### Secrets Management
- ✅ No hardcoded API keys in code
- ✅ Environment variables used for secrets
- ✅ Secrets rotated quarterly
- ✅ Database credentials encrypted at rest

### Dependency Vulnerabilities
- ✅ No critical vulnerabilities (`npm audit`)
- ⚠️ 2 moderate vulnerabilities (tracked in backlog)

### Rate Limiting
- ✅ API rate limited (100 req/15min per IP)
- ✅ Login attempts limited (5 attempts/hour)
```

**Why it matters:** Security is not optional. Breaches destroy trust and can end companies.

---

#### ✅ Query Optimization (1 point)
- [ ] All queries analyzed with `EXPLAIN`
- [ ] Indexes added for common queries
- [ ] N+1 queries eliminated
- [ ] Connection pooling configured
- [ ] Query result caching where appropriate
- [ ] Slow query log monitored

**Example: Query optimization**
```sql
-- ❌ Before: Slow query (300ms)
SELECT * FROM jobs WHERE inspector_id = 'test-inspector1';

-- EXPLAIN shows sequential scan on 10,000 rows

-- ✅ After: Fast query (8ms)
CREATE INDEX idx_jobs_inspector ON jobs(inspector_id);

SELECT * FROM jobs WHERE inspector_id = 'test-inspector1';

-- EXPLAIN shows index scan on 42 rows
```

**Example: N+1 query elimination**
```typescript
// ❌ Before: N+1 query problem
const jobs = await db.query.jobs.findMany();
for (const job of jobs) {
  job.inspector = await db.query.users.findFirst({
    where: eq(users.id, job.inspectorId)
  });
}
// Result: 1 + N queries (1 for jobs, N for inspectors)

// ✅ After: Single query with join
const jobs = await db.query.jobs.findMany({
  with: { inspector: true }
});
// Result: 1 query with JOIN
```

**Why it matters:** Database queries are often the bottleneck. Optimization unlocks scalability.

---

#### ✅ Database Migration Strategy (1 point)
- [ ] Migrations version-controlled
- [ ] Up and down migrations defined
- [ ] Migrations tested in staging before production
- [ ] Zero-downtime migrations (when possible)
- [ ] Rollback plan for each migration
- [ ] Data migration scripts validated on production-like data

**Example: Migration strategy**
```markdown
## Database Migration Strategy

### Principles
1. **Never delete data immediately** - Mark as deleted, purge later
2. **Additive changes first** - Add new columns before removing old
3. **Gradual rollout** - Deploy in phases (add → migrate → remove)
4. **Always reversible** - Every migration has a down migration

### Example: Adding a new column (zero-downtime)

**Step 1: Add new column (nullable)**
```sql
ALTER TABLE jobs ADD COLUMN priority TEXT;
```

**Step 2: Deploy code that writes to both old and new columns**
```typescript
await db.update(jobs).set({
  status: newStatus, // Old column
  priority: calculatePriority(newStatus) // New column
});
```

**Step 3: Backfill existing rows**
```sql
UPDATE jobs SET priority = 'normal' WHERE priority IS NULL;
```

**Step 4: Make column non-nullable**
```sql
ALTER TABLE jobs ALTER COLUMN priority SET NOT NULL;
```

**Step 5: Deploy code that only uses new column**
```typescript
await db.update(jobs).set({ priority: newPriority });
```

### High-Risk Migrations
- **Column renames**: Require multi-phase deployment
- **Data type changes**: Require temporary columns
- **Adding NOT NULL**: Require backfill first
- **Removing columns**: Require deprecation period

### Testing
- ✅ Test on production-sized dataset (10M rows)
- ✅ Measure migration time (should be <5 minutes)
- ✅ Verify rollback works
- ✅ Test with active connections (simulate production load)
```

**Why it matters:** Database migrations can cause outages. Careful planning prevents disasters.

---

## 3. Performance Budgets

Performance budgets are **non-negotiable constraints** that ensure fast, responsive user experiences. Exceeding budgets triggers alerts and blocks deployments.

### 3.1 API Response Time Budgets

**Target metrics for all API endpoints:**

| Percentile | Target   | Maximum Acceptable | Alert Threshold |
|------------|----------|---------------------|-----------------|
| p50        | <100ms   | 150ms               | 120ms           |
| p95        | <200ms   | 300ms               | 250ms           |
| p99        | <500ms   | 1000ms              | 750ms           |

**Enforcement:**
- Monitored in production via Datadog/Grafana
- Load tests run in CI/CD pipeline
- Failing tests block PR merges

**Why these numbers:**
- **100ms feels instant** to users (research: Jakob Nielsen)
- **200ms is imperceptible** in most workflows
- **500ms is the threshold** where users notice delay

**Example: Monitoring query**
```sql
-- Alert when p95 latency exceeds budget
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration)
FROM api_requests
WHERE endpoint = '/api/jobs'
  AND timestamp > NOW() - INTERVAL '5 minutes';

-- If result > 200ms → trigger alert
```

---

### 3.2 Database Query Budgets

**Target metrics for all database queries:**

| Percentile | Target  | Maximum Acceptable | Alert Threshold |
|------------|---------|---------------------|-----------------|
| p50        | <20ms   | 30ms                | 25ms            |
| p95        | <50ms   | 100ms               | 75ms            |
| p99        | <100ms  | 200ms               | 150ms           |

**Common slow query causes:**
- Missing indexes (check `EXPLAIN`)
- N+1 query problems (use eager loading)
- Full table scans (add `WHERE` clause indexes)
- Unoptimized JOINs (check join order)

**Example: Query analysis**
```sql
-- Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 50
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

### 3.3 Frontend Bundle Size Budgets

**JavaScript bundle targets:**

| Bundle      | Target   | Maximum Acceptable | Notes                    |
|-------------|----------|---------------------|--------------------------|
| Initial JS  | <400KB   | 500KB               | Gzipped                  |
| Total JS    | <1.5MB   | 2MB                 | After all lazy loads     |
| Initial CSS | <50KB    | 100KB               | Gzipped                  |

**Enforcement:**
- Measured on every build
- CI fails if budget exceeded
- Webpack Bundle Analyzer used to identify bloat

**Optimization strategies:**
- Code splitting (React.lazy, dynamic imports)
- Tree shaking (remove unused code)
- Compression (gzip/brotli)
- CDN for heavy libraries

**Example: Bundle analysis**
```bash
# Generate bundle report
npm run build
npx webpack-bundle-analyzer dist/stats.json

# Check bundle size
BUNDLE_SIZE=$(du -sb dist/assets/*.js | awk '{sum+=$1} END {print sum}')
if [ $BUNDLE_SIZE -gt 512000 ]; then
  echo "❌ Bundle exceeds 500KB limit"
  exit 1
fi
```

---

### 3.4 Web Vitals Budgets

**Core Web Vitals (mobile 3G connection):**

| Metric                        | Target  | Maximum Acceptable | Measurement Tool   |
|-------------------------------|---------|---------------------|--------------------|
| Time to Interactive (TTI)     | <3s     | 5s                  | Lighthouse         |
| Largest Contentful Paint (LCP)| <2.5s   | 4s                  | Chrome DevTools    |
| First Input Delay (FID)       | <100ms  | 300ms               | Real User Monitoring |
| Cumulative Layout Shift (CLS) | <0.1    | 0.25                | Real User Monitoring |

**Why Web Vitals matter:**
- **Google ranking factor** (SEO impact)
- **User experience predictor** (strong correlation with bounce rate)
- **Mobile performance critical** (field inspectors on cellular networks)

**Example: Lighthouse budget**
```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        { "metric": "interactive", "budget": 3000 },
        { "metric": "first-contentful-paint", "budget": 1500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 500 },
        { "resourceType": "stylesheet", "budget": 100 }
      ]
    }
  ]
}
```

---

### 3.5 Database Connection Pool Budgets

**Connection pool sizing:**

| Metric              | Development | Staging | Production |
|---------------------|-------------|---------|------------|
| Min connections     | 2           | 5       | 10         |
| Max connections     | 10          | 20      | 50         |
| Idle timeout        | 10s         | 30s     | 60s        |
| Connection timeout  | 5s          | 10s     | 30s        |

**Why connection pools matter:**
- Too few connections → request queueing, slow responses
- Too many connections → database overload, OOM errors
- Misconfigured timeouts → hung requests, resource leaks

**Example: Connection pool monitoring**
```typescript
// Monitor pool metrics
setInterval(() => {
  const stats = db.getPoolStats();
  logger.info('Connection pool stats', {
    active: stats.active,
    idle: stats.idle,
    waiting: stats.waiting,
    maxConnections: stats.max
  });

  // Alert if pool is exhausted
  if (stats.waiting > 5) {
    Sentry.captureMessage('Connection pool exhausted', {
      level: 'warning',
      extra: { stats }
    });
  }
}, 60000); // Every minute
```

---

### 3.6 Memory Usage Budgets

**API server memory limits:**

| Environment  | Heap Size | RSS Limit | Alert Threshold |
|--------------|-----------|-----------|-----------------|
| Development  | 512MB     | 1GB       | N/A             |
| Staging      | 1GB       | 2GB       | 1.5GB           |
| Production   | 2GB       | 4GB       | 3GB             |

**Common memory issues:**
- Memory leaks (unbounded caches, event listeners)
- Large payloads (file uploads, image processing)
- Inefficient data structures (storing entire datasets in memory)

**Example: Memory monitoring**
```typescript
// Track memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  logger.info('Memory usage', {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB'
  });

  // Alert if memory exceeds threshold
  if (usage.rss > 3 * 1024 * 1024 * 1024) { // 3GB
    Sentry.captureMessage('High memory usage', {
      level: 'warning',
      extra: { usage }
    });
  }
}, 60000);
```

---

## 4. Testing Standards

### 4.1 Unit Testing Standards

**Coverage requirements:**
- **Business logic**: 80% minimum
- **Critical paths** (auth, payments, compliance scoring): 100%
- **Utilities and helpers**: 90%
- **UI components**: 70% (focus on logic, not JSX)

**What to test:**
- ✅ Pure functions (calculations, transformations)
- ✅ Business logic (compliance scoring, forecasting)
- ✅ Edge cases (null, empty, invalid inputs)
- ✅ Error conditions (network failures, validation errors)

**What NOT to test:**
- ❌ Third-party libraries (trust the library's tests)
- ❌ Trivial getters/setters (no logic to test)
- ❌ Framework internals (React, Express, Drizzle)

**Example: Well-tested business logic**
```typescript
// shared/compliance.ts
export function calculateComplianceScore(items: ComplianceItem[]): number {
  if (items.length === 0) return 0;
  
  const requiredItems = items.filter(item => item.required);
  if (requiredItems.length === 0) return 100;
  
  const passedItems = requiredItems.filter(item => item.passed);
  return Math.round((passedItems.length / requiredItems.length) * 100);
}

// shared/compliance.test.ts
describe('calculateComplianceScore', () => {
  test('returns 0 for empty array', () => {
    expect(calculateComplianceScore([])).toBe(0);
  });

  test('returns 100 when all required items pass', () => {
    expect(calculateComplianceScore([
      { passed: true, required: true },
      { passed: true, required: true }
    ])).toBe(100);
  });

  test('returns 50 when half of required items pass', () => {
    expect(calculateComplianceScore([
      { passed: true, required: true },
      { passed: false, required: true }
    ])).toBe(50);
  });

  test('ignores optional items', () => {
    expect(calculateComplianceScore([
      { passed: true, required: true },
      { passed: false, required: false }
    ])).toBe(100);
  });

  test('returns 100 when no required items exist', () => {
    expect(calculateComplianceScore([
      { passed: false, required: false }
    ])).toBe(100);
  });

  test('rounds to nearest integer', () => {
    expect(calculateComplianceScore([
      { passed: true, required: true },
      { passed: true, required: true },
      { passed: false, required: true }
    ])).toBe(67); // 66.666... → 67
  });
});
```

**Running tests:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- compliance.test.ts

# Watch mode
npm run test:watch
```

---

### 4.2 Integration Testing Standards

**Coverage requirements:**
- **All API endpoints** tested (CRUD operations)
- **Authentication flows** tested (login, logout, sessions)
- **Authorization rules** tested (role-based, resource ownership)
- **Error cases** tested (400, 401, 403, 404, 500)

**Integration test structure:**
```typescript
describe('POST /api/jobs', () => {
  beforeEach(async () => {
    await testDb.reset(); // Clean database before each test
  });

  describe('authentication', () => {
    test('returns 401 when not authenticated', async () => { /* ... */ });
    test('accepts valid session', async () => { /* ... */ });
  });

  describe('authorization', () => {
    test('allows admin to create jobs for any inspector', async () => { /* ... */ });
    test('allows inspector to create jobs for themselves', async () => { /* ... */ });
    test('prevents inspector from creating jobs for others', async () => { /* ... */ });
  });

  describe('validation', () => {
    test('requires address field', async () => { /* ... */ });
    test('requires inspectorId field', async () => { /* ... */ });
    test('rejects invalid date format', async () => { /* ... */ });
  });

  describe('success cases', () => {
    test('creates job with valid data', async () => { /* ... */ });
    test('returns 201 status', async () => { /* ... */ });
    test('returns created job with ID', async () => { /* ... */ });
  });
});
```

---

### 4.3 E2E Testing Standards

**Coverage requirements:**
- **Critical user journeys** (login → create job → complete inspection → view report)
- **Happy paths** (successful flows)
- **Error recovery** (network failures, validation errors)
- **Mobile and desktop** viewports

**E2E test structure:**
```typescript
// tests/jobs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000/api/dev-login/test-admin');
    await page.goto('http://localhost:5000/jobs');
  });

  test('complete job creation flow', async ({ page }) => {
    // Navigate to create form
    await page.getByTestId('button-create-job').click();
    await expect(page).toHaveURL(/\/jobs\/new/);

    // Fill form
    await page.getByTestId('input-address').fill('789 Elm St');
    await page.getByTestId('select-inspector').selectOption('test-inspector1');
    await page.getByTestId('input-scheduled-date').fill('2025-11-15');
    await page.getByTestId('textarea-notes').fill('High-priority inspection');

    // Submit
    await page.getByTestId('button-submit-job').click();

    // Verify success
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByText('Job created successfully')).toBeVisible();
    await expect(page.getByText('789 Elm St')).toBeVisible();
  });

  test('shows validation errors', async ({ page }) => {
    await page.getByTestId('button-create-job').click();
    await page.getByTestId('button-submit-job').click(); // Submit empty form

    await expect(page.getByText('Address is required')).toBeVisible();
    await expect(page.getByText('Inspector is required')).toBeVisible();
  });

  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.getByTestId('button-create-job').click();
    await page.getByTestId('input-address').fill('Mobile Test Address');
    await page.getByTestId('button-submit-job').click();

    await expect(page.getByText('Mobile Test Address')).toBeVisible();
  });
});
```

**Running E2E tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- jobs.spec.ts

# Generate HTML report
npm run test:e2e -- --reporter=html
```

---

### 4.4 Performance Testing Standards

**Load test scenarios:**
- **Baseline**: 10 concurrent users, 5-minute duration
- **Normal load**: 50 concurrent users, 10-minute duration
- **Peak load**: 100 concurrent users, 10-minute duration
- **Stress test**: Ramp up until system breaks

**Example: k6 load test**
```javascript
// tests/load/jobs.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 min
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('http://localhost:5000/api/jobs', {
    headers: { Cookie: 'session=test-session-token' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

**Running load tests:**
```bash
k6 run tests/load/jobs.js
```

---

### 4.5 Test Data Management

**Principles:**
- **Isolated**: Each test creates its own data
- **Deterministic**: Tests produce same results every run
- **Realistic**: Test data resembles production data
- **Cleaned up**: No test data pollution between runs

**Example: Test data factories**
```typescript
// tests/factories.ts
export const testFactory = {
  user: (overrides?: Partial<InsertUser>) => ({
    id: nanoid(),
    email: `test-${nanoid()}@example.com`,
    name: 'Test User',
    role: 'inspector',
    ...overrides
  }),

  job: (overrides?: Partial<InsertJob>) => ({
    id: nanoid(),
    address: '123 Test St',
    inspectorId: 'test-inspector1',
    status: 'pending',
    scheduledDate: '2025-11-01',
    ...overrides
  })
};

// Usage in tests
const admin = await testDb.insertUser(testFactory.user({ role: 'admin' }));
const job = await testDb.insertJob(testFactory.job({ inspectorId: admin.id }));
```

---

### 4.6 CI/CD Testing Requirements

**Tests that MUST pass before merge:**
- ✅ All unit tests
- ✅ All integration tests
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Bundle size check
- ✅ Accessibility tests (axe-core)

**Tests that run on deploy:**
- ✅ E2E tests (Playwright)
- ✅ Load tests (k6)
- ✅ Security scans (npm audit)

**Example: GitHub Actions workflow**
```yaml
name: CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:coverage

      - name: Integration tests
        run: npm run test:integration

      - name: Bundle size check
        run: npm run build && npm run check-bundle-size

      - name: E2E tests
        run: npm run test:e2e
```

---

## 5. Code Quality Requirements

### 5.1 TypeScript Configuration

**tsconfig.json requirements:**
```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict checks
    "noUncheckedIndexedAccess": true,  // Prevent undefined access
    "noImplicitReturns": true,   // All code paths must return
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Why strict mode matters:**
- Catches bugs at compile time (not runtime)
- Prevents `undefined` errors
- Forces explicit handling of edge cases

**Example: Strict typing**
```typescript
// ❌ Bad: Using `any` defeats TypeScript
function processJob(job: any) {
  return job.address.toUpperCase(); // Runtime error if address is undefined
}

// ✅ Good: Explicit types catch errors
function processJob(job: SelectJob) {
  if (!job.address) {
    throw new Error('Job address is required');
  }
  return job.address.toUpperCase();
}
```

---

### 5.2 ESLint Configuration

**Required rules:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "no-console": "warn",  // Use logger instead
    "no-debugger": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/prop-types": "off",  // TypeScript handles this
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Zero warnings policy:**
- All PRs must have zero ESLint warnings
- Exceptions require explicit comment justification

---

### 5.3 Code Complexity Standards

**Cyclomatic complexity limits:**
- **Functions**: <10 (ideally <5)
- **Files**: <500 lines (ideally <300)
- **Classes**: <300 lines

**How to measure:**
```bash
npx eslint-plugin-complexity --max 10 src/
```

**Example: Reducing complexity**
```typescript
// ❌ Bad: High complexity (7 branches)
function getJobStatus(job: SelectJob) {
  if (job.status === 'pending') {
    if (job.scheduledDate < new Date()) {
      return 'overdue';
    }
    return 'scheduled';
  } else if (job.status === 'in-progress') {
    if (job.inspector) {
      return 'active';
    }
    return 'unassigned';
  } else if (job.status === 'completed') {
    return 'done';
  }
  return 'unknown';
}

// ✅ Good: Reduced complexity (early returns, guard clauses)
function getJobStatus(job: SelectJob) {
  if (job.status === 'completed') return 'done';
  if (job.status === 'in-progress') {
    return job.inspector ? 'active' : 'unassigned';
  }
  if (job.status === 'pending') {
    return job.scheduledDate < new Date() ? 'overdue' : 'scheduled';
  }
  return 'unknown';
}
```

---

### 5.4 Naming Conventions

**Variables and functions:**
- `camelCase` for variables and functions
- Descriptive names (no single letters except loop counters)
- Boolean variables start with `is`, `has`, `can`, `should`

**Types and interfaces:**
- `PascalCase` for types, interfaces, classes
- `I` prefix for interfaces (optional, but consistent)

**Constants:**
- `UPPER_SNAKE_CASE` for true constants
- `camelCase` for configuration objects

**Example: Good naming**
```typescript
// ✅ Good: Clear, descriptive names
const isJobCompleted = job.status === 'completed';
const hasScheduledDate = job.scheduledDate !== null;
const canEditJob = user.role === 'admin' || job.inspectorId === user.id;

const MAX_RETRIES = 3;
const API_TIMEOUT_MS = 5000;

interface JobFilters {
  status?: string;
  inspectorId?: string;
  dateRange?: { start: Date; end: Date };
}

function calculateTotalRevenue(jobs: SelectJob[]): number {
  // ...
}

// ❌ Bad: Unclear, abbreviated names
const x = job.status === 'completed';
const dt = job.scheduledDate !== null;
const canEdit = user.role === 'admin' || job.inspectorId === user.id;

function calc(j: any[]): number {
  // ...
}
```

---

### 5.5 Function Size Standards

**Maximum function length: 50 lines**

**Why:**
- Easier to understand and test
- Fewer bugs (less room for hidden complexity)
- Better code reuse

**Example: Breaking down large functions**
```typescript
// ❌ Bad: 80-line function
async function processInspection(jobId: string, userId: string) {
  // 20 lines: Fetch job and validate
  // 20 lines: Calculate compliance score
  // 20 lines: Generate report
  // 20 lines: Send notifications
}

// ✅ Good: Extracted into smaller functions
async function processInspection(jobId: string, userId: string) {
  const job = await validateAndFetchJob(jobId, userId);
  const score = calculateComplianceScore(job.items);
  const report = await generateReport(job, score);
  await sendCompletionNotifications(job, report);
}

async function validateAndFetchJob(jobId: string, userId: string) {
  // 15 lines
}

function calculateComplianceScore(items: ComplianceItem[]) {
  // 10 lines
}

async function generateReport(job: SelectJob, score: number) {
  // 20 lines
}

async function sendCompletionNotifications(job: SelectJob, report: Report) {
  // 15 lines
}
```

---

### 5.6 Comment Standards

**When to comment:**
- ✅ Complex algorithms (why, not what)
- ✅ Non-obvious workarounds
- ✅ Public APIs (JSDoc)
- ✅ Regex patterns (what they match)

**When NOT to comment:**
- ❌ Obvious code (`i++; // increment i`)
- ❌ Commented-out code (delete it)
- ❌ TODO comments older than 1 week (create tickets instead)

**Example: Good comments**
```typescript
/**
 * Calculates compliance score based on RESNET standards.
 * 
 * @param items - List of compliance checklist items
 * @returns Percentage score (0-100)
 * 
 * Note: Only required items affect the score. Optional items are ignored
 * per RESNET Standard 380, Section 4.2.1.
 */
export function calculateComplianceScore(items: ComplianceItem[]): number {
  // Filter to required items only (per RESNET spec)
  const requiredItems = items.filter(item => item.required);
  if (requiredItems.length === 0) return 100;

  const passedItems = requiredItems.filter(item => item.passed);
  return Math.round((passedItems.length / requiredItems.length) * 100);
}

// ✅ Good: Explains non-obvious workaround
// Using setTimeout(0) to defer execution until after React re-render.
// This prevents "Cannot update a component while rendering" warning.
setTimeout(() => setSelectedJobs([]), 0);

// ❌ Bad: Obvious comment
const total = jobs.length; // Get total number of jobs
```

---

### 5.7 JSDoc for Public APIs

**All exported functions must have JSDoc:**

```typescript
/**
 * Creates a new inspection job.
 * 
 * @param data - Job creation data
 * @param data.address - Property address for inspection
 * @param data.inspectorId - ID of assigned inspector
 * @param data.scheduledDate - Scheduled inspection date (optional)
 * 
 * @returns Created job with generated ID
 * 
 * @throws {ValidationError} If required fields are missing
 * @throws {AuthorizationError} If user cannot create jobs for inspector
 * 
 * @example
 * const job = await createJob({
 *   address: '123 Main St',
 *   inspectorId: 'inspector-1',
 *   scheduledDate: '2025-11-01'
 * });
 */
export async function createJob(data: InsertJob): Promise<SelectJob> {
  // ...
}
```

---

## 6. Observability Requirements

### 6.1 Sentry Integration

**Setup requirements:**
- ✅ Sentry initialized in both frontend and backend
- ✅ Source maps uploaded for stack trace resolution
- ✅ User context attached to all errors
- ✅ Custom tags for filtering (environment, feature, user role)
- ✅ Performance monitoring enabled
- ✅ Session replay enabled (privacy settings configured)

**Example: Sentry setup**
```typescript
// server/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // Sample 10% of transactions
  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  }
});

// Usage: Add context to errors
Sentry.withScope((scope) => {
  scope.setUser({ id: req.user.id, email: req.user.email, role: req.user.role });
  scope.setTag('feature', 'jobs');
  scope.setContext('job', { jobId: job.id, status: job.status });
  Sentry.captureException(error);
});
```

---

### 6.2 Structured Logging

**Requirements:**
- ✅ JSON-formatted logs (not `console.log`)
- ✅ Log levels: DEBUG, INFO, WARN, ERROR
- ✅ Correlation IDs for request tracing
- ✅ Structured fields (userId, jobId, duration, etc.)
- ✅ No sensitive data in logs (passwords, tokens, PII)

**Example: Winston logger**
```typescript
// server/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'energy-auditing-api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage
logger.info('Job created', {
  correlationId: req.correlationId,
  jobId: job.id,
  userId: req.user.id,
  duration: Date.now() - req.startTime
});

logger.error('Failed to fetch job', {
  correlationId: req.correlationId,
  jobId,
  error: error.message,
  stack: error.stack
});
```

---

### 6.3 Request Correlation IDs

**Requirements:**
- ✅ Unique ID generated for each request
- ✅ ID propagated through entire request lifecycle
- ✅ ID included in all logs
- ✅ ID returned in response headers (`X-Correlation-ID`)

**Example: Correlation middleware**
```typescript
// server/middleware/correlation.ts
import { nanoid } from 'nanoid';

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || nanoid();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

// Usage in logs
logger.info('Processing request', {
  correlationId: req.correlationId,
  method: req.method,
  path: req.path
});
```

---

### 6.4 Performance Monitoring

**Metrics to track:**
- ✅ API endpoint response times (p50, p95, p99)
- ✅ Database query times
- ✅ External API call times
- ✅ Background job processing times
- ✅ Frontend page load times

**Example: API timing middleware**
```typescript
export function timingMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });

    // Send to monitoring service
    metrics.timing('api.request.duration', duration, {
      endpoint: req.path,
      method: req.method,
      status: res.statusCode
    });
  });

  next();
}
```

---

### 6.5 Error Rate Tracking

**Metrics to track:**
- ✅ Error rate by endpoint
- ✅ Error rate by user
- ✅ Error rate by error type
- ✅ 4xx vs 5xx errors

**Example: Error tracking**
```typescript
export function errorTrackingMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Track error metrics
  metrics.increment('api.errors', {
    endpoint: req.path,
    statusCode,
    errorType: err.name
  });

  // Log error with context
  logger.error('Request failed', {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    statusCode
  });

  // Send to Sentry
  Sentry.captureException(err);

  res.status(statusCode).json({
    error: err.message,
    correlationId: req.correlationId
  });
}
```

---

### 6.6 User Behavior Analytics

**Events to track:**
- ✅ Page views
- ✅ Feature usage (jobs created, reports generated)
- ✅ User flows (step-by-step journeys)
- ✅ Errors encountered (form validation, network failures)

**Example: Analytics tracking**
```typescript
// client/src/lib/analytics.ts
export const analytics = {
  track(event: string, properties?: Record<string, any>) {
    // Send to analytics service (Mixpanel, Amplitude, etc.)
    console.log('[Analytics]', event, properties);
    
    // Optional: Send to backend for server-side tracking
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties })
    });
  },

  page(name: string) {
    this.track('Page Viewed', { page: name });
  },

  jobCreated(jobId: string) {
    this.track('Job Created', { jobId });
  },

  reportGenerated(reportId: string, format: string) {
    this.track('Report Generated', { reportId, format });
  }
};

// Usage
analytics.page('Jobs List');
analytics.jobCreated(job.id);
```

---

### 6.7 Real-Time Dashboards

**Dashboard requirements:**
- ✅ Accessible to all engineers
- ✅ Auto-refreshing (every 30s)
- ✅ Mobile-friendly for on-call engineers
- ✅ Exportable/shareable URLs

**Key metrics to display:**
- Request rate (requests/second)
- Error rate (% of requests)
- API latency (p50, p95, p99)
- Database query time (p95)
- Active users
- Background job queue length

---

### 6.8 Alert Thresholds

**Critical alerts (page on-call engineer):**
- Error rate >5% for 5 minutes
- API latency p95 >1s for 5 minutes
- Database connection pool exhausted
- Disk usage >90%

**Warning alerts (Slack notification):**
- Error rate >2% for 5 minutes
- API latency p95 >500ms for 5 minutes
- Memory usage >80%
- Background job queue >100 items

---

## 7. Security Standards

### 7.1 Authentication Requirements

**Session-based authentication:**
- ✅ Sessions expire after 7 days of inactivity
- ✅ Sessions invalidated on logout
- ✅ Session tokens stored in HTTP-only cookies
- ✅ CSRF protection enabled for all state-changing operations

**Example: Session configuration**
```typescript
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PgSession = connectPg(session);

app.use(session({
  store: new PgSession({ pool: db }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict'
  }
}));
```

---

### 7.2 Authorization Requirements

**Role-based access control (RBAC):**
- ✅ `admin`: Full access to all resources
- ✅ `inspector`: Access to own jobs and reports
- ✅ `viewer`: Read-only access

**Resource ownership checks:**
- ✅ Inspectors can only edit/delete their own jobs
- ✅ Admins can access all resources
- ✅ Authorization checked on every request (not just UI)

**Example: Authorization middleware**
```typescript
export function requireRole(...allowedRoles: string[]) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Usage
router.delete('/api/jobs/:id', requireRole('admin'), async (req, res) => {
  // Only admins can delete jobs
});

router.get('/api/jobs/:id', requireAuth, async (req, res) => {
  const job = await storage.getJob(req.params.id);
  
  // Resource ownership check
  if (req.user.role !== 'admin' && job.inspectorId !== req.user.id) {
    return res.status(403).json({ error: 'Cannot access other inspectors\' jobs' });
  }

  res.json(job);
});
```

---

### 7.3 CSRF Protection

**Requirements:**
- ✅ CSRF tokens required for POST/PATCH/DELETE requests
- ✅ Tokens validated server-side
- ✅ Tokens rotated on each request
- ✅ SameSite cookie attribute set to 'strict'

**Example: CSRF middleware**
```typescript
import { csrfSync } from 'csrf-sync';

const { csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

app.use(csrfSynchronisedProtection);

// Frontend: Include CSRF token in requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

fetch('/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ address: '123 Main St' })
});
```

---

### 7.4 Rate Limiting

**Requirements:**
- ✅ API rate limiting: 100 requests per 15 minutes per IP
- ✅ Login rate limiting: 5 attempts per hour per IP
- ✅ File upload rate limiting: 10 uploads per hour per user
- ✅ Custom limits for expensive operations (report generation: 10/hour)

**Example: Rate limiting**
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/', apiLimiter);
app.post('/api/login', loginLimiter, loginHandler);
```

---

### 7.5 Input Validation

**Requirements:**
- ✅ All inputs validated with Zod schemas
- ✅ Validation errors returned with specific field details
- ✅ File uploads validated (type, size, content)
- ✅ No raw SQL queries (use Drizzle's parameterized queries)

**Example: Comprehensive validation**
```typescript
const insertJobSchema = z.object({
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters'),
  inspectorId: z.string().uuid('Invalid inspector ID'),
  scheduledDate: z.string().date().optional(),
  notes: z.string().max(5000).optional(),
  photos: z.array(z.string().url()).max(50, 'Maximum 50 photos allowed').optional()
});

router.post('/api/jobs', requireAuth, async (req, res) => {
  const result = insertJobSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.format()
    });
  }

  const job = await storage.createJob(result.data);
  res.status(201).json(job);
});
```

---

### 7.6 SQL Injection Prevention

**Requirements:**
- ✅ Never concatenate user input into SQL queries
- ✅ Use Drizzle's parameterized queries
- ✅ Validate all inputs before querying

**Example: Safe queries**
```typescript
// ✅ Good: Parameterized query (Drizzle automatically handles this)
const job = await db.query.jobs.findFirst({
  where: eq(jobs.id, jobId) // Safe: parameterized
});

// ✅ Good: Explicit parameterization
const jobs = await db.select()
  .from(jobs)
  .where(eq(jobs.inspectorId, req.params.inspectorId)); // Safe

// ❌ Bad: SQL injection vulnerability (never do this!)
const jobs = await db.execute(
  `SELECT * FROM jobs WHERE inspector_id = '${req.params.inspectorId}'`
);
```

---

### 7.7 XSS Prevention

**Requirements:**
- ✅ React auto-escapes all values by default
- ✅ Never use `dangerouslySetInnerHTML` without sanitization
- ✅ Sanitize user-generated HTML (use DOMPurify)
- ✅ Set `Content-Security-Policy` headers

**Example: XSS prevention**
```typescript
// ✅ Good: React auto-escapes
<div>{job.notes}</div> // Safe: <script> tags rendered as text

// ❌ Bad: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: job.notes }} /> // Dangerous!

// ✅ Good: Sanitized HTML
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.notes) }} />

// ✅ Good: CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  next();
});
```

---

### 7.8 Dependency Security Scanning

**Requirements:**
- ✅ Run `npm audit` weekly
- ✅ Fix critical vulnerabilities immediately
- ✅ Fix high vulnerabilities within 1 week
- ✅ Track moderate/low vulnerabilities in backlog
- ✅ Automated scanning in CI/CD

**Example: Security audit workflow**
```bash
# Run security audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Generate detailed report
npm audit --json > security-audit.json
```

---

### 7.9 Secrets Management

**Requirements:**
- ✅ No hardcoded secrets in code
- ✅ Use environment variables for all secrets
- ✅ Never commit `.env` files to Git
- ✅ Rotate secrets quarterly
- ✅ Use secret management service in production (AWS Secrets Manager, Vault)

**Example: Secrets management**
```typescript
// ✅ Good: Environment variables
const apiKey = process.env.SENDGRID_API_KEY;

// ❌ Bad: Hardcoded secret
const apiKey = 'SG.abc123...'; // Never do this!

// ✅ Good: Validate required secrets on startup
const requiredSecrets = ['DATABASE_URL', 'SESSION_SECRET', 'SENTRY_DSN'];
for (const secret of requiredSecrets) {
  if (!process.env[secret]) {
    throw new Error(`Missing required secret: ${secret}`);
  }
}
```

---

### 7.10 Audit Logging

**Requirements:**
- ✅ Log all authentication events (login, logout, failed attempts)
- ✅ Log all data modifications (create, update, delete)
- ✅ Log all permission changes (role assignments)
- ✅ Include user ID, IP address, timestamp, action
- ✅ Audit logs immutable and tamper-proof

**Example: Audit logging**
```typescript
async function auditLog(action: string, userId: string, details: any) {
  await db.insert(auditLogs).values({
    action,
    userId,
    ipAddress: req.ip,
    timestamp: new Date(),
    details: JSON.stringify(details)
  });
}

// Usage
router.delete('/api/jobs/:id', requireRole('admin'), async (req, res) => {
  const job = await storage.deleteJob(req.params.id);
  
  await auditLog('job.deleted', req.user.id, {
    jobId: req.params.id,
    jobAddress: job.address
  });

  res.json({ success: true });
});
```

---

## 8. Accessibility Standards

### 8.1 WCAG 2.1 AA Compliance

**Requirements:**
- ✅ All interactive elements keyboard accessible
- ✅ Color contrast ratios meet 4.5:1 minimum
- ✅ Focus indicators visible
- ✅ Screen reader support (ARIA labels)
- ✅ Forms have associated labels
- ✅ Errors announced to screen readers

**Testing tools:**
- axe DevTools browser extension
- Lighthouse accessibility audit
- Manual testing with NVDA/JAWS screen readers

---

### 8.2 Keyboard Navigation

**Requirements:**
- ✅ All functionality accessible via keyboard
- ✅ Logical tab order
- ✅ Modal dialogs trap focus
- ✅ Escape key closes dialogs
- ✅ Enter key submits forms
- ✅ Arrow keys navigate lists/menus

**Example: Keyboard navigation**
```typescript
export function JobDialog({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <input ref={firstInputRef} /> {/* Auto-focus first input */}
          <Button type="submit">Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 8.3 Screen Reader Support

**Requirements:**
- ✅ Icon buttons have `aria-label`
- ✅ Form inputs have associated `<label>` elements
- ✅ Loading states announced with `aria-live`
- ✅ Error messages announced
- ✅ Landmarks used (`<nav>`, `<main>`, `<aside>`)

**Example: Screen reader support**
```typescript
// ✅ Good: Icon button with aria-label
<Button size="icon" aria-label="Delete job">
  <Trash className="h-4 w-4" />
</Button>

// ✅ Good: Form with associated labels
<Label htmlFor="address">Address</Label>
<Input id="address" name="address" />

// ✅ Good: Loading state announced
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Loading jobs...' : `${jobs.length} jobs found`}
</div>

// ✅ Good: Error message announced
<div role="alert" aria-live="assertive">
  {error && <p>{error.message}</p>}
</div>
```

---

### 8.4 Color Contrast

**Requirements:**
- ✅ Normal text: 4.5:1 minimum contrast
- ✅ Large text (18px+): 3:1 minimum contrast
- ✅ UI components: 3:1 minimum contrast
- ✅ No color-only indicators (use icons too)

**Testing:**
```bash
# Use WebAIM Contrast Checker
# https://webaim.org/resources/contrastchecker/

# Or use browser DevTools
# Chrome DevTools → Elements → Computed → Accessibility
```

---

### 8.5 Focus Indicators

**Requirements:**
- ✅ All interactive elements have visible focus state
- ✅ Focus indicators meet 3:1 contrast ratio
- ✅ Focus order logical and predictable

**Example: Focus indicators**
```css
/* ✅ Good: Visible focus indicator */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* ✅ Good: Custom focus ring */
.custom-input:focus-visible {
  ring: 2px solid hsl(var(--ring));
}
```

---

### 8.6 Touch Targets

**Requirements:**
- ✅ All touch targets minimum 48x48px (per design guidelines)
- ✅ Adequate spacing between touch targets (8px minimum)
- ✅ No tiny buttons or links

**Example: Touch target sizing**
```typescript
// ✅ Good: 48x48px touch target
<Button size="icon" className="h-12 w-12">
  <Plus className="h-5 w-5" />
</Button>

// ❌ Bad: Touch target too small
<button className="h-6 w-6">
  <Plus />
</button>
```

---

### 8.7 Responsive Design

**Requirements:**
- ✅ Mobile-first design (320px minimum width)
- ✅ Tablet support (768px - 1024px)
- ✅ Desktop support (>1024px)
- ✅ No horizontal scrolling
- ✅ Touch-friendly on mobile, keyboard-friendly on desktop

---

## 9. UX Polish Requirements

### 9.1 Loading States

**Requirements:**
- ✅ Skeleton loaders for initial content
- ✅ Spinners for actions (button submits)
- ✅ Progress bars for long operations
- ✅ No blank screens or sudden content pops

**Example: Skeleton loaders**
```typescript
export function JobsList() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ['/api/jobs'] });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return jobs.map(job => <JobCard key={job.id} job={job} />);
}
```

---

### 9.2 Optimistic Updates

**Requirements:**
- ✅ UI updates immediately on user action
- ✅ Rollback on error
- ✅ Success/error toast after server confirms

**Example: Optimistic update**
```typescript
const updateJobMutation = useMutation({
  mutationFn: (data: { id: string; status: string }) =>
    apiRequest(`/api/jobs/${data.id}`, 'PATCH', data),
  
  onMutate: async (newJob) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['/api/jobs'] });

    // Snapshot previous value
    const previousJobs = queryClient.getQueryData(['/api/jobs']);

    // Optimistically update cache
    queryClient.setQueryData(['/api/jobs'], (old: SelectJob[]) =>
      old.map(job => job.id === newJob.id ? { ...job, ...newJob } : job)
    );

    return { previousJobs };
  },

  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['/api/jobs'], context.previousJobs);
    toast({ title: 'Error', description: 'Failed to update job' });
  },

  onSuccess: () => {
    toast({ title: 'Success', description: 'Job updated' });
  }
});
```

---

### 9.3 Error Messages

**Requirements:**
- ✅ Specific, actionable error messages
- ✅ No technical jargon or stack traces
- ✅ Suggest next steps
- ✅ Include support contact for critical errors

**Example: Good error messages**
```typescript
// ❌ Bad: Generic error
"An error occurred"

// ✅ Good: Specific, actionable
"Failed to create job. Please check that the address is valid and try again."

// ✅ Better: With recovery action
"Failed to create job because the inspector is at maximum capacity. Please assign to a different inspector or schedule for a later date."

// ✅ Best: With support contact
"We couldn't process your request due to a server error. Our team has been notified. If this persists, contact support@example.com with error code: ERR-12345."
```

---

### 9.4 Empty States

**Requirements:**
- ✅ Helpful message explaining why empty
- ✅ Call-to-action to create first item
- ✅ Illustration or icon
- ✅ Guidance on next steps

**Example: Empty state**
```typescript
if (!jobs || jobs.length === 0) {
  return (
    <Card className="text-center p-12">
      <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Get started by creating your first inspection job. You can assign it to an inspector and schedule a date.
      </p>
      <Button onClick={onCreateJob} size="lg">
        <Plus className="h-5 w-5 mr-2" />
        Create Your First Job
      </Button>
    </Card>
  );
}
```

---

### 9.5 Success Confirmations

**Requirements:**
- ✅ Toast notifications for actions
- ✅ Success icons (checkmark)
- ✅ Auto-dismiss after 3-5 seconds
- ✅ Option to undo destructive actions

**Example: Success toast**
```typescript
import { toast } from '@/hooks/use-toast';

const createJobMutation = useMutation({
  mutationFn: (data: InsertJob) => apiRequest('/api/jobs', 'POST', data),
  onSuccess: (job) => {
    toast({
      title: '✅ Job created',
      description: `Job at ${job.address} has been created successfully.`,
      action: <Button onClick={() => router.push(`/jobs/${job.id}`)}>View Job</Button>
    });
  }
});
```

---

### 9.6 Undo for Destructive Actions

**Requirements:**
- ✅ Delete actions show undo toast for 5 seconds
- ✅ Soft delete (mark as deleted, purge later)
- ✅ Undo restores immediately

**Example: Undo delete**
```typescript
const deleteJobMutation = useMutation({
  mutationFn: (jobId: string) => apiRequest(`/api/jobs/${jobId}`, 'DELETE'),
  onSuccess: (deletedJob) => {
    let undone = false;

    toast({
      title: 'Job deleted',
      description: `${deletedJob.address} has been deleted.`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            undone = true;
            await apiRequest(`/api/jobs/${deletedJob.id}/restore`, 'POST');
            queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
            toast({ title: 'Job restored' });
          }}
        >
          Undo
        </Button>
      ),
      duration: 5000
    });

    // After 5 seconds, permanent delete (if not undone)
    setTimeout(() => {
      if (!undone) {
        apiRequest(`/api/jobs/${deletedJob.id}/purge`, 'DELETE');
      }
    }, 5000);
  }
});
```

---

### 9.7 Keyboard Shortcuts

**Requirements:**
- ✅ Common shortcuts documented
- ✅ Shortcuts shown in tooltips
- ✅ `?` key shows shortcut help modal

**Common shortcuts:**
- `Ctrl+K` or `Cmd+K`: Command palette
- `N`: New item
- `S`: Search
- `Escape`: Close modal
- `/`: Focus search
- `?`: Show shortcuts help

---

### 9.8 Smooth Animations

**Requirements:**
- ✅ 60fps animations (16.67ms frame time)
- ✅ Purpose-driven (not just decorative)
- ✅ Respect `prefers-reduced-motion`
- ✅ CSS transitions preferred over JavaScript

**Example: Smooth animation**
```css
/* ✅ Good: CSS transition */
.card {
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

/* ✅ Good: Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

---

### 9.9 Consistent Spacing

**Requirements:**
- ✅ Use Tailwind spacing scale (4, 6, 8, 12, 16, 24)
- ✅ Consistent card padding (p-6 desktop, p-4 mobile)
- ✅ Consistent gaps between elements (gap-4, gap-6)

---

### 9.10 Dark Mode

**Requirements:**
- ✅ Toggle accessible from header
- ✅ Preference persisted in localStorage
- ✅ All components support dark mode
- ✅ Color contrast maintained in dark mode

---

## 10. Documentation Requirements

### 10.1 Runbook Documentation

**Required sections:**
- ✅ Feature overview and purpose
- ✅ Architecture diagram (if complex)
- ✅ API endpoints with examples
- ✅ Database schema and relationships
- ✅ Common troubleshooting scenarios
- ✅ Performance benchmarks
- ✅ Known limitations

---

### 10.2 API Documentation

**Requirements:**
- ✅ OpenAPI/Swagger spec
- ✅ Request/response examples
- ✅ Authentication requirements
- ✅ Error responses documented
- ✅ Rate limits documented
- ✅ Hosted at `/api/docs`

---

### 10.3 Inline Code Comments

**When to comment:**
- ✅ Complex algorithms
- ✅ Non-obvious workarounds
- ✅ Regex patterns
- ✅ Performance optimizations

---

### 10.4 README

**Required sections:**
- ✅ Project description
- ✅ Getting started (setup instructions)
- ✅ Running the project
- ✅ Running tests
- ✅ Deployment instructions
- ✅ Contributing guidelines
- ✅ License

---

### 10.5 Architecture Decision Records (ADRs)

**Format:**
```markdown
# ADR-001: Use PostgreSQL for Database

**Date:** 2025-10-30  
**Status:** Accepted

## Context
We need a relational database to store inspection jobs, compliance data, and user information.

## Decision
Use PostgreSQL (via Neon) as our primary database.

## Rationale
- Strong ACID guarantees (critical for compliance data)
- Rich query capabilities (complex reporting requirements)
- Excellent performance for our data model
- Neon provides auto-scaling and zero-downtime migrations

## Consequences
- **Positive:** Strong data integrity, powerful queries, mature ecosystem
- **Negative:** More complex than NoSQL for simple CRUD operations

## Alternatives Considered
- MongoDB: Not suitable for relational data
- MySQL: Less feature-rich than PostgreSQL
- SQLite: Not suitable for multi-user production
```

---

### 10.6 Troubleshooting Guide

**Format:**
```markdown
## Troubleshooting Guide

### Problem: Jobs not loading

**Symptoms:**
- Empty jobs list
- Spinner never stops
- Console errors about CORS

**Possible Causes:**
1. API server not running
2. Database connection failed
3. Session expired

**Solutions:**
1. Check API server is running: `curl http://localhost:5000/api/health`
2. Check database connection: `npm run db:check`
3. Re-login: `http://localhost:5000/api/dev-login/test-admin`
```

---

## 11. Operational Requirements

### 11.1 Backup Strategy

**Requirements:**
- ✅ Automated daily backups
- ✅ 30-day retention
- ✅ Offsite storage (different region)
- ✅ Encrypted at rest
- ✅ Tested monthly

---

### 11.2 Restore Procedure

**Requirements:**
- ✅ Documented step-by-step
- ✅ Tested in staging monthly
- ✅ RTO (Recovery Time Objective): <1 hour
- ✅ RPO (Recovery Point Objective): 24 hours

---

### 11.3 Incident Response Playbook

**Requirements:**
- ✅ Step-by-step troubleshooting
- ✅ Escalation contacts
- ✅ Common failure modes documented
- ✅ Postmortem template

---

### 11.4 Rollback Procedure

**Requirements:**
- ✅ One-click rollback
- ✅ Tested in staging
- ✅ Maximum rollback time: <5 minutes
- ✅ Database migration rollback plan

---

### 11.5 Monitoring Dashboards

**Requirements:**
- ✅ Key metrics visualized
- ✅ Real-time updates
- ✅ Mobile-friendly
- ✅ Accessible to all engineers

---

### 11.6 Alerting

**Requirements:**
- ✅ Critical alerts page on-call engineer
- ✅ Warning alerts go to Slack
- ✅ Runbook links included
- ✅ Escalation policies defined

---

### 11.7 On-Call Rotation

**Requirements:**
- ✅ Rotation schedule published
- ✅ Handoff procedures documented
- ✅ Runbooks accessible 24/7
- ✅ Postmortem reviews after incidents

---

### 11.8 Change Management

**Requirements:**
- ✅ All changes deployed via CI/CD
- ✅ Feature flags for gradual rollout
- ✅ Deployments announced in Slack
- ✅ Rollback plan for every deployment

---

## 12. Continuous Improvement

### 12.1 Performance Reviews

**Frequency:** Monthly

**Activities:**
- Review performance metrics (API latency, bundle size)
- Identify regressions
- Plan optimizations

---

### 12.2 User Feedback Integration

**Frequency:** Ongoing

**Activities:**
- Collect user feedback (surveys, support tickets)
- Prioritize feature requests
- Fix usability issues

---

### 12.3 Technical Debt Tracking

**Frequency:** Weekly

**Activities:**
- Document technical debt in backlog
- Prioritize debt paydown
- Allocate 20% of sprint to debt reduction

---

### 12.4 Quarterly Security Audits

**Frequency:** Quarterly

**Activities:**
- Run `npm audit` and fix vulnerabilities
- Review authentication/authorization logic
- Update dependencies
- Rotate secrets

---

### 12.5 Dependency Updates

**Frequency:** Weekly

**Activities:**
- Update dependencies to latest minor versions
- Test for breaking changes
- Update major versions quarterly (with testing)

---

### 12.6 Performance Regression Tracking

**Frequency:** Every deployment

**Activities:**
- Run performance tests in CI/CD
- Compare metrics to baseline
- Block deployment if regression detected

---

### 12.7 A/B Testing Framework

**Requirements:**
- ✅ Feature flags for gradual rollout
- ✅ Metrics tracking per variant
- ✅ Statistical significance analysis
- ✅ Automated winner selection

---

## Conclusion

These production standards represent our commitment to **engineering excellence**. They are not bureaucratic checkboxes, but guardrails that enable us to move fast without breaking things.

**Remember:**
- ✅ Quality is not optional—it's the default
- ✅ Every feature must achieve 40/40 points before shipping
- ✅ Performance budgets are non-negotiable
- ✅ Security and accessibility are first-class requirements
- ✅ Users deserve software that respects their time and trust

**When in doubt, ask:**
- Would I be proud to show this to a world-class engineer?
- Would I trust this in a high-stakes production environment?
- Would my users describe this as "polished" and "professional"?

If the answer is no, it's not ready to ship.

---

**Let's build something exceptional.** 🚀
