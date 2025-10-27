import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as BigCalendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Calendar, ChevronLeft, ChevronRight, Search, Cloud, CloudOff, AlertCircle, Loader2, Users, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OfflineBanner } from "@/components/OfflineBanner";
import { CalendarLayersPanel } from "@/components/CalendarLayersPanel";
import { ConvertGoogleEventDialog } from "@/components/ConvertGoogleEventDialog";
import type { Job, ScheduleEvent, GoogleEvent } from "@shared/schema";
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

interface DraggableJobCardProps {
  job: Job;
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
    'pending': 'bg-yellow-500',
    'scheduled': 'bg-blue-500',
    'in-progress': 'bg-blue-600',
    'completed': 'bg-green-500',
    'review': 'bg-orange-500',
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
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<{ job: Job; start: Date; end: Date } | null>(null);
  const [eventFormData, setEventFormData] = useState({ startTime: '', endTime: '' });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatusTimeoutId, setSyncStatusTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Configurable sync interval (default: 10 minutes)
  const SYNC_INTERVAL_MS = Number(import.meta.env.VITE_SYNC_INTERVAL_MS) || 10 * 60 * 1000;

  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: inspectorWorkloads = [], isLoading: workloadsLoading } = useQuery<any[]>({
    queryKey: ['/api/inspectors/workload'],
    enabled: true,
  });

  const { data: scheduleEvents = [], isLoading: eventsLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/schedule-events', startDate.toISOString(), endDate.toISOString()],
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

  const { data: googleOnlyEvents = [], isLoading: googleEventsLoading, refetch: refetchGoogleEvents } = useQuery<GoogleEvent[]>({
    queryKey: ['/api/google-events', startDate.toISOString(), endDate.toISOString()],
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
        // Failed to fetch Google events
        setSyncStatus('error');
        return [];
      }
      const events = await response.json();
      
      // Update sync status on successful fetch
      if (events && events.length >= 0) {
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
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
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    
    // App events (linked to jobs via schedule_events table)
    const appEvents = scheduleEvents
      .map(event => {
        const job = jobMap.get(event.jobId);
        if (!job) return null;

        return {
          id: event.id,
          jobId: event.jobId,
          title: event.googleCalendarEventId ? `${event.title} 🔗` : event.title,
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
        title: `📅 ${event.title}`,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        resource: {
          googleEvent: event,
          eventType: 'google' as const,
        },
      }));
    
    return [...appEvents, ...jobOnlyEvents, ...googleEvents];
  }, [scheduleEvents, jobs, googleOnlyEvents]);

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
    });
    setEventDialogOpen(true);
  }, []);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
  }, []);

  const handleSaveEvent = useCallback(() => {
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

    // If this is a job-only event (no schedule_event record), create one
    if (!selectedEvent.resource.scheduleEventId) {
      createEventMutation.mutate({
        jobId: selectedEvent.jobId,
        title: selectedEvent.title,
        startTime,
        endTime,
      });
    } else {
      // Update existing schedule_event
      updateEventMutation.mutate({
        id: selectedEvent.resource.scheduleEventId,
        startTime,
        endTime,
      });
    }

    setEventDialogOpen(false);
  }, [selectedEvent, eventFormData, checkConflict, updateEventMutation, createEventMutation, toast]);

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
    
    // App events - existing styling
    const statusColors = {
      'pending': '#FFC107',
      'scheduled': '#2E5BBA',
      'in-progress': '#2E5BBA',
      'completed': '#28A745',
      'review': '#FD7E14',
    };

    const backgroundColor = statusColors[event.resource.status as keyof typeof statusColors] || '#6C757D';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
      },
    };
  }, []);

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
    if (action === 'PREV') {
      setDate(subMonths(date, 1));
    } else if (action === 'NEXT') {
      setDate(addMonths(date, 1));
    } else {
      setDate(new Date());
    }
  }, [date]);

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

  if (jobsLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading schedule...</div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full flex-col">
        <div className="p-4">
          <OfflineBanner />
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r bg-background p-4 overflow-y-auto">
          {/* Google Calendar Layers */}
          <CalendarLayersPanel />
          
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
                  const loadPercentage = Math.min((workload.currentLoad / 8) * 100, 100);
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
                            {workload.inspectorName}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {workload.todayJobs} today
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Load</span>
                          <span className={loadColor}>
                            {workload.currentLoad.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Week</span>
                          <span>{workload.weekJobs} jobs</span>
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
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="status-error">
                    <AlertCircle className="h-4 w-4" />
                    <span>Sync error</span>
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
                  data-testid="button-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleNavigate('NEXT')}
                  data-testid="button-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold ml-2" data-testid="text-current-date">
                  {format(date, 'MMMM yyyy')}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={view === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('month')}
                  data-testid="button-view-month"
                >
                  Month
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('week')}
                  data-testid="button-view-week"
                >
                  Week
                </Button>
                <Button
                  variant={view === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('day')}
                  data-testid="button-view-day"
                >
                  Day
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <CalendarWrapper>
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                eventPropGetter={eventStyleGetter}
                selectable
                style={{ height: '100%' }}
                className="rbc-calendar"
              />
            </CalendarWrapper>
          </div>
        </div>
      </div>

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

              <div>
                <Label className="font-semibold">Status</Label>
                <Badge className="ml-2" data-testid="badge-event-status">
                  {selectedEvent.resource.status}
                </Badge>
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
      </div>
    </DndProvider>
  );
}
