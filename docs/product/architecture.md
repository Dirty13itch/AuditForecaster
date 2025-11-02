# Architecture Documentation

**Last Updated**: November 2, 2025  
**Status**: Production-Ready AAA-Grade System  
**Version**: 4.0

---

## Executive Summary

The Energy Auditing Field Application is a production-grade, mobile-first platform for RESNET-certified energy audits conducted by Ulrich Energy Auditing for M/I Homes across Twin Cities developments. The system has achieved **40/40 production standard** with enterprise hardening, comprehensive offline-first capabilities, and advanced compliance tracking. **AAA transformation in progress** to add systematic quality gates, automated Golden Path testing, and maturity-based feature gating.

### Key Capabilities
- **Mobile-Optimized Field Operations**: Samsung Galaxy S23 Ultra optimized with outdoor-readable UI
- **Offline-First Architecture**: IndexedDB + Service Worker + Custom Sync Queue
- **Real-Time Collaboration**: WebSocket notifications with HTTP polling fallback
- **Minnesota Code Compliance**: ENERGY STAR MFNC, MN Housing EGCC, ZERH, Building Energy Benchmarking
- **Financial Management**: Partner contractor access, monthly invoicing, AR aging, expense tracking
- **Production Monitoring**: Prometheus metrics, Sentry error tracking, background job monitoring

---

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Router**: Wouter (lightweight, 1.2KB)
- **UI Components**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: TanStack Query v5 (server state), React Context (global state)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts (lazy-loaded)
- **PDF Generation**: @react-pdf/renderer
- **Image Processing**: Konva (annotations), Tesseract.js (OCR)
- **Calendar**: React Big Calendar + Google Calendar API
- **File Upload**: Uppy with Webcam plugin

### Backend
- **Runtime**: Node.js + Express.js (TypeScript)
- **Database**: PostgreSQL (Neon Serverless) via Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) with session store in PostgreSQL
- **Object Storage**: Replit Object Storage (Google Cloud Storage)
- **Validation**: Zod schemas (shared between frontend/backend)
- **Logging**: Winston with structured logging
- **Monitoring**: Prometheus metrics, Sentry error tracking
- **Cron Jobs**: node-cron for scheduled tasks
- **Email**: SendGrid for notifications
- **Security**: Helmet, CSRF protection (csrf-sync), rate limiting

### Infrastructure
- **Hosting**: Replit (development + production)
- **Database**: Neon Serverless PostgreSQL
- **Storage**: Google Cloud Storage (via Replit)
- **CDN**: Replit edge network
- **Monitoring**: Sentry, Prometheus
- **Deployment**: Continuous from Replit

---

## Application Routes

### Core User Journeys

#### Field Inspector Routes (Daily Work)
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/` | Dashboard | GA | GP-01 | Inspector overview with today's jobs |
| `/field-day` | FieldDay | GA | GP-01 | Mobile-optimized daily workload view |
| `/jobs` | Jobs | GA | GP-01, GP-02 | Job management and search |
| `/inspection/:id` | Inspection | GA | GP-01, GP-02 | Step-by-step inspection workflow |
| `/photos` | Photos | GA | GP-03 | Photo library with tagging/OCR |
| `/schedule` | Schedule | GA | GP-01 | Calendar view with assignment |

#### Testing & Measurements
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/blower-door-test` | BlowerDoorTest | GA | GP-02 | Blower door testing with calculations |
| `/duct-leakage-test` | DuctLeakageTest | GA | GP-02 | Duct leakage measurements |
| `/ventilation-tests` | VentilationTests | GA | GP-02 | Ventilation system testing |

#### Equipment & Calibration
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/equipment` | Equipment | GA | - | Equipment inventory tracking |
| `/equipment/:id` | EquipmentDetails | GA | - | Equipment details with calibration |
| `/calibration-schedule` | CalibrationSchedule | GA | - | Calibration deadline tracking |

#### Reporting & Documentation
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/reports` | Reports | GA | GP-01, GP-02 | Report generation and export |
| `/report-templates` | ReportTemplates | GA | - | Template library management |
| `/report-templates/:id` | ReportTemplateDetail | Beta | - | Template configuration |
| `/report-template-designer` | ReportTemplateDesigner | Beta | - | Visual template designer |
| `/report-instance/:id` | ReportInstancePage | GA | GP-01 | View/edit report instances |
| `/report-fillout/:templateId` | ReportFillout | GA | - | Fill out report from template |

