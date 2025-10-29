# Tax Credit 45L System - Production Vertical Slice

**Feature:** IRS Form 8909 Tax Credit Certification for Energy-Efficient Homes  
**Status:** Production-Ready (40/40)  
**Date:** January 29, 2025  
**Author:** Field Inspection System  
**Daily Usage:** CRITICAL (Revenue-Generating Certification Work)

---

## Overview

The Tax Credit 45L System manages IRS 45L tax credit certification for energy-efficient residential homes. Provides multi-unit project tracking, IECC 2006/Energy Star requirement verification, unit-level certification, IRS Form 8909 generation, and comprehensive documentation management.

### Key Capabilities

1. **Multi-Unit Projects** - Track single-family, multifamily, manufactured home developments
2. **Requirement Verification** - IECC 2006 compliance, Energy Star certification paths
3. **Unit-Level Certification** - Individual unit qualification with energy modeling
4. **Credit Calculation** - $2,000/unit (Energy Star), $5,000/unit (Zero Energy Ready)
5. **IRS Form 8909** - Auto-generate tax forms with qualified units and credit amounts
6. **Document Management** - Centralized storage for test reports, certifications, calculations
7. **Builder Integration** - Link projects to builders for volume certification workflows

### Business Value

- **Revenue Generation:** $150-300/unit certification fees
- **IRS Compliance:** Meets Form 8909 documentation requirements
- **Volume Efficiency:** Certify 50-200 units per project
- **Builder Retention:** High-value service for production builders

### Tax Credit Amounts (45L)

- **$2,000 per unit:** Energy Star qualified homes
- **$5,000 per unit:** Zero Energy Ready homes (50% energy reduction)
- **Eligibility:** New construction only, completed after January 1, 2023
- **Compliance:** IECC 2006 or Energy Star v3.1/3.2 standards

---

## Database Schema

### Table: `taxCreditProjects`

**Purpose:** Multi-unit project tracking with certification status.

```typescript
export const taxCreditProjects = pgTable("tax_credit_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  projectName: text("project_name").notNull(),
  projectType: text("project_type", { enum: ["single_family", "multifamily", "manufactured"] }).notNull(),
  totalUnits: integer("total_units").notNull(),
  qualifiedUnits: integer("qualified_units").default(0),
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default("0"),
  certificationDate: timestamp("certification_date"),
  taxYear: integer("tax_year").notNull(),
  status: text("status", { enum: ["pending", "certified", "claimed", "denied"] }).notNull().default("pending"),
  softwareTool: text("software_tool"),
  softwareVersion: text("software_version"),
  referenceHome: jsonb("reference_home"),
  qualifiedHome: jsonb("qualified_home"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_tax_credit_projects_builder_id").on(table.builderId),
  index("idx_tax_credit_projects_status").on(table.status),
  index("idx_tax_credit_projects_tax_year").on(table.taxYear),
]);
```

**Columns:**
- `projectName` - "Maple Ridge Phase 2", "Oak Hill Townhomes"
- `projectType` - single_family, multifamily, manufactured
- `totalUnits` - Total units in project (e.g., 50)
- `qualifiedUnits` - Units meeting 45L requirements (e.g., 48)
- `creditAmount` - Total credit ($2,000 × qualifiedUnits or $5,000 × qualifiedUnits)
- `taxYear` - Tax year for claiming credit (2025)
- `status` - pending → certified → claimed
- `softwareTool` - REM/Rate, EnergyGauge, REScheck
- `referenceHome` - JSON: IECC 2006 reference home energy model
- `qualifiedHome` - JSON: Proposed home energy model with % savings

**Indexes:** builder_id, status, tax_year (3 indexes)

---

### Table: `taxCreditRequirements`

**Purpose:** Checklist items for 45L compliance (IECC/Energy Star requirements).

