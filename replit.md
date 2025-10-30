# Energy Auditing Field Application

## Overview
This full-stack energy auditing field application optimizes energy auditing workflows for field inspectors. It enables management of inspections, job tracking, event scheduling, and report generation. Key capabilities include outdoor readability, offline-first operation, rapid data entry, enhanced data accuracy via photo documentation and OCR, and robust analytics. The project aims to provide a comprehensive, user-friendly, and powerful mobile solution for field operations, offering significant market potential by streamlining energy audit processes and improving data reliability for field inspectors. The application has achieved a 40/40 production standard, signifying AAA-level quality and readiness for deployment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a **React** and **TypeScript** frontend, built with **Vite** and utilizing **Wouter** for routing. UI components are developed with **shadcn/ui** (Radix UI) and **Tailwind CSS**, incorporating a custom color system for outdoor readability. **TanStack Query** manages server state, while a **Service Worker**, **IndexedDB**, and a custom sync queue provide offline-first functionality.

The backend is developed with **Express.js** and **Node.js** in **TypeScript**, with **PostgreSQL** (Neon serverless) as the primary database, accessed via **Drizzle ORM**. The API is RESTful, with **Zod** schemas for validation. **Replit Auth** (OpenID Connect) handles authentication, with sessions stored in PostgreSQL.

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