# CI/CD Setup Instructions

## GitHub Actions Workflows Configured

This document describes the CI/CD infrastructure for automated accessibility and performance testing.

---

## ✅ Files Created

### 1. Workflow Files
- `.github/workflows/accessibility-ci.yml` - Accessibility audit workflow (Axe)
- `.github/workflows/performance-ci.yml` - Performance audit workflow (Lighthouse)

### 2. Quality Gate Scripts
- `scripts/check-accessibility-gates.js` - Validates accessibility violations against thresholds
- `scripts/check-lighthouse-gates.js` - Validates performance scores against thresholds

---

## 📝 Required package.json Changes

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test:accessibility": "playwright test tests/e2e/accessibility/accessibility-audit.spec.ts",
    "test:performance": "lighthouse http://localhost:5000 --output=json --output=html --output-path=./lighthouse-results.html"
  }
}
```

**To add manually:**
1. Open `package.json`
2. Locate the `"scripts"` section
3. Add the two lines above to the scripts object
4. Save the file

---

## 🚀 Workflow Triggers

### Accessibility Workflow
- **Pull Requests**: Runs on every PR to `main` branch
- **Scheduled**: Daily at 2:00 AM UTC
- **Manual**: Via GitHub Actions UI (`workflow_dispatch`)

### Performance Workflow
- **Pull Requests**: Runs on every PR to `main` branch
- **Scheduled**: Daily at 3:00 AM UTC  
- **Manual**: Via GitHub Actions UI (`workflow_dispatch`)

---

## 🎯 Quality Gate Thresholds

### Accessibility (Axe)
- **Critical violations**: 0 allowed
- **Serious violations**: 0 allowed
- **Moderate violations**: 0 allowed
- **Minor violations**: Max 10 allowed

### Performance (Lighthouse)
- **Performance**: >= 90/100
- **Accessibility**: >= 95/100
- **Best Practices**: >= 90/100
- **SEO**: >= 90/100

---

## 📊 Workflow Outputs

### Accessibility Workflow
**Artifacts uploaded:**
- `docs/ACCESSIBILITY_AUDIT_STATUS.md` - Status summary
- `docs/ACCESSIBILITY_AUDIT_REPORT.md` - Detailed report
- `docs/audit-results/accessibility-audit.json` - JSON results

**Quality Gates:**
- Parses JSON results via `scripts/check-accessibility-gates.js`
- Fails build if violations exceed thresholds
- Displays summary in GitHub Actions logs

### Performance Workflow
**Artifacts uploaded:**
- Lighthouse HTML reports (via treosh/lighthouse-ci-action)
- Lighthouse JSON results
- Temporary public storage links for report viewing

**Quality Gates:**
- Parses Lighthouse results via `scripts/check-lighthouse-gates.js`
- Fails build if any score falls below threshold
- Displays detailed scores in GitHub Actions logs

---

## 🔧 Local Testing

### Test Accessibility Locally
```bash
# Install dependencies (if not already done)
npm ci
npx playwright install --with-deps chromium

# Run accessibility audit
npm run test:accessibility

# Check quality gates
node scripts/check-accessibility-gates.js
```

### Test Performance Locally
```bash
# Build application
npm run build

# Start application (in background)
npm run start &

# Wait for app to be ready
npx wait-on http://localhost:5000

# Run Lighthouse
npm run test:performance

# Check quality gates (requires Lighthouse CI setup)
node scripts/check-lighthouse-gates.js
```

---

## 📁 File Locations

```
.github/
└── workflows/
    ├── accessibility-ci.yml
    └── performance-ci.yml

scripts/
├── check-accessibility-gates.js
└── check-lighthouse-gates.js

docs/
├── ACCESSIBILITY_AUDIT_STATUS.md (generated)
├── ACCESSIBILITY_AUDIT_REPORT.md (generated)
└── audit-results/
    └── accessibility-audit.json (generated)
```

---

## 🔍 Integration with Status Dashboard

The `/status/features` dashboard automatically consumes the accessibility audit results:

- **Backend**: `server/routes/status.ts` parses `docs/audit-results/accessibility-audit.json`
- **Frontend**: `client/src/pages/StatusFeaturesPage.tsx` displays accessibility status per route
- **Cache**: Results cached for 5 minutes to optimize performance

---

## ⚠️ Important Notes

1. **Browser Dependencies**: Workflows run in GitHub Actions with full browser support. Local execution may require system dependencies.

2. **Build Step**: Performance workflow builds the application (`npm run build`) before running Lighthouse.

3. **Parallel Execution**: Both workflows can run simultaneously without conflicts.

4. **Artifact Retention**: Reports are kept for 30 days by default.

5. **Public Storage**: Lighthouse CI uses temporary public storage for report viewing (automatically expires).

---

## 🐛 Troubleshooting

### Accessibility Workflow Fails
- Check that `tests/e2e/accessibility/accessibility-audit.spec.ts` exists
- Ensure Playwright browsers are installed (`npx playwright install --with-deps chromium`)
- Verify audit results are written to `docs/audit-results/accessibility-audit.json`

### Performance Workflow Fails
- Ensure application builds successfully (`npm run build`)
- Check that application starts on port 5000
- Verify `wait-on` can reach http://localhost:5000
- Review Lighthouse CI action logs for detailed errors

### Quality Gates Fail
- Review uploaded artifact reports for violation details
- Adjust thresholds in gate scripts if needed (with caution)
- Address violations at the source rather than relaxing gates

---

## 📚 References

- [Axe DevTools Documentation](https://www.deque.com/axe/devtools/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Web Vitals](https://web.dev/vitals/)
