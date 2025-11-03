# Golden Path Tests - Execution Guide

## Overview

The Golden Path tests validate the core user journeys of the Energy Auditing Field Application following AAA Blueprint specifications. All 5 tests are architecturally complete and ready for browser execution.

## Test Files

1. **GP-01**: `gp-01-calendar-to-report.spec.ts` - Calendar Import → Job Creation → Field Visit → Report
2. **GP-02**: `gp-02-final-visit.spec.ts` - Final Visit with Measurements → Report → Export History
3. **GP-03**: `gp-03-offline-photos.spec.ts` - Photos Capture Offline → Reconnect → Sync + Tag
4. **GP-04**: `gp-04-45l-tax-credit.spec.ts` - 45L Credits Dashboard → Project View → Progress Tracking
5. **GP-05**: `gp-05-qa-review.spec.ts` - QA Review Workflow - Score Job → Admin Review → Approve

## Test Infrastructure

### Helper Modules (`tests/e2e/helpers/`)
- **auth.ts**: Authentication helpers for test users (admin, inspector, partner)
- **accessibility.ts**: Axe-core integration for WCAG 2.2 AA compliance testing
- **performance.ts**: Lighthouse integration for performance metrics
- **analytics.ts**: Analytics event and audit log tracking
- **reporter.ts**: Test results reporter for updating golden-path-report.md

### Page Object Models (`tests/e2e/poms/`)
All necessary POMs are created for the application pages used in Golden Path tests.

## Running the Tests

### Local Development Environment

```bash
# Install Playwright browsers (run once)
npx playwright install chromium

# Run all Golden Path tests
npx playwright test tests/e2e/golden-path

# Run specific test
npx playwright test tests/e2e/golden-path/gp-01

# Run with UI mode for debugging
npx playwright test tests/e2e/golden-path --ui

# Run with headed mode to see browser
npx playwright test tests/e2e/golden-path --headed

# Use the test script
./scripts/test-golden-path.sh [gp-01|gp-02|gp-03|gp-04|gp-05|all]
```

### Replit Environment

Due to Replit's environment restrictions on system-level browser installations, tests should be run in a local development environment or CI pipeline with proper browser support.

For Replit development:
1. The test structure and helpers are fully implemented
2. Tests can be reviewed and edited in Replit
3. Actual browser execution should happen in a proper testing environment

### CI/CD Pipeline

```yaml
# Example GitHub Actions configuration
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run Golden Path Tests
  run: npx playwright test tests/e2e/golden-path
  env:
    BASE_URL: http://localhost:5000
```

## Test Configuration

### Environment Variables
- `BASE_URL`: Application URL (default: http://localhost:5000)
- `NODE_ENV`: Set to "test" for test execution

### Playwright Configuration (`playwright.config.ts`)
- Workers: 1 (sequential execution for Lighthouse)
- Remote debugging port: 9222 (for Lighthouse integration)
- Timeout: 2 minutes per test
- Retries: 2 in CI, 0 in local

## Quality Gates

Each test validates:
1. **Functional**: All workflow steps complete successfully
2. **Accessibility**: Zero critical/serious violations (WCAG 2.2 AA)
3. **Performance**: Score ≥ 90, LCP < 2.5s, CLS < 0.1, TBT < 200ms
4. **Analytics**: Events and audit logs captured correctly

## Test Data

Tests use M/I Homes seed data (`server/seeds/miHomesTC.ts`) which includes:
- Test users (admin, inspectors, partner)
- Builder: M/I Homes
- Development: Sunset Ridge
- Jobs in various states
- Sample inspection data

## Results Reporting

Test results are automatically appended to `docs/product/golden-path-report.md` including:
- Execution timestamp
- Pass/fail status
- Duration
- Functional test results
- Accessibility violations
- Performance scores (LCP, CLS, TBT)
- Analytics events captured
- Audit logs created

## Troubleshooting

### Common Issues

1. **Login failures**: Ensure dev login endpoints are enabled
2. **Timeout errors**: Increase test timeout in test file
3. **Lighthouse errors**: Check remote debugging port (9222) is available
4. **Data issues**: Run seed scripts to ensure test data exists

### Debug Mode

```bash
# Run with debug mode
npx playwright test --debug tests/e2e/golden-path/gp-01

# See verbose output
npx playwright test --reporter=list tests/e2e/golden-path
```

## Next Steps

1. **Local Testing**: Run tests in a local environment with proper browser support
2. **CI Integration**: Set up GitHub Actions or similar for automated testing
3. **Monitoring**: Track test results over time for flakiness detection
4. **Expansion**: Add more detailed assertions as application evolves