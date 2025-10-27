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
- **Comprehensive Builder Hierarchy System**: Manages builder contacts (with roles and communication preferences), agreements (terms, pricing, status), programs (enrollment, specific settings), and interactions (communication logs). Includes a geographic hierarchy from Development → Lot → Job.
- **Bulk Operations**: Multi-select functionality for Photos, Jobs, and Expenses with bulk actions.
- **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
- **Analytics Dashboard**: Provides metrics on inspection volume, photo tag analysis, and builder performance.
- **PDF Export System**: Uses `@react-pdf/renderer` for professional, dynamic PDF generation.
- **Photo Documentation**: Supports multi-tagging, annotations, OCR via `tesseract.js`, and photo-required checklist items. Features a dual capture system with context-aware auto-linking, offline queue, duplicate detection, compression, and upload to Replit Object Storage. Server-side thumbnail generation is handled by **Sharp**.
- **Photo Cleanup Reminder System**: Tracks upload sessions to prompt users to delete original photos.
- **Offline-First Functionality**: Utilizes service workers, IndexedDB, and a custom sync queue.
- **Automated Calendar Import System**: Smart parsing of calendar events with a three-tier confidence scoring system (High, Medium, Low) for automated job creation or manual review. Features fuzzy matching (Levenshtein distance), deduplication, admin-configurable builder abbreviations, and a dedicated manual review queue and POC testing interface. **Automated Polling**: Production-ready cron job polls the "Building Knowledge" calendar every 6 hours (configurable), with full environment-based configuration, system user validation, and comprehensive error handling. Supports enable/disable, custom schedules, and configurable lookahead windows.
- **Calendar Management System**: Production-ready high-volume event processing interface for processing ~150 weekly events from Building Knowledge Google Calendar. Features instant sync on page load with 2-minute background polling, pending queue with confidence-based color coding (Green >85%, Yellow 60-85%, Red <60%, Gray unmatched), 7 smart filters (status, builder, confidence, date range, job type, unmatched-only, sort by date/confidence/import), Week Overview Dashboard with Recharts visualization showing inspector workload per day (Shaun/Erik) with capacity indicators (Green <4, Yellow 4-6, Red >6), assignment modal with workload comparison, Quick Add Builder flow for unmatched events, and bulk operations (select all, assign multiple events to inspector with single click). Event parser intelligently extracts job types (SV2→pre_drywall, Test→final, Test - Spec→final_special) and matches builders using abbreviations array with 95% confidence for exact matches. Admin-only interface with role-based protection, comprehensive audit trail, and 30+ data-testid attributes for testing.
- **Google Calendar Integration**: Multi-calendar integration with OAuth2 via Replit Connectors, offering two-way sync, event-to-job conversion, all-day event support, and self-healing authentication.
- **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
- **Gamification & Achievements System**: Tracks predefined achievements with automated criteria evaluation, performance optimizations (batch queries, strategic indexes), and a UI for progress tracking and notifications.
- **Database Optimization**: Over 35 strategic database indexes are implemented across key tables (Jobs, Builders, Photos, etc.) for enhanced query performance and efficient data retrieval.
- **Enterprise Hardening**: Includes **Sentry** integration for error monitoring, multi-layered security (CSRF, rate limiting, Helmet, secure sessions), and comprehensive operational documentation.
- **WebSocket Notifications**: Production-ready real-time notification system with exponential backoff reconnection strategy (1s → 30s), automatic fallback to 30-second HTTP polling when WebSocket unavailable, and comprehensive error handling for database failures.
- **Database Schema Integrity**: Comprehensive database column audit and fixes across 15+ tables to ensure complete alignment with Drizzle schema definitions, including:
  - Jobs table: assignment tracking columns (assigned_to, assigned_at, assigned_by, estimated_duration, territory)
  - Photos table: Complete OCR integration (12 columns for text extraction, confidence scores, language detection)
  - Blower Door & Duct Leakage Tests: Reporting integration (report_instance_id, test_time, conditioned_area)
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