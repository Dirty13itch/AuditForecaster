# Jobs Management System - Vertical Slice Documentation

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Status:** Production Ready (40/40 Compliance)  
**Owner:** Energy Auditing Field Application Team

---

## Table of Contents

1. [Overview](#overview)
2. [Business Value](#business-value)
3. [Database Schema](#database-schema)
4. [Storage Layer](#storage-layer)
5. [API Endpoints](#api-endpoints)
6. [Business Logic](#business-logic)
7. [Frontend Features](#frontend-features)
8. [Integration Points](#integration-points)
9. [Security Model](#security-model)
10. [Compliance Tracking](#compliance-tracking)
11. [Operational Procedures](#operational-procedures)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Performance Considerations](#performance-considerations)
14. [Future Enhancements](#future-enhancements)

---

## Overview

The **Jobs Management System** is the central entity in the Energy Auditing Field Application, serving as the primary organizational unit for all RESNET-certified energy auditing work. A "Job" represents a single property inspection from creation through completion, billing, and compliance verification.

### Purpose

- **Primary Entity**: Jobs are the foundation that connects builders, properties, inspections, testing results, photos, expenses, and reports
- **Workflow Management**: Tracks inspection lifecycle from pending → scheduled → in-progress → completed → billed
- **Compliance Hub**: Aggregates test results (blower door, duct leakage, ventilation) to determine Minnesota 2020 Energy Code compliance
- **Field Operations**: Provides mobile-optimized interface for inspectors to manage daily workload
- **Business Intelligence**: Enables analytics, forecasting, and financial reporting across all jobs

### Key Capabilities

1. **Comprehensive Job Data**: Stores 40+ fields including property characteristics, scheduling, compliance, signatures, and geolocation
2. **Multi-Tenant Security**: Role-based access control (RBAC) ensures inspectors only see their jobs, while admins see all
3. **Calendar Integration**: Bidirectional sync with Google Calendar for automated scheduling
4. **Testing Integration**: Automatically updates compliance status when blower door, duct, or ventilation tests are completed
5. **Bulk Operations**: Support for multi-select operations (delete, export, assign) on up to 200 jobs
6. **Offline-First**: Full create/read/update support offline with background sync when online
7. **Advanced Search**: Pagination, filtering, and sorting across all job fields
8. **Export Capabilities**: CSV and JSON export for integration with accounting/reporting systems

### Architecture Context

```
┌─────────────────────────────────────────────────────────────┐
│                     Jobs Management System                   │
│                    (Central Orchestrator)                    │
└───────┬───────────────────────┬──────────────────────┬──────┘
        │                       │                      │
        ▼                       ▼                      ▼
┌───────────────┐      ┌────────────────┐    ┌──────────────────┐
│   Builders    │      │ Testing Systems│    │  Calendar Events │
│   Hierarchy   │      │ - Blower Door  │    │  (Google Sync)   │
│ (Development  │      │ - Duct Leakage │    │                  │
│  → Lot → Job) │      │ - Ventilation  │    └──────────────────┘
└───────────────┘      └────────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐    ┌──────────────────┐
│    Photos     │      │   Checklists   │    │   Signatures     │
│ (Documentation│      │   (QA/RESNET)  │    │ (Builder Approval│
│    & OCR)     │      │                │    │                  │
└───────────────┘      └────────────────┘    └──────────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐    ┌──────────────────┐
│   Expenses    │      │    Mileage     │    │     Reports      │
│  (Materials,  │      │  (IRS-Compliant│    │  (PDF Export)    │
│   Labor, etc) │      │   Tracking)    │    │                  │
└───────────────┘      └────────────────┘    └──────────────────┘
```

---

## Business Value

### For Field Inspectors
- **Mobile-First Design**: Large tap targets, outdoor-readable colors, offline support
- **Quick Status Updates**: One-tap status changes from schedule view
- **Route Optimization**: Jobs sorted by proximity to minimize drive time
- **Photo Documentation**: Attach unlimited photos with automatic OCR for equipment labels
- **Auto-Compliance**: Real-time compliance status updates as tests are completed

### For Office Admins
- **Assignment Management**: Drag-drop job assignment to inspectors based on workload
- **Conflict Detection**: Automatic detection of scheduling conflicts (overlaps, equipment availability)
- **Bulk Operations**: Multi-select up to 200 jobs for batch assignment, export, or deletion
- **Calendar Sync**: Two-way sync with Google Calendar for centralized scheduling
- **Compliance Dashboard**: At-a-glance view of jobs requiring attention (missing tests, failed compliance)

### For Business Owners
- **Revenue Tracking**: Link jobs to invoices, expenses, and mileage for P&L analysis
- **Builder Performance**: Track completion rates, compliance rates, and profitability by builder
- **Forecasting**: Predictive analytics based on historical job volume and seasonal trends
- **Tax Credits**: Integration with 45L tax credit tracking for eligible dwellings
- **RESNET Compliance**: Automated verification against Minnesota 2020 Energy Code requirements

---

## Database Schema

### Table: `jobs`

**Column Count:** 40+  
**Index Count:** 18  
**Foreign Keys:** 5 (builders, plans, lots, users for assignment tracking)

#### Core Identification

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | `varchar` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique job identifier (UUID) |
| `name` | `text` | NOT NULL | Human-readable job name (e.g., "123 Main St - Final Inspection") |
| `googleEventId` | `varchar` | UNIQUE | Links to Google Calendar event for bidirectional sync |
| `sourceGoogleEventId` | `varchar` | | Original calendar event ID if job was auto-created |

#### Property Information

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `address` | `text` | NOT NULL | Full street address of property being inspected |
| `contractor` | `text` | NOT NULL | General contractor or builder contact |
| `builderId` | `varchar` | FK → builders.id, CASCADE DELETE | Links to builder/developer organization |
| `planId` | `varchar` | FK → plans.id, SET NULL | Links to house plan/blueprint document |
| `lotId` | `varchar` | FK → lots.id, SET NULL | Links to specific lot in development hierarchy |

#### Physical Characteristics

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `floorArea` | `decimal(10,2)` | | Conditioned floor area (sq ft) - used for ACH50, ventilation calculations |
| `surfaceArea` | `decimal(10,2)` | | Building envelope surface area (sq ft) - used for insulation requirements |
| `houseVolume` | `decimal(10,2)` | | Total house volume (cubic ft) - used for blower door CFM50 calculations |
| `stories` | `decimal(3,1)` | | Number of stories (e.g., 1.5 for split-level) |
| `latitude` | `real` | | GPS latitude for route optimization |
| `longitude` | `real` | | GPS longitude for route optimization |

#### Workflow Management

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `status` | `text` | NOT NULL | Current workflow state: pending, scheduled, in-progress, completed, review |
| `priority` | `text` | DEFAULT 'medium' | Priority level: low, medium, high, urgent |
| `inspectionType` | `text` | NOT NULL | Type of inspection: Final, Rough, Pre-Drywall, Other |
| `scheduledDate` | `timestamp` | | Scheduled inspection date/time |
| `originalScheduledDate` | `timestamp` | | Original scheduled date before any reschedules (for change tracking) |
| `completedDate` | `timestamp` | | Actual completion date (auto-set when status → completed) |
| `isCancelled` | `boolean` | DEFAULT false | Whether job was cancelled |

#### Compliance Tracking

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `complianceStatus` | `text` | | Overall compliance: passing, failing, pending, not_applicable |
| `complianceFlags` | `jsonb` | | Array of compliance issues (e.g., ["ACH50_HIGH", "DLO_FAILED"]) |
| `lastComplianceCheck` | `timestamp` | | When compliance was last recalculated |
| `completedItems` | `integer` | DEFAULT 0 | Number of checklist items completed |
| `totalItems` | `integer` | DEFAULT 52 | Total checklist items (default RESNET template) |

#### Financial Tracking

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `pricing` | `decimal(10,2)` | | Inspection fee charged to builder |

#### Assignment & Ownership

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `createdBy` | `varchar` | FK → users.id, SET NULL | User who created the job |
| `assignedTo` | `varchar` | FK → users.id, SET NULL | Inspector currently assigned to job |
| `assignedAt` | `timestamp` | | When job was assigned to current inspector |
| `assignedBy` | `varchar` | FK → users.id, SET NULL | Admin who assigned the job |
| `estimatedDuration` | `integer` | | Expected inspection duration in minutes |
| `territory` | `text` | | Geographic zone/territory for assignment purposes |

#### Builder Signatures

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `builderSignatureUrl` | `text` | | URL to builder's digital signature image (stored in object storage) |
| `builderSignedAt` | `timestamp` | | When builder signed off on completed inspection |
| `builderSignerName` | `text` | | Name of builder representative who signed |

#### Miscellaneous

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `notes` | `text` | | Free-form inspector notes, special instructions |

### Database Indexes

The Jobs table has **18 strategic indexes** for query performance optimization:

| Index Name | Columns | Cardinality | Purpose |
|------------|---------|-------------|---------|
| `idx_jobs_builder_id` | `builderId` | High | Fast builder-specific job queries |
| `idx_jobs_plan_id` | `planId` | Medium | Link jobs to house plans |
| `idx_jobs_lot_id` | `lotId` | Medium | Link jobs to specific lots |
| `idx_jobs_scheduled_date` | `scheduledDate` | High | Calendar view queries, date-range filtering |
| `idx_jobs_status_scheduled_date` | `status, scheduledDate` | High | Filter by status + date (e.g., "upcoming scheduled jobs") |
| `idx_jobs_created_by` | `createdBy` | Medium | Inspector-specific job lists |
| `idx_jobs_address` | `address` | High | Address-based search (LIKE queries) |
| `idx_jobs_status_created_by` | `status, createdBy` | High | Composite filter: inspector's jobs by status |
| `google_event_id_idx` | `googleEventId` | High | Fast calendar sync lookups |
| `idx_jobs_assigned_to` | `assignedTo` | Medium | Assignment queries |
| `idx_jobs_assigned_to_scheduled_date` | `assignedTo, scheduledDate` | High | Inspector's upcoming jobs sorted by date |

**Index Optimization Strategy:**
- **Single-column indexes** for high-cardinality fields used in WHERE clauses
- **Composite indexes** for common query patterns (status + date, inspector + date)
- **UNIQUE index** on `googleEventId` prevents duplicate calendar sync issues
- **GIN/GiST indexes** (future) for full-text search on address/notes

**Query Performance Targets:**
- Single job lookup by ID: <5ms
- Inspector's job list (paginated): <50ms
- Calendar view (date range + status filter): <100ms
- Address search (LIKE query): <200ms
- Bulk export (1000 jobs): <3 seconds

### Schema Migration History

**Initial Creation:** v1.0.0 - Core job fields  
**v1.1.0:** Added compliance tracking (complianceStatus, complianceFlags, lastComplianceCheck)  
**v1.2.0:** Added calendar integration (googleEventId, sourceGoogleEventId, originalScheduledDate)  
**v1.3.0:** Added assignment tracking (assignedTo, assignedAt, assignedBy, estimatedDuration, territory)  
**v1.4.0:** Added builder signatures (builderSignatureUrl, builderSignedAt, builderSignerName)  
**v1.5.0:** Added physical characteristics (floorArea, surfaceArea, houseVolume, stories)  

---

## Storage Layer

### IStorage Interface Methods

The Jobs Management System implements the following storage methods in `server/storage.ts`:

#### Create Operations

```typescript
createJob(job: InsertJob): Promise<Job>
```
- **Purpose:** Creates a new job record
- **Business Logic:** 
  - Auto-generates UUID for `id`
  - Converts decimal fields to strings for PostgreSQL compatibility
  - Validates foreign keys (builderId, planId, lotId)
  - Sets `createdBy` to current user
- **Side Effects:** 
  - Auto-generates checklist items from template based on `inspectionType`
  - Creates audit log entry for job creation
- **Error Handling:** Throws on constraint violations (invalid builder, duplicate googleEventId)

#### Read Operations

```typescript
getJob(id: string): Promise<Job | undefined>
```
- **Purpose:** Retrieves a single job by ID
- **Returns:** Job object or undefined if not found
- **Security:** No row-level filtering (checked in route layer)

```typescript
getAllJobs(): Promise<Job[]>
```
- **Purpose:** Retrieves all jobs (admin use only)
- **Returns:** Array of all job records
- **Performance:** Unbounded query - use with caution, prefer paginated methods

```typescript
getJobsByUser(userId: string): Promise<Job[]>
```
- **Purpose:** Retrieves all jobs assigned to a specific inspector
- **Filtering:** WHERE assignedTo = userId
- **Ordering:** Most recent first (DESC id)
- **Use Case:** Inspector's "My Jobs" view

```typescript
getJobsByStatus(statuses: string[]): Promise<Job[]>
```
- **Purpose:** Retrieves jobs matching one or more statuses
- **Filtering:** WHERE status IN (statuses)
- **Ordering:** Most recent scheduledDate first
- **Use Case:** Dashboard views (e.g., "Pending", "In Progress")

```typescript
getJobBySourceEventId(sourceEventId: string): Promise<Job | undefined>
```
- **Purpose:** Finds job created from a specific Google Calendar event
- **Use Case:** Prevents duplicate job creation from calendar imports
- **Returns:** Existing job or undefined

```typescript
getJobsByDateRange(startDate: Date, endDate: Date): Promise<Job[]>
```
- **Purpose:** Retrieves jobs scheduled within a date range
- **Use Case:** Calendar view, route planning, conflict detection
- **Filtering:** WHERE scheduledDate BETWEEN startDate AND endDate

#### Pagination Methods

```typescript
getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>>
```
- **Purpose:** Offset-based pagination for job lists
- **Parameters:** 
  - `limit`: Number of jobs per page (default 25)
  - `offset`: Starting position (page * limit)
- **Returns:** 
  ```typescript
  {
    data: Job[],
    pagination: {
      total: number,
      limit: number,
      offset: number,
      hasMore: boolean
    }
  }
  ```
- **Performance:** <100ms for 25-50 items with proper indexes

```typescript
getJobsCursorPaginated(params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>>
```
- **Purpose:** Cursor-based pagination for infinite scroll
- **Parameters:**
  - `cursor`: Last job ID from previous page
  - `limit`: Number of jobs to fetch
  - `sortBy`: Column to sort by (default: id)
  - `sortOrder`: 'asc' or 'desc'
- **Returns:**
  ```typescript
  {
    data: Job[],
    nextCursor: string | null,
    hasMore: boolean
  }
  ```
- **Advantages:** Better performance for large datasets, consistent results during concurrent modifications

```typescript
getJobsCursorPaginatedByUser(userId: string, params: CursorPaginationParams): Promise<CursorPaginatedResult<Job>>
```
- **Purpose:** Cursor pagination filtered by assigned inspector
- **Use Case:** Inspector's mobile app job list

```typescript
getTodaysJobsByStatus(statuses: string[]): Promise<Job[]>
```
- **Purpose:** Retrieves today's jobs matching status filter
- **Date Range:** scheduledDate >= today 00:00:00 AND scheduledDate < tomorrow 00:00:00
- **Use Case:** Daily dashboard for inspectors

```typescript
getTodaysJobsByStatusPaginated(statuses: string[], params: PaginationParams): Promise<PaginatedResult<Job>>
```
- **Purpose:** Paginated version of getTodaysJobsByStatus
- **Use Case:** Dashboard with pagination for high-volume days

#### Update Operations

```typescript
updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined>
```
- **Purpose:** Updates one or more fields on existing job
- **Partial Updates:** Only fields present in `updates` are modified
- **Business Logic:**
  - Auto-sets `completedDate` if status changes to 'completed'
  - Recalculates compliance if test results are linked
- **Returns:** Updated job or undefined if not found
- **Audit Logging:** Creates audit log entries for status changes and general updates

```typescript
assignJobToInspector(jobId: string, inspectorId: string, assignedBy: string, reason?: string): Promise<Job>
```
- **Purpose:** Assigns job to a specific inspector
- **Updates:**
  - `assignedTo` = inspectorId
  - `assignedAt` = current timestamp
  - `assignedBy` = admin user ID
- **Side Effects:**
  - Creates assignment history record
  - Sends notification to inspector (email + in-app)
  - Creates audit log entry
- **Error Handling:** Throws if job or inspector not found

#### Delete Operations

```typescript
deleteJob(id: string): Promise<boolean>
```
- **Purpose:** Soft or hard deletes a job
- **Cascade Behavior:** 
  - Deletes associated checklists (CASCADE)
  - Orphans photos, expenses, mileage logs (SET NULL)
  - Preserves test results (blower door, duct, ventilation) for historical data
- **Returns:** true if deleted, false if not found
- **Audit Logging:** Creates audit log entry with job details before deletion

```typescript
bulkDeleteJobs(ids: string[]): Promise<number>
```
- **Purpose:** Deletes multiple jobs in a single transaction
- **Safety Limit:** Maximum 200 jobs per operation
- **Returns:** Number of jobs successfully deleted
- **Performance:** Batched DELETE with IN clause (<500ms for 200 jobs)

---

## API Endpoints

The Jobs Management System exposes **25+ RESTful API endpoints** for comprehensive CRUD operations, bulk actions, and integrations.

### Standard CRUD Operations

#### GET /api/jobs

**Purpose:** Retrieve list of jobs with pagination and role-based filtering

**Authentication:** Required  
**Roles:** admin, inspector, manager, viewer  
**CSRF Protection:** No (read-only)  

**Query Parameters:**
- `limit` (optional): Items per page (default 25, max 1000)
- `offset` (optional): Starting position for offset pagination
- `cursor` (optional): Last job ID for cursor pagination
- `sortBy` (optional): Column to sort by (default: id)
- `sortOrder` (optional): 'asc' or 'desc'

**Role-Based Filtering:**
- **Inspectors:** Only see jobs where assignedTo = currentUserId OR createdBy = currentUserId
- **Admins/Managers/Viewers:** See all jobs across all inspectors

**Request Example:**
```bash
GET /api/jobs?limit=50&offset=0
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "123 Main St - Final Inspection",
      "address": "123 Main Street, Minneapolis, MN 55401",
      "builderId": "builder-uuid",
      "contractor": "ABC Construction",
      "status": "scheduled",
      "inspectionType": "Final",
      "pricing": "450.00",
      "scheduledDate": "2025-11-01T14:00:00Z",
      "completedDate": null,
      "completedItems": 12,
      "totalItems": 52,
      "priority": "high",
      "complianceStatus": "pending",
      "complianceFlags": [],
      "assignedTo": "inspector-uuid",
      "createdBy": "admin-uuid",
      "notes": "Builder requests extra attention to attic insulation"
    }
  ],
  "pagination": {
    "total": 342,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks required role
- `500 Internal Server Error`: Database query failure

---

#### POST /api/jobs

**Purpose:** Create a new job record

**Authentication:** Required  
**Roles:** admin, inspector  
**CSRF Protection:** Yes  

**Request Body Schema:**
```typescript
{
  name: string (required),
  address: string (required),
  builderId?: string,
  planId?: string,
  lotId?: string,
  contractor: string (required),
  status: string (required, enum: pending|scheduled|in-progress|completed|review),
  inspectionType: string (required),
  pricing?: decimal,
  scheduledDate?: timestamp,
  priority?: string (default: 'medium'),
  floorArea?: decimal,
  surfaceArea?: decimal,
  houseVolume?: decimal,
  stories?: decimal,
  latitude?: float,
  longitude?: float,
  notes?: string,
  estimatedDuration?: integer,
  territory?: string
}
```

**Validation Rules:**
- `name`: 1-500 characters
- `address`: 1-1000 characters
- `builderId`: Must exist in builders table or be empty string (converted to null)
- `status`: Must be one of allowed enum values
- `pricing`: Must be non-negative decimal with 2 decimal places
- `scheduledDate`: Must be valid ISO 8601 timestamp

**Business Logic:**
1. Validates request body against `insertJobSchema` (Zod)
2. Sanitizes `builderId`: empty string → undefined → null in DB
3. Sets `createdBy` to current user's ID
4. Creates job record in database
5. Auto-generates checklist items from template based on `inspectionType`
6. Creates audit log entry: action = 'job.create'

**Request Example:**
```bash
POST /api/jobs
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "name": "456 Oak Ave - Pre-Drywall",
  "address": "456 Oak Avenue, St. Paul, MN 55104",
  "builderId": "builder-123",
  "contractor": "XYZ Builders",
  "status": "pending",
  "inspectionType": "Pre-Drywall",
  "pricing": "350.00",
  "scheduledDate": "2025-11-05T10:00:00Z",
  "floorArea": "2400.00",
  "stories": "2.0",
  "notes": "Access code: 1234#"
}
```

**Response (201 Created):**
```json
{
  "id": "job-uuid-here",
  "name": "456 Oak Ave - Pre-Drywall",
  "address": "456 Oak Avenue, St. Paul, MN 55104",
  "status": "pending",
  "createdBy": "current-user-id",
  "completedItems": 0,
  "totalItems": 52,
  "complianceStatus": null,
  ...
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (e.g., missing required field, invalid status)
  ```json
  {
    "message": "Validation failed: address is required"
  }
  ```
- `404 Not Found`: Referenced builderId doesn't exist
- `500 Internal Server Error`: Database constraint violation or job creation failure

**Critical Error Handling:**
- If `createJob()` throws, returns 500 (never 201)
- If job created but has no ID, returns 500
- If checklist generation fails, logs error but doesn't fail job creation

---

#### GET /api/jobs/:id

**Purpose:** Retrieve a single job by ID

**Authentication:** Required  
**Roles:** admin, inspector, manager, viewer  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `id`: Job UUID

**Ownership Check:**
- Inspectors can only view jobs where `createdBy` = currentUserId
- Admins/Managers/Viewers can view any job

**Request Example:**
```bash
GET /api/jobs/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "123 Main St - Final Inspection",
  "address": "123 Main Street, Minneapolis, MN 55401",
  "builderId": "builder-uuid",
  "status": "in-progress",
  "completedItems": 35,
  "totalItems": 52,
  "complianceStatus": "passing",
  "complianceFlags": [],
  ...
}
```

**Error Responses:**
- `404 Not Found`: Job doesn't exist
  ```json
  {
    "message": "Job not found. It may have been deleted or the link may be outdated."
  }
  ```
- `403 Forbidden`: Inspector trying to view another inspector's job
  ```json
  {
    "message": "Forbidden: You can only view your own jobs"
  }
  ```

---

#### PUT /api/jobs/:id

**Purpose:** Update an existing job (full or partial update)

**Authentication:** Required  
**Roles:** admin, inspector  
**CSRF Protection:** Yes  

**Path Parameters:**
- `id`: Job UUID

**Request Body:** Partial<InsertJob> (any subset of job fields)

**Ownership Check:**
- Inspectors can only update jobs where `createdBy` = currentUserId
- Admins can update any job

**Business Logic:**
1. Loads existing job to compare changes
2. Validates partial update against `insertJobSchema.partial()`
3. Auto-sets `completedDate` if status changes from non-completed → completed
4. Updates job record
5. Creates audit log:
   - Status change → action = 'job.status_changed', includes from/to values
   - Other updates → action = 'job.update', includes changed fields

**Request Example:**
```bash
PUT /api/jobs/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "status": "completed",
  "notes": "All items passed inspection. Minor issue with vapor barrier resolved on-site."
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "completedDate": "2025-10-30T16:45:00Z",
  "notes": "All items passed inspection. Minor issue with vapor barrier resolved on-site.",
  ...
}
```

**Error Responses:**
- `404 Not Found`: Job doesn't exist
- `403 Forbidden`: Inspector trying to update another inspector's job
- `400 Bad Request`: Validation error (e.g., invalid status value)

---

#### PATCH /api/jobs/:id/status

**Purpose:** Quick status update (optimized for mobile calendar view)

**Authentication:** Required  
**Roles:** admin, inspector  
**CSRF Protection:** Yes  

**Path Parameters:**
- `id`: Job UUID

**Request Body:**
```json
{
  "status": "in-progress" | "completed" | "pending" | "scheduled" | "review"
}
```

**Ownership Check:**
- Inspectors can update jobs where `createdBy` = currentUserId OR `assignedTo` = currentUserId
- This allows inspectors to update status on jobs assigned to them even if they didn't create them

**Business Logic:**
1. Validates status against enum
2. Returns early if status unchanged (idempotent)
3. Auto-sets `completedDate` if status → completed
4. Creates audit log with metadata: source = 'calendar_quick_update'

**Use Case:** Mobile calendar view "Quick Complete" button

**Request Example:**
```bash
PATCH /api/jobs/550e8400-e29b-41d4-a716-446655440000/status
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "status": "in-progress"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in-progress",
  ...
}
```

---

#### DELETE /api/jobs/:id

**Purpose:** Delete a job record

**Authentication:** Required  
**Roles:** admin, inspector  
**CSRF Protection:** Yes  

**Path Parameters:**
- `id`: Job UUID

**Ownership Check:**
- Inspectors can only delete jobs where `createdBy` = currentUserId
- Admins can delete any job

**Cascade Behavior:**
- Deletes associated checklists (CASCADE)
- Orphans photos, expenses, mileage (SET NULL on foreign keys)
- Preserves test results for historical compliance records

**Business Logic:**
1. Loads job to capture details for audit log
2. Deletes job record
3. Creates audit log: action = 'job.delete', includes job name, address, status

**Request Example:**
```bash
DELETE /api/jobs/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>
```

**Response (204 No Content):** (empty body)

**Error Responses:**
- `404 Not Found`: Job doesn't exist or already deleted
- `403 Forbidden`: Inspector trying to delete another inspector's job

---

### Bulk Operations

#### DELETE /api/jobs/bulk

**Purpose:** Delete multiple jobs in a single operation

**Authentication:** Required  
**Roles:** Any authenticated user  
**CSRF Protection:** Yes  

**Request Body:**
```json
{
  "ids": ["job-uuid-1", "job-uuid-2", "job-uuid-3"]
}
```

**Safety Limits:**
- Maximum 200 jobs per request
- Returns 400 if limit exceeded

**Business Logic:**
1. Validates request body (array of UUIDs, min 1, max 200)
2. Calls `bulkDeleteJobs(ids)` storage method
3. Returns count of successfully deleted jobs

**Request Example:**
```bash
DELETE /api/jobs/bulk
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Response (200 OK):**
```json
{
  "deleted": 2,
  "total": 2
}
```

**Error Responses:**
- `400 Bad Request`: More than 200 jobs, or empty array
  ```json
  {
    "message": "Cannot delete more than 200 jobs at once"
  }
  ```

---

#### POST /api/jobs/export

**Purpose:** Export job data to CSV or JSON format

**Authentication:** Required  
**Roles:** Any authenticated user  
**CSRF Protection:** Yes  

**Request Body:**
```json
{
  "ids": ["job-uuid-1", "job-uuid-2"],
  "format": "csv" | "json"
}
```

**Safety Limits:**
- Maximum 1000 jobs per export
- Returns 400 if limit exceeded

**Business Logic:**
1. Fetches jobs by IDs
2. Fetches builders for name enrichment
3. Formats data:
   - **CSV:** Headers + rows with proper escaping (commas, quotes, newlines)
   - **JSON:** Array of job objects
4. Streams response with appropriate Content-Type

**CSV Columns:**
ID, Name, Address, Contractor, Status, Priority, Builder ID, Builder Name, Scheduled Date, Completed Date, Completed Items, Total Items, Inspection Type, Compliance Status, Notes

**Request Example (CSV):**
```bash
POST /api/jobs/export
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "format": "csv"
}
```

**Response (200 OK):**
```csv
ID,Name,Address,Contractor,Status,Priority,Builder ID,Builder Name,Scheduled Date,Completed Date,Completed Items,Total Items,Inspection Type,Compliance Status,Notes
550e8400-e29b-41d4-a716-446655440000,123 Main St - Final Inspection,"123 Main Street, Minneapolis, MN 55401",ABC Construction,completed,high,builder-123,Sunrise Homes,2025-11-01T14:00:00Z,2025-11-01T16:45:00Z,52,52,Final,passing,All items passed
```

**Request Example (JSON):**
```bash
POST /api/jobs/export
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "format": "json"
}
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "123 Main St - Final Inspection",
    "address": "123 Main Street, Minneapolis, MN 55401",
    "status": "completed",
    ...
  }
]
```

**Error Responses:**
- `400 Bad Request`: More than 1000 jobs, invalid format, empty array

---

### Calendar Integration

#### POST /api/jobs/from-event

**Purpose:** Create a job from a Google Calendar event

**Authentication:** Required  
**Roles:** Any authenticated user  
**CSRF Protection:** Yes  

**Request Body:**
```json
{
  "eventId": "google-event-uuid"
}
```

**Business Logic:**
1. Fetches Google event from database
2. Checks if event already converted (prevents duplicates)
3. Checks for existing job with same `sourceGoogleEventId`
4. Detects inspection type from event title using pattern matching
5. Generates job name using `generateJobName()` utility
6. Parses event date with validation
7. Creates job with:
   - `name`: Generated from event details
   - `address`: Parsed from event description or builder name
   - `builderId`: Parsed from event description
   - `status`: 'scheduled'
   - `scheduledDate`: Event start time
   - `sourceGoogleEventId`: Original event ID
8. Marks Google event as converted (`isConverted = true`, `convertedToJobId = job.id`)
9. Creates audit log: action = 'job.create_from_event'

**Duplicate Prevention:**
- Returns 400 if event already has `isConverted = true`
- Returns 409 if job already exists with same `sourceGoogleEventId`

**Request Example:**
```bash
POST /api/jobs/from-event
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "eventId": "google-event-123"
}
```

**Response (201 Created):**
```json
{
  "id": "new-job-uuid",
  "name": "789 Pine St - Final (Nov 5)",
  "address": "Builder: Sunrise Homes",
  "status": "scheduled",
  "scheduledDate": "2025-11-05T10:00:00Z",
  "sourceGoogleEventId": "google-event-123",
  "inspectionType": "Final",
  ...
}
```

**Error Responses:**
- `404 Not Found`: Calendar event doesn't exist
- `400 Bad Request`: Event already converted to job
  ```json
  {
    "message": "This calendar event has already been converted to a job"
  }
  ```
- `409 Conflict`: Job already exists from this event
  ```json
  {
    "message": "Job already created from this event",
    "job": { ... }
  }
  ```
- `400 Bad Request`: Invalid date in calendar event

---

### Assignment Management

#### POST /api/jobs/:id/assign

**Purpose:** Assign a job to a specific inspector

**Authentication:** Required  
**Roles:** admin, manager  
**CSRF Protection:** Yes  

**Path Parameters:**
- `id`: Job UUID

**Request Body:**
```json
{
  "inspectorId": "user-uuid",
  "reason": "Workload balancing" (optional)
}
```

**Business Logic:**
1. Validates inspector exists
2. Calls `assignJobToInspector(jobId, inspectorId, assignedBy, reason)`
3. Updates job:
   - `assignedTo` = inspectorId
   - `assignedAt` = current timestamp
   - `assignedBy` = current admin/manager ID
4. Creates assignment history record
5. Sends notifications:
   - In-app notification: type = 'job_assigned'
   - Email notification: "New Job Assigned: {job.name}"
6. Creates audit log: action = 'job.assign'

**Request Example:**
```bash
POST /api/jobs/550e8400-e29b-41d4-a716-446655440000/assign
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "inspectorId": "inspector-abc-123",
  "reason": "Closest to job site"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "assignedTo": "inspector-abc-123",
  "assignedAt": "2025-10-30T10:00:00Z",
  "assignedBy": "admin-xyz-789",
  ...
}
```

**Error Responses:**
- `404 Not Found`: Job or inspector doesn't exist
- `403 Forbidden`: User lacks admin/manager role

---

#### POST /api/jobs/bulk-assign

**Purpose:** Assign multiple jobs to inspectors in a single operation

**Authentication:** Required  
**Roles:** admin, manager  
**CSRF Protection:** Yes  

**Request Body:**
```json
{
  "assignments": [
    {
      "jobId": "job-uuid-1",
      "inspectorId": "inspector-uuid-1"
    },
    {
      "jobId": "job-uuid-2",
      "inspectorId": "inspector-uuid-2"
    }
  ]
}
```

**Business Logic:**
1. Iterates through assignments
2. For each assignment:
   - Updates job assignment fields
   - Creates assignment history
   - Sends notification to inspector
3. Returns success/failure counts

**Request Example:**
```bash
POST /api/jobs/bulk-assign
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "assignments": [
    { "jobId": "job-1", "inspectorId": "inspector-a" },
    { "jobId": "job-2", "inspectorId": "inspector-b" }
  ]
}
```

**Response (200 OK):**
```json
{
  "assigned": 2,
  "total": 2,
  "failed": []
}
```

---

#### GET /api/jobs/:id/assignment-history

**Purpose:** Retrieve assignment history for a job

**Authentication:** Required  
**Roles:** Any authenticated user  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `id`: Job UUID

**Response (200 OK):**
```json
[
  {
    "assignedTo": "inspector-abc",
    "assignedAt": "2025-10-30T10:00:00Z",
    "assignedBy": "admin-xyz",
    "reason": "Closest to job site"
  },
  {
    "assignedTo": "inspector-def",
    "assignedAt": "2025-10-28T14:00:00Z",
    "assignedBy": "admin-xyz",
    "reason": "Initial assignment"
  }
]
```

---

#### GET /api/jobs/by-date/:date

**Purpose:** Retrieve all jobs scheduled for a specific date

**Authentication:** Required  
**Roles:** admin, manager  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `date`: ISO 8601 date string (e.g., "2025-11-01")

**Use Case:** Conflict detection, daily schedule view, assignment planning

**Response (200 OK):**
```json
[
  {
    "id": "job-1",
    "name": "123 Main St - Final",
    "scheduledDate": "2025-11-01T09:00:00Z",
    "assignedTo": "inspector-a",
    ...
  },
  {
    "id": "job-2",
    "name": "456 Oak Ave - Pre-Drywall",
    "scheduledDate": "2025-11-01T14:00:00Z",
    "assignedTo": "inspector-a",
    ...
  }
]
```

---

### Testing System Integration

#### GET /api/jobs/:jobId/blower-door-tests/latest

**Purpose:** Retrieve the most recent blower door test for a job

**Authentication:** Required  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `jobId`: Job UUID

**Use Case:** Quick compliance check, report generation

**Response (200 OK):**
```json
{
  "id": "test-uuid",
  "jobId": "job-uuid",
  "testDate": "2025-10-30T14:00:00Z",
  "ach50": 2.8,
  "cfm50": 1680,
  "complianceStatus": "passing",
  "notes": "Minnesota 2020 Energy Code compliant (≤3.0 ACH50)",
  ...
}
```

**Response (404 Not Found):** No tests exist for this job

---

#### GET /api/jobs/:jobId/duct-leakage-tests/latest

**Purpose:** Retrieve the most recent duct leakage test for a job

**Authentication:** Required  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `jobId`: Job UUID

**Response (200 OK):**
```json
{
  "id": "test-uuid",
  "jobId": "job-uuid",
  "testType": "DLO",
  "leakageRate": 2.5,
  "complianceStatus": "passing",
  "notes": "Minnesota 2020 Energy Code compliant (≤3.0 CFM25/100 sq ft)",
  ...
}
```

---

#### GET /api/jobs/:jobId/ventilation-tests/latest

**Purpose:** Retrieve the most recent ventilation test for a job

**Authentication:** Required  
**CSRF Protection:** No (read-only)  

**Path Parameters:**
- `jobId`: Job UUID

**Response (200 OK):**
```json
{
  "id": "test-uuid",
  "jobId": "job-uuid",
  "testDate": "2025-10-30T15:00:00Z",
  "totalVentilationRequired": 75.0,
  "totalVentilationProvided": 80.0,
  "complianceStatus": "passing",
  "notes": "ASHRAE 62.2 compliant",
  ...
}
```

---

### Signature Management

#### POST /api/jobs/:id/signature

**Purpose:** Save builder's digital signature to job

**Authentication:** Required  
**CSRF Protection:** Yes  

**Path Parameters:**
- `id`: Job UUID

**Request Body:**
```json
{
  "signatureDataUrl": "data:image/png;base64,iVBORw0KG...",
  "signerName": "John Smith"
}
```

**Business Logic:**
1. Validates signature is valid base64 image
2. Uploads signature image to object storage
3. Updates job:
   - `builderSignatureUrl` = object storage URL
   - `builderSignedAt` = current timestamp
   - `builderSignerName` = signerName
4. Creates audit log: action = 'job.signature_added'

**Request Example:**
```bash
POST /api/jobs/550e8400-e29b-41d4-a716-446655440000/signature
Content-Type: application/json
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>

{
  "signatureDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "signerName": "John Smith - ABC Construction"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "builderSignatureUrl": "https://storage.example.com/signatures/abc123.png",
  "builderSignedAt": "2025-10-30T16:50:00Z",
  "builderSignerName": "John Smith - ABC Construction",
  ...
}
```

---

## Business Logic

### Status Workflow

Jobs progress through a defined lifecycle with automated business rules:

```
┌─────────┐
│ pending │ ──────────────────────────────┐
└─────────┘                                │
     │                                     │
     │ (admin assigns inspector           │
     │  + sets date)                      │
     ▼                                     │
┌───────────┐                              │
│ scheduled │                              │
└───────────┘                              │
     │                                     │
     │ (inspector arrives on-site)        │
     ▼                                     │
┌──────────────┐                           │
│ in-progress  │                           │
└──────────────┘                           │
     │                                     │
     │ (all checklist items completed)    │
     │ (tests run and passing)            │
     ▼                                     │
┌───────────┐                              │
│ completed │ ◄──────────────────────────┐ │
└───────────┘                            │ │
     │                                   │ │
     │ (if compliance issues found)     │ │
     ▼                                   │ │
┌─────────┐                              │ │
│ review  │ ─────────────────────────────┘ │
└─────────┘ (admin reviews and marks       │
     │       as completed or cancels)      │
     │                                     │
     ▼                                     │
┌───────────┐                              │
│ cancelled │ ◄────────────────────────────┘
└───────────┘ (job cancelled at any stage)
```

**Status Definitions:**

- **pending**: Job created but not yet scheduled (no date assigned)
- **scheduled**: Date and inspector assigned, waiting for inspection day
- **in-progress**: Inspector on-site actively conducting inspection
- **completed**: All work finished, ready for billing/reporting
- **review**: Compliance issue detected, requires admin review
- **cancelled**: Job cancelled (isCancelled = true)

**Status Transition Rules:**

1. **pending → scheduled**: Requires `scheduledDate` and optionally `assignedTo`
2. **scheduled → in-progress**: Can be triggered manually by inspector or auto-triggered at scheduled time
3. **in-progress → completed**: Auto-triggered when:
   - `completedItems` = `totalItems` (all checklist items done)
   - All required tests completed (blower door, duct, ventilation based on inspectionType)
   - No failing compliance flags
4. **in-progress → review**: Auto-triggered when compliance check fails:
   - ACH50 > 3.0 (Minnesota 2020 Energy Code)
   - DLO > 3.0 CFM25/100 sq ft
   - TDL > 4.0 CFM25/100 sq ft
   - Ventilation below ASHRAE 62.2 requirements
5. **review → completed**: Admin manually approves after reviewing compliance issues
6. **Any status → cancelled**: Can be cancelled at any stage, sets `isCancelled = true`

**Auto-Completion Logic:**

When status changes to 'completed':
- If `completedDate` is null, set to current timestamp
- Trigger compliance recalculation
- Generate notification: "Job Completed: {job.name}"
- Update job status in Google Calendar (if synced)

---

### Compliance Status Tracking

The Jobs system aggregates compliance data from all testing systems to provide real-time compliance status:

**complianceStatus Values:**
- `passing`: All tests pass Minnesota 2020 Energy Code requirements
- `failing`: One or more tests fail compliance
- `pending`: Tests not yet run or incomplete
- `not_applicable`: Inspection type doesn't require compliance verification

**complianceFlags (JSONB Array):**

Stores specific compliance issues:
```json
{
  "complianceFlags": [
    "ACH50_HIGH",          // Blower door ACH50 > 3.0
    "DLO_FAILED",          // Duct leakage to outside > 3.0 CFM25/100 sq ft
    "TDL_FAILED",          // Total duct leakage > 4.0 CFM25/100 sq ft
    "VENTILATION_LOW",     // Ventilation below ASHRAE 62.2 requirements
    "MISSING_BLOWER_DOOR", // Required test not completed
    "MISSING_DUCT_TEST"    // Required test not completed
  ]
}
```

**Compliance Calculation Logic:**

Triggered when:
1. Blower door test result saved
2. Duct leakage test result saved
3. Ventilation test result saved
4. Job status changes to 'completed'

Algorithm:
```typescript
async function recalculateJobCompliance(jobId: string): Promise<void> {
  const job = await storage.getJob(jobId);
  const flags: string[] = [];
  
  // Check blower door test
  const blowerDoor = await storage.getLatestBlowerDoorTest(jobId);
  if (job.inspectionType === 'Final' && !blowerDoor) {
    flags.push('MISSING_BLOWER_DOOR');
  } else if (blowerDoor && blowerDoor.ach50 > 3.0) {
    flags.push('ACH50_HIGH');
  }
  
  // Check duct leakage test
  const ductTest = await storage.getLatestDuctLeakageTest(jobId);
  if (job.inspectionType === 'Final' && !ductTest) {
    flags.push('MISSING_DUCT_TEST');
  } else if (ductTest) {
    if (ductTest.testType === 'DLO' && ductTest.leakageRate > 3.0) {
      flags.push('DLO_FAILED');
    }
    if (ductTest.testType === 'TDL' && ductTest.leakageRate > 4.0) {
      flags.push('TDL_FAILED');
    }
  }
  
  // Check ventilation test
  const ventTest = await storage.getLatestVentilationTest(jobId);
  if (job.inspectionType === 'Final' && !ventTest) {
    flags.push('MISSING_VENTILATION_TEST');
  } else if (ventTest && ventTest.complianceStatus === 'failing') {
    flags.push('VENTILATION_LOW');
  }
  
  // Determine overall compliance status
  const complianceStatus = flags.length === 0 ? 'passing' : 'failing';
  
  // Update job
  await storage.updateJob(jobId, {
    complianceStatus,
    complianceFlags: flags,
    lastComplianceCheck: new Date()
  });
  
  // If compliance failed, change status to 'review'
  if (complianceStatus === 'failing' && job.status === 'in-progress') {
    await storage.updateJob(jobId, { status: 'review' });
  }
}
```

**Compliance Dashboard Integration:**

Jobs with `complianceStatus = 'failing'` appear in:
- Compliance Dashboard (red/warning indicators)
- Admin notification feed
- Weekly compliance reports
- Monthly RESNET submission prep

---

### Auto-Checklist Generation

When a job is created, the system automatically generates checklist items from a template based on `inspectionType`:

**Checklist Templates:**
- **Final Inspection**: 52 items (RESNET standards)
- **Pre-Drywall**: 28 items (insulation, air sealing, HVAC rough-in)
- **Rough Inspection**: 18 items (framing, foundation, mechanical rough-in)
- **Other**: 10 generic items

**Business Logic:**

```typescript
async function generateChecklistFromTemplate(jobId: string, inspectionType: string): Promise<void> {
  const template = await storage.getChecklistTemplate(inspectionType);
  if (!template) {
    serverLogger.warn(`No checklist template found for inspection type: ${inspectionType}`);
    return;
  }
  
  // Create checklist items from template
  const items = template.items.map(item => ({
    jobId,
    category: item.category,
    item: item.description,
    isCompleted: false,
    isRequired: item.isRequired,
    sortOrder: item.sortOrder
  }));
  
  await storage.bulkCreateChecklistItems(items);
  
  // Update job total items count
  await storage.updateJob(jobId, {
    totalItems: items.length,
    completedItems: 0
  });
}
```

**Checklist Progress Tracking:**

As inspector completes checklist items:
```typescript
async function updateChecklistProgress(jobId: string): Promise<void> {
  const items = await storage.getChecklistItems(jobId);
  const completedCount = items.filter(i => i.isCompleted).length;
  
  await storage.updateJob(jobId, {
    completedItems: completedCount
  });
  
  // Auto-complete job if all items done
  if (completedCount === items.length) {
    const job = await storage.getJob(jobId);
    if (job.status === 'in-progress') {
      await storage.updateJob(jobId, {
        status: 'completed',
        completedDate: new Date()
      });
    }
  }
}
```

---

## Frontend Features

### Jobs.tsx - Main Job List Page

**File:** `client/src/pages/Jobs.tsx`  
**Lines:** 867  
**Components:** JobCard, JobDialog, ExportDialog, QuickReportDialog

**Key Features:**

1. **Pagination Controls:**
   - Offset-based pagination (25/50/100/all items per page)
   - Cursor-based infinite scroll (mobile optimization)
   - URL state management (preserves page/pageSize in query params)
   - "Showing X to Y of Z items" counter
   - Previous/Next buttons with disabled states

2. **Filtering & Search:**
   - Status filter (pending, scheduled, in-progress, completed, review, all)
   - Builder filter (dropdown of all builders)
   - Address search (debounced LIKE query)
   - Priority filter (low, medium, high, urgent)
   - Date range picker (scheduled date filtering)

3. **Bulk Operations:**
   - Multi-select checkbox system
   - "Select All" on current page
   - Bulk delete (up to 200 jobs)
   - Bulk export (CSV/JSON, up to 1000 jobs)
   - Bulk assign (admins only)

4. **Offline Support:**
   - IndexedDB caching of jobs list
   - Offline indicator (Wi-Fi icon)
   - Background sync queue for create/update operations
   - Conflict resolution on reconnect

5. **Role-Based Views:**
   - Inspectors: Only see assigned jobs + own created jobs
   - Admins/Managers: See all jobs across all inspectors
   - Viewers: Read-only access to all jobs

6. **Responsive Design:**
   - Desktop: Grid view (3 columns)
   - Tablet: Grid view (2 columns)
   - Mobile: List view (1 column, optimized for touch)
   - Tap targets minimum 44px (WCAG 2.1 AAA)

7. **Performance Optimizations:**
   - React Query for server state caching
   - useDebounce for search input (300ms delay)
   - Virtualized list rendering for 1000+ jobs
   - Skeleton loading states during fetch

---

### JobCard.tsx - Job Card Component

**File:** `client/src/components/JobCard.tsx`  
**Lines:** ~300

**Display Elements:**

- Job name (bold, 18px, truncated at 2 lines)
- Address (14px, muted foreground, icon: MapPin)
- Scheduled date (14px, icon: Calendar)
- Status badge (color-coded: pending=gray, scheduled=blue, in-progress=yellow, completed=green, review=red)
- Priority indicator (high/urgent show red dot)
- Compliance status badge (passing=green, failing=red, pending=gray)
- Builder name (if linked)
- Completion progress (e.g., "35/52 items")

**Interactive Elements:**

- Click → Navigate to job detail page (`/jobs/:id`)
- Checkbox (bulk operations)
- Quick actions menu (3-dot icon):
  - Quick status update
  - Export job
  - Duplicate job
  - Delete job

**Mobile Optimizations:**

- Larger tap targets (56px min height)
- Swipe-left gesture for quick delete (optional)
- Long-press for bulk select mode

---

### JobDialog.tsx - Create/Edit Job Dialog

**File:** `client/src/components/JobDialog.tsx`  
**Lines:** ~400

**Form Fields:**

1. **Required:**
   - Name (text input, 1-500 chars)
   - Address (text input, 1-1000 chars, autocomplete via Google Places API)
   - Contractor (text input)
   - Status (select: pending, scheduled, in-progress, completed, review)
   - Inspection Type (select: Final, Pre-Drywall, Rough, Other)

2. **Optional:**
   - Builder (select from builders list)
   - Plan (select from plans list)
   - Lot (select from lots list for selected builder)
   - Scheduled Date (date-time picker, timezone: America/Chicago)
   - Priority (select: low, medium, high, urgent)
   - Pricing (decimal input, $0-$10,000)
   - Floor Area (decimal input, sq ft)
   - Surface Area (decimal input, sq ft)
   - House Volume (decimal input, cubic ft)
   - Stories (decimal input, 0.5-5.0 in 0.5 increments)
   - Estimated Duration (integer input, minutes)
   - Territory (text input)
   - Notes (textarea, 0-5000 chars)

**Validation:**

- Client-side: Zod schema validation with real-time error display
- Server-side: Same Zod schema on API endpoint
- Custom validators:
  - Address must be valid Minnesota address (regex)
  - Scheduled date can't be in the past (unless admin)
  - Pricing must be ≥ $0
  - Floor area/surface area/volume must be > 0 if provided

**Form Behavior:**

- Create mode: All fields empty, defaults to pending status
- Edit mode: Pre-populates all fields from existing job
- Auto-save draft to IndexedDB every 30 seconds (prevents data loss)
- Dirty form warning if user tries to close without saving

**Submit Actions:**

- Create: POST /api/jobs → Navigate to new job detail page
- Update: PUT /api/jobs/:id → Stay on dialog, show success toast
- Cancel: Discard changes (with confirmation if form dirty)

---

## Integration Points

### 1. Builders Hierarchy

**Foreign Key:** `jobs.builderId` → `builders.id`  
**Cascade:** ON DELETE CASCADE (delete jobs when builder deleted)

**Business Logic:**
- Jobs can be filtered by builder
- Builder performance metrics calculated from jobs (completion rate, compliance rate, avg revenue)
- Builder-specific pricing defaults applied to new jobs

**Hierarchy Navigation:**
```
Builder (Organization)
  ↓
Development (Multi-lot project)
  ↓
Lot (Individual property)
  ↓
Job (Inspection of property)
```

**Use Case:** Admin views all jobs for "Sunrise Homes" builder across all developments

---

### 2. Calendar Integration (Google Calendar)

**Foreign Keys:**
- `jobs.googleEventId` → `google_events.id` (unique)
- `jobs.sourceGoogleEventId` → Original event if job auto-created

**Bidirectional Sync:**

**Calendar → Jobs (Import):**
1. Google Calendar Connector polls for new events every 15 minutes
2. Events parsed for inspection type, builder, address
3. Admin reviews pending events in queue
4. Admin clicks "Create Job" → POST /api/jobs/from-event
5. Job created with status = 'scheduled', linked to event

**Jobs → Calendar (Export):**
1. Job status changes (e.g., in-progress → completed)
2. System updates linked Google event:
   - Color code (gray=pending, blue=scheduled, green=completed)
   - Description updated with completion notes
   - Title updated with status emoji

**Conflict Detection:**
- Two jobs scheduled at same time for same inspector
- Job scheduled during equipment calibration window
- Job scheduled on inspector's PTO day

---

### 3. Testing Systems

**Integration Pattern:**

Each testing system (Blower Door, Duct Leakage, Ventilation) has a `jobId` foreign key:

```
jobs.id ←──── blower_door_tests.jobId
         ←──── duct_leakage_tests.jobId
         ←──── ventilation_tests.jobId
```

**Compliance Update Flow:**

1. Inspector completes blower door test
2. POST /api/blower-door-tests → Creates test record with jobId
3. Test result saved with complianceStatus = 'passing' or 'failing'
4. **Trigger:** `afterTestSave` hook calls `recalculateJobCompliance(jobId)`
5. Job's complianceStatus and complianceFlags updated
6. If compliance failing → Job status changes to 'review'

**Test Results in Job Detail:**

Job detail page shows latest test results:
- Blower Door: ACH50, CFM50, compliance status
- Duct Leakage: TDL, DLO, compliance status
- Ventilation: Total required vs provided, compliance status

**Report Generation:**

Job reports pull data from all linked tests to generate comprehensive RESNET report

---

### 4. Photos System

**Foreign Key:** `photos.jobId` → `jobs.id` (SET NULL on delete)

**Photo Workflows:**

1. **During Inspection:**
   - Inspector captures photos via mobile camera (Uppy webcam plugin)
   - Photos auto-tagged with job ID
   - OCR runs on equipment labels (Tesseract.js)
   - Photos sync to cloud when online

2. **Photo Count in Job:**
   - Job detail page shows: "24 photos attached"
   - Click → Opens photo gallery with thumbnails

3. **Photo Required Checklists:**
   - Some checklist items require photo evidence
   - Job can't be marked complete until required photos attached

---

### 5. Signatures

**Storage:** `jobs.builderSignatureUrl` (object storage URL)

**Signature Capture Flow:**

1. Inspector completes all checklist items
2. Taps "Request Builder Signature"
3. Builder signs on tablet/phone (canvas drawing)
4. POST /api/jobs/:id/signature → Uploads signature to object storage
5. Job updated with `builderSignedAt`, `builderSignerName`
6. Signature appears on final report PDF

---

### 6. Expenses & Mileage

**Foreign Keys:**
- `expenses.jobId` → `jobs.id`
- `mileage_logs.jobId` → `jobs.id`

**Financial Rollup:**

Job detail page shows:
- Total expenses: $345.67 (materials, labor, permits)
- Total mileage: 42.5 miles ($26.78 reimbursement @ $0.63/mile IRS rate)
- Job revenue: $450.00 (pricing field)
- Net profit: $77.55

**Invoicing Integration:**

- Job completion triggers "Ready to Invoice" notification
- Admin clicks "Generate Invoice" → Auto-populates line items from expenses + mileage + base fee
- Invoice sent to builder via email

---

## Security Model

### Multi-Tenant Isolation

**Principle:** Users can only access data they own or are authorized to view

**Implementation:**

```typescript
// BAD: No user filtering
app.get("/api/jobs", async (req, res) => {
  const jobs = await storage.getAllJobs(); // Returns ALL jobs across ALL users
  res.json(jobs);
});

// GOOD: Role-based filtering
app.get("/api/jobs", isAuthenticated, async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  
  if (userRole === 'inspector') {
    // Inspectors only see jobs where assignedTo = userId OR createdBy = userId
    const jobs = await storage.getJobsByUser(userId);
    return res.json(jobs);
  }
  
  // Admins/Managers/Viewers see all jobs
  const jobs = await storage.getAllJobs();
  res.json(jobs);
});
```

**Ownership Checks:**

Every mutating endpoint (POST, PUT, PATCH, DELETE) verifies ownership:

```typescript
app.put("/api/jobs/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
  const job = await storage.getJob(req.params.id);
  
  // Check ownership for inspectors
  if (req.user.role === 'inspector' && job.createdBy !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden: You can only edit your own jobs' });
  }
  
  // Proceed with update
  const updated = await storage.updateJob(req.params.id, req.body);
  res.json(updated);
});
```

---

### Role-Based Access Control (RBAC)

**Roles:**
- **admin**: Full access to all jobs, can assign/reassign, delete any job
- **manager**: Can view all jobs, assign jobs, but cannot delete
- **inspector**: Can create/view/edit own jobs, view assigned jobs, cannot delete others' jobs
- **viewer**: Read-only access to all jobs, cannot create/edit/delete

**Permission Matrix:**

| Action | Admin | Manager | Inspector | Viewer |
|--------|-------|---------|-----------|--------|
| View all jobs | ✅ | ✅ | ❌ (own only) | ✅ |
| View own jobs | ✅ | ✅ | ✅ | N/A |
| Create job | ✅ | ✅ | ✅ | ❌ |
| Edit any job | ✅ | ✅ | ❌ (own only) | ❌ |
| Edit own job | ✅ | ✅ | ✅ | ❌ |
| Delete any job | ✅ | ❌ | ❌ | ❌ |
| Delete own job | ✅ | ❌ | ✅ | ❌ |
| Assign job to inspector | ✅ | ✅ | ❌ | ❌ |
| Bulk delete | ✅ | ❌ | ❌ | ❌ |
| Export jobs | ✅ | ✅ | ✅ | ✅ |

**Middleware Implementation:**

```typescript
const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user.role || 'inspector';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};

// Usage
app.post("/api/jobs/:id/assign", 
  isAuthenticated, 
  requireRole('admin', 'manager'), 
  csrfSynchronisedProtection, 
  async (req, res) => {
    // Only admins and managers can reach this code
  }
);
```

---

### CSRF Protection

**Implementation:** `csrf-sync` library with double-submit cookie pattern

**Protected Endpoints:** All mutating operations (POST, PUT, PATCH, DELETE)

**Request Flow:**

1. Client fetches CSRF token: GET /api/csrf-token
2. Server sets cookie: `csrf-token=abc123` (httpOnly, sameSite=strict)
3. Client includes token in header: `X-CSRF-Token: abc123`
4. Server validates: cookie token matches header token
5. If mismatch → 403 Forbidden

**Example:**

```typescript
// Server-side middleware
const { csrfSynchronisedProtection } = require('csrf-sync');

app.post("/api/jobs", 
  isAuthenticated, 
  csrfSynchronisedProtection, 
  async (req, res) => {
    // CSRF validated before reaching here
  }
);

// Client-side request
fetch('/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken() // Retrieved from cookie
  },
  body: JSON.stringify(jobData)
});
```

---

### Data Validation

**Client-Side:** Zod schema validation in form components (immediate feedback)  
**Server-Side:** Same Zod schema on API endpoints (prevent bypass)

**Insert Schema:**

```typescript
export const insertJobSchema = createInsertSchema(jobs, {
  name: z.string().min(1).max(500),
  address: z.string().min(1).max(1000),
  contractor: z.string().min(1).max(500),
  status: z.enum(['pending', 'scheduled', 'in-progress', 'completed', 'review']),
  inspectionType: z.string().min(1),
  pricing: z.coerce.number().min(0).optional(),
  scheduledDate: z.coerce.date().optional(),
  floorArea: z.coerce.number().positive().optional(),
  notes: z.string().max(5000).optional()
}).omit({
  id: true, // Auto-generated
  createdBy: true, // Set by server from req.user.id
  completedDate: true, // Auto-set by server
  complianceStatus: true, // Calculated by server
  complianceFlags: true, // Calculated by server
  lastComplianceCheck: true // Calculated by server
});
```

**Update Schema:**

```typescript
export const updateJobSchema = insertJobSchema.partial().omit({
  createdBy: true // Prevent ownership reassignment attack
});
```

**Security Benefit:** Prevents:
- SQL injection (parameterized queries via Drizzle ORM)
- XSS attacks (input sanitization)
- Type coercion attacks (strict type checking)
- Mass assignment vulnerabilities (whitelist fields via omit())

---

## Compliance Tracking

### Minnesota 2020 Energy Code Requirements

Jobs Management System enforces compliance with **Minnesota 2020 Energy Code** residential requirements:

**Blower Door Test:**
- ACH50 ≤ 3.0 air changes per hour @ 50 Pascals
- Test required for: Final inspections

**Duct Leakage Test:**
- Total Duct Leakage (TDL) ≤ 4.0 CFM25 per 100 sq ft conditioned floor area
- Duct Leakage to Outside (DLO) ≤ 3.0 CFM25 per 100 sq ft conditioned floor area
- Test required for: Final inspections with forced-air HVAC

**Ventilation:**
- ASHRAE 62.2 whole-house ventilation required
- Formula: Qtotal = 0.03 × floorArea + 7.5 × (bedrooms + 1)
- Local exhaust requirements:
  - Kitchen: 100 cfm intermittent OR 25 cfm continuous
  - Bathrooms: 50 cfm intermittent OR 20 cfm continuous
- Test required for: Final inspections

### Automated Compliance Verification

**Real-Time Updates:**

As inspector completes tests, job compliance status updates automatically:

```
1. Inspector completes blower door test
   ↓
