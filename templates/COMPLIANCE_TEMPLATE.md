# [FEATURE NAME] - 40/40 Production Compliance Checklist

**Feature ID:** `[feature-name]`  
**Version:** 1.0.0  
**Status:** [In Progress | Ready for Production]  
**Owner:** [Team/Engineer Name]  
**Last Updated:** [YYYY-MM-DD]

> **Scoring:** This feature must achieve **40 out of 40 points** to be production-ready.  
> Each tier must be 100% complete before moving to the next tier.

**Current Score:** ____ / 40

---

## Tier 1: Core Functionality (20 Points)

**Tier 1 Score:** ____ / 20

A feature is not functional until all Tier 1 requirements are met. These are the fundamentals.

### ✅ Database Schema (3 points)

**Score:** ____ / 3

- [ ] Tables defined with appropriate column types
- [ ] Primary keys and foreign keys established
- [ ] Indexes added for common query patterns (at minimum: foreign keys, status fields, timestamps)
- [ ] Relationships (one-to-many, many-to-many) properly modeled
- [ ] NOT NULL constraints where appropriate
- [ ] Default values set for optional fields

**Evidence:**
- Schema file: `shared/schema.ts` - Lines [___] to [___]
- Migration file: `migrations/[XXXXXX]_[feature_name].sql`
- Indexes verified: `EXPLAIN ANALYZE` output shows index usage

**Notes:**
```
[Add any notes about schema design decisions, why certain indexes were chosen, etc.]
```

---

### ✅ API Endpoints (3 points)

**Score:** ____ / 3

- [ ] RESTful routes follow conventions (GET, POST, PATCH, DELETE)
- [ ] Authentication required for all protected routes (`isAuthenticated` middleware)
- [ ] Authorization checks prevent unauthorized access (role-based, resource ownership)
- [ ] Request validation using Zod schemas (all inputs validated)
- [ ] Consistent response formats (success: 200/201 with data, error: 4xx/5xx with message)
- [ ] HTTP status codes used correctly (200, 201, 400, 401, 403, 404, 500)

**Evidence:**
- Routes file: `server/routes.ts` - Lines [___] to [___]
- Zod schemas: `shared/schema.ts` - [schema names]
- Manual testing: All endpoints tested with Postman/curl

**Notes:**
```
[Document any non-standard API patterns, special authorization rules, etc.]
```

---

### ✅ Frontend UI (3 points)

**Score:** ____ / 3

- [ ] TypeScript types defined for all props and state (no `any` types)
- [ ] Components follow existing design system (Shadcn/Radix)
- [ ] Responsive design works on mobile (375px), tablet (768px), desktop (1024px+)
- [ ] Touch targets meet 48x48px minimum (critical for field use with gloves)
- [ ] Dark mode support (if app-wide dark mode is enabled)
- [ ] Accessibility attributes (ARIA labels, semantic HTML, keyboard navigation)

**Evidence:**
- Component files: `client/src/components/[feature]/` or `client/src/pages/`
- Mobile testing: Tested on iPhone/Android simulators
- Accessibility audit: Manual keyboard navigation test passed

**Notes:**
```
[Note any design decisions, component reuse, accessibility considerations]
```

---

### ✅ Basic Error Handling (3 points)

**Score:** ____ / 3

- [ ] Try-catch blocks around all async operations
- [ ] Database errors caught and logged (with context)
- [ ] API errors return meaningful, user-friendly messages
- [ ] Frontend displays error messages (toast, inline, modal)
- [ ] Errors don't expose sensitive information (no stack traces to client)
- [ ] Fallback UI when data fails to load (error boundary or error state)

**Evidence:**
- API routes: All routes have try-catch and error responses
- Frontend: Error states implemented in all components that fetch data
- Manual testing: Tested with database down, network errors, validation failures

**Notes:**
```
[Document error handling strategy, any special error cases]
```

---

### ✅ Loading States (2 points)

**Score:** ____ / 2

- [ ] Skeleton loaders for initial page load (matches content structure)
- [ ] Spinner/progress indicators for actions (mutations)
- [ ] Buttons disabled during async operations (prevent double-submit)
- [ ] Loading states match content structure (no layout shift)
- [ ] No flickering or cumulative layout shift (CLS)

**Evidence:**
- Components: All data-fetching components show loading state
- Manual testing: Throttle network to 3G to verify loading states visible

**Notes:**
```
[Note any special loading patterns, skeleton design decisions]
```

---

### ✅ Empty States (2 points)

**Score:** ____ / 2

