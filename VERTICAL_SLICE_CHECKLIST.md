# VERTICAL SLICE CHECKLIST
## Master Production-Ready Checklist - 40/40 Standard

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Active Template  
**Owner:** Engineering Team

---

## Introduction

### Purpose of This Checklist

This is the **master checklist** for declaring any feature production-ready at the **40/40 standard** for the Energy Auditing Field Application. Every feature must achieve **40 out of 40 points** to be deployed to production.

This checklist consolidates all requirements from:
- [PRODUCTION_STANDARDS.md](./PRODUCTION_STANDARDS.md) - Complete 40/40 definition
- [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md) - Interface guidelines
- [TESTING_STANDARDS.md](./TESTING_STANDARDS.md) - Testing patterns  
- [OBSERVABILITY_STANDARDS.md](./OBSERVABILITY_STANDARDS.md) - Monitoring requirements

**Why 40/40?**

The 40-point system ensures:
- ✅ **Functional correctness** - Feature works as designed (Tier 1: 20 points)
- ✅ **Production hardening** - Feature is tested, accessible, performant (Tier 2: 10 points)
- ✅ **Operational excellence** - Feature is observable, debuggable, maintainable (Tier 3: 10 points)

**No partial credit.** Every checkbox must be checked. Every point must be earned. This is not about bureaucracy—it's about building software that field inspectors can trust with their livelihood.

---

### How to Use This Checklist

**Step 1: Copy this template for each new feature**
```bash
cp VERTICAL_SLICE_CHECKLIST.md docs/FEATURE_NAME_COMPLIANCE.md
```

**Step 2: Fill in Feature Information section**
- Feature name, description, developer, dates
- Links to runbook, smoke tests, seed data

**Step 3: Work through Tier 1 first**
- Complete all 20 points before moving to Tier 2
- Check off each item as you complete it
- Add evidence/notes where indicated

**Step 4: Then Tier 2, then Tier 3**
- Each tier builds on the previous
- Don't skip ahead—tiers must be completed in order

**Step 5: Additional Quality Checks**
- Security, UX polish, code quality
- These are bonus rigor checks that catch common issues

**Step 6: Final Approval**
- Self-review: All 40 points achieved
- Architect review: Code review, security verification
- Deployment readiness: Feature flags, rollback tested

**Step 7: Sign-off and deployment**
- Developer signs off
- Architect approves
- Feature deployed with monitoring verified

---

### Scoring System

**Total Points: 40/40 required for production**

**Tier 1: Core Functionality (20 points)**
- Database Layer: 4 points
- Storage Layer: 4 points  
- Business Logic: 3 points
- API Endpoints: 4 points
- Frontend Interface: 3 points
- Documentation: 2 points

**Tier 2: Production Hardening (10 points)**
- Unit Tests: 2 points
- Integration Tests: 2 points
- E2E Tests: 2 points
- Smoke Tests: 1 point
- API Documentation: 1 point
- Accessibility: 1 point
- Performance Benchmarks: 1 point

**Tier 3: Operational Excellence (10 points)**
- Observability - Logging: 2 points
- Observability - Error Tracking: 2 points
- Observability - Metrics: 2 points
- Operational Procedures: 2 points
- Monitoring & Alerting: 2 points

**Grading:**
- 40/40: Production Ready ✅
- 35-39/40: Close, but not ready (missing critical items)
- <35/40: Needs significant work

**No partial credit.** A feature with 39/40 is not production-ready. All 40 points required.

---

### Links to Detailed Standards

For deep dives into specific areas, consult:

**📘 Core Standards:**
- [PRODUCTION_STANDARDS.md](./PRODUCTION_STANDARDS.md) - The complete 40/40 definition with philosophy, examples, and detailed requirements
- [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md) - Design system, component patterns, accessibility, mobile-first guidelines
- [TESTING_STANDARDS.md](./TESTING_STANDARDS.md) - Unit, integration, E2E, smoke test patterns and best practices
- [OBSERVABILITY_STANDARDS.md](./OBSERVABILITY_STANDARDS.md) - Logging, metrics, tracing, alerting requirements

**📁 Templates:**
- [templates/SLICE_TEMPLATE.md](./templates/SLICE_TEMPLATE.md) - Runbook template for documenting features
- [templates/COMPLIANCE_TEMPLATE.md](./templates/COMPLIANCE_TEMPLATE.md) - Detailed compliance checklist template
- [templates/test-template.sh](./templates/test-template.sh) - Smoke test script template

**📚 Examples:**
- [BUILDERS_SLICE.md](./BUILDERS_SLICE.md) + [BUILDERS_COMPLIANCE.md](./BUILDERS_COMPLIANCE.md) - Complete example of 40/40 feature
- [JOBS_SLICE.md](./JOBS_SLICE.md) + [JOBS_COMPLIANCE.md](./JOBS_COMPLIANCE.md) - Another 40/40 reference
- [scripts/smoke-test-builders.sh](./scripts/smoke-test-builders.sh) - Example smoke test script

---

## Feature Information

> **Copy this template for each new feature. Fill in all fields before starting development.**

**Feature Name:** _______________________________________________

**Feature Description:**  
> One-paragraph description of what this feature does and who it's for

_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Developer(s):** _______________________________________________

**Start Date:** ________________________________________________

**Target Completion Date:** ____________________________________

**Actual Completion Date:** ____________________________________

**Related Runbook:** ___________________________________________  
> Example: `BUILDERS_SLICE.md` or `docs/FEATURE_SLICE.md`

**Related Smoke Tests:** _______________________________________  
> Example: `scripts/smoke-test-builders.sh`

**Related Seed Data:** _________________________________________  
> Example: `db/seed-builders.sql`

**Related E2E Tests:** _________________________________________  
> Example: `tests/builders.e2e.spec.ts`

---

## Tier 1: Core Functionality (20 Points)

**Tier 1 must be 100% complete before moving to Tier 2.**

### Tier 1 Score: _____ / 20 Points

---

### Database Layer (4 points)

**Score: _____ / 4**

**Schema Design (2 points)**

- [ ] Schema defined in `shared/schema.ts` with proper types
  - **Evidence:** File location: `shared/schema.ts` lines _____ to _____
  - **Verification:** Tables export proper Drizzle schema objects
  
- [ ] All columns have appropriate constraints
  - [ ] NOT NULL on required fields (e.g., id, name, status)
  - [ ] UNIQUE where needed (e.g., email, googleEventId)
  - [ ] DEFAULT values set (e.g., status='pending', createdAt=now())
  - [ ] CHECK constraints for enums (e.g., status IN ('pending', 'active', 'completed'))
  - **Evidence:** Review schema definition, note all constraints

- [ ] Foreign keys defined with proper onDelete behavior
  - [ ] CASCADE for dependent data (e.g., builder → contacts, jobs → checklist items)
  - [ ] SET NULL for optional relationships (e.g., job → lot, job → plan)
  - [ ] NO ACTION for audit trail preservation (e.g., createdBy even if user deleted)
  - **Evidence:** List all foreign key relationships and cascade rules

- [ ] Data types appropriate for use case
  - [ ] Decimal for currency/measurements (not Float)
  - [ ] Timestamp for dates (not String)
  - [ ] JSONB for structured data (not Text)
  - [ ] Text for variable-length strings (not VARCHAR with arbitrary limit)
  - **Evidence:** Review data type choices, justify if non-standard

