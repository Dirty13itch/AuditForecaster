import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Check, CheckCircle2, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import type { Job, Builder } from "@shared/schema";

// Job type display names
const JOB_TYPE_LABELS: Record<string, string> = {
  rough: "Rough Inspection",
  final: "Final Inspection",
  blower_door: "Blower Door Test",
  duct_leakage: "Duct Leakage Test",
  ventilation: "Ventilation Test",
};

// Status badge configurations
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  scheduled: { label: "Scheduled", variant: "secondary", color: "bg-blue-500" },
  done: { label: "Done", variant: "default", color: "bg-green-500" },
  failed: { label: "Failed", variant: "destructive", color: "bg-red-500" },
  reschedule: { label: "Reschedule", variant: "outline", color: "bg-orange-500" }
};

interface SwipeableFieldDayCardProps {
  job: Job & { builder?: Builder };
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onStatusUpdate?: (status: 'done' | 'reschedule') => void;
}

/**
 * Field Day job card with swipe gesture support
 * Swipe left = Mark as Done (green)
 * Swipe right = Reschedule (orange)
 */
export function SwipeableFieldDayCard({ 
  job, 
  isSelected, 
  onSelect, 
  onNavigate, 
  onStatusUpdate 
}: SwipeableFieldDayCardProps) {
  
  // Setup swipe gestures
  const swipeGesture = useSwipeGesture({
    onSwipeLeft: () => {
      if (onStatusUpdate && job.status !== 'done') {
        onStatusUpdate('done');
      }
    },
    onSwipeRight: () => {
      if (onStatusUpdate && job.status !== 'reschedule') {
        onStatusUpdate('reschedule');
      }
    },
    threshold: 25 // 25% of screen width threshold
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Ignore clicks during swipe
    if (swipeGesture.isDragging) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const cardWidth = rect.width;
    
    // Left 80% selects, right 20% navigates
    if (clickX < cardWidth * 0.8) {
      onSelect();
    } else {
      onNavigate();
    }
  };

  // Apply swipe transform for visual feedback
  const cardStyle = swipeGesture.isDragging 
    ? {
        transform: `translateX(${Math.min(100, Math.max(-100, swipeGesture.dragOffset))}px)`,
        opacity: 1 - Math.abs(swipeGesture.dragOffset) / 300,
        transition: 'none'
      }
    : {
        transition: 'transform 0.3s, opacity 0.3s'
      };

  // Show swipe indicators
  const showDoneIndicator = swipeGesture.isDragging && swipeGesture.swipeDirection === 'left' && Math.abs(swipeGesture.dragOffset) > 30;
  const showRescheduleIndicator = swipeGesture.isDragging && swipeGesture.swipeDirection === 'right' && Math.abs(swipeGesture.dragOffset) > 30;

  return (
    <div className="relative">
      {/* Background indicators during swipe */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Done indicator (swipe left) */}
        {showDoneIndicator && (
          <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 bg-gradient-to-l from-green-500/30 to-transparent rounded-lg">
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <span className="text-lg font-semibold text-green-600">Done</span>
            </div>
          </div>
        )}
        
        {/* Reschedule indicator (swipe right) */}
        {showRescheduleIndicator && (
          <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 bg-gradient-to-r from-orange-500/30 to-transparent rounded-lg">
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <CalendarClock className="h-6 w-6 text-orange-600" />
              <span className="text-lg font-semibold text-orange-600">Reschedule</span>
            </div>
          </div>
        )}
      </div>

      {/* Main card */}
      <Card 
        className={cn(
          "relative cursor-pointer transition-all bg-background",
          "hover-elevate active-elevate-2",
          isSelected && "ring-2 ring-primary ring-offset-2",
          swipeGesture.isDragging && "select-none"
        )}
        style={cardStyle}
        onClick={handleCardClick}
        {...swipeGesture.handlers}
        data-testid={`card-swipeable-job-${job.id}`}
      >
        {/* Selection checkmark */}
        {isSelected && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        
        <CardHeader className={cn("pb-3", isSelected && "pl-14")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold truncate" data-testid="text-builder-name">
                {job.builder?.name || job.builderName || "Unknown Builder"}
              </CardTitle>
              <CardDescription className="flex items-start gap-1 mt-1" data-testid="text-address">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{job.address}</span>
              </CardDescription>
            </div>
            {STATUS_CONFIG[job.status] && (
              <Badge 
                variant={STATUS_CONFIG[job.status].variant}
                data-testid={`badge-status-${job.id}`}
              >
                {STATUS_CONFIG[job.status].label}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn("space-y-3", isSelected && "pl-14")}>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" data-testid={`badge-job-type-${job.id}`}>
              {JOB_TYPE_LABELS[job.jobType] || job.jobType}
            </Badge>
            {job.pricing && (
              <Badge variant="outline" data-testid={`badge-pricing-${job.id}`}>
                ${parseFloat(job.pricing).toFixed(2)}
              </Badge>
            )}
          </div>

          {job.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-notes-${job.id}`}>
              {job.notes}
            </p>
          )}
          
          {/* Swipe hints */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" />
              Swipe for Done
            </span>
            <span>Tap right for details →</span>
            <span className="flex items-center gap-1">
              Reschedule
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}