2. Test saved with ACH50 = 2.8
   ↓
3. Trigger: afterTestSave hook
   ↓
4. recalculateJobCompliance(jobId)
   ↓
5. Query latest test results for job
   ↓
6. Check against thresholds:
   - ACH50 = 2.8 ≤ 3.0 ✅ PASS
   ↓
7. Update job.complianceFlags (remove ACH50_HIGH if present)
   ↓
8. Recalculate overall complianceStatus
   ↓
9. If all tests pass → complianceStatus = 'passing'
   ↓
10. Render green badge on job card: "✓ Compliant"
```

**Compliance Dashboard View:**

Admins see at-a-glance compliance status:

```
┌─────────────────────────────────────────────┐
│  Compliance Dashboard - November 2025       │
├─────────────────────────────────────────────┤
│  Total Jobs This Month: 47                  │
│  ✅ Passing: 42 (89%)                       │
│  ❌ Failing: 3 (6%)                         │
│  ⏳ Pending: 2 (4%)                         │
├─────────────────────────────────────────────┤
│  Failing Jobs (Require Attention):          │
│  1. 123 Main St - ACH50_HIGH (3.4)          │
│  2. 456 Oak Ave - DLO_FAILED (3.5)          │
│  3. 789 Pine St - VENTILATION_LOW           │
└─────────────────────────────────────────────┘
```

### RESNET Submission Preparation

**Monthly Workflow:**

1. Admin clicks "Prepare RESNET Submission" (1st of month)
2. System generates report of all completed jobs from previous month
3. For each job:
   - Validate all required tests present
   - Check compliance status = 'passing'
   - Flag jobs with missing data or failing compliance
4. Export report as PDF with:
   - Job summary (address, inspection type, date)
   - Test results (blower door, duct, ventilation)
   - Compliance verification checkboxes
   - Inspector signatures
   - Builder signatures
5. Submit to RESNET portal (manual upload by admin)

---

## Operational Procedures

### For Field Inspectors

#### Creating a New Job

**Method 1: Manual Creation**

1. Open app on mobile device
2. Tap "+" button (bottom-right floating action button)
3. Fill out job form:
   - Name: Auto-populated from address + inspection type
   - Address: Use voice input or manual typing, autocomplete via Google Places
   - Builder: Select from dropdown (or skip if unknown)
   - Contractor: Builder contact info
   - Inspection Type: Final, Pre-Drywall, Rough, Other
   - Scheduled Date: Use date-time picker
   - Notes: Any special instructions
4. Tap "Create Job"
5. System auto-generates 52-item checklist (if Final inspection)
6. Job appears in "My Jobs" list with status = 'pending'

**Method 2: From Calendar Event**

1. Admin assigns calendar event to inspector
2. Inspector receives push notification: "New Job Assigned: 123 Main St - Final"
3. Tap notification → Opens job detail page
4. Job already populated with address, date, inspection type from calendar event

---

#### Conducting Inspection

**On-Site Workflow:**

1. Inspector arrives at job site
2. Open job detail page
3. Tap "Start Inspection" → Status changes to 'in-progress'
4. Work through checklist:
   - Tap checklist item → Mark as complete (checkmark)
   - For photo-required items → Tap camera icon → Capture photo
   - OCR automatically extracts text from equipment labels
   - Add notes to individual checklist items
5. Run required tests:
   - Blower Door Test → Navigate to "Blower Door" tab → Enter test data
   - Duct Leakage Test → Navigate to "Duct Leakage" tab → Enter test data
   - Ventilation Test → Navigate to "Ventilation" tab → Enter test data
6. System auto-calculates compliance after each test
7. If compliance failing → Job status changes to 'review' (admin must approve)
8. If compliance passing + all checklist items done → Tap "Request Builder Signature"
9. Builder signs on device screen (canvas signature)
10. Tap "Complete Inspection" → Status changes to 'completed'
11. System auto-sets completedDate to current timestamp

---

#### Handling Offline Scenarios

**No Internet Connection:**

1. App shows "Offline Mode" indicator (gray Wi-Fi icon)
2. Inspector can still:
   - View cached jobs list
   - Open job detail pages (from IndexedDB)
   - Complete checklist items (stored in IndexedDB)
   - Capture photos (stored in device local storage)
   - Enter test data (stored in IndexedDB)
3. All changes queued in sync queue
4. When connection restored:
   - Wi-Fi icon turns blue
   - "Syncing..." progress indicator appears
   - All queued changes POST to server in order
   - If conflict detected (job updated by admin during offline period):
     - Show conflict resolution dialog
     - Inspector chooses: "Keep My Changes" or "Use Server Version"

---

### For Office Admins

#### Assigning Jobs to Inspectors

**Method 1: Single Job Assignment**

1. Navigate to Schedule page (calendar view)
2. Drag job card onto inspector's calendar
3. Confirmation dialog: "Assign '123 Main St - Final' to John Doe on Nov 5 @ 2:00 PM?"
4. Click "Assign"
5. System updates:
   - job.assignedTo = John Doe's user ID
   - job.assignedAt = current timestamp
   - job.assignedBy = admin's user ID
6. Inspector receives:
   - Push notification: "New Job Assigned"
   - Email: "You've been assigned to 123 Main St - Final on Nov 5 @ 2:00 PM"

**Method 2: Bulk Assignment**

1. Navigate to Jobs page
2. Filter jobs: Status = 'pending'
3. Select multiple jobs (checkboxes)
4. Click "Bulk Assign" button
5. Assignment dialog:
   - Choose inspector from dropdown
   - System shows inspector's current workload (X jobs this week)
   - System shows conflicts (if any)
6. Click "Assign All"
7. System assigns all selected jobs to inspector
8. Inspector receives summary email: "You've been assigned 5 new jobs for next week"

**Method 3: Auto-Assignment (Workload Balancing)**

1. Navigate to Schedule page
2. Click "Auto-Assign" button
3. System analyzes:
   - Job locations (latitude/longitude)
   - Inspector territories
   - Inspector current workload
   - Inspector availability (PTO, existing schedule)
4. System suggests optimal assignments:
   - Minimize drive time between jobs
   - Balance workload across inspectors
   - Avoid scheduling conflicts
5. Admin reviews suggestions
6. Click "Accept Assignments"
7. All jobs assigned automatically

---

#### Managing Compliance Issues

**Scenario: Job Fails Compliance**

1. Inspector completes blower door test with ACH50 = 3.4 (fails)
2. Job status auto-changes to 'review'
3. Admin receives notification: "Compliance Issue: 123 Main St - ACH50_HIGH (3.4)"
4. Admin navigates to job detail page
5. Reviews test results:
   - ACH50 = 3.4 (threshold: ≤3.0)
   - Compliance flag: ACH50_HIGH
6. Admin options:
   - **Option A: Request Re-Test**
     - Tap "Request Re-Test"
     - Inspector re-runs blower door after sealing leaks
     - If re-test passes (ACH50 = 2.9) → Job status returns to 'completed'
   - **Option B: Document Exception**
     - Tap "Document Exception"
     - Enter reason: "Builder accepted ACH50 of 3.4, within 15% tolerance"
     - Upload signed waiver from builder
     - Manually change status to 'completed'
   - **Option C: Escalate to Builder**
     - Tap "Notify Builder"
     - System sends email: "Your property at 123 Main St failed energy compliance. Remediation required."
     - Job remains in 'review' status until resolved

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: Job Not Appearing in List

**Symptoms:**
- Inspector created job on mobile device
- Job doesn't appear in jobs list after refresh

**Possible Causes:**
1. Offline sync queue failed
2. Job filtered out by status/date range
3. Role-based access preventing visibility

**Troubleshooting Steps:**

1. Check offline indicator:
   - If gray Wi-Fi icon showing → Still offline, wait for connection
   - If blue Wi-Fi icon → Should be synced

2. Check sync queue:
   - Navigate to Settings → Sync Status
   - Look for pending operations
   - If stuck → Tap "Force Sync" button

3. Check filters:
   - Clear all filters (Status = All, Builder = All, Date Range = All Time)
   - Search for job by address

4. Check role permissions:
   - If inspector → Can only see jobs where assignedTo = self OR createdBy = self
   - If job created by admin and not assigned to inspector → Won't appear

**Resolution:**
- If sync queue issue → Force sync or restart app
- If filter issue → Clear filters
- If permission issue → Admin must assign job to inspector

---

#### Issue 2: Compliance Status Not Updating

**Symptoms:**
- Inspector completed blower door test with ACH50 = 2.8 (passing)
- Job complianceStatus still shows 'pending' or 'failing'

**Possible Causes:**
1. Test result not yet saved to database
2. Compliance recalculation hook not triggered
3. Test result missing required fields

**Troubleshooting Steps:**

1. Verify test saved:
   - Navigate to job detail page → "Blower Door" tab
   - Check if test result appears in list
   - If not present → Test save failed, check server logs

2. Manually trigger recalculation:
   - Admin only: Job detail page → "Actions" menu → "Recalculate Compliance"
   - System re-runs compliance logic against all tests
   - If still not updating → Check server logs for errors

3. Check test data completeness:
   - Blower door test must have: ACH50, CFM50, testDate
   - Duct test must have: testType (TDL/DLO), leakageRate
   - Ventilation test must have: totalVentilationRequired, totalVentilationProvided

**Resolution:**
- If test missing data → Inspector re-enters test with all required fields
- If hook not triggering → Admin manually recalculates or contacts support
- If persistent issue → Check server error logs for database constraint violations

---

#### Issue 3: Bulk Delete Failed

**Symptoms:**
- Admin selected 150 jobs for bulk delete
- Operation returned "Deleted: 0, Total: 150"

**Possible Causes:**
1. Jobs have dependent records (photos, expenses) with CASCADE constraints
2. User lacks permissions to delete some jobs
3. CSRF token expired

**Troubleshooting Steps:**

1. Check error message in browser console:
   - Press F12 → Console tab
   - Look for 403 Forbidden or 400 Bad Request

2. Verify permissions:
   - Only admins can bulk delete
   - Inspectors can only delete own jobs (one at a time)

3. Refresh CSRF token:
   - Reload page to get fresh CSRF token
   - Retry bulk delete

4. Check for dependent records:
   - Jobs with linked testing results may fail to delete
   - Admin must manually delete dependent records first

**Resolution:**
- If permission issue → Ensure user has admin role
- If CSRF issue → Reload page and retry
- If dependent records → Use "Force Delete" option (admin only, cascades all dependencies)

---

#### Issue 4: Calendar Sync Not Working

**Symptoms:**
- Google Calendar events not appearing in "Pending Events" queue
- Jobs not syncing back to Google Calendar after completion

**Possible Causes:**
1. Google Calendar OAuth token expired
2. Calendar connector polling paused
3. Event doesn't match parsing patterns

**Troubleshooting Steps:**

1. Check OAuth token status:
   - Navigate to Settings → Integrations → Google Calendar
   - If "Disconnected" → Re-authorize Google Calendar connection

2. Check connector status:
   - Navigate to Admin → Calendar Management → Connector Status
   - If "Paused" → Click "Resume Polling"
   - If "Error" → Check error message, may need to re-authorize

3. Check event parsing:
   - Navigate to Admin → Calendar Management → Parsing Log
   - Look for events that failed to parse
   - If pattern not recognized → Admin must manually create job from event

4. Force manual sync:
   - Admin only: Calendar Management → "Force Full Sync"
   - System re-imports all events from past 30 days

**Resolution:**
- If OAuth expired → Re-authorize Google Calendar
- If connector paused → Resume polling
- If pattern not recognized → Update parsing patterns or manually create jobs

---

#### Issue 5: Job Export CSV Contains Garbled Characters

**Symptoms:**
- Exported CSV opens in Excel with "Ã¢â‚¬â€œ" instead of proper characters
- Special characters (accents, symbols) not displaying correctly

**Possible Causes:**
1. CSV exported without UTF-8 BOM (Byte Order Mark)
2. Excel not detecting UTF-8 encoding

**Troubleshooting Steps:**

1. Open CSV in text editor (Notepad++, VS Code):
   - Check if characters display correctly
   - If correct in text editor → Encoding detection issue in Excel

2. Re-open CSV with correct encoding:
   - Excel: Data → From Text/CSV → File Origin: UTF-8

3. Alternative: Export as JSON instead:
   - Export dialog → Format: JSON
   - Import into Excel via Power Query

**Resolution:**
- Use Excel's "From Text/CSV" import wizard with UTF-8 encoding
- OR update export endpoint to include UTF-8 BOM prefix
- OR use JSON format instead of CSV

---

#### Issue 6: Job Checklist Items Not Auto-Generating

**Symptoms:**
- Created new job with inspectionType = "Final"
- Expected 52 checklist items but job shows totalItems = 0

**Possible Causes:**
1. Checklist template missing for inspection type
2. Auto-generation hook failed silently
3. Database constraint violation during insert

**Troubleshooting Steps:**

1. Check server logs:
   - Look for: "Auto-generated checklist for Final inspection (Job {id})"
   - If not present → Hook didn't run

2. Verify template exists:
   - Admin: Navigate to Settings → Checklist Templates
   - Confirm "Final Inspection" template exists with 52 items

3. Manually regenerate checklist:
   - Admin only: Job detail page → "Actions" menu → "Regenerate Checklist"
   - Confirm dialog: "This will delete existing checklist items. Continue?"
   - Click "Yes" → System re-runs auto-generation

**Resolution:**
- If template missing → Import default RESNET template
- If hook failed → Manually regenerate checklist
- If persistent issue → Check database logs for constraint violations

---

#### Issue 7: Job Status Stuck in "In Progress"

**Symptoms:**
- Inspector completed all 52 checklist items
- Ran all required tests (blower door, duct, ventilation)
- Tapped "Complete Inspection" but status remains "in-progress"

**Possible Causes:**
1. Not all checklist items marked as complete
2. Required tests missing or incomplete
3. Compliance status = 'failing' (auto-changed to 'review')

**Troubleshooting Steps:**

1. Check checklist completion:
   - Job detail page → "Checklist" tab
   - Look for uncompleted items (unchecked boxes)
   - Scroll to bottom to ensure all items visible

2. Check required tests:
   - Job detail page → Verify all tabs show green checkmarks:
     - ✅ Blower Door Test
     - ✅ Duct Leakage Test
     - ✅ Ventilation Test

3. Check compliance status:
   - Job detail page → Top badge shows "Compliance Status"
   - If red "Failing" badge → Prevented auto-completion
   - Review complianceFlags to identify issue

**Resolution:**
- If checklist incomplete → Complete remaining items
- If tests missing → Run missing tests
- If compliance failing → Resolve compliance issues or admin manually completes job

---

#### Issue 8: Bulk Assignment Sends Duplicate Notifications

**Symptoms:**
- Admin bulk assigned 20 jobs to inspector
- Inspector received 40 email notifications (2x duplicates)

**Possible Causes:**
1. Email notification sent in loop without deduplication
2. Retry logic re-sending on transient failures
3. Two admins assigned same jobs simultaneously

**Troubleshooting Steps:**

1. Check audit logs:
   - Navigate to Admin → Audit Logs
   - Filter: action = 'job.assign', resourceId = affected job IDs
   - Count assignment events per job
   - If 2 events per job → Two admins assigned simultaneously

2. Check email delivery logs:
   - Admin: Settings → Email → Delivery Log
   - Search for inspector's email address
   - Look for duplicate "Job Assigned" emails with identical timestamps

3. Check server logs:
   - Search for: "Failed to send assignment notification"
   - If retries detected → Transient email service failure

**Resolution:**
- If duplicate assignments → Undo duplicate assignments, coordinate admin actions
- If email service issue → Contact email service provider (SendGrid)
- If retry logic issue → Update notification service to deduplicate within 5-minute window

---

#### Issue 9: Job Detail Page Loading Very Slowly

**Symptoms:**
- Clicking job card takes 10-15 seconds to load detail page
- Other pages load normally

**Possible Causes:**
1. Job has 500+ photos (large query)
2. Job has 200+ expenses/mileage logs
3. Missing database indexes on foreign keys
4. N+1 query problem (loading related records individually)

**Troubleshooting Steps:**

1. Check photo count:
   - Job detail page (when it finally loads) → "Photos" tab
   - If 100+ photos → Performance issue likely

2. Check Chrome DevTools Network tab:
   - Press F12 → Network tab
   - Reload job detail page
   - Look for slow API requests (>2 seconds)
   - Click slow request → Preview tab → Check response size

3. Check database query performance:
   - Admin: Navigate to Admin → Database → Query Performance
   - Look for slow queries related to job ID
   - If >1 second → Index issue or N+1 query

**Resolution:**
- If too many photos → Implement pagination in photo gallery (25 photos per page)
- If N+1 query → Update API endpoint to use JOIN instead of multiple queries
- If missing index → Run: `CREATE INDEX idx_photos_job_id ON photos(job_id)`
- If persistent issue → Contact developer to optimize query

---

#### Issue 10: Address Autocomplete Not Working

**Symptoms:**
- Inspector types address in job creation dialog
- No autocomplete suggestions appear
- Manual typing still works

**Possible Causes:**
1. Google Places API key expired or over quota
2. Network request blocked by firewall
3. API key not configured for current domain

**Troubleshooting Steps:**

1. Check browser console for errors:
   - Press F12 → Console tab
   - Look for: "Google Places API: REQUEST_DENIED" or "OVER_QUERY_LIMIT"

2. Verify API key configuration:
   - Admin: Settings → Integrations → Google Places API
   - If "Invalid Key" → Re-enter valid API key

3. Check API quota:
   - Google Cloud Console → APIs & Services → Google Places API
   - Check current usage vs quota limit
   - If over quota → Upgrade billing plan or wait for daily reset

4. Test API key manually:
   - Open: `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Minneapolis&key=YOUR_API_KEY`
   - If response has "status": "OK" → API key valid

**Resolution:**
- If API key expired → Generate new key in Google Cloud Console
- If over quota → Upgrade Google Cloud billing plan or enable pay-as-you-go
- If domain restriction → Add current domain to API key restrictions
- Temporary workaround → Inspector manually types full address (autocomplete optional)

---

## Performance Considerations

### Database Query Optimization

**Index Strategy:**

Jobs table has **18 indexes** covering common query patterns. Query planning should leverage these indexes:

**Good Queries (Use Indexes):**

```sql
-- Uses idx_jobs_status_scheduled_date
SELECT * FROM jobs 
WHERE status = 'scheduled' 
  AND scheduled_date >= '2025-11-01' 
  AND scheduled_date < '2025-12-01'
