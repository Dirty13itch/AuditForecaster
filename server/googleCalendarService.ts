/**
 * Google Calendar Service - Main integration for fetching and managing calendar events
 * This service provides a unified interface for all Google Calendar operations
 * specifically designed for the Building Knowledge calendar integration.
 */

import { googleCalendarService as baseService, getUncachableGoogleCalendarClient, allDayDateToUTC, verifyRequiredScopes } from './googleCalendar';
import { google } from 'googleapis';
import { serverLogger } from './logger';
import type { ScheduleEvent, Job, GoogleEvent, InsertGoogleEvent } from '@shared/schema';
import { storage } from './storage';
import { parseCalendarEvent } from './eventParser';

// Re-export core functions from googleCalendar
export { getUncachableGoogleCalendarClient, allDayDateToUTC, verifyRequiredScopes };

interface GoogleCalendarEventRaw {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    date?: string | null;
  } | null;
  extendedProperties?: {
    private?: {
      [key: string]: string;
    };
    shared?: {
      [key: string]: string;
    };
  } | null;
  calendarId?: string;
  colorId?: string | null;
  status?: string | null;
  organizer?: {
    email?: string | null;
    displayName?: string | null;
  } | null;
  attendees?: Array<{
    email?: string | null;
    displayName?: string | null;
    responseStatus?: string | null;
  }> | null;
  recurringEventId?: string | null;
  htmlLink?: string | null;
  created?: string | null;
  updated?: string | null;
}

export class ExtendedGoogleCalendarService {
  private buildingKnowledgeCalendarId: string | null = null;
  private buildingKnowledgeCalendarName = process.env.BUILDING_KNOWLEDGE_CALENDAR_NAME || 'Building Knowledge';
  
  /**
   * Find and cache the Building Knowledge calendar ID
   */
  async getBuildingKnowledgeCalendarId(): Promise<string | null> {
    if (this.buildingKnowledgeCalendarId) {
      serverLogger.debug(`[GoogleCalendarService] Using cached calendar ID: ${this.buildingKnowledgeCalendarId}`);
      return this.buildingKnowledgeCalendarId;
    }

    try {
      serverLogger.info(`[GoogleCalendarService] Searching for calendar: "${this.buildingKnowledgeCalendarName}"`);
      
      // First try to find by name
      this.buildingKnowledgeCalendarId = await baseService.findCalendarByName(this.buildingKnowledgeCalendarName);
      
      // If not found, log available calendars to help debug
      if (!this.buildingKnowledgeCalendarId) {
        const calendars = await baseService.fetchCalendarList();
        serverLogger.warn(`[GoogleCalendarService] Calendar "${this.buildingKnowledgeCalendarName}" not found.`);
        serverLogger.warn('[GoogleCalendarService] Available calendars:', 
          calendars.map(c => ({ id: c.id, name: c.summary }))
        );
        
        // Check for partial matches
        const possibleMatch = calendars.find(cal => 
          cal.summary.toLowerCase().includes('bki') ||
          cal.summary.toLowerCase().includes('building') || 
          cal.summary.toLowerCase().includes('knowledge')
        );
        
        if (possibleMatch) {
          serverLogger.info(`[GoogleCalendarService] Found possible match: "${possibleMatch.summary}" (ID: ${possibleMatch.id})`);
          serverLogger.info(`[GoogleCalendarService] Using this calendar instead of configured name "${this.buildingKnowledgeCalendarName}"`);
          this.buildingKnowledgeCalendarId = possibleMatch.id;
          this.buildingKnowledgeCalendarName = possibleMatch.summary;
        } else {
          serverLogger.error(`[GoogleCalendarService] No calendar found matching "${this.buildingKnowledgeCalendarName}" or related keywords`);
        }
      } else {
        serverLogger.info(`[GoogleCalendarService] ✓ Successfully found calendar: "${this.buildingKnowledgeCalendarName}" (ID: ${this.buildingKnowledgeCalendarId})`);
      }
      
      return this.buildingKnowledgeCalendarId;
    } catch (error) {
      serverLogger.error('[GoogleCalendarService] Error finding Building Knowledge calendar:', error);
      return null;
    }
  }
  
