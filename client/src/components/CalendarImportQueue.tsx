import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Check, X, Edit, ChevronRight, AlertCircle, Clock, MapPin, User, FileText, Users, CheckSquare, Filter, ArrowUpDown, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import InspectorAssignmentDialog from "./InspectorAssignmentDialog";
import type { GoogleEvent, Builder, InsertJob } from "@shared/schema";

interface CalendarEventWithConfidence extends GoogleEvent {
  confidence?: number;
  suggestedBuilderId?: string;
  suggestedBuilderName?: string;
  suggestedInspectionType?: string;
  parseError?: string;
}

const jobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  builderId: z.string().min(1, "Builder is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
  address: z.string().min(1, "Address is required"),
  contractor: z.string().default("TBD"),
  scheduledDate: z.string(),
  notes: z.string().optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

interface EventEditDialogProps {
  event: CalendarEventWithConfidence;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: JobFormData) => void;
  builders: Builder[];
}

function EventEditDialog({ event, open, onClose, onConfirm, builders }: EventEditDialogProps) {
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      name: event.summary || "",
      builderId: event.suggestedBuilderId || "",
      inspectionType: event.suggestedInspectionType || "standard",
      address: event.location || "TBD",
      contractor: "TBD",
      scheduledDate: event.startTime && !isNaN(Date.parse(event.startTime)) 
        ? new Date(event.startTime).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      notes: event.description || "",
    },
  });

  const handleSubmit = (data: JobFormData) => {
    onConfirm(data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Calendar Event to Job</DialogTitle>
          <DialogDescription>
            Review and edit the job details before creating it from this calendar event.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter job name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="builderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Builder</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a builder" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {builders.map((builder) => (
                        <SelectItem key={builder.id} value={builder.id}>
                          {builder.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inspectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inspection type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard Inspection</SelectItem>
                      <SelectItem value="blower-door">Blower Door Test</SelectItem>
                      <SelectItem value="duct-leakage">Duct Leakage Test</SelectItem>
                      <SelectItem value="pre-drywall">Pre-Drywall</SelectItem>
                      <SelectItem value="final">Final Inspection</SelectItem>
                      <SelectItem value="reinspection">Re-inspection</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter job address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter contractor name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Job</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EventCardProps {
  event: CalendarEventWithConfidence;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onAssign: () => void;
  assignedInspector?: string;
}

function EventCard({ event, isSelected, onSelectChange, onApprove, onReject, onEdit, onAssign, assignedInspector }: EventCardProps) {
  const confidenceColor = event.confidence 
    ? event.confidence >= 80 ? "text-green-600 dark:text-green-400"
    : event.confidence >= 60 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400"
    : "text-gray-600 dark:text-gray-400";

  const confidenceLabel = event.confidence
    ? `${event.confidence}% confidence`
    : "No confidence score";

  const eventTypeColor = {
    inspection: "bg-blue-500",
    meeting: "bg-purple-500",
    training: "bg-green-500",
    other: "bg-gray-500",
  }[event.eventType] || "bg-gray-500";

  return (
    <Card className="hover-elevate" data-testid={`card-calendar-event-${event.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onSelectChange}
            className="mt-1"
            data-testid={`checkbox-event-${event.id}`}
          />
          <div className="flex-1 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-2">{event.summary}</CardTitle>
              <CardDescription className="mt-1">
                <span className={confidenceColor}>{confidenceLabel}</span>
                {event.suggestedBuilderName && (
                  <span className="ml-2">• {event.suggestedBuilderName}</span>
                )}
                {assignedInspector && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    • Assigned to {assignedInspector}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className={`w-2 h-2 rounded-full ${eventTypeColor} mt-1`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {event.startTime && !isNaN(Date.parse(event.startTime)) 
                ? format(new Date(event.startTime), "MMM d, h:mm a")
                : "Date not available"}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3 mt-0.5" />
              <span className="line-clamp-2">{event.location}</span>
            </div>
          )}
          {event.organizerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{event.organizerName}</span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <FileText className="h-3 w-3 mt-0.5" />
              <span className="line-clamp-3">{event.description}</span>
            </div>
          )}
        </div>

        {event.suggestedInspectionType && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {event.suggestedInspectionType}
            </Badge>
            {event.isAllDay && (
              <Badge variant="outline" className="text-xs">All Day</Badge>
            )}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onApprove}
            className="flex-1 min-w-0"
            data-testid={`button-approve-${event.id}`}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAssign}
            className="flex-1 min-w-0"
            data-testid={`button-assign-${event.id}`}
          >
            <Users className="h-4 w-4 mr-1" />
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="flex-1 min-w-0"
            data-testid={`button-edit-${event.id}`}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            className="flex-1 min-w-0"
            data-testid={`button-reject-${event.id}`}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarImportQueue() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithConfidence | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedEventForAssignment, setSelectedEventForAssignment] = useState<CalendarEventWithConfidence | null>(null);
  const [filterBy, setFilterBy] = useState<"all" | "date" | "urgency" | "builder">("all");
  const [sortBy, setSortBy] = useState<"date" | "urgency" | "confidence">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventAssignments, setEventAssignments] = useState<Map<string, string>>(new Map());

  // Fetch unconverted Google events
  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEventWithConfidence[]>({
    queryKey: ['/api/google-events', 'unconverted'],
    queryFn: async () => {
      // Get events from the last 30 days to next 60 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        forceSync: 'true', // Force sync to get latest from Google Calendar
      });

      const response = await fetch(`/api/google-events?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const allEvents = await response.json();
      
      // Filter to only show unconverted events
      return allEvents.filter((e: GoogleEvent) => !e.hasLinkedJob && !e.isConverted);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch builders for dropdown
  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
  });

  // Convert event to job mutation
  const convertToJobMutation = useMutation({
    mutationFn: async ({ eventId, jobData }: { eventId: string; jobData: JobFormData }) => {
      const response = await apiRequest('POST', `/api/google-events/${eventId}/convert`, {
        jobData: {
          ...jobData,
          scheduledDate: jobData.scheduledDate && !isNaN(Date.parse(jobData.scheduledDate))
            ? new Date(jobData.scheduledDate)
            : new Date(),
        },
        scheduleData: {
          startTime: events.find(e => e.id === eventId)?.startTime || null,
          endTime: events.find(e => e.id === eventId)?.endTime || null,
        },
        keepSynced: true,
      });
      
      if (!response.ok) {
        throw new Error('Failed to convert event to job');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      toast({
        title: "Success",
        description: "Event converted to job successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert event to job",
        variant: "destructive",
      });
    },
  });

  // Mark event as rejected/ignored
  const rejectEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('POST', `/api/google-events/${eventId}/reject`, {});
      
      if (!response.ok) {
        throw new Error('Failed to reject event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-events'] });
      toast({
        title: "Event rejected",
        description: "This event will be ignored for job creation",
      });
    },
  });

  // Group events by confidence level
  const groupedEvents = useMemo(() => {
    const high: CalendarEventWithConfidence[] = [];
    const medium: CalendarEventWithConfidence[] = [];
    const low: CalendarEventWithConfidence[] = [];

    events.forEach(event => {
      // Add mock confidence scores for demonstration
      // In production, this would come from the calendar import service
      const enrichedEvent = {
        ...event,
        confidence: Math.floor(Math.random() * 100), // Mock confidence
        suggestedBuilderId: builders[0]?.id,
        suggestedBuilderName: builders[0]?.companyName,
        suggestedInspectionType: event.summary?.toLowerCase().includes('test') ? 'blower-door' : 'standard',
      };

      if (enrichedEvent.confidence >= 80) {
        high.push(enrichedEvent);
      } else if (enrichedEvent.confidence >= 60) {
        medium.push(enrichedEvent);
      } else {
        low.push(enrichedEvent);
      }
    });

    return { high, medium, low };
  }, [events, builders]);

  const handleApprove = (event: CalendarEventWithConfidence) => {
    if (!event.suggestedBuilderId || !event.suggestedInspectionType) {
      setSelectedEvent(event);
      setEditDialogOpen(true);
      return;
    }

    const jobData: JobFormData = {
      name: event.summary || "Untitled Job",
      builderId: event.suggestedBuilderId,
      inspectionType: event.suggestedInspectionType,
      address: event.location || "TBD",
      contractor: "TBD",
      scheduledDate: event.startTime && !isNaN(Date.parse(event.startTime))
        ? new Date(event.startTime).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      notes: event.description,
    };

    convertToJobMutation.mutate({ eventId: event.id, jobData });
  };

  const handleEdit = (event: CalendarEventWithConfidence) => {
    setSelectedEvent(event);
    setEditDialogOpen(true);
  };

  const handleReject = (event: CalendarEventWithConfidence) => {
    rejectEventMutation.mutate(event.id);
  };

  const handleConfirmEdit = (jobData: JobFormData) => {
    if (selectedEvent) {
      convertToJobMutation.mutate({ eventId: selectedEvent.id, jobData });
    }
  };

  const handleSelectEvent = (eventId: string, selected: boolean) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allEventIds = events.map(e => e.id);
    setSelectedEvents(new Set(allEventIds));
  };

  const handleClearSelection = () => {
    setSelectedEvents(new Set());
  };

  const handleAssignInspector = (event: CalendarEventWithConfidence) => {
    setSelectedEventForAssignment(event);
    setAssignmentDialogOpen(true);
  };

  const handleBulkApprove = async () => {
    const selectedEventsList = Array.from(selectedEvents);
    for (const eventId of selectedEventsList) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        await handleApprove(event);
      }
    }
    setSelectedEvents(new Set());
  };

  const handleBulkAssign = () => {
    if (selectedEvents.size === 0) return;
    
    // For bulk assignment, we'll use the first selected event as context
    const firstEventId = Array.from(selectedEvents)[0];
    const firstEvent = events.find(e => e.id === firstEventId);
    if (firstEvent) {
      setSelectedEventForAssignment(firstEvent);
      setAssignmentDialogOpen(true);
    }
  };

  const handleBulkReject = async () => {
    const selectedEventsList = Array.from(selectedEvents);
    for (const eventId of selectedEventsList) {
      await rejectEventMutation.mutate(eventId);
    }
    setSelectedEvents(new Set());
  };

  const handleAssignmentComplete = (inspectorId: string) => {
    if (selectedEventForAssignment) {
      // Store the assignment locally
      setEventAssignments(prev => {
        const newMap = new Map(prev);
        if (selectedEvents.size > 1) {
          // Bulk assignment
          selectedEvents.forEach(eventId => {
            newMap.set(eventId, inspectorId);
          });
        } else {
          // Single assignment
          newMap.set(selectedEventForAssignment.id, inspectorId);
        }
        return newMap;
      });
      
      toast({
        title: "Inspector Assigned",
        description: selectedEvents.size > 1 
          ? `Assigned ${selectedEvents.size} events to inspector`
          : "Event assigned to inspector successfully",
      });
    }
    setAssignmentDialogOpen(false);
  };

  if (eventsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalEvents = events.length;
  const hasEvents = totalEvents > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Import Queue</h2>
          <p className="text-muted-foreground mt-1">
            Review and convert calendar events to jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Calendar className="h-4 w-4 mr-1" />
            {totalEvents} pending events
          </Badge>
        </div>
      </div>

      {selectedEvents.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="text-sm font-medium">
                {selectedEvents.size} events selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkApprove}
                data-testid="button-bulk-approve"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkAssign}
                data-testid="button-bulk-assign"
              >
                <Users className="h-4 w-4 mr-1" />
                Assign Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkReject}
                data-testid="button-bulk-reject"
              >
                <X className="h-4 w-4 mr-1" />
                Reject Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!hasEvents ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No unconverted calendar events found. Events that are already linked to jobs are not shown here.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              All Events ({totalEvents})
            </TabsTrigger>
            <TabsTrigger value="high">
              High Confidence ({groupedEvents.high.length})
            </TabsTrigger>
            <TabsTrigger value="medium">
              Medium Confidence ({groupedEvents.medium.length})
            </TabsTrigger>
            <TabsTrigger value="low">
              Low Confidence ({groupedEvents.low.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <h3 className="font-semibold">High Confidence</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {groupedEvents.high.length}
                  </Badge>
                </div>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {groupedEvents.high.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvents.has(event.id)}
                        onSelectChange={(selected) => handleSelectEvent(event.id, selected)}
                        onApprove={() => handleApprove(event)}
                        onEdit={() => handleEdit(event)}
                        onReject={() => handleReject(event)}
                        onAssign={() => handleAssignInspector(event)}
                        assignedInspector={eventAssignments.get(event.id)}
                      />
                    ))}
                    {groupedEvents.high.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No high confidence events
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <h3 className="font-semibold">Medium Confidence</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {groupedEvents.medium.length}
                  </Badge>
                </div>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {groupedEvents.medium.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvents.has(event.id)}
                        onSelectChange={(selected) => handleSelectEvent(event.id, selected)}
                        onApprove={() => handleApprove(event)}
                        onEdit={() => handleEdit(event)}
                        onReject={() => handleReject(event)}
                        onAssign={() => handleAssignInspector(event)}
                        assignedInspector={eventAssignments.get(event.id)}
                      />
                    ))}
                    {groupedEvents.medium.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No medium confidence events
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <h3 className="font-semibold">Low Confidence</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {groupedEvents.low.length}
                  </Badge>
                </div>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {groupedEvents.low.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isSelected={selectedEvents.has(event.id)}
                        onSelectChange={(selected) => handleSelectEvent(event.id, selected)}
                        onApprove={() => handleApprove(event)}
                        onEdit={() => handleEdit(event)}
                        onReject={() => handleReject(event)}
                        onAssign={() => handleAssignInspector(event)}
                        assignedInspector={eventAssignments.get(event.id)}
                      />
                    ))}
                    {groupedEvents.low.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No low confidence events
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="high" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.high.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onApprove={() => handleApprove(event)}
                  onEdit={() => handleEdit(event)}
                  onReject={() => handleReject(event)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="medium" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.medium.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onApprove={() => handleApprove(event)}
                  onEdit={() => handleEdit(event)}
                  onReject={() => handleReject(event)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="low" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedEvents.low.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onApprove={() => handleApprove(event)}
                  onEdit={() => handleEdit(event)}
                  onReject={() => handleReject(event)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {selectedEvent && (
        <EventEditDialog
          event={selectedEvent}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedEvent(null);
          }}
          onConfirm={handleConfirmEdit}
          builders={builders}
        />
      )}
      
      {assignmentDialogOpen && selectedEventForAssignment && (
        <InspectorAssignmentDialog
          open={assignmentDialogOpen}
          onClose={() => {
            setAssignmentDialogOpen(false);
            setSelectedEventForAssignment(null);
          }}
          jobId={selectedEventForAssignment.id}
          jobDetails={{
            name: selectedEventForAssignment.summary,
            address: selectedEventForAssignment.location || "TBD",
            scheduledDate: selectedEventForAssignment.startTime && !isNaN(Date.parse(selectedEventForAssignment.startTime))
              ? new Date(selectedEventForAssignment.startTime)
              : new Date(),
            inspectionType: selectedEventForAssignment.suggestedInspectionType || "standard",
            estimatedDuration: 120,
          }}
          onAssign={async (inspectorId) => {
            handleAssignmentComplete(inspectorId);
          }}
        />
      )}
    </div>
  );
}