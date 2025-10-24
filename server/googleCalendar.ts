import { google } from 'googleapis';
import type { ScheduleEvent, Job } from '@shared/schema';
import { serverLogger } from './logger';

interface ConnectionSettings {
  settings: {
    access_token?: string;
    expires_at?: string;
    oauth?: {
      credentials?: {
        access_token?: string;
      };
    };
  };
}

interface GoogleCalendarEvent {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: {
    dateTime?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
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
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  description?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  accessRole?: string | null;
  primary?: boolean | null;
  selected?: boolean | null;
}

let connectionSettings: ConnectionSettings | undefined;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings) {
    throw new Error('Google Calendar not connected');
  }

  const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Google Calendar access token not found');
  }
  return accessToken;
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export class GoogleCalendarService {
  private updatesCalendarIdCache: string | null = null;

  async findCalendarByName(name: string): Promise<string | null> {
    try {
      // Return cached value if available
      if (name === 'Shaun - Updates' && this.updatesCalendarIdCache) {
        return this.updatesCalendarIdCache;
      }

      const calendars = await this.fetchCalendarList();
      const calendar = calendars.find(cal => cal.summary === name);

      // Cache the "Shaun - Updates" calendar ID for future use
      if (calendar && name === 'Shaun - Updates') {
        this.updatesCalendarIdCache = calendar.id;
      }

      return calendar?.id || null;
    } catch (error) {
      serverLogger.error(`[GoogleCalendar] Error finding calendar "${name}":`, error);
      return null;
    }
  }

  async createCompletionEvent(
    job: Job,
    calendarId: string,
    builder: { name: string } | null = null,
    forecast: { actualACH50: string | null } | null = null
  ): Promise<string | null> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      // Extract ACH50 score from forecast
      const ach50Score = forecast?.actualACH50 ? parseFloat(forecast.actualACH50) : null;
      const ach50Display = ach50Score !== null ? `${ach50Score} ACH50` : 'Not tested';
      const ach50Result = ach50Score !== null && ach50Score <= 3.0 ? 'PASSED' : 'FAILED';
      
      // Format description with completion details
      const description = `
COMPLETION DETAILS
==================
Inspection Type: ${job.inspectionType}
Address: ${job.address}
Builder: ${builder?.name || 'N/A'}

BLOWER DOOR TEST
----------------
ACH50: ${ach50Display}
Result: ${ach50Score !== null ? `${ach50Result} Minnesota Code (3.0 ACH50 max)` : 'Not applicable'}

NOTES
-----
${job.notes || 'No notes'}

View Full Report: ${process.env.REPL_URL || 'https://app.example.com'}/jobs/${job.id}
`.trim();

      // Use completedDate or current time
      const completionTime = job.completedDate || new Date();
      const endTime = new Date(completionTime.getTime() + 30 * 60 * 1000); // 30 minutes later

      const eventData = {
        summary: job.name,
        description,
        location: job.address,
        start: {
          dateTime: completionTime.toISOString(),
          timeZone: 'America/Chicago',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Chicago',
        },
      };

      // Check if we should update existing event or create new one
      if (job.completionGoogleEventId) {
        try {
          const response = await calendar.events.update({
            calendarId,
            eventId: job.completionGoogleEventId,
            requestBody: eventData,
          });
          serverLogger.info(`[GoogleCalendar] Updated completion event: ${response.data.id}`);
          return response.data.id || null;
        } catch (error) {
          // If update fails (e.g., event was deleted), create a new one
          serverLogger.warn(`[GoogleCalendar] Failed to update existing event, creating new one:`, error);
        }
      }

      // Create new event
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });
      serverLogger.info(`[GoogleCalendar] Created completion event: ${response.data.id}`);
      return response.data.id || null;
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Error creating completion event:', error);
      throw error;
    }
  }

  async syncEventToGoogle(
    scheduleEvent: ScheduleEvent, 
    job: Job,
    calendarId: string = 'primary'
  ): Promise<string | null> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      // Minnesota-based field inspector uses Central Time Zone (America/Chicago)
      // This ensures all calendar events display at the correct local time
      const eventData = {
        summary: scheduleEvent.title,
        description: scheduleEvent.notes || `Job: ${job.name}\nAddress: ${job.address}\nInspection Type: ${job.inspectionType}`,
        start: {
          dateTime: scheduleEvent.startTime.toISOString(),
          timeZone: 'America/Chicago',
        },
        end: {
          dateTime: scheduleEvent.endTime.toISOString(),
          timeZone: 'America/Chicago',
        },
        extendedProperties: {
          private: {
            scheduleEventId: scheduleEvent.id,
            jobId: scheduleEvent.jobId,
          },
        },
        colorId: this.mapColorToGoogleCalendar(scheduleEvent.color),
      };

      if (scheduleEvent.googleCalendarEventId) {
        const response = await calendar.events.update({
          calendarId,
          eventId: scheduleEvent.googleCalendarEventId,
          requestBody: eventData,
        });
        serverLogger.info(`[GoogleCalendar] Updated event: ${response.data.id}`);
        return response.data.id || null;
      } else {
        const response = await calendar.events.insert({
          calendarId,
          requestBody: eventData,
        });
        serverLogger.info(`[GoogleCalendar] Created event: ${response.data.id}`);
        return response.data.id || null;
      }
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Error syncing event to Google Calendar:', error);
      throw error;
    }
  }

  async deleteEventFromGoogle(
    googleEventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      await calendar.events.delete({
        calendarId,
        eventId: googleEventId,
      });
      
      serverLogger.info(`[GoogleCalendar] Deleted event: ${googleEventId}`);
    } catch (error) {
      // If event is already deleted (404), treat as success
      if (error instanceof Error) {
        const errorWithCode = error as Error & { code?: number };
        if (errorWithCode.code === 404 || error.message?.includes('404')) {
          serverLogger.info(`[GoogleCalendar] Event ${googleEventId} not found, already deleted`);
          return;
        }
      }
      // Only throw for non-404 errors
      serverLogger.error('[GoogleCalendar] Error deleting event from Google Calendar:', error);
      throw error;
    }
  }

  async fetchEventsFromGoogle(
    startDate: Date, 
    endDate: Date, 
    calendarIds: string[] = ['primary']
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      const allEvents: GoogleCalendarEvent[] = [];
      
      // Fetch events from each calendar
      for (const calendarId of calendarIds) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          });
          
          // Add calendarId to each event
          const events = (response.data.items || []).map(event => ({
            ...event,
            calendarId,
          }));
          
          allEvents.push(...events);
          
          serverLogger.info(`[GoogleCalendar] Fetched ${events.length} events from calendar ${calendarId}`);
        } catch (error) {
          // Log error but continue with other calendars
          serverLogger.error(`[GoogleCalendar] Error fetching events from calendar ${calendarId}:`, error);
        }
      }
      
      serverLogger.info(`[GoogleCalendar] Total fetched ${allEvents.length} events from ${calendarIds.length} calendars`);
      return allEvents;
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Error fetching events from Google Calendar:', error);
      throw error;
    }
  }

  async fetchCalendarList(): Promise<GoogleCalendarListItem[]> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      const response = await calendar.calendarList.list({
        minAccessRole: 'reader',
        showHidden: false,
      });

      serverLogger.info(`[GoogleCalendar] Fetched ${response.data.items?.length || 0} calendars`);
      
      return (response.data.items || []).map(cal => ({
        id: cal.id || '',
        summary: cal.summary || 'Untitled Calendar',
        description: cal.description,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        accessRole: cal.accessRole,
        primary: cal.primary,
        selected: cal.selected,
      }));
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Error fetching calendar list:', error);
      throw error;
    }
  }

  parseGoogleEventToScheduleEvent(googleEvent: GoogleCalendarEvent): Partial<ScheduleEvent> | null {
    try {
      if (!googleEvent.start?.dateTime || !googleEvent.end?.dateTime) {
        return null;
      }

      const scheduleEventId = googleEvent.extendedProperties?.private?.scheduleEventId;
      const jobId = googleEvent.extendedProperties?.private?.jobId;

      if (!jobId) {
        return null;
      }

      return {
        id: scheduleEventId,
        jobId,
        title: googleEvent.summary || 'Untitled Event',
        startTime: new Date(googleEvent.start.dateTime),
        endTime: new Date(googleEvent.end.dateTime),
        notes: googleEvent.description || null,
        googleCalendarEventId: googleEvent.id,
        googleCalendarId: googleEvent.calendarId,
        lastSyncedAt: new Date(),
        color: null,
      };
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Error parsing Google event:', error);
      return null;
    }
  }

  private mapColorToGoogleCalendar(color: string | null): string | undefined {
    if (!color) return undefined;
    
    const colorMap: Record<string, string> = {
      'blue': '1',
      'green': '2',
      'purple': '3',
      'red': '4',
      'yellow': '5',
      'orange': '6',
      'cyan': '7',
      'gray': '8',
      'grey': '8',
    };

    return colorMap[color.toLowerCase()] || undefined;
  }
}

export const googleCalendarService = new GoogleCalendarService();
