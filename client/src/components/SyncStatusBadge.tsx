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

  const BadgeContent = (
    <Badge 
      variant={variant}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all",
        "h-7", // Fixed height for consistency
        showClickable && "cursor-pointer hover-elevate active-elevate-2",
        pulseAnimation && "animate-pulse"
      )}
      onClick={showClickable ? handleForceSync : undefined}
      data-testid="badge-sync-status"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{pendingSync > 0 ? pendingSync : ""}</span>
      {showClickable && (
        <RefreshCw className="h-3 w-3 ml-0.5 hidden sm:inline-block" />
      )}
    </Badge>
  );

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
          {BadgeContent}
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
  const { isOnline, pendingSync, isSyncing } = useNetworkStatus();
  
  // Simple icon-only indicator for mobile
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10">
        <WifiOff className="h-4 w-4 text-destructive animate-pulse" data-testid="icon-offline-mobile" />
      </div>
    );
  }
  
  if (isSyncing) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10">
        <Loader2 className="h-4 w-4 text-secondary animate-spin" data-testid="icon-syncing-mobile" />
      </div>
    );
  }
  
  if (pendingSync > 0) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-warning/10">
        <CloudUpload className="h-4 w-4 text-warning" data-testid="icon-pending-mobile" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">
          {pendingSync > 9 ? '9+' : pendingSync}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10">
      <CloudCheck className="h-4 w-4 text-success" data-testid="icon-synced-mobile" />
    </div>
  );
}