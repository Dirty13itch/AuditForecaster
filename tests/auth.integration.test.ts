import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Authentication Integration Tests
 * 
 * These tests verify the authentication system endpoints and flows.
 * Note: These are integration tests that test the HTTP API endpoints.
 * 
 * Prerequisites:
 * - Application server must be running
 * - Database must be connected (for some endpoints)
 * - Environment variables must be configured
 */

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';

describe('Authentication Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('should return health status with correct structure', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.ok).toBe(true);
      
      const health = await response.json();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('environment');
      expect(health).toHaveProperty('components');
      
      expect(health.components).toHaveProperty('oidc');
      expect(health.components).toHaveProperty('database');
      expect(health.components).toHaveProperty('sessionStore');
      expect(health.components).toHaveProperty('domains');
      expect(health.components).toHaveProperty('currentDomain');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should include OIDC configuration status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const health = await response.json();
      
      expect(health.components.oidc).toHaveProperty('status');
      expect(health.components.oidc).toHaveProperty('message');
      expect(['working', 'failed']).toContain(health.components.oidc.status);
    });

    it('should include database connectivity status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const health = await response.json();
      
      expect(health.components.database).toHaveProperty('status');
      expect(health.components.database).toHaveProperty('message');
      expect(['connected', 'disconnected', 'not_configured']).toContain(
        health.components.database.status
      );
    });

    it('should include session store configuration', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const health = await response.json();
      
      expect(health.components.sessionStore).toHaveProperty('status');
      expect(['postgresql', 'in_memory']).toContain(
        health.components.sessionStore.status
      );
    });

    it('should include registered domains', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const health = await response.json();
      
      expect(health.components.domains).toHaveProperty('registered');
      expect(health.components.domains).toHaveProperty('status');
      expect(Array.isArray(health.components.domains.registered)).toBe(true);
    });

    it('should include current domain status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const health = await response.json();
      
      expect(health.components.currentDomain).toHaveProperty('hostname');
      expect(health.components.currentDomain).toHaveProperty('status');
      expect(['recognized', 'unknown']).toContain(
        health.components.currentDomain.status
      );
    });
  });

  describe('Status Endpoint', () => {
    it('should return API status', async () => {
      const response = await fetch(`${BASE_URL}/api/status`);
      expect(response.ok).toBe(true);
      
      const status = await response.json();
      expect(status).toHaveProperty('status');
      expect(status.status).toBe('ok');
    });
  });

  describe('Troubleshooting Endpoint', () => {
    it('should return all troubleshooting guides when no code specified', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/troubleshooting`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('guides');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('categories');
      expect(Array.isArray(data.guides)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
      
      expect(data.categories).toHaveProperty('configuration');
      expect(data.categories).toHaveProperty('network');
      expect(data.categories).toHaveProperty('environment');
      expect(data.categories).toHaveProperty('infrastructure');
    });

    it('should return specific troubleshooting guide for valid code', async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/troubleshooting/DOMAIN_NOT_REGISTERED`
      );
      expect(response.ok).toBe(true);
      
      const guide = await response.json();
      
      expect(guide).toHaveProperty('code');
      expect(guide).toHaveProperty('title');
      expect(guide).toHaveProperty('symptoms');
      expect(guide).toHaveProperty('commonCauses');
      expect(guide).toHaveProperty('fixes');
      expect(guide).toHaveProperty('relatedEndpoints');
      expect(guide).toHaveProperty('severity');
      expect(guide).toHaveProperty('category');
      
      expect(guide.code).toBe('DOMAIN_NOT_REGISTERED');
      expect(Array.isArray(guide.symptoms)).toBe(true);
      expect(Array.isArray(guide.commonCauses)).toBe(true);
      expect(Array.isArray(guide.fixes)).toBe(true);
      expect(Array.isArray(guide.relatedEndpoints)).toBe(true);
      
      expect(['critical', 'high', 'medium', 'low']).toContain(guide.severity);
      expect(['configuration', 'network', 'environment', 'infrastructure']).toContain(
        guide.category
      );
    });

    it('should validate troubleshooting guide structure for fixes', async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/troubleshooting/OIDC_DISCOVERY_FAILURE`
      );
      const guide = await response.json();
      
      expect(guide.fixes.length).toBeGreaterThan(0);
      guide.fixes.forEach((fix: any) => {
        expect(fix).toHaveProperty('step');
        expect(fix).toHaveProperty('instruction');
        expect(typeof fix.step).toBe('number');
        expect(typeof fix.instruction).toBe('string');
      });
    });

    it('should validate troubleshooting guide structure for related endpoints', async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/troubleshooting/DATABASE_CONNECTIVITY`
      );
      const guide = await response.json();
      
      expect(guide.relatedEndpoints.length).toBeGreaterThan(0);
      guide.relatedEndpoints.forEach((endpoint: any) => {
        expect(endpoint).toHaveProperty('method');
        expect(endpoint).toHaveProperty('path');
        expect(endpoint).toHaveProperty('description');
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(endpoint.method);
      });
    });

    it('should return 404 with fallback for invalid code', async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/troubleshooting/INVALID_CODE_12345`
      );
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('fallbackGuide');
      expect(data.fallbackGuide).toHaveProperty('code');
      expect(data.fallbackGuide.code).toBe('GENERAL_AUTH_ERROR');
    });

    it('should include all expected troubleshooting guide codes', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/troubleshooting`);
      const data = await response.json();
      
      const expectedCodes = [
        'DOMAIN_NOT_REGISTERED',
        'OIDC_DISCOVERY_FAILURE',
        'TOKEN_REFRESH_FAILURE',
        'SESSION_EXPIRED',
        'COOKIE_ISSUES',
        'DATABASE_CONNECTIVITY',
        'INVALID_REPL_ID',
        'MISSING_ENV_VARS',
        'CIRCUIT_BREAKER_OPEN',
        'CALLBACK_FAILURE',
        'GENERAL_AUTH_ERROR',
      ];
      
      const actualCodes = data.guides.map((g: any) => g.code);
      expectedCodes.forEach(code => {
        expect(actualCodes).toContain(code);
      });
    });
  });

  describe('CSRF Token Endpoint', () => {
    it('should require authentication for CSRF token', async () => {
      const response = await fetch(`${BASE_URL}/api/csrf-token`);
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Login Initiation', () => {
    it('should redirect to OIDC provider when accessing /api/login', async () => {
      const response = await fetch(`${BASE_URL}/api/login`, {
        redirect: 'manual',
      });
      
      expect([302, 303, 307]).toContain(response.status);
      
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
      
      if (location) {
        expect(location).toMatch(/replit\.com/);
      }
    });
  });

  describe('Protected Endpoints (Unauthenticated)', () => {
    it('should require authentication for diagnostics endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/diagnostics`);
      expect([401, 403]).toContain(response.status);
    });

    it('should require authentication for metrics endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/metrics`);
      expect([401, 403]).toContain(response.status);
    });

    it('should require authentication for domain testing endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/test-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: 'test.repl.co' }),
      });
      expect([401, 403]).toContain(response.status);
    });

    it('should require authentication for user endpoint', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/user`);
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Dev Mode Endpoints', () => {
    it('should return dev mode status', async () => {
      const response = await fetch(`${BASE_URL}/api/dev/status`);
      
      const status = await response.json();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('environment');
      expect(typeof status.enabled).toBe('boolean');
    });

    it('should handle dev mode login appropriately based on environment', async () => {
      const response = await fetch(`${BASE_URL}/api/dev/login-as?userId=test-user`, {
        redirect: 'manual',
      });
      
      if (response.status === 302 || response.status === 303) {
        expect(response.headers.get('location')).toBeTruthy();
      } else if (response.status === 403) {
        const data = await response.json();
        expect(data).toHaveProperty('message');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/test-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });
      
      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('Response Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      
      expect(response.headers.has('x-content-type-options')).toBe(true);
    });
  });

  describe('API Documentation Coverage', () => {
    it('should have troubleshooting guide for each critical error scenario', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/troubleshooting`);
      const data = await response.json();
      
      const criticalGuides = data.guides.filter(
        (g: any) => g.severity === 'critical'
      );
      
      expect(criticalGuides.length).toBeGreaterThan(0);
      
      const criticalCodes = criticalGuides.map((g: any) => g.code);
      expect(criticalCodes).toContain('DOMAIN_NOT_REGISTERED');
      expect(criticalCodes).toContain('OIDC_DISCOVERY_FAILURE');
    });

    it('should categorize all guides appropriately', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/troubleshooting`);
      const data = await response.json();
      
      const { categories } = data;
      const total = 
        categories.configuration +
        categories.network +
        categories.environment +
        categories.infrastructure;
      
      expect(total).toBe(data.total);
    });
  });

  describe('Health Check Reliability', () => {
    it('should consistently return valid health status', async () => {
      const responses = await Promise.all([
        fetch(`${BASE_URL}/api/health`),
        fetch(`${BASE_URL}/api/health`),
        fetch(`${BASE_URL}/api/health`),
      ]);
      
      for (const response of responses) {
        expect(response.ok).toBe(true);
        const health = await response.json();
        expect(health).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      }
    });

    it('should have reasonable response time for health check', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/health`);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Troubleshooting Guide Quality', () => {
    it('should provide actionable fixes for each guide', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/troubleshooting`);
      const data = await response.json();
      
      data.guides.forEach((guide: any) => {
        expect(guide.fixes.length).toBeGreaterThan(0);
        expect(guide.symptoms.length).toBeGreaterThan(0);
        expect(guide.commonCauses.length).toBeGreaterThan(0);
        
        guide.fixes.forEach((fix: any) => {
          expect(fix.instruction.length).toBeGreaterThan(10);
        });
      });
    });

    it('should link to relevant diagnostic endpoints', async () => {
      const response = await fetch(
        `${BASE_URL}/api/auth/troubleshooting/OIDC_DISCOVERY_FAILURE`
      );
      const guide = await response.json();
      
      expect(guide.relatedEndpoints.length).toBeGreaterThan(0);
      
      const healthEndpoint = guide.relatedEndpoints.find(
        (e: any) => e.path === '/api/health'
      );
      expect(healthEndpoint).toBeTruthy();
    });
  });
});
