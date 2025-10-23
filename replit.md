# Energy Auditing Field Application

## Overview

This is a full-stack energy auditing field application designed for field inspectors to manage inspections, track jobs, schedule events, and generate reports. The application is built with a focus on outdoor readability, offline-first functionality, and rapid data entry, inspired by tools like CompanyCam and iAuditor.

**Key Features:**
- Job and inspection management with workflow tracking
- Builder/contractor relationship management
- Photo documentation with multi-tag system, annotations, and OCR text extraction
- Photo-required checklist items (can't complete inspection without required photos)
- Conditional logic engine for dynamic inspection forms
- Financial tracking (expenses and mileage logs)
- Scheduling with Google Calendar integration
- Customizable report generation with intelligent form fields
- Professional PDF export with dynamic sections and pagination
- Analytics dashboard with inspection metrics, trends, and common issues tracking
- Offline-first architecture with background sync
- Mobile-responsive design optimized for field use

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 2025 - Forecast Accuracy Tracking:**
- Added comprehensive forecast accuracy analytics to Analytics page
- Dual-metric tracking for both TDL (Total Duct Leakage) and DLO (Duct Leakage to Outside)
- Metric cards: Overall Accuracy, Recent Accuracy (30 days), TDL Accuracy, DLO Accuracy, Best Forecast
- Accuracy calculation: `100 - (|actual - predicted| / predicted * 100)` with zero-value handling
- Dual-line trend chart showing TDL (green) and DLO (blue) accuracy over 6 months
- Distribution bar chart grouping forecasts by quality (Excellent >95%, Good 90-95%, Fair 80-90%, Needs Improvement <80%)
- Detailed forecast table with sortable columns: Job, Predicted TDL/DLO, Actual TDL/DLO, Variances, Accuracy
- Color-coded variance display (red for over-prediction, green for under-prediction)
- Weighted average combining TDL and DLO forecasts for overall accuracy
- Builder performance metrics include both TDL and DLO forecast accuracy
- Explicit null/undefined checks ensure zero values properly included in calculations
- Location: `client/src/pages/Analytics.tsx`

**October 2025 - Common Issues Trend Analysis:**
- Added 6-month trend chart for top 5 most common failed inspection items
- Monthly frequency tracking with color-coded lines per issue
- Trend indicators: Worsening (>30% increase), Improving (>30% decrease), Stable (±30%)
- Baseline comparison using 3-month vs 6-month averages
- Month-string alignment ensures accurate trend calculations
- Empty state handling when no failed items exist
- Location: `client/src/pages/Analytics.tsx`

**October 2025 - Builder Performance Tracking:**
- Added comprehensive builder comparison analytics to Analytics page
- Sortable metrics table: Total Jobs, Completion Rate, Forecast Accuracy, Avg Time, Issues, Monthly Volume
- Performance tier badges: Excellent (≥85%), Good (≥70%), Needs Improvement (<70%)
- Top performer highlighting with trophy icon
- Trend indicators (up/down/stable) based on 6-month active-month averages
- Builder comparison chart (grouped bars for top 5 builders)
- Builder trend analysis (line chart showing job completion trends)
- Guards against false positives for low-volume builders (minimum 3 jobs required)
- Alphabetical and numeric column sorting with localeCompare and numeric comparison
- Location: `client/src/pages/Analytics.tsx`

**October 2025 - Analytics Dashboard:**
- Added comprehensive Analytics page (`/analytics`) with inspection metrics
- Inspection volume trends (6-month line chart showing completed inspections)
- Photo tag analysis (bar chart of top 10 most used tags with category colors)
- Inspection status breakdown (stacked area chart showing workflow distribution)
- Common issues tracking (top 10 failed items from completed inspections with severity badges)
- Enhanced API endpoints to support analytics queries (all photos, all checklist items)
- Severity classification: Critical (>10 occurrences), Major (5-10), Minor (≤5)
- Empty state handling for zero failures
- Location: `client/src/pages/Analytics.tsx`

**October 2025 - PDF Export System:**
- Professional PDF generation using @react-pdf/renderer
- Multi-section layout: Header, Job Info, Summary, Checklist, Photos, Forecasts, Signatures
- Dynamic pagination based on active sections
- Photo grid with tags and annotation overlays
- Upload to private object storage with download endpoint
- Endpoints: POST `/api/report-instances/:id/generate-pdf`, GET `/api/report-instances/:id/download-pdf`
- Location: `server/pdfGenerator.tsx`

## System Architecture

### Frontend Architecture

**Framework & Build Tools:**
- **React** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured for fast HMR (Hot Module Replacement)
- **Wouter** for lightweight client-side routing instead of React Router

**UI Component System:**
- **shadcn/ui** components based on Radix UI primitives for accessible, customizable components
- **Tailwind CSS** for utility-first styling with custom design tokens
- Component library follows the "New York" style variant with neutral base colors
- Custom color system defined in CSS variables supporting light/dark themes

**State Management:**
- **TanStack Query (React Query)** for server state management, caching, and data synchronization
- Local component state with React hooks for UI state
- No global state management library (Redux/Zustand) - relies on React Query cache

**Offline Support:**
- **Service Worker** (`client/public/sw.js`) for caching static assets and API responses
- **IndexedDB** via `idb` library for persistent offline data storage
- Custom sync queue system (`client/src/lib/syncQueue.ts`) to queue mutations when offline
- Network status monitoring (`client/src/hooks/useNetworkStatus.ts`) with singleton pattern to prevent duplicate sync operations

**Design System:**
- Predefined color palette optimized for outdoor readability (defined in `design_guidelines.md`)
- Typography using Roboto for UI elements and Open Sans for body text
- Minimum 16px font size for outdoor visibility
- Minimum 48px touch targets for mobile usability
- Spacing system based on Tailwind's 4px scale

### Backend Architecture

**Server Framework:**
- **Express.js** running on Node.js with TypeScript
- Custom middleware for request logging and JSON parsing with raw body capture
- Vite integration in development mode for SSR-style serving

**Database & ORM:**
- **PostgreSQL** as the primary database (via Neon serverless)
- **Drizzle ORM** for type-safe database queries and migrations
- Schema defined in `shared/schema.ts` with Zod validation schemas generated via `drizzle-zod`
- Database migrations managed through `drizzle-kit`

**API Architecture:**
- RESTful API design with CRUD endpoints for each resource type
- Routes defined in `server/routes.ts`
- Storage abstraction layer (`server/storage.ts`) defining the data access interface
- Request/response validation using Zod schemas from shared schema definitions

**Authentication & Session Management:**
- **Passport.js** with local strategy for username/password authentication
- **Bcrypt** password hashing (10 rounds) for secure credential storage
- **Express sessions** with PostgreSQL-backed session store (`connect-pg-simple`)
- Session configuration:
  - Production: Secure cookies, SESSION_SECRET from environment
  - Development: Auto-login middleware for seamless testing
- Authentication routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/user`
- All API routes protected with `isAuthenticated` middleware

### Data Model

**Core Entities:**
- **Users** - Authentication and user accounts
- **Builders** - Contractors/companies with contact information and performance tracking
- **Jobs** - Inspection jobs with status tracking, location data, and progress metrics
- **Schedule Events** - Calendar events linked to jobs with Google Calendar sync
- **Expenses** - Financial tracking with categories and job association
- **Mileage Logs** - Vehicle mileage tracking for reimbursement
- **Photos** - Image documentation linked to jobs and checklist items
- **Report Templates** - Customizable report structures with reusable sections
- **Report Instances** - Generated reports from templates with job-specific data
- **Forecasts** - Predicted vs. actual measurements for energy audits

**Key Relationships:**
- Jobs can be associated with Builders (many-to-one)
- Schedule Events belong to Jobs (many-to-one)
- Photos and Expenses can be linked to Jobs
- Report Instances are generated from Report Templates for specific Jobs

### External Dependencies

**Third-Party Services:**
- **Google Calendar API** - Two-way sync for schedule events
  - OAuth2 authentication via Replit Connectors system
  - Client initialization in `server/googleCalendar.ts`
  - Access token refresh handling with expiration tracking
  - Requires `REPLIT_CONNECTORS_HOSTNAME` and Replit identity tokens

- **Replit Object Storage** - Cloud file storage for photo uploads
  - Google Cloud Storage backend via Replit sidecar integration
  - Presigned URL uploads for direct-to-storage file transfer
  - ACL-based access control for photo security
  - Service initialized in `server/objectStorage.ts`
  - Environment variables: `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`

**Database:**
- **Neon Serverless PostgreSQL** - Cloud-hosted PostgreSQL via `@neondatabase/serverless`
- Connection string provided via `DATABASE_URL` environment variable

**UI Libraries:**
- **Radix UI** - Headless accessible component primitives (18+ packages)
- **Recharts** - Chart rendering for dashboard visualizations
- **React Big Calendar** - Calendar view component with drag-and-drop support
- **React DnD** - Drag and drop functionality for calendar scheduling
- **date-fns** - Date manipulation and formatting
- **Uppy** - File upload component library
  - `@uppy/core`, `@uppy/react`, `@uppy/dashboard`, `@uppy/aws-s3`
  - Modal-based upload interface with progress tracking
  - Direct-to-storage uploads via presigned URLs
  - Custom `ObjectUploader` component in `client/src/components/ObjectUploader.tsx`
- **react-konva** & **konva** - Canvas-based photo annotation tools
  - Arrow, text overlay, and measurement line drawing tools
  - Color picker with 7 preset colors
  - Undo/redo functionality
  - Custom `PhotoAnnotator` component in `client/src/components/PhotoAnnotator.tsx`
- **tesseract.js** - OCR (Optical Character Recognition) for text extraction
  - Extract addresses, lot numbers, permit IDs from photos
  - Pattern recognition with confidence scoring
  - Auto-fill job fields from extracted text
  - Custom `PhotoOCR` component in `client/src/components/PhotoOCR.tsx`
- **@react-pdf/renderer** - PDF generation for professional inspection reports
  - React component syntax for PDF document creation
  - Multi-section layout: Header, Job Info, Summary, Checklist, Photos, Forecasts, Signatures
  - Dynamic pagination based on active sections
  - Professional styling with Helvetica fonts, proper margins, page numbers
  - Photo grid layout with tags and annotation overlays
  - Server-side generation in `server/pdfGenerator.tsx`
  - Upload to private object storage with download endpoint
  - Endpoints: POST `/api/report-instances/:id/generate-pdf`, GET `/api/report-instances/:id/download-pdf`

**Development Tools:**
- **Replit-specific plugins** for development environment integration
  - `@replit/vite-plugin-runtime-error-modal`
  - `@replit/vite-plugin-cartographer`
  - `@replit/vite-plugin-dev-banner`

**Form Handling:**
- **React Hook Form** - Form state management and validation
- **@hookform/resolvers** - Integration with Zod schemas for form validation

**Styling:**
- **Tailwind CSS** with PostCSS and Autoprefixer
- **class-variance-authority** - Type-safe component variants
- **clsx** and **tailwind-merge** - Conditional class composition

**Build & Runtime:**
- **esbuild** - Server bundling for production
- **tsx** - TypeScript execution for development server
- **nanoid** - Unique ID generation