- [ ] createdBy tracking for multi-tenant security where applicable
  - [ ] User ID captured on create operations
  - [ ] Used for row-level security filtering
  - **Evidence:** Show createdBy column in schema

- [ ] createdAt/updatedAt timestamps where needed
  - [ ] Automatically managed by database
  - [ ] Used for audit trails and conflict resolution
  - **Evidence:** Show timestamp columns in schema

**Indexes & Performance (2 points)**

- [ ] Indexes created for all foreign keys
  - **Evidence:** List all foreign key indexes (e.g., idx_jobs_builder_id)
  
- [ ] Indexes on frequently queried columns
  - [ ] Status fields (e.g., idx_jobs_status)
  - [ ] Date ranges (e.g., idx_jobs_scheduled_date)
  - [ ] User assignments (e.g., idx_jobs_assigned_to)
  - **Evidence:** List all non-FK indexes with justification

- [ ] Composite indexes for common filter combinations
  - [ ] Example: (assignedTo, scheduledDate) for "my upcoming jobs"
  - [ ] Example: (builderId, status) for "builder's active jobs"
  - **Evidence:** List composite indexes and query patterns they support

- [ ] Unique indexes where appropriate
  - [ ] Prevent duplicate data (e.g., googleEventId unique)
  - [ ] Enforce business constraints at DB level
  - **Evidence:** List unique indexes

- [ ] Migration tested successfully
  - [ ] `npm run db:push` completes without errors
  - [ ] No data loss warnings (or --force justified)
  - [ ] Seed data loads successfully
  - **Evidence:** Terminal output of successful migration

- [ ] Schema documented in runbook
  - [ ] Table purposes explained
  - [ ] Column descriptions provided
  - [ ] Relationship diagram included (if complex)
  - [ ] Index rationale documented
  - **Evidence:** Link to runbook section on schema

**Database Layer Notes:**
```
[Add notes on schema design decisions, index choices, migration challenges, etc.]





```

---

### Storage Layer (4 points)

**Score: _____ / 4**

**IStorage Interface (2 points)**

- [ ] IStorage interface updated in `server/storage.ts`
  - **Evidence:** Interface location: `server/storage.ts` lines _____ to _____

- [ ] All CRUD methods defined
  - [ ] create[Entity](data: Insert[Entity]): Promise<[Entity]>
  - [ ] get[Entity](id: string): Promise<[Entity] | undefined>
  - [ ] getAll[Entities](): Promise<[Entity][]>
  - [ ] update[Entity](id: string, data: Partial<Insert[Entity]>): Promise<[Entity] | undefined>
  - [ ] delete[Entity](id: string): Promise<boolean>
  - **Evidence:** List all CRUD method signatures

- [ ] Specialized query methods for common use cases
  - [ ] By user: get[Entities]ByUser(userId: string)
  - [ ] By status: get[Entities]ByStatus(status: string[])
  - [ ] By date range: get[Entities]ByDateRange(start: Date, end: Date)
  - **Evidence:** List all specialized query methods

- [ ] Pagination methods included
  - [ ] get[Entities]Paginated(params: PaginationParams)
  - [ ] Supports both offset and cursor pagination
  - **Evidence:** Show pagination method signatures

- [ ] Storage methods return proper types from schema
  - [ ] Return types use `typeof table.$inferSelect`
  - [ ] Insert types use `z.infer<typeof insertSchema>`
  - [ ] No `any` types in interface
  - **Evidence:** TypeScript type checking passes

**PgStorage Implementation (2 points)**

- [ ] All interface methods implemented in PgStorage class
  - **Evidence:** Implementation location: `server/storage.ts` lines _____ to _____

- [ ] Error handling with try/catch blocks
  - [ ] All async operations wrapped
  - [ ] Errors logged with structured logging
  - [ ] Meaningful error messages returned
  - **Evidence:** Show example error handling pattern

- [ ] Complex queries documented with comments
  - [ ] Joins explained
  - [ ] Aggregations documented
  - [ ] Performance considerations noted
  - **Evidence:** Show examples of documented queries

- [ ] Drizzle ORM used for type-safe queries
  - [ ] No raw SQL unless absolutely necessary
  - [ ] Type safety verified at compile time
  - **Evidence:** Drizzle query examples

- [ ] Query optimization verified
  - [ ] EXPLAIN ANALYZE run on complex queries
  - [ ] Indexes used (shown in query plan)
  - [ ] Query time <100ms for common operations
  - **Evidence:** Query performance metrics

- [ ] Storage methods tested (at least smoke test coverage)
  - [ ] Create operation tested
  - [ ] Read operation tested
  - [ ] Update operation tested
  - [ ] Delete operation tested
  - **Evidence:** Reference to smoke test script

**Storage Layer Notes:**
```
[Add notes on implementation decisions, query optimization, testing challenges, etc.]





```

---

### Business Logic (3 points)

**Score: _____ / 3**

**Validation Functions (1 point)**

- [ ] Validation functions implemented
  - [ ] Zod schemas defined for all inputs
  - [ ] Custom validation logic in dedicated functions
  - [ ] Input sanitization (trim whitespace, normalize data)
  - **Evidence:** Location of validation functions: _____________________

- [ ] Field-level validation
  - [ ] Required fields enforced
  - [ ] String length limits (prevent database overflow)
  - [ ] Numeric ranges (e.g., price ≥ 0, ACH50 ≥ 0)
  - [ ] Email format validation
  - [ ] Phone number format validation
  - [ ] Date range validation (start < end)
  - **Evidence:** List key validation rules

**Business Rules (1 point)**

