---
description: Run automated code quality checks and fixes
---

# Code Quality Check Workflow

This workflow runs automated code quality checks and fixes following our development standards.

## Steps

// turbo-all
1. Run ESLint auto-fix to clean up unused imports and variables
```bash
npx eslint --fix src/**/*.{ts,tsx}
```

2. Verify the build passes after auto-fixes
```bash
npm run build
```

3. Run type checking
```bash
npx tsc --noEmit
```

4. Check for remaining lint issues
```bash
npm run lint
```

## Expected Results

- Auto-fixable issues (unused imports, variables) should be resolved
- Build should pass with zero errors
- Any remaining issues require manual review

## When to Run

- Before committing code
- After pulling latest changes
- When cleaning up technical debt
- As part of code review process

## Notes

- ESLint auto-fix is safe for warnings but not errors
- Always verify build passes after auto-fixes
- Commit working state before and after running this workflow
