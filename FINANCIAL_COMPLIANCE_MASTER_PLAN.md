# Financial Management & Compliance System - Master Implementation Plan

## Business Context

### Company Structure
- **Ulrich Energy Auditing** (Shaun Ulrich, owner/admin)
  - Subcontractor to Building Knowledge (Pat, general contractor)
  - Building Knowledge contracts with M/I Homes (uses Buildpro/SupplyPro)
  - Invoices Building Knowledge monthly with manual review
  - Receives bi-weekly direct deposits
  - Erik is employee contractor, paid fixed monthly amount

### Current System State
- **Calendar Integration**: Google Calendar auto-sync every 6 hours
  - AI parsing with confidence scoring (≥80% auto-creates, 60-79% flags for review, <60% manual queue)
  - Fuzzy builder name matching and duplicate detection
  - Manual job creation available for exceptions/last-minute changes
- **Current Tools**: Wave accounting for invoices, Google Sheets for job tracking with prices
- **Target Migration**: QuickBooks Online (starting fresh)
- **Quality Standard**: 40/40 AAA production rating maintained

### Job Types (9 Total)
1. sv2
2. full_test
3. code_bdoor
4. rough_duct
5. rehab
6. bdoor_retest
7. multifamily
8. energy_star
9. other

## Access Control Requirements

### User Roles & Permissions

#### Shaun (Admin/Owner)
- Full access to everything
- Approves all expenses (owner approval)
- Reviews all invoices before sending
- Manages QuickBooks integration
- Views all financial analytics and profitability

#### Pat (Building Knowledge - Partner Contractor)
- **Role**: `partner_contractor`
- **Permissions**:
  - All inspector permissions (view jobs, complete inspections, upload photos)
  - Create/edit jobs for exceptions (last-minute changes)
  - Upload plans and specifications
  - View and download reports for his jobs
- **Restrictions**:
  - NO access to pricing, margins, or financial data
  - NO access to profitability analytics
  - NO access to expense approval or payment tracking

#### Erik (Employee Inspector)
- **Role**: `inspector`
- **Permissions**: Inspector functions only
- NO job creation, NO financial access

## Financial Module - Complete Requirements

### 1. Monthly Invoicing System

#### Workflow
1. Pull all completed jobs for the billing period
2. Group by job type and apply rate card pricing
3. Manual review by Shaun (owner reviews every invoice)
4. Generate professional PDF using @react-pdf/renderer
5. Push to QuickBooks Online via API
6. Email to Pat with PDF attachment
7. Track AR (accounts receivable)

#### Components
- Invoice Wizard (5-step process):
  - Period selection
  - Review jobs to include
  - Review totals and line items
  - PDF preview
  - Send confirmation
