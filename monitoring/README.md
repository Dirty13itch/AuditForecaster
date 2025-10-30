# Monitoring & Alerting Infrastructure
## Energy Auditing Application - Phase 4 Complete ✅

This directory contains production-grade monitoring and alerting configuration for the Energy Auditing Application.

## 📁 Directory Structure

```
monitoring/
├── prometheus/
│   └── alerts.yml              # Prometheus alerting rules (8 alerts)
├── grafana/
│   └── provisioning/
│       └── notifiers.yml       # Grafana notification channels
├── test-alerts.sh              # Alert testing script (executable)
└── README.md                   # This file

grafana/dashboards/             # Updated with alert panels
├── api-overview.json           # +2 alert visualization panels
├── business-metrics.json
└── system-health.json          # +2 alert visualization panels

docs/
└── MONITORING_RUNBOOK.md       # Operational runbook (24KB)
```

## 🚨 Configured Alerts

### Critical Alerts (Immediate Response)
1. **HighErrorRate** - HTTP 5xx error rate > 1% over 5 minutes
2. **DatabaseConnectionFailures** - Any DB connection errors in 5 minutes
3. **EventLoopBlocked** - Event loop lag P95 > 100ms

### Warning Alerts (Action Required)
4. **HighAPILatency** - P95 API latency > 500ms
5. **HighMemoryUsage** - Process memory > 800MB (80% of limit)
6. **HighCPUUsage** - CPU usage > 90% for 10 minutes
7. **LowJobCompletionRate** - Job completion rate < 50% over 2 hours
8. **NoJobsCreatedRecently** - Zero jobs created in 2 hours

## 📊 Dashboard Alert Panels

### API Overview Dashboard
- 🚨 HTTP 5xx Errors (5m) - Stat panel with thresholds
- 🚨 Avg Request Duration - Stat panel with latency thresholds

### System Health Dashboard
- 🚨 Memory Usage Alert - Gauge panel with 70%/80% thresholds
- 🚨 CPU Usage Alert - Gauge panel with 70%/90% thresholds

## 🔔 Notification Channels

Configured in `grafana/provisioning/notifiers.yml`:

### Production Channels
- **Slack (Critical)** - `#alerts-critical` channel
- **Slack (Warning)** - `#alerts-warnings` channel
- **Email (On-Call)** - Configured for on-call team
- **Email (Platform Team)** - Configured for platform team

### Development Fallback
- **Console Logger** - Webhook to `/api/alert-webhook` for development testing

## 🧪 Testing Alerts

Use the provided test script:

```bash
# Run all alert tests
./monitoring/test-alerts.sh

# Test specific alert
./monitoring/test-alerts.sh high-error-rate
./monitoring/test-alerts.sh high-latency
./monitoring/test-alerts.sh high-memory

# Verify all alerts are configured
./monitoring/test-alerts.sh verify

# Test notification channels
./monitoring/test-alerts.sh notifications

# Show help
./monitoring/test-alerts.sh --help
```

## ⚙️ Configuration

### Required Environment Variables

Before deploying to production, configure these environment variables:

```bash
# Slack Integration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Email Notifications
export ONCALL_EMAIL_ADDRESSES="oncall@example.com,team@example.com"
export PLATFORM_TEAM_EMAIL="platform-team@example.com"
export EMAIL_PASSWORD="your-smtp-password"

# Optional: Custom SMTP
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="alerts@example.com"
```

### Loading Prometheus Alerts

1. **Copy alerts to Prometheus:**
   ```bash
   cp monitoring/prometheus/alerts.yml /etc/prometheus/alerts.yml
   ```

2. **Update Prometheus config:**
   ```yaml
   # prometheus.yml
   rule_files:
     - "alerts.yml"
   ```

3. **Reload Prometheus:**
   ```bash
   curl -X POST http://localhost:9090/-/reload
   # Or: kill -HUP $(pgrep prometheus)
   ```

4. **Verify alerts loaded:**
   - Navigate to http://localhost:9090/alerts
   - All 8 alerts should appear in "Inactive" state

### Loading Grafana Notifications

