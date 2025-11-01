import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface UnmatchedEvent {
  id: string;
  googleEventId: string;
  title: string;
  location: string | null;
  startTime: string;
  endTime: string | null;
  rawEventJson: any;
  confidenceScore: number;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface EventsResponse {
  events: UnmatchedEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface Builder {
  id: string;
  companyName: string;
}

function CalendarReviewContent() {
  const { toast } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [page, setPage] = useState(0);
  const limit = 20;
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UnmatchedEvent | null>(null);
  const [selectedBuilderId, setSelectedBuilderId] = useState<string>("");
  const [selectedInspectionType, setSelectedInspectionType] = useState<string>("");
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [maxConfidence, setMaxConfidence] = useState<number>(100);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [builderMatch, setBuilderMatch] = useState<'all' | 'matched' | 'unmatched'>('all');

  // Build query string for fetching unmatched events
  const queryParams = new URLSearchParams({
    status: selectedStatus,
    minConfidence: minConfidence.toString(),
    maxConfidence: maxConfidence.toString(),
    limit: limit.toString(),
    offset: (page * limit).toString(),
    builderMatch,
  });
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  // Fetch unmatched events
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useQuery<EventsResponse>({
    queryKey: [`/api/calendar/unmatched-events?${queryParams.toString()}`],
    retry: 2,
  });

  const events = data?.events || [];
  const pagination = data?.pagination;

  // Fetch all builders for approve dialog
  const { data: buildersData } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
    retry: 2,
  });
  
  const builders = buildersData || [];

  // Approve event mutation
  const approveMutation = useMutation({
    mutationFn: async ({ eventId, builderId, inspectionType }: { eventId: string, builderId: string, inspectionType: string }) => {
      return await apiRequest(`/api/calendar/unmatched-events/${eventId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ builderId, inspectionType }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Approved",
        description: "Job has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/unmatched-events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve event",
        variant: "destructive",
      });
    },
  });

  // Reject event mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string, reason?: string }) => {
      return await apiRequest(`/api/calendar/unmatched-events/${eventId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Rejected",
        description: "Event has been marked as rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/unmatched-events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject event",
        variant: "destructive",
      });
    },
  });

  const getConfidenceBadgeVariant = useCallback((confidence: number) => {
    if (confidence >= 80) return "default";
    if (confidence >= 60) return "secondary";
    return "destructive";
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  }, []);

  // Extract parsed data from rawEventJson
  const getParsedData = useCallback((event: UnmatchedEvent) => {
    try {
      const parsed = typeof event.rawEventJson === 'string' 
        ? JSON.parse(event.rawEventJson) 
        : event.rawEventJson;
      return {
        builderName: parsed.builderName || 'Unknown',
        inspectionType: parsed.inspectionType || 'Unknown',
      };
    } catch {
      return { builderName: 'Unknown', inspectionType: 'Unknown' };
    }
  }, []);

  const inspectionTypes = useMemo(() => [
    'Full Test',
    'SV2',
    'Pre-Drywall',
    'Final',
    'Rough',
  ], []);

  const resetFilters = useCallback(() => {
    setMinConfidence(0);
    setMaxConfidence(100);
    setStartDate("");
    setEndDate("");
    setBuilderMatch('all');
    setPage(0);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="wrapper-review-page">
      <div className="flex items-center justify-between" data-testid="section-page-header">
        <div data-testid="wrapper-header-content">
          <h1 className="text-3xl font-bold" data-testid="heading-page-title">Manual Review Queue</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-page-description">
            Review and approve calendar events that need manual verification
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Card data-testid="card-status-filter">
        <CardHeader data-testid="section-status-header">
          <CardTitle data-testid="heading-status-title">Filter by Status</CardTitle>
          <CardDescription data-testid="text-status-description">View events by their current review status</CardDescription>
        </CardHeader>
        <CardContent data-testid="section-status-content">
          <div className="flex gap-2" data-testid="wrapper-status-buttons">
            {['pending', 'approved', 'rejected'].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                onClick={() => {
                  setSelectedStatus(status);
                  setPage(0);
                }}
                data-testid={`button-filter-${status}`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Panel */}
      <Card data-testid="card-advanced-filters">
        <CardHeader data-testid="section-filters-header">
          <div className="flex items-center justify-between" data-testid="wrapper-filters-title">
            <div data-testid="wrapper-filters-text">
              <CardTitle data-testid="heading-filters-title">Advanced Filters</CardTitle>
              <CardDescription data-testid="text-filters-description">Refine your search with additional criteria</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              data-testid="button-reset-filters"
            >
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6" data-testid="section-filters-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="wrapper-filters-grid">
            {/* Confidence Score Range Slider */}
            <div className="space-y-3" data-testid="wrapper-confidence-filter">
              <Label className="text-sm font-semibold" data-testid="label-confidence-range">
                Confidence Score: {minConfidence}% - {maxConfidence}%
              </Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min-confidence" className="text-xs text-muted-foreground">
                    Minimum
                  </Label>
                  <Slider
                    id="min-confidence"
                    min={0}
                    max={100}
                    step={5}
                    value={[minConfidence]}
                    onValueChange={(value) => {
                      setMinConfidence(value[0]);
                      setPage(0);
                    }}
                    className="w-full"
                    data-testid="slider-min-confidence"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-confidence" className="text-xs text-muted-foreground">
                    Maximum
                  </Label>
                  <Slider
                    id="max-confidence"
                    min={0}
                    max={100}
                    step={5}
                    value={[maxConfidence]}
                    onValueChange={(value) => {
                      setMaxConfidence(value[0]);
                      setPage(0);
                    }}
                    className="w-full"
                    data-testid="slider-max-confidence"
                  />
                </div>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="space-y-3" data-testid="wrapper-date-filter">
              <Label className="text-sm font-semibold" data-testid="label-date-range">Event Date Range</Label>
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                    Start Date
                  </Label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(0);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                    End Date
                  </Label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(0);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>

            {/* Builder Match Filter */}
            <div className="space-y-3" data-testid="wrapper-builder-filter">
              <Label className="text-sm font-semibold" data-testid="label-builder-detection">Builder Detection</Label>
              <Select 
                value={builderMatch} 
                onValueChange={(value) => {
                  setBuilderMatch(value as 'all' | 'matched' | 'unmatched');
                  setPage(0);
                }}
              >
                <SelectTrigger data-testid="select-builder-match">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="matched">Builder Detected</SelectItem>
                  <SelectItem value="unmatched">No Builder Detected</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" data-testid="text-builder-help">
                Filter events by whether the parser detected a builder
              </p>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="flex flex-wrap gap-2 pt-2 border-t" data-testid="wrapper-active-filters">
            <span className="text-xs text-muted-foreground" data-testid="label-active-filters">Active Filters:</span>
            {minConfidence > 0 && (
              <Badge variant="secondary" className="text-xs">
                Min: {minConfidence}%
              </Badge>
            )}
            {maxConfidence < 100 && (
              <Badge variant="secondary" className="text-xs">
                Max: {maxConfidence}%
              </Badge>
            )}
            {startDate && (
              <Badge variant="secondary" className="text-xs">
                From: {new Date(startDate).toLocaleDateString()}
              </Badge>
            )}
            {endDate && (
              <Badge variant="secondary" className="text-xs">
                Until: {new Date(endDate).toLocaleDateString()}
              </Badge>
            )}
            {builderMatch !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {builderMatch === 'matched' ? 'Builder Detected' : 'No Builder Detected'}
              </Badge>
            )}
            {minConfidence === 0 && maxConfidence === 100 && !startDate && !endDate && builderMatch === 'all' && (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card data-testid="card-events-table">
        <CardHeader data-testid="section-table-header">
          <CardTitle data-testid="heading-table-title">Unmatched Events</CardTitle>
          <CardDescription data-testid="text-table-description">
            {pagination ? `Showing ${events.length} of ${pagination.total} events` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent data-testid="section-table-content">
          {isLoading && (
            <div className="space-y-3" data-testid="wrapper-loading-skeleton">
              <Skeleton className="h-12 w-full" data-testid="skeleton-row-1" />
              <Skeleton className="h-12 w-full" data-testid="skeleton-row-2" />
              <Skeleton className="h-12 w-full" data-testid="skeleton-row-3" />
              <Skeleton className="h-12 w-full" data-testid="skeleton-row-4" />
              <Skeleton className="h-12 w-full" data-testid="skeleton-row-5" />
            </div>
          )}

          {error && (
            <Alert variant="destructive" data-testid="alert-error-loading">
              <AlertCircle className="h-4 w-4" data-testid="icon-error-loading" />
              <AlertDescription className="flex items-center justify-between gap-4" data-testid="text-error-loading">
                <span data-testid="text-error-message">Error: {error instanceof Error ? error.message : 'Failed to fetch events'}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  data-testid="button-retry-fetch"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
              No {selectedStatus} events found
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="overflow-x-auto" data-testid="wrapper-table">
              <Table data-testid="table-events">
                <TableHeader data-testid="section-table-head">
                  <TableRow data-testid="row-table-headers">
                    <TableHead>Event Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Detected Builder</TableHead>
                    <TableHead>Detected Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const parsed = getParsedData(event);
                    return (
                      <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.location || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(event.startTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getConfidenceBadgeVariant(event.confidenceScore)}>
                            {event.confidenceScore}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{parsed.builderName}</TableCell>
                        <TableCell className="text-sm">{parsed.inspectionType}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(event.status)}
                            <span className="text-sm capitalize">{event.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  const parsed = getParsedData(event);
                                  setSelectedEvent(event);
                                  
                                  // Try to find builder by name from parsed data
                                  const matchedBuilder = builders.find(b => 
                                    b.companyName.toLowerCase().includes(parsed.builderName.toLowerCase()) ||
                                    parsed.builderName.toLowerCase().includes(b.companyName.toLowerCase())
                                  );
                                  
                                  setSelectedBuilderId(matchedBuilder?.id || '');
                                  setSelectedInspectionType(parsed.inspectionType !== 'Unknown' ? parsed.inspectionType : '');
                                  setApproveDialogOpen(true);
                                }}
                                data-testid={`button-approve-${event.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const confirmed = await showConfirm(
                                    'Reject Event',
                                    'Are you sure you want to reject this event? This action cannot be undone.',
                                    {
                                      confirmText: 'Reject',
                                      cancelText: 'Cancel',
                                      variant: 'destructive'
                                    }
                                  );
                                  if (confirmed) {
                                    rejectMutation.mutate({ eventId: event.id });
                                  }
                                }}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${event.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="flex items-center justify-between mt-4" data-testid="wrapper-pagination">
              <div className="text-sm text-muted-foreground" data-testid="text-page-info">
                Page {page + 1} of {Math.ceil(pagination.total / limit)}
              </div>
              <div className="flex gap-2" data-testid="wrapper-pagination-buttons">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasMore}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-approve-event">
          <DialogHeader data-testid="section-dialog-header">
            <DialogTitle data-testid="heading-dialog-title">Approve Calendar Event</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Select the builder and inspection type for this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4 py-4" data-testid="wrapper-dialog-content">
              <div className="space-y-2" data-testid="section-event-details">
                <Label className="text-sm font-semibold" data-testid="label-event-details">Event Details</Label>
                <div className="text-sm space-y-1 p-3 bg-muted rounded-md" data-testid="wrapper-event-info">
                  <div data-testid="text-event-title"><span className="font-medium">Title:</span> {selectedEvent.title}</div>
                  <div data-testid="text-event-location"><span className="font-medium">Location:</span> {selectedEvent.location || 'N/A'}</div>
                  <div data-testid="text-event-date"><span className="font-medium">Date:</span> {new Date(selectedEvent.startTime).toLocaleString()}</div>
                  <div data-testid="wrapper-event-confidence">
                    <span className="font-medium">Confidence:</span>{' '}
                    <Badge variant={getConfidenceBadgeVariant(selectedEvent.confidenceScore)} data-testid="badge-event-confidence">
                      {selectedEvent.confidenceScore}%
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2" data-testid="section-builder-select">
                <Label htmlFor="builder" data-testid="label-builder">Builder *</Label>
                <Select value={selectedBuilderId} onValueChange={setSelectedBuilderId}>
                  <SelectTrigger id="builder" data-testid="select-builder">
                    <SelectValue placeholder="Select a builder" />
                  </SelectTrigger>
                  <SelectContent>
                    {builders.map((builder) => (
                      <SelectItem key={builder.id} value={builder.id}>
                        {builder.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2" data-testid="section-inspection-select">
                <Label htmlFor="inspection-type" data-testid="label-inspection-type">Inspection Type *</Label>
                <Select value={selectedInspectionType} onValueChange={setSelectedInspectionType}>
                  <SelectTrigger id="inspection-type" data-testid="select-inspection-type">
                    <SelectValue placeholder="Select inspection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter data-testid="section-dialog-footer">
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedEvent && selectedBuilderId && selectedInspectionType) {
                  approveMutation.mutate({
                    eventId: selectedEvent.id,
                    builderId: selectedBuilderId,
                    inspectionType: selectedInspectionType,
                  });
                  setApproveDialogOpen(false);
                }
              }}
              disabled={!selectedBuilderId || !selectedInspectionType || approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="icon-loading-approve" />}
              Approve & Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}

export default function CalendarReview() {
  return (
    <ErrorBoundary data-testid="wrapper-error-boundary">
      <CalendarReviewContent />
    </ErrorBoundary>
  );
}
