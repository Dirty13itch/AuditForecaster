import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as BigCalendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, endOfWeek, getDay, addMonths, subMonths, addWeeks, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, addHours } from "date-fns";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Calendar, ChevronLeft, ChevronRight, Search, Cloud, CloudOff, AlertCircle, Loader2, Users, Activity, TrendingUp, BarChart3, Wind, Wrench, RotateCcw, AlertTriangle, Building2, Star, FileText, Check, CheckCheck, X, RotateCw, RefreshCw, ChevronDown, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ConvertGoogleEventDialog } from "@/components/ConvertGoogleEventDialog";
import { UnassignedQueue } from "@/components/UnassignedQueue";
import { UnassignedQueueSheet } from "@/components/UnassignedQueueSheet";
import JobWizard from "@/components/JobWizard";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Job, ScheduleEvent, GoogleEvent, PendingCalendarEvent, User } from "@shared/schema";
import { getInspectorColor, getJobTypeVisuals, getCalendarEventStyle, getCompletionStatus } from "@shared/calendarVisualSystem";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {},
});

const JOB_DRAG_TYPE = 'job';

interface CalendarEvent extends Event {
  id: string;
  jobId: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    scheduleEventId?: string;
    status?: string;
    job?: Job;
    googleEventId?: string | null;
    eventType?: 'app' | 'google';
    googleEvent?: GoogleEvent;
  };
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'Search': Search,
    'BarChart3': BarChart3,
    'Wind': Wind,
    'Wrench': Wrench,
    'RotateCcw': RotateCcw,
    'AlertTriangle': AlertTriangle,
    'Building2': Building2,
    'Star': Star,
    'FileText': FileText,
    'Calendar': Calendar,
    'RotateCw': RotateCw,
    'Check': Check,
    'CheckCheck': CheckCheck,
    'X': X,
  };
  return iconMap[iconName] || FileText;
};

const CustomEvent = ({ event }: { event: CalendarEvent }) => {
  const job = event.resource.job;
  const isGoogleEvent = event.resource.eventType === 'google';
  
  if (isGoogleEvent) {
    const GoogleIcon = getIconComponent('Calendar');
    return (
      <div className="flex items-center gap-1 px-1">
        <GoogleIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate text-xs">{event.title}</span>
      </div>
    );
  }
  
  if (!job) {
    return <span className="truncate text-xs px-1">{event.title}</span>;
  }
  
  const jobTypeVisuals = getJobTypeVisuals(job.inspectionType);
  const IconComponent = getIconComponent(jobTypeVisuals.icon);
  const isSynced = !!event.resource.googleEventId;
  
  return (
    <div className="flex items-center gap-1 px-1">
      <IconComponent className="w-3 h-3 flex-shrink-0" />
      <span className="truncate text-xs">{event.title}</span>
      {isSynced && <Cloud className="w-3 h-3 flex-shrink-0 opacity-60" />}
    </div>
  );
};

interface DraggableJobCardProps {
  job: Job;
}

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  'data-testid'?: string;
}

function MultiSelect({ options, selected, onChange, placeholder, 'data-testid': testId }: MultiSelectProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between min-h-12"
          data-testid={testId}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : `${selected.length} selected`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newSelected = selected.includes(option.value)
                      ? selected.filter((v) => v !== option.value)
                      : [...selected, option.value];
                    onChange(newSelected);
                  }}
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DraggableJobCard({ job }: DraggableJobCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: JOB_DRAG_TYPE,
    item: { job },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [job]);

  const statusColors = {
    'scheduled': 'bg-yellow-500',
    'done': 'bg-green-500',
    'failed': 'bg-orange-500',
    'reschedule': 'bg-blue-500',
  };

  const priorityLabels = {
    'low': 'Low',
    'medium': 'Med',
    'high': 'High',
  };

  return (
    <div
      ref={drag}
      className={`min-h-12 p-4 bg-card border rounded-md hover-elevate cursor-move ${isDragging ? 'opacity-50' : ''}`}
      data-testid={`card-unscheduled-job-${job.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-sm line-clamp-1" data-testid={`text-job-name-${job.id}`}>
          {job.name}
        </h4>
        <Badge variant="secondary" className="text-xs">
          {priorityLabels[job.priority as keyof typeof priorityLabels] || 'Med'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1 mb-1" data-testid={`text-job-address-${job.id}`}>
        {job.address}
      </p>
      <p className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-job-type-${job.id}`}>
        {job.inspectionType}
      </p>
      <div className="mt-2">
        <div className={`w-2 h-2 rounded-full inline-block ${statusColors[job.status as keyof typeof statusColors] || 'bg-gray-500'}`} />
        <span className="text-xs text-muted-foreground ml-2">{job.status}</span>
      </div>
    </div>
  );
}

