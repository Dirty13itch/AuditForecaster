# Code Review Checklist - Vertical Completion Framework

This checklist integrates the vertical completion framework requirements to ensure all code changes meet production standards before merging.

## Phase 1: Planning & Architecture ✅

- [ ] **Requirements clearly defined** - Feature requirements documented with success criteria
- [ ] **Technical approach documented** - Architecture decisions and patterns explained
- [ ] **Edge cases identified** - Known edge cases and handling strategies documented
- [ ] **Dependencies identified** - All required packages, APIs, and integrations listed

## Phase 2: Build Quality ✅

### Error Handling
- [ ] **ErrorBoundary wrapper** - Component wrapped in `<ErrorBoundary>` with fallback UI
- [ ] **Fallback UI implemented** - ErrorBoundary has non-null fallback prop with:
  - [ ] Error icon (e.g., `AlertCircle` from lucide-react)
  - [ ] Clear error message
  - [ ] Retry button or reload action
- [ ] **Per-query error states** - Each query has error fallback UI beyond toasts
- [ ] **Error retry mechanisms** - All queries have `retry: 2` or appropriate retry logic

### Loading States
- [ ] **Skeleton loaders present** - All data-loading views have skeleton loaders
- [ ] **Skeleton realism** - Skeletons match actual content structure (cards, tables, forms)
- [ ] **Loading indicators** - Mutation pending states show loading spinners

### UI Components
- [ ] **No emoji in production code** - All icons use lucide-react (or similar icon library)
- [ ] **Confirmation dialogs** - Destructive actions have confirmation dialogs
- [ ] **Empty states** - Helpful empty states with icons and call-to-action
- [ ] **data-testid attributes** - ALL interactive elements have unique, descriptive data-testid

## Phase 3: Optimization ✅

### Performance
- [ ] **Module-level constants** - Icon mappings, static configs use module-level constants (not functions)
- [ ] **useMemo for expensive calculations** - Filtered lists, derived data use useMemo
- [ ] **useCallback for event handlers** - All event handlers wrapped in useCallback
- [ ] **Memoization correctness** - Memoized values cache objects, not recreate them
  - ❌ WRONG: `useMemo(() => (val) => new Intl.NumberFormat(...), [])`
  - ✅ RIGHT: `useMemo(() => new Intl.NumberFormat(...), [])`

### Memory Leaks
- [ ] **useEffect cleanup functions** - All useEffect with timers/listeners/observers have cleanup
- [ ] **No dangling subscriptions** - WebSocket, EventSource, intervals cleaned up
- [ ] **OCR worker cleanup** - Tesseract workers terminated properly

### Mutation Feedback
- [ ] **Form disabled during mutations** - ALL form inputs disabled when isPending
- [ ] **Button pending states** - Buttons show spinners + "Saving..." text
- [ ] **Prevent double-submit** - Forms cannot be submitted twice concurrently

## Phase 4: Testing ✅ (MANDATORY)

### E2E Test Coverage
- [ ] **Test file created** - Comprehensive e2e test in `tests/e2e/[feature]-workflow.spec.ts`
- [ ] **Skeleton loader tests** - Verify skeletons appear during loading
- [ ] **Error state tests** - Verify error UI and retry mechanisms work
- [ ] **CRUD operation tests** - Create, Read, Update, Delete flows tested
- [ ] **Validation tests** - Form validation errors tested
- [ ] **Dialog tests** - Confirmation dialogs, error persistence tested
- [ ] **Empty state tests** - Verify empty states display correctly

### Test Quality
- [ ] **Test selectors match UI** - ALL test data-testid values exist in actual UI code
- [ ] **Comprehensive scenarios** - At least 10-15 test cases covering major workflows
- [ ] **run_test executed** - run_test tool executed with test passing (or env-blocked with note)

## Phase 5: Hardening ✅

### Data Validation
- [ ] **Input validation** - All form inputs validated (required fields, data types, ranges)
- [ ] **Business rule enforcement** - Domain-specific rules enforced (e.g., amount > 0, dates valid)
- [ ] **Backend validation** - Server-side validation mirrors client-side
- [ ] **Prevent invalid states** - Auto-calculations prevent negative/invalid values

### Dialog Error Handling
- [ ] **Dialog stays open on error** - Dialogs use `asChild` + `e.preventDefault()` pattern
- [ ] **Inline error display** - Error messages shown within dialog
- [ ] **Inline retry button** - Users can retry without reopening dialog
- [ ] **Error state cleared on retry** - Stale errors cleared before retry attempts

### Edge Cases
- [ ] **Empty states handled** - Graceful handling when no data exists
- [ ] **Concurrent operations** - Race conditions prevented (optimistic updates, locking)
- [ ] **Large datasets** - Performance acceptable with 100s/1000s of records
- [ ] **Network failures** - Graceful degradation on timeout/offline

