# PWA Testing Checklist for Energy Audit Pro

## Overview
This document provides a comprehensive testing checklist for validating the Progressive Web App (PWA) implementation for the Energy Auditing field application, optimized for Samsung Galaxy S23 Ultra.

## Prerequisites
- Chrome/Edge browser (Chromium-based) for testing
- Chrome DevTools opened (F12)
- Mobile device for real-world testing (Samsung Galaxy S23 Ultra recommended)
- HTTPS connection (required for Service Worker)

---

## 1. Manifest Validation

### Chrome DevTools - Application Tab
1. Open Chrome DevTools (F12)
2. Navigate to **Application** tab → **Manifest**
3. Verify the following:

**Expected Values:**
- ✅ **Name**: "Energy Audit Pro"
- ✅ **Short Name**: "Audit Pro"
- ✅ **Description**: "Professional energy auditing field application"
- ✅ **Start URL**: "/"
- ✅ **Display Mode**: "standalone"
- ✅ **Orientation**: "any"
- ✅ **Theme Color**: #2E5BBA (RGB: 46, 91, 186)
- ✅ **Background Color**: #F9F9F9 (RGB: 249, 249, 249)

**Icons:**
- ✅ 96x96 icon present
- ✅ 144x144 icon present
- ✅ 180x180 icon present (iOS)
- ✅ 192x192 icon present (Android minimum)
- ✅ 256x256 icon present
- ✅ 512x512 icon present (Android splash)
- ✅ 512x512 maskable icon present

**Shortcuts:**
- ✅ "New Job" shortcut available
- ✅ "Schedule" shortcut available

### Manual Verification
```bash
# Access manifest directly
curl https://[your-domain]/manifest.json

# Verify all icon files exist
curl -I https://[your-domain]/icons/icon-96x96.png
curl -I https://[your-domain]/icons/icon-144x144.png
curl -I https://[your-domain]/icons/icon-180x180.png
curl -I https://[your-domain]/icons/icon-192x192.png
curl -I https://[your-domain]/icons/icon-256x256.png
curl -I https://[your-domain]/icons/icon-512x512.png
```

---

## 2. Service Worker Registration

### Chrome DevTools - Application Tab
1. Navigate to **Application** tab → **Service Workers**
2. Verify:
   - ✅ Service Worker is **registered**
   - ✅ Status shows **activated and running**
   - ✅ Scope is `/`
   - ✅ Source is `/sw.js`

### Console Verification
Look for these log messages in the browser console:
```
[SW] Service Worker registered successfully: /
[SW] Installing...
[SW] Caching static assets
[SW] Activating...
```

### Service Worker Update Flow
1. Make a minor change to `sw.js` (increment version)
2. Refresh the page
3. Verify update prompt appears
4. Test "Reload to update" functionality

---

## 3. Caching Strategy Tests

### Static Assets (Cache-First)
1. Open Network tab in DevTools
2. Reload the page
3. Verify these are served from Service Worker cache:
   - ✅ `/` (index.html)
   - ✅ `/favicon.png`
   - ✅ JavaScript bundles (`.js` files)
   - ✅ CSS files (`.css` files)
   - ✅ Images (`.png`, `.jpg`, `.svg`)
   - ✅ Fonts (`.woff`, `.woff2`)

### API Calls (Network-First)
1. Navigate through the app (Jobs, Schedule, etc.)
2. Verify API calls:
   - ✅ `/api/jobs` - fetched from network first
   - ✅ `/api/builders` - fetched from network first
   - ✅ `/api/schedule-events` - fetched from network first
   - ✅ All API calls cached for offline use

### Authentication Cache (Stale-While-Revalidate)
1. Verify `/api/auth/user` endpoint:
   - ✅ Cached for offline access
   - ✅ Revalidated on each request
   - ✅ Cache cleared on logout (401)

---

## 4. Offline Functionality

### Enable Offline Mode
**Chrome DevTools:**
1. Open **Application** tab → **Service Workers**
2. Check **Offline** checkbox

**Or Network Tab:**
1. Open **Network** tab
2. Change throttling to **Offline**

### Test Offline Scenarios

**Scenario 1: View Cached Pages**
1. Visit Jobs page while online
2. Go offline
3. Navigate to Jobs page again
4. ✅ **Expected**: Jobs page loads from cache

**Scenario 2: View Cached Data**
1. Load job details while online
2. Go offline
3. View same job details
4. ✅ **Expected**: Job data loads from cache

