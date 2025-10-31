# Vertical Completion Framework

## The Problem We're Solving

**Symptoms**: Features consistently reach 70-80% completion then stop. Month view works but week/day don't. Console.logs left in production. Memory leaks from missing cleanup. Loading states incomplete. Error handling missing.

**Impact**: Application appears functional in demos but breaks in real-world usage. Technical debt compounds. User trust erodes.

**Root Cause**: No shared definition of "done" that enforces production-ready quality before shipping.

---

## Core Principle

**A feature is NOT done until it works completely in ALL supported scenarios, has proper error handling, is tested end-to-end, and contains zero debug artifacts.**

Half-built features create more work than no features. Ship complete verticals or ship nothing.

---

## The Six-Phase Checklist

Every feature MUST complete all six phases before being marked "done":

### Phase 1: PLAN (Definition)

**Goal**: Crystal-clear understanding of what "done" means for THIS specific feature.

✅ **Requirements Documented**
- What user problem does this solve?
- What are ALL the views/states/scenarios this must support?
- What are the acceptance criteria?
- What are the edge cases?

✅ **Data Model Designed**
- Schema in `shared/schema.ts` complete
- Insert/select types defined
- Relationships mapped
- Indexes identified for performance

✅ **API Contract Defined**
- Request/response shapes documented
- Error codes identified
- Query parameters specified
- Success/failure scenarios listed

✅ **Dependencies Identified**
- What existing features does this depend on?
- What shared utilities are needed?
- What external services are involved?

**Anti-Pattern**: Starting to code before understanding all requirements. This ALWAYS leads to incomplete features.

---

### Phase 2: BUILD (Implementation)

**Goal**: Implement the feature following established patterns.

✅ **Backend Complete**
- Storage methods in `server/storage.ts`
- API routes in `server/routes.ts`
- Request validation with Zod schemas
- Error handling with try/catch
- Database queries optimized

✅ **Frontend Complete**
- Component in appropriate `/pages` or `/components` directory
- TanStack Query hooks for data fetching
- Form validation with react-hook-form + Zod
- Proper TypeScript types (no `any`)
- All interactive elements have `data-testid` attributes

✅ **State Management**
- Loading states (`isLoading`, `isPending`)
- Error states (`isError`, `error`)
- Empty states (no data scenarios)
- Success states
- Optimistic updates where appropriate

✅ **Code Quality**
- **ZERO console.log/warn/error statements**
- No hardcoded values (use constants or env vars)
- No commented-out code
- No `// TODO` or `// FIXME` comments
- Consistent code style

**Anti-Pattern**: Leaving console.logs "for debugging later". They never get removed and pollute production.

---

### Phase 3: OPTIMIZE (Performance)

**Goal**: Ensure the feature performs well under real-world conditions.

✅ **React Optimization**
- Expensive calculations wrapped in `useMemo`
- Event handlers wrapped in `useCallback`
- Components split appropriately (not too granular)
- No unnecessary re-renders

✅ **Query Optimization**
- Query keys include all relevant parameters
- `staleTime` configured appropriately
- `refetchOnMount`/`refetchOnWindowFocus` set correctly
- Pagination or infinite scroll for large datasets
- Proper cache invalidation

✅ **Memory Management**
- **ALL useEffect hooks have cleanup functions**
- Timeouts cleared on unmount
- Intervals cleared on unmount
- Event listeners removed on unmount
- IntersectionObserver disconnected on unmount

✅ **Bundle Size**
- Heavy dependencies lazy-loaded if possible
- Images optimized
- No duplicate dependencies

**Anti-Pattern**: Missing cleanup functions in useEffect. This ALWAYS causes memory leaks.

**Example - WRONG**:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  // ❌ Missing cleanup - memory leak!
}, []);
```

**Example - CORRECT**:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  return () => clearInterval(interval); // ✅ Cleanup
}, []);
```

---

### Phase 4: TEST (Verification)

**Goal**: Prove the feature works in ALL scenarios, not just the happy path.

✅ **End-to-End Testing**
- **Use `run_test` tool for ALL user-facing features**
- Test ALL views (if applicable: month/week/day, list/grid, etc.)
- Test ALL user flows (create → edit → delete → restore)
- Test error scenarios (network failures, invalid data)
- Test edge cases (empty states, large datasets, slow connections)

✅ **Manual Verification**
- Feature works on mobile and desktop
- Feature works in light and dark mode
- Feature works offline (if applicable)
- Feature handles slow networks gracefully

✅ **Data Validation**
- Test with realistic data volumes
- Test with edge case data (empty strings, very long strings, special characters)
- Test with malformed data

**Anti-Pattern**: Only testing the happy path. Real users find edge cases instantly.

