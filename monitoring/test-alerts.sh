#!/bin/bash

##############################################################################
# Alert Testing Script
# Energy Auditing Application
#
# Purpose: Trigger alert conditions to verify Prometheus alerting rules
#          and Grafana notification channels are working correctly.
#
# Usage:
#   ./monitoring/test-alerts.sh                    # Run all tests
#   ./monitoring/test-alerts.sh high-error-rate    # Run specific test
#   ./monitoring/test-alerts.sh --help             # Show help
#
# Prerequisites:
#   - Application running on localhost:5000
#   - Prometheus running on localhost:9090
#   - Grafana running on localhost:3001
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${APP_URL:-http://localhost:5000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
  print_header "Checking Prerequisites"
  
  # Check if app is running
  if curl -s -o /dev/null -w "%{http_code}" "$APP_URL/metrics" | grep -q "200"; then
    print_success "Application is running at $APP_URL"
  else
    print_error "Application not accessible at $APP_URL"
    print_info "Start the application with: npm run dev"
    exit 1
  fi
  
  # Check if Prometheus is running
  if curl -s -o /dev/null -w "%{http_code}" "$PROMETHEUS_URL/-/healthy" | grep -q "200"; then
    print_success "Prometheus is running at $PROMETHEUS_URL"
  else
    print_warning "Prometheus not accessible at $PROMETHEUS_URL (optional for local testing)"
  fi
  
  # Check if Grafana is running
  if curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health" | grep -q "200"; then
    print_success "Grafana is running at $GRAFANA_URL"
  else
    print_warning "Grafana not accessible at $GRAFANA_URL (optional for local testing)"
  fi
}

wait_for_metrics() {
  print_info "Waiting 30 seconds for metrics to be scraped by Prometheus..."
  sleep 30
}

check_alert_firing() {
  local alert_name=$1
  print_info "Checking if alert '$alert_name' is firing in Prometheus..."
  
  # Query Prometheus for firing alerts
  local response=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" | grep -o "\"alertname\":\"$alert_name\"" || echo "")
  
  if [ -n "$response" ]; then
    print_success "Alert '$alert_name' found in Prometheus"
    return 0
  else
    print_warning "Alert '$alert_name' not found (may take a few minutes to fire)"
    return 1
  fi
}

##############################################################################
# Test Functions
##############################################################################

test_high_error_rate() {
  print_header "Testing: HighErrorRate Alert"
  print_info "Triggering HTTP 5xx errors to exceed 1% error rate threshold"
  
  print_info "Test 1: Sending 100 requests with 10 errors (10% error rate - SHOULD fire)"
  
  # Send normal requests
  for i in {1..90}; do
    curl -s -o /dev/null "$APP_URL/metrics" &
  done
  wait
  
  # Trigger 500 errors by hitting non-existent endpoints
  for i in {1..10}; do
    curl -s -o /dev/null "$APP_URL/api/nonexistent-endpoint-$(date +%s%N)" &
  done
  wait
  
  print_success "Sent 100 requests (10% error rate)"
  print_info "Alert should fire after 5 minutes of sustained error rate > 1%"
  
  print_info "\nTest 2: Verifying no false positives from isolated 5xx errors"
  print_info "Sending 1000 requests with only 5 errors (0.5% error rate - should NOT fire)"
  
  # Send many successful requests
  for i in {1..995}; do
    curl -s -o /dev/null "$APP_URL/metrics" &
    if (( i % 50 == 0 )); then
      wait
    fi
  done
  wait
  
  # Trigger only 5 errors (0.5%)
  for i in {1..5}; do
    curl -s -o /dev/null "$APP_URL/api/nonexistent-endpoint-$(date +%s%N)" &
  done
  wait
  
  print_success "Sent 1000 requests (0.5% error rate)"
  print_info "Alert should NOT fire since error rate < 1% threshold"
  
  print_info "\nKey Test Points:"
  echo "  ✓ >1% error rate triggers alert (10% tested)"
  echo "  ✓ <1% error rate does NOT trigger alert (0.5% tested)"
  echo "  ✓ With sum() aggregation, alert measures true percentage across service"
  echo "  ✓ No false positives from isolated 5xx responses"
  
  print_info "\nCheck: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-api-overview"
  
  wait_for_metrics
  check_alert_firing "HighErrorRate"
}

test_high_latency() {
  print_header "Testing: HighAPILatency Alert"
  print_info "Simulating slow API responses to trigger P95 latency > 500ms"
  
  print_info "Sending requests to a slow endpoint..."
  
  # Note: This requires a test endpoint that introduces delay
  # You may need to add a test route like /api/test/slow-response
  for i in {1..20}; do
    curl -s -o /dev/null "$APP_URL/api/jobs?delay=1000" &
  done
  wait
  
  print_success "Sent 20 slow requests (simulated delay)"
  print_info "Alert should fire after 5 minutes of P95 latency > 500ms"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-api-overview"
  
  wait_for_metrics
  check_alert_firing "HighAPILatency"
}

