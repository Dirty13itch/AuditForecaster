# AuditForecaster Portfolio Root

This normalized portfolio root is the canonical working location for `Dirty13itch/AuditForecaster`.

The actual application source lives in:

- `C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster`

Use that nested app root for all install, run, build, and test commands.

## Working Contract

- Canonical repo root: `C:\Users\Shaun\dev\portfolio\AuditForecaster`
- Canonical app root: `C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster`
- Old DESK and VAULT clones are preserved reference copies only
- This normalized root is the only path that should continue as the working clone

## Local Workflow

```powershell
cd C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```powershell
cd C:\Users\Shaun\dev\portfolio\AuditForecaster\auditforecaster
npm run smoke
```

## Product Focus

AuditForecaster is a Next.js operations app for energy-audit scheduling, field inspections, builder coordination, reporting, and offline-capable field workflows.
