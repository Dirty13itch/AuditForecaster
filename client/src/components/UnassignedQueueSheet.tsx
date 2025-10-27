import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from "lucide-react";
import type { PendingCalendarEvent, User } from "@shared/schema";

interface UnassignedQueueSheetProps {
  events: PendingCalendarEvent[];
  inspectors: User[];
  onAssign: (eventId: string, inspectorId: string) => void;
  isLoading?: boolean;
}

export function UnassignedQueueSheet({ events, inspectors, onAssign, isLoading }: UnassignedQueueSheetProps) {
  const [open, setOpen] = useState(false);

  // Filter only pending events
  const pendingEvents = events.filter(e => e.status === 'pending');

  return (
    <>
      {/* Floating action button */}
      <Button
        className="fixed bottom-20 right-4 rounded-full h-14 w-14 shadow-lg"
        onClick={() => setOpen(true)}
        data-testid="button-open-unassigned"
        size="icon"
      >
        {pendingEvents.length > 0 && (
          <Badge
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
            variant="destructive"
            data-testid="badge-fab-count"
          >
            {pendingEvents.length}
          </Badge>
        )}
        <Calendar className="h-6 w-6" />
      </Button>

      {/* Bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh]" data-testid="sheet-unassigned">
          <SheetHeader>
            <SheetTitle>Unassigned Events ({pendingEvents.length})</SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto space-y-3 mt-4 pb-4">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Loading events...
              </div>
            ) : pendingEvents.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8" data-testid="text-no-events-mobile">
                No unassigned events
              </div>
            ) : (
              pendingEvents.map((event) => (
                <Card key={event.id} className="p-4" data-testid={`event-card-mobile-${event.id}`}>
                  <h4 className="font-semibold text-base" data-testid={`text-event-title-mobile-${event.id}`}>
                    {event.rawTitle}
                  </h4>

                  {event.parsedJobType && (
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-event-type-mobile-${event.id}`}>
                      {event.parsedJobType}
                    </p>
                  )}

                  {event.parsedBuilderName && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-event-builder-mobile-${event.id}`}>
                      {event.parsedBuilderName}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mt-1" data-testid={`text-event-date-mobile-${event.id}`}>
                    {format(new Date(event.eventDate), 'MMM d, h:mm a')}
                  </p>

                  {event.confidenceScore !== null && event.confidenceScore !== undefined && (
                    <div className="mt-2">
                      <Badge variant={event.confidenceScore >= 80 ? "default" : "secondary"} className="text-xs">
                        {event.confidenceScore}% match
                      </Badge>
                    </div>
                  )}

                  {/* Touch-friendly assign buttons (48px min height for outdoor use) */}
                  <div className="flex gap-2 mt-3">
                    {inspectors.map(inspector => (
                      <Button
                        key={inspector.id}
                        className="flex-1 min-h-12"
                        onClick={() => {
                          onAssign(event.id, inspector.id);
                          setOpen(false);
                        }}
                        data-testid={`button-assign-${inspector.id}-${event.id}`}
                      >
                        Assign to {inspector.firstName || inspector.email}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
