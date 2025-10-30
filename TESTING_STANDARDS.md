# TESTING STANDARDS
## Comprehensive Testing Strategy for Energy Auditing Field Application

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Active  
**Owner:** Engineering Team

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Coverage Requirements](#2-coverage-requirements)
3. [Unit Testing Patterns](#3-unit-testing-patterns)
4. [Integration Testing Patterns](#4-integration-testing-patterns)
5. [E2E Testing with Playwright](#5-e2e-testing-with-playwright)
6. [Performance Testing](#6-performance-testing)
7. [Test Data Management](#7-test-data-management)
8. [Testing Best Practices](#8-testing-best-practices)
9. [CI/CD Integration](#9-cicd-integration)
10. [Smoke Test Suite Pattern](#10-smoke-test-suite-pattern)
11. [Testing Security](#11-testing-security)
12. [Testing Accessibility](#12-testing-accessibility)
13. [Testing Edge Cases](#13-testing-edge-cases)
14. [Debugging Failed Tests](#14-debugging-failed-tests)
15. [Test Maintenance](#15-test-maintenance)

---

## 1. Testing Philosophy

### 1.1 Why We Test

Testing is not about checking boxes or achieving arbitrary coverage numbers. **Testing is about confidence.**

**Testing gives us confidence that:**
- ✅ New features work as intended
- ✅ Existing features don't break when we make changes
- ✅ Edge cases are handled gracefully
- ✅ Performance remains acceptable under load
- ✅ Security vulnerabilities are caught early
- ✅ Users won't lose data in real-world scenarios

**For a field inspection application, testing is mission-critical because:**
- Field inspectors can't afford app crashes during inspections
- Lost compliance data could mean failed audits and legal issues
- Offline sync bugs could lead to permanent data loss
- Performance issues directly impact inspector productivity
- Security flaws could expose sensitive homeowner data

### 1.2 The Testing Pyramid

The testing pyramid guides how we distribute our testing efforts:

```
                    /\
                   /  \          E2E Tests (Few)
                  /    \         - Critical user journeys
                 /------\        - Entire system integration
                /        \       - Slow but comprehensive
               /----------\
              /            \     Integration Tests (Moderate)
             /              \    - API endpoints
            /                \   - Database interactions
           /------------------\  - External service integration
          /                    \
         /                      \ Unit Tests (Many)
        /________________________\
        Fast, Isolated, Numerous    - Business logic
        Test individual functions   - Validation rules
        No external dependencies     - Calculations
```

**Why this distribution?**

**Unit tests (70-80% of all tests):**
- Fast to run (<1ms each)
- Easy to debug (failures pinpoint exact issues)
- Cover edge cases exhaustively
- No flakiness (fully isolated)

**Integration tests (15-25% of all tests):**
- Test real database interactions
- Validate API contracts
- Catch integration issues unit tests miss
- Still reasonably fast (<100ms each)

**E2E tests (5-10% of all tests):**
- Test critical user workflows end-to-end
- Catch UI bugs and UX issues
- Slow and potentially flaky
- High maintenance cost

### 1.3 Testing Goals

Every test we write should serve at least one of these goals:

**1. Regression Prevention**
- Catch when new changes break existing functionality
- Especially critical for:
  - Compliance calculations (ACH50, TDL, DLO thresholds)
  - Data sync logic (offline queue processing)
  - Payment processing (builder invoicing)

**2. Documentation**
- Tests serve as executable documentation
- Show how code is meant to be used
- Provide examples of expected inputs/outputs

**3. Design Feedback**
- Hard-to-test code often indicates poor design
- Writing tests forces us to think about APIs
- Encourages pure functions and dependency injection

**4. Confidence in Refactoring**
- Comprehensive tests allow safe refactoring
- Change implementation without fear
- Tests verify behavior remains unchanged

### 1.4 When to Write Tests

**Test-First (TDD) for:**
- Complex business logic (compliance evaluation, calculations)
- Critical path features (payment processing, data sync)
- Bug fixes (write failing test first, then fix)
- Public APIs (define contract with tests)

**Test-After for:**
- Simple CRUD operations
- UI components (prototype first, test after)
- Experimental features (solidify requirements first)

**Don't Test:**
- Third-party library code
- Generated code (Drizzle migrations)
- Trivial getters/setters
- Configuration files

### 1.5 Test Qualities (FIRST Principles)

Good tests are **FIRST**:

**F - Fast**
- Unit tests: <1ms each
- Integration tests: <100ms each
- E2E tests: <5s each
- Entire suite: <2 minutes

**I - Isolated**
- No shared state between tests
- Each test can run independently
- Order doesn't matter
- No cascading failures

**R - Repeatable**
- Same result every time
- No flakiness
- No random data affecting outcomes
- No dependency on external services

**S - Self-Validating**
- Clear pass/fail result
- No manual verification needed
- Descriptive error messages
- Obvious what broke

**T - Timely**
- Written close to production code
- Not as an afterthought
- Part of definition of done

---

## 2. Coverage Requirements

### 2.1 Coverage Targets by Component

**Business Logic: 80% minimum**
- Compliance evaluation: 100%
- Calculation functions (ACH50, duct leakage): 100%
- Data validation: 90%
- Date/time utilities: 90%

**API Routes: 90% minimum**
- Authentication flows: 100%
- Authorization checks: 100%
- Data mutations: 95%
- Query endpoints: 85%

**Frontend Components: 70% minimum**
- Forms: 85%
- Critical workflows: 90%
- UI components: 60%
- Utility functions: 80%

**Critical Paths: 100% coverage**
- Payment processing
- Compliance validation
- Data sync/offline queue
- Builder signature capture
- Report generation

### 2.2 Coverage Tracking Setup

**Install coverage tools:**
```bash
npm install -D @vitest/coverage-v8 c8
```

**Configure vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'server/seeds/**',
        '**/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      // Per-file thresholds for critical paths
      perFile: true,
    },
  },
});
```

**Run coverage reports:**
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# CI/CD mode (fail if below threshold)
npm run test:coverage -- --coverage.enabled --coverage.reporter=json
```

### 2.3 Coverage Enforcement

**GitHub Actions integration:**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
      
      - name: Check coverage thresholds
        run: |
          if [ $(jq '.total.lines.pct < 80' coverage/coverage-summary.json) = "true" ]; then
            echo "Coverage below 80%"
            exit 1
          fi
```

---

## 3. Unit Testing Patterns

### 3.1 Test Structure: Arrange-Act-Assert

Every unit test follows this pattern:

```typescript
import { describe, it, expect } from 'vitest';

describe('calculateACH50', () => {
  it('should calculate ACH50 from blower door test results', () => {
    // ARRANGE - Set up test data
    const buildingVolume = 12000; // cubic feet
    const cfm50 = 1000; // CFM at 50 Pascals
    
    // ACT - Execute the function
    const result = calculateACH50(buildingVolume, cfm50);
    
    // ASSERT - Verify the result
    expect(result).toBe(5.0); // (1000 * 60) / 12000 = 5.0
  });
});
```

### 3.2 Testing Minnesota Energy Code Compliance

**Example 1: Testing TDL (Total Duct Leakage) threshold**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateTDLCompliance } from '../server/complianceService';

describe('evaluateTDLCompliance', () => {
  it('should pass when TDL is below 4.0 CFM/100 sq ft', () => {
    const ductLeakage = 380; // CFM
    const floorArea = 10000; // sq ft
    
    const result = evaluateTDLCompliance(ductLeakage, floorArea);
    
    expect(result.compliant).toBe(true);
    expect(result.tdl).toBe(3.8); // 380 / (10000 / 100)
    expect(result.threshold).toBe(4.0);
  });

  it('should fail when TDL equals 4.1 CFM/100 sq ft', () => {
    const ductLeakage = 410; // CFM
    const floorArea = 10000; // sq ft
    
    const result = evaluateTDLCompliance(ductLeakage, floorArea);
    
    expect(result.compliant).toBe(false);
    expect(result.tdl).toBe(4.1);
    expect(result.violation).toMatchObject({
      metricType: 'TDL',
      actual: 4.1,
      threshold: 4.0,
      severity: 'high',
    });
  });

  it('should handle boundary value exactly at threshold', () => {
    const ductLeakage = 400; // CFM
    const floorArea = 10000; // sq ft
    
    const result = evaluateTDLCompliance(ductLeakage, floorArea);
    
    // At threshold = compliant (≤ not <)
    expect(result.compliant).toBe(true);
    expect(result.tdl).toBe(4.0);
  });

  it('should handle zero duct leakage', () => {
    const ductLeakage = 0;
    const floorArea = 10000;
    
    const result = evaluateTDLCompliance(ductLeakage, floorArea);
    
    expect(result.compliant).toBe(true);
    expect(result.tdl).toBe(0);
  });

  it('should throw error for invalid floor area', () => {
    expect(() => {
      evaluateTDLCompliance(400, 0);
    }).toThrow('Floor area must be greater than zero');
  });
});
```

**Example 2: Testing ACH50 calculation with real-world values**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateACH50 } from '../server/calculations';

describe('calculateACH50 - Air Changes per Hour at 50 Pascals', () => {
  it('should calculate ACH50 for typical single-family home', () => {
    const buildingVolume = 12000; // cubic feet
    const cfm50 = 600; // CFM at 50 Pa
    
    const ach50 = calculateACH50(buildingVolume, cfm50);
    
    // Formula: (CFM50 * 60) / Building Volume
    // (600 * 60) / 12000 = 3.0 ACH50
    expect(ach50).toBe(3.0);
  });

  it('should pass Minnesota Energy Code threshold of 5.0 ACH50', () => {
    const buildingVolume = 12000;
    const cfm50 = 1000; // Exactly at 5.0 ACH50
    
    const ach50 = calculateACH50(buildingVolume, cfm50);
    
    expect(ach50).toBe(5.0);
    expect(ach50).toBeLessThanOrEqual(5.0); // Passes code
  });

  it('should fail when exceeding 5.0 ACH50 threshold', () => {
    const buildingVolume = 12000;
    const cfm50 = 1020; // 5.1 ACH50
    
    const ach50 = calculateACH50(buildingVolume, cfm50);
    
    expect(ach50).toBe(5.1);
    expect(ach50).toBeGreaterThan(5.0); // Fails code
  });

  it('should handle very tight homes (Passive House standard)', () => {
    const buildingVolume = 15000;
    const cfm50 = 150; // 0.6 ACH50 (Passive House)
    
    const ach50 = calculateACH50(buildingVolume, cfm50);
    
    expect(ach50).toBeCloseTo(0.6, 1);
  });

  it('should round to one decimal place', () => {
    const buildingVolume = 12000;
    const cfm50 = 567; // 2.835 ACH50
    
    const ach50 = calculateACH50(buildingVolume, cfm50);
    
    expect(ach50).toBe(2.8); // Rounded
  });

  it('should throw error for zero building volume', () => {
    expect(() => {
      calculateACH50(0, 1000);
    }).toThrow('Building volume must be greater than zero');
  });

  it('should throw error for negative CFM50', () => {
    expect(() => {
      calculateACH50(12000, -100);
    }).toThrow('CFM50 cannot be negative');
  });
});
```

### 3.3 Testing Validation Functions

**Example 3: Builder validation with Zod**

```typescript
import { describe, it, expect } from 'vitest';
import { insertBuilderSchema } from '../shared/schema';
import { ZodError } from 'zod';

describe('Builder Validation Schema', () => {
  it('should validate correct builder data', () => {
    const validBuilder = {
      name: 'Smith Custom Homes',
      contactEmail: 'john@smithhomes.com',
      contactPhone: '612-555-0123',
      address: '123 Main St',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55401',
    };

    const result = insertBuilderSchema.parse(validBuilder);
    
    expect(result).toMatchObject(validBuilder);
  });

  it('should reject builder with invalid email', () => {
    const invalidBuilder = {
      name: 'Smith Homes',
      contactEmail: 'not-an-email',
      contactPhone: '612-555-0123',
    };

    expect(() => {
      insertBuilderSchema.parse(invalidBuilder);
    }).toThrow(ZodError);
  });

  it('should reject builder with empty name', () => {
    const invalidBuilder = {
      name: '',
      contactEmail: 'test@example.com',
    };

    const result = insertBuilderSchema.safeParse(invalidBuilder);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
      expect(result.error.issues[0].message).toMatch(/empty|required/i);
    }
  });

  it('should accept optional fields as undefined', () => {
    const minimalBuilder = {
      name: 'Builder LLC',
      contactEmail: 'info@builder.com',
    };

    const result = insertBuilderSchema.parse(minimalBuilder);
    
    expect(result.name).toBe('Builder LLC');
    expect(result.address).toBeUndefined();
  });

  it('should trim whitespace from name', () => {
    const builderWithSpaces = {
      name: '  Smith Homes  ',
      contactEmail: 'test@example.com',
    };

    const result = insertBuilderSchema.parse(builderWithSpaces);
    
    expect(result.name).toBe('Smith Homes');
  });

  it('should validate Minnesota zip codes', () => {
    const builderWithMNZip = {
      name: 'Builder',
      contactEmail: 'test@example.com',
      state: 'MN',
      zipCode: '55401',
    };

    const result = insertBuilderSchema.parse(builderWithMNZip);
    
    expect(result.zipCode).toBe('55401');
    expect(result.zipCode).toMatch(/^\d{5}$/);
  });
});
```

### 3.4 Testing Async Functions and Promises

**Example 4: Testing database queries with mocks**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getJobWithForecasts } from '../server/storage';
import type { IStorage } from '../server/storage';

// Mock storage implementation
class MockStorage implements IStorage {
  private jobs = new Map();
  private forecasts = new Map();

  async getJob(id: string) {
    return this.jobs.get(id);
  }

  async getForecastsByJob(jobId: string) {
    return this.forecasts.get(jobId) || [];
  }

  setJob(job: any) {
    this.jobs.set(job.id, job);
  }

  setForecasts(jobId: string, forecasts: any[]) {
    this.forecasts.set(jobId, forecasts);
  }

  // ... other required IStorage methods
}

describe('getJobWithForecasts', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should return job with forecasts', async () => {
    const jobId = 'job-123';
    const job = {
      id: jobId,
      address: '123 Main St',
      status: 'in-progress',
    };
    const forecasts = [
      { id: 'f1', jobId, actualACH50: '3.5' },
      { id: 'f2', jobId, actualTDL: '3.2' },
    ];

    storage.setJob(job);
    storage.setForecasts(jobId, forecasts);

    const result = await getJobWithForecasts(storage, jobId);

    expect(result.job).toEqual(job);
    expect(result.forecasts).toHaveLength(2);
    expect(result.forecasts[0].actualACH50).toBe('3.5');
  });

  it('should return null for non-existent job', async () => {
    const result = await getJobWithForecasts(storage, 'fake-id');

    expect(result).toBeNull();
  });

  it('should handle jobs with no forecasts', async () => {
    const jobId = 'job-456';
    const job = { id: jobId, address: '456 Oak Ave' };

    storage.setJob(job);
    storage.setForecasts(jobId, []); // No forecasts

    const result = await getJobWithForecasts(storage, jobId);

    expect(result.job).toEqual(job);
    expect(result.forecasts).toEqual([]);
  });
});
```

### 3.5 Testing Date/Time Logic with Timezones

**Example 5: Timezone-aware date handling**

```typescript
import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { 
  formatScheduledDate, 
  parseUserInputDate,
  isScheduledToday 
} from '../shared/dateUtils';

describe('formatScheduledDate', () => {
  it('should format date in Central Time (Minneapolis)', () => {
    const utcDate = '2025-10-30T14:00:00Z'; // 9am CT
    
    const formatted = formatScheduledDate(utcDate, 'America/Chicago');
    
    expect(formatted).toBe('Oct 30, 2025 at 9:00 AM');
  });

  it('should handle DST transitions correctly', () => {
    // Spring forward: March 9, 2025, 2am → 3am
    const beforeDST = '2025-03-09T07:59:00Z'; // 1:59 AM CT
    const afterDST = '2025-03-09T08:01:00Z'; // 3:01 AM CT
    
    const before = formatScheduledDate(beforeDST, 'America/Chicago');
    const after = formatScheduledDate(afterDST, 'America/Chicago');
    
    expect(before).toContain('1:59 AM');
    expect(after).toContain('3:01 AM');
  });

  it('should default to UTC if timezone not provided', () => {
    const utcDate = '2025-10-30T14:00:00Z';
    
    const formatted = formatScheduledDate(utcDate);
    
    expect(formatted).toContain('2:00 PM');
  });
});

describe('parseUserInputDate', () => {
  it('should parse MM/DD/YYYY format', () => {
    const input = '10/30/2025';
    
    const parsed = parseUserInputDate(input, 'America/Chicago');
    
    expect(parsed.year).toBe(2025);
    expect(parsed.month).toBe(10);
    expect(parsed.day).toBe(30);
  });

  it('should throw error for invalid date format', () => {
    const input = '13/40/2025'; // Invalid month/day
    
    expect(() => {
      parseUserInputDate(input, 'America/Chicago');
    }).toThrow('Invalid date');
  });

  it('should handle leap year correctly', () => {
    const leapYear = '02/29/2024'; // 2024 is leap year
    
    const parsed = parseUserInputDate(leapYear, 'America/Chicago');
    
    expect(parsed.day).toBe(29);
  });

  it('should reject February 29 on non-leap years', () => {
    const nonLeapYear = '02/29/2025'; // 2025 is NOT leap year
    
    expect(() => {
      parseUserInputDate(nonLeapYear, 'America/Chicago');
    }).toThrow();
  });
});

describe('isScheduledToday', () => {
  it('should return true for today in Central Time', () => {
    const now = DateTime.now().setZone('America/Chicago');
    const todayDate = now.toISO();
    
    const result = isScheduledToday(todayDate, 'America/Chicago');
    
    expect(result).toBe(true);
  });

  it('should return false for tomorrow', () => {
    const tomorrow = DateTime.now()
      .setZone('America/Chicago')
      .plus({ days: 1 })
      .toISO();
    
    const result = isScheduledToday(tomorrow, 'America/Chicago');
    
    expect(result).toBe(false);
  });

  it('should handle midnight edge case', () => {
    const midnight = DateTime.now()
      .setZone('America/Chicago')
      .startOf('day')
      .toISO();
    
    const result = isScheduledToday(midnight, 'America/Chicago');
    
    expect(result).toBe(true);
  });
});
```

### 3.6 Testing Error Handling

**Example 6: Comprehensive error scenarios**

```typescript
import { describe, it, expect } from 'vitest';
import { createJob } from '../server/jobService';
import { DatabaseError, ValidationError } from '../server/errors';

describe('createJob - Error Handling', () => {
  it('should throw ValidationError for missing required fields', async () => {
    const invalidJob = {
      address: '', // Required but empty
      inspectorId: 'user-123',
    };

    await expect(
      createJob(invalidJob)
    ).rejects.toThrow(ValidationError);
  });

  it('should throw DatabaseError if DB connection fails', async () => {
    // Simulate database connection failure
    const storage = {
      createJob: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    };

    await expect(
      createJob({ address: '123 Main' }, storage)
    ).rejects.toThrow(DatabaseError);
  });

  it('should provide descriptive error messages', async () => {
    const invalidJob = { address: '' };

    try {
      await createJob(invalidJob);
      expect.fail('Should have thrown ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('address');
      expect(error.message).toContain('required');
    }
  });

  it('should include field-level error details', async () => {
    const invalidJob = {
      address: '',
      scheduledDate: 'invalid-date',
      priority: 'ultra-high', // Invalid enum
    };

    try {
      await createJob(invalidJob);
    } catch (error) {
      expect(error.errors).toHaveProperty('address');
      expect(error.errors).toHaveProperty('scheduledDate');
      expect(error.errors).toHaveProperty('priority');
    }
  });
});
```

### 3.7 Snapshot Testing for Complex Objects

**Example 7: Testing report generation output**

```typescript
import { describe, it, expect } from 'vitest';
import { generateComplianceReport } from '../server/reportService';

describe('generateComplianceReport', () => {
  it('should generate correct report structure', () => {
    const jobData = {
      id: 'job-123',
      address: '123 Main St, Minneapolis, MN 55401',
      inspector: 'John Doe',
      forecasts: [
        { actualACH50: '4.2', actualTDL: '3.5', actualDLO: '5.8' },
      ],
    };

    const report = generateComplianceReport(jobData);

    // Snapshot test for complex structure
    expect(report).toMatchSnapshot();
  });

  it('should handle multiple violations correctly', () => {
    const jobData = {
      id: 'job-456',
      address: '456 Oak Ave',
      forecasts: [
        { actualACH50: '5.5', actualTDL: '4.2', actualDLO: '6.5' },
      ],
    };

    const report = generateComplianceReport(jobData);

    expect(report.violations).toHaveLength(3);
    expect(report.violations).toMatchInlineSnapshot(`
      [
        {
          "actual": 5.5,
          "metricType": "ACH50",
          "severity": "high",
          "threshold": 5.0,
        },
        {
          "actual": 4.2,
          "metricType": "TDL",
          "severity": "high",
          "threshold": 4.0,
        },
        {
          "actual": 6.5,
          "metricType": "DLO",
          "severity": "high",
          "threshold": 6.0,
        },
      ]
    `);
  });
});
```

---

## 4. Integration Testing Patterns

### 4.1 Testing API Routes End-to-End

**Example 8: Testing POST /api/builders with full validation**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { createTestUser, cleanupDatabase } from './helpers/testHelpers';

describe('POST /api/builders', () => {
  let authToken: string;

  beforeEach(async () => {
    await cleanupDatabase();
    const user = await createTestUser({ role: 'admin' });
    authToken = user.token;
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create builder with valid data', async () => {
    const builderData = {
      name: 'Smith Custom Homes',
      contactEmail: 'john@smithhomes.com',
      contactPhone: '612-555-0123',
      address: '123 Main St',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55401',
    };

    const response = await request(app)
      .post('/api/builders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(builderData)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Smith Custom Homes',
      contactEmail: 'john@smithhomes.com',
    });
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
  });

  it('should return 401 if not authenticated', async () => {
    const builderData = { name: 'Test Builder' };

    await request(app)
      .post('/api/builders')
      .send(builderData)
      .expect(401);
  });

  it('should return 400 for invalid email', async () => {
    const invalidData = {
      name: 'Builder',
      contactEmail: 'not-an-email',
    };

    const response = await request(app)
      .post('/api/builders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('email');
  });

  it('should sanitize XSS attempts', async () => {
    const xssData = {
      name: '<script>alert("xss")</script>Smith Homes',
      contactEmail: 'test@example.com',
    };

    const response = await request(app)
      .post('/api/builders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(xssData)
      .expect(201);

    // Name should be sanitized
    expect(response.body.name).not.toContain('<script>');
  });

  it('should enforce rate limiting', async () => {
    const builderData = {
      name: 'Builder',
      contactEmail: 'test@example.com',
    };

    // Make 100 rapid requests
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .post('/api/builders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(builderData)
    );

    const responses = await Promise.all(requests);
    
    // At least one should be rate limited (429)
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});
```

**Example 9: Testing GET /api/builders/:id with ownership checks**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { createTestUser, createTestBuilder } from './helpers/testHelpers';

describe('GET /api/builders/:id', () => {
  it('should return builder for authorized user', async () => {
    const user = await createTestUser({ role: 'admin' });
    const builder = await createTestBuilder({
      name: 'Test Builder',
      userId: user.id,
    });

    const response = await request(app)
      .get(`/api/builders/${builder.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: builder.id,
      name: 'Test Builder',
    });
  });

  it('should return 404 for non-existent builder', async () => {
    const user = await createTestUser();

    await request(app)
      .get('/api/builders/fake-id-123')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
  });

  it('should prevent cross-tenant access', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    
    const builder = await createTestBuilder({
      name: 'User 1 Builder',
      userId: user1.id,
    });

    // User 2 tries to access User 1's builder
    await request(app)
      .get(`/api/builders/${builder.id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .expect(403);
  });

  it('should allow admins to access all builders', async () => {
    const regularUser = await createTestUser({ role: 'inspector' });
    const adminUser = await createTestUser({ role: 'admin' });
    
    const builder = await createTestBuilder({
      userId: regularUser.id,
    });

    // Admin can access any builder
    const response = await request(app)
      .get(`/api/builders/${builder.id}`)
      .set('Authorization', `Bearer ${adminUser.token}`)
      .expect(200);

    expect(response.body.id).toBe(builder.id);
  });
});
```

### 4.2 Testing Pagination Endpoints

**Example 10: Testing paginated job listing**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { createTestUser, createTestJobs } from './helpers/testHelpers';

describe('GET /api/jobs - Pagination', () => {
  let user: any;

  beforeEach(async () => {
    user = await createTestUser();
    // Create 50 test jobs
    await createTestJobs(50, { inspectorId: user.id });
  });

  it('should return first page with default limit', async () => {
    const response = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.jobs).toHaveLength(20); // Default page size
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
    });
  });

  it('should return second page', async () => {
    const response = await request(app)
      .get('/api/jobs?page=2&limit=20')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.jobs).toHaveLength(20);
    expect(response.body.pagination.page).toBe(2);
  });

  it('should return last page with remaining items', async () => {
    const response = await request(app)
      .get('/api/jobs?page=3&limit=20')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.jobs).toHaveLength(10); // 50 - (2 * 20)
    expect(response.body.pagination.page).toBe(3);
  });

  it('should enforce maximum page size', async () => {
    const response = await request(app)
      .get('/api/jobs?limit=1000') // Try to get too many
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.jobs.length).toBeLessThanOrEqual(100); // Max enforced
  });

  it('should handle invalid page numbers gracefully', async () => {
    const response = await request(app)
      .get('/api/jobs?page=-1')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.pagination.page).toBe(1); // Default to page 1
  });
});
```

### 4.3 Testing File Upload Endpoints

**Example 11: Testing photo upload**

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { createTestUser, createTestJob } from './helpers/testHelpers';
import path from 'path';
import fs from 'fs';

describe('POST /api/jobs/:id/photos', () => {
  it('should upload photo successfully', async () => {
    const user = await createTestUser();
    const job = await createTestJob({ inspectorId: user.id });
    
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

    const response = await request(app)
      .post(`/api/jobs/${job.id}/photos`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('photo', testImagePath)
      .field('caption', 'Blower door setup')
      .field('category', 'equipment')
      .expect(201);

    expect(response.body).toMatchObject({
      jobId: job.id,
      caption: 'Blower door setup',
      category: 'equipment',
    });
    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('thumbnailUrl');
  });

  it('should reject non-image files', async () => {
    const user = await createTestUser();
    const job = await createTestJob({ inspectorId: user.id });
    
    const textFilePath = path.join(__dirname, 'fixtures', 'test.txt');

    await request(app)
      .post(`/api/jobs/${job.id}/photos`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('photo', textFilePath)
      .expect(400);
  });

  it('should reject files larger than 10MB', async () => {
    const user = await createTestUser();
    const job = await createTestJob({ inspectorId: user.id });
    
    // Create temporary 11MB file
    const largeFilePath = path.join(__dirname, 'fixtures', 'large.jpg');
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    fs.writeFileSync(largeFilePath, largeBuffer);

    try {
      await request(app)
        .post(`/api/jobs/${job.id}/photos`)
        .set('Authorization', `Bearer ${user.token}`)
        .attach('photo', largeFilePath)
        .expect(413); // Payload too large
    } finally {
      fs.unlinkSync(largeFilePath); // Cleanup
    }
  });

  it('should generate thumbnail automatically', async () => {
    const user = await createTestUser();
    const job = await createTestJob({ inspectorId: user.id });
    
    const testImagePath = path.join(__dirname, 'fixtures', 'large-photo.jpg');

    const response = await request(app)
      .post(`/api/jobs/${job.id}/photos`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('photo', testImagePath)
      .expect(201);

    expect(response.body.thumbnailUrl).toBeTruthy();
    expect(response.body.thumbnailUrl).toContain('thumbnail');
  });

  it('should extract EXIF data from photo', async () => {
    const user = await createTestUser();
    const job = await createTestJob({ inspectorId: user.id });
    
    const photoWithExif = path.join(__dirname, 'fixtures', 'photo-with-gps.jpg');

    const response = await request(app)
      .post(`/api/jobs/${job.id}/photos`)
      .set('Authorization', `Bearer ${user.token}`)
      .attach('photo', photoWithExif)
      .expect(201);

    expect(response.body.metadata).toMatchObject({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      capturedAt: expect.any(String),
    });
  });
});
```

### 4.4 Testing Database Transactions

**Example 12: Testing bulk operations with rollback**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import { bulkUpdateJobStatus } from '../server/jobService';
import { createTestJobs } from './helpers/testHelpers';

describe('bulkUpdateJobStatus - Transaction Safety', () => {
  beforeEach(async () => {
    await createTestJobs(5);
  });

  it('should update all jobs in a single transaction', async () => {
    const jobIds = ['job-1', 'job-2', 'job-3'];

    await bulkUpdateJobStatus(jobIds, 'completed');

    // Verify all updated
    const jobs = await db.query.jobs.findMany({
      where: (jobs, { inArray }) => inArray(jobs.id, jobIds),
    });

    jobs.forEach(job => {
      expect(job.status).toBe('completed');
    });
  });

  it('should rollback all changes if one update fails', async () => {
    const jobIds = ['job-1', 'job-2', 'invalid-id'];

    try {
      await bulkUpdateJobStatus(jobIds, 'completed');
      expect.fail('Should have thrown error');
    } catch (error) {
      // Verify NO jobs were updated (transaction rolled back)
      const jobs = await db.query.jobs.findMany({
        where: (jobs, { inArray }) => inArray(jobs.id, ['job-1', 'job-2']),
      });

      jobs.forEach(job => {
        expect(job.status).not.toBe('completed');
      });
    }
  });

  it('should handle concurrent updates correctly', async () => {
    const jobId = 'job-1';

    // Simulate two concurrent updates
    const [result1, result2] = await Promise.all([
      bulkUpdateJobStatus([jobId], 'in-progress'),
      bulkUpdateJobStatus([jobId], 'completed'),
    ]);

    // One should succeed, one should fail or be serialized
    const job = await db.query.jobs.findFirst({
      where: (jobs, { eq }) => eq(jobs.id, jobId),
    });

    // Final state should be consistent
    expect(['in-progress', 'completed']).toContain(job.status);
  });
});
```

### 4.5 Testing CSRF Protection

**Example 13: CSRF token validation**

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { createTestUser } from './helpers/testHelpers';

describe('CSRF Protection', () => {
  it('should require CSRF token for state-changing requests', async () => {
    const user = await createTestUser();

    // Attempt POST without CSRF token
    await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ address: '123 Main St' })
      .expect(403); // CSRF token missing
  });

  it('should accept valid CSRF token', async () => {
    const user = await createTestUser();

    // Get CSRF token first
    const tokenResponse = await request(app)
      .get('/api/csrf-token')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const csrfToken = tokenResponse.body.token;

    // Use token in POST request
    const response = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${user.token}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        address: '123 Main St',
        inspectorId: user.id,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });

  it('should reject invalid CSRF token', async () => {
    const user = await createTestUser();

    await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${user.token}`)
      .set('X-CSRF-Token', 'invalid-token-12345')
      .send({ address: '123 Main St' })
      .expect(403);
  });

  it('should allow GET requests without CSRF token', async () => {
    const user = await createTestUser();

    await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200); // No CSRF required for GET
  });
});
```

---

## 5. E2E Testing with Playwright

### 5.1 Critical User Journeys

**Example 14: Complete inspection workflow E2E test**

```typescript
import { test, expect } from '@playwright/test';
import { login, createTestJob } from './helpers/e2eHelpers';

