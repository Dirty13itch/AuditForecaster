import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OfflineAction {
  id: string;
  type: 'job_update' | 'photo_upload' | 'form_submit';
  timestamp: number;
  description: string;
}

export function EnhancedOfflineIndicator() {
  const { isOnline, wasOffline, connectionQuality } = useNetworkStatus();
  const haptic = useHapticFeedback();
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load queued actions from localStorage
  useEffect(() => {
    const loadQueuedActions = () => {
      const stored = localStorage.getItem('offline-queue');
      if (stored) {
        try {
          const actions = JSON.parse(stored);
          setQueuedActions(actions);
        } catch (error) {
          console.error('Failed to load offline queue:', error);
        }
      }
    };

    loadQueuedActions();
    
    // Listen for offline queue updates
    const handleQueueUpdate = (event: CustomEvent) => {
      setQueuedActions(event.detail);
    };

    window.addEventListener('offline-queue-update' as any, handleQueueUpdate);
    return () => window.removeEventListener('offline-queue-update' as any, handleQueueUpdate);
  }, []);

  // Handle online/offline transitions
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      haptic.vibrate('warning');
    } else if (wasOffline) {
      // Back online after being offline
      setShowBanner(true);
      haptic.vibrate('success');
      if (queuedActions.length > 0) {
        syncOfflineActions();
      }
      
      // Auto-hide banner after 5 seconds if online
      const timer = setTimeout(() => {
        if (isOnline) setShowBanner(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, queuedActions.length]);

  // Sync offline actions
  const syncOfflineActions = async () => {
    if (!isOnline || queuedActions.length === 0 || isSyncing) return;

    setIsSyncing(true);
    haptic.vibrate('medium');

    try {
      // Dispatch sync event to service worker
      const event = new CustomEvent('sync-offline-data', {
        detail: { actions: queuedActions }
      });
      window.dispatchEvent(event);

      // Simulate sync process (actual implementation would process each action)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear queue on success
      setQueuedActions([]);
      localStorage.removeItem('offline-queue');
      setLastSyncTime(new Date());
      
      haptic.vibrate('success');
    } catch (error) {
      console.error('Sync failed:', error);
      haptic.vibrate('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Get connection quality color
  const getConnectionColor = () => {
    if (!isOnline) return 'text-red-500';
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  // Calculate data freshness
  const getDataFreshness = () => {
    if (!lastSyncTime) return 'Never synced';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 5) return `${diffMins}m ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <>
      {/* Persistent status indicator in header */}
      <div className="flex items-center gap-2">
        {/* Connection status icon */}
        <div className={cn("transition-colors", getConnectionColor())}>
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
        </div>

        {/* Sync status badge */}
        {queuedActions.length > 0 && (
          <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
            {isSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                {queuedActions.length} pending
              </>
            )}
          </Badge>
        )}

        {/* Data freshness indicator */}
        {lastSyncTime && (
          <span className="text-xs text-muted-foreground">
            {getDataFreshness()}
          </span>
        )}
      </div>

      {/* Full-width banner for connection changes */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-0 right-0 z-50 px-4"
          >
            <Alert 
              className={cn(
                "mx-auto max-w-2xl",
                isOnline ? "border-green-500" : "border-orange-500"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Cloud className="h-4 w-4 text-green-500" />
                  ) : (
                    <CloudOff className="h-4 w-4 text-orange-500" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {isOnline ? 'Back Online' : 'Working Offline'}
                    </p>
                    <AlertDescription className="text-xs">
                      {isOnline 
                        ? queuedActions.length > 0 
                          ? `Syncing ${queuedActions.length} pending ${queuedActions.length === 1 ? 'action' : 'actions'}...`
                          : 'All data synced'
                        : 'Your changes will be saved and synced when connection is restored'
                      }
                    </AlertDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOnline && queuedActions.length > 0 && !isSyncing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={syncOfflineActions}
                      data-testid="button-sync-now"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync Now
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowBanner(false)}
                    data-testid="button-dismiss-banner"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue details popover (could be implemented as a dropdown) */}
      {queuedActions.length > 0 && (
        <div className="sr-only" aria-live="polite">
          {queuedActions.length} actions waiting to sync
        </div>
      )}
    </>
  );
}