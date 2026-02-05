# AuditForecaster - Comprehensive Repository Audit Report

**Date:** 2026-02-05
**Scope:** Full codebase analysis — security, architecture, database, dependencies, performance, testing, configuration
**Codebase:** ~30,500 lines of TypeScript/TSX across `auditforecaster/src/`

---

## Executive Summary

AuditForecaster is a well-architected Next.js 15 SaaS platform for energy audit management. The codebase demonstrates strong fundamentals — proper use of the App Router, server components, centralized server actions, Prisma ORM, and Zod validation. However, this audit uncovered **4 critical**, **18 high**, **20 medium**, and **12 low** severity findings across security, data integrity, performance, and testing.

**Top 5 priorities for immediate action:**
1. Guard E2E auth bypass with `NODE_ENV` check (Critical — full admin access if misconfigured)
2. Fix password reset mock token (Critical — non-functional or exploitable)
3. Uncomment root layout providers (Critical — ErrorBoundary, Toaster, SyncProvider all disabled)
4. Add transactions to multi-write server actions (Critical — data corruption risk)
5. Authenticate metrics/health endpoints (Critical — infrastructure info leak)

---

## Table of Contents

1. [Security Audit](#1-security-audit)
2. [Code Quality & Architecture Audit](#2-code-quality--architecture-audit)
3. [Database & Data Integrity Audit](#3-database--data-integrity-audit)
4. [Dependency Audit](#4-dependency-audit)
5. [Performance Audit](#5-performance-audit)
6. [Testing Audit](#6-testing-audit)
7. [Configuration & Deployment Audit](#7-configuration--deployment-audit)
8. [Positive Observations](#8-positive-observations)
9. [Prioritized Remediation Plan](#9-prioritized-remediation-plan)

---

## 1. Security Audit

### CRITICAL

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| S1 | **E2E auth bypass has no `NODE_ENV` guard.** `MOCK_AUTH_FOR_E2E=true` returns hardcoded ADMIN session for every request. `ENABLE_E2E_AUTH_BYPASS=true` skips all middleware auth. Neither checks `NODE_ENV`. | `src/auth.ts:99-112`, `src/middleware.ts:16-19` | Full unauthenticated admin access if env var is set in production |
| S2 | **Password reset uses static `mock-token`.** The reset email contains a hardcoded token, making the feature either non-functional or exploitable. | `src/app/actions/auth.ts:60-73` | Anyone can reset any password if the token is accepted |
| S3 | **Metrics endpoint is unauthenticated.** `/api/metrics` exposes Prometheus data (memory, event loop, custom metrics) to anyone. | `src/app/api/metrics/route.ts:8-20` | Information disclosure |
| S4 | **Health endpoint leaks infrastructure details.** `/api/health` reveals database, Redis, filesystem status and latencies with no auth. | `src/app/api/health/route.ts:112-148` | Attacker can fingerprint infrastructure and detect outage windows |

### HIGH

| # | Finding | Location |
|---|---------|----------|
| S5 | Demo credentials (`admin@ulrich.com` / `password123`) displayed on login page unconditionally — no `NODE_ENV` guard | `src/app/login/page.tsx:73-81` |
| S6 | Rate limiting fails open when Redis is down; in-memory fallback does not persist across serverless instances | `src/lib/security.ts:58-61` |
| S7 | Rate limiting only applied to `/api/*` routes — server actions (the main API surface) have no rate limiting | `src/middleware.ts:38-54` |
| S8 | Photo upload server action (`uploadPhoto`) lacks file type validation, size limits, and UUID format checking (unlike the well-validated API route version) | `src/app/actions/photos.ts:9-55` |
| S9 | SupplyPro webhook processes requests without auth if `SUPPLYPRO_WEBHOOK_SECRET` is unset | `src/app/api/webhooks/supplypro/route.ts:30-45` |
| S10 | Google Calendar webhook token verification skipped if env var is missing | `src/app/api/webhooks/google-calendar/route.ts:27-34` |
| S11 | API key validation (`validateApiKey`) does not check expiration or revocation status | `src/lib/api-auth.ts:37-56` |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| S12 | `updateIntegrationSettings` accepts data without Zod validation (TypeScript types erased at runtime) | `src/app/actions/integrations.ts:48-73` |
| S13 | Inspection create API route uses `jobId`/`templateId` from request body with no format validation | `src/app/api/inspections/create/route.ts:13-28` |
| S14 | `createReinspection` has no RBAC — any authenticated user can create reinspections and change job status | `src/app/actions/inspections.ts:146-180` |
| S15 | All contractor CRUD actions missing RBAC — any authenticated user can create/update/delete subcontractors | `src/app/actions/contractors.ts:10-76` |
| S16 | `callbackUrl` from form data passed directly to `signIn` `redirectTo` — relies on NextAuth default redirect protection | `src/app/actions/auth.ts:22-28` |
| S17 | X-Frame-Options conflict: middleware sets `DENY`, next.config.ts sets `SAMEORIGIN` — undefined browser behavior | `src/middleware.ts:57`, `next.config.ts:45` |
| S18 | File upload extension derived from client-provided filename — a valid JPEG named `.html` would be stored with that extension | `src/app/api/upload/photo/route.ts:51-53` |

### LOW

| # | Finding | Location |
|---|---------|----------|
| S19 | ESLint ignored during builds (`ignoreDuringBuilds: true`) — security lint rules won't block deploys | `next.config.ts:22` |
| S20 | Bcrypt cost factor 10 (OWASP recommends minimum 12 for 2026 hardware) | `src/app/actions/users.ts:51` |
| S21 | Password minimum length 6 characters (NIST recommends minimum 8) | `src/auth.ts:44`, `src/app/actions/users.ts:14` |
| S22 | In-memory rate limit fallback `Map` never evicts entries — potential memory leak under sustained load | `src/lib/security.ts:44` |
| S23 | Admin can delete their own account (`deleteUser` has no self-deletion guard) | `src/app/actions/users.ts:106-119` |
| S24 | Env validation (`env.ts`) missing `SUPPLYPRO_WEBHOOK_SECRET`, `GOOGLE_CALENDAR_WEBHOOK_TOKEN`, `ADMIN_NOTIFICATION_EMAIL` | `src/lib/env.ts` |

---

## 2. Code Quality & Architecture Audit

### CRITICAL

| # | Finding | Location |
|---|---------|----------|
| A1 | **Root layout providers entirely commented out** — `ErrorBoundary`, `SyncProvider`, `SyncIndicator`, `Toaster`, and `ServiceWorkerRegister` are imported but never rendered. Error boundaries, offline sync, toast notifications, and PWA service worker registration are all disabled. | `src/app/layout.tsx:57-64` |
| A2 | **No `global-error.tsx` exists** — if the root layout throws, there is no error boundary to catch it. | `src/app/` (missing file) |

### HIGH

| # | Finding | Location |
|---|---------|----------|
| A3 | **Duplicate mileage classification** with conflicting behavior: `finance.ts` uses uppercase status (`BUSINESS`/`PERSONAL`, sets `CLASSIFIED`), `finances.ts` uses capitalized (`Business`/`Personal`, sets `APPROVED`). Both are actively used. | `src/app/actions/finance.ts`, `src/app/actions/finances.ts` |
| A4 | **Triple `updateProfile` implementation** across `settings.ts`, `user.ts`, and two different `profile-form.tsx` components. | `src/app/actions/settings.ts:14`, `src/app/actions/user.ts:22` |
| A5 | **3 inconsistent server action return shapes**: `{ message }`, `{ success, message }`, `{ success, error }` — consumers cannot reliably check for errors. | All action files |
| A6 | **~180 debug/log artifact files** committed in the project root (build_log_v2-10.txt, functional_test_report_2-20.json, type-errors-2-9.log, etc.) | `auditforecaster/` root |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| A7 | Fragile `NEXT_REDIRECT` detection using string comparison instead of `isRedirectError()` | `src/app/actions/inspections.ts:136,173` |
| A8 | 8+ production `as any` / `: any` usages hiding type errors | Multiple files (see detailed findings) |
| A9 | `zodResolver(...) as any` repeated 3 times (indicates `@hookform/resolvers` version mismatch) | `inspector-dialog.tsx`, `vehicle-dialog.tsx`, `job-dialog.tsx` |
| A10 | Storybook installed with 6 devDependencies but unused for application components — only default scaffolding stories exist | `package.json`, `src/stories/` |
| A11 | Inconsistent file naming (camelCase `blowerDoor.ts`, `mockData.ts` vs kebab-case everywhere else) | `src/lib/calculations/`, `src/lib/` |
| A12 | `updateUser` error log says "Failed to create user" — copy-paste typo | `src/app/actions/users.ts:101` |
| A13 | Inline `'use server'` action in page component with `any` param type, mixing data access into page | `src/app/(dashboard)/inspections/[id]/run/page.tsx:36-47` |

### LOW

| # | Finding | Location |
|---|---------|----------|
| A14 | `mockData.ts` is dead code (zero imports) | `src/lib/mockData.ts` |
| A15 | Root-level `profile-form.tsx` appears unused (superseded by `settings/profile-form.tsx`) | `src/components/profile-form.tsx` |
| A16 | Jest config files left over from migration to Vitest | `jest.setup.js`, `jest.setup.ts`, `jest.config.js` |
| A17 | Inspection routes inconsistently placed: edit/run at `/inspections/[id]` but view at `/dashboard/inspections/[id]` | `src/app/(dashboard)/inspections/` vs `src/app/(dashboard)/dashboard/inspections/` |

---

## 3. Database & Data Integrity Audit

### CRITICAL

| # | Finding | Location |
|---|---------|----------|
| D1 | **Missing migrations for ~60% of schema** — models like `OnboardingChecklist`, `Certification`, `Invoice`, `InvoiceItem`, `Payout`, `Route`, `IntegrationLog`, `ApiKey`, `AuditLog`, `TaskClaim`, `SavedReport`, etc. have no migration files. Either `prisma db push` was used (no audit trail) or schema is ahead of the database. | `prisma/migrations/` (only 6 migrations) |
| D2 | **N+1 in `getAnalyticsData`** — `getJobPrice()` makes up to 3 DB queries per call, executed in a loop for every uninvoiced job. 50 jobs = 300+ queries. | `src/app/actions/analytics.ts:107-118`, `src/lib/pricing.ts` |
| D3 | **User/Builder/Inspector deletion without cascade safety** — `deleteUser`, `deleteBuilder`, `deleteInspector` perform raw deletes with no pre-check for dependent records. Will either orphan data (SetNull) or throw unhandled errors (Restrict). | `src/app/actions/users.ts:106-119`, `builders.ts:88-106`, `inspectors.ts:118-134` |
| D4 | **`updateInspection` not wrapped in transaction** — creates/updates Inspection and updates Job status in separate queries. Partial failure leaves inconsistent state. | `src/app/actions/inspections.ts:80-106` |
| D5 | **`logTrip` not wrapped in transaction** — creates MileageLog and updates Vehicle odometer separately. Failure after log creation leaves mileage out of sync. | `src/app/actions/finance.ts:20-38` |

### HIGH

| # | Finding | Location |
|---|---------|----------|
| D6 | **12+ unbounded `findMany` queries** with no pagination — invoices page loads ALL invoices, builders page loads ALL builders, expenses loads ALL pending, etc. | Multiple (see detailed list below) |
| D7 | **String-typed enums with no CHECK constraints** — `User.role`, `Job.status`, `Invoice.status`, `Equipment.status`, `Expense.status`, `TaxCredit.status` are all `String` fields with no DB-level validation. | `prisma/schema.prisma` |
| D8 | **Job status enum inconsistencies** — Zod schema allows `REVIEWED`/`INVOICED` but not `CANCELED`; `updateJobStatus` allows `CANCELED` but not `REVIEWED`/`INVOICED` | `src/lib/schemas.ts:92`, `src/app/actions/jobs.ts:85` |
| D9 | **Expense status mismatch** — schema documents `PENDING`/`CLASSIFIED`, `processExpense` uses `APPROVED`/`REJECTED` | `prisma/schema.prisma`, `src/app/actions/expenses.ts:40` |
| D10 | **Seed file uses wrong status case** — `'Active'` instead of `'ACTIVE'` for equipment and vehicles | `prisma/seed.ts:147-161` |
| D11 | **Missing Zod schemas** for most models accepting user input: Invoice, InvoiceItem, Payout, Route, TaxCredit, MileageLog, Photo, ActionItem | `src/lib/schemas.ts` |
| D12 | **`autoClassifyLogs` N+1** — updates each mileage log individually in a loop, no transaction | `src/app/actions/mileage.ts:61-79` |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| D13 | Redundant `Job.address` field — denormalized concatenation of `streetAddress` + `city`, must be kept in sync manually | `prisma/schema.prisma:341`, `src/app/actions/jobs.ts:44` |
| D14 | 11 missing indexes on commonly-filtered columns (SystemLog.userId, Payout.status/dates, Route.status, Invoice.date/deletedAt, Expense.status/date, MileageLog.status, ServiceItem.name, etc.) | `prisma/schema.prisma` |
| D15 | No unique constraints on Builder.name, Builder.email, Subcontractor.email, ReportTemplate.name | `prisma/schema.prisma` |
| D16 | `InvoiceItem.totalPrice` denormalized without computed check — can drift from `quantity * unitPrice` | `prisma/schema.prisma:615` |
| D17 | `updateJob` fetches the same record twice (once for address check, once for audit log) | `src/app/actions/jobs.ts:150,171` |
| D18 | Missing transactions in: `createJob` + audit, `updateJobStatus` + audit, `createVehicle` + audit, `deleteVehicle` + audit, `updateTaxCreditStatus` | Multiple action files |
| D19 | Seed file `MileageLog` creation references non-existent `userId` field — runtime error during seeding | `prisma/seed.ts:365` |

### Unbounded Query Detail

| File | Line | Query |
|------|------|-------|
| `dashboard/builders/page.tsx` | 18 | `prisma.builder.findMany()` — all builders |
| `dashboard/contractors/page.tsx` | 18 | `prisma.subcontractor.findMany()` — all subcontractors with compliance docs |
| `finances/invoices/page.tsx` | 24 | `prisma.invoice.findMany()` — all invoices |
| `actions/analytics.ts` | 47-51, 64-71 | All completed uninvoiced jobs for current/previous month |
| `actions/analytics.ts` | 92-95 | All jobs from last 30 days (should use `groupBy`) |
| `actions/expenses.ts` | 13-35 | All pending expenses |
| `actions/finance.ts` | 47-52 | All pending mileage logs |
| `actions/logistics.ts` | 54 | All mileage logs |
| `actions/profitability.ts` | 70-85 | All completed/reviewed/invoiced jobs in date range with deep includes |
| `actions/invoices.ts` | 217-244 | All uninvoiced jobs for a builder |
| `actions/payouts.ts` | 14-40 | All unpaid jobs for a user in period |
| `lib/pricing.ts` | 97-99 | All service items |

---

## 4. Dependency Audit

### HIGH

| # | Finding | Location |
|---|---------|----------|
| P1 | **`next-auth@^5.0.0-beta.30` with caret range** — allows uncontrolled upgrades to any `5.0.0-beta.*` including breaking changes. Pin to exact version. | `package.json:77` |
| P2 | **Both Jest and Vitest installed** — `jest`, `jest-environment-jsdom`, `@types/jest`, `jest.config.js`, `jest.setup.js`, `jest.setup.ts` are all dead weight (~20MB). Vitest is the actual test runner. | `package.json:110,123-125` |
| P3 | **`googleapis` (~80MB)** used only for Google Calendar — should use scoped `@googleapis/calendar` instead | `package.json:71` |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| P4 | `prisma` CLI in `dependencies` instead of `devDependencies` — only `@prisma/client` is needed at runtime | `package.json:78` |
| P5 | `@tailwindcss/postcss` and `tailwindcss-animate` in `dependencies` — build-time only | `package.json:57,90` |
| P6 | `es-define-property` in `dependencies` — transitive dep accidentally added as direct | `package.json:68` |
| P7 | Both `dexie` and `idb` installed — two IndexedDB wrapper libraries for the same purpose | `package.json:66,72` |
| P8 | `puppeteer` (~300MB with Chromium) could use `puppeteer-core` since Dockerfile already installs system Chromium | `package.json:80` |

---

## 5. Performance Audit

### HIGH

| # | Finding | Location |
|---|---------|----------|
| F1 | **Sentry `withSentryConfig` commented out** — entire Sentry integration is non-functional (no source maps uploaded, no release tracking, no auto-instrumentation) | `next.config.ts:2` |
| F2 | **PWA manifest has only one SVG icon** — fails PWA installability requirements (need 192x192 and 512x512 PNG icons, maskable variant) | `public/manifest.json:10-16` |
| F3 | **`swcMinify: true` is a no-op** — removed in Next.js 15 (SWC minification is default) | `next.config.ts:12` |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| F4 | Missing `experimental.optimizePackageImports` for `lucide-react`, `recharts`, `@radix-ui/*` — would reduce bundle size via tree-shaking | `next.config.ts` (missing) |
| F5 | Service worker precache manifest appears hardcoded/committed rather than auto-generated during build | `public/sw.js` |
| F6 | API responses cached for 24h in service worker — can show stale inspection/job data | `public/sw.js` |
| F7 | `recharts` (~500KB) imported in `"use client"` component without code splitting | `src/components/analytics-charts.tsx:1-3` |

---

## 6. Testing Audit

### CRITICAL

| # | Finding | Location |
|---|---------|----------|
| T1 | **E2E `inspection-creation.spec.ts` silently passes when feature is broken** — if "Start Inspection" button never appears, the test logs to console and passes. A test that can pass without asserting anything is worse than no test. | `e2e/inspection-creation.spec.ts:46-50` |

### HIGH

| # | Finding | Location |
|---|---------|----------|
| T2 | **19+ action files have zero test coverage**: `auth.ts`, `photos.ts`, `sync.ts`, `mileage.ts`, `finances.ts`, `logistics.ts`, `integrations.ts`, `task-claiming.ts`, `expenses.ts`, `export.ts`, `routes.ts`, `settings.ts`, `google.ts`, `finance.ts`, `advanced-templates.ts`, `user.ts`, `inspectors.ts`, `health.ts`, `tax-credits.ts` | `src/app/actions/` |
| T3 | **All unit tests mock everything** — Prisma, auth, email, next/cache are all mocked. Tests verify mock interactions ("was `prisma.create` called?") not behavior. No integration tests against a real database found. | All `__tests__/*.test.ts` |
| T4 | **Transaction mocks hide bugs** — `$transaction: vi.fn((callback) => callback(prisma))` makes tests pass without testing transaction isolation. If real code depends on isolation (e.g., preventing duplicate invoices), tests can't catch the bug. | `src/app/actions/__tests__/invoices.test.ts:20` |
| T5 | **E2E tests use hardcoded credentials** (`inspector1@ulrich.com` / `password123`) with no setup/teardown — tests fail if database is not in expected state | `e2e/inspection-creation.spec.ts:12-13` |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| T6 | Test files excluded from ESLint — no linting on test code | `eslint.config.mjs:16-28` |
| T7 | Fragile `NEXT_REDIRECT` catch pattern in test files — `if ((e as Error).message !== 'NEXT_REDIRECT') throw e` | Multiple test files |
| T8 | Low test case count per file — most action test files have only 3-4 test cases. Missing: error handling, concurrent operations, edge cases. | All `__tests__/` |
| T9 | `contractors.test.ts` located at `src/app/actions/contractors.test.ts` (not in `__tests__/`) — inconsistent test organization | `src/app/actions/` |

---

## 7. Configuration & Deployment Audit

### HIGH

| # | Finding | Location |
|---|---------|----------|
| C1 | **Three overlapping CI workflows** all trigger on push to `main` — lint + typecheck + test runs 3x in parallel, wasting CI minutes | `.github/workflows/ci.yml`, `ci-cd.yml`, `test.yml` |
| C2 | **Node version mismatch** — Dockerfile uses Node 22, `ci.yml` uses Node 20, `ci-cd.yml` and `test.yml` use Node 18. Production runs on 22, CI tests on 18. | Multiple files |
| C3 | **Conflicting deployment targets** — `ci.yml` builds Docker images for GHCR, `ci-cd.yml` deploys to Vercel. Unclear which is the actual production deployment. | `.github/workflows/` |
| C4 | **No security scanning workflow** — no `npm audit`, Snyk, CodeQL, or container scanning configured despite running a beta auth package | `.github/workflows/` (missing) |

### MEDIUM

| # | Finding | Location |
|---|---------|----------|
| C5 | Dockerfile `COPY . .` in builder stage copies `.env`, `.git/`, test files into build cache — add `.dockerignore` | `Dockerfile:15` |
| C6 | Redis has no password in docker-compose.prod.yml — accessible without auth from any container on the network | `docker-compose.prod.yml:126-128` |
| C7 | `ci-cd.yml` has hardcoded `NEXTAUTH_SECRET: test-secret-key-for-ci-cd-pipeline` — should use GitHub secrets | `.github/workflows/ci-cd.yml:73` |
| C8 | `npx prisma migrate deploy` runs on every container start — race condition if multiple containers start simultaneously | `Dockerfile:84` |
| C9 | Deprecated `version: '3.8'` in both docker-compose files | `docker-compose.yml:1`, `docker-compose.prod.yml:1` |
| C10 | Deprecated `actions/upload-artifact@v3` and `codecov/codecov-action@v3` in CI workflows | `.github/workflows/ci-cd.yml:125`, `test.yml:57,128` |

---

## 8. Positive Observations

The codebase demonstrates many strong practices:

- **No `eval()`, `dangerouslySetInnerHTML`, or `exec()` usage found anywhere**
- **Consistent Zod validation** on the majority of server actions
- **Comprehensive security headers** via middleware: CSP with `strict-dynamic`, HSTS with preload, `frame-ancestors 'none'`, Permissions-Policy
- **Proper password hashing** with bcrypt
- **API key hashing** with SHA-256 (never stored in plaintext)
- **DOMPurify sanitization** available via `security-client.ts`
- **Timing-safe comparison** for webhook signatures (`crypto.timingSafeEqual`)
- **No `.env` file committed** — only `.env.example` with placeholder values
- **No hardcoded real secrets** in source code
- **Good use of Next.js 15 patterns**: server components by default, minimal `"use client"`, async params correctly awaited, route groups, loading states, error boundaries at multiple levels
- **Clean dependency graph** with no circular dependencies detected
- **Proper RBAC** on most admin-level actions
- **Multi-stage Docker build** with non-root user, healthcheck, and optimized layers
- **Comprehensive E2E test matrix** (Chromium, Firefox, WebKit, Pixel 5, iPhone 13)
- **TypeScript strict mode** enabled with `noUncheckedIndexedAccess`
- **Proper transaction usage** in invoice creation/deletion, equipment assignment/return, inspector updates, payout creation

---

## 9. Prioritized Remediation Plan

### P0 — Fix Immediately (Security/Data Corruption)

| # | Action | Est. Effort |
|---|--------|-------------|
| 1 | Add `NODE_ENV !== 'production'` guard to E2E auth bypass in `auth.ts` and `middleware.ts` | 30 min |
| 2 | Implement real password reset token generation (crypto.randomBytes + DB storage + expiry) | 2-4 hrs |
| 3 | Add authentication to `/api/metrics` and `/api/health` endpoints | 1 hr |
| 4 | Uncomment root layout providers (ErrorBoundary, SyncProvider, Toaster, ServiceWorkerRegister) | 30 min |
| 5 | Wrap multi-write server actions in Prisma transactions (`updateInspection`, `logTrip`, `createJob` + audit, `updateJobStatus` + audit, etc.) | 4-6 hrs |
| 6 | Add pre-deletion checks for `deleteUser`, `deleteBuilder`, `deleteInspector` (check for dependent records) | 2-3 hrs |
| 7 | Guard demo credentials display with `NODE_ENV !== 'production'` | 15 min |

### P1 — Fix Soon (High Severity)

| # | Action | Est. Effort |
|---|--------|-------------|
| 8 | Add Zod validation to `uploadPhoto` server action (type, size, UUID format) | 1-2 hrs |
| 9 | Make webhook secret verification mandatory (fail closed, not open) | 1 hr |
| 10 | Add API key expiration/revocation checks to `validateApiKey` | 1 hr |
| 11 | Apply rate limiting to server actions (create shared `withRateLimit` wrapper) | 4-6 hrs |
| 12 | Standardize server action return types (create `ActionResult<T>` type + `requireAuth()` helper) | 4-6 hrs |
| 13 | Resolve duplicate `finance.ts`/`finances.ts` and triple `updateProfile` | 2-3 hrs |
| 14 | Add pagination to all unbounded `findMany` queries (builders, invoices, expenses, etc.) | 6-8 hrs |
| 15 | Fix N+1 in `getAnalyticsData` (batch `getJobPrice` or use a single query with joins) | 2-3 hrs |
| 16 | Pin `next-auth` to exact version (remove `^`) | 5 min |
| 17 | Remove dead Jest dependencies and configs | 30 min |
| 18 | Consolidate CI workflows to a single workflow with matrix strategy | 2-3 hrs |
| 19 | Align Node.js version across Dockerfile and CI | 30 min |

### P2 — Plan for Next Sprint (Medium Severity)

| # | Action | Est. Effort |
|---|--------|-------------|
| 20 | Create `global-error.tsx` | 30 min |
| 21 | Add missing Zod schemas for Invoice, Payout, Route, TaxCredit, MileageLog, Photo, ActionItem | 4-6 hrs |
| 22 | Convert string-typed status fields to Prisma enums (or add CHECK constraints) | 4-6 hrs |
| 23 | Add missing database indexes (11 identified) | 1-2 hrs |
| 24 | Harmonize X-Frame-Options (use `DENY` consistently) | 15 min |
| 25 | Re-enable Sentry `withSentryConfig` in next.config.ts | 1 hr |
| 26 | Add `optimizePackageImports` for heavy libraries | 15 min |
| 27 | Replace `googleapis` with `@googleapis/calendar` | 1-2 hrs |
| 28 | Add `.dockerignore` file | 15 min |
| 29 | Add security scanning workflow (npm audit, CodeQL, or Snyk) | 2-3 hrs |
| 30 | Add proper PWA icons (192x192, 512x512 PNG, maskable) | 1 hr |

### P3 — Cleanup (Low Severity)

| # | Action | Est. Effort |
|---|--------|-------------|
| 31 | Delete ~180 debug/log artifact files from project root | 30 min |
| 32 | Remove dead code: `mockData.ts`, root `profile-form.tsx`, `fix-db.ts`, `test-phase24.ts` | 30 min |
| 33 | Move `prisma`, `dotenv`, `@tailwindcss/postcss`, `tailwindcss-animate` to devDependencies | 15 min |
| 34 | Remove unused `es-define-property` dependency | 5 min |
| 35 | Increase bcrypt cost factor from 10 to 12 | 5 min |
| 36 | Increase password minimum length from 6 to 8 | 5 min |
| 37 | Remove deprecated `swcMinify` and `version: '3.8'` from configs | 5 min |
| 38 | Rename `blowerDoor.ts` to `blower-door.ts` for consistency | 5 min |
| 39 | Fix "Failed to create user" log typo in `updateUser` | 5 min |
| 40 | Consolidate `dexie` and `idb` to one IndexedDB library | 1-2 hrs |

---

## Finding Count Summary

| Severity | Security | Architecture | Database | Dependencies | Performance | Testing | Config | **Total** |
|----------|----------|--------------|----------|--------------|-------------|---------|--------|-----------|
| Critical | 4 | 2 | 5 | 0 | 0 | 1 | 0 | **12** |
| High | 7 | 4 | 7 | 3 | 3 | 4 | 4 | **32** |
| Medium | 7 | 7 | 7 | 5 | 4 | 4 | 6 | **40** |
| Low | 6 | 4 | 0 | 0 | 0 | 0 | 0 | **10** |
| **Total** | **24** | **17** | **19** | **8** | **7** | **9** | **10** | **94** |
