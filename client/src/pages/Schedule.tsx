import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as BigCalendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Calendar, ChevronLeft, ChevronRight, Search, Cloud, CloudOff, AlertCircle, Loader2 } from "lucide-react";
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
import type { Job, ScheduleEvent } from "@shared/schema";
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
    scheduleEventId: string;
    status: string;
    job: Job;
    googleEventId: string | null;
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
      className={`p-4 bg-card border rounded-md hover-elevate cursor-move ${isDragging ? 'opacity-50' : ''}`}
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

  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
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

  const createEventMutation = useMutation({
    mutationFn: async (data: { jobId: string; title: string; startTime: Date; endTime: Date }) => {
      return apiRequest('POST', '/api/schedule-events', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      toast({ title: 'Event created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create event', variant: 'destructive' });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: { id: string; startTime: Date; endTime: Date }) => {
      return apiRequest('PUT', `/api/schedule-events/${data.id}`, { startTime: data.startTime, endTime: data.endTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      toast({ title: 'Event updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update event', variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/schedule-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      toast({ title: 'Event deleted successfully' });
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
    onSuccess: (data: { syncedCount: { created: number; updated: number; skipped: number } }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      setLastSyncedAt(new Date());
      toast({ 
        title: 'Google Calendar synced successfully',
        description: `Created: ${data.syncedCount.created}, Updated: ${data.syncedCount.updated}, Skipped: ${data.syncedCount.skipped}`,
      });
    },
    onError: () => {
      toast({ title: 'Failed to sync with Google Calendar', variant: 'destructive' });
    },
  });

  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true);
    try {
      await syncGoogleCalendarMutation.mutateAsync();
    } finally {
      setIsSyncing(false);
    }
  };

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    
    return scheduleEvents
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
          },
        };
      })
      .filter((e): e is CalendarEvent => e !== null);
  }, [scheduleEvents, jobs]);

  const unscheduledJobs = useMemo(() => {
    const scheduledJobIds = new Set(scheduleEvents.map(e => e.jobId));
    return jobs.filter(job => !scheduledJobIds.has(job.id));
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

    updateEventMutation.mutate({
      id: selectedEvent.resource.scheduleEventId,
      startTime,
      endTime,
    });

    setEventDialogOpen(false);
  }, [selectedEvent, eventFormData, checkConflict, updateEventMutation, toast]);

  const handleDeleteEvent = useCallback(() => {
    if (!selectedEvent) return;
    deleteEventMutation.mutate(selectedEvent.resource.scheduleEventId);
    setEventDialogOpen(false);
  }, [selectedEvent, deleteEventMutation]);

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
          <div className="border-b bg-background p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold" data-testid="text-page-title">
                  Schedule
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {lastSyncedAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2" data-testid="text-last-synced">
                    <Cloud className="h-3 w-3" />
                    Last synced: {format(lastSyncedAt, 'h:mm a')}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleCalendarSync}
                  disabled={isSyncing}
                  data-testid="button-google-calendar-sync"
                >
                  {isSyncing ? (
                    <>
                      <Cloud className="h-4 w-4 mr-2 animate-pulse" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Sync with Google Calendar
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
      </div>
    </DndProvider>
  );
}
