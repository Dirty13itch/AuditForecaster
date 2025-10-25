import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DevModeStatus {
  enabled: boolean;
  activeSession: boolean;
}

export function DevModeIndicator() {
  const { data: devModeStatus } = useQuery<DevModeStatus>({
    queryKey: ['/api/dev/status'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  // Only show if dev mode is enabled
  if (!devModeStatus?.enabled) {
    return null;
  }

  // Show warning badge if dev mode is enabled
  return (
    <Badge 
      variant="destructive" 
      className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 shadow-lg"
      data-testid="badge-dev-mode"
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="font-semibold">
        {devModeStatus.activeSession 
          ? '⚠️ DEV MODE - MOCK AUTH ACTIVE' 
          : '⚠️ DEV MODE ENABLED'}
      </span>
    </Badge>
  );
}
