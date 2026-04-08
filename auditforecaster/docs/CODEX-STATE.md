# CODEX-STATE

Last updated: 2026-04-08

## Purpose

AuditForecaster is a normalized Next.js app root. The canonical verification path is the nested app smoke lane.

## Start Here

1. Read `AGENTS.md`
2. Read `.agent/README.md`
3. Read `.agent/DEVELOPMENT_STANDARDS.md`
4. Read `docs/RUNBOOK.md`

## Current Working Assumptions

- This repo is the real app root.
- `npm run smoke` is the minimum high-signal verification path.
- The dashboard layout is intentionally `force-dynamic` so smoke builds do not hit auth- or Prisma-backed dashboard routes during static generation.
- Current smoke output should stay free of the previous OpenTelemetry webpack warning burst; unexpected Prisma connection errors are not acceptable in this lane.
- The stale `baseline-browser-mapping` notice has been cleared by pinning the latest dev dependency refresh.
- Historical log files are reference material, not current truth.
- The portfolio root should stay out of app-level implementation work.

## Fast Verification

```powershell
cd .\auditforecaster
npm run smoke
```
