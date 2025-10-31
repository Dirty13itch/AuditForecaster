import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardCardSkeleton } from '@/components/ui/skeleton-variants';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Download, RefreshCw, Eye, Filter, X, AlertCircle, Clock, User, Database } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const LOGS_PER_PAGE = 50;
const AUTO_REFRESH_INTERVAL = 30000;
const MAX_CHANGES_DISPLAY_LENGTH = 1000;
const DATE_FORMAT = 'MMM dd, yyyy HH:mm:ss';
const DETAILED_DATE_FORMAT = 'PPpp';

// Phase 6 - DOCUMENT: Interface definitions for type safety across audit log data structures
interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changesJson: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: any;
}

// Phase 6 - DOCUMENT: Filter state interface for audit log search and filtering
interface AuditLogFilters {
  action: string;
  resourceType: string;
  resourceId: string;
  startDate: string;
  endDate: string;
}

// Phase 6 - DOCUMENT: API response shape for paginated audit log data
interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

// Phase 6 - DOCUMENT: ActionBadge provides consistent visual indicators for different audit actions
// Maps action types to appropriate badge variants with semantic colors
function ActionBadge({ action }: { action: string }) {
  // Phase 3 - OPTIMIZE: useMemo prevents recalculation on every render
  const { variant, label } = useMemo(() => {
    const parts = action.split('.');
    let actionLabel = action;
    
    if (parts.length === 2) {
      const [resource, verb] = parts;
      const verbMap: Record<string, string> = {
        create: 'Created',
        update: 'Updated',
        delete: 'Deleted',
        status_changed: 'Status Changed',
        generate: 'Generated',
        login: 'Login',
        logout: 'Logout',
        export: 'Exported',
        import: 'Imported',
      };
      const resourceMap: Record<string, string> = {
        job: 'Job',
        photo: 'Photo',
        builder: 'Builder',
        report: 'Report',
        user: 'User',
        schedule: 'Schedule',
        equipment: 'Equipment',
        expense: 'Expense',
      };
      actionLabel = `${resourceMap[resource] || resource} ${verbMap[verb] || verb}`;
    }

    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = 'outline';
    if (action.includes('create')) badgeVariant = 'default';
    if (action.includes('update') || action.includes('status_changed')) badgeVariant = 'secondary';
    if (action.includes('delete')) badgeVariant = 'destructive';

    return { variant: badgeVariant, label: actionLabel };
  }, [action]);

  return (
    <Badge variant={variant} data-testid={`badge-action-${action}`}>
      {label}
    </Badge>
  );
}

// Phase 2 - BUILD: Comprehensive skeleton loading state for entire audit logs page
// Shows placeholder content while audit log data is being fetched from server
function AuditLogsSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="skeleton-audit-logs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" data-testid="skeleton-title" />
          <Skeleton className="h-4 w-80" data-testid="skeleton-subtitle" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-40" data-testid="skeleton-refresh-button" />
          <Skeleton className="h-12 w-32" data-testid="skeleton-export-button" />
        </div>
      </div>

      <DashboardCardSkeleton data-testid="skeleton-filters-card" />
      
      <Card data-testid="skeleton-table-card">
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4" data-testid={`skeleton-log-row-${i}`}>
                <Skeleton className="h-12 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Phase 2 - BUILD: Main component content extracted for ErrorBoundary wrapping
