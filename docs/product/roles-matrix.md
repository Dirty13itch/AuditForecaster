# Roles & Permissions Matrix

**Last Updated**: November 2, 2025  
**Purpose**: Define CRUD + export + view-PII permissions for all roles across all entities  
**Enforcement**: API middleware + UI guards + Unit tests

---

## Role Definitions

### 1. Inspector
**Description**: Field inspector conducting energy audits  
**Primary Use Case**: Daily field work, job completion, photo documentation  
**Access Level**: Own jobs and related data

### 2. Lead (Inspector Lead)
**Description**: Senior inspector with team oversight  
**Primary Use Case**: All Inspector capabilities + view team performance, assign jobs  
**Access Level**: Own jobs + team jobs + limited admin functions

### 3. BuilderViewer (Partner)
**Description**: Builder/contractor partner accessing their data  
**Primary Use Case**: View jobs, reports, invoices for their organization  
**Access Level**: Read-only access to their builder's data

### 4. Admin
**Description**: System administrator with full control  
**Primary Use Case**: System configuration, user management, all data access  
**Access Level**: Full CRUD across all entities

---

## Permission Matrix

### Legend
- ✅ = Allowed
- ❌ = Denied
- 🔒 = Own records only
- 👁️ = Read-only

### Core Entities

#### Users
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ❌ | 👁️ (team) | ❌ | ✅ |
| Read (Own) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Update (Own) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Update (Others) | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ❌ | ❌ | ✅ |
| View PII | 🔒 | 🔒 (team) | ❌ | ✅ |

**PII Fields**: email, phone, address, SSN (none currently stored)

---

#### Builders
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: taxId, billingAddress, primaryContactEmail, primaryContactPhone

**Notes**:
- Inspectors can view builder names/basic info for job context
- BuilderViewers can only see their own builder entity
- Export includes builder contacts and agreements

---

#### BuilderContacts
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: email, phone, mobilePhone

---

#### ConstructionManagers
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: email, phone

**Notes**:
- Inspectors need to see construction manager contacts for report delivery
- BuilderViewers can see construction managers for their builder

---

#### Developments
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None (development addresses are public)

---

#### Lots
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None (lot addresses are public)

---

#### Plans
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

---

#### Jobs
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ✅ | ❌ | ✅ |
| Read (List) | 🔒 ✅ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | 🔒 ✅ | ✅ | 🔒 ✅ | ✅ |
| Update (Status) | 🔒 ✅ | ✅ | ❌ | ✅ |
| Update (Other) | ❌ | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | 🔒 ✅ | ✅ | 🔒 ✅ | ✅ |
| View PII | 🔒 ✅ | ✅ | ❌ | ✅ |

**PII Fields**: homeownerName, homeownerEmail, homeownerPhone (if stored)

**Notes**:
- Inspectors can only see jobs assigned to them
- Inspectors can update status (done/failed/reschedule) but not other fields
- BuilderViewers can see jobs for their builder only
- Lead can create jobs and assign to inspectors

---

#### ChecklistItems
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Update | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Access controlled by parent job permissions
- Inspectors can complete/update checklist items for their jobs

---

#### Photos
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Read (List) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Update (Tags) | 🔒 ✅ | ✅ | ❌ | ✅ |
| Update (Other) | ❌ | ✅ | ❌ | ✅ |
| Delete | 🔒 ✅ | ✅ | ❌ | ✅ |
| Export | 🔒 ✅ | ✅ | 🔒 ✅ (via job) | ✅ |
| View PII | 🔒 ✅ | ✅ | ❌ | ✅ |

**PII Fields**: GPS coordinates, EXIF metadata (device info)

**Notes**:
- Access controlled by parent job permissions
- Inspectors can upload, tag, and delete their own photos
- BuilderViewers can view photos for their builder's jobs (read-only)

---

#### Equipment
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | ❌ | ✅ |
| Read (Detail) | ✅ | ✅ | ❌ | ✅ |
| Update (Checkout) | ✅ | ✅ | ❌ | ✅ |
| Update (Other) | ❌ | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Inspectors can check out/in equipment
- Lead can manage calibration records

---

#### ReportTemplates
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | ❌ | ✅ |
| Read (Detail) | ✅ | ✅ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ❌ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Inspectors can view templates to fill out reports
- Only admins can modify report templates

---

#### ReportInstances
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Read (List) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Update | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export (PDF) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| View PII | 🔒 ✅ | ✅ | ❌ | ✅ |

**PII Fields**: May contain homeowner info if included in report

**Notes**:
- Access controlled by parent job permissions
- Inspectors can create and fill out reports for their jobs
- BuilderViewers can view/export reports for their builder's jobs

---