**Scenario 3: Offline API Calls**
1. Go offline
2. Try to create a new job
3. ✅ **Expected**: Request queued or error message shown
4. Return online
5. ✅ **Expected**: Queued requests sync automatically

**Scenario 4: Static Assets Offline**
1. Clear browser cache
2. Visit site while online
3. Go offline
4. Reload the page
5. ✅ **Expected**: Page loads completely from service worker cache

---

## 5. Install Prompt Testing

### Android (Chrome/Edge)
1. Visit the app in Chrome on Samsung Galaxy S23 Ultra
2. Wait 3 seconds after page load
3. ✅ **Expected**: Install prompt banner appears at bottom
4. Click **Install** button
5. ✅ **Expected**: Native install dialog appears
6. Click **Install** in native dialog
7. ✅ **Expected**: App icon added to home screen

**Testing Dismissal:**
1. Click **Not now** on install prompt
2. ✅ **Expected**: Banner disappears
3. Wait 7 days (or clear localStorage)
4. ✅ **Expected**: Prompt reappears

### iOS (Safari)
1. Visit the app in Safari on iPhone/iPad
2. Wait 3 seconds
3. ✅ **Expected**: iOS install instructions appear
4. Banner shows: "tap Share icon → Add to Home Screen"
5. Follow instructions
6. ✅ **Expected**: App added to home screen

### Desktop (Chrome/Edge)
1. Visit app on desktop Chrome
2. Look for install icon in address bar (right side)
3. ✅ **Expected**: Install prompt available
4. Click install
5. ✅ **Expected**: App opens in standalone window

---

## 6. Installed App Experience

### Launch App
1. Open app from home screen icon
2. ✅ **Expected**: App launches in standalone mode (no browser UI)
3. ✅ **Expected**: Splash screen shows with icon and brand colors
4. ✅ **Expected**: No address bar or browser chrome visible

### Theme & Colors
1. Check status bar (top)
2. ✅ **Expected**: Status bar color is #2E5BBA (theme color)
3. ✅ **Expected**: Background color on load is #F9F9F9

### App Shortcuts (Android)
1. Long-press app icon on home screen
2. ✅ **Expected**: See "New Job" and "Schedule" shortcuts
3. Tap "New Job" shortcut
4. ✅ **Expected**: App opens to Jobs page with new job action

### Orientation
1. Rotate device to landscape
2. ✅ **Expected**: App rotates properly
3. Rotate to portrait
4. ✅ **Expected**: App rotates properly
5. ✅ **Expected**: No orientation lock (supports both)

---

## 7. Meta Tags Validation

### HTML Head Verification
Check the following meta tags in `index.html`:

```html
<!-- PWA Meta Tags -->
<meta name="description" content="..."> ✅
<meta name="theme-color" content="#2E5BBA"> ✅

<!-- Manifest -->
<link rel="manifest" href="/manifest.json"> ✅

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" href="/icons/icon-180x180.png"> ✅
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png"> ✅

<!-- Apple Mobile Web App -->
<meta name="apple-mobile-web-app-capable" content="yes"> ✅
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"> ✅
<meta name="apple-mobile-web-app-title" content="Audit Pro"> ✅

<!-- Microsoft Tiles -->
<meta name="msapplication-TileColor" content="#2E5BBA"> ✅
<meta name="msapplication-TileImage" content="/icons/icon-144x144.png"> ✅
```

---

## 8. Lighthouse PWA Audit

### Run Lighthouse Audit
1. Open Chrome DevTools
2. Go to **Lighthouse** tab
3. Select **Progressive Web App** category
4. Click **Generate report**

### Target Scores
- ✅ **PWA Score**: > 90
- ✅ **Installable**: Pass
- ✅ **PWA Optimized**: Pass
- ✅ **Fast and reliable**: Pass
- ✅ **Works offline**: Pass

### Key Metrics to Check
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Has a web app manifest
- ✅ Uses HTTPS
- ✅ Redirects HTTP to HTTPS
- ✅ Has a configured viewport
- ✅ Content sized correctly for viewport
- ✅ Has a `<meta name="theme-color">` tag
- ✅ Provides valid icons

---

## 9. Performance on Samsung Galaxy S23 Ultra

### Touch Targets (Critical for Field Use)
1. Test all interactive elements with touch
2. ✅ **Expected**: All buttons/inputs are at least 48x48px
3. ✅ **Expected**: No accidental clicks on adjacent elements
4. Test with gloves on (if available)
5. ✅ **Expected**: All buttons responsive even with gloves

