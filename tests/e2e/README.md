# Playwright E2E Test Suite

## Overview

This directory contains end-to-end (E2E) tests for the Energy Auditing Field Application using Playwright. The tests verify critical user workflows in a real browser environment.

## Setup Completed

### ✅ Installation & Configuration
- **Playwright installed**: `@playwright/test` added to dependencies
- **Configuration file**: `playwright.config.ts` created in project root
- **Test directory**: `tests/e2e/` structure created
- **Page objects**: Created in `tests/e2e/pages/` for maintainability

### ✅ Files Created

1. **playwright.config.ts** - Main configuration
   - Base URL: `http://localhost:5000`
   - Test directory: `./tests/e2e`
   - Screenshots on failure
   - Traces on first retry
   - Auto-starts dev server

2. **tests/e2e/pages/LoginPage.ts** - Login page object
   - Supports dev-mode authentication (`/api/dev-login/test-admin`)
   - Methods: `loginAsAdmin()`, `loginAsInspector()`, `logout()`

3. **tests/e2e/pages/JobsPage.ts** - Jobs page object
   - Methods: `createJob()`, `findJobByName()`, `verifyJobExists()`
   - Matches actual application implementation with job dialog

4. **tests/e2e/job-workflow.spec.ts** - First critical flow tests
   - Job creation workflow
   - Multiple job types testing
   - Dialog validation
   - Authentication flow tests

## Running Tests

### Option 1: Direct Playwright Commands (Recommended)

```bash
# Run all E2E tests (headless)
npx playwright test

# Run tests with UI mode (interactive)
npx playwright test --ui

# Run tests in debug mode
npx playwright test --debug

# Run specific test file
npx playwright test tests/e2e/job-workflow.spec.ts

# Show test report
npx playwright show-report
```

### Option 2: Add NPM Scripts (Manual Step Required)

Since `package.json` cannot be auto-edited, you can manually add these scripts to the `"scripts"` section:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

Then run with:
```bash
npm run test:e2e
npm run test:e2e:ui
```

## Browser Installation

To install Playwright browsers (if not already done):

```bash
# Install Chromium browser
npx playwright install chromium

# Install all browsers (Chromium, Firefox, WebKit)
npx playwright install

# Install with system dependencies
npx playwright install --with-deps
```

## Test Structure

### Page Object Pattern

The tests follow the Page Object Model (POM) pattern for maintainability:

```typescript
// Page objects encapsulate page interactions
class JobsPage {
  async createJob(data) { /* implementation */ }
  async verifyJobExists(name) { /* implementation */ }
}

// Tests use page objects, not direct selectors
test('create job', async () => {
  await jobsPage.createJob({ name: 'Test', ... });
  await jobsPage.verifyJobExists('Test');
});
```

### Authentication

The application uses **dev-mode authentication** for testing:

- **Admin**: `/api/dev-login/test-admin`
- **Inspector 1**: `/api/dev-login/test-inspector1`
- **Inspector 2**: `/api/dev-login/test-inspector2`

```typescript
await loginPage.loginAsAdmin(); // Quick admin login
await loginPage.loginAsInspector(1); // Quick inspector login
```

### Test Organization

```
tests/e2e/
├── pages/
│   ├── LoginPage.ts       # Authentication page object
│   └── JobsPage.ts        # Jobs management page object
├── job-workflow.spec.ts   # Jobs workflow tests
└── README.md             # This file
```

## Available Tests

### Job Workflow Tests

1. **Create Job Successfully**
   - Login as admin
   - Navigate to Jobs page
   - Create new job with required fields
   - Verify job appears in list

2. **Create Multiple Jobs with Different Types**
   - Tests Pre-Drywall, Final Testing, Blower Door types
   - Verifies all jobs are created and visible

3. **Job Creation Dialog Validation**
   - Verifies dialog displays with all required fields
   - Tests dialog open/close behavior

4. **Required Field Validation**
   - Tests form validation when submitting without required fields

### Navigation Tests

1. **Jobs Page Navigation**
   - Verify jobs page loads correctly
   - Verify create button is visible

2. **Page Reload State**
   - Create job and reload page
   - Verify job persists after reload

### Authentication Tests

1. **Unauthenticated Access**
   - Verify redirect when accessing protected routes

2. **Admin Access**
   - Verify admin can access jobs page

3. **Inspector Access**
   - Verify inspector can access jobs page

## Data-testid Attributes

The application already has comprehensive `data-testid` attributes in place:

### Jobs Page
- ✅ `button-create-job` - Create job button
- ✅ `button-create-first-job` - Create first job button (empty state)
- ✅ `select-page-size` - Page size selector
- ✅ `button-prev-page` - Previous page button
- ✅ `button-next-page` - Next page button

