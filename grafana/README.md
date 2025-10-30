# Grafana Dashboards for Energy Auditing Application

This directory contains production-ready Grafana dashboard templates and configuration files for visualizing Prometheus metrics from the Energy Auditing Application.

## 📊 Available Dashboards

### 1. API Overview
**File**: `dashboards/api-overview.json`

Monitors API health, performance, and reliability metrics.

**Panels:**
- **HTTP Request Rate** - Requests per second grouped by method and route
- **HTTP Request Duration (p50, p95, p99)** - Latency percentiles showing response times
- **Error Rate** - HTTP errors per second by route and status code
- **Top 5 Slowest Endpoints** - Table showing endpoints with highest average response time
- **HTTP Status Codes Distribution** - Pie chart with color coding (2xx=green, 4xx=yellow, 5xx=red)

**Key Metrics:**
- Request rate (requests/sec)
- Latency p50/p95/p99
- Error rate by endpoint
- Status code distribution

**Default Time Range**: Last 6 hours

---

### 2. Business Metrics
**File**: `dashboards/business-metrics.json`

Tracks business KPIs and operational metrics specific to energy auditing workflows.

**Panels:**
- **Jobs Created (Last 24h)** - Single stat showing daily job creation
- **Jobs by Status** - Gauge showing distribution across statuses (pending, scheduled, in-progress, completed)
- **Jobs Completed (Last 7 Days)** - Time series of completed jobs by inspection type
- **Photo Upload Rate** - Rate of photo uploads per second by source
- **Blower Door Test Pass Rate** - Gauge showing compliance pass percentage
- **Duct Leakage Test Pass Rate** - Gauge showing compliance pass percentage

**Key Metrics:**
- Jobs created (24h window)
- Jobs by status (real-time)
- Blower door pass rate
- Duct leakage pass rate
- Photo upload activity

**Default Time Range**: Last 7 days

---

### 3. System Health
**File**: `dashboards/system-health.json`

Monitors system resources, Node.js runtime health, and database performance.

**Panels:**
- **CPU Usage** - Process CPU consumption in user mode
- **Memory Usage (MB)** - Resident and heap memory in megabytes
- **Event Loop Lag (p95)** - 95th percentile event loop lag (high values indicate blocked event loop)
- **Active Handles** - Number of active libuv handles (file descriptors, sockets, timers)
- **Database Connections** - Gauge showing active database connections
- **Database Query Duration (p95)** - 95th percentile query duration by operation type

**Key Metrics:**
- CPU and memory usage
- Event loop lag (blocked event loop indicator)
- Active database connections
- Database query performance (p95)

**Default Time Range**: Last 1 hour

---

## 🚀 Quick Start

### Option 1: Import into Existing Grafana Instance

If you already have a Grafana and Prometheus setup:

1. **Access Grafana UI** (typically http://localhost:3000)
2. **Navigate to**: Dashboards → Import
3. **Upload JSON files** from the `dashboards/` directory:
   - `api-overview.json`
   - `business-metrics.json`
   - `system-health.json`
4. **Configure Prometheus datasource**:
   - Name: `Prometheus`
   - URL: `http://your-prometheus-server:9090`
5. **Import each dashboard** and verify metrics are loading

---

### Option 2: Run Local Grafana + Prometheus with Docker

For quick local testing with auto-provisioned dashboards:

```bash
# Navigate to grafana directory
cd grafana

# Start Grafana and Prometheus containers
docker-compose up -d

# Check container status
docker-compose ps
```

**Access URLs:**
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
- **Prometheus**: http://localhost:9090

**What happens:**
- Prometheus starts scraping metrics from `http://host.docker.internal:5000/metrics`
- Grafana auto-loads all dashboards from `dashboards/` directory
- Prometheus datasource is automatically configured
- Data retention is set to 30 days

**Stop containers:**
```bash
docker-compose down
```

**Stop and remove volumes (clean slate):**
```bash
docker-compose down -v
```

---

## 📁 Directory Structure

```
grafana/
├── dashboards/              # Grafana dashboard JSON templates
│   ├── api-overview.json           # HTTP metrics and API performance
│   ├── business-metrics.json       # Business KPIs and job metrics
│   └── system-health.json          # System resources and Node.js health
├── provisioning/            # Auto-provisioning configuration
│   ├── dashboards.yml              # Dashboard provisioning config
│   └── datasources.yml             # Prometheus datasource config
├── docker-compose.yml       # Docker Compose for local testing
├── prometheus.yml           # Prometheus scrape configuration
└── README.md                # This file
```

---

## 🔧 Configuration

### Prometheus Configuration (`prometheus.yml`)

Scrapes metrics from the Energy Auditing Application:

```yaml
scrape_configs:
  - job_name: 'energy-audit-api'
    static_configs:
      - targets: ['host.docker.internal:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

**Note**: `host.docker.internal` allows Docker containers to access services running on the host machine (works on Docker Desktop).

For production:
- Replace `host.docker.internal:5000` with your actual application URL
- Adjust `scrape_interval` based on your monitoring needs (default: 15s)
- Add authentication if your `/metrics` endpoint is protected

### Grafana Provisioning

Dashboards are automatically provisioned using:
- **Folder**: "Energy Auditing"
- **Auto-refresh**: Every 10 seconds
- **UI Updates**: Allowed (dashboards can be edited in Grafana UI)

---

## 📈 Metrics Reference

### HTTP Metrics
- `http_request_duration_seconds` - Histogram of HTTP request durations
- `http_requests_total` - Counter of total HTTP requests
- `http_errors_total` - Counter of HTTP errors (4xx, 5xx)

### Business Metrics
- `jobs_created_total` - Counter of jobs created (by inspection_type)
- `jobs_completed_total` - Counter of jobs completed (by inspection_type)
- `jobs_by_status` - Gauge of current jobs by status
- `photos_uploaded_total` - Counter of photos uploaded (by source)
- `blower_door_tests_total` - Counter of blower door tests (by passed status)
- `duct_leakage_tests_total` - Counter of duct leakage tests (by test_type and passed status)

### System Metrics
- `process_cpu_user_seconds_total` - CPU time in user mode
- `process_resident_memory_bytes` - Resident memory size
- `process_heap_bytes` - Heap memory size
- `nodejs_eventloop_lag_p95_seconds` - Event loop lag (95th percentile)
- `nodejs_active_handles_total` - Active libuv handles
- `db_connections_active` - Active database connections
- `db_query_duration_seconds` - Histogram of database query durations

---

## 🚨 Recommended Alerts

Configure these alerts in Grafana for proactive monitoring:

### Critical Alerts
- **High Error Rate**: `rate(http_errors_total[5m]) > 5` - More than 5 errors/sec
- **High Latency**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1` - p95 latency > 1 second
- **Event Loop Blocked**: `nodejs_eventloop_lag_p95_seconds > 0.1` - Event loop lag > 100ms
- **High Memory**: `process_resident_memory_bytes > 1073741824` - Memory > 1GB

### Warning Alerts
- **Increasing Error Rate**: `rate(http_errors_total[5m]) > 1` - More than 1 error/sec
- **Elevated Latency**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5` - p95 latency > 500ms
- **Database Connections High**: `db_connections_active > 15` - More than 15 active connections
- **Slow Database Queries**: `histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.1` - p95 query time > 100ms

---

## 🎨 Customization

### Editing Dashboards

**In Grafana UI:**
1. Open the dashboard
2. Click the gear icon (⚙️) → Settings
3. Make changes to panels, queries, or layout
4. Click "Save dashboard"
5. Export JSON: Share → Export → Save to file

**Direct JSON Editing:**
1. Edit the JSON file in `dashboards/` directory
2. Restart Grafana or wait for auto-reload (10s interval)
3. Refresh dashboard in browser

### Adding New Panels

Use the Prometheus query builder in Grafana:
1. Click "Add panel"
2. Select visualization type (Time series, Gauge, Stat, Table, Pie chart)
3. Write PromQL query
4. Configure legend, colors, and thresholds
5. Save panel

### Variables

Add dashboard variables for dynamic filtering:
- `$interval` - Time range selector
- `$route` - Filter by API route
- `$status` - Filter by job status
- `$inspection_type` - Filter by inspection type

Example query with variable:
```promql
rate(http_requests_total{route="$route"}[5m])
```

---

## 🐛 Troubleshooting

### No Data in Dashboards

**Check Prometheus is scraping metrics:**
```bash
# Open Prometheus UI
open http://localhost:9090

# Go to Status → Targets
# Verify 'energy-audit-api' target is UP
```

**Verify application is exposing metrics:**
```bash
curl http://localhost:5000/metrics
```

You should see Prometheus-formatted metrics.

### Dashboards Not Appearing

**Check provisioning logs:**
```bash
docker-compose logs grafana | grep provisioning
```

**Verify file paths in docker-compose.yml:**
- `./dashboards` should map to `/etc/grafana/provisioning/dashboards`
- `./provisioning` should map to `/etc/grafana/provisioning`

### Connection Issues (host.docker.internal)

**For Linux:**
Replace `host.docker.internal` with `172.17.0.1` (Docker bridge IP) in `prometheus.yml`:
```yaml
- targets: ['172.17.0.1:5000']
```

**For custom networks:**
Run application and Prometheus in same Docker network.

### Dashboard Permissions

If dashboards are read-only:
- Set `allowUiUpdates: true` in `provisioning/dashboards.yml`
- Restart Grafana

---

## 📚 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Query Language (PromQL)](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [prom-client (Node.js)](https://github.com/simmonds/prom-client)

---

## 📝 Notes

- **Auto-refresh**: All dashboards auto-refresh every 30 seconds
- **Data retention**: Prometheus stores 30 days of data by default
- **Time zones**: Dashboards use browser timezone
- **Performance**: Queries are optimized with rate windows (5m, 15s intervals)
- **Production**: Replace `host.docker.internal` with actual service URLs

---

## 🤝 Contributing

To add new dashboards or panels:
1. Create/modify dashboard in Grafana UI
2. Export JSON: Settings → JSON Model → Copy
3. Save to `dashboards/` directory
4. Add documentation to this README
5. Test import in fresh Grafana instance

---

## 📄 License

These dashboard templates are part of the Energy Auditing Application and follow the same license.
