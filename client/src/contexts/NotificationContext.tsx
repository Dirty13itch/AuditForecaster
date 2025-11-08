import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Notification, NotificationPreference } from "@shared/schema";
import { Bell, Check, Trophy, AlertCircle, Calendar, FileText } from "lucide-react";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference[];
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  updatePreferences: (preferences: Partial<NotificationPreference>) => void;
  requestDesktopPermission: () => Promise<void>;
  desktopPermission: NotificationPermission;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationIcons = {
  calibration_alert: AlertCircle,
  achievement_unlock: Trophy,
  inspection_milestone: Check,
  job_assigned: Calendar,
  report_ready: FileText,
  system: Bell,
};

const notificationColors = {
  calibration_alert: "text-warning",
  achievement_unlock: "text-success",
  inspection_milestone: "text-primary",
  job_assigned: "text-info",
  report_ready: "text-secondary",
  system: "text-muted-foreground",
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>("default");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const wsUnavailableRef = useRef(false);

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: isConnected ? false : 30000, // Poll every 30 seconds if not connected
  });

  // Fetch preferences
  const { data: preferences = [] } = useQuery<NotificationPreference[]>({
    queryKey: ["/api/notifications/preferences"],
    enabled: !!user,
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest("POST", `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest("DELETE", `/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<NotificationPreference>) => 
      apiRequest("PUT", "/api/notifications/preferences", preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });

  // Request desktop notification permission
  const requestDesktopPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setDesktopPermission(permission);
    }
  }, []);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: Notification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const preference = preferences.find(p => p.notificationType === notification.type);
      if (preference?.pushEnabled === false) return;

      const Icon = notificationIcons[notification.type];
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: notification.id,
        renotify: true,
        requireInteraction: notification.priority === "urgent",
      });
    }
  }, [preferences]);

  // Show toast notification
  const showToastNotification = useCallback((notification: Notification) => {
    const preference = preferences.find(p => p.notificationType === notification.type);
    if (preference?.inAppEnabled === false) return;

    const Icon = notificationIcons[notification.type];
    
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${notificationColors[notification.type]}`} />
          <span>{notification.title}</span>
        </div>
      ),
      description: notification.message,
      variant: notification.priority === "urgent" ? "destructive" : "default",
    });
  }, [toast, preferences]);

  // Handle incoming notification
  const handleNotification = useCallback((notification: Notification) => {
    // Add to local state immediately
    queryClient.setQueryData<Notification[]>(["/api/notifications"], (old = []) => {
      return [notification, ...old];
    });

    // Show notifications
    showToastNotification(notification);
    showDesktopNotification(notification);
  }, [showToastNotification, showDesktopNotification]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(() => {
      refetchNotifications();
    }, 30000); // Poll every 30 seconds
  }, [refetchNotifications]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = undefined;
    }
  }, []);

  // WebSocket connection management with exponential backoff
  const connectWebSocket = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    // If WebSocket is permanently unavailable, don't try to connect
    if (wsUnavailableRef.current) {
      startPolling();
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      wsUnavailableRef.current = true;
      startPolling();
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        wsUnavailableRef.current = false;
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Stop polling when WebSocket is connected
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification") {
            handleNotification(data.notification);
          } else if (data.type === "ping") {
            // Respond to ping
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          // Invalid WebSocket message format
        }
      };

      ws.onerror = (error) => {
        // WebSocket connection error
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Check if server indicates service is unavailable (code 1011)
        if (event.code === 1011) {
          wsUnavailableRef.current = true;
          startPolling();
          return;
        }
        
        // Increment reconnect attempts
        reconnectAttemptsRef.current++;
        
        // Calculate exponential backoff delay
        // First attempt: 1s, then 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
        
        // Attempt to reconnect with exponential backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      wsRef.current = ws;
    } catch (error) {
      setIsConnected(false);
      wsUnavailableRef.current = true;
      
      // Fall back to polling
      startPolling();
    }
  }, [user, handleNotification, startPolling, stopPolling]);

  // Initialize connection
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
    };
  }, [user, connectWebSocket, stopPolling]);

  // Check desktop notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    markAsRead: (id) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id) => deleteNotificationMutation.mutate(id),
    updatePreferences: (prefs) => updatePreferencesMutation.mutate(prefs),
    requestDesktopPermission,
    desktopPermission,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}