test.describe('Inspection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, { role: 'inspector' });
  });

  test('complete inspection from start to finish', async ({ page }) => {
    // Step 1: Navigate to jobs page
    await page.goto('/jobs');
    await expect(page.getByTestId('heading-jobs')).toBeVisible();

    // Step 2: Create new job
    await page.getByTestId('button-create-job').click();
    await expect(page.getByTestId('modal-new-job')).toBeVisible();

    await page.getByTestId('input-address').fill('123 Main St');
    await page.getByTestId('input-city').fill('Minneapolis');
    await page.getByTestId('select-inspection-type').selectOption('Thermal Bypass');
    await page.getByTestId('button-submit').click();

    await expect(page.getByTestId('modal-new-job')).not.toBeVisible();

    // Step 3: Open job details
    const jobCard = page.getByTestId(/card-job-/).first();
    await jobCard.click();

    await expect(page.getByTestId('heading-job-details')).toBeVisible();

    // Step 4: Capture photos
    await page.getByTestId('tab-photos').click();
    await page.getByTestId('button-add-photo').click();

    // Upload photo
    const fileInput = page.getByTestId('input-photo-upload');
    await fileInput.setInputFiles('./tests/fixtures/thermal-bypass.jpg');

    await page.getByTestId('input-photo-caption').fill('Attic thermal bypass');
    await page.getByTestId('select-photo-category').selectOption('thermal-bypass');
    await page.getByTestId('button-save-photo').click();

    // Verify photo appears
    await expect(page.getByTestId('photo-thumbnail-0')).toBeVisible();

    // Step 5: Run blower door test
    await page.getByTestId('tab-tests').click();
    await page.getByTestId('button-run-blower-door').click();

    await page.getByTestId('input-cfm50').fill('980');
    await page.getByTestId('input-building-volume').fill('12000');
    await page.getByTestId('button-calculate').click();

    // Verify ACH50 calculation
    await expect(page.getByTestId('text-ach50-result')).toHaveText('4.9');
    await expect(page.getByTestId('badge-compliance-status')).toHaveText('Compliant');

    await page.getByTestId('button-save-test-results').click();

    // Step 6: Generate report
    await page.getByTestId('tab-report').click();
    await page.getByTestId('button-generate-report').click();

    // Wait for report generation
    await expect(page.getByTestId('text-report-status')).toHaveText('Generated', {
      timeout: 10000,
    });

    // Step 7: Mark job complete
    await page.getByTestId('button-mark-complete').click();
    await page.getByTestId('button-confirm').click();

    await expect(page.getByTestId('badge-job-status')).toHaveText('Completed');

    // Verify job appears in completed list
    await page.goto('/jobs?status=completed');
    await expect(page.getByTestId(/card-job-/)).toHaveCount(1);
  });
});
```

**Example 15: Form submission with validation**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Builder Form Validation', () => {
  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/builders');
    await page.getByTestId('button-create-builder').click();

    // Submit empty form
    await page.getByTestId('button-submit').click();

    // Check for validation errors
    await expect(page.getByTestId('error-name')).toHaveText('Name is required');
    await expect(page.getByTestId('error-contact-email')).toHaveText('Email is required');
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/builders');
    await page.getByTestId('button-create-builder').click();

    await page.getByTestId('input-name').fill('Smith Homes');
    await page.getByTestId('input-contact-email').fill('not-an-email');
    await page.getByTestId('button-submit').click();

    await expect(page.getByTestId('error-contact-email')).toContain Text('Invalid email');
  });

  test('should submit successfully with valid data', async ({ page }) => {
    await page.goto('/builders');
    await page.getByTestId('button-create-builder').click();

    await page.getByTestId('input-name').fill('Smith Custom Homes');
    await page.getByTestId('input-contact-email').fill('john@smithhomes.com');
    await page.getByTestId('input-contact-phone').fill('612-555-0123');
    await page.getByTestId('button-submit').click();

    // Should redirect to builder list
    await expect(page).toHaveURL(/\/builders$/);
    await expect(page.getByText('Smith Custom Homes')).toBeVisible();
  });

  test('should show server-side validation errors', async ({ page }) => {
    await page.goto('/builders');
    await page.getByTestId('button-create-builder').click();

    // Try to create duplicate builder
    await page.getByTestId('input-name').fill('Existing Builder');
    await page.getByTestId('input-contact-email').fill('existing@builder.com');
    await page.getByTestId('button-submit').click();

    await expect(page.getByTestId('error-form')).toHaveText(
      'Builder with this email already exists'
    );
  });
});
```

