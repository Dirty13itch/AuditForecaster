# Backup & Restore Guide
## Energy Auditing Platform - Disaster Recovery Procedures

**Last Updated:** October 30, 2025  
**Owner:** Platform Team  
**Emergency Contact:** ops@energyaudit.example.com

---

## Table of Contents

1. [Overview](#overview)
2. [Database Backup Procedures](#database-backup-procedures)
3. [Object Storage Backup](#object-storage-backup)
4. [Application Configuration Backup](#application-configuration-backup)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
7. [Testing & Verification](#testing--verification)
8. [Recovery Time Objectives](#recovery-time-objectives)
9. [Appendix](#appendix)

---

## Overview

This guide documents backup and restore procedures for the Energy Auditing Platform, ensuring business continuity and data protection.

### Backup Strategy

- **Database**: Automated daily backups via Neon + on-demand manual backups
- **Object Storage**: Versioning enabled on GCS buckets with lifecycle policies
- **Configuration**: Version-controlled secrets and environment variables
- **Schedule**: Daily automated, weekly verified, monthly tested

### Key Metrics

| Component | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|-----------|-------------------------------|-------------------------------|
| Database | < 1 hour | < 15 minutes |
| Object Storage (Photos) | < 24 hours | < 30 minutes |
| Application Config | < 1 hour | < 5 minutes |
| Full System | < 4 hours | < 2 hours |

---

## Database Backup Procedures

### Neon PostgreSQL Automatic Backups

Neon provides automatic continuous backup with point-in-time recovery:

**Features:**
- Continuous backup (every few seconds)
- 7-day retention (Free Tier)
- 30-day retention (Pro Tier)
- Point-in-time restore to any second within retention window
- Geographic redundancy

**Accessing Neon Backups:**

1. Navigate to [Neon Console](https://console.neon.tech/)
2. Select your project
3. Go to "Backups" tab
4. Choose restore point
5. Create branch or restore to production

**Configuration:**
```bash
# Current Neon configuration
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Backup retention: 30 days (Pro Tier)
# Backup frequency: Continuous
# Storage: Multi-region (US-EAST-1 primary, US-WEST-2 replica)
```

### Manual Database Backups

Use `pg_dump` for manual backups before major changes:

#### Full Database Backup (Recommended)

```bash
# Export DATABASE_URL (if not already set)
export DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Create timestamped backup
pg_dump $DATABASE_URL \
  -F c \
  -f "backup_full_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose

# Verify backup created
ls -lh backup_full_*.dump
```

**Output:** `backup_full_20251030_143000.dump` (~50-200MB depending on data volume)

#### Schema-Only Backup

```bash
# Backup database structure without data
pg_dump $DATABASE_URL \
  --schema-only \
  -f "schema_backup_$(date +%Y%m%d).sql" \
  --verbose

# Review schema
head -n 50 schema_backup_*.sql
```

#### Data-Only Backup

```bash
# Backup data without schema
pg_dump $DATABASE_URL \
  --data-only \
  -F c \
  -f "data_backup_$(date +%Y%m%d).dump" \
  --verbose
```

#### Selective Table Backup

```bash
# Backup critical tables only (faster, smaller)
pg_dump $DATABASE_URL \
  -t jobs \
  -t photos \
  -t builders \
  -t blower_door_tests \
  -t duct_leakage_tests \
  -F c \
  -f "critical_tables_$(date +%Y%m%d).dump"
```

### Backup Storage Locations

**Production Backups:**
- **Primary:** Neon automated backups (continuous)
- **Secondary:** Manual backups uploaded to GCS bucket `energy-audit-db-backups`
- **Tertiary:** Weekly backups downloaded to secure local storage

**Upload Manual Backup to GCS:**

```bash
# Upload to Google Cloud Storage
gsutil cp backup_full_$(date +%Y%m%d)_*.dump \
  gs://energy-audit-db-backups/production/$(date +%Y%m)/

# Verify upload
gsutil ls gs://energy-audit-db-backups/production/$(date +%Y%m)/
```

### Backup Verification

**Verify backup integrity:**

```bash
# Test backup file (doesn't restore, just validates)
pg_restore -l backup_full_20251030_143000.dump | head -n 20

# Check backup size (should be consistent)
du -h backup_full_*.dump
```

**Expected output:**
```
; Archive created at 2025-10-30 14:30:00 UTC
; dbname: energyaudit
; TOC Entries: 256
; Compression: -1
; Dump Version: 1.14-0
; Format: CUSTOM
...
```

### Automated Backup Script

Create automated backup script for weekly manual backups:

```bash
#!/bin/bash
# File: scripts/backup-database.sh

set -e

BACKUP_DIR="/backups/database"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_auto_$TIMESTAMP.dump"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Starting database backup..."
pg_dump $DATABASE_URL \
  -F c \
  -f "$BACKUP_FILE" \
  --verbose

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"

# Upload to GCS
echo "Uploading to GCS..."
gsutil cp "$BACKUP_FILE.gz" \
  gs://energy-audit-db-backups/automated/$(date +%Y%m)/

# Delete local backups older than retention period
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "backup_auto_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Schedule with cron:**
```bash
# Run every Sunday at 2 AM
0 2 * * 0 /app/scripts/backup-database.sh >> /logs/backup.log 2>&1
```

---

## Object Storage Backup

### Google Cloud Storage Configuration

**Bucket:** `repl-default-bucket-$REPL_ID`

**Features:**
- Versioning: Enabled (retains previous versions of objects)
- Lifecycle: Delete versions older than 90 days
- Storage Class: Standard (hot data)
- Location: Multi-region US

**Current Configuration:**

```bash
# Public assets directory
PUBLIC_OBJECT_SEARCH_PATHS=/public

# Private uploads directory  
PRIVATE_OBJECT_DIR=/.private

# Bucket name
BUCKET_NAME=repl-default-bucket-${REPL_ID}
```

### Photo Upload Backup Strategy

**Automatic Versioning:**
- GCS versioning enabled on bucket
- Previous versions retained for 90 days
- Deleted objects recoverable within retention period

**Verify versioning enabled:**

```bash
# Check bucket versioning status
gsutil versioning get gs://repl-default-bucket-${REPL_ID}

# Expected output: Enabled
```

### Cross-Region Replication (Optional)

For critical photo data, enable cross-region replication:

```bash
# Create replica bucket in different region
gsutil mb -l US-WEST1 gs://energy-audit-photos-backup

# Copy objects to backup bucket (weekly)
gsutil -m rsync -r \
  gs://repl-default-bucket-${REPL_ID}/.private \
  gs://energy-audit-photos-backup/.private
```

### Object Storage Backup Commands

**List all photos:**
```bash
gsutil ls -r gs://repl-default-bucket-${REPL_ID}/.private
```

**Download all photos (for local backup):**
```bash
# Create local backup directory
mkdir -p /backups/photos/$(date +%Y%m%d)

# Download all photos
gsutil -m cp -r \
  gs://repl-default-bucket-${REPL_ID}/.private \
  /backups/photos/$(date +%Y%m%d)/

# Verify download
du -sh /backups/photos/$(date +%Y%m%d)
```

**Restore deleted photo (within 90 days):**
```bash
# List versions of a deleted object
gsutil ls -a gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg

# Restore specific version
gsutil cp \
  gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg#1234567890123456 \
  gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg
```

### Backup Retention Policies

**Lifecycle Policy Configuration:**

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 3,
          "age": 90
        }
      }
    ]
  }
}
```

Apply policy:
```bash
gsutil lifecycle set lifecycle.json gs://repl-default-bucket-${REPL_ID}
```

---

## Application Configuration Backup

### Environment Variables

**Critical environment variables** to backup:

```bash
# Authentication
REPLIT_DOMAINS=your-domain.repl.co

# Database
DATABASE_URL=postgresql://...

# Object Storage  
BUCKET_NAME=repl-default-bucket-...
GCS_PROJECT_ID=...
GCS_KEY_FILE_PATH=...

# Email (SendGrid)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...

# Google Calendar
GOOGLE_CALENDAR_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...

# Session  
SESSION_SECRET=...
NODE_ENV=production
```

**Backup Process:**

1. **Secrets are stored in Replit Secrets** (encrypted at rest)
2. **Document required secrets** in `.env.example`
3. **Never commit actual secrets** to version control
4. **Backup secrets list** (not values!) to secure location

**Create secrets backup checklist:**

```bash
# File: docs/REQUIRED_SECRETS.md
cat > docs/REQUIRED_SECRETS.md << 'EOF'
# Required Environment Variables

## Authentication
- REPLIT_DOMAINS - Comma-separated list of allowed domains
- SESSION_SECRET - Cryptographically secure random string (32+ characters)

## Database
- DATABASE_URL - Full PostgreSQL connection string from Neon

## Object Storage
- BUCKET_NAME - GCS bucket name
- GCS_PROJECT_ID - Google Cloud project ID
- GCS_KEY_FILE_PATH - Path to service account JSON

## Email
- SENDGRID_API_KEY - SendGrid API key
- SENDGRID_FROM_EMAIL - Verified sender email

## Google Calendar
- GOOGLE_CALENDAR_ID - Calendar ID for event imports
- GOOGLE_SERVICE_ACCOUNT_EMAIL - Service account email

## Application
- NODE_ENV - production|development
- PORT - Application port (default: 5000)
EOF
```

### Database Schema Version Control

**Schema is version-controlled via:**
- `shared/schema.ts` - Drizzle schema definitions
- `migrations/` - SQL migration files

**Backup migration history:**

```bash
# Archive migrations directory
tar -czf migrations_backup_$(date +%Y%m%d).tar.gz migrations/

# Upload to GCS
gsutil cp migrations_backup_*.tar.gz \
  gs://energy-audit-db-backups/migrations/
```

---

## Restore Procedures

### Full Database Restore

**Scenario:** Complete database loss or corruption

**Prerequisites:**
- Latest backup file available
- DATABASE_URL for target database
- Sufficient permissions (database owner/admin)

**Steps:**

```bash
# 1. Verify backup file integrity
pg_restore -l backup_full_20251030_143000.dump

# 2. Drop existing database (CAUTION!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore from backup
pg_restore -d $DATABASE_URL \
  --verbose \
  --no-owner \
  --no-acl \
  backup_full_20251030_143000.dump

# 4. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM photos;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM builders;"
```

**Expected Time:** 5-15 minutes depending on database size

### Partial Table Restore

**Scenario:** Accidental deletion of specific table data

```bash
# Restore only jobs table
pg_restore -d $DATABASE_URL \
  -t jobs \
  --verbose \
  --data-only \
  backup_full_20251030_143000.dump

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(created_at) FROM jobs;"
```

### Point-in-Time Restore (Neon)

**Scenario:** Need to restore to exact timestamp before incident

**Using Neon Console:**

1. Navigate to [Neon Console](https://console.neon.tech/)
2. Select project → Backups
3. Click "Point-in-Time Recovery"
4. Select date and time (to the second)
5. Choose restore method:
   - **Branch:** Create new branch for testing (recommended)
   - **Replace:** Replace production database (CAUTION!)
6. Wait for restore to complete (~5-10 minutes)
7. Update DATABASE_URL if using branch
8. Verify data integrity

**Using Neon CLI:**

```bash
# Install Neon CLI
npm install -g neonctl

# Create branch from specific timestamp
neonctl branches create \
  --project-id your-project-id \
  --name recovery-branch \
  --restore-timestamp "2025-10-30T14:30:00Z"

# Get connection string for new branch
neonctl connection-string recovery-branch
```

### Object Storage Restore

**Scenario:** Accidentally deleted photos

**Restore from version history:**

```bash
# List all versions of deleted file
gsutil ls -a gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg

# Restore specific version
gsutil cp \
  "gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg#1234567890123456" \
  gs://repl-default-bucket-${REPL_ID}/.private/photo_123.jpg
```

**Bulk restore from backup bucket:**

```bash
# Restore all photos from backup
gsutil -m rsync -r \
  gs://energy-audit-photos-backup/.private \
  gs://repl-default-bucket-${REPL_ID}/.private
```

### Configuration Restore

**Scenario:** Lost environment variables or secrets

1. Review `docs/REQUIRED_SECRETS.md` for complete list
2. Retrieve secrets from secure password manager
3. Add secrets to Replit Secrets panel
4. Restart application to load new secrets

```bash
# Verify all required secrets are set
node scripts/verify-env.js
```

---

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Detection:**
- Query failures with integrity constraint violations
- Application errors about missing tables
- Data inconsistency reports from users

**Recovery Steps:**

1. **Immediate Actions** (0-5 min)
   ```bash
   # Stop application to prevent further corruption
   # (Replit will auto-stop on errors)
   
   # Identify scope of corruption
   psql $DATABASE_URL -c "\dt"  # List tables
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs;"
   ```

2. **Assessment** (5-10 min)
   - Determine if corruption is limited to specific tables
   - Check if point-in-time restore is viable
   - Review recent backup integrity

3. **Restore** (10-25 min)
   ```bash
   # Option A: Full restore from backup
   pg_restore -d $DATABASE_URL backup_full_latest.dump
   
   # Option B: Point-in-time restore via Neon
   # Use Neon Console for PITR
   ```

4. **Verification** (25-30 min)
   ```bash
   # Run integrity checks
   npm run test:integration
   
   # Verify critical data
   psql $DATABASE_URL << 'EOF'
   SELECT 
     (SELECT COUNT(*) FROM jobs) as jobs_count,
     (SELECT COUNT(*) FROM photos) as photos_count,
     (SELECT COUNT(*) FROM builders) as builders_count;
   EOF
   ```

5. **Communication**
   - Notify users of temporary downtime
   - Provide status updates every 15 minutes
   - Confirm restoration complete

**Estimated RTO:** 15-30 minutes  
**Estimated RPO:** < 1 hour (Neon PITR)

---

### Scenario 2: Accidental Data Deletion

**Detection:**
- User reports missing jobs/photos/data
- Audit logs show bulk DELETE operations
- Sudden drop in record counts

**Recovery Steps:**

1. **Immediate Actions** (0-2 min)
   ```bash
   # Prevent further deletions
   # Revoke user permissions if malicious
   
   # Check audit logs
   psql $DATABASE_URL -c "
     SELECT * FROM audit_logs 
     WHERE action = 'delete' 
     ORDER BY created_at DESC LIMIT 20;
   "
   ```

2. **Identify Deletion Timestamp** (2-5 min)
   - Review audit logs for exact deletion time
   - Identify affected records
   - Determine if deletion was partial or complete

3. **Point-in-Time Restore** (5-20 min)
   ```bash
   # Create branch from just before deletion
   neonctl branches create \
     --project-id your-project-id \
     --name recovery-$(date +%Y%m%d) \
     --restore-timestamp "2025-10-30T14:29:00Z"
   
   # Export deleted records
   pg_dump $RECOVERY_DATABASE_URL -t jobs -t photos > deleted_records.sql
   
   # Import into production
   psql $DATABASE_URL < deleted_records.sql
   ```

4. **Verification** (20-30 min)
   - Compare record counts before/after
   - Verify restored data with user
   - Check for any data integrity issues

5. **Prevention**
   - Review access controls
   - Implement soft deletes for critical tables
   - Add confirmation dialogs for bulk operations

**Estimated RTO:** 20-30 minutes  
**Estimated RPO:** 0 minutes (PITR to exact second)

---

### Scenario 3: Complete System Failure

**Detection:**
- Application completely unresponsive
- Database unreachable
- Multiple simultaneous failures

**Recovery Steps:**

1. **Triage** (0-10 min)
   - Check Replit service status
   - Verify Neon database status
   - Test network connectivity
   - Review error logs

2. **Restore to New Environment** (10-45 min)
   ```bash
   # Clone Repl to new instance
   # Or create new Repl from backup
   
   # Restore database
   pg_restore -d $NEW_DATABASE_URL backup_full_latest.dump
   
   # Restore environment variables
   # Copy from Replit Secrets backup
   
   # Restore object storage (if needed)
   gsutil -m rsync -r \
     gs://energy-audit-photos-backup \
     gs://repl-default-bucket-new
   ```

3. **DNS Switchover** (45-60 min)
   - Update Replit domain to point to new instance
   - Test new instance thoroughly
   - Monitor for issues

4. **Full Smoke Test** (60-90 min)
   ```bash
   # Run smoke test suite
   npm run test:smoke
   
   # Manual verification
   # - User login
   # - Job creation
   # - Photo upload
   # - Report generation
   ```

5. **Post-Incident Review** (90-120 min)
   - Document root cause
   - Identify prevention measures
   - Update runbooks

**Estimated RTO:** 1.5-2 hours  
**Estimated RPO:** < 4 hours (last manual backup)

---

## Testing & Verification

### Backup Testing Schedule

**Weekly:**
- Verify automated backup creation
- Check backup file integrity
- Monitor backup storage usage

**Monthly:**
- Restore backup to test environment
- Verify restored data completeness
- Test application functionality on restored database
- Time the restore process

**Quarterly:**
- Full disaster recovery drill
- Test complete system restore
- Verify all runbook procedures
- Update documentation with findings

### Monthly Backup Test Procedure

```bash
#!/bin/bash
# File: scripts/test-backup-restore.sh

set -e

echo "=== Monthly Backup Restore Test ==="
echo "Date: $(date)"

# 1. Download latest backup
echo "Downloading latest backup..."
LATEST_BACKUP=$(gsutil ls -l gs://energy-audit-db-backups/production/*/ | sort -k2 -r | head -n 2 | tail -n 1 | awk '{print $3}')
gsutil cp "$LATEST_BACKUP" /tmp/test_backup.dump.gz
gunzip /tmp/test_backup.dump.gz

# 2. Create test database
echo "Creating test database..."
TEST_DB_URL="postgresql://user:pass@localhost/test_restore_$(date +%Y%m%d)"
psql -c "CREATE DATABASE test_restore_$(date +%Y%m%d);"

# 3. Restore to test database
echo "Restoring backup..."
START_TIME=$(date +%s)
pg_restore -d "$TEST_DB_URL" /tmp/test_backup.dump
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 4. Verify restore
echo "Verifying restore..."
JOBS_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM jobs;")
PHOTOS_COUNT=$(psql "$TEST_DB_URL" -t -c "SELECT COUNT(*) FROM photos;")

# 5. Report results
echo "=== Restore Test Complete ==="
echo "Duration: ${DURATION} seconds"
echo "Jobs restored: ${JOBS_COUNT}"
echo "Photos restored: ${PHOTOS_COUNT}"

# 6. Cleanup
psql -c "DROP DATABASE test_restore_$(date +%Y%m%d);"
rm /tmp/test_backup.dump

echo "Test completed successfully!"
```

---

## Recovery Time Objectives

### Component RTOs

| Component | RTO | Notes |
|-----------|-----|-------|
| **Database** | 15 min | Full restore from backup |
| **Object Storage** | 30 min | Bulk restore from backup bucket |
| **Application Config** | 5 min | Restore secrets from documentation |
| **Complete System** | 2 hours | New environment + full restore |

### Component RPOs

| Component | RPO | Notes |
|-----------|-----|-------|
| **Database** | < 1 hour | Neon point-in-time recovery |
| **Object Storage** | < 24 hours | Daily sync to backup bucket |
| **Application Config** | < 1 hour | Version controlled + documented |

---

## Appendix

### Quick Reference Commands

**Create backup:**
```bash
pg_dump $DATABASE_URL -F c -f backup_$(date +%Y%m%d).dump
```

**Restore backup:**
```bash
pg_restore -d $DATABASE_URL backup_20251030.dump
```

**List GCS objects:**
```bash
gsutil ls -r gs://repl-default-bucket-${REPL_ID}
```

**Restore deleted object:**
```bash
gsutil ls -a gs://bucket/object.jpg
gsutil cp gs://bucket/object.jpg#version gs://bucket/object.jpg
```

### Emergency Contacts

- **Platform Team:** ops@energyaudit.example.com
- **Neon Support:** https://console.neon.tech/support
- **Google Cloud Support:** https://cloud.google.com/support
- **On-Call Rotation:** See Incident Response Playbook

### Related Documentation

- [Monitoring Runbook](./MONITORING_RUNBOOK.md)
- [Incident Response Playbook](./INCIDENT_RESPONSE_PLAYBOOK.md)
- [API Documentation](./api/index.html)
- [Production Standards](../PRODUCTION_STANDARDS.md)

---

**Document Version:** 1.0.0  
**Last Tested:** October 30, 2025  
**Next Review:** November 30, 2025  
**Maintained By:** Platform Team
