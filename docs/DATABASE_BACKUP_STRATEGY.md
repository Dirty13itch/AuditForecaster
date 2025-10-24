# Database Backup & Recovery Strategy

## Overview

This energy auditing application uses **Neon Serverless PostgreSQL** as its primary database. Neon provides enterprise-grade automatic backups with point-in-time recovery (PITR) capabilities.

## Backup System

### Automatic Backups

Neon automatically creates backups of your database:

- **Frequency**: Continuous WAL (Write-Ahead Logging) archival
- **Retention**: 
  - Free tier: 7 days of history
  - Pro tier: 30 days of history  
  - Business tier: Custom retention (up to 90 days)
- **Storage**: Backups stored in separate availability zones for disaster recovery

### Point-in-Time Recovery (PITR)

Neon's branching feature enables recovery to any point within the retention window:

1. **Access Neon Console**: https://console.neon.tech
2. **Navigate to your project**
3. **Select "Branches"**
4. **Create new branch** from timestamp:
   ```
   Branch name: recovery-YYYY-MM-DD-HH-MM
   Parent: main
   Point-in-time: [select desired timestamp]
   ```
5. **Test recovery branch** before promoting to main

## Recovery Procedures

### Scenario 1: Data Corruption (Recent)

**Symptoms**: Bad data detected within last few hours

**Recovery Steps**:
```bash
# 1. Identify corruption timestamp
# Check application logs: server/logger.ts
grep "ERROR" /var/log/app.log

# 2. Create recovery branch in Neon Console
# Branch from: 1 hour before corruption

# 3. Update DATABASE_URL environment variable
# In Replit: Set via Secrets pane
# Or export if using manual deployment
export DATABASE_URL="[recovery-branch-connection-string]"

# 4. Restart application
# For Replit: Automatic restart on environment variable change
# For manual deployment: pm2 restart energy-audit-app
# Or: systemctl restart energy-audit-app

# 5. Verify data integrity
# Test critical queries through application

# 6. If verified, promote recovery branch to main
# Via Neon Console: Branches > Set as Primary
```

### Scenario 2: Accidental Data Deletion

**Symptoms**: Critical records missing from database

**Recovery Steps**:
```bash
# 1. Stop all write operations
# Set application to read-only mode if possible

# 2. Create recovery branch from before deletion
# Use Neon Console to identify timestamp

# 3. Export specific records from recovery branch
pg_dump --data-only \
  --table=jobs \
  --table=photos \
  --table=schedule_events \
  "$RECOVERY_DATABASE_URL" > recovery.sql

# 4. Restore records to main database
psql "$DATABASE_URL" < recovery.sql

# 5. Verify restored data
# Check record counts and relationships
```

### Scenario 3: Complete Database Failure

**Symptoms**: Database unreachable or corrupted beyond repair

**Recovery Steps**:
```bash
# 1. Create new Neon branch from last known good state
# Via Neon Console

# 2. Update application DATABASE_URL
export DATABASE_URL="[new-branch-url]"

# 3. Run schema migrations
npm run db:push

# 4. Verify database structure
# Check all tables exist with proper indexes

# 5. Test application functionality
# Run critical user flows

# 6. Promote new branch to production
```

## Disaster Recovery Plan

### RTO & RPO Targets

- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 1 hour (limited by backup retention)

### Recovery Checklist

- [ ] Identify failure time and root cause
- [ ] Create recovery branch from appropriate timestamp
- [ ] Verify recovery branch data integrity
- [ ] Update DATABASE_URL environment variable
- [ ] Test critical application features
- [ ] Monitor application logs for errors
- [ ] Document incident and recovery process
- [ ] Update team on recovery status

## Monitoring & Alerts

### Database Health Checks

Application includes health endpoints:
```bash
# Database connectivity check
curl http://localhost:5000/api/status

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-24T19:00:00.000Z"
}
```

### Neon Console Monitoring

Monitor via https://console.neon.tech:
- Connection count
- Query performance
- Storage usage
- Backup status

### Recommended Alerts

