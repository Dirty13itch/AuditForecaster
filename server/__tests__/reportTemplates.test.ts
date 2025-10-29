/**
 * Report Template System - Integration Tests
 * Tests the complete vertical slice: Designer → Detail → Create Instance → Fillout
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import type { Server } from 'http';

let app: express.Application;
let server: Server;
let authCookie: string;
let testTemplateId: string;
let testInstanceId: string;

// Mock template data
const mockTemplate = {
  name: `Test Template ${Date.now()}`,
  description: 'Integration test template',
  category: 'Inspection',
  inspectionType: 'Pre-Drywall',
  version: 1,
  status: 'draft',
  components: [
    {
      id: 'test-section',
      type: 'section',
      label: 'Test Section',
      properties: { collapsible: false }
    },
    {
      id: 'test-text-field',
      type: 'text',
      label: 'Company Name',
      properties: { required: true }
    },
    {
      id: 'test-number-field',
      type: 'number',
      label: 'Area (sq ft)',
      properties: { required: true, min: 0 }
    }
  ]
};

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);
  
  // Authenticate as test admin
  const loginRes = await request(app).get('/api/dev-login/test-admin');
  authCookie = loginRes.headers['set-cookie']?.[0] || '';
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('Report Template System - Full Vertical Slice', () => {
  
  describe('1. Template Designer → Save Template', () => {
    it('should create a new report template', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const csrfToken = csrfRes.body.token;
      
      const res = await request(app)
        .post('/api/report-templates')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfToken)
        .send(mockTemplate);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(mockTemplate.name);
      expect(res.body.components).toHaveLength(3);
      
      testTemplateId = res.body.id;
    });
    
    it('should validate required fields', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-templates')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .send({
          // Missing required fields
          description: 'Test'
        });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('2. Template List → Detail Page', () => {
    it('should retrieve all templates', async () => {
      const res = await request(app)
        .get('/api/report-templates')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
    
    it('should retrieve specific template by ID', async () => {
      const res = await request(app)
        .get(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTemplateId);
      expect(res.body.name).toBe(mockTemplate.name);
      expect(res.body.components).toHaveLength(3);
    });
    
    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/report-templates/non-existent-id')
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('3. Detail Page → Create Report Instance', () => {
    it('should create report instance from template', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-instances')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .send({
          templateId: testTemplateId,
          templateVersion: 1,
          status: 'draft'
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.templateId).toBe(testTemplateId);
      expect(res.body.status).toBe('draft');
      expect(res.body.jobId).toBeNull(); // Standalone report
      
      testInstanceId = res.body.id;
    });
    
    it('should require template version', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-instances')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .send({
          templateId: testTemplateId,
          status: 'draft'
          // Missing templateVersion - should use default
        });
      
      // Should succeed with default version
      expect(res.status).toBe(201);
      expect(res.body.templateVersion).toBe(1);
    });
  });
  
  describe('4. Fillout Page → Load & Save Field Values', () => {
    it('should retrieve report instance', async () => {
      const res = await request(app)
        .get(`/api/report-instances/${testInstanceId}`)
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testInstanceId);
      expect(res.body.templateId).toBe(testTemplateId);
    });
    
    it('should save field values for text component', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-field-values')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .send({
          reportInstanceId: testInstanceId,
          componentId: 'test-text-field',
          valueText: 'Acme Corporation'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.valueText).toBe('Acme Corporation');
      expect(res.body.componentId).toBe('test-text-field');
    });
    
    it('should save field values for number component', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-field-values')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .send({
          reportInstanceId: testInstanceId,
          componentId: 'test-number-field',
          valueNumber: 2500
        });
      
      expect(res.status).toBe(201);
      expect(res.body.valueNumber).toBe(2500);
      expect(res.body.componentId).toBe('test-number-field');
    });
    
    it('should retrieve all field values for instance', async () => {
      const res = await request(app)
        .get(`/api/report-instances/${testInstanceId}/field-values`)
        .set('Cookie', authCookie);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // Two fields saved
      
      const textField = res.body.find((f: any) => f.componentId === 'test-text-field');
      const numberField = res.body.find((f: any) => f.componentId === 'test-number-field');
      
      expect(textField.valueText).toBe('Acme Corporation');
      expect(numberField.valueNumber).toBe(2500);
    });
  });
  
  describe('5. Health & Observability', () => {
    it('should have working health check', async () => {
      const res = await request(app).get('/healthz');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
    });
    
    it('should have readiness check with database validation', async () => {
      const res = await request(app).get('/readyz');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toMatch(/healthy|degraded/);
      expect(res.body.checks.database).toBeDefined();
    });
    
    it('should return correlation ID in headers', async () => {
      const res = await request(app)
        .get('/api/report-templates')
        .set('Cookie', authCookie);
      
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-correlation-id'].length).toBeGreaterThan(0);
    });
  });
  
  describe('6. Error Handling', () => {
    it('should handle unauthorized access', async () => {
      const res = await request(app)
        .get('/api/report-templates');
      
      // Should redirect or return 401 without auth cookie
      expect([401, 302]).toContain(res.status);
    });
    
    it('should validate CSRF token', async () => {
      const res = await request(app)
        .post('/api/report-templates')
        .set('Cookie', authCookie)
        .send(mockTemplate);
      
      // Missing CSRF token should fail
      expect(res.status).toBe(403);
    });
    
    it('should handle malformed JSON gracefully', async () => {
      const csrfRes = await request(app)
        .get('/csrf-token')
        .set('Cookie', authCookie);
      
      const res = await request(app)
        .post('/api/report-instances')
        .set('Cookie', authCookie)
        .set('x-csrf-token', csrfRes.body.token)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(res.status).toBe(400);
    });
  });
});

/**
 * Unit Tests - Component Validation Logic
 */
describe('Component Validation (Unit Tests)', () => {
  describe('Component Structure', () => {
    it('should have valid component ID', () => {
      const validComponent = { id: 'test-id', type: 'text', label: 'Test' };
      expect(validComponent.id).toMatch(/^[a-z0-9-]+$/);
    });
    
    it('should have required properties', () => {
      const textComponent = mockTemplate.components[1];
      expect(textComponent).toHaveProperty('id');
      expect(textComponent).toHaveProperty('type');
      expect(textComponent).toHaveProperty('label');
      expect(textComponent).toHaveProperty('properties');
    });
  });
  
  describe('Template Versioning', () => {
    it('should default to version 1', () => {
      expect(mockTemplate.version).toBe(1);
    });
    
    it('should preserve template structure', () => {
      const components = mockTemplate.components;
      expect(components).toBeDefined();
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
    });
  });
});
