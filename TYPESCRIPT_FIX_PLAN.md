# TypeScript Error Fix Plan - AuditForecaster

**Generated:** November 7, 2025  
**Total Errors:** 2,290 across 169 files  
**Priority:** High-impact fixes first

---

## Phase 1: Schema Foundation (CRITICAL - blocks everything)

### 1.1 Export Missing Schema Types (`shared/schema.ts`)
**Impact:** Fixes ~20 import errors across server files  
**Effort:** 10 minutes

**Required additions near end of file (after line 2790):**
```typescript
// Export Drizzle table schemas that are imported by services
export { webauthnCredentials, webauthnChallenges, auditLogs };

// Export insert types for services
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertWebAuthnCredential = typeof webauthnCredentials.$inferInsert;
export type InsertWebAuthnChallenge = typeof webauthnChallenges.$inferInsert;
```

**Files affected:**
- `server/webauthnService.ts` (6 errors)
- `server/auditLogger.ts` (11 errors)
- Any other services importing these

---

## Phase 2: Storage Interface Alignment (HIGH - 208 errors)

### 2.1 Fix `server/storage.ts` Type Mismatches
**Impact:** 197 errors in storage.ts alone  
**Effort:** 2-3 hours

**Root cause:** Drizzle schema defines numeric fields as `string` (decimal/numeric types) but code treats them as `number`.

#### Critical fields to fix in `shared/schema.ts`:

```typescript
// Current (incorrect):
totalScore: decimal("total_score").notNull()  // Returns string
maxScore: decimal("max_score").notNull()      // Returns string
ach50: decimal("ach50", { precision: 5, scale: 2 })  // Returns string
cost: decimal("cost", { precision: 10, scale: 2 })   // Returns string

// Should be:
totalScore: real("total_score").notNull()     // Returns number
maxScore: real("max_score").notNull()         // Returns number
ach50: real("ach50").notNull()                // Returns number
cost: real("cost")                             // Returns number
```

**Migration required:** Create a new migration to ALTER COLUMN types from NUMERIC to REAL.

**Alternative (no migration):** Update all usage sites to:
```typescript
// Parse strings to numbers
const score = parseFloat(record.totalScore);
// Or use coercion in Zod schemas
totalScore: z.coerce.number()
```

**Tables affected:**
- `qaInspectionScores` (totalScore, maxScore, percentage)
- `blowerDoorTests` (ach50, cfm50, ach50Baseline)
- `equipmentMaintenance` (cost)
- `qaPerformanceMetrics` (avgScore, onTimeRate, firstPassRate, customerSatisfaction)
- `invoices` (subtotal, tax, total) - may need string for money precision

---

### 2.2 Add Missing IStorage Methods (`server/storage.ts`)
**Impact:** ~11 interface compliance errors  
**Effort:** 1 hour

**Missing methods in DatabaseStorage class:**
```typescript
// Add these to DatabaseStorage class:
async reviewQaInspectionScore(scoreId: string, reviewStatus: string, reviewNotes?: string): Promise<void> {
  // Implementation
}

async getActiveQaChecklists(): Promise<QaChecklist[]> {
  // Implementation
}

async toggleQaChecklistActive(id: string, active: boolean): Promise<void> {
  // Implementation
}

async getCriticalQaChecklistItems(checklistId: string): Promise<QaChecklistItem[]> {
  // Implementation
}

// ... 7 more methods
```

**Alternative:** Remove unused methods from IStorage interface if not needed.

---

## Phase 3: Audit Logger Refactor (MEDIUM - ~30 errors)

### 3.1 Standardize `createAuditLog` Calls
**Impact:** 25+ call sites across server/  
**Effort:** 30 minutes

**Current signature:**
```typescript
createAuditLog(req: Request, data: AuditLogData, storage: IStorage, config?: AuditConfig)
```

**Problem:** Many call sites use old signature: `createAuditLog({ userId, action, ... })`

**Fix options:**

**Option A - Update all call sites (recommended):**
```typescript
// Find all occurrences of:
await createAuditLog({
  userId: ...,
  action: ...,
  // ...
});

// Replace with:
await createAuditLog(
  req,
  {
    userId: ...,
    action: ...,
    // ...
  },
  storage
);
```

