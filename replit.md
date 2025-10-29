# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics. The project aims to provide a comprehensive, user-friendly, and powerful mobile solution for field operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a **React** and **TypeScript** frontend, built with **Vite** and utilizing **Wouter** for routing. UI components are developed with **shadcn/ui** (Radix UI) and **Tailwind CSS**, incorporating a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is developed with **Express.js** and **Node.js** in **TypeScript**, with **PostgreSQL** (Neon serverless) as the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

Core architectural decisions and features include:
-   **Comprehensive Error Prevention**: Centralized logging, extensive type safety, and a two-layer Error Boundary system.
-   **Bulletproof Authentication System**: Robust session management with health monitoring, triple-layer admin protection, and enhanced security measures.
-   **Builder Hierarchy System**: Manages contacts, agreements, programs, and interactions, including a geographic hierarchy (Development → Lot → Job).
-   **Bulk Operations**: Multi-select functionality for Photos, Jobs, and Expenses with bulk actions.
-   **Search & Filtering**: Advanced search across Jobs, Builders, and Photos with real-time filtering and pagination.
-   **Analytics Dashboard**: Provides metrics on inspection volume, photo tag analysis, and builder performance.
-   **PDF Export System**: Uses `@react-pdf/renderer` for professional, dynamic PDF generation.
-   **Photo Documentation**: Supports multi-tagging, annotations, OCR via `tesseract.js`, photo-required checklists, dual capture with auto-linking, offline queue, duplicate detection, compression, and smart tag suggestions.
-   **Offline-First Functionality**: Utilizes service workers, IndexedDB, and a custom sync queue.
-   **Automated Calendar Import System**: Smart parsing of calendar events with confidence scoring, fuzzy matching, deduplication, and automated polling.
-   **Unified Schedule Page with Admin Assignment Workflow**: Production-ready calendar system with role-based visibility, responsive design, admin assignment controls, and quick status update capabilities for field inspectors.
-   **Google Calendar Integration**: Multi-calendar integration with OAuth2 via Replit Connectors for two-way sync.
-   **Conditional Logic**: Dynamic inspection forms driven by a conditional logic engine.
-   **Gamification & Achievements System**: Tracks predefined achievements with automated criteria evaluation.
-   **Database Optimization**: Over 35 strategic database indexes across key tables for enhanced query performance.
-   **Enterprise Hardening**: Includes **Sentry** integration for error monitoring, multi-layered security (CSRF, rate limiting, Helmet), and secure sessions.
-   **WebSocket Notifications**: Real-time notification system with exponential backoff and HTTP polling fallback.
-   **Database Schema Integrity**: Comprehensive schema synchronization across all tables, including dedicated columns for assignment tracking, OCR, financial tracking, and notification preferences.
-   **Report Template System - JSON-Only Architecture**: Complete migration to a pure JSON architecture for report templates, supporting standalone reports and version tracking.
-   **Blower Door Testing System**: Production-grade multi-point pressure testing with automated ACH50 calculations, weather/altitude corrections, and Minnesota 2020 Energy Code compliance verification (≤3.0 ACH50 limit). Features 59-column database schema, multi-point regression analysis, ring configuration support (Open, Ring A-D), ELA calculations, and automated compliance checking. Complete with comprehensive runbook, 12-test smoke suite, and 8 realistic seed scenarios.
-   **Duct Leakage Testing System**: Production-grade duct airtightness testing supporting Total Duct Leakage (TDL) and Duct Leakage to Outside (DLO) per Minnesota 2020 Energy Code. Features 60-column database schema, automated calculations with Minneapolis Duct Blaster calibration factors, pressure pan diagnostic testing, real-time compliance verification (TDL ≤4.0, DLO ≤3.0 CFM25/100 sq ft), and job compliance status updates. Complete with comprehensive runbook, 12-test smoke suite, and 10 realistic test scenarios covering pass/fail conditions.
-   **Equipment Management System**: Production-grade equipment inventory, calibration tracking, maintenance scheduling, and checkout workflows for RESNET-certified field equipment. Features 4-table architecture (equipment, calibrations, maintenance, checkouts), 23 API endpoints, 9 equipment types (blower doors, duct testers, manometers, cameras, etc.), QR code generation, automatic due date calculations, checkout/check-in workflows, and comprehensive alerts. Supports RESNET annual calibration requirements and Minnesota Energy Code compliance verification. Complete with comprehensive runbook, 17-test smoke suite, and 10 realistic equipment scenarios.
-   **Scheduled Exports System**: Production-grade automated data export system with cron scheduling, multi-format support (CSV, JSON), and email delivery. Features 17-column database schema, 8 API endpoints with multi-tenant security, conditional email delivery, timezone-aware cron parsing (America/Chicago), test run capabilities, and dynamic export generation (jobs, financial, photos). Supports daily/weekly/monthly schedules with comprehensive next-run calculations. Complete with runbook, 15-test smoke suite, and 8 realistic scheduling scenarios.