#### Business Data Management
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/builders` | Builders | GA | - | Builder/contractor management |
| `/builder-review` | BuilderReview | GA | - | Builder performance review |
| `/business-data/construction-managers` | ConstructionManagers | GA | - | Construction manager contacts |
| `/plans` | Plans | GA | - | Building plan library |

#### Analytics & Insights
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/analytics` | Analytics | GA | - | Performance metrics dashboard |
| `/forecast` | Forecast | Beta | - | TDL/DLO forecasting |

#### Financial Management
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/financial-dashboard` | FinancialDashboard | GA | - | Financial overview for partners |
| `/invoices` | Invoices | GA | - | Invoice generation/tracking |
| `/financial/payments` | Payments | GA | - | Payment processing |
| `/financial/ar-aging` | ARAgingReport | GA | - | Accounts receivable aging |
| `/financial/unbilled-work` | UnbilledWorkTracker | GA | - | Unbilled work tracking |
| `/financial/expenses` | ExpensesSwipe | GA | - | Expense management (swipe UI) |
| `/expenses` | Expenses | GA | - | Expense list view |
| `/mileage` | Mileage | GA | - | Mileage tracking |
| `/mileage-classify` | MileageClassify | Beta | - | Mileage categorization |
| `/financial/analytics` | FinancialAnalytics | GA | - | Financial performance metrics |

#### Compliance & Quality
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/compliance-hub` | ComplianceHub | GA | - | Minnesota compliance overview |
| `/compliance/multifamily-setup` | MultifamilyProgramSetup | GA | - | MFNC program configuration |
| `/compliance/builder-verified-items` | BuilderVerifiedItemsTracker | GA | - | Builder-verified item tracking |
| `/compliance/sampling-calculator` | SamplingProtocolCalculator | GA | - | RESNET sampling calculations |
| `/compliance/energy-star-mfnc` | EnergyStarMFNCChecklist | GA | - | ENERGY STAR MFNC checklist |
| `/compliance/mn-housing-egcc` | MNHousingEGCCWorksheet | GA | - | MN Housing EGCC worksheet |
| `/compliance/zerh` | ZERHComplianceTracker | GA | - | ZERH compliance tracking |
| `/compliance/benchmarking` | BenchmarkingDeadlineTracker | GA | - | Building benchmarking deadlines |
| `/compliance/documents` | ComplianceDocumentsLibrary | GA | - | Compliance document library |
| `/quality-assurance` | QualityAssurance | GA | GP-05 | QA item management |
| `/qa-scoring` | QAScoring | Beta | - | QA scoring system |
| `/qa-checklists` | QAChecklists | Beta | - | QA checklist templates |
| `/qa-performance` | QAPerformance | Beta | - | QA metrics dashboard |

#### Tax Credits
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/tax-credit-45l` | TaxCredit45L | GA | GP-04 | 45L tax credit management |
| `/tax-credit-project/:id` | TaxCreditProject | GA | GP-04 | Project-level 45L tracking |
| `/tax-credit-compliance` | TaxCreditCompliance | GA | - | 45L compliance verification |
| `/tax-credit-reports` | TaxCreditReports | GA | GP-04 | 45L reporting and export |

#### Calendar & Scheduling
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/calendar-management` | CalendarManagement | GA | GP-01 | Google Calendar integration |
| `/calendar-review` | CalendarReview | GA | GP-01 | Review imported events |
| `/calendar-import-history` | CalendarImportHistory | GA | - | Import audit trail |
| `/calendar-import-queue` | CalendarImportQueuePage | Beta | - | Pending event queue |

#### Administration
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/settings-hub` | SettingsHub | GA | - | Settings navigation hub |
| `/settings` | SettingsPage | GA | - | User preferences |
| `/admin-diagnostics` | AdminDiagnostics | GA | - | System diagnostics (admin) |
| `/admin/background-jobs` | BackgroundJobs | GA | - | Background job monitoring |
| `/audit-logs` | AuditLogs | GA | - | System audit trail |
| `/kpi-settings` | KPISettings | Beta | - | KPI configuration |
| `/scheduled-exports` | ScheduledExports | GA | - | Automated export scheduling |
| `/custom-reports` | CustomReports | Beta | - | Custom report builder |

#### Gamification
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/gamification` | Gamification | Beta | - | Achievement system |
| `/achievements` | Achievements | Beta | - | Achievement tracking |
| `/challenges` | Challenges | Beta | - | Challenge management |

