# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application empowers field inspectors to manage inspections, track jobs, schedule events, and generate reports. Its core purpose is to optimize energy auditing workflows, enhance data accuracy via photo documentation and OCR, and provide robust analytics. Key capabilities include outdoor readability, offline-first operation, and rapid data entry. The project aims to revolutionize field operations with a comprehensive, user-friendly, and powerful mobile solution, enhancing efficiency and data integrity in field operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a **React** and **TypeScript** frontend, built with **Vite**, and **Wouter** for routing. UI components leverage **shadcn/ui** (Radix UI) and **Tailwind CSS**, with a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is built with **Express.js** and **Node.js** in **TypeScript**. **PostgreSQL** (Neon serverless) is the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

## Planned Features

### **MileIQ-Style Mileage Tracking (Vertical Slice - ✅ COMPLETE)**
**User Story**: As a field inspector, I can have my drives automatically detected and quickly classify them with a swipe gesture (business/personal) so that I can effortlessly track tax-deductible mileage without manual start/stop actions.

**Completed Features** (October 2025):
- ✅ Backend API (4 production-ready endpoints with N+1 optimization, rate limiting, RBAC)
- ✅ Swipe-to-classify UI with framer-motion animations and dual accessibility buttons
- ✅ Enhanced monthly summary with updated IRS rate ($0.70/mile for 2025)
- ✅ CSV export for tax reporting (IRS-compliant format)
- ✅ Comprehensive error handling (useEffect toasts, retry buttons, truthful error states)
- ✅ E2E testing completed (all scenarios passing)
- ✅ Sidebar navigation link added for feature discoverability

**Production Artifacts**:
- ✅ MILEAGE_SLICE.md (1,200+ line runbook)
- ✅ scripts/smoke-test.sh (7-step automated verification)
- ✅ db/seed-mileage.sql (6 sample drives)
- ✅ 40/40 vertical slice compliance
- ✅ Health endpoint enhanced with commit SHA tracking

### **Expenses Tracking with OCR Receipt Processing (Vertical Slice - ✅ COMPLETE)**
**User Story**: As a field inspector managing multiple job sites, I can log business expenses via receipt photo upload with OCR, so that I can accurately track tax-deductible costs without manual data entry.

**Completed Features** (October 2025):
- ✅ Backend API (7 production-ready endpoints: CRUD + bulk delete + CSV export)
- ✅ Receipt upload with Tesseract.js OCR auto-fill (vendor, amount, date extraction)
- ✅ 13 expense categories (fuel, equipment, supplies, meals, lodging, tools, etc.)
- ✅ Monthly statistics dashboard with category breakdown
- ✅ CSV export for accounting (QuickBooks/Excel-ready format)
- ✅ Job linking (associate expenses with specific inspections)
- ✅ Tax-deductible tracking and reporting
- ✅ Bulk operations (delete up to 200 expenses at once)
- ✅ Comprehensive error handling with retry logic

**Production Artifacts**:
- ✅ EXPENSES_SLICE.md (1,200+ line comprehensive runbook)
- ✅ scripts/smoke-test-expenses.sh (10-test automated verification)
- ✅ db/seed-expenses.sql (13 sample expenses with realistic OCR data)
- ✅ EXPENSES_COMPLIANCE.md (40/40 vertical slice compliance checklist)
- ✅ Full API documentation with curl examples

**API Contract**:
- `GET /api/expenses` - List expenses (with pagination and job filter)
- `POST /api/expenses` - Create expense with validation
- `GET /api/expenses/:id` - Fetch single expense
- `PUT /api/expenses/:id` - Update expense (partial updates supported)
- `DELETE /api/expenses/:id` - Delete single expense
- `DELETE /api/expenses/bulk` - Bulk delete (max 200)
- `POST /api/expenses/export` - Export CSV/JSON (max 1000)
- `GET /api/expenses-by-category` - Monthly stats aggregation

**Technical Architecture**:
- **Backend Optimization**: Database indexes on (job_id, date, date+category) for sub-50ms aggregations
- **OCR Processing**: Client-side Tesseract.js with 70-95% typical confidence scores
- **Image Optimization**: Sharp library compresses receipts by 60-80% (max 1920x1920)
- **Security**: CSRF protection, rate limiting (100 req/15min), Zod validation, parameterized queries
- **Performance**: P95 < 200ms for list/stats endpoints, bulk operation limits prevent timeouts
- **Observability**: JSON structured logs, correlation IDs, duration tracking, health endpoints

**Out of Scope (Future Enhancements)**:
- Recurring expense templates
- Budget limits and alerts  
- Credit card transaction import
- Expense approval workflow
- Multi-currency support

**API Contract**:
- `GET /api/mileage/unclassified` - Fetch drives awaiting classification (returns {drives: MileageLog[]})
- `PUT /api/mileage/:id/classify` - Classify drive as business/personal
- `GET /api/mileage/summary?month=YYYY-MM` - Monthly statistics (totalDrives, businessMiles, personalMiles, taxDeduction)
- `GET /api/mileage/export?month=YYYY-MM&format=csv` - IRS-compliant export

**Technical Architecture**:
- **Backend Optimization**: JSON aggregation eliminates N+1 queries, compound indexes on (vehicleState, date)
- **State Machine**: `vehicleState` enum progression: `idle → monitoring → recording → unclassified → classified` (409 responses enforce state transitions)
- **Swipe Gestures**: Custom hook `useSwipeGesture` with 40% width threshold, spring physics for bounce-back
- **Accessibility**: Dual input methods (swipe gestures + explicit Personal/Business buttons)
- **Visual Feedback**: Green glow (business) / Blue glow (personal) during drag, smooth card exit animations
- **Error Resilience**: Toast spam prevention via useEffect, explicit error states with retry invalidation
- **Data Normalization**: Custom queryFn extracts drives array from API response object

**Production Readiness**:
- Three complete vertical slices implemented (Backend → Swipe UI → Summary)
- All slices passed architect review for production quality
- Critical bugs fixed (runtime crash, toast spam, misleading zero values)
- Comprehensive testing validates all user flows

**Out of Scope (Future Enhancements)**:
- AI pattern learning / frequent routes auto-classification
- Work hours auto-classification feature
- Push notifications for drive detection
- PDF report generation
- Custom purposes (medical, charity)

Core architectural decisions and features include:
-   **Comprehensive Error Prevention**: Centralized logging, extensive type safety, and a two-layer Error Boundary system.
-   **Bulletproof Authentication System**: Robust session management with health monitoring, triple-layer admin protection, and enhanced security measures like host validation and CORS tightening.
-   **Builder Hierarchy System**: Manages builder contacts, agreements, programs, and interactions, including a geographic hierarchy (Development → Lot → Job).
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
-   **Report Template System - JSON-Only Architecture**: Complete migration to a pure JSON architecture for report templates, supporting standalone reports and version tracking, with comprehensive testing and documentation.

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