### 5.2 Page Object Model Pattern

**Example 16: Page objects for maintainable E2E tests**

```typescript
// tests/pages/JobsPage.ts
import { Page, Locator } from '@playwright/test';

export class JobsPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly filterStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByTestId('button-create-job');
    this.searchInput = page.getByTestId('input-search');
    this.filterStatus = page.getByTestId('select-filter-status');
  }

  async goto() {
    await this.page.goto('/jobs');
  }

  async createJob(data: {
    address: string;
    city?: string;
    inspectionType: string;
  }) {
    await this.createButton.click();
    
    await this.page.getByTestId('input-address').fill(data.address);
    if (data.city) {
      await this.page.getByTestId('input-city').fill(data.city);
    }
    await this.page.getByTestId('select-inspection-type').selectOption(data.inspectionType);
    await this.page.getByTestId('button-submit').click();
  }

  async searchJobs(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByStatus(status: string) {
    await this.filterStatus.selectOption(status);
  }

  async getJobCards() {
    return this.page.getByTestId(/card-job-/).all();
  }

  async openJob(index: number) {
    const cards = await this.getJobCards();
    await cards[index].click();
  }
}

// Usage in test
import { test, expect } from '@playwright/test';
import { JobsPage } from './pages/JobsPage';

test('filter jobs by status', async ({ page }) => {
  const jobsPage = new JobsPage(page);
  await jobsPage.goto();

  await jobsPage.filterByStatus('completed');
  
  const cards = await jobsPage.getJobCards();
  expect(cards.length).toBeGreaterThan(0);
});
```

