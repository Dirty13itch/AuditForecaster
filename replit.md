# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application empowers field inspectors to manage inspections, track jobs, schedule events, and generate reports. Its core purpose is to optimize energy auditing workflows, enhance data accuracy via photo documentation and OCR, and provide robust analytics. Key capabilities include outdoor readability, offline-first operation, and rapid data entry. The project aims to revolutionize field operations with a comprehensive, user-friendly, and powerful mobile solution, enhancing efficiency and data integrity in field operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a **React** and **TypeScript** frontend, built with **Vite**, and **Wouter** for routing. UI components leverage **shadcn/ui** (Radix UI) and **Tailwind CSS**, with a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is built with **Express.js** and **Node.js** in **TypeScript**. **PostgreSQL** (Neon serverless) is the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

## Planned Features

### **MileIQ-Style Mileage Tracking (Vertical Slice - In Progress)**
**User Story**: As a field inspector, I can have my drives automatically detected and quickly classify them with a swipe gesture (business/personal) so that I can effortlessly track tax-deductible mileage without manual start/stop actions.

**Scope**:
- ✅ 24/7 automatic GPS trip detection (service worker + background geolocation)
- ✅ Unclassified drives queue (card-based feed)
- ✅ Swipe gesture classification (right=business, left=personal)
- ✅ Smooth animations (card fly-off, color feedback using framer-motion)
- ✅ Offline persistence (IndexedDB queue)
- ✅ Monthly summary dashboard (total/business/personal miles + tax deduction at $0.70/mile)
- ✅ CSV export for tax reporting

**API Contract**:
- `GET /api/mileage/unclassified` - Fetch drives awaiting classification
- `PUT /api/mileage/:id/classify` - Classify drive as business/personal
- `GET /api/mileage/summary?month=YYYY-MM` - Monthly statistics
- `GET /api/mileage/export?month=YYYY-MM&format=csv` - IRS-compliant export

**Technical Architecture**:
- **Background Detection**: Enhanced TripTrackerService with auto-start/stop based on speed thresholds (>5 m/s start, <1.5 m/s stop)
- **State Machine**: `vehicleState` enum progression: `idle → monitoring → recording → unclassified → classified`
- **Swipe Gestures**: Custom hook `useSwipeGesture` with 40% width threshold, spring physics for bounce-back
- **Visual Feedback**: Green glow (business) / Blue glow (personal) during drag, smooth card exit animations
- **Query Optimization**: JSON aggregation for route points, compound indexes on (vehicleState, date)

**Out of Scope (Next Slices)**:
- AI pattern learning / frequent routes auto-classification
- Work hours feature
- Push notifications
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