#### Utilities & Testing
| Route | Component | Maturity | Golden Path | Purpose |
|-------|-----------|----------|-------------|---------|
| `/photo-annotation/:id` | PhotoAnnotation | GA | - | Photo annotation with Konva |
| `/photo-cleanup` | PhotoCleanup | Beta | - | Photo deduplication |
| `/conflict-resolution` | ConflictResolution | Experimental | - | Offline sync conflict UI |
| `/notification-test` | NotificationTest | Experimental | - | WebSocket notification testing |
| `/offline-test` | OfflineTest | Experimental | - | Offline sync testing |
| `/route` | RouteView | Beta | - | Route optimization |

---

## Entity-Relationship Diagram

### Core Entities

```
Organizations (1) ──< (N) OrganizationUsers >── (N) Users
     │
     └──< (N) Builders
             │
             ├──< (N) BuilderContacts
             ├──< (N) BuilderAgreements
             ├──< (N) BuilderPrograms
             ├──< (N) BuilderInteractions
             ├──< (N) BuilderAbbreviations
             ├──< (N) ConstructionManagers
             │       └──< (N) ConstructionManagerCities
             │
             └──< (N) Developments
                     ├──< (N) DevelopmentConstructionManagers
                     └──< (N) Lots
                             └──< (N) Jobs
                                     ├──< (N) ChecklistItems
                                     ├──< (N) Photos
                                     ├──< (N) ReportInstances
                                     ├──< (N) Forecasts
                                     ├──< (N) ComplianceHistory
                                     ├──< (N) ScheduleEvents
                                     ├──< (N) Expenses
                                     └──< (N) MileageLogs

Plans (1) ──< (N) Jobs
       └──< (N) PlanOptionalFeatures

Users (1) ──< (N) Jobs (as inspector)
      ├──< (N) Photos (as uploader)
      ├──< (N) AuditLogs (as actor)
      ├──< (N) InspectorWorkload
      ├──< (N) InspectorPreferences
      ├──< (N) EmailPreferences
      └──< (N) Achievements

ReportTemplates (1) ──< (N) ReportInstances
                 └──< (N) ReportSectionInstances
                         └──< (N) ReportFieldValues
                                 └──< (N) FieldDependencies

Equipment (1) ──< (N) Jobs (used in)

PhotoAlbums (1) ──< (N) PhotoAlbumItems >── (N) Photos

CalendarPreferences (1) ── (1) Users
```

### Key Tables

**Users & Organizations**
- `users` - User accounts with Replit Auth
- `organizations` - Multi-tenant organization support
- `organization_users` - User-organization memberships
- `user_invitations` - Pending invitations
- `sessions` - Authentication sessions

**Builder Hierarchy**
- `builders` - Contractor/builder entities
- `builder_contacts` - Contact persons
- `builder_agreements` - Service agreements
- `builder_programs` - Program enrollments
- `builder_interactions` - Interaction history
- `builder_abbreviations` - Name abbreviations for parsing
- `construction_managers` - Construction manager contacts
- `construction_manager_cities` - Service area assignments

**Geographic Hierarchy**
- `developments` - Housing developments
- `development_construction_managers` - Manager assignments
- `lots` - Individual building lots
- `plans` - Building plan templates
- `plan_optional_features` - Optional features per plan

**Jobs & Inspections**
- `jobs` - Core inspection jobs
- `job_type_config` - Job type definitions (9 templates)
- `checklist_items` - Inspection checklist items
- `photos` - Photo documentation
- `forecasts` - TDL/DLO predictions
- `compliance_history` - Compliance tracking

**Testing Systems**
- `blower_door_tests` - Blower door test results
- `duct_leakage_tests` - Duct leakage measurements
- `ventilation_tests` - Ventilation system tests
- `equipment` - Equipment inventory
- `calibration_records` - Calibration history

**Reports**
- `report_templates` - JSON-based report templates
- `report_instances` - Generated report instances
- `report_section_instances` - Section data
- `report_field_values` - Field values
- `field_dependencies` - Conditional logic

**Financial**
- `expenses` - Expense tracking with OCR
- `mileage_logs` - Mileage tracking (MileIQ-style)
- `mileage_route_points` - GPS route points
- `invoices` - Monthly billing
- `payments` - Payment tracking

**Calendar & Scheduling**
- `schedule_events` - Calendar events
- `google_events` - Google Calendar sync
- `pending_calendar_events` - Import queue
- `calendar_import_logs` - Import audit trail
- `unmatched_calendar_events` - Parsing failures
- `calendar_preferences` - Integration settings

