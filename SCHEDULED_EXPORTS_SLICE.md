# Scheduled Exports - Vertical Slice

## Overview

Complete vertical slice implementing automated scheduled data exports with email delivery for business intelligence and reporting.

**User Story**: As an operations manager, I can schedule recurring data exports (jobs, financial, equipment, QA scores, analytics, photos) to be automatically generated and emailed to stakeholders at specified intervals (daily, weekly, monthly) so that I can ensure timely distribution of business-critical reports without manual intervention.

**Status**: ✅ Production Ready (October 2025)

**Key Features**:
- 6 data types: Jobs, Financial, Equipment, QA Scores, Analytics, Photos
- 4 export formats: CSV, XLSX, PDF, JSON
- 3 frequencies: Daily, Weekly, Monthly
- Cron-based scheduling with timezone support (America/Chicago)
- Email delivery via SendGrid with file attachments
- Failure logging and recovery
- Multi-tenant isolation

---

## Prerequisites

### Required Environment Variables

```bash
DATABASE_URL=<postgres connection string>
SESSION_SECRET=<random 32+ char string>
SENDGRID_API_KEY=<sendgrid api key for email delivery>
NODE_ENV=development
```

### System Requirements

- Node.js 20+
- PostgreSQL 14+
- npm or pnpm
- SendGrid account (for email delivery)

---

## Quick Start

### 1. Install & Setup

```bash
npm install
npm run db:push  # Apply schema to database
```

### 2. Load Seed Data

```bash
psql $DATABASE_URL < db/seed-scheduled-exports.sql
```

### 3. Start Development Server

```bash
npm run dev
```

Server starts on http://localhost:5000

### 4. Access the Feature

Navigate to: **http://localhost:5000/scheduled-exports**

---

## Database Schema

### scheduled_exports Table

```sql
CREATE TABLE scheduled_exports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('jobs', 'financial', 'equipment', 'qa-scores', 'analytics', 'photos')),
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf', 'json')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time TEXT NOT NULL,  -- Format: "HH:mm" (e.g., "08:00")
  day_of_week INTEGER,  -- 0-6 for weekly exports (0=Sunday, 1=Monday, etc.)
  day_of_month INTEGER,  -- 1-31 for monthly exports
  recipients JSONB NOT NULL,  -- Array of email addresses: ["user@example.com"]
  options JSONB,  -- Export-specific options (filters, date ranges, etc.)
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  failure_log JSONB,  -- Array of {timestamp, error, attemptCount}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_scheduled_exports_user_id ON scheduled_exports(user_id);
CREATE INDEX idx_scheduled_exports_user_enabled ON scheduled_exports(user_id, enabled);
CREATE INDEX idx_scheduled_exports_frequency ON scheduled_exports(frequency);
CREATE INDEX idx_scheduled_exports_next_run ON scheduled_exports(next_run);
CREATE INDEX idx_scheduled_exports_enabled_next_run ON scheduled_exports(enabled, next_run);
```

### Column Descriptions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | VARCHAR | Unique identifier | gen_random_uuid() |
| user_id | VARCHAR | Owner of the export (FK to users) | 'test-admin' |
| name | TEXT | Human-readable name | 'Daily Jobs Export' |
| data_type | TEXT | Type of data to export | 'jobs', 'financial', etc. |
| format | TEXT | Output file format | 'csv', 'xlsx', 'pdf', 'json' |
| frequency | TEXT | How often to run | 'daily', 'weekly', 'monthly' |
| time | TEXT | Time of day to run | '08:00', '17:30' |
| day_of_week | INTEGER | Day for weekly exports | 0=Sun, 1=Mon, 5=Fri |
| day_of_month | INTEGER | Day for monthly exports | 1=1st, 15=15th, 31=Last |
| recipients | JSONB | Email recipients | `["user@example.com"]` |
| options | JSONB | Export filters/settings | `{"filters": {"status": "completed"}}` |
| enabled | BOOLEAN | Whether export is active | true/false |
| last_run | TIMESTAMP | Last execution time | '2025-10-29 08:00:00' |
| next_run | TIMESTAMP | Next scheduled time | '2025-10-30 08:00:00' |
| failure_log | JSONB | Error history | `[{timestamp, error, attemptCount}]` |
| created_at | TIMESTAMP | Creation timestamp | NOW() |
| updated_at | TIMESTAMP | Last update timestamp | NOW() |

---

## API Endpoints

