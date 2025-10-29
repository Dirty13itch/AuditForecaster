# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application empowers field inspectors to manage inspections, track jobs, schedule events, and generate reports. Its core purpose is to optimize energy auditing workflows, enhance data accuracy via photo documentation and OCR, and provide robust analytics. Key capabilities include outdoor readability, offline-first operation, and rapid data entry. The project aims to revolutionize field operations with a comprehensive, user-friendly, and powerful mobile solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a **React** and **TypeScript** frontend, built with **Vite**, and **Wouter** for routing. UI components leverage **shadcn/ui** (Radix UI) and **Tailwind CSS**, with a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is built with **Express.js** and **Node.js** in **TypeScript**. **PostgreSQL** (Neon serverless) is the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

Core data entities include Users, Builders, Builder Contacts, Jobs, Schedule Events, Pending Calendar Events, Expenses, Mileage Logs, Photos, Report Templates, and Report Instances.

Key technical implementations and design decisions include:
- **Comprehensive Error Prevention**: Centralized logging, extensive type safety, loading states, null/undefined guards, API error handling, and a two-layer Error Boundary system.
- **Input Validation**: Zod schemas for API and form validation.
- **Development Mode Authentication**: A production-safe authentication bypass system for rapid development using pre-configured test accounts and direct URL access, all securely disabled in production.
- **Bulletproof Authentication System**: Complete authentication rebuild with robust session management featuring validation schema, automatic recovery from corruption, and health monitoring. Triple-layer admin protection ensures shaun.ulrich@ulrichenergyauditing.com (ID: 3pve-s) always maintains admin role. Session health tracking with metrics and diagnostic endpoints (/api/auth/session-health, /api/auth/session-recover). Database integrity checks with comprehensive user ID validation. **Auth Doctor Security Hardening**: Dynamic redirect_uri construction with host validation (REPLIT_DOMAINS allowlist + *.replit.dev suffix checking) prevents header injection attacks. CORS validation tightened with proper suffix matching to block subdomain attacks (e.g., preview.replit.dev.attacker.com). Protocol enforcement (HTTPS in production), comprehensive error logging with 11 reason codes, feature-flagged diagnostic endpoint (/__auth/diag), and auth triage script (scripts/auth-triage.sh) for troubleshooting. Cookie settings hardened for cross-origin support (sameSite=none in production). Preview deploys now fully supported with automatic domain detection. Dev quick-login endpoints work perfectly.
- **Comprehensive Builder Hierarchy System**: Manages builder contacts (with roles and communication preferences), agreements (terms, pricing, status), programs (enrollment, specific settings), and interactions (communication logs). Includes a geographic hierarchy from Development → Lot → Job.
- **Bulk Operations**: Multi-select functionality for Photos, Jobs, and Expenses with bulk actions.
- **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
- **Analytics Dashboard**: Provides metrics on inspection volume, photo tag analysis, and builder performance.
- **PDF Export System**: Uses `@react-pdf/renderer` for professional, dynamic PDF generation.
- **Photo Documentation**: Supports multi-tagging, annotations, OCR via `tesseract.js`, and photo-required checklist items. Features a dual capture system with context-aware auto-linking, offline queue, duplicate detection, compression, and upload to Replit Object Storage. Server-side thumbnail generation is handled by **Sharp**. **Smart Tag Suggestions**: Context-aware tag recommendations based on inspection type during photo upload—field inspectors see relevant tags (e.g., "Pre-Drywall Inspection" suggests insulation, thermal-bypass, air-sealing) with one-tap selection, optional collapsible UI (respects manual close), and mobile-optimized 48px touch targets for rapid field documentation.
- **Photo Cleanup Reminder System**: Tracks upload sessions to prompt users to delete original photos.
- **Offline-First Functionality**: Utilizes service workers, IndexedDB, and a custom sync queue.
- **Automated Calendar Import System**: Smart parsing of calendar events with a three-tier confidence scoring system (High, Medium, Low) for automated job creation or manual review. Features fuzzy matching (Levenshtein distance), deduplication, admin-configurable builder abbreviations, and a dedicated manual review queue and POC testing interface. **Automated Polling**: Production-ready cron job polls the "Building Knowledge" calendar every 6 hours (configurable), with full environment-based configuration, system user validation, and comprehensive error handling. Supports enable/disable, custom schedules, and configurable lookahead windows.
- **Unified Schedule Page with Admin Assignment Workflow**: Production-ready calendar system with role-based visibility - admins see all jobs/events with assignment controls, inspectors see only their assigned jobs. Features responsive design (auto-switches to agenda view on mobile <768px, month view on desktop ≥768px). Admin workflow: UnassignedQueue sidebar (desktop) and UnassignedQueueSheet bottom sheet (mobile) display Building Knowledge pending events permanently (no toggle complexity), with quick-assign buttons ("S" for Shaun, "E" for Erik), bulk assignment mode, and real-time workload indicators. Assignment endpoints (`/api/pending-events/assign`, `/api/pending-events/bulk-assign`) create jobs with `assigned_to` field, update pending event status, and invalidate 4 caches (`/api/pending-events`, `/api/jobs`, `/api/schedule-events`, `/api/inspectors/workload`) to keep all views synchronized. Role-based API filtering: inspectors see only `assigned_to = user.id` jobs, admins see all. Color coding: Orange (#FD7E14) for unassigned events, Blue (#2E5BBA) for Shaun's jobs, Green (#28A745) for Erik's jobs. Admin-only UI guards use `!authLoading && isAdmin === true` pattern to prevent UI leakage during auth resolution. OIDC role persistence: `upsertUser` preserves existing database roles when OIDC claims don't include `role` field, preventing admin demotion on login. **Calendar Quick Status Update**: Field inspectors can update job status directly from Schedule calendar events via dropdown (saves 3-4 clicks per job completion). Features PATCH `/api/jobs/:id/status` endpoint with RBAC (inspectors: assigned_to OR created_by only; admins: all jobs), automatic `completed_date` setting when status changes to 'completed', audit logging with `source: calendar_quick_update`, mobile-optimized 48px touch targets, loading indicators during mutation, and cache invalidation to refresh calendar. Status options: pending, scheduled, in-progress, completed, review. Disabled for viewers/managers.
- **Google Calendar Integration**: Multi-calendar integration with OAuth2 via Replit Connectors, offering two-way sync, event-to-job conversion, all-day event support, and self-healing authentication.
- **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
- **Gamification & Achievements System**: Tracks predefined achievements with automated criteria evaluation, performance optimizations (batch queries, strategic indexes), and a UI for progress tracking and notifications.
- **Database Optimization**: Over 35 strategic database indexes are implemented across key tables (Jobs, Builders, Photos, etc.) for enhanced query performance and efficient data retrieval.
- **Enterprise Hardening**: Includes **Sentry** integration for error monitoring, multi-layered security (CSRF, rate limiting, Helmet, secure sessions), and comprehensive operational documentation.
- **WebSocket Notifications**: Production-ready real-time notification system with exponential backoff reconnection strategy (1s → 30s), automatic fallback to 30-second HTTP polling when WebSocket unavailable, and comprehensive error handling for database failures.
- **Database Schema Integrity**: Comprehensive database column audit and fixes across 15+ tables to ensure complete alignment with Drizzle schema definitions, including:
  - Jobs table: assignment tracking columns (assigned_to, assigned_at, assigned_by, estimated_duration, territory)
  - Photos table: OCR schema prepared (3 columns: ocrText, ocrConfidence, ocrMetadata) - **Feature not implemented**, columns exist but no ingestion logic populates them during photo uploads
  - Expenses table: **Receipt OCR fully implemented** (6 columns) - tesseract.js integration in ReceiptUpload component with text extraction, confidence scoring, smart parsing of amount/vendor/date from receipt images
  - Blower Door Tests: Complete schema synchronization (added 11 missing columns: surface_area, number_of_stories, basement_type, outdoor_temp, indoor_temp, outdoor_humidity, indoor_humidity, code_year, meets_code, weather_correction_applied, created_by) plus reporting integration (report_instance_id, test_time, conditioned_area)
  - Duct Leakage Tests: Reporting integration (report_instance_id, test_time, conditioned_area)
  - Report Templates: Visual designer columns (is_active, components, layout, conditional_rules, calculations, metadata, parent_template_id, version_notes, published_at). **Schema Migration (Oct 2025)**: Removed legacy `sections text NOT NULL` column - schema now uses `components jsonb` for storing component definitions. Migration applied via `ALTER TABLE report_templates DROP COLUMN sections` to align database with Drizzle schema.
  - Report Instances: **Standalone Reports Support (Oct 2025)**: Made `job_id` nullable and added default `template_version = 1` to support creating reports without linking to jobs. Enables flexible report creation from template detail pages.
  - Report Field Values: **Complete schema synchronization (Oct 2025)**: Aligned Drizzle schema to match actual database columns - valueText (value_text), valueNumber (value_number), valueBoolean (value_boolean), valueDate (value_date), valueTime (value_time), valueDatetime (value_datetime), valueJson (value_json), photoIds (photo_ids). Made sectionInstanceId nullable for component-based templates (legacy templates still use sections). Removed non-existent columns (modifiedBy, fieldType) from Drizzle schema. Component-based template fillout now works end-to-end with proper data persistence.
- **Report Template System - JSON-Only Architecture (Oct 2025)**: Complete migration from dual table-based/JSON storage to pure JSON architecture. Removed `template_sections` and `template_fields` tables and all related CRUD operations from storage layer and API routes. Single source of truth is now the `report_templates.components` JSONB column. Navigation pattern uses route-based detail pages (/report-templates/:id) instead of master-detail views. Report creation flow: Template detail page → POST report instance → Navigate to fillout page. System supports standalone reports (no job required) and version tracking. Tested E2E workflow confirms designer → detail → create → fillout → save operates correctly. Known test limitation: Automated E2E tests blocked by CSRF protection in test environment (expected security behavior).
  - Tax Credits: Audit trail columns (updated_at) across 3 tables
  - Financial System: Complete invoice tracking (amount, tax, total, paid_date, payment_method, payment_reference, terms, items)
  - Notification Preferences: User control columns (enabled, in_app_enabled)
  - QA Inspection Scores: Full table implementation for quality assurance tracking

## External Dependencies

### Third-Party Services
-   **Google Calendar API**: For two-way synchronization of schedule events.
-   **Replit Object Storage**: Utilizes Google Cloud Storage for photo uploads.
-   **Neon Serverless PostgreSQL**: Cloud-hosted database.

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