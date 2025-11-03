import { serverLogger } from "./logger";
import type { IStorage } from "./storage";
import { parseCalendarEvent, type ParsedEventResult } from "./eventParser";
import type { InsertJob, InsertUnmatchedCalendarEvent, InsertCalendarImportLog, InsertBuilder } from "@shared/schema";
import { logCreate, logCustomAction, type AuditRequest } from "./lib/audit";

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
 * Auto-creates temporary builders for new builder names
 */
export async function createJobFromCalendarEvent(
  storage: IStorage,
  event: CalendarEvent,
  parsed: ParsedEventResult,
  createdBy: string,
  auditReq?: AuditRequest
): Promise<string> {
  // Handle missing builder by auto-creating temporary builder
  let builderId = parsed.parsedBuilderId;
  
  if (!builderId && parsed.parsedBuilderName && parsed.isNewBuilder) {
    // Auto-create a temporary builder record
    const temporaryBuilder: InsertBuilder = {
      name: parsed.parsedBuilderName,
      companyName: parsed.parsedBuilderName,
      status: 'temporary',
      autoCreatedFromEvent: true,
      needsReview: true,
      confidence: parsed.confidenceScore,
      abbreviations: parsed.matchedAbbreviation ? [parsed.matchedAbbreviation] : [],
      createdBy,
    };
    
    const newBuilder = await storage.createBuilder(temporaryBuilder);
    builderId = newBuilder.id;
    
    serverLogger.info(`[CalendarImport] Auto-created temporary builder for review`, {
      builderId: newBuilder.id,
      builderName: parsed.parsedBuilderName,
      confidence: parsed.confidenceScore,
      eventId: event.id,
    });
    
    // Audit log: temporary builder creation
    if (auditReq) {
      await logCreate({
        req: auditReq,
        entityType: 'builder',
        entityId: newBuilder.id,
        data: {
          name: parsed.parsedBuilderName,
          status: 'temporary',
          autoCreated: true,
          confidence: parsed.confidenceScore,
          sourceEvent: event.id,
        },
        metadata: {
          reason: 'auto_created_from_calendar_event',
          eventSummary: event.summary,
        },
      });
    }
  }
  
  if (!builderId || !parsed.parsedJobType) {
    throw new Error('Missing required fields: builderId or jobType');
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
    ? `${parsed.parsedJobType} - ${event.location}`
    : event.summary;

  // Create job from event
  const jobData: InsertJob = {
    name: jobName,
    builderId: builderId,
    inspectionType: parsed.parsedJobType,
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
    builder: parsed.parsedBuilderName,
    inspectionType: parsed.parsedJobType,
    confidence: parsed.confidenceScore,
  });
  
  // Audit log: job creation from calendar event
  if (auditReq) {
    await logCreate({
      req: auditReq,
      entityType: 'job',
      entityId: job.id,
      data: {
        name: jobName,
        builderId,
        builderName: parsed.parsedBuilderName,
        inspectionType: parsed.parsedJobType,
        address: event.location || event.summary || 'TBD',
        status: 'scheduled',
        scheduledDate: startTime,
      },
      metadata: {
        source: 'calendar_import',
        googleEventId: event.id,
        eventSummary: event.summary,
        confidence: parsed.confidenceScore,
        matchedAbbreviation: parsed.matchedAbbreviation,
      },
    });
  }

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
  userId: string,
  correlationId?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    jobsCreated: 0,
    eventsQueued: 0,
    errors: [],
    importLogId: null,
  };

  serverLogger.info(`[CalendarImport] Processing ${events.length} events from calendar ${calendarId}`);
  
  // Create synthetic request for audit logging if correlation ID provided
  const auditReq: AuditRequest | undefined = correlationId ? {
    user: { id: userId },
    correlationId,
    ip: '127.0.0.1',
    get: () => 'CalendarImportService',
  } as AuditRequest : undefined;

  // Fetch all builders for parser
  const builders = await storage.listBuilders();

  for (const event of events) {
    try {
      // Skip events without titles
      if (!event.summary) {
        serverLogger.warn(`[CalendarImport] Skipping event ${event.id} without title`);
        continue;
      }

      // Parse event title using new eventParser
      const parsed = parseCalendarEvent(event.summary, event.description, builders);
      
      // Audit log: event parsing result
      if (auditReq) {
        await logCustomAction({
          req: auditReq,
          action: 'convert',
          entityType: 'calendar_event',
          entityId: event.id,
          after: {
            builderName: parsed.parsedBuilderName,
            builderId: parsed.parsedBuilderId,
            inspectionType: parsed.parsedJobType,
            confidence: parsed.confidenceScore,
            isNewBuilder: parsed.isNewBuilder,
            matchedAbbreviation: parsed.matchedAbbreviation,
          },
          metadata: {
            eventSummary: event.summary,
            eventDescription: event.description,
            location: event.location,
          },
        });
      }

      // Determine action based on confidence score
      if (parsed.confidenceScore >= 80 && (parsed.parsedBuilderId || parsed.isNewBuilder) && parsed.parsedJobType !== 'other') {
        // High confidence: Auto-create job (and temporary builder if needed)
        try {
          await createJobFromCalendarEvent(storage, event, parsed, userId, auditReq);
          result.jobsCreated++;
          
          // Audit log: decision to auto-create job
          if (auditReq) {
            await logCustomAction({
              req: auditReq,
              action: 'verify',
              entityType: 'calendar_event',
              entityId: event.id,
              after: { decision: 'auto_create_job', reason: 'high_confidence', confidence: parsed.confidenceScore },
            });
          }
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            serverLogger.info(`[CalendarImport] Skipping duplicate event ${event.id}`);
          } else {
            throw error;
          }
        }
      } else if (parsed.confidenceScore >= 60 && (parsed.parsedBuilderId || parsed.isNewBuilder) && parsed.parsedJobType !== 'other') {
        // Medium confidence: Auto-create job + queue for review
        try {
          await createJobFromCalendarEvent(storage, event, parsed, userId, auditReq);
          result.jobsCreated++;
          
          // Also queue for review
          await queueEventForReview(storage, event, parsed, calendarId, 'flagged', auditReq);
          result.eventsQueued++;
          
          // Audit log: decision to auto-create + flag for review
          if (auditReq) {
            await logCustomAction({
              req: auditReq,
              action: 'verify',
              entityType: 'calendar_event',
              entityId: event.id,
              after: { decision: 'auto_create_and_flag', reason: 'medium_confidence', confidence: parsed.confidenceScore },
            });
          }
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            serverLogger.info(`[CalendarImport] Skipping duplicate event ${event.id}`);
          } else {
            // If job creation fails, still queue for review
            await queueEventForReview(storage, event, parsed, calendarId, 'pending', auditReq);
            result.eventsQueued++;
          }
        }
      } else {
        // Low confidence: Queue for manual review only
        await queueEventForReview(storage, event, parsed, calendarId, 'pending', auditReq);
        result.eventsQueued++;
        
        // Audit log: decision to queue for manual review
        if (auditReq) {
          await logCustomAction({
            req: auditReq,
            action: 'verify',
            entityType: 'calendar_event',
            entityId: event.id,
            after: { 
              decision: 'queue_for_review', 
              reason: parsed.confidenceScore < 60 ? 'low_confidence' : 'unrecognized_type',
              confidence: parsed.confidenceScore 
            },
          });
        }
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
  parsed: ParsedEventResult,
  calendarId: string,
  status: string = 'pending',
  auditReq?: AuditRequest
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
        builderName: parsed.parsedBuilderName,
        inspectionType: parsed.parsedJobType,
        confidence: parsed.confidenceScore,
        matchedAbbreviation: parsed.matchedAbbreviation,
        isNewBuilder: parsed.isNewBuilder,
      },
    },
    confidenceScore: parsed.confidenceScore,
    status,
  };

  const createdEvent = await storage.createUnmatchedEvent(unmatchedEvent);
  
  serverLogger.info(`[CalendarImport] Queued event ${event.id} for review`, {
    confidence: parsed.confidenceScore,
    status,
  });
  
  // Audit log: event queued for review
  if (auditReq) {
    await logCreate({
      req: auditReq,
      entityType: 'unmatched_calendar_event',
      entityId: createdEvent.id,
      data: {
        googleEventId: event.id,
        title: event.summary,
        confidence: parsed.confidenceScore,
        status,
      },
      metadata: {
        parsedBuilderName: parsed.parsedBuilderName,
        parsedJobType: parsed.parsedJobType,
        matchedAbbreviation: parsed.matchedAbbreviation,
        isNewBuilder: parsed.isNewBuilder,
      },
    });
  }
}
