# Production Operations Runbook

## Overview
This runbook provides step-by-step procedures for common production operations and incident response.

---

## 🚨 Incident Response

### Step 1: Assess Severity
- **P0 (Critical)**: Service down, data loss, security breach
- **P1 (High)**: Major feature broken, significant performance degradation
- **P2 (Medium)**: Minor feature broken, some users affected
- **P3 (Low)**: Cosmetic issues, edge cases

### Step 2: Initial Actions
```bash
# Check application health
curl https://your-domain.com/api/health

# Check Sentry for errors
# Visit: https://sentry.io/organizations/your-org/issues/

# Check Vercel logs
vercel logs --follow

# Check database status
psql $DATABASE_URL -c "SELECT version();"
```

### Step 3: Communication
- P0/P1: Notify team immediately via Slack/SMS
- Update status page if public-facing
- Document timeline in incident report

### Step 4: Mitigation
- Roll back if recent deployment caused issue
- Apply hotfix if rollback not sufficient
- Scale resources if performance issue

---

## 🔄 Deployment Procedures

### Standard Deployment
```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Run pre-deployment checks
npm run verify

# 3. Run automated deploy script
./scripts/deploy.sh
```

### Rollback Procedure
```bash
# Via Vercel CLI
vercel rollback

# Or via Vercel Dashboard:
# 1. Go to project deployments
# 2. Find previous working deployment
# 3. Click "Promote to Production"
```

### Database Migration
```bash
# 1. Create migration
npx prisma migrate dev --name migration_name

# 2. Test in staging
DATABASE_URL="staging_url" npx prisma migrate deploy

# 3. Apply to production (uses backup script)
./scripts/migrate.sh
```

---

## 📊 Monitoring

### Health Checks
```bash
# Application health
curl https://your-domain.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": { "database": "ok" },
#   "timestamp": "..."
# }
```

### Performance Monitoring
- **Vercel Analytics**: Check Core Web Vitals
- **Sentry Performance**: Review slow transactions
- **Database**: Check query performance in logs

### Key Metrics to Monitor
- Response time (target: <500ms P95)
- Error rate (target: <0.1%)
- Database connection pool usage
- Memory usage
- CPU usage

---

## 🗄️ Database Operations

### Backup
```bash
# Manual backup
./scripts/backup.sh

# Set up automated daily backups (cron)
# Add to crontab -e:
# 0 2 * * * /path/to/fieldinspect/scripts/backup.sh
```

### Restore from Backup
```bash
# 1. List available backups
ls -lh backups/

# 2. Restore (CAUTION: This will overwrite current data)
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Job\";"
```

### Database Maintenance
```bash
# Vacuum (reclaim space)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check table sizes
psql $DATABASE_URL -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

---

## 🔐 Security Incidents

### Suspected Data Breach
1. **Immediate**: Rotate all API keys and secrets
2. Enable extra logging
3. Review Sentry error logs for unusual patterns
4. Check database access logs
5. Notify affected users if confirmed

### Suspicious Activity
```bash
# Check recent database modifications
psql $DATABASE_URL -c "
SELECT * FROM \"Job\"
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
"

# Review authentication logs (check Sentry)
# Look for failed login attempts, unusual access patterns
```

---

## 📈 Scaling

### Vertical Scaling (Vercel)
- Upgrade Vercel plan for more resources
- Configure in `vercel.json`

### Database Scaling
```bash
# Enable connection pooling (PgBouncer recommended)
# Update DATABASE_URL to use pooler

# For managed databases (e.g., Neon, Supabase):
# - Increase database size via dashboard
# - Enable read replicas if needed
```

---

## 🔍 Debug Common Issues

### "Database connection failed"
```bash
# 1. Check DATABASE_URL
echo $DATABASE_URL

# 2. Test connection
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check connection pool
# Look for: "too many connections" error
# Solution: Implement connection pooling or increase max connections
```

### "Build failing"
```bash
# 1. Check build logs
vercel logs

# 2. Run build locally
npm run build

# 3. Check environment variables
# Ensure all required vars are set in Vercel dashboard
```

### "Slow performance"
```bash
# 1. Check database query times
# Review slow query logs

# 2. Check Sentry Performance tab
# Identify slow transactions

# 3. Check bundle size
npm run build
# Review output for large bundles
```

---

## 📞 On-Call Procedures

### Escalation Path
1. On-call developer (primary)
2. Team lead (if no response in 15min)
3. Engineering manager (if no response in 30min)

### After Hours Protocol
- P0/P1: Wake up on-call immediately
- P2: Can wait until business hours
- P3: Create ticket for next sprint

---

## 🛠️ Useful Commands

```bash
# Check production environment variables
vercel env ls

# View real-time logs
vercel logs --follow

# Run database query
psql $DATABASE_URL -c "YOUR_QUERY_HERE"

# Generate Prisma client
npx prisma generate

# View deployment history
vercel list

# Check disk usage
du -sh public/uploads/

# Clear uploaded files older than 90 days
find public/uploads/ -mtime +90 -type f -delete
```

---

## 📋 Post-Incident Review

After resolving any P0/P1 incident:

1. **Timeline**: Document what happened and when
2. **Root Cause**: Identify why it happened
3. **Impact**: Measure user/business impact
4. **Actions**: List action items to prevent recurrence
5. **Follow-up**: Schedule review meeting

Template: `docs/incidents/YYYY-MM-DD-incident-name.md`

---

**Last Updated**: 2025-11-23  
**On-Call Rotation**: See team calendar  
**Emergency Contact**: [Your emergency contact info]