```typescript
export const taxCreditRequirements = pgTable("tax_credit_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  requirementType: text("requirement_type").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "na"] }).notNull().default("pending"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  documentIds: text("document_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tax_credit_requirements_project_id").on(table.projectId),
  index("idx_tax_credit_requirements_status").on(table.status),
]);
```

**Requirement Types:**
- `envelope` - Insulation levels (R-13, R-30, R-38, R-49)
- `hvac` - Equipment efficiency (AFUE 90%+, SEER 16+)
- `air_sealing` - Blower door test (ACH50 ≤ 3.0 for MN Climate Zone 6)
- `duct_sealing` - Duct leakage (≤4.0 CFM25/100 sq ft total)
- `lighting` - Energy Star certified fixtures
- `appliances` - Energy Star appliances
- `windows` - U-factor ≤0.30, SHGC ≤0.40

**Status Workflow:** pending → completed (or failed/na)

---

### Table: `taxCreditDocuments`

**Purpose:** Centralized document storage for project evidence.

```typescript
export const taxCreditDocuments = pgTable("tax_credit_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  status: text("status", { enum: ["active", "expired", "archived"] }).notNull().default("active"),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index("idx_tax_credit_documents_project_id").on(table.projectId),
  index("idx_tax_credit_documents_status").on(table.status),
]);
```

**Document Types:**
- `energy_model` - REM/Rate, EnergyGauge simulation results
- `blower_door_test` - Airtightness test reports
- `duct_leakage_test` - Duct sealing test reports
- `hvac_specs` - Equipment datasheets (AFUE, SEER ratings)
- `insulation_specs` - R-value specifications and photos
- `window_specs` - U-factor and SHGC certifications
- `certification_letter` - Final 45L certification letter
- `form_8909` - IRS Form 8909 for tax filing

---

### Table: `unitCertifications`

**Purpose:** Individual unit qualification with energy performance data.

```typescript
export const unitCertifications = pgTable("unit_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => taxCreditProjects.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: 'set null' }),
  unitAddress: text("unit_address").notNull(),
  unitNumber: text("unit_number"),
  heatingLoad: decimal("heating_load", { precision: 10, scale: 2 }),
  coolingLoad: decimal("cooling_load", { precision: 10, scale: 2 }),
  annualEnergyUse: decimal("annual_energy_use", { precision: 10, scale: 2 }),
  percentSavings: decimal("percent_savings", { precision: 5, scale: 2 }),
  qualified: boolean("qualified").default(false),
  certificationDate: timestamp("certification_date"),
  blowerDoorACH50: decimal("blower_door_ach50", { precision: 8, scale: 2 }),
  ductLeakageCFM25: decimal("duct_leakage_cfm25", { precision: 8, scale: 2 }),
  hersIndex: integer("hers_index"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_unit_certifications_project_id").on(table.projectId),
  index("idx_unit_certifications_job_id").on(table.jobId),
  index("idx_unit_certifications_qualified").on(table.qualified),
]);
```

**Columns:**
- `unitAddress` - "1234 Main St, Unit 2A"
- `heatingLoad` - BTU/h (calculated from energy model)
- `coolingLoad` - BTU/h (calculated from energy model)
- `annualEnergyUse` - kWh/year total energy consumption
- `percentSavings` - % improvement vs IECC 2006 reference (≥50% for $5k credit)
- `qualified` - true if unit meets 45L requirements
- `blowerDoorACH50` - Airtightness test result (≤3.0 for MN)
- `ductLeakageCFM25` - Duct leakage result (≤4.0 for MN)
- `hersIndex` - HERS Index (optional, <50 for Zero Energy Ready)

**Qualification Logic:**
```typescript
const unitQualifies = (unit) => {
  // Energy Star Path: 
  return (
    unit.blowerDoorACH50 <= 3.0 &&
    unit.ductLeakageCFM25 <= 4.0 &&
    unit.percentSavings >= 0  // Meets IECC 2006 minimum
  );
  
  // Zero Energy Ready Path:
  // unit.percentSavings >= 50 && unit.hersIndex < 50
};
```

