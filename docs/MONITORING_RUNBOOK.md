# Monitoring & Alerting Runbook
## Energy Auditing Application

**Last Updated:** October 30, 2025  
**Owner:** Platform Team  
**On-Call Contacts:** See [On-Call Schedule](#on-call-schedule)

---

## Table of Contents

1. [Overview](#overview)
2. [Alert List](#alert-list)
3. [Response Procedures](#response-procedures)
4. [Alert Management](#alert-management)
5. [Testing Alerts](#testing-alerts)
6. [Escalation](#escalation)
7. [Configuration](#configuration)

---

## Overview

This runbook provides operational procedures for responding to monitoring alerts in the Energy Auditing Application. All alerts are configured in Prometheus and visualized in Grafana dashboards.

### Alert Severity Levels

- **🔴 Critical**: Immediate response required. Service degradation or outage affecting users.
- **🟡 Warning**: Action required within business hours. Potential issues that may escalate.
- **🔵 Info**: Informational alerts for awareness. No immediate action required.

### Monitoring Stack

- **Prometheus**: Metrics collection and alerting engine
- **Grafana**: Visualization and dashboard platform
- **Alertmanager**: Alert routing and notification delivery
- **Sentry**: Error tracking and performance monitoring
- **Winston**: Structured application logging

---

## Alert List

### API Alerts

#### HighErrorRate
- **Severity:** 🔴 Critical
- **Condition:** HTTP 5xx error rate > 1% over 5 minutes
- **Impact:** Users experiencing server errors affecting application availability
- **Dashboard:** [API Overview](https://grafana.example.com/d/energy-audit-api-overview)

**PromQL Expression:**
```promql
(
  rate(http_requests_total{status_code=~"5.."}[5m]) 
  / 
  rate(http_requests_total[5m])
) > 0.01
```

**Response Procedure:** [High Error Rate Response](#high-error-rate)

---

#### HighAPILatency
- **Severity:** 🟡 Warning
- **Condition:** P95 API latency > 500ms over 5 minutes
- **Impact:** Degraded user experience with slow page loads
- **Dashboard:** [API Overview](https://grafana.example.com/d/energy-audit-api-overview)

**PromQL Expression:**
```promql
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
) > 0.5
```

**Response Procedure:** [High Latency Response](#high-api-latency)

---

### Database Alerts

#### DatabaseConnectionFailures
- **Severity:** 🔴 Critical
- **Condition:** Any database connection errors in last 5 minutes
- **Impact:** Application cannot persist or retrieve data
- **Dashboard:** [System Health](https://grafana.example.com/d/energy-audit-system-health)

**PromQL Expression:**
```promql
increase(db_connection_errors_total[5m]) > 0
```

**Response Procedure:** [Database Connection Failures Response](#database-connection-failures)

---

### System Alerts

#### HighMemoryUsage
- **Severity:** 🟡 Warning
- **Condition:** Node.js process memory > 800MB (80% of 1GB limit)
- **Impact:** Risk of OOM errors and application crashes
- **Dashboard:** [System Health](https://grafana.example.com/d/energy-audit-system-health)

**PromQL Expression:**
```promql
(process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.8
```

**Response Procedure:** [High Memory Usage Response](#high-memory-usage)

---

#### HighCPUUsage
- **Severity:** 🟡 Warning
- **Condition:** CPU usage > 90% over 10 minutes
- **Impact:** Slow response times and potential request timeouts
- **Dashboard:** [System Health](https://grafana.example.com/d/energy-audit-system-health)

**PromQL Expression:**
```promql
rate(process_cpu_user_seconds_total[5m]) > 0.9
```

**Response Procedure:** [High CPU Usage Response](#high-cpu-usage)

---

#### EventLoopBlocked
- **Severity:** 🔴 Critical
- **Condition:** Event loop lag P95 > 100ms for 5 minutes
- **Impact:** Severe performance degradation, request timeouts
- **Dashboard:** [System Health](https://grafana.example.com/d/energy-audit-system-health)

**PromQL Expression:**
```promql
nodejs_eventloop_lag_p95_seconds > 0.1
```

**Response Procedure:** [Event Loop Blocked Response](#event-loop-blocked)

---

### Business Alerts

#### LowJobCompletionRate
- **Severity:** 🟡 Warning
- **Condition:** Job completion rate < 50% over 2 hours
- **Impact:** Field inspectors unable to complete work, revenue impact
- **Dashboard:** [Business Metrics](https://grafana.example.com/d/energy-audit-business-metrics)

**PromQL Expression:**
```promql
(
  rate(jobs_completed_total[1h]) 
  / 
  rate(jobs_created_total[1h])
) < 0.5
```

**Response Procedure:** [Low Job Completion Response](#low-job-completion-rate)

---

#### NoJobsCreatedRecently
- **Severity:** 🟡 Warning
- **Condition:** Zero jobs created in last 2 hours
- **Impact:** No new work being scheduled, potential business interruption
- **Dashboard:** [Business Metrics](https://grafana.example.com/d/energy-audit-business-metrics)

**PromQL Expression:**
```promql
increase(jobs_created_total[1h]) == 0
```

**Response Procedure:** [No Jobs Created Response](#no-jobs-created-recently)

---

## Response Procedures

### High Error Rate

**Symptoms:**
- High rate of HTTP 5xx errors
- User reports of application failures
- Sentry showing spike in server errors

**Immediate Actions:**
1. **Check Grafana API Overview Dashboard**
   - Identify which endpoints are failing
   - Review error rate by route and status code

2. **Review Logs**
   ```bash
   # Check recent error logs
   tail -f logs/error.log
   
   # Filter for 500-level errors
   grep "500\|502\|503\|504" logs/combined.log | tail -100
   ```

3. **Check Sentry**
   - Review error details and stack traces
   - Identify error patterns and affected routes

**Root Cause Investigation:**
- Database connectivity issues?
- External API failures (Google Calendar, SendGrid)?
- Code deployment causing new bugs?
- Infrastructure issues (memory, disk space)?

**Resolution Steps:**
1. If recent deployment: Consider rollback
2. If database issue: Follow [Database Connection Failures](#database-connection-failures)
3. If external API issue: Check service status pages, implement circuit breaker
4. If code bug: Apply hotfix or rollback

**Post-Incident:**
- Document root cause in incident report
- Update error handling and monitoring
- Schedule post-mortem if impact was significant

---

### High API Latency

**Symptoms:**
- Slow page loads reported by users
- P95 latency consistently above 500ms
- Database query duration increasing

**Immediate Actions:**
1. **Check Slowest Endpoints**
   - Review "Top 5 Slowest Endpoints" panel in API Overview dashboard
   - Identify which routes have highest latency

2. **Review Database Performance**
   ```bash
   # Check database query duration
   # Look at System Health dashboard - Database Query Duration panel
   ```

3. **Check System Resources**
   - CPU usage elevated?
   - Memory pressure causing GC pauses?
   - Event loop lag detected?

**Root Cause Investigation:**
- Expensive database queries without indexes?
- N+1 query problems?
- Large file uploads blocking event loop?
- External API calls not properly async?

**Resolution Steps:**
1. **Optimize slow queries**
   ```bash
   # Review slow query logs
   # Add database indexes if needed
   npm run db:optimize
   ```

2. **Scale resources if needed**
   - Add more memory if GC pauses detected
   - Scale horizontally if CPU-bound

3. **Implement caching**
   - Add Redis caching for frequent queries
   - Enable HTTP caching headers

**Post-Incident:**
- Add performance tests for slow endpoints
- Set up query performance monitoring
- Document optimization strategies

---

### Database Connection Failures

**Symptoms:**
- Unable to connect to database
- Connection pool exhausted
- Timeout errors in logs

**Immediate Actions:**
1. **Check Database Status**
   ```bash
   # Verify database is accessible
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check connection count
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

2. **Review Connection Pool**
   - Check active connections in Grafana
   - Look for connection leaks (connections not released)

3. **Check Database Logs**
   ```bash
   # Review Neon database logs in dashboard
   # Look for connection errors, max connection exceeded
   ```

**Root Cause Investigation:**
- Database server down or restarting?
- Connection pool exhausted?
- Network connectivity issues?
- Database authentication failed?
- Max connections limit reached?

**Resolution Steps:**
1. **If database is down:**
   - Check Neon status page
   - Contact Neon support if production database
   - Restart development database if local issue

2. **If connection pool exhausted:**
   ```bash
   # Restart application to release connections
   pm2 restart energy-audit-api
   
   # Or increase pool size in configuration
   # Edit drizzle.config.ts or db connection settings
   ```

3. **If max connections reached:**
   - Identify and terminate idle connections
   - Optimize connection usage in code
   - Scale database plan if needed

**Post-Incident:**
- Review connection pool configuration
- Add connection leak detection
- Implement connection retry logic

---

### High Memory Usage

**Symptoms:**
- Memory usage consistently above 800MB
- Slow garbage collection pauses
- Out of Memory (OOM) errors

**Immediate Actions:**
1. **Check Memory Dashboard**
   - Review resident and heap memory trends
   - Identify if memory is growing over time (leak) or stable (high baseline)

2. **Generate Heap Snapshot**
   ```bash
   # Take heap snapshot for analysis
   kill -USR2 $(pgrep -f "node.*server")
   
   # Analyze with Chrome DevTools or heapdump
   node --inspect server/index.ts
   ```

3. **Review Recent Changes**
   - Recent deployments that might introduce leaks?
   - New features processing large datasets?

**Root Cause Investigation:**
- Memory leak in application code?
- Large file uploads held in memory?
- Unbounded caching without eviction?
- Too many concurrent requests?

**Resolution Steps:**
1. **Immediate relief:**
   ```bash
   # Restart application to free memory
   pm2 restart energy-audit-api
   ```

2. **Find memory leaks:**
   - Use heap snapshots to compare memory before/after operations
   - Look for detached DOM nodes, unclosed connections
   - Review event listener registrations

3. **Optimize memory usage:**
   - Stream large files instead of buffering
   - Implement cache eviction policies
   - Reduce concurrent request limits

**Post-Incident:**
- Add heap monitoring and alerts
- Implement automatic heap snapshots on high memory
- Schedule regular memory profiling

---

### High CPU Usage

**Symptoms:**
- CPU usage consistently above 90%
- Slow response times
- Server feels unresponsive

**Immediate Actions:**
1. **Check CPU Dashboard**
   - Review CPU usage trends in System Health
   - Correlate with request rate increases

2. **Profile Application**
   ```bash
   # CPU profiling with clinic.js
   npx clinic doctor -- node server/index.ts
   
   # Or use Node.js built-in profiler
   node --prof server/index.ts
   node --prof-process isolate-*.log > cpu-profile.txt
   ```

3. **Check for Runaway Processes**
   ```bash
   # Check process CPU usage
   top -p $(pgrep -f "node.*server")
   ```

**Root Cause Investigation:**
- CPU-intensive operations (image processing, PDF generation)?
- Inefficient algorithms or loops?
- Too many concurrent requests?
- Crypto operations blocking event loop?

**Resolution Steps:**
1. **Offload CPU-intensive work:**
   - Move to background jobs (Bull queue)
   - Use worker threads for parallel processing
   - Defer non-critical operations

2. **Optimize hot code paths:**
   - Profile and optimize slow functions
   - Use caching to avoid repeated calculations
   - Implement debouncing/throttling

3. **Scale horizontally:**
   - Add more application instances
   - Use load balancing

**Post-Incident:**
- Add CPU profiling to CI/CD pipeline
- Set up performance budgets
- Document CPU-intensive operations

---

### Event Loop Blocked

**Symptoms:**
- Severe latency spikes
- Request timeouts
- Application appears frozen

**Immediate Actions:**
1. **Check Event Loop Lag**
   - Review Event Loop Lag panel in System Health
   - Identify lag patterns (constant vs. spikes)

2. **Review Recent Operations**
   - Large synchronous file operations?
   - Heavy computation without yielding?
   - Blocking database queries?

3. **Enable Debugging**
   ```bash
   # Use blocked-at to find blocking code
   npm install blocked-at
   # Add to server code: require('blocked-at')((time) => console.log(`Blocked for ${time}ms`))
   ```

**Root Cause Investigation:**
- Synchronous file I/O?
- Heavy JSON parsing (large payloads)?
- Synchronous crypto operations?
- Tight loops without setImmediate?

**Resolution Steps:**
1. **Identify blocking code:**
   - Use `blocked-at` or `blocked` npm packages
   - Review profiling data for long-running functions

2. **Make operations async:**
   ```javascript
   // Bad: Synchronous
   const data = fs.readFileSync('large-file.json');
   
   // Good: Asynchronous
   const data = await fs.promises.readFile('large-file.json');
   ```

3. **Use worker threads:**
   ```javascript
   // Offload heavy computation
   const { Worker } = require('worker_threads');
   const worker = new Worker('./heavy-computation.js');
   ```

**Post-Incident:**
- Add event loop lag monitoring in development
- Code review for synchronous operations
- Implement pre-commit hooks to detect blocking code

---

### Low Job Completion Rate

**Symptoms:**
- Jobs created but not completed
- Inspection backlog growing
- Field inspector complaints

**Immediate Actions:**
1. **Check Business Metrics Dashboard**
   - Review job creation vs. completion rates
   - Identify which inspection types are affected

2. **Review Job Status Distribution**
   ```sql
   SELECT status, COUNT(*) 
   FROM jobs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

3. **Check Error Logs**
   - Look for job processing errors
   - Review failed job completion attempts

**Root Cause Investigation:**
- Bug preventing job completion?
- Required fields missing in forms?
- Photo upload failures?
- Validation errors blocking completion?

**Resolution Steps:**
1. **Identify stuck jobs:**
   ```sql
   -- Find jobs in progress > 24 hours
   SELECT * FROM jobs 
   WHERE status = 'in_progress' 
   AND updated_at < NOW() - INTERVAL '24 hours';
   ```

2. **Fix validation issues:**
   - Review form validation logic
   - Check for overly strict requirements
   - Improve error messages for users

3. **Support field inspectors:**
   - Provide guidance on completing stuck jobs
   - Manually update jobs if necessary
   - Communicate known issues

**Post-Incident:**
- Add monitoring for jobs stuck in specific states
- Improve form validation feedback
- Create job completion troubleshooting guide

---

### No Jobs Created Recently

**Symptoms:**
- Zero new jobs in 2+ hours during business hours
- Silent failure in job creation workflow
- No user reports (may be unaware)

**Immediate Actions:**
1. **Verify Alert Validity**
   - Is it actually business hours?
   - Holiday or planned downtime?
   - Expected low activity period?

2. **Test Job Creation**
   ```bash
   # Manual test via API
   curl -X POST https://app.example.com/api/jobs \
     -H "Content-Type: application/json" \
     -d '{"address": "123 Test St", "inspection_type": "blower_door"}'
   ```

3. **Check Error Logs**
   - Look for form submission errors
   - Database connection issues?
   - Authentication problems?

**Root Cause Investigation:**
- UI bug preventing job creation?
- API endpoint failing silently?
- Permission/authentication issue?
- Database constraint violation?

**Resolution Steps:**
1. **If UI issue:**
   - Test job creation form in production
   - Check browser console for errors
   - Verify all required fields are accessible

2. **If API issue:**
   - Review API logs and error tracking
   - Test endpoint manually
   - Check database constraints

3. **Communication:**
   - Notify users if issue confirmed
   - Provide workaround if available
   - Set ETA for fix

**Post-Incident:**
- Add synthetic monitoring for critical workflows
- Implement canary testing for deployments
- Set up user activity monitoring

---

## Alert Management

### Silencing Alerts During Maintenance

Use Prometheus Alertmanager to silence alerts during planned maintenance:

```bash
# Silence all alerts for 2 hours
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="DevOps Team" \
  --comment="Planned maintenance window" \
  --duration=2h \
  severity=~".+"

# Silence specific alert
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="DevOps Team" \
  --comment="Database migration in progress" \
  alertname="DatabaseConnectionFailures" \
  --duration=30m

# List active silences
amtool silence query --alertmanager.url=http://alertmanager:9093

# Expire a silence early
amtool silence expire <silence-id> --alertmanager.url=http://alertmanager:9093
```

### Modifying Alert Thresholds

Alert thresholds are defined in `monitoring/prometheus/alerts.yml`.

**To modify an alert:**

1. Edit the alert file:
   ```bash
   vim monitoring/prometheus/alerts.yml
   ```

2. Modify the threshold in the PromQL expression:
   ```yaml
   # Before
   expr: (process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.8
   
   # After (increase to 90%)
   expr: (process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.9
   ```

3. Reload Prometheus configuration:
   ```bash
   # Send SIGHUP to Prometheus process
   kill -HUP $(pgrep prometheus)
   
   # Or use API
   curl -X POST http://localhost:9090/-/reload
   ```

4. Verify changes:
   - Check Prometheus UI → Alerts
   - Ensure alert shows with new threshold

### Disabling Alerts Temporarily

To disable an alert without removing it:

```yaml
# Add 'enabled: false' to alert rule
- alert: HighMemoryUsage
  enabled: false  # ← Disables this alert
  expr: (process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.8
```

Or comment out the entire alert:

```yaml
# - alert: HighMemoryUsage
#   expr: (process_resident_memory_bytes / 1024 / 1024 / 1024) > 0.8
#   for: 10m
#   labels:
#     severity: warning
```

---

## Testing Alerts

### Manual Alert Testing

Use the provided test script to trigger alerts:

```bash
# Run all alert tests
./monitoring/test-alerts.sh

# Test specific alert
./monitoring/test-alerts.sh high-memory

# Available tests:
# - high-error-rate
# - high-latency
# - db-connection-failures
# - high-memory
# - high-cpu
# - event-loop-blocked
```

### Verifying Alerts Fire

1. **Check Prometheus Alerts UI**
   - Navigate to http://localhost:9090/alerts
   - Verify alert appears in "Firing" state
   - Check alert labels and annotations

2. **Check Grafana Dashboards**
   - Open relevant dashboard
   - Look for alert panel showing threshold breach
   - Verify alert icon appears on panels

3. **Check Notification Channels**
   - Verify Slack message received (if configured)
   - Check email inbox for alert notification
   - Review console logs for webhook calls

### Alert Testing Checklist

Before deploying new alerts:

- [ ] Alert expression is correct and validated
- [ ] Threshold is appropriate for application SLA
- [ ] Alert fires within expected time window (`for` duration)
- [ ] Alert annotations include useful information
- [ ] Alert routes to correct notification channel
- [ ] Alert doesn't create excessive noise (flapping)
- [ ] Runbook procedure exists for alert
- [ ] Alert can be resolved (not stuck in firing state)

---

## Escalation

### On-Call Schedule

| Day | Primary On-Call | Secondary On-Call | Platform Lead |
|-----|----------------|-------------------|---------------|
| Mon-Fri | TBD | TBD | TBD |
| Sat-Sun | TBD | TBD | TBD |

**Primary Contact Methods:**
- Slack: `#alerts-critical` channel
- PagerDuty: [Configure PagerDuty integration]
- Email: `oncall@example.com` (monitored 24/7)
- Phone: TBD (critical alerts only)

### Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|--------------|-----------------|
| 🔴 Critical | < 15 minutes | Primary → Secondary → Platform Lead → CTO |
| 🟡 Warning | < 4 hours (business hours) | Primary → Platform Lead |
| 🔵 Info | Next business day | Review in daily standup |

### Incident Severity Definitions

**SEV-1 (Critical):**
- Complete service outage
- Data loss or corruption
- Security breach
- Response: Immediate, all hands on deck

**SEV-2 (High):**
- Partial service degradation
- Workaround available
- Affecting subset of users
- Response: Within 1 hour

**SEV-3 (Medium):**
- Minor functionality impaired
- No user impact or workaround exists
- Response: Within 4 hours (business hours)

**SEV-4 (Low):**
- Cosmetic issues
- No user impact
- Response: Next sprint

---

## Configuration

### Prometheus Configuration

**Location:** `monitoring/prometheus/alerts.yml`

**Reload configuration:**
```bash
curl -X POST http://localhost:9090/-/reload
```

### Grafana Notification Channels

**Location:** `monitoring/grafana/provisioning/notifiers.yml`

**Required Environment Variables:**
```bash
# Slack Integration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Email Configuration
export ONCALL_EMAIL_ADDRESSES="oncall@example.com,team@example.com"
export PLATFORM_TEAM_EMAIL="platform-team@example.com"
export EMAIL_PASSWORD="your-smtp-password"

# Optional: Custom SMTP settings
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="alerts@example.com"
```

**Testing notification channels:**
```bash
# Send test alert via Grafana API
curl -X POST http://localhost:3001/api/alerts/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "dashboardId": 1,
    "panelId": 1,
    "state": "alerting"
  }'
```

### Alert Webhook Endpoint

The application includes a webhook endpoint for receiving alerts:

**Endpoint:** `POST /api/alert-webhook`

**Payload:**
```json
{
  "status": "firing",
  "labels": {
    "alertname": "HighErrorRate",
    "severity": "critical"
  },
  "annotations": {
    "summary": "High HTTP error rate detected",
    "description": "Error rate is 2.5%"
  },
  "startsAt": "2025-10-30T10:00:00Z"
}
```

**Implementation:**
- Logs alerts to Winston logger
- Can be extended to trigger custom actions
- Useful for development testing

---

## Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Review alert firing frequency
- [ ] Check for flapping alerts (firing/resolving repeatedly)
- [ ] Verify notification channels are working
- [ ] Review false positive rate

**Monthly:**
- [ ] Audit alert thresholds for accuracy
- [ ] Update runbook procedures based on incidents
- [ ] Review alert coverage for new features
- [ ] Test alert notification delivery

**Quarterly:**
- [ ] Comprehensive alert system review
- [ ] Update on-call schedule
- [ ] Review and archive old silences
- [ ] Conduct alert fire drills

### Documentation Updates

When modifying alerts:

1. Update this runbook with new procedures
2. Update alert annotations in `alerts.yml`
3. Document changes in incident log
4. Communicate changes to team

### Useful Links

- **Grafana Dashboards:** http://localhost:3001
- **Prometheus UI:** http://localhost:9090
- **Alertmanager UI:** http://localhost:9093
- **Application Logs:** `logs/combined.log`, `logs/error.log`
- **Sentry Dashboard:** [Configure Sentry URL]
- **Database Dashboard:** [Neon Dashboard URL]

---

## Appendix

### Common PromQL Queries

**Error rate calculation:**
```promql
rate(http_requests_total{status_code=~"5.."}[5m]) 
/ 
rate(http_requests_total[5m])
```

**Latency percentiles:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Memory usage percentage:**
```promql
(process_resident_memory_bytes / 1024 / 1024 / 1024) / 1 * 100
```

**Request rate by endpoint:**
```promql
sum(rate(http_requests_total[5m])) by (route)
```

### Grafana Query Tricks

**Show only firing alerts:**
```promql
ALERTS{alertstate="firing"}
```

**Alert duration:**
```promql
time() - ALERTS_FOR_STATE{alertstate="firing"}
```

### Contact Information

**Platform Team:**
- Slack: `#platform-team`
- Email: `platform@example.com`

**DevOps Team:**
- Slack: `#devops`
- Email: `devops@example.com`

**Emergency:**
- On-call phone: TBD
- Incident commander: TBD

---

**Document Version:** 1.0  
**Last Review:** October 30, 2025  
**Next Review:** January 30, 2026