**Quality & Compliance**
- `compliance_rules` - Minnesota code rules
- `qa_items` - Quality assurance issues
- `qa_checklists` - QA checklist templates
- `qa_scoring` - QA scoring records

**Tax Credits**
- `tax_credit_projects` - 45L project tracking
- `tax_credit_documents` - Supporting documentation

**System**
- `audit_logs` - Immutable audit trail
- `background_job_executions` - Cron job tracking
- `upload_sessions` - Multi-part uploads
- `photo_upload_sessions` - Photo batch uploads
- `email_preferences` - Notification preferences
- `achievements` - Gamification achievements
- `user_achievements` - Achievement unlocks

---

## Database Performance

### Strategic Indexing (35+ indexes)

**Jobs Table** (8 indexes)
- `idx_jobs_builder_id` - Builder filtering
- `idx_jobs_inspector_id` - Inspector workload
- `idx_jobs_status` - Status filtering
- `idx_jobs_scheduled_date` - Date range queries
- `idx_jobs_completed_date` - Analytics
- `idx_jobs_compliance_status` - Compliance reporting
- `idx_jobs_created_at` - Audit trails
- `idx_jobs_development_id` - Development queries

**Photos Table** (5 indexes)
- `idx_photos_job_id` - Job photo lookup
- `idx_photos_uploaded_by` - User uploads
- `idx_photos_captured_at` - Timeline queries
- `idx_photos_tags_gin` - Tag search (GIN)
- `idx_photos_object_key` - Storage lookup

**Additional Critical Indexes**
- Checklist items by job
- Schedule events by date/inspector
- Financial records by date/status
- Compliance history by job
- Audit logs by timestamp/actor
- Calendar events by sync status
- QA items by status/assignee

---

## Feature Flags & Maturity Levels

### Maturity Definitions
- **GA (Generally Available)**: Production-ready, fully tested, complete vertical slice
- **Beta**: Feature-complete but undergoing refinement, visible to all users
- **Experimental**: In development, hidden by default, toggle in dev tools

### Current Feature Flags
- `calendar-import-v2`: Enhanced calendar parsing (GA)
- `offline-sync`: Offline-first capabilities (GA)
- `report-v2`: JSON-based report system (GA)
- `financial-module`: Standalone financial system (GA)
- `gamification`: Achievement system (Beta)
- `qa-scoring`: QA scoring system (Beta)

---

## Security Architecture

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL with connect-pg-simple
- **Session Duration**: 7 days
- **CSRF Protection**: csrf-sync with double-submit cookies
- **Development Mode**: Test accounts with quick login URLs

### Authorization
- **Roles**: Admin, Inspector, Partner (BuilderViewer)
- **Permission Model**: Role-based with entity-level CRUD
- **Route Protection**: Middleware-based role checks
- **Admin Protection**: Triple-layer (route, API, UI)

### API Security
- **Rate Limiting**: express-rate-limit (100 req/15min per IP)
- **Helmet**: Security headers (CSP, XSS protection, etc.)
- **Input Validation**: Zod schemas at API boundary
- **SQL Injection**: Parameterized queries via Drizzle ORM
- **Compression**: gzip/br compression (60-80% size reduction)

### Data Protection
- **Secrets**: Environment variables (no secrets in code)
- **PII**: Optional privacy mode for photo EXIF scrubbing
- **Audit Trail**: Immutable audit logs for all mutations
- **Encryption**: TLS in transit, PostgreSQL encryption at rest

---

## Observability

### Error Monitoring
- **Provider**: Sentry (both frontend and backend)
- **Error Boundaries**: Two-layer system (route + component)
- **Correlation IDs**: Propagated through request chain
- **Source Maps**: Uploaded for production debugging

### Metrics (Prometheus)
- HTTP request duration/count/errors
- Database query performance
- Background job execution
- WebSocket connection metrics
- Business metrics (jobs completed, photos uploaded)
- Cache hit rates

### Logging
- **Library**: Winston with structured JSON
- **Levels**: error, warn, info, debug
- **Context**: Request IDs, user IDs, timestamps
- **Destinations**: Console (dev), file rotation (prod)

### Health Checks
- `/healthz` - Liveness probe
- `/readyz` - Readiness probe (database check)
- `/api/status` - Detailed system info
- `/metrics` - Prometheus endpoint

---

## Performance Optimizations

### Frontend
- **Code Splitting**: 13 tiers of lazy-loaded routes
- **Bundle Size**: Main chunk ~180KB gz, field visit ~220KB gz
- **Image Optimization**: Sharp for thumbnails, lazy loading
- **Caching**: React Query with stale-while-revalidate
- **Virtual Scrolling**: @tanstack/react-virtual for large lists

