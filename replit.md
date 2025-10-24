# Energy Auditing Field Application

## Overview

This full-stack energy auditing field application is designed for field inspectors to manage inspections, track jobs, schedule events, and generate reports. Its primary purpose is to streamline energy auditing workflows, improve data accuracy through photo documentation and OCR, and provide robust analytics. Key features include outdoor readability, offline-first functionality, and rapid data entry. The business vision is to transform field operations with a comprehensive, user-friendly, and powerful mobile solution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application features a **React** and **TypeScript** frontend, built with **Vite**, using **Wouter** for routing. UI components are built with **shadcn/ui** (Radix UI) and styled with **Tailwind CSS**, optimized for outdoor readability with a custom color system. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first capabilities.

The backend uses **Express.js** with **Node.js** and **TypeScript**. **PostgreSQL** (Neon serverless) is the primary database, accessed via **Drizzle ORM** for type-safe queries. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

Core data entities include Users, Builders, Jobs, Schedule Events, Expenses, Mileage Logs, Photos, Report Templates, and Report Instances, with relationships linking them for comprehensive data management.

Key technical implementations include:
- **Comprehensive Error Prevention**: Centralized logging, extensive type safety, loading states, null/undefined guards, API error handling, and a two-layer Error Boundary system.
- **Input Validation**: Zod schemas for API and form validation.
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

Enterprise hardening includes 15 strategic database indexes, **Sentry** integration for error monitoring and observability (backend and frontend), multi-layered security controls (CSRF protection, rate limiting, Helmet, secure sessions), and comprehensive operational documentation for deployment, backup, and disaster recovery.

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