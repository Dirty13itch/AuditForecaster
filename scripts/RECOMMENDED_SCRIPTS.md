# Recommended Package.json Scripts

To complete the vertical slice compliance, add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "smoke": "bash scripts/smoke-test.sh",
    "lint": "tsc --noEmit"
  }
}
```

## Usage

- `npm run dev` - Start development server
- `npm run build` - Build production artifact
- `npm run start` - Run production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Apply schema changes to database
- `npm test` - Run all tests
- `npm run smoke` - Run smoke test suite
- `npm run lint` - Lint TypeScript files