### Backend
- **Connection Pooling**: Neon serverless connection management
- **Query Optimization**: Strategic indexes, query analysis
- **Compression**: gzip/brotli for API responses
- **Caching**: Node-cache for frequently accessed data
- **Batch Operations**: Bulk insert/update capabilities

### Offline-First
- **Service Worker**: Workbox-based caching strategy
- **IndexedDB**: Dexie.js for local storage
- **Sync Queue**: Custom queue with exponential backoff
- **Conflict Resolution**: Field-level merge with UI reconciliation

---

## Background Jobs (Cron)

### Active Jobs
1. **Daily Digest** - 7:00 AM daily
   - Email summary of pending work
   - Inspector workload distribution

2. **Weekly Performance Summary** - 9:00 AM Monday
   - Weekly metrics report
   - Builder performance summary

3. **Automated Calendar Import** - Every 6 hours
   - Import from "Building Knowledge" calendar
   - 30-day lookahead window
   - Fuzzy matching and confidence scoring

4. **Financial AR Snapshot** - Midnight daily
   - Aging report generation
   - Overdue payment alerts

5. **Unbilled Work Reminder** - 9:00 AM Monday
   - Alert for uninvoiced completed work

### Monitoring
- Background job execution tracked in `background_job_executions` table
- Admin dashboard at `/admin/background-jobs`
- Health indicators (green/yellow/red)
- Execution history with error logs
- Prometheus metrics integration

---

## Deployment

### Environment Configuration
- **Development**: Local Replit workspace
- **Staging**: Not configured (use dev with feature flags)
- **Production**: Replit deployment with custom domain support

### Build Process
1. TypeScript compilation
2. Vite bundle optimization
3. Source map generation
4. Sentry source map upload
5. Database migrations (Drizzle Push)

### Deployment Checklist
- ✅ Environment variables configured
- ✅ Database migrations applied
- ✅ Seed data loaded
- ✅ Health checks passing
- ✅ Sentry integration active
- ✅ Background jobs initialized
- ✅ WebSocket server running
- ✅ Google Calendar OAuth configured

---

## Future Architecture Considerations

### Scalability
- **WebSocket Scaling**: Redis pub/sub for multi-server (see WEBSOCKET_SCALING.md)
- **Database**: Read replicas for analytics queries
- **Object Storage**: CDN integration for photo delivery
- **Caching**: Redis for distributed caching

### Additional Features
- **Mobile Apps**: React Native with shared business logic
- **Offline-First v2**: Enhanced conflict resolution with CRDTs
- **Real-Time Collaboration**: Operational transformation for concurrent edits
- **Machine Learning**: Photo auto-tagging, anomaly detection
- **Advanced Analytics**: Time-series database for metrics

---

## Documentation Artifacts

### Product Documentation (`/docs/product/`)
- `architecture.md` - This document
- `inspiration-matrix.md` - Competitive analysis
- `roadmap.md` - Feature roadmap with AAA criteria
- `roles-matrix.md` - Permission definitions
- `errors.md` - Error code taxonomy
- `golden-path-report.md` - Test execution results

### Technical Documentation (`/docs/`)
- `AUTHENTICATION.md` - Auth implementation
- `PERMISSIONS_MATRIX.md` - Permission model
- `GOOGLE_CALENDAR_INTEGRATION_STATUS.md` - Calendar setup
- `WEBSOCKET_SCALING.md` - WebSocket architecture
- Various audit and review documents

### API Documentation
- `/docs/api/openapi.yaml` - OpenAPI 3.0 specification
- `/docs/api/index.html` - API documentation viewer

---

## Key Architectural Decisions

1. **Offline-First**: Service worker + IndexedDB for field reliability
2. **Mobile-Optimized**: Touch-first UI, simplified workflows
3. **Real-Time Updates**: WebSocket notifications for live collaboration
4. **Type Safety**: End-to-end TypeScript with Zod validation
5. **Modular Architecture**: Feature-based organization, lazy loading
6. **Enterprise Security**: Multi-layer protection, audit trails
7. **Observability-First**: Comprehensive logging, metrics, error tracking
8. **Automated Operations**: Background jobs for routine tasks
9. **Flexible Reporting**: JSON-based template system
10. **Minnesota Code Focus**: Built-in compliance tracking

---

**Document Version**: 4.0  
**Maintained By**: Product Engineering Team  
**Review Cycle**: Quarterly or on major releases
