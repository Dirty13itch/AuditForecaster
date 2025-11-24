# Performance Standards & Monitoring

## Overview

This document defines performance targets, monitoring strategies, and optimization guidelines for AuditForecaster.

---

## Core Web Vitals

### Target Metrics

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | ≤ 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200ms - 500ms | > 500ms |
| **TTFB** (Time to First Byte) | ≤ 600ms | 600ms - 1800ms | > 1800ms |

**Goal:** 75th percentile of page loads should meet "Good" thresholds.

### Current Measurements

| Page | LCP | FID | CLS | Status |
|------|-----|-----|-----|--------|
| Dashboard | ? | ? | ? | 🔍 **Needs measurement** |
| Job List | ? | ? | ? | 🔍 **Needs measurement** |
| Inspection Form | ? | ? | ? | 🔍 **Needs measurement** |

---

## Performance Budget

### JavaScript Bundle Size

| Category | Budget | Current | Status |
|----------|--------|---------|--------|
| **First Load JS** | < 150 KB | 102 KB | ✅ **Passing** |
| **Per Route** | < 50 KB | Varies | 🟡 **Monitor** |
| **Largest Route** | < 200 KB | 155 KB | ✅ **Passing** |
| **Total Bundle** | < 500 KB | ~400 KB | ✅ **Passing** |

### Image Optimization

| Metric | Target | Current |
|--------|--------|---------|
| Max image size | < 500 KB | ? |
| Format | WebP preferred | Mixed |
| Lazy loading | 100% | ✅ Via next/image |
| Blur placeholders | 80% | 🔴 Not implemented |

### API Response Times

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `/api/jobs` | < 200ms | < 500ms | < 1s |
| `/api/builders` | < 150ms | < 400ms | < 800ms |
| `/api/upload/photo` | < 2s | < 5s | < 10s |
| Server Actions | < 300ms | < 700ms | < 1.5s |

---

## Database Performance

### Query Performance Targets

| Query Type | Target | Monitoring |
|------------|--------|------------|
| Simple SELECT | < 10ms | ✅ Prisma logs |
| JOIN queries | < 50ms | ✅ Prisma logs |
| Complex aggregations | < 200ms | ⚠️ Manual review |
| Writes | < 20ms | ✅ Prisma logs |

### Connection Pooling

```typescript
// lib/prisma.ts - Current configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
})

// Recommended production configuration
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
  // For production with high concurrency
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20'
    }
  }
})

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 100) { // 100ms threshold
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})
```

### Index Strategy

**Required Indexes:**
```prisma
model Job {
  @@index([status, builderId]) // Filter by status + builder
  @@index([scheduledDate]) // Calendar views
  @@index([createdAt]) // Recent jobs listing
  @@index([inspectorId, status]) // Inspector dashboard
}

model Inspection {
  @@index([jobId]) // Job details page
  @@index([status]) // QA dashboard
}

model Photo {
  @@index([jobId]) // Photo gallery
  @@index([inspectionId]) // Inspection photos
}
```

**Index Review Process:**
1. Enable Prisma query logging in development
2. Identify slow queries (> 100ms)
3. Run `EXPLAIN ANALYZE` on slow queries
4. Add indexes for frequently queried columns
5. Test impact on query performance
6. Monitor write performance (indexes slow writes)

---

## Caching Strategy

### Multi-Level Caching

```
Browser Cache
    ↓
CDN Cache (Future)
    ↓
Next.js Cache (Server Components)
    ↓
Redis Cache (Sessions/Temp Data)
    ↓
Database
```

### Implementation

**1. Browser Caching (Static Assets)**

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate'
          }
        ]
      }
    ]
  }
}
```

**2. Server Component Caching**

```typescript
// app/dashboard/builders/page.tsx
import { unstable_cache } from 'next/cache'

const getBuilders = unstable_cache(
  async () => {
    return await prisma.builder.findMany({
      orderBy: { name: 'asc' }
    })
  },
  ['builders-list'],
  {
    revalidate: 3600, // 1 hour
    tags: ['builders'] // For manual revalidation
  }
)

export default async function BuildersPage() {
  const builders = await getBuilders()
  // ...
}

// Revalidate on mutation
// app/actions/builders.ts
export async function createBuilder(formData: FormData) {
  await prisma.builder.create({ data })
  revalidateTag('builders') // Clear cache
  revalidatePath('/dashboard/builders')
}
```

**3. Redis for Session Data (Future)**

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

// Usage
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached) return cached

  const data = await fetcher()
  await redis.set(key, data, { ex: ttl })
  return data
}
```