### 1. List Scheduled Exports

**GET /api/scheduled-exports**

Retrieve all scheduled exports for the authenticated user.

**Authentication**: Required (session cookie)

**Request**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports \
  -H "Cookie: connect.sid=<session>"
```

**Response** (200):
```json
[
  {
    "id": "abc-123",
    "userId": "test-admin",
    "name": "Daily Jobs Export",
    "dataType": "jobs",
    "format": "csv",
    "frequency": "daily",
    "time": "08:00",
    "recipients": ["inspector@example.com"],
    "options": {
      "filters": {
        "status": "completed"
      }
    },
    "enabled": true,
    "lastRun": "2025-10-29T08:00:00Z",
    "nextRun": "2025-10-30T08:00:00Z",
    "createdAt": "2025-10-22T10:00:00Z",
    "updatedAt": "2025-10-29T08:00:00Z"
  }
]
```

**Error Codes**:
- `401` - Unauthorized (not logged in)
- `500` - Server error

---

### 2. Get Scheduled Export by ID

**GET /api/scheduled-exports/:id**

Retrieve a specific scheduled export.

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**Request**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/abc-123 \
  -H "Cookie: connect.sid=<session>"
```

**Response** (200):
```json
{
  "id": "abc-123",
  "userId": "test-admin",
  "name": "Daily Jobs Export",
  "dataType": "jobs",
  "format": "csv",
  "frequency": "daily",
  "time": "08:00",
  "recipients": ["inspector@example.com"],
  "options": {
    "filters": {
      "status": "completed"
    }
  },
  "enabled": true,
  "lastRun": "2025-10-29T08:00:00Z",
  "nextRun": "2025-10-30T08:00:00Z",
  "failureLog": null,
  "createdAt": "2025-10-22T10:00:00Z",
  "updatedAt": "2025-10-29T08:00:00Z"
}
```

**Error Codes**:
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

### 3. Create Scheduled Export

**POST /api/scheduled-exports**

Create a new scheduled export.

**Authentication**: Required (session cookie)

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "name": "Daily Jobs Export",
    "dataType": "jobs",
    "format": "csv",
    "frequency": "daily",
    "time": "08:00",
    "recipients": ["inspector@example.com"],
    "options": {
      "filters": {
        "status": "completed"
      }
    },
    "enabled": true
  }'
```

**Request Body Schema**:
```typescript
{
  name: string;           // Required: Export name
  dataType: 'jobs' | 'financial' | 'equipment' | 'qa-scores' | 'analytics' | 'photos';
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;          // Required: "HH:mm" format
  dayOfWeek?: number;    // Optional: 0-6 for weekly
  dayOfMonth?: number;   // Optional: 1-31 for monthly
  recipients: string[];  // Required: Array of emails
  options?: object;      // Optional: Export-specific filters
  enabled?: boolean;     // Optional: Default true
}
```

**Response** (201):
```json
{
  "id": "abc-123",
  "userId": "test-admin",
  "name": "Daily Jobs Export",
  "dataType": "jobs",
  "format": "csv",
  "frequency": "daily",
  "time": "08:00",
  "recipients": ["inspector@example.com"],
  "options": {
    "filters": {
      "status": "completed"
    }
  },
  "enabled": true,
  "nextRun": "2025-10-30T13:00:00Z",
  "createdAt": "2025-10-29T10:00:00Z",
  "updatedAt": "2025-10-29T10:00:00Z"
}
```

**Error Codes**:
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `500` - Server error

---

### 4. Update Scheduled Export

**PATCH /api/scheduled-exports/:id**

Update an existing scheduled export.

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X PATCH http://localhost:5000/api/scheduled-exports/abc-123 \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -d '{
    "name": "Daily Jobs Export - UPDATED",
    "recipients": ["inspector@example.com", "manager@example.com"]
  }'
```

**Request Body Schema** (all fields optional):
```typescript
{
  name?: string;
  dataType?: 'jobs' | 'financial' | 'equipment' | 'qa-scores' | 'analytics' | 'photos';
  format?: 'csv' | 'xlsx' | 'pdf' | 'json';
  frequency?: 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients?: string[];
  options?: object;
  enabled?: boolean;
}
```

**Note**: userId cannot be changed (security protection)

