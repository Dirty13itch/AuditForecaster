import { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { formatDistanceToNow } from "date-fns";

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  className?: string;
}

export function AutoSaveIndicator({
  isSaving,
  lastSaved,
  error,
  className = "",
}: AutoSaveIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<number | null>(null);

  useEffect(() => {
    if (isSaving || error) {
      setIsVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
        setHideTimer(null);
      }
    } else if (lastSaved) {
      setIsVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      const timer = window.setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      setHideTimer(timer);
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isSaving, lastSaved, error]);

  if (!isVisible) {
    return null;
  }

  const getStatusBadge = () => {
    if (error) {
      return (
        <Badge variant="destructive" className={className} data-testid="badge-save-error">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error saving
        </Badge>
      );
    }

    if (isSaving) {
      return (
        <Badge variant="secondary" className={className} data-testid="badge-saving">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Saving...
        </Badge>
      );
    }

    if (lastSaved) {
      const timeAgo = formatDistanceToNow(lastSaved, { addSuffix: true });
      return (
        <Badge 
          variant="outline" 
          className={`bg-green-50 text-green-700 border-green-200 ${className}`}
          data-testid="badge-saved"
        >
          <Check className="h-3 w-3 mr-1" />
          {!isOnline ? (
            <>
              <Cloud className="h-3 w-3 mr-1" />
              Queued for sync
            </>
          ) : (
            `Saved ${timeAgo}`
          )}
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
    </div>
  );
}
