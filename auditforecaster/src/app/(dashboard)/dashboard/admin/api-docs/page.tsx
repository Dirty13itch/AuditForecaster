import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ApiDocsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user?.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="space-y-8 p-8 pt-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          API Documentation
        </h1>
        <p className="text-gray-400 mt-1">
          REST API reference for external integrations with AuditForecaster.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Contents</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <a href="#authentication" className="text-blue-400 hover:text-blue-300">
              1. Authentication
            </a>
          </li>
          <li>
            <a href="#rate-limiting" className="text-blue-400 hover:text-blue-300">
              2. Rate Limiting
            </a>
          </li>
          <li>
            <a href="#jobs-api" className="text-blue-400 hover:text-blue-300">
              3. Jobs API
            </a>
          </li>
          <li>
            <a href="#health-api" className="text-blue-400 hover:text-blue-300">
              4. Health API
            </a>
          </li>
          <li>
            <a href="#metrics-api" className="text-blue-400 hover:text-blue-300">
              5. Metrics API
            </a>
          </li>
          <li>
            <a href="#webhooks" className="text-blue-400 hover:text-blue-300">
              6. Webhooks
            </a>
          </li>
          <li>
            <a href="#error-handling" className="text-blue-400 hover:text-blue-300">
              7. Error Handling
            </a>
          </li>
        </ul>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* AUTHENTICATION */}
      {/* ------------------------------------------------------------------ */}
      <section id="authentication" className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          1. Authentication
        </h2>
        <p className="text-gray-300">
          The Jobs API authenticates requests using API keys passed in the{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
            Authorization
          </code>{" "}
          header as a Bearer token. Keys are SHA-256 hashed before storage and
          are never persisted in plaintext.
        </p>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Key Format</h3>
          <p className="text-gray-300 text-sm">
            API keys follow the format{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              sk_live_*
            </code>{" "}
            for production or{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              sk_test_*
            </code>{" "}
            for test environments. Keys that do not match either prefix will be
            rejected.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Scopes</h3>
          <p className="text-gray-300 text-sm">
            Each API key is assigned one or more scopes that determine which
            operations it may perform. If the key does not have the required
            scope for an endpoint, the request will receive a{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              401 Unauthorized
            </code>{" "}
            response.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-4 text-gray-400 font-medium">Scope</th>
                  <th className="py-2 text-gray-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">READ_JOBS</code>
                  </td>
                  <td className="py-2">List and read job records</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">WRITE_JOBS</code>
                  </td>
                  <td className="py-2">Create new job records</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Expiration</h3>
          <p className="text-gray-300 text-sm">
            API keys may have an optional{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              expiresAt
            </code>{" "}
            date. Expired keys are rejected with a{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              401
            </code>{" "}
            response. The{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              lastUsed
            </code>{" "}
            timestamp on the key record is updated with each successful
            authentication.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Example Header</h3>
          <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`Authorization: Bearer sk_live_your_api_key_here`}
          </pre>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* RATE LIMITING */}
      {/* ------------------------------------------------------------------ */}
      <section id="rate-limiting" className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          2. Rate Limiting
        </h2>
        <p className="text-gray-300">
          All API endpoints are rate-limited per client IP address. When the
          limit is exceeded, the server responds with{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
            429 Too Many Requests
          </code>
          .
        </p>
        <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded"
}`}
        </pre>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* JOBS API */}
      {/* ------------------------------------------------------------------ */}
      <section id="jobs-api" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          3. Jobs API
        </h2>

        {/* GET /api/v1/jobs */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-900/50 border border-green-500/30 px-2.5 py-0.5 text-xs font-bold text-green-400 uppercase">
              GET
            </span>
            <code className="text-white font-mono text-sm">/api/v1/jobs</code>
          </div>
          <p className="text-gray-300 text-sm">
            Returns a paginated list of jobs ordered by creation date
            (newest first).
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              Requires API key with{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">READ_JOBS</code>{" "}
              scope.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Query Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Parameter</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Type</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Default</th>
                    <th className="py-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">limit</code>
                    </td>
                    <td className="py-2 pr-4">integer</td>
                    <td className="py-2 pr-4">10</td>
                    <td className="py-2">
                      Number of results to return (max 50)
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">offset</code>
                    </td>
                    <td className="py-2 pr-4">integer</td>
                    <td className="py-2 pr-4">0</td>
                    <td className="py-2">
                      Number of results to skip for pagination
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
            <p className="text-gray-400 text-xs mb-1">200 OK</p>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "data": [
    {
      "id": "clx1abc2300001234abcd",
      "lotNumber": "42",
      "address": "123 Main St, Austin",
      "status": "PENDING",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Example</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`curl -X GET "https://your-domain.com/api/v1/jobs?limit=20&offset=0" \\
  -H "Authorization: Bearer sk_live_your_api_key_here"`}
            </pre>
          </div>
        </div>

        {/* POST /api/v1/jobs */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-900/50 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400 uppercase">
              POST
            </span>
            <code className="text-white font-mono text-sm">/api/v1/jobs</code>
          </div>
          <p className="text-gray-300 text-sm">
            Creates a new job record. The job is created with an initial status
            of{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
              PENDING
            </code>
            . An audit log entry is recorded automatically.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              Requires API key with{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">WRITE_JOBS</code>{" "}
              scope.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Request Body</h4>
            <p className="text-gray-400 text-xs mb-1">Content-Type: application/json</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Field</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Type</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Required</th>
                    <th className="py-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">lotNumber</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Lot number for the job</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">streetAddress</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Street address of the property</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">city</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">City of the property</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">builderId</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">ID of the associated builder</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">subdivisionId</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">ID of the associated subdivision</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
            <p className="text-gray-400 text-xs mb-1">201 Created</p>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "data": {
    "id": "clx1abc2300001234abcd",
    "lotNumber": "42",
    "streetAddress": "123 Main St",
    "city": "Austin",
    "address": "123 Main St, Austin",
    "builderId": "clx0builder001",
    "subdivisionId": null,
    "status": "PENDING",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Error Response</h4>
            <p className="text-gray-400 text-xs mb-1">400 Bad Request (validation failure)</p>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "error": "Validation failed"
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Example</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`curl -X POST "https://your-domain.com/api/v1/jobs" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "lotNumber": "42",
    "streetAddress": "123 Main St",
    "city": "Austin",
    "builderId": "clx0builder001"
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HEALTH API */}
      {/* ------------------------------------------------------------------ */}
      <section id="health-api" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          4. Health API
        </h2>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-900/50 border border-green-500/30 px-2.5 py-0.5 text-xs font-bold text-green-400 uppercase">
              GET
            </span>
            <code className="text-white font-mono text-sm">/api/health</code>
          </div>
          <p className="text-gray-300 text-sm">
            Returns the health status of the application and its dependencies.
            Unauthenticated requests receive a summary response.
            Authenticated requests (via{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              HEALTH_SECRET
            </code>
            ) receive detailed subsystem check results.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              Optional. Pass the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">HEALTH_SECRET</code>{" "}
              environment variable value as a Bearer token to receive detailed check output
              including per-subsystem latency.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Subsystem Checks</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Check</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Critical</th>
                    <th className="py-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">database</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">
                      Runs <code className="rounded bg-white/10 px-1 text-blue-300 text-xs">SELECT 1</code> against the database
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">redis</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">
                      PING to Redis (skipped if not configured)
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">filesystem</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">
                      Write/delete test file in uploads directory
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Status Values</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Status</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">HTTP Code</th>
                    <th className="py-2 text-gray-400 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="rounded bg-green-900/30 px-1.5 py-0.5 text-green-400">healthy</code>
                    </td>
                    <td className="py-2 pr-4">200</td>
                    <td className="py-2">All checks passed</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="rounded bg-yellow-900/30 px-1.5 py-0.5 text-yellow-400">degraded</code>
                    </td>
                    <td className="py-2 pr-4">200</td>
                    <td className="py-2">Non-critical check failed (Redis or filesystem)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="rounded bg-red-900/30 px-1.5 py-0.5 text-red-400">unhealthy</code>
                    </td>
                    <td className="py-2 pr-4">503</td>
                    <td className="py-2">Database check failed</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">
              Response (unauthenticated)
            </h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "totalLatencyMs": 12,
  "version": "1.0.0"
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">
              Response (authenticated)
            </h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "totalLatencyMs": 45,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok", "latencyMs": 3 },
    "redis": { "status": "ok", "latencyMs": 2 },
    "filesystem": { "status": "ok", "latencyMs": 8 }
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Examples</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`# Basic health check (no auth required)
curl "https://your-domain.com/api/health"

# Detailed health check (with HEALTH_SECRET)
curl "https://your-domain.com/api/health" \\
  -H "Authorization: Bearer your_health_secret_here"`}
            </pre>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* METRICS API */}
      {/* ------------------------------------------------------------------ */}
      <section id="metrics-api" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          5. Metrics API
        </h2>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-900/50 border border-green-500/30 px-2.5 py-0.5 text-xs font-bold text-green-400 uppercase">
              GET
            </span>
            <code className="text-white font-mono text-sm">/api/metrics</code>
          </div>
          <p className="text-gray-300 text-sm">
            Exposes Prometheus-compatible application metrics. Intended for use
            with monitoring tools such as Prometheus, Grafana, or Datadog.
            All default Node.js metrics are collected with the{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
              auditforecaster_
            </code>{" "}
            prefix.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              Requires the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">METRICS_SECRET</code>{" "}
              environment variable value as a Bearer token. In production, the endpoint
              returns{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">503</code>{" "}
              if{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">METRICS_SECRET</code>{" "}
              is not configured.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
            <p className="text-gray-400 text-xs mb-1">
              200 OK &mdash; Content-Type: text/plain (Prometheus exposition format)
            </p>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`# HELP auditforecaster_process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE auditforecaster_process_cpu_user_seconds_total counter
auditforecaster_process_cpu_user_seconds_total 0.25

# HELP auditforecaster_nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE auditforecaster_nodejs_heap_size_total_bytes gauge
auditforecaster_nodejs_heap_size_total_bytes 5.2e+07`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Example</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`curl "https://your-domain.com/api/metrics" \\
  -H "Authorization: Bearer your_metrics_secret_here"`}
            </pre>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* WEBHOOKS */}
      {/* ------------------------------------------------------------------ */}
      <section id="webhooks" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          6. Webhooks
        </h2>
        <p className="text-gray-300">
          AuditForecaster receives inbound webhooks from external services.
          These endpoints are not called by API consumers directly but are
          registered with third-party platforms.
        </p>

        {/* SupplyPro Webhook */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-900/50 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400 uppercase">
              POST
            </span>
            <code className="text-white font-mono text-sm">
              /api/webhooks/supplypro
            </code>
          </div>
          <p className="text-gray-300 text-sm">
            Receives job data from the SupplyPro/BuildPro scheduling system.
            On success, the endpoint upserts a job record keyed by{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
              orderId
            </code>{" "}
            and creates or matches the associated builder. All requests and
            outcomes are logged to the{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
              IntegrationLog
            </code>{" "}
            table.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              HMAC-SHA256 signature verification. The raw request body is signed
              with{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                SUPPLYPRO_WEBHOOK_SECRET
              </code>{" "}
              and compared against the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                x-supplypro-signature
              </code>{" "}
              header using a timing-safe comparison. In production, the endpoint
              returns{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">503</code>{" "}
              if the secret is not configured.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Request Body</h4>
            <p className="text-gray-400 text-xs mb-1">Content-Type: application/json</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Field</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Type</th>
                    <th className="py-2 pr-4 text-gray-400 font-medium">Required</th>
                    <th className="py-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">orderId</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Unique BuildPro order identifier (used as upsert key)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">builderName</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Name of the builder (matched or created automatically)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">subdivisionName</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">Subdivision name</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">lotNumber</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Lot number</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">streetAddress</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Street address of the property</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">city</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">City</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">zipCode</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">ZIP code</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">scheduledDate</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">ISO 8601 datetime for the scheduled audit</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">status</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">External status from SupplyPro</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">instructions</code>
                    </td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2">Special instructions for the audit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Success Response</h4>
            <p className="text-gray-400 text-xs mb-1">200 OK</p>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`{
  "success": true,
  "jobId": "clx1abc2300001234abcd"
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Example</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`# Generate HMAC-SHA256 signature
PAYLOAD='{"orderId":"SP-1001","builderName":"Acme Homes","lotNumber":"7","streetAddress":"456 Oak Ave","city":"Dallas"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SUPPLYPRO_WEBHOOK_SECRET" | awk '{print $2}')

curl -X POST "https://your-domain.com/api/webhooks/supplypro" \\
  -H "Content-Type: application/json" \\
  -H "x-supplypro-signature: $SIGNATURE" \\
  -d "$PAYLOAD"`}
            </pre>
          </div>
        </div>

        {/* Google Calendar Webhook */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-900/50 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400 uppercase">
              POST
            </span>
            <code className="text-white font-mono text-sm">
              /api/webhooks/google-calendar
            </code>
          </div>
          <p className="text-gray-300 text-sm">
            Receives push notifications from the Google Calendar API when
            calendar events change. This endpoint is registered automatically
            when a user connects their Google Calendar and should not be called
            manually.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Authentication</h4>
            <p className="text-gray-400 text-sm">
              Validates the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                x-goog-channel-token
              </code>{" "}
              header against the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                GOOGLE_CALENDAR_WEBHOOK_TOKEN
              </code>{" "}
              environment variable. The{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                x-goog-channel-id
              </code>{" "}
              header must follow the format{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">
                auditforecaster-&#123;userId&#125;
              </code>
              . In production, the endpoint returns{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-blue-300">503</code>{" "}
              if the webhook token is not configured.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Required Headers</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-gray-400 font-medium">Header</th>
                    <th className="py-2 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">x-goog-channel-id</code>
                    </td>
                    <td className="py-2">
                      Channel ID in format{" "}
                      <code className="text-blue-300">auditforecaster-&#123;userId&#125;</code>
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">x-goog-resource-state</code>
                    </td>
                    <td className="py-2">
                      Event type: <code className="text-blue-300">sync</code> or{" "}
                      <code className="text-blue-300">exists</code>
                    </td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">x-goog-resource-id</code>
                    </td>
                    <td className="py-2">Google resource identifier for the watched calendar</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      <code className="text-blue-300">x-goog-channel-token</code>
                    </td>
                    <td className="py-2">Verification token (must match GOOGLE_CALENDAR_WEBHOOK_TOKEN)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
            <pre className="rounded-lg bg-gray-900 border border-white/10 p-4 text-sm text-gray-300 overflow-x-auto">
{`// Initial sync ping
{ "status": "ok" }

// Change detected, sync triggered
{ "status": "syncing" }

// Unrecognized resource state or user mismatch
{ "status": "ignored" }`}
            </pre>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ERROR HANDLING */}
      {/* ------------------------------------------------------------------ */}
      <section id="error-handling" className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          7. Error Handling
        </h2>
        <p className="text-gray-300">
          All error responses follow a consistent JSON structure with an{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-blue-300">
            error
          </code>{" "}
          field. Internal details are never exposed to the client; they are
          logged server-side.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4 text-gray-400 font-medium">HTTP Status</th>
                <th className="py-2 pr-4 text-gray-400 font-medium">Meaning</th>
                <th className="py-2 text-gray-400 font-medium">Example Body</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">400</td>
                <td className="py-2 pr-4">Bad Request / Validation Error</td>
                <td className="py-2">
                  <code className="text-xs">
                    {`{"error": "Validation failed"}`}
                  </code>
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">401</td>
                <td className="py-2 pr-4">Unauthorized (missing or invalid credentials)</td>
                <td className="py-2">
                  <code className="text-xs">
                    {`{"error": "Unauthorized"}`}
                  </code>
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">429</td>
                <td className="py-2 pr-4">Rate limit exceeded</td>
                <td className="py-2">
                  <code className="text-xs">
                    {`{"error": "Rate limit exceeded"}`}
                  </code>
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">500</td>
                <td className="py-2 pr-4">Internal server error</td>
                <td className="py-2">
                  <code className="text-xs">
                    {`{"error": "Internal Server Error"}`}
                  </code>
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">503</td>
                <td className="py-2 pr-4">Service unavailable / not configured</td>
                <td className="py-2">
                  <code className="text-xs">
                    {`{"error": "Webhook secret not configured"}`}
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ENVIRONMENT VARIABLES */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
          Environment Variables Reference
        </h2>
        <p className="text-gray-300 text-sm">
          The following environment variables control API authentication and
          behavior.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4 text-gray-400 font-medium">Variable</th>
                <th className="py-2 pr-4 text-gray-400 font-medium">Used By</th>
                <th className="py-2 text-gray-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">
                  <code className="text-blue-300 text-xs">HEALTH_SECRET</code>
                </td>
                <td className="py-2 pr-4">/api/health</td>
                <td className="py-2">Bearer token for detailed health check output</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">
                  <code className="text-blue-300 text-xs">METRICS_SECRET</code>
                </td>
                <td className="py-2 pr-4">/api/metrics</td>
                <td className="py-2">
                  Bearer token for Prometheus metrics (required in production)
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">
                  <code className="text-blue-300 text-xs">SUPPLYPRO_WEBHOOK_SECRET</code>
                </td>
                <td className="py-2 pr-4">/api/webhooks/supplypro</td>
                <td className="py-2">
                  HMAC-SHA256 shared secret for SupplyPro signature verification
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">
                  <code className="text-blue-300 text-xs">GOOGLE_CALENDAR_WEBHOOK_TOKEN</code>
                </td>
                <td className="py-2 pr-4">/api/webhooks/google-calendar</td>
                <td className="py-2">
                  Channel token for Google Calendar push notification verification
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