**Response** (200):
```json
{
  "id": "abc-123",
  "userId": "test-admin",
  "name": "Daily Jobs Export - UPDATED",
  "recipients": ["inspector@example.com", "manager@example.com"],
  "nextRun": "2025-10-30T13:00:00Z",
  "updatedAt": "2025-10-29T10:05:00Z"
}
```

**Error Codes**:
- `400` - Bad request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

### 5. Enable Scheduled Export

**POST /api/scheduled-exports/:id/enable**

Enable a disabled scheduled export.

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/abc-123/enable \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: <csrf-token>"
```

**Response** (200):
```json
{
  "id": "abc-123",
  "userId": "test-admin",
  "name": "Daily Jobs Export",
  "enabled": true,
  "nextRun": "2025-10-30T13:00:00Z",
  "updatedAt": "2025-10-29T10:10:00Z"
}
```

**Error Codes**:
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

### 6. Disable Scheduled Export

**POST /api/scheduled-exports/:id/disable**

Disable an enabled scheduled export.

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/abc-123/disable \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: <csrf-token>"
```

**Response** (200):
```json
{
  "id": "abc-123",
  "userId": "test-admin",
  "name": "Daily Jobs Export",
  "enabled": false,
  "nextRun": null,
  "updatedAt": "2025-10-29T10:15:00Z"
}
```

**Error Codes**:
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

### 7. Test Run Scheduled Export

**POST /api/scheduled-exports/:id/test**

Execute a scheduled export immediately (does not update lastRun).

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/abc-123/test \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: <csrf-token>"
```

**Response** (200):
```json
{
  "message": "Test export queued for execution",
  "exportId": "abc-123",
  "status": "running"
}
```

**Error Codes**:
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

### 8. Delete Scheduled Export

**DELETE /api/scheduled-exports/:id**

Permanently delete a scheduled export.

**Authentication**: Required (session cookie)

**Authorization**: Must be owner

**CSRF Protection**: Required (X-CSRF-Token header)

**Request**:
```bash
curl -X DELETE http://localhost:5000/api/scheduled-exports/abc-123 \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: <csrf-token>"
```

**Response** (204):
No content

**Error Codes**:
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not found
- `500` - Server error

---

## Business Logic

### Cron Scheduling Algorithm

The system uses **node-cron** for scheduling exports. The cron expression is generated based on frequency:

```typescript
function getCronExpression(export: ScheduledExport): string {
  const [hour, minute] = export.time.split(':').map(Number);
  
  switch (export.frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;
      // Example: "08:00" → "0 8 * * *" (every day at 8:00 AM)
      
    case 'weekly':
      const dayOfWeek = export.dayOfWeek || 1; // Default to Monday
      return `${minute} ${hour} * * ${dayOfWeek}`;
      // Example: "09:00", Monday → "0 9 * * 1" (every Monday at 9:00 AM)
      
    case 'monthly':
      const dayOfMonth = export.dayOfMonth || 1; // Default to 1st
      return `${minute} ${hour} ${dayOfMonth} * *`;
      // Example: "07:00", 1st → "0 7 1 * *" (1st of every month at 7:00 AM)
  }
}
```

**Timezone**: All cron jobs run in **America/Chicago** (Minneapolis/St Paul timezone).

**Next Run Calculation**:
```typescript
function calculateNextRun(export: ScheduledExport): Date {
  const cronExpression = getCronExpression(export);
  const interval = cron.parseExpression(cronExpression, {
    tz: 'America/Chicago'
  });
  return interval.next().toDate();
}
```

---

### Export Generation Flow

When a scheduled export runs (either via cron or manual test):

1. **Trigger**: Cron job fires at scheduled time
2. **Load Export Config**: Retrieve export details from database
3. **Generate Export**: Call appropriate export service:
   - `jobs` → `exportService.exportJobs()`
   - `financial` → `exportService.exportFinancialData()`
   - `equipment` → `exportService.exportEquipment()`
   - `qa-scores` → `exportService.exportQAScores()`
   - `analytics` → `exportService.exportAnalytics()`
   - `photos` → `exportService.exportPhotoMetadata()`
4. **Apply Options**: Pass filters, date ranges, grouping from `options` field
5. **Format Output**: Generate file in specified format (CSV, XLSX, PDF, JSON)
6. **Email Delivery**: Send file as attachment to recipients
7. **Update State**: Set `lastRun`, calculate new `nextRun`
8. **Error Handling**: Log failures to `failureLog` if export or email fails

---

### Email Delivery

Emails are sent via **SendGrid** with the following template:

**Subject**: `Scheduled Export: {export.name}`

**Body**:
```
Hello,

