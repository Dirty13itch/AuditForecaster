# AuditForecaster Development Standards

## Core Philosophy

This project follows industry best practices from top engineering teams (Google, Airbnb, Microsoft, Meta). Every code change must maintain the highest standards of quality, safety, and maintainability.

## Code Quality Principles

### 1. Automation First
- **Always use automated tools before manual edits**
- ESLint with `--fix` flag for safe, automated cleanup
- Prettier for code formatting
- TypeScript compiler for type checking
- **Never manually edit what tools can fix automatically**

### 2. Atomic Changes
- One logical change per commit
- Fix one category of issues at a time
- Never mix refactoring with feature work
- Each change must be independently verifiable

### 3. Continuous Verification
- **Build must pass after every change**
- Run `npm run build` after each modification
- Never commit broken code
- Use git as safety net - commit working states frequently

### 4. Type Safety
- No explicit `any` types without justification
- Use `unknown` instead of `any` for truly dynamic types
- Add proper type guards when narrowing from `unknown`
- Prefer inference over explicit types when clear

## Workflow Standards

### Making Code Changes

```bash
# 1. Auto-fix what can be automated
npx eslint --fix src/**/*.{ts,tsx}

# 2. Verify build passes
npm run build

# 3. Make manual fixes if needed (one category at a time)
# 4. Verify build again
npm run build

# 5. Commit working state
git add .
git commit -m "fix: descriptive message"
```

### Code Review Checklist

Before any code change:
- [ ] Can this be automated? (Use tools first)
- [ ] Is this the smallest possible change?
- [ ] Does the build pass?
- [ ] Are types properly defined?
- [ ] Is error handling robust?

## Technology-Specific Standards

### Next.js
- Client components cannot export metadata
- Use `next/image` for images (unless blob URLs)
- Async params must be awaited in Next.js 15+
- Server actions should have Zod validation

### Prisma
- Always include necessary relations in queries
- Check for null before accessing optional relations
- Use transactions for multi-step operations
- Verify schema matches query structure

### TypeScript
- Enable strict mode
- No implicit any
- Proper null checks before property access
- Use type inference when obvious

## Error Handling Standards

### Server Actions
```typescript
// ✅ Good
export async function action(prevState: unknown, formData: FormData) {
  try {
    const validated = schema.parse(data)
    // ... logic
    return { success: true }
  } catch (e: unknown) {
    console.error(e)
    return { 
      error: e instanceof Error ? e.message : 'Unknown error' 
    }
  }
}

// ❌ Bad
export async function action(prevState: any, formData: FormData) {
  const data = formData.get('field') as string // No validation
  // ... logic
}
```

### Null Safety
```typescript
// ✅ Good
const data = await fetchData()
if (!data) {
  return notFound()
}
const value = data.property // Safe

// ❌ Bad
const data = await fetchData()
const value = data.property // Might be null
if (!data) return notFound()
```

## Testing Standards

- Unit tests for business logic
- Integration tests for server actions
- E2E tests for critical user flows
- All tests must pass before merge

## Performance Standards

- Use proper Prisma includes to avoid N+1 queries
- Implement proper indexes on frequently queried fields
- Lazy load heavy components
- Optimize images with next/image

## Security Standards

- All user input must be validated (Zod schemas)
- No SQL injection vulnerabilities (use Prisma)
- Proper authentication checks on all protected routes
- Environment variables for secrets

## Documentation Standards

- JSDoc for public functions
- README for setup instructions
- Inline comments for complex logic only
- Keep comments up-to-date with code

## Git Standards

### Commit Messages
```
feat: add user authentication
fix: resolve null pointer in job details
refactor: extract pricing logic to helper
docs: update API documentation
test: add tests for job creation
```

### Branch Strategy
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes

## When Things Go Wrong

### If Build Breaks
1. **Stop immediately**
2. Run `git checkout .` to restore
3. Identify the specific issue
4. Make smaller, more targeted fix
5. Verify build passes

### If Unsure About Change
1. Make change in separate branch
2. Test thoroughly
3. Review with team if needed
4. Merge only when confident

## Continuous Improvement

- Review these standards quarterly
- Update based on lessons learned
- Share knowledge with team
- Stay current with Next.js/React best practices

## References

- [Next.js Best Practices](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

---

**Remember: Quality over speed. A working, maintainable codebase is always better than quick, broken code.**
