import { google } from 'googleapis';
import type { ScheduleEvent, Job } from '@shared/schema';
import { serverLogger } from './logger';
import { DateTime } from 'luxon';

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
  } | null;
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
let tokenRefreshPromise: Promise<string> | null = null; // Mutex for concurrent token refresh

// Helper function to detect Google Calendar authentication errors
// Handles multiple error formats from Google API
function isAuthError(error: any): boolean {
  if (!error) return false;
  
  // Check HTTP status codes
  if (error.code === 401 || error.status === 401) return true;
  
  // Check Google API error response format
  if (error.response?.status === 401) return true;
  if (error.response?.data?.error?.code === 401) return true;
  
  // Check Google API error details
  if (error.errors?.[0]?.reason === 'authError') return true;
  if (error.errors?.[0]?.reason === 'unauthorized') return true;
  
  // Check error message content
  const message = (error.message || '').toLowerCase();
  const errorString = (error.toString() || '').toLowerCase();
  
  return message.includes('unauthorized') || 
         message.includes('invalid credentials') ||
         message.includes('authentication') ||
         message.includes('unauthenticated') ||
         errorString.includes('401') ||
         errorString.includes('unauthorized');
}

// Helper function to detect Google Calendar rate limiting errors
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  // Check HTTP status codes
  if (error.code === 429 || error.status === 429) return true;
  
  // Check Google API error response format
  if (error.response?.status === 429) return true;
  if (error.response?.data?.error?.code === 429) return true;
  
  // Check Google API error reasons
  if (error.errors?.[0]?.reason === 'rateLimitExceeded') return true;
  if (error.errors?.[0]?.reason === 'userRateLimitExceeded') return true;
  if (error.errors?.[0]?.reason === 'quotaExceeded') return true;
  
  // Check error message content
  const message = (error.message || '').toLowerCase();
  return message.includes('rate limit') || 
         message.includes('quota') ||
         message.includes('too many requests');
}