- [ ] Helpful message when no data exists ("No [items] yet")
- [ ] Call-to-action to create first item (button with clear label)
- [ ] Illustration or icon (not just text)
- [ ] Guidance on what to do next ("Get started by...")
- [ ] Consistent with overall design language (uses Card, icon library)

**Evidence:**
- Components: Empty states implemented in list/table components
- Screenshots: [Attach screenshot of empty state]

**Notes:**
```
[Note empty state copy, icon choices, user guidance]
```

---

### ✅ Smoke Test Coverage (2 points)

**Score:** ____ / 2

- [ ] Bash script tests the happy path (`scripts/smoke-test-[feature].sh`)
- [ ] Script runs successfully in local environment
- [ ] Tests run in CI/CD pipeline (or documented how to add)
- [ ] Covers create, read, update operations (DELETE if applicable)
- [ ] Validates expected response structure (uses `jq` or similar)
- [ ] Returns non-zero exit code on failure

**Evidence:**
- Smoke test file: `scripts/smoke-test-[feature].sh`
- CI config: `.github/workflows/` or documented in runbook
- Test run: `bash scripts/smoke-test-[feature].sh` output shows all tests pass

**Notes:**
```
[Note any test setup requirements, test data dependencies]
```

---

### ✅ Basic Runbook Documentation (2 points)

**Score:** ____ / 2

- [ ] Feature purpose and scope documented (in `[FEATURE]_SLICE.md`)
- [ ] API endpoints listed with examples (request/response samples)
- [ ] Database tables and key relationships explained
- [ ] Common troubleshooting scenarios documented (at least 3)
- [ ] Known limitations noted

**Evidence:**
- Runbook file: `[FEATURE]_SLICE.md` or `templates/SLICE_TEMPLATE.md` (filled out)
- Completeness check: All sections filled (no [PLACEHOLDER] text)

**Notes:**
```
[Note any missing sections, plan to complete documentation]
```

---

## Tier 2: Production Hardening (10 Points)

**Tier 2 Score:** ____ / 10

Tier 2 transforms working features into reliable, maintainable, observable systems.

### ✅ Unit Tests (2 points)

**Score:** ____ / 2

- [ ] Business logic tested in isolation (pure functions, calculations, validation)
- [ ] Edge cases covered (null, empty arrays, invalid inputs, boundary conditions)
- [ ] 80% coverage minimum for feature code (measured with `vitest --coverage`)
- [ ] 100% coverage for critical paths (compliance calculations, payments, data integrity)
- [ ] Tests run in CI/CD pipeline
- [ ] Fast execution (<5s for unit test suite)

**Evidence:**
- Test files: `[feature]/[module].test.ts` or `shared/[module].test.ts`
- Coverage report: `npm run test:coverage` shows ≥80% for feature files
- CI integration: Tests run on every PR

**Notes:**
```
[Note coverage percentage, any untested code with justification]
```

---

### ✅ Integration Tests (1 point)

**Score:** ____ / 1

- [ ] API endpoints tested end-to-end (supertest or similar)
- [ ] Database interactions verified (real DB queries, not mocks)
- [ ] Authentication/authorization tested (401, 403 cases)
- [ ] Error cases covered (400, 404, 500 responses)
- [ ] Tests use isolated test database (not production data)
- [ ] Cleanup after each test (no data pollution between tests)

**Evidence:**
- Test files: `server/__tests__/[feature].test.ts`
- Test run: All integration tests pass locally
- Test database: Uses separate DB or in-memory DB

**Notes:**
```
[Note test setup, database seeding strategy, any flaky tests]
```

---

### ✅ E2E Playwright Tests (1 point)

**Score:** ____ / 1

- [ ] Critical user journeys tested (happy path workflows)
- [ ] Tests run against real UI in browser (Chromium/Firefox)
- [ ] Mobile and desktop viewports covered (at least one mobile, one desktop)
- [ ] Screenshots captured on failure (automatic or manual)
- [ ] Tests run in CI/CD pipeline
- [ ] Flaky tests fixed or marked as such (no random failures)

**Evidence:**
- Test files: `tests/[feature].spec.ts`
- Test run: `npx playwright test` passes
- CI integration: Playwright tests run on every PR

**Notes:**
```
[Note test coverage, any skipped tests, flakiness issues]
```

---

### ✅ API Documentation (1 point)

**Score:** ____ / 1

- [ ] OpenAPI/Swagger spec generated (or manual documentation)
- [ ] Request/response examples provided for each endpoint
- [ ] Authentication requirements documented
- [ ] Error responses documented (4xx, 5xx codes)
- [ ] Hosted at `/api/docs` endpoint or in runbook
- [ ] Kept in sync with actual implementation (validated)