### 5.3 Testing Offline Mode and Sync Queue

**Example 17: Offline data persistence and sync**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('should save data offline and sync when online', async ({ page, context }) => {
    await page.goto('/jobs');

    // Create job while online
    await page.getByTestId('button-create-job').click();
    await page.getByTestId('input-address').fill('123 Main St');
    await page.getByTestId('button-submit').click();

    // Go offline
    await context.setOffline(true);

    // Verify offline indicator shows
    await expect(page.getByTestId('badge-offline')).toBeVisible();

    // Create another job while offline
    await page.getByTestId('button-create-job').click();
    await page.getByTestId('input-address').fill('456 Oak Ave');
    await page.getByTestId('button-submit').click();

    // Job should be in sync queue
    await page.getByTestId('button-sync-queue').click();
    await expect(page.getByTestId('text-queue-count')).toHaveText('1 item pending');

    // Go back online
    await context.setOffline(false);

    // Wait for auto-sync
    await expect(page.getByTestId('badge-offline')).not.toBeVisible();
    await expect(page.getByTestId('text-queue-count')).toHaveText('0 items pending', {
      timeout: 10000,
    });

    // Verify both jobs are visible
    const jobCards = await page.getByTestId(/card-job-/).all();
    expect(jobCards.length).toBe(2);
  });

  test('should handle conflict resolution', async ({ page, context }) => {
    await page.goto('/jobs/job-123');

    // Update job while online
    await page.getByTestId('input-notes').fill('Updated notes');
    await page.getByTestId('button-save').click();

    // Simulate conflicting update from another device
    await context.setOffline(true);
    await page.getByTestId('input-notes').fill('Offline update');
    await page.getByTestId('button-save').click();

    await context.setOffline(false);

    // Should show conflict resolution dialog
    await expect(page.getByTestId('dialog-conflict')).toBeVisible();
    await expect(page.getByTestId('text-local-version')).toContainText('Offline update');
    await expect(page.getByTestId('text-remote-version')).toContainText('Updated notes');

    // Choose local version
    await page.getByTestId('button-use-local').click();

    // Verify local version won
    await expect(page.getByTestId('input-notes')).toHaveValue('Offline update');
  });
});
```

### 5.4 Screenshot on Failure

**Example 18: Automatic screenshot and video capture**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Galaxy S23 Ultra'] }, // Field inspector device
    },
  ],
});

// Test with custom screenshot on failure
test('custom screenshot capture', async ({ page }, testInfo) => {
  try {
    await page.goto('/jobs');
    await expect(page.getByTestId('heading-jobs')).toBeVisible();
  } catch (error) {
    // Capture full-page screenshot on failure
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('failure-screenshot', {
      body: screenshot,
      contentType: 'image/png',
    });
    
    // Capture console logs
    const logs = page.context().
();
    await testInfo.attach('console-logs', {
      body: JSON.stringify(logs, null, 2),
      contentType: 'application/json',
    });
    
    throw error;
  }
});
```

