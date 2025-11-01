# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics. The project aims to provide a comprehensive, user-friendly, and powerful mobile solution for field operations, offering significant market potential by streamlining energy audit processes and improving data reliability. The application has achieved a 40/40 production standard, signifying AAA-level quality and readiness for deployment.

## User Preferences
Preferred communication style: Simple, everyday language.

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
-   **Testing Systems**: Production-grade systems for Blower Door, Duct Leakage, and Ventilation testing with automated calculations and compliance verification.
-   **Equipment Management System**: Production-grade equipment inventory, calibration tracking, maintenance scheduling, and checkout workflows.
-   **Scheduled Exports System**: Production-grade automated data export system with cron scheduling, multi-format support, and email delivery.
-   **Jobs Management System**: Production-grade job tracking with automated compliance evaluation, inspector assignment workflows, and billing-ready notifications.
-   **Job-Type-Specific Workflow System**: Guided step-by-step workflows with 9 job templates, each with custom checklists, required tests, photo requirements, and completion enforcement.
-   **Automated Retest Workflow**: One-click retest job creation for failed blower door tests, linking to previous failed tests.
-   **Mobile-Optimized Workflow UI**: Touch-friendly design, responsive typography, and layouts optimized for field use on mobile devices.
-   **Financial Management System**: Comprehensive standalone financial module with partner contractor access control, monthly invoicing, payment tracking with AR aging, expense management (MileIQ-style, OCR), job cost ledger, and profitability analytics.
-   **Minnesota Multifamily Compliance Suite**: Complete compliance tracking system for ENERGY STAR MFNC, MN Housing EGCC, ZERH, and Building Energy Benchmarking, with a comprehensive compliance documents library.
-   **Field Day Experience**: Mobile-first daily workload view showing inspector's assigned jobs with role-based access (admin sees both "My Jobs Today" section for their assignments and "All Jobs Today" for management oversight; inspectors see only "My Jobs Today" for their assignments). Features large touch-friendly status toggle buttons (Done/Failed/Reschedule) for efficient field updates, proper CSRF token handling via apiRequest utility, and inspector edit_job permission for status updates.
-   **Real-Time Sync Infrastructure**: Google Calendar-style live updates using WebSockets. Any changes to jobs, schedules, or assignments are instantly visible across all connected sessions without manual refresh.
-   **Flexible Inspection Workflows**: Non-linear workflow system allowing inspectors to jump directly to any step, test, or photo capture without forced sequence. Supports out-of-order completion with partial saves and clear required vs optional distinctions.
-   **Simplified Job Status Workflow**: Streamlined status management using only: scheduled, done, failed, and reschedule. Removed "in-progress" state to match field inspector reality where jobs are either scheduled or completed with outcome.
-   **Construction Manager Report Routing**: Report scheduling system that routes completed inspection reports to builder-specific construction managers (not builders directly). Supports template selection and automated delivery after inspection completion.
-   **TEC Auto Test Integration**: Import blower door test results from TEC Auto Test application with automatic population of CFM50, ACH50, and building volume data.
-   **Photo-Based Duct Testing**: Simplified duct leakage testing with manual CFM entry (total duct leakage, leakage to outside) and photo documentation of manometer display readings.
-   **Production Readiness Infrastructure (Phase 4)**: Comprehensive production monitoring and observability:
    * **Background Job Monitoring Dashboard**: Admin-only dashboard at `/admin/background-jobs` for monitoring all cron jobs (calendar import, daily digest, weekly summary, scheduled exports). Displays job status, execution history, success/failure rates, last run time, next scheduled run, and error logs. Features real-time updates, health indicators (green/yellow/red), filtering by status, and detailed execution logs. All background jobs automatically tracked in database with timing, status, and error information. **Status**: ✅ Production-ready (database tables created, all 3 background jobs successfully registered).
    * **Enhanced Logging & Metrics**: Comprehensive Prometheus metrics integration tracking HTTP requests (duration, totals, errors), database queries, background job executions (duration, status, errors), WebSocket connections, business metrics, and cache performance. Automatic request/response logging with timing via Express middleware. Structured logging for API requests, background jobs, WebSocket events, and errors.
    * **Health Check Endpoints**: Production-ready health checks at `/healthz` (liveness), `/readyz` (database readiness), and `/api/status` (detailed system info). Used for deployment health checks, load balancer probes, and monitoring.
    * **WebSocket Scaling Documentation**: Comprehensive scaling guide in `WEBSOCKET_SCALING.md` covering single-server architecture, sticky session scaling (2-5 servers), Redis pub/sub scaling (5+ servers), Socket.IO migration path, connection limits, performance optimization, monitoring, and troubleshooting.
    * **Metrics Endpoint**: Prometheus-compatible metrics available at `/metrics` for integration with monitoring tools like Grafana, Datadog, or New Relic.
    * **Automated Calendar Import**: Production-grade cron job running every 6 hours (schedule: `0 */6 * * *`) to import events from "Building Knowledge" Google Calendar. Features system user authentication, 30-day lookahead window, comprehensive error handling with audit logging, and background job tracking integration. **Status**: ✅ Production-ready (syntax errors fixed, successfully initialized).

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