#### BlowerDoorTests, DuctLeakageTests, VentilationTests
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Read (List) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Update | 🔒 ✅ (via job) | ✅ | ❌ | ✅ |
| Delete | ❌ | ✅ | ❌ | ✅ |
| Export | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Access controlled by parent job permissions
- Test results visible to builder for compliance

---

#### Forecasts (TDL/DLO Predictions)
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ✅ | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | ✅ | ✅ | 🔒 ✅ (via job) | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

---

#### ComplianceHistory
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ (automated) |
| Read (List) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Read (Detail) | 🔒 ✅ (via job) | ✅ | 🔒 ✅ (via job) | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | 🔒 ✅ (via job) | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Compliance evaluations are automated
- BuilderViewers can see compliance status for their jobs

---

#### QAItems
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ✅ | ❌ | ✅ |
| Read (List) | 🔒 ✅ (assigned) | ✅ | ❌ | ✅ |
| Read (Detail) | 🔒 ✅ (assigned) | ✅ | ❌ | ✅ |
| Update (Status) | 🔒 ✅ (assigned) | ✅ | ❌ | ✅ |
| Update (Other) | ❌ | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Inspectors can view and resolve QA items assigned to them
- Lead can create and assign QA items

---

#### Expenses
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Read (List) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Update | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Delete | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Export | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| View PII | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |

**PII Fields**: Merchant names, receipt images

**Notes**:
- All roles can manage their own expenses
- BuilderViewers use this for partner contractor expense tracking

---

#### MileageLogs
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Read (List) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Update | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Delete | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| Export | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |
| View PII | 🔒 ✅ | 🔒 ✅ | 🔒 ✅ | ✅ |

**PII Fields**: GPS route points, home/work addresses

**Notes**:
- All roles can track their own mileage
- GPS route points considered PII (location tracking)

---

#### Invoices
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ❌ | ❌ | 🔒 ✅ | ✅ |
| Read (Detail) | ❌ | ❌ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export (PDF) | ❌ | ❌ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: Builder billing address, tax ID

**Notes**:
- BuilderViewers can view and export invoices for their builder
- Invoices generated monthly by admin

---

#### Payments
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ❌ | ❌ | 🔒 ✅ | ✅ |
| Read (Detail) | ❌ | ❌ | 🔒 ✅ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ❌ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: Payment method details, check numbers

**Notes**:
- BuilderViewers can view payment history for their builder
- Payment entry restricted to admin

---

#### TaxCreditProjects (45L)
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | ❌ | ✅ | 🔒 ✅ | ✅ |
| Read (Detail) | ❌ | ✅ | 🔒 ✅ | ✅ |
| Update (Status) | ❌ | ✅ | 🔒 ✅ (sign-off) | ✅ |
| Update (Other) | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ✅ | 🔒 ✅ | ✅ |
| View PII | ❌ | ❌ | 🔒 ✅ | ✅ |

**PII Fields**: Builder tax information

**Notes**:
- BuilderViewers can view projects and sign off on status
- Lead can manage 45L projects for builders

---

#### AuditLogs
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ (automated) |
| Read (List) | ❌ | ❌ | ❌ | ✅ |
| Read (Detail) | ❌ | ❌ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ❌ (immutable) |
| Delete | ❌ | ❌ | ❌ | ❌ (immutable) |
| Export | ❌ | ❌ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: User IDs, IP addresses

**Notes**:
- Audit logs are immutable
- Only admins can view audit trail

---

#### Achievements (Gamification)
| Action | Inspector | Lead | BuilderViewer | Admin |
|--------|-----------|------|---------------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (List) | 🔒 ✅ | 🔒 ✅ | ❌ | ✅ |
| Read (Detail) | 🔒 ✅ | 🔒 ✅ | ❌ | ✅ |
| Update | ❌ | ❌ | ❌ | ✅ (automated) |
| Delete | ❌ | ❌ | ❌ | ✅ |
| Export | ❌ | ❌ | ❌ | ✅ |
| View PII | ❌ | ❌ | ❌ | ✅ |

**PII Fields**: None

**Notes**:
- Inspectors can view their own achievements
- Achievement unlocks are automated

---

## Enforcement Mechanisms

### 1. API Middleware

**Location**: `server/middleware/authorization.ts`

```typescript
// Role check middleware
export function requireRole(allowedRoles: Role | Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        correlationId: req.correlationId
      });
    }
    next();
  };
}

// Resource ownership check
export function requireOwnership(entityGetter: (req) => Promise<Entity>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const entity = await entityGetter(req);
    
    if (req.user?.role === 'admin') {
      return next(); // Admins bypass ownership checks
    }
    
    if (entity.userId !== req.user?.id) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not own this resource',
        correlationId: req.correlationId
      });
    }
    next();
  };
}
```

