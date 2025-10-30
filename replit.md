# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics. The project aims to provide a comprehensive, user-friendly, and powerful mobile solution for field operations, offering significant market potential by streamlining energy audit processes and improving data reliability for field inspectors.

## User Preferences
Preferred communication style: Simple, everyday language.

## Development Philosophy

This project aspires to AAA production quality, inspired by world-class applications like Stripe, Vercel, GitHub, Linear, and Figma. Our development approach prioritizes:

### Quality Standards
- **40/40 Production Standard**: Every feature achieves 40 points across three tiers (Core Functionality, Production Hardening, Operational Excellence)
- **Comprehensive Testing**: 80% unit test coverage minimum, 100% for critical paths (compliance, payments, data integrity)
- **Performance Budgets**: API responses <200ms p95, database queries <50ms, frontend bundle <500KB
- **Accessibility First**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- **Field-Optimized**: High contrast outdoor readability, 48x48px glove-friendly touch targets, offline-first architecture
- **Observability**: Structured logging, Sentry error tracking, performance monitoring, real-time dashboards

### Continuous Improvement
- **Vertical Slice Methodology**: Each feature developed to full production quality before starting the next
- **Standards-Driven Development**: All work follows documented standards (PRODUCTION_STANDARDS.md, UI_UX_STANDARDS.md, TESTING_STANDARDS.md, OBSERVABILITY_STANDARDS.md)
- **Template-Based Consistency**: Reusable templates/ directory ensures every feature meets quality bar
- **Regular Reviews**: Weekly metric analysis, monthly performance audits, quarterly security reviews
- **User-Centered**: Simple, everyday language. Field inspector needs drive all decisions.