  /**
   * Fetch ALL events from the Building Knowledge calendar
   * This ensures admins can see all events, not just their own
   */
  async fetchBuildingKnowledgeEvents(
    startDate: Date,
    endDate: Date,
    includeDeleted = false
  ): Promise<GoogleEvent[]> {
    try {
      serverLogger.info(`[GoogleCalendarService] Fetching Building Knowledge events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const calendarId = await this.getBuildingKnowledgeCalendarId();
      
      if (!calendarId) {
        serverLogger.warn('[GoogleCalendarService] Building Knowledge calendar not configured, falling back to primary calendar');
        // Fallback to primary calendar if Building Knowledge calendar not found
        const events = await this.fetchEventsAsGoogleEvents(startDate, endDate, ['primary'], includeDeleted);
        serverLogger.info(`[GoogleCalendarService] Fetched ${events.length} events from primary calendar (fallback)`);
        return events;
      }
      
      serverLogger.info(`[GoogleCalendarService] Using Building Knowledge calendar: ${this.buildingKnowledgeCalendarName} (${calendarId})`);
      const events = await this.fetchEventsAsGoogleEvents(startDate, endDate, [calendarId], includeDeleted);
      serverLogger.info(`[GoogleCalendarService] ✓ Successfully fetched ${events.length} events from Building Knowledge calendar`);
      return events;
    } catch (error) {
      serverLogger.error('[GoogleCalendarService] Error fetching Building Knowledge events:', error);
      throw error;
    }
  }
  
  /**
   * Fetch events from specified calendars and convert to GoogleEvent format
   * This is the main method for getting events that don't have associated jobs yet
   */
  async fetchEventsAsGoogleEvents(
    startDate: Date,
    endDate: Date,
    calendarIds: string[],
    includeDeleted = false
  ): Promise<GoogleEvent[]> {
    try {
      // Get access token and verify scopes before proceeding
      const { getAccessToken } = await import('./googleCalendar');
      const accessToken = await getAccessToken();
      
      // CRITICAL: Verify required scopes before calendar operations
      const hasRequiredScopes = await verifyRequiredScopes(accessToken);
      if (!hasRequiredScopes) {
        throw new Error('Missing required Google Calendar permissions. Please reconnect your calendar with the required scopes.');
      }
      
      const calendar = await getUncachableGoogleCalendarClient();
      const allEvents: GoogleEvent[] = [];
      
      for (const calendarId of calendarIds) {
        try {
          serverLogger.info(`[GoogleCalendarService] Fetching events from calendar ${calendarId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
          
          const response = await calendar.events.list({
            calendarId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500, // Maximum allowed by Google Calendar API
            showDeleted: includeDeleted,
          });
          
          const events = response.data.items || [];
          serverLogger.info(`[GoogleCalendarService] Retrieved ${events.length} events from calendar ${calendarId}`);
          
          // Log sample of events for debugging (first 3 events)
          if (events.length > 0) {
            const sampleEvents = events.slice(0, 3).map(e => ({
              id: e.id,
              summary: e.summary,
              start: e.start?.dateTime || e.start?.date,
              status: e.status
            }));
            serverLogger.debug(`[GoogleCalendarService] Sample events from ${calendarId}:`, sampleEvents);
          }
          
          // Convert to GoogleEvent format and detect recurring events
          // Group events by recurringEventId to identify recurring series
          const recurringGroups = new Map<string, GoogleCalendarEventRaw[]>();
          const singleEvents: GoogleCalendarEventRaw[] = [];
          
          for (const event of events) {
            if (event.recurringEventId) {
              const group = recurringGroups.get(event.recurringEventId) || [];
              group.push(event);
              recurringGroups.set(event.recurringEventId, group);
            } else {
              singleEvents.push(event);
            }
          }
          
          // Log recurring series detected
          if (recurringGroups.size > 0) {
            serverLogger.info(`[GoogleCalendarService] Detected ${recurringGroups.size} recurring event series with ${Array.from(recurringGroups.values()).reduce((sum, group) => sum + group.length, 0)} total instances`);
            
            // Log details of each recurring series
            for (const [recurringId, instances] of recurringGroups.entries()) {
              if (instances.length > 0) {
                serverLogger.info(`[GoogleCalendarService] Recurring series "${instances[0].summary}" has ${instances.length} instances`);
              }
            }
          }
          
          // Process single events
          for (const event of singleEvents) {
            const googleEvent = this.parseRawEventToGoogleEvent(event as GoogleCalendarEventRaw, calendarId);
            if (googleEvent) {
              allEvents.push(googleEvent);
            }
          }
          
          // Process recurring events - add metadata for frontend handling
          for (const [recurringId, instances] of recurringGroups.entries()) {
            for (const event of instances) {
              const googleEvent = this.parseRawEventToGoogleEvent(event as GoogleCalendarEventRaw, calendarId);
              if (googleEvent) {
                // Add recurring metadata to help frontend decide import strategy
                googleEvent.metadata = {
                  ...googleEvent.metadata,
                  isRecurring: true,
                  recurringEventId: recurringId,
                  instanceCount: instances.length,
                  isFirstInstance: event.id === instances[0].id,
                };
                allEvents.push(googleEvent);
              }
            }
          }
        } catch (error) {
          serverLogger.error(`[GoogleCalendarService] Error fetching events from calendar ${calendarId}:`, error);
          // Continue with other calendars if one fails
        }
      }
      
      serverLogger.info(`[GoogleCalendarService] Total retrieved ${allEvents.length} events from ${calendarIds.length} calendars`);
      return allEvents;
    } catch (error) {
      serverLogger.error('[GoogleCalendarService] Error fetching events as GoogleEvents:', error);
      throw error;
    }
  }
  