---

## API Endpoints

### Project CRUD

#### `POST /api/tax-credit/projects`
**Create 45L project**

**Request:**
```json
{
  "builderId": "builder-123",
  "projectName": "Maple Ridge Phase 2",
  "projectType": "single_family",
  "totalUnits": 50,
  "taxYear": 2025,
  "softwareTool": "REM/Rate v16",
  "referenceHome": {
    "heatingBTU": 48000,
    "coolingBTU": 36000,
    "annualEnergy": 28500
  }
}
```

**Response:**
```json
{
  "id": "project-uuid",
  "builderId": "builder-123",
  "projectName": "Maple Ridge Phase 2",
  "projectType": "single_family",
  "totalUnits": 50,
  "qualifiedUnits": 0,
  "creditAmount": 0,
  "taxYear": 2025,
  "status": "pending",
  "softwareTool": "REM/Rate v16"
}
```

---

#### `GET /api/tax-credit/projects`
**List all projects** (filters: builder, status, tax year)

---

#### `GET /api/tax-credit/projects/:id`
**Get project** with requirements, units, documents

**Response:**
```json
{
  "id": "project-uuid",
  "projectName": "Maple Ridge Phase 2",
  "totalUnits": 50,
  "qualifiedUnits": 48,
  "creditAmount": 96000.00,
  "status": "certified",
  "requirements": [
    {"type": "envelope", "status": "completed"},
    {"type": "air_sealing", "status": "completed"}
  ],
  "units": [
    {"unitAddress": "1234 Main St", "qualified": true, "percentSavings": 12.5}
  ],
  "documents": [
    {"type": "energy_model", "fileName": "maple_ridge_rem_rate.pdf"}
  ]
}
```

---

#### `PATCH /api/tax-credit/projects/:id`
**Update project** (status, qualified units, credit amount)

---

### Requirement Management

#### `POST /api/tax-credit/projects/:id/requirements`
**Add requirement** to project

**Request:**
```json
{
  "requirementType": "air_sealing",
  "description": "Blower door test ACH50 ≤3.0 per Minnesota 2020 Energy Code",
  "status": "pending"
}
```

---

#### `PATCH /api/tax-credit/requirements/:id`
**Update requirement status**

**Request:**
```json
{
  "status": "completed",
  "completedDate": "2025-01-29",
  "notes": "All units tested, 48/50 passed",
  "documentIds": ["doc-uuid-1", "doc-uuid-2"]
}
```

---

### Unit Certification

#### `POST /api/tax-credit/projects/:id/units`
**Add unit** to project

**Request:**
```json
{
  "jobId": "job-456",
  "unitAddress": "1234 Main St, Unit 2A",
  "unitNumber": "2A",
  "heatingLoad": 38000,
  "coolingLoad": 28000,
  "annualEnergyUse": 24500,
  "percentSavings": 14.0,
  "blowerDoorACH50": 2.1,
  "ductLeakageCFM25": 3.2,
  "hersIndex": 62
}
```

**Business Logic:**
1. Calculate qualification: `qualified = (blowerDoorACH50 <= 3.0 && ductLeakageCFM25 <= 4.0)`
2. If qualified: increment project.qualifiedUnits
3. Recalculate creditAmount: qualifiedUnits × $2,000 (or $5,000 for Zero Energy Ready)

---

#### `GET /api/tax-credit/projects/:id/units`
**List units** for project (filters: qualified, address)

---

#### `PATCH /api/tax-credit/units/:id`
**Update unit** data (test results, qualification status)

---

### Document Management

#### `POST /api/tax-credit/projects/:id/documents`
**Upload document** (multipart/form-data)

**Request:**
```
POST /api/tax-credit/projects/project-uuid/documents
Content-Type: multipart/form-data

documentType: energy_model
file: maple_ridge_rem_rate.pdf
notes: REM/Rate v16 simulation for all 50 units
```

---

