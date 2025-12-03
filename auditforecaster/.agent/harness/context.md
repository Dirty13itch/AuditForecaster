# AuditForecaster Context

## Architecture
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js (v5 beta)
- **Testing**: Vitest (Unit), Playwright (E2E)

## Core Entities (Prisma)
- **User**: Inspectors, Builders, Admins.
- **Job**: The central unit of work. Linked to Builder, Subdivision, Inspector.
- **Inspection**: Linked to Job. Contains Photos, ActionItems.
- **Builder/Subdivision**: Client hierarchy.
- **Finance**: Invoice, Expense, MileageLog, Payout.

## Development Standards
1.  **Automation First**: Use `eslint --fix` and `prettier`.
2.  **Atomic Changes**: One logical change per commit.
3.  **Verify**: Build (`npm run build`) must pass after every change.
4.  **Type Safety**: No `any`. Use Zod for validation.

## Key Commands
- `npm run dev`: Start dev server.
- `npm run build`: Build for production.
- `npm test`: Run unit tests.
- `npx prisma db push`: Sync schema to DB.
