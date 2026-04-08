# AuditForecaster Runbook

## Purpose

This is the operator runbook for the normalized local MVP. It focuses on getting the app running, verifying it, and knowing which lanes matter during portfolio execution.

## Canonical Root

```powershell
cd C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster
```

## Local Start

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification Lanes

### Stable MVP lane

```powershell
npm run smoke
```

This is the canonical verification path for portfolio maturity. It covers:

- type-check
- production build with a local smoke env
- stable Vitest app tests

As of 2026-04-08, the dashboard app segment is forced dynamic during the smoke build so auth and Prisma-backed routes do not get pulled into static generation. That keeps `npm run smoke` honest without requiring a live local PostgreSQL instance.

### Extended UI lane

```powershell
npm run test:storybook
```

Use this when you want browser-backed Storybook coverage for component stories. It is intentionally separate from the default MVP smoke lane.

### Legacy regression lane

```powershell
npm run test:legacy
```

This preserved suite comes from earlier prototype work. Keep it available for later cleanup, but do not treat it as the blocking MVP readiness gate for the portfolio pass.

### E2E lane

```powershell
npm run test:e2e
```

Run this only when the local app is up and the environment is configured for end-to-end flows.

## Environment Notes

Minimum local env for full app behavior:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/auditforecaster"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

The stable smoke lane uses its own smoke env and does not require a live PostgreSQL database.
Full local runtime still does.

## Main Workflow

1. Start the app.
2. Confirm dashboard navigation loads.
3. Use builders, jobs, inspections, and reporting flows as the primary operator journey.
4. Run `npm run smoke` before treating a local change as portfolio-ready.

## Deployment Posture

Current posture is deployable preview:

- local development on DESK
- production build via `npm run build`
- preview-oriented deployment through the existing scripts under `scripts/`

## Known Scope Boundary

- Old DESK and VAULT clones are preserved reference copies only.
- The normalized portfolio root is the only working root.
- Storybook is retained as a secondary UI-confidence lane, not the default repo health gate.

## Known Build Noise

- Webpack cache serialization notices may still appear during `next build`, but the prior OpenTelemetry bundle-warning burst and stale `baseline-browser-mapping` notice are not expected anymore.
