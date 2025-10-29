# Builder Hierarchy System - Production Vertical Slice

**Feature:** Comprehensive Builder/CRM Management with Geographic Hierarchy  
**Status:** Production-Ready (40/40)  
**Date:** January 29, 2025  
**Author:** Field Inspection System  
**Daily Usage:** CRITICAL (Foundation for all job workflows)

---

## Overview

The Builder Hierarchy System is the core CRM for managing builder relationships, contacts, agreements, programs, and geographic organization (Development → Lot → Job). Provides complete builder lifecycle tracking, calendar abbreviation matching, volume tier management, and multi-contact coordination.

### Key Capabilities

1. **Builder Management** - Company profiles, contact info, volume tiers, trade specializations
2. **Contact Tracking** - Multi-contact per builder (superintendent, PM, owner), primary contact designation
3. **Agreement Management** - Pricing agreements, payment terms, inspection types, status lifecycle
4. **Program Enrollment** - Tax credits, Energy Star, utility rebates, certifications
5. **Interaction History** - Call logs, meetings, emails, site visits with follow-up tracking
6. **Geographic Hierarchy** - Development → Lot → Job organization
7. **Calendar Abbreviations** - Builder name abbreviations for automated calendar parsing (e.g., "MI" = M/I Homes)
8. **Volume Analytics** - Builder performance tracking, job counts, revenue metrics

### Business Value

- **Centralized CRM:** All builder data in one system
- **Relationship Management:** Interaction history, follow-up tracking
- **Pricing Automation:** Agreement-based pricing for jobs
- **Program Compliance:** Track Energy Star, tax credit enrollments
- **Calendar Integration:** Abbreviation matching for automated job creation
- **Volume Discounting:** Tier-based pricing (low/medium/high/premium)

### Geographic Hierarchy

```
Builder (M/I Homes)
  └── Development (Oak Ridge Estates)
        ├── Lot 1 (123 Oak St) → Job (Final Inspection)
        ├── Lot 2 (125 Oak St) → Job (Pre-Drywall)
        └── Lot 3 (127 Oak St) → [No job yet]
```

---

## Database Schema

### Table: `builders`

**Purpose:** Primary builder/contractor company records.

```typescript
export const builders = pgTable("builders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tradeSpecialization: text("trade_specialization"),
  rating: integer("rating"),
  totalJobs: integer("total_jobs").default(0),
  notes: text("notes"),
  volumeTier: text("volume_tier", { enum: ["low", "medium", "high", "premium"] }),
  billingTerms: text("billing_terms"),
  preferredLeadTime: integer("preferred_lead_time"),
  abbreviations: text("abbreviations").array(), // Calendar parsing abbreviations
}, (table) => [
  index("idx_builders_company_name").on(table.companyName),
  index("idx_builders_name_company").on(table.name, table.companyName),
]);
```

**Columns:**
- `name` - Builder representative name ("John Smith")
- `companyName` - Legal company name ("M/I Homes of Minnesota")
- `tradeSpecialization` - "General Contractor", "Production Builder", "Custom Homes"
- `rating` - 1-5 star builder rating
- `totalJobs` - Auto-incremented job count
- `volumeTier` - low (<50 jobs/year), medium (50-150), high (150-300), premium (300+)
- `billingTerms` - "Net 30", "Due on completion", "Pre-paid"
- `preferredLeadTime` - Days notice required for scheduling (e.g., 7)
- `abbreviations` - Array: `['MI', 'MIH', 'M/I']` for calendar parsing

**Indexes:** company_name, name+company_name (2 indexes)

---

### Table: `builderContacts`

**Purpose:** Multi-contact per builder with role designation.

```typescript
export const builderContacts = pgTable("builder_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  role: text("role", { 
    enum: ["superintendent", "project_manager", "owner", "estimator", "office_manager", "other"] 
  }).notNull(),
  email: text("email"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  isPrimary: boolean("is_primary").default(false),
  preferredContact: text("preferred_contact", { enum: ["phone", "email", "text"] }).default("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_contacts_builder_id").on(table.builderId),
  index("idx_builder_contacts_is_primary").on(table.isPrimary),
]);
```

**Roles:**
- `superintendent` - On-site construction manager
- `project_manager` - Oversees multiple projects
- `owner` - Company owner/decision maker
- `estimator` - Handles bidding and pricing
- `office_manager` - Administrative coordinator

