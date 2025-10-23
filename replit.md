# Energy Auditing Field Application

## Overview

This is a full-stack energy auditing field application for field inspectors to manage inspections, track jobs, schedule events, and generate reports. It emphasizes outdoor readability, offline-first functionality, and rapid data entry. The application aims to streamline energy auditing workflows, improve data accuracy through photo documentation and OCR, and provide robust analytics for job and builder performance. Its business vision includes transforming field operations with a comprehensive, user-friendly, and powerful mobile solution for energy auditing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React** and **TypeScript**, using **Vite** for fast development. **Wouter** handles client-side routing. UI components leverage **shadcn/ui** (based on Radix UI) and are styled with **Tailwind CSS**, following a "New York" style variant with neutral base colors and a custom color system optimized for outdoor readability. **TanStack Query** manages server state, while local component state uses React hooks. For offline support, a **Service Worker** caches assets, **IndexedDB** stores persistent data, and a custom sync queue handles mutations during offline periods. The design system emphasizes readability and mobile usability with specific font choices (Roboto, Open Sans), minimum font sizes, and touch target dimensions.

### Backend Architecture

The backend uses **Express.js** with **Node.js** and **TypeScript**. **PostgreSQL** (via Neon serverless) is the primary database, accessed through **Drizzle ORM** for type-safe queries. API architecture is RESTful, with routes defined in `server/routes.ts` and data access abstracted via `server/storage.ts`. **Zod** schemas are used for request/response validation. **Passport.js** with a local strategy, **Bcrypt** for password hashing, and **Express sessions** with a PostgreSQL-backed store handle authentication and session management.

### Data Model

The core entities include **Users**, **Builders**, **Jobs**, **Schedule Events**, **Expenses**, **Mileage Logs**, **Photos**, **Report Templates**, **Report Instances**, and **Forecasts**. Key relationships link Jobs to Builders, Schedule Events, Photos, and Expenses, while Report Instances are generated from Templates for specific Jobs.

### Technical Implementations & Feature Specifications

- **Comprehensive Error Prevention:** Includes centralized logging (Winston on server, console on client), extensive type safety (elimination of 'any'), loading states for mutations, null/undefined guards using `??` and type-guarded filters, thorough API error handling with try-catch blocks, and a two-layer Error Boundary system for UI resilience.
- **Input Validation:** Zod schemas are used for both API endpoint validation and form component validation (e.g., DynamicForm, BuilderDialog).
- **Bulk Operations:** Multi-select functionality across Photos, Jobs, and Expenses with shared infrastructure (`useBulkSelection` hook, `SelectionToolbar`, `BulkActionDialogs`). Supports bulk delete (200-item limit), bulk export to CSV/JSON (1000-item limit), and bulk tag management for photos (add/remove/replace modes). Accounting-friendly CSV exports include enriched metadata (job names, builder details) for financial reporting.
- **Search & Filtering:** Advanced search across Jobs (name, address, builder, status), Builders (name, company, specialization), and Photos (tags, job, date range) with real-time filtering and pagination support.
- **Analytics Dashboard:** Provides metrics on inspection volume, photo tag analysis, inspection status breakdown, and common issues tracking. Features include forecast accuracy tracking (TDL and DLO), builder performance comparison with metrics like completion rate and forecast accuracy, and trend analysis for common failed inspection items.
- **PDF Export System:** Uses `@react-pdf/renderer` for professional, multi-section PDF generation with dynamic pagination, photo grids (with tags and annotations), and intelligent form fields. Generated PDFs are uploaded to private object storage.
- **Photo Documentation:** Supports multi-tag systems, annotations (arrows, text, measurements via `react-konva`), and **OCR text extraction** using `tesseract.js` for auto-filling job fields. Includes photo-required checklist items.
- **Offline-First Functionality:** Leverages service workers, IndexedDB, and a custom sync queue for robust operation without internet connectivity.
- **Scheduling:** Features Google Calendar integration for two-way sync.
- **Conditional Logic:** Dynamic inspection forms are driven by a conditional logic engine.

## External Dependencies

### Third-Party Services

-   **Google Calendar API**: For two-way synchronization of schedule events using OAuth2 via Replit Connectors.
-   **Replit Object Storage**: Utilizes Google Cloud Storage backend for photo uploads via presigned URLs and ACLs.
-   **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database.

### UI Libraries

-   **Radix UI**: Headless accessible component primitives.
-   **Recharts**: Chart rendering for data visualization.
-   **React Big Calendar**: Calendar view component with drag-and-drop.
-   **React DnD**: Drag and drop functionality.
-   **date-fns**: Date manipulation and formatting.
-   **Uppy**: File upload component with AWS S3 integration via presigned URLs.
-   **react-konva** & **konva**: Canvas-based photo annotation tools.
-   **tesseract.js**: OCR for text extraction from photos.
-   **@react-pdf/renderer**: PDF generation library for professional reports.

### Development Tools

-   **Replit-specific plugins**: For enhanced development environment integration (`@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`).

### Form Handling

-   **React Hook Form**: Form state management and validation.
-   **@hookform/resolvers**: Integration with Zod for form validation.

### Styling

-   **Tailwind CSS**: Utility-first CSS framework.
-   **class-variance-authority**: Type-safe component variants.
-   **clsx** and **tailwind-merge**: Conditional class composition.

### Build & Runtime

-   **esbuild**: Server bundling.
-   **tsx**: TypeScript execution for development.
-   **nanoid**: Unique ID generation.