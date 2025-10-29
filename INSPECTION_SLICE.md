# Inspection Workflows - Production Vertical Slice

**Feature:** Dynamic Job Workflows with Conditional Logic  
**Status:** Production-Ready (40/40)  
**Date:** January 29, 2025  
**Author:** Field Inspection System  
**Daily Usage:** CRITICAL (Core field inspection workflow)

---

## Overview

Inspection Workflows manage the complete lifecycle of field inspection jobs, from creation through completion. Features dynamic checklists with conditional logic, photo requirements, assignment workflows, status transitions, bulk operations, and builder signature capture.

### Key Capabilities

1. **Job Management** - Create, assign, schedule, complete inspections
2. **Dynamic Checklists** - 52-item inspection checklist with conditional visibility
3. **Status Workflow** - Pending → Scheduled → In Progress → Completed → Invoiced
4. **Assignment** - Auto-assign or manual inspector assignment with workload balancing
5. **Photo Requirements** - Checklist items with photo_required flag
6. **Bulk Operations** - Multi-select jobs for bulk status updates, assignment, deletion
7. **Builder Signatures** - Digital signature capture with timestamp and signer name
8. **Compliance Tracking** - Automated compliance checks with flags and status

### Business Value

- **Streamlined Field Workflows:** Mobile-first UX for rapid data entry
- **Compliance Automation:** Automatic compliance verification (blower door ≤3.0 ACH50, duct leakage ≤4.0/3.0)
- **Workload Balancing:** Inspector assignment with capacity tracking
- **Photo Documentation:** Photo-required items ensure complete documentation
- **Builder Accountability:** Digital signatures for inspection sign-off

---

## Database Schema

### Table: `jobs`

**Purpose:** Primary job/inspection records.

```typescript
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  builderId: varchar("builder_id").references(() => builders.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").references(() => plans.id, { onDelete: 'set null' }),
  lotId: varchar("lot_id").references(() => lots.id, { onDelete: 'set null' }),
  contractor: text("contractor").notNull(),
  status: text("status").notNull(),
  inspectionType: text("inspection_type").notNull(),
  pricing: decimal("pricing", { precision: 10, scale: 2 }),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").default(52),
  priority: text("priority").default('medium'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  floorArea: decimal("floor_area", { precision: 10, scale: 2 }),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  stories: decimal("stories", { precision: 3, scale: 1 }),
  notes: text("notes"),
  builderSignatureUrl: text("builder_signature_url"),
  builderSignedAt: timestamp("builder_signed_at"),
  builderSignerName: text("builder_signer_name"),
  complianceStatus: text("compliance_status"),
  complianceFlags: jsonb("compliance_flags"),
  lastComplianceCheck: timestamp("last_compliance_check"),
  sourceGoogleEventId: varchar("source_google_event_id"),
  googleEventId: varchar("google_event_id").unique(),
  originalScheduledDate: timestamp("original_scheduled_date"),
  isCancelled: boolean("is_cancelled").default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp("assigned_at"),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: 'set null' }),
  estimatedDuration: integer("estimated_duration"), // Minutes
  territory: text("territory"), // Geographic zone
}, (table) => [15 indexes]);
```

**Key Columns:**
- `status` - Workflow: pending → scheduled → in_progress → completed → invoiced → archived
- `inspectionType` - pre_drywall, final, final_special, multifamily
- `completedItems` / `totalItems` - Progress tracking (auto-calculated)
- `builderSignature*` - Digital signature capture fields
- `complianceStatus` - pass / fail / pending / not_applicable
- `complianceFlags` - JSONB: `{blowerDoor: "fail", ductLeakage: "pass"}`

**15 Indexes:** builder_id, plan_id, lot_id, scheduled_date, status+scheduled_date, created_by, address, status+created_by, google_event_id, assigned_to, assigned_to+scheduled_date, territory, completed_date, status+completed_date, builder_id+completed_date, compliance_status

---

### Table: `checklistItems`

**Purpose:** Dynamic checklist items for each job (52 items default).

```typescript
export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  itemNumber: integer("item_number").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  status: text("status").notNull().default('pending'),
  notes: text("notes"),
  photoCount: integer("photo_count").default(0),
  photoRequired: boolean("photo_required").default(false),
  voiceNoteUrl: text("voice_note_url"),
  voiceNoteDuration: integer("voice_note_duration"),
}, (table) => [4 indexes]);
```

**Key Columns:**
- `itemNumber` - 1-52 (standard inspection checklist)
- `status` - pending / in_progress / pass / fail / na
- `photoRequired` - If true, item requires photo documentation
- `photoCount` - Auto-incremented when photos attached
- `voiceNote*` - Voice memo fields for inspector notes

---

## API Endpoints

### Job CRUD

