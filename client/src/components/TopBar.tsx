import { Menu, Wifi, WifiOff, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
  isOnline?: boolean;
  pendingSync?: number;
}

export default function TopBar({ title, onMenuClick, isOnline = true, pendingSync = 0 }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground border-b border-primary-border z-50">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10"
              onClick={onMenuClick}
              data-testid="button-menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <h1 className="text-lg font-semibold truncate" data-testid="text-title">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-2" data-testid="status-online">
              <Wifi className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2" data-testid="status-offline">
              <WifiOff className="h-5 w-5 text-warning" />
              <span className="text-sm hidden sm:inline">Offline</span>
              {pendingSync > 0 && (
                <Badge variant="secondary" className="bg-warning text-warning-foreground" data-testid="badge-pending-sync">
                  <CloudUpload className="h-3 w-3 mr-1" />
                  {pendingSync}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
