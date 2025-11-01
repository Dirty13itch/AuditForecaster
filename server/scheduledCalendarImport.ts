import cron from 'node-cron';
import { serverLogger } from './logger';
import { storage } from './storage';
import { GoogleCalendarService } from './googleCalendar';
import { processCalendarEvents } from './calendarImportService';
import { DateTime } from 'luxon';
import { backgroundJobTracker } from './backgroundJobTracker';

const googleCalendarService = new GoogleCalendarService();

// Configuration from environment variables with defaults
const CALENDAR_IMPORT_ENABLED = process.env.CALENDAR_IMPORT_ENABLED !== 'false';
const CALENDAR_IMPORT_SCHEDULE = process.env.CALENDAR_IMPORT_SCHEDULE || '0 */6 * * *'; // Every 6 hours by default
const BUILDING_KNOWLEDGE_CALENDAR_NAME = process.env.BUILDING_KNOWLEDGE_CALENDAR_NAME || 'Building Knowledge';
const CALENDAR_IMPORT_LOOKAHEAD_DAYS = parseInt(process.env.CALENDAR_IMPORT_LOOKAHEAD_DAYS || '30');

// System user for automated imports - configurable for production
// In production, create a dedicated system user or use admin ID
const SYSTEM_USER_ID = process.env.CALENDAR_IMPORT_USER_ID || 'test-admin';

/**
 * Automated calendar import job
 * Fetches events from contractor's "Building Knowledge" calendar and imports them
 * Schedule and configuration can be customized via environment variables
 */