**Usage Example**:
```typescript
// Admin-only route
router.post('/api/builders', requireRole('admin'), createBuilder);

// Inspector can only update their own jobs
router.patch('/api/jobs/:id', requireRole('inspector'), requireOwnership(getJob), updateJob);

// BuilderViewer can view their builder's jobs
router.get('/api/jobs', requireRole(['inspector', 'admin', 'builderViewer']), filterByBuilder, listJobs);
```

### 2. UI Guards

**Location**: `client/src/hooks/usePermissions.ts`

```typescript
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    canCreate: (entity: EntityType) => {
      // Check create permissions based on role
    },
    canRead: (entity: Entity) => {
      // Check read permissions with ownership
    },
    canUpdate: (entity: Entity) => {
      // Check update permissions with ownership
    },
    canDelete: (entity: Entity) => {
      // Check delete permissions
    },
    canExport: (entity: EntityType) => {
      // Check export permissions
    },
    canViewPII: (entity: Entity) => {
      // Check PII viewing permissions
    }
  };
}
```

**Usage Example**:
```typescript
function JobDetailPage() {
  const permissions = usePermissions();
  const { data: job } = useQuery({ queryKey: ['/api/jobs', jobId] });
  
  return (
    <div>
      <h1>{job.name}</h1>
      {permissions.canUpdate(job) && (
        <Button onClick={handleEdit}>Edit</Button>
      )}
      {permissions.canDelete(job) && (
        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
      )}
    </div>
  );
}
```

### 3. Unit Tests

**Location**: `server/__tests__/permissions.test.ts`

```typescript
describe('Job Permissions', () => {
  describe('Inspector Role', () => {
    it('can read own jobs', async () => {
      const inspector = await createInspector();
      const job = await createJob({ inspectorId: inspector.id });
      
      const response = await request(app)
        .get(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${inspector.token}`);
      
      expect(response.status).toBe(200);
    });
    
    it('cannot read other inspector jobs', async () => {
      const inspector1 = await createInspector();
      const inspector2 = await createInspector();
      const job = await createJob({ inspectorId: inspector2.id });
      
      const response = await request(app)
        .get(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${inspector1.token}`);
      
      expect(response.status).toBe(403);
    });
    
    it('can update job status', async () => {
      const inspector = await createInspector();
      const job = await createJob({ inspectorId: inspector.id });
      
      const response = await request(app)
        .patch(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${inspector.token}`)
        .send({ status: 'done' });
      
      expect(response.status).toBe(200);
    });
    
    it('cannot update job builder', async () => {
      const inspector = await createInspector();
      const job = await createJob({ inspectorId: inspector.id });
      
      const response = await request(app)
        .patch(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${inspector.token}`)
        .send({ builderId: 'different-builder' });
      
      expect(response.status).toBe(403);
    });
  });
  
  // Repeat for Lead, BuilderViewer, Admin roles
});
```

---

## Implementation Status

### Completed ✅
- Basic role checks (`requireRole` middleware)
- Admin triple-layer protection
- Session-based authentication
- Audit logging for mutations

### In Progress 🚧
- Resource ownership checks
- UI permission guards
- PII field masking

### Not Started ❌
- Unit tests for all permission combinations
- Fine-grained field-level permissions
- Export permission enforcement
- Permission documentation in API

---

## Testing Requirements

### Unit Test Coverage Target: 100%

Each role × entity combination must have:
- ✅ Create permission test
- ✅ Read (list) permission test
- ✅ Read (detail) permission test
- ✅ Update permission test
- ✅ Delete permission test
- ✅ Export permission test
- ✅ View PII permission test

**Estimated Tests**: 4 roles × 25 entities × 7 actions = ~700 tests

### Test Organization

```
server/__tests__/permissions/
  ├── inspector/
  │   ├── jobs.test.ts
  │   ├── photos.test.ts
  │   └── ...
  ├── lead/
  │   ├── jobs.test.ts
  │   ├── qaitems.test.ts
  │   └── ...
  ├── builderviewer/
  │   ├── jobs.test.ts
  │   ├── reports.test.ts
  │   └── ...
  └── admin/
      └── all-entities.test.ts
```

---

## Future Enhancements

### 1. Row-Level Security (RLS)
Implement database-level security policies for defense in depth.

### 2. Audit Trail Integration
Log all permission checks (granted/denied) for security monitoring.

### 3. Permission Analytics
Track which permissions are most frequently used/denied to inform UX improvements.

### 4. Dynamic Permissions
Allow admins to configure custom permission sets beyond the 4 core roles.

### 5. Multi-Tenant Permissions
Add organization-level permission boundaries when multi-tenancy is enabled.

---

**Document Version**: 1.0  
**Next Review**: December 1, 2025  
**Maintained By**: Product Engineering Team
