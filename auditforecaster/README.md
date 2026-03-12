# AuditForecaster

AuditForecaster is a Next.js operations application for running an energy-audit business: jobs, inspections, builders, subdivisions, equipment, reporting, and offline-first field workflows.

## Canonical Local Workflow

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL if you want live data instead of mocked test fixtures

### Install

```powershell
cd C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster
npm install
```

### Run locally

```powershell
npm run dev
```

Open `http://localhost:3000`.

### Verify the repo

```powershell
npm run smoke
```

`smoke` is the MVP verification lane. It runs:

- TypeScript validation
- production build with a deterministic local smoke env
- stable unit/integration test lane

Storybook browser-story tests remain available separately:

```powershell
npm run test:storybook
```

The older broad Vitest lane is preserved as a legacy regression bucket:

```powershell
npm run test:legacy
```

## Environment

Create `.env.local` when you want live app behavior instead of mocked test runs:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/auditforecaster"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NODE_ENV="development"
```

Optional integrations:

- `RESEND_API_KEY`
- `EMAIL_FROM`

## Main Operator Workflow

1. Start the app with `npm run dev`.
2. Navigate the dashboard for jobs, inspections, builders, and reporting.
3. Use the mocked/unit test lane for verification during local development.
4. Use `npm run test:storybook` only when you want browser-level UI coverage for Storybook stories.

`npm run smoke` does not require a hand-written `.env.local`; it injects a safe local verification env for build-time validation.

## Deployment Posture

Current posture is `deployable preview`:

- local development via `npm run dev`
- production build via `npm run build`
- container or preview deployment via the existing Unraid-oriented deployment scripts

## Key Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js app |
| `npm run build` | Build the production app |
| `npm run build:smoke` | Build the app with the local verification env |
| `npm start` | Run the production server |
| `npm run test` | Stable Vitest app test lane |
| `npm run test:legacy` | Preserved broad regression suite from earlier prototype stages |
| `npm run test:storybook` | Browser-backed Storybook story tests |
| `npm run test:e2e` | Playwright end-to-end suite |
| `npm run smoke` | MVP verification lane |
| `npm run verify` | Full MVP gate: smoke plus Storybook story coverage |

## Current State

- canonical working root is the normalized portfolio clone
- old DESK and VAULT copies are preserved reference roots only
- Storybook coverage is kept, but no longer blocks the default MVP verification path
- the older broad Vitest suite is retained as a legacy backlog lane instead of the MVP gate