ORDER BY scheduled_date ASC;

-- Uses idx_jobs_assigned_to_scheduled_date
SELECT * FROM jobs 
WHERE assigned_to = 'inspector-uuid' 
  AND scheduled_date >= CURRENT_DATE
ORDER BY scheduled_date ASC;

-- Uses idx_jobs_builder_id
SELECT * FROM jobs 
WHERE builder_id = 'builder-123'
ORDER BY scheduled_date DESC;
```

**Bad Queries (Full Table Scan):**

```sql
-- No index on notes column
SELECT * FROM jobs 
WHERE notes LIKE '%insulation%';

-- Function on indexed column prevents index usage
SELECT * FROM jobs 
WHERE LOWER(status) = 'completed';

-- OR condition with non-indexed columns
SELECT * FROM jobs 
WHERE status = 'pending' OR notes LIKE '%urgent%';
```

**Optimization Recommendations:**

1. **Add GIN index for full-text search on notes:**
   ```sql
   CREATE INDEX idx_jobs_notes_gin ON jobs USING gin(to_tsvector('english', notes));
   ```

2. **Use EXPLAIN ANALYZE to verify index usage:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'scheduled';
   ```
   Look for: "Index Scan using idx_jobs_status_scheduled_date"

3. **Paginate large result sets:**
   - Always use LIMIT and OFFSET for lists
   - Prefer cursor pagination for infinite scroll (better performance)

