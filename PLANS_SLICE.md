# Plans Management - Production Vertical Slice

**Feature:** Floor Plan Library with Job Associations  
**Status:** Production-Ready (40/40)  
**Date:** January 29, 2025  
**Author:** Field Inspection System  
**Daily Usage:** MODERATE (Builder plan catalog, job associations)

---

## Overview

Plans Management provides a centralized library of builder floor plans with house specifications (floor area, surface area, volume, stories). Plans are linked to builders, associated with jobs, and used for lot assignments, enabling rapid job creation and specification management.

### Key Capabilities

1. **Plan Library** - Catalog of builder floor plans with specifications
2. **Builder Association** - Plans linked to builders (CASCADE delete)
3. **Job Linking** - Jobs reference plans for house specifications
4. **Lot Assignment** - Lots reference plans for development planning
5. **Specification Management** - Floor area, surface area, house volume, stories
6. **Search & Filter** - Find plans by name, builder, specifications

### Business Value

- **Rapid Job Creation:** Pre-defined plans with specifications reduce data entry
- **Consistency:** Standard plans ensure accurate specifications across jobs
- **Builder Catalog:** Organized library of builder floor plans
- **Volume Calculations:** Automated house volume for blower door test calculations
- **Development Planning:** Lot-level plan assignments for subdivision management

---

## Database Schema

### Table: `plans`

**Purpose:** Floor plan library with house specifications.

```typescript
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  builderId: varchar("builder_id").notNull().references(() => builders.id, { onDelete: 'cascade' }),
  planName: text("plan_name").notNull(),
  floorArea: decimal("floor_area", { precision: 10, scale: 2 }),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  houseVolume: decimal("house_volume", { precision: 10, scale: 2 }),
  stories: decimal("stories", { precision: 3, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [2 indexes]);
```

**Key Columns:**
- `planName` - Friendly name (e.g., "Rambler 1800", "Two-Story Colonial 2400")
- `floorArea` - Total conditioned floor area (sq ft) - used for Energy Star certification
- `surfaceArea` - Total building envelope surface area (sq ft) - used for thermal boundary calculations
- `houseVolume` - Total conditioned house volume (cu ft) - **critical for blower door ACH50 calculations**
- `stories` - Number of stories (1.0, 1.5, 2.0, 2.5, 3.0) - affects inspection scope

**2 Indexes:**
- `idx_plans_builder_id` - Fast lookup by builder
- `idx_plans_plan_name` - Search by plan name

---

## API Endpoints

### Plan CRUD

#### `POST /api/plans`
**Create plan**

**Request:**
```json
{
  "builderId": "builder-001",
  "planName": "Rambler 1800",
  "floorArea": 1800.00,
  "surfaceArea": 4200.00,
  "houseVolume": 14400.00,
  "stories": 1.0,
  "notes": "Single-story rambler with open concept"
}
```

**Business Logic:** 
- `builderId` required (CASCADE delete when builder deleted)
- `houseVolume` auto-calculated if `floorArea` and `stories` provided: `floorArea * 8 ft ceiling * stories`

---

#### `GET /api/plans`
**List plans** (filters: builder_id, search, pagination)

**Query Parameters:**
- `builderId` - Filter by builder
- `search` - Fuzzy match on plan_name
- `limit` / `offset` - Pagination

**Response:**
```json
{
  "plans": [
    {
      "id": "plan-001",
      "planName": "Rambler 1800",
      "floorArea": 1800.00,
      "houseVolume": 14400.00,
      "stories": 1.0,
      "builder": {"id": "builder-001", "companyName": "M/I Homes"}
    }
  ],
  "total": 15
}
```

---

#### `GET /api/plans/:id`
**Get plan** with associated jobs and lots

**Response:**
```json
{
  "id": "plan-001",
  "planName": "Rambler 1800",
  "floorArea": 1800.00,
  "surfaceArea": 4200.00,
  "houseVolume": 14400.00,
  "stories": 1.0,
  "jobs": [
    {"id": "job-123", "name": "123 Oak St - Pre-Drywall", "status": "completed"}
  ],
  "lots": [
    {"id": "lot-456", "lotNumber": "14", "status": "under_construction"}
  ]
}
```

---

#### `PATCH /api/plans/:id`
**Update plan** (specifications, notes)

**Request:**
```json
{
  "floorArea": 1850.00,
  "houseVolume": 14800.00,
  "notes": "Updated with optional third bedroom"
}
```

---

#### `DELETE /api/plans/:id`
**Delete plan** (SET NULL on jobs and lots)

**Business Logic:** 
- Jobs/lots with planId → SET NULL (preserve job/lot when plan deleted)
- Plan deleted from library

---

### Builder Association

#### `GET /api/builders/:id/plans`
**List plans** for builder

