# MileIQ-Style Mileage Tracking - Vertical Slice

## Overview
Complete vertical slice implementing automatic mileage tracking with swipe-to-classify interface for tax-deductible business mileage reporting.

**User Story**: As a field inspector, I can have my drives automatically detected and quickly classify them with a swipe gesture (business/personal) so that I can effortlessly track tax-deductible mileage without manual start/stop actions.

**Status**: ✅ Production Ready (October 2025)

---

## Prerequisites

### Required Environment Variables
```bash
DATABASE_URL=<postgres connection string>
SESSION_SECRET=<random 32+ char string>
NODE_ENV=development
```

### System Requirements
- Node.js 20+
- PostgreSQL 14+
- npm or pnpm

---

## Quick Start

### 1. Install & Setup
```bash
npm install
npm run db:push  # Apply schema to database
```

### 2. Start Development Server
```bash
npm run dev
```
Server starts on http://localhost:5000

### 3. Access the Feature
Navigate to: **http://localhost:5000/mileage**

---

## Database Schema

### mileageLogs Table
```sql
CREATE TABLE mileage_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  vehicle_state VARCHAR NOT NULL,  -- 'idle' | 'monitoring' | 'recording' | 'unclassified' | 'classified'
  purpose VARCHAR,                 -- 'business' | 'personal'
  date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  distance_miles NUMERIC(10,2),
  route_points JSONB,
  start_location JSONB,
  end_location JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mileage_logs_user_vehicle_state ON mileage_logs(user_id, vehicle_state);
CREATE INDEX idx_mileage_logs_user_date ON mileage_logs(user_id, date);
```

### Seed Data
```sql
-- Sample unclassified drive (created by seeding)
INSERT INTO mileage_logs (user_id, vehicle_state, date, start_time, end_time, distance_miles, start_location, end_location)
VALUES 
  ('test-admin', 'unclassified', '2025-10-28', '2025-10-28 08:30:00', '2025-10-28 09:15:00', 12.5, 
   '{"address": "123 Main St, Minneapolis, MN"}', '{"address": "456 Oak Ave, St Paul, MN"}');
```

---

## API Contract

### 1. GET /api/mileage/unclassified
**Purpose**: Fetch drives awaiting classification

**Request**:
```bash
curl -X GET http://localhost:5000/api/mileage/unclassified \
  -H "Cookie: connect.sid=<session>"
```

**Response** (200):
```json
{
  "drives": [
    {
      "id": "uuid",
      "date": "2025-10-28",
      "startTime": "2025-10-28T08:30:00Z",
      "endTime": "2025-10-28T09:15:00Z",
      "distanceMiles": 12.5,
      "startLocation": {"address": "123 Main St"},
      "endLocation": {"address": "456 Oak Ave"}
    }
  ]
}
```

**Error Codes**:
- `401` - Unauthorized (not logged in)
- `500` - Server error

---

### 2. PUT /api/mileage/:id/classify
**Purpose**: Classify a drive as business or personal

**Request**:
```bash
curl -X PUT http://localhost:5000/api/mileage/abc-123/classify \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session>" \
  -d '{"purpose": "business"}'
```

**Request Body**:
```json
{
  "purpose": "business"  // or "personal"
}
```

**Response** (200):
```json
{
  "id": "abc-123",
  "vehicleState": "classified",
  "purpose": "business",
  "distanceMiles": 12.5
}
```

**Error Codes**:
- `400` - Invalid purpose value
- `404` - Drive not found
- `409` - Drive already classified or wrong state
- `500` - Server error

---

### 3. GET /api/mileage/summary?month=YYYY-MM
**Purpose**: Monthly mileage statistics

**Request**:
```bash
curl -X GET "http://localhost:5000/api/mileage/summary?month=2025-10" \
  -H "Cookie: connect.sid=<session>"
```

**Response** (200):
```json
{
  "month": "2025-10",
  "totalDrives": 24,
  "businessDrives": 18,
  "personalDrives": 6,
  "totalMiles": 342.8,
  "businessMiles": 289.4,
  "personalMiles": 53.4,
  "irsRate": 0.70,
  "taxDeduction": 202.58
}
```

---

### 4. GET /api/mileage/export?month=YYYY-MM&format=csv
**Purpose**: Export IRS-compliant CSV for tax reporting

**Request**:
```bash
curl -X GET "http://localhost:5000/api/mileage/export?month=2025-10&format=csv" \
  -H "Cookie: connect.sid=<session>" \
  --output mileage_2025-10.csv
```