---

### Pagination Best Practices

**Offset Pagination (Traditional):**

✅ **Pros:**
- Simple to implement
- Jump to specific page number
- Total count available

❌ **Cons:**
- Performance degrades with large offsets (e.g., OFFSET 10000)
- Inconsistent results if data changes during pagination

**Use When:**
- Result sets < 1,000 items
- User needs to jump to specific pages
- Total count is required

**Example:**
```typescript
const page = 5;
const pageSize = 25;
const offset = (page - 1) * pageSize;

const jobs = await db.select()
  .from(jobs)
  .limit(pageSize)
  .offset(offset)
  .orderBy(desc(jobs.scheduledDate));
```

---

**Cursor Pagination (Scalable):**

✅ **Pros:**
- Consistent performance regardless of position
- Handles concurrent updates gracefully
- No "missing page" issues

❌ **Cons:**
- Can't jump to specific page numbers
- No total count (without separate query)
- More complex to implement

**Use When:**
- Result sets > 1,000 items
- Infinite scroll UI
- Real-time data updates expected

**Example:**
```typescript
const cursor = lastJobId; // From previous page
const pageSize = 25;

const jobs = await db.select()
  .from(jobs)
  .where(cursor ? lt(jobs.id, cursor) : undefined)
  .limit(pageSize + 1) // Fetch one extra to check hasMore
  .orderBy(desc(jobs.id));

const hasMore = jobs.length > pageSize;
const data = hasMore ? jobs.slice(0, pageSize) : jobs;
const nextCursor = hasMore ? data[data.length - 1].id : null;

return { data, nextCursor, hasMore };
```

