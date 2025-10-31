# Testing Guidelines for Production Applications

## Overview

This document establishes testing standards for the Energy Auditing Field Application. All features MUST be tested before being marked as "done". These guidelines complement the VERTICAL_COMPLETION_FRAMEWORK.md by defining HOW to test features effectively.

---

## Core Testing Philosophy

**Test like a user, not like a developer.**

Users don't care about your components, hooks, or API endpoints. They care that:
- The button works when they click it
- Their data saves correctly
- The app doesn't crash
- Things load quickly
- Errors are helpful

Your tests should verify these user experiences, not implementation details.

---

## When to Use Different Testing Tools

### Use `run_test` For (Primary Testing Method)

✅ **User-Facing Features** - Anything users interact with:
- Pages with forms (job creation, inspection entry, expenses)
- Calendar/schedule views
- Photo galleries and uploads
- Report generation and PDF downloads
- Navigation between pages
- Filtering and search functionality

✅ **Multi-Step Workflows**:
- Complete job workflow (create → assign → inspect → complete → report)
- Photo upload → tag → annotate → export workflow
- Invoice creation → payment tracking → AR aging
- Calendar event → job conversion → inspector assignment

✅ **Visual/UI Verification**:
- Verifying elements appear on screen
- Checking responsive layouts
- Ensuring proper styling in light/dark mode
- Validating loading states and skeletons
- Confirming error messages display

✅ **Integration Testing**:
- Frontend + Backend working together
- Database operations reflect in UI
- Offline queue → online sync
- WebSocket notifications appear correctly

**Why run_test?**: Catches 80% of real bugs that users will encounter. Integration bugs, UI issues, broken flows - all caught by end-to-end testing.

---

### Use Manual Testing For

✅ **Exploratory Testing**:
- Edge cases you haven't thought of yet
- Real-world usage patterns
- Mobile device testing (actual phones/tablets)
- Accessibility with screen readers

✅ **Visual QA**:
- Color contrast verification
- Responsive design on various screen sizes
- Print layouts for PDF reports
- Animation smoothness

✅ **Performance Testing**:
- Loading time for large datasets
- Scroll performance with 1000+ photos
- Memory usage over extended sessions
- Network throttling scenarios

**Why Manual?**: Some things are hard to automate but critical for UX. Use manual testing to complement automated tests.

---

### Use Unit Tests For (Secondary Method)

✅ **Complex Business Logic**:
- ACH50 calculation formulas
- Tax credit calculations (45L)
- Sampling protocol algorithms
- Date range calculations
- Compliance scoring logic

✅ **Utilities and Helpers**:
- Date formatting functions
- Data transformation utilities
- Validation functions
- OCR parsing logic

✅ **Edge Cases in Logic**:
- Division by zero
- Null/undefined handling
- Boundary conditions
- Error handling paths

**Why Unit Tests?**: Fast feedback on pure logic. Good for regression prevention on calculations.

**When NOT to use**: Don't unit test React components, hooks, or API routes. Use run_test instead.

---

## Writing Effective run_test Plans

### Anatomy of a Good Test Plan

A good test plan has these sections:

1. **[New Context]** - Start fresh browser
2. **[Setup]** - Create test data (API calls, DB inserts)
3. **[Navigation]** - Navigate to feature
4. **[Actions]** - User interactions
5. **[Verifications]** - Assert expected outcomes
6. **[Cleanup]** - Optional: clean up test data

### Test Plan Template

```markdown
## Test: [Feature Name] - [Scenario Being Tested]

### Test Plan:
1. [New Context] Create a new browser context
2. [API] Create test data: [what data, why needed]
3. [Browser] Navigate to [path]
4. [Browser] [user action - click/type/select]
5. [Verify] Assert [expected outcome]
6. [Browser] [next action]
7. [Verify] Assert [expected outcome]
8. [API/DB] Cleanup: delete test data

### Technical Context:
- Database schema: [relevant tables/columns]
- API endpoints: [endpoints used]
- Test data requirements: [what data is needed]
```

---

## Test Plan Examples

### Example 1: Form Submission (Simple)

```markdown
## Test: Job Creation - Happy Path

### Test Plan:
1. [New Context] Create a new browser context
2. [Browser] Navigate to /jobs
3. [Browser] Click "Create Job" button (data-testid="button-create-job")
4. [Browser] Fill in address: "123 Test St"
5. [Browser] Select job type: "full_test"
6. [Browser] Select builder from dropdown
7. [Browser] Click "Save" button
8. [Verify] Assert redirect to /jobs
9. [Verify] Assert toast notification shows "Job created successfully"
10. [Verify] Assert new job appears in "All Jobs" table with address "123 Test St"

### Technical Context:
- API: POST /api/jobs
- Schema: jobs table (address, jobType, builderId)
- Expected behavior: Job saved to DB, user redirected, cache invalidated
```

