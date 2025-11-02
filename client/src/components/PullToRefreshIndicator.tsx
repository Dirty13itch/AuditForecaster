import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
  shouldRefresh: boolean;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  pullProgress,
  shouldRefresh,
}: PullToRefreshIndicatorProps) {
  // Calculate rotation based on pull progress
  const rotation = Math.min(pullProgress * 3.6, 360);
  
  // Calculate scale based on pull distance
  const scale = Math.min(pullDistance / 100, 1);
  
  // Determine the color based on state
  const indicatorColor = shouldRefresh ? 'text-primary' : 'text-muted-foreground';

  return (
    <AnimatePresence>
      {(isPulling || isRefreshing) && pullDistance > 0 && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div 
            className="flex justify-center"
            style={{
              transform: `translateY(${Math.min(pullDistance - 40, 60)}px)`,
              transition: isRefreshing ? 'transform 0.2s ease-out' : 'none',
            }}
          >
            <motion.div
              className={cn(
                "w-10 h-10 bg-background rounded-full shadow-lg flex items-center justify-center",
                shouldRefresh && !isRefreshing && "ring-2 ring-primary/20"
              )}
              animate={{
                scale: isRefreshing ? [1, 1.1, 1] : scale,
                rotate: isRefreshing ? 360 : rotation,
              }}
              transition={{
                scale: isRefreshing ? {
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {
                  duration: 0,
                },
                rotate: isRefreshing ? {
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                } : {
                  duration: 0,
                }
              }}
            >
              <RefreshCw 
                className={cn(
                  "w-5 h-5 transition-colors duration-200",
                  indicatorColor
                )}
              />
            </motion.div>
          </div>

          {/* Progress bar background */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted/20">
            <motion.div
              className="h-full bg-primary/50"
              initial={{ scaleX: 0 }}
              animate={{ 
                scaleX: isRefreshing ? 1 : pullProgress / 100,
              }}
              style={{
                originX: 0,
              }}
              transition={{
                duration: isRefreshing ? 2 : 0,
                ease: isRefreshing ? "linear" : "none"
              }}
            />
          </div>

          {/* Feedback text */}
          {!isRefreshing && pullDistance > 20 && (
            <motion.div
              className="absolute top-14 left-0 right-0 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-xs text-muted-foreground font-medium">
                {shouldRefresh ? 'Release to refresh' : 'Pull to refresh'}
              </p>
            </motion.div>
          )}

          {isRefreshing && (
            <motion.div
              className="absolute top-14 left-0 right-0 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-xs text-primary font-medium">
                Refreshing...
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}