**Option B - Add backward-compatible overload:**
```typescript
// In auditLogger.ts, add:
export async function createAuditLog(
  reqOrData: Request | AuditLogData,
  dataOrStorage?: AuditLogData | IStorage,
  storageOrConfig?: IStorage | AuditConfig,
  config?: AuditConfig
) {
  // Detect which signature was used and normalize
  if ('userId' in reqOrData) {
    // Old signature: createAuditLog(data)
    const data = reqOrData;
    // Need to get storage from somewhere...
    throw new Error('Old signature no longer supported');
  } else {
    // New signature
    const req = reqOrData;
    const data = dataOrStorage as AuditLogData;
    const storage = storageOrConfig as IStorage;
    // ... existing implementation
  }
}
```

**Files affected:**
- `server/auth.ts` (9 errors)
- `server/routes.ts` (multiple)
- `server/jobService.ts` (5 errors)
- `server/complianceService.ts` (25 errors)
- `server/webauthnService.ts` (already fixed)

---

## Phase 4: Server Routes Cleanup (HIGH - 889 errors!)

### 4.1 `server/routes.ts` - Massive Error Count
**Impact:** 889 errors in single file  
**Effort:** 4-6 hours

**Common patterns:**

#### Pattern 1: Type assertions for req.user
```typescript
// Current (error):
const userId = req.user.id;

// Fix:
const userId = req.user?.id;
if (!userId) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

#### Pattern 2: Array access on QueryResult
```typescript
// Current (error):
return result.length > 0;

// Fix (result is already array):
return result.length > 0;  // Should work if result is typed correctly

// Or if result is QueryResult:
return result.rows?.length > 0;
```

#### Pattern 3: Enum type mismatches
```typescript
// Current (error):
eq(users.role, role)  // role is string, users.role expects enum

// Fix:
if (['admin', 'inspector', 'partner_contractor'].includes(role)) {
  eq(users.role, role as 'admin' | 'inspector' | 'partner_contractor')
}
```

**Recommendation:** Split `routes.ts` into smaller route modules:
- `routes/users.ts`
- `routes/jobs.ts`
- `routes/builders.ts`
- `routes/qa.ts`
- etc.

---

## Phase 5: Client-Side Fixes (MEDIUM - ~470 errors)

### 5.1 Component Prop Type Issues
**Impact:** ~200 errors across components  
**Effort:** 2-3 hours

**Common patterns:**

#### Missing optional properties:
```typescript
// Error: Property 'captureType' does not exist
photo.captureType

// Fix in schema or add optional chaining:
photo.captureType ?? 'manual'
```

#### Type imports from wrong module:
```typescript
// Current (error):
import { SelectUser } from '@shared/schema';

// Fix:
import type { User } from '@shared/schema';
```

### 5.2 Hook and Context Type Issues
**Impact:** ~50 errors  
**Effort:** 1 hour

**Files:**
- `client/src/hooks/useWebAuthn.ts` (14 errors)
- `client/src/contexts/NotificationContext.tsx` (6 errors)
- `client/src/hooks/useHapticFeedback.ts` (6 errors)

**Common fix:** Add proper return types to hook functions:
```typescript
// Current:
export function useMyHook() {
  return { value, setValue };
}

// Fix:
export function useMyHook(): { value: string; setValue: (v: string) => void } {
  return { value, setValue };
}
```

---

## Phase 6: Shared Module Fixes (LOW - ~10 errors)

### 6.1 `shared/navigation.ts`
**Impact:** 2 errors  
**Effort:** 5 minutes

```typescript
// Error: Expected 0 type arguments, but got 2
const grouped = new Map<string, RouteMetadata[]>();

// Fix: Import Map type or use:
const grouped: Map<string, RouteMetadata[]> = new Map();
```

### 6.2 `shared/calendarVisualSystem.ts`
**Impact:** 4 errors  
**Effort:** 10 minutes

```typescript
// Error: Property 'checkmark' does not exist
completionStatus.checkmark