---

## 6. Performance Testing

### 6.1 API Endpoint Benchmarks

**Example 19: Load testing with k6**

```javascript
// tests/performance/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const jobCreationTime = new Trend('job_creation_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    errors: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const token = __ENV.AUTH_TOKEN;
  const baseUrl = __ENV.BASE_URL || 'http://localhost:5000';

  // Test 1: List jobs (read-heavy)
  const listResponse = http.get(`${baseUrl}/api/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(listResponse, {
    'list jobs status 200': (r) => r.status === 200,
    'list jobs response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(listResponse.status !== 200);

  sleep(1);

  // Test 2: Create job (write operation)
  const createPayload = JSON.stringify({
    address: `${Math.random() * 10000} Test St`,
    city: 'Minneapolis',
    inspectionType: 'Thermal Bypass',
  });

  const createResponse = http.post(`${baseUrl}/api/jobs`, createPayload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  check(createResponse, {
    'create job status 201': (r) => r.status === 201,
    'create job has ID': (r) => JSON.parse(r.body).id !== undefined,
  });

  jobCreationTime.add(createResponse.timings.duration);
  errorRate.add(createResponse.status !== 201);

  sleep(2);

  // Test 3: Get single job
  if (createResponse.status === 201) {
    const jobId = JSON.parse(createResponse.body).id;
    
    const getResponse = http.get(`${baseUrl}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    check(getResponse, {
      'get job status 200': (r) => r.status === 200,
      'get job response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(getResponse.status !== 200);
  }

  sleep(1);
}
```

**Run performance tests:**
```bash
# Install k6
brew install k6

# Run test
k6 run tests/performance/api-load-test.js

# Generate HTML report
k6 run --out json=test-results.json tests/performance/api-load-test.js
```

### 6.2 Database Query Performance

**Example 20: Profiling slow queries**

```typescript
import { describe, it, expect } from 'vitest';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

describe('Database Query Performance', () => {
  it('should execute job list query in <50ms', async () => {
    const start = Date.now();
    
    const jobs = await db.query.jobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, 'in-progress'),
      limit: 20,
      with: {
        inspector: true,
        photos: {
          limit: 1, // Only first photo
        },
      },
    });

    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
    console.log(`Query executed in ${duration}ms`);
  });

  it('should use index for status filtering', async () => {
    // EXPLAIN ANALYZE to verify index usage
    const result = await db.execute(sql`
      EXPLAIN ANALYZE
      SELECT * FROM jobs
      WHERE status = 'in-progress'
      LIMIT 20
    `);

    const plan = result.rows[0];
    
    // Verify index scan, not seq scan
    expect(plan).toContain('Index Scan');
    expect(plan).not.toContain('Seq Scan');
  });

  it('should efficiently aggregate compliance stats', async () => {
    const start = Date.now();

    const stats = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(CAST(compliance_status AS INT)) as avg_compliance
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY status
    `);

    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

### 6.3 Frontend Bundle Analysis

**Example 21: Bundle size monitoring**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

**Bundle size test:**
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'fs';
import { gzipSync } from 'zlib';

describe('Bundle Size', () => {
  it('should keep main bundle under 200KB gzipped', () => {
    const mainBundle = readFileSync('./dist/assets/index-*.js');
    const gzipped = gzipSync(mainBundle);
    const sizeKB = gzipped.length / 1024;

    expect(sizeKB).toBeLessThan(200);
    console.log(`Main bundle: ${sizeKB.toFixed(2)}KB gzipped`);
  });

  it('should lazy-load report generator', () => {
    const files = readdirSync('./dist/assets');
    const reportChunk = files.find(f => f.includes('ReportGenerator'));

    expect(reportChunk).toBeDefined();
  });

  it('should not include dev dependencies in production build', () => {
    const mainBundle = readFileSync('./dist/assets/index-*.js', 'utf-8');

    expect(mainBundle).not.toContain('vitest');
    expect(mainBundle).not.toContain('@testing-library');
  });
});
```

### 6.4 React Component Performance

**Example 22: Profiling render performance**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Jobs } from '../client/src/pages/Jobs';
import { Profiler } from 'react';

describe('Jobs Component Performance', () => {
  it('should render 100 job cards in <100ms', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    // Mock 100 jobs
    queryClient.setQueryData(['/api/jobs'], {
      jobs: Array(100).fill(null).map((_, i) => ({
        id: `job-${i}`,
        address: `${i} Main St`,
        status: 'pending',
      })),
    });

    let renderTime = 0;

    const onRender = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    ) => {
      renderTime = actualDuration;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <Profiler id="Jobs" onRender={onRender}>
          <Jobs />
        </Profiler>
      </QueryClientProvider>
    );

    expect(renderTime).toBeLessThan(100);
    console.log(`Rendered 100 jobs in ${renderTime.toFixed(2)}ms`);
  });

  it('should use virtualization for large lists', () => {
    // Test that react-virtual is used for >50 items
    const { container } = render(<Jobs />);
    
    const virtualContainer = container.querySelector('[data-virtualized]');
    expect(virtualContainer).toBeTruthy();
  });
});
```

---

## 7. Test Data Management

### 7.1 Test Fixtures and Factories

**Example 23: Builder factory pattern**

```typescript
// tests/factories/builderFactory.ts
import { nanoid } from 'nanoid';
import type { InsertBuilder } from '../shared/schema';

export function createBuilderData(overrides: Partial<InsertBuilder> = {}): InsertBuilder {
  return {
    id: nanoid(),
    name: `Test Builder ${nanoid(4)}`,
    contactEmail: `builder-${nanoid(6)}@example.com`,
    contactPhone: '612-555-0123',
    address: '123 Main St',
    city: 'Minneapolis',
    state: 'MN',
    zipCode: '55401',
    createdAt: new Date(),
    ...overrides,
  };
}

export async function createBuilder(
  storage: IStorage,
  overrides: Partial<InsertBuilder> = {}
) {
  const data = createBuilderData(overrides);
  return await storage.createBuilder(data);
}

// Usage in tests
import { describe, it, expect } from 'vitest';
import { createBuilder } from './factories/builderFactory';

describe('Builder Tests', () => {
  it('should create builder with default data', async () => {
    const builder = await createBuilder(storage);
    
    expect(builder.name).toMatch(/^Test Builder/);
    expect(builder.contactEmail).toContain('@example.com');
  });

  it('should create builder with custom data', async () => {
    const builder = await createBuilder(storage, {
      name: 'Custom Builder',
      city: 'St. Paul',
    });
    
    expect(builder.name).toBe('Custom Builder');
    expect(builder.city).toBe('St. Paul');
  });
});
```

**Example 24: Job factory with relationships**

```typescript
// tests/factories/jobFactory.ts
import { nanoid } from 'nanoid';
import { createBuilder } from './builderFactory';
import type { InsertJob } from '../shared/schema';

export function createJobData(overrides: Partial<InsertJob> = {}): InsertJob {
  return {
    id: nanoid(),
    name: `Inspection ${nanoid(4)}`,
    address: `${Math.floor(Math.random() * 9999)} Main St`,
    city: 'Minneapolis',
    state: 'MN',
    zipCode: '55401',
    status: 'pending',
    inspectionType: 'Thermal Bypass',
    priority: 'medium',
    totalItems: 52,
    completedItems: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

export async function createJobWithBuilder(
  storage: IStorage,
  jobOverrides: Partial<InsertJob> = {},
  builderOverrides: Partial<InsertBuilder> = {}
) {
  const builder = await createBuilder(storage, builderOverrides);
  const job = await storage.createJob(
    createJobData({
      builderId: builder.id,
      ...jobOverrides,
    })
  );

  return { job, builder };
}

// Usage
const { job, builder } = await createJobWithBuilder(storage, {
  status: 'in-progress',
  scheduledDate: new Date('2025-11-01'),
});
```

### 7.2 Seed Data for Development

**Example 25: Development seed script**

```typescript
// server/seeds/dev-seed.ts
import { db } from '../db';
import { users, builders, jobs, forecasts } from '../../shared/schema';
import bcrypt from 'bcrypt';

export async function seedDevData() {
  console.log('Seeding development data...');

  // Create test users
  const adminUser = await db.insert(users).values({
    id: 'user-admin',
    email: 'admin@example.com',
    username: 'admin',
    passwordHash: await bcrypt.hash('admin123', 10),
    role: 'admin',
  }).returning();

  const inspectorUser = await db.insert(users).values({
    id: 'user-inspector',
    email: 'inspector@example.com',
    username: 'inspector',
    passwordHash: await bcrypt.hash('inspector123', 10),
    role: 'inspector',
  }).returning();

  // Create test builders
  const testBuilders = await db.insert(builders).values([
    {
      id: 'builder-1',
      name: 'Smith Custom Homes',
      contactEmail: 'john@smithhomes.com',
      contactPhone: '612-555-0101',
      address: '100 Builder Ave',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55401',
    },
    {
      id: 'builder-2',
      name: 'Johnson Construction',
      contactEmail: 'mike@johnsonconstruction.com',
      contactPhone: '651-555-0202',
      address: '200 Construction Blvd',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55102',
    },
  ]).returning();

  // Create test jobs
  const testJobs = await db.insert(jobs).values([
    {
      id: 'job-1',
      name: 'Thermal Bypass Inspection',
      address: '123 Main St',
      city: 'Minneapolis',
      state: 'MN',
      zipCode: '55401',
      builderId: 'builder-1',
      status: 'completed',
      inspectionType: 'Thermal Bypass',
      priority: 'high',
      totalItems: 52,
      completedItems: 52,
      scheduledDate: new Date('2025-10-15'),
      completedDate: new Date('2025-10-15'),
    },
    {
      id: 'job-2',
      name: 'Blower Door Test',
      address: '456 Oak Ave',
      city: 'St. Paul',
      state: 'MN',
      zipCode: '55102',
      builderId: 'builder-2',
      status: 'in-progress',
      inspectionType: 'Blower Door',
      priority: 'medium',
      totalItems: 10,
      completedItems: 5,
      scheduledDate: new Date('2025-10-30'),
    },
  ]).returning();

  // Create compliance forecasts
  await db.insert(forecasts).values([
    {
      id: 'forecast-1',
      jobId: 'job-1',
      actualACH50: '4.2',
      actualTDL: '3.5',
      actualDLO: '5.8',
      confidence: 95,
    },
    {
      id: 'forecast-2',
      jobId: 'job-2',
      predictedACH50: '4.8',
      predictedTDL: '3.8',
      confidence: 85,
    },
  ]);

  console.log('✅ Development data seeded successfully');
  console.log('  - 2 users created');
  console.log('  - 2 builders created');
  console.log('  - 2 jobs created');
  console.log('  - 2 forecasts created');
}

// Run seed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDevData().then(() => process.exit(0));
}
```

### 7.3 Test Data Cleanup

**Example 26: Database cleanup utilities**

```typescript
// tests/helpers/cleanup.ts
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

export async function cleanupDatabase() {
  // Delete in correct order (foreign key constraints)
  await db.execute(sql`TRUNCATE TABLE photos CASCADE`);
  await db.execute(sql`TRUNCATE TABLE forecasts CASCADE`);
  await db.execute(sql`TRUNCATE TABLE checklist_items CASCADE`);
  await db.execute(sql`TRUNCATE TABLE jobs CASCADE`);
  await db.execute(sql`TRUNCATE TABLE builders CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  
  // Reset sequences
  await db.execute(sql`ALTER SEQUENCE IF EXISTS jobs_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE IF EXISTS builders_id_seq RESTART WITH 1`);
}

export async function cleanupTestUser(userId: string) {
  // Clean up all data for specific user
  await db.execute(sql`
    DELETE FROM jobs WHERE inspector_id = ${userId}
  `);
  
  await db.execute(sql`
    DELETE FROM builders WHERE user_id = ${userId}
  `);
  
  await db.execute(sql`
    DELETE FROM users WHERE id = ${userId}
  `);
}

// Use in tests
import { afterEach } from 'vitest';

afterEach(async () => {
  await cleanupDatabase();
});
```

### 7.4 Idempotent Test Data

**Example 27: Repeatable test setup**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import { builders } from '../shared/schema';

describe('Builder CRUD Operations', () => {
  // Idempotent setup - can run multiple times
  beforeEach(async () => {
    // Delete existing test data
    await db.delete(builders).where(
      sql`name LIKE 'Test Builder%'`
    );

    // Insert fresh test data
    await db.insert(builders).values([
      {
        id: 'test-builder-1',
        name: 'Test Builder Alpha',
        contactEmail: 'alpha@test.com',
      },
      {
        id: 'test-builder-2',
        name: 'Test Builder Beta',
        contactEmail: 'beta@test.com',
      },
    ]);
  });

  it('should list all builders', async () => {
    const allBuilders = await db.query.builders.findMany();
    
    expect(allBuilders).toHaveLength(2);
  });

  it('should find builder by ID', async () => {
    const builder = await db.query.builders.findFirst({
      where: (builders, { eq }) => eq(builders.id, 'test-builder-1'),
    });

    expect(builder.name).toBe('Test Builder Alpha');
  });
});
```

---

## 8. Testing Best Practices

### 8.1 Descriptive Test Names

**Example 28: User-facing test descriptions**

```typescript
// ❌ Bad: Implementation-focused names
describe('JobService', () => {
  it('test1', () => { /* ... */ });
  it('should call createJob', () => { /* ... */ });
  it('returns job object', () => { /* ... */ });
});

// ✅ Good: Behavior-focused names
describe('Job Creation', () => {
  it('should create job with valid Minnesota address', () => { /* ... */ });
  
  it('should reject job without required inspection type', () => { /* ... */ });
  
  it('should assign auto-generated ID to new jobs', () => { /* ... */ });
  
  it('should notify inspector when job is assigned to them', () => { /* ... */ });
});

// ✅ Better: Natural language descriptions
describe('When creating a new job', () => {
  describe('with valid data', () => {
    it('creates job record in database', () => { /* ... */ });
    it('sends confirmation email to inspector', () => { /* ... */ });
    it('adds job to inspector\'s schedule', () => { /* ... */ });
  });

  describe('with invalid data', () => {
    it('rejects empty address', () => { /* ... */ });
    it('rejects future scheduled date beyond 1 year', () => { /* ... */ });
    it('rejects inspection type not in approved list', () => { /* ... */ });
  });
});
```

### 8.2 Test Isolation

**Example 29: Avoiding shared state**

```typescript
// ❌ Bad: Shared mutable state
let sharedUser: User;
let sharedJob: Job;

beforeAll(async () => {
  sharedUser = await createUser();
  sharedJob = await createJob();
});

it('test 1 modifies job', async () => {
  sharedJob.status = 'completed'; // Mutates shared state!
  await updateJob(sharedJob);
});

it('test 2 expects pending job', async () => {
  expect(sharedJob.status).toBe('pending'); // FAILS! Modified by test 1
});

// ✅ Good: Each test creates own data
describe('Job status updates', () => {
  it('should mark job as completed', async () => {
    const job = await createJob({ status: 'in-progress' });
    
    await updateJobStatus(job.id, 'completed');
    
    const updated = await getJob(job.id);
    expect(updated.status).toBe('completed');
  });

  it('should prevent completing job with incomplete items', async () => {
    const job = await createJob({
      status: 'in-progress',
      totalItems: 52,
      completedItems: 30, // Not all items complete
    });
    
    await expect(
      updateJobStatus(job.id, 'completed')
    ).rejects.toThrow('Cannot complete job with incomplete items');
  });
});
```

### 8.3 Fast Feedback

**Example 30: Optimizing test speed**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ❌ Slow: Database reset before each test
describe('Slow tests', () => {
  beforeEach(async () => {
    await cleanupDatabase(); // 500ms
    await seedDatabase();    // 1000ms
  });

  it('test 1', async () => { /* 100ms */ });
  it('test 2', async () => { /* 100ms */ });
  it('test 3', async () => { /* 100ms */ });
  
  // Total: (1500ms + 100ms) * 3 = 4800ms
});

// ✅ Fast: Setup once, clean between tests
describe('Fast tests', () => {
  beforeAll(async () => {
    await cleanupDatabase(); // 500ms once
    await seedDatabase();    // 1000ms once
  });

  afterEach(async () => {
    // Only clean data created by test
    await cleanupTestData(); // 50ms
  });

  it('test 1', async () => { /* 100ms */ });
  it('test 2', async () => { /* 100ms */ });
  it('test 3', async () => { /* 100ms */ });
  
  // Total: 1500ms + (150ms * 3) = 1950ms (2.5x faster!)
});

// ✅ Even faster: Use transactions
describe('Fastest tests', () => {
  beforeEach(async () => {
    await db.execute(sql`BEGIN`);
  });

  afterEach(async () => {
    await db.execute(sql`ROLLBACK`); // Instant cleanup!
  });

  it('test 1', async () => { /* 100ms */ });
  it('test 2', async () => { /* 100ms */ });
  it('test 3', async () => { /* 100ms */ });
  
  // Total: 300ms (16x faster!)
});
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

**Example 31: Complete CI/CD pipeline**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit
      
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm start &
        env:
          NODE_ENV: test
      
      - name: Wait for app to be ready
        run: npx wait-on http://localhost:5000 --timeout 60000
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      - name: Upload failed screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: failed-screenshots
          path: test-results/
          retention-days: 7

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start application
        run: npm start &
        env:
          NODE_ENV: production
      
      - name: Wait for app
        run: npx wait-on http://localhost:5000
      
      - name: Run load tests
        run: k6 run tests/performance/api-load-test.js
        env:
          BASE_URL: http://localhost:5000
      
      - name: Check performance regression
        run: |
          # Compare with baseline
          if [ -f performance-baseline.json ]; then
            node scripts/compare-performance.js
          fi
```

### 9.2 Pre-commit Hooks

**Example 32: Husky + lint-staged setup**

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting and tests
npm run pre-commit

# Type check
npm run check

# Run affected tests only
npm run test:affected
```

---

## 10. Smoke Test Suite Pattern

### 10.1 Shell-Based Smoke Tests

**Example 33: Complete smoke test script**

```bash
#!/bin/bash
# scripts/smoke-test-api.sh

set -e  # Exit on first error

BASE_URL="${BASE_URL:-http://localhost:5000}"
VERBOSE="${VERBOSE:-false}"
EXIT_CODE=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  EXIT_CODE=1
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

api_call() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local data=$4
  
  log_info "Testing $method $endpoint"
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$data" \
      "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$BASE_URL$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" -eq "$expected_status" ]; then
    log_info "✓ $method $endpoint returned $http_code"
    if [ "$VERBOSE" = "true" ]; then
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo "$body"
  else
    log_error "✗ $method $endpoint returned $http_code (expected $expected_status)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  fi
}

# Test suite
run_smoke_tests() {
  log_info "Starting smoke tests against $BASE_URL"
  
  # Test 1: Health check
  log_info "=== Test 1: Health Check ==="
  health=$(api_call GET /api/health 200)
  status=$(echo "$health" | jq -r '.status')
  
  if [ "$status" != "healthy" ]; then
    log_error "Health check failed: status is $status"
  fi
  
  # Test 2: Authentication
  log_info "=== Test 2: Authentication ==="
  login_response=$(api_call POST /api/login 200 '{"username":"admin","password":"admin123"}')
  AUTH_TOKEN=$(echo "$login_response" | jq -r '.token')
  
  if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "null" ]; then
    log_error "Authentication failed: no token received"
    exit 1
  fi
  
  log_info "✓ Authenticated successfully"
  
  # Test 3: Create builder
  log_info "=== Test 3: Create Builder ==="
  builder_data='{
    "name": "Smoke Test Builder",
    "contactEmail": "smoke@test.com"
  }'
  
  builder=$(api_call POST /api/builders 201 "$builder_data")
  builder_id=$(echo "$builder" | jq -r '.id')
  
  if [ -z "$builder_id" ] || [ "$builder_id" = "null" ]; then
    log_error "Builder creation failed"
  else
    log_info "✓ Created builder: $builder_id"
  fi
  
  # Test 4: List builders
  log_info "=== Test 4: List Builders ==="
  builders=$(api_call GET /api/builders 200)
  count=$(echo "$builders" | jq '. | length')
  
  if [ "$count" -lt 1 ]; then
    log_error "No builders found"
  else
    log_info "✓ Found $count builders"
  fi
  
  # Test 5: Get single builder
  log_info "=== Test 5: Get Builder ==="
  single_builder=$(api_call GET "/api/builders/$builder_id" 200)
  name=$(echo "$single_builder" | jq -r '.name')
  
  if [ "$name" != "Smoke Test Builder" ]; then
    log_error "Builder name mismatch: $name"
  else
    log_info "✓ Retrieved builder correctly"
  fi
  
  # Test 6: Create job
  log_info "=== Test 6: Create Job ==="
  job_data="{
    \"name\": \"Smoke Test Job\",
    \"address\": \"123 Test St\",
    \"builderId\": \"$builder_id\",
    \"inspectionType\": \"Thermal Bypass\"
  }"
  
  job=$(api_call POST /api/jobs 201 "$job_data")
  job_id=$(echo "$job" | jq -r '.id')
  
  if [ -z "$job_id" ] || [ "$job_id" = "null" ]; then
    log_error "Job creation failed"
  else
    log_info "✓ Created job: $job_id"
  fi
  
  # Test 7: Update job status
  log_info "=== Test 7: Update Job Status ==="
  update_data='{"status":"in-progress"}'
  
  updated_job=$(api_call PATCH "/api/jobs/$job_id" 200 "$update_data")
  new_status=$(echo "$updated_job" | jq -r '.status')
  
  if [ "$new_status" != "in-progress" ]; then
    log_error "Job status update failed: $new_status"
  else
    log_info "✓ Updated job status"
  fi
  
  # Cleanup
  log_info "=== Cleanup ==="
  api_call DELETE "/api/jobs/$job_id" 204 || log_warn "Failed to delete job"
  api_call DELETE "/api/builders/$builder_id" 204 || log_warn "Failed to delete builder"
  
  # Summary
  echo ""
  echo "================================"
  if [ $EXIT_CODE -eq 0 ]; then
    log_info "All smoke tests passed! ✓"
  else
    log_error "Some smoke tests failed ✗"
  fi
  echo "================================"
  
  exit $EXIT_CODE
}

# Run tests
run_smoke_tests
```

**Run smoke tests:**
```bash
# Local development
./scripts/smoke-test-api.sh

# Against staging
BASE_URL=https://staging.example.com ./scripts/smoke-test-api.sh

# Verbose mode
VERBOSE=true ./scripts/smoke-test-api.sh
```

---

## 11. Testing Security

### 11.1 SQL Injection Prevention

**Example 34: Testing parameterized queries**

```typescript
import { describe, it, expect } from 'vitest';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

describe('SQL Injection Prevention', () => {
  it('should safely handle quotes in builder name', async () => {
    const maliciousName = "O'Brien'; DROP TABLE builders; --";

    // Should NOT execute SQL injection
    const builder = await db.insert(builders).values({
      name: maliciousName,
      contactEmail: 'test@example.com',
    }).returning();

    expect(builder[0].name).toBe(maliciousName);
    
    // Verify builders table still exists
    const allBuilders = await db.query.builders.findMany();
    expect(allBuilders).toBeDefined();
  });

  it('should prevent injection via search parameter', async () => {
    const maliciousSearch = "'; DELETE FROM jobs WHERE '1'='1";

    // Using parameterized query
    const results = await db.query.jobs.findMany({
      where: (jobs, { like }) => like(jobs.address, `%${maliciousSearch}%`),
    });

    // Should return no results (not delete data)
    expect(results).toEqual([]);
    
    // Verify jobs still exist
    const allJobs = await db.query.jobs.findMany();
    expect(allJobs.length).toBeGreaterThan(0);
  });
});
```

### 11.2 XSS Prevention

**Example 35: Input sanitization tests**

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../server/utils/sanitize';

describe('XSS Prevention', () => {
  it('should strip script tags from input', () => {
    const malicious = '<script>alert("xss")</script>Clean text';
    
    const sanitized = sanitizeInput(malicious);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Clean text');
  });

  it('should encode HTML entities', () => {
    const htmlInput = '<b>Bold</b> & <i>Italic</i>';
    
    const sanitized = sanitizeInput(htmlInput);
    
    expect(sanitized).toBe('&lt;b&gt;Bold&lt;/b&gt; &amp; &lt;i&gt;Italic&lt;/i&gt;');
  });

  it('should handle event handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    
    const sanitized = sanitizeInput(malicious);
    
    expect(sanitized).not.toContain('onerror');
  });
});
```

### 11.3 Rate Limiting

**Example 36: Testing rate limit enforcement**

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app).get('/api/jobs')
    );

    const responses = await Promise.all(requests);
    
    responses.forEach(res => {
      expect(res.status).toBe(401); // Unauthorized (not rate limited)
    });
  });

  it('should block requests exceeding limit', async () => {
    // Make 100 rapid requests
    const requests = Array(100).fill(null).map(() =>
      request(app).post('/api/builders').send({})
    );

    const responses = await Promise.all(requests);
    
    // At least one should be rate limited
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should reset limit after time window', async () => {
    // Exhaust rate limit
    await Promise.all(
      Array(100).fill(null).map(() => request(app).get('/api/status'))
    );

    // Wait for window to reset (1 minute)
    await new Promise(resolve => setTimeout(resolve, 61000));

    // Should work again
    const response = await request(app).get('/api/status');
    expect(response.status).toBe(200);
  });
});
```

---

## 12. Testing Accessibility

### 12.1 Keyboard Navigation

**Example 37: Tab order and keyboard shortcuts**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobForm } from '../client/src/components/JobForm';

describe('Keyboard Accessibility', () => {
  it('should have logical tab order', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(<JobForm />);

    // Tab through form fields
    await user.tab();
    expect(getByTestId('input-address')).toHaveFocus();

    await user.tab();
    expect(getByTestId('input-city')).toHaveFocus();

    await user.tab();
    expect(getByTestId('select-inspection-type')).toHaveFocus();

    await user.tab();
    expect(getByTestId('button-submit')).toHaveFocus();
  });

  it('should submit form on Enter key', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { getByTestId } = render(<JobForm onSubmit={onSubmit} />);

    await user.type(getByTestId('input-address'), '123 Main St');
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalled();
  });

  it('should close modal on Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Dialog open onClose={onClose}>
        <DialogContent data-testid="modal-content">
          Content
        </DialogContent>
      </Dialog>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

### 12.2 ARIA Labels and Screen Readers

**Example 38: Accessibility attributes**

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { JobCard } from '../client/src/components/JobCard';

expect.extend(toHaveNoViolations);

describe('JobCard Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <JobCard
        job={{
          id: 'job-1',
          address: '123 Main St',
          status: 'pending',
        }}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have ARIA labels for buttons', () => {
    const { getByRole } = render(<JobCard job={mockJob} />);

    const viewButton = getByRole('button', { name: /view details/i });
    expect(viewButton).toHaveAttribute('aria-label', 'View job details');

    const editButton = getByRole('button', { name: /edit/i });
    expect(editButton).toHaveAttribute('aria-label', 'Edit job');
  });

  it('should announce status changes to screen readers', () => {
    const { rerender, getByRole } = render(
      <JobCard job={{ ...mockJob, status: 'pending' }} />
    );

    const statusBadge = getByRole('status');
    expect(statusBadge).toHaveAttribute('aria-live', 'polite');

    rerender(<JobCard job={{ ...mockJob, status: 'completed' }} />);
    
    expect(statusBadge).toHaveTextContent('Completed');
  });
});
```

---

## 13. Testing Edge Cases

### 13.1 Empty States

**Example 39: No data scenarios**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Jobs } from '../client/src/pages/Jobs';

describe('Jobs Page - Empty State', () => {
  it('should show empty state when no jobs exist', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['/api/jobs'], { jobs: [], pagination: { total: 0 } });

    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('empty-state-jobs')).toBeVisible();
    expect(screen.getByText(/no jobs found/i)).toBeVisible();
    expect(screen.getByTestId('button-create-first-job')).toBeVisible();
  });

  it('should show empty search results', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['/api/jobs'], {
      jobs: [],
      pagination: { total: 0 },
      searchQuery: 'nonexistent',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    expect(screen.getByText(/no results for "nonexistent"/i)).toBeVisible();
    expect(screen.getByTestId('button-clear-search')).toBeVisible();
  });
});
```