- [ ] Business rules enforced
  - [ ] Status transitions (e.g., can't go from completed → pending)
  - [ ] Date constraints (e.g., scheduledDate must be future)
  - [ ] Threshold checks (e.g., ACH50 ≤ 5.0 for compliance)
  - [ ] Dependent field validation (e.g., if status=completed, require completedDate)
  - **Evidence:** List all business rules

- [ ] State machines implemented where appropriate
  - [ ] Valid state transitions defined
  - [ ] Invalid transitions prevented
  - [ ] State transition logging
  - **Evidence:** Show state machine logic (if applicable)

- [ ] Calculations implemented with formulas documented
  - [ ] ACH50 calculation: (CFM50 × 60) / Volume
  - [ ] Compliance status calculation
  - [ ] Pricing calculations
  - **Evidence:** Location of calculation functions: _____________________
  - **Documentation:** Formulas explained in code comments

**Edge Cases (1 point)**

- [ ] Null/undefined handling
  - [ ] Optional fields handled gracefully
  - [ ] Default values provided where sensible
  - [ ] Null checks before operations
  - **Evidence:** Show examples of null handling

- [ ] Empty array/object handling
  - [ ] Empty lists don't break logic
  - [ ] Empty objects validated properly
  - **Evidence:** Show examples

- [ ] Maximum value handling
  - [ ] Large numbers don't overflow
  - [ ] Long strings truncated gracefully
  - [ ] Array size limits enforced
  - **Evidence:** Show examples

- [ ] Boundary conditions tested
  - [ ] Zero values
  - [ ] Negative values (where invalid)
  - [ ] Dates in past/future
  - **Evidence:** Reference to tests covering edge cases

- [ ] Functions are pure where possible
  - [ ] No side effects (database writes) in calculation functions
  - [ ] Same inputs → same outputs
  - [ ] Easier to test and reason about
  - **Evidence:** Show examples of pure functions

**Business Logic Notes:**
```
[Add notes on complex business rules, calculation formulas, edge case handling, etc.]





```

---

### API Endpoints (4 points)

**Score: _____ / 4**

**Route Implementation (2 points)**

- [ ] All CRUD endpoints implemented in `server/routes.ts`
  - [ ] GET /api/[entities] (list all)
  - [ ] GET /api/[entities]/:id (get one)
  - [ ] POST /api/[entities] (create)
  - [ ] PATCH /api/[entities]/:id (update)
  - [ ] DELETE /api/[entities]/:id (delete)
  - **Evidence:** Route definitions location: `server/routes.ts` lines _____ to _____

- [ ] RESTful conventions followed
  - [ ] Proper HTTP verbs (GET, POST, PATCH, DELETE)
  - [ ] Plural resource names (e.g., /api/jobs not /api/job)
  - [ ] Resource IDs in URL path
  - [ ] Query params for filtering/pagination
  - **Evidence:** Route structure follows REST

- [ ] Authentication middleware applied (isAuthenticated)
  - [ ] All protected routes require authentication
  - [ ] Unauthenticated requests return 401
  - **Evidence:** Show middleware usage

- [ ] Authorization checks implemented
  - [ ] requireRole for admin-only endpoints
  - [ ] checkResourceOwnership for user resources
  - [ ] Unauthorized requests return 403
  - **Evidence:** Show authorization logic

**Request/Response Handling (2 points)**

- [ ] CSRF protection on mutating endpoints
  - [ ] csrfSynchronisedProtection middleware on POST/PATCH/DELETE
  - [ ] GET requests exempt (safe methods)
  - **Evidence:** Show CSRF middleware usage

- [ ] Request validation with Zod schemas
  - [ ] req.body validated before processing
  - [ ] Validation errors return 400 with details
  - [ ] Type safety from validation
  - **Evidence:** Show validation pattern

- [ ] Error responses user-friendly
  - [ ] No stack traces sent to client (in production)
  - [ ] Meaningful error messages
  - [ ] Error format consistent: { error: string, details?: any }
  - **Evidence:** Show error handling example

- [ ] Proper HTTP status codes
  - [ ] 200 OK - Successful GET/PATCH/DELETE
  - [ ] 201 Created - Successful POST
  - [ ] 400 Bad Request - Validation failure
  - [ ] 401 Unauthorized - Not authenticated
  - [ ] 403 Forbidden - Not authorized
  - [ ] 404 Not Found - Resource doesn't exist
  - [ ] 500 Internal Server Error - Unexpected error
  - **Evidence:** Review status code usage

- [ ] Response format consistent
  - [ ] Success: { data: T } or just T
  - [ ] Error: { error: string }
  - [ ] Pagination: { data: T[], pagination: { total, page, pageSize } }
  - **Evidence:** Show response format examples

- [ ] Endpoints documented in runbook
  - [ ] Request format with example
  - [ ] Response format with example
  - [ ] Authentication requirements
  - [ ] Error responses listed
  - **Evidence:** Link to runbook API documentation section

**API Endpoints Notes:**
```
[Add notes on route design, authentication/authorization decisions, error handling patterns, etc.]





```

---

### Frontend Interface (3 points)

**Score: _____ / 3**

**Component Structure (1 point)**

- [ ] Page/component created in appropriate location
  - [ ] Pages: `client/src/pages/[FeatureName].tsx`
  - [ ] Components: `client/src/components/[feature]/[Component].tsx`
  - **Evidence:** Component file locations: _____________________

- [ ] Registered in `client/src/App.tsx` if new page
  - [ ] Route added to Switch
  - [ ] Navigation link added (sidebar or bottom nav)
  - **Evidence:** Show route registration

- [ ] TypeScript types match backend schemas
  - [ ] Import types from `@shared/schema`
  - [ ] No duplicate type definitions
  - [ ] Type safety verified at compile time
  - **Evidence:** TypeScript builds without errors

- [ ] Component follows existing design patterns
  - [ ] Uses Shadcn components (Card, Button, Form, etc.)
  - [ ] Consistent spacing (Tailwind gap-4, gap-6, p-4, p-6)
  - [ ] Follows design_guidelines.md
  - **Evidence:** Component uses design system

**Data Fetching & State (1 point)**

- [ ] TanStack Query for data fetching
  - [ ] useQuery for GET requests
  - [ ] useMutation for POST/PATCH/DELETE
  - [ ] No manual fetch() calls
  - **Evidence:** Show query/mutation usage

- [ ] Loading states implemented
  - [ ] Skeleton loaders match content structure
  - [ ] No cumulative layout shift
  - [ ] Spinners for mutations (button disabled during submit)
  - **Evidence:** Show loading state implementation

- [ ] Empty states implemented
  - [ ] Helpful message ("No jobs scheduled yet")
  - [ ] Call-to-action button ("Schedule your first job")
  - [ ] Icon or illustration
  - **Evidence:** Show empty state implementation

- [ ] Error states implemented
  - [ ] Error message displayed
  - [ ] Retry button or action
  - [ ] Graceful degradation (partial data shown if available)
  - **Evidence:** Show error state implementation

- [ ] Cache invalidation after mutations
  - [ ] queryClient.invalidateQueries after create/update/delete
  - [ ] UI updates immediately (optimistic or after server response)
  - **Evidence:** Show invalidation pattern

**Forms & Interactions (1 point)**

- [ ] Forms use react-hook-form
  - [ ] useForm hook with zodResolver
  - [ ] Form component from `@/components/ui/form`
  - [ ] FormField, FormItem, FormLabel, FormControl, FormMessage
  - **Evidence:** Show form implementation

- [ ] Form validation with Zod
  - [ ] Schema imported from `@shared/schema`
  - [ ] Client-side validation before submit
  - [ ] Validation errors displayed inline
  - **Evidence:** Show validation setup

- [ ] data-testid attributes on interactive elements
  - [ ] Buttons: `data-testid="button-submit"`, `data-testid="button-cancel"`
  - [ ] Inputs: `data-testid="input-address"`, `data-testid="input-contractor"`
  - [ ] Links: `data-testid="link-view-job"`
  - [ ] Dynamic elements: `data-testid="card-job-${jobId}"`
  - **Evidence:** Review component for test IDs

- [ ] Responsive design
  - [ ] Mobile (375px): Single column, full-width cards
  - [ ] Tablet (768px): 2-column grid
  - [ ] Desktop (1024px+): 3-column grid
  - **Evidence:** Test at different screen sizes

- [ ] Dark mode support
  - [ ] Uses theme-aware Tailwind classes
  - [ ] No hardcoded colors (use CSS variables)
  - **Evidence:** Test in dark mode

**Frontend Interface Notes:**
```
[Add notes on component architecture, design decisions, responsive patterns, etc.]





```

---

### Documentation (2 points)

**Score: _____ / 2**

**Runbook Documentation (1 point)**

- [ ] Runbook created: `[FEATURE]_SLICE.md`
  - **Evidence:** File location: _____________________

- [ ] Runbook includes Feature Overview section
  - [ ] What it does (2-3 sentences)
  - [ ] Why it matters (business value)
  - [ ] Scope (in scope / out of scope)
  - **Evidence:** Link to overview section

- [ ] Runbook includes Database Schema section
  - [ ] Table structure documented
  - [ ] Column descriptions
  - [ ] Relationships explained
  - [ ] Index rationale
  - **Evidence:** Link to schema section

- [ ] Runbook includes API Endpoints section
  - [ ] All endpoints listed
  - [ ] Request/response examples
  - [ ] Authentication requirements
  - [ ] Error responses
  - **Evidence:** Link to API section

- [ ] Runbook includes Frontend Interface section
  - [ ] Component structure
  - [ ] User workflows
  - [ ] Screenshots (optional but recommended)
  - **Evidence:** Link to frontend section

- [ ] Runbook includes Operational Procedures section
  - [ ] How to deploy
  - [ ] How to rollback
  - [ ] How to troubleshoot common issues
  - [ ] Monitoring dashboards
  - **Evidence:** Link to operations section

**Project Documentation (1 point)**

- [ ] replit.md updated with feature
  - [ ] Feature added to "Production-Ready Features" section
  - [ ] One-line description
  - [ ] Link to runbook
  - **Evidence:** Show replit.md update

- [ ] README updated if new dependencies added
  - [ ] New packages documented
  - [ ] Setup instructions updated
  - [ ] Environment variables documented
  - **Evidence:** Show README update (if applicable)

- [ ] Seed data documented
  - [ ] Seed file created: `db/seed-[feature].sql`
  - [ ] Seed data purpose explained
  - [ ] How to load seed data
  - **Evidence:** Link to seed file

**Documentation Notes:**
```
[Add notes on documentation structure, missing pieces, future documentation needs, etc.]





```

---

## Tier 2: Production Hardening (10 Points)

**Tier 2 can only begin after Tier 1 is 100% complete.**

### Tier 2 Score: _____ / 10 Points

---

### Unit Tests (2 points)

**Score: _____ / 2**

**Test Coverage (1 point)**

- [ ] Business logic functions have unit tests
  - [ ] Validation functions tested
  - [ ] Calculation functions tested (ACH50, compliance, pricing)
  - [ ] State transition logic tested
  - **Evidence:** Test file locations: _____________________

- [ ] Test coverage ≥80% for critical business logic
  - [ ] Run `npm run test:coverage`
  - [ ] View coverage report in terminal or `coverage/` directory
  - **Evidence:** Coverage percentage: _____%

- [ ] Test files follow naming convention
  - [ ] `[module].test.ts` or `[module].spec.ts`
  - [ ] Located next to source file or in `__tests__/` directory
  - **Evidence:** List test files

- [ ] Tests pass consistently
  - [ ] `npm run test` completes successfully
  - [ ] No flaky tests (run 10 times, all pass)
  - **Evidence:** Test run output

**Test Quality (1 point)**

- [ ] Edge cases tested
  - [ ] Null/undefined inputs
  - [ ] Empty arrays/objects
  - [ ] Maximum values
  - [ ] Invalid inputs (should throw/return error)
  - **Evidence:** Show examples of edge case tests

- [ ] Test structure follows AAA pattern
  - [ ] Arrange: Set up test data
  - [ ] Act: Execute function under test
  - [ ] Assert: Verify expected outcome
  - **Evidence:** Show example test

- [ ] Tests are isolated
  - [ ] No shared state between tests
  - [ ] Each test can run independently
  - [ ] Tests can run in any order
  - **Evidence:** Run tests in random order, all pass

- [ ] Descriptive test names
  - [ ] Format: "should [expected behavior] when [condition]"
  - [ ] Example: "should return compliance=true when ACH50 < 5.0"
  - **Evidence:** Review test names

**Unit Tests Notes:**
```
[Add notes on testing approach, difficult-to-test code, coverage gaps, etc.]





```

---

### Integration Tests (2 points)

**Score: _____ / 2**

**API Endpoint Tests (1 point)**

- [ ] API endpoints have integration tests
  - [ ] Using supertest for HTTP testing
  - [ ] Tests run against real database (test database)
  - **Evidence:** Integration test file: _____________________

- [ ] Authentication tested
  - [ ] 401 when not logged in
  - [ ] Session/token properly validated
  - **Evidence:** Show authentication test

- [ ] Authorization tested
  - [ ] 403 when wrong role (inspector trying admin endpoint)
  - [ ] 403 when accessing other user's resources
  - **Evidence:** Show authorization test

- [ ] Request validation tested
  - [ ] 400 for missing required fields
  - [ ] 400 for invalid data types
  - [ ] 400 for violating constraints
  - **Evidence:** Show validation tests

**Success Cases & Database (1 point)**

- [ ] Success cases tested
  - [ ] 200/201 with proper response structure
  - [ ] Response data matches expected schema
  - **Evidence:** Show success case tests

- [ ] Database operations verified
  - [ ] Data persisted correctly after POST
  - [ ] Data updated correctly after PATCH
  - [ ] Data deleted correctly after DELETE
  - [ ] Foreign key relationships maintained
  - **Evidence:** Show database verification tests

- [ ] Test data cleanup
  - [ ] beforeEach/afterEach hooks clean database
  - [ ] Tests don't interfere with each other
  - [ ] Test database isolated from dev/prod
  - **Evidence:** Show cleanup logic

**Integration Tests Notes:**
```
[Add notes on test setup, database seeding, challenging integration scenarios, etc.]





```

---

### E2E Tests (2 points)

**Score: _____ / 2**

**Critical User Journeys (1 point)**

- [ ] Critical user journey tested with Playwright
  - [ ] Example: "Inspector creates job, uploads photo, completes inspection"
  - [ ] Covers primary workflow end-to-end
  - **Evidence:** E2E test file: _____________________

- [ ] Page Object Model pattern used
  - [ ] Page objects encapsulate UI interactions
  - [ ] Tests read like user stories
  - [ ] Reduces duplication across tests
  - **Evidence:** Show page object example

- [ ] Tests run in real browser
  - [ ] Chromium, Firefox, or WebKit
  - [ ] Headless mode for CI
  - **Evidence:** Playwright config

**Test Quality & Reliability (1 point)**

- [ ] Test isolation
  - [ ] Setup/cleanup in beforeEach/afterEach
  - [ ] Each test creates its own data
  - [ ] Tests can run independently
  - **Evidence:** Show test isolation pattern

- [ ] Screenshot on failure configured
  - [ ] Playwright captures screenshot when test fails
  - [ ] Helps debug failures in CI
  - **Evidence:** Show Playwright config

- [ ] Tests pass consistently
  - [ ] `npm run test:e2e` completes successfully
  - [ ] No flaky tests (run 5 times, all pass)
  - **Evidence:** Test run output

- [ ] Tests documented in runbook
  - [ ] User journey explained
  - [ ] How to run tests locally
  - [ ] How to debug failures
  - **Evidence:** Link to runbook E2E section

**E2E Tests Notes:**
```
[Add notes on test scenarios, flaky tests addressed, browser compatibility, etc.]





```

---

### Smoke Tests (1 point)

**Score: _____ / 1**

**Smoke Test Script (1 point)**

- [ ] Smoke test script created: `scripts/smoke-test-[feature].sh`
  - **Evidence:** Script location: _____________________

- [ ] Script executable
  - [ ] `chmod +x scripts/smoke-test-[feature].sh`
  - [ ] Shebang line: `#!/bin/bash`
  - **Evidence:** Run `ls -la scripts/smoke-test-[feature].sh`

- [ ] Tests all CRUD operations
  - [ ] CREATE: POST /api/[entities] → 201
  - [ ] READ: GET /api/[entities]/:id → 200
  - [ ] UPDATE: PATCH /api/[entities]/:id → 200
  - [ ] DELETE: DELETE /api/[entities]/:id → 200
  - **Evidence:** Review script content

- [ ] Tests authorization (negative test)
  - [ ] Inspector can't access other inspector's resources → 403
  - [ ] Unauthenticated request → 401
  - **Evidence:** Show authorization test in script

- [ ] Exit code indicates pass/fail
  - [ ] Exit 0 on success (all tests pass)
  - [ ] Exit 1 on failure (any test fails)
  - [ ] Script stops on first failure (`set -e`)
  - **Evidence:** Run script and check `echo $?`

- [ ] Script uses proper assertions
  - [ ] Uses `jq` to parse JSON responses
  - [ ] Validates response structure
  - [ ] Checks status codes
  - **Evidence:** Show assertion examples

- [ ] Script documented in runbook
  - [ ] How to run: `bash scripts/smoke-test-[feature].sh`
  - [ ] What it tests (CRUD + authorization)
  - [ ] Expected output
  - **Evidence:** Link to runbook smoke test section

**Smoke Tests Notes:**
```
[Add notes on script design, test data setup, cross-tenant testing, etc.]





```

---

### API Documentation (1 point)

**Score: _____ / 1**

**API Documentation (1 point)**

- [ ] OpenAPI spec generated or manually written
  - [ ] Spec file: `docs/api/[feature]-api.yaml` or inline in code
  - **Evidence:** Spec location: _____________________

- [ ] Request/response schemas documented
  - [ ] Request body schema (JSON)
  - [ ] Query parameters
  - [ ] Path parameters
  - [ ] Response schema
  - **Evidence:** Show example schema definition

- [ ] Example requests included
  - [ ] cURL examples for each endpoint
  - [ ] Example request bodies (JSON)
  - **Evidence:** Show request examples

- [ ] Authentication requirements documented
  - [ ] Which endpoints require authentication
  - [ ] How to authenticate (session cookie, token, etc.)
  - **Evidence:** Show authentication documentation

- [ ] Error responses documented
  - [ ] 400 Bad Request examples
  - [ ] 401 Unauthorized examples
  - [ ] 403 Forbidden examples
  - [ ] 404 Not Found examples
  - [ ] 500 Internal Server Error examples
  - **Evidence:** Show error response examples

**API Documentation Notes:**
```
[Add notes on documentation format, tooling used, where it's hosted/viewed, etc.]





```

---

### Accessibility (1 point)

**Score: _____ / 1**

**WCAG 2.1 AA Compliance (1 point)**

- [ ] WCAG 2.1 AA compliance verified
  - [ ] Manual review or automated tool (axe DevTools, Pa11y)
  - **Evidence:** Accessibility audit report or checklist

- [ ] Keyboard navigation tested
  - [ ] All interactive elements reachable via Tab
  - [ ] Tab order logical (top to bottom, left to right)
  - [ ] No keyboard traps
  - [ ] Enter/Space activate buttons
  - [ ] Escape closes modals/dialogs
  - **Evidence:** Manual keyboard testing checklist

- [ ] Screen reader support
  - [ ] ARIA labels on interactive elements (buttons, links, inputs)
  - [ ] Form labels associated with inputs (<label for="...">)
  - [ ] ARIA roles where semantic HTML insufficient
  - [ ] alt text on images
  - **Evidence:** Test with screen reader (VoiceOver, NVDA, JAWS)

- [ ] Color contrast ratios
  - [ ] Text: ≥4.5:1 contrast ratio
  - [ ] UI components: ≥3:1 contrast ratio
  - [ ] Verify with contrast checker tool
  - **Evidence:** Contrast check report

- [ ] Focus indicators visible
  - [ ] Default browser focus ring preserved or custom focus style
  - [ ] Focus visible on all interactive elements
  - [ ] Never `outline: none` without replacement
  - **Evidence:** Visual inspection

- [ ] Form labels and error messages
  - [ ] Every input has associated label
  - [ ] Required fields indicated (visually and in code)
  - [ ] Error messages descriptive and actionable
  - [ ] aria-describedby links errors to inputs
  - **Evidence:** Form accessibility review

- [ ] Automated accessibility testing
  - [ ] axe or Pa11y run on feature pages
  - [ ] Zero critical/serious violations
  - [ ] Warnings reviewed and justified
  - **Evidence:** Tool output

**Accessibility Notes:**
```
[Add notes on accessibility challenges, exceptions, future improvements, etc.]





```

---

### Performance Benchmarks (1 point)

**Score: _____ / 1**

**Performance Measurement (1 point)**

- [ ] API endpoints benchmarked
  - [ ] p50 (median) response time
  - [ ] p95 response time
  - [ ] p99 response time
  - [ ] Tool: Apache Bench, wrk, or custom script
  - **Evidence:** Benchmark results
  - **Target:** p95 < 200ms for simple queries, < 1000ms for complex

- [ ] Database queries profiled
  - [ ] EXPLAIN ANALYZE run on complex queries
  - [ ] Indexes used (shown in query plan)
  - [ ] Query time documented
  - **Evidence:** Query plan output
  - **Target:** Queries < 100ms

- [ ] Frontend bundle size measured
  - [ ] Run `npm run build`
  - [ ] Check `dist/` directory size
  - [ ] Review Vite bundle report
  - **Evidence:** Build output showing bundle sizes
  - **Target:** Initial bundle < 500KB gzipped

- [ ] Performance budgets defined
  - [ ] API p95: < 200ms (simple) or < 1000ms (complex)
  - [ ] Database queries: < 100ms
  - [ ] Frontend bundle: < 500KB
  - [ ] Page load (LCP): < 2.5s
  - **Evidence:** Budgets documented in runbook

- [ ] Benchmarks documented in runbook
  - [ ] Current performance metrics
  - [ ] Performance budgets
  - [ ] How to reproduce benchmarks
  - **Evidence:** Link to runbook performance section

**Performance Notes:**
```
[Add notes on performance bottlenecks, optimization opportunities, benchmark methodology, etc.]





```

---

## Tier 3: Operational Excellence (10 Points)

**Tier 3 can only begin after Tier 1 and Tier 2 are 100% complete.**

### Tier 3 Score: _____ / 10 Points

---

### Observability - Logging (2 points)

**Score: _____ / 2**

**Structured Logging (1 point)**

- [ ] Structured logging implemented
  - [ ] JSON format (not plain text)
  - [ ] Uses server/logger.ts
  - [ ] No `console.log()` in production code
  - **Evidence:** Show logging implementation

- [ ] Request correlation IDs included
  - [ ] Every request has unique ID
  - [ ] ID passed through entire request lifecycle
  - [ ] ID included in all logs for that request
  - **Evidence:** Show correlation ID implementation

- [ ] User context included
  - [ ] userId logged (if authenticated)
  - [ ] userRole logged
  - [ ] userEmail logged (if needed for debugging)
  - **Evidence:** Show user context in logs

- [ ] Operation context included
  - [ ] feature: "[feature name]"
  - [ ] action: "[operation name]"
  - [ ] resourceId: "[entity id]" (if applicable)
  - **Evidence:** Show operation context in logs

**Logging Best Practices (1 point)**

- [ ] PII redacted from logs
  - [ ] Passwords never logged
  - [ ] Tokens never logged
  - [ ] Sensitive data masked (e.g., last 4 digits of phone)
  - **Evidence:** Review logging code for PII

- [ ] Log levels appropriate
  - [ ] DEBUG: Verbose info for development
  - [ ] INFO: Normal operations (job created, photo uploaded)
  - [ ] WARN: Recoverable errors (retry succeeded, fallback used)
  - [ ] ERROR: Unrecoverable errors (database down, external API failed)
  - **Evidence:** Review log level usage

- [ ] Logs searchable and filterable
  - [ ] Consistent field names (userId not sometimes user_id)
  - [ ] Timestamp in ISO 8601 format
  - [ ] Structured data (JSON) for easy parsing
  - **Evidence:** Log format example

**Logging Notes:**
```
[Add notes on logging strategy, log aggregation service (if used), search patterns, etc.]





```

---

### Observability - Error Tracking (2 points)

**Score: _____ / 2**

**Sentry Integration (1 point)**

- [ ] Sentry error tracking configured
  - [ ] Sentry initialized in server and client
  - [ ] DSN configured via environment variable
  - [ ] Source maps uploaded for stack trace enrichment
  - **Evidence:** Show Sentry initialization code

- [ ] Custom context added to errors
  - [ ] User context (userId, email, role)
  - [ ] Feature context (feature name, operation)
  - [ ] Request context (URL, method, params)
  - **Evidence:** Show Sentry context implementation

- [ ] Breadcrumbs track user actions
  - [ ] Navigation events
  - [ ] Button clicks
  - [ ] API calls
  - [ ] Form submissions
  - **Evidence:** Show breadcrumb implementation

**Error Boundaries & Alerting (1 point)**

- [ ] Error boundary on frontend components
  - [ ] Catches rendering errors
  - [ ] Shows user-friendly error message
  - [ ] Logs error to Sentry
  - [ ] Allows user to retry or navigate away
  - **Evidence:** Show error boundary implementation

- [ ] Stack traces enriched with source maps
  - [ ] Source maps generated in build
  - [ ] Uploaded to Sentry
  - [ ] Stack traces show original TypeScript code
  - **Evidence:** Check Sentry dashboard for readable stack traces

- [ ] Error alerts configured
  - [ ] Alert when error rate > 5%
  - [ ] Alert when new error type appears
  - [ ] Notifications sent to team (email, Slack, PagerDuty)
  - **Evidence:** Show Sentry alert rules

**Error Tracking Notes:**
```
[Add notes on Sentry configuration, alert thresholds, error grouping, etc.]





```

---

### Observability - Metrics (2 points)

**Score: _____ / 2**

**Metrics Collection (1 point)**

- [ ] Key metrics defined
  - [ ] API rate: Requests per second
  - [ ] Response time: p50, p95, p99
  - [ ] Error rate: Percentage of 5xx responses
  - [ ] Business metrics: Jobs created, photos uploaded, reports generated
  - **Evidence:** List all metrics

- [ ] Metrics collection implemented
  - [ ] Prometheus client or custom metrics
  - [ ] Counters, gauges, histograms used appropriately
  - **Evidence:** Show metrics implementation

- [ ] Metrics endpoint exposed
  - [ ] GET /metrics returns metrics in Prometheus format
  - [ ] Or custom metrics API endpoint
  - **Evidence:** cURL /metrics endpoint

**Metrics Dashboard & Documentation (1 point)**

- [ ] Metrics dashboard created
  - [ ] Grafana dashboard or similar
  - [ ] Shows key metrics over time
  - [ ] Filterable by time range
  - **Evidence:** Screenshot of dashboard or link

- [ ] Metrics documented in runbook
  - [ ] What each metric measures
  - [ ] Normal range (e.g., API rate 10-50 req/s)
  - [ ] Alert thresholds
  - [ ] How to access metrics dashboard
  - **Evidence:** Link to runbook metrics section

**Metrics Notes:**
```
[Add notes on metrics strategy, dashboard design, alerting thresholds, etc.]





```

---

### Operational Procedures (2 points)

**Score: _____ / 2**

**Deployment & Rollback (1 point)**

- [ ] Deployment procedure documented
  - [ ] Step-by-step deployment instructions
  - [ ] Pre-deployment checklist (tests pass, migrations ready, etc.)
  - [ ] Deployment command or script
  - [ ] Post-deployment verification (smoke test, health check)
  - **Evidence:** Link to deployment documentation

- [ ] Rollback procedure documented
  - [ ] How to revert to previous version
  - [ ] Database migration rollback (if needed)
  - [ ] Verification after rollback
  - **Evidence:** Link to rollback documentation

- [ ] Rollback tested
  - [ ] Rollback procedure executed at least once (in staging/dev)
  - [ ] Verified system returns to previous state
  - **Evidence:** Rollback test report or notes

**Backup & Troubleshooting (1 point)**

- [ ] Backup strategy documented (if applicable)
  - [ ] What data is backed up
  - [ ] Backup frequency (daily, hourly, etc.)
  - [ ] Backup retention policy
  - [ ] Where backups stored
  - **Evidence:** Link to backup documentation

- [ ] Restore procedure tested (if applicable)
  - [ ] Restore from backup executed at least once
  - [ ] Verified data restored correctly
  - [ ] Documented time to restore
  - **Evidence:** Restore test report or notes

- [ ] Troubleshooting guide with common issues
  - [ ] Issue: [Description]
    - Symptoms: [What user sees]
    - Diagnosis: [How to confirm issue]
    - Resolution: [How to fix]
  - [ ] At least 3 common issues documented
  - **Evidence:** Link to troubleshooting guide

**Operational Procedures Notes:**
```
[Add notes on deployment process, backup considerations, common issues, etc.]





```

---

### Monitoring & Alerting (2 points)

**Score: _____ / 2**

**Dashboard & Alerts (1 point)**

- [ ] Dashboard created with key metrics
  - [ ] Shows real-time feature health
  - [ ] Graphs for API rate, response time, error rate
  - [ ] Business metrics (jobs created, photos uploaded)
  - **Evidence:** Screenshot of dashboard or link

- [ ] Alerts configured for critical failures
  - [ ] API error rate > 5%
  - [ ] API p95 response time > 1000ms
  - [ ] Database connection failures
  - [ ] Feature-specific failures (e.g., photo upload failures)
  - **Evidence:** Show alert rules

- [ ] Alert thresholds defined and tuned
  - [ ] Thresholds set based on baseline metrics
  - [ ] False positive rate minimized
  - [ ] Alert severity levels (critical, warning, info)
  - **Evidence:** Alert threshold documentation

**Incident Response (1 point)**

- [ ] On-call runbook created
  - [ ] Who to contact for escalation
  - [ ] How to access logs/metrics
  - [ ] Common incident response steps
  - **Evidence:** Link to on-call runbook

- [ ] Incident response template ready
  - [ ] Template for documenting incidents
  - [ ] Includes: Timeline, impact, root cause, resolution, action items
  - **Evidence:** Link to incident template

**Monitoring & Alerting Notes:**
```
[Add notes on monitoring strategy, alert fatigue prevention, incident response process, etc.]





```

---

## Additional Quality Checks

**These are not part of the 40 points, but are essential quality gates.**

---

### Security

- [ ] Input validation prevents SQL injection
  - [ ] Drizzle ORM used (parameterized queries)
  - [ ] No raw SQL string concatenation
  - **Evidence:** Review database query code

- [ ] Input validation prevents XSS
  - [ ] User input sanitized before rendering
  - [ ] React escapes HTML by default (use dangerouslySetInnerHTML carefully)
  - **Evidence:** Review frontend rendering code

- [ ] Rate limiting configured
  - [ ] Express rate limiter on API routes
  - [ ] Limit: [X] requests per [Y] seconds
  - **Evidence:** Show rate limiting middleware

- [ ] Sensitive operations audit logged
  - [ ] User login/logout
  - [ ] Permission changes
  - [ ] Data deletion
  - **Evidence:** Show audit logging

- [ ] Secrets not hardcoded
  - [ ] All secrets in environment variables
  - [ ] `.env` file not committed to Git
  - **Evidence:** Review code for hardcoded secrets

- [ ] Dependencies scanned for vulnerabilities
  - [ ] Run `npm audit`
  - [ ] Zero critical/high vulnerabilities
  - **Evidence:** npm audit output

**Security Notes:**
```
[Add notes on security measures, vulnerability remediation, threat model, etc.]





```

---

### UX Polish

- [ ] Micro-interactions implemented
  - [ ] Hover states on buttons/links
  - [ ] Focus states on inputs
  - [ ] Active states on buttons (press down effect)
  - **Evidence:** Visual inspection

- [ ] Animations purposeful and <300ms
  - [ ] No gratuitous animations
  - [ ] Animations enhance understanding (e.g., slide-out drawer)
  - [ ] Duration <300ms to feel instant
  - **Evidence:** Review animation code

- [ ] Optimistic updates where appropriate
  - [ ] UI updates immediately on user action
  - [ ] Rollback if server request fails
  - [ ] Example: Like button shows liked state immediately
  - **Evidence:** Show optimistic update implementation

- [ ] Toast notifications for user feedback
  - [ ] Success: "Job created successfully"
  - [ ] Error: "Failed to upload photo. Please try again."
  - [ ] Info: "Inspector assigned to job"
  - **Evidence:** Show toast usage

- [ ] Confirmation dialogs for destructive actions
  - [ ] Delete confirmation: "Are you sure you want to delete this job?"
  - [ ] Cancel with changes: "You have unsaved changes. Discard?"
  - **Evidence:** Show confirmation dialogs

- [ ] Mobile responsive
  - [ ] Tested on phone size (375px)
  - [ ] Touch targets ≥48x48px
  - [ ] Text readable without zooming
  - **Evidence:** Mobile testing screenshot or notes

- [ ] Dark mode works correctly
  - [ ] All text readable in dark mode
  - [ ] No hardcoded light colors
  - [ ] Consistent with app-wide dark mode
  - **Evidence:** Dark mode screenshot

**UX Polish Notes:**
```
[Add notes on UX decisions, animation choices, mobile considerations, etc.]





```

---

### Code Quality

- [ ] TypeScript strict mode enabled
  - [ ] `"strict": true` in tsconfig.json
  - [ ] Zero TypeScript errors
  - **Evidence:** `npm run build` output

- [ ] ESLint passes
  - [ ] `npm run lint` completes with no warnings
  - [ ] Or warnings justified and documented
  - **Evidence:** ESLint output

- [ ] No `any` types in production code
  - [ ] All types explicitly defined
  - [ ] Use proper types from schema or libraries
  - **Evidence:** Review code for `any`

- [ ] Functions <50 lines
  - [ ] Extract long functions into smaller helpers
  - [ ] Each function does one thing
  - **Evidence:** Review function lengths

- [ ] Cyclomatic complexity <10
  - [ ] Limit nested if/else statements
  - [ ] Use early returns
  - [ ] Extract complex conditions into named functions
  - **Evidence:** Complexity analysis tool or manual review

- [ ] Meaningful variable names
  - [ ] No single-letter variables (except i in loops)
  - [ ] Names describe purpose, not type
  - [ ] Example: `scheduledDate` not `date1`
  - **Evidence:** Review variable names

- [ ] JSDoc comments on public APIs
  - [ ] Functions exported from modules have JSDoc
  - [ ] Describe purpose, parameters, return value
  - **Evidence:** Show JSDoc examples

**Code Quality Notes:**
```
[Add notes on code review feedback, refactoring done, technical debt, etc.]





```

---

## Final Approval

---

### Self-Review Checklist

- [ ] All 40 points achieved across three tiers
  - [ ] Tier 1: _____ / 20 points
  - [ ] Tier 2: _____ / 10 points
  - [ ] Tier 3: _____ / 10 points
  - [ ] **Total: _____ / 40 points**

- [ ] Feature works end-to-end (tested manually)
  - [ ] Create operation works
  - [ ] Read/list operation works
  - [ ] Update operation works
  - [ ] Delete operation works
  - [ ] Workflows complete successfully

- [ ] All tests passing
  - [ ] Unit tests: `npm run test` ✅
  - [ ] Integration tests: `npm run test:integration` ✅
  - [ ] E2E tests: `npm run test:e2e` ✅
  - [ ] Smoke tests: `bash scripts/smoke-test-[feature].sh` ✅

- [ ] Performance within budgets
  - [ ] API p95 < 200ms (simple) or < 1000ms (complex)
  - [ ] Database queries < 100ms
  - [ ] Frontend bundle < 500KB
  - [ ] Page load (LCP) < 2.5s

- [ ] Accessibility verified
  - [ ] WCAG 2.1 AA compliant
  - [ ] Keyboard navigation works
  - [ ] Screen reader friendly
  - [ ] Color contrast sufficient

- [ ] Documentation complete
  - [ ] Runbook created and comprehensive
  - [ ] replit.md updated
  - [ ] API documentation complete
  - [ ] Operational procedures documented

- [ ] Ready for production deployment
  - [ ] Database migration tested
  - [ ] Rollback procedure tested
  - [ ] Monitoring dashboards created
  - [ ] Alerts configured

**Self-Review Notes:**
```
[Add notes on manual testing, any concerns, items to highlight for architect review, etc.]





```

---

### Architect Review

- [ ] Code reviewed by architect agent
  - [ ] Pull request created
  - [ ] Code changes reviewed (using git diff)
  - [ ] Feedback documented below

- [ ] Feedback addressed
  - [ ] All critical feedback resolved
  - [ ] Minor feedback resolved or documented as future work

- [ ] Security verified
  - [ ] No SQL injection vulnerabilities
  - [ ] No XSS vulnerabilities
  - [ ] Authentication/authorization correct
  - [ ] Secrets properly managed

- [ ] Architecture approved
  - [ ] Follows established patterns
  - [ ] No architectural debt introduced
  - [ ] Integration with existing features smooth

- [ ] Performance acceptable
  - [ ] Meets performance budgets
  - [ ] No obvious bottlenecks
  - [ ] Database queries optimized

**Architect Feedback:**
```
[Architect adds feedback here during code review]

Date: _______________
Reviewer: _______________

Strengths:
-

Areas for improvement:
-

Critical issues (must fix before deployment):
-

Minor issues (can be addressed post-deployment):
-

Overall assessment:
[ ] APPROVED - Ready for production
[ ] APPROVED WITH CONDITIONS - Address minor issues
[ ] CHANGES REQUESTED - Re-review needed after fixes
```

---

### Deployment Readiness

- [ ] Feature flag created (if applicable)
  - [ ] Feature can be toggled on/off in production
  - [ ] Feature off by default for gradual rollout
  - **Evidence:** Show feature flag implementation

- [ ] Database migration tested
  - [ ] Migration runs successfully in staging
  - [ ] No data loss
  - [ ] Migration is reversible (or rollback plan documented)
  - **Evidence:** Migration test notes

- [ ] Rollback tested
  - [ ] Rollback procedure executed successfully in staging
  - [ ] System returns to previous state
  - [ ] No data corruption
  - **Evidence:** Rollback test notes

- [ ] Monitoring verified
  - [ ] Metrics flowing to dashboard
  - [ ] Alerts triggering correctly (tested)
  - [ ] Logs searchable
  - **Evidence:** Monitoring verification notes

- [ ] Team notified of deployment
  - [ ] Deployment date/time communicated
  - [ ] Feature changes documented for support team
  - [ ] Release notes prepared
  - **Evidence:** Communication sent

**Deployment Readiness Notes:**
```
[Add notes on deployment plan, rollout strategy, risk mitigation, etc.]





```

---

## Scoring Summary

**Tier 1: Core Functionality**
- Database Layer: _____ / 4 points
- Storage Layer: _____ / 4 points
- Business Logic: _____ / 3 points
- API Endpoints: _____ / 4 points
- Frontend Interface: _____ / 3 points
- Documentation: _____ / 2 points
- **Tier 1 Total: _____ / 20 points**

**Tier 2: Production Hardening**
- Unit Tests: _____ / 2 points
- Integration Tests: _____ / 2 points
- E2E Tests: _____ / 2 points
- Smoke Tests: _____ / 1 point
- API Documentation: _____ / 1 point
- Accessibility: _____ / 1 point
- Performance Benchmarks: _____ / 1 point
- **Tier 2 Total: _____ / 10 points**

**Tier 3: Operational Excellence**
- Observability - Logging: _____ / 2 points
- Observability - Error Tracking: _____ / 2 points
- Observability - Metrics: _____ / 2 points
- Operational Procedures: _____ / 2 points
- Monitoring & Alerting: _____ / 2 points
- **Tier 3 Total: _____ / 10 points**

---

**TOTAL SCORE: _____ / 40 points**

```
───────────────────────────────────────────────────────────────
Status:
  [ ] IN PROGRESS (Score < 40)
  [ ] REVIEW (Score = 40, awaiting architect approval)
  [ ] PRODUCTION READY (Score = 40, architect approved)
───────────────────────────────────────────────────────────────
```

---

## Sign-off

**Developer Sign-off:**
```
I certify that this feature has achieved 40/40 points and is ready for
production deployment. All tests pass, documentation is complete, and
the feature has been manually tested end-to-end.

Developer Name: _______________________________
Date: _________________________________________
Signature: ____________________________________
```

**Architect Approval:**
```
Code review completed. Security, architecture, and performance verified.
This feature is approved for production deployment.

Architect Name: _______________________________
Date: _________________________________________

Status:
  [ ] APPROVED - Deploy to production
  [ ] CHANGES REQUESTED - Re-review needed

Feedback/Conditions:
_____________________________________________________
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

**Deployment Confirmation:**
```
Feature deployed to production on: ___________________

Deployed by: _________________________________________

Deployment notes:
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

---

## References

**Core Standards Documents:**
- [PRODUCTION_STANDARDS.md](./PRODUCTION_STANDARDS.md) - Complete 40/40 definition with philosophy and detailed requirements
- [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md) - Interface guidelines, design system, accessibility
- [TESTING_STANDARDS.md](./TESTING_STANDARDS.md) - Testing patterns and best practices
- [OBSERVABILITY_STANDARDS.md](./OBSERVABILITY_STANDARDS.md) - Monitoring, logging, metrics requirements

**Templates & Examples:**
- [templates/SLICE_TEMPLATE.md](./templates/SLICE_TEMPLATE.md) - Runbook template
- [templates/COMPLIANCE_TEMPLATE.md](./templates/COMPLIANCE_TEMPLATE.md) - Detailed compliance checklist
- [templates/test-template.sh](./templates/test-template.sh) - Smoke test script template
- [templates/API_ENDPOINT_TEMPLATE.ts](./templates/API_ENDPOINT_TEMPLATE.ts) - API endpoint boilerplate

**Reference Implementations (40/40 Examples):**
- [BUILDERS_SLICE.md](./BUILDERS_SLICE.md) + [BUILDERS_COMPLIANCE.md](./BUILDERS_COMPLIANCE.md)
- [JOBS_SLICE.md](./JOBS_SLICE.md) + [JOBS_COMPLIANCE.md](./JOBS_COMPLIANCE.md)
- [CALENDAR_SLICE.md](./CALENDAR_SLICE.md) + [CALENDAR_COMPLIANCE.md](./CALENDAR_COMPLIANCE.md)
- [EQUIPMENT_SLICE.md](./EQUIPMENT_SLICE.md) + [EQUIPMENT_COMPLIANCE.md](./EQUIPMENT_COMPLIANCE.md)

**Smoke Test Examples:**
- [scripts/smoke-test-builders.sh](./scripts/smoke-test-builders.sh)
- [scripts/smoke-test-jobs.sh](./scripts/smoke-test-jobs.sh)
- [scripts/smoke-test-calendar.sh](./scripts/smoke-test-calendar.sh)

**Project Documentation:**
- [replit.md](./replit.md) - Project overview, architecture, production-ready features
- [design_guidelines.md](./design_guidelines.md) - Visual design, color system, typography
- [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) - Authentication patterns
- [docs/PERMISSIONS_MATRIX.md](./docs/PERMISSIONS_MATRIX.md) - Authorization rules

---

## Appendix: Quick Reference

### Common Commands

```bash
# Development
npm run dev                      # Start dev server

# Testing
npm run test                     # Run unit tests
npm run test:coverage            # Run tests with coverage
npm run test:e2e                 # Run E2E tests
bash scripts/smoke-test-[feature].sh  # Run smoke tests

# Database
npm run db:push                  # Push schema changes
npm run db:studio                # Open Drizzle Studio

# Linting & Type Checking
npm run lint                     # Run ESLint
npm run build                    # TypeScript type checking + build

# Production
npm start                        # Start production server
```

### Checklist Progress Tracker

Use this to track your progress through the checklist:

```
Phase 1: Tier 1 - Core Functionality
  [ ] Database Layer (4 pts)
  [ ] Storage Layer (4 pts)
  [ ] Business Logic (3 pts)
  [ ] API Endpoints (4 pts)
  [ ] Frontend Interface (3 pts)
  [ ] Documentation (2 pts)
  Tier 1 Complete: [ ] (20/20 required)

Phase 2: Tier 2 - Production Hardening
  [ ] Unit Tests (2 pts)
  [ ] Integration Tests (2 pts)
  [ ] E2E Tests (2 pts)
  [ ] Smoke Tests (1 pt)
  [ ] API Documentation (1 pt)
  [ ] Accessibility (1 pt)
  [ ] Performance Benchmarks (1 pt)
  Tier 2 Complete: [ ] (10/10 required)

Phase 3: Tier 3 - Operational Excellence
  [ ] Logging (2 pts)
  [ ] Error Tracking (2 pts)
  [ ] Metrics (2 pts)
  [ ] Operational Procedures (2 pts)
  [ ] Monitoring & Alerting (2 pts)
  Tier 3 Complete: [ ] (10/10 required)

Phase 4: Quality Checks
  [ ] Security
  [ ] UX Polish
  [ ] Code Quality

Phase 5: Final Approval
  [ ] Self-Review
  [ ] Architect Review
  [ ] Deployment Readiness

Production Ready: [ ] (40/40 required)
```

---

**END OF CHECKLIST**

> This checklist is a living document. As we learn from production deployments and discover new best practices, we'll update this template. Current version: 1.0.0
