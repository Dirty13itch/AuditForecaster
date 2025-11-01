import promClient from 'prom-client';

// Create registry
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop lag)
promClient.collectDefaultMetrics({ register });

// ============================================
// HTTP Metrics
// ============================================

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// ============================================
// Business Metrics
// ============================================

export const jobsCreatedTotal = new promClient.Counter({
  name: 'jobs_created_total',
  help: 'Total number of jobs created',
  labelNames: ['inspection_type'],
  registers: [register]
});

export const jobsCompletedTotal = new promClient.Counter({
  name: 'jobs_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['inspection_type'],
  registers: [register]
});

export const jobStatusGauge = new promClient.Gauge({
  name: 'jobs_by_status',
  help: 'Number of jobs in each status',
  labelNames: ['status'],
  registers: [register]
});

export const photosUploadedTotal = new promClient.Counter({
  name: 'photos_uploaded_total',
  help: 'Total number of photos uploaded',
  labelNames: ['source'],
  registers: [register]
});

export const blowerDoorTestsTotal = new promClient.Counter({
  name: 'blower_door_tests_total',
  help: 'Total number of blower door tests',
  labelNames: ['passed'],
  registers: [register]
});

export const ductLeakageTestsTotal = new promClient.Counter({
  name: 'duct_leakage_tests_total',
  help: 'Total number of duct leakage tests',
  labelNames: ['test_type', 'passed'],
  registers: [register]
});

// ============================================
// Database Metrics
// ============================================

export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register]
});

export const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

// ============================================
// Export Metrics
// ============================================

export const exportsGeneratedTotal = new promClient.Counter({
  name: 'exports_generated_total',
  help: 'Total number of exports generated',
  labelNames: ['format'],
  registers: [register]
});

export const exportDuration = new promClient.Histogram({
  name: 'export_duration_seconds',
  help: 'Duration of export generation in seconds',
  labelNames: ['format'],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
  registers: [register]
});

// ============================================
// Cache Metrics
// ============================================

export const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['category'],
  registers: [register]
});

// ============================================
// Background Job Metrics (Phase 4)
// ============================================

export const backgroundJobExecutions = new promClient.Counter({
  name: 'background_job_executions_total',
  help: 'Total number of background job executions',
  labelNames: ['job_name', 'status'],
  registers: [register]
});

export const backgroundJobDuration = new promClient.Histogram({
  name: 'background_job_duration_seconds',
  help: 'Duration of background job executions in seconds',
  labelNames: ['job_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register]
});

export const backgroundJobErrors = new promClient.Counter({
  name: 'background_job_errors_total',
  help: 'Total number of background job errors',
  labelNames: ['job_name'],
  registers: [register]
});

// ============================================
// WebSocket Metrics (Phase 4)
// ============================================

export const websocketConnections = new promClient.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

export const websocketMessages = new promClient.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['type'],
  registers: [register]
});

export const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['category'],
  registers: [register]
});

export const cacheSize = new promClient.Gauge({
  name: 'cache_size_keys',
  help: 'Number of keys in cache by category',
  labelNames: ['category'],
  registers: [register]
});

export const cacheEvictions = new promClient.Counter({
  name: 'cache_evictions_total',
  help: 'Total number of cache evictions',
  labelNames: ['category', 'reason'],
  registers: [register]
});

export const cacheOperationDuration = new promClient.Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'category'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01],
  registers: [register]
});

// Helper to track endpoint timing
export function trackRequestDuration(method: string, route: string, statusCode: number, durationSeconds: number) {
  httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
  httpRequestsTotal.inc({ method, route, status_code: statusCode });
  
  if (statusCode >= 400) {
    httpErrorsTotal.inc({ method, route, status_code: statusCode });
  }
}