export async function startScheduledCalendarImport() {
  if (!CALENDAR_IMPORT_ENABLED) {
    serverLogger.info('[ScheduledCalendarImport] Automated calendar import is disabled (CALENDAR_IMPORT_ENABLED=false)');
    return;
  }

  // In production, require explicit system user configuration
  if (process.env.NODE_ENV === 'production' && !process.env.CALENDAR_IMPORT_USER_ID) {
    serverLogger.error('[ScheduledCalendarImport] FATAL: CALENDAR_IMPORT_USER_ID must be set in production');
    serverLogger.error('[ScheduledCalendarImport] Automated calendar import will not be initialized');
    return;
  }

  // Verify system user exists - MUST succeed or cron will not be scheduled
  const userValid = await verifySystemUser();
  if (!userValid) {
    serverLogger.error('[ScheduledCalendarImport] FATAL: System user validation failed');
    serverLogger.error('[ScheduledCalendarImport] Automated calendar import will not be initialized');
    return;
  }

  // Validate configuration
  if (!validateConfiguration()) {
    serverLogger.error('[ScheduledCalendarImport] FATAL: Configuration validation failed');
    serverLogger.error('[ScheduledCalendarImport] Automated calendar import will not be initialized');
    return;
  }

  // Register the job with background job tracker
  await backgroundJobTracker.registerJob({
    jobName: 'calendar_import',
    displayName: 'Calendar Import',
    description: 'Automated import from Building Knowledge Google Calendar',
    schedule: CALENDAR_IMPORT_SCHEDULE,
    enabled: CALENDAR_IMPORT_ENABLED,
  });

  cron.schedule(CALENDAR_IMPORT_SCHEDULE, async () => {
    serverLogger.info('[ScheduledCalendarImport] Running automated calendar import job');
    
    await backgroundJobTracker.executeJob('calendar_import', async () => {
      try {
        // Find the "Building Knowledge" calendar by name
        const buildingKnowledgeCalendarId = await googleCalendarService.findCalendarByName(
          BUILDING_KNOWLEDGE_CALENDAR_NAME
        );
        
        if (!buildingKnowledgeCalendarId) {
          serverLogger.warn('[ScheduledCalendarImport] "Building Knowledge" calendar not found, skipping import');
          return;
        }
        
        serverLogger.info(`[ScheduledCalendarImport] Found calendar: ${BUILDING_KNOWLEDGE_CALENDAR_NAME} (${buildingKnowledgeCalendarId})`);
        
        // Fetch events from configured lookahead period
        const startDate = DateTime.now().startOf('day').toJSDate();
        const endDate = DateTime.now().plus({ days: CALENDAR_IMPORT_LOOKAHEAD_DAYS }).endOf('day').toJSDate();
        
        serverLogger.info(`[ScheduledCalendarImport] Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        const events = await googleCalendarService.fetchEventsFromGoogle(
          [buildingKnowledgeCalendarId],
          startDate,
          endDate
        );
        
        if (events.length === 0) {
          serverLogger.info('[ScheduledCalendarImport] No events found in calendar, skipping import');
          return;
        }
        
        serverLogger.info(`[ScheduledCalendarImport] Fetched ${events.length} events, starting import process`);
        
        // Transform Google Calendar events to our CalendarEvent format
        const calendarEvents = events.map(event => ({
          id: event.id || '',
          summary: event.summary || '',
          description: event.description || '',
          location: event.location || '',
          start: {
            dateTime: event.start?.dateTime || undefined,
            date: event.start?.date || undefined,
          },
          end: {
            dateTime: event.end?.dateTime || undefined,
            date: event.end?.date || undefined,
          },
        }));
        
        // Process events using import service
        const result = await processCalendarEvents(
          storage,
          calendarEvents,
          buildingKnowledgeCalendarId,
          SYSTEM_USER_ID
        );
        
        serverLogger.info('[ScheduledCalendarImport] Import completed successfully', {
          eventsProcessed: events.length,
          jobsCreated: result.jobsCreated,
          eventsQueued: result.eventsQueued,
          errors: result.errors.length,
          importLogId: result.importLogId,
        });
        
        // Create audit log for automated import
        await storage.createAuditLog({
          userId: SYSTEM_USER_ID,
          action: 'calendar_import_automated',
          resourceType: 'calendar',
          resourceId: buildingKnowledgeCalendarId,
          metadata: {
            eventsProcessed: events.length,
            jobsCreated: result.jobsCreated,
            eventsQueued: result.eventsQueued,
            errors: result.errors.length,
            importLogId: result.importLogId,
            source: 'automated_cron_job',
          },
        });
        
        // Log individual errors if any occurred
        if (result.errors.length > 0) {
          serverLogger.warn('[ScheduledCalendarImport] Import completed with errors', {
            errorCount: result.errors.length,
            errors: result.errors,
          });
        }
        
      } catch (error) {
        serverLogger.error('[ScheduledCalendarImport] Automated import failed', { error });
        
        // Log the failure for audit purposes
        try {
          await storage.createAuditLog({
            userId: SYSTEM_USER_ID,
            action: 'calendar_import_automated_failed',
            resourceType: 'calendar',
            resourceId: 'unknown',
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
              source: 'automated_cron_job',
            },
          });
        } catch (auditError) {
          serverLogger.error('[ScheduledCalendarImport] Failed to create audit log for import failure', { auditError });
        }
        
        // Re-throw to let the backgroundJobTracker handle it
        throw error;
      }
    });
  });
  
  serverLogger.info('[ScheduledCalendarImport] Automated calendar import cron job initialized', {
    enabled: CALENDAR_IMPORT_ENABLED,
    schedule: CALENDAR_IMPORT_SCHEDULE,
    calendarName: BUILDING_KNOWLEDGE_CALENDAR_NAME,
    lookAheadDays: CALENDAR_IMPORT_LOOKAHEAD_DAYS,
    systemUserId: SYSTEM_USER_ID,
  });
}

/**
 * Verify that the system user exists for automated imports
 * Creates the user if it doesn't exist in development mode
 * Returns false if user doesn't exist and can't be created
 */
async function verifySystemUser(): Promise<boolean> {
  try {
    let user = await storage.getUser(SYSTEM_USER_ID);
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        // In development, create the system user if it doesn't exist
        serverLogger.warn('[ScheduledCalendarImport] System user not found, creating for development');
        await storage.upsertUser({
          id: SYSTEM_USER_ID,
          email: 'system@automated-imports.local',
          firstName: 'Automated',
          lastName: 'Import System',
          role: 'admin',
        });
        serverLogger.info('[ScheduledCalendarImport] Created system user for automated imports');
        user = await storage.getUser(SYSTEM_USER_ID); // Verify creation succeeded
      } else {
        serverLogger.error('[ScheduledCalendarImport] CRITICAL: System user for automated imports does not exist', {
          userId: SYSTEM_USER_ID,
          help: 'Set CALENDAR_IMPORT_USER_ID environment variable to a valid admin user ID',
        });
        return false;
      }
    }

    if (!user) {
      serverLogger.error('[ScheduledCalendarImport] CRITICAL: Failed to verify/create system user');
      return false;
    }

    serverLogger.info('[ScheduledCalendarImport] System user verified', {
      userId: SYSTEM_USER_ID,
      email: user.email,
    });
    return true;
  } catch (error) {
    serverLogger.error('[ScheduledCalendarImport] Failed to verify system user', { error });
    return false;
  }
}

/**
 * Validate configuration values
 * Returns false if any configuration is invalid
 */
function validateConfiguration(): boolean {
  let valid = true;

  // Validate lookahead days
  if (isNaN(CALENDAR_IMPORT_LOOKAHEAD_DAYS) || CALENDAR_IMPORT_LOOKAHEAD_DAYS < 1 || CALENDAR_IMPORT_LOOKAHEAD_DAYS > 365) {
    serverLogger.error('[ScheduledCalendarImport] Invalid CALENDAR_IMPORT_LOOKAHEAD_DAYS', {
      value: process.env.CALENDAR_IMPORT_LOOKAHEAD_DAYS,
      parsed: CALENDAR_IMPORT_LOOKAHEAD_DAYS,
      help: 'Must be a number between 1 and 365',
    });
    valid = false;
  }

  // Validate cron schedule format (basic check)
  const cronParts = CALENDAR_IMPORT_SCHEDULE.trim().split(/\s+/);
  if (cronParts.length !== 5) {
    serverLogger.error('[ScheduledCalendarImport] Invalid CALENDAR_IMPORT_SCHEDULE format', {
      value: CALENDAR_IMPORT_SCHEDULE,
      help: 'Must be a valid cron expression (5 fields: minute hour day-of-month month day-of-week)',
    });
    valid = false;
  }

  if (valid) {
    serverLogger.info('[ScheduledCalendarImport] Configuration validated successfully');
  }

  return valid;
}
