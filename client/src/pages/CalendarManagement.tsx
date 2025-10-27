import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  RefreshCw,
  User,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth, type UserRole } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import type { Builder, InsertBuilder } from "@shared/schema";

interface PendingEvent {
  id: string;
  googleEventId: string;
  rawTitle: string;
  parsedBuilderName: string | null;
  matchedBuilderId: string | null;
  confidenceScore: number;
  parsedJobType: string | null;
  eventDate: string;
  status: 'pending' | 'assigned' | 'rejected' | 'duplicate';
  assignedInspectorId: string | null;
  assignedJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WeeklyWorkloadData {
  date: string;
  shaun: number;
  erik: number;
  unassigned: number;
}

interface AssignmentPayload {
  inspectorId: string;
  inspectorName: string;
}

interface BulkAssignmentPayload {
  eventIds: string[];
  inspectorId: string;
  inspectorName: string;
}

export default function CalendarManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const userRole = (user?.role as UserRole) || 'inspector';

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isQuickAddBuilderOpen, setIsQuickAddBuilderOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [bulkActionConfirmOpen, setBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'shaun' | 'erik' | 'reject' | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [builderFilter, setBuilderFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && userRole !== 'admin') {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to administrators.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [userRole, authLoading, navigate, toast]);

  // Fetch pending events with filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (builderFilter === 'unmatched') {
      params.append('unmatched', 'true');
    } else if (builderFilter !== 'all') {
      params.append('builderId', builderFilter);
    }
    if (jobTypeFilter !== 'all') params.append('jobType', jobTypeFilter);
    if (confidenceFilter !== 'all') {
      switch (confidenceFilter) {
        case 'high':
          params.append('minConfidence', '85');
          break;
        case 'medium':
          params.append('minConfidence', '60');
          params.append('maxConfidence', '85');
          break;
        case 'low':
          params.append('maxConfidence', '60');
          params.append('minConfidence', '1');
          break;
        case 'unmatched':
          params.append('maxConfidence', '0');
          break;
      }
    }
    if (dateRangeStart) params.append('startDate', dateRangeStart);
    if (dateRangeEnd) params.append('endDate', dateRangeEnd);
    if (sortBy) params.append('sort', sortBy);
    return params.toString();
  };

  const { data: pendingEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<PendingEvent[]>({
    queryKey: ['/api/pending-events', buildQueryString()],
    refetchInterval: 120000, // 2 minutes
  });

  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
  });

  const weekStart = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const { data: weeklyWorkload = [] } = useQuery<WeeklyWorkloadData[]>({
    queryKey: ['/api/weekly-workload', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
  });

  // Sync now mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/calendar/sync-now');
      return res.json();
    },
    onSuccess: () => {
      setLastSyncTime(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-workload'] });
      toast({
        title: "Sync Complete",
        description: "Calendar events have been synchronized.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync calendar events",
        variant: "destructive",
      });
    },
  });

  // Assign event mutation
  const assignMutation = useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: AssignmentPayload }) => {
      const res = await apiRequest('POST', `/api/pending-events/${eventId}/assign`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-workload'] });
      setIsAssignmentModalOpen(false);
      setSelectedEvent(null);
      toast({
        title: "Event Assigned",
        description: "The event has been successfully assigned.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign event",
        variant: "destructive",
      });
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (payload: BulkAssignmentPayload) => {
      const res = await apiRequest('POST', '/api/pending-events/bulk-assign', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-workload'] });
      setSelectedEventIds(new Set());
      toast({
        title: "Bulk Assignment Complete",
        description: `${selectedEventIds.size} event(s) have been assigned.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Assignment Failed",
        description: error.message || "Failed to assign events",
        variant: "destructive",
      });
    },
  });

  // Create builder and assign mutation
  const createBuilderAndAssignMutation = useMutation({
    mutationFn: async ({ builderData, eventId, inspectorId, inspectorName }: {
      builderData: InsertBuilder;
      eventId: string;
      inspectorId: string;
      inspectorName: string;
    }) => {
      const builderRes = await apiRequest('POST', '/api/builders', builderData);
      const builder = await builderRes.json();
      
      const assignRes = await apiRequest('POST', `/api/pending-events/${eventId}/assign`, {
        inspectorId,
        inspectorName,
      });
      return assignRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/builders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-workload'] });
      setIsQuickAddBuilderOpen(false);
      setIsAssignmentModalOpen(false);
      setSelectedEvent(null);
      toast({
        title: "Builder Created & Event Assigned",
        description: "The builder has been created and the event assigned successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Operation Failed",
        description: error.message || "Failed to create builder and assign event",
        variant: "destructive",
      });
    },
  });

  // Sync on mount
  useEffect(() => {
    syncMutation.mutate();
  }, []);

  const handleSyncNow = () => {
    syncMutation.mutate();
  };

  const handleAssignToInspector = (eventId: string, inspectorId: string, inspectorName: string) => {
    assignMutation.mutate({
      eventId,
      payload: { inspectorId, inspectorName },
    });
  };

  const handleBulkAssign = () => {
    if (!bulkActionType) return;

    let inspectorId = '';
    let inspectorName = '';

    if (bulkActionType === 'shaun') {
      inspectorId = 'shaun-id';
      inspectorName = 'Shaun';
    } else if (bulkActionType === 'erik') {
      inspectorId = 'erik-id';
      inspectorName = 'Erik';
    }

    if (bulkActionType === 'reject') {
      toast({
        title: "Feature Coming Soon",
        description: "Bulk reject functionality will be available soon.",
      });
      setBulkActionConfirmOpen(false);
      return;
    }

    bulkAssignMutation.mutate({
      eventIds: Array.from(selectedEventIds),
      inspectorId,
      inspectorName,
    });
    setBulkActionConfirmOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(pendingEvents.filter(e => e.status === 'pending').map(e => e.id));
      setSelectedEventIds(allIds);
    } else {
      setSelectedEventIds(new Set());
    }
  };

  const handleSelectEvent = (eventId: string, checked: boolean) => {
    const newSelected = new Set(selectedEventIds);
    if (checked) {
      newSelected.add(eventId);
    } else {
      newSelected.delete(eventId);
    }
    setSelectedEventIds(newSelected);
  };

  const getConfidenceBadge = (score: number, matched: boolean) => {
    if (!matched || score === 0) {
      return <Badge variant="secondary" data-testid={`badge-confidence-unmatched`}>Unmatched</Badge>;
    }
    if (score > 85) {
      return <Badge className="bg-green-600 hover:bg-green-700" data-testid={`badge-confidence-high`}>High ({score}%)</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-600 hover:bg-yellow-700" data-testid={`badge-confidence-medium`}>Medium ({score}%)</Badge>;
    }
    return <Badge className="bg-red-600 hover:bg-red-700" data-testid={`badge-confidence-low`}>Low ({score}%)</Badge>;
  };

  const getWorkloadColor = (count: number) => {
    if (count > 6) return '#dc2626'; // red
    if (count >= 4) return '#eab308'; // yellow
    return '#16a34a'; // green
  };

  if (authLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  const pendingCount = pendingEvents.filter(e => e.status === 'pending').length;
  const assignedCount = pendingEvents.filter(e => e.status === 'assigned').length;
  const rejectedCount = pendingEvents.filter(e => e.status === 'rejected').length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              Calendar Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Process and assign calendar events to inspectors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncTime && (
            <span className="text-sm text-muted-foreground" data-testid="text-last-sync">
              Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
            </span>
          )}
          <Button
            onClick={handleSyncNow}
            disabled={syncMutation.isPending}
            data-testid="button-sync-now"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-assigned">{assignedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-rejected">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Week Overview Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Workload Overview</CardTitle>
          <CardDescription>Jobs per day for the next week</CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyWorkload.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyWorkload}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'EEE MM/dd')} />
                <YAxis />
                <Tooltip labelFormatter={(date) => format(new Date(date), 'EEEE, MMMM dd, yyyy')} />
                <Legend />
                <Bar dataKey="shaun" name="Shaun" fill="#2E5BBA">
                  {weeklyWorkload.map((entry, index) => (
                    <Cell key={`cell-shaun-${index}`} fill={getWorkloadColor(entry.shaun)} />
                  ))}
                </Bar>
                <Bar dataKey="erik" name="Erik" fill="#28A745">
                  {weeklyWorkload.map((entry, index) => (
                    <Cell key={`cell-erik-${index}`} fill={getWorkloadColor(entry.erik)} />
                  ))}
                </Bar>
                <Bar dataKey="unassigned" name="Unassigned" fill="#6C757D" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No workload data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="builder-filter">Builder</Label>
              <Select value={builderFilter} onValueChange={setBuilderFilter}>
                <SelectTrigger id="builder-filter" data-testid="select-filter-builder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  <SelectItem value="unmatched">Unmatched Only</SelectItem>
                  {builders.map((builder) => (
                    <SelectItem key={builder.id} value={builder.id}>
                      {builder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="job-type-filter">Job Type</Label>
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger id="job-type-filter" data-testid="select-filter-job-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pre-drywall">Pre-drywall</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="multifamily">Multifamily</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="confidence-filter">Confidence</Label>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger id="confidence-filter" data-testid="select-filter-confidence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High (&gt;85%)</SelectItem>
                  <SelectItem value="medium">Medium (60-85%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                  <SelectItem value="unmatched">Unmatched (0%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-start">Start Date</Label>
              <Input
                id="date-start"
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                data-testid="input-date-start"
              />
            </div>

            <div>
              <Label htmlFor="date-end">End Date</Label>
              <Input
                id="date-end"
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                data-testid="input-date-end"
              />
            </div>

            <div>
              <Label htmlFor="sort-by">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by" data-testid="select-sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="createdAt">Import Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Events ({pendingEvents.length})</CardTitle>
          <CardDescription>Click a row to view details and assign</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEventIds.size > 0 && selectedEventIds.size === pendingEvents.filter(e => e.status === 'pending').length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Builder</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsAssignmentModalOpen(true);
                      }}
                      data-testid={`row-pending-event-${event.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedEventIds.has(event.id)}
                          onCheckedChange={(checked) => handleSelectEvent(event.id, checked as boolean)}
                          disabled={event.status !== 'pending'}
                          data-testid={`checkbox-event-${event.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{event.rawTitle}</TableCell>
                      <TableCell>{format(new Date(event.eventDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {event.parsedBuilderName || 'Unknown'}
                          {getConfidenceBadge(event.confidenceScore, !!event.matchedBuilderId)}
                        </div>
                      </TableCell>
                      <TableCell>{event.parsedJobType || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={event.status === 'pending' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {event.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAssignToInspector(event.id, 'shaun-id', 'Shaun')}
                              disabled={assignMutation.isPending}
                              data-testid={`button-assign-shaun-${event.id}`}
                            >
                              <User className="h-3 w-3 mr-1" />
                              Shaun
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignToInspector(event.id, 'erik-id', 'Erik')}
                              disabled={assignMutation.isPending}
                              data-testid={`button-assign-erik-${event.id}`}
                            >
                              <User className="h-3 w-3 mr-1" />
                              Erik
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedEventIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {selectedEventIds.size} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkActionType('shaun');
                      setBulkActionConfirmOpen(true);
                    }}
                    data-testid="button-bulk-assign-shaun"
                  >
                    Assign to Shaun
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBulkActionType('erik');
                      setBulkActionConfirmOpen(true);
                    }}
                    data-testid="button-bulk-assign-erik"
                  >
                    Assign to Erik
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setBulkActionType('reject');
                      setBulkActionConfirmOpen(true);
                    }}
                    data-testid="button-bulk-reject"
                  >
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEventIds(new Set())}
                    data-testid="button-bulk-cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment Modal */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-assignment">
          <DialogHeader>
            <DialogTitle>Assign Event</DialogTitle>
            <DialogDescription>Review event details and assign to an inspector</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Raw Title</Label>
                <p className="text-lg font-medium" data-testid="text-event-title">{selectedEvent.rawTitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Parsed Builder</Label>
                  <div className="flex items-center gap-2">
                    {selectedEvent.parsedBuilderName ? (
                      <p data-testid="text-builder-name">{selectedEvent.parsedBuilderName}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-warning" data-testid="text-unknown-builder">Unknown builder</span>
                      </div>
                    )}
                    {getConfidenceBadge(selectedEvent.confidenceScore, !!selectedEvent.matchedBuilderId)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Event Date</Label>
                  <p data-testid="text-event-date">{format(new Date(selectedEvent.eventDate), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Job Type</Label>
                  <p data-testid="text-job-type">{selectedEvent.parsedJobType || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Confidence Score</Label>
                  <p data-testid="text-confidence-score">{selectedEvent.confidenceScore}%</p>
                </div>
              </div>

              {!selectedEvent.matchedBuilderId && selectedEvent.parsedBuilderName && (
                <div className="p-4 border border-warning rounded-md bg-warning/10">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">Builder not found in database</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsQuickAddBuilderOpen(true)}
                        data-testid="button-quick-add-builder"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Quick Add Builder
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Workload Comparison</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Shaun</p>
                      <p className="text-2xl font-bold" data-testid="text-shaun-workload">
                        {weeklyWorkload.find(w => w.date === format(new Date(selectedEvent.eventDate), 'yyyy-MM-dd'))?.shaun || 0} jobs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Erik</p>
                      <p className="text-2xl font-bold" data-testid="text-erik-workload">
                        {weeklyWorkload.find(w => w.date === format(new Date(selectedEvent.eventDate), 'yyyy-MM-dd'))?.erik || 0} jobs
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignmentModalOpen(false)}
              data-testid="button-cancel-assignment"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast({ title: "Feature Coming Soon", description: "Reject functionality will be available soon." });
              }}
              data-testid="button-reject-event"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedEvent && handleAssignToInspector(selectedEvent.id, 'erik-id', 'Erik')}
              disabled={assignMutation.isPending}
              data-testid="button-assign-erik-modal"
            >
              <User className="h-4 w-4 mr-2" />
              Assign to Erik
            </Button>
            <Button
              onClick={() => selectedEvent && handleAssignToInspector(selectedEvent.id, 'shaun-id', 'Shaun')}
              disabled={assignMutation.isPending}
              data-testid="button-assign-shaun-modal"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Assign to Shaun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Builder Modal */}
      <Dialog open={isQuickAddBuilderOpen} onOpenChange={setIsQuickAddBuilderOpen}>
        <DialogContent data-testid="dialog-quick-add-builder">
          <DialogHeader>
            <DialogTitle>Quick Add Builder</DialogTitle>
            <DialogDescription>Create a new builder and assign this event</DialogDescription>
          </DialogHeader>
          <QuickAddBuilderForm
            initialName={selectedEvent?.parsedBuilderName || ''}
            onSubmit={(builderData, assignTo) => {
              if (!selectedEvent) return;
              const inspectorId = assignTo === 'shaun' ? 'shaun-id' : 'erik-id';
              const inspectorName = assignTo === 'shaun' ? 'Shaun' : 'Erik';
              createBuilderAndAssignMutation.mutate({
                builderData,
                eventId: selectedEvent.id,
                inspectorId,
                inspectorName,
              });
            }}
            onCancel={() => setIsQuickAddBuilderOpen(false)}
            isLoading={createBuilderAndAssignMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation */}
      <AlertDialog open={bulkActionConfirmOpen} onOpenChange={setBulkActionConfirmOpen}>
        <AlertDialogContent data-testid="dialog-bulk-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionType === 'shaun' && `Assign ${selectedEventIds.size} event(s) to Shaun?`}
              {bulkActionType === 'erik' && `Assign ${selectedEventIds.size} event(s) to Erik?`}
              {bulkActionType === 'reject' && `Reject ${selectedEventIds.size} event(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-bulk-confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAssign} data-testid="button-bulk-confirm-yes">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface QuickAddBuilderFormProps {
  initialName: string;
  onSubmit: (data: InsertBuilder, assignTo: 'shaun' | 'erik') => void;
  onCancel: () => void;
  isLoading: boolean;
}

function QuickAddBuilderForm({ initialName, onSubmit, onCancel, isLoading }: QuickAddBuilderFormProps) {
  const [name, setName] = useState(initialName);
  const [companyName, setCompanyName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [abbreviations, setAbbreviations] = useState('');

  const handleSubmit = (assignTo: 'shaun' | 'erik') => {
    const builderData: InsertBuilder = {
      name,
      companyName,
      email: email || undefined,
      phone: phone || undefined,
      abbreviations: abbreviations ? abbreviations.split(',').map(a => a.trim()) : undefined,
    };
    onSubmit(builderData, assignTo);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="builder-name">Builder Name*</Label>
        <Input
          id="builder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-testid="input-builder-name"
        />
      </div>
      <div>
        <Label htmlFor="company-name">Company Name*</Label>
        <Input
          id="company-name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          data-testid="input-company-name"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="input-email"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-testid="input-phone"
        />
      </div>
      <div>
        <Label htmlFor="abbreviations">Abbreviations (comma-separated)</Label>
        <Input
          id="abbreviations"
          value={abbreviations}
          onChange={(e) => setAbbreviations(e.target.value)}
          placeholder="e.g., MI, MIH, M/I"
          data-testid="input-abbreviations"
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
          data-testid="button-quick-add-cancel"
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit('erik')}
          disabled={isLoading || !name || !companyName}
          className="flex-1"
          data-testid="button-create-assign-erik"
        >
          Create & Assign to Erik
        </Button>
        <Button
          onClick={() => handleSubmit('shaun')}
          disabled={isLoading || !name || !companyName}
          className="flex-1"
          data-testid="button-create-assign-shaun"
        >
          Create & Assign to Shaun
        </Button>
      </div>
    </div>
  );
}