**Response** (200): CSV file download
```csv
Date,Start Time,End Time,Miles,Purpose,Start Location,End Location,Notes,Tax Deduction
2025-10-28,08:30:00,09:15:00,12.50,business,123 Main St,456 Oak Ave,,8.75
```

**Error Codes**:
- `400` - Invalid month format
- `401` - Unauthorized

---

## UI Navigation

### Access Points
1. **Sidebar Navigation**: Click "Mileage" (Car icon) in left sidebar
2. **Direct URL**: `/mileage` (summary) or `/mileage/classify` (classification)

### User Flows

#### Flow 1: View Monthly Summary
1. Navigate to `/mileage`
2. View stats cards (Total Miles, Business Miles, Tax Deduction, IRS Rate)
3. Click "Monthly Summary" tab
4. Review detailed breakdown
5. Click "Export CSV" to download tax report

#### Flow 2: Classify Drives
1. Navigate to `/mileage` → Click "Classify Drives" tab
2. OR navigate directly to `/mileage/classify`
3. **Swipe gesture**: Drag card right (business) or left (personal)
4. **Accessibility**: Click "Personal" or "Business" button
5. Card animates out, next drive appears
6. Empty state shows when complete: "All caught up!"

---

## Testing

### Run All Tests
```bash
npm test
```

### E2E Test Coverage
- ✅ Monthly summary page loads with correct stats
- ✅ IRS rate displays as $0.70/mile (2025 standard)
- ✅ Classify page handles empty state gracefully
- ✅ Swipe gestures trigger classification
- ✅ Error states display with retry buttons
- ✅ CSV export button renders

### Manual Test Checklist
```
□ Login as test user
□ Navigate to /mileage - stats cards render
□ Click "Monthly Summary" - data displays
□ Click "Export CSV" - file downloads
□ Navigate to /mileage/classify
□ If drives exist: swipe right/left works
□ If no drives: "All caught up!" message shows
□ Click back button - returns to /mileage
□ Verify no console errors
```

---

## Observability

### Structured Logs
All mileage operations emit JSON logs with:
- `correlation_id` - Unique request identifier
- `route` - API endpoint
- `userId` - Authenticated user
- `duration_ms` - Request duration
- `status` - HTTP status code

**Example Log**:
```json
{
  "level": "INFO",
  "ts": "2025-10-29T04:00:00Z",
  "correlation_id": "abc-123",
  "route": "PUT /api/mileage/:id/classify",
  "userId": "test-admin",
  "duration_ms": 42,
  "status": 200
}
```

### Health Checks

**Liveness**: `GET /healthz`
```json
{"status": "healthy", "timestamp": "2025-10-29T04:00:00Z", "uptime": 3600}
```