export default function Schedule() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = user?.role === 'admin';
  
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select filter state
  const [selectedInspectors, setSelectedInspectors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
  const [selectedDevelopments, setSelectedDevelopments] = useState<string[]>([]);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<{ job: Job; start: Date; end: Date } | null>(null);
  const [eventFormData, setEventFormData] = useState({ startTime: '', endTime: '', fieldWorkComplete: false, photoUploadComplete: false });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatusTimeoutId, setSyncStatusTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Configurable sync interval (default: 10 minutes)
  const SYNC_INTERVAL_MS = Number(import.meta.env.VITE_SYNC_INTERVAL_MS) || 10 * 60 * 1000;

  // Load saved view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('schedule-preferred-view');
    if (savedView && ['day', 'week', 'month', 'agenda'].includes(savedView)) {
      setView(savedView as View);
    }
  }, []);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('schedule-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.inspectors) setSelectedInspectors(filters.inspectors);
        if (filters.statuses) setSelectedStatuses(filters.statuses);
        if (filters.builders) setSelectedBuilders(filters.builders);
        if (filters.developments) setSelectedDevelopments(filters.developments);
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters = {
      inspectors: selectedInspectors,
      statuses: selectedStatuses,
      builders: selectedBuilders,
      developments: selectedDevelopments,
    };
    localStorage.setItem('schedule-filters', JSON.stringify(filters));
  }, [selectedInspectors, selectedStatuses, selectedBuilders, selectedDevelopments]);

  // Handle view change with localStorage persistence
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
    localStorage.setItem('schedule-preferred-view', newView);
  }, []);

  // View-aware date range helper - returns correct boundaries based on view
  const getViewDateRange = useMemo(() => (viewType: string, currentDate: Date) => {
    switch (viewType) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 })
        };
      case 'agenda':
        return {
          start: startOfDay(currentDate),
          end: addDays(startOfDay(currentDate), 14) // 2 weeks ahead
        };
      case 'month':
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
    }
  }, []);

  // Use view-aware date ranges instead of hardcoded month boundaries
  const { start: startDate, end: endDate } = useMemo(() => 
    getViewDateRange(view, date), 
    [getViewDateRange, view, date]
  );
  
  // Auto-switch view based on screen size (respects user preference)
  useEffect(() => {
    const savedView = localStorage.getItem('schedule-preferred-view');
    
    // On mobile, default to agenda if no preference is saved
    // But allow user to manually override to other views
    if (isMobile && !savedView && view !== 'agenda') {
      handleViewChange('agenda');
    } 
    // On desktop, default to month if currently on agenda and no preference saved
    else if (!isMobile && !savedView && view === 'agenda') {
      handleViewChange('month');
    }
  }, [isMobile, view, handleViewChange]);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: inspectorWorkloads = [], isLoading: workloadsLoading } = useQuery<any[]>({
    queryKey: ['/api/inspectors/workload', { view, start: startDate.toISOString(), end: endDate.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/inspectors/workload?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inspector workload');
      }
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: scheduleEvents = [], isLoading: eventsLoading, error: eventsError } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/schedule-events', { view, start: startDate.toISOString(), end: endDate.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/schedule-events?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: googleOnlyEvents = [], isLoading: googleEventsLoading, error: googleEventsError, refetch: refetchGoogleEvents } = useQuery<GoogleEvent[]>({
    queryKey: ['/api/google-events', { view, start: startDate.toISOString(), end: endDate.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        forceSync: 'true', // Always sync with Google Calendar for real-time data
      });
      const response = await fetch(`/api/google-events?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        // Failed to fetch Google events - get error message
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const errorMessage = errorData.message || 'Failed to fetch Google Calendar events';
        setSyncStatus('error');
        setSyncError(errorMessage); // Store error message for display
        // Throw error so useQuery can handle it properly
        throw new Error(errorMessage);
      }
      const events = await response.json();
      
      // Update sync status on successful fetch
      if (events && events.length >= 0) {
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        setSyncError(null); // Clear any previous errors
        // Clear sync status after 3 seconds
        const timeoutId = setTimeout(() => setSyncStatus('idle'), 3000);
        setSyncStatusTimeoutId(prev => {
          if (prev) clearTimeout(prev);
          return timeoutId;
        });
      }
      
      return events;
    },
    refetchInterval: 60000, // Auto-refresh every minute
    retry: 1, // Only retry once for Google Calendar errors
    retryDelay: 2000,
  });

  // Fetch pending calendar events (admin only)
  const { data: pendingEvents = [], isLoading: pendingEventsLoading } = useQuery<PendingCalendarEvent[]>({
    queryKey: ['/api/pending-events', 'pending'],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'pending',
        limit: '100',
      });
      const response = await fetch(`/api/pending-events?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pending events');
      }
      const data = await response.json();
      // Backend returns { success: true, events: [], total: X }
      return data.events || [];
    },
    enabled: isAdmin,
  });

  // Fetch inspectors (admin only) - for dynamic assignment
  const { data: inspectors = [] } = useQuery<User[]>({
    queryKey: ['/api/users/inspectors'],
    enabled: isAdmin,
  });

  // Fetch all users (for inspector filtering)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch builders for filter options
  const { data: builders = [] } = useQuery<any[]>({
    queryKey: ['/api/builders'],
  });

  // Fetch developments for filter options
  const { data: developments = [] } = useQuery<any[]>({
    queryKey: ['/api/developments'],
  });

  // Fetch lots to map jobs to developments
  const { data: lots = [] } = useQuery<any[]>({
    queryKey: ['/api/lots'],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: { jobId: string; title: string; startTime: Date; endTime: Date }) => {
      const response = await apiRequest('POST', '/api/schedule-events', data);
      
      // Check for queued response (202 Accepted)
      if (response.status === 202) {
        const json = await response.json();
        return { response, data: json };
      }
      
      // 204 No Content, 205 Reset Content, 304 Not Modified = no body
      if (response.status === 204 || response.status === 205 || response.status === 304) {
        return { response, data: null };
      }
      
      // All other success responses = parse JSON
      const json = await response.json();
      return { response, data: json };
    },
    onSuccess: ({ data }) => {
      if (data?.queued) {
        toast({ 
          title: 'Event queued for sync', 
          description: 'Event will be created when back online'
        });
      } else {
        toast({ title: 'Event created successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
    },
    onError: () => {
      toast({ title: 'Failed to create event', variant: 'destructive' });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: { id: string; startTime: Date; endTime: Date }) => {
      const response = await apiRequest('PUT', `/api/schedule-events/${data.id}`, { startTime: data.startTime, endTime: data.endTime });
      
      // Check for queued response (202 Accepted)
      if (response.status === 202) {
        const json = await response.json();
        return { response, data: json };
      }
      
      // 204 No Content, 205 Reset Content, 304 Not Modified = no body
      if (response.status === 204 || response.status === 205 || response.status === 304) {
        return { response, data: null };
      }
      
      // All other success responses = parse JSON
      const json = await response.json();
      return { response, data: json };
    },
    onSuccess: ({ data }) => {
      if (data?.queued) {
        toast({ 
          title: 'Event queued for sync', 
          description: 'Event will be updated when back online'
        });
      } else {
        toast({ title: 'Event updated successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
    },
    onError: () => {
      toast({ title: 'Failed to update event', variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/schedule-events/${id}`);
      
      // Check for queued response (202 Accepted)
      if (response.status === 202) {
        const json = await response.json();
        return { response, data: json };
      }
      
      // 204 No Content, 205 Reset Content, 304 Not Modified = no body
      if (response.status === 204 || response.status === 205 || response.status === 304) {
        return { response, data: null };
      }
      
      // All other success responses = parse JSON
      const json = await response.json();
      return { response, data: json };
    },
    onSuccess: ({ data }) => {
      if (data?.queued) {
        toast({ 
          title: 'Event queued for sync', 
          description: 'Event will be deleted when back online'
        });
      } else {
        toast({ title: 'Event deleted successfully' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
    },
    onError: () => {
      toast({ title: 'Failed to delete event', variant: 'destructive' });
    },
  });

  // Update job completion fields mutation
  const updateJobCompletionMutation = useMutation({
    mutationFn: async ({ jobId, fieldWorkComplete, photoUploadComplete }: { jobId: string; fieldWorkComplete: boolean; photoUploadComplete: boolean }) => {
      const response = await apiRequest('PUT', `/api/jobs/${jobId}`, { fieldWorkComplete, photoUploadComplete });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Workflow progress updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      // Update the selectedEvent to reflect the actual data from server
      if (selectedEvent && data) {
        setSelectedEvent({
          ...selectedEvent,
          resource: {
            ...selectedEvent.resource,
            job: data,
          }
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update workflow progress', 
        description: error?.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Quick status update mutation with optimistic updates
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
      return response.json();
    },
    
    // Optimistic update
    onMutate: async ({ jobId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/schedule-events'] });
      await queryClient.cancelQueries({ queryKey: ['/api/jobs'] });
      await queryClient.cancelQueries({ queryKey: ['/api/jobs', jobId] });
      
      // Snapshot the previous values
      const previousScheduleEvents = queryClient.getQueryData(['/api/schedule-events']);
      const previousJobs = queryClient.getQueryData(['/api/jobs']);
      const previousJob = queryClient.getQueryData(['/api/jobs', jobId]);
      
      // Optimistically update schedule events
      queryClient.setQueryData(['/api/schedule-events'], (old: any) => {
        if (!old) return old;
        return old.map((event: any) => 
          event.resource?.jobId === jobId
            ? { ...event, resource: { ...event.resource, status } }
            : event
        );
      });
      
      // Optimistically update jobs list
      queryClient.setQueryData(['/api/jobs'], (old: any) => {
        if (!old) return old;
        return old.map((job: any) => 
          job.id === jobId ? { ...job, status } : job
        );
      });
      
      // Optimistically update individual job
      queryClient.setQueryData(['/api/jobs', jobId], (old: any) => {
        if (!old) return old;
        return { ...old, status };
      });
      
      // Update selected event in UI immediately
      if (selectedEvent?.resource?.jobId === jobId) {
        setSelectedEvent({
          ...selectedEvent,
          resource: {
            ...selectedEvent.resource,
            status,
          }
        });
      }
      
      return { previousScheduleEvents, previousJobs, previousJob, previousSelectedEvent: selectedEvent };
    },
    
    onSuccess: (data) => {
      toast({ title: 'Job status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      // Update the selectedEvent to reflect the actual data from server
      if (selectedEvent && data) {
        setSelectedEvent({
          ...selectedEvent,
          resource: {
            ...selectedEvent.resource,
            status: data.status,
            job: data,
          }
        });
      }
    },
    
    // Rollback on error
    onError: (error: any, variables, context) => {
      // Restore previous values on error
      if (context?.previousScheduleEvents) {
        queryClient.setQueryData(['/api/schedule-events'], context.previousScheduleEvents);
      }
      if (context?.previousJobs) {
        queryClient.setQueryData(['/api/jobs'], context.previousJobs);
      }
      if (context?.previousJob) {
        queryClient.setQueryData(['/api/jobs', variables.jobId], context.previousJob);
      }
      if (context?.previousSelectedEvent) {
        setSelectedEvent(context.previousSelectedEvent);
      }
      
      toast({ 
        title: 'Failed to update status', 
        description: error?.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Assign single pending event to inspector
  const assignEventMutation = useMutation({
    mutationFn: async ({ eventId, inspectorId }: { eventId: string; inspectorId: string }) => {
      const response = await apiRequest('POST', '/api/pending-events/assign', { eventId, inspectorId });
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/pending-events'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/inspectors/workload'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/google-events'], refetchType: 'active' }),
      ]);
      toast({ title: 'Event assigned successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to assign event', 
        description: error?.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  // Bulk assign pending events to inspector
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ eventIds, inspectorId }: { eventIds: string[]; inspectorId: string }) => {
      const response = await apiRequest('POST', '/api/pending-events/bulk-assign', { eventIds, inspectorId });
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/pending-events'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/inspectors/workload'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['/api/google-events'], refetchType: 'active' }),
      ]);
      toast({ title: 'Events assigned successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to assign events', 
        description: error?.message || 'An error occurred',
        variant: 'destructive' 
      });
    },
  });

  const syncGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await apiRequest('GET', `/api/schedule-events/sync?${params.toString()}`);
      return response.json();
    },
    onSuccess: (data: { 
      syncedCount: { 
        scheduleEvents: { created: number; updated: number; skipped: number };
        googleEvents: { created: number; updated: number };
      } 
    }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/google-events'] });
      setLastSyncedAt(new Date());
      
      const scheduleTotal = data.syncedCount.scheduleEvents.created + 
                           data.syncedCount.scheduleEvents.updated;
      const googleTotal = data.syncedCount.googleEvents.created + 
                         data.syncedCount.googleEvents.updated;
      
      toast({ 
        title: 'Google Calendar synced successfully',
        description: `Schedule events: ${scheduleTotal} synced, Google events: ${googleTotal} synced`,
      });
    },
    onError: (error: any) => {
      // Don't show error toast if offline - the offline indicator is enough
      if (!navigator.onLine) {
        return;
      }
      
      toast({ 
        title: 'Failed to sync with Google Calendar', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleGoogleCalendarSync = async () => {
    // Clear any existing status timeout
    if (syncStatusTimeoutId) {
      clearTimeout(syncStatusTimeoutId);
      setSyncStatusTimeoutId(null);
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncError(null);
    
    try {
      await syncGoogleCalendarMutation.mutateAsync();
      setSyncStatus('synced');
      
      // Reset to idle after 3 seconds
      const timeoutId = setTimeout(() => {
        setSyncStatus('idle');
        setSyncStatusTimeoutId(null);
      }, 3000);
      setSyncStatusTimeoutId(timeoutId);
    } catch (error: any) {
      setSyncStatus('error');
      setSyncError(error.message || 'Sync failed');
      
      // Reset to idle after 5 seconds
      const timeoutId = setTimeout(() => {
        setSyncStatus('idle');
        setSyncError(null);
        setSyncStatusTimeoutId(null);
      }, 5000);
      setSyncStatusTimeoutId(timeoutId);
    } finally {
      setIsSyncing(false);
    }
  };

  // Create lookup map for lots to developments
  const lotToDevelopmentMap = useMemo(() => {
    const map = new Map<string, string>();
    lots.forEach((lot: any) => {
      if (lot.id && lot.developmentId) {
        map.set(lot.id, lot.developmentId);
      }
    });
    return map;
  }, [lots]);

  // Filter options
  const inspectorOptions = useMemo(() => {
    const inspectorUsers = users.filter(u => u.role === 'inspector');
    return inspectorUsers.map(u => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}`,
    }));
  }, [users]);

  const statusOptions = useMemo(() => [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'done', label: 'Done' },
    { value: 'failed', label: 'Failed' },
    { value: 'reschedule', label: 'Reschedule' },
  ], []);

  const builderOptions = useMemo(() => {
    const uniqueBuilders = new Map();
    jobs.forEach(job => {
      if (job.builderId) {
        const builder = builders.find((b: any) => b.id === job.builderId);
        if (builder && !uniqueBuilders.has(builder.id)) {
          uniqueBuilders.set(builder.id, {
            value: builder.id,
            label: builder.name || builder.companyName,
          });
        }
      }
    });
    return Array.from(uniqueBuilders.values());
  }, [jobs, builders]);

  const developmentOptions = useMemo(() => {
    const uniqueDevelopments = new Map();
    jobs.forEach(job => {
      if (job.lotId) {
        const developmentId = lotToDevelopmentMap.get(job.lotId);
        if (developmentId) {
          const development = developments.find((d: any) => d.id === developmentId);
          if (development && !uniqueDevelopments.has(development.id)) {
            uniqueDevelopments.set(development.id, {
              value: development.id,
              label: development.name,
            });
          }
        }
      }
    });
    return Array.from(uniqueDevelopments.values());
  }, [jobs, developments, lotToDevelopmentMap]);

  // Calculate total active filters
  const totalActiveFilters = useMemo(() => {
    return selectedInspectors.length + selectedStatuses.length + 
           selectedBuilders.length + selectedDevelopments.length;
  }, [selectedInspectors, selectedStatuses, selectedBuilders, selectedDevelopments]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    
    // App events (linked to jobs via schedule_events table)
    const appEvents = scheduleEvents
      .map(event => {
        const job = jobMap.get(event.jobId);
        if (!job) return null;

        const syncIcon = event.googleCalendarEventId ? ' 🔗' : '';
        
        return {
          id: event.id,
          jobId: event.jobId,
          title: `${event.title}${syncIcon}`,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          resource: {
            scheduleEventId: event.id,
            status: job.status,
            job,
            googleEventId: event.googleCalendarEventId,
            eventType: 'app' as const,
          },
        };
      })
      .filter((e): e is CalendarEvent => e !== null);
    
    // Jobs with scheduledDate but no schedule_event record
    const scheduledJobIds = new Set(scheduleEvents.map(e => e.jobId));
    const jobOnlyEvents = jobs
      .filter(job => job.scheduledDate && !scheduledJobIds.has(job.id))
      .map(job => {
        const start = new Date(job.scheduledDate);
        const end = new Date(start);
        end.setHours(start.getHours() + 2); // Default 2 hour duration
        
        return {
          id: `job-${job.id}`,
          jobId: job.id,
          title: job.name,
          start,
          end,
          resource: {
            status: job.status,
            job,
            eventType: 'app' as const,
          },
        };
      });
    
    // Google-only events (not linked to jobs)
    const googleEvents = googleOnlyEvents
      .filter(event => !event.isConverted)
      .map(event => ({
        id: event.id,
        jobId: '',
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        resource: {
          googleEvent: event,
          eventType: 'google' as const,
        },
      }));
    
    // Combine all events
    let allEvents = [...appEvents, ...jobOnlyEvents, ...googleEvents];
    
    // Filter based on user role first
    // Admin sees ALL events (all inspectors + Building Knowledge + unassigned)
    // Non-admin inspector users ONLY see events assigned to them
    if (!isAdmin && user?.id) {
      allEvents = allEvents.filter(event => {
        // Google-only events are visible to all users
        if (event.resource.eventType === 'google') {
          return true;
        }
        
        // App events: filter by assignedTo
        const job = event.resource.job;
        if (!job) return false;
        
        // Show event if it's assigned to this user
        return job.assignedTo === user.id;
      });
    }
    
    // Apply multi-select filters
    let filteredEvents = allEvents;

    // Filter by inspector
    if (selectedInspectors.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const job = event.resource.job;
        return job && selectedInspectors.includes(job.assignedTo || '');
      });
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const status = event.resource.status || event.resource.job?.status;
        return status && selectedStatuses.includes(status);
      });
    }

    // Filter by builder
    if (selectedBuilders.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const job = event.resource.job;
        return job && job.builderId && selectedBuilders.includes(job.builderId);
      });
    }

    // Filter by development
    if (selectedDevelopments.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const job = event.resource.job;
        if (!job || !job.lotId) return false;
        const developmentId = lotToDevelopmentMap.get(job.lotId);
        return developmentId && selectedDevelopments.includes(developmentId);
      });
    }
    
    return filteredEvents;
  }, [scheduleEvents, jobs, googleOnlyEvents, isAdmin, user?.id, selectedInspectors, selectedStatuses, selectedBuilders, selectedDevelopments, lotToDevelopmentMap]);

  const unscheduledJobs = useMemo(() => {
    const scheduledJobIds = new Set(scheduleEvents.map(e => e.jobId));
    return jobs.filter(job => !scheduledJobIds.has(job.id) && !job.scheduledDate);
  }, [jobs, scheduleEvents]);

  const filteredUnscheduledJobs = useMemo(() => {
    if (!searchQuery) return unscheduledJobs;
    const query = searchQuery.toLowerCase();
    return unscheduledJobs.filter(
      job =>
        job.name.toLowerCase().includes(query) ||
        job.address.toLowerCase().includes(query) ||
        job.inspectionType.toLowerCase().includes(query)
    );
  }, [unscheduledJobs, searchQuery]);

  const checkConflict = useCallback((start: Date, end: Date, excludeEventId?: string) => {
    return calendarEvents.some(event => {
      if (excludeEventId && event.id === excludeEventId) return false;
      return (start < event.end && end > event.start);
    });
  }, [calendarEvents]);

  const handleDropOnCalendar = useCallback((item: { job: Job }, start: Date, end: Date) => {
    const hasConflict = checkConflict(start, end);
    
    if (hasConflict) {
      setPendingEvent({ job: item.job, start, end });
      setConflictDialogOpen(true);
    } else {
      createEventMutation.mutate({
        jobId: item.job.id,
        title: item.job.name,
        startTime: start,
        endTime: end,
      });
    }
  }, [checkConflict, createEventMutation]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Check if this is a Google-only event (not linked to a job)
    if (event.resource.eventType === 'google' && event.resource.googleEvent) {
      setSelectedGoogleEvent(event.resource.googleEvent);
      setConvertDialogOpen(true);
      return;
    }
    
    // Regular app event - show edit dialog
    setSelectedEvent(event);
    setEventFormData({
      startTime: format(event.start, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(event.end, "yyyy-MM-dd'T'HH:mm"),
      fieldWorkComplete: event.resource.job?.fieldWorkComplete ?? false,
      photoUploadComplete: event.resource.job?.photoUploadComplete ?? false,
    });
    setEventDialogOpen(true);
  }, []);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    // Open unassigned queue sheet to allow creating a new event
    if (isMobile) {
      setUnassignedQueueOpen(true);
    }
    // Desktop users can drag-and-drop from sidebar
  }, [isMobile]);

  const handleSaveEvent = useCallback(async () => {
    if (!selectedEvent) return;

    const startTime = new Date(eventFormData.startTime);
    const endTime = new Date(eventFormData.endTime);

    if (startTime >= endTime) {
      toast({ 
        title: 'Invalid time range', 
        description: 'End time must be after start time',
        variant: 'destructive' 
      });
      return;
    }

    const hasConflict = checkConflict(startTime, endTime, selectedEvent.id);
    
    if (hasConflict) {
      toast({ 
        title: 'Time conflict detected', 
        description: 'This time overlaps with another event',
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Update completion fields if they changed
      const job = selectedEvent.resource.job;
      const completionFieldsChanged = job && (
        job.fieldWorkComplete !== eventFormData.fieldWorkComplete ||
        job.photoUploadComplete !== eventFormData.photoUploadComplete
      );

      // Wait for completion mutation if needed
      if (completionFieldsChanged && job) {
        await updateJobCompletionMutation.mutateAsync({
          jobId: job.id,
          fieldWorkComplete: eventFormData.fieldWorkComplete,
          photoUploadComplete: eventFormData.photoUploadComplete,
        });
      }

      // If this is a job-only event (no schedule_event record), create one
      if (!selectedEvent.resource.scheduleEventId) {
        await createEventMutation.mutateAsync({
          jobId: selectedEvent.jobId,
          title: selectedEvent.title,
          startTime,
          endTime,
        });
      } else {
        // Update existing schedule_event
        await updateEventMutation.mutateAsync({
          id: selectedEvent.resource.scheduleEventId,
          startTime,
          endTime,
        });
      }

      // Close dialog only after all mutations succeed
      setEventDialogOpen(false);
    } catch (error) {
      // Error toasts are already handled by mutation onError callbacks
      // Keep dialog open so user can retry
    }
  }, [selectedEvent, eventFormData, checkConflict, updateEventMutation, createEventMutation, updateJobCompletionMutation, toast]);

  const handleDeleteEvent = useCallback(() => {
    if (!selectedEvent) return;
    
    // Only delete if there's a schedule_event record
    if (selectedEvent.resource.scheduleEventId) {
      deleteEventMutation.mutate(selectedEvent.resource.scheduleEventId);
    } else {
      // For job-only events, we can't delete the event itself
      // Just close the dialog - user would need to clear scheduledDate from the job
      toast({
        title: 'Cannot delete job event',
        description: 'This is a job with a scheduled date. To remove it from the calendar, clear the scheduled date from the job.',
        variant: 'default'
      });
    }
    
    setEventDialogOpen(false);
  }, [selectedEvent, deleteEventMutation, toast]);

  const handleConfirmConflict = useCallback(() => {
    if (!pendingEvent) return;
    
    createEventMutation.mutate({
      jobId: pendingEvent.job.id,
      title: pendingEvent.job.name,
      startTime: pendingEvent.start,
      endTime: pendingEvent.end,
    });
    
    setConflictDialogOpen(false);
    setPendingEvent(null);
  }, [pendingEvent, createEventMutation]);

  // Create user lookup map for inspector color mapping
  const userLookup = useMemo(() => {
    if (!inspectors || inspectors.length === 0) return new Map<string, User>();
    return new Map(inspectors.map(inspector => [inspector.id, inspector]));
  }, [inspectors]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.resource.eventType === 'google') {
      // Google-only events - use lighter style
      return {
        style: {
          backgroundColor: '#9e9e9e',
          borderRadius: '4px',
          opacity: 0.7,
          color: 'white',
          border: '1px dashed white',
          display: 'block',
        },
      };
    }
    
    // Get job data for styling
    const job = event.resource.job;
    if (!job) {
      // Fallback for events without job data
      return {
        style: {
          backgroundColor: '#6b7280',
          color: 'white',
          borderRadius: '4px',
          opacity: 0.9,
          border: '2px solid #4b5563',
          display: 'block',
        },
      };
    }
    
    // Look up the assigned user object for color mapping
    const assignedUser = job.assignedTo ? userLookup.get(job.assignedTo) || null : null;
    const assignedUserObj = assignedUser ? {
      firstName: assignedUser.firstName,
      lastName: assignedUser.lastName,
      email: assignedUser.email,
    } : null;
    
    // Use visual system to get complete styling
    const eventStyle = getCalendarEventStyle(
      assignedUserObj,
      job.inspectionType,
      job.fieldWorkComplete || false,
      job.photoUploadComplete || false,
      job.status === 'cancelled'
    );
    
    // Build CSS style object
    const style: React.CSSProperties = {
      backgroundColor: eventStyle.backgroundColor,
      borderRadius: '4px',
      opacity: parseFloat(eventStyle.opacity) / 100,
      color: eventStyle.color,
      border: `${eventStyle.borderWidth} ${eventStyle.borderStyle} ${eventStyle.borderColor}`,
      display: 'block',
      position: 'relative',
      overflow: 'hidden',
    };
    
    // Add background pattern if available
    if (eventStyle.backgroundPattern) {
      style.backgroundImage = `url("${eventStyle.backgroundPattern}")`;
      style.backgroundSize = 'auto';
      style.backgroundRepeat = 'repeat';
    }
    
    // Add tint overlay for fully complete items
    if (eventStyle.tint) {
      style.boxShadow = `inset 0 0 0 2000px ${eventStyle.tint}`;
    }
    
    // Add text decoration for cancelled items
    if (eventStyle.strikethrough) {
      style.textDecoration = 'line-through';
    }
    
    return { style };
  }, [userLookup]);

  const CalendarWrapper = useCallback(({ children }: { children: React.ReactNode }) => {
    const [, drop] = useDrop(() => ({
      accept: JOB_DRAG_TYPE,
      drop: (item: { job: Job }, monitor) => {
        const offset = monitor.getClientOffset();
        if (!offset) return;

        const calendarEl = document.querySelector('.rbc-calendar');
        if (!calendarEl) return;

        const rect = calendarEl.getBoundingClientRect();
        const x = offset.x - rect.left;
        const y = offset.y - rect.top;

        const dayWidth = rect.width / 7;
        const dayIndex = Math.floor(x / dayWidth);
        
        const dropDate = new Date(startDate);
        dropDate.setDate(dropDate.getDate() + dayIndex);
        dropDate.setHours(9, 0, 0, 0);

        const dropEnd = new Date(dropDate);
        dropEnd.setHours(10, 0, 0, 0);

        handleDropOnCalendar(item, dropDate, dropEnd);
      },
    }), [handleDropOnCalendar, startDate]);

    return <div ref={drop}>{children}</div>;
  }, [handleDropOnCalendar, startDate]);

  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate = date;
    
    if (action === 'TODAY') {
      newDate = new Date();
    } else if (action === 'PREV') {
      switch (view) {
        case 'day':
          newDate = addDays(date, -1);
          break;
        case 'week':
          newDate = addWeeks(date, -1);
          break;
        case 'month':
        default:
          newDate = addMonths(date, -1);
      }
    } else if (action === 'NEXT') {
      switch (view) {
        case 'day':
          newDate = addDays(date, 1);
          break;
        case 'week':
          newDate = addWeeks(date, 1);
          break;
        case 'month':
        default:
          newDate = addMonths(date, 1);
      }
    }
    
    setDate(newDate);
  }, [date, view]);

  // Initial sync on mount
  useEffect(() => {
    // Wait 1 second after mount to allow other queries to complete
    const timer = setTimeout(() => {
      handleGoogleCalendarSync();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Automatic sync every SYNC_INTERVAL_MS (default 10 minutes)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!isSyncing && document.visibilityState === 'visible' && navigator.onLine) {
        handleGoogleCalendarSync();
      }
    }, SYNC_INTERVAL_MS);
    
    return () => clearInterval(syncInterval);
  }, [isSyncing, SYNC_INTERVAL_MS]);

  // Sync when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSyncing && navigator.onLine) {
        const now = new Date();
        // Only sync if last sync was more than 1 minute ago (avoid excessive syncing)
        if (!lastSyncedAt || (now.getTime() - lastSyncedAt.getTime()) > 60 * 1000) {
          handleGoogleCalendarSync();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSyncing, lastSyncedAt]);

  // Detect offline status
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === 'offline') {
        setSyncStatus('idle');
        // Trigger sync when coming back online
        handleGoogleCalendarSync();
      }
    };
    
    const handleOffline = () => {
      setSyncStatus('offline');
      // Clear any pending sync status timeout
      if (syncStatusTimeoutId) {
        clearTimeout(syncStatusTimeoutId);
        setSyncStatusTimeoutId(null);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial offline status if needed
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus, syncStatusTimeoutId]);

  // Cleanup sync status timeout on unmount
  useEffect(() => {
    return () => {
      if (syncStatusTimeoutId) {
        clearTimeout(syncStatusTimeoutId);
      }
    };
  }, [syncStatusTimeoutId]);

  // Show skeleton loaders while loading
  const isLoading = jobsLoading || eventsLoading;
  
  // Check for errors
  const hasError = eventsError;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col">
        <div className="p-4">
          <OfflineBanner />
        </div>
        
        {isLoading ? (
          <div className="flex-1 p-4">
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              <Skeleton className="h-[600px] w-full" />
            </div>
          </div>
        ) : hasError ? (
          <Card className="m-4">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load schedule</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There was an error loading your calendar events
              </p>
              <Button onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
                queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
              }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: Unscheduled Jobs (for all users on desktop) */}
          {!isMobile && (
            <div className="w-80 border-r bg-background p-4 overflow-y-auto">
              {/* Unscheduled Jobs section */}
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2" data-testid="text-unscheduled-jobs-title">
                  Unscheduled Jobs
                </h2>
                <Badge variant="secondary" data-testid="badge-unscheduled-count">
                  {filteredUnscheduledJobs.length} jobs
                </Badge>
              </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-jobs"
              />
            </div>
          </div>

              <div className="space-y-3">
                {filteredUnscheduledJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-unscheduled">
                    {searchQuery ? 'No matching jobs found' : 'All jobs are scheduled'}
                  </p>
                ) : (
                  filteredUnscheduledJobs.map((job) => (
                    <DraggableJobCard key={job.id} job={job} />
                  ))
                )}
              </div>
            </div>
          )}

        <div className="flex-1 flex flex-col">
          {/* Inspector Workload Summary */}
          {!workloadsLoading && inspectorWorkloads.length > 0 && (
            <div className="border-b bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Inspector Workload</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto">
                {inspectorWorkloads.map((workload: any) => {
                  const currentLoad = workload.currentLoad ?? 0;
                  const loadPercentage = Math.min((currentLoad / 8) * 100, 100);
                  const loadColor = loadPercentage > 80 ? 'text-destructive' : loadPercentage > 60 ? 'text-yellow-600' : 'text-green-600';
                  
                  return (
                    <Card key={workload.inspectorId} className="min-w-[200px] p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            loadPercentage > 80 ? 'bg-destructive' : 
                            loadPercentage > 60 ? 'bg-yellow-600' : 
                            'bg-green-600'
                          }`} />
                          <span className="font-medium text-sm">
                            {workload.inspectorName || 'Unknown Inspector'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {workload.todayJobs ?? 0} today
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Load</span>
                          <span className={loadColor}>
                            {currentLoad.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Week</span>
                          <span>{workload.weekJobs ?? 0} jobs</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              loadPercentage > 80 ? 'bg-destructive' : 
                              loadPercentage > 60 ? 'bg-yellow-600' : 
                              'bg-green-600'
                            }`}
                            style={{ width: `${loadPercentage}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Panel */}
          <div className="border-b bg-background p-4">
            <Card data-testid="card-filters">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    Filters
                    {totalActiveFilters > 0 && (
                      <Badge variant="default" className="ml-2">
                        {totalActiveFilters}
                      </Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedInspectors([]);
                      setSelectedStatuses([]);
                      setSelectedBuilders([]);
                      setSelectedDevelopments([]);
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Inspector Filter */}
                <div>
                  <Label>Inspector</Label>
                  <MultiSelect
                    options={inspectorOptions}
                    selected={selectedInspectors}
                    onChange={setSelectedInspectors}
                    placeholder="All Inspectors"
                    data-testid="select-filter-inspector"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <Label>Status</Label>
                  <MultiSelect
                    options={statusOptions}
                    selected={selectedStatuses}
                    onChange={setSelectedStatuses}
                    placeholder="All Statuses"
                    data-testid="select-filter-status"
                  />
                </div>

                {/* Builder Filter */}
                <div>
                  <Label>Builder</Label>
                  <MultiSelect
                    options={builderOptions}
                    selected={selectedBuilders}
                    onChange={setSelectedBuilders}
                    placeholder="All Builders"
                    data-testid="select-filter-builder"
                  />
                </div>

                {/* Development Filter */}
                <div>
                  <Label>Development</Label>
                  <MultiSelect
                    options={developmentOptions}
                    selected={selectedDevelopments}
                    onChange={setSelectedDevelopments}
                    placeholder="All Developments"
                    data-testid="select-filter-development"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Active Filter Badges */}
            {totalActiveFilters > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" data-testid="container-active-filters">
                {selectedInspectors.map(id => {
                  const inspector = users.find(u => u.id === id);
                  return inspector ? (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {inspector.firstName} {inspector.lastName}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer hover-elevate" 
                        onClick={() => setSelectedInspectors(prev => prev.filter(v => v !== id))}
                      />
                    </Badge>
                  ) : null;
                })}
                {selectedStatuses.map(status => {
                  const statusOption = statusOptions.find(s => s.value === status);
                  return statusOption ? (
                    <Badge key={status} variant="secondary" className="flex items-center gap-1">
                      Status: {statusOption.label}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer hover-elevate" 
                        onClick={() => setSelectedStatuses(prev => prev.filter(v => v !== status))}
                      />
                    </Badge>
                  ) : null;
                })}
                {selectedBuilders.map(builderId => {
                  const builder = builders.find((b: any) => b.id === builderId);
                  return builder ? (
                    <Badge key={builderId} variant="secondary" className="flex items-center gap-1">
                      {builder.name || builder.companyName}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer hover-elevate" 
                        onClick={() => setSelectedBuilders(prev => prev.filter(v => v !== builderId))}
                      />
                    </Badge>
                  ) : null;
                })}
                {selectedDevelopments.map(devId => {
                  const development = developments.find((d: any) => d.id === devId);
                  return development ? (
                    <Badge key={devId} variant="secondary" className="flex items-center gap-1">
                      {development.name}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer hover-elevate" 
                        onClick={() => setSelectedDevelopments(prev => prev.filter(v => v !== devId))}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="border-b bg-background p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold" data-testid="text-page-title">
                  Schedule
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {syncStatus === 'syncing' && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="status-syncing">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                )}
                {syncStatus === 'synced' && (
                  <div className="flex items-center gap-1 text-sm text-green-600" data-testid="status-synced">
                    <Cloud className="h-4 w-4" />
                    <span>Synced</span>
                  </div>
                )}
                {syncStatus === 'error' && (
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="status-error" title={syncError || 'Calendar sync failed'}>
                    <AlertCircle className="h-4 w-4" />
                    <span>{syncError || 'Sync error'}</span>
                  </div>
                )}
                {syncStatus === 'offline' && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="status-offline">
                    <CloudOff className="h-4 w-4" />
                    <span>Offline</span>
                  </div>
                )}
                
                {lastSyncedAt && syncStatus === 'idle' && (
                  <span className="text-xs text-muted-foreground" data-testid="text-last-synced">
                    Last synced: {format(lastSyncedAt, 'h:mm a')}
                  </span>
                )}
                
                {!authLoading && (user?.role === 'admin' || user?.role === 'inspector') && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setWizardOpen(true)}
                    data-testid="button-create-job-wizard"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job (Wizard)
                  </Button>
                )}
                
                {!authLoading && isAdmin === true && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncing}
                    data-testid="button-sync"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Cloud className="mr-2 h-4 w-4" />
                        Sync Google Calendar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('TODAY')}
                  data-testid="button-today"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleNavigate('PREV')}
                  data-testid="button-prev-period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleNavigate('NEXT')}
                  data-testid="button-next-period"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold ml-2" data-testid="text-current-date">
                  {format(date, 'MMMM yyyy')}
                </h2>
              </div>

              <div className="flex items-center gap-2" data-testid="view-selector">
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewChange('day')}
                  data-testid="button-view-today"
                >
                  Today
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewChange('week')}
                  data-testid="button-view-week"
                >
                  Week
                </Button>
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewChange('month')}
                  data-testid="button-view-month"
                >
                  Month
                </Button>
                <Button
                  variant={view === 'agenda' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewChange('agenda')}
                  data-testid="button-view-agenda"
                >
                  Agenda
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4" data-testid="calendar-container">
            <CalendarWrapper>
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={handleViewChange}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: CustomEvent,
                }}
                selectable
                style={{ height: '100%' }}
                className="rbc-calendar"
              />
            </CalendarWrapper>
          </div>
        </div>

        {/* Admin-only Unassigned Events Queue (Desktop Sidebar) */}
        {!authLoading && isAdmin === true && !isMobile && (
          <UnassignedQueue
            events={pendingEvents}
            inspectors={inspectors}
            onAssign={(eventId, inspectorId) => assignEventMutation.mutate({ eventId, inspectorId })}
            onBulkAssign={(eventIds, inspectorId) => bulkAssignMutation.mutate({ eventIds, inspectorId })}
            isLoading={pendingEventsLoading}
          />
        )}
      </div>
        )}
      </div>

      {/* Admin-only Unassigned Events Queue (Mobile Bottom Sheet) */}
      {!authLoading && isAdmin === true && isMobile && (
        <UnassignedQueueSheet
          events={pendingEvents}
          inspectors={inspectors}
          onAssign={(eventId, inspectorId) => assignEventMutation.mutate({ eventId, inspectorId })}
          isLoading={pendingEventsLoading}
        />
      )}

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              View and edit schedule event details
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Job</Label>
                <p className="text-sm" data-testid="text-event-job-name">{selectedEvent.title}</p>
              </div>
              
              <div>
                <Label className="font-semibold">Address</Label>
                <p className="text-sm text-muted-foreground" data-testid="text-event-address">
                  {selectedEvent.resource.job.address}
                </p>
              </div>

              <div>
                <Label className="font-semibold">Type</Label>
                <p className="text-sm text-muted-foreground" data-testid="text-event-type">
                  {selectedEvent.resource.job.inspectionType}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select
                  value={selectedEvent.resource.status}
                  onValueChange={(newStatus) => {
                    if (selectedEvent.resource.job) {
                      updateJobStatusMutation.mutate({ 
                        jobId: selectedEvent.resource.job.id, 
                        status: newStatus 
                      });
                    }
                  }}
                  disabled={updateJobStatusMutation.isPending || user?.role === 'viewer' || user?.role === 'manager'}
                >
                  <SelectTrigger 
                    id="status-select" 
                    className="min-h-12 w-full"
                    data-testid="select-event-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled" data-testid="option-status-scheduled">
                      Scheduled
                    </SelectItem>
                    <SelectItem value="done" data-testid="option-status-done">
                      Done
                    </SelectItem>
                    <SelectItem value="failed" data-testid="option-status-failed">
                      Failed
                    </SelectItem>
                    <SelectItem value="reschedule" data-testid="option-status-reschedule">
                      Reschedule
                    </SelectItem>
                  </SelectContent>
                </Select>
                {updateJobStatusMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Updating status...</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Workflow Progress</h3>
                <div className="space-y-4">
                  <div className="flex flex-row items-start space-x-3 space-y-0">
                    <Checkbox
                      checked={eventFormData.fieldWorkComplete}
                      onCheckedChange={(checked) => setEventFormData({ 
                        ...eventFormData, 
                        fieldWorkComplete: checked === true 
                      })}
                      disabled={user?.role === 'viewer' || user?.role === 'manager'}
                      data-testid="checkbox-field-work"
                    />
                    <div className="space-y-1 leading-none">
                      <Label className="font-normal">
                        Field Work
                      </Label>
                      {selectedEvent.resource.job?.fieldWorkCompletedAt && (
                        <p className="text-xs text-muted-foreground">
                          Completed on {format(new Date(selectedEvent.resource.job.fieldWorkCompletedAt), "PPP")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row items-start space-x-3 space-y-0">
                    <Checkbox
                      checked={eventFormData.photoUploadComplete}
                      onCheckedChange={(checked) => setEventFormData({ 
                        ...eventFormData, 
                        photoUploadComplete: checked === true 
                      })}
                      disabled={user?.role === 'viewer' || user?.role === 'manager' || !eventFormData.fieldWorkComplete}
                      data-testid="checkbox-photo-upload"
                    />
                    <div className="space-y-1 leading-none">
                      <Label className="font-normal">
                        Photo Upload
                      </Label>
                      {!eventFormData.fieldWorkComplete && (
                        <p className="text-xs text-muted-foreground">
                          Complete field work first
                        </p>
                      )}
                      {selectedEvent.resource.job?.photoUploadCompletedAt && (
                        <p className="text-xs text-muted-foreground">
                          Completed on {format(new Date(selectedEvent.resource.job.photoUploadCompletedAt), "PPP")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={eventFormData.startTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, startTime: e.target.value })}
                  data-testid="input-event-start"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={eventFormData.endTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, endTime: e.target.value })}
                  data-testid="input-event-end"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending || updateEventMutation.isPending}
              data-testid="button-delete-event"
            >
              {deleteEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Event
            </Button>
            <Button 
              onClick={handleSaveEvent} 
              disabled={updateEventMutation.isPending || deleteEventMutation.isPending}
              data-testid="button-save-event"
            >
              {updateEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent data-testid="dialog-conflict">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Time Conflict Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              This time slot overlaps with another scheduled event. Do you want to schedule it anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-conflict-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmConflict} 
              disabled={createEventMutation.isPending}
              data-testid="button-conflict-confirm"
            >
              {createEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Google Event Dialog */}
      <ConvertGoogleEventDialog
        googleEvent={selectedGoogleEvent}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onSuccess={() => {
          setSelectedGoogleEvent(null);
          // Trigger a sync to refresh events
          handleGoogleCalendarSync();
        }}
      />

      {/* Job Creation Wizard */}
      <JobWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          // Refresh schedule events and jobs after successful creation
          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
          queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
        }}
      />
    </DndProvider>
  );
}
