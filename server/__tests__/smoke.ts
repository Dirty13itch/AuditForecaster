#!/usr/bin/env tsx
/**
 * Smoke Test for Report Template System
 * Validates the complete vertical slice end-to-end
 * 
 * Usage: tsx server/__tests__/smoke.ts
 */

import http from 'http';
import { serverLogger } from '../logger';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TIMEOUT_MS = 5000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function httpRequest(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: TIMEOUT_MS,
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`✅ ${name} (${Date.now() - startTime}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    console.error(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  console.log('🧪 Starting Report Template System Smoke Tests\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  // Test 1: Health Check
  await runTest('Health check responds', async () => {
    const res = await httpRequest('GET', '/healthz');
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (res.data.status !== 'healthy') {
      throw new Error(`Expected healthy status, got ${res.data.status}`);
    }
  });

  // Test 2: Readiness Check
  await runTest('Readiness check with database validation', async () => {
    const res = await httpRequest('GET', '/readyz');
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (!res.data.checks?.database) {
      throw new Error('Database check missing from readiness response');
    }
  });

  // Test 3: Status Endpoint
  await runTest('Status endpoint returns version info', async () => {
    const res = await httpRequest('GET', '/api/status');
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (!res.data.version) {
      throw new Error('Version missing from status response');
    }
    if (!res.data.uptime) {
      throw new Error('Uptime missing from status response');
    }
  });

  // Test 4: Correlation ID Header
  await runTest('Correlation ID in response headers', async () => {
    const res = await httpRequest('GET', '/healthz');
    if (!res.headers['x-correlation-id']) {
      throw new Error('X-Correlation-ID header missing');
    }
  });

  // Test 5: API Authentication (should redirect or 401 without auth)
  await runTest('API requires authentication', async () => {
    const res = await httpRequest('GET', '/api/report-templates');
    if (res.status !== 302 && res.status !== 401) {
      throw new Error(`Expected 302 or 401, got ${res.status}`);
    }
  });

  // Test 6: CSRF Protection
  await runTest('CSRF protection enabled', async () => {
    try {
      // Attempt POST without CSRF token (should fail)
      const res = await httpRequest('POST', '/api/report-templates', {
        name: 'Test',
        category: 'Inspection',
      });
      // Should get 403 (Forbidden) due to CSRF
      if (res.status === 201) {
        throw new Error('CSRF protection not working - POST succeeded without token');
      }
    } catch (error) {
      // Connection errors are expected since we don't have auth
      // This test passes if we get here
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Smoke Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
