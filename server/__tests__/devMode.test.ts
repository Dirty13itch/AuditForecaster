import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Dev Mode Production Safety Tests
 * 
 * These tests verify that dev mode endpoints return 404 in production,
 * ensuring they cannot be accessed in production environments.
 * 
 * CRITICAL SECURITY TESTS:
 * - Dev login endpoints must be completely inaccessible in production
 * - Dev status endpoint must return 404 in production
 * - No development bypass should work outside of development mode
 */

describe('Dev Mode Production Safety', () => {
  let app: Express;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    // Save original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    
    // Set NODE_ENV to production to test production behavior
    process.env.NODE_ENV = 'production';
    
    // Clear any cached modules to ensure fresh imports with new env
    vi.resetModules();
    
    // Import config and server with production environment
    const { default: express } = await import('express');
    const { registerRoutes } = await import('../routes.ts');
    
    // Create a fresh Express app
    app = express();
    
    // Register routes (which should now be in production mode)
    await registerRoutes(app);
  });

  afterAll(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    // Reset modules to clear production mode state
    vi.resetModules();
  });

  describe('GET /api/dev-login/:userId', () => {
    it('should return 404 for test-admin in production', async () => {
      const response = await request(app)
        .get('/api/dev-login/test-admin')
        .expect(404);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not found');
    });

    it('should return 404 for test-inspector1 in production', async () => {
      const response = await request(app)
        .get('/api/dev-login/test-inspector1')
        .expect(404);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not found');
    });

    it('should return 404 for test-inspector2 in production', async () => {
      const response = await request(app)
        .get('/api/dev-login/test-inspector2')
        .expect(404);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not found');
    });

    it('should return 404 for any arbitrary user in production', async () => {
      const response = await request(app)
        .get('/api/dev-login/arbitrary-user-123')
        .expect(404);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not found');
    });

    it('should not accept POST requests to dev-login in production', async () => {
      const response = await request(app)
        .post('/api/dev-login/test-admin')
        .expect(404);
    });
  });

  describe('GET /api/dev/status', () => {
    it('should return 404 in production', async () => {
      const response = await request(app)
        .get('/api/dev/status')
        .expect(404);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not found');
    });

    it('should not expose dev mode information in production', async () => {
      const response = await request(app)
        .get('/api/dev/status');
      
      // Should not have enabled property in 404 response
      expect(response.body).not.toHaveProperty('enabled');
      expect(response.body).not.toHaveProperty('activeSession');
    });

    it('should not accept POST requests to dev/status in production', async () => {
      const response = await request(app)
        .post('/api/dev/status')
        .expect(404);
    });
  });

  describe('Production Security Hardening', () => {
    it('should ensure no dev endpoints are accessible at all', async () => {
      const devEndpoints = [
        '/api/dev/status',
        '/api/dev-login/test-admin',
        '/api/dev-login/test-inspector1',
        '/api/dev-login/test-inspector2',
      ];

      const results = await Promise.all(
        devEndpoints.map(endpoint => 
          request(app).get(endpoint)
        )
      );

      // All endpoints should return 404
      results.forEach((response, index) => {
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Not found');
      });
    });

    it('should not leak environment information through error messages', async () => {
      const response = await request(app)
        .get('/api/dev-login/test-admin');
      
      const responseText = JSON.stringify(response.body).toLowerCase();
      
      // Should not contain any dev mode hints
      expect(responseText).not.toContain('development');
      expect(responseText).not.toContain('dev mode');
      expect(responseText).not.toContain('bypass');
      expect(responseText).not.toContain('disabled in production');
    });
  });
});
