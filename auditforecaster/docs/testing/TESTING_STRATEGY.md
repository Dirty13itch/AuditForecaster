# Testing Strategy & Standards

## Overview

AuditForecaster follows the testing pyramid strategy with a focus on fast, reliable tests that provide confidence in the codebase.

---

## Testing Pyramid

```
          /\
         /  \    E2E Tests (5%)
        /----\      ~10 critical paths
       /      \     
      /--------\  
     / Integration\ Integration Tests (15%)
    /  Tests (15%) \  ~30 tests
   /--------------\   
  /   Unit Tests   \  Unit Tests (80%)
 /    (80%)         \  ~200+ tests
/--------------------\
```

### Test Distribution Goals

| Type | Count | Coverage | Purpose |
|------|-------|----------|---------|
| Unit | 200+ | 80% overall | Individual functions,logic |
| Integration | ~30 | All critical paths | Server actions, API routes |
| E2E | ~10 | User journeys | Full workflows |

---

## Unit Testing

### Tools & Libraries

```json
{
  "vitest": "Latest",
  "@testing-library/react": "Latest",
  "@testing-library/user-event": "Latest",
  "@testing-library/jest-dom": "Latest",
  "@vitejs/plugin-react": "Latest"
}
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.next/'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### Test File Structure

```
src/app/actions/
├── builders.ts
└── __tests__/
    ├── builders.test.ts
    ├── fleet.test.ts
    └── equipment.test.ts
```

### Writing Good Unit Tests

**Example: Server Action Test**

```typescript
// src/app/actions/__tests__/builders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBuilder, updateBuilder, deleteBuilder } from '../builders'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(() => mockSession)
}))

describe('builders actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createBuilder', () => {
    it('should create builder with valid data', async () => {
      // Arrange
      const formData = new FormData()
      formData.set('name', 'Test Builder')
      formData.set('email', 'test@example.com')

      prismaMock.builder.create.mockResolvedValue({
        id: '1',
        name: 'Test Builder',
        email: 'test@example.com',
        phone: null,
        address: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Act
      const result = await createBuilder(formData)

      // Assert
      expect(result.message).toBe('Builder created successfully')
      expect(prismaMock.builder.create).toHaveBeenCalledTimes(1)
      expect(prismaMock.builder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Builder',
          email: 'test@example.com'
        })
      })
    })

    it('should reject empty name', async () => {
      const formData = new FormData()
      formData.set('name', '')

      const result = await createBuilder(formData)

      expect(result.message).toContain('failed')
      expect(prismaMock.builder.create).not.toHaveBeenCalled()
    })

    it('should handle unauthorized users', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)

      const formData = new FormData()
      formData.set('name', 'Builder')

      const result = await createBuilder(formData)

      expect(result.message).toBe('Unauthorized')
    })
  })
})
```

**Example: Component Test**

```typescript
// src/components/__tests__/user-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UserForm } from '../user-form'
import { vi } from 'vitest'

describe('UserForm', () => {
  it('renders all form fields', () => {
    render(<UserForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn()
    render(<UserForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' }
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' }
    })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com'
      })
    )
  })
})
```

### Mocking Strategies

**Prisma Mock:**

```typescript
// test/mocks/prisma.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

export const prismaMock = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(prismaMock)
})
```

**Auth Mock:**

```typescript
// test/mocks/auth.ts
export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'ADMIN'
  }
}
```

---

## Integration Testing

### Scope

Integration tests verify:
- Server Actions end-to-end
- API routes
- Database operations
- External API mocks

### Test Database Setup

```typescript
// test/setup/database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
})

export async function setupTestDB() {
  // Clear all tables
  await prisma.$transaction([
    prisma.photo.deleteMany(),
    prisma.inspection.deleteMany(),
    prisma.job.deleteMany(),
    prisma.builder.deleteMany(),
    prisma.user.deleteMany()
  ])

  // Seed test data
  await seedTestData(prisma)
}

export async function teardownTestDB() {
  await prisma.$disconnect()
}
```

### Example Integration Test

```typescript
// src/app/actions/__tests__/builders.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createBuilder } from '../builders'
import { setupTestDB, teardownTestDB } from '@/test/setup/database'