**Test Plan Example** (Schedule page):
```
1. [New Context] Create browser context
2. [Browser] Navigate to /schedule
3. [Browser] Click "Week" view button
4. [Verify] Assert events display correctly in week view
5. [Browser] Click "Day" view button
6. [Verify] Assert events display correctly in day view
7. [Browser] Click "Previous" navigation
8. [Verify] Assert calendar navigates to previous day
9. [Browser] Create new event via drag-drop
10. [Verify] Assert event appears on calendar
11. [Browser] Delete event
12. [Verify] Assert event removed from calendar
```

---

### Phase 5: HARDEN (Production Readiness)

**Goal**: Add polish and resilience for real-world usage.

✅ **Error Boundaries**
- Feature wrapped in error boundary
- Retry mechanisms for failed queries
- Graceful degradation when services unavailable

✅ **Loading States**
- Skeleton loaders for initial load
- Progressive loading indicators
- Optimistic updates with rollback

✅ **User Feedback**
- Success toast notifications
- Error messages (clear, actionable)
- Loading indicators
- Confirmation dialogs for destructive actions

✅ **Accessibility**
- Keyboard navigation works
- Screen reader support
- ARIA labels on interactive elements
- Color contrast meets WCAG AA standards
- Focus indicators visible

✅ **Security**
- Input sanitization
- SQL injection prevention (using parameterized queries)
- XSS prevention
- CSRF protection (already handled by csrf-sync)
- Rate limiting on sensitive endpoints

**Anti-Pattern**: Assuming users have perfect network conditions and never make mistakes.

---

### Phase 6: DOCUMENT (Knowledge Transfer)

**Goal**: Future developers (including you in 3 months) can understand and maintain this.

✅ **Code Documentation**
- Complex logic has inline comments explaining WHY
- Function/component JSDoc for non-obvious behavior
- Type definitions are descriptive

✅ **replit.md Updated**
- Feature added to architecture section
- Any new patterns documented
- Known limitations noted

✅ **Testing Documentation**
- Test coverage documented in test plan
- Known edge cases listed
- Manual testing steps if needed

**Anti-Pattern**: Writing code only you can understand, then moving to the next feature.

---

## Feature-Specific Checklists

### Calendar/Schedule View Features

When building calendar views, you MUST support ALL views from day 1:

✅ Month view works
✅ Week view works  
✅ Day view works
✅ Agenda/list view works (mobile)
✅ Navigation works in ALL views (prev/next/today)
✅ Date ranges calculated correctly for EACH view
✅ Query keys include view state for proper caching
✅ Events render correctly in ALL views
✅ Drag-drop works in ALL views (if applicable)

**Why**: Users switch between views constantly. A calendar that only works in month view is broken.

---

### CRUD (Create/Read/Update/Delete) Features

✅ Create form validates all fields
✅ Create shows loading state
✅ Create shows success/error feedback
✅ List view shows loading skeleton
✅ List view handles empty state
✅ List view supports search/filter
✅ List view supports pagination or infinite scroll
✅ Edit pre-fills form with existing data
✅ Edit validates changes
✅ Delete shows confirmation dialog
✅ Delete handles cascade deletes
✅ All operations work offline (queue if applicable)

---

### Form Features

✅ All fields have validation rules
✅ Validation errors show next to fields
✅ Form shows loading state during submission
✅ Form prevents double-submission
✅ Form shows success message
✅ Form shows error message with retry option
✅ Form clears/resets after successful submission
✅ Form saves draft to localStorage (if long form)
✅ All inputs have proper `data-testid` attributes

---

### Data Table/List Features

✅ Loading skeleton while fetching
✅ Empty state with helpful message
✅ Error state with retry button
✅ Pagination or infinite scroll
✅ Search/filter functionality
✅ Sort functionality (if applicable)
✅ Bulk selection (if applicable)
✅ Row actions (edit/delete)
✅ Export functionality (if applicable)
✅ Responsive design (mobile view)

---

## Quality Gates (MUST PASS BEFORE SHIPPING)

### Gate 1: Code Quality
```bash
# ZERO console.logs allowed
grep -r "console\." client/src/pages/YourFeature.tsx
# Output: (empty) ✅

# ZERO TypeScript errors
npx tsc --noEmit
# Output: no errors ✅

# ZERO ESLint errors
npx eslint client/src/pages/YourFeature.tsx
# Output: no errors ✅
```

### Gate 2: Functionality
```bash
# ALL views/scenarios work
npm run test:e2e -- YourFeature.spec.ts
# Output: all tests pass ✅

# Manual testing checklist completed
# - Tested on Chrome ✅
# - Tested on Safari ✅
# - Tested on mobile ✅
# - Tested offline ✅
```

### Gate 3: Performance
```bash
# No memory leaks
# - All useEffect have cleanup ✅
# - No event listeners left attached ✅
# - No timers left running ✅

# Queries optimized
# - Query keys include all params ✅
# - Cache invalidation works ✅
# - No unnecessary refetches ✅
```

