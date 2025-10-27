import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { PendingCalendarEvent, User } from "@shared/schema";

interface UnassignedQueueProps {
  events: PendingCalendarEvent[];
  inspectors: User[];
  onAssign: (eventId: string, inspectorId: string) => void;
  onBulkAssign?: (eventIds: string[], inspectorId: string) => void;
  isLoading?: boolean;
}

export function UnassignedQueue({ events, inspectors, onAssign, onBulkAssign, isLoading }: UnassignedQueueProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter only pending events
  const pendingEvents = events.filter(e => e.status === 'pending');

  const handleBulkAssign = (inspectorId: string) => {
    if (onBulkAssign && selectedIds.size > 0) {
      onBulkAssign(Array.from(selectedIds), inspectorId);
      setSelectedIds(new Set());
      setBulkMode(false);
    }
  };

  const toggleSelection = (eventId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(eventId);
    } else {
      newSet.delete(eventId);
    }
    setSelectedIds(newSet);
  };

  return (
    <div className="w-80 border-l bg-muted/30 overflow-y-auto" data-testid="unassigned-queue">
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Unassigned Events</h3>
          <Badge variant="secondary" data-testid="badge-unassigned-count">
            {pendingEvents.length}
          </Badge>
        </div>
        {pendingEvents.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBulkMode(!bulkMode);
              if (bulkMode) {
                setSelectedIds(new Set());
              }
            }}
            data-testid="button-bulk-mode"
            className="w-full"
          >
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
          </Button>
        )}
      </div>

      <div className="p-2 space-y-2">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading events...
          </div>
        ) : pendingEvents.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8" data-testid="text-no-events">
            No unassigned events
          </div>
        ) : (
          pendingEvents.map((event) => (
            <Card key={event.id} className="p-3" data-testid={`event-card-${event.id}`}>
              {bulkMode && (
                <div className="mb-2">
                  <Checkbox
                    checked={selectedIds.has(event.id)}
                    onCheckedChange={(checked) => toggleSelection(event.id, checked as boolean)}
                    data-testid={`checkbox-${event.id}`}
                  />
                </div>
              )}

              <h4 className="font-medium text-sm line-clamp-2" data-testid={`text-event-title-${event.id}`}>
                {event.rawTitle}
              </h4>

              {event.parsedJobType && (
                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-event-type-${event.id}`}>
                  {event.parsedJobType}
                </p>
              )}

              {event.parsedBuilderName && (
                <p className="text-xs text-muted-foreground" data-testid={`text-event-builder-${event.id}`}>
                  {event.parsedBuilderName}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-event-date-${event.id}`}>
                {format(new Date(event.eventDate), 'MMM d, h:mm a')}
              </p>

              {event.confidenceScore !== null && event.confidenceScore !== undefined && (
                <div className="mt-1">
                  <Badge variant={event.confidenceScore >= 80 ? "default" : "secondary"} className="text-xs">
                    {event.confidenceScore}% match
                  </Badge>
                </div>
              )}

              {!bulkMode && (
                <div className="flex gap-1 mt-3">
                  {inspectors.map(inspector => (
                    <Button
                      key={inspector.id}
                      size="sm"
                      onClick={() => onAssign(event.id, inspector.id)}
                      className="flex-1"
                      data-testid={`button-assign-${inspector.id}-${event.id}`}
                    >
                      {inspector.firstName?.[0] || inspector.email?.[0] || '?'}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {bulkMode && selectedIds.size > 0 && (
        <div className="sticky bottom-0 p-4 bg-background border-t">
          <div className="flex flex-col gap-2">
            <Badge className="self-center" data-testid="badge-selected-count">
              {selectedIds.size} selected
            </Badge>
            <div className="flex flex-col gap-2">
              {inspectors.map(inspector => (
                <Button
                  key={inspector.id}
                  onClick={() => handleBulkAssign(inspector.id)}
                  data-testid={`button-bulk-assign-${inspector.id}`}
                >
                  Assign to {inspector.firstName} {inspector.lastName}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