**Evidence:**
- Documentation location: `[FEATURE]_SLICE.md` Section 6, or `/api/docs`
- Sample requests: All endpoints have curl examples or Postman collection

**Notes:**
```
[Note documentation format, how it's kept in sync]
```

---

### ✅ Performance Benchmarks (1 point)

**Score:** ____ / 1

- [ ] Baseline performance metrics established (before feature launch)
- [ ] API response times measured (p50, p95, p99 latencies)
- [ ] Database query times tracked (EXPLAIN ANALYZE run)
- [ ] Frontend bundle size monitored (impact measured)
- [ ] Load testing performed (target: 100 concurrent users minimum)
- [ ] Results documented in runbook

**Evidence:**
- Benchmark documentation: In `[FEATURE]_SLICE.md` Section 11
- Load test results: k6, Artillery, or similar tool output
- Bundle analysis: `npm run build` shows bundle size delta

**Notes:**
```
[Note benchmark tools used, results summary, bottlenecks identified]
```

---

### ✅ Comprehensive Error Handling (1 point)

**Score:** ____ / 1

- [ ] All error paths tested (not just happy path)
- [ ] Errors logged to Sentry (or equivalent) with context
- [ ] User-facing errors are actionable ("Try again" or "Contact support")
- [ ] Errors don't expose internals (no stack traces, DB details to users)
- [ ] Retry logic for transient failures (network timeouts, DB deadlocks)
- [ ] Circuit breakers for external dependencies (if applicable)

**Evidence:**
- Error handling: Try-catch in all routes, Sentry integration active
- Error messages: User-friendly messages reviewed
- Testing: Manually triggered errors (DB down, network timeout)

**Notes:**
```
[Note Sentry project, error message guidelines, retry strategy]
```

---

### ✅ Structured Logging (1 point)

**Score:** ____ / 1

- [ ] JSON-formatted logs (using serverLogger, not console.log)
- [ ] Correlation IDs for request tracing (req.correlationId or similar)
- [ ] Log levels used appropriately (DEBUG, INFO, WARN, ERROR)
- [ ] Sensitive data redacted (passwords, tokens, PII masked)
- [ ] Logs queryable in production (searchable by correlation ID, user ID, etc.)
- [ ] Performance overhead measured (<5ms per log call)

**Evidence:**
- Logger usage: `serverLogger.info()` calls in all routes
- Log format: Sample log output shows JSON structure
- PII redaction: Verified passwords, tokens not logged

**Notes:**
```
[Note logging strategy, what's logged at each level, redaction rules]
```

---

### ✅ Input Validation (1 point)

**Score:** ____ / 1

- [ ] All inputs validated with Zod schemas (no direct req.body usage)
- [ ] SQL injection prevented (parameterized queries only, Drizzle ORM)
- [ ] XSS prevented (proper escaping, React auto-escapes)
- [ ] File uploads validated (size, type, content if applicable)
- [ ] Rate limiting on all endpoints (express-rate-limit or similar)
- [ ] CSRF tokens required for state-changing operations (POST, PATCH, DELETE)

**Evidence:**
- Zod validation: All POST/PATCH routes use `.safeParse()`
- CSRF protection: `csrfSynchronisedProtection` middleware applied
- Rate limiting: Configured in `server/routes.ts`

**Notes:**
```
[Note validation strategy, rate limits configured, CSRF implementation]
```

---

### ✅ Accessibility Audit (1 point)

**Score:** ____ / 1

- [ ] WCAG 2.1 AA compliance verified (or target level documented)
- [ ] Keyboard navigation tested (Tab, Enter, Escape work)
- [ ] Screen reader tested (NVDA/VoiceOver/JAWS)
- [ ] Color contrast ratios measured (4.5:1 minimum for text)
- [ ] Focus indicators visible (blue outline or custom style)
- [ ] ARIA labels present on interactive elements (buttons, links, inputs)
- [ ] Automated accessibility tests (axe-core, pa11y, or Lighthouse)

**Evidence:**
- Keyboard test: Manual test passed (can navigate entire feature)
- Screen reader: Tested with [NVDA/VoiceOver], output makes sense
- Contrast: Checked with WebAIM Contrast Checker or Lighthouse
- Automated: Lighthouse accessibility score ≥90 or axe-core tests pass

**Notes:**
```
[Note accessibility testing tools used, any known issues, remediation plan]
```

---

## Tier 3: Operational Excellence (10 Points)

**Tier 3 Score:** ____ / 10

Tier 3 ensures features are observable, scalable, and maintainable in production.

### ✅ Monitoring Dashboards (2 points)

