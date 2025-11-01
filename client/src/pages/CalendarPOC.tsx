import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  accessRole?: string;
  isPrimary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: any;
  end: any;
  organizer?: any;
  status?: string;
  parsed?: {
    builderId: string | null;
    builderName: string | null;
    inspectionType: string | null;
    confidence: number;
    parsedBuilderAbbreviation: string | null;
    parsedInspectionKeyword: string | null;
  };
}

interface CalendarsResponse {
  success: boolean;
  count: number;
  calendars: CalendarInfo[];
}

interface EventsResponse {
  success: boolean;
  calendarId: string;
  dateRange: {
    start: string;
    end: string;
  };
  count: number;
  events: CalendarEvent[];
}

function CalendarPOCContent() {
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  // Fetch calendar list
  const { 
    data: calendarsData, 
    isLoading: calendarsLoading, 
    error: calendarsError,
    refetch: refetchCalendars 
  } = useQuery<CalendarsResponse>({
    queryKey: ['/api/calendar/poc/list'],
    enabled: false, // Manual trigger only
    retry: 2,
  });

  // Fetch events from selected calendar
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useQuery<EventsResponse>({
    queryKey: [`/api/calendar/poc/events?calendarId=${selectedCalendar}`],
    enabled: !!selectedCalendar,
    retry: 2,
  });

  const calendars: CalendarInfo[] = calendarsData?.calendars || [];
  const events: CalendarEvent[] = eventsData?.events || [];

  const importMutation = useMutation({
    mutationFn: async (data: { calendarId: string; events: any[] }) => {
      const response = await apiRequest('POST', '/api/calendar/import', data);
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: "Import Complete",
        description: `${data.jobsCreated} jobs created, ${data.eventsQueued} events queued for review`,
      });
      // Invalidate jobs query to refresh job list
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || 'Failed to import calendar events',
        variant: "destructive",
      });
    },
  });

  const handleImport = useCallback(() => {
    if (!selectedCalendar || !events.length) {
      toast({
        title: "Cannot Import",
        description: "Please select a calendar and parse events first",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      calendarId: selectedCalendar,
      events: events,
    });
  }, [selectedCalendar, events, toast, importMutation]);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="wrapper-poc-page">
      <div className="flex items-center justify-between" data-testid="section-header">
        <div data-testid="wrapper-header-content">
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">Calendar Import - POC Testing</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            Research & validation for contractor calendar import system
          </p>
        </div>
      </div>

      {/* Step 1: Fetch Calendars */}
      <Card data-testid="card-step-1">
        <CardHeader data-testid="section-step-1-header">
          <CardTitle data-testid="heading-step-1-title">Step 1: Validate Calendar Access</CardTitle>
          <CardDescription data-testid="text-step-1-description">
            Test if we can access all calendars, including the shared "Building Knowledge" contractor calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-step-1-content">
          <Button 
            onClick={() => refetchCalendars()}
            disabled={calendarsLoading}
            data-testid="button-fetch-calendars"
          >
            {calendarsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Calendar className="mr-2 h-4 w-4" />
            Fetch All Calendars
          </Button>

          {calendarsLoading && (
            <div className="space-y-3" data-testid="wrapper-calendars-loading">
              <Skeleton className="h-20 w-full" data-testid="skeleton-calendar-1" />
              <Skeleton className="h-20 w-full" data-testid="skeleton-calendar-2" />
              <Skeleton className="h-20 w-full" data-testid="skeleton-calendar-3" />
            </div>
          )}

          {calendarsError && (
            <Alert variant="destructive" data-testid="alert-error-calendars">
              <AlertCircle className="h-4 w-4" data-testid="icon-error-calendars" />
              <AlertDescription className="flex items-center justify-between gap-4" data-testid="text-error-calendars">
                <span data-testid="text-error-message-calendars">Error: {calendarsError instanceof Error ? calendarsError.message : 'Failed to fetch calendars'}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchCalendars()}
                  data-testid="button-retry-calendars"
                >
                  <RefreshCw className="h-4 w-4 mr-2" data-testid="icon-refresh-calendars" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {calendarsData && (
            <div className="space-y-4" data-testid="wrapper-calendars-success">
              <Alert data-testid="alert-success-calendars">
                <CheckCircle2 className="h-4 w-4" data-testid="icon-success-calendars" />
                <AlertDescription data-testid="text-success-calendars">
                  Successfully fetched {calendarsData.count} calendar{calendarsData.count !== 1 ? 's' : ''}
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg divide-y" data-testid="wrapper-calendars-list">
                {calendars.map((cal) => (
                  <div 
                    key={cal.id} 
                    className="p-4 hover-elevate cursor-pointer"
                    onClick={() => setSelectedCalendar(cal.id)}
                    data-testid={`calendar-${cal.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{cal.name}</h3>
                          {cal.isPrimary && <Badge variant="secondary">Primary</Badge>}
                          {cal.name === 'Building Knowledge' && (
                            <Badge variant="default">Contractor Calendar</Badge>
                          )}
                        </div>
                        {cal.description && (
                          <p className="text-sm text-muted-foreground">{cal.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Access: {cal.accessRole || 'unknown'}</span>
                          <span>•</span>
                          <span className="font-mono text-xs">{cal.id.substring(0, 30)}...</span>
                        </div>
                      </div>
                      {selectedCalendar === cal.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: View Events */}
      {selectedCalendar && (
        <Card data-testid="card-step-2">
          <CardHeader data-testid="section-step-2-header">
            <div className="flex items-center justify-between gap-4" data-testid="wrapper-step-2-title">
              <div data-testid="wrapper-events-header">
                <CardTitle data-testid="heading-step-2-title">Parsed Events</CardTitle>
                <CardDescription data-testid="text-step-2-description">
                  {events.length} events analyzed with confidence scores
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={!selectedCalendar || !events.length || importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {importMutation.isPending ? 'Importing...' : 'Import Events'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="section-step-2-content">
            {eventsLoading && (
              <div className="space-y-3" data-testid="wrapper-events-loading">
                <Skeleton className="h-16 w-full" data-testid="skeleton-event-1" />
                <Skeleton className="h-16 w-full" data-testid="skeleton-event-2" />
                <Skeleton className="h-16 w-full" data-testid="skeleton-event-3" />
                <Skeleton className="h-16 w-full" data-testid="skeleton-event-4" />
              </div>
            )}

            {eventsError && (
              <Alert variant="destructive" data-testid="alert-error-events">
                <AlertCircle className="h-4 w-4" data-testid="icon-error-events" />
                <AlertDescription className="flex items-center justify-between gap-4" data-testid="text-error-events">
                  <span data-testid="text-error-message-events">Error: {eventsError instanceof Error ? eventsError.message : 'Failed to fetch events'}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchEvents()}
                    data-testid="button-retry-events"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" data-testid="icon-refresh-events" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {eventsData && (
              <div className="space-y-4" data-testid="wrapper-events-success">
                <Alert data-testid="alert-success-events">
                  <CheckCircle2 className="h-4 w-4" data-testid="icon-success-events" />
                  <AlertDescription data-testid="text-success-events">
                    Found {eventsData.count} event{eventsData.count !== 1 ? 's' : ''} in next 30 days
                  </AlertDescription>
                </Alert>

                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-events">
                    No upcoming events found in this calendar
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y" data-testid="wrapper-events-list">
                    {events.map((event) => (
                      <div 
                        key={event.id} 
                        className="p-4"
                        data-testid={`event-${event.id}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-lg truncate">
                                {event.title || 'Untitled Event'}
                              </h4>
                              {event.location && (
                                <p className="text-sm text-muted-foreground">📍 {event.location}</p>
                              )}
                            </div>
                            <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
                              {event.status || 'unknown'}
                            </Badge>
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Start: {event.start?.dateTime 
                                ? new Date(event.start.dateTime).toLocaleString() 
                                : event.start?.date || 'N/A'}
                            </span>
                            {event.organizer?.email && (
                              <>
                                <span>•</span>
                                <span>By: {event.organizer.email}</span>
                              </>
                            )}
                          </div>

                          {/* Parser Results */}
                          {event.parsed && (
                            <div className="mt-3 p-3 bg-muted rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Parser Results:
                                </p>
                                <Badge 
                                  variant={
                                    event.parsed.confidence >= 80 ? 'default' : 
                                    event.parsed.confidence >= 60 ? 'secondary' : 
                                    'destructive'
                                  }
                                >
                                  {event.parsed.confidence}% confidence
                                </Badge>
                              </div>
                              
                              <div className="font-mono text-xs space-y-1">
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[100px]">Builder:</span>
                                  {event.parsed.builderName ? (
                                    <span className="text-green-600 font-semibold">
                                      ✓ {event.parsed.builderName}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">⚠ Not matched</span>
                                  )}
                                </div>
                                
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground min-w-[100px]">Inspection:</span>
                                  {event.parsed.inspectionType ? (
                                    <span className="text-green-600 font-semibold">
                                      ✓ {event.parsed.inspectionType}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">⚠ Not matched</span>
                                  )}
                                </div>
                                
                                {event.parsed.parsedBuilderAbbreviation && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Detected Code:</span>
                                    <span className="text-primary">{event.parsed.parsedBuilderAbbreviation}</span>
                                  </div>
                                )}
                                
                                {event.parsed.parsedInspectionKeyword && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground min-w-[100px]">Detected Type:</span>
                                    <span className="text-primary">{event.parsed.parsedInspectionKeyword}</span>
                                  </div>
                                )}
                                
                                <div className="mt-2 pt-2 border-t border-border">
                                  {event.parsed.confidence >= 80 ? (
                                    <span className="text-green-600 text-xs">
                                      ✓ Auto-create job (confidence ≥ 80%)
                                    </span>
                                  ) : event.parsed.confidence >= 60 ? (
                                    <span className="text-amber-600 text-xs">
                                      ⚠ Create + flag for review (60-79%)
                                    </span>
                                  ) : (
                                    <span className="text-red-600 text-xs">
                                      ✗ Manual review required (&lt;60%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && importResult.success && (
        <Alert className="bg-green-50 border-green-200" data-testid="alert-import-success">
          <CheckCircle2 className="h-4 w-4 text-green-600" data-testid="icon-import-success" />
          <AlertTitle data-testid="heading-import-success">Import Complete</AlertTitle>
          <AlertDescription data-testid="text-import-success">
            Successfully created {importResult.jobsCreated} jobs and queued {importResult.eventsQueued} events for review.
          </AlertDescription>
        </Alert>
      )}

      {importResult && !importResult.success && (
        <Alert variant="destructive" data-testid="alert-import-failed">
          <AlertCircle className="h-4 w-4" data-testid="icon-import-failed" />
          <AlertTitle data-testid="heading-import-failed">Import Failed</AlertTitle>
          <AlertDescription data-testid="text-import-failed">
            {importResult.message || 'An error occurred during import'}
          </AlertDescription>
        </Alert>
      )}

      {/* Research Notes */}
      <Card data-testid="card-research-goals">
        <CardHeader data-testid="section-research-header">
          <CardTitle data-testid="heading-research-title">Research Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm" data-testid="section-research-content">
          <div className="flex items-start gap-2" data-testid="wrapper-goal-1">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" data-testid="icon-goal-1" />
            <span data-testid="text-goal-1">Validate access to "Building Knowledge" shared calendar</span>
          </div>
          <div className="flex items-start gap-2" data-testid="wrapper-goal-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" data-testid="icon-goal-2" />
            <span data-testid="text-goal-2">Review real event title patterns (MI Test - Spec, MI SV2, etc.)</span>
          </div>
          <div className="flex items-start gap-2" data-testid="wrapper-goal-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" data-testid="icon-goal-3" />
            <span data-testid="text-goal-3">Identify edge cases for parser logic</span>
          </div>
          <div className="flex items-start gap-2" data-testid="wrapper-goal-4">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" data-testid="icon-goal-4" />
            <span data-testid="text-goal-4">Confirm event location and description data availability</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarPOC() {
  return (
    <ErrorBoundary data-testid="wrapper-error-boundary">
      <CalendarPOCContent />
    </ErrorBoundary>
  );
}
