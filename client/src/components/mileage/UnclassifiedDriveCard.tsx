import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { format, isToday, isYesterday } from 'date-fns';

interface UnclassifiedDriveCardProps {
  drive: {
    id: string;
    startLocation: string;
    endLocation: string;
    distance: number;
    startTimestamp: string;
    endTimestamp: string;
  };
  onClassify: (id: string, purpose: 'business' | 'personal') => void;
  onRemoveOptimistic: (id: string) => void;
}

export function UnclassifiedDriveCard({ drive, onClassify, onRemoveOptimistic }: UnclassifiedDriveCardProps) {
  // Note: Buttons added for accessibility - arrow key support could be added in future
  const distanceMiles = parseFloat(drive.distance.toString());
  const startTime = new Date(drive.startTimestamp);
  const endTime = new Date(drive.endTimestamp);
  const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  const formatDistance = (miles: number) => {
    return `${miles.toFixed(1)} mi`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handleSwipeRight = () => {
    onRemoveOptimistic(drive.id);
    onClassify(drive.id, 'business');
  };

  const handleSwipeLeft = () => {
    onRemoveOptimistic(drive.id);
    onClassify(drive.id, 'personal');
  };

  const { handlers, dragOffset, isDragging, swipeDirection } = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    threshold: 40,
  });

  const getOverlayOpacity = () => {
    const windowWidth = window.innerWidth;
    const progress = Math.min(Math.abs(dragOffset) / (windowWidth * 0.4), 1);
    return progress;
  };

  const shouldAnimate = Math.abs(dragOffset) > 0;

  return (
    <div className="relative select-none" data-testid={`card-unclassified-drive-${drive.id}`}>
      <motion.div
        className="relative z-10"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        animate={{
          x: isDragging ? dragOffset : 0,
          scale: isDragging ? 0.98 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        {...handlers}
        style={{ touchAction: 'pan-y' }}
      >
        <Card className="cursor-grab active:cursor-grabbing">
          <CardHeader className="gap-2 space-y-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium" data-testid="text-drive-timestamp">
                {formatTimestamp(startTime)}
              </CardTitle>
              <Badge variant="outline" data-testid="badge-drive-distance">
                <Navigation className="h-3 w-3 mr-1" />
                {formatDistance(distanceMiles)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2" data-testid="div-start-location">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm">{drive.startLocation || 'Unknown location'}</span>
              </div>
              <div className="flex items-start gap-2" data-testid="div-end-location">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm">{drive.endLocation || 'Unknown location'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm" data-testid="text-drive-duration">
                {formatDuration(durationSeconds)}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 justify-center pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClassify(drive.id, 'personal');
                onRemoveOptimistic(drive.id);
              }}
              data-testid={`button-classify-personal-${drive.id}`}
              className="flex-1"
            >
              Personal
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                onClassify(drive.id, 'business');
                onRemoveOptimistic(drive.id);
              }}
              data-testid={`button-classify-business-${drive.id}`}
              className="flex-1"
            >
              Business
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {shouldAnimate && swipeDirection === 'right' && (
        <motion.div
          className="absolute inset-0 z-0 rounded-lg bg-green-500/10 border-2 border-green-500 flex items-center justify-start px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: getOverlayOpacity() }}
          data-testid="overlay-business"
        >
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <span>Business</span>
            <ArrowRight className="h-5 w-5" />
          </div>
        </motion.div>
      )}

      {shouldAnimate && swipeDirection === 'left' && (
        <motion.div
          className="absolute inset-0 z-0 rounded-lg bg-blue-500/10 border-2 border-blue-500 flex items-center justify-end px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: getOverlayOpacity() }}
          data-testid="overlay-personal"
        >
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <ArrowLeft className="h-5 w-5" />
            <span>Personal</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