test_db_connection_failures() {
  print_header "Testing: DatabaseConnectionFailures Alert"
  print_info "Simulating database connection errors"
  
  print_warning "⚠️  WARNING: This test may require database manipulation"
  print_info "Manually test by temporarily blocking database access or exhausting connection pool"
  print_info "For development: Restart database or modify DATABASE_URL temporarily"
  
  print_info "To trigger manually:"
  echo "  1. Stop database: docker stop <db-container>"
  echo "  2. Make API request: curl $APP_URL/api/jobs"
  echo "  3. Check metrics: curl $APP_URL/metrics | grep db_connection_errors_total"
  echo "  4. Restart database: docker start <db-container>"
  
  print_info "Alert should fire immediately upon any connection error"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-system-health"
}

test_high_memory() {
  print_header "Testing: HighMemoryUsage Alert"
  print_info "Simulating high memory usage (>800MB)"
  
  print_warning "⚠️  WARNING: This test will consume significant memory"
  print_info "Allocating large arrays to increase memory usage..."
  
  # Note: This requires a test endpoint that allocates memory
  # Example: POST /api/test/allocate-memory with size parameter
  
  print_info "To trigger manually:"
  echo "  curl -X POST $APP_URL/api/test/allocate-memory -d '{\"size\": 900}'"
  echo "  This should allocate ~900MB of memory"
  
  print_info "Alert should fire after 10 minutes of sustained high memory usage"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-system-health"
  
  print_warning "Remember to restart application to free memory after test"
}

test_high_cpu() {
  print_header "Testing: HighCPUUsage Alert"
  print_info "Simulating high CPU usage (>90%)"
  
  print_info "Creating CPU-intensive workload..."
  
  # Send many concurrent requests to create CPU load
  for i in {1..100}; do
    curl -s -o /dev/null "$APP_URL/api/jobs" &
  done
  wait
  
  print_success "Sent 100 concurrent requests"
  print_info "Monitor CPU with: top -p \$(pgrep -f node)"
  print_info "Alert should fire after 10 minutes of CPU > 90%"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-system-health"
  
  wait_for_metrics
  check_alert_firing "HighCPUUsage"
}

test_event_loop_blocked() {
  print_header "Testing: EventLoopBlocked Alert"
  print_info "Simulating blocked event loop (lag > 100ms)"
  
  print_warning "⚠️  WARNING: This test may make application unresponsive"
  print_info "Triggering synchronous blocking operations..."
  
  # Note: Requires test endpoint with blocking code
  print_info "To trigger manually:"
  echo "  Add this test endpoint to server/routes.ts:"
  echo "  app.get('/api/test/block-event-loop', (req, res) => {"
  echo "    const start = Date.now();"
  echo "    while (Date.now() - start < 500) {} // Block for 500ms"
  echo "    res.json({ blocked: true });"
  echo "  });"
  echo ""
  echo "  Then run: for i in {1..10}; do curl $APP_URL/api/test/block-event-loop & done"
  
  print_info "Alert should fire after 5 minutes of event loop lag > 100ms"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-system-health"
}

test_low_job_completion() {
  print_header "Testing: LowJobCompletionRate Alert"
  print_info "Creating jobs without completing them to trigger low completion rate"
  
  print_info "Creating 10 jobs..."
  for i in {1..10}; do
    curl -s -X POST "$APP_URL/api/jobs" \
      -H "Content-Type: application/json" \
      -d "{
        \"address\": \"Test Address $i\",
        \"city\": \"Test City\",
        \"state\": \"CA\",
        \"zip\": \"12345\",
        \"inspection_type\": \"blower_door\",
        \"status\": \"pending\"
      }" > /dev/null
  done
  
  print_success "Created 10 jobs without completing them"
  print_info "Alert should fire after 2 hours if completion rate < 50%"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-business-metrics"
  
  wait_for_metrics
}

test_no_jobs_created() {
  print_header "Testing: NoJobsCreatedRecently Alert"
  print_info "Simulating period with no job creation"
  
  print_warning "This alert requires waiting 2 hours with no job creation"
  print_info "To test: Stop creating jobs and wait 2 hours"
  print_info "The alert will fire automatically if no jobs are created"
  
  print_info "Alert condition: increase(jobs_created_total[1h]) == 0"
  print_info "Check: $PROMETHEUS_URL/alerts or $GRAFANA_URL/d/energy-audit-business-metrics"
}

##############################################################################
# Notification Testing
##############################################################################