// Helper function to sleep for exponential backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wrapper for automatic retry with fresh token on auth errors and exponential backoff on rate limits
// This provides self-healing behavior when tokens expire and graceful rate limit handling
async function withTokenRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Handle authentication errors with token refresh
      if (isAuthError(error)) {
        if (attempt === 0) {
          serverLogger.warn(`[GoogleCalendar] Authentication error in ${operationName}, refreshing token and retrying...`);
          
          // Clear cached token and force fresh token fetch
          await getAccessToken(true);
          
          // Retry with fresh token
          try {
            serverLogger.info(`[GoogleCalendar] Retrying ${operationName} with fresh token`);
            return await operation();
          } catch (retryError) {
            // If retry also fails, continue to rate limit check
            lastError = retryError;
          }
        } else {
          // Already retried auth once, don't retry again
          serverLogger.error(`[GoogleCalendar] Authentication retry failed for ${operationName}`);
          throw error;
        }
      }
      
      // Handle rate limiting with exponential backoff
      if (isRateLimitError(error)) {
        if (attempt < maxRetries) {
          // Calculate exponential backoff with jitter
          // Base delay: 1s, 2s, 4s (doubling each time)
          // Add jitter: ±25% randomization to prevent thundering herd
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
          const delay = baseDelay + jitter;
          
          serverLogger.warn(
            `[GoogleCalendar] Rate limit exceeded in ${operationName}, ` +
            `retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          
          await sleep(delay);
          continue;
        } else {
          serverLogger.error(
            `[GoogleCalendar] Rate limit exceeded in ${operationName}, ` +
            `max retries (${maxRetries}) exhausted`
          );
          throw error;
        }
      }
      
      // Not an auth or rate limit error, throw immediately
      throw error;
    }
  }
  
  // Should never reach here, but throw last error just in case
  throw lastError;
}

// Convert all-day event date from calendar timezone to UTC with proper DST handling
// Minnesota-based field inspector uses Central Time (America/Chicago)
// Central is UTC-6 (CST) in winter or UTC-5 (CDT) in summer
// Note: Google Calendar stores all-day events in the calendar's timezone,
// but the API doesn't always include timezone metadata in the response.
// For production: read calendar settings to get the correct timezone.
export function allDayDateToUTC(dateString: string, timezone: string = 'America/Chicago'): Date | null {
  try {
    // Parse date in format YYYY-MM-DD and create midnight in the calendar's timezone
    // Luxon handles DST transitions automatically
    const dt = DateTime.fromISO(dateString, { zone: timezone }).startOf('day');
    
    if (!dt.isValid) {
      serverLogger.warn(`[GoogleCalendar] Invalid all-day date: ${dateString} in timezone ${timezone} - skipping`);
      return null;
    }
    
    // Convert to JavaScript Date in UTC
    return dt.toJSDate();
  } catch (error) {
    serverLogger.error(`[GoogleCalendar] Error converting all-day date ${dateString}:`, error);
    return null;
  }
}

// Get Google Calendar access token with automatic refresh and concurrent protection
// forceRefresh: Clear cache and fetch fresh token regardless of expiry
async function getAccessToken(forceRefresh = false): Promise<string> {
  // If force refresh requested, clear all cached state
  if (forceRefresh) {
    serverLogger.info('[GoogleCalendar] Force token refresh requested, clearing cache');
    connectionSettings = undefined;
    tokenRefreshPromise = null;
  }
  
  // Return cached token if still valid and not forcing refresh
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    serverLogger.debug('[GoogleCalendar] Using cached access token');
    const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
    if (accessToken) {
      return accessToken;
    }
  }
  
  // If another request is already refreshing the token, wait for it
  // This prevents multiple simultaneous refresh requests (mutex pattern)
  if (tokenRefreshPromise) {
    serverLogger.debug('[GoogleCalendar] Token refresh already in progress, waiting...');
    return tokenRefreshPromise;
  }
  
  // Start token refresh process
  serverLogger.info('[GoogleCalendar] Fetching fresh access token from Replit connector');
  
  tokenRefreshPromise = (async () => {
    try {
      const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
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
        throw new Error('Google Calendar not connected. Please reconnect in Replit integrations.');
      }

      const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

      if (!accessToken) {
        throw new Error('Google Calendar access token not found in connection settings');
      }
      
      serverLogger.info('[GoogleCalendar] Successfully obtained fresh access token');
      return accessToken;
    } catch (error) {
      serverLogger.error('[GoogleCalendar] Failed to fetch access token:', error);
      throw error;
    } finally {
      // Clear mutex after refresh completes (success or failure)
      tokenRefreshPromise = null;
    }
  })();
  
  return tokenRefreshPromise;
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

  // DEPRECATED: Calendar write-back feature removed
  // Jobs completion details are now shared directly via app access
  // async createCompletionEvent(...) { ... }

  async syncEventToGoogle(
    scheduleEvent: ScheduleEvent, 
    job: Job,
    calendarId: string = 'primary'
  ): Promise<string | null> {
    return withTokenRetry(async () => {
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
    }, 'syncEventToGoogle');
  }

  async deleteEventFromGoogle(
    googleEventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    return withTokenRetry(async () => {
      const calendar = await getUncachableGoogleCalendarClient();
      
      await calendar.events.delete({
        calendarId,
        eventId: googleEventId,
      });
      
      serverLogger.info(`[GoogleCalendar] Deleted event: ${googleEventId}`);
    }, 'deleteEventFromGoogle').catch(error => {
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
    });
  }

  async fetchEventsFromGoogle(
    startDate: Date, 
    endDate: Date, 
    calendarIds: string[] = ['primary']
  ): Promise<GoogleCalendarEvent[]> {
    return withTokenRetry(async () => {
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
          // If auth error, let it bubble up for retry
          if (isAuthError(error)) {
            throw error;
          }
          // Log other errors but continue with remaining calendars
          serverLogger.error(`[GoogleCalendar] Error fetching events from calendar ${calendarId}:`, error);
        }
      }
      
      serverLogger.info(`[GoogleCalendar] Total fetched ${allEvents.length} events from ${calendarIds.length} calendars`);
      return allEvents;
    }, 'fetchEventsFromGoogle');
  }

  async fetchCalendarList(): Promise<GoogleCalendarListItem[]> {
    return withTokenRetry(async () => {
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
    }, 'fetchCalendarList');
  }

  parseGoogleEventToScheduleEvent(googleEvent: GoogleCalendarEvent): Partial<ScheduleEvent> | null {
    try {
      // Check if event has been cancelled
      if (googleEvent.status === 'cancelled') {
        serverLogger.info(`[GoogleCalendar] Skipping cancelled event: ${googleEvent.id}`);
        return null;
      }

      // Get start and end times (support both timed and all-day events)
      const startTime = googleEvent.start?.dateTime 
        ? new Date(googleEvent.start.dateTime)
        : googleEvent.start?.date
        ? allDayDateToUTC(googleEvent.start.date)
        : null;

      const endTime = googleEvent.end?.dateTime
        ? new Date(googleEvent.end.dateTime)
        : googleEvent.end?.date
        ? allDayDateToUTC(googleEvent.end.date)
        : null;

      if (!startTime || !endTime) {
        serverLogger.warn(`[GoogleCalendar] Event ${googleEvent.id} missing start or end time`);
        return null;
      }

      const scheduleEventId = googleEvent.extendedProperties?.private?.scheduleEventId;
      const jobId = googleEvent.extendedProperties?.private?.jobId;

      if (!jobId) {
        return null;
      }

      const isAllDay = !googleEvent.start?.dateTime;
      if (isAllDay) {
        serverLogger.info(`[GoogleCalendar] Processing all-day event: ${googleEvent.id} (${googleEvent.summary}) - date: ${googleEvent.start?.date}, converted to: ${startTime.toISOString()}`);
      }

      return {
        id: scheduleEventId,
        jobId,
        title: googleEvent.summary || 'Untitled Event',
        startTime,
        endTime,
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
