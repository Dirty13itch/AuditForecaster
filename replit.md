# Energy Auditing Field Application

## Overview

This full-stack energy auditing field application is designed for field inspectors to manage inspections, track jobs, schedule events, and generate reports. Its primary purpose is to streamline energy auditing workflows, improve data accuracy through photo documentation and OCR, and provide robust analytics. Key features include outdoor readability, offline-first functionality, and rapid data entry. The business vision is to transform field operations with a comprehensive, user-friendly, and powerful mobile solution.

## Recent Changes

### 2025-10-26: Fixed Integration Test Data Isolation
**Critical Fix**: Resolved integration test cleanup issue that was deleting seeded M/I Homes abbreviations from the database, causing test failures and breaking manual workflows.

**Changes Made**:
- **Removed destructive cleanup** from `tests/calendarImport.integration.test.ts` beforeEach hook (lines 51-57) that was deleting builder abbreviations for 'mi-homes-builder'
- **Changed test abbreviation** from "TESTMI" to "INTTEST" to ensure complete isolation from production/seeded data
- **Updated all test events** to use the new "INTTEST" abbreviation across all 8 integration tests
- **Added documentation** explaining the fix to prevent future similar issues

**Impact**:
- All 8 calendar import integration tests pass successfully
- Test isolation is complete - no touching of seeded M/I Homes data
- Fuzzy matching tests still work correctly with "inttest." matching "INTTEST"
- No TypeScript/LSP errors
- Existing cleanup in afterEach remains intact (deletes test data by testBuilderId)

**Test Coverage**:
- High-confidence event auto-import (≥80%)
- Medium-confidence event with review queue (60-79%)
- Low-confidence event manual review only (<60%)
- Duplicate prevention via google_event_id
- Batch import with mixed confidence scores
- Events without summary handling
- Complete event metadata storage
- All-day event support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application features a **React** and **TypeScript** frontend, built with **Vite**, using **Wouter** for routing. UI components are built with **shadcn/ui** (Radix UI) and styled with **Tailwind CSS**, optimized for outdoor readability with a custom color system. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first capabilities.

The backend uses **Express.js** with **Node.js** and **TypeScript**. **PostgreSQL** (Neon serverless) is the primary database, accessed via **Drizzle ORM** for type-safe queries. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

Core data entities include Users, Builders, Builder Contacts, Jobs, Schedule Events, Expenses, Mileage Logs, Photos, Report Templates, and Report Instances, with relationships linking them for comprehensive data management.

Key technical implementations include:
- **Comprehensive Error Prevention**: Centralized logging, extensive type safety, loading states, null/undefined guards, API error handling, and a two-layer Error Boundary system.
- **Input Validation**: Zod schemas for API and form validation.
- **Development Mode Authentication**: Production-safe authentication bypass system for rapid development testing:
  - **Test Users**: Three pre-configured test accounts (test-admin, test-inspector1, test-inspector2) with different role permissions for comprehensive workflow testing
  - **Quick Login Methods**: 
    - Banner buttons displayed when dev mode is active (visible at top of development environment)
    - Direct URL access: `/api/dev-login/test-admin`, `/api/dev-login/test-inspector1`, `/api/dev-login/test-inspector2`
  - **Production Safety**: All dev login endpoints return 404 in production (`NODE_ENV=production`), making them completely inaccessible outside development
  - **Audit Logging**: All dev mode logins are logged to audit trail with `dev_login` action type, including user agent and IP address for security tracking
  - **Session Management**: Dev logins establish full passport sessions with 1-week expiry, identical to OAuth flow for realistic testing
  - **Status Endpoint**: `/api/dev/status` provides dev mode state and active session information (also returns 404 in production)
- **Comprehensive Builder Hierarchy System**: Full hierarchical organization of builder relationships:
  - **Builder Contact Management**: Multiple contacts per builder (3-5 typical) with role designations (Superintendent, Project Manager, Owner, Estimator, Office Manager, Other), primary contact designation, communication preferences (phone/email/text), and detailed notes. Backend enforces single-primary-per-builder invariants through dedicated schemas and transactional updates.
  - **Builder Agreements**: Contract management with agreement terms, start/end dates, default pricing, payment terms, and inspection types covered. Supports active/expired status tracking.
  - **Builder Programs**: Program enrollment tracking for 45L tax credit, ENERGY STAR, and local utility programs, with program-specific settings and active status management.
  - **Builder Interactions**: Comprehensive communication log capturing calls, emails, meetings, and notes in chronological timeline view with contact references.
  - **Geographic Hierarchy**: Complete address structure from Development → Lot → Job:
    - **Developments**: Builder-specific developments with region, municipality, address, and status tracking
    - **Lots**: Individual lots within developments with lot number, phase, block, street address, and plan references
    - **Jobs**: Link to lots for automatic address population while maintaining address override capability
  - All components feature full CRUD operations with proper RBAC (admin/inspector roles), audit logging, CSRF protection, and optimistic UI updates.