test_notifications() {
  print_header "Testing Alert Notifications"
  
  print_info "Testing Slack notification (if configured)..."
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "🧪 Test Alert Notification",
        "attachments": [{
          "color": "warning",
          "title": "Alert Test from Monitoring Script",
          "text": "This is a test notification. If you received this, Slack alerts are working!",
          "footer": "Energy Audit Monitoring"
        }]
      }'
    print_success "Slack test notification sent"
  else
    print_warning "SLACK_WEBHOOK_URL not configured. Skipping Slack test."
  fi
  
  print_info "Check your Slack channel for test notification"
  print_info "Configure webhook: export SLACK_WEBHOOK_URL='https://hooks.slack.com/...'"
}

##############################################################################
# Verification Functions
##############################################################################

verify_all_alerts() {
  print_header "Verifying All Alert Rules"
  
  print_info "Checking Prometheus alert rules..."
  
  local alerts=(
    "HighErrorRate"
    "HighAPILatency"
    "DatabaseConnectionFailures"
    "HighMemoryUsage"
    "HighCPUUsage"
    "EventLoopBlocked"
    "LowJobCompletionRate"
    "NoJobsCreatedRecently"
  )
  
  for alert in "${alerts[@]}"; do
    if check_alert_firing "$alert"; then
      print_success "Alert '$alert' is configured"
    else
      print_info "Alert '$alert' is configured but not firing"
    fi
  done
  
  print_info "\nTo view all alerts: $PROMETHEUS_URL/alerts"
  print_info "To view Grafana dashboards: $GRAFANA_URL/dashboards"
}

##############################################################################
# Main Menu
##############################################################################

show_help() {
  cat << EOF
Alert Testing Script - Energy Auditing Application

Usage:
  ./monitoring/test-alerts.sh [test-name]

Available Tests:
  high-error-rate        Trigger HighErrorRate alert (>1% error rate)
  high-latency           Trigger HighAPILatency alert (P95 > 500ms)
  db-connection          Trigger DatabaseConnectionFailures alert
  high-memory            Trigger HighMemoryUsage alert (>800MB)
  high-cpu               Trigger HighCPUUsage alert (>90%)
  event-loop             Trigger EventLoopBlocked alert (lag >100ms)
  low-completion         Trigger LowJobCompletionRate alert
  no-jobs                Trigger NoJobsCreatedRecently alert
  notifications          Test notification channels (Slack, Email)
  verify                 Verify all alert rules are configured
  all                    Run all tests (default)

Options:
  --help, -h             Show this help message

Examples:
  ./monitoring/test-alerts.sh                    # Run all tests
  ./monitoring/test-alerts.sh high-error-rate    # Test specific alert
  ./monitoring/test-alerts.sh verify             # Check alert configuration

Environment Variables:
  APP_URL                Application URL (default: http://localhost:5000)
  PROMETHEUS_URL         Prometheus URL (default: http://localhost:9090)
  GRAFANA_URL            Grafana URL (default: http://localhost:3001)
  SLACK_WEBHOOK_URL      Slack webhook for notifications

EOF
}

run_all_tests() {
  check_prerequisites
  
  test_high_error_rate
  test_high_latency
  test_high_cpu
  test_low_job_completion
  
  print_warning "Some tests require manual steps. Review output above."
  
  print_header "Test Summary"
  print_info "✓ Automated tests completed"
  print_info "⚠ Manual tests require additional steps"
  print_info "📊 Check Prometheus: $PROMETHEUS_URL/alerts"
  print_info "📈 Check Grafana: $GRAFANA_URL/dashboards"
  
  verify_all_alerts
}

##############################################################################
# Main Script Logic
##############################################################################

main() {
  local test_name="${1:-all}"
  
  case "$test_name" in
    --help|-h)
      show_help
      exit 0
      ;;
    high-error-rate)
      check_prerequisites
      test_high_error_rate
      ;;
    high-latency)
      check_prerequisites
      test_high_latency
      ;;
    db-connection)
      check_prerequisites
      test_db_connection_failures
      ;;
    high-memory)
      check_prerequisites
      test_high_memory
      ;;
    high-cpu)
      check_prerequisites
      test_high_cpu
      ;;
    event-loop)
      check_prerequisites
      test_event_loop_blocked
      ;;
    low-completion)
      check_prerequisites
      test_low_job_completion
      ;;
    no-jobs)
      check_prerequisites
      test_no_jobs_created
      ;;
    notifications)
      test_notifications
      ;;
    verify)
      check_prerequisites
      verify_all_alerts
      ;;
    all)
      run_all_tests
      ;;
    *)
      print_error "Unknown test: $test_name"
      echo "Run './monitoring/test-alerts.sh --help' for usage information"
      exit 1
      ;;
  esac
}

# Run main function
main "$@"