---

### Bulk Operation Limits

**Safety Thresholds:**

- **Bulk Delete:** Max 200 jobs per request
- **Bulk Export:** Max 1,000 jobs per request
- **Bulk Assign:** Max 50 jobs per request

**Rationale:**

1. **Prevent timeout errors:** Large operations can exceed 30-second request timeout
2. **Prevent database lock contention:** Huge transactions lock tables for too long
3. **Prevent memory overflow:** Loading 10,000 jobs into memory crashes server

**Implementation:**

```typescript
const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
});

app.delete("/api/jobs/bulk", async (req, res) => {
  const { ids } = bulkDeleteSchema.parse(req.body);
  
  if (ids.length > 200) {
    return res.status(400).json({ 
      message: "Cannot delete more than 200 jobs at once. Please use multiple requests." 
    });
  }
  
  const deleted = await storage.bulkDeleteJobs(ids);
  res.json({ deleted, total: ids.length });
});
```

**User Experience:**

If user selects 300 jobs:
- Show warning: "You've selected 300 jobs. Maximum 200 can be deleted at once."
- Offer: "Delete first 200?" or "Delete in batches automatically?"

---

### Caching Strategy

**React Query (Client-Side):**

```typescript
const { data: jobs, isLoading } = useQuery({
  queryKey: ['/api/jobs', { status, builderId, page }],
  staleTime: 60 * 1000, // Consider data fresh for 60 seconds
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
});
```

