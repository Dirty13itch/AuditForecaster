# Production Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Configuration

**Required Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
PGHOST=[neon-host]
PGDATABASE=[database-name]
PGUSER=[username]
PGPASSWORD=[password]
PGPORT=5432

# Session Management
SESSION_SECRET=[generate-random-256-bit-key]

# Authentication (Replit Auth)
REPLIT_DOMAINS=[your-production-domain.com]
OIDC_ISSUER=https://replit.com/oidc

# Object Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=[bucket-id]
PUBLIC_OBJECT_SEARCH_PATHS=[public-path]
PRIVATE_OBJECT_DIR=[private-path]

# Google Calendar Integration (Optional)
GOOGLE_CLIENT_ID=[your-client-id]
GOOGLE_CLIENT_SECRET=[your-client-secret]

# Error Tracking (Optional)
SENTRY_DSN=[your-sentry-dsn]
VITE_SENTRY_DSN=[same-as-above]

# Application
NODE_ENV=production
PORT=5000
```

**Generate SESSION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Database Migration

```bash
# Verify database connection
psql "$DATABASE_URL" -c "SELECT 1"

# Push schema to production database
npm run db:push

# Verify indexes are created
psql "$DATABASE_URL" -c "\di"

# Expected indexes:
# - idx_jobs_builder_id
# - idx_jobs_scheduled_date
# - idx_jobs_status_scheduled_date
# - idx_schedule_events_job_id_start_time
# - idx_schedule_events_google_event_id
# - idx_photos_job_id_uploaded_at
# - idx_photos_hash
# - idx_expenses_job_id
# - idx_expenses_date
# - idx_checklist_items_job_id
# - idx_checklist_items_status
# - idx_report_instances_job_id
# - idx_forecasts_job_id
# - idx_google_events_calendar_event
# - idx_google_events_is_converted
# - idx_google_events_start_time
```

### 3. Security Verification

**CSRF Protection**
```bash
# Verify CSRF middleware is active
grep "CSRF Protection initialized" server/index.ts
```

**Rate Limiting**
```bash
# Verify rate limiters are configured
# Auth endpoints: 5 requests per 15 minutes
# API endpoints: 100 requests per minute
grep "express-rate-limit" server/index.ts
```

**Helmet Security Headers**
```bash
# Verify Helmet is enabled in production
# Check server/index.ts for helmet middleware
```

### 4. Build & Test

```bash
# Install production dependencies
npm ci --production=false

# Run type checking
npx tsc --noEmit

# Build frontend
npm run build

# Test production build locally
NODE_ENV=production npm start

# Verify health endpoint
curl http://localhost:5000/api/status
# Expected: {"status":"ok","database":"connected","timestamp":"..."}
```

## Deployment Steps

### Step 1: Pre-Deployment Backup

```bash
# Create Neon branch before deployment
# Via Neon Console: Branches > New Branch
# Name: "pre-deploy-YYYY-MM-DD"
# Keep for 7 days

# Document current state
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM jobs"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM photos"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM schedule_events"
```

### Step 2: Deploy Application

**Replit Deployment**
```bash
# Deployment happens automatically on Replit
# Verify deployment via Replit Console

# Or use Replit CLI
replit deploy
```

**Manual Deployment (VPS/Cloud)**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Restart application (using PM2)
pm2 restart energy-audit-app

# Or using systemd
sudo systemctl restart energy-audit-app
```

### Step 3: Post-Deployment Verification

**Health Checks** (Run within 5 minutes of deployment)
```bash
# 1. Application health
curl https://[your-domain]/api/status

# 2. Database connectivity
curl https://[your-domain]/api/auth/user
# Should return 401 if not authenticated (good!)

# 3. Frontend loads
curl -I https://[your-domain]
# Should return 200 OK

# 4. Static assets
curl -I https://[your-domain]/assets/index-*.js
# Should return 200 OK
```

**Functional Tests**
```bash
# 1. Authentication flow
# - Navigate to homepage
# - Click "Login with Replit"
# - Verify redirect to dashboard

# 2. Create test job
# - Go to Jobs page
# - Click "New Job"
# - Fill required fields
# - Verify job appears in list

# 3. Google Calendar sync (if enabled)
# - Go to Schedule page
# - Verify calendar events load
# - Try dragging event
# - Verify no errors in browser console
```

### Step 4: Monitor Initial Traffic

**First 1 Hour**
```bash
# Watch application logs
tail -f logs/app.log

# Monitor error rate
grep "ERROR" logs/app.log | wc -l
# Should be 0

# Check response times
grep "GET /api" logs/app.log | awk '{print $NF}' | sort -n
# Should be < 500ms for most requests

# Monitor database connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '[database-name]'"
# Should be < 20 for light traffic
```

## Rollback Procedure

### When to Rollback

- Critical bugs affecting > 10% of users
- Database corruption or data loss
- Authentication completely broken
- Application crashes on startup

### Rollback Steps

**Option 1: Code Rollback**
```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert to previous version
git revert [commit-hash]
git push origin main

# 3. Redeploy
# Replit: Automatic on push
# Manual: pm2 restart energy-audit-app

# 4. Verify application
curl https://[your-domain]/api/status
```

