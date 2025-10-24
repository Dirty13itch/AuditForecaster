# Permissions Matrix

## Roles

### Admin
- Full system access
- Manage all users, jobs, builders, photos, reports
- View audit logs
- Configure system settings
- Manage email preferences for all users

### Inspector
- Create/edit/delete OWN jobs only
- Upload/delete OWN photos only
- Create/edit builders
- Generate reports for OWN jobs
- View OWN schedule events
- View dashboard (own metrics only)

### Manager
- View all jobs, photos, builders (read-only)
- View all analytics and reports
- View audit logs
- Cannot create/edit/delete data
- Can export data to CSV

### Viewer
- View jobs (read-only)
- View builders (read-only)
- View basic dashboard metrics
- Cannot access photos, reports, or sensitive data
- Cannot make any modifications

## Permission Checks

| Operation | Admin | Inspector | Manager | Viewer |
|-----------|-------|-----------|---------|--------|
| View All Jobs | ✅ | ❌ Own only | ✅ | ✅ |
| Create Job | ✅ | ✅ | ❌ | ❌ |
| Edit Job | ✅ | ✅ Own only | ❌ | ❌ |
| Delete Job | ✅ | ✅ Own only | ❌ | ❌ |
| View All Photos | ✅ | ❌ Own only | ✅ | ❌ |
| Upload Photo | ✅ | ✅ | ❌ | ❌ |
| Delete Photo | ✅ | ✅ Own only | ❌ | ❌ |
| Manage Builders | ✅ | ✅ | ❌ | ❌ |
| Generate Reports | ✅ | ✅ Own jobs | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| View Schedule | ✅ | ✅ Own events | ✅ | ✅ |
| Create Schedule Event | ✅ | ✅ | ❌ | ❌ |
| View Financials | ✅ | ✅ Own jobs | ✅ | ❌ |
| Manage Expenses | ✅ | ✅ Own jobs | ❌ | ❌ |
| View Analytics | ✅ | ✅ Own metrics | ✅ | ❌ |
| Export Data | ✅ | ✅ Own data | ✅ | ❌ |

## Implementation Details

### Resource Ownership
- Jobs are owned by the user who created them (tracked via `createdBy` field)
- Photos inherit ownership from their associated job
- Schedule events inherit ownership from their associated job
- Expenses and mileage logs inherit ownership from their associated job
- Reports inherit ownership from their associated job

### Permission Hierarchy
1. **Admin** - Highest level, unrestricted access
2. **Manager** - Read-only access to all data, can export
3. **Inspector** - Full CRUD on own resources, read access to shared resources
4. **Viewer** - Limited read-only access, no sensitive data

### API Endpoint Protection
All API endpoints are protected with:
1. Authentication check (`isAuthenticated` middleware)
2. Role-based access control (`requireRole` middleware)
3. Resource ownership validation (for inspector-level users)

### Frontend Permission Checks
UI elements are conditionally rendered/disabled based on:
1. User's role (from authenticated user context)
2. Resource ownership (comparing createdBy with current user ID)
3. Action type (create, edit, delete, view)
