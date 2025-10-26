import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { processCalendarEvents, type CalendarEvent } from '../server/calendarImportService';
import { DatabaseStorage } from '../server/storage';
import { db } from '../server/db';
import { builders, builderAbbreviations, jobs, unmatchedCalendarEvents, calendarImportLogs, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Calendar Import Integration Tests
 * 
 * These tests verify the complete calendar import workflow including:
 * - Auto-job creation based on confidence scores
 * - Manual review queue population
 * - Deduplication via google_event_id
 * - Import logging
 * 
 * Confidence Thresholds:
 * - ≥80%: Auto-create job immediately
 * - 60-79%: Auto-create job + queue for review
 * - <60%: Queue for manual review only (no job created)
 */
describe('Calendar Import Integration Tests', () => {
  let storage: DatabaseStorage;
  let testBuilderId: string;
  let testUserId: string;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    
    // Clean up any existing test data from failed previous runs
    // Delete jobs with test googleEventIds first
    const testEventIds = [
      'event-high-confidence-1',
      'event-medium-confidence-1',
      'event-low-confidence-1',
      'event-dedup-test',
      'batch-event-1',
      'batch-event-2',
      'batch-event-3',
      'batch-event-4',
      'event-no-summary',
      'event-metadata-test',
      'event-all-day',
    ];
    for (const eventId of testEventIds) {
      await db.delete(jobs).where(eq(jobs.googleEventId, eventId));
      await db.delete(unmatchedCalendarEvents).where(eq(unmatchedCalendarEvents.googleEventId, eventId));
    }
    await db.delete(calendarImportLogs).where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    
    // FIX: Removed destructive cleanup that was deleting seeded M/I Homes abbreviations
    // Tests now use unique "INTTEST" abbreviation to ensure complete isolation from production data
    
    // Create test user for createdBy fields
    const user = await storage.upsertUser({
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'inspector',
    });
    testUserId = user.id;
    
    // Create test builder with unique company name
    const builder = await storage.createBuilder({
      name: 'Test Builder Calendar Import',
      companyName: `Test Builder for Calendar Import ${Date.now()}`,
      email: `builder-${Date.now()}@example.com`,
      phone: '555-0100',
      totalJobs: 0,
    });
    testBuilderId = builder.id;
    
    // Create builder abbreviation using unique test prefix that won't conflict with seeded data
    await storage.createBuilderAbbreviation({
      builderId: testBuilderId,
      abbreviation: 'INTTEST',  // Unique abbreviation - won't match MI, MIHomes, or other seeded data
      isPrimary: true,
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    if (testBuilderId) {
      // Delete calendar import logs
      await db.delete(calendarImportLogs).where(eq(calendarImportLogs.calendarId, 'test-calendar'));
      
      // Delete unmatched calendar events
      await db.delete(unmatchedCalendarEvents).where(eq(unmatchedCalendarEvents.calendarId, 'test-calendar'));
      
      // Delete jobs created by test builder
      await db.delete(jobs).where(eq(jobs.builderId, testBuilderId));
      
      // Delete builder abbreviations
      await db.delete(builderAbbreviations).where(eq(builderAbbreviations.builderId, testBuilderId));
      
      // Delete builder
      await db.delete(builders).where(eq(builders.id, testBuilderId));
    }
    
    // Delete test user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should auto-import high-confidence event and create job (>=80%)', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-high-confidence-1',
        summary: 'INTTEST Test - 123 Main St',  // Use unique INTTEST abbreviation
        location: '123 Main St',
        start: { dateTime: '2025-01-15T10:00:00Z' },
        end: { dateTime: '2025-01-15T11:00:00Z' },
      }
    ];

    const result = await processCalendarEvents(
      storage,
      mockEvents,
      'test-calendar',
      testUserId
    );

    // Verify result counts
    expect(result.jobsCreated).toBe(1);
    expect(result.eventsQueued).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.importLogId).toBeTruthy();

    // Verify job created in database
    const createdJobs = await db.select().from(jobs).where(eq(jobs.builderId, testBuilderId));
    expect(createdJobs).toHaveLength(1);
    expect(createdJobs[0].googleEventId).toBe('event-high-confidence-1');
    expect(createdJobs[0].inspectionType).toBe('Full Test');
    expect(createdJobs[0].address).toBe('123 Main St');
    expect(createdJobs[0].builderId).toBe(testBuilderId);
    expect(createdJobs[0].status).toBe('scheduled');
    expect(createdJobs[0].createdBy).toBe(testUserId);
    expect(createdJobs[0].notes).toContain('INTTEST Test - 123 Main St');

    // Verify NOT in review queue (high confidence doesn't queue)
    const queuedEvents = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'event-high-confidence-1'));
    expect(queuedEvents).toHaveLength(0);

    // Verify import log created
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    expect(logs).toHaveLength(1);
    expect(logs[0].eventsProcessed).toBe(1);
    expect(logs[0].jobsCreated).toBe(1);
    expect(logs[0].eventsQueued).toBe(0);
    expect(logs[0].errors).toBeNull();
  });

  it('should auto-import medium-confidence event and flag for review (60-79%)', async () => {
    // Use fuzzy builder match - "inttest." will fuzzy match to "INTTEST" (Levenshtein distance = 1)
    // Fuzzy builder match (+30) + Pre-Drywall inspection (+45) = 75% (medium confidence)
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-medium-confidence-1',
        summary: 'inttest. Pre-Drywall - 456 Oak St',  // "inttest." fuzzy matches "INTTEST"
        location: '456 Oak St',
        start: { dateTime: '2025-01-16T10:00:00Z' },
        end: { dateTime: '2025-01-16T11:00:00Z' },
      }
    ];

    const result = await processCalendarEvents(
      storage,
      mockEvents,
      'test-calendar',
      testUserId
    );

    // Verify result counts - medium confidence creates job AND queues for review
    expect(result.jobsCreated).toBeGreaterThanOrEqual(1);
    expect(result.eventsQueued).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);

    // Verify job WAS created
    const createdJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-medium-confidence-1'));
    expect(createdJobs.length).toBeGreaterThanOrEqual(1);
    expect(createdJobs[0].builderId).toBe(testBuilderId);
    expect(createdJobs[0].inspectionType).toBe('Pre-Drywall');

    // Verify ALSO in review queue with 'flagged' status
    const queuedEvents = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'event-medium-confidence-1'));
    expect(queuedEvents.length).toBeGreaterThanOrEqual(1);
    expect(queuedEvents[0].status).toBe('flagged');
    expect(queuedEvents[0].confidenceScore).toBeGreaterThanOrEqual(60);
    expect(queuedEvents[0].confidenceScore).toBeLessThan(80);

    // Verify import log shows both job created and event queued
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    expect(logs[0].jobsCreated).toBeGreaterThanOrEqual(1);
    expect(logs[0].eventsQueued).toBeGreaterThanOrEqual(1);
  });

  it('should queue low-confidence event for manual review without creating job (<60%)', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-low-confidence-1',
        summary: 'ABC Test - Unknown Builder',  // Unknown builder abbreviation
        location: '789 Pine St',
        start: { dateTime: '2025-01-17T10:00:00Z' },
        end: { dateTime: '2025-01-17T11:00:00Z' },
      }
    ];

    const result = await processCalendarEvents(
      storage,
      mockEvents,
      'test-calendar',
      testUserId
    );

    // Verify result counts - low confidence only queues, no job created
    expect(result.jobsCreated).toBe(0);
    expect(result.eventsQueued).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify NO job created
    const createdJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-low-confidence-1'));
    expect(createdJobs).toHaveLength(0);

    // Verify IN review queue with 'pending' status
    const queuedEvents = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'event-low-confidence-1'));
    expect(queuedEvents).toHaveLength(1);
    expect(queuedEvents[0].status).toBe('pending');
    expect(queuedEvents[0].confidenceScore).toBeLessThan(60);
    expect(queuedEvents[0].title).toBe('ABC Test - Unknown Builder');
    expect(queuedEvents[0].location).toBe('789 Pine St');

    // Verify import log shows event queued but no job created
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    expect(logs[0].jobsCreated).toBe(0);
    expect(logs[0].eventsQueued).toBe(1);
  });

  it('should prevent duplicate job creation via google_event_id', async () => {
    const mockEvent: CalendarEvent = {
      id: 'event-dedup-test',
      summary: 'INTTEST Test - Dedup Test',  // Use unique INTTEST abbreviation
      location: '999 Dedup St',
      start: { dateTime: '2025-01-18T10:00:00Z' },
      end: { dateTime: '2025-01-18T11:00:00Z' },
    };

    // First import - should create job
    const firstResult = await processCalendarEvents(
      storage,
      [mockEvent],
      'test-calendar',
      testUserId
    );
    expect(firstResult.jobsCreated).toBe(1);

    // Verify job was created
    const jobsAfterFirst = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-dedup-test'));
    expect(jobsAfterFirst).toHaveLength(1);

    // Second import with same event ID - should skip
    const secondResult = await processCalendarEvents(
      storage,
      [mockEvent],
      'test-calendar',
      testUserId
    );
    
    // Should show 0 jobs created on second import
    expect(secondResult.jobsCreated).toBe(0);
    expect(secondResult.eventsQueued).toBe(0);

    // Verify still only ONE job exists (no duplicate)
    const jobsAfterSecond = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-dedup-test'));
    expect(jobsAfterSecond).toHaveLength(1);

    // Verify both imports logged
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    expect(logs).toHaveLength(2);
    expect(logs[0].jobsCreated).toBe(1);  // First import
    expect(logs[1].jobsCreated).toBe(0);  // Second import (duplicate skipped)
  });

  it('should handle batch import with mixed confidence scores', async () => {
    const mixedEvents: CalendarEvent[] = [
      // High confidence: exact builder + inspection type
      {
        id: 'batch-event-1',
        summary: 'INTTEST Test - High Confidence',  // Use unique INTTEST abbreviation
        location: '100 High St',
        start: { dateTime: '2025-01-19T10:00:00Z' },
        end: { dateTime: '2025-01-19T11:00:00Z' },
      },
      // Medium confidence: fuzzy builder match + inspection type
      {
        id: 'batch-event-2',
        summary: 'inttest. Pre-Drywall - 200 Medium Ave',  // "inttest." fuzzy matches "INTTEST"
        location: '200 Medium Ave',
        start: { dateTime: '2025-01-19T11:00:00Z' },
        end: { dateTime: '2025-01-19T12:00:00Z' },
      },
      // Low confidence: unknown builder
      {
        id: 'batch-event-3',
        summary: 'XYZ Test - Low Confidence',
        location: '300 Low Blvd',
        start: { dateTime: '2025-01-19T13:00:00Z' },
        end: { dateTime: '2025-01-19T14:00:00Z' },
      },
      // High confidence: another valid event
      {
        id: 'batch-event-4',
        summary: 'INTTEST SV2 - Another High',  // Use unique INTTEST abbreviation
        location: '400 High Rd',
        start: { dateTime: '2025-01-19T15:00:00Z' },
        end: { dateTime: '2025-01-19T16:00:00Z' },
      },
    ];

    const result = await processCalendarEvents(
      storage,
      mixedEvents,
      'test-calendar',
      testUserId
    );

    // Verify overall counts
    // High (2 jobs) + Medium (1 job) = 3 jobs created
    // Medium (1 queued) + Low (1 queued) = 2 events queued
    expect(result.jobsCreated).toBe(3);
    expect(result.eventsQueued).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Verify high-confidence jobs created
    const highConfJob1 = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'batch-event-1'));
    expect(highConfJob1).toHaveLength(1);
    expect(highConfJob1[0].inspectionType).toBe('Full Test');

    const highConfJob2 = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'batch-event-4'));
    expect(highConfJob2).toHaveLength(1);
    expect(highConfJob2[0].inspectionType).toBe('SV2');

    // Verify medium-confidence job created AND queued
    const mediumConfJob = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'batch-event-2'));
    expect(mediumConfJob.length).toBeGreaterThanOrEqual(1);
    expect(mediumConfJob[0].inspectionType).toBe('Pre-Drywall');

    const mediumConfQueued = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'batch-event-2'));
    expect(mediumConfQueued.length).toBeGreaterThanOrEqual(1);
    expect(mediumConfQueued[0].status).toBe('flagged');

    // Verify low-confidence event queued but NOT created as job
    const lowConfJob = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'batch-event-3'));
    expect(lowConfJob).toHaveLength(0);

    const lowConfQueued = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'batch-event-3'));
    expect(lowConfQueued).toHaveLength(1);
    expect(lowConfQueued[0].status).toBe('pending');

    // Verify import log
    const logs = await db.select()
      .from(calendarImportLogs)
      .where(eq(calendarImportLogs.calendarId, 'test-calendar'));
    expect(logs).toHaveLength(1);
    expect(logs[0].eventsProcessed).toBe(4);
    expect(logs[0].jobsCreated).toBe(3);
    expect(logs[0].eventsQueued).toBe(2);
  });

  it('should handle events without summary gracefully', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-no-summary',
        summary: '',  // Empty summary
        location: '555 Empty St',
        start: { dateTime: '2025-01-20T10:00:00Z' },
        end: { dateTime: '2025-01-20T11:00:00Z' },
      }
    ];

    const result = await processCalendarEvents(
      storage,
      mockEvents,
      'test-calendar',
      testUserId
    );

    // Should skip events without summary
    expect(result.jobsCreated).toBe(0);
    expect(result.eventsQueued).toBe(0);

    // Verify no job created
    const createdJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-no-summary'));
    expect(createdJobs).toHaveLength(0);

    // Verify not queued
    const queuedEvents = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'event-no-summary'));
    expect(queuedEvents).toHaveLength(0);
  });

  it('should store complete event metadata in unmatched_calendar_events', async () => {
    const mockEvent: CalendarEvent = {
      id: 'event-metadata-test',
      summary: 'Unknown Builder Test',
      description: 'Test event description',
      location: '777 Metadata Dr',
      start: { dateTime: '2025-01-21T10:00:00Z' },
      end: { dateTime: '2025-01-21T11:00:00Z' },
    };

    await processCalendarEvents(
      storage,
      [mockEvent],
      'test-calendar',
      testUserId
    );

    // Verify event metadata stored correctly
    const queuedEvents = await db.select()
      .from(unmatchedCalendarEvents)
      .where(eq(unmatchedCalendarEvents.googleEventId, 'event-metadata-test'));
    
    expect(queuedEvents).toHaveLength(1);
    expect(queuedEvents[0].title).toBe('Unknown Builder Test');
    expect(queuedEvents[0].location).toBe('777 Metadata Dr');
    expect(queuedEvents[0].calendarId).toBe('test-calendar');
    expect(queuedEvents[0].startTime).toBeInstanceOf(Date);
    expect(queuedEvents[0].endTime).toBeInstanceOf(Date);
    
    // Verify raw event JSON includes parsed data
    if (queuedEvents[0].rawEventJson) {
      const rawEventData = queuedEvents[0].rawEventJson as any;
      expect(rawEventData.id).toBe('event-metadata-test');
      expect(rawEventData.summary).toBe('Unknown Builder Test');
      expect(rawEventData.parsed).toBeDefined();
      expect(rawEventData.parsed.confidence).toBeDefined();
    }
  });

  it('should handle all-day events (date instead of dateTime)', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: 'event-all-day',
        summary: 'INTTEST Test - All Day Event',  // Use unique INTTEST abbreviation
        location: '888 All Day Ln',
        start: { date: '2025-01-22' },  // All-day event uses 'date' not 'dateTime'
        end: { date: '2025-01-22' },
      }
    ];

    const result = await processCalendarEvents(
      storage,
      mockEvents,
      'test-calendar',
      testUserId
    );

    // Should still create job
    expect(result.jobsCreated).toBe(1);

    // Verify job created with date
    const createdJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.googleEventId, 'event-all-day'));
    expect(createdJobs).toHaveLength(1);
    expect(createdJobs[0].scheduledDate).toBeInstanceOf(Date);
  });
});