**Option 2: Database Rollback**
```bash
# 1. Stop write operations
# Set application to maintenance mode if available

# 2. Create recovery branch in Neon Console
# From timestamp: [before-deployment-time]

# 3. Update DATABASE_URL environment variable
# For Replit: Update via Secrets pane
# For manual deployment:
export DATABASE_URL="[recovery-branch-url]"

# 4. Restart application
# Replit: Automatic on environment change
# PM2: pm2 restart energy-audit-app
# Systemd: sudo systemctl restart energy-audit-app

# 5. Test critical features
# Verify jobs, photos, schedule events

# 6. If verified, promote branch to main
# Via Neon Console: Set as Primary
```

## Monitoring Setup

### Application Monitoring

**Key Metrics to Track**
1. **Response Time**: Average < 300ms, P95 < 1s
2. **Error Rate**: < 0.1% of requests
3. **Database Query Time**: Average < 100ms
4. **Memory Usage**: < 512MB for typical workload
5. **CPU Usage**: < 50% average

**Recommended Tools**
- **Sentry**: Error tracking and performance monitoring (if configured)
- **Neon Console**: Database performance metrics
- **Replit Analytics**: Traffic and uptime monitoring

### Alert Configuration

**Critical Alerts** (Immediate Response)
- Application down (health check fails)
- Database unreachable
- Error rate > 5%
- Memory usage > 90%

**Warning Alerts** (Review within 1 hour)
- Response time P95 > 2s
- Error rate > 1%
- Database connections > 50
- Disk usage > 80%

## Post-Deployment Tasks

### Day 1
- [ ] Monitor error logs every hour
- [ ] Verify all integrations (Google Calendar, Object Storage)
- [ ] Test mobile experience on Samsung Galaxy S23 Ultra
- [ ] Check browser console for errors
- [ ] Verify backup system running

### Week 1
- [ ] Review Sentry error reports (if configured)
- [ ] Analyze slow query logs in Neon Console
- [ ] Verify all cron jobs running (calendar sync)
- [ ] Test disaster recovery procedure
- [ ] Document any issues encountered

### Month 1
- [ ] Review performance metrics
- [ ] Optimize slow queries if any
- [ ] Plan scaling strategy if needed
- [ ] Update documentation based on learnings

## Security Hardening

### SSL/TLS Configuration
```bash
# Verify HTTPS is enforced
curl -I http://[your-domain]
# Should redirect to https://

# Check SSL certificate
openssl s_client -connect [your-domain]:443 -servername [your-domain]
# Verify certificate is valid
```

### CORS Configuration
```bash
# Verify CORS headers
curl -I https://[your-domain]/api/status
# Should include:
# Access-Control-Allow-Origin: [your-domain]
```

### Rate Limiting Verification
```bash
# Test auth endpoint rate limit (5 per 15 min)
for i in {1..6}; do
  curl -X POST https://[your-domain]/api/login
done
# 6th request should return 429 Too Many Requests

# Test API rate limit (100 per minute)
# Should handle normal traffic without issues
```

## Performance Optimization

### Database Optimization
```bash
# Run ANALYZE after deployment
psql "$DATABASE_URL" -c "ANALYZE"

# Verify query plans use indexes
psql "$DATABASE_URL" -c "EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'scheduled' ORDER BY scheduled_date LIMIT 20"
# Should show "Index Scan using idx_jobs_status_scheduled_date"
```

### Frontend Optimization
```bash
# Verify bundle size
npm run build
# Look for output: dist/assets/index-[hash].js
# Should be < 500KB gzipped

# Check Lighthouse score
npx lighthouse https://[your-domain] --view
# Target: Performance > 90, Accessibility > 95
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
tail -100 logs/app.log

# Common issues:
# 1. Missing environment variable
# 2. Database connection failed
# 3. Port already in use

# Verify environment
env | grep -E "(DATABASE_URL|SESSION_SECRET|NODE_ENV)"
```

### Database Connection Issues
```bash
# Test direct connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check Neon status
curl https://status.neon.tech/api/v2/status.json

# Verify connection string format
echo $DATABASE_URL | grep -E "postgresql://.*@.*/"
```

### High Memory Usage
```bash
# Check memory usage
free -h

# Restart application
pm2 restart energy-audit-app --update-env

# If issue persists, check for memory leaks
node --inspect server/index.ts
# Use Chrome DevTools to profile
```

## Maintenance Windows

### Recommended Schedule
- **Database maintenance**: Sundays 2-4 AM (low traffic)
- **Application updates**: Wednesdays 10-11 PM
- **Recovery drills**: Last Sunday of month

### During Maintenance
```bash
# 1. Notify users (if applicable)
# 2. Create pre-maintenance backup
# 3. Perform update
# 4. Run health checks
# 5. Monitor for 30 minutes
# 6. Document changes
```

## Emergency Contacts

- **Replit Support**: https://replit.com/support
- **Neon Support**: https://neon.tech/docs/introduction/support
- **Google API Support**: https://console.cloud.google.com/support

## Summary Checklist

**Before Deployment**
- [ ] All environment variables configured
- [ ] Database schema migrated
- [ ] Security features verified
- [ ] Application builds successfully
- [ ] Health checks passing

**During Deployment**
- [ ] Pre-deployment backup created
- [ ] Application deployed
- [ ] Health checks verified
- [ ] Functional tests passed

**After Deployment**
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Performance metrics baseline established
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

**Within 24 Hours**
- [ ] All critical features verified
- [ ] Error logs reviewed
- [ ] Performance acceptable
- [ ] Users notified if needed
- [ ] Documentation updated

---

**Last Updated**: October 2025  
**Next Review**: Monthly or after major changes
