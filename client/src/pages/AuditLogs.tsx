import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, RefreshCw, Eye } from 'lucide-react';
import { format } from 'date-fns';

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

export default function AuditLogs() {
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    resourceId: '',
    startDate: '',
    endDate: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch audit logs with filters
  const { data, isLoading, refetch } = useQuery<{ logs: AuditLog[], total: number }>({
    queryKey: ['/api/audit-logs', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      
      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Export to CSV
  const handleExport = async () => {
    const params = new URLSearchParams({
      ...(filters.action && { action: filters.action }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
    });
    
    window.location.href = `/api/audit-logs/export?${params}`;
  };

  // Format action for display
  const formatAction = (action: string): string => {
    const parts = action.split('.');
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
      };
      const resourceMap: Record<string, string> = {
        job: 'Job',
        photo: 'Photo',
        builder: 'Builder',
        report: 'Report',
        user: 'User',
        schedule: 'Schedule',
      };
      return `${resourceMap[resource] || resource} ${verbMap[verb] || verb}`;
    }
    return action;
  };

  // Get action color variant
  const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('create')) return 'default'; // Green tones
    if (action.includes('update') || action.includes('status_changed')) return 'secondary'; // Blue tones
    if (action.includes('delete')) return 'destructive'; // Red tones
    return 'outline';
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all system operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-toggle-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value })}
              >
                <SelectTrigger data-testid="select-action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="job.create">Job Created</SelectItem>
                  <SelectItem value="job.update">Job Updated</SelectItem>
                  <SelectItem value="job.delete">Job Deleted</SelectItem>
                  <SelectItem value="job.status_changed">Job Status Changed</SelectItem>
                  <SelectItem value="photo.delete">Photo Deleted</SelectItem>
                  <SelectItem value="builder.create">Builder Created</SelectItem>
                  <SelectItem value="builder.update">Builder Updated</SelectItem>
                  <SelectItem value="builder.delete">Builder Deleted</SelectItem>
                  <SelectItem value="report.generate">Report Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select
                value={filters.resourceType}
                onValueChange={(value) => setFilters({ ...filters, resourceType: value })}
              >
                <SelectTrigger data-testid="select-resource-filter">
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All resources</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                setFilters({
                  action: '',
                  resourceType: '',
                  resourceId: '',
                  startDate: '',
                  endDate: '',
                });
                setPage(0);
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
            <Button
              size="default"
              onClick={() => {
                setPage(0);
                refetch();
              }}
              data-testid="button-apply-filters"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs && data.logs.length > 0 ? (
                      data.logs.map((log) => (
                        <TableRow 
                          key={log.id}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedLog(log)}
                          data-testid={`row-audit-log-${log.id}`}
                        >
                          <TableCell className="font-medium">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionVariant(log.action)}>
                              {formatAction(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.resourceType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.resourceId ? (
                              <code className="text-xs">{log.resourceId.slice(0, 8)}...</code>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.ipAddress || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              data-testid={`button-view-details-${log.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {data && data.total > limit && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.total)} of {data.total} logs
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

      {/* Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action</p>
                  <Badge variant={getActionVariant(selectedLog.action)}>
                    {formatAction(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource Type</p>
                  <Badge variant="outline">{selectedLog.resourceType}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                  <p className="text-sm font-mono">{selectedLog.resourceId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono">{selectedLog.userId || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                  <p className="text-sm">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.changesJson && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Changes</p>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.changesJson, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