function AuditLogsContent() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: '',
    resourceType: '',
    resourceId: '',
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Phase 5 - HARDEN: Query includes retry: 2 for resilience against transient failures
  // Phase 6 - DOCUMENT: Fetches paginated audit logs with optional filters for action, resource, and date range
  const { data, isLoading, refetch, isFetching, error: fetchError } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/audit-logs', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(LOGS_PER_PAGE),
        offset: String(page * LOGS_PER_PAGE),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      
      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch audit logs');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation on every render
  // Phase 5 - HARDEN: Date validation ensures valid date ranges before export
  // Phase 6 - DOCUMENT: Exports filtered audit logs to CSV format with current filter criteria
  const handleExport = useCallback(() => {
    // Phase 5 - HARDEN: Validate date range if both dates are provided
    if (filters.startDate && filters.endDate) {
      const start = parseISO(filters.startDate);
      const end = parseISO(filters.endDate);
      
      if (!isValid(start) || !isValid(end)) {
        toast({
          title: "Invalid Date Range",
          description: "Please provide valid start and end dates",
          variant: "destructive",
        });
        return;
      }

      if (start > end) {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before end date",
          variant: "destructive",
        });
        return;
      }
    }

    const params = new URLSearchParams({
      ...(filters.action && { action: filters.action }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
    });
    
    window.location.href = `/api/audit-logs/export?${params}`;
    
    toast({
      title: "Exporting Audit Logs",
      description: "Your CSV download will begin shortly",
    });
  }, [filters, toast]);

  // Phase 3 - OPTIMIZE: useCallback for filter operations
  // Phase 6 - DOCUMENT: Resets all filter criteria and returns to first page
  const handleClearFilters = useCallback(() => {
    setFilters({
      action: '',
      resourceType: '',
      resourceId: '',
      startDate: '',
      endDate: '',
    });
    setPage(0);
    
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset",
    });
  }, [toast]);

  // Phase 3 - OPTIMIZE: useCallback for apply filters action
  // Phase 5 - HARDEN: Validates date range before applying filters
  // Phase 6 - DOCUMENT: Applies current filter criteria and refetches data from server
  const handleApplyFilters = useCallback(() => {
    // Phase 5 - HARDEN: Validate date range before applying
    if (filters.startDate && filters.endDate) {
      const start = parseISO(filters.startDate);
      const end = parseISO(filters.endDate);
      
      if (!isValid(start) || !isValid(end)) {
        toast({
          title: "Invalid Date Range",
          description: "Please provide valid start and end dates",
          variant: "destructive",
        });
        return;
      }

      if (start > end) {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before end date",
          variant: "destructive",
        });
        return;
      }
    }

    setPage(0);
    refetch();
    
    toast({
      title: "Filters Applied",
      description: "Fetching filtered audit logs...",
    });
  }, [filters, refetch, toast]);

  // Phase 3 - OPTIMIZE: useCallback for auto-refresh toggle
  // Phase 6 - DOCUMENT: Toggles automatic refresh of audit logs every 30 seconds
  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
    
    toast({
      title: autoRefresh ? "Auto-refresh Disabled" : "Auto-refresh Enabled",
      description: autoRefresh 
        ? "Logs will no longer refresh automatically" 
        : "Logs will refresh every 30 seconds",
    });
  }, [autoRefresh, toast]);

  // Phase 3 - OPTIMIZE: useCallback for manual refresh
  // Phase 6 - DOCUMENT: Manually triggers refetch of audit log data
  const handleManualRefresh = useCallback(() => {
    refetch();
    toast({
      title: "Refreshing Audit Logs",
      description: "Fetching latest data...",
    });
  }, [refetch, toast]);

  // Phase 3 - OPTIMIZE: useCallback for log detail view
  // Phase 6 - DOCUMENT: Opens detailed view modal for selected audit log entry
  const handleViewDetails = useCallback((log: AuditLog, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedLog(log);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for closing detail modal
  // Phase 6 - DOCUMENT: Closes the audit log detail modal
  const handleCloseDetails = useCallback(() => {
    setSelectedLog(null);
  }, []);

  // Phase 3 - OPTIMIZE: useMemo for computed total pages
  // Phase 6 - DOCUMENT: Calculates total number of pages based on log count and page size
  const totalPages = useMemo(() => {
    return data ? Math.ceil(data.total / LOGS_PER_PAGE) : 0;
  }, [data]);

  // Phase 3 - OPTIMIZE: useMemo to check if any filters are active
  // Phase 6 - DOCUMENT: Determines if user has applied any filter criteria
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.action ||
      filters.resourceType ||
      filters.startDate ||
      filters.endDate
    );
  }, [filters]);

  // Phase 3 - OPTIMIZE: useMemo for pagination display text
  // Phase 6 - DOCUMENT: Generates human-readable pagination status text
  const paginationText = useMemo(() => {
    if (!data || data.total === 0) return 'No logs to display';
    
    const start = page * LOGS_PER_PAGE + 1;
    const end = Math.min((page + 1) * LOGS_PER_PAGE, data.total);
    return `Showing ${start} - ${end} of ${data.total} logs`;
  }, [data, page]);

  // Phase 3 - OPTIMIZE: useMemo for truncated changes JSON display
  // Phase 6 - DOCUMENT: Safely stringifies and truncates changes for display in detail modal
  const formatChangesJson = useCallback((changes: any): string => {
    if (!changes) return 'No changes recorded';
    
    try {
      const jsonString = JSON.stringify(changes, null, 2);
      if (jsonString.length > MAX_CHANGES_DISPLAY_LENGTH) {
        return jsonString.substring(0, MAX_CHANGES_DISPLAY_LENGTH) + '\n... (truncated)';
      }
      return jsonString;
    } catch (error) {
      return 'Error formatting changes data';
    }
  }, []);

  // Phase 2 - BUILD: Enhanced loading skeleton state
  if (isLoading && !data) {
    return <AuditLogsSkeleton />;
  }

  // Phase 2 - BUILD: Enhanced error state with retry capability
  // Phase 5 - HARDEN: Comprehensive error handling with user-friendly messaging
  if (!data && fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" data-testid="container-error">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" data-testid="icon-error" />
              Error Loading Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground" data-testid="text-error-message">
              {fetchError instanceof Error 
                ? fetchError.message 
                : "Failed to load audit logs. This may indicate a server connectivity issue."}
            </p>
            <Button onClick={handleManualRefresh} data-testid="button-retry" disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Retrying...' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="container-audit-logs">
      {/* Phase 6 - DOCUMENT: Page header with audit log title and primary actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Database className="h-8 w-8" data-testid="icon-page-title" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Complete audit trail of all system operations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="default"
            onClick={handleToggleAutoRefresh}
            data-testid="button-toggle-auto-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh && isFetching ? 'animate-spin' : ''}`} data-testid="icon-auto-refresh" />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={handleManualRefresh}
            disabled={isFetching}
            data-testid="button-manual-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} data-testid="icon-manual-refresh" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <Download className="mr-2 h-4 w-4" data-testid="icon-export" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Phase 6 - DOCUMENT: Filter controls card for searching and filtering audit logs */}
      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" data-testid="icon-filters" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" data-testid="badge-filters-active">
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription data-testid="text-filters-description">
            Filter audit logs by action, resource type, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-action" data-testid="label-action-filter">
                Action
              </label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger id="filter-action" data-testid="select-action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-action">
                  <SelectItem value="" data-testid="option-action-all">All actions</SelectItem>
                  <SelectItem value="job.create" data-testid="option-action-job-create">Job Created</SelectItem>
                  <SelectItem value="job.update" data-testid="option-action-job-update">Job Updated</SelectItem>
                  <SelectItem value="job.delete" data-testid="option-action-job-delete">Job Deleted</SelectItem>
                  <SelectItem value="job.status_changed" data-testid="option-action-job-status">Job Status Changed</SelectItem>
                  <SelectItem value="photo.delete" data-testid="option-action-photo-delete">Photo Deleted</SelectItem>
                  <SelectItem value="builder.create" data-testid="option-action-builder-create">Builder Created</SelectItem>
                  <SelectItem value="builder.update" data-testid="option-action-builder-update">Builder Updated</SelectItem>
                  <SelectItem value="builder.delete" data-testid="option-action-builder-delete">Builder Deleted</SelectItem>
                  <SelectItem value="report.generate" data-testid="option-action-report-generate">Report Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-resource" data-testid="label-resource-filter">
                Resource Type
              </label>
              <Select
                value={filters.resourceType}
                onValueChange={(value) => setFilters({ ...filters, resourceType: value })}
              >
                <SelectTrigger id="filter-resource" data-testid="select-resource-filter">
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-resource">
                  <SelectItem value="" data-testid="option-resource-all">All resources</SelectItem>
                  <SelectItem value="job" data-testid="option-resource-job">Job</SelectItem>
                  <SelectItem value="photo" data-testid="option-resource-photo">Photo</SelectItem>
                  <SelectItem value="builder" data-testid="option-resource-builder">Builder</SelectItem>
                  <SelectItem value="report" data-testid="option-resource-report">Report</SelectItem>
                  <SelectItem value="user" data-testid="option-resource-user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-start-date" data-testid="label-start-date">
                Start Date
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="filter-end-date" data-testid="label-end-date">
                End Date
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="default"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              data-testid="button-clear-filters"
            >
              <X className="mr-2 h-4 w-4" data-testid="icon-clear-filters" />
              Clear Filters
            </Button>
            <Button
              size="default"
              onClick={handleApplyFilters}
              data-testid="button-apply-filters"
            >
              <Filter className="mr-2 h-4 w-4" data-testid="icon-apply-filters" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phase 6 - DOCUMENT: Main audit logs table with pagination */}
      <Card data-testid="card-logs-table">
        <CardContent className="p-0">
          {isFetching && !isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="container-refreshing">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" data-testid="icon-refreshing" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table data-testid="table-audit-logs">
                  <TableHeader>
                    <TableRow data-testid="row-table-header">
                      <TableHead data-testid="header-timestamp">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Timestamp
                        </div>
                      </TableHead>
                      <TableHead data-testid="header-action">Action</TableHead>
                      <TableHead data-testid="header-resource">Resource</TableHead>
                      <TableHead data-testid="header-resource-id">Resource ID</TableHead>
                      <TableHead data-testid="header-user">User ID</TableHead>
                      <TableHead data-testid="header-ip">IP Address</TableHead>
                      <TableHead className="text-right" data-testid="header-actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs && data.logs.length > 0 ? (
                      data.logs.map((log) => (
                        <TableRow 
                          key={log.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleViewDetails(log)}
                          data-testid={`row-audit-log-${log.id}`}
                        >
                          <TableCell className="font-medium" data-testid={`cell-timestamp-${log.id}`}>
                            {format(new Date(log.timestamp), DATE_FORMAT)}
                          </TableCell>
                          <TableCell data-testid={`cell-action-${log.id}`}>
                            <ActionBadge action={log.action} />
                          </TableCell>
                          <TableCell data-testid={`cell-resource-${log.id}`}>
                            <Badge variant="outline">{log.resourceType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`cell-resource-id-${log.id}`}>
                            {log.resourceId ? (
                              <code className="text-xs">{log.resourceId.slice(0, 8)}...</code>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`cell-user-id-${log.id}`}>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.userId ? (
                                <code className="text-xs">{log.userId.slice(0, 8)}...</code>
                              ) : (
                                'System'
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`cell-ip-${log.id}`}>
                            {log.ipAddress || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`cell-actions-${log.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleViewDetails(log, e)}
                              data-testid={`button-view-details-${log.id}`}
                            >
                              <Eye className="h-4 w-4" data-testid={`icon-view-${log.id}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow data-testid="row-no-logs">
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground" data-testid="cell-no-logs">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8" data-testid="icon-no-logs" />
                            <p data-testid="text-no-logs">No audit logs found</p>
                            {hasActiveFilters && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                                data-testid="button-clear-filters-empty"
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Phase 6 - DOCUMENT: Pagination controls for navigating through audit log pages */}
              {data && data.total > LOGS_PER_PAGE && (
                <div className="flex items-center justify-between border-t p-4" data-testid="container-pagination">
                  <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    {paginationText}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      data-testid="button-previous-page"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-4" data-testid="container-page-indicator">
                      <span className="text-sm text-muted-foreground" data-testid="text-current-page">
                        Page {page + 1} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Phase 6 - DOCUMENT: Detail modal displays comprehensive information for selected audit log */}
      <Dialog open={!!selectedLog} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-log-details">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Audit Log Details</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4" data-testid="container-log-details">
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="section-timestamp">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-timestamp">
                    Timestamp
                  </p>
                  <p className="text-sm flex items-center gap-2" data-testid="value-timestamp">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedLog.timestamp), DETAILED_DATE_FORMAT)}
                  </p>
                </div>
                <div data-testid="section-action">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-action">
                    Action
                  </p>
                  <div data-testid="value-action">
                    <ActionBadge action={selectedLog.action} />
                  </div>
                </div>
                <div data-testid="section-resource-type">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-resource-type">
                    Resource Type
                  </p>
                  <Badge variant="outline" data-testid="value-resource-type">
                    {selectedLog.resourceType}
                  </Badge>
                </div>
                <div data-testid="section-resource-id">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-resource-id">
                    Resource ID
                  </p>
                  <p className="text-sm font-mono break-all" data-testid="value-resource-id">
                    {selectedLog.resourceId || 'N/A'}
                  </p>
                </div>
                <div data-testid="section-user-id">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-user-id">
                    User ID
                  </p>
                  <p className="text-sm font-mono break-all flex items-center gap-2" data-testid="value-user-id">
                    <User className="h-4 w-4" />
                    {selectedLog.userId || 'System'}
                  </p>
                </div>
                <div data-testid="section-ip-address">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-ip-address">
                    IP Address
                  </p>
                  <p className="text-sm" data-testid="value-ip-address">
                    {selectedLog.ipAddress || 'N/A'}
                  </p>
                </div>
              </div>

              {selectedLog.changesJson && (
                <div data-testid="section-changes">
                  <p className="text-sm font-medium text-muted-foreground mb-2" data-testid="label-changes">
                    Changes
                  </p>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-x-auto" data-testid="value-changes">
                        {formatChangesJson(selectedLog.changesJson)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedLog.metadata && (
                <div data-testid="section-metadata">
                  <p className="text-sm font-medium text-muted-foreground mb-2" data-testid="label-metadata">
                    Metadata
                  </p>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-x-auto" data-testid="value-metadata">
                        {formatChangesJson(selectedLog.metadata)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedLog.userAgent && (
                <div data-testid="section-user-agent">
                  <p className="text-sm font-medium text-muted-foreground" data-testid="label-user-agent">
                    User Agent
                  </p>
                  <p className="text-xs text-muted-foreground break-all" data-testid="value-user-agent">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper provides crash protection for entire page
// Catches and displays errors gracefully instead of crashing the application
export default function AuditLogs() {
  return (
    <ErrorBoundary>
      <AuditLogsContent />
    </ErrorBoundary>
  );
}
