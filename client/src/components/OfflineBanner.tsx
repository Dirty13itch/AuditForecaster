import { WifiOff, CloudUpload } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OfflineBanner() {
  const { isOnline, pendingSync } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <Alert className="border-warning bg-warning/10 mb-4" data-testid="alert-offline">
      <WifiOff className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning flex items-center gap-2">
        <span className="font-medium">You are currently offline.</span>
        {pendingSync > 0 && (
          <span className="flex items-center gap-1 text-sm">
            <CloudUpload className="h-3 w-3" />
            {pendingSync} {pendingSync === 1 ? 'change' : 'changes'} will sync when you're back online
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