1. **Copy notifiers config:**
   ```bash
   cp monitoring/grafana/provisioning/notifiers.yml \
      /etc/grafana/provisioning/alerting/notifiers.yml
   ```

2. **Set environment variables** (see above)

3. **Restart Grafana:**
   ```bash
   systemctl restart grafana-server
   # Or: docker-compose restart grafana
   ```

4. **Verify in Grafana UI:**
   - Navigate to Alerting → Contact Points
   - All notification channels should appear

## 📖 Operational Runbook

Comprehensive operational procedures are documented in:
**[docs/MONITORING_RUNBOOK.md](../docs/MONITORING_RUNBOOK.md)**

The runbook includes:
- ✅ Complete alert list with PromQL expressions
- ✅ Response procedures for each alert
- ✅ Escalation matrix and on-call schedule
- ✅ Alert management (silencing, thresholds, etc.)
- ✅ Testing procedures and verification
- ✅ Troubleshooting guides
- ✅ Contact information and useful links

## 🎯 Quick Start

### 1. Local Development Testing

```bash
# Start monitoring stack
cd grafana
docker-compose up -d

# Access dashboards
open http://localhost:3001  # Grafana (admin/admin)
open http://localhost:9090  # Prometheus

# Test alerts
cd ..
./monitoring/test-alerts.sh verify
```

### 2. Production Deployment

```bash
# Set environment variables
export SLACK_WEBHOOK_URL="..."
export ONCALL_EMAIL_ADDRESSES="..."

# Deploy Prometheus alerts
kubectl apply -f monitoring/prometheus/alerts.yml

# Deploy Grafana notifiers
kubectl apply -f monitoring/grafana/provisioning/notifiers.yml

# Verify deployment
./monitoring/test-alerts.sh verify
```

## 🔍 Monitoring the Monitors

### Health Checks

```bash
# Check Prometheus is scraping
curl http://localhost:9090/api/v1/targets

# Check Grafana health
curl http://localhost:3001/api/health

# Check app metrics endpoint
curl http://localhost:5000/metrics
```

### Alert Status

```bash
# View active alerts
curl http://localhost:9090/api/v1/alerts | jq

# View alert rules
curl http://localhost:9090/api/v1/rules | jq

# View silences
amtool silence query --alertmanager.url=http://localhost:9093
```

## 📈 Next Steps

### Phase 4 Complete ✅
- [x] Prometheus alerting rules configured (8 alerts)
- [x] Grafana notification channels configured
- [x] Dashboard alert panels added
- [x] Operational runbook documented
- [x] Alert testing script created

### Recommended Enhancements
- [ ] Add PagerDuty integration for critical alerts
- [ ] Implement alert auto-remediation for common issues
- [ ] Set up synthetic monitoring (Pingdom, Uptime Robot)
- [ ] Create custom alerting dashboard in Grafana
- [ ] Add alert history and metrics tracking
- [ ] Implement ChatOps integration (alert management via Slack)

## 🛠 Troubleshooting

### Alerts Not Firing

1. **Check Prometheus is scraping metrics:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. **Verify metrics are exposed:**
   ```bash
   curl http://localhost:5000/metrics | grep http_requests_total
   ```

3. **Check alert evaluation:**
   - Navigate to Prometheus UI → Alerts
   - Look for alerts in "Pending" state
   - Review "for" duration (some alerts have 5-10 minute delays)

### Notifications Not Sent

1. **Verify environment variables are set:**
   ```bash
   echo $SLACK_WEBHOOK_URL
   echo $ONCALL_EMAIL_ADDRESSES
   ```

2. **Test notification channels:**
   ```bash
   ./monitoring/test-alerts.sh notifications
   ```

3. **Check Grafana logs:**
   ```bash
   docker logs grafana | grep -i "notif\|alert"
   ```

## 📞 Support

- **Platform Team:** `platform@example.com`
- **On-Call:** See [MONITORING_RUNBOOK.md](../docs/MONITORING_RUNBOOK.md#on-call-schedule)
- **Slack:** `#platform-team` or `#alerts-critical`

---

**Last Updated:** October 30, 2025  
**Version:** 1.0.0  
**Phase:** 4 - Monitoring & Alerting Infrastructure (Complete)