### 13.2 Timezone Edge Cases

**Example 40: DST transitions and leap years**

```typescript
import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { scheduleInspection, calculateBusinessDays } from '../server/scheduling';

describe('Timezone Edge Cases', () => {
  it('should handle spring forward (DST begins)', () => {
    // March 9, 2025, 2:00 AM → 3:00 AM (loses 1 hour)
    const beforeDST = DateTime.fromObject(
      { year: 2025, month: 3, day: 9, hour: 1, minute: 59 },
      { zone: 'America/Chicago' }
    );

    const scheduled = scheduleInspection(beforeDST, { hoursLater: 2 });

    // 1:59 AM + 2 hours = 3:59 AM (not 3:59 AM due to DST)
    expect(scheduled.hour).toBe(3);
    expect(scheduled.minute).toBe(59);
  });

  it('should handle fall back (DST ends)', () => {
    // November 2, 2025, 2:00 AM → 1:00 AM (gains 1 hour)
    const beforeFallBack = DateTime.fromObject(
      { year: 2025, month: 11, day: 2, hour: 1, minute: 30 },
      { zone: 'America/Chicago' }
    );

    const scheduled = scheduleInspection(beforeFallBack, { hoursLater: 2 });

    expect(scheduled.hour).toBe(3); // Still correct despite DST
  });

  it('should handle leap year February 29', () => {
    const leapDay = DateTime.fromObject(
      { year: 2024, month: 2, day: 29 },
      { zone: 'America/Chicago' }
    );

    expect(leapDay.isValid).toBe(true);
    expect(leapDay.day).toBe(29);
  });

  it('should reject February 29 in non-leap years', () => {
    const invalidDate = DateTime.fromObject(
      { year: 2025, month: 2, day: 29 },
      { zone: 'America/Chicago' }
    );

    expect(invalidDate.isValid).toBe(false);
  });

  it('should calculate business days excluding weekends', () => {
    const friday = DateTime.fromObject({ year: 2025, month: 10, day: 31 });
    const businessDays = calculateBusinessDays(friday, 3);

    // Friday + 3 business days = Wednesday (skip Sat, Sun, Mon → Wed)
    expect(businessDays.weekday).toBe(3); // Wednesday
    expect(businessDays.day).toBe(5); // November 5
  });
});
```