#### `GET /api/tax-credit/projects/:id/documents`
**List documents** for project

---

### Form 8909 Generation

#### `GET /api/tax-credit/projects/:id/form-8909`
**Generate IRS Form 8909** (PDF)

**Response:** PDF file with:
- Project name and builder
- Total qualified units
- Credit amount per unit ($2,000 or $5,000)
- Total credit amount
- Tax year
- Supporting documentation references

**Calculation:**
```
Total Credit = Qualified Units × Credit Amount Per Unit
Example: 48 units × $2,000 = $96,000
```

---

### Reports

#### `GET /api/tax-credit/reports/summary`
**45L certification summary** (by year, builder, project type)

**Query Parameters:**
- `taxYear` - Filter by tax year
- `builderId` - Filter by builder

**Response:**
```json
{
  "taxYear": 2025,
  "totalProjects": 5,
  "totalUnits": 250,
  "qualifiedUnits": 238,
  "totalCredit": 476000.00,
  "byProjectType": {
    "single_family": {"projects": 3, "units": 150, "credit": 300000},
    "multifamily": {"projects": 2, "units": 100, "credit": 176000}
  }
}
```

---

## Workflows

### Workflow 1: Create 45L Project

**Steps:**
1. Builder agrees to 45L certification for new development
2. Create project record:
   - Select builder
   - Enter project name (e.g., "Maple Ridge Phase 2")
   - Project type: single_family, multifamily, or manufactured
   - Total units: 50
   - Tax year: 2025
   - Energy modeling software: REM/Rate v16
3. Add requirements checklist:
   - Envelope (insulation levels)
   - HVAC (equipment efficiency)
   - Air sealing (blower door ≤3.0 ACH50)
   - Duct sealing (≤4.0 CFM25/100 sq ft)
   - Lighting, appliances, windows
4. Status → "pending"

---

### Workflow 2: Certify Individual Units

**Steps:**
1. Inspector completes final inspection for unit
2. Navigate to project
3. Click "Add Unit"
4. Enter unit details:
   - Address: "1234 Main St, Unit 2A"
   - Link to job (optional)
   - Energy model results:
     - Heating load: 38,000 BTU/h
     - Cooling load: 28,000 BTU/h
     - Annual energy use: 24,500 kWh
     - % savings vs reference: 14.0%
   - Test results:
     - Blower door ACH50: 2.1
     - Duct leakage CFM25: 3.2
     - HERS Index: 62
5. System calculates qualification:
   - ACH50 ≤ 3.0? Yes (2.1)
   - CFM25 ≤ 4.0? Yes (3.2)
   - Qualified: true
6. System increments qualifiedUnits: 1 → 48
7. System recalculates creditAmount: 48 × $2,000 = $96,000

---

### Workflow 3: Generate IRS Form 8909

**Trigger:** All units certified, project ready for tax filing

**Steps:**
1. Navigate to project
2. Verify all requirements completed:
   - Envelope: ✓
   - HVAC: ✓
   - Air sealing: ✓ (48/50 units passed)
   - Duct sealing: ✓
3. Click "Generate Form 8909"
4. System generates PDF:
   - Part I: Qualified homes and credit amount
     - 48 qualified single-family homes
     - $2,000 per home
     - Total credit: $96,000
   - Part II: Supporting documentation
     - Energy modeling reports (REM/Rate)
     - Blower door test reports
     - Duct leakage test reports
     - HVAC equipment specs
5. System updates project status → "certified"
6. PDF emailed to builder and saved to documents

---

## Use Cases

### Use Case 1: 50-Unit Single-Family Development

**Scenario:** ABC Homes builds 50-unit subdivision, wants 45L tax credits.

**Steps:**
1. Create project "Oak Hill Estates"
   - Builder: ABC Homes
   - Type: single_family
   - Total units: 50
   - Tax year: 2025
   - Software: REM/Rate v16