**Response:**
```json
{
  "plans": [
    {"id": "plan-001", "planName": "Rambler 1800", "floorArea": 1800.00},
    {"id": "plan-002", "planName": "Two-Story 2400", "floorArea": 2400.00}
  ]
}
```

---

## Workflows

### Workflow 1: Create Plan and Associate with Jobs

**Scenario:** Builder provides standard floor plan, inspector creates plan and links jobs.

**Steps:**
1. Create plan:
   - POST /api/plans
   - builderId: "builder-001"
   - planName: "Rambler 1800"
   - floorArea: 1800 sq ft
   - houseVolume: 14,400 cu ft (auto-calculated: 1800 * 8 * 1.0)
2. Create job with plan:
   - POST /api/jobs
   - planId: "plan-001"
   - System auto-populates job.floorArea, job.houseVolume from plan
3. Blower door test uses job.houseVolume:
   - ACH50 = (CFM50 * 60) / houseVolume
   - Example: (480 CFM50 * 60) / 14,400 = 2.0 ACH50 (PASS)

---

### Workflow 2: Assign Plan to Lot

**Scenario:** Development manager assigns plan to lot for subdivision planning.

**Steps:**
1. Create development:
   - POST /api/builders/:id/developments
   - name: "Oak Ridge Estates"
2. Add lot with plan:
   - POST /api/developments/:id/lots
   - lotNumber: "14"
   - planId: "plan-001"
   - System links lot to plan
3. Create job from lot:
   - POST /api/jobs
   - lotId: "lot-001"
   - System auto-populates planId, floorArea, houseVolume from lot's plan

---

## Use Cases

### Use Case 1: Production Builder with 5 Standard Plans

**Scenario:** M/I Homes uses 5 standard floor plans across all developments.

**Plans:**
1. "Rambler 1600" - 1,600 sq ft, 1 story, 12,800 cu ft
2. "Rambler 1800" - 1,800 sq ft, 1 story, 14,400 cu ft
3. "Two-Story 2200" - 2,200 sq ft, 2 stories, 35,200 cu ft
4. "Two-Story 2400" - 2,400 sq ft, 2 stories, 38,400 cu ft
5. "Split-Entry 2000" - 2,000 sq ft, 1.5 stories, 24,000 cu ft

**Workflow:**
1. Admin creates 5 plans with specifications
2. Inspector creates jobs, selects plan from dropdown
3. System auto-populates job specifications from plan
4. Blower door test uses plan's houseVolume for ACH50 calculation

---

### Use Case 2: Custom Builder with Variable Plans

**Scenario:** Johnson Custom Homes builds unique homes, each requiring new plan.

**Workflow:**
1. Inspector creates new plan for each custom home
2. Plan includes unique specifications (floor area, volume)
3. Job references plan for consistency
4. Plan library grows as new custom homes built

---

## Integration Points

### Builders System
- **Link:** plans.builderId → builders.id
- **Data:** CASCADE delete (plans deleted when builder deleted)

### Jobs System
- **Link:** jobs.planId → plans.id
- **Data:** Jobs inherit floorArea, surfaceArea, houseVolume, stories from plan

### Lots System
- **Link:** lots.planId → plans.id
- **Data:** Lots reference plans for development planning

### Blower Door Testing
- **Link:** jobs.houseVolume → blowerDoorTests.houseVolume
- **Data:** House volume critical for ACH50 calculation: (CFM50 * 60) / houseVolume

---

## Troubleshooting

### Issue: Plan Cannot Be Deleted

**Symptoms:** Error when trying to delete plan

**Diagnosis:**
```sql
SELECT j.id, j.name
FROM jobs j
WHERE j.plan_id = 'plan-123';
```

**Common Causes:** Jobs still reference plan

**Solution:** 
- SET NULL is applied automatically
- Plan can be deleted (jobs will have planId → NULL)

---

### Issue: House Volume Incorrect

**Symptoms:** ACH50 calculation fails or returns unexpected value

**Diagnosis:**
```sql
SELECT plan_name, floor_area, house_volume
FROM plans
WHERE id = 'plan-123';
```

**Common Causes:**
- houseVolume not set
- houseVolume calculated incorrectly

**Solution:**
- Update plan with correct houseVolume
- Typical calculation: floorArea * 8 ft ceiling * stories
- Example: 1800 sq ft * 8 ft * 1.0 = 14,400 cu ft

---

## Conclusion

Plans Management provides centralized floor plan library with house specifications, enabling rapid job creation and automated blower door calculations. Production-ready with 40/40 compliance (see PLANS_COMPLIANCE.md).

**Key Features:**
- 1 table (plans)
- 6 API endpoints
- Builder associations (CASCADE delete)
- Job/lot linking (SET NULL)
- House specifications (floor area, surface area, volume, stories)
- Search & filter by builder, plan name

**Daily Impact:** Rapid job creation, specification consistency, automated volume calculations for blower door tests, development planning, builder plan catalog management.
