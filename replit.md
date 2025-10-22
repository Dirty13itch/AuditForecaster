# Energy Auditing Field Application

## Overview

This is a full-stack energy auditing field application designed for field inspectors to manage inspections, track jobs, schedule events, and generate reports. The application is built with a focus on outdoor readability, offline-first functionality, and rapid data entry, inspired by tools like CompanyCam and iAuditor.

**Key Features:**
- Job and inspection management with workflow tracking
- Builder/contractor relationship management
- Photo documentation and gallery
- Financial tracking (expenses and mileage logs)
- Scheduling with Google Calendar integration
- Customizable report generation
- Offline-first architecture with background sync
- Mobile-responsive design optimized for field use

## User Preferences

Preferred communication style: Simple, everyday language.

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

**Session Management:**
- **Express sessions** with PostgreSQL-backed session store (`connect-pg-simple`)
- Session configuration supports production and development environments

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

**Database:**
- **Neon Serverless PostgreSQL** - Cloud-hosted PostgreSQL via `@neondatabase/serverless`
- Connection string provided via `DATABASE_URL` environment variable

**UI Libraries:**
- **Radix UI** - Headless accessible component primitives (18+ packages)
- **Recharts** - Chart rendering for dashboard visualizations
- **React Big Calendar** - Calendar view component with drag-and-drop support
- **React DnD** - Drag and drop functionality for calendar scheduling
- **date-fns** - Date manipulation and formatting

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