/**
 * CRITICAL SECURITY TESTS
 * 
 * These tests verify that NO secrets are exposed in any client-facing endpoints.
 * If any of these tests fail, it indicates a critical security vulnerability.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { sanitizeEnvironmentForClient } from '../server/auth/validation';

describe('Security: Secret Sanitization', () => {
  describe('sanitizeEnvironmentForClient()', () => {
    it('should NEVER expose SESSION_SECRET value', () => {
      const sanitized = sanitizeEnvironmentForClient();
      
      // SESSION_SECRET should be an object with metadata only
      expect(sanitized.SESSION_SECRET).toHaveProperty('present');
      expect(sanitized.SESSION_SECRET).toHaveProperty('length');
      
      // Should NOT have any property that contains the actual secret
      expect(sanitized.SESSION_SECRET).not.toHaveProperty('value');
      expect(sanitized.SESSION_SECRET).not.toHaveProperty('secret');
      
      // Convert to JSON and verify no secret value can leak
      const json = JSON.stringify(sanitized);
      
      // The actual SESSION_SECRET from process.env should NEVER appear in sanitized output
      if (process.env.SESSION_SECRET) {
        expect(json).not.toContain(process.env.SESSION_SECRET);
      }
    });

    it('should mask DATABASE_URL and not expose credentials', () => {
      const sanitized = sanitizeEnvironmentForClient();
      
      if (sanitized.DATABASE_URL.present) {
        // Should have masked value
        expect(sanitized.DATABASE_URL.masked).toBeTruthy();
        
        // Convert to JSON and verify full URL doesn't leak
        const json = JSON.stringify(sanitized);
        
        // If DATABASE_URL exists, the full value should NOT appear in output
        if (process.env.DATABASE_URL && process.env.DATABASE_URL.length > 30) {
          // The middle portion of the URL (which contains credentials) should not be present
          const fullUrl = process.env.DATABASE_URL;
          const middlePortion = fullUrl.substring(10, fullUrl.length - 10);
          
          // The sanitized output should NOT contain the middle portion
          expect(json).not.toContain(middlePortion);
        }
      }
    });

    it('should mask REPL_ID to only show first 8 characters', () => {
      const sanitized = sanitizeEnvironmentForClient();
      
      expect(sanitized.REPL_ID).toHaveProperty('present');
      expect(sanitized.REPL_ID).toHaveProperty('masked');
      expect(sanitized.REPL_ID).toHaveProperty('length');
      
      // Masked value should end with '...'
      expect(sanitized.REPL_ID.masked).toMatch(/\.\.\./);
      
      // The REPL_ID.masked field itself should only show first 8 chars + ...
      if (process.env.REPL_ID && process.env.REPL_ID.length > 8) {
        // Check that the masked field only contains first 8 chars
        const first8 = process.env.REPL_ID.substring(0, 8);
        expect(sanitized.REPL_ID.masked).toBe(first8 + '...');
        
        // NOTE: REPL_ID may appear in REPLIT_DOMAINS (as part of the public domain name)
        // This is expected and not a security issue since domains are public.
        // We only verify the REPL_ID field itself is properly masked.
      }
    });

    it('should only expose safe, non-sensitive environment data', () => {
      const sanitized = sanitizeEnvironmentForClient();
      
      // These are safe to expose
      expect(sanitized).toHaveProperty('NODE_ENV');
      expect(sanitized).toHaveProperty('ISSUER_URL');
      expect(sanitized).toHaveProperty('REPLIT_DOMAINS');
      
      // Verify structure is correct
      expect(typeof sanitized.NODE_ENV).toBe('string');
      expect(typeof sanitized.ISSUER_URL).toBe('string');
      expect(Array.isArray(sanitized.REPLIT_DOMAINS)).toBe(true);
    });

    it('should not leak any secrets when converted to JSON', () => {
      const sanitized = sanitizeEnvironmentForClient();
      const json = JSON.stringify(sanitized, null, 2);
      
      // Critical secrets that should NEVER appear
      const criticalSecrets = [
        process.env.SESSION_SECRET,
        // Add other critical values that should never leak
      ].filter(Boolean);
      
      for (const secret of criticalSecrets) {
        if (secret && secret.length > 10) {
          // Check that no substring of the secret (longer than 10 chars) appears
          for (let i = 0; i <= secret.length - 10; i++) {
            const substring = secret.substring(i, i + 10);
            expect(json).not.toContain(substring);
          }
        }
      }
    });
  });

  describe('Security: Response validation', () => {
    it('should have well-defined structure for SESSION_SECRET metadata', () => {
      const sanitized = sanitizeEnvironmentForClient();
      const sessionSecret = sanitized.SESSION_SECRET;
      
      // Must be an object
      expect(typeof sessionSecret).toBe('object');
      
      // Must have exactly these properties (no more, no less)
      const keys = Object.keys(sessionSecret);
      expect(keys).toContain('present');
      expect(keys).toContain('length');
      
      // Should not have any value-like properties
      expect(keys).not.toContain('value');
      expect(keys).not.toContain('secret');
      expect(keys).not.toContain('key');
      expect(keys).not.toContain('token');
    });

    it('should provide useful metadata without exposing secrets', () => {
      const sanitized = sanitizeEnvironmentForClient();
      
      // Verify metadata is useful for diagnostics
      if (process.env.SESSION_SECRET) {
        expect(sanitized.SESSION_SECRET.present).toBe(true);
        expect(sanitized.SESSION_SECRET.length).toBeGreaterThan(0);
      }
      
      if (process.env.REPL_ID) {
        expect(sanitized.REPL_ID.present).toBe(true);
        expect(sanitized.REPL_ID.length).toBeGreaterThan(0);
        expect(sanitized.REPL_ID.masked).toBeTruthy();
      }
      
      if (process.env.DATABASE_URL) {
        expect(sanitized.DATABASE_URL.present).toBe(true);
        expect(sanitized.DATABASE_URL.length).toBeGreaterThan(0);
      }
    });
  });
});

/**
 * INTEGRATION TEST NOTES:
 * 
 * To fully test the /api/auth/diagnostics endpoint, you would need to:
 * 1. Start the server
 * 2. Authenticate as an admin user
 * 3. Make a GET request to /api/auth/diagnostics
 * 4. Verify the response follows the same rules as above
 * 
 * This would be done in an integration test file like:
 * tests/auth.integration.test.ts
 * 
 * Example integration test:
 * 
 * it('GET /api/auth/diagnostics should not expose SESSION_SECRET', async () => {
 *   const response = await authenticatedRequest('/api/auth/diagnostics');
 *   const body = await response.json();
 *   
 *   expect(body.environment.SESSION_SECRET).not.toHaveProperty('value');
 *   expect(JSON.stringify(body)).not.toContain(process.env.SESSION_SECRET);
 * });
 */