#### `POST /api/jobs`
**Create job**

**Request:**
```json
{
  "name": "123 Oak Street - Pre-Drywall",
  "address": "123 Oak Street, Minneapolis, MN 55401",
  "builderId": "builder-001",
  "contractor": "M/I Homes",
  "status": "pending",
  "inspectionType": "pre_drywall",
  "scheduledDate": "2025-02-01T09:00:00Z",
  "pricing": 250.00,
  "priority": "high"
}
```

**Response:** Job object with auto-generated checklist (52 items)

---

#### `GET /api/jobs`
**List jobs** (filters: status, assignedTo, builder_id, date range, search)

**Query Parameters:**
- `status` - Filter by status (pending, scheduled, in_progress, completed)
- `assignedTo` - Filter by inspector
- `builderId` - Filter by builder
- `from` / `to` - Date range
- `search` - Fuzzy match on name, address
- `limit` / `offset` - Pagination

---

#### `GET /api/jobs/:id`
**Get job** with checklist items, photos, compliance data

**Response:**
```json
{
  "id": "job-123",
  "name": "123 Oak Street - Pre-Drywall",
  "status": "in_progress",
  "completedItems": 28,
  "totalItems": 52,
  "checklistItems": [
    {"itemNumber": 1, "title": "Foundation inspection", "completed": true, "status": "pass"},
    {"itemNumber": 2, "title": "Framing inspection", "completed": false, "status": "pending", "photoRequired": true}
  ],
  "complianceStatus": "pending",
  "builderSignedAt": null
}
```

---

#### `PATCH /api/jobs/:id`
**Update job** (status, pricing, schedule, assignment, notes)

---

#### `DELETE /api/jobs/:id`
**Delete job** (cascades to checklist items, photos)

---

### Checklist Management

#### `GET /api/jobs/:id/checklist`
**Get checklist** for job (52 items)

---

#### `PATCH /api/checklist-items/:id`
**Update checklist item**

**Request:**
```json
{
  "completed": true,
  "status": "pass",
  "notes": "All framing meets code requirements"
}
```

---

#### `POST /api/jobs/:id/checklist/:itemNumber/photo`
**Attach photo** to checklist item (auto-increments photoCount)

---

### Assignment Workflows

#### `POST /api/jobs/:id/assign`
**Assign job** to inspector

**Request:**
```json
{
  "assignedTo": "user-inspector-001",
  "assignedBy": "user-admin-001"
}
```

**Business Logic:** Updates assignedTo, assignedAt, assignedBy fields

---

#### `POST /api/jobs/bulk-assign`
**Bulk assign** multiple jobs

**Request:**
```json
{
  "jobIds": ["job-123", "job-456", "job-789"],
  "assignedTo": "user-inspector-001"
}
```

---

### Status Transitions

#### `POST /api/jobs/:id/transition`
**Transition job status**

**Request:**
```json
{
  "toStatus": "in_progress"
}
```

**Status Workflow:**
- `pending` → `scheduled` (when scheduledDate set)
- `scheduled` → `in_progress` (inspector starts work)
- `in_progress` → `completed` (all required items completed)
- `completed` → `invoiced` (invoice generated)
- Any → `cancelled` (job cancelled)

**Business Logic:**
- Validate allowed transitions
- Auto-set completedDate when → completed
- Check photo requirements (all photoRequired items must have photoCount > 0)

---

### Builder Signature

#### `POST /api/jobs/:id/signature`
**Capture builder signature**

**Request:**
```json
{
  "signatureDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "signerName": "John Smith, Superintendent"
}
```

**Business Logic:**
- Upload signature to object storage
- Set builderSignatureUrl, builderSignedAt, builderSignerName
- Auto-transition status → completed (if all checklist items completed)

---

### Compliance Checks

#### `POST /api/jobs/:id/compliance-check`
**Run compliance verification**

**Business Logic:**
1. Check blower door test results (if exists):
   - ACH50 ≤ 3.0 → pass
   - ACH50 > 3.0 → fail
2. Check duct leakage test results (if exists):
   - TDL ≤ 4.0 CFM25/100 sq ft → pass
   - DLO ≤ 3.0 CFM25/100 sq ft → pass
3. Update complianceStatus (pass / fail / pending)
4. Set complianceFlags JSONB with individual test results

---

## Workflows

### Workflow 1: Create and Complete Job

**Steps:**
1. Admin creates job:
   - POST /api/jobs
   - Auto-generates 52 checklist items
   - Status: pending
2. Admin assigns to inspector:
   - POST /api/jobs/:id/assign
   - assignedTo: inspector-001
3. Inspector transitions status:
   - POST /api/jobs/:id/transition → scheduled
4. Inspector arrives on-site:
   - POST /api/jobs/:id/transition → in_progress