## Phase 6: Documentation ✅

### Code Comments
- [ ] **Complex logic explained** - Non-obvious code has inline comments
- [ ] **Business rules documented** - Domain-specific calculations documented
- [ ] **Memoization rationale** - Comments explain why useMemo/useCallback used
- [ ] **No TODO comments** - All TODOs resolved or tracked in issues

### Project Documentation
- [ ] **replit.md updated** - Major features documented in replit.md
- [ ] **API documentation** - New endpoints documented (if applicable)
- [ ] **Breaking changes noted** - Migration guides for breaking changes

## Code Quality Standards ✅

### TypeScript
- [ ] **No LSP errors** - `npx tsc --noEmit` passes with zero errors
- [ ] **Proper typing** - No `any` types (except unavoidable external APIs)
- [ ] **Shared types** - Use types from `@shared/schema.ts`

### ESLint
- [ ] **No console.* statements** - ZERO console.log/info/debug (console.error/warn OK for error boundaries)
- [ ] **ESLint passes** - `npx eslint .` passes with zero errors
- [ ] **Import order** - Imports organized per ESLint rules

### Design Patterns
- [ ] **Error boundary pattern** - Follows Schedule/Mileage/Equipment patterns
- [ ] **Mutation pattern** - useMutation with onSuccess/onError, cache invalidation
- [ ] **Query pattern** - useQuery with retry, error states, loading states
- [ ] **Dialog pattern** - asChild + e.preventDefault() for error persistence

## Architect Review ✅ (MANDATORY)

- [ ] **Architect review requested** - Called `architect` tool with responsibility="evaluate_task"
- [ ] **Full git diff included** - Called architect with `include_git_diff: true`
- [ ] **Architect verdict: PASS** - Architect approved changes as production-ready
- [ ] **Critical issues resolved** - All FAIL verdicts addressed before merge

## Lessons from Reference Implementations

### Schedule.tsx (Pilot)
✅ Proved framework value - testing found syntax errors preventing page load
✅ View-aware date ranges and navigation
✅ Comprehensive skeleton loaders

### Mileage.tsx (4 Iterations)
⚠️ Iteration 1: Test selectors didn't match UI → **Always verify data-testid alignment**
⚠️ Iteration 2: Incomplete memoization (recreating Intl.NumberFormat) → **Cache the object itself**
⚠️ Iteration 3: ErrorBoundary had no fallback → **Always provide fallback UI**
⚠️ Iteration 4: Dialog auto-closed on error → **Use asChild + e.preventDefault()**

### Equipment.tsx (1 Iteration - PASS)
✅ Applied all Mileage lessons → **Clean PASS on first try**
✅ Module-level icon constants → **Performance + correctness**
✅ Comprehensive testing from start → **No rework needed**

## Final Checklist Before Merge

- [ ] All 6 phases completed (PLAN → BUILD → OPTIMIZE → TEST → HARDEN → DOCUMENT)
- [ ] Architect review PASS verdict received
- [ ] No console.* statements added
- [ ] No LSP errors
- [ ] ESLint passes
- [ ] run_test executed (passing or env-blocked with documentation)
- [ ] All critical issues from architect feedback resolved
- [ ] Code follows patterns from reference implementations

---

## Quick Reference: Common Patterns

### ErrorBoundary Wrapper
```typescript
export default function MyPage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load</h2>
          <p className="text-muted-foreground">Something went wrong.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      }
    >
      <MyPageContent />
    </ErrorBoundary>
  );
}
```

### Dialog Error Persistence
```typescript
<AlertDialogAction asChild>
  <Button
    onClick={(e) => {
      e.preventDefault(); // Prevent default close
      handleAction();     // Execute mutation
    }}
    disabled={mutation.isPending}
  >
    {error ? "Retry" : "Confirm"}
  </Button>
</AlertDialogAction>
```

### Module-Level Constants
```typescript
// At module level (outside component)
const ICON_MAP: Record<string, LucideIcon> = {
  fuel: Fuel,
  equipment: Wrench,
  // ...
};

// Inside component
const getIcon = useCallback((type: string) => {
  const Icon = ICON_MAP[type] || Settings;
  return <Icon className="h-4 w-4" />;
}, []);
```

### Proper Memoization
```typescript
// ❌ WRONG - recreates formatter every call
const format = useMemo(() => 
  (val: number) => new Intl.NumberFormat(...).format(val),
[]);

// ✅ RIGHT - creates formatter once, reuses it
const formatter = useMemo(() => new Intl.NumberFormat(...), []);
const format = useCallback((val: number) => formatter.format(val), [formatter]);
```

---

**Remember:** The vertical completion framework prevents "70% completion" syndrome. A feature isn't done until ALL 6 phases pass architect review!