Set up alerts for:
1. **Database connection failures** - check health endpoint every 5 minutes
2. **Slow queries** - monitor via Neon Console (queries > 1s)
3. **Storage approaching limits** - Neon Console notifications
4. **Failed backup operations** - Neon Console notifications

## Testing Recovery Procedures

### Monthly Recovery Drill

```bash
# 1. Create test recovery branch (1 hour old)
# Via Neon Console

# 2. Connect test instance to recovery branch
# Update DATABASE_URL in Replit Secrets or via export
export DATABASE_URL="[test-recovery-url]"

# Restart application (method depends on hosting)
# Replit: Automatic restart
# Manual: pm2 restart energy-audit-app

# 3. Verify critical data:
# - Job count matches production
# - Photos accessible
# - Schedule events correct
# - Builder relationships intact

# 4. Document drill results
# Note any issues or improvements needed

# 5. Delete test branch
# Via Neon Console
```

## Database Migration Safety

### Before Schema Changes

```bash
# 1. Create pre-migration branch
# Via Neon Console: "before-migration-YYYY-MM-DD"

# 2. Test migration on branch first
DATABASE_URL="[test-branch-url]" npm run db:push

# 3. Verify migration success
# Check indexes, constraints, data integrity

# 4. Apply to production
npm run db:push

# 5. Keep pre-migration branch for 7 days
# Delete via Neon Console after verification period
```

## Additional Safeguards

### Application-Level Protections

1. **Soft Deletes**: Jobs marked `is_cancelled` instead of hard deleted (preserves history)
2. **Cascade Deletes**: Foreign key constraints ensure referential integrity (prevents orphaned records)
3. **Timestamp Tracking**: Creation timestamps on key tables (`reportInstances.createdAt`, `googleEvents.createdAt`) for forensic analysis
4. **Session Storage**: Separate sessions table prevents user lockout during recovery
5. **Hash-based Deduplication**: Photo uploads tracked by SHA-256 hash to prevent accidental loss during recovery

### Database Constraints

```typescript
// Foreign keys with cascade delete
builderId: varchar("builder_id").references(() => builders.id, { 
  onDelete: 'cascade' 
})

// Prevent orphaned records
jobId: varchar("job_id").notNull().references(() => jobs.id, { 
  onDelete: 'cascade' 
})
```

## Emergency Contacts

- **Neon Support**: https://neon.tech/docs/introduction/support
- **Neon Status Page**: https://neonstatus.com
- **Application Logs**: Check `server/logger.ts` output

## Retention Policy

### Development Database
- **Backups**: 7 days (free tier)
- **Deleted data**: Recoverable within 7 days
- **Testing branches**: Delete after 48 hours

### Production Database (Recommended)
- **Backups**: 30 days minimum (Pro tier)
- **Critical data export**: Monthly full dump to external storage
- **Pre-migration branches**: Keep for 7 days
- **Recovery test branches**: Delete within 24 hours

## External Backup Strategy (Optional)

For additional redundancy beyond Neon's automatic backups:

```bash
# Weekly full database export
pg_dump "$DATABASE_URL" | gzip > "backup-$(date +%Y%m%d).sql.gz"

# Store in external location:
# - AWS S3
# - Google Cloud Storage  
# - Local encrypted drive

# Retention: Keep last 12 weekly backups (3 months)
```

## Security Considerations

1. **Connection Strings**: Store DATABASE_URL as secret, never commit to git
2. **Backup Access**: Limit Neon Console access to authorized personnel
3. **Recovery Branches**: Delete after recovery to minimize attack surface
4. **Audit Logs**: Review Neon Console access logs monthly

## Summary

This strategy provides:
✅ **Zero-configuration automatic backups** via Neon  
✅ **Point-in-time recovery** for any incident within retention window  
✅ **Fast recovery** (< 1 hour RTO) using Neon branching  
✅ **Data safety** through cascade deletes and referential integrity  
✅ **Regular testing** via monthly recovery drills  

For questions or updates to this strategy, consult Neon documentation: https://neon.tech/docs/introduction/point-in-time-restore
