# Session Replay Integration Guide

**Energy Auditing Field Application - Version 1.0**

Comprehensive guide to implementing session replay for debugging, support, and UX optimization.

---

## Table of Contents

1. [Overview](#overview)
2. [Provider Comparison](#provider-comparison)
3. [Recommended Provider](#recommended-provider)
4. [Pricing Analysis](#pricing-analysis)
5. [Privacy & Compliance](#privacy--compliance)
6. [Performance Impact](#performance-impact)
7. [Implementation Guide](#implementation-guide)
8. [Use Cases](#use-cases)
9. [Setup Instructions](#setup-instructions)

---

## Overview

Session replay tools record user interactions and allow you to replay them like a video. This is invaluable for:

- **Debugging**: See exactly what the user did before an error occurred
- **Support**: Understand user issues without lengthy back-and-forth
- **UX Research**: Identify friction points and usability issues
- **Product Analytics**: Make data-driven product decisions

---

## Provider Comparison

### LogRocket

**Best For**: Developers who need comprehensive debugging tools

#### Pros:
✅ Excellent developer experience (Redux state, network logs, console logs)
✅ Deep technical integration (JavaScript errors with full context)
✅ Sentry integration (link sessions to errors)
✅ Performance monitoring included
✅ Custom events and user identification
✅ React DevTools integration

#### Cons:
❌ Higher price point (~$99-299/mo)
❌ Heavier script (~40KB gzipped)
❌ More complex privacy configuration

#### Features:
- Session replay with DOM snapshots
- Console logs and network requests
- JavaScript errors with stack traces
- Redux/Vuex state inspection
- Performance metrics (FCP, LCP, TTI)
- User identification and custom events
- Heatmaps and click maps
- Funnel analytics
- Integration with error tracking (Sentry, Rollbar)

#### Performance:
- Bundle size: ~40KB gzipped
- CPU overhead: ~2-3%
- Memory overhead: ~10-15MB
- Network: ~100KB per minute of recording

---

### FullStory

**Best For**: Product teams who want UX insights + session replay

#### Pros:
✅ Powerful search and segmentation
✅ Heatmaps and click tracking
✅ Funnel analysis
✅ Rage click detection
✅ Mobile app support (iOS, Android)
✅ Best-in-class search ("Find all sessions where user...") 

#### Cons:
❌ Most expensive option (~$199-999/mo)
❌ Larger bundle size (~50KB gzipped)
❌ More focused on product analytics than debugging
❌ Learning curve for advanced features

#### Features:
- Session replay with proprietary rendering
- Omnisearch (search sessions by any action)
- Heatmaps and scrollmaps
- Conversion funnels
- Rage click and error click detection
- Mobile app analytics
- A/B testing integration
- Product analytics dashboards
- Segments and cohorts

#### Performance:
- Bundle size: ~50KB gzipped
- CPU overhead: ~3-4%
- Memory overhead: ~15-20MB
- Network: ~120KB per minute of recording

---

### Hotjar

**Best For**: Marketers and UX researchers on a budget

#### Pros:
✅ Most affordable ($39-99/mo, free tier available)
✅ Great for UX research (heatmaps, surveys, feedback)
✅ Easy to set up and use
✅ Generous free tier (35 sessions/day)
✅ No coding required for surveys/polls

#### Cons:
❌ Limited debugging capabilities (no console logs, network)
❌ Session replay quality not as good
❌ No error tracking integration
❌ Limited developer-focused features

#### Features:
- Session recordings (basic)
- Heatmaps and scrollmaps
- Conversion funnels (basic)
- Feedback polls
- Surveys and NPS
- Form analytics
- Recruitment tools

#### Performance:
- Bundle size: ~30KB gzipped
- CPU overhead: ~1-2%
- Memory overhead: ~8-10MB
- Network: ~80KB per minute of recording

---

### Microsoft Clarity

**Best For**: Anyone who wants basic session replay for free

#### Pros:
✅ **100% FREE** (no session limits!)
✅ Lightweight (~25KB gzipped)
✅ Basic heatmaps included
✅ Rage click detection
✅ Privacy-focused (GDPR compliant)
✅ No credit card required

#### Cons:
❌ No console logs or network requests
❌ Limited error tracking
❌ Basic analytics only
❌ No integrations with Sentry/error tracking
❌ Microsoft ecosystem (may be a pro or con)

#### Features:
- Unlimited session recordings
- Heatmaps and scrollmaps
- Rage click detection
- Frustration signals
- Basic funnels
- Dashboard analytics
- Privacy controls

#### Performance:
- Bundle size: ~25KB gzipped
- CPU overhead: ~1%
- Memory overhead: ~5-8MB
- Network: ~60KB per minute of recording

---

## Recommended Provider

### For Energy Auditing Field Application: **LogRocket**

#### Justification:

1. **Developer-Focused Debugging**
   - Field inspectors report bugs frequently ("app crashed", "photo didn't upload")
   - LogRocket's console logs and network requests help diagnose issues quickly
   - Integration with Sentry provides full error context

2. **Offline/Online Sync Issues**
   - App uses offline-first architecture with sync queue
   - LogRocket's network tab shows failed/pending requests
   - Can see exactly when sync succeeded/failed

3. **Production-Ready Error Tracking**
   - Already using Sentry for error tracking
   - LogRocket + Sentry integration provides:
     - Video replay of session leading to error
     - Redux state at time of error
     - Network requests before error
     - Console logs for context

4. **Performance Monitoring**
   - LogRocket includes Core Web Vitals (LCP, FID, CLS)
   - Can identify slow pages and optimize
   - Performance budget alerts

5. **ROI Calculation**
   - 3 field inspectors reporting bugs daily
   - Without LogRocket: ~30 min/bug (back-and-forth, reproduction)
   - With LogRocket: ~5 min/bug (watch replay, fix directly)
   - Time saved: 25 min/bug × 3 bugs/day = 75 min/day = 6.25 hours/week
   - At $50/hr developer time: $312.50/week = $1,250/month saved
   - LogRocket cost: ~$99-199/month
   - **ROI: ~6x return on investment**

#### Alternative for Budget-Conscious Teams: **Microsoft Clarity**

If budget is a constraint, Clarity provides:
- Free unlimited session recordings
- Basic heatmaps and rage click detection
- Privacy-focused
- Lightweight performance impact

**Upgrade to LogRocket when**:
- Error debugging becomes time-consuming
- Need console logs and network inspection
- Want integration with Sentry
- Team size grows beyond 5 developers

---

## Pricing Analysis

### LogRocket

| Plan | Sessions/Month | Price/Month | Features |
|------|----------------|-------------|----------|
| Developer | 1,000 | $99 | Basic replay, 7-day retention |
| Team | 10,000 | $299 | Full features, 30-day retention |
| Professional | 50,000 | $799 | Advanced analytics, 90-day retention |
| Enterprise | Custom | Custom | Custom retention, SSO, SLA |

**Estimated Cost for RESNET App:**
- 3 field inspectors × 8 hours/day × 22 days/month = 528 hours/month
- Assuming 1 session = 1 hour of work: ~600 sessions/month
- **Recommended Plan**: Developer ($99/mo) or Team ($299/mo)

### FullStory

| Plan | Sessions/Month | Price/Month | Features |
|------|----------------|-------------|----------|
| Business | 5,000 | $199 | Core features, 30-day retention |
| Advanced | 25,000 | $599 | Advanced search, 60-day retention |
| Enterprise | Custom | Custom | Custom retention, dedicated support |

**Estimated Cost**: ~$199-299/mo for RESNET app usage

### Hotjar

| Plan | Sessions/Month | Price/Month | Features |
|------|----------------|-------------|----------|
| Basic | 1,050 | Free | Limited features, 1 user |
| Plus | 3,150 | $39 | Core features, 3 users |
| Business | 10,500 | $99 | Full features, 5 users |
| Scale | Unlimited | $289 | Custom, unlimited users |

**Estimated Cost**: Plus ($39/mo) or Business ($99/mo)

### Microsoft Clarity

| Plan | Sessions/Month | Price/Month | Features |
|------|----------------|-------------|----------|
| Free | Unlimited | $0 | All features, unlimited users |

**Estimated Cost**: $0

---

## Privacy & Compliance

### Data Protection Requirements

#### GDPR (EU):
✅ User consent required
✅ Right to access recorded data
✅ Right to deletion
✅ Data processing agreement (DPA)

#### CCPA (California):
✅ Privacy policy disclosure
✅ Opt-out mechanism
✅ Data deletion on request

#### HIPAA (Healthcare):
⚠️ Session replay may capture PHI (Protected Health Information)
⚠️ Additional safeguards required
⚠️ BAA (Business Associate Agreement) needed

### Privacy Configuration

#### Fields to Redact:
```typescript
const privacyConfig = {
  redactSelectors: [
    '[type="password"]',
    '[type="email"]',
    '[type="tel"]',
    '[autocomplete="cc-number"]',  // Credit cards
    '[data-sensitive]',             // Custom attribute
    '.ssn',                         // Social security
    '.private'                      // Custom class
  ],
  
  maskInputTypes: [
    'password',
    'email',
    'tel',
    'ssn',
    'credit-card'
  ],
  
  excludePages: [
    '/admin',
    '/settings/security',
    '/payment',
    '/billing'
  ]
};
```

#### Recommended Redaction Strategy:

**Energy Auditing App**:
- ❌ Don't record: Payment info, SSN, login credentials
- ✅ Do record: Job addresses, inspection data, equipment serial numbers
- ⚠️ Mask: Inspector names, builder contact info (optional)

#### Implementation:
```html
<!-- Mark sensitive fields -->
<input type="text" data-sensitive placeholder="SSN" />

<!-- Or use CSS class -->
<div class="private">Confidential information</div>
```

LogRocket/FullStory will automatically redact these fields.

---

## Performance Impact

### Bundle Size Impact:

| Provider | Bundle Size (gzipped) | % of Current Bundle (476 KB) |
|----------|----------------------|----------------------------|
| LogRocket | 40 KB | +8.4% |
| FullStory | 50 KB | +10.5% |
| Hotjar | 30 KB | +6.3% |
| Clarity | 25 KB | +5.3% |

**Recommendation**: Load session replay script **asynchronously** to avoid blocking page load.

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cdn.logrocket.io/LogRocket.min.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

### Runtime Performance:

| Provider | CPU Overhead | Memory Overhead | Network/Minute |
|----------|--------------|-----------------|----------------|
| LogRocket | ~2-3% | ~10-15 MB | ~100 KB |
| FullStory | ~3-4% | ~15-20 MB | ~120 KB |
| Hotjar | ~1-2% | ~8-10 MB | ~80 KB |
| Clarity | ~1% | ~5-8 MB | ~60 KB |

### Mobile Performance Considerations:

- **Battery**: Session replay uses ~2-5% additional battery
- **Data**: ~6-12 MB per hour of recording
- **Recommendation**: Disable on 2G/3G networks, enable only on WiFi

```typescript
// Disable on slow connections
if (navigator.connection && navigator.connection.effectiveType !== '4g') {
  console.log('Session replay disabled on slow connection');
  return;
}
```

### Performance Budget:

Current app metrics:
- Bundle: 476 KB
- Time to Interactive: 1.2s
- First Contentful Paint: 0.8s

**After LogRocket** (estimated):
- Bundle: 516 KB (+40 KB)
- Time to Interactive: 1.3s (+0.1s)
- First Contentful Paint: 0.8s (no change with async load)

**Verdict**: ✅ Within acceptable performance budget (<10% impact)

---

## Implementation Guide

### 1. Install LogRocket

```bash
npm install logrocket
```

### 2. Initialize in `client/src/main.tsx`

```typescript
import { initSessionReplay } from './lib/sessionReplay';

// After app initialization
initSessionReplay();
```

### 3. Identify Users After Login

```typescript
import { identifyUser } from '@/lib/sessionReplay';

// In auth callback
function handleLoginSuccess(user) {
  identifyUser({
    id: user.id,
    name: user.firstName + ' ' + user.lastName,
    email: user.email,
    role: user.role
  });
}
```

### 4. Link to Sentry Errors

```typescript
import * as Sentry from '@sentry/react';
import { getSessionUrl } from '@/lib/sessionReplay';

Sentry.init({
  beforeSend(event) {
    const sessionUrl = getSessionUrl();
    if (sessionUrl) {
      event.contexts = {
        ...event.contexts,
        logrocket: {
          sessionUrl
        }
      };
    }
    return event;
  }
});
```

### 5. Track Custom Events

```typescript
import { trackEvent } from '@/lib/sessionReplay';

// Track critical user actions
function handleJobComplete(job) {
  trackEvent({
    name: 'job_completed',
    properties: {
      jobId: job.id,
      duration: job.completionTime,
      photoCount: job.photos.length
    }
  });
}
```

---

## Use Cases

### 1. **Debug Offline Sync Issues**

**Scenario**: Inspector reports "Photos not syncing"

**With LogRocket**:
1. Find user's session
2. Watch replay → see photo upload attempt
3. Check network tab → see 403 error
4. Check console → see "CSRF token expired"
5. Fix: Refresh CSRF token before upload

**Time saved**: 30 minutes → 5 minutes

---

### 2. **Reproduce "App Crashed" Reports**

**Scenario**: Inspector says "App crashed when I clicked Save"

**With LogRocket**:
1. Search for sessions with JavaScript errors
2. Watch replay leading up to crash
3. See Redux state at time of error
4. See network requests before crash
5. Identify: Null pointer exception when builder is undefined
6. Fix: Add null check

**Time saved**: 45 minutes → 10 minutes

---

### 3. **Optimize UX Based on Real Usage**

**Scenario**: Want to know if users find the new photo tagging UI

**With LogRocket**:
1. Create funnel: Photo upload → Tag selection → Save
2. See 40% drop-off at tag selection
3. Watch sessions → users struggling to find tags
4. Fix: Make tag selector more prominent
5. Re-measure: Drop-off reduced to 10%

**Impact**: 30% increase in photo tagging completion

---

### 4. **Support Ticket Resolution**

**Scenario**: Inspector submits support ticket "Can't change job status"

**With LogRocket**:
1. Look up inspector's recent sessions
2. Watch replay → see they're clicking disabled dropdown
3. Console shows: "User lacks permission to change status"
4. Respond: "Your role doesn't have permission. Contact admin."
5. Close ticket in 5 minutes

**Time saved**: 20 minutes → 5 minutes

---

## Setup Instructions

### Step 1: Create Account

1. Go to [LogRocket.com](https://logrocket.com)
2. Sign up for free trial (14 days, 1,000 sessions)
3. Create new project: "Energy Auditing Field App"
4. Copy App ID (e.g., `abc123/energy-audit-app`)

### Step 2: Add Environment Variables

Create `.env.local` (or add to Replit Secrets):

```bash
VITE_SESSION_REPLAY_ENABLED=true
VITE_SESSION_REPLAY_PROVIDER=logrocket
VITE_SESSION_REPLAY_APP_ID=abc123/energy-audit-app
```

### Step 3: Test Integration

1. Start app: `npm run dev`
2. Open app in browser
3. Perform some actions (navigate, click, type)
4. Check LogRocket dashboard (https://app.logrocket.com)
5. Verify session appears within 30 seconds

### Step 4: Configure Privacy

1. In LogRocket dashboard → Settings → Privacy
2. Add CSS selectors to redact:
   - `[type="password"]`
   - `[data-sensitive]`
   - `.private`
3. Enable "Sanitize text in inputs" (removes all input text)
4. Test: Verify sensitive fields are masked in replays

### Step 5: Integrate with Sentry

1. In Sentry project → Settings → Integrations
2. Search for "LogRocket"
3. Click "Configure"
4. Enter LogRocket App ID
5. Sessions will now link to Sentry errors automatically

### Step 6: Set Up Alerts

1. In LogRocket → Settings → Alerts
2. Create alert: "High rage click rate"
   - Condition: Rage clicks > 5 per session
   - Notify: Email or Slack
3. Create alert: "JavaScript error"
   - Condition: Any unhandled exception
   - Notify: Email + Sentry

### Step 7: Train Team

1. Share LogRocket dashboard access with developers
2. Create guide: "How to Use LogRocket for Debugging"
3. Include in bug report template: "Please include LogRocket session URL"

---

## Monitoring & Optimization

### Metrics to Track:

1. **Session Replay Adoption**
   - % of users with replays enabled
   - Average sessions recorded per day
   - Data storage usage

2. **Performance Impact**
   - Page load time before/after
   - Time to Interactive before/after
   - Memory usage before/after

3. **Support Impact**
   - Average ticket resolution time
   - % of tickets resolved with replay
   - Customer satisfaction score

4. **Product Impact**
   - Funnel completion rates
   - Feature adoption rates
   - UX improvement opportunities identified

### Optimization Tips:

1. **Sample Sessions** (if cost is concern)
   ```typescript
   if (Math.random() > 0.5) {
     initSessionReplay(); // Record 50% of sessions
   }
   ```

2. **Disable for Bots**
   ```typescript
   if (navigator.userAgent.includes('bot')) {
     return; // Don't record bot sessions
   }
   ```

3. **Lazy Load Script**
   ```typescript
   // Load after 3 seconds or on user interaction
   setTimeout(initSessionReplay, 3000);
   ```

---

## Conclusion

Session replay is a game-changer for debugging, support, and UX optimization. For the Energy Auditing Field Application:

**Recommended**: LogRocket
- Best debugging capabilities
- Sentry integration
- ROI: ~6x return on investment
- Cost: $99-299/month

**Alternative**: Microsoft Clarity (Free)
- Good for basic session replay
- Zero cost
- Upgrade to LogRocket when needed

**Next Steps**:
1. ✅ Start with LogRocket 14-day free trial
2. ✅ Integrate with Sentry
3. ✅ Configure privacy settings
4. ✅ Train team on usage
5. ✅ Measure impact on support and debugging time
6. ✅ Make data-driven decision to subscribe

**Happy debugging! 🎥**