**Score:** ____ / 2

- [ ] Key metrics visualized (requests/sec, error rate, latency)
- [ ] Real-time dashboards for operations team (Grafana, Datadog, or similar)
- [ ] Historical trends tracked (able to compare week-over-week)
- [ ] Drill-down capabilities for debugging (click to see details)
- [ ] Dashboards accessible to all engineers (shared links or permissions)
- [ ] Mobile-friendly for on-call engineers (responsive design)

**Evidence:**
- Dashboard URL: [Grafana/Datadog dashboard link]
- Screenshot: [Attach dashboard screenshot showing key metrics]
- Metrics tracked: [List metrics: request count, latency, error rate, etc.]

**Notes:**
```
[Note dashboard tool, metrics definitions, access instructions]
```

---

### ✅ Alerting (1 point)

**Score:** ____ / 1

- [ ] Critical errors trigger alerts (Slack, PagerDuty, email)
- [ ] Thresholds defined (error rate >5%, latency >500ms, etc.)
- [ ] Alerts include runbook links (quick access to troubleshooting guide)
- [ ] On-call rotation defined (who to page)
- [ ] Alert fatigue prevented (no flapping alerts, aggregation rules)
- [ ] Escalation policies configured (if primary on-call doesn't respond)

**Evidence:**
- Alert configuration: [Prometheus rules, Datadog monitors, or similar]
- Runbook links: Alerts reference `[FEATURE]_SLICE.md` Section 10.3
- Test alert: Triggered test alert successfully

**Notes:**
```
[Note alerting tool, thresholds chosen, escalation policy]
```

---

### ✅ Load Testing (1 point)

**Score:** ____ / 1

- [ ] Tested with 100 concurrent users minimum (k6, Artillery, JMeter)
- [ ] Peak load scenarios tested (3x normal traffic)
- [ ] Database connection pool sizing validated (no pool exhaustion)
- [ ] Memory leaks checked (24-hour soak test or similar)
- [ ] Results documented with recommendations (in runbook)
- [ ] Load tests run before major releases (or documented when to run)

**Evidence:**
- Load test file: `tests/load/[feature].js` or similar
- Test results: Documented in `[FEATURE]_SLICE.md` Section 11
- Performance: p95 latency <200ms under load

**Notes:**
```
[Note load testing tool, test scenarios, results summary, bottlenecks]
```

---

### ✅ Incident Response Runbook (1 point)

**Score:** ____ / 1

- [ ] Step-by-step troubleshooting guide (in runbook Section 10.3)
- [ ] Common failure modes documented (at least 3 scenarios)
- [ ] Recovery procedures tested (dry-run or postmortem evidence)
- [ ] Escalation contacts listed (who to page, Slack channels)
- [ ] Postmortem template included (for after-incident analysis)
- [ ] Runbook accessible during outages (offline copy or printed)

**Evidence:**
- Runbook section: `[FEATURE]_SLICE.md` Section 10.3
- Failure scenarios: [List 3+ documented failure modes]
- Dry-run: Tested runbook steps manually or in staging

**Notes:**
```
[Note common failure modes, any gaps in runbook, testing results]
```

---

### ✅ Backup & Restore Procedures (1 point)

**Score:** ____ / 1

- [ ] Automated daily backups configured (or documented)
- [ ] Backups tested monthly (restore to staging environment)
- [ ] Point-in-time recovery (PITR) enabled (if using Neon or similar)
- [ ] Backup retention policy defined (30 days, 12 months, etc.)
- [ ] Offsite backup storage (different region/cloud)
- [ ] Recovery time objective (RTO) documented (<1 hour, <4 hours, etc.)

**Evidence:**
- Backup configuration: Neon automatic backups enabled, or manual backup script
- Restore test: Last tested on [DATE], successful restore to staging
- Documentation: Backup strategy in `[FEATURE]_SLICE.md` Section 10 or `DATABASE_BACKUP_STRATEGY.md`

**Notes:**
```
[Note backup tool, retention policy, last restore test date, RTO/RPO targets]
```

---

### ✅ Rollback Procedures (1 point)

**Score:** ____ / 1

- [ ] One-click rollback in deployment system (Vercel, Replit, or similar)
- [ ] Database migrations reversible (down migration exists)
- [ ] Feature flags for gradual rollout (if applicable)
- [ ] Rollback tested in staging (dry-run performed)
- [ ] Maximum rollback time documented (target: <5 minutes)
- [ ] Rollback playbook accessible during incidents (in runbook)

**Evidence:**
- Rollback procedure: Documented in `[FEATURE]_SLICE.md` Section 10.2
- Migration: Down migration tested (`npm run db:migrate:rollback`)
- Deployment: Verified one-click rollback in Replit/Vercel UI

**Notes:**
```
[Note rollback mechanism, migration reversibility, dry-run results]
```

---

### ✅ Performance Budgets Enforced (1 point)

**Score:** ____ / 1

- [ ] API p95 latency <200ms enforced in CI (automated check)
- [ ] Frontend bundle size <500KB enforced (or +50KB from baseline)
- [ ] Lighthouse score >90 for performance (or documented target)
- [ ] Database query analysis (<50ms p95 for critical queries)
- [ ] Automated performance regression tests (CI blocks if perf degrades)
- [ ] Failing builds block deployment (CI fails on budget violation)

**Evidence:**
- CI config: `.github/workflows/performance-check.yml` or similar
- Bundle size: Measured with `npm run build`, within budget
- Lighthouse: Score documented, meets target
- Query analysis: EXPLAIN ANALYZE shows index usage, <50ms

**Notes:**
```
[Note performance budgets, CI setup, any budget violations and justification]
```

---

### ✅ Security Audit (1 point)

**Score:** ____ / 1

- [ ] Authentication tested (cannot access without valid session)
- [ ] Authorization tested (users can only access their own data)
- [ ] SQL injection prevented (parameterized queries, ORM)
- [ ] XSS prevented (output escaping, CSP headers)
- [ ] CSRF protection enabled (tokens required for mutations)
- [ ] Sensitive data encrypted (passwords hashed, PII encrypted if stored)
- [ ] Security headers configured (Helmet.js or equivalent)

**Evidence:**
- Security testing: Manual test of auth/authz, attempted SQL injection, XSS
- CSRF: Verified tokens required on POST/PATCH/DELETE
- Helmet.js: Configured in `server/index.ts`
- Password hashing: Bcrypt or similar used

**Notes:**
```
[Note security testing approach, any vulnerabilities found and fixed]
```

---

### ✅ Final Review (1 point)

**Score:** ____ / 1

- [ ] All 39 points above completed (Tiers 1-3)
- [ ] Code reviewed by at least one other engineer
- [ ] Feature owner sign-off obtained
- [ ] Documentation complete (no [PLACEHOLDER] text in runbook)
- [ ] Compliance checklist (this file) filled out completely
- [ ] Ready for production deployment

**Evidence:**
- Code review: PR #[___] approved by [REVIEWER_NAME]
- Feature owner: [NAME] approved on [DATE]
- Documentation: `[FEATURE]_SLICE.md` complete

**Notes:**
```
[Note any outstanding items, conditional approvals, launch plan]
```

---

## Final Checklist

Before marking this feature as production-ready:

- [ ] **Tier 1 Complete:** 20/20 points
- [ ] **Tier 2 Complete:** 10/10 points
- [ ] **Tier 3 Complete:** 10/10 points
- [ ] **Total Score:** 40/40 points
- [ ] **Runbook Complete:** `[FEATURE]_SLICE.md` filled out (see `templates/SLICE_TEMPLATE.md`)
- [ ] **Tests Passing:** Unit, integration, E2E, smoke tests all green
- [ ] **Performance Verified:** Benchmarks meet targets, load tests passed
- [ ] **Security Verified:** Auth, authz, input validation, CSRF, XSS all tested
- [ ] **Observability Ready:** Logging, metrics, dashboards, alerts configured
- [ ] **Operational Readiness:** Runbooks, rollback, backups tested
- [ ] **Code Review:** Approved by peer reviewer
- [ ] **Feature Owner Approval:** Signed off by product owner

**Approved By:**
- Engineer: [NAME], [DATE]
- Reviewer: [NAME], [DATE]
- Feature Owner: [NAME], [DATE]

**Deployment Plan:**
- [ ] Deploy to staging
- [ ] Run smoke tests in staging
- [ ] Monitor for 24 hours in staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours in production
- [ ] Mark feature as stable

---

## Notes

Use this section to document any deviations from the standard, special considerations, or future improvements:

```
[Add any additional notes, context, or follow-up items]
```

---

## References

- [PRODUCTION_STANDARDS.md](../PRODUCTION_STANDARDS.md) - Full 40/40 standard definition
- [TESTING_STANDARDS.md](../TESTING_STANDARDS.md) - Testing requirements and patterns
- [OBSERVABILITY_STANDARDS.md](../OBSERVABILITY_STANDARDS.md) - Logging and monitoring standards
- [[FEATURE]_SLICE.md](../[FEATURE]_SLICE.md) - Feature runbook and documentation