- **Bulk Operations**: Multi-select functionality for Photos, Jobs, and Expenses with bulk delete, export, and tag management.
- **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
- **Analytics Dashboard**: Metrics on inspection volume, photo tag analysis, and builder performance with date range filtering.
- **PDF Export System**: Uses `@react-pdf/renderer` for professional, multi-section PDF generation with dynamic content.
- **Photo Documentation**: Supports multi-tag systems, annotations, OCR text extraction via `tesseract.js`, and photo-required checklist items.
- **Dual Photo Capture System**: Native gallery selection and enhanced in-app web camera, with context-aware auto-linking, offline queue, SHA-256 duplicate detection, automatic compression, and upload to Replit Object Storage.
- **Server-Side Thumbnail Generation**: Automatic thumbnail creation for uploaded photos using **Sharp** for optimized gallery display.
- **Photo Cleanup Reminder System**: Tracks upload sessions to remind users to delete original photos from personal devices.
- **Offline-First Functionality**: Achieved through service workers, IndexedDB, and a custom sync queue.
- **Google Calendar Integration**: Multi-calendar integration with OAuth2 via Replit Connectors, featuring two-way sync, event-to-job conversion, all-day event support, and a self-healing authentication system for token refresh.
- **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
- **Gamification & Achievements System**: Production-ready achievement tracking with 10 predefined achievements (Elite Performer, Excellence Streak, Perfect Week, Century Club, 500 Club, Perfect Score, Builder Partnership, Tax Credit Milestone, Speed Demon, Consistency King). Features:
  - **Achievement Service**: Automated criteria evaluation engine that checks ACH50 thresholds, job counts, consecutive passing inspections within 7-day windows, daily streaks (ignoring unscheduled jobs), perfect checklist completion rates, and builder relationships
  - **Performance Optimizations**: Batch query system (`getChecklistItemsByJobs`) eliminates N+1 database queries for perfect completion checks, with 24 strategic indexes supporting rapid achievement calculations
  - **UI Integration**: AchievementsPanel displays earned vs locked achievements with tier badges (bronze/silver/gold/platinum), progress tracking, manual "Check Achievements" trigger, toast notifications for newly earned achievements
  - **Data Integrity**: Achievement awards protected by unique constraints, null-safe date handling, and calendar-aware streak calculations
  - **Auto-Seeding**: Achievements automatically seed on development server startup for immediate availability

Enterprise hardening includes **35+ strategic database indexes** optimized for query performance:
- **Jobs table**: builder_id, scheduled_date, (status, scheduled_date), created_by, address, (status, created_by), lot_id for RBAC filtering and geographic hierarchy lookups
- **Builders table**: company_name, (name, company_name) for search prefix matching
- **Builder Contacts table**: (builder_id, name), (builder_id, is_primary) for contact lookups and primary contact queries
- **Builder Agreements table**: (builder_id, start_date), (builder_id, status), end_date for active agreement queries
- **Builder Programs table**: (builder_id, program_type), (builder_id, is_active) for program enrollment lookups
- **Builder Interactions table**: (builder_id, interaction_date), builder_contact_id for timeline queries
- **Developments table**: (builder_id, name), region, municipality for geographic searches
- **Lots table**: (development_id, lot_number), (development_id, phase, block) for hierarchical lot queries
- **Photos table**: (job_id, uploaded_at), hash, tags (GIN array index), checklist_item_id (partial index WHERE NOT NULL)
- **Schedule Events table**: (job_id, start_time), google_event_id, (start_time, end_time) for calendar range queries
- **Audit Logs table**: user_id, (resource_type, resource_id), timestamp, action
- **Email Preferences table**: user_id, unsubscribe_token (unique constraint)
- **Additional indexes**: on forecasts, expenses, report_instances, checklist_items, google_events, sessions

Other enterprise features include **Sentry** integration for error monitoring and observability (backend and frontend), multi-layered security controls (CSRF protection, rate limiting, Helmet, secure sessions), and comprehensive operational documentation for deployment, backup, and disaster recovery.

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

### Development Tools
-   **Replit-specific plugins**: For enhanced development environment.

### Form Handling
-   **React Hook Form**: Form state management and validation.
-   **@hookform/resolvers**: Integration with Zod for form validation.

### Styling
-   **Tailwind CSS**: Utility-first CSS framework.

### Build & Runtime
-   **esbuild**: Server bundling.
-   **tsx**: TypeScript execution for development.
-   **luxon**: Date/time library with timezone and DST support.

### Image Processing
-   **Sharp**: Server-side image processing for thumbnail generation.