---

## 14. Debugging Failed Tests

### 14.1 Debug Output

**Example 41: Verbose logging for failed tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { debug } from '@testing-library/react';

describe('Job Form Debugging', () => {
  it('should show validation errors', async () => {
    const { container, getByTestId } = render(<JobForm />);

    // Submit empty form
    fireEvent.click(getByTestId('button-submit'));

    // Debug: Print entire DOM
    debug(container);

    // Debug: Print specific element
    const errorElement = screen.queryByTestId('error-address');
    if (!errorElement) {
      console.log('=== ERROR ELEMENT NOT FOUND ===');
      console.log('Available test IDs:', 
        container.querySelectorAll('[data-testid]').forEach(el => 
          console.log(el.getAttribute('data-testid'))
        )
      );
    }

    debug(errorElement);

    expect(errorElement).toBeVisible();
  });
});
```

### 14.2 Network Request Logging

**Example 42: Debugging API calls in E2E tests**

```typescript
import { test, expect } from '@playwright/test';

test('debug failed API calls', async ({ page }) => {
  // Log all network requests
  page.on('request', request => {
    console.log(`→ ${request.method()} ${request.url()}`);
  });

  // Log all responses
  page.on('response', response => {
    console.log(`← ${response.status()} ${response.url()}`);
  });

  // Log console messages from browser
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });

  // Log failed requests
  page.on('requestfailed', request => {
    console.error(`✗ FAILED: ${request.url()}`);
    console.error(`  Error: ${request.failure().errorText}`);
  });

  await page.goto('/jobs');
  
  // Your test code...
});
```

---

## 15. Test Maintenance

### 15.1 Refactoring Tests with Production Code

**Example 43: Shared test utilities**

```typescript
// tests/helpers/testHelpers.ts
import { db } from '../../server/db';
import { users, builders, jobs } from '../../shared/schema';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export async function createTestUser(overrides: Partial<InsertUser> = {}) {
  const user = await db.insert(users).values({
    id: nanoid(),
    email: `test-${nanoid(6)}@example.com`,
    username: `testuser-${nanoid(4)}`,
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'inspector',
    ...overrides,
  }).returning();

  return user[0];
}