---

### Example 2: Multi-View Calendar (Complex)

```markdown
## Test: Schedule Page - All Views Work Correctly

### Test Plan:
1. [New Context] Create a new browser context
2. [API] Create test job with scheduledDate = today at 10am
   - Note the job ID as ${testJobId}
   - Note the address as ${testAddress}
3. [Browser] Navigate to /schedule
4. [Verify] Default to month view
5. [Verify] Assert calendar shows current month name in header
6. [Verify] Assert event appears on today's date showing ${testAddress}

7. [Browser] Click "Week" view button (data-testid="button-view-week")
8. [Verify] Assert calendar switches to week view
9. [Verify] Assert week view shows Mon-Sun column headers
10. [Verify] Assert event appears at 10am on today showing ${testAddress}

11. [Browser] Click "Day" view button (data-testid="button-view-day")
12. [Verify] Assert calendar switches to day view
13. [Verify] Assert day view shows hourly time slots
14. [Verify] Assert event appears at 10am showing ${testAddress}

15. [Browser] Click "Previous" button in day view
16. [Verify] Assert calendar navigates to yesterday
17. [Verify] Assert event does NOT appear (was scheduled for today)

18. [Browser] Click "Today" button
19. [Verify] Assert calendar navigates back to today
20. [Verify] Assert event appears again at 10am

21. [API] Delete test job ${testJobId}

### Technical Context:
- Database: jobs table (id, address, scheduledDate, jobType)
- API: GET /api/jobs?view=month&start=...&end=...
- View-aware date ranges: month uses startOfMonth/endOfMonth, week uses startOfWeek/endOfWeek, day uses startOfDay/endOfDay
- Navigation: day view uses addDays(-1/+1), week uses addWeeks, month uses addMonths
```

**Why this is a good test**: Tests ALL views, navigation in each view, and verifies data loads correctly. Catches the exact bugs we found in Schedule.tsx.

---

### Example 3: Offline Functionality

```markdown
## Test: Photo Upload - Offline Queue

### Test Plan:
1. [New Context] Create a new browser context
2. [Browser] Navigate to /photos
3. [Browser] Go offline (disconnect network)
4. [Verify] Assert offline indicator shows in UI

5. [Browser] Click "Upload Photo" button
6. [Browser] Select a photo file from test fixtures
7. [Browser] Add tags: ["exterior", "foundation"]
8. [Browser] Click "Save"
9. [Verify] Assert toast shows "Photo queued for upload (offline)"
10. [Verify] Assert photo appears in gallery with "pending upload" indicator

11. [Browser] Go online (reconnect network)
12. [Verify] Assert toast shows "Back online - uploading pending photos"
13. [Wait] Wait up to 10 seconds for upload to complete
14. [Verify] Assert pending indicator disappears
15. [Verify] Assert photo now shows as uploaded
16. [Verify] Assert photo has tags ["exterior", "foundation"]

17. [API] Verify photo exists in database
18. [API] Delete test photo

### Technical Context:
- Service Worker intercepts network requests
- IndexedDB stores pending uploads in sync queue
- SyncQueue processes queue when back online
- Photos table stores uploaded photo metadata
```

**Why this is a good test**: Verifies critical offline-first functionality. Tests both offline queueing and online sync.

---

### Example 4: Error Handling

```markdown
## Test: Job Form - Validation Errors

### Test Plan:
1. [New Context] Create a new browser context
2. [Browser] Navigate to /jobs
3. [Browser] Click "Create Job" button
4. [Browser] Click "Save" button WITHOUT filling any fields
5. [Verify] Assert form does NOT submit
6. [Verify] Assert validation error shows under "Address" field: "Address is required"
7. [Verify] Assert validation error shows under "Job Type" field: "Job type is required"
8. [Verify] Assert validation error shows under "Builder" field: "Builder is required"

9. [Browser] Fill in address: "123 Test St"
10. [Verify] Assert "Address" field error disappears
11. [Verify] Assert other field errors remain

12. [Browser] Select job type: "full_test"
13. [Browser] Select builder from dropdown
14. [Verify] Assert all validation errors cleared
15. [Browser] Click "Save"
16. [Verify] Assert form submits successfully
17. [Verify] Assert job created

18. [API] Delete test job

### Technical Context:
- Form validation using react-hook-form + Zod
- insertJobSchema defines validation rules
- Errors display inline next to fields
```