  /**
   * Convert raw Google Calendar event to our GoogleEvent schema
   */
  private parseRawEventToGoogleEvent(
    event: GoogleCalendarEventRaw,
    calendarId: string
  ): GoogleEvent | null {
    try {
      // Skip cancelled events unless explicitly requested
      if (event.status === 'cancelled') {
        return null;
      }
      
      // Get start and end times (support both timed and all-day events)
      const startTime = event.start?.dateTime 
        ? new Date(event.start.dateTime)
        : event.start?.date
        ? allDayDateToUTC(event.start.date)
        : null;
      
      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? allDayDateToUTC(event.end.date)
        : null;
      
      if (!startTime || !endTime || !event.id) {
        serverLogger.warn(`[GoogleCalendarService] Event missing required fields:`, {
          id: event.id,
          hasStart: !!startTime,
          hasEnd: !!endTime,
        });
        return null;
      }
      
      // Check if this event is already linked to a job
      const jobId = event.extendedProperties?.private?.jobId;
      const hasLinkedJob = !!jobId;
      
      // Determine event type based on content
      let eventType: GoogleEvent['eventType'] = 'other';
      const title = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const combinedText = `${title} ${description}`;
      
      if (combinedText.includes('inspection') || 
          combinedText.includes('test') || 
          combinedText.includes('blower') ||
          combinedText.includes('duct')) {
        eventType = 'inspection';
      } else if (combinedText.includes('meeting') || 
                 combinedText.includes('review') || 
                 combinedText.includes('consultation')) {
        eventType = 'meeting';
      } else if (combinedText.includes('training') || 
                 combinedText.includes('workshop')) {
        eventType = 'training';
      }
      
      const googleEvent: InsertGoogleEvent = {
        googleEventId: event.id,
        calendarId,
        summary: event.summary || 'Untitled Event',
        description: event.description || null,
        location: event.location || null,
        startTime,
        endTime,
        isAllDay: !event.start?.dateTime,
        eventType,
        hasLinkedJob,
        linkedJobId: jobId || null,
        organizerEmail: event.organizer?.email || null,
        organizerName: event.organizer?.displayName || null,
        attendees: event.attendees?.map(a => ({
          email: a.email || '',
          name: a.displayName || '',
          responseStatus: a.responseStatus || 'unknown',
        })) || [],
        htmlLink: event.htmlLink || null,
        status: event.status || 'confirmed',
        lastSyncedAt: new Date(),
        metadata: {
          colorId: event.colorId,
          recurringEventId: event.recurringEventId,
          created: event.created,
          updated: event.updated,
          extendedProperties: event.extendedProperties,
        },
      };
      
      // Note: We don't store Google events in the database immediately
      // They will be stored only when converted to jobs or explicitly synced
      // Return the event directly without DB storage
      return Promise.resolve(googleEvent);
    } catch (error) {
      serverLogger.error('[GoogleCalendarService] Error parsing event:', error);
      return null;
    }
  }
  
