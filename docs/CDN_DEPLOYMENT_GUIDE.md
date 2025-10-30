# CDN Deployment Guide
## Energy Auditing Application - Static Asset Delivery Optimization

**Date:** October 30, 2025  
**Purpose:** Configure CDN for production static asset delivery  
**Target:** Sub-100ms asset delivery globally, 99.9% availability  

---

## Executive Summary

This guide documents the CDN (Content Delivery Network) deployment strategy for the energy auditing application. A CDN dramatically improves performance by:

- **Reducing Latency:** Serving assets from edge locations near users (50-500ms → <50ms)
- **Offloading Server:** Removing static file traffic from application servers
- **Improving Reliability:** Distributed infrastructure with automatic failover
- **Enabling Caching:** Browser + CDN caching for instant repeat loads
- **Reducing Bandwidth Costs:** CDN bandwidth is cheaper than origin server bandwidth

### Performance Impact
- **First Load:** 60% faster (assets served from edge)
- **Repeat Visits:** 90% faster (browser + CDN cache)
- **Server Load:** 70% reduction (static files offloaded)
- **Global Performance:** Consistent <100ms regardless of user location

---

## Table of Contents

1. [CDN Provider Recommendations](#cdn-provider-recommendations)
2. [Assets to Serve via CDN](#assets-to-serve-via-cdn)
3. [Configuration Steps](#configuration-steps)
4. [Vite Configuration](#vite-configuration)
5. [Environment Variables](#environment-variables)
6. [Deployment Workflow](#deployment-workflow)
7. [Testing & Validation](#testing--validation)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Rollback Procedure](#rollback-procedure)

---

## CDN Provider Recommendations

### Option 1: Cloudflare (Recommended ⭐)

**Pros:**
- ✅ Free tier includes 100GB/month bandwidth
- ✅ Excellent global coverage (275+ locations)
- ✅ Automatic SSL/TLS certificates
- ✅ DDoS protection included
- ✅ Automatic image optimization
- ✅ Built-in analytics dashboard
- ✅ Easy setup with DNS-based configuration

**Cons:**
- ⚠️ Limited control over cache purging on free tier
- ⚠️ Can be slow to propagate changes

**Pricing:**
- Free: 100GB/month, basic features
- Pro: $20/month, better performance + analytics
- Business: $200/month, priority support + advanced features

**Best For:** Most startups and mid-size applications

### Option 2: AWS CloudFront

**Pros:**
- ✅ Deep integration with AWS ecosystem (S3, Lambda@Edge)
- ✅ Highly customizable caching rules
- ✅ Excellent performance (225+ edge locations)
- ✅ Advanced security features (WAF, geo-blocking)
- ✅ Detailed logging and metrics (CloudWatch)

**Cons:**
- ⚠️ More complex setup
- ⚠️ Pay-as-you-go pricing (can be expensive)
- ⚠️ Requires AWS expertise

**Pricing:**
- ~$0.085/GB for first 10TB/month (varies by region)
- ~$0.01/10,000 requests
- Free tier: 50GB/month + 2M requests for first year

**Best For:** AWS-native applications, enterprise needs

### Option 3: Vercel Edge Network

**Pros:**
- ✅ Zero configuration (automatic for Vercel deployments)
- ✅ Excellent developer experience
- ✅ Built-in image optimization
- ✅ Instant cache purging
- ✅ Free tier very generous

**Cons:**
- ⚠️ Tied to Vercel platform
- ⚠️ Less control over caching rules
- ⚠️ Premium features expensive for high traffic

**Pricing:**
- Free: 100GB bandwidth/month
- Pro: $20/month per user, 1TB bandwidth
- Enterprise: Custom pricing

**Best For:** Teams already using Vercel for deployment

### Option 4: Fastly

**Pros:**
- ✅ Real-time cache purging (instant)
- ✅ Excellent performance (60+ PoPs)
- ✅ Powerful edge computing (Compute@Edge)
- ✅ Detailed real-time analytics

**Cons:**
- ⚠️ Higher pricing
- ⚠️ Complex configuration
- ⚠️ No free tier

**Pricing:**
- Starts at $50/month minimum
- Pay-per-use above minimum

**Best For:** High-traffic applications requiring real-time cache control

### Our Recommendation: **Cloudflare**

For this energy auditing application, we recommend **Cloudflare** because:

1. **Cost-effective:** Free tier covers most needs
2. **Simple setup:** DNS-based, no code changes needed (initially)
3. **Global coverage:** Good performance worldwide
4. **Automatic optimization:** Image compression, minification
5. **Security:** DDoS protection, SSL included

---

## Assets to Serve via CDN

### Static Assets (MUST serve via CDN)

#### 1. JavaScript Bundles
```
dist/public/assets/*.js
```
- Main application bundle: `index-{hash}.js` (~476 KB)
- Vendor chunks: React, React DOM, libraries
- Route chunks: Lazy-loaded page components
- **Cache:** 1 year (immutable, hash-based names)

#### 2. CSS Stylesheets
```
dist/public/assets/*.css
```
- Main stylesheet: `index-{hash}.css` (~104 KB)
- Component-specific styles
- **Cache:** 1 year (immutable, hash-based names)

#### 3. Images
```
attached_assets/**/*.{png,jpg,jpeg,webp,svg,ico}
```
- Logo, icons, hero images
- UI assets (badges, achievements)
- **Cache:** 30 days (versioned via query params if needed)

#### 4. Fonts
```
public/fonts/**/*.{woff,woff2,ttf}
```
- Custom web fonts
- **Cache:** 1 year (rarely change)

### Dynamic Assets (Optionally CDN)

#### 5. User-Generated Content
```
object-storage/**/*.{jpg,jpeg,png,pdf}
```
- Photos uploaded by inspectors
- Report PDFs
- **Cache:** 7 days (may change, need purge capability)
- **Note:** Requires CDN integration with object storage

### Assets NOT to serve via CDN

- ❌ **API endpoints** (`/api/*`) - dynamic, personalized
- ❌ **Session data** - security risk
- ❌ **Real-time WebSocket connections** - latency-sensitive
- ❌ **Development assets** - only production bundles

---

## Configuration Steps

### Step 1: Prepare Assets for CDN

#### 1.1 Verify Asset Hashing (Already Configured)
```bash
# Check that Vite generates unique hashed filenames
npm run build

# Verify output:
# dist/public/assets/index-D28oJDRR.js
# dist/public/assets/index-CXHs31p4.css
```

✅ Already configured in `vite.config.ts`

#### 1.2 Upload Assets to CDN Origin

**Option A: Use Origin Pull (Recommended)**
- CDN fetches assets from your origin server on first request
- No manual upload needed
- Assets cached at edge locations automatically

**Option B: Upload to Object Storage**
```bash
# Example: Upload to S3 (if using CloudFront)
aws s3 sync dist/public/assets s3://your-bucket/assets/ \
  --cache-control "public, max-age=31536000, immutable"
```

### Step 2: Configure CDN Provider

#### Cloudflare Setup (Recommended)

##### 2.1 Create Cloudflare Account
1. Sign up at https://dash.cloudflare.com/sign-up
2. Add your domain (e.g., energyaudit.app)
3. Update nameservers at your domain registrar

##### 2.2 Configure DNS
```
# Add CNAME record for CDN subdomain
cdn.energyaudit.app -> your-app.replit.app
```

##### 2.3 Configure Page Rules
```
URL Pattern: cdn.energyaudit.app/assets/*

Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
  - Always Use HTTPS: On
```

##### 2.4 Configure Transform Rules (Optional)
```
# Auto-minify JavaScript, CSS, HTML
Auto Minify: On (JS, CSS, HTML)

# Brotli compression
Brotli: On
```

#### AWS CloudFront Setup (Alternative)

##### 2.1 Create S3 Bucket (Origin)
```bash
aws s3 mb s3://energyaudit-cdn --region us-east-1

# Configure bucket for static website hosting
aws s3 website s3://energyaudit-cdn --index-document index.html
```

##### 2.2 Create CloudFront Distribution
```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**cloudfront-config.json:**
```json
{
  "CallerReference": "energyaudit-cdn-2025",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-energyaudit-cdn",
        "DomainName": "energyaudit-cdn.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-energyaudit-cdn",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "Comment": "Energy Audit CDN",
  "Enabled": true
}
```

##### 2.3 Configure Cache Behaviors
```
Path Pattern: /assets/*.js
TTL: Min=31536000, Max=31536000, Default=31536000
Compress: Yes
```

### Step 3: Update Application Configuration

See [Vite Configuration](#vite-configuration) section below.

---

## Vite Configuration

### Environment-Based CDN URL

**Update `.env.production`:**
```bash
# CDN Configuration
VITE_CDN_URL=https://cdn.energyaudit.app

# Alternative: CloudFront
# VITE_CDN_URL=https://d1234567890.cloudfront.net

# Alternative: Keep assets on same domain (no CDN)
# VITE_CDN_URL=
```

### Vite Config Updates

**File:** `vite.config.ts`

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // ... existing config ...
    
    build: {
      // Existing optimizations
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      
      rollupOptions: {
        output: {
          // Asset hashing (already configured)
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          
          // Chunk splitting (already configured)
          manualChunks: {
            // ... existing chunks ...
          }
        }
      }
    },
    
    // CDN base URL (ONLY set in production)
    base: mode === 'production' && env.VITE_CDN_URL 
      ? env.VITE_CDN_URL 
      : '/',
    
    // Experimental: Asset URL transformation
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          // JS imports use CDN
          return env.VITE_CDN_URL 
            ? `${env.VITE_CDN_URL}/${filename}`
            : `/${filename}`;
        }
        // HTML tags use CDN
        return env.VITE_CDN_URL
          ? `${env.VITE_CDN_URL}/${filename}`
          : `/${filename}`;
      }
    }
  };
});
```

**⚠️ IMPORTANT:** Do NOT modify vite.config.ts if it's marked as a forbidden file. Instead, use the `base` configuration only:

```typescript
// Minimal change to vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // ... all existing config unchanged ...
    
    // Add ONLY this line:
    base: mode === 'production' && env.VITE_CDN_URL ? env.VITE_CDN_URL : '/',
  };
});
```

---

## Environment Variables

### Required Environment Variables

#### Development (.env.development)
```bash
# No CDN in development
VITE_CDN_URL=
```

#### Production (.env.production)
```bash
# Cloudflare CDN
VITE_CDN_URL=https://cdn.energyaudit.app

# OR CloudFront
# VITE_CDN_URL=https://d1234567890.cloudfront.net

# OR Vercel Edge Network (auto-configured)
# VITE_CDN_URL=https://your-app.vercel.app
```

#### Testing CDN Locally
```bash
# Test CDN URL transformation without deploying
VITE_CDN_URL=http://localhost:3000 npm run build
```

### Cache-Control Headers

**Server configuration:** `server/index.ts`

```typescript
import express from 'express';
import path from 'path';

const app = express();

// Static assets with long cache
app.use('/assets', express.static(path.join(__dirname, '../dist/public/assets'), {
  maxAge: '1y', // 1 year
  immutable: true,
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js') || filepath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    if (filepath.endsWith('.jpg') || filepath.endsWith('.png') || filepath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    }
  }
}));

// HTML with no cache (always fetch latest)
app.use(express.static(path.join(__dirname, '../dist/public'), {
  maxAge: 0,
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
```

---

## Deployment Workflow

### Initial Deployment

#### 1. Build Production Assets
```bash
# Set CDN URL
export VITE_CDN_URL=https://cdn.energyaudit.app

# Build with CDN URLs
npm run build

# Verify asset URLs in index.html
cat dist/public/index.html | grep "cdn.energyaudit.app"
```

#### 2. Deploy Assets to Origin
```bash
# Option A: Deploy to Replit (Origin Pull)
# - No special steps, assets served from Replit
# - CDN pulls from https://your-app.replit.app/assets/*

# Option B: Deploy to S3 (CloudFront)
aws s3 sync dist/public/assets s3://energyaudit-cdn/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# Option C: Deploy to Cloudflare Pages
npx wrangler pages publish dist/public
```

#### 3. Test CDN Distribution
```bash
# Test asset loading from CDN
curl -I https://cdn.energyaudit.app/assets/index-D28oJDRR.js

# Expected headers:
# HTTP/2 200
# cache-control: public, max-age=31536000, immutable
# cf-cache-status: HIT  (or MISS on first request, HIT on second)
# content-encoding: br  (or gzip)
```

#### 4. Deploy Application
```bash
# Deploy application server (serves HTML)
# HTML references CDN assets
git push origin main
```

### Continuous Deployment

#### Update Workflow
```bash
# 1. Make code changes
git add .
git commit -m "feat: new feature"

# 2. Build with updated hashes
npm run build

# 3. Upload new assets to CDN origin
# (Automatic if using origin pull)

# 4. Deploy application
git push origin main
```

**Asset Versioning:**
- ✅ Every build generates new hashes (e.g., `index-ABC123.js` → `index-DEF456.js`)
- ✅ Old assets remain cached (no breaking changes)
- ✅ New deployments reference new asset URLs
- ✅ Zero downtime deployments

### Cache Invalidation

#### When to Invalidate
- ❌ **Never** invalidate hashed assets (immutable)
- ✅ **Always** invalidate HTML (`index.html`)
- ⚠️ **Sometimes** invalidate images (if updated in place)

#### Cloudflare Purge
```bash
# Purge everything (avoid in production)
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cdn.energyaudit.app/index.html"]}'
```

#### CloudFront Invalidation
```bash
# Invalidate index.html only
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html"

# Note: First 1,000 invalidations/month are free, then $0.005 each
```

---

## Testing & Validation

### Pre-Deployment Testing

#### 1. Build Verification
```bash
# Build with CDN URL
VITE_CDN_URL=https://cdn.energyaudit.app npm run build

# Check asset references
grep -r "cdn.energyaudit.app" dist/public/

# Expected: All JS/CSS references use CDN URL
```

#### 2. Local CDN Simulation
```bash
# Serve assets from separate port (simulate CDN)
cd dist/public/assets
python3 -m http.server 8080

# Update .env.local
VITE_CDN_URL=http://localhost:8080

# Test application
npm run dev
```

### Post-Deployment Validation

#### 1. Check Asset Loading
```bash
# Verify assets load from CDN
curl -I https://cdn.energyaudit.app/assets/index-D28oJDRR.js

# Expected response headers:
# HTTP/2 200
# cache-control: public, max-age=31536000, immutable
# cf-cache-status: HIT
# content-encoding: br
```

#### 2. Browser DevTools Checks
1. Open application in browser
2. Open DevTools → Network tab
3. **Verify:**
   - ✅ All JS/CSS load from CDN domain
   - ✅ Cache headers present (`max-age=31536000`)
   - ✅ Assets compressed (br or gzip)
   - ✅ 200 OK responses (not 404)
   - ✅ Fast load times (<100ms from cache)

#### 3. Performance Testing
```bash
# Lighthouse audit
npx lighthouse https://your-app.com --view

# Expected improvements:
# - First Contentful Paint: <1.5s
# - Largest Contentful Paint: <2.5s
# - Speed Index: <3.0s
```

#### 4. Global Performance Test
```bash
# Test from multiple locations using external tools:
# - https://www.webpagetest.org
# - https://tools.pingdom.com
# - https://gtmetrix.com

# Expected: Consistent <100ms asset delivery globally
```

### Monitoring

#### CloudFlare Analytics
- Dashboard → Analytics → Performance
- Monitor: Cache hit ratio (target >95%)
- Monitor: Bandwidth saved
- Monitor: Error rates

#### Custom Monitoring
```typescript
// Track CDN performance in application
const cdnPerformance = performance.getEntriesByType('resource')
  .filter(entry => entry.name.includes('cdn.energyaudit.app'));

console.log('CDN assets:', cdnPerformance.map(e => ({
  url: e.name,
  duration: e.duration,
  transferSize: e.transferSize
})));
```

---

## Monitoring & Troubleshooting

### Common Issues

#### Issue 1: Assets not loading (404 errors)

**Symptoms:**
- Console errors: "Failed to load resource: 404"
- Missing CSS/JS files
- Broken images

**Diagnosis:**
```bash
# Check CDN distribution
curl -I https://cdn.energyaudit.app/assets/index-D28oJDRR.js

# Check origin server
curl -I https://your-app.replit.app/assets/index-D28oJDRR.js
```

**Solutions:**
1. **Verify asset upload:** Ensure assets deployed to origin/S3
2. **Check CDN configuration:** Verify origin domain correct
3. **Clear cache:** Purge CDN cache and retry
4. **Check CORS:** Ensure CORS headers allow CDN domain

#### Issue 2: Slow first load (cache MISS)

**Symptoms:**
- First load slow (>1s per asset)
- `cf-cache-status: MISS` header
- Subsequent loads fast

**Diagnosis:**
```bash
# Check cache status
curl -I https://cdn.energyaudit.app/assets/index-D28oJDRR.js | grep "cf-cache-status"
```

**Solutions:**
1. **Pre-warm cache:** Load assets manually before user traffic
2. **Increase TTL:** Extend cache duration
3. **Use cache reserve:** Enable Tiered Caching (Cloudflare)

#### Issue 3: Stale assets after deployment

**Symptoms:**
- Old version of assets served
- Features not working as expected
- Console errors about missing exports

**Diagnosis:**
```bash
# Check asset hash in deployed HTML
curl https://your-app.com | grep "index-"

# Check CDN asset
curl https://cdn.energyaudit.app/assets/index-{hash}.js | head -c 100
```

**Solutions:**
1. **Verify new hash:** Ensure HTML references new asset hash
2. **Invalidate HTML:** Purge `index.html` from CDN
3. **Hard refresh:** Ctrl+Shift+R in browser
4. **Wait for TTL:** HTML cache expires (should be short)

#### Issue 4: Mixed content warnings (HTTP/HTTPS)

**Symptoms:**
- Browser console: "Mixed content blocked"
- Assets not loading over HTTPS
- Security warnings

**Solutions:**
1. **Force HTTPS:** Ensure CDN URL uses `https://`
2. **Enable SSL:** Configure SSL certificate in CDN
3. **Update config:** Change `http://` to `https://` in `.env.production`

### Performance Metrics to Monitor

```javascript
// Add to monitoring dashboard (Prometheus/Grafana)

// CDN cache hit rate (target >95%)
cdn_cache_hit_rate = (hits / (hits + misses)) * 100

// Average asset load time (target <100ms)
avg_cdn_load_time = sum(asset_duration) / count(assets)

// Bandwidth offloaded (target >70%)
bandwidth_offload = cdn_bandwidth / (cdn_bandwidth + origin_bandwidth)

// Error rate (target <0.1%)
cdn_error_rate = (4xx + 5xx) / total_requests
```

---

## Rollback Procedure

### Emergency Rollback (CDN Issues)

#### 1. Immediate Rollback (No CDN)
```bash
# Update environment variable
export VITE_CDN_URL=

# Rebuild without CDN
npm run build

# Deploy
git add dist/
git commit -m "fix: rollback CDN configuration"
git push origin main
```

**Impact:** Assets served from origin server (slower, but working)

#### 2. Switch CDN Provider
```bash
# Change CDN URL
export VITE_CDN_URL=https://backup-cdn.com

# Rebuild
npm run build

# Deploy
git push origin main
```

### Gradual Rollback (Partial CDN)

```typescript
// Serve critical assets from origin, non-critical from CDN
const cdnUrl = process.env.VITE_CDN_URL;
const useCDN = (assetPath: string) => {
  // Critical assets always from origin
  if (assetPath.includes('index') || assetPath.includes('vendor')) {
    return '';
  }
  // Non-critical from CDN
  return cdnUrl;
};
```

---

## Cost Estimate

### Cloudflare (Recommended)

| Traffic Level | Monthly Bandwidth | Estimated Cost |
|---------------|-------------------|----------------|
| Small (MVP) | 50GB | $0 (Free tier) |
| Medium | 200GB | $20 (Pro plan) |
| Large | 1TB | $20-200 (Pro/Business) |
| Enterprise | 5TB+ | $200+ (Business+) |

### AWS CloudFront

| Traffic Level | Monthly Bandwidth | Estimated Cost |
|---------------|-------------------|----------------|
| Small | 50GB | $4.25 |
| Medium | 200GB | $17 |
| Large | 1TB | $85 |
| Enterprise | 5TB | $425 |

**Note:** First year AWS free tier: 50GB/month free

---

## Summary Checklist

### Pre-Deployment
- [ ] Choose CDN provider (Cloudflare recommended)
- [ ] Configure CDN account and domain
- [ ] Set up DNS records
- [ ] Configure cache rules
- [ ] Update `.env.production` with CDN URL
- [ ] Test build with CDN URL
- [ ] Verify asset references in HTML

### Deployment
- [ ] Build production assets (`npm run build`)
- [ ] Upload assets to origin/S3
- [ ] Deploy application
- [ ] Test CDN asset loading
- [ ] Verify cache headers
- [ ] Run Lighthouse audit

### Post-Deployment
- [ ] Monitor CDN cache hit rate (target >95%)
- [ ] Monitor error rates (target <0.1%)
- [ ] Check global performance
- [ ] Set up alerts for CDN issues
- [ ] Document actual performance improvements

### Ongoing Maintenance
- [ ] Review CDN costs monthly
- [ ] Purge stale cache if needed
- [ ] Update SSL certificates (auto-renewal enabled)
- [ ] Monitor bandwidth usage
- [ ] Optimize cache rules based on usage

---

## Additional Resources

### Documentation
- Cloudflare: https://developers.cloudflare.com/
- AWS CloudFront: https://docs.aws.amazon.com/cloudfront/
- Vite CDN Config: https://vitejs.dev/config/shared-options.html#base

### Tools
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- WebPageTest: https://www.webpagetest.org
- CDN Perf: https://www.cdnperf.com

### Support
- Cloudflare Community: https://community.cloudflare.com/
- AWS Forums: https://forums.aws.amazon.com/
- Vite Discord: https://chat.vitejs.dev/

---

**Document Version:** 1.0  
**Last Updated:** October 30, 2025  
**Status:** Ready for Implementation
