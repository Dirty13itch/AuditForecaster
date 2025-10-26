import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Filter,
  X,
  ExternalLink,
  Clock
} from "lucide-react";
import { DateTime } from "luxon";
import type { CalendarImportLog, CalendarImportLogsResponse } from "@shared/schema";

export default function CalendarImportHistory() {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCalendar, setSelectedCalendar] = useState<string | undefined>();
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());
  if (selectedCalendar) {
    queryParams.append('calendarId', selectedCalendar);
  }
  if (showErrorsOnly) {
    queryParams.append('hasErrors', 'true');
  }

  const { data, isLoading, error } = useQuery<CalendarImportLogsResponse>({
    queryKey: ['/api/calendar/import-logs', currentPage, selectedCalendar, showErrorsOnly],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/import-logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    }
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Get unique calendars from all logs for filter dropdown
  const uniqueCalendars = useMemo(() => {
    const calendars = new Map<string, string>();
    logs.forEach(log => {
      if (log.calendarId) {
        calendars.set(log.calendarId, log.calendarName || log.calendarId);
      }
    });
    return Array.from(calendars.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const dt = DateTime.fromJSDate(new Date(date));
    const formatted = dt.toFormat("MMM dd, yyyy h:mm a");
    const timezone = dt.toFormat("ZZZZ");
    return `${formatted} ${timezone}`;
  };

  const formatError = (error: string | null) => {
    if (!error) return null;
    
    // Try to parse as JSON and format
    try {
      const parsed = JSON.parse(error);
      return (
        <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
          <code>{JSON.stringify(parsed, null, 2)}</code>
        </pre>
      );
    } catch {
      // Check if it looks like a stack trace
      if (error.includes('\n    at ')) {
        return (
          <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs whitespace-pre-wrap font-mono">
            {error}
          </pre>
        );
      }
      // Regular error message
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {error}
        </p>
      );
    }
  };

  const clearFilters = () => {
    setSelectedCalendar(undefined);
    setShowErrorsOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCalendar || showErrorsOnly;

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">
            Calendar Import History
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            View automated calendar import runs and their results
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading import logs: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" data-testid="skeleton-title" />
          <Skeleton className="h-4 w-96" data-testid="skeleton-description" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" data-testid="skeleton-card-title" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-row-${i}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">
            Calendar Import History
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            View automated calendar import runs and their results
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation('/calendar-review')}
          className="gap-2"
          data-testid="button-view-review-queue"
        >
          <ExternalLink className="h-4 w-4" />
          View Review Queue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="heading-card-title">
            <Calendar className="h-5 w-5" />
            Import Logs
          </CardTitle>
          <CardDescription data-testid="text-card-description">
            Most recent calendar imports with filtering and pagination
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" data-testid="text-filters-label">Filters:</span>
            </div>
            
            <div className="flex-1 min-w-[200px] max-w-xs">
              <Label htmlFor="calendar-filter" className="text-xs text-muted-foreground" data-testid="label-calendar-filter">
                Calendar
              </Label>
              <Select
                value={selectedCalendar || "all"}
                onValueChange={(value) => {
                  setSelectedCalendar(value === "all" ? undefined : value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="calendar-filter" data-testid="select-calendar-filter">
                  <SelectValue placeholder="All calendars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-calendar-all">All calendars</SelectItem>
                  {uniqueCalendars.map(({ id, name }) => (
                    <SelectItem key={id} value={id} data-testid={`option-calendar-${id}`}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="errors-only"
                checked={showErrorsOnly}
                onCheckedChange={(checked) => {
                  setShowErrorsOnly(checked === true);
                  setCurrentPage(1);
                }}
                data-testid="checkbox-errors-only"
              />
              <Label
                htmlFor="errors-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                data-testid="label-errors-only"
              >
                Show only failed imports
              </Label>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span data-testid="text-timezone-info">Times shown in local timezone</span>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-results-summary">
              Showing {logs.length > 0 ? offset + 1 : 0} - {Math.min(offset + limit, total)} of {total} logs
              {hasActiveFilters && ' (filtered)'}
            </span>
          </div>

          {/* Table */}
          {logs.length === 0 ? (
            <div className="text-center py-12 space-y-3" data-testid="container-empty-state">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-message">
                {hasActiveFilters ? 'No logs match your filters' : 'No calendar imports yet'}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-empty-hint">
                {hasActiveFilters ? 'Try adjusting your filter criteria' : 'Import logs will appear here after running calendar imports'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="heading-column-datetime">Date/Time</TableHead>
                    <TableHead data-testid="heading-column-calendar">Calendar Name</TableHead>
                    <TableHead className="text-right" data-testid="heading-column-events">
                      Events Processed
                    </TableHead>
                    <TableHead className="text-right" data-testid="heading-column-jobs">
                      Jobs Created
                    </TableHead>
                    <TableHead className="text-right" data-testid="heading-column-queued">
                      Queued for Review
                    </TableHead>
                    <TableHead className="text-center" data-testid="heading-column-status">
                      Status
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const hasErrors = log.errors && log.errors.trim().length > 0;
                    const isExpanded = expandedRows.has(log.id);

                    return (
                      <Collapsible
                        key={log.id}
                        open={hasErrors && isExpanded}
                        onOpenChange={() => hasErrors && toggleRow(log.id)}
                        asChild
                      >
                        <>
                          <TableRow
                            onClick={() => hasErrors && toggleRow(log.id)}
                            className={hasErrors ? "cursor-pointer hover-elevate" : ""}
                            data-testid={`row-import-log-${log.id}`}
                          >
                            <TableCell data-testid={`cell-datetime-${log.id}`}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{formatDate(log.importTimestamp)}</span>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-calendar-${log.id}`}>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{log.calendarName || log.calendarId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right" data-testid={`cell-events-${log.id}`}>
                              <Badge variant="secondary" data-testid={`badge-events-${log.id}`}>
                                {log.eventsProcessed || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid={`cell-jobs-${log.id}`}>
                              <Badge variant="secondary" data-testid={`badge-jobs-${log.id}`}>
                                {log.jobsCreated || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid={`cell-queued-${log.id}`}>
                              <Badge variant="secondary" data-testid={`badge-queued-${log.id}`}>
                                {log.eventsQueued || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center" data-testid={`cell-status-${log.id}`}>
                              {hasErrors ? (
                                <Badge variant="destructive" className="gap-1" data-testid={`badge-error-${log.id}`}>
                                  <AlertCircle className="h-3 w-3" />
                                  Errors
                                </Badge>
                              ) : (
                                <Badge variant="default" className="gap-1 bg-green-600" data-testid={`badge-success-${log.id}`}>
                                  <CheckCircle className="h-3 w-3" />
                                  Success
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell data-testid={`cell-expand-${log.id}`}>
                              {hasErrors && (
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-center">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 transition-transform" data-testid={`icon-collapse-${log.id}`} />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 transition-transform" data-testid={`icon-expand-${log.id}`} />
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                              )}
                            </TableCell>
                          </TableRow>
                          {hasErrors && (
                            <TableRow>
                              <TableCell colSpan={7} className="p-0">
                                <CollapsibleContent>
                                  <div
                                    className="bg-destructive/10 border-l-4 border-destructive p-4 m-2"
                                    data-testid={`container-errors-${log.id}`}
                                  >
                                    <p className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2" data-testid={`text-errors-title-${log.id}`}>
                                      <AlertCircle className="h-4 w-4" />
                                      Import Errors:
                                    </p>
                                    <div data-testid={`text-errors-content-${log.id}`}>
                                      {formatError(log.errors)}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-10"
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="min-w-10"
                      data-testid={`button-page-${totalPages}`}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