---

## Prevention Strategies

### 1. Use run_test Aggressively

**When to use run_test**:
- After implementing ANY user-facing feature
- After making changes to existing features  
- Before marking any task as "complete"
- When fixing bugs (prove the fix works)

**run_test catches**:
- UI elements not rendering
- Navigation not working
- Forms not submitting
- Data not loading
- Error states not showing

### 2. Architect Review Before Completion

**ALWAYS call architect tool**:
- Before marking task as "completed"
- Include full git diff
- Ask for production-readiness review
- Fix ALL issues raised before proceeding

### 3. Checklist-Driven Development

Before starting ANY feature:
1. Copy relevant checklist from this document
2. Check off items as you complete them
3. Don't mark task done until ALL items checked

### 4. Definition of Done

A feature is done when:
- ✅ All six phases completed
- ✅ All quality gates passed
- ✅ run_test passes for all scenarios
- ✅ Architect review approved
- ✅ ZERO console.logs remaining
- ✅ ZERO memory leaks
- ✅ Documentation updated

---

## Common Anti-Patterns to AVOID

### ❌ "I'll add loading states later"
**Why it's bad**: You never do. Users see broken UI.
**Do instead**: Add loading states FIRST, before the feature even works.

### ❌ "Console.log for debugging, I'll remove it later"  
**Why it's bad**: You forget. Production logs fill with garbage.
**Do instead**: Use proper error handling and toast notifications from day 1.

### ❌ "This works in month view, I'll add week/day later"
**Why it's bad**: Technical debt compounds. Week/day never get added.
**Do instead**: Build ALL views before moving to next feature.

### ❌ "I'll test this manually, no need for automated tests"
**Why it's bad**: Manual tests get skipped. Regressions go undetected.
**Do instead**: Write run_test plans immediately after implementation.

### ❌ "This useEffect doesn't need cleanup, it's simple"
**Why it's bad**: Memory leaks in production. Browser slows to a crawl.
**Do instead**: ALWAYS add cleanup functions. No exceptions.

### ❌ "I'll handle the error case later"
**Why it's bad**: Users hit errors on day 1. App appears broken.
**Do instead**: Handle errors BEFORE happy path. Errors are more common than success.

### ❌ "The type is too complex, I'll just use `any`"
**Why it's bad**: Loses type safety. Bugs slip through. Refactoring becomes impossible.
**Do instead**: Take 5 minutes to write proper types. Saves hours later.

---

## Success Metrics

Track these to measure framework adoption:

### Leading Indicators (Process)
- % of features with completed checklist before coding
- % of PRs with run_test results
- % of PRs with architect review
- Average console.log count per PR (target: 0)

### Lagging Indicators (Outcomes)
- % of features shipped on first try (no fixes needed)
- User-reported bugs per feature (target: < 1)
- Time to fix bugs (should decrease)
- Technical debt tickets created (should decrease)

---

## Template: Feature Completion Checklist

Copy this for every new feature:

```markdown
## Feature: [Name]

### Phase 1: PLAN ☐
- ☐ Requirements documented
- ☐ Data model designed
- ☐ API contract defined
- ☐ Dependencies identified

### Phase 2: BUILD ☐
- ☐ Backend complete
- ☐ Frontend complete
- ☐ State management (loading/error/success)
- ☐ ZERO console.logs

### Phase 3: OPTIMIZE ☐
- ☐ useMemo/useCallback added
- ☐ Query optimization
- ☐ Memory management (all useEffect cleaned up)

### Phase 4: TEST ☐
- ☐ run_test plan created and passing
- ☐ All views tested
- ☐ Edge cases tested
- ☐ Manual verification complete

### Phase 5: HARDEN ☐
- ☐ Error boundaries added
- ☐ Loading states polished
- ☐ User feedback complete
- ☐ Accessibility verified

### Phase 6: DOCUMENT ☐
- ☐ Code comments added
- ☐ replit.md updated
- ☐ Test documentation complete

### Quality Gates ☐
- ☐ Gate 1: Code quality (no console.logs, no TS errors)
- ☐ Gate 2: Functionality (all tests pass)
- ☐ Gate 3: Performance (no leaks, optimized)
- ☐ Architect review approved

**Status**: [In Progress / Pending Review / Complete]
```

---

## Enforcement

This framework is NOT optional. It is the standard for ALL features in this codebase.

**For new features**: Follow this framework from day 1.

**For existing features**: Systematically upgrade them using this framework.

**For bug fixes**: Use relevant sections of this framework to ensure the fix is complete.

**Remember**: Shipping incomplete features creates more work than shipping nothing. Take the time to do it right the first time.

---

*Last Updated: October 31, 2025*
*Version: 1.0*
*Status: Active - All features must follow this framework*
