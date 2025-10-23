import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CalendarItem {
  id: string;
  summary: string;
  description?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  accessRole?: string | null;
  primary?: boolean | null;
  isEnabled: boolean;
}

export function CalendarLayersPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();
  
  const { data: calendars, isLoading } = useQuery<CalendarItem[]>({
    queryKey: ['/api/google-calendars/list'],
  });
  
  const toggleMutation = useMutation({
    mutationFn: async ({ calendarId, isEnabled }: { calendarId: string; isEnabled: boolean }) => {
      const response = await apiRequest('PATCH', `/api/calendar-preferences/${encodeURIComponent(calendarId)}/toggle`, { isEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendars/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
    },
    onError: () => {
      toast({ title: 'Failed to update calendar', variant: 'destructive' });
    },
  });
  
  const handleToggle = (calendarId: string, currentState: boolean) => {
    toggleMutation.mutate({ calendarId, isEnabled: !currentState });
  };
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">Loading calendars...</div>
      </div>
    );
  }
  
  if (!calendars || calendars.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">No calendars found</div>
      </div>
    );
  }
  
  return (
    <div className="border-b pb-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full px-2 py-1 text-sm font-medium hover-elevate rounded-md"
        data-testid="button-toggle-calendars"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span>My calendars</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {calendars.map(calendar => (
            <div
              key={calendar.id}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover-elevate"
              data-testid={`calendar-item-${calendar.id}`}
            >
              <Checkbox
                checked={calendar.isEnabled}
                onCheckedChange={() => handleToggle(calendar.id, calendar.isEnabled)}
                data-testid={`checkbox-calendar-${calendar.id}`}
              />
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                data-testid={`color-dot-${calendar.id}`}
              />
              <span className="text-sm truncate" title={calendar.summary}>
                {calendar.summary}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