describe('Builders Integration', () => {
  beforeAll(async () => {
    await setupTestDB()
  })

  afterAll(async () => {
    await teardownTestDB()
  })

  it('should persist builder to database', async () => {
    const formData = new FormData()
    formData.set('name', 'Integration Test Builder')

    const result = await createBuilder(formData)

    expect(result.message).toBe('Builder created successfully')

    // Verify in database
    const builder = await prisma.builder.findFirst({
      where: { name: 'Integration Test Builder' }
    })

    expect(builder).toBeTruthy()
    expect(builder?.name).toBe('Integration Test Builder')
  })
})
```

---

## End-to-End Testing

### Tools

- **Playwright** (currently configured)
- **@playwright/test**

### Critical User Journeys

1. **Inspector Workflow:**
   - Login
   - View assigned jobs
   - Start inspection
   - Fill inspection form
   - Upload photos
   - Submit for QA
   - View confirmation

2. **Builder Portal:**
   - Login as builder
   - View schedule
   - View job details
   - Download report

3. **Admin Workflow:**
   - Create builder
   - Create pricing
   - Schedule job
   - QA review
   - Approve/reject inspection

### Example E2E Test

```typescript
// e2e/inspector-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Inspector Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('complete inspection from start to finish', async ({ page }) => {
    // Login
    await page.fill('[name="email"]', 'inspector@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')

    // Navigate to jobs
    await page.click('text=Jobs')
    await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible()

    // Start first inspection
    await page.click('button:has-text("Start Inspection")').first()

    // Fill form
    await page.fill('[name="notes"]', 'Test inspection notes')
    await page.selectOption('[name="status"]', 'PASS')

    // Upload photo
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles('./test/fixtures/sample-photo.jpg')

    // Wait for upload
    await expect(page.getByText('Upload complete')).toBeVisible()

    // Submit
    await page.click('button:has-text("Submit Inspection")')

    // Verify success
    await expect(page.getByText(/inspection submitted/i)).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/inspections\/\w+/)
  })

  test('handles validation errors', async ({ page }) => {
    // Login...
    
    // Try to submit without required fields
    await page.click('button:has-text("Submit Inspection")')

    // Should show validation errors
    await expect(page.getByText(/required/i)).toBeVisible()
  })
})
```

### E2E Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

---

## Performance Testing

### Tools

- **k6** - Load testing
- **Lighthouse CI** - Performance regression

### Load Testing Example

```javascript
// load-tests/api-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01']    // Error rate < 1%
  }
}

export default function() {
  const res = http.get('http://localhost:3000/api/jobs')
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500
  })
  
  sleep(1)
}
```

### Running Load Tests

```bash
# Install k6
# macOS
brew install k6

# Windows
choco install k6

# Run test
k6 run load-tests/api-load.js
```

---

## Coverage Requirements

### Per-Module Thresholds

| Module | Line Coverage | Branch Coverage |
|--------|--------------|-----------------|
| Server Actions | 90% | 85% |
| API Routes | 90% | 85% |
| Utilities (`/lib`) | 100% | 95% |
| Components | 80% | 75% |
| Hooks | 85% | 80% |
| **Overall** | **80%** | **75%** |

### Running Coverage

```bash
# Run all tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

---

## Continuous Integration

### Test Stages

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
```

---

## Test Data Management

### Fixtures

```typescript
// test/fixtures/builders.ts
export const mockBuilders = [
  {
    id: '1',
    name: 'Test Builder 1',
    email: 'builder1@test.com',
    phone: '555-0001',
    address: '123 Test St'
  },
  // ...
]
```

### Factory Functions

```typescript
// test/factories/job-factory.ts
export function createMockJob(overrides = {}) {
  return {
    id: faker.string.uuid(),
    status: 'PENDING',
    scheduledDate: new Date(),
    address: faker.location.streetAddress(),
    ...overrides
  }
}
```

---

## Best Practices

### DO

✅ Write tests before fixing bugs (TDD for bug fixes)
✅ Test behavior, not implementation
✅ Use descriptive test names
✅ Keep tests isolated and independent
✅ Mock external dependencies
✅ Use meaningful assertions
✅ Test edge cases and error paths

### DON'T

❌ Test implementation details
❌ Write brittle tests (too many mocks)
❌ Skip error case testing
❌ Ignore flaky tests
❌ Test framework code
❌ Duplicate coverage

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)

*Last updated: 2025-11-24*