---

## Frontend Performance

### Code Splitting

```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic'

const ReportBuilder = dynamic(
  () => import('@/components/reporting/report-builder'),
  {
    loading: () => <Skeleton className="h-96" />,
    ssr: false // If not needed for SEO
  }
)

const HeavyChart = dynamic(
  () => import('@/components/charts/heavy-chart'),
  { ssr: false }
)
```

### Image Optimization

```typescript
// Always use next/image
import Image from 'next/image'

<Image
  src={photo.url}
  width={800}
  height={600}
  alt={photo.description}
  placeholder="blur"
  blurDataURL={photo.blurHash} // Generate on upload
  priority={isAboveFold} // For hero images
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

**Blur Placeholder Generation:**
```typescript
// lib/image-utils.ts
import { getPlaiceholder } from 'plaiceholder'

export async function generateBlurHash(imageBuffer: Buffer) {
  const { base64 } = await getPlaiceholder(imageBuffer)
  return base64
}

// Use during photo upload
const blurHash = await generateBlurHash(buffer)
await prisma.photo.create({
  data: {
    url,
    blurHash // Store for later use
  }
})
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // FOIT -> FOUT
  preload: true,
  variable: '--font-inter'
})

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

---

## Monitoring & Instrumentation

### Real User Monitoring (RUM)

**Vercel Analytics (Basic)**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Custom Web Vitals Reporting**
```typescript
// app/layout.tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(
          metric.name === 'CLS' ? metric.value * 1000 : metric.value
        ),
        event_label: metric.id,
        non_interaction: true
      })
    }

    // Log to our backend
    if (metric.value > thresholds[metric.name]) {
      logger.warn('Performance threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold: thresholds[metric.name],
        url: window.location.href
      })
    }
  })

  return null
}
```

### Server-Side Monitoring

**Sentry Performance Monitoring**
```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  
  integrations: [
    new Sentry.Integrations.Prisma({ client: prisma })
  ],

  beforeSend(event) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies
    }
    return event
  }
})
```

**Custom Performance Tracking**
```typescript
// lib/performance.ts
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    logger.info('Performance measurement', {
      operation: name,
      duration: Math.round(duration),
      success: true
    })
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    
    logger.error('Performance measurement (failed)', {
      operation: name,
      duration: Math.round(duration),
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
    
    throw error
  }
}

// Usage in server actions
export async function createBuilder(formData: FormData) {
  return measurePerformance('createBuilder', async () => {
    // Action logic
  })
}
```

---

## Load Testing

### k6 Load Test Scenarios

**Scenario 1: Normal Load**
```javascript
// load-tests/normal-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options

 = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
}

export default function() {
  const res = http.get('http://localhost:3000/dashboard')
  check(res, {
    'status is 200': (r) => r.status === 200,
    'load time < 500ms': (r) => r.timings.duration < 500
  })
  sleep(1)
}
```

**Scenario 2: Spike Test**
```javascript
// load-tests/spike-test.js
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 500 }, // Spike
    { duration: '10s', target: 10 }
  ]
}
```

**Running Load Tests:**
```bash
# Install k6
# Windows: choco install k6
# macOS: brew install k6

# Run normal load test
k6 run load-tests/normal-load.js

# Run with output to JSON
k6 run --out json=results.json load-tests/normal-load.js
```

---

## Performance Optimization Checklist

### Before Deployment
- [ ] Bundle size analyzed
- [ ] No large dependencies in client bundle
- [ ] Images optimized (WebP, compressed)
- [ ] Fonts optimized (variable fonts, display: swap)
- [ ] Code splitting implemented for large pages
- [ ] Lazy loading for below-fold content
- [ ] Database indexes verified
- [ ] N+1 queries eliminated
- [ ] Caching strategy implemented

### Post-Deployment
- [ ] Core Web Vitals monitored
- [ ] Performance budget alerts set
- [ ] Load testing completed
- [ ] Database query performance reviewed
- [ ] Server response times monitored
- [ ] Error rates tracked

---

## Performance Review Schedule

### Weekly
- Review Vercel Analytics / Sentry Performance
- Check for performance regressions
- Review slow query logs

### Monthly
- Run full load tests
- Review and update performance budgets
- Analyze bundle size trends
- Database query performance audit

### Quarterly
- Comprehensive performance audit
- Review caching effectiveness
- Evaluate CDN strategy (if applicable)
- Update performance baselines

---

## References

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [k6 Documentation](https://k6.io/docs/)

*Last updated: 2025-11-24*
