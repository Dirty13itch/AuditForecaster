# [FEATURE NAME] - Vertical Slice Documentation

**Feature ID:** `[feature-name]`  
**Version:** 1.0.0  
**Status:** [Draft | In Development | In Review | Production]  
**Owner:** [Team/Engineer Name]  
**Created:** [YYYY-MM-DD]  
**Last Updated:** [YYYY-MM-DD]

> **TODO:** Replace all `[PLACEHOLDER]` text with actual feature details

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [User Stories](#2-user-stories)
3. [Database Schema](#3-database-schema)
4. [Business Logic](#4-business-logic)
5. [Storage Layer](#5-storage-layer)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Interface](#7-frontend-interface)
8. [Testing Strategy](#8-testing-strategy)
9. [Observability](#9-observability)
10. [Operational Procedures](#10-operational-procedures)
11. [Performance Considerations](#11-performance-considerations)
12. [Security Considerations](#12-security-considerations)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Feature Overview

### 1.1 What It Does

> **TODO:** Describe what this feature does in 2-3 sentences

[FEATURE NAME] enables users to [PRIMARY CAPABILITY]. This feature is critical for [BUSINESS VALUE] and supports the workflow of [PRIMARY USER ROLE].

**Example (Energy Audit Equipment Tracking):**
> Equipment Checkout enables field inspectors to track which calibrated equipment they're using for each inspection. This feature ensures compliance with audit standards by maintaining chain of custody and calibration history for all testing equipment.

### 1.2 Why It Matters

> **TODO:** Explain the business value and user impact

**Business Value:**
- [PRIMARY BUSINESS OUTCOME, e.g., "Ensures regulatory compliance"]
- [EFFICIENCY GAIN, e.g., "Reduces manual paperwork by 80%"]
- [QUALITY IMPROVEMENT, e.g., "Eliminates equipment calibration errors"]

**User Impact:**
- **For [ROLE 1]:** [SPECIFIC BENEFIT]
- **For [ROLE 2]:** [SPECIFIC BENEFIT]
- **For [ROLE 3]:** [SPECIFIC BENEFIT]

**Example:**
> **Business Value:**
> - Ensures RESNET compliance (equipment calibration records required)
> - Reduces equipment loss/theft (clear assignment records)
> - Enables predictive maintenance (usage tracking)
> 
> **User Impact:**
> - **For Field Inspectors:** Know exactly which equipment they have checked out, when calibration expires
> - **For Admin:** Track equipment utilization, identify equipment bottlenecks
> - **For Compliance:** Generate audit trail reports for certifications

### 1.3 Scope

**In Scope:**
- [CAPABILITY 1]
- [CAPABILITY 2]
- [CAPABILITY 3]

**Out of Scope:**
- [EXCLUDED FEATURE 1]
- [EXCLUDED FEATURE 2]
- [FUTURE CONSIDERATION]

**Example:**
> **In Scope:**
> - Equipment checkout assignment to inspectors
> - Calibration expiry tracking and alerts
> - Equipment return workflow
> - Usage history reporting
> 
> **Out of Scope:**
> - Equipment procurement/purchasing
> - Maintenance vendor management
> - Real-time GPS tracking of equipment

### 1.4 Dependencies

**Upstream Dependencies (What this feature depends on):**
- [DEPENDENCY 1: e.g., "User authentication system"]
- [DEPENDENCY 2: e.g., "Jobs/scheduling feature"]

**Downstream Dependencies (What depends on this feature):**
- [DEPENDENT FEATURE 1]
- [DEPENDENT FEATURE 2]

**Example:**
> **Upstream Dependencies:**
> - User authentication (requires inspector user accounts)
> - Equipment management (requires equipment catalog)
> 
> **Downstream Dependencies:**
> - Compliance reporting (uses equipment checkout records)
> - Job completion workflow (validates equipment was checked out)

---

## 2. User Stories

### 2.1 Primary User Stories

> **TODO:** Write user stories in format: "As a [ROLE], I want to [ACTION] so that [BENEFIT]"

**Story 1: [PRIMARY WORKFLOW]**
```
As a [USER ROLE],
I want to [DESIRED ACTION],
So that [BUSINESS VALUE/OUTCOME].

Acceptance Criteria:
- [ ] [CRITERION 1]
- [ ] [CRITERION 2]
- [ ] [CRITERION 3]
```

**Example:**
```
As a field inspector,
I want to check out calibrated equipment before heading to a job,
So that I have the right tools and maintain compliance with audit standards.

Acceptance Criteria:
- [ ] See list of available equipment with calibration status
- [ ] Select equipment and assign it to myself for a specific job
- [ ] Receive confirmation with equipment details and checkout timestamp
- [ ] System prevents checkout of expired calibration equipment
- [ ] Mobile-friendly interface (works with gloves, bright sunlight)
```

**Story 2: [SECONDARY WORKFLOW]**
```
As a [USER ROLE],
I want to [DESIRED ACTION],
So that [BUSINESS VALUE/OUTCOME].

Acceptance Criteria:
- [ ] [CRITERION 1]
- [ ] [CRITERION 2]
- [ ] [CRITERION 3]
```

**Story 3: [EDGE CASE/ADMIN WORKFLOW]**
```
As a [USER ROLE],
I want to [DESIRED ACTION],
So that [BUSINESS VALUE/OUTCOME].

Acceptance Criteria:
- [ ] [CRITERION 1]
- [ ] [CRITERION 2]
- [ ] [CRITERION 3]
```

### 2.2 User Flows

> **TODO:** Describe the step-by-step user journey

**Happy Path:**
1. [USER ACTION 1]
2. [SYSTEM RESPONSE 1]
3. [USER ACTION 2]
4. [SYSTEM RESPONSE 2]
5. [SUCCESS STATE]

**Example:**
> **Happy Path: Checkout Equipment**
> 1. Inspector opens "Equipment" page from bottom nav
> 2. System displays list of available equipment, sorted by last calibration
> 3. Inspector taps "Checkout" on blower door testing kit
> 4. System shows confirmation dialog with equipment details
> 5. Inspector confirms, system assigns equipment and shows success toast
> 6. Equipment now appears in "My Equipment" section with return deadline

**Error Paths:**
- **Scenario:** [ERROR CONDITION]
  - **User Impact:** [WHAT GOES WRONG]
  - **System Behavior:** [HOW SYSTEM HANDLES IT]
  - **Recovery Path:** [HOW USER RECOVERS]

**Example:**
> **Error Path: Calibration Expired**
> - **Scenario:** Inspector tries to checkout equipment with expired calibration
> - **User Impact:** Cannot proceed with checkout
> - **System Behavior:** Shows warning modal with expiration date, suggests alternative equipment
> - **Recovery Path:** Inspector selects alternative or contacts admin to recalibrate

---

## 3. Database Schema

### 3.1 Tables

> **TODO:** Define all database tables for this feature

**Table: `[table_name]`**

**Purpose:** [Brief description of what this table stores]

```typescript
// shared/schema.ts

export const [tableName] = pgTable('[table_name]', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // TODO: Add all columns
  [fieldName]: [dataType]('[column_name]').[constraints](),
  
  // Foreign keys
  [foreignKeyId]: text('[foreign_key_column]').references(() => [otherTable].id),
  
  // Metadata (timestamps, soft delete, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete support
});
```

**Example:**
```typescript
// Equipment Checkout table
export const equipmentCheckouts = pgTable('equipment_checkouts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  
  equipmentId: text('equipment_id').references(() => equipment.id).notNull(),
  inspectorId: text('inspector_id').references(() => users.id).notNull(),
  jobId: text('job_id').references(() => jobs.id), // Optional: can checkout for general use
  
  checkedOutAt: timestamp('checked_out_at').defaultNow().notNull(),
  expectedReturnDate: timestamp('expected_return_date').notNull(),
  returnedAt: timestamp('returned_at'), // NULL until returned
  
  condition: text('condition').$type<'good' | 'damaged' | 'needs_calibration'>(),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.2 Indexes

> **TODO:** Define all indexes needed for query performance

```typescript
// Indexes for common query patterns
export const [indexName] = index('[index_name]')
  .on([tableName].[columnName1], [tableName].[columnName2]);
```

**Example:**
```typescript
// Index for finding active checkouts by inspector
export const idxEquipmentCheckoutsInspector = index('idx_equipment_checkouts_inspector')
  .on(equipmentCheckouts.inspectorId, equipmentCheckouts.returnedAt);

// Index for finding checkout history by equipment
export const idxEquipmentCheckoutsEquipment = index('idx_equipment_checkouts_equipment')
  .on(equipmentCheckouts.equipmentId, equipmentCheckouts.checkedOutAt);
```

### 3.3 Relationships

> **TODO:** Document all foreign key relationships and cardinality

**Relationships:**
- `[table1]` → `[table2]`: [one-to-many | many-to-one | many-to-many]
  - **Description:** [RELATIONSHIP EXPLANATION]
  - **Cascading:** [on delete: cascade | set null | restrict]

**Example:**
> **Relationships:**
> - `equipment_checkouts` → `equipment`: many-to-one
>   - Description: Each checkout references one piece of equipment
>   - Cascading: on delete restrict (cannot delete equipment with active checkouts)
> 
> - `equipment_checkouts` → `users`: many-to-one
>   - Description: Each checkout is assigned to one inspector
>   - Cascading: on delete set null (preserve history if user deleted)
> 
> - `equipment_checkouts` → `jobs`: many-to-one (nullable)
>   - Description: Checkout can optionally be associated with a specific job
>   - Cascading: on delete set null

### 3.4 Zod Schemas

> **TODO:** Define Zod schemas for insert and validation

```typescript
// Insert schema (for creating new records)
export const insert[TableName]Schema = createInsertSchema([tableName]).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (for partial updates)
export const update[TableName]Schema = insert[TableName]Schema.partial();

// Select type (inferred from table)
export type Select[TableName] = typeof [tableName].$inferSelect;
export type Insert[TableName] = z.infer<typeof insert[TableName]Schema>;
```

**Example:**
```typescript
// Insert schema for equipment checkout
export const insertEquipmentCheckoutSchema = createInsertSchema(equipmentCheckouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  equipmentId: z.string().uuid(),
  inspectorId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  expectedReturnDate: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export type SelectEquipmentCheckout = typeof equipmentCheckouts.$inferSelect;
export type InsertEquipmentCheckout = z.infer<typeof insertEquipmentCheckoutSchema>;
```

---

## 4. Business Logic

### 4.1 Validation Rules

> **TODO:** Document all business validation rules

**Rule 1: [RULE NAME]**
- **Condition:** [WHEN THIS APPLIES]
- **Validation:** [WHAT TO CHECK]
- **Error:** [ERROR MESSAGE IF FAILS]

**Example:**
> **Rule 1: Equipment Calibration Validation**
> - **Condition:** User attempts to checkout equipment
> - **Validation:** Equipment calibration must not be expired (calibration_expires_at > NOW())
> - **Error:** "Cannot checkout equipment: calibration expired on [DATE]. Please contact admin."
> 
> **Rule 2: Maximum Checkout Duration**
> - **Condition:** User sets expected return date
> - **Validation:** Expected return date cannot be more than 30 days from checkout
> - **Error:** "Checkout period cannot exceed 30 days. Please contact admin for extended checkouts."

### 4.2 Calculations

> **TODO:** Document any calculations or derived values

**Calculation 1: [CALCULATION NAME]**
```typescript
function [calculateSomething]([parameters]): [ReturnType] {
  // TODO: Implement calculation logic
  return [result];
}
```

**Example:**
```typescript
/**
 * Calculate if equipment checkout is overdue
 * @param checkout - Equipment checkout record
 * @returns true if overdue, false otherwise
 */
function isCheckoutOverdue(checkout: SelectEquipmentCheckout): boolean {
  if (checkout.returnedAt) {
    return false; // Already returned
  }
  
  const now = new Date();
  const expectedReturn = new Date(checkout.expectedReturnDate);
  
  return now > expectedReturn;
}
```

### 4.3 Workflows

> **TODO:** Document multi-step business processes

**Workflow: [WORKFLOW NAME]**
1. **Step 1:** [ACTION AND VALIDATION]
2. **Step 2:** [ACTION AND VALIDATION]
3. **Step 3:** [ACTION AND VALIDATION]
4. **Outcome:** [SUCCESS STATE]

**Example:**
> **Workflow: Equipment Checkout Process**
> 1. **Validate Availability:** Check equipment not already checked out (returnedAt IS NULL)
> 2. **Validate Calibration:** Check equipment calibration not expired
> 3. **Validate Inspector:** Ensure inspector is active and certified
> 4. **Create Checkout Record:** Insert into equipment_checkouts table
> 5. **Send Notification:** Email inspector with checkout details and return deadline
> 6. **Audit Log:** Record checkout action in audit log
> 7. **Outcome:** Inspector receives equipment with documented chain of custody

---

## 5. Storage Layer

### 5.1 Interface Definition

> **TODO:** Define storage interface methods

```typescript
// server/storage.ts

interface IStorage {
  // TODO: Add CRUD methods for this feature
  
  // Create
  create[Entity](data: Insert[Entity]): Promise<Select[Entity]>;
  
  // Read
  get[Entity](id: string): Promise<Select[Entity] | null>;
  getAll[Entities](filters?: [FilterType]): Promise<Select[Entity][]>;
  
  // Update
  update[Entity](id: string, data: Partial<Insert[Entity]>): Promise<Select[Entity]>;
  
  // Delete
  delete[Entity](id: string): Promise<void>;
}
```

**Example:**
```typescript
interface IStorage {
  // Equipment Checkout CRUD
  createEquipmentCheckout(data: InsertEquipmentCheckout): Promise<SelectEquipmentCheckout>;
  getEquipmentCheckout(id: string): Promise<SelectEquipmentCheckout | null>;
  getEquipmentCheckoutsByInspector(inspectorId: string, activeOnly?: boolean): Promise<SelectEquipmentCheckout[]>;
  getEquipmentCheckoutsByEquipment(equipmentId: string): Promise<SelectEquipmentCheckout[]>;
  returnEquipmentCheckout(id: string, condition: string, notes?: string): Promise<SelectEquipmentCheckout>;
  deleteEquipmentCheckout(id: string): Promise<void>;
}
```

### 5.2 Implementation

> **TODO:** Implement storage methods with error handling

```typescript
class DatabaseStorage implements IStorage {
  async create[Entity](data: Insert[Entity]): Promise<Select[Entity]> {
    try {
      const [result] = await db.insert([tableName])
        .values(data)
        .returning();
      
      if (!result) {
        throw new Error('[Entity] creation failed');
      }
      
      serverLogger.info('[Storage/create[Entity]] Created [entity]', { id: result.id });
      return result;
    } catch (error) {
      serverLogger.error('[Storage/create[Entity]] Failed to create [entity]', { error, data });
      throw error;
    }
  }
  
  async get[Entity](id: string): Promise<Select[Entity] | null> {
    try {
      const result = await db.query.[tableName].findFirst({
        where: eq([tableName].id, id),
      });
      
      return result || null;
    } catch (error) {
      serverLogger.error('[Storage/get[Entity]] Failed to fetch [entity]', { error, id });
      throw error;
    }
  }
}
```

**Example:**
```typescript
class DatabaseStorage implements IStorage {
  async createEquipmentCheckout(data: InsertEquipmentCheckout): Promise<SelectEquipmentCheckout> {
    try {
      // Validate equipment is available
      const equipment = await this.getEquipment(data.equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }
      
      // Check if equipment already checked out
      const activeCheckout = await db.query.equipmentCheckouts.findFirst({
        where: and(
          eq(equipmentCheckouts.equipmentId, data.equipmentId),
          isNull(equipmentCheckouts.returnedAt)
        ),
      });
      
      if (activeCheckout) {
        throw new Error('Equipment already checked out');
      }
      
      // Create checkout record
      const [checkout] = await db.insert(equipmentCheckouts)
        .values(data)
        .returning();
      
      if (!checkout) {
        throw new Error('Checkout creation failed');
      }
      
      serverLogger.info('[Storage/createEquipmentCheckout] Created checkout', { 
        checkoutId: checkout.id,
        equipmentId: data.equipmentId,
        inspectorId: data.inspectorId,
      });
      
      return checkout;
    } catch (error) {
      serverLogger.error('[Storage/createEquipmentCheckout] Failed', { error, data });
      throw error;
    }
  }
  
  async getEquipmentCheckoutsByInspector(
    inspectorId: string,
    activeOnly: boolean = true
  ): Promise<SelectEquipmentCheckout[]> {
    try {
      const conditions = [eq(equipmentCheckouts.inspectorId, inspectorId)];
      
      if (activeOnly) {
        conditions.push(isNull(equipmentCheckouts.returnedAt));
      }
      
      const results = await db.query.equipmentCheckouts.findMany({
        where: and(...conditions),
        orderBy: desc(equipmentCheckouts.checkedOutAt),
      });
      
      return results;
    } catch (error) {
      serverLogger.error('[Storage/getEquipmentCheckoutsByInspector] Failed', { 
        error, 
        inspectorId 
      });
      throw error;
    }
  }
}
```

---

## 6. API Endpoints

### 6.1 Endpoint Summary

> **TODO:** List all API endpoints for this feature

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST   | `/api/[resource]` | Create new [resource] | Yes | [ALLOWED_ROLES] |
| GET    | `/api/[resource]` | List all [resources] | Yes | [ALLOWED_ROLES] |
| GET    | `/api/[resource]/:id` | Get [resource] by ID | Yes | [ALLOWED_ROLES] |
| PATCH  | `/api/[resource]/:id` | Update [resource] | Yes | [ALLOWED_ROLES] |
| DELETE | `/api/[resource]/:id` | Delete [resource] | Yes | [ALLOWED_ROLES] |

**Example:**
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST   | `/api/equipment/checkouts` | Checkout equipment | Yes | inspector, admin |
| GET    | `/api/equipment/checkouts` | List checkouts (filtered by role) | Yes | inspector, admin |
| GET    | `/api/equipment/checkouts/:id` | Get checkout details | Yes | inspector, admin |
| PATCH  | `/api/equipment/checkouts/:id/return` | Return equipment | Yes | inspector, admin |
| DELETE | `/api/equipment/checkouts/:id` | Cancel checkout (admin only) | Yes | admin |

### 6.2 Detailed Endpoint Specs

> **TODO:** Document each endpoint with request/response examples

**POST `/api/[resource]`**

**Request:**
```typescript
{
  [field1]: [type],
  [field2]: [type],
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  [field1]: [type];
  [field2]: [type];
  createdAt: string;
  updatedAt: string;
}
```

**Errors:**
- `400`: Validation failed
- `401`: Not authenticated
- `403`: Not authorized
- `409`: Resource conflict (e.g., already exists)

**Example:**
```typescript
// POST /api/equipment/checkouts
// Request
{
  "equipmentId": "eq-123",
  "inspectorId": "usr-456",
  "jobId": "job-789", // optional
  "expectedReturnDate": "2025-11-15T17:00:00Z",
  "notes": "For blower door test at 123 Main St"
}

// Response (201 Created)
{
  "id": "checkout-abc",
  "equipmentId": "eq-123",
  "inspectorId": "usr-456",
  "jobId": "job-789",
  "checkedOutAt": "2025-11-01T10:00:00Z",
  "expectedReturnDate": "2025-11-15T17:00:00Z",
  "returnedAt": null,
  "condition": null,
  "notes": "For blower door test at 123 Main St",
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-01T10:00:00Z"
}

// Error (400 Bad Request)
{
  "error": "Validation failed",
  "message": "Equipment calibration expired. Cannot checkout.",
  "details": {
    "calibrationExpiredAt": "2025-10-15T00:00:00Z"
  }
}
```

---

## 7. Frontend Interface

### 7.1 Components

> **TODO:** List all React components for this feature

**Component: `[ComponentName]`**
- **Purpose:** [What this component does]
- **Location:** `client/src/components/[feature]/[ComponentName].tsx`
- **Props:** [List key props]
- **State:** [Key state variables]

**Example:**
> **Component: `EquipmentCheckoutDialog`**
> - **Purpose:** Modal dialog for checking out equipment
> - **Location:** `client/src/components/equipment/EquipmentCheckoutDialog.tsx`
> - **Props:** 
>   - `equipmentId: string` - ID of equipment to checkout
>   - `onSuccess: () => void` - Callback after successful checkout
>   - `onCancel: () => void` - Callback when dialog closed
> - **State:**
>   - `selectedJobId: string | null` - Optional job assignment
>   - `expectedReturnDate: Date` - Return deadline
>   - `notes: string` - Checkout notes

### 7.2 Pages

> **TODO:** List all pages/routes for this feature

**Page: `[PageName]`**
- **Route:** `/[route-path]`
- **Purpose:** [What user does on this page]
- **Components Used:** [List of child components]
- **Permissions:** [Who can access]

**Example:**
> **Page: `EquipmentPage`**
> - **Route:** `/equipment`
> - **Purpose:** View and manage equipment inventory and checkouts
> - **Components Used:**
>   - `EquipmentList` - Grid of available equipment
>   - `MyEquipmentSection` - Inspector's checked-out equipment
>   - `EquipmentCheckoutDialog` - Checkout modal
>   - `EquipmentReturnDialog` - Return modal
> - **Permissions:** inspector, admin

### 7.3 User Flows (Frontend)

> **TODO:** Document the step-by-step UI interaction

**Flow: [FLOW NAME]**
1. User [ACTION] on [PAGE/COMPONENT]
2. System shows [UI FEEDBACK]
3. User [NEXT ACTION]
4. System [RESPONSE AND UI UPDATE]

**Example:**
> **Flow: Checkout Equipment**
> 1. Inspector navigates to `/equipment` page
> 2. System loads and displays available equipment with calibration status
> 3. Inspector taps "Checkout" button on blower door kit
> 4. System opens `EquipmentCheckoutDialog` with equipment details pre-filled
> 5. Inspector selects job (optional) and sets return date
> 6. Inspector taps "Confirm Checkout"
> 7. System validates, creates checkout, shows success toast
> 8. Dialog closes, equipment moves to "My Equipment" section
> 9. Success message: "Blower Door Kit checked out until Nov 15"

---

## 8. Testing Strategy

### 8.1 Unit Tests

> **TODO:** List unit tests to be written

**Test File:** `[feature]/[module].test.ts`

**Tests:**
- [ ] [Test 1: Validation logic]
- [ ] [Test 2: Calculation function]
- [ ] [Test 3: Edge case handling]

**Example:**
```typescript
// server/__tests__/equipmentCheckout.test.ts
describe('Equipment Checkout Business Logic', () => {
  test('prevents checkout of equipment with expired calibration', () => {
    const equipment = { calibrationExpiresAt: '2025-10-01' };
    expect(() => validateEquipmentCheckout(equipment)).toThrow('calibration expired');
  });
  
  test('calculates overdue status correctly', () => {
    const checkout = { 
      expectedReturnDate: '2025-10-01',
      returnedAt: null
    };
    expect(isCheckoutOverdue(checkout)).toBe(true);
  });
});
```

### 8.2 Integration Tests

> **TODO:** List integration tests for API endpoints

**Test File:** `server/__tests__/[feature].test.ts`

**Tests:**
- [ ] POST /api/[resource] - Creates resource successfully
- [ ] POST /api/[resource] - Returns 400 for invalid data
- [ ] POST /api/[resource] - Returns 401 without authentication
- [ ] GET /api/[resource] - Returns filtered results by role

**Example:**
```typescript
// server/__tests__/equipmentCheckouts.test.ts
describe('POST /api/equipment/checkouts', () => {
  test('creates checkout with valid data', async () => {
    const response = await request(app)
      .post('/api/equipment/checkouts')
      .set('Cookie', inspectorSession)
      .send({
        equipmentId: 'eq-123',
        inspectorId: 'usr-456',
        expectedReturnDate: '2025-11-15T17:00:00Z',
      });
    
    expect(response.status).toBe(201);
    expect(response.body.equipmentId).toBe('eq-123');
  });
  
  test('returns 400 for expired calibration', async () => {
    const response = await request(app)
      .post('/api/equipment/checkouts')
      .set('Cookie', inspectorSession)
      .send({
        equipmentId: 'eq-expired', // Equipment with expired calibration
        inspectorId: 'usr-456',
        expectedReturnDate: '2025-11-15T17:00:00Z',
      });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('calibration expired');
  });
});
```

### 8.3 E2E Tests

> **TODO:** List Playwright E2E test scenarios

**Test File:** `tests/[feature].spec.ts`

**Tests:**
- [ ] User can [PRIMARY WORKFLOW]
- [ ] User sees error for [VALIDATION FAILURE]
- [ ] User can [SECONDARY WORKFLOW]

**Example:**
```typescript
// tests/equipmentCheckout.spec.ts
test.describe('Equipment Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/dev-login/test-inspector1');
    await page.goto('/equipment');
  });
  
  test('inspector can checkout equipment', async ({ page }) => {
    // Click checkout on first available equipment
    await page.getByTestId('button-checkout-eq-123').click();
    
    // Fill return date
    await page.getByTestId('input-expected-return-date').fill('2025-11-15');
    
    // Submit
    await page.getByTestId('button-confirm-checkout').click();
    
    // Verify success
    await expect(page.getByText('Equipment checked out')).toBeVisible();
    await expect(page.getByTestId('section-my-equipment')).toContainText('Blower Door Kit');
  });
  
  test('prevents checkout of expired calibration equipment', async ({ page }) => {
    // Try to checkout expired equipment
    await page.getByTestId('button-checkout-eq-expired').click();
    
    // Should show error
    await expect(page.getByText('calibration expired')).toBeVisible();
  });
});
```

### 8.4 Smoke Test

> **TODO:** Create smoke test script

**File:** `scripts/smoke-test-[feature].sh`

See `templates/test-template.sh` for full structure.

**Coverage:**
- Create [resource]
- Get [resource] by ID
- Update [resource]
- List [resources]
- Delete [resource]

---

## 9. Observability

### 9.1 Logging

> **TODO:** Document all log points

**Log Points:**
- `[Feature/Action]` - [WHEN TO LOG] - Level: [INFO|WARN|ERROR]

**Example:**
```typescript
// On checkout creation
serverLogger.info('[EquipmentCheckout/Create]', {
  checkoutId: checkout.id,
  equipmentId: checkout.equipmentId,
  inspectorId: checkout.inspectorId,
  duration: Date.now() - startTime,
});

// On validation failure
serverLogger.warn('[EquipmentCheckout/ValidationFailed]', {
  equipmentId: data.equipmentId,
  reason: 'calibration_expired',
  expirationDate: equipment.calibrationExpiresAt,
});

// On error
serverLogger.error('[EquipmentCheckout/CreateFailed]', {
  error: error.message,
  stack: error.stack,
  equipmentId: data.equipmentId,
});
```

### 9.2 Metrics

> **TODO:** Define key metrics to track

**Metrics:**
- `[feature].[action].count` - [DESCRIPTION]
- `[feature].[action].duration` - [DESCRIPTION]
- `[feature].[action].errors` - [DESCRIPTION]

**Example:**
- `equipment_checkout.created.count` - Total checkouts created
- `equipment_checkout.overdue.count` - Number of overdue checkouts
- `equipment_checkout.duration` - Time from checkout to return
- `equipment_checkout.validation_errors` - Failed checkout attempts

### 9.3 Alerts

> **TODO:** Define alerting rules

**Alert: [ALERT NAME]**
- **Condition:** [WHEN TO TRIGGER]
- **Severity:** [critical | warning | info]
- **Action:** [WHAT TO DO]

**Example:**
> **Alert: High Overdue Checkouts**
> - **Condition:** More than 20% of checkouts are overdue
> - **Severity:** warning
> - **Action:** Notify equipment manager, review checkout policies
> 
> **Alert: Equipment Checkout Failures**
> - **Condition:** More than 10 failed checkout attempts in 5 minutes
> - **Severity:** critical
> - **Action:** Check database connectivity, verify equipment data integrity

---

## 10. Operational Procedures

### 10.1 Deployment

> **TODO:** Document deployment steps

**Pre-Deployment Checklist:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Performance benchmarks met

**Deployment Steps:**
1. [STEP 1]
2. [STEP 2]
3. [STEP 3]

**Post-Deployment Verification:**
- [ ] Smoke test passes
- [ ] No increase in error rate
- [ ] Performance metrics stable

### 10.2 Rollback

> **TODO:** Document rollback procedure

**When to Rollback:**
- Error rate > 5%
- Critical functionality broken
- Data corruption detected

**Rollback Steps:**
1. [STEP 1]
2. [STEP 2]
3. [STEP 3]

### 10.3 Troubleshooting

> **TODO:** Document common issues and solutions

**Issue: [PROBLEM DESCRIPTION]**
- **Symptoms:** [WHAT USERS SEE]
- **Root Cause:** [WHY IT HAPPENS]
- **Solution:** [HOW TO FIX]
- **Prevention:** [HOW TO AVOID]

**Example:**
> **Issue: Equipment appears available but checkout fails**
> - **Symptoms:** User sees equipment in available list, but gets "already checked out" error
> - **Root Cause:** Caching issue or race condition in availability check
> - **Solution:** Clear query cache, verify database has no active checkout record
> - **Prevention:** Add transaction isolation, implement optimistic locking

---

## 11. Performance Considerations

### 11.1 Query Optimization

> **TODO:** Document query patterns and optimizations

**Query:** [QUERY DESCRIPTION]
- **Pattern:** [SQL/ORM QUERY]
- **Index Used:** [INDEX NAME]
- **Benchmark:** [p95 LATENCY]

**Example:**
```typescript
// Get active checkouts for inspector (optimized)
// Index: idx_equipment_checkouts_inspector (inspectorId, returnedAt)
const checkouts = await db.query.equipmentCheckouts.findMany({
  where: and(
    eq(equipmentCheckouts.inspectorId, inspectorId),
    isNull(equipmentCheckouts.returnedAt)
  ),
  orderBy: desc(equipmentCheckouts.checkedOutAt),
});

// Benchmark: p95 = 12ms (target: <50ms) ✅
```

### 11.2 Caching Strategy

> **TODO:** Define what to cache and invalidation rules

**Cache:** [CACHE KEY]
- **Data:** [WHAT TO CACHE]
- **TTL:** [TIME TO LIVE]
- **Invalidation:** [WHEN TO CLEAR]

**Example:**
> **Cache:** `equipment:available`
> - **Data:** List of equipment not currently checked out
> - **TTL:** 5 minutes
> - **Invalidation:** On equipment checkout, on equipment return

### 11.3 Performance Budgets

> **TODO:** Define performance targets

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| API p95 latency | <200ms | [TBD] | - |
| Database query p95 | <50ms | [TBD] | - |
| Page load time | <2s | [TBD] | - |
| Bundle size | +50KB | [TBD] | - |

---

## 12. Security Considerations

### 12.1 Authentication

> **TODO:** Document authentication requirements

- All endpoints require authentication via session cookie
- Unauthenticated requests return 401

### 12.2 Authorization

> **TODO:** Document role-based access control

**Role Permissions:**
- **Inspector:** Can checkout/return own equipment, view own checkout history
- **Admin:** Can checkout/return any equipment, view all checkouts, cancel checkouts

**Example:**
```typescript
// Authorization middleware
router.post('/api/equipment/checkouts', requireAuth, async (req, res) => {
  // Inspectors can only checkout for themselves
  if (req.user.role === 'inspector' && req.body.inspectorId !== req.user.id) {
    return res.status(403).json({ 
      error: 'Cannot checkout equipment for other inspectors'
    });
  }
  
  // Continue with checkout...
});
```

### 12.3 Data Privacy

> **TODO:** Document sensitive data handling

**Sensitive Fields:**
- [FIELD NAME]: [WHY SENSITIVE] - [PROTECTION MECHANISM]

**Example:**
> **Sensitive Fields:**
> - `notes`: May contain job details - Accessible only to inspector and admin
> - `inspectorId`: PII - Redacted in public-facing reports

---

## 13. Future Enhancements

> **TODO:** List potential improvements not in current scope

**Priority: High**
- [ ] [ENHANCEMENT 1]
- [ ] [ENHANCEMENT 2]

**Priority: Medium**
- [ ] [ENHANCEMENT 3]
- [ ] [ENHANCEMENT 4]

**Priority: Low**
- [ ] [ENHANCEMENT 5]
- [ ] [ENHANCEMENT 6]

**Example:**
> **Priority: High**
> - [ ] Push notifications when equipment return deadline approaching
> - [ ] Automated reminders for overdue checkouts
> 
> **Priority: Medium**
> - [ ] Equipment maintenance scheduling integration
> - [ ] QR code scanning for quick checkout
> - [ ] Batch checkout for multiple items
> 
> **Priority: Low**
> - [ ] GPS tracking integration for equipment location
> - [ ] Predictive maintenance based on usage patterns
> - [ ] Equipment reservation system

---

## Appendix

### A. Related Documents
- [PRODUCTION_STANDARDS.md](../PRODUCTION_STANDARDS.md)
- [TESTING_STANDARDS.md](../TESTING_STANDARDS.md)
- [OBSERVABILITY_STANDARDS.md](../OBSERVABILITY_STANDARDS.md)

### B. Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| YYYY-MM-DD | 1.0.0 | [NAME] | Initial draft |

### C. Review Checklist

Before marking this runbook as complete:
- [ ] All sections filled out (no [PLACEHOLDER] text remaining)
- [ ] Code examples tested and working
- [ ] Compliance checklist completed (see COMPLIANCE_TEMPLATE.md)
- [ ] Reviewed by at least one other engineer
- [ ] Approved by feature owner
