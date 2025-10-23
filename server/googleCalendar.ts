import { google } from 'googleapis';
import type { ScheduleEvent, Job } from '@shared/schema';

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
  async syncEventToGoogle(scheduleEvent: ScheduleEvent, job: Job): Promise<string | null> {
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
          calendarId: 'primary',
          eventId: scheduleEvent.googleCalendarEventId,
          requestBody: eventData,
        });
        console.log(`[GoogleCalendar] Updated event: ${response.data.id}`);
        return response.data.id || null;
      } else {
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventData,
        });
        console.log(`[GoogleCalendar] Created event: ${response.data.id}`);
        return response.data.id || null;
      }
    } catch (error) {
      console.error('[GoogleCalendar] Error syncing event to Google Calendar:', error);
      throw error;
    }
  }

  async deleteEventFromGoogle(googleEventId: string): Promise<void> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
      
      console.log(`[GoogleCalendar] Deleted event: ${googleEventId}`);
    } catch (error) {
      if (error instanceof Error) {
        const errorWithCode = error as Error & { code?: number };
        if (errorWithCode.code === 404 || error.message?.includes('404')) {
          console.log(`[GoogleCalendar] Event ${googleEventId} not found, already deleted`);
          return;
        }
      }
      console.error('[GoogleCalendar] Error deleting event from Google Calendar:', error);
      throw error;
    }
  }

  async fetchEventsFromGoogle(startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
    try {
      const calendar = await getUncachableGoogleCalendarClient();
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log(`[GoogleCalendar] Fetched ${response.data.items?.length || 0} events from Google Calendar`);
      return response.data.items || [];
    } catch (error) {
      console.error('[GoogleCalendar] Error fetching events from Google Calendar:', error);
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
        lastSyncedAt: new Date(),
        color: null,
      };
    } catch (error) {
      console.error('[GoogleCalendar] Error parsing Google event:', error);
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