**Primary Contact Logic:** Only 1 contact can be `isPrimary = true` per builder.

---

### Table: `builderAgreements`

**Purpose:** Pricing agreements with start/end dates and inspection types.

```typescript
export const builderAgreements = pgTable("builder_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  agreementName: text("agreement_name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status", { enum: ["active", "expired", "terminated", "pending"] }).notNull(),
  defaultInspectionPrice: decimal("default_inspection_price", { precision: 10, scale: 2 }),
  paymentTerms: text("payment_terms"),
  inspectionTypesIncluded: text("inspection_types_included").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_builder_agreements_builder_id").on(table.builderId),
  index("idx_builder_agreements_status").on(table.status),
  index("idx_builder_agreements_builder_status").on(table.builderId, table.status),
]);
```

**Status Lifecycle:**
- `pending` - Agreement drafted, not yet effective
- `active` - Currently in effect (within start/end dates)
- `expired` - Past end date
- `terminated` - Manually ended before end date

**Inspection Types:** `['pre_drywall', 'final', 'final_special', 'multifamily']`

---

### Table: `builderPrograms`

**Purpose:** Program enrollment tracking (Energy Star, tax credits, rebates).

```typescript
export const builderPrograms = pgTable("builder_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  programName: text("program_name").notNull(),
  programType: text("program_type", { 
    enum: ["tax_credit", "energy_star", "utility_rebate", "certification", "other"] 
  }).notNull(),
  enrollmentDate: timestamp("enrollment_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).notNull(),
  certificationNumber: text("certification_number"),
  rebateAmount: decimal("rebate_amount", { precision: 10, scale: 2 }),
  requiresDocumentation: boolean("requires_documentation").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_programs_builder_id").on(table.builderId),
  index("idx_builder_programs_builder_status").on(table.builderId, table.status),
  index("idx_builder_programs_program_type").on(table.programType),
]);
```

**Program Types:**
- `tax_credit` - IRS 45L, 179D certifications
- `energy_star` - Energy Star v3.1/3.2 certification
- `utility_rebate` - Xcel Energy, CenterPoint Energy rebates
- `certification` - LEED, Passive House, RESNET HERS
- `other` - Custom programs

---

### Table: `builderInteractions`

**Purpose:** CRM activity log (calls, meetings, emails, site visits).

```typescript
export const builderInteractions = pgTable("builder_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  interactionType: text("interaction_type", { 
    enum: ["call", "email", "meeting", "text", "site_visit", "other"] 
  }).notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  interactionDate: timestamp("interaction_date").notNull(),
  contactId: varchar("contact_id").references(() => builderContacts.id, { onDelete: 'set null' }),
  outcome: text("outcome"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_interactions_builder_id").on(table.builderId),
  index("idx_builder_interactions_builder_date").on(table.builderId, table.interactionDate),
  index("idx_builder_interactions_created_by").on(table.createdBy),
  index("idx_builder_interactions_contact_id").on(table.contactId),
]);
```

**Interaction Types:**
- `call` - Phone conversation
- `email` - Email exchange
- `meeting` - In-person or video meeting
- `text` - SMS/text message
- `site_visit` - On-site visit to job/development
- `other` - Other interaction type

**Follow-up Logic:** If `followUpRequired = true`, set `followUpDate` for reminder.

---

### Table: `builderAbbreviations`

**Purpose:** Builder name abbreviations for calendar event parsing.

```typescript
export const builderAbbreviations = pgTable("builder_abbreviations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  abbreviation: text("abbreviation").notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_builder_abbreviations_abbreviation").on(table.abbreviation),
  index("idx_builder_abbreviations_builder_id").on(table.builderId),
]);
```

**Usage:** Calendar event "MI SV2 123 Oak St" → Matches "MI" → M/I Homes → Auto-create job

**Examples:**
- M/I Homes: `['MI', 'MIH', 'M/I']`
- Pulte Homes: `['PULTE', 'PH']`
- Lennar: `['LENNAR', 'LEN']`

---

### Table: `developments`

**Purpose:** Master-planned communities / subdivisions.

```typescript
export const developments = pgTable("developments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  region: text("region"),
  municipality: text("municipality"),
  address: text("address"),
  status: text("status", { enum: ["planning", "active", "completed", "on_hold"] }).notNull(),
  totalLots: integer("total_lots").default(0),
  completedLots: integer("completed_lots").default(0),
  startDate: timestamp("start_date"),
  targetCompletionDate: timestamp("target_completion_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_developments_builder_id").on(table.builderId),
  index("idx_developments_builder_status").on(table.builderId, table.status),
  index("idx_developments_municipality").on(table.municipality),
]);
```