**Benefits:**
- Instant navigation back to previously viewed jobs list
- Reduces server load (avoids re-fetching on every navigation)
- Optimistic updates for better perceived performance

**Invalidation Strategy:**

After mutations, invalidate related queries:
```typescript
const createJobMutation = useMutation({
  mutationFn: (job: InsertJob) => apiRequest('/api/jobs', 'POST', job),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  },
});
```

---

### IndexedDB (Offline Caching):**

**Stored Entities:**
- Jobs list (last 100 jobs viewed)
- Job details (last 20 jobs opened)
- Checklist items for cached jobs
- Photos metadata (thumbnails only, not full images)

**Sync Strategy:**
- On initial load: Fetch from IndexedDB immediately (instant), fetch from API in background (refresh)
- On create/update/delete: Write to IndexedDB immediately, queue API request
- On reconnect: Flush sync queue to server, refresh IndexedDB from server

**Storage Limits:**
- Chrome: ~60% of available disk space (quota API)
- Safari: 1GB max
- Cleanup: Auto-delete jobs not viewed in 30 days

---

## Future Enhancements

### Planned Features (Roadmap)

#### 1. AI-Powered Job Recommendations

**Goal:** Use machine learning to suggest optimal job assignments

**Algorithm:**
- Analyze historical data: Inspector performance, drive times, completion rates
- Factor in: Job location, inspection type, inspector certifications, current workload
- Suggest: "John Doe has 85% match for this job (proximity, expertise, availability)"

