import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  WifiOff, 
  Wifi, 
  CloudUpload, 
  CloudCheck, 
  Loader2, 
  RefreshCw,
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncStatusBadge() {
  const { isOnline, pendingSync, isSyncing, forceSync } = useNetworkStatus();
  const { toast } = useToast();

  const handleForceSync = async () => {
    if (!isOnline) {
      toast({
        title: "Cannot sync",
        description: "You are currently offline. Changes will sync automatically when connection is restored.",
        variant: "destructive",
      });
      return;
    }

    if (isSyncing) {
      toast({
        title: "Sync in progress",
        description: "Please wait for the current sync to complete.",
      });
      return;
    }

    try {
      const result = await forceSync();
      
      if (result && (result.success > 0 || result.failed > 0)) {
        toast({
          title: "Sync complete",
          description: `Successfully synced ${result.success} items. ${result.failed > 0 ? `${result.failed} items failed.` : ''}`,
        });
      } else {
        toast({
          title: "Already synced",
          description: "All data is up to date.",
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "An error occurred while syncing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Determine badge variant and content
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let icon = <CloudCheck className="h-3.5 w-3.5" />;
  let label = "All synced";
  let showClickable = false;
  let pulseAnimation = false;

  if (!isOnline) {
    variant = "destructive";
    icon = <WifiOff className="h-3.5 w-3.5" />;
    label = pendingSync > 0 ? `Offline • ${pendingSync} pending` : "Offline";
    pulseAnimation = pendingSync > 0;
  } else if (isSyncing) {
    variant = "secondary";
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    label = "Syncing...";
  } else if (pendingSync > 0) {
    variant = "outline";
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    label = `${pendingSync} pending`;
    showClickable = true;
    pulseAnimation = true;
  }

  // Build tooltip content
  let tooltipContent = "";
  if (!isOnline) {
    tooltipContent = "You are offline. Changes will sync when connection is restored.";
  } else if (isSyncing) {
    tooltipContent = "Syncing your changes with the server...";
  } else if (pendingSync > 0) {
    tooltipContent = `${pendingSync} changes waiting to sync. Click to sync now.`;
  } else {
    tooltipContent = "All changes are synchronized.";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center",
              "min-h-12 px-2", // 48px minimum touch target
              "rounded-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              showClickable && "cursor-pointer hover-elevate active-elevate-2",
              !showClickable && "cursor-default"
            )}
            onClick={showClickable ? handleForceSync : undefined}
            disabled={!showClickable}
            data-testid="button-sync-status"
            type="button"
          >
            <Badge 
              variant={variant}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all",
                "h-9", // Visual height increased to 36px
                pulseAnimation && "animate-pulse",
                "pointer-events-none" // Badge itself not clickable, wrapper handles clicks
              )}
              data-testid="badge-sync-status"
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{pendingSync > 0 ? pendingSync : ""}</span>
              {showClickable && (
                <RefreshCw className="h-3.5 w-3.5 ml-0.5 hidden sm:inline-block" />
              )}
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Mobile-optimized version for smaller screens
export function MobileSyncStatusBadge() {
  const { isOnline, pendingSync, isSyncing, forceSync } = useNetworkStatus();
  const { toast } = useToast();
  
  const handleForceSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Connection will restore automatically.",
        variant: "destructive",
      });
      return;
    }

    if (isSyncing) return;

    try {
      const result = await forceSync();
      if (result && result.success > 0) {
        toast({
          title: "Synced",
          description: `${result.success} items synced`,
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        variant: "destructive",
      });
    }
  };
  
  // Simple icon-only indicator for mobile with 48px touch target
  if (!isOnline) {
    return (
      <button
        className="flex items-center justify-center min-w-12 min-h-12 rounded-full hover-elevate active-elevate-2"
        onClick={handleForceSync}
        data-testid="button-offline-mobile"
        type="button"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-destructive/10">
          <WifiOff className="h-5 w-5 text-destructive animate-pulse" data-testid="icon-offline-mobile" />
        </div>
      </button>
    );
  }
  
  if (isSyncing) {
    return (
      <div 
        className="flex items-center justify-center min-w-12 min-h-12 rounded-full"
        data-testid="container-syncing-mobile"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/10">
          <Loader2 className="h-5 w-5 text-secondary animate-spin" data-testid="icon-syncing-mobile" />
        </div>
      </div>
    );
  }
  
  if (pendingSync > 0) {
    return (
      <button
        className="relative flex items-center justify-center min-w-12 min-h-12 rounded-full hover-elevate active-elevate-2 cursor-pointer"
        onClick={handleForceSync}
        data-testid="button-pending-mobile"
        type="button"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-warning/10">
          <CloudUpload className="h-5 w-5 text-warning" data-testid="icon-pending-mobile" />
        </div>
        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[11px] font-bold text-warning-foreground">
          {pendingSync > 9 ? '9+' : pendingSync}
        </span>
      </button>
    );
  }
  
  return (
    <div 
      className="flex items-center justify-center min-w-12 min-h-12 rounded-full"
      data-testid="container-synced-mobile"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-success/10">
        <CloudCheck className="h-5 w-5 text-success" data-testid="icon-synced-mobile" />
      </div>
    </div>
  );
}