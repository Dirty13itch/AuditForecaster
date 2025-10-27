import { useState, useEffect } from 'react';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { syncQueue, forceSyncNow } from '@/utils/syncQueue';
import { indexedDB } from '@/utils/indexedDB';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncQueueItem {
  id: string;
  entityType: string;
  operation: string;
  priority: string;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
}

export function OfflineIndicator() {
  const { toast } = useToast();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();
  
  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  
  // Subscribe to sync events
  useEffect(() => {
    const updateState = () => {
      const state = syncQueue.getState();
      setIsOnline(state.isOnline);
      setIsSyncing(state.isSyncing);
      setSyncProgress(state.syncProgress);
      setQueueSize(state.queueSize);
      setLastSyncTime(state.lastSyncAt);
      setSyncError(state.syncError);
    };
    
    // Initial state
    updateState();
    
    // Subscribe to sync events
    const unsubscribe = syncQueue.subscribe((event) => {
      switch (event.type) {
        case 'online-status-changed':
          setIsOnline(event.isOnline);
          if (event.isOnline) {
            toast({
              title: 'Back Online',
              description: 'Connection restored. Syncing data...',
              duration: 3000,
            });
          } else {
            toast({
              title: 'Offline Mode',
              description: 'Working offline. Changes will sync when reconnected.',
              variant: 'destructive',
              duration: 5000,
            });
          }
          break;
          
        case 'sync-started':
          setIsSyncing(true);
          setSyncProgress(0);
          setSyncError(null);
          break;
          
        case 'sync-progress':
          setSyncProgress(event.progress);
          break;
          
        case 'sync-completed':
          setIsSyncing(false);
          setSyncProgress(0);
          setLastSyncTime(new Date());
          
          if (event.synced > 0) {
            toast({
              title: 'Sync Complete',
              description: `Successfully synced ${event.synced} items${event.failed > 0 ? `, ${event.failed} failed` : ''}`,
              duration: 3000,
            });
          }
          break;
          
        case 'sync-error':
          setIsSyncing(false);
          setSyncProgress(0);
          setSyncError(event.error);
          
          toast({
            title: 'Sync Failed',
            description: event.error,
            variant: 'destructive',
            duration: 5000,
          });
          break;
          
        case 'queue-updated':
          setQueueSize(event.size);
          break;
          
        case 'conflict-detected':
          toast({
            title: 'Sync Conflict Detected',
            description: 'Please review and resolve conflicts',
            variant: 'destructive',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/conflicts'}
              >
                View Conflicts
              </Button>
            ),
          });
          break;
      }
      
      updateState();
    });
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);
  
  // Load queue items when dialog opens
  useEffect(() => {
    if (showDetails) {
      loadQueueItems();
      loadStorageStats();
    }
  }, [showDetails]);
  
  const loadQueueItems = async () => {
    const items = await syncQueue.getQueueItems();
    setQueueItems(items);
  };
  
  const loadStorageStats = async () => {
    const stats = await indexedDB.getStorageStats();
    setStorageStats(stats);
  };
  
  const handleForceSync = async () => {
    try {
      await forceSyncNow();
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const handleClearQueue = async () => {
    const confirmed = await showConfirm(
      'Clear Sync Queue',
      'Are you sure you want to clear the sync queue? This will delete all pending changes.',
      {
        confirmText: 'Clear Queue',
        cancelText: 'Cancel',
        variant: 'destructive'
      }
    );
    if (!confirmed) {
      return;
    }
    
    try {
      await syncQueue.clearQueue();
      setQueueItems([]);
      toast({
        title: 'Queue Cleared',
        description: 'All pending sync items have been removed',
      });
    } catch (error) {
      toast({
        title: 'Failed to Clear Queue',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const handleClearCache = async () => {
    const confirmed = await showConfirm(
      'Clear All Cached Data',
      'Are you sure you want to clear all cached data? This may affect offline functionality.',
      {
        confirmText: 'Clear Cache',
        cancelText: 'Cancel',
        variant: 'destructive'
      }
    );
    if (!confirmed) {
      return;
    }
    
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear IndexedDB
      await indexedDB.clearAllData();
      
      toast({
        title: 'Cache Cleared',
        description: 'All offline data has been removed',
      });
      
      // Reload to reinitialize
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Failed to Clear Cache',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  // Determine indicator state
  const getIndicatorState = () => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (syncError) return 'error';
    if (queueSize > 0) return 'pending';
    return 'online';
  };
  
  const state = getIndicatorState();
  
  return (
    <div className="flex items-center gap-2">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {state === 'offline' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline</span>
          </div>
        )}
        
        {state === 'syncing' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500 text-white rounded-full">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing...</span>
            {syncProgress > 0 && (
              <span className="text-xs">({syncProgress}%)</span>
            )}
          </div>
        )}
        
        {state === 'error' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Sync Error</span>
          </div>
        )}
        
        {state === 'pending' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-500 text-white rounded-full">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{queueSize} Pending</span>
          </div>
        )}
        
        {state === 'online' && (
          <div className="flex items-center gap-1">
            <div className="relative">
              <Wifi className="h-4 w-4 text-green-500" />
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>
      
      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-testid="button-sync-details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sync Status & Details</DialogTitle>
            <DialogDescription>
              Manage offline data and synchronization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Connection</div>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Offline</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Last Sync</div>
                <div className="font-medium">
                  {lastSyncTime ? format(lastSyncTime, 'PPp') : 'Never'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Queue Size</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{queueSize} items</span>
                  {queueSize > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Storage Used</div>
                <div className="font-medium">
                  {storageStats?.estimatedSize 
                    ? `${(storageStats.estimatedSize / 1024 / 1024).toFixed(2)} MB`
                    : 'Unknown'}
                </div>
              </div>
            </div>
            
            {/* Sync Progress */}
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Syncing...</span>
                  <span>{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
            
            {/* Error Message */}
            {syncError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-800">{syncError}</span>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Queue Items */}
            {queueItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Pending Items</h4>
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <div className="space-y-2">
                    {queueItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.entityType}
                            </Badge>
                            <span className="text-sm font-medium">
                              {item.operation}
                            </span>
                            <Badge
                              variant={
                                item.priority === 'critical' ? 'destructive' :
                                item.priority === 'normal' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {item.priority}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(item.timestamp), 'PPp')}
                            {item.retryCount > 0 && (
                              <span className="ml-2">
                                (Retry {item.retryCount})
                              </span>
                            )}
                          </div>
                          {item.lastError && (
                            <div className="text-xs text-red-500">
                              {item.lastError}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Storage Stats */}
            {storageStats && (
              <div className="space-y-2">
                <h4 className="font-medium">Storage Statistics</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border p-2">
                    <div className="text-muted-foreground">Jobs</div>
                    <div className="font-medium">{storageStats.jobs}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-muted-foreground">Photos</div>
                    <div className="font-medium">{storageStats.photos}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-muted-foreground">Reports</div>
                    <div className="font-medium">{storageStats.reports}</div>
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {isOnline && !isSyncing && queueSize > 0 && (
                <Button
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  data-testid="button-force-sync"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              )}
              
              {queueSize > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearQueue}
                  disabled={isSyncing}
                  data-testid="button-clear-queue"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Queue
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleClearCache}
                disabled={isSyncing}
                data-testid="button-clear-cache"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Cache
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/conflicts'}
                data-testid="button-view-conflicts"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                View Conflicts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}