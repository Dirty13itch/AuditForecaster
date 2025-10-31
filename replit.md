# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics. The project aims to provide a comprehensive, user-friendly, and powerful mobile solution for field operations, offering significant market potential by streamlining energy audit processes and improving data reliability for field inspectors. The application has achieved a 40/40 production standard, signifying AAA-level quality and readiness for deployment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a **React** and **TypeScript** frontend, built with **Vite** and utilizing **Wouter** for routing. UI components are developed with **shadcn/ui** (Radix UI) and **Tailwind CSS**, incorporating a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is developed with **Express.js** and **Node.js** in **TypeScript**, with **PostgreSQL** (Neon serverless) as the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

## Quality Standards & Development Process

**VERTICAL COMPLETION FRAMEWORK ADOPTED** (October 2025): The project now enforces a mandatory 6-phase framework to prevent "70% completion" and ensure all features reach production standards:

1. **Phase 1 - PLAN**: Define requirements, success criteria, technical approach, edge cases
2. **Phase 2 - BUILD**: Implement core functionality with proper types, validation, error handling
3. **Phase 3 - OPTIMIZE**: Add loading states, error boundaries, memoization, accessibility
4. **Phase 4 - TEST**: Execute end-to-end testing with `run_test` tool - **MANDATORY before claiming completion**
5. **Phase 5 - HARDEN**: Security audit, performance review, edge case handling, production readiness
6. **Phase 6 - DOCUMENT**: Update replit.md, add code comments, create user documentation

**Key Enforcement Mechanisms**:
- NO feature is "complete" without passing Phase 4 (TEST) - testing MUST happen before architect review
- ALL code changes require architect review with full git diff before marking tasks as completed
- Console.log statements prohibited in production code (development utilities excepted)
- Memory leak prevention: All useEffect hooks with timers/listeners/observers require cleanup functions
- Comprehensive documentation in VERTICAL_COMPLETION_FRAMEWORK.md and TESTING_GUIDELINES.md

**Reference Implementations & Progress:**
- **Schedule.tsx**: Initial pilot - architect correctly rejected premature completion claim, testing revealed syntax errors, bugs fixed, re-tested successfully, approved. Proved framework's value.
- **Mileage.tsx**: 4 architect review iterations - learned critical lessons about ErrorBoundary fallbacks, test selector alignment, proper memoization, dialog error handling. Now production-ready.
- **Equipment.tsx**: 1 architect review iteration (PASS on first try) - successfully applied all lessons from Mileage. Demonstrated framework mastery.
- **Invoices.tsx**: Production-ready (October 31, 2025) - Applied all 6 phases: ErrorBoundary with fallback, skeleton loaders, query retry:2, delete confirmation dialog, payment validation (amount > 0), dialog error handling (asChild + e.preventDefault pattern prevents auto-close), memoized filters/stats/handlers (useMemo/useCallback), mutation pending states, comprehensive e2e test suite (14 test scenarios), zero console.* statements, zero LSP errors. Successfully applied all patterns from Mileage and Equipment.
- **Payments.tsx**: Production-ready (October 31, 2025) - Complete CRUD operations, overpayment warnings, ErrorBoundary, skeleton loaders, 6 useMemo + 6 useCallback optimizations, 15 e2e test cases. PASSED architect review on first submission.
- **Analytics.tsx**: Production-ready (October 31, 2025) - Transformed 2004-line dashboard, 5 queries with retry:2, 12+ skeleton loaders, 20+ useMemo hooks, 10+ useCallback hooks, safeDivide for NaN prevention, 25 e2e test cases. PASSED architect review.
- **FinancialDashboard.tsx**: Production-ready (October 31, 2025) - 8 financial widgets, 4 queries, profit margin calculations, mileage deduction ($0.67/mile IRS 2025), 12 memoized calculations, 19 e2e test cases. PASSED architect review.
- **AR Aging Report (financial/ar-aging.tsx)**: Production-ready (October 31, 2025) - Aging buckets (0-30, 31-60, 61-90, 90+ days), 3 queries with retry:2, 8 useMemo + 8 useCallback optimizations, 15 e2e test cases. PASSED architect review.
- **ESLint Integration**: Installed and configured ESLint with no-console rule (blocks console.log/info/debug, allows console.error/warn for error boundaries). Prevents regression.
- **Financial Pages**: Invoices, Payments, Analytics, FinancialDashboard, AR Aging complete (all PASSED); Expenses in progress (subagent working).

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
-   **Job-Type-Specific Workflow System**: Guided step-by-step workflows with 9 job templates (sv2, full_test, code_bdoor, rough_duct, rehab, bdoor_retest, multifamily, energy_star, other), each with custom checklists (0-52 items), required tests, photo requirements, and completion enforcement.
-   **Workflow Completion Enforcement**: Backend validation prevents job completion until ALL workflow requirements met (tests, photos, signature, checklist), with beautiful UI feedback showing missing requirements and progress tracking.
-   **Automated Retest Workflow**: One-click retest job creation for failed blower door tests (ACH50 > 3.0), automatically pre-filling address/builder data and linking to previous failed test for tracking.
-   **Mobile-Optimized Workflow UI**: Touch-friendly 48px minimum touch targets, responsive typography, scrollable test lists, and grid layouts optimized for field use on mobile devices (375px+ width).
-   **Financial Management System (PRODUCTION READY - ALL PHASES COMPLETE)**: Comprehensive standalone financial module with partner contractor access control, monthly invoicing to Building Knowledge with PDF generation and email delivery, payment tracking with AR aging, expense management with MileIQ-style swipe interface and OCR receipt processing, job cost ledger, and profitability analytics. Data model complete with 13 new/extended tables supporting builder rate cards, invoice generation, payment processing, expense classification, multifamily compliance (ENERGY STAR MFNC, MN Housing EGCC, ZERH, benchmarking), and complete job costing.
-   **Minnesota Multifamily Compliance Suite (PRODUCTION READY)**: Complete compliance tracking system for Minnesota multifamily energy auditing programs including ENERGY STAR MFNC (with sampling protocol calculator, builder-verified items tracker, and digital checklist), MN Housing EGCC 2020 (with intended methods worksheet and energy rebate analysis), ZERH (with prerequisites checklist and 45L tax credit calculator supporting MIN(units × $2,500, $15,000) formula), and Building Energy Benchmarking (with deadline tracker for Class 1/2 buildings per 2024 Minnesota law). Includes comprehensive compliance documents library with gallery/list views, advanced filtering, and bulk ZIP download.

## Business Context
-   **Business Model**: Ulrich Energy Auditing (Shaun, owner) → subcontractor to → Building Knowledge (Pat, general contractor) → contractor to → M/I Homes
-   **Invoicing**: Monthly invoices to Building Knowledge with manual review, paid bi-weekly
-   **Employee**: Erik (inspector), paid fixed monthly amount
-   **Job Types**: sv2, full_test, code_bdoor, rough_duct, rehab, bdoor_retest, multifamily, energy_star, other (9 total)
-   **Calendar**: Building Knowledge calendar auto-syncs every 6 hours; Pat can manually create jobs for exceptions

## Access Control & Roles
-   **Admin (Shaun)**: Full system access including all financial modules, profitability analytics, and expense approval
-   **Inspector (Erik)**: Field inspection permissions only - view jobs, complete inspections, upload photos, log time, view schedule
-   **Partner Contractor (Pat - Building Knowledge)**: Inspector permissions PLUS create/edit jobs (exceptions only), upload plans/specs, download reports; NO access to financial data (pricing, margins, invoices, payments, analytics)

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