  /**
   * Get all available calendars the user has access to
   */
  async getAvailableCalendars() {
    try {
      const calendars = await baseService.fetchCalendarList();
      return calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        selected: cal.selected || false,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        accessRole: cal.accessRole,
      }));
    } catch (error) {
      serverLogger.error('[GoogleCalendarService] Error fetching calendar list:', error);
      throw error;
    }
  }
  
  /**
   * Sync a schedule event to Google Calendar
   */
  async syncScheduleEventToGoogle(
    scheduleEvent: ScheduleEvent,
    job: Job,
    calendarId?: string
  ): Promise<string | null> {
    const targetCalendarId = calendarId || await this.getBuildingKnowledgeCalendarId() || 'primary';
    return baseService.syncEventToGoogle(scheduleEvent, job, targetCalendarId);
  }
  
  /**
   * Delete an event from Google Calendar
   */
  async deleteEventFromGoogle(
    googleEventId: string,
    calendarId?: string
  ): Promise<void> {
    const targetCalendarId = calendarId || await this.getBuildingKnowledgeCalendarId() || 'primary';
    return baseService.deleteEventFromGoogle(googleEventId, targetCalendarId);
  }
  
  /**
   * Fetch events and intelligently process them
   * This includes both syncing existing schedule events and identifying new events
   */
  async intelligentEventSync(
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<{
    scheduleEvents: { created: number; updated: number; skipped: number };
    googleEvents: { new: number; updated: number };
    unmatchedEvents: number;
    errors: string[];
  }> {
    const result = {
      scheduleEvents: { created: 0, updated: 0, skipped: 0 },
      googleEvents: { new: 0, updated: 0 },
      unmatchedEvents: 0,
      errors: [] as string[],
    };
    
    try {
      // Fetch all events from Building Knowledge calendar
      const googleEvents = await this.fetchBuildingKnowledgeEvents(startDate, endDate);
      serverLogger.info(`[GoogleCalendarService] Processing ${googleEvents.length} events for intelligent sync`);
      
      for (const event of googleEvents) {
        try {
          // Check if this event has a linked job
          if (event.hasLinkedJob && event.linkedJobId) {
            // This is a schedule event - check if it needs updating
            const existingScheduleEvent = await storage.getScheduleEventByGoogleId(event.googleEventId);
            
            if (existingScheduleEvent) {
              // Update if changed
              if (this.hasEventChanged(existingScheduleEvent, event)) {
                await storage.updateScheduleEvent(existingScheduleEvent.id, {
                  title: event.summary,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  notes: event.description,
                  lastSyncedAt: new Date(),
                });
                result.scheduleEvents.updated++;
              } else {
                result.scheduleEvents.skipped++;
              }
            } else {
              // Create new schedule event
              const job = await storage.getJob(event.linkedJobId);
              if (job) {
                await storage.createScheduleEvent({
                  jobId: event.linkedJobId,
                  title: event.summary,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  notes: event.description,
                  googleCalendarEventId: event.googleEventId,
                  googleCalendarId: event.calendarId,
                  color: null,
                });
                result.scheduleEvents.created++;
              }
            }
          } else {
            // This is a new Google event without a linked job
            // It should be visible in the calendar and potentially convertible to a job
            const existingGoogleEvent = await storage.getGoogleEvent(event.googleEventId);
            
            if (existingGoogleEvent) {
              result.googleEvents.updated++;
            } else {
              result.googleEvents.new++;
            }
            
            // Check if this might be a job-worthy event
            if (event.eventType === 'inspection' || 
                event.summary.toLowerCase().includes('test') ||
                event.summary.toLowerCase().includes('inspection')) {
              result.unmatchedEvents++;
            }
          }
        } catch (error: any) {
          const errorMsg = `Error processing event ${event.googleEventId}: ${error.message}`;
          serverLogger.error(`[GoogleCalendarService] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      
      serverLogger.info('[GoogleCalendarService] Intelligent sync complete:', result);
      return result;
    } catch (error: any) {
      serverLogger.error('[GoogleCalendarService] Intelligent sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }
  
  /**
   * Check if a schedule event has changed compared to its Google Calendar version
   */
  private hasEventChanged(scheduleEvent: ScheduleEvent, googleEvent: GoogleEvent): boolean {
    return (
      scheduleEvent.title !== googleEvent.summary ||
      scheduleEvent.startTime.getTime() !== googleEvent.startTime.getTime() ||
      scheduleEvent.endTime.getTime() !== googleEvent.endTime.getTime() ||
      scheduleEvent.notes !== googleEvent.description
    );
  }
  
  /**
   * Test the Google Calendar connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    calendars?: Array<{ id: string; name: string }>;
    buildingKnowledgeCalendar?: string;
  }> {
    try {
      const calendars = await this.getAvailableCalendars();
      const buildingKnowledgeId = await this.getBuildingKnowledgeCalendarId();
      
      return {
        success: true,
        message: 'Successfully connected to Google Calendar',
        calendars: calendars.map(c => ({ id: c.id, name: c.name })),
        buildingKnowledgeCalendar: buildingKnowledgeId || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect: ${error.message}`,
      };
    }
  }

  /**
   * Sync Building Knowledge calendar events to pending_calendar_events table
   * This is the main method for on-demand calendar synchronization
   * 
   * @param userId The user ID who triggered the sync (for audit trail)
   * @returns Count of new events imported
   */
  async syncBuildingKnowledgeCalendar(userId: string): Promise<{
    totalEvents: number;
    newEvents: number;
    duplicateEvents: number;
    errors: string[];
  }> {
    const result = {
      totalEvents: 0,
      newEvents: 0,
      duplicateEvents: 0,
      errors: [] as string[],
    };

    try {
      serverLogger.info('[GoogleCalendarService] Starting Building Knowledge calendar sync', { userId });

      // Define date range: next 30 days from today
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Start of today
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30 days from now
      endDate.setHours(23, 59, 59, 999); // End of that day

      serverLogger.info('[GoogleCalendarService] Fetching events for date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Fetch events from Building Knowledge calendar
      const googleEvents = await this.fetchBuildingKnowledgeEvents(startDate, endDate);
      result.totalEvents = googleEvents.length;

      serverLogger.info(`[GoogleCalendarService] Retrieved ${result.totalEvents} events from Building Knowledge calendar`);

      // Get all builders with abbreviations for matching
      const builders = await storage.getAllBuilders();
      serverLogger.info(`[GoogleCalendarService] Loaded ${builders.length} builders for matching`);

      // Process each event
      for (const googleEvent of googleEvents) {
        try {
          // Check if event already exists (deduplication)
          const existingEvent = await storage.getPendingCalendarEventByGoogleId(googleEvent.googleEventId);
          
          if (existingEvent) {
            result.duplicateEvents++;
            serverLogger.debug(`[GoogleCalendarService] Skipping duplicate event: ${googleEvent.summary} (${googleEvent.googleEventId})`);
            continue;
          }

          // Parse the event to extract builder and job type
          const parsedResult = parseCalendarEvent(
            googleEvent.summary,
            googleEvent.description,
            builders
          );

          serverLogger.debug('[GoogleCalendarService] Parsed event:', {
            title: googleEvent.summary,
            parsedBuilder: parsedResult.parsedBuilderName,
            parsedJobType: parsedResult.parsedJobType,
            confidence: parsedResult.confidenceScore,
          });

          // Create pending calendar event
          await storage.createPendingCalendarEvent({
            googleEventId: googleEvent.googleEventId,
            rawTitle: googleEvent.summary,
            rawDescription: googleEvent.description || null,
            eventDate: googleEvent.startTime,
            eventTime: null, // Flexible timing for inspections
            parsedBuilderName: parsedResult.parsedBuilderName,
            parsedBuilderId: parsedResult.parsedBuilderId || null,
            parsedJobType: parsedResult.parsedJobType,
            confidenceScore: parsedResult.confidenceScore,
            status: 'pending',
            metadata: {
              location: googleEvent.location,
              htmlLink: googleEvent.htmlLink,
              organizer: googleEvent.organizerEmail,
              calendarId: googleEvent.calendarId,
            },
            importedBy: userId,
          });

          result.newEvents++;
          serverLogger.info(`[GoogleCalendarService] ✓ Created pending event: ${googleEvent.summary}`);

        } catch (error: any) {
          const errorMsg = `Failed to process event "${googleEvent.summary}": ${error.message}`;
          serverLogger.error(`[GoogleCalendarService] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      serverLogger.info('[GoogleCalendarService] Sync completed:', {
        totalEvents: result.totalEvents,
        newEvents: result.newEvents,
        duplicateEvents: result.duplicateEvents,
        errors: result.errors.length,
      });

      return result;

    } catch (error: any) {
      const errorMsg = `Calendar sync failed: ${error.message}`;
      serverLogger.error(`[GoogleCalendarService] ${errorMsg}`, error);
      result.errors.push(errorMsg);
      return result;
    }
  }
  
  /**
   * Exports a job to Google Calendar as an event
   * Creates a new calendar event with job details
   */
  async exportJobToGoogleCalendar(
    userId: string,
    jobId: string,
    calendarId: string = 'primary'
  ): Promise<string> {
    try {
      // Get access token and verify scopes
      const { getAccessToken } = await import('./googleCalendar');
      const accessToken = await getAccessToken();
      
      // Verify scopes before export
      const hasRequiredScopes = await verifyRequiredScopes(accessToken);
      if (!hasRequiredScopes) {
        throw new Error('Missing required Google Calendar permissions for export. Please reconnect your calendar.');
      }
      
      // Get job details
      const job = await storage.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Get lot and development for full context
      const lot = job.lotId ? await storage.getLot(job.lotId) : null;
      const development = lot?.developmentId ? 
        await storage.getDevelopment(lot.developmentId) : null;
      
      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Build event description
      const description = this.buildEventDescription(job, lot, development);
      
      // Build event from job data
      const event = {
        summary: `Energy Audit: ${job.address || 'TBD'}`,
        description,
        location: job.address || '',
        start: job.scheduledDate ? {
          dateTime: new Date(job.scheduledDate).toISOString(),
          timeZone: 'America/Chicago' // Minnesota timezone
        } : undefined,
        end: job.scheduledDate ? {
          dateTime: new Date(new Date(job.scheduledDate).getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
          timeZone: 'America/Chicago'
        } : undefined,
        extendedProperties: {
          private: {
            jobId: jobId.toString(),
            source: 'energy-audit-app',
            lotNumber: lot?.lotNumber || '',
            developmentName: development?.name || ''
          }
        }
      };
      
      // Create event in Google Calendar
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event
      });
      
      // Save Google Calendar event ID in job record
      if (response.data.id) {
        await storage.updateJob(jobId, {
          googleEventId: response.data.id
        });
      }
      
      serverLogger.info('[Calendar Export] Job exported to Google Calendar', {
        jobId,
        eventId: response.data.id,
        calendarId
      });
      
      return response.data.id!;
    } catch (error) {
      serverLogger.error('[Calendar Export] Export failed', { error, jobId });
      throw error;
    }
  }
  
  /**
   * Updates a Google Calendar event when job changes
   */
  async updateJobInGoogleCalendar(
    userId: string,
    jobId: string
  ): Promise<void> {
    try {
      const job = await storage.getJob(jobId);
      if (!job || !job.googleEventId) {
        throw new Error('Job has no linked calendar event');
      }
      
      // Get access token and verify scopes
      const { getAccessToken } = await import('./googleCalendar');
      const accessToken = await getAccessToken();
      
      const hasRequiredScopes = await verifyRequiredScopes(accessToken);
      if (!hasRequiredScopes) {
        throw new Error('Missing required Google Calendar permissions for update.');
      }
      
      // Get lot and development for full context
      const lot = job.lotId ? await storage.getLot(job.lotId) : null;
      const development = lot?.developmentId ? 
        await storage.getDevelopment(lot.developmentId) : null;
      
      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Build event description
      const description = this.buildEventDescription(job, lot, development);
      
      // Build updated event data
      const event = {
        summary: `Energy Audit: ${job.address || 'TBD'}`,
        description,
        location: job.address || '',
        start: job.scheduledDate ? {
          dateTime: new Date(job.scheduledDate).toISOString(),
          timeZone: 'America/Chicago'
        } : undefined,
        end: job.scheduledDate ? {
          dateTime: new Date(new Date(job.scheduledDate).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Chicago'
        } : undefined,
        extendedProperties: {
          private: {
            jobId: jobId.toString(),
            source: 'energy-audit-app',
            lotNumber: lot?.lotNumber || '',
            developmentName: development?.name || ''
          }
        }
      };
      
      // Update event in Google Calendar
      await calendar.events.update({
        calendarId: 'primary', // Could be made configurable
        eventId: job.googleEventId,
        requestBody: event
      });
      
      serverLogger.info('[Calendar Export] Job updated in Google Calendar', {
        jobId,
        eventId: job.googleEventId
      });
    } catch (error) {
      serverLogger.error('[Calendar Export] Update failed', { error, jobId });
      throw error;
    }
  }
  
  /**
   * Deletes a Google Calendar event when job is deleted
   */
  async deleteJobFromGoogleCalendar(
    userId: string,
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      // Get access token
      const { getAccessToken } = await import('./googleCalendar');
      const accessToken = await getAccessToken();
      
      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      await calendar.events.delete({
        calendarId,
        eventId
      });
      
      serverLogger.info('[Calendar Export] Event deleted from Google Calendar', {
        eventId,
        calendarId
      });
    } catch (error: any) {
      // If event is already deleted (404), treat as success
      if (error.code === 404 || error.message?.includes('404')) {
        serverLogger.info(`[Calendar Export] Event ${eventId} not found, already deleted`);
        return;
      }
      serverLogger.error('[Calendar Export] Delete failed', { error, eventId });
      // Don't throw - deletion should not block job deletion
    }
  }
  
  /**
   * Helper to build event description from job data
   */
  private buildEventDescription(job: any, lot: any, development: any): string {
    const lines = [
      `Job Status: ${job.status}`,
      `Address: ${job.address || 'TBD'}`,
    ];
    
    if (development) {
      lines.push(`Development: ${development.name}`);
    }
    
    if (lot) {
      lines.push(`Lot: ${lot.lotNumber}`);
    }
    
    if (job.inspectionType) {
      lines.push(`Job Type: ${job.inspectionType}`);
    }
    
    if (job.notes) {
      lines.push(``, `Notes:`, job.notes);
    }
    
    lines.push(``, `---`, `Created by Energy Audit Application`);
    
    return lines.join('\n');
  }
}

// Create and export a singleton instance
export const googleCalendarService = new ExtendedGoogleCalendarService();

// Also export the base service for backward compatibility
export { baseService as googleCalendarBaseService };