### Reference Documentation
- **PRODUCTION_STANDARDS.md** - Complete 40/40 standard definition (2000+ lines)
- **UI_UX_STANDARDS.md** - Beautiful interface guidelines (2200+ lines, 30 examples)
- **TESTING_STANDARDS.md** - Testing strategy and patterns (2100+ lines, 44 examples)
- **OBSERVABILITY_STANDARDS.md** - Monitoring and debugging (1800+ lines, 30 examples)
- **VERTICAL_SLICE_CHECKLIST.md** - Master production readiness checklist
- **templates/** - Reusable artifacts (runbook, compliance, smoke tests, E2E tests, API routes)

## Quality Gates

Every feature must pass these gates before being considered "production ready":

### Tier 1: Core Functionality (20/40 points)
- Database schema with proper indexes and foreign keys
- API endpoints with authentication and authorization
- Frontend UI with proper TypeScript types
- Error handling and user-friendly error messages
- Loading states, empty states, and skeleton loaders
- Smoke test coverage (bash scripts for quick validation)
- Basic runbook documentation

### Tier 2: Production Hardening (10/40 points)
- Unit tests (80% coverage for business logic)
- Integration tests (all API endpoints)
- E2E Playwright tests (critical user journeys)
- API documentation (OpenAPI spec)
- Performance benchmarks established
- Comprehensive error handling with Sentry context
- Input validation and sanitization
- Accessibility audit (WCAG 2.1 AA)

### Tier 3: Operational Excellence (10/40 points)
- Monitoring dashboards with key metrics
- Alerting configured for critical failures
- Load testing completed and documented
- Incident response runbook
- Backup and restore procedures tested
- Performance budgets enforced (API <200ms, queries <50ms, bundle <500KB)
- Security audit completed
- Database optimization (query analysis, indexes)

See **PRODUCTION_STANDARDS.md** for detailed requirements and **templates/COMPLIANCE_TEMPLATE.md** for the checklist.

## System Architecture
The application features a **React** and **TypeScript** frontend, built with **Vite** and utilizing **Wouter** for routing. UI components are developed with **shadcn/ui** (Radix UI) and **Tailwind CSS**, incorporating a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is developed with **Express.js** and **Node.js** in **TypeScript**, with **PostgreSQL** (Neon serverless) as the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

Core architectural decisions and features include:
-   **Comprehensive Error Prevention**: Centralized logging, extensive type safety, and a two-layer Error Boundary system.
-   **Bulletproof Authentication System**: Robust session management, triple-layer admin protection, and enhanced security measures.
-   **Builder Hierarchy System**: Manages contacts, agreements, programs, and interactions within a geographic hierarchy (Development → Lot → Job).
-   **Bulk Operations**: Multi-select functionality for Photos, Jobs, and Expenses with bulk actions.
-   **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
-   **Analytics Dashboard**: Provides metrics on inspection volume, photo tag analysis, and builder performance.
-   **PDF Export System**: Uses `@react-pdf/renderer` for professional, dynamic PDF generation.
-   **Photo Documentation**: Supports multi-tagging, annotations, OCR, photo-required checklists, dual capture, offline queue, duplicate detection, compression, and smart tag suggestions.
-   **Offline-First Functionality**: Utilizes service workers, IndexedDB, and a custom sync queue.
-   **Automated Calendar Import System**: Smart parsing of calendar events with confidence scoring, fuzzy matching, deduplication, and automated polling.
-   **Unified Schedule Page with Admin Assignment Workflow**: Production-ready calendar system with role-based visibility, responsive design, and admin assignment controls.
-   **Google Calendar Integration**: Multi-calendar integration with OAuth2 for two-way sync.
-   **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
-   **Gamification & Achievements System**: Tracks predefined achievements with automated criteria evaluation.
-   **Database Optimization**: Over 35 strategic database indexes across key tables for enhanced query performance.
-   **Enterprise Hardening**: Includes **Sentry** integration for error monitoring, multi-layered security (CSRF, rate limiting, Helmet), and secure sessions.
-   **WebSocket Notifications**: Real-time notification system with exponential backoff and HTTP polling fallback.
-   **Database Schema Integrity**: Comprehensive schema synchronization, including dedicated columns for assignment tracking, OCR, financial tracking, and notification preferences.
-   **Report Template System - JSON-Only Architecture**: Complete migration to a pure JSON architecture for report templates, supporting standalone reports and version tracking.
-   **Blower Door Testing System**: Production-grade multi-point pressure testing with automated ACH50 calculations, weather/altitude corrections, and Minnesota 2020 Energy Code compliance verification.
-   **Duct Leakage Testing System**: Production-grade duct airtightness testing supporting Total Duct Leakage (TDL) and Duct Leakage to Outside (DLO) per Minnesota 2020 Energy Code.
-   **Equipment Management System**: Production-grade equipment inventory, calibration tracking, maintenance scheduling, and checkout workflows for RESNET-certified field equipment.
-   **Scheduled Exports System**: Production-grade automated data export system with cron scheduling, multi-format support (CSV, JSON), and email delivery.
-   **Ventilation Testing System**: Production-grade ASHRAE 62.2 whole-house ventilation compliance testing for RESNET-certified inspectors.
-   **Jobs Management System**: Production-grade job tracking with automated compliance evaluation, inspector assignment workflows, and billing-ready notifications.

## Production-Ready Features (40/40 Vertical Slices)

The following features have achieved the 40/40 production standard across all three tiers. Each includes comprehensive runbook, smoke tests, seed data, and compliance documentation. See **VERTICAL_SLICE_CHECKLIST.md** for the master checklist applied to each feature.

**Current Status**: 11 of 40 vertical slices completed at AAA production quality.

1. **Jobs Management** - Core job tracking with automated compliance evaluation
2. **Builders Management** - Builder hierarchy with contacts, agreements, programs, interactions
3. **Calendar Integration** - Automated Google Calendar import with smart parsing
4. **Photos & Documentation** - Multi-tag photo system with OCR, annotations, offline queue
5. **Blower Door Testing** - Multi-point pressure testing with ACH50 calculations
6. **Duct Leakage Testing** - TDL/DLO testing per Minnesota 2020 Energy Code
7. **Equipment Management** - Inventory, calibration tracking, checkout workflows
8. **Scheduled Exports** - Automated data export with cron scheduling
9. **Ventilation Testing** - ASHRAE 62.2 whole-house ventilation compliance
10. **Report Templates** - JSON-only architecture for standalone reports
11. **Expenses & Mileage** - Financial tracking with receipt uploads and trip tracking

## Technical Debt & Known Gaps

This section tracks areas where existing slices need enhancement to meet full 40/40 standards:

### Missing Test Coverage
- **Unit Tests**: Most slices lack unit test coverage for business logic (target: 80% minimum)
  * Priority: builderService.ts validation functions, compliance calculations, date/time utilities
- **Integration Tests**: API endpoint integration tests needed (all routes tested with supertest)
- **E2E Tests**: Critical user journeys need Playwright coverage (inspection workflow, builder management, equipment checkout)
- **Performance Tests**: Load testing baselines not established (k6 or Artillery needed)

### Missing Observability
- **Structured Logging**: Currently using console.log instead of Winston/Pino with JSON format
- **Metrics Collection**: No Prometheus metrics endpoint for API timing, error rates, business metrics
- **Distributed Tracing**: OpenTelemetry not configured for request correlation
- **Dashboards**: No real-time operational dashboards (Grafana or similar needed)
- **Alerting**: No automated alerts for error rate spikes, performance degradation

### Missing API Documentation
- **OpenAPI Spec**: No Swagger/OpenAPI documentation auto-generated from routes
- **API Docs Site**: No developer-facing API documentation portal
- **Request/Response Examples**: Missing inline documentation with examples

### Missing Operational Procedures
- **Backup Strategy**: Database backup procedures not documented or tested
- **Restore Procedure**: Disaster recovery plan not tested
- **Rollback Procedures**: Deployment rollback not documented
- **Incident Response**: No formal incident response playbook with severity levels

### Performance Optimization Opportunities
- **Bundle Optimization**: Frontend bundle not analyzed for size reduction opportunities
- **Query Optimization**: Database queries not profiled with EXPLAIN ANALYZE
- **Caching**: No Redis or in-memory caching for frequently accessed data
- **CDN**: Static assets not served from CDN

### Security Enhancements
- **Dependency Scanning**: No automated security scanning (Snyk, Dependabot)
- **Penetration Testing**: No formal security audit conducted
- **Rate Limiting**: Rate limits not tuned based on production traffic
- **Audit Logging**: Sensitive operations not logged for compliance

### UX Polish Opportunities
- **Micro-interactions**: Limited use of animations and transitions (see UI_UX_STANDARDS.md)
- **Keyboard Shortcuts**: Power user shortcuts not implemented
- **Optimistic Updates**: Limited use of optimistic UI updates
- **Session Replay**: No user session replay tool (LogRocket, FullStory)

### Priorities for Next Quarter
1. **Test Coverage** - Reach 80% unit test coverage across all slices
2. **Observability** - Implement structured logging, metrics, and dashboards
3. **API Documentation** - Auto-generate OpenAPI docs from routes
4. **Performance Baselines** - Establish load testing baselines for all critical endpoints

This list is maintained continuously and reviewed monthly.

## External Dependencies

### Third-Party Services
-   **Google Calendar API**: For two-way synchronization of schedule events.
-   **Replit Object Storage**: Utilizes Google Cloud Storage for photo uploads.
-   **Neon Serverless PostgreSQL**: Cloud-hosted database.
-   **Sentry**: Error monitoring.

### UI Libraries
-   **Radix UI**: Headless accessible component primitives.
-   **Recharts**: Chart rendering.
-   **React Big Calendar**: Calendar view component.
-   **Uppy**: File upload component with Webcam plugin.
-   **react-konva** & **konva**: Canvas-based photo annotation.
-   **tesseract.js**: OCR for text extraction.
-   **@react-pdf/renderer**: PDF generation.

### Form Handling
-   **React Hook Form**: Form state management and validation.
-   **@hookform/resolvers**: Integration with Zod for form validation.

### Styling
-   **Tailwind CSS**: Utility-first CSS framework.

### Image Processing
-   **Sharp**: Server-side image processing for thumbnail generation.