### Outdoor Readability
1. Use device in bright sunlight
2. ✅ **Expected**: Text is readable
3. ✅ **Expected**: Buttons have enough contrast
4. ✅ **Expected**: Icons are clearly visible

### Battery Performance
1. Use app for 1 hour continuous
2. Monitor battery usage
3. ✅ **Expected**: Reasonable battery consumption
4. ✅ **Expected**: No excessive CPU/memory usage

---

## 10. Real-World Field Testing

### Connectivity Scenarios
**Test 1: Urban Area (Good Signal)**
- ✅ App loads quickly
- ✅ Sync works immediately
- ✅ All features available

**Test 2: Rural Area (Weak Signal)**
- ✅ App still usable
- ✅ Cached data loads quickly
- ✅ Offline banner appears
- ✅ Changes queued for sync

**Test 3: No Signal (Offline)**
- ✅ App launches from cache
- ✅ All cached jobs accessible
- ✅ Photo capture works (local storage)
- ✅ Edits saved locally
- ✅ Clear sync queue indicator

**Test 4: Signal Return (Coming Online)**
- ✅ Offline banner disappears
- ✅ Sync queue processes automatically
- ✅ Data uploads successfully
- ✅ UI updates with server data

---

## 11. Update & Versioning

### Service Worker Updates
1. Deploy new version of app
2. User visits app
3. ✅ **Expected**: Update detected
4. ✅ **Expected**: Prompt shown: "A new version is available. Reload to update?"
5. User clicks OK
6. ✅ **Expected**: Page reloads
7. ✅ **Expected**: New version active

### Cache Versioning
1. Check current cache version in `sw.js`
2. Deploy with incremented version
3. ✅ **Expected**: Old caches deleted
4. ✅ **Expected**: New cache created
5. ✅ **Expected**: Assets re-cached

---

## 12. Browser Compatibility

### Supported Browsers
Test in the following browsers:
- ✅ Chrome (Android) - Samsung Galaxy S23 Ultra
- ✅ Edge (Android)
- ✅ Safari (iOS) - iPhone/iPad
- ✅ Firefox (Android) - Limited PWA support
- ✅ Samsung Internet
- ✅ Chrome (Desktop)
- ✅ Edge (Desktop)

### Unsupported Browsers
Verify graceful degradation:
- ✅ Older browsers: App works without PWA features
- ✅ No install prompt shown
- ✅ Service worker registration fails gracefully
- ✅ App still functional as regular web app

---

## Known Issues & Limitations

### iOS Limitations
- ⚠️ No background sync on iOS
- ⚠️ Service worker may be terminated after inactivity
- ⚠️ Push notifications not supported
- ⚠️ Add to Home Screen is manual (no auto-prompt)

### Android Considerations
- ✅ Full PWA support
- ✅ Background sync available
- ✅ Install prompts work natively

---

## Debugging Tools

### Chrome DevTools Commands
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log(registrations);
});

// Check cache storage
caches.keys().then(keys => console.log('Cache keys:', keys));

// Check if app is standalone
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);

// Manually trigger install prompt (if deferred)
// (Set breakpoint in beforeinstallprompt handler)
```

### Service Worker Status
- **Installing**: Initial download and cache setup
- **Waiting**: Ready but old SW still active
- **Active**: Currently controlling pages
- **Redundant**: Replaced by newer version

---

## Success Criteria Summary

✅ **All items below must pass:**

1. Manifest validates in Chrome DevTools
2. Service Worker registers and activates successfully
3. App works offline (cached content accessible)
4. Install prompt appears on Android devices
5. App can be installed to home screen
6. App launches in standalone mode (no browser UI)
7. Icons display correctly at all sizes
8. Lighthouse PWA score > 90
9. Touch targets meet 48x48px minimum
10. Update flow works correctly
11. Works on Samsung Galaxy S23 Ultra

---

## Rollback Plan

If critical issues are found:

1. Remove `<link rel="manifest">` from index.html
2. Unregister service worker:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
   });
   ```
3. Clear all caches
4. Deploy previous version

---

## Next Steps After Testing

1. Monitor error logs for SW issues
2. Track install conversion rate
3. Monitor offline usage patterns
4. Gather user feedback on field performance
5. Iterate on cache strategies based on usage
6. Consider adding push notifications (Android only)
7. Implement background sync for offline edits

---

**Last Updated**: October 24, 2025
**Testing Platform**: Samsung Galaxy S23 Ultra (Android)
**App Version**: 1.0.0 (PWA-enabled)