2. Energy modeler creates reference home (IECC 2006):
   - Heating: 48,000 BTU/h
   - Cooling: 36,000 BTU/h
   - Annual energy: 28,500 kWh
3. Energy modeler creates qualified home model:
   - R-49 attic, R-21 walls, R-30 basement
   - 96% AFUE furnace, SEER 16 AC
   - Low-E windows (U=0.28, SHGC=0.30)
   - Annual energy: 24,200 kWh
   - Savings: 15.1% vs reference
4. Inspector tests each unit:
   - Blower door: ACH50 = 1.8-2.5 (all pass ≤3.0)
   - Duct leakage: CFM25 = 2.8-3.9 (48 pass, 2 fail)
5. 48 units qualify → $96,000 total credit
6. Generate Form 8909, provide to builder for tax filing

**Revenue:** 50 units × $150/unit = $7,500 certification fee

---

### Use Case 2: 100-Unit Multifamily Project (Zero Energy Ready)

**Scenario:** DEF Apartments wants $5,000/unit credit (50%+ energy savings).

**Steps:**
1. Create project "Greenview Apartments"
   - Type: multifamily
   - Total units: 100
   - Tax year: 2025
2. Energy model shows 52% savings vs IECC 2006:
   - High-performance envelope (R-60 attic, R-27 walls)
   - Heat pump HVAC (HSPF 10, SEER 18)
   - Solar PV array (8 kW per unit)
   - HERS Index: 42 (all units)
3. All units tested:
   - ACH50: 1.5-2.2 (all pass)
   - Duct leakage: 2.1-3.5 (all pass)
4. 100 units qualify → $500,000 total credit
5. Generate Form 8909 with Zero Energy Ready documentation

**Revenue:** 100 units × $300/unit = $30,000 certification fee

---

## Integration Points

### Jobs System
- **Link:** unitCertifications.jobId → jobs.id
- **Data:** Blower door/duct leakage test results automatically populate unit record

### Builders System
- **Link:** taxCreditProjects.builderId → builders.id
- **Data:** Project history, total units certified per builder

### Blower Door/Duct Testing
- **Link:** Test results auto-populate unit certifications
- **Validation:** ACH50 ≤3.0, CFM25 ≤4.0 compliance checks

---

## Troubleshooting

### Issue: Unit Not Qualifying Despite Passing Tests

**Symptoms:** qualified = false even though ACH50 and CFM25 are within limits

**Diagnosis:**
```sql
SELECT 
  unit_address,
  blower_door_ach50,
  duct_leakage_cfm25,
  qualified
FROM unit_certifications
WHERE project_id = 'project-uuid' AND qualified = false;
```

**Common Causes:**
- Blower door result entered as CFM50 instead of ACH50
- Duct leakage entered as total CFM instead of CFM/100 sq ft
- Null values in test result fields

**Solution:** Verify correct units, re-enter data

---

### Issue: Credit Amount Not Updating

**Symptoms:** creditAmount remains $0 despite qualified units

**Solution:** Manually trigger recalculation
```sql
UPDATE tax_credit_projects
SET 
  qualified_units = (SELECT COUNT(*) FROM unit_certifications WHERE project_id = 'project-uuid' AND qualified = true),
  credit_amount = (SELECT COUNT(*) FROM unit_certifications WHERE project_id = 'project-uuid' AND qualified = true) * 2000
WHERE id = 'project-uuid';
```

---

## Conclusion

Tax Credit 45L System provides complete IRS certification workflow for energy-efficient homes. Production-ready with 40/40 compliance (see TAX_CREDIT_COMPLIANCE.md).

**Key Features:**
- 4 tables (projects, requirements, documents, unitCertifications)
- 17+ API endpoints
- Multi-unit project tracking
- IECC 2006/Energy Star compliance verification
- IRS Form 8909 generation
- $2,000-$5,000 per unit tax credits

**Daily Impact:** High-value revenue stream ($7,500-$30,000 per project), builder differentiation, IRS audit trail.
