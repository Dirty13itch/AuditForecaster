# ADR-001: Next.js 15 Framework Choice

**Status:** Accepted

**Date:** 2025-11-24

**Deciders:** Development Team

**Technical Story:** Framework selection for Field Inspect SaaS platform

---

## Context and Problem Statement

Field Inspect requires a modern, performant web framework that supports:
- Server-side rendering for SEO and performance
- Progressive Web App (PWA) capabilities for offline field work
- TypeScript for type safety
- Rapid development with good DX
- Production-ready scalability

**Driving Forces:**
- Need for offline-first capabilities for field inspectors
- SEO requirements for builder portal
- Mobile-first design requirements
- Developer productivity and maintainability

## Decision Drivers

* Performance (Core Web Vitals, SSR)
* Developer Experience (TypeScript support, hot reload, tooling)
* Ecosystem maturity (libraries, community, documentation)
* Production readiness (deployment, scaling, monitoring)
* PWA support (service workers, offline capabilities)
* Cost of ownership (learning curve, hiring, maintenance)

## Considered Options

* **Next.js 15** (App Router)
* **Remix**
* **SvelteKit**
* **Create React App** (deprecated)
* **Vite + React Router**

## Decision Outcome

**Chosen option:** "Next.js 15 with App Router"

**Rationale:**
- Industry-leading framework with massive ecosystem
- Built-in PWA support via next-pwa
- Excellent TypeScript support out of the box
- Server Components reduce client bundle size
- Vercel deployment options (though using Unraid/Docker)
- Strong SEO capabilities with SSR/SSG
- Active development and future-proof (backed by Vercel)

### Positive Consequences

* Fast initial page loads with SSR
* Reduced JavaScript bundle sizes with Server Components
* Excellent developer experience with fast refresh
* Large talent pool for hiring
* Extensive documentation and community resources
* Built-in image optimization and routing
* API routes for backend functionality

### Negative Consequences

* Vendor lock-in consideration (mitigated by Docker deployment)
* Learning curve for App Router (newer paradigm)
* Some features still stabilizing in Next.js 15
* Requires understanding React Server Components

## Pros and Cons of the Options

### Next.js 15 (App Router)

**Pros:**
* Server Components architecture reduces client-side JS
* Built-in optimizations (images, fonts, scripts)
* Wide adoption and proven at scale
* Incremental adoption path (can mix pages/app router)
* Excellent TypeScript support
* Strong Vercel ecosystem (analytics, speed insights)

**Cons:**
* App Router is relatively new (some churn)
* Can be complex for simple use cases
* Some Next.js-specific patterns to learn

### Remix

**Pros:**
* Progressive enhancement focus
* Excellent nested routing
* Strong data loading patterns
* Good TypeScript support

**Cons:**
* Smaller ecosystem than Next.js
* Less PWA tooling available
* Smaller talent pool

### SvelteKit

**Pros:**
* Excellent performance
* Smaller bundle sizes
* Great developer experience

**Cons:**
* Smaller ecosystem
* Less enterprise adoption
* Smaller talent pool
* Less TypeScript tooling maturity

## Links

* [Next.js Documentation](https://nextjs.org/docs)
* [Next.js App Router](https://nextjs.org/docs/app)
* [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
* Related: [ADR-003](./003-structured-logging-strategy.md) - Logging strategy for Next.js

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-24 | Development Team | Initial creation documenting existing choice |