- PDF Template with Building Knowledge branding (red #c93132)
- Auto-generated invoice numbers
- Status tracking: draft → reviewed → sent → paid

### 2. Payment Tracking

#### Features
- Record bi-weekly direct deposits from Building Knowledge
- Apply payments to invoices in QuickBooks
- Update AR aging buckets (current, 30, 60, 90+ days)
- Track unbilled work (completed jobs not yet invoiced)
- Payment history with reference numbers

#### Dashboard Elements
- Unbilled work tracker ($amount and count)
- AR aging report with visualization
- Payment application interface
- Next invoice date countdown

### 3. Expense Management (MileIQ-Style Interface)

#### Swipe Interface
- **Swipe right** = Approve for reimbursement (green, checkmark)
- **Swipe left** = Reject as personal (gray, X)
- **Long press (1 sec)** = Choose category
- Mobile-first with camera integration for receipt capture
- Review 50-100 expenses in ~5 minutes (vs 30+ manually)

#### Categories
1. Fuel
2. Equipment
3. Tolls
4. Meals
5. Supplies
6. Other

#### Auto-Tagging Rules
- Gas stations → "Fuel"
- GPS near job site → auto-tag to that job
- Recurring vendors → auto-suggest category
- Amount < $10 → flag for review
- Time proximity to scheduled jobs → suggest job association

#### Approval Workflow
- States: pending → approved → reimbursed
- Admin (Shaun) approves all expenses
- No expense limits needed
- Job-level attribution for cost tracking

#### Receipt Capture
- Camera integration with OCR (tesseract.js)
- Auto-extract: amount, vendor name, date
- Object storage for receipt images
- Offline queue for field use

### 4. Job Cost Ledger

#### Cost Components Per Job
1. **Labor Cost**: Inspector hours × loaded rate
2. **Travel**: Mileage × IRS rate ($0.70/mile for 2025)
3. **Equipment**: Depreciation/calibration allocation
4. **Expenses**: Allocated from expense tracking

#### Profitability Calculation
- Total Revenue (from rate card)
- Total Cost (sum of all components)
- Margin $ = Revenue - Cost
- Margin % = (Margin $ / Revenue) × 100

### 5. Builder Rate Cards

#### Features
- Per-builder pricing agreements (Building Knowledge has specific rates)
- Volume tier thresholds with auto-discounting
- Special billing codes:
  - Rush fees
  - Weekend rates
  - After-hours premium
- Effective date tracking (historical and future pricing)
- Currently only Building Knowledge needs rate card

#### Data Structure
```
builder_rate_cards
- builderId
- jobType
- baseRate
- volumeTierStart (jobs per month threshold)
- volumeDiscount (percentage or flat amount)
- effectiveStartDate
- effectiveEndDate
- billingCodes (JSON: {rush: 50, weekend: 75, etc.})
```

## Profitability Analytics Dashboard (Owner View)

### Top KPIs (Card Layout)
1. **Monthly Revenue** (trend vs last month, ±%)
2. **Unbilled Work** ($amount and job count)
3. **Next Invoice Date** (countdown in days)
4. **Cash Runway** (months remaining at current burn rate)

### Profitability Tables
1. **By Job Type**
   - Columns: Job Type, Count, Revenue, Cost, Margin $, Margin %
   - Sortable by any column
   - Visual bar chart overlay

2. **By Builder**
   - Primarily Building Knowledge
   - Revenue contribution percentage
   - Average margin per builder

3. **By Inspector**
   - Shaun vs Erik productivity
   - Jobs completed, hours logged
   - Revenue generated per inspector
   - Efficiency metrics (revenue/hour)

### Expense Breakdown
- Pie chart or bar chart by category
- Month-over-month trends
- Top vendors by spend
- Job-attributed vs unallocated expenses

### Cash Flow Forecast (90 Days)
- Line chart showing:
  - Expected inflows (scheduled jobs × rate)
  - Expected outflows (labor, expenses)
  - Net cash position
- Based on calendar schedule and payment history
- Highlight potential cash crunches

### Inspector Productivity
- Jobs per week/month
- Average job duration
- Revenue per hour worked
- Completion rate vs scheduled

## QuickBooks Online Integration

### OAuth 2.0 Setup
- Use Replit integrations for API key/secret management
- Automatic token refresh (every 30 minutes)
- Error handling with retry logic and alerts
- Secure credential storage

### Synced Entities

#### 1. Customer Records
- Create/update Building Knowledge customer in QB
- Sync contact information
- Map to internal builder record

#### 2. Invoices
- Create invoices in QB when generated in system
- Sync invoice status (sent, viewed, paid)
- Link to internal invoice record
- Include line items with job details

#### 3. Payments
- Record direct deposits in QB when entered
- Apply payments to correct invoices
- Update AR balances
- Sync payment methods and reference numbers

#### 4. AR Aging
- Query QB for aging buckets
- Display in dashboard
- Alert on overdue amounts

#### 5. Expenses
- Export approved expenses to QB
- Map expense categories to QB chart of accounts
- Track reimbursement status
- Sync for tax reporting

### Chart of Accounts Mapping
- Fuel → QB account (user configurable)
- Equipment → QB account
- Tolls → QB account
- Meals → QB account
- Supplies → QB account
- Other → QB account

### Background Jobs
1. **Token Refresh** (every 30 min)
   - Refresh access token
   - Alert on failure
   - Fallback to manual reauth

2. **Invoice Sync** (hourly)
   - Push pending invoices to QB
   - Exponential backoff on errors
   - Manual retry option

3. **Payment Sync** (daily)
   - Pull QB payments
   - Match to invoices
   - Update AR status

## ENERGY STAR & Minnesota Multifamily Compliance

### 1. ENERGY STAR Multifamily New Construction (MFNC) Version 1.2 Rev. 05

#### Certification Paths (3 Options)
1. **Prescriptive Path**
   - Predefined measures from tables
   - Simplified compliance
   - Common for smaller projects

2. **ERI Path** (Energy Rating Index)
   - Performance-based modeling
   - More flexibility
   - Requires HERS rater

3. **ASHRAE 90.1 Appendix G Path**
   - Commercial building approach
   - For larger multifamily
   - Complex modeling

#### Mandatory Requirements
- Blower door testing (whole building or sampling)
- Duct leakage testing
- High-efficiency HVAC equipment
- Thermal envelope verification
- Ventilation compliance (ASHRAE 62.2)

#### Sampling Protocols
- Allowed for field verification (except builder-verified items)
- Sample size based on unit count:
  - 1-7 units: 100% (all units)
  - 8-20 units: 7 units minimum
  - 21-50 units: 9 units
  - 51-100 units: 11 units
  - 100+ units: 13 units + 1 per 50 additional
- Random selection required
- MRO (Multifamily Review Organization) oversight

#### Builder-Verified Items
- Maximum 5-8 items in Thermal Enclosure System (varies by climate zone)
- Examples: insulation grade, air sealing details, window installation
- Photo evidence preferable but not required yet
- "Think about how to implement this eloquently"
- Consider photo requirement toggle per program

### 2. Minnesota Housing EGCC 2020

#### Purpose
- Required for Minnesota Housing-financed multifamily projects
- Energy efficiency compliance pathway
- Integrates with ENERGY STAR requirements

#### Key Components
1. **Intended Methods Worksheet**
   - Specify compliance approach upfront
   - Lock in methods before construction
   - Track deviations

2. **Energy Rebate Analysis**
   - Calculate utility rebates available
   - Track incentive applications
   - Document rebate awards

3. **Compliance Documentation**
   - Field verification checklists
   - Test results (blower door, duct leakage)
   - Final certification package

### 3. Building Energy Benchmarking (2024 MN Law)

#### Requirements by Building Class
- **Class 1** (100,000+ sq ft): First report due **June 1, 2025**
- **Class 2** (50,000-99,999 sq ft): First report due **June 1, 2026**
- Annual reporting thereafter
- Public disclosure requirements

#### System Features Needed
- Track which buildings need reporting
- Deadline reminders and alerts
- ENERGY STAR Portfolio Manager integration (if possible)
- Document storage for compliance proof
- Building square footage tracking

### 4. ZERH Multifamily Version 2

#### Purpose
- Qualifies for 45L tax credits
- **$2,500 per unit** (max **$15,000 per building**)
- Effective January 1, 2025 for new permits

#### Prerequisites
- ENERGY STAR MFNC 1.2 certification
- Indoor airPLUS certification
- Additional efficiency measures

#### Implementation
- Tax credit calculator in job details
- Track ZERH eligibility
- Document required certifications
- Generate 45L submission packages

### 5. Data Model Extension

#### Add to Jobs Table
```typescript
multifamilyProgram: enum([
  'energy_star_mfnc',
  'mn_housing_egcc',
  'zerh',
  'benchmarking',
  'none'
])
certificationPath: enum(['prescriptive', 'eri', 'ashrae']) // for ENERGY STAR
unitCount: integer // for sampling calculations
sampleSize: integer // calculated based on protocol
mroOrganization: varchar // oversight entity
builderVerifiedItemsCount: integer // track 5-8 item limit
builderVerifiedItemsPhotoRequired: boolean // toggle per program
```

#### New Tables
```typescript
complianceArtifacts
- id
- jobId
- programType (energy_star_mfnc, egcc, zerh, benchmarking)
- artifactType (checklist, worksheet, photo, certificate)
- documentPath (object storage)
- uploadedAt
- uploadedBy

multifamilyPrograms
- id
- name
- version
- effectiveDate
- requiresPhotoEvidence
- samplingRequired
- checklistTemplateId
```

## Reference Materials to Integrate

### Checklists & Forms
1. **ENERGY STAR Single-Family Checklist** (Version 3.2, Rev. 14)
   - Already used for current inspections
   - Keep as reference for multifamily

2. **ENERGY STAR MFNC Checklist** (Version 1.2, Rev. 05)
   - New checklist to integrate
   - Map to workflow system
   - Support all 3 certification paths

3. **HVAC Functional Testing Forms** (ANSI/RESNET/ACCA/ICC 310)
   - Airflow measurements
   - Refrigerant charge verification
   - System diagnostics

4. **RESNET National Rater Field Checklist**
   - Quality assurance tool
   - Cross-reference with ENERGY STAR

### Integration Strategy
- Store PDFs in documentation library
- Extract checklist items into database
- Create digital checklist UI matching paper forms
- Auto-populate from job data where possible
- Support offline completion

## Technical Implementation - 7 Phases

### Phase 0: Foundation & Access Control

#### Schema Updates
```typescript
// Extend user roles enum
userRole: enum(['admin', 'inspector', 'partner_contractor'])

// Add feature flags table
featureFlags
- id
- featureName (financial_module, compliance_suite, quickbooks_sync)
- enabled
- rolloutPercentage
- enabledForUsers (array of user IDs)

// Add system config table
systemConfig
- key
- value (JSON)
- updatedAt
- updatedBy
```

#### Permissions Middleware
```typescript
// middleware/permissions.ts
const permissions = {
  admin: ['*'],
  inspector: ['view_jobs', 'complete_inspections', 'upload_photos', 'log_time'],
  partner_contractor: [
    'view_jobs', 'complete_inspections', 'upload_photos', 'log_time',
    'create_job', 'edit_job', 'upload_plans', 'download_reports'
  ]
}

// Explicitly exclude financial access
const financialRoutes = ['/api/invoices', '/api/payments', '/api/analytics']
// Block partner_contractor from accessing these
```

#### Testing
- Unit tests for permissions matrix
- E2E tests for Pat/Shaun/Erik user flows
- Verify financial route blocking for non-admins

### Phase 1: Financial Data Model

#### New Tables (Drizzle Schema)

```typescript
// Builder rate cards with volume tiers
export const builderRateCards = pgTable('builder_rate_cards', {
  id: serial('id').primaryKey(),
  builderId: integer('builder_id').references(() => builders.id).notNull(),
  jobType: varchar('job_type').notNull(),
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),
  volumeTierStart: integer('volume_tier_start').default(0), // jobs/month threshold
  volumeDiscount: decimal('volume_discount', { precision: 5, scale: 2 }), // percentage
  effectiveStartDate: date('effective_start_date').notNull(),
  effectiveEndDate: date('effective_end_date'),
  billingCodes: jsonb('billing_codes'), // {rush: 50, weekend: 75}
  createdAt: timestamp('created_at').defaultNow(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number').unique().notNull(),
  builderId: integer('builder_id').references(() => builders.id).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status').default('draft'), // draft, reviewed, sent, paid
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  quickbooksId: varchar('quickbooks_id'),
  quickbooksSyncedAt: timestamp('quickbooks_synced_at'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Invoice line items
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  jobId: integer('job_id').references(() => jobs.id),
  description: text('description').notNull(),
  quantity: integer('quantity').default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
  jobType: varchar('job_type'),
});

// Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: varchar('payment_method'), // direct_deposit, check, wire
  referenceNumber: varchar('reference_number'),
  quickbooksId: varchar('quickbooks_id'),
  quickbooksSyncedAt: timestamp('quickbooks_synced_at'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// AR snapshots for aging reports
export const arSnapshots = pgTable('ar_snapshots', {
  id: serial('id').primaryKey(),
  snapshotDate: date('snapshot_date').notNull(),
  builderId: integer('builder_id').references(() => builders.id).notNull(),
  current: decimal('current', { precision: 10, scale: 2 }).default('0'),
  days30: decimal('days_30', { precision: 10, scale: 2 }).default('0'),
  days60: decimal('days_60', { precision: 10, scale: 2 }).default('0'),
  days90Plus: decimal('days_90_plus', { precision: 10, scale: 2 }).default('0'),
  totalAR: decimal('total_ar', { precision: 10, scale: 2 }).notNull(),
});

// Expense categories
export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  quickbooksAccountId: varchar('quickbooks_account_id'),
  color: varchar('color'), // for UI visualization
  icon: varchar('icon'), // lucide-react icon name
});

// Expense rules for auto-classification
export const expenseRules = pgTable('expense_rules', {
  id: serial('id').primaryKey(),
  vendorPattern: varchar('vendor_pattern').notNull(), // regex or simple match
  categoryId: integer('category_id').references(() => expenseCategories.id).notNull(),
  autoApprove: boolean('auto_approve').default(false),
  maxAutoApproveAmount: decimal('max_auto_approve_amount', { precision: 10, scale: 2 }),
  priority: integer('priority').default(0), // for rule ordering
});

// Extend existing expenses table
// (add columns via migration)
export const expenses = pgTable('expenses', {
  // ... existing columns ...
  categoryId: integer('category_id').references(() => expenseCategories.id),
  approvalStatus: varchar('approval_status').default('pending'), // pending, approved, rejected, reimbursed
  swipeClassification: varchar('swipe_classification'), // business, personal
  gpsLatitude: decimal('gps_latitude', { precision: 10, scale: 8 }),
  gpsLongitude: decimal('gps_longitude', { precision: 11, scale: 8 }),
  receiptPath: varchar('receipt_path'), // object storage path
  ocrAmount: decimal('ocr_amount', { precision: 10, scale: 2 }),
  ocrVendor: varchar('ocr_vendor'),
  ocrDate: date('ocr_date'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
});

// Job cost ledger
export const jobCostLedger = pgTable('job_cost_ledger', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').references(() => jobs.id).notNull(),
  costType: varchar('cost_type').notNull(), // labor, travel, equipment, expense
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

// Mileage rate history (IRS rates)
export const mileageRateHistory = pgTable('mileage_rate_history', {
  id: serial('id').primaryKey(),
  effectiveDate: date('effective_date').notNull(),
  ratePerMile: decimal('rate_per_mile', { precision: 5, scale: 3 }).notNull(), // $0.700
  notes: text('notes'), // "IRS standard rate for 2025"
});

// Multifamily programs
export const multifamilyPrograms = pgTable('multifamily_programs', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  version: varchar('version'),
  effectiveDate: date('effective_date'),
  requiresPhotoEvidence: boolean('requires_photo_evidence').default(false),
  samplingRequired: boolean('sampling_required').default(false),
  checklistTemplateId: integer('checklist_template_id'),
});

// Compliance artifacts
export const complianceArtifacts = pgTable('compliance_artifacts', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').references(() => jobs.id).notNull(),
  programType: varchar('program_type').notNull(), // energy_star_mfnc, egcc, zerh, benchmarking
  artifactType: varchar('artifact_type').notNull(), // checklist, worksheet, photo, certificate
  documentPath: varchar('document_path'), // object storage
  uploadedBy: integer('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// Extend jobs table
// (add columns via migration)
export const jobs = pgTable('jobs', {
  // ... existing columns ...
  multifamilyProgram: varchar('multifamily_program'), // energy_star_mfnc, mn_housing_egcc, zerh, benchmarking, none
  certificationPath: varchar('certification_path'), // prescriptive, eri, ashrae
  unitCount: integer('unit_count'),
  sampleSize: integer('sample_size'),
  mroOrganization: varchar('mro_organization'),
  builderVerifiedItemsCount: integer('builder_verified_items_count'),
  builderVerifiedItemsPhotoRequired: boolean('builder_verified_items_photo_required').default(false),
  billedInInvoiceId: integer('billed_in_invoice_id').references(() => invoices.id),
});
```

#### Zod Schemas
```typescript
export const insertBuilderRateCardSchema = createInsertSchema(builderRateCards).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
// ... etc for all tables
```

#### Testing
- Schema migration rehearsal (run in test DB)
- Type inference validation
- Seed data creation (Building Knowledge rate card, expense categories, IRS rate)

### Phase 2: Invoicing Workflow

#### Storage Methods
```typescript
// server/storage.ts additions
createInvoice(data: InsertInvoice): Promise<Invoice>
getInvoice(id: number): Promise<Invoice>
generateInvoiceNumber(): Promise<string> // Format: INV-2025-0001
getBuilderRateCard(builderId: number, jobType: string, date: Date): Promise<BuilderRateCard>
applyVolumeDiscount(baseRate: number, jobCount: number, rateCard: BuilderRateCard): number
getUnbilledJobs(builderId: number): Promise<Job[]>
markJobsAsBilled(jobIds: number[], invoiceId: number): Promise<void>
createInvoiceLineItems(invoiceId: number, jobs: Job[]): Promise<void>
```

#### API Routes
```typescript
// server/routes.ts additions
POST /api/invoices/preview
  - Input: { builderId, periodStart, periodEnd }
  - Returns: preview of invoice with line items (not saved)

POST /api/invoices
  - Input: { builderId, periodStart, periodEnd, jobIds }
  - Creates draft invoice
  - Returns: invoice with line items

PATCH /api/invoices/:id/review
  - Changes status: draft → reviewed
  - Requires admin role

GET /api/invoices/:id/pdf
  - Generates PDF using @react-pdf/renderer
  - Returns: PDF blob

POST /api/invoices/:id/send
  - Changes status: reviewed → sent
  - Sends email to Pat with PDF
  - Queues QuickBooks sync
  - Returns: success

GET /api/invoices
  - List all invoices with filters (status, builder, date range)
  - Pagination support
```

#### Frontend Components
```typescript
// client/src/pages/FinancialDashboard.tsx
- Tab navigation: Invoices | Payments | Expenses | Analytics
- KPI cards at top
- Role-based content (admin only)

// client/src/pages/InvoiceWizard.tsx
- Step 1: Select period (month picker)
- Step 2: Review unbilled jobs (checkboxes to include/exclude)
- Step 3: Review totals (by job type, volume discounts applied)
- Step 4: PDF preview (iframe or modal)
- Step 5: Send confirmation (email to Pat, QuickBooks sync status)

// client/src/components/InvoicePDF.tsx (@react-pdf/renderer)
- Building Knowledge branding (red #c93132)
- Logo (if available)
- Invoice details (number, date, period)
- Line items table (job type, quantity, rate, total)
- Subtotal, tax (if applicable), total
- Payment terms and instructions
```

#### Testing
- Rate card application unit tests
- Volume discount calculation tests
- Invoice PDF snapshot tests
- E2E: create invoice → review → send → verify email

### Phase 3: Payments & AR

#### Storage Methods
```typescript
recordPayment(data: InsertPayment): Promise<Payment>
getPaymentsByInvoice(invoiceId: number): Promise<Payment[]>
calculateARAging(builderId: number, asOfDate: Date): Promise<ARSnapshot>
createARSnapshot(): Promise<void> // cron job
getUnbilledWorkValue(builderId: number): Promise<{ count: number, amount: number }>
```

#### API Routes
```typescript
POST /api/payments
  - Input: { invoiceId, amount, paymentDate, referenceNumber }
  - Creates payment record
  - Updates invoice status if fully paid
  - Queues QuickBooks sync

GET /api/ar/aging
  - Returns AR aging buckets (current, 30, 60, 90+)
  - By builder

GET /api/ar/unbilled
  - Returns unbilled work summary
  - Completed jobs not yet invoiced
```

#### Frontend Components
```typescript
// client/src/pages/PaymentsTab.tsx
- Payment entry form
- Recent payments table
- Filter by invoice, date range

// client/src/pages/ARAgingReport.tsx
- Aging buckets visualization (bar chart)
- Invoice list grouped by bucket
- Drill-down to invoice details

// client/src/pages/UnbilledWorkTracker.tsx
- Table of completed jobs not yet invoiced
- Group by job type
- Bulk select → create invoice action
```

#### Cron Jobs
```typescript
// Daily AR snapshot (runs at midnight)
node-cron: '0 0 * * *'
  → calculateAndStoreARSnapshot()

// Weekly unbilled work reminder
node-cron: '0 9 * * 1' // Monday 9am
  → sendUnbilledWorkEmail() if count > 10
```

#### Testing
- Ledger balancing tests (payments must match invoice totals)
- AR aging calculation accuracy
- E2E: record payment → verify invoice status → check QuickBooks sync

### Phase 4: Expense Management Overhaul

#### Storage Methods
```typescript
getExpenseCategories(): Promise<ExpenseCategory[]>
createExpenseRule(data: InsertExpenseRule): Promise<ExpenseRule>
autoClassifyExpense(expense: Expense): Promise<{ categoryId: number, confidence: number }>
bulkApproveExpenses(expenseIds: number[], approvedBy: number): Promise<void>
bulkRejectExpenses(expenseIds: number[], rejectedBy: number): Promise<void>
getExpensesByStatus(status: string, userId?: number): Promise<Expense[]>
suggestJobForExpense(expense: Expense): Promise<Job | null> // GPS + time proximity
```

#### API Routes
```typescript
GET /api/expenses/categories
POST /api/expenses/rules

POST /api/expenses/:id/approve
POST /api/expenses/:id/reject
POST /api/expenses/bulk/approve
POST /api/expenses/bulk/reject

POST /api/expenses/:id/auto-classify
  - Runs auto-classification rules
  - Returns suggested category

GET /api/expenses/pending
  - Returns expenses needing approval
  - Sorted by date
```

#### Frontend Components
```typescript
// client/src/pages/ExpenseSwipeInterface.tsx (Mobile-First)
- Card-based UI (one expense per card)
- Swipe gestures (using react-dnd or custom touch handlers)
  - Right swipe → approve (green highlight, checkmark)
  - Left swipe → reject (gray highlight, X)
  - Long press → category picker modal
- Undo button (5-second timeout)
- Progress indicator (X of Y reviewed)
- Camera button for receipt capture

// client/src/components/ReceiptCaptureModal.tsx
- Camera integration (Uppy webcam plugin or native)
- OCR processing (tesseract.js)
- Auto-fill: amount, vendor, date
- Manual override fields
- Upload to object storage

// client/src/pages/ExpenseApprovalQueue.tsx (Admin)
- Table view with filters
- Bulk select checkboxes
- Approve/reject buttons
- Category assignment dropdown
- Rules management interface

// client/src/pages/ExpenseCategoryManager.tsx
- CRUD for categories
- QuickBooks account mapping
- Color and icon picker
- Auto-classification rules editor
```

#### Auto-Classification Rules Engine
```typescript
// server/expenseClassifier.ts
async function classifyExpense(expense: Expense): Promise<Classification> {
  // 1. Check vendor pattern rules (regex match)
  const vendorRule = await matchVendorRule(expense.vendor);
  if (vendorRule) return { categoryId: vendorRule.categoryId, confidence: 0.9 };

  // 2. Check GPS proximity to job sites
  if (expense.gpsLatitude && expense.gpsLongitude) {
    const nearbyJob = await findNearbyJob(expense.gps, expense.date);
    if (nearbyJob) {
      // Suggest job attribution
      return { jobId: nearbyJob.id, confidence: 0.7 };
    }
  }

  // 3. Check time proximity to scheduled jobs
  const timeProximityJob = await findJobByTimeProximity(expense.userId, expense.date);
  if (timeProximityJob) return { jobId: timeProximityJob.id, confidence: 0.6 };

  // 4. Historical vendor categorization
  const historicalCategory = await getHistoricalVendorCategory(expense.vendor);
  if (historicalCategory) return { categoryId: historicalCategory, confidence: 0.5 };

  return { categoryId: null, confidence: 0 };
}
```

#### Testing
- Gesture unit tests (swipe detection)
- Offline sync tests (queue expense approvals)
- Classification rule coverage tests
- E2E: capture receipt → OCR → auto-classify → approve → job cost ledger update

### Phase 5: Profitability Analytics

#### Storage Methods
```typescript
getProfitabilityByJobType(dateRange: DateRange): Promise<JobTypeProfitability[]>
getProfitabilityByBuilder(dateRange: DateRange): Promise<BuilderProfitability[]>
getProfitabilityByInspector(dateRange: DateRange): Promise<InspectorProfitability[]>
getExpenseBreakdown(dateRange: DateRange): Promise<CategoryExpense[]>
getCashFlowForecast(days: number): Promise<CashFlowPoint[]>
calculateCashRunway(): Promise<{ months: number, burnRate: number }>
```

#### API Routes
```typescript
GET /api/analytics/profitability/job-types?start=2025-01-01&end=2025-01-31
GET /api/analytics/profitability/builders?start=2025-01-01&end=2025-01-31
GET /api/analytics/profitability/inspectors?start=2025-01-01&end=2025-01-31
GET /api/analytics/expenses/breakdown?start=2025-01-01&end=2025-01-31
GET /api/analytics/cashflow/forecast?days=90
GET /api/analytics/cashflow/runway
```

#### Frontend Components
```typescript
// client/src/pages/AnalyticsDashboard.tsx
- KPI Cards (4 across top):
  1. Monthly Revenue (trend ±%)
  2. Unbilled Work ($amount, count)
  3. Next Invoice (countdown)
  4. Cash Runway (months)

- Profitability by Job Type:
  - Table: Job Type | Count | Revenue | Cost | Margin $ | Margin %
  - Bar chart overlay (Recharts)
  - Sortable columns

- Profitability by Builder:
  - Primarily Building Knowledge
  - Revenue contribution % (pie chart)
  - Average margin per builder

- Profitability by Inspector:
  - Shaun vs Erik comparison
  - Jobs completed, hours, revenue, efficiency
  - Productivity metrics

- Expense Breakdown:
  - Pie chart by category (Recharts)
  - Month-over-month trend
  - Top vendors table

- 90-Day Cash Flow Forecast:
  - Line chart (Recharts)
  - Inflows, outflows, net position
  - Highlight cash crunches
```

#### Calculations
```typescript
// Job Type Profitability
revenue = SUM(jobs.rateCardPrice WHERE jobType = X)
cost = SUM(jobCostLedger.amount WHERE jobType = X)
margin = revenue - cost
marginPercent = (margin / revenue) * 100

// Cash Runway
monthlyBurnRate = AVG(monthly expenses over last 3 months)
currentCash = unbilledWork + AR - AP
runway = currentCash / monthlyBurnRate

// Cash Flow Forecast
scheduledJobs = jobs WHERE scheduledDate IN next 90 days
expectedRevenue = SUM(scheduledJobs.estimatedRate)
expectedExpenses = AVG(historical expenses) * (days / 30)
netCashFlow = expectedRevenue - expectedExpenses
```

#### Testing
- Metric calculation tests with fixtures
- Visual regression tests for charts (Playwright screenshots)
- Performance tests (queries should be <1s)

### Phase 6: Compliance Suite

#### Storage Methods
```typescript
createMultifamilyProgram(data: InsertMultifamilyProgram): Promise<MultifamilyProgram>
getMultifamilyProgram(id: number): Promise<MultifamilyProgram>
updateBuilderVerifiedItems(jobId: number, count: number, photoRequired: boolean): Promise<void>
uploadComplianceArtifact(jobId: number, artifact: ComplianceArtifact): Promise<void>
getBenchmarkingDeadlines(buildingSize: number): Promise<{ class: string, deadline: Date }>
getEnergyStarChecklistTemplate(version: string, path: string): Promise<ChecklistTemplate>
calculateSampleSize(unitCount: number): Promise<number>
```

#### API Routes
```typescript
POST /api/multifamily-programs
PATCH /api/multifamily-programs/:id
GET /api/multifamily-programs/:id

POST /api/compliance/artifacts
  - Upload checklist, worksheet, photo, certificate
  - Links to job and program

GET /api/compliance/benchmarking/deadlines?sqft=100000
  - Returns Class 1 or Class 2 deadline

GET /api/compliance/energy-star/checklists?version=1.2&path=prescriptive
  - Returns checklist template

POST /api/compliance/sampling/calculate
  - Input: { unitCount: 25 }
  - Returns: { sampleSize: 9, protocol: "ENERGY STAR MFNC" }
```

#### Frontend Components
```typescript
// client/src/pages/MultifamilyProgramSetup.tsx
- Program type selector (ENERGY STAR MFNC, EGCC, ZERH, Benchmarking, None)
- Certification path radio buttons (Prescriptive, ERI, ASHRAE)
- Unit count input
- Sample size calculator (auto-calculates)
- MRO organization input
- Builder-verified items settings:
  - Count (1-8)
  - Photo required toggle

// client/src/pages/BuilderVerifiedItemsTracker.tsx
- List of builder-verified items
- Photo evidence upload (if required)
- Status tracking (verified, pending, failed)
- Compliance checklist integration

// client/src/pages/SamplingProtocolCalculator.tsx
- Unit count input
- Displays sample size per ENERGY STAR table
- Random unit selection tool
- Sample tracking (which units tested)

// client/src/pages/EnergyStarMFNCChecklist.tsx
- Digital version of ENERGY STAR MFNC checklist
- Auto-populate from job data
- Required field validation
- Photo attachment per item
- Submit to MRO workflow

// client/src/pages/MNHousingEGCCWorksheet.tsx
- Intended Methods Worksheet
- Energy Rebate Analysis form
- Document upload
- Submission tracking

// client/src/pages/ZERHComplianceTracker.tsx
- Prerequisites checklist:
  - ENERGY STAR MFNC 1.2 ✓
  - Indoor airPLUS ✓
- Additional measures tracking
- 45L tax credit calculator:
  - Units: [input]
  - Credit per unit: $2,500
  - Building credit: MIN(units × $2,500, $15,000)

// client/src/pages/BenchmarkingDeadlineTracker.tsx
- Building size input
- Class determination (Class 1 or Class 2)
- Deadline display with countdown
- ENERGY STAR Portfolio Manager integration (if possible)
- Compliance document upload

// client/src/pages/ComplianceDocumentsLibrary.tsx
- Filter by program type, artifact type, date
- Gallery view for photos
- Download all for a job (ZIP)
- Search by job number, builder, address
```

#### Reference Documents Storage
```typescript
// Store in object storage or static assets
/compliance-forms/
  energy-star-sf-v3.2-rev14.pdf
  energy-star-mfnc-v1.2-rev05.pdf
  hvac-functional-testing-310.pdf
  resnet-national-rater-checklist.pdf

// Parse into database for digital checklists
// Extract checklist items, create templates
```

#### Testing
- Compliance rules engine tests per program
- Sampling calculation accuracy
- E2E: multifamily job → program setup → checklist completion → artifact upload → submission

### Phase 7: QuickBooks Integration

#### Integration Search
```typescript
// Use Replit integrations for credential management
search_integrations(query: "QuickBooks Online")
// Store OAuth credentials securely via integrations module
```

#### QuickBooks Service
```typescript
// server/quickbooksService.ts
class QuickBooksService {
  // OAuth
  async getAuthorizationUrl(): Promise<string>
  async exchangeCodeForTokens(code: string): Promise<Tokens>
  async refreshAccessToken(refreshToken: string): Promise<Tokens>

  // Customers
  async createCustomer(customer: CustomerData): Promise<QBCustomer>
  async getCustomerByName(name: string): Promise<QBCustomer | null>

  // Invoices
  async createInvoice(invoice: InvoiceData): Promise<QBInvoice>
  async updateInvoice(id: string, invoice: InvoiceData): Promise<QBInvoice>
  async getInvoice(id: string): Promise<QBInvoice>

  // Payments
  async recordPayment(payment: PaymentData): Promise<QBPayment>
  async getPaymentsByInvoice(invoiceId: string): Promise<QBPayment[]>

  // AR Aging
  async getARAgingReport(customerId: string): Promise<ARAgingData>

  // Chart of Accounts
  async getChartOfAccounts(): Promise<QBAccount[]>
  async mapExpenseCategory(categoryId: number, qbAccountId: string): Promise<void>
}
```

#### Token Refresh Cron
```typescript
// server/scheduledQuickBooksSync.ts
import cron from 'node-cron';

// Refresh tokens every 30 minutes (QB tokens expire in 1 hour)
cron.schedule('*/30 * * * *', async () => {
  try {
    const tokens = await getStoredTokens();
    if (shouldRefresh(tokens)) {
      const newTokens = await qbService.refreshAccessToken(tokens.refresh_token);
      await storeTokens(newTokens);
      logger.info('QuickBooks tokens refreshed successfully');
    }
  } catch (error) {
    logger.error('QuickBooks token refresh failed', error);
    await sendAlertEmail('QuickBooks connection issue - manual reauth needed');
  }
});

// Sync pending invoices hourly
cron.schedule('0 * * * *', async () => {
  const pendingInvoices = await getPendingQuickBooksSync();
  for (const invoice of pendingInvoices) {
    await syncInvoiceToQuickBooks(invoice); // with exponential backoff
  }
});
```

#### API Routes
```typescript
GET /api/quickbooks/auth/url
  - Returns QB authorization URL
  - Redirect user to QB login

GET /api/quickbooks/auth/callback?code=xxx
  - Exchange code for tokens
  - Store tokens securely
  - Redirect to settings page

POST /api/quickbooks/sync/invoice/:id
  - Manual sync trigger
  - Push invoice to QB
  - Update quickbooksId and quickbooksSyncedAt

POST /api/quickbooks/sync/payment/:id
  - Manual sync trigger
  - Record payment in QB

GET /api/quickbooks/status
  - Returns connection status
  - Token expiry info
  - Last sync timestamps
```

#### Frontend Components
```typescript
// client/src/pages/QuickBooksSettings.tsx
- Connection status badge (connected, disconnected, error)
- "Connect to QuickBooks" button → OAuth flow
- "Disconnect" button
- Auto-sync toggles:
  - Sync invoices automatically ✓
  - Sync payments automatically ✓
  - Sync expenses automatically ✓
- Last sync timestamps
- Manual sync all button
- Error log viewer

// client/src/pages/ExpenseCategoryMapping.tsx
- Table: Category | QB Account | Action
- Dropdown to select QB account per category
- Fetch QB chart of accounts via API
- Save mappings

// client/src/components/QuickBooksSyncStatus.tsx
- Badge component for sync status
- Icons: synced (green check), pending (yellow clock), error (red X)
- Tooltip with last sync time
- Manual sync button (if error or pending)
```

#### Error Handling & Retry Logic
```typescript
// Exponential backoff for failed syncs
async function syncInvoiceToQuickBooks(invoice: Invoice, retryCount = 0) {
  try {
    const qbInvoice = await qbService.createInvoice(invoice);
    await updateInvoiceQuickBooksId(invoice.id, qbInvoice.Id);
    return { success: true };
  } catch (error) {
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      await sleep(delay);
      return syncInvoiceToQuickBooks(invoice, retryCount + 1);
    } else {
      logger.error('QuickBooks sync failed after 3 retries', { invoiceId: invoice.id, error });
      await flagInvoiceForManualSync(invoice.id);
      return { success: false, error };
    }
  }
}
```

#### Testing
- QuickBooks Sandbox integration tests
- Token refresh failure simulation
- Resilience tests (network errors, API rate limits)
- OAuth flow E2E (login → callback → token storage)
- Contract mocks for CI (avoid hitting QB API in tests)

## Migration Path from Wave/Google Sheets

### Step 1: Export Data
```typescript
// Export from Wave
- Download all invoices as CSV
- Fields: Invoice Number, Date, Customer, Line Items, Total, Status, Paid Date

// Export from Google Sheets
- Job tracking sheet with prices
- Builder rate cards
- Historical job data
```

### Step 2: Import Scripts
```typescript
// scripts/importWaveInvoices.ts
- Parse CSV
- Create invoice records in new system
- Link to jobs (if possible, by date/address match)
- Mark as historical (don't re-send)

// scripts/importRateCards.ts
- Parse Google Sheets rate data
- Create builderRateCards records
- Set effective dates based on historical knowledge

// scripts/importHistoricalJobs.ts
- Parse Google Sheets job data
- Match to existing jobs in system
- Fill in pricing and billing status
```

### Step 3: Dual-Entry Testing Period (1 Month)
```typescript
// Run both systems in parallel
- Create invoices in new system
- Continue Wave invoices as backup
- Compare outputs for accuracy
- Fix discrepancies before cutover
```

### Step 4: QuickBooks Cutover
```typescript
// Week 1: Connect QuickBooks
- Set up OAuth
- Create Building Knowledge customer
- Map chart of accounts

// Week 2: Historical data sync
- Push last 3 months of invoices to QB
- Record historical payments
- Verify AR balances match

// Week 3: Go live
- Generate first invoice in new system
- Send to Pat via new workflow
- Monitor for issues

// Week 4: Wave sunset
- Final reconciliation
- Archive Wave data
- Full migration complete
```

### Step 5: Rollback Plan
```typescript
// If critical issues arise:
- Database snapshots taken before each major migration step
- Can restore to previous state within 1 hour
- Wave credentials retained for 90 days
- Google Sheets archived as read-only backup
```

## Critical Architectural Decisions

### 1. Single Database vs Microservices
**Decision**: Single PostgreSQL database with logical separation
**Rationale**: 
- Simpler to maintain for small team
- Avoid distributed transaction complexity
- Easier local development
- Can migrate to microservices later if needed

### 2. Real-time vs Batch QuickBooks Sync
**Decision**: Batch sync with manual triggers
**Rationale**:
- Avoid QB API rate limits
- Allow manual review before sync
- Retry logic easier with queued jobs
- Real-time not critical for monthly invoicing

### 3. Photo Storage for Compliance
**Decision**: Replit Object Storage (existing)
**Rationale**:
- Already integrated
- Handles large files well
- Offline upload queue already implemented
- Cost-effective

### 4. Expense Classification: AI vs Rules
**Decision**: Rule-based classification (for now)
**Rationale**:
- Simpler to implement and debug
- Transparent to users
- Low expense volume (<100/month)
- Can add ML later if needed

### 5. Multifamily Checklists: Paper vs Digital
**Decision**: Hybrid approach
**Rationale**:
- Inspectors familiar with paper forms
- Digital allows auto-population
- Photo evidence easier digitally
- Support both workflows during transition

### 6. Invoice PDF: Client-side vs Server-side
**Decision**: Server-side (@react-pdf/renderer)
**Rationale**:
- Consistent rendering
- Can email directly from server
- No client-side PDF library bloat
- Easier to archive server-side

### 7. Analytics: Pre-calculated vs Query-time
**Decision**: Query-time with database indexes
**Rationale**:
- Always up-to-date
- Simpler code (no aggregation jobs)
- Low data volume makes queries fast
- Can add materialized views later if slow

## Success Metrics

### Phase 0-1 (Foundation)
- [ ] Pat can create jobs but cannot view financial data
- [ ] All schema migrations run without errors
- [ ] Type safety verified (no TypeScript errors)

### Phase 2 (Invoicing)
- [ ] Generate monthly invoice in <2 minutes
- [ ] PDF renders correctly with branding
- [ ] Email delivery success rate >99%
- [ ] Volume discounts apply correctly

### Phase 3 (Payments & AR)
- [ ] Payment application accuracy 100%
- [ ] AR aging matches QuickBooks (once integrated)
- [ ] Unbilled work alerts sent weekly

### Phase 4 (Expenses)
- [ ] Swipe through 100 expenses in <5 minutes
- [ ] Auto-classification accuracy >70%
- [ ] Receipt OCR accuracy >80%
- [ ] Offline expense capture works in field

### Phase 5 (Analytics)
- [ ] Dashboard loads in <2 seconds
- [ ] All metrics accurate (manual verification)
- [ ] Charts render correctly on mobile
- [ ] Cash runway calculation within 10% of manual

### Phase 6 (Compliance)
- [ ] All ENERGY STAR checklists mapped
- [ ] Sampling calculator matches official tables
- [ ] Builder-verified items tracking functional
- [ ] Benchmarking deadline alerts accurate

### Phase 7 (QuickBooks)
- [ ] OAuth connection success rate >95%
- [ ] Invoice sync success rate >99%
- [ ] Token refresh never fails for >1 hour
- [ ] AR balances match between systems

## Timeline Estimate (Aggressive)

- **Phase 0**: 2 days (permissions, feature flags)
- **Phase 1**: 3 days (data model, migrations, seeds)
- **Phase 2**: 5 days (invoicing workflow, PDF, email)
- **Phase 3**: 3 days (payments, AR aging, unbilled)
- **Phase 4**: 5 days (swipe UI, OCR, auto-classification)
- **Phase 5**: 4 days (analytics queries, charts, dashboard)
- **Phase 6**: 6 days (compliance forms, checklists, calculators)
- **Phase 7**: 5 days (QuickBooks OAuth, sync, monitoring)
- **Migration**: 3 days (export, import, dual-entry testing)

**Total**: ~36 days (7-8 weeks) for full implementation

## Risk Mitigation

### Technical Risks
1. **QuickBooks API rate limits**
   - Mitigation: Batch syncs, exponential backoff, monitor usage
2. **OCR accuracy on receipts**
   - Mitigation: Manual override always available, improve over time
3. **Mobile swipe gesture conflicts**
   - Mitigation: Thorough testing on iOS/Android, fallback to tap buttons
4. **Large PDF generation performance**
   - Mitigation: Async generation, show progress, optimize templates

### Business Risks
1. **Pat accidentally sees financial data**
   - Mitigation: Triple-layer permission checks, audit logging, testing
2. **Invoice calculation errors**
   - Mitigation: Extensive unit tests, manual review step, reconciliation reports
3. **QuickBooks connection breaks**
   - Mitigation: Monitoring, alerting, fallback to manual entry, Wave backup for 90 days
4. **Compliance checklist outdated**
   - Mitigation: Version tracking, regular updates, manual override capability

## Open Questions for Stakeholder Review

1. **Building Knowledge Branding**: Do we have logo files for invoice PDF?
2. **Tax Handling**: Is sales tax applicable? If so, what rate?
3. **Payment Terms**: Net 30? Net 15? Display on invoice?
4. **Email Template**: What should email to Pat say when sending invoice?
5. **QuickBooks Account**: Is sandbox available for testing before production setup?
6. **Compliance Forms**: Which specific ENERGY STAR checklists are most commonly used?
7. **Builder-Verified Items**: Is photo evidence becoming mandatory soon? Should we default to "required"?
8. **Expense Reimbursement**: How are Erik's expenses currently reimbursed? Paycheck? Separate check?
9. **Invoice Numbering**: Any specific format preference? (Currently: INV-2025-0001)
10. **Cash Flow Forecast**: What assumptions for labor costs per job type?

---

**Document Status**: Draft for Stakeholder Review  
**Last Updated**: 2025-10-31  
**Owner**: Shaun Ulrich (Ulrich Energy Auditing)  
**Reviewed By**: [Pending]  
**Approved**: [Pending]
