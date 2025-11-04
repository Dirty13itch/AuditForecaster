# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. The project's purpose is to provide a comprehensive, user-friendly, and powerful mobile solution for field operations, offering significant market potential by streamlining energy audit processes and improving data reliability. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a **React** and **TypeScript** frontend with **Vite**, **Wouter** for routing, and **shadcn/ui** (Radix UI) and **Tailwind CSS** for UI, including a custom color system for outdoor readability. **TanStack Query** manages server state, while **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is developed with **Express.js** and **Node.js** in **TypeScript**, using **PostgreSQL** (Neon serverless) via **Drizzle ORM**. The API is RESTful, with **Zod** for schema validation. **Replit Auth** handles authentication, with sessions stored in PostgreSQL.

### Database Driver Strategy
The application implements a **dual-driver PostgreSQL setup** to support both production (Neon) and CI/testing (standard PostgreSQL) environments:
- **Production**: Uses `@neondatabase/serverless` driver for Neon's WebSocket protocol
- **CI/Testing**: Uses standard `pg` driver for localhost PostgreSQL connections
- **Detection Logic**: Automatically detects Neon URLs by checking for 'neon.tech', '.pooler.neon', or 'neon.database.windows.net' in DATABASE_URL
- **Compatibility**: Both drivers expose the same Drizzle ORM interface, ensuring seamless operation across environments
- **CI Infrastructure**: GitHub Actions workflow provisions PostgreSQL 15 service container with health checks for automated testing

Core architectural decisions and features include:
-   **Error Prevention**: Centralized logging, type safety, and a two-layer Error Boundary system.
-   **Authentication System**: Robust session management and triple-layer admin protection.
-   **Builder Hierarchy System**: Manages contacts, agreements, programs, and interactions within a geographic hierarchy.
-   **Bulk Operations**: Multi-select for Photos, Jobs, and Expenses with bulk actions.
-   **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
-   **Analytics Dashboard**: Provides metrics on inspection volume, photo tag analysis, and builder performance.
-   **PDF Export System**: Dynamic PDF generation for reports.
-   **Photo Documentation**: Supports multi-tagging, annotations, OCR, photo-required checklists, offline queue, and compression.
-   **Offline-First Functionality**: Utilizes service workers, IndexedDB, and a custom sync queue.
-   **Automated Calendar Import System**: Smart parsing of calendar events with confidence scoring and automated polling.
-   **Unified Schedule Page**: Production-ready calendar system with role-based visibility and admin assignment controls.
-   **Google Calendar Integration**: Multi-calendar integration with OAuth2 for two-way sync.
-   **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
-   **Gamification & Achievements System**: Tracks predefined achievements.
-   **Database Optimization**: Over 35 strategic database indexes for query performance.
-   **Enterprise Hardening**: **Sentry** integration for error monitoring, multi-layered security (CSRF, rate limiting, Helmet), and secure sessions.
-   **WebSocket Notifications**: Real-time notification system with exponential backoff and HTTP polling fallback.
-   **Database Schema Integrity**: Comprehensive schema synchronization with dedicated columns for tracking.
-   **Report Template System**: JSON-only architecture for report templates, supporting standalone reports and version tracking.
-   **Testing Systems**: Production-grade systems for Blower Door, Duct Leakage, and Ventilation testing with automated calculations.
-   **Equipment Management System**: Production-grade equipment inventory, calibration tracking, and maintenance scheduling.
-   **Scheduled Exports System**: Automated data export system with cron scheduling, multi-format support, and email delivery.
-   **Jobs Management System**: Job tracking with automated compliance evaluation, inspector assignment, and billing notifications.
-   **Job-Type-Specific Workflow System**: Guided step-by-step workflows with job templates, custom checklists, and completion enforcement.
-   **Automated Retest Workflow**: One-click retest job creation for failed tests.
-   **Mobile-Optimized Workflow UI**: Touch-friendly design optimized for field use.
-   **Financial Management System**: Comprehensive standalone financial module with invoicing, payment tracking, expense management, and profitability analytics.
-   **Minnesota Multifamily Compliance Suite**: Complete compliance tracking system for various standards.
-   **Field Day Experience**: Mobile-first daily workload view with role-based access and large touch-friendly status toggle buttons.
-   **Real-Time Sync Infrastructure**: Google Calendar-style live updates using WebSockets.
-   **Flexible Inspection Workflows**: Non-linear workflow system allowing inspectors to jump directly to any step.
-   **Simplified Job Status Workflow**: Streamlined status management (scheduled, done, failed, reschedule).
-   **Construction Manager Report Routing**: Report scheduling system routing completed reports to construction managers.
-   **TEC Auto Test Integration**: Import blower door test results from TEC Auto Test application.
-   **Photo-Based Duct Testing**: Simplified duct leakage testing with manual CFM entry and photo documentation.
-   **Production Readiness Infrastructure**: Includes background job monitoring, enhanced logging/metrics (Prometheus), health check endpoints, and WebSocket scaling documentation.
-   **Feature Maturity & Release Gating System**: AAA Blueprint-compliant release gating with navigation registry, Gatekeeper middleware, route guards, readiness UI components, and a development-mode experimental toggle.
-   **Accessibility Audit Infrastructure**: Production-ready WCAG 2.2 AA compliance testing with Playwright + Axe audits, dual-format reporting, and dashboard integration.
-   **AAA Blueprint Observability System**: Production-grade event tracking and correlation infrastructure with typed analytics events, correlation ID middleware, and comprehensive audit logging.
-   **AAA Blueprint Performance & Quality Gating**: Production-ready Lighthouse and accessibility testing infrastructure with budget enforcement, automated performance runner, and type-safe gatekeeper.

## External Dependencies

-   **Google Calendar API**: For two-way synchronization of schedule events.
-   **Replit Object Storage**: Utilizes Google Cloud Storage for photo uploads.
-   **Neon Serverless PostgreSQL**: Cloud-hosted database.
-   **Sentry**: Error monitoring.
-   **Radix UI**: Headless accessible component primitives.
-   **Recharts**: Chart rendering.
-   **React Big Calendar**: Calendar view component.
-   **Uppy**: File upload component with Webcam plugin.
-   **react-konva** & **konva**: Canvas-based photo annotation.
-   **tesseract.js**: OCR for text extraction.
-   **@react-pdf/renderer**: PDF generation.
-   **React Hook Form**: Form state management and validation.
-   **@hookform/resolvers**: Integration with Zod for form validation.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Sharp**: Server-side image processing for thumbnail generation.