Your scheduled export "{export.name}" has been generated successfully.

Export Details:
- Data Type: {export.dataType}
- Format: {export.format}
- Generated At: {timestamp}

The export file is attached to this email.

This is an automated message. Please do not reply.
```

**Attachment**: Export file (CSV, XLSX, PDF, or JSON)

**Error Handling**:
- Invalid recipient email → Logged to failureLog, export continues
- SendGrid API failure → Logged to failureLog, retried on next run
- File generation failure → Logged to failureLog, export skipped

---

## Data Types & Export Formats

### Jobs Export

**Data Type**: `jobs`

**Available Formats**: CSV, XLSX, PDF, JSON

**Options**:
```json
{
  "filters": {
    "status": ["scheduled", "in_progress", "completed"],
    "dateRange": "current_week",
    "builderId": "builder-123"
  },
  "columns": ["jobName", "address", "status", "inspector", "scheduledDate"],
  "includeSummary": true
}
```

**Example Output (CSV)**:
```csv
Job Name,Address,Status,Inspector,Scheduled Date
Final Inspection - 123 Main St,"123 Main St, Minneapolis, MN 55401",completed,Shaun Ulrich,2025-10-29
Rough Inspection - 456 Oak Ave,"456 Oak Ave, St Paul, MN 55102",in_progress,John Doe,2025-10-30
```

---

### Financial Export

**Data Type**: `financial`

**Available Formats**: CSV, XLSX, PDF, JSON

**Options**:
```json
{
  "filters": {
    "dataType": "revenue_expenses",
    "dateRange": "last_month",
    "includeProjections": true
  },
  "groupBy": "category",
  "includeSummary": true
}
```

**Example Output (XLSX)**:
| Category | Revenue | Expenses | Net Profit |
|----------|---------|----------|------------|
| Inspections | $12,500 | $3,200 | $9,300 |
| Mileage | $0 | $850 | -$850 |
| Equipment | $0 | $1,200 | -$1,200 |
| **Total** | **$12,500** | **$5,250** | **$7,250** |

---

### Equipment Export

**Data Type**: `equipment`

**Available Formats**: CSV, XLSX, JSON

**Options**:
```json
{
  "filters": {
    "status": ["in_use", "needs_calibration"],
    "includeCalibrationDue": true,
    "daysAhead": 14
  },
  "includeCheckoutHistory": true
}
```

**Example Output (JSON)**:
```json
[
  {
    "equipmentId": "eq-001",
    "name": "Blower Door System",
    "serialNumber": "BD-2024-001",
    "status": "in_use",
    "lastCalibration": "2025-09-15",
    "nextCalibrationDue": "2025-11-15",
    "checkedOutTo": "Shaun Ulrich",
    "checkoutDate": "2025-10-28"
  }
]
```

---

### QA Scores Export

**Data Type**: `qa-scores`

**Available Formats**: CSV, XLSX, PDF

**Options**:
```json
{
  "filters": {
    "dateRange": "current_week",
    "minScore": 0,
    "includeInspectorBreakdown": true
  },
  "groupBy": "inspector",
  "includeTrends": true
}
```

**Example Output (PDF)**:
- **Weekly QA Scores Report**
- Date Range: October 23-29, 2025
- Inspector Performance:
  - Shaun Ulrich: 95% (19/20 items passed)
  - John Doe: 88% (22/25 items passed)
- Overall Pass Rate: 91.5%

---

### Analytics Export

**Data Type**: `analytics`

**Available Formats**: CSV, XLSX, PDF

**Options**:
```json
{
  "filters": {
    "reportType": "comprehensive_kpi",
    "dateRange": "last_month",
    "metrics": ["job_completion_rate", "revenue", "inspector_productivity"]
  },
  "includeCharts": true,
  "includeComparisons": true
}
```

**Example Output (PDF)**:
- **Monthly Analytics Report - September 2025**
- Job Completion Rate: 87% (52/60 jobs)
- Total Revenue: $18,500
- Inspector Productivity: 2.1 jobs/day
- Month-over-Month Comparison: +12% revenue, -3% completion rate

---

### Photos Export

**Data Type**: `photos`

**Available Formats**: CSV, JSON

**Options**:
```json
{
  "filters": {
    "dateRange": "last_week",
    "tags": ["inspection", "completion"],
    "includeMetadata": true
  }
}
```

**Example Output (CSV)**:
```csv
Photo ID,Job Name,Capture Date,Tags,Location,File Size
photo-001,Final Inspection - 123 Main St,2025-10-29,"inspection,exterior","123 Main St, Minneapolis",2.5MB
photo-002,Final Inspection - 123 Main St,2025-10-29,"inspection,blower_door","123 Main St, Minneapolis",3.1MB
```

---

## Frequency Options

### Daily Exports

**Cron Expression**: `{minute} {hour} * * *`

**Configuration**:
```json
{
  "frequency": "daily",
  "time": "08:00"
}
```

**Runs**: Every day at 8:00 AM (America/Chicago)

**Use Cases**:
- Daily job status reports
- Daily equipment checkout status
- End-of-day inspection summaries

---

### Weekly Exports

**Cron Expression**: `{minute} {hour} * * {dayOfWeek}`

**Configuration**:
```json
{
  "frequency": "weekly",
  "time": "09:00",
  "dayOfWeek": 1
}
```

**Runs**: Every Monday at 9:00 AM (America/Chicago)

**Day of Week Values**:
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

**Use Cases**:
- Weekly financial reports
- Weekly QA score summaries
- Weekly inspector performance reviews

---

### Monthly Exports

**Cron Expression**: `{minute} {hour} {dayOfMonth} * *`

**Configuration**:
```json
{
  "frequency": "monthly",
  "time": "07:00",
  "dayOfMonth": 1
}
```

**Runs**: 1st of every month at 7:00 AM (America/Chicago)

**Day of Month Values**: 1-31

**Use Cases**:
- Monthly analytics reports
- Monthly revenue/expense summaries
- Monthly equipment calibration schedules

---

## Common Workflows

### Workflow 1: Create Daily Jobs Export

**Goal**: Send daily completed jobs report to operations team

**Steps**:

1. **Get CSRF Token**:
```bash
CSRF_TOKEN=$(curl -s -b cookies.txt http://localhost:5000/api/csrf-token | jq -r '.csrfToken')
```

2. **Create Export**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "name": "Daily Completed Jobs Report",
    "dataType": "jobs",
    "format": "xlsx",
    "frequency": "daily",
    "time": "17:00",
    "recipients": ["operations@example.com", "shaun@example.com"],
    "options": {
      "filters": {
        "status": "completed",
        "dateRange": "today"
      },
      "includeSummary": true
    },
    "enabled": true
  }'
```

3. **Verify Creation**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports \
  -H "Cookie: connect.sid=<session>"
```

4. **Test Run**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/{export-id}/test \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

---

### Workflow 2: Update Recipients

**Goal**: Add a new recipient to an existing export

**Steps**:

1. **Get Current Export**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  > current-export.json
```

2. **Extract Current Recipients**:
```bash
CURRENT_RECIPIENTS=$(jq '.recipients' current-export.json)
```

3. **Update with New Recipient**:
```bash
curl -X PATCH http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "recipients": ["old@example.com", "new@example.com"]
  }'
```

---

### Workflow 3: Temporarily Disable Export

**Goal**: Pause an export during vacation/maintenance

**Steps**:

1. **Disable Export**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/{export-id}/disable \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

2. **Verify Disabled**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  | jq '.enabled'
# Output: false
```

3. **Re-enable Later**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/{export-id}/enable \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

---

## Troubleshooting

### Issue 1: Export Not Running

**Symptoms**:
- Export shows `enabled: true`
- `nextRun` is in the past
- No emails received

**Debugging Steps**:

1. **Check Server Logs**:
```bash
# Look for [ScheduledExports] log entries
grep "\[ScheduledExports\]" server.log
```

2. **Verify Cron Job Scheduled**:
```javascript
// Check scheduledExportService.jobs.has(exportId)
// Should return true for enabled exports
```

3. **Check `failureLog`**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  | jq '.failureLog'
```

4. **Manually Test**:
```bash
curl -X POST http://localhost:5000/api/scheduled-exports/{export-id}/test \
  -H "Cookie: connect.sid=<session>" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

**Common Causes**:
- Server restart cleared in-memory cron jobs → Re-enable export
- Invalid cron expression → Check time format (HH:mm)
- Export service error → Check server logs for stack trace

---

### Issue 2: Email Not Received

**Symptoms**:
- Export runs successfully (lastRun updated)
- No email in inbox

**Debugging Steps**:

1. **Check Spam Folder**

2. **Verify Recipients**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  | jq '.recipients'
```

3. **Check SendGrid API Key**:
```bash
echo $SENDGRID_API_KEY
# Should return valid API key
```

4. **Review Failure Log**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  | jq '.failureLog'
```

**Common Causes**:
- Invalid email address → Check recipient format
- SendGrid API key missing/invalid → Set `SENDGRID_API_KEY` env var
- SendGrid rate limit → Check SendGrid dashboard
- Email blocked by recipient's spam filter → Whitelist sender

---

### Issue 3: nextRun Not Calculated

**Symptoms**:
- Export created successfully
- `nextRun` is `null`

**Debugging Steps**:

1. **Check `enabled` Status**:
```bash
curl -X GET http://localhost:5000/api/scheduled-exports/{export-id} \
  -H "Cookie: connect.sid=<session>" \
  | jq '.enabled'
```

2. **Verify Time Format**:
```bash
# Time must be "HH:mm" format
# Valid: "08:00", "17:30"
# Invalid: "8:00", "8am", "17:30:00"
```

3. **Check Frequency-Specific Fields**:
```bash
# Weekly exports require dayOfWeek (0-6)
# Monthly exports require dayOfMonth (1-31)
```

**Common Causes**:
- Export is disabled → Enable export
- Invalid time format → Use "HH:mm" (e.g., "08:00")
- Missing `dayOfWeek` for weekly → Set to 0-6
- Missing `dayOfMonth` for monthly → Set to 1-31

---

### Issue 4: 403 Forbidden Error

**Symptoms**:
- `GET /api/scheduled-exports/:id` returns 403
- Error: "Forbidden"

**Debugging Steps**:

1. **Verify Ownership**:
```sql
SELECT user_id FROM scheduled_exports WHERE id = '{export-id}';
```

2. **Check Session User**:
```bash
curl -X GET http://localhost:5000/api/status \
  -H "Cookie: connect.sid=<session>" \
  | jq '.user'
```

3. **Verify Authentication**:
```bash
# Session cookie must be valid
# Re-login if needed
```

**Common Causes**:
- Trying to access another user's export → Cross-tenant isolation working correctly
- Session expired → Re-login via `/api/dev-login/{userId}`
- Wrong export ID → Verify ID is correct

---

## Configuration

### Timezone

**Default**: America/Chicago (Minneapolis/St Paul)

All cron jobs run in this timezone. To change:

```typescript
// server/scheduledExports.ts
const job = cron.schedule(cronExpression, () => {
  this.executeExport(exp);
}, {
  scheduled: true,
  timezone: 'America/Chicago', // Change here
});
```

**Supported Timezones**: Any IANA timezone (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)

---

### Cron Patterns

**Daily**: `0 8 * * *` (8:00 AM every day)

**Weekly**: `0 9 * * 1` (9:00 AM every Monday)

**Monthly**: `0 7 1 * *` (7:00 AM on 1st of every month)

**Custom Patterns**:
- Every 6 hours: `0 */6 * * *`
- Weekdays only: `0 8 * * 1-5`
- Last day of month: `0 8 28-31 * *` (complex, requires additional logic)

---

### Email Templates

Email template is located at: `server/email/templates/scheduledExport.ts`

**Customization**:

```typescript
export const scheduledExportTemplate = (data: {
  exportName: string;
  dataType: string;
  format: string;
  generatedAt: Date;
}) => ({
  subject: `Scheduled Export: ${data.exportName}`,
  html: `
    <h2>Scheduled Export Ready</h2>
    <p>Your scheduled export "${data.exportName}" has been generated.</p>
    <ul>
      <li><strong>Data Type:</strong> ${data.dataType}</li>
      <li><strong>Format:</strong> ${data.format.toUpperCase()}</li>
      <li><strong>Generated:</strong> ${data.generatedAt.toLocaleString()}</li>
    </ul>
    <p>The export file is attached to this email.</p>
  `,
});
```

---

## Security

### Multi-Tenant Isolation

**Enforcement**: All API endpoints verify ownership before access

```typescript
// Example: GET /api/scheduled-exports/:id
const exp = await storage.getScheduledExport(req.params.id);
if (!exp) {
  return res.status(404).json({ message: "Not found" });
}
if (exp.userId !== req.user.id) {
  return res.status(403).json({ message: "Forbidden" });
}
```

**Database Query**:
```sql
-- List exports: Only returns user's exports
SELECT * FROM scheduled_exports WHERE user_id = $1;
```

**Test Validation**: Smoke test verifies User B cannot access User A's exports (Test 11)

---

### userId Verification

**Protection**: userId cannot be reassigned via PATCH

```typescript
// server/routes.ts
const validated = updateScheduledExportSchema.parse(req.body);
// userId field is omitted from updateScheduledExportSchema
// Even if sent in request, it is ignored
```

**Test Validation**: Smoke test verifies userId immutability (Test 12)

---

### CSRF Protection

**Enforcement**: All mutating operations require CSRF token

**Protected Endpoints**:
- POST /api/scheduled-exports
- PATCH /api/scheduled-exports/:id
- DELETE /api/scheduled-exports/:id
- POST /api/scheduled-exports/:id/enable
- POST /api/scheduled-exports/:id/disable
- POST /api/scheduled-exports/:id/test

**Usage**:
```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s -b cookies.txt http://localhost:5000/api/csrf-token | jq -r '.csrfToken')

# Use in request
curl -X POST http://localhost:5000/api/scheduled-exports \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  ...
```

---

## Testing

### Run Smoke Tests

```bash
bash scripts/smoke-test-scheduled-exports.sh
```

**Expected Output**:
```
================================================
Scheduled Exports Feature - Smoke Test
================================================
✅ Test 1: Health check
✅ Test 2: Status endpoint
✅ Test 3: Dev login (User 1)
✅ Test 4: List scheduled exports
✅ Test 5: Create scheduled export
...
✅ Test 15: Delete scheduled export

================================================
Test Summary
================================================
Tests Passed: 15
Tests Failed: 0
✅ ALL SMOKE TESTS PASSED
```

---

### Load Seed Data

```bash
psql $DATABASE_URL < db/seed-scheduled-exports.sql
```

**Verification**:
```sql
SELECT name, data_type, format, frequency, enabled 
FROM scheduled_exports 
WHERE name LIKE '%- Demo';
```

**Expected**: 8 scheduled exports created

---

### Manual Verification

**1. Create Export via UI**:
- Navigate to http://localhost:5000/scheduled-exports
- Click "Create Export"
- Fill form: Name, Data Type, Format, Frequency, Time, Recipients
- Submit

**2. Verify in Database**:
```sql
SELECT id, name, next_run, enabled 
FROM scheduled_exports 
WHERE user_id = 'test-admin' 
ORDER BY created_at DESC 
LIMIT 1;
```

**3. Test Run**:
- Click "Test Run" button
- Check email inbox
- Verify file received

---

## Future Enhancements

1. **Retry Logic**: Automatically retry failed exports (with exponential backoff)
2. **Export History**: Store history of successful runs (separate table)
3. **Advanced Scheduling**: Support multiple time slots per day
4. **File Storage**: Store exports in object storage for later download
5. **Notification Preferences**: Allow users to opt-in/out of specific exports
6. **Export Templates**: Pre-defined export configurations for common use cases
7. **Conditional Exports**: Only send if data exists (e.g., "send if >0 completed jobs")
8. **Custom Formatting**: Allow users to customize column order, headers
9. **Aggregation Options**: Weekly/monthly rollups of daily exports
10. **Export Chaining**: Trigger one export after another completes

---

## Summary

**Scheduled Exports** provides a production-ready solution for automated data exports with:

- ✅ **6 Data Types**: Jobs, Financial, Equipment, QA Scores, Analytics, Photos
- ✅ **4 Formats**: CSV, XLSX, PDF, JSON
- ✅ **3 Frequencies**: Daily, Weekly, Monthly
- ✅ **Email Delivery**: SendGrid with file attachments
- ✅ **Cron Scheduling**: Timezone-aware (America/Chicago)
- ✅ **Multi-Tenant**: Ownership verification on all endpoints
- ✅ **Security**: CSRF protection, userId immutability
- ✅ **Error Handling**: Failure logging and recovery
- ✅ **Testing**: 15 smoke tests, 8 seed scenarios
- ✅ **Documentation**: Comprehensive runbook (750+ lines)

**Deployment Status**: Production-Ready ✅

**Next Steps**:
1. Configure SendGrid API key
2. Load seed data
3. Run smoke tests
4. Create first scheduled export
5. Monitor logs for execution

For support or questions, contact: **shaun.ulrich@example.com**