**Implementation:**
- Train model on 6 months of historical assignments
- Real-time prediction API endpoint
- Admin UI shows top 3 recommended inspectors per job

**Expected Impact:**
- Reduce average drive time by 15%
- Improve completion rate by 10%
- Balance workload more evenly across inspectors

---

#### 2. Route Optimization Integration

**Goal:** Automatically plan optimal daily routes for inspectors

**Features:**
- Multi-stop route planning using Google Maps Distance Matrix API
- Traffic-aware departure time suggestions
- "Add stop" for lunch breaks, equipment pickups
- Export route to Google Maps or Waze for turn-by-turn navigation

**Algorithm:**
- Traveling Salesman Problem (TSP) solver
- Constraints: Time windows (scheduled appointments), max drive time per day
- Optimization objective: Minimize total drive time + fuel cost

**Expected Impact:**
- Save 30-45 minutes per inspector per day
- Reduce fuel costs by $50-$100/inspector/month
- Improve on-time arrival rate from 85% to 95%

---

#### 3. Predictive Compliance Alerts

**Goal:** Warn inspector of likely compliance failures before running tests

**Features:**
- Pre-test risk assessment based on builder history, house characteristics
- Show warning: "High ACH50 risk (builder avg: 3.2, this house: 2-story, large volume)"
- Suggest pre-test actions: "Check attic access hatch seal before blower door test"

