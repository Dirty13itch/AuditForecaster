import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, WifiOff, WifiLow, 
  Battery, BatteryLow, BatteryWarning, BatteryCharging,
  CloudUpload, CloudOff, RefreshCw, AlertTriangle,
  MapPin, Navigation, Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useBatteryStatus, getBatteryColor } from "@/hooks/useBatteryStatus";
import { useNetworkQuality, formatLastSync, getNetworkColor } from "@/hooks/useNetworkQuality";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FieldStatusBarProps {
  className?: string;
  showCompact?: boolean;
  onManualSync?: () => void;
}

/**
 * Comprehensive status bar for field operations
 * Shows battery status, network quality, and sync status
 * Optimized for Samsung Galaxy S23 Ultra outdoor visibility
 */
export function FieldStatusBar({ 
  className, 
  showCompact = false,
  onManualSync
}: FieldStatusBarProps) {
  const haptic = useHapticFeedback();
  const [showDetails, setShowDetails] = useState(false);
  
  // Battery monitoring
  const {
    battery,
    batteryPercentage,
    batteryLevel,
    shouldSyncFull,
    shouldSyncCritical,
    shouldPauseSync
  } = useBatteryStatus();
  
  // Network monitoring
  const {
    online,
    quality,
    lastSyncTime,
    pendingSyncCount,
    isRemoteArea,
    triggerManualSync,
    isRetrying,
    retryCount
  } = useNetworkQuality();
  
  // Get battery icon based on level and charging state
  const getBatteryIcon = () => {
    if (battery?.charging) return <BatteryCharging className="h-4 w-4" />;
    if (batteryLevel === 'critical') return <BatteryWarning className="h-4 w-4" />;
    if (batteryLevel === 'low') return <BatteryLow className="h-4 w-4" />;
    return <Battery className="h-4 w-4" />;
  };
  
  // Get network icon based on quality
  const getNetworkIcon = () => {
    if (!online) return <WifiOff className="h-4 w-4" />;
    if (quality === 'poor' || quality === 'fair') return <WifiLow className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };
  
  // Get sync status color
  const getSyncStatusColor = () => {
    if (!online) return 'text-red-500';
    if (pendingSyncCount > 10) return 'text-orange-500';
    if (pendingSyncCount > 0) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  // Handle manual sync
  const handleManualSync = async () => {
    haptic.vibrate('medium');
    
    if (onManualSync) {
      onManualSync();
    } else {
      await triggerManualSync();
    }
  };
  
  if (showCompact) {
    // Compact mode for header integration
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Battery indicator */}
        <div className={cn("flex items-center gap-1", getBatteryColor(batteryPercentage))}>
          {getBatteryIcon()}
          <span className="text-xs font-medium">{batteryPercentage}%</span>
        </div>
        
        {/* Network indicator */}
        <div className={cn("flex items-center gap-1", getNetworkColor(quality))}>
          {getNetworkIcon()}
        </div>
        
        {/* Sync status */}
        {pendingSyncCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {pendingSyncCount}
          </Badge>
        )}
        
        {/* Manual sync button */}
        {online && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleManualSync}
            disabled={isRetrying}
            data-testid="button-manual-sync"
          >
            <RefreshCw className={cn(
              "h-3.5 w-3.5",
              isRetrying && "animate-spin"
            )} />
          </Button>
        )}
      </div>
    );
  }
  
  // Full mode with detailed status
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Field Status</CardTitle>
          {isRemoteArea && (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Remote Area
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Battery Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1", getBatteryColor(batteryPercentage))}>
                {getBatteryIcon()}
                <span className="text-sm font-medium">Battery</span>
              </div>
              {battery?.charging && (
                <Badge variant="secondary" className="text-xs">Charging</Badge>
              )}
            </div>
            <span className={cn("text-sm font-bold", getBatteryColor(batteryPercentage))}>
              {batteryPercentage}%
            </span>
          </div>
          <Progress value={batteryPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Sync mode: {shouldPauseSync ? 'Paused' : shouldSyncCritical ? 'Critical only' : 'Full sync'}
          </div>
        </div>
        
        {/* Network Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1", getNetworkColor(quality))}>
                {getNetworkIcon()}
                <span className="text-sm font-medium">Network</span>
              </div>
              {isRemoteArea && (
                <MapPin className="h-3 w-3 text-orange-500" />
              )}
            </div>
            <span className={cn("text-sm font-bold capitalize", getNetworkColor(quality))}>
              {quality}
            </span>
          </div>
          
          {/* Sync Queue */}
          {pendingSyncCount > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <CloudOff className={cn("h-4 w-4", getSyncStatusColor())} />
                <span className="text-sm">Pending sync</span>
              </div>
              <Badge variant="secondary">{pendingSyncCount} items</Badge>
            </div>
          )}
          
          {/* Last sync time */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last sync:</span>
            <span>{formatLastSync(lastSyncTime)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleManualSync}
            disabled={!online || isRetrying}
            data-testid="button-sync-now"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Syncing... ({retryCount})
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
                Sync Now
              </>
            )}
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-status-details"
              >
                Details
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Connection Details</h4>
                
                {/* Battery details */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Battery level:</span>
                    <span>{batteryPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{battery?.charging ? 'Charging' : 'On battery'}</span>
                  </div>
                  {battery?.dischargingTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time remaining:</span>
                      <span>{Math.round(battery.dischargingTime / 3600)}h</span>
                    </div>
                  )}
                </div>
                
                {/* Network details */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connection:</span>
                    <span className="capitalize">{quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remote area:</span>
                    <span>{isRemoteArea ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending sync:</span>
                    <span>{pendingSyncCount} items</span>
                  </div>
                </div>
                
                {/* Sync strategy */}
                <div className="pt-2 border-t">
                  <h5 className="text-xs font-medium mb-1">Current Sync Strategy</h5>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {shouldPauseSync ? (
                      <p>• Sync paused (battery critical)</p>
                    ) : shouldSyncCritical ? (
                      <>
                        <p>• Job status updates only</p>
                        <p>• Photos paused</p>
                        <p>• High compression enabled</p>
                      </>
                    ) : (
                      <>
                        <p>• Full sync enabled</p>
                        <p>• All data types syncing</p>
                        <p>• Normal compression</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Warnings */}
        <AnimatePresence>
          {batteryLevel === 'critical' && !battery?.charging && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-2 bg-destructive/10 text-destructive rounded-md"
            >
              <div className="flex items-center gap-2 text-xs">
                <BatteryWarning className="h-3.5 w-3.5" />
                <span>Battery critical - sync paused to save power</span>
              </div>
            </motion.div>
          )}
          
          {!online && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-2 bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-md"
            >
              <div className="flex items-center gap-2 text-xs">
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline - changes will sync when connected</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}