export async function createAuthenticatedRequest(app: Express, user?: User) {
  const testUser = user || await createTestUser();
  const token = generateToken(testUser);

  return {
    user: testUser,
    token,
    request: (method: string, url: string) =>
      request(app)[method](url).set('Authorization', `Bearer ${token}`),
  };
}

// Usage in tests
import { createAuthenticatedRequest } from './helpers/testHelpers';

describe('Builder API', () => {
  it('should create builder', async () => {
    const { request } = await createAuthenticatedRequest(app);

    const response = await request('post', '/api/builders')
      .send({ name: 'Test Builder' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

### 15.2 DRY Principle in Tests

**Example 44: Reusable test scenarios**

```typescript
// tests/scenarios/jobScenarios.ts
export const compliantJobScenario = {
  job: {
    address: '123 Main St',
    inspectionType: 'Blower Door',
  },
  forecast: {
    actualACH50: '4.5', // Under 5.0
    actualTDL: '3.2',   // Under 4.0
    actualDLO: '5.5',   // Under 6.0
  },
  expectedCompliance: 'compliant',
};

export const nonCompliantJobScenario = {
  job: {
    address: '456 Oak Ave',
    inspectionType: 'Blower Door',
  },
  forecast: {
    actualACH50: '5.5', // Over 5.0
    actualTDL: '4.2',   // Over 4.0
    actualDLO: '6.5',   // Over 6.0
  },
  expectedCompliance: 'non-compliant',
  expectedViolations: 3,
};

// Usage
import { compliantJobScenario, nonCompliantJobScenario } from './scenarios/jobScenarios';

describe.each([
  compliantJobScenario,
  nonCompliantJobScenario,
])('Job compliance evaluation', (scenario) => {
  it(`should evaluate ${scenario.expectedCompliance} job correctly`, async () => {
    const job = await createJob(scenario.job);
    const forecast = await createForecast(job.id, scenario.forecast);

    const result = await evaluateJobCompliance(storage, job.id);

    expect(result.status).toBe(scenario.expectedCompliance);
    if (scenario.expectedViolations) {
      expect(result.violations).toHaveLength(scenario.expectedViolations);
    }
  });
});
```

---

## Conclusion

### Testing Philosophy Summary

**Testing is about confidence, not coverage percentages.**

The goal is to build an energy auditing application that field inspectors can rely on in any condition:
- ✅ Works offline when network is spotty
- ✅ Handles edge cases gracefully (zero values, null data, DST transitions)
- ✅ Prevents data loss (sync queue, conflict resolution)
- ✅ Maintains compliance accuracy (ACH50, TDL, DLO thresholds)
- ✅ Protects user data (SQL injection, XSS, CSRF protection)

**Key Takeaways:**

1. **Write tests for confidence** - Focus on critical paths and edge cases
2. **Follow the testing pyramid** - Many unit tests, moderate integration, few E2E
3. **Keep tests fast** - Unit tests <1ms, integration <100ms, E2E <5s
4. **Make tests readable** - Use descriptive names, clear assertions
5. **Maintain test quality** - Refactor tests with production code
6. **Automate everything** - CI/CD, coverage reports, performance checks
7. **Test real-world scenarios** - Offline mode, timezone edge cases, concurrent users

**Testing is not a checkbox exercise—it's how we ensure quality for inspectors in the field.**

---

**Document Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Next Review:** November 30, 2025  
**Maintained By:** Engineering Team
