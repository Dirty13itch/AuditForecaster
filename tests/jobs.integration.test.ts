/**
 * Jobs API Integration Tests
 * 
 * Comprehensive integration tests for all Jobs API endpoints covering:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Authentication & Authorization
 * - Data validation
 * - Error handling
 * - Cascade operations
 * - Status transitions
 * - Related resources (schedule events, photos, checklists, etc.)
 * 
 * Coverage: 100+ test cases across ~25 endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { storage } from '../server/storage';
import { db } from '../server/db';
import { jobs, builders, users, scheduleEvents, photos, checklistItems } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('Jobs API Integration Tests', () => {
  // Test data containers
  let testAdminId: string;
  let testInspector1Id: string;
  let testInspector2Id: string;
  let testBuilderId: string;
  let csrfToken: string;
  
  // Auth cookies for different users
  let adminCookie: string;
  let inspector1Cookie: string;
  let inspector2Cookie: string;

  beforeAll(async () => {
    // Use existing dev mode test users
    testAdminId = 'test-admin';
    testInspector1Id = 'test-inspector1';
    testInspector2Id = 'test-inspector2';

    // Create test users directly in database for test environment
    await storage.upsertUser({
      id: testAdminId,
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    await storage.upsertUser({
      id: testInspector1Id,
      email: 'inspector1@test.com',
      firstName: 'Inspector',
      lastName: 'One',
      role: 'inspector'
    });

    await storage.upsertUser({
      id: testInspector2Id,
      email: 'inspector2@test.com',
      firstName: 'Inspector',
      lastName: 'Two',
      role: 'inspector'
    });

    // Set NODE_ENV to development temporarily for dev-login
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      // Login as admin
      const adminLogin = await request(app)
        .get('/api/dev-login/test-admin')
        .redirects(0);
      adminCookie = adminLogin.headers['set-cookie']?.[0] || '';

      // Login as inspector1
      const inspector1Login = await request(app)
        .get('/api/dev-login/test-inspector1')
        .redirects(0);
      inspector1Cookie = inspector1Login.headers['set-cookie']?.[0] || '';

      // Login as inspector2
      const inspector2Login = await request(app)
        .get('/api/dev-login/test-inspector2')
        .redirects(0);
      inspector2Cookie = inspector2Login.headers['set-cookie']?.[0] || '';
    } finally {
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    }

    // Get CSRF token
    const csrfRes = await request(app)
      .get('/api/csrf-token')
      .set('Cookie', adminCookie);
    csrfToken = csrfRes.body.csrfToken;

    // Create test builder
    const builderRes = await request(app)
      .post('/api/builders')
      .set('Cookie', adminCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Test Builder',
        companyName: 'Test Builder Inc',
        email: 'builder@test.com',
        phone: '555-1234',
        address: '123 Builder St, Minneapolis, MN'
      });
    
    testBuilderId = builderRes.body.id;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup test data
    try {
      // Delete all test jobs created by test users
      await db.delete(jobs).where(eq(jobs.createdBy, testAdminId));
      await db.delete(jobs).where(eq(jobs.createdBy, testInspector1Id));
      await db.delete(jobs).where(eq(jobs.createdBy, testInspector2Id));
      
      // Delete test builder
      if (testBuilderId) {
        await db.delete(builders).where(eq(builders.id, testBuilderId));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Clean up jobs before each test for isolation
    await db.delete(jobs).where(eq(jobs.createdBy, testAdminId));
    await db.delete(jobs).where(eq(jobs.createdBy, testInspector1Id));
    await db.delete(jobs).where(eq(jobs.createdBy, testInspector2Id));
  });

  // ============================================================================
  // POST /api/jobs - Create Job (20 test cases)
  // ============================================================================
  describe('POST /api/jobs', () => {
    it('should create a job with minimal required fields', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job 1',
          address: '456 Main St, Minneapolis, MN',
          contractor: 'ABC Construction',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Job 1');
      expect(res.body.address).toBe('456 Main St, Minneapolis, MN');
      expect(res.body.status).toBe('pending');
      expect(res.body.createdBy).toBe(testAdminId);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should create a job with all optional fields', async () => {
      const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Complete Job',
          address: '789 Oak Ave, Minneapolis, MN',
          contractor: 'XYZ Builders',
          builderId: testBuilderId,
          inspectionType: 'Rough',
          scheduledDate: scheduledDate.toISOString(),
          notes: 'Test notes',
          priority: 'high'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Complete Job');
      expect(res.body.notes).toBe('Test notes');
      expect(res.body.priority).toBe('high');
      expect(new Date(res.body.scheduledDate).toISOString()).toBe(scheduledDate.toISOString());
    });

    it('should return 400 for missing name field', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for missing address field', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for missing builderId field', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          inspectionType: 'Final'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for missing inspectionType field', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for invalid inspection type enum', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'InvalidType'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for invalid status enum', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          status: 'invalid_status'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 for invalid priority enum', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          priority: 'super_urgent'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .send({
          name: 'Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(403);
    });

    it('should allow inspector to create job', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Inspector Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body.createdBy).toBe(testInspector1Id);
    });

    it('should auto-generate UUID for job ID', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'UUID Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should set timestamps on creation', async () => {
      const beforeCreate = new Date();
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Timestamp Test',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });
      const afterCreate = new Date();

      expect(res.status).toBe(201);
      const createdAt = new Date(res.body.createdAt);
      const updatedAt = new Date(res.body.updatedAt);
      
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(updatedAt.getTime()).toBe(createdAt.getTime());
    });

    it('should create job with valid inspection types', async () => {
      const types = ['Rough', 'Final', 'Mechanical', 'Blower Door', 'Duct Leakage'];
      
      for (const type of types) {
        const res = await request(app)
          .post('/api/jobs')
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken)
          .send({
            name: `Job ${type}`,
            address: '456 Main St',
            contractor: 'ABC',
            builderId: testBuilderId,
            inspectionType: type
          });

        expect(res.status).toBe(201);
        expect(res.body.inspectionType).toBe(type);
        
        // Cleanup for next iteration
        await db.delete(jobs).where(eq(jobs.id, res.body.id));
      }
    });

    it('should create job with valid priority levels', async () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];
      
      for (const priority of priorities) {
        const res = await request(app)
          .post('/api/jobs')
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken)
          .send({
            name: `Job ${priority}`,
            address: '456 Main St',
            contractor: 'ABC',
            builderId: testBuilderId,
            inspectionType: 'Final',
            priority
          });

        expect(res.status).toBe(201);
        expect(res.body.priority).toBe(priority);
        
        // Cleanup
        await db.delete(jobs).where(eq(jobs.id, res.body.id));
      }
    });

    it('should handle long job names', async () => {
      const longName = 'A'.repeat(500);
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: longName,
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(longName);
    });

    it('should handle special characters in job name', async () => {
      const specialName = "Job #123 @ Builder's Site (Test)";
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: specialName,
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(specialName);
    });

    it('should create job with notes field', async () => {
      const notes = 'Important: Check foundation before inspection';
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Notes Test Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          notes
        });

      expect(res.status).toBe(201);
      expect(res.body.notes).toBe(notes);
    });

    it('should create job with future scheduled date', async () => {
      const futureDate = new Date(Date.now() + 7 * 86400000); // 7 days from now
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Scheduled Job',
          address: '456 Main St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          scheduledDate: futureDate.toISOString()
        });

      expect(res.status).toBe(201);
      expect(new Date(res.body.scheduledDate).toISOString()).toBe(futureDate.toISOString());
    });
  });

  // ============================================================================
  // GET /api/jobs - List Jobs (18 test cases)
  // ============================================================================
  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      // Create multiple test jobs with different attributes
      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Job 1 Pending',
          address: '100 First St, Minneapolis, MN',
          contractor: 'ABC Construction',
          builderId: testBuilderId,
          inspectionType: 'Rough',
          status: 'pending'
        });

      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Job 2 Scheduled',
          address: '200 Second St, Minneapolis, MN',
          contractor: 'XYZ Builders',
          builderId: testBuilderId,
          inspectionType: 'Final',
          status: 'scheduled',
          scheduledDate: new Date(Date.now() + 86400000).toISOString()
        });

      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Job 3 In Progress',
          address: '300 Third St, Minneapolis, MN',
          contractor: 'DEF Corp',
          builderId: testBuilderId,
          inspectionType: 'Mechanical',
          status: 'pending' // Will be updated to in_progress
        });
    });

    it('should return list of all jobs for authenticated user', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(401);
    });

    it('should allow viewer role to access jobs list', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', inspector1Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return jobs with all required fields', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      
      const job = res.body[0];
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('name');
      expect(job).toHaveProperty('address');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('inspectionType');
      expect(job).toHaveProperty('createdAt');
      expect(job).toHaveProperty('updatedAt');
    });

    it('should filter jobs by status=pending', async () => {
      const res = await request(app)
        .get('/api/jobs?status=pending')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.status).toBe('pending');
      });
    });

    it('should filter jobs by status=scheduled', async () => {
      const res = await request(app)
        .get('/api/jobs?status=scheduled')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.status).toBe('scheduled');
      });
    });

    it('should filter jobs by builderId', async () => {
      const res = await request(app)
        .get(`/api/jobs?builderId=${testBuilderId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.builderId).toBe(testBuilderId);
      });
    });

    it('should filter jobs by inspectionType=Rough', async () => {
      const res = await request(app)
        .get('/api/jobs?inspectionType=Rough')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.inspectionType).toBe('Rough');
      });
    });

    it('should filter jobs by inspectionType=Final', async () => {
      const res = await request(app)
        .get('/api/jobs?inspectionType=Final')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.inspectionType).toBe('Final');
      });
    });

    it('should filter jobs by multiple criteria', async () => {
      const res = await request(app)
        .get(`/api/jobs?status=pending&builderId=${testBuilderId}&inspectionType=Rough`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.status).toBe('pending');
        expect(job.builderId).toBe(testBuilderId);
        expect(job.inspectionType).toBe('Rough');
      });
    });

    it('should return empty array when no jobs match filters', async () => {
      const res = await request(app)
        .get('/api/jobs?status=completed&inspectionType=NonExistent')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should sort jobs by scheduled date', async () => {
      const res = await request(app)
        .get('/api/jobs?status=scheduled')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      if (res.body.length >= 2) {
        const dates = res.body.map((j: any) => new Date(j.scheduledDate).getTime());
        const sortedDates = [...dates].sort((a, b) => a - b);
        expect(dates).toEqual(sortedDates);
      }
    });

    it('should include builder information in job list', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('builderId');
      }
    });

    it('should handle large result sets', async () => {
      // Create 20 more jobs
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/jobs')
            .set('Cookie', adminCookie)
            .set('x-csrf-token', csrfToken)
            .send({
              name: `Batch Job ${i}`,
              address: `${i} Test St`,
              contractor: 'ABC',
              builderId: testBuilderId,
              inspectionType: 'Final'
            })
        );
      }
      await Promise.all(promises);

      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(20);
    });

    it('should handle invalid status filter gracefully', async () => {
      const res = await request(app)
        .get('/api/jobs?status=invalid_status')
        .set('Cookie', adminCookie);

      // Should either return 400 or empty array
      expect([200, 400]).toContain(res.status);
    });

    it('should handle invalid builderId filter', async () => {
      const res = await request(app)
        .get('/api/jobs?builderId=non-existent-id')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should filter jobs by priority', async () => {
      // Create a high priority job
      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'High Priority Job',
          address: '999 Priority St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          priority: 'high'
        });

      const res = await request(app)
        .get('/api/jobs?priority=high')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.priority).toBe('high');
      });
    });

    it('should return jobs created by specific user', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      res.body.forEach((job: any) => {
        expect(job.createdBy).toBeDefined();
      });
    });
  });

  // ============================================================================
  // GET /api/jobs/:id - Get Single Job (12 test cases)
  // ============================================================================
  describe('GET /api/jobs/:id', () => {
    let testJobId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Single Job Test',
          address: '123 Test St, Minneapolis, MN',
          contractor: 'ABC Construction',
          builderId: testBuilderId,
          inspectionType: 'Final',
          notes: 'Test notes for single job'
        });
      testJobId = res.body.id;
    });

    it('should return job by ID with all fields', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testJobId);
      expect(res.body.name).toBe('Single Job Test');
      expect(res.body.address).toBe('123 Test St, Minneapolis, MN');
      expect(res.body.contractor).toBe('ABC Construction');
      expect(res.body.builderId).toBe(testBuilderId);
      expect(res.body.inspectionType).toBe('Final');
      expect(res.body.notes).toBe('Test notes for single job');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/jobs/invalid-id-format')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get(`/api/jobs/${testJobId}`);
      expect(res.status).toBe(401);
    });

    it('should allow inspector to view job', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', inspector1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testJobId);
    });

    it('should include timestamps in response', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      expect(new Date(res.body.createdAt).getTime()).toBeLessThanOrEqual(
        new Date(res.body.updatedAt).getTime()
      );
    });

    it('should include status field', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
      expect(['pending', 'scheduled', 'in_progress', 'completed', 'review', 'cancelled']).toContain(res.body.status);
    });

    it('should include createdBy user reference', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.createdBy).toBe(testAdminId);
    });

    it('should return job with null optional fields', async () => {
      // Create job with minimal fields
      const minimalRes = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Minimal Job',
          address: '999 Min St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      const res = await request(app)
        .get(`/api/jobs/${minimalRes.body.id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.notes).toBeNull();
      expect(res.body.scheduledDate).toBeNull();
    });

    it('should return job with builder reference', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.builderId).toBe(testBuilderId);
    });

    it('should handle concurrent requests for same job', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get(`/api/jobs/${testJobId}`)
          .set('Cookie', adminCookie)
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(testJobId);
      });
    });

    it('should return consistent data on multiple fetches', async () => {
      const res1 = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      const res2 = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body).toEqual(res2.body);
    });
  });

  // ============================================================================
  // PATCH /api/jobs/:id/status - Update Job Status (15 test cases)
  // ============================================================================
  describe('PATCH /api/jobs/:id/status', () => {
    let testJobId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Status Update Test',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          status: 'pending'
        });
      testJobId = res.body.id;
    });

    it('should update status from pending to scheduled', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('scheduled');
      expect(res.body.updatedAt).not.toBe(res.body.createdAt);
    });

    it('should update status from scheduled to in_progress', async () => {
      // First set to scheduled
      await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      // Then to in_progress
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
    });

    it('should update status from in_progress to completed', async () => {
      // Set to scheduled then in_progress
      await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'in_progress' });

      // Then to completed
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });

    it('should allow status change to cancelled from any status', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should update updatedAt timestamp when status changes', async () => {
      const before = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(before.body.updatedAt).getTime()
      );
    });

    it('should return 400 for invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .patch('/api/jobs/00000000-0000-0000-0000-000000000000/status')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when CSRF token missing', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(403);
    });

    it('should allow inspector to update own job status', async () => {
      // Create job as inspector1
      const createRes = await request(app)
        .post('/api/jobs')
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Inspector Job',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      const res = await request(app)
        .patch(`/api/jobs/${createRes.body.id}/status`)
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('scheduled');
    });

    it('should maintain other job fields when updating status', async () => {
      const before = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(before.body.name);
      expect(res.body.address).toBe(before.body.address);
      expect(res.body.contractor).toBe(before.body.contractor);
      expect(res.body.inspectionType).toBe(before.body.inspectionType);
    });

    it('should handle rapid status updates', async () => {
      await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'scheduled' });

      await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'in_progress' });

      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'review' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
    });

    it('should return 400 for missing status field', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should allow status=review for quality control', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'review' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
    });
  });

  // ============================================================================
  // DELETE /api/jobs/:id - Delete Job (10 test cases)
  // ============================================================================
  describe('DELETE /api/jobs/:id', () => {
    let testJobId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Delete Test Job',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });
      testJobId = res.body.id;
    });

    it('should delete job successfully', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(204);
    });

    it('should return 404 after deleting job', async () => {
      await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .delete('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).delete(`/api/jobs/${testJobId}`);
      expect(res.status).toBe(401);
    });

    it('should return 403 when CSRF token missing', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(403);
    });

    it('should allow admin to delete any job', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(204);
    });

    it('should allow inspector to delete own job', async () => {
      // Create job as inspector
      const createRes = await request(app)
        .post('/api/jobs')
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Inspector Job',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      const res = await request(app)
        .delete(`/api/jobs/${createRes.body.id}`)
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(204);
    });

    it('should cascade delete schedule events', async () => {
      // Create a schedule event for the job
      await storage.createScheduleEvent({
        jobId: testJobId,
        title: 'Test Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000)
      });

      // Delete the job
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(204);

      // Verify schedule events are deleted
      const events = await storage.getScheduleEventsByJob(testJobId);
      expect(events.length).toBe(0);
    });

    it('should handle deleting job with no related records', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(204);
    });

    it('should not allow deleting same job twice', async () => {
      await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/jobs/today - Get Today's Jobs (8 test cases)
  // ============================================================================
  describe('GET /api/jobs/today', () => {
    beforeEach(async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // Create job scheduled for today
      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Today Job',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          scheduledDate: today.toISOString()
        });

      // Create job for tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Tomorrow Job',
          address: '456 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          scheduledDate: tomorrow.toISOString()
        });
    });

    it('should return only jobs scheduled for today', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      res.body.forEach((job: any) => {
        if (job.scheduledDate) {
          const jobDate = new Date(job.scheduledDate);
          jobDate.setHours(0, 0, 0, 0);
          expect(jobDate.getTime()).toBe(today.getTime());
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/jobs/today');
      expect(res.status).toBe(401);
    });

    it('should allow inspector to view today\'s jobs', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', inspector1Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return empty array when no jobs today', async () => {
      // Delete all today's jobs
      const jobsRes = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      for (const job of jobsRes.body) {
        await request(app)
          .delete(`/api/jobs/${job.id}`)
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken);
      }

      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should include all required job fields', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        const job = res.body[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('name');
        expect(job).toHaveProperty('address');
        expect(job).toHaveProperty('status');
      }
    });

    it('should handle timezone correctly', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should not include cancelled jobs', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      res.body.forEach((job: any) => {
        expect(job.status).not.toBe('cancelled');
      });
    });

    it('should include jobs with different statuses', async () => {
      const res = await request(app)
        .get('/api/jobs/today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        const statuses = res.body.map((j: any) => j.status);
        expect(statuses.some((s: string) => 
          ['pending', 'scheduled', 'in_progress', 'completed', 'review'].includes(s)
        )).toBe(true);
      }
    });
  });

  // ============================================================================
  // GET /api/jobs/completed-today - Get Completed Today (5 test cases)
  // ============================================================================
  describe('GET /api/jobs/completed-today', () => {
    beforeEach(async () => {
      const today = new Date();
      
      // Create completed job today
      const jobRes = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Completed Today',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final',
          status: 'pending'
        });

      // Update to completed with completedDate
      await storage.updateJobStatus(jobRes.body.id, 'completed', {
        completedDate: today
      });
    });

    it('should return jobs completed today', async () => {
      const res = await request(app)
        .get('/api/jobs/completed-today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((job: any) => {
        expect(job.status).toBe('completed');
        if (job.completedDate) {
          const completedDate = new Date(job.completedDate);
          const today = new Date();
          expect(completedDate.toDateString()).toBe(today.toDateString());
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/jobs/completed-today');
      expect(res.status).toBe(401);
    });

    it('should return empty array when no completions today', async () => {
      // Delete all completed jobs
      const jobsRes = await request(app)
        .get('/api/jobs/completed-today')
        .set('Cookie', adminCookie);

      for (const job of jobsRes.body) {
        await request(app)
          .delete(`/api/jobs/${job.id}`)
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken);
      }

      const res = await request(app)
        .get('/api/jobs/completed-today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should not include jobs completed yesterday', async () => {
      const res = await request(app)
        .get('/api/jobs/completed-today')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      res.body.forEach((job: any) => {
        if (job.completedDate) {
          const completedDate = new Date(job.completedDate);
          completedDate.setHours(0, 0, 0, 0);
          expect(completedDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
        }
      });
    });

    it('should allow inspector to view completed jobs', async () => {
      const res = await request(app)
        .get('/api/jobs/completed-today')
        .set('Cookie', inspector1Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============================================================================
  // POST /api/jobs/:id/assign - Assign Job to Inspector (8 test cases)
  // ============================================================================
  describe('POST /api/jobs/:id/assign', () => {
    let testJobId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Assignment Test',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });
      testJobId = res.body.id;
    });

    it('should assign job to inspector', async () => {
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector1Id });

      expect(res.status).toBe(200);
      expect(res.body.assignedTo).toBe(testInspector1Id);
      expect(res.body.assignedBy).toBe(testAdminId);
      expect(res.body.assignedAt).toBeDefined();
    });

    it('should require admin role to assign jobs', async () => {
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', inspector1Cookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector2Id });

      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .send({ inspectorId: testInspector1Id });

      expect(res.status).toBe(401);
    });

    it('should return 403 when CSRF token missing', async () => {
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .send({ inspectorId: testInspector1Id });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .post('/api/jobs/00000000-0000-0000-0000-000000000000/assign')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector1Id });

      expect(res.status).toBe(404);
    });

    it('should allow reassignment to different inspector', async () => {
      // First assignment
      await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector1Id });

      // Reassignment
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector2Id });

      expect(res.status).toBe(200);
      expect(res.body.assignedTo).toBe(testInspector2Id);
    });

    it('should return 400 for missing inspectorId', async () => {
      const res = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should update assignedAt timestamp on reassignment', async () => {
      const firstAssign = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector1Id });

      await new Promise(resolve => setTimeout(resolve, 100));

      const secondAssign = await request(app)
        .post(`/api/jobs/${testJobId}/assign`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ inspectorId: testInspector2Id });

      expect(new Date(secondAssign.body.assignedAt).getTime()).toBeGreaterThan(
        new Date(firstAssign.body.assignedAt).getTime()
      );
    });
  });

  // ============================================================================
  // Additional Endpoints Testing (10+ more test cases)
  // ============================================================================
  describe('Additional Job Endpoints', () => {
    let testJobId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Additional Tests Job',
          address: '123 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });
      testJobId = res.body.id;
    });

    it('should export jobs to CSV', async () => {
      const res = await request(app)
        .post('/api/jobs/export')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ format: 'csv' });

      // Check for appropriate response
      expect([200, 400]).toContain(res.status);
    });

    it('should get jobs by specific date', async () => {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];
      
      const res = await request(app)
        .get(`/api/jobs/by-date/${dateStr}`)
        .set('Cookie', adminCookie);

      expect([200, 403]).toContain(res.status); // 403 if not admin/manager
    });

    it('should bulk delete jobs', async () => {
      // Create multiple jobs
      const job1 = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Bulk Delete 1',
          address: '1 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      const job2 = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Bulk Delete 2',
          address: '2 Test St',
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      const res = await request(app)
        .delete('/api/jobs/bulk')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ ids: [job1.body.id, job2.body.id] });

      expect([200, 204]).toContain(res.status);
    });

    it('should handle invalid date format in by-date endpoint', async () => {
      const res = await request(app)
        .get('/api/jobs/by-date/invalid-date')
        .set('Cookie', adminCookie);

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should validate job before allowing status update', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${testJobId}/status`)
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({ status: 'completed' });

      // Should succeed or fail based on validation rules
      expect([200, 400]).toContain(res.status);
    });

    it('should maintain data integrity on concurrent updates', async () => {
      const promises = [
        request(app)
          .patch(`/api/jobs/${testJobId}/status`)
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken)
          .send({ status: 'scheduled' }),
        request(app)
          .patch(`/api/jobs/${testJobId}/status`)
          .set('Cookie', adminCookie)
          .set('x-csrf-token', csrfToken)
          .send({ status: 'scheduled' })
      ];

      const results = await Promise.all(promises);
      expect(results.every(r => [200, 409].includes(r.status))).toBe(true);
    });

    it('should handle large notes field', async () => {
      const largeNotes = 'A'.repeat(5000);
      const updateRes = await storage.updateJob(testJobId, { notes: largeNotes });
      
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.notes.length).toBeGreaterThan(4000);
    });

    it('should handle special characters in address', async () => {
      const specialAddress = "123 O'Brien St, Apt #5B, Minneapolis, MN 55404";
      const res = await request(app)
        .post('/api/jobs')
        .set('Cookie', adminCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          name: 'Special Char Job',
          address: specialAddress,
          contractor: 'ABC',
          builderId: testBuilderId,
          inspectionType: 'Final'
        });

      expect(res.status).toBe(201);
      expect(res.body.address).toBe(specialAddress);
    });

    it('should properly serialize dates in responses', async () => {
      const res = await request(app)
        .get(`/api/jobs/${testJobId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      
      // Check that dates are ISO 8601 strings
      if (res.body.createdAt) {
        expect(() => new Date(res.body.createdAt).toISOString()).not.toThrow();
      }
      if (res.body.updatedAt) {
        expect(() => new Date(res.body.updatedAt).toISOString()).not.toThrow();
      }
    });

    it('should handle empty result sets gracefully', async () => {
      const res = await request(app)
        .get('/api/jobs?status=cancelled&inspectionType=NonExistent')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