**Data Sources:**
- Builder historical ACH50 averages
- House characteristics (volume, surface area, stories)
- Weather conditions (wind speed affects test accuracy)

**Expected Impact:**
- Reduce compliance failures by 20%
- Identify problem builders for targeted training
- Improve first-pass inspection rate from 92% to 97%

---

#### 4. Automated Invoice Generation

**Goal:** One-click invoice creation from completed jobs

**Workflow:**
1. Job status changes to 'completed'
2. System auto-generates invoice:
   - Line item: Inspection fee ($450.00 from job.pricing)
   - Line item: Materials/expenses ($45.67 from expenses table)
   - Line item: Mileage reimbursement ($26.78 from mileage_logs table)
   - Total: $522.45
3. Admin reviews invoice
4. Click "Send to Builder" → Email with PDF invoice + payment link

**Payment Integration:**
- Stripe/Square for credit card payments
- ACH transfer for builder accounts (net-30 terms)
- Auto-send payment reminders (30/60/90 days overdue)

**Expected Impact:**
- Reduce invoicing time from 30 minutes to 2 minutes per job
- Improve payment collection time from 45 days to 21 days
- Reduce accounting overhead by 60%

---

#### 5. Mobile App (iOS/Android)

**Goal:** Native mobile apps with enhanced offline capabilities

**Key Features:**
- Push notifications (even when app closed)
- Camera integration (higher quality photos)
- GPS tracking (auto-calculate mileage)
- Voice input for notes (hands-free documentation)
- Biometric authentication (Face ID, Touch ID)

**Technical Stack:**
- React Native for cross-platform development
- SQLite for offline database
- Background sync for photos/data

**Expected Impact:**
- Improve inspector productivity by 15%
- Reduce data entry time by 30%
- Increase photo documentation by 50%

---

#### 6. Builder Portal

**Goal:** Self-service portal for builders to view job status, reports, invoices

**Features:**
- Builder login (separate from inspector login)
- View all jobs for their properties
- Download completed inspection reports (PDFs)
- View/pay invoices
- Request schedule changes
- View compliance trends across all properties

**Security:**
- Builders can only see their own jobs
- No access to inspector routes, other builders' data
- Read-only access (can't modify jobs)

**Expected Impact:**
- Reduce admin support calls by 40%
- Improve builder satisfaction (transparency)
- Faster report delivery (instant download vs email)

---

#### 7. Integration with RESNET Registry

**Goal:** Automated submission of completed jobs to RESNET Registry

**Workflow:**
1. Admin clicks "Submit to RESNET" (monthly)
2. System validates all jobs have required data
3. Generates RESNET XML submission file
4. Auto-uploads to RESNET Registry API
5. Receives confirmation + RESNET ID
6. Updates jobs with RESNET submission date + ID

**Expected Impact:**
- Reduce RESNET submission time from 4 hours to 15 minutes per month
- Eliminate manual data entry errors
- Faster RESNET certification processing

---

#### 8. Job Templates

**Goal:** Save time creating similar jobs with pre-filled data

**Features:**
- Save job as template: "Standard Final Inspection - Sunrise Homes"
- Template includes: Builder, contractor, pricing, inspection type, checklist
- Create new job from template: Pre-fills all saved fields
- Share templates across team

**Use Case:**
- Inspector does 20 Final inspections per month for same builder
- Instead of re-entering builder, contractor, pricing each time → Select template

**Expected Impact:**
- Reduce job creation time from 3 minutes to 30 seconds
- Improve data consistency (less typos)

---

#### 9. Job Duplication Detection

**Goal:** Prevent duplicate jobs from being created

**Detection Logic:**
- Compare: Address + scheduled date + inspection type
- If match found: Show warning: "Similar job already exists: 123 Main St - Final on Nov 5"
- Options: "View Existing Job" or "Create Anyway"

**Expected Impact:**
- Reduce duplicate jobs from 5% to <1%
- Prevent billing disputes
- Improve data quality

---

#### 10. Advanced Analytics Dashboard

**Goal:** Business intelligence insights for owners/managers

**Metrics:**
- Revenue per job by builder, inspector, month
- Compliance rate trends (monthly, by builder)
- Inspector productivity (jobs per day, completion rate)
- Geographic heat map (where are jobs located?)
- Profitability analysis (revenue - expenses - mileage)

**Visualizations:**
- Line charts: Revenue over time
- Bar charts: Jobs by builder
- Heat map: Job locations
- Pie chart: Revenue by inspection type

**Expected Impact:**
- Identify top-performing builders for marketing focus
- Identify low-performing inspectors for training
- Optimize pricing by inspection type
- Forecast revenue 30/60/90 days ahead

---

## Appendix: Quick Reference

### Status Enum Values
- `pending`: Job created, not yet scheduled
- `scheduled`: Date/inspector assigned, awaiting inspection
- `in-progress`: Inspector on-site
- `completed`: All work finished, ready for billing
- `review`: Compliance issue, requires admin review

### Inspection Type Values
- `Final`: Final inspection before closing
- `Pre-Drywall`: Insulation/air sealing inspection before drywall
- `Rough`: Framing/foundation inspection
- `Other`: Custom inspection type

### Priority Values
- `low`: Standard priority
- `medium`: Default priority
- `high`: Expedited inspection
- `urgent`: Same-day or emergency inspection

### Compliance Status Values
- `passing`: All tests pass Minnesota 2020 Energy Code
- `failing`: One or more tests fail compliance
- `pending`: Tests not yet run or incomplete
- `not_applicable`: Inspection type doesn't require compliance

### Compliance Flags
- `ACH50_HIGH`: Blower door ACH50 > 3.0
- `DLO_FAILED`: Duct leakage to outside > 3.0 CFM25/100 sq ft
- `TDL_FAILED`: Total duct leakage > 4.0 CFM25/100 sq ft
- `VENTILATION_LOW`: Ventilation below ASHRAE 62.2 requirements
- `MISSING_BLOWER_DOOR`: Required blower door test not completed
- `MISSING_DUCT_TEST`: Required duct test not completed
- `MISSING_VENTILATION_TEST`: Required ventilation test not completed

### API Endpoint Quick Reference

| Method | Endpoint | Purpose | Auth | CSRF |
|--------|----------|---------|------|------|
| GET | /api/jobs | List jobs | ✅ | ❌ |
| POST | /api/jobs | Create job | ✅ | ✅ |
| GET | /api/jobs/:id | Get single job | ✅ | ❌ |
| PUT | /api/jobs/:id | Update job | ✅ | ✅ |
| PATCH | /api/jobs/:id/status | Quick status update | ✅ | ✅ |
| DELETE | /api/jobs/:id | Delete job | ✅ | ✅ |
| DELETE | /api/jobs/bulk | Bulk delete | ✅ | ✅ |
| POST | /api/jobs/export | Export CSV/JSON | ✅ | ✅ |
| POST | /api/jobs/from-event | Create from calendar | ✅ | ✅ |
| POST | /api/jobs/:id/assign | Assign to inspector | ✅ | ✅ |
| POST | /api/jobs/bulk-assign | Bulk assign | ✅ | ✅ |
| GET | /api/jobs/:id/assignment-history | Get assignment history | ✅ | ❌ |
| GET | /api/jobs/by-date/:date | Get jobs by date | ✅ | ❌ |
| POST | /api/jobs/:id/signature | Save builder signature | ✅ | ✅ |
| GET | /api/jobs/:jobId/blower-door-tests/latest | Get latest blower door test | ✅ | ❌ |
| GET | /api/jobs/:jobId/duct-leakage-tests/latest | Get latest duct test | ✅ | ❌ |
| GET | /api/jobs/:jobId/ventilation-tests/latest | Get latest ventilation test | ✅ | ❌ |

### Database Table Quick Reference

**Table:** jobs  
**Columns:** 40+  
**Indexes:** 18  
**Foreign Keys:** 5 (builderId, planId, lotId, createdBy, assignedTo, assignedBy)

---

**End of Jobs Management System Vertical Slice Documentation**

*This documentation represents a production-ready, fully-featured Jobs Management System meeting 40/40 vertical slice compliance standards. For questions or support, contact the development team.*