**Why this is a good test**: Ensures users can't submit invalid data and get helpful error messages.

---

## Test Coverage Requirements

### Critical Features (Must Have Tests)

ALL of these features MUST have run_test coverage before being marked "done":

✅ **Job Management**:
- Job creation with all job types
- Job editing
- Job deletion with confirmation
- Job status transitions (scheduled → in_progress → completed)
- Inspector assignment workflow

✅ **Inspection Workflow**:
- Checklist item completion
- Photo upload and tagging
- Test result entry (blower door, duct leakage, ventilation)
- Signature capture
- Job completion enforcement (can't complete until all requirements met)

✅ **Schedule/Calendar**:
- All 4 views work (month/week/day/agenda)
- Navigation in each view
- Event creation via drag-drop
- Inspector filtering
- Google Calendar sync

✅ **Photos**:
- Upload (single and bulk)
- Infinite scroll loading
- Filtering (by tags, job, date)
- Bulk actions (tag, delete, export)
- OCR text extraction
- Photo annotation

✅ **Financial**:
- Invoice creation
- Payment recording
- AR aging calculations
- Expense entry with receipt upload
- Mileage tracking with GPS
- Profitability analytics

✅ **Reports**:
- Report template creation
- Report generation from job data
- PDF download
- Email delivery

✅ **Compliance**:
- Each compliance tracker (ENERGY STAR, EGCC, ZERH, Benchmarking)
- Form validation
- Auto-save to localStorage
- Document upload

### Nice to Have Tests

These enhance confidence but aren't blockers:

- Search functionality
- Advanced filtering
- Export to CSV/Excel
- Settings pages
- Audit logs
- Analytics dashboards

---

## Test Writing Best Practices

### 1. Use Unique Test Data

**BAD**:
```typescript
[Browser] Fill in address: "123 Main St"
```

**GOOD**:
```typescript
[API] Create job with unique address using nanoid(): "123-${nanoid(6)} Main St"
[Browser] Navigate to job with address "${uniqueAddress}"
```

**Why**: Tests can run multiple times. Unique data prevents collisions.

---

### 2. Test What Users See, Not What Developers Know

**BAD**:
```typescript
[Verify] Assert jobs array length equals 5
```

**GOOD**:
```typescript
[Verify] Assert page shows "Showing 1 to 5 of 5 items"
```

**Why**: Users see UI text, not array lengths. Test the interface, not the implementation.

---

### 3. Include Cleanup

**BAD**:
```typescript
1. [API] Create test job
2. [Browser] Navigate to /jobs
3. [Verify] Assert job appears
// ❌ Test data left in database
```

**GOOD**:
```typescript
1. [API] Create test job with ID ${testJobId}
2. [Browser] Navigate to /jobs
3. [Verify] Assert job appears
4. [API] Delete job ${testJobId}
// ✅ Clean database
```

**Why**: Prevents test data pollution. Keeps tests independent.

---

### 4. Test Unhappy Paths Too

Don't just test when everything works. Test failures:

- Network errors (500, 404, timeout)
- Validation failures
- Permission denials
- Offline mode
- Race conditions

**Example**:
```typescript
## Test: Job Creation - Network Error

1. [New Context] Create browser context
2. [Mock] Set up API to return 500 error on POST /api/jobs
3. [Browser] Navigate to /jobs
4. [Browser] Fill in job form
5. [Browser] Click "Save"
6. [Verify] Assert error toast shows "Failed to create job"
7. [Verify] Assert form remains populated (data not lost)
8. [Verify] Assert "Retry" button appears
```

---

### 5. Use Descriptive Verification Messages

**BAD**:
```typescript
[Verify] Assert button is disabled
```

**GOOD**:
```typescript
[Verify] Assert "Complete Job" button (data-testid="button-complete-job") is disabled because checklist items are incomplete
```

**Why**: When test fails, you know exactly what broke and why.

---

## Testing Checklist for Features

Before marking ANY feature as "done", verify:

### Functionality Tests
- ☐ Happy path works (everything succeeds)
- ☐ All views/modes work (if applicable)
- ☐ Navigation works (prev/next, breadcrumbs, back button)
- ☐ Form validation catches invalid data
- ☐ Required fields enforced
- ☐ Data persists correctly
- ☐ Data loads correctly
- ☐ Search/filter works (if applicable)
- ☐ Pagination works (if applicable)
- ☐ Sorting works (if applicable)

### Error Handling Tests
- ☐ Network errors show user-friendly message
- ☐ Validation errors show inline
- ☐ 404s redirect appropriately
- ☐ 500s show retry option
- ☐ Offline mode works (if applicable)
- ☐ Concurrent edits handled (if applicable)

### UX Tests
- ☐ Loading states show (no blank screens)
- ☐ Empty states show helpful message
- ☐ Success feedback shows (toast/redirect)
- ☐ Error feedback shows (toast/message)
- ☐ Optimistic updates work smoothly
- ☐ No layout shift during loading

### Responsive Tests
- ☐ Works on mobile (375px width)
- ☐ Works on tablet (768px width)
- ☐ Works on desktop (1024px+ width)
- ☐ Touch targets 48px minimum on mobile
- ☐ Scrolling works properly

### Accessibility Tests
- ☐ Keyboard navigation works
- ☐ Focus indicators visible
- ☐ Color contrast passes WCAG AA
- ☐ ARIA labels on interactive elements
- ☐ Screen reader tested (manual)

---

## Test Execution Process

### 1. Write Test Plan FIRST

Before implementing a feature:
1. Write the test plan
2. Review with team (if applicable)
3. Implement the feature
4. Run the test
5. Fix issues
6. Re-run until passing

**Why**: Writing tests first clarifies requirements and catches design issues early.

---

### 2. Run Tests Frequently

Don't wait until "feature is done" to test:

- After implementing each user flow
- After fixing a bug
- After refactoring
- Before marking task as complete
- Before deploying to production

**Frequency**: 2-3 times per feature minimum.

---

### 3. Keep Tests Updated

When you change a feature:
1. Update the test plan
2. Re-run the test
3. Fix any failures
4. Update test documentation

**Anti-pattern**: Having passing tests for features that changed months ago.

---

## Common Testing Mistakes to Avoid

### ❌ Testing Implementation Details

```typescript
// BAD: Testing internal state
[Verify] Assert useState hook value equals "completed"

// GOOD: Testing user-visible outcome
[Verify] Assert job card shows green "Completed" badge
```

### ❌ Brittle Selectors

```typescript
// BAD: Depends on exact HTML structure
[Browser] Click button at position 3 in form

// GOOD: Uses semantic data-testid
[Browser] Click "Save Job" button (data-testid="button-save-job")
```

### ❌ Assuming Data Exists

```typescript
// BAD: Assumes job #1 exists
[Browser] Navigate to /jobs/1

// GOOD: Creates test data
[API] Create job, note ID as ${jobId}
[Browser] Navigate to /jobs/${jobId}
```

### ❌ Testing Too Much in One Test

```typescript
// BAD: One test covering 10 scenarios
Test: Complete job workflow (200 steps)

// GOOD: Multiple focused tests
Test: Create job (20 steps)
Test: Edit job (15 steps)
Test: Complete job (25 steps)
Test: Delete job (10 steps)
```

**Rule**: Keep tests under 30 steps. Split complex workflows into multiple tests.

---

## Success Metrics

Track these to measure testing effectiveness:

### Leading Indicators
- % of features with test coverage
- Average time from feature to test
- Number of test plans written before coding

### Lagging Indicators
- Bugs found in testing vs. production
- Time to fix bugs (should decrease)
- User-reported bugs (should decrease)

**Target**: 90%+ of user-reported bugs should be caught by tests first.

---

## Test Plan Template (Copy This)

```markdown
## Test: [Feature Name] - [Specific Scenario]

### Objective:
[What user behavior/outcome are we verifying?]

### Prerequisites:
- [Any setup needed before test]
- [Test data requirements]

### Test Plan:
1. [New Context] Create a new browser context
2. [API/DB] Create test data: [description]
   - Note [identifier] as ${variableName}
3. [Browser] Navigate to [path]
4. [Browser] [user action]
5. [Verify] Assert [expected outcome]
... continue with steps ...
N. [API/DB] Cleanup: delete test data

### Technical Context:
- Database tables: [relevant tables]
- API endpoints: [endpoints used]
- Key components: [components involved]
- Expected behavior: [what should happen]

### Edge Cases to Test:
- [Edge case 1]
- [Edge case 2]

### Known Limitations:
- [Any limitations of this test]
```

---

*Last Updated: October 31, 2025*
*Version: 1.0*
*Status: Active - All features must have test coverage*