### Job Dialog (JobDialog.tsx)
- ✅ `modal-new-job` - Job dialog container
- ✅ `text-dialog-title` - Dialog title
- ✅ `form-create-job` - Job creation form
- ✅ `input-job-name` - Job name input
- ✅ `input-contractor` - Contractor input
- ✅ `input-address` - Address input
- ✅ `select-builder` - Builder selector
- ✅ `select-plan` - Plan selector
- ✅ `select-development` - Development selector
- ✅ `select-lot` - Lot selector
- ✅ `select-inspection-type` - Inspection type selector
- ✅ `select-priority` - Priority selector
- ✅ `select-status` - Status selector
- ✅ `button-date-picker` - Date picker button
- ✅ `input-pricing` - Pricing input
- ✅ `input-floor-area` - Floor area input
- ✅ `input-surface-area` - Surface area input
- ✅ `input-house-volume` - House volume input
- ✅ `input-stories` - Stories input
- ✅ `input-latitude` - Latitude input
- ✅ `input-longitude` - Longitude input
- ✅ `textarea-notes` - Notes textarea
- ✅ `button-cancel` - Cancel button
- ✅ `button-save` - Save button

### Landing/Login Page
- ✅ `button-login` - Login button

## Missing Data-testid Attributes

The following components may need additional `data-testid` attributes for more comprehensive E2E testing:

### Job Detail/Edit View (if exists)
- ❓ `button-delete-job` - Delete job button
- ❓ `button-confirm-delete` - Confirm deletion button
- ❓ `button-assign-job` - Assign job button
- ❓ `select-inspector` - Inspector selector
- ❓ `button-confirm-assign` - Confirm assignment button
- ❓ `select-job-status` - Status change selector
- ❓ `button-save-status` - Save status button

### Job Cards
- ❓ `status-{status}` - Status badges (e.g., `status-pending`, `status-completed`)

**Note**: The job detail/edit features mentioned in the original task spec may not exist in the current implementation. The application appears to use dialogs for job creation/editing rather than separate detail pages.

## Configuration Details

### Playwright Config (playwright.config.ts)

```typescript
- Base URL: http://localhost:5000
- Test Directory: ./tests/e2e
- Workers: 1 (sequential execution)
- Retries: 2 in CI, 0 locally
- Reporter: HTML
- Screenshots: On failure only
- Traces: On first retry
- Web Server: Auto-starts with 'npm run dev'
- Browser: Chromium (Desktop Chrome)
```

### Environment

- **Dev Server**: Automatically started by Playwright
- **Authentication**: Dev-mode (no OAuth in tests)
- **Database**: Uses development database
- **Port**: 5000

## Best Practices

1. **Use Page Objects**: Always use page objects, never direct selectors in tests
2. **Unique Test Data**: Use `nanoid()` for unique job names to avoid conflicts
3. **Cleanup**: Tests create data but cleanup is optional (dev database)
4. **Parallel Execution**: Disabled (`fullyParallel: false`) to avoid race conditions
5. **Timeouts**: Default timeouts are sufficient, only increase if needed
6. **Assertions**: Use Playwright's `expect` for better error messages

## Debugging Tips

```bash
# Run with headed browser (see what's happening)
npx playwright test --headed

# Run specific test with debug mode
npx playwright test -g "create job" --debug

# Generate test code (record interactions)
npx playwright codegen http://localhost:5000

# View trace files for failed tests
npx playwright show-trace trace.zip
```

## CI/CD Integration

For CI environments, the config automatically:
- Enables `forbidOnly` to catch `.only` tests
- Sets retries to 2
- Uses 1 worker for stability
- Does not reuse existing server

Example GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Next Steps

1. **Add More Tests**: Expand coverage for other critical flows
2. **Visual Regression**: Add screenshot comparison tests
3. **API Mocking**: Mock external APIs for faster, more reliable tests
4. **Performance Testing**: Add performance assertions
5. **Accessibility Testing**: Use Playwright's accessibility features

## Troubleshooting

### Tests timing out
- Increase timeout in individual tests: `test.setTimeout(60000)`
- Check if dev server is starting correctly
- Verify database is accessible

### Authentication failures
- Ensure dev-mode is enabled in server config
- Check that test users exist in database
- Verify session handling works correctly

### Element not found errors
- Verify `data-testid` attributes are correct
- Check if UI has changed since test was written
- Use `page.pause()` to inspect the page state

### Flaky tests
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use more specific selectors
- Avoid hard-coded timeouts, use Playwright's auto-waiting

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Debugging Guide](https://playwright.dev/docs/debug)