5. Inspector completes checklist items:
   - PATCH /api/checklist-items/:id (completed: true, status: pass)
   - Upload photos for photoRequired items
   - System auto-updates completedItems count
6. Inspector captures builder signature:
   - POST /api/jobs/:id/signature
   - System auto-transitions → completed
7. System runs compliance check:
   - POST /api/jobs/:id/compliance-check
   - Sets complianceStatus based on test results

---

### Workflow 2: Bulk Job Assignment

**Scenario:** Admin assigns 15 jobs to inspector for week

**Steps:**
1. Admin multi-selects jobs on schedule page
2. Clicks "Bulk Assign"
3. Selects inspector from dropdown
4. POST /api/jobs/bulk-assign with jobIds array
5. System updates all jobs:
   - assignedTo: selected inspector
   - assignedAt: NOW()
   - assignedBy: current user

---

## Use Cases

### Use Case 1: Pre-Drywall Inspection

**Scenario:** Inspector completes pre-drywall inspection on-site.

**Checklist Items (28 items):**
- Foundation inspection (photo required)
- Framing inspection (photo required)
- Insulation installation (photo required)
- Air sealing (photo required)
- HVAC ductwork (photo required)
- Electrical rough-in
- Plumbing rough-in
- ... (21 more items)

**Workflow:**
1. Inspector transitions → in_progress
2. Walks through home, completing checklist items
3. Takes photos for 12 photoRequired items
4. Adds voice notes for 3 items needing follow-up
5. Captures builder signature on mobile device
6. System auto-transitions → completed
7. Compliance check runs (no test data yet → pending)

---

### Use Case 2: Final Inspection with Compliance Tests

**Scenario:** Inspector performs final inspection with blower door and duct leakage tests.

**Workflow:**
1. Inspector completes 52-item checklist
2. Performs blower door test:
   - ACH50 = 2.8 (PASS - ≤3.0 required)
3. Performs duct leakage test:
   - TDL = 3.5 CFM25/100 sq ft (PASS - ≤4.0 required)
   - DLO = 2.8 CFM25/100 sq ft (PASS - ≤3.0 required)
4. Captures builder signature
5. System runs compliance check:
   - Blower door: PASS
   - Duct leakage: PASS
   - complianceStatus: "pass"
6. Job marked as completed with passing compliance

---

## Integration Points

### Builders System
- **Link:** jobs.builderId → builders.id
- **Data:** Auto-increments builder.totalJobs when job created

### Calendar System
- **Link:** jobs.googleEventId → Google Calendar events
- **Data:** Auto-create jobs from calendar events (abbreviation matching)

### Blower Door Testing
- **Link:** blowerDoorTests.jobId → jobs.id
- **Data:** Compliance check uses ACH50 ≤ 3.0 threshold

### Duct Leakage Testing
- **Link:** ductLeakageTests.jobId → jobs.id
- **Data:** Compliance check uses TDL ≤ 4.0, DLO ≤ 3.0 thresholds

### Photos System
- **Link:** photos.jobId → jobs.id, photos.checklistItemId → checklistItems.id
- **Data:** Photo count auto-updates checklist item photoCount

---

## Troubleshooting

### Issue: Job Cannot Transition to Completed

**Symptoms:** Error when trying to mark job as completed

**Diagnosis:**
```sql
SELECT ci.* 
FROM checklist_items ci
WHERE ci.job_id = 'job-123' 
  AND ci.photo_required = true 
  AND ci.photo_count = 0;
```

**Common Causes:**
- Photo-required items missing photos
- Builder signature not captured

**Solution:** Complete all photoRequired items, capture signature

---

### Issue: Compliance Check Fails

**Symptoms:** complianceStatus = "fail"

**Diagnosis:**
```sql
SELECT compliance_status, compliance_flags
FROM jobs
WHERE id = 'job-123';
```

**Common Causes:**
- Blower door ACH50 > 3.0
- Duct leakage TDL > 4.0 or DLO > 3.0

**Solution:** Re-test, fix air sealing/duct issues, update results

---

## Conclusion

Inspection Workflows provide complete job lifecycle management with dynamic checklists, conditional logic, photo requirements, and compliance automation. Production-ready with 40/40 compliance (see INSPECTION_COMPLIANCE.md).

**Key Features:**
- 2 tables (jobs, checklistItems)
- 25+ API endpoints
- Dynamic 52-item checklists
- Status workflow (pending → completed)
- Photo requirements enforcement
- Builder signature capture
- Automated compliance checks (blower door, duct leakage)
- Bulk assignment operations
- Inspector workload balancing

**Daily Impact:** Core field inspection workflow, mobile-first UX, compliance automation, builder accountability, photo documentation enforcement.
