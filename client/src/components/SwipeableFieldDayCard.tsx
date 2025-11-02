import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Check, CheckCircle2, CalendarClock, ChevronLeft, ChevronRight, Sparkles, Navigation, Wifi, WifiOff, CloudUpload, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cardAppear, popIn } from "@/lib/animations";
import { formatCoordinates, navigateToLocation } from "@/hooks/useGeolocation";
import { formatLastSync } from "@/hooks/useNetworkQuality";
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
  syncStatus?: {
    isSynced: boolean;
    lastSync: Date | null;
    pendingChanges: number;
  };
  networkQuality?: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
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
  onStatusUpdate,
  syncStatus,
  networkQuality = 'good'
}: SwipeableFieldDayCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const haptic = useHapticFeedback();
  const [isUpdating, setIsUpdating] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  
  // Setup swipe gestures with haptic feedback
  const swipeGesture = useSwipeGesture({
    onSwipeLeft: () => {
      if (onStatusUpdate && job.status !== 'done') {
        setIsUpdating(true);
        setJustCompleted(true);
        // Swipe haptic pattern for action
        haptic.vibrate('swipe');
        onStatusUpdate('done');
        // Reset states after animation
        setTimeout(() => {
          setIsUpdating(false);
          setJustCompleted(false);
        }, 1500);
      }
    },
    onSwipeRight: () => {
      if (onStatusUpdate && job.status !== 'reschedule') {
        setIsUpdating(true);
        // Swipe haptic pattern for action
        haptic.vibrate('swipe');
        onStatusUpdate('reschedule');
        setTimeout(() => setIsUpdating(false), 500);
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
      // Selection haptic feedback
      haptic.vibrate('selection');
      onSelect();
    } else {
      // Light tap for navigation
      haptic.vibrate('light');
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
    <motion.div 
      className="relative"
      variants={cardAppear}
      initial="hidden"
      animate="visible"
      layout
    >
      {/* Completion celebration particles */}
      <AnimatePresence>
        {justCompleted && !shouldReduceMotion && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Background indicators during swipe */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Done indicator (swipe left) */}
        <AnimatePresence>
          {showDoneIndicator && (
            <motion.div 
              className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 bg-gradient-to-l from-green-500/30 to-transparent rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="flex items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-green-600">Done</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Reschedule indicator (swipe right) */}
        <AnimatePresence>
          {showRescheduleIndicator && (
            <motion.div 
              className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 bg-gradient-to-r from-orange-500/30 to-transparent rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="flex items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CalendarClock className="h-6 w-6 text-orange-600" />
                <span className="text-lg font-semibold text-orange-600">Reschedule</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main card */}
      <motion.div
        animate={isUpdating && !shouldReduceMotion ? {
          scale: [1, 1.02, 1],
          transition: { duration: 0.3 }
        } : {}}
      >
        <Card 
          className={cn(
            "relative cursor-pointer transition-all bg-background",
            "hover-elevate active-elevate-2",
            isSelected && "ring-2 ring-primary ring-offset-2",
            swipeGesture.isDragging && "select-none",
            justCompleted && "border-success shadow-lg shadow-success/20"
          )}
          style={cardStyle}
          onClick={handleCardClick}
          {...swipeGesture.handlers}
          data-testid={`card-swipeable-job-${job.id}`}
        >
          {/* Selection checkmark with animation */}
          <AnimatePresence>
            {isSelected && (
              <motion.div 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                variants={popIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Check className="h-5 w-5 text-primary-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        
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
              <motion.div
                animate={isUpdating ? {
                  scale: [1, 1.1, 1],
                  transition: { duration: 0.3 }
                } : {}}
              >
                <Badge 
                  variant={STATUS_CONFIG[job.status].variant}
                  data-testid={`badge-status-${job.id}`}
                >
                  {STATUS_CONFIG[job.status].label}
                </Badge>
              </motion.div>
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
          
          {/* Location and sync status row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {/* Location info */}
            <div className="flex items-center gap-2">
              {job.latitude && job.longitude ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.vibrate('light');
                      navigateToLocation(job.latitude!, job.longitude!, job.address);
                    }}
                    data-testid={`button-navigate-${job.id}`}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Navigate
                  </Button>
                  {job.locationAccuracy && (
                    <span className="text-muted-foreground">
                      ±{Math.round(job.locationAccuracy)}m
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  No GPS data
                </span>
              )}
            </div>
            
            {/* Sync status */}
            <div className="flex items-center gap-2">
              {networkQuality === 'offline' ? (
                <WifiOff className="h-3 w-3 text-red-500" />
              ) : (
                <Wifi className={cn(
                  "h-3 w-3",
                  networkQuality === 'excellent' && "text-green-500",
                  networkQuality === 'good' && "text-blue-500",
                  networkQuality === 'fair' && "text-yellow-500",
                  networkQuality === 'poor' && "text-orange-500"
                )} />
              )}
              
              {syncStatus && (
                <>
                  {syncStatus.isSynced ? (
                    <CloudUpload className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <CloudOff className="h-3 w-3 text-orange-500" />
                      {syncStatus.pendingChanges > 0 && (
                        <span className="text-orange-500 font-medium">
                          {syncStatus.pendingChanges}
                        </span>
                      )}
                    </div>
                  )}
                  {syncStatus.lastSync && (
                    <span className="text-muted-foreground">
                      {formatLastSync(syncStatus.lastSync)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Swipe hints */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
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
      </motion.div>
    </motion.div>
  );
}