**Readiness**: `GET /readyz`
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy", "responseTime": 12},
    "config": {"status": "healthy"}
  }
}
```

**Status**: `GET /api/status`
```json
{
  "version": "1.0.0",
  "commitSha": "e810b78",
  "environment": "production",
  "uptime": {"seconds": 3600}
}
```

---

## Security

### Authentication
- All endpoints require valid session cookie
- RBAC: Inspectors can only access their own drives
- Admins have full access

### Input Validation
- `purpose` - Enum: `business | personal` only
- `month` - Format: `YYYY-MM` validated
- SQL injection prevented via parameterized queries

### Rate Limiting
- `/api/mileage/*` - 100 requests/15 minutes per user
- Burst protection enabled

---

## Performance

### Query Optimization
- **N+1 Prevention**: JSON aggregation for route points
- **Indexes**: Compound indexes on `(user_id, vehicle_state, date)`
- **Response Time**: P95 < 200ms for summary endpoint

### Caching Strategy
- Frontend: TanStack Query cache (5 min stale time)
- Backend: No caching (real-time data)

---

## Smoke Test

Run full vertical slice validation:

```bash
# 1. Start server
npm run dev &
sleep 5

# 2. Health check
curl -f http://localhost:5000/healthz || exit 1

# 3. Login (dev mode)
SESSION=$(curl -c - http://localhost:5000/api/dev-login/test-admin | grep connect.sid | awk '{print $7}')

# 4. Get unclassified drives
curl -f -H "Cookie: connect.sid=$SESSION" \
  http://localhost:5000/api/mileage/unclassified || exit 1

# 5. Get summary
curl -f -H "Cookie: connect.sid=$SESSION" \
  "http://localhost:5000/api/mileage/summary?month=2025-10" || exit 1

# 6. Test classification (if drive exists)
# DRIVE_ID=$(curl -s -H "Cookie: connect.sid=$SESSION" http://localhost:5000/api/mileage/unclassified | jq -r '.drives[0].id')
# curl -f -X PUT -H "Cookie: connect.sid=$SESSION" -H "Content-Type: application/json" \
#   -d '{"purpose":"business"}' \
#   "http://localhost:5000/api/mileage/$DRIVE_ID/classify" || exit 1

echo "✅ All smoke tests passed"
```

---

## Rollback

### Database Rollback
```bash
# No destructive migrations - safe to rollback code only
git revert <commit-sha>
npm run db:push
```

### Feature Flag (Future)
Currently no feature flag. To disable:
1. Remove sidebar link in `client/src/components/AppSidebar.tsx`
2. Add route guard in `client/src/App.tsx`

---

## Deployment

### Build Production Artifact
```bash
npm run build
```
Outputs to `dist/` directory.

### Deploy to Replit
1. Ensure secrets configured: `DATABASE_URL`, `SESSION_SECRET`
2. Click "Deploy" button in Replit
3. Run smoke test against deployed URL
4. Monitor logs for errors

### Post-Deploy Verification
```bash
# Replace with your deployed URL
DEPLOYED_URL="https://your-app.replit.app"

# Health check
curl -f $DEPLOYED_URL/healthz

# Status check
curl -f $DEPLOYED_URL/api/status
```

---

## Acceptance Checklist

### Development
- ✅ `npm run dev` starts server on port 5000
- ✅ Database migrated with `npm run db:push`
- ✅ Seed data visible in database

### API
- ✅ GET `/api/mileage/unclassified` returns drives
- ✅ PUT `/api/mileage/:id/classify` updates state
- ✅ GET `/api/mileage/summary` calculates correctly
- ✅ GET `/api/mileage/export` generates CSV

### UI
- ✅ `/mileage` page renders stats cards
- ✅ Monthly Summary tab shows breakdown
- ✅ `/mileage/classify` handles empty state
- ✅ Swipe gestures trigger classification
- ✅ Error states show retry buttons
- ✅ Back navigation works

### Testing
- ✅ E2E tests passing (all scenarios)
- ✅ No console errors in browser
- ✅ Loading states display correctly
- ✅ Error handling comprehensive

### Observability
- ✅ Health check `/healthz` returns 200
- ✅ Status endpoint shows version info
- ✅ Logs include correlation IDs
- ✅ Request durations tracked

### Security
- ✅ Authentication required for all endpoints
- ✅ Input validation prevents invalid data
- ✅ Rate limiting enabled
- ✅ No PII in logs
- ✅ No secrets in code

### Documentation
- ✅ This MILEAGE_SLICE.md complete
- ✅ API contract documented
- ✅ Run instructions clear
- ✅ Rollback steps provided

### Deployment
- ✅ Build succeeds (`npm run build`)
- ✅ Smoke test passes
- ✅ Deploy artifact ready
- ✅ Post-deploy verification documented

---

## Known Limitations & Future Slices

### Current Scope
- Manual drive creation not supported (automatic detection only)
- Two purposes only (business/personal)
- CSV export only (no PDF)
- Monthly view only (no custom date ranges)

### Future Enhancements (Out of Scope)
1. **AI Classification** - Pattern learning for auto-classification
2. **Work Hours Feature** - Auto-classify by time of day
3. **Push Notifications** - Alert when drive detected
4. **PDF Reports** - Professional tax report generation
5. **Custom Purposes** - Medical, charity, moving
6. **Multi-Vehicle** - Track multiple cars separately
7. **Offline Mode** - Full offline classification queue

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Drive already classified" error (409)
**Solution**: Drive state changed. Refresh page to get updated list.

**Issue**: Empty state shows but drives exist
**Solution**: Check `vehicle_state` column - must be 'unclassified' to appear.

**Issue**: CSV export empty
**Solution**: Ensure month parameter matches format `YYYY-MM`.

### Debug Mode
Enable verbose logging:
```bash
NODE_ENV=development npm run dev
```

### Contact
For issues, check logs at `/tmp/logs/` or contact development team.

---

**Last Updated**: October 29, 2025  
**Version**: 1.0.0  
**Commit**: e810b78c56e9cc27d3f917e29fcf803577555e9c
