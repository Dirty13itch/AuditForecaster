import { serverLogger } from "./logger";
import type { IStorage } from "./storage";
import { parseCalendarEvent, type ParsedEvent } from "./calendarEventParser";
import type { InsertJob, InsertUnmatchedCalendarEvent, InsertCalendarImportLog } from "@shared/schema";

/**
 * Calendar event interface (from Google Calendar API)
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

/**
 * Import result summary
 */
export interface ImportResult {
  jobsCreated: number;
  eventsQueued: number;
  errors: string[];
  importLogId: string | null;
}

/**
 * Convert calendar event to Job based on parsed data
 * Auto-creates job from high-confidence events (≥80%)
 */
export async function createJobFromCalendarEvent(
  storage: IStorage,
  event: CalendarEvent,
  parsed: ParsedEvent,
  createdBy: string
): Promise<string> {
  if (!parsed.builderId || !parsed.inspectionType) {
    throw new Error('Missing required fields: builderId or inspectionType');
  }

  // Check for duplicate by google_event_id
  const existingJob = await storage.getJobBySourceEventId(event.id);
  if (existingJob) {
    serverLogger.info(`[CalendarImport] Job already exists for event ${event.id}, skipping`);
    throw new Error('Job already exists for this calendar event');
  }

  // Extract start time
  const startTime = event.start.dateTime 
    ? new Date(event.start.dateTime) 
    : (event.start.date ? new Date(event.start.date) : new Date());

  // Generate job name from event data
  const jobName = event.location 
    ? `${parsed.inspectionType} - ${event.location}`
    : event.summary;

  // Create job from event
  const jobData: InsertJob = {
    name: jobName,
    builderId: parsed.builderId,
    inspectionType: parsed.inspectionType,
    address: event.location || event.summary || 'TBD',
    contractor: 'TBD', // Calendar events don't have contractor info
    scheduledDate: startTime,
    status: 'scheduled',
    createdBy,
    notes: `Auto-created from calendar event: ${event.summary}`,
    googleEventId: event.id,
  };

  const job = await storage.createJob(jobData);
  
  serverLogger.info(`[CalendarImport] Created job ${job.id} from event ${event.id}`, {
    builder: parsed.builderName,
    inspectionType: parsed.inspectionType,
    confidence: parsed.confidence,
  });

  return job.id;
}

/**
 * Process calendar events and auto-create jobs based on confidence scores
 * 
 * Confidence Thresholds:
 * - ≥80%: Auto-create job immediately
 * - 60-79%: Auto-create job + queue for review (needs verification)
 * - <60%: Queue for manual review only (no job created)
 */
export async function processCalendarEvents(
  storage: IStorage,
  events: CalendarEvent[],
  calendarId: string,
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    jobsCreated: 0,
    eventsQueued: 0,
    errors: [],
    importLogId: null,
  };

  serverLogger.info(`[CalendarImport] Processing ${events.length} events from calendar ${calendarId}`);

  for (const event of events) {
    try {
      // Skip events without titles
      if (!event.summary) {
        serverLogger.warn(`[CalendarImport] Skipping event ${event.id} without title`);
        continue;
      }

      // Parse event title
      const parsed = await parseCalendarEvent(storage, event.summary);

      // Determine action based on confidence score
      if (parsed.confidence >= 80 && parsed.builderId && parsed.inspectionType) {
        // High confidence: Auto-create job
        try {
          await createJobFromCalendarEvent(storage, event, parsed, userId);
          result.jobsCreated++;
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            serverLogger.info(`[CalendarImport] Skipping duplicate event ${event.id}`);
          } else {
            throw error;
          }
        }
      } else if (parsed.confidence >= 60 && parsed.builderId && parsed.inspectionType) {
        // Medium confidence: Auto-create job + queue for review
        try {
          await createJobFromCalendarEvent(storage, event, parsed, userId);
          result.jobsCreated++;
          
          // Also queue for review
          await queueEventForReview(storage, event, parsed, calendarId, 'flagged');
          result.eventsQueued++;
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            serverLogger.info(`[CalendarImport] Skipping duplicate event ${event.id}`);
          } else {
            // If job creation fails, still queue for review
            await queueEventForReview(storage, event, parsed, calendarId, 'pending');
            result.eventsQueued++;
          }
        }
      } else {
        // Low confidence: Queue for manual review only
        await queueEventForReview(storage, event, parsed, calendarId, 'pending');
        result.eventsQueued++;
      }
    } catch (error: any) {
      serverLogger.error(`[CalendarImport] Error processing event ${event.id}:`, error);
      result.errors.push(`Event ${event.id}: ${error.message}`);
    }
  }

  // Create import log
  try {
    const importLog = await storage.createCalendarImportLog({
      calendarId,
      importTimestamp: new Date(),
      eventsProcessed: events.length,
      jobsCreated: result.jobsCreated,
      eventsQueued: result.eventsQueued,
      errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
    });
    result.importLogId = importLog.id;
  } catch (error: any) {
    serverLogger.error(`[CalendarImport] Failed to create import log:`, error);
  }

  serverLogger.info(`[CalendarImport] Import complete`, {
    jobsCreated: result.jobsCreated,
    eventsQueued: result.eventsQueued,
    errors: result.errors.length,
  });

  return result;
}

/**
 * Queue event for manual review
 */
async function queueEventForReview(
  storage: IStorage,
  event: CalendarEvent,
  parsed: ParsedEvent,
  calendarId: string,
  status: string = 'pending'
): Promise<void> {
  const startTime = event.start.dateTime 
    ? new Date(event.start.dateTime) 
    : (event.start.date ? new Date(event.start.date) : new Date());

  const endTime = event.end?.dateTime 
    ? new Date(event.end.dateTime) 
    : (event.end?.date ? new Date(event.end.date) : null);

  const unmatchedEvent: InsertUnmatchedCalendarEvent = {
    googleEventId: event.id,
    calendarId,
    title: event.summary,
    location: event.location || null,
    startTime,
    endTime,
    rawEventJson: {
      ...event,
      parsed: {
        builderName: parsed.builderName,
        inspectionType: parsed.inspectionType,
        confidence: parsed.confidence,
        parsedBuilderAbbreviation: parsed.parsedBuilderAbbreviation,
        parsedInspectionKeyword: parsed.parsedInspectionKeyword,
      },
    },
    confidenceScore: parsed.confidence,
    status,
  };

  await storage.createUnmatchedEvent(unmatchedEvent);
  serverLogger.info(`[CalendarImport] Queued event ${event.id} for review`, {
    confidence: parsed.confidence,
    status,
  });
}
