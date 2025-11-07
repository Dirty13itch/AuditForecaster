## Quick context for AI coding agents

This repo is a full-stack TypeScript application split into three main areas:
- `client/` — Vite + React UI (path alias `@/*` to `client/src/*`)
- `server/` — Express + Node server entry at `server/index.ts` (bundled with esbuild into `dist/`)
- `shared/` — Types, Drizzle schema and utilities used by both server and client

Key infra and choices you should know:
- TypeScript project; tsconfig paths: `@/*` and `@shared/*` (see `tsconfig.json`).
- Client built with Vite; server is bundled with `esbuild` in the `npm run build` pipeline.
- Database migrations use Drizzle (`drizzle.config.ts`) and require `DATABASE_URL`.
- Playwright is used for e2e tests and integrates Lighthouse and Axe in CI.

Useful commands (from `package.json`):
- dev: `npm run dev` — starts dev server (server/index.ts via `tsx`).
- build: `npm run build` — builds client and bundles server into `dist/`.
- start: `npm run start` — runs `node dist/index.js` (production bundle).
- test:unit: `npm run test:unit` — runs Vitest (`vitest run --coverage`).
- test:e2e: `npm run test:e2e` — runs Playwright against `tests/e2e/golden-path`.
- db:push: `npm run db:push` — push Drizzle migrations (requires `DATABASE_URL`).

Testing & CI patterns to follow:
- Golden path e2e tests live under `tests/e2e/golden-path` and use helper modules in `tests/e2e/helpers/` and POMs in `tests/e2e/poms/`.
- Playwright config: `playwright.config.ts` sets `baseURL=http://localhost:5000`, webServer command `npm run dev`, workers=1 and retries in CI. Use `npx playwright install chromium` before running locally.
- CI runs Node 20 and executes `npm ci`, starts the dev server on PORT 5000, waits with `wait-on` and runs Lighthouse and Playwright.

Project conventions and gotchas (concrete, discoverable):
- The app expects `PORT=5000` in many test/CI contexts; Playwright and CI rely on that.
- Drizzle will throw if `DATABASE_URL` is missing — set this in CI or local env when running DB tasks.
- Server source is bundled for production; during development `npm run dev` runs `server/index.ts` directly via `tsx`.
- Playwright + Lighthouse require the browser debug port (9222) to be available — tests enable this via launch args.

Where to look for examples and patterns:
- Playwright usage + test helpers: `tests/e2e/golden-path/README.md` and `tests/e2e/helpers/`.
- Drizzle config & schema: `drizzle.config.ts` and `shared/schema.ts`.
- Build + scripts: `package.json` and `scripts/` (e.g., Lighthouse check scripts referenced by CI).

Actionable examples (copyable):
- Run dev server and open the app:
  npm ci && npm run dev

- Run unit tests:
  npm run test:unit

- Install Playwright browsers (once) and run the golden-path e2e tests locally:
  npx playwright install chromium
  npm run test:e2e

If you change DB schema or migrations:
  export DATABASE_URL=postgres://... && npm run db:push

When editing tests:
- Prefer to update POMs in `tests/e2e/poms/` and helpers in `tests/e2e/helpers/` instead of duplicating selectors.

If something is missing or ambiguous, ask for the following before making changes:
- Which environment (local/CI/replit) to target — CI uses Node 20 and expects browsers to be installed with `--with-deps`.
- Confirm DB access or provide a test database URL for migration/testing tasks.

Please review this file and tell me which areas need more detail (CI secrets, seed data path, repository ownership for infra changes, or examples of common refactors you want automated).