## Production-Ready Features (Vertical Slice Completion)

The following features have completed vertical development with full production artifacts:

1. **Mileage Tracking** (40/40 ✅)
   - Runbook: `MILEAGE_SLICE.md`
   - Smoke Tests: `scripts/smoke-test-mileage.sh`
   - Seed Data: `db/seed-mileage.sql`
   - Compliance: Checklist integrated

2. **Expenses Management** (40/40 ✅)
   - Runbook: `EXPENSES_SLICE.md`
   - Smoke Tests: `scripts/smoke-test-expenses.sh`
   - Seed Data: `db/seed-expenses.sql`
   - Compliance: Checklist integrated

3. **Report Templates** (40/40 ✅)
   - Runbook: `REPORT_TEMPLATE_SLICE.md`
   - Smoke Tests: `scripts/smoke-test-report-templates.sh`
   - Seed Data: `db/seed-report-templates.sql`
   - Compliance: Checklist integrated

4. **Calendar Integration** (40/40 ✅)
   - Runbook: `CALENDAR_SLICE.md`
   - Smoke Tests: `scripts/smoke-test-calendar.sh`
   - Seed Data: `db/seed-calendar.sql`
   - Compliance: `CALENDAR_COMPLIANCE.md`

5. **Blower Door Testing** (40/40 ✅)
   - Runbook: `BLOWER_DOOR_SLICE.md` (1,200+ lines)
   - Smoke Tests: `scripts/smoke-test-blower-door.sh` (12 tests)
   - Seed Data: `db/seed-blower-door.sql` (8 scenarios)
   - Compliance: `BLOWER_DOOR_COMPLIANCE.md`
   - Technical Details: Multi-point regression, ACH50 calculations, Minnesota Energy Code (3.0 ACH50), weather/altitude corrections, ring configurations, ELA calculations

6. **Duct Leakage Testing** (40/40 ✅)
   - Runbook: `DUCT_LEAKAGE_SLICE.md` (900+ lines)
   - Smoke Tests: `scripts/smoke-test-duct-leakage.sh` (12 tests)
   - Seed Data: `db/seed-duct-leakage.sql` (10 scenarios)
   - Compliance: `DUCT_LEAKAGE_COMPLIANCE.md`
   - Technical Details: Total Duct Leakage (TDL ≤4.0 CFM25/100 sq ft), Duct Leakage to Outside (DLO ≤3.0 CFM25/100 sq ft), Minnesota 2020 Energy Code, pressure pan testing, Minneapolis Duct Blaster calibration (Open C=110, Ring 1 C=71, Ring 2 C=46, Ring 3 C=31), automated calculations, 60-column schema, 6 API endpoints

7. **Equipment Management** (40/40 ✅)
   - Runbook: `EQUIPMENT_SLICE.md` (1,850+ lines)
   - Smoke Tests: `scripts/smoke-test-equipment.sh` (17 tests, executable)
   - Seed Data: `db/seed-equipment.sql` (10 scenarios)
   - Compliance: `EQUIPMENT_COMPLIANCE.md`
   - Technical Details: 4 tables (equipment, equipmentCalibrations, equipmentMaintenance, equipmentCheckouts), 23 API endpoints, 9 equipment types, calibration/maintenance tracking, checkout system, QR codes, RESNET compliance

8. **Scheduled Exports** (40/40 ✅)
   - Runbook: `SCHEDULED_EXPORTS_SLICE.md` (750+ lines)
   - Smoke Tests: `scripts/smoke-test-scheduled-exports.sh` (15 tests)
   - Seed Data: `db/seed-scheduled-exports.sql` (8 scenarios)
   - Compliance: `SCHEDULED_EXPORTS_COMPLIANCE.md`
   - Technical Details: 17-column schema with 5 indexes, 8 API endpoints with userId verification, cron scheduling (America/Chicago timezone), multi-format export (CSV/JSON), conditional email delivery, test run capability, next-run calculation, multi-tenant security (updateScheduledExportSchema prevents ownership reassignment)

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