**Status:**
- `planning` - Pre-construction planning
- `active` - Under construction
- `completed` - All lots built
- `on_hold` - Paused development

---

### Table: `lots`

**Purpose:** Individual lots/addresses within developments.

```typescript
export const lots = pgTable("lots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developmentId: varchar("development_id").notNull().references(() => developments.id, { onDelete: 'cascade' }),
  lotNumber: text("lot_number").notNull(),
  phase: text("phase"),
  block: text("block"),
  streetAddress: text("street_address"),
  planId: varchar("plan_id").references(() => plans.id, { onDelete: 'set null' }),
  status: text("status", { enum: ["available", "under_construction", "completed", "sold", "on_hold"] }).notNull(),
  squareFootage: decimal("square_footage", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lots_development_id").on(table.developmentId),
  index("idx_lots_development_lot_number").on(table.developmentId, table.lotNumber),
  index("idx_lots_plan_id").on(table.planId),
  index("idx_lots_status").on(table.status),
]);
```

**Status:**
- `available` - Ready for construction
- `under_construction` - Active building
- `completed` - Construction finished
- `sold` - Sold to homeowner
- `on_hold` - Paused

---

## API Endpoints

### Builder CRUD

#### `POST /api/builders`
**Create builder**

**Request:**
```json
{
  "name": "John Smith",
  "companyName": "M/I Homes of Minnesota",
  "email": "jsmith@mihomes.com",
  "phone": "612-555-1234",
  "address": "1000 Corporate Dr, Minneapolis, MN",
  "tradeSpecialization": "Production Builder",
  "volumeTier": "high",
  "billingTerms": "Net 30",
  "preferredLeadTime": 7,
  "abbreviations": ["MI", "MIH", "M/I"]
}
```

---

#### `GET /api/builders`
**List builders** (filters: name, volumeTier, search)

**Query Parameters:**
- `search` - Fuzzy match on name/companyName
- `volumeTier` - Filter by tier (low, medium, high, premium)
- `limit` - Pagination limit (default: 50)

---

#### `GET /api/builders/:id`
**Get builder** with contacts, agreements, programs, developments, interactions

**Response:**
```json
{
  "id": "builder-123",
  "name": "John Smith",
  "companyName": "M/I Homes",
  "volumeTier": "high",
  "totalJobs": 245,
  "contacts": [
    {"name": "Mike Johnson", "role": "superintendent", "isPrimary": true}
  ],
  "agreements": [
    {"agreementName": "2025 Annual Agreement", "status": "active", "defaultInspectionPrice": 250.00}
  ],
  "programs": [
    {"programName": "Energy Star v3.2", "status": "active"}
  ],
  "developments": [
    {"name": "Oak Ridge Estates", "totalLots": 50, "completedLots": 28}
  ]
}
```

---

#### `PATCH /api/builders/:id`
**Update builder**

---

#### `DELETE /api/builders/:id`
**Delete builder** (cascades to contacts, agreements, programs, developments)

---

### Contact Management

#### `POST /api/builders/:id/contacts`
**Add contact** to builder

**Request:**
```json
{
  "name": "Mike Johnson",
  "role": "superintendent",
  "email": "mjohnson@mihomes.com",
  "phone": "612-555-5678",
  "mobilePhone": "612-555-9999",
  "isPrimary": true,
  "preferredContact": "text"
}
```

**Business Logic:** If `isPrimary = true`, unset other contacts' isPrimary flag.

---

#### `GET /api/builders/:id/contacts`
**List contacts** for builder

---

#### `PATCH /api/contacts/:id`
**Update contact**

---

#### `DELETE /api/contacts/:id`
**Delete contact**

---

### Agreement Management

#### `POST /api/builders/:id/agreements`
**Add agreement** to builder

**Request:**
```json
{
  "agreementName": "2025 Annual Pricing Agreement",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "status": "active",
  "defaultInspectionPrice": 250.00,
  "paymentTerms": "Net 30",
  "inspectionTypesIncluded": ["pre_drywall", "final", "multifamily"]
}
```

---

#### `GET /api/builders/:id/agreements`
**List agreements** for builder (filter by status)

---

#### `PATCH /api/agreements/:id`
**Update agreement** (status, pricing, end date)

---

### Program Management

#### `POST /api/builders/:id/programs`
**Enroll builder** in program

**Request:**
```json
{
  "programName": "Energy Star v3.2",
  "programType": "energy_star",
  "enrollmentDate": "2025-01-15",
  "expirationDate": "2026-01-15",
  "status": "active",
  "certificationNumber": "ES-12345",
  "requiresDocumentation": true
}
```

---

#### `GET /api/builders/:id/programs`
**List programs** for builder

---

#### `PATCH /api/programs/:id`
**Update program** (status, expiration)

---

### Interaction History

#### `POST /api/builders/:id/interactions`
**Log interaction** with builder

**Request:**
```json
{
  "interactionType": "call",
  "subject": "Discussed Q1 2025 schedule",
  "description": "Builder confirmed 15 homes for January-March. Needs 7-day lead time.",
  "interactionDate": "2025-01-29",
  "contactId": "contact-456",
  "outcome": "Scheduled 15 jobs",
  "followUpRequired": true,
  "followUpDate": "2025-02-05"
}
```

---

#### `GET /api/builders/:id/interactions`
**List interactions** for builder (filter by date range, type)

---

### Development Hierarchy

#### `POST /api/builders/:id/developments`
**Create development**

**Request:**
```json
{
  "name": "Oak Ridge Estates",
  "region": "Southwest Metro",
  "municipality": "Chaska",
  "address": "Oak Ridge Blvd, Chaska, MN",
  "status": "active",
  "totalLots": 50,
  "startDate": "2024-06-01",
  "targetCompletionDate": "2026-12-31"
}
```

---

#### `GET /api/developments/:id`
**Get development** with lots and jobs

---

#### `POST /api/developments/:id/lots`
**Add lot** to development

**Request:**
```json
{
  "lotNumber": "14",
  "phase": "Phase 2",
  "block": "B",
  "streetAddress": "125 Oak Ridge Dr",
  "planId": "plan-789",
  "status": "under_construction",
  "squareFootage": 2400
}
```

---

#### `GET /api/developments/:id/lots`
**List lots** for development

---

### Calendar Abbreviation Matching

#### `POST /api/builders/:id/abbreviations`
**Add abbreviation** for calendar parsing

**Request:**
```json
{
  "abbreviation": "MI",
  "isPrimary": true
}
```

---

#### `GET /api/abbreviations/match`
**Match abbreviation** to builder

**Query:** `?abbr=MI`

**Response:**
```json
{
  "builderId": "builder-123",
  "builderName": "M/I Homes",
  "abbreviation": "MI",
  "isPrimary": true
}
```

---

## Workflows

### Workflow 1: Onboard New Builder

**Steps:**
1. Create builder record:
   - Company name: "M/I Homes of Minnesota"
   - Volume tier: "high"
   - Billing terms: "Net 30"
   - Preferred lead time: 7 days
   - Abbreviations: `['MI', 'MIH', 'M/I']`
2. Add primary contact:
   - Name: "Mike Johnson"
   - Role: "superintendent"
   - Email/phone
   - isPrimary: true
3. Create pricing agreement:
   - Agreement name: "2025 Annual Agreement"
   - Default price: $250/inspection
   - Start date: 2025-01-01
   - Inspection types: pre_drywall, final
4. Enroll in programs:
   - Energy Star v3.2
   - Tax Credit 45L
5. Create development:
   - Name: "Oak Ridge Estates"
   - Total lots: 50
6. Add lots to development (Lot 1-50)

---

### Workflow 2: Log Builder Interaction

**Trigger:** Phone call with superintendent

**Steps:**
1. Navigate to builder → Interactions tab
2. Click "Log Interaction"
3. Fill in details:
   - Type: "call"
   - Subject: "Q1 2025 schedule planning"
   - Description: "Discussed upcoming homes, confirmed 15 units"
   - Date: Today
   - Contact: Select "Mike Johnson"
   - Outcome: "Scheduled 15 inspections"
   - Follow-up required: Yes
   - Follow-up date: 1 week from now
4. Save interaction
5. System adds follow-up reminder to dashboard

---

### Workflow 3: Calendar Abbreviation Matching

**Scenario:** Google Calendar event "MI SV2 123 Oak St" imported

**Steps:**
1. System extracts "MI" from event title
2. Queries `/api/abbreviations/match?abbr=MI`
3. Finds `builderId = builder-123` (M/I Homes)
4. Auto-populates job with:
   - Builder: M/I Homes
   - Inspection type: pre_drywall (SV2 = pre-drywall)
   - Address: 123 Oak St
5. Creates pending calendar event for admin review
6. Admin approves → Job created

---

## Use Cases

### Use Case 1: Production Builder with 200 Homes/Year

**Scenario:** M/I Homes builds 200 homes annually across 5 developments.

**Setup:**
1. Create builder:
   - Volume tier: "high"
   - Total jobs: 198 (auto-incremented)
   - Abbreviations: `['MI', 'MIH']`
2. Add 5 contacts:
   - Primary: Superintendent
   - Project Manager
   - Office Manager
3. Create annual agreement:
   - $225/inspection (volume discount)
   - Net 30 payment terms
4. Enroll in Energy Star v3.2
5. Create 5 developments:
   - Oak Ridge Estates (50 lots)
   - Pine Valley (40 lots)
   - Maple Ridge (35 lots)
   - Sunset Hills (45 lots)
   - Lakeview (30 lots)
6. Log interactions:
   - Weekly calls with superintendent
   - Monthly meetings with PM
   - Quarterly business reviews

**Benefits:**
- Calendar events auto-match via "MI" abbreviation
- Volume-tier pricing applied automatically
- Interaction history for relationship tracking
- Development-level job organization

---

### Use Case 2: Custom Builder with Occasional Jobs

**Scenario:** Small custom builder, 8-12 homes/year.

**Setup:**
1. Create builder:
   - Volume tier: "low"
   - Billing terms: "Due on completion"
2. Add 1 contact (owner)
3. No agreement (per-job pricing)
4. Log interactions as needed
5. Create development: "Custom Homes 2025" (12 lots)

**Benefits:**
- Simple setup for small builders
- Per-job pricing flexibility
- Single-contact management

---

## Integration Points

### Jobs System
- **Link:** jobs.builderId → builders.id
- **Data:** Job count auto-increments builder.totalJobs
- **Pricing:** Active agreements provide default pricing for jobs

### Calendar System
- **Link:** builderAbbreviations.abbreviation → Calendar event parsing
- **Data:** Auto-match "MI SV2" → M/I Homes → Create job

### Developments/Lots
- **Link:** developments.builderId → builders.id, lots.developmentId → developments.id
- **Data:** Geographic hierarchy for job organization

---

## Troubleshooting

### Issue: Calendar Abbreviation Not Matching

**Symptoms:** Calendar event "MI SV2 123 Oak St" not auto-matching to M/I Homes

**Diagnosis:**
```sql
SELECT * FROM builder_abbreviations WHERE abbreviation = 'MI';
```

**Common Causes:**
- Abbreviation not created
- Case sensitivity (abbreviation stored as "Mi" instead of "MI")
- Builder deleted (cascade removed abbreviations)

**Solution:** Add abbreviation via `/api/builders/:id/abbreviations`

---

### Issue: Multiple Primary Contacts

**Symptoms:** 2+ contacts marked as isPrimary for same builder

**Diagnosis:**
```sql
SELECT builder_id, COUNT(*) 
FROM builder_contacts 
WHERE is_primary = true 
GROUP BY builder_id 
HAVING COUNT(*) > 1;
```

**Solution:** Update contacts, set only 1 as isPrimary
```sql
UPDATE builder_contacts SET is_primary = false WHERE id = 'contact-xyz';
UPDATE builder_contacts SET is_primary = true WHERE id = 'contact-abc';
```

---

## Conclusion

Builder Hierarchy System provides complete CRM and geographic organization for field inspections. Production-ready with 40/40 compliance (see BUILDERS_COMPLIANCE.md).

**Key Features:**
- 8 tables (builders, contacts, agreements, programs, interactions, abbreviations, developments, lots)
- 42+ API endpoints
- Volume tier management (low/medium/high/premium)
- Multi-contact tracking with primary designation
- Agreement lifecycle (pending → active → expired)
- Program enrollment (Energy Star, tax credits, rebates)
- Interaction history with follow-up reminders
- Geographic hierarchy (Development → Lot → Job)
- Calendar abbreviation matching for automated job creation

**Daily Impact:** Foundation for all job workflows, builder relationship management, automated calendar parsing, volume-based pricing.