// Fix: Add optional chaining or ensure type has property:
completionStatus?.checkmark ?? false
```

---

## Execution Priority

### **Week 1 - Core Functionality (Blocks deploys)**
1. ✅ Phase 1.1: Export missing schema types (10 min)
2. ✅ Phase 3.1: Fix createAuditLog calls (30 min)
3. ✅ Phase 2.1: Decide string vs number for decimals (2 hours planning + implementation)

### **Week 2 - Server Stability**
4. ✅ Phase 2.2: Add missing IStorage methods (1 hour)
5. ✅ Phase 4.1: Clean up routes.ts (6 hours)

### **Week 3 - Client Polish**
6. ✅ Phase 5.1: Fix component prop types (3 hours)
7. ✅ Phase 5.2: Fix hook types (1 hour)
8. ✅ Phase 6: Shared module cleanup (15 min)

---

## Quick Wins (Do These First)

### 1. Missing Schema Exports (2 minutes)
Add to `shared/schema.ts` end:
```typescript
export { webauthnCredentials, webauthnChallenges, auditLogs };
export type InsertAuditLog = typeof auditLogs.$inferInsert;
```

### 2. Session Type Fix (Already done ✅)
`server/types.ts` - session type to `any`

### 3. SQL Import (Already done ✅)
`server/webauthnService.ts` - import { sql } from 'drizzle-orm'

### 4. Enum Type Guards
Add to `shared/types.ts`:
```typescript
export function isValidUserRole(role: string): role is UserRole {
  return ['admin', 'inspector', 'partner_contractor', 'viewer', 'manager'].includes(role);
}

export function isValidInspectionType(type: string): type is InspectionType {
  return ['energy_star', 'hers_blower_door', /* etc */].includes(type);
}
```

---

## Testing Strategy

After each phase:
```bash
# Typecheck
NODE_OPTIONS=--max-old-space-size=4096 npm run check

# Build (incremental)
npm run build

# Unit tests
npm run test:unit

# E2E (after server stable)
npm run test:e2e
```

---

## Migration Strategy for Decimal → Real

If choosing to fix numeric types in schema:

1. **Create migration:**
```sql
-- migrations/YYYYMMDD_fix_numeric_types.sql
ALTER TABLE qa_inspection_scores 
  ALTER COLUMN total_score TYPE REAL USING total_score::REAL,
  ALTER COLUMN max_score TYPE REAL USING max_score::REAL,
  ALTER COLUMN percentage TYPE REAL USING percentage::REAL;

ALTER TABLE blower_door_tests
  ALTER COLUMN ach50 TYPE REAL USING ach50::REAL,
  ALTER COLUMN cfm50 TYPE REAL USING cfm50::REAL;

-- Repeat for all affected tables
```

2. **Update schema.ts:**
```typescript
// Before:
totalScore: decimal("total_score").notNull(),

// After:
totalScore: real("total_score").notNull(),
```

3. **Test data integrity:**
```sql
-- Verify no data loss
SELECT COUNT(*) FROM qa_inspection_scores WHERE total_score IS NULL;
```

---

## Automated Fix Opportunities

### ESLint/Prettier
Already configured ✅

### TypeScript Strict Mode
Currently enabled ✅

### Codemod Scripts
Consider creating for:
- Mass import updates (SelectUser → User)
- createAuditLog signature updates
- Optional chaining additions

Example codemod with jscodeshift:
```javascript
// transform-audit-log-calls.js
module.exports = function(file, api) {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.CallExpression, { callee: { name: 'createAuditLog' } })
    .replaceWith(path => {
      // Transform old signature to new
    })
    .toSource();
};
```

---

## Questions for Team

1. **Decimal vs Real:** Do we need precise decimal arithmetic for money fields, or is float acceptable?
2. **IStorage interface:** Are all methods actively used, or can we prune the interface?
3. **Route splitting:** Should we refactor routes.ts now or after fixing types?
4. **Migration downtime:** When can we run schema migrations in production?

---

## Success Metrics

- [ ] Zero TypeScript errors (`npm run check` passes)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] Unit tests green (`npm run test:unit` passes)
- [ ] E2E tests green (`npm run test:e2e` passes)
- [ ] No runtime type errors in dev server logs

---

**Last Updated:** November 7, 2025  
**Next Review:** After Phase 1 completion
