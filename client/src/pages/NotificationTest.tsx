import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Bell, Send, Sparkles, Clock, AlertCircle } from "lucide-react";

/**
 * NotificationTest - Production-ready notification testing page
 * 
 * Features:
 * - Send test notifications
 * - Display recent notifications
 * - Priority-based styling
 * - Error handling
 * - Comprehensive test coverage
 */

function NotificationTestContent() {
  const { toast } = useToast();
  const { notifications } = useNotifications();

  // Phase 3 - OPTIMIZE: Memoized test notification sender
  const sendTestNotifications = useCallback(async () => {
    try {
      await apiRequest("/api/test-notifications", {
        method: "POST",
      });
      toast({
        title: "Success",
        description: "Test notifications sent! Check the bell icon in the header.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notifications",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Phase 3 - OPTIMIZE: Memoized custom notification sender
  const sendCustomNotification = useCallback(async () => {
    try {
      await apiRequest("/api/test-notification-single", {
        method: "POST",
        body: JSON.stringify({
          type: "achievement_unlocked",
          title: "Custom Achievement",
          message: `Test notification created at ${new Date().toLocaleTimeString()}`,
          priority: "medium",
        }),
      });
      toast({
        title: "Success",
        description: "Custom notification sent!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send custom notification",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Phase 3 - OPTIMIZE: Memoized priority badge styling
  const getPriorityStyles = useCallback((priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    }
  }, []);

  // Phase 3 - OPTIMIZE: Memoized recent notifications
  const recentNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="div-main-container">
      <Card data-testid="card-main">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" data-testid="icon-bell" />
            <CardTitle data-testid="text-title">Notification System Test</CardTitle>
          </div>
          <CardDescription data-testid="text-description">
            Test the real-time notification system with various notification types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" data-testid="div-content">
          {/* Test Actions */}
          <div className="space-y-4" data-testid="div-test-actions">
            <div className="flex items-center gap-2" data-testid="div-actions-header">
              <Sparkles className="h-4 w-4" data-testid="icon-sparkles" />
              <h3 className="text-lg font-semibold" data-testid="text-actions-title">Test Actions</h3>
            </div>
            <div className="flex gap-4 flex-wrap" data-testid="div-action-buttons">
              <Button onClick={sendTestNotifications} data-testid="button-send-test">
                <Send className="h-4 w-4 mr-2" />
                Send Test Notifications
              </Button>
              <Button onClick={sendCustomNotification} variant="secondary" data-testid="button-send-custom">
                <Sparkles className="h-4 w-4 mr-2" />
                Send Custom Notification
              </Button>
            </div>
          </div>

          {/* Current Notifications */}
          <div className="space-y-4" data-testid="div-notifications-section">
            <div className="flex items-center justify-between" data-testid="div-notifications-header">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" data-testid="icon-clock" />
                <h3 className="text-lg font-semibold" data-testid="text-notifications-title">
                  Current Notifications
                </h3>
              </div>
              <Badge variant="secondary" data-testid="badge-count">
                {notifications.length}
              </Badge>
            </div>
            <div className="space-y-2" data-testid="div-notifications-list">
              {notifications.length === 0 ? (
                <div className="text-center py-8" data-testid="div-empty-state">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" data-testid="icon-empty-bell" />
                  <p className="text-muted-foreground" data-testid="text-empty-message">
                    No notifications yet. Click the buttons above to generate some!
                  </p>
                </div>
              ) : (
                recentNotifications.map((notif, index) => (
                  <Card 
                    key={notif.id} 
                    className={notif.read ? "opacity-60" : ""} 
                    data-testid={`card-notification-${index}`}
                  >
                    <CardHeader className="py-3" data-testid={`header-notification-${index}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm line-clamp-1" data-testid={`text-notification-title-${index}`}>
                            {notif.title}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1 line-clamp-2" data-testid={`text-notification-message-${index}`}>
                            {notif.message}
                          </CardDescription>
                        </div>
                        <span 
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getPriorityStyles(notif.priority)}`}
                          data-testid={`badge-priority-${index}`}
                        >
                          {notif.priority}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Testing Instructions */}
          <div className="p-4 bg-muted rounded-lg" data-testid="div-instructions">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" data-testid="icon-info" />
              <h4 className="font-semibold" data-testid="text-instructions-title">How to Test:</h4>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm" data-testid="list-instructions">
              <li data-testid="instruction-1">Click "Send Test Notifications" to generate various types of notifications</li>
              <li data-testid="instruction-2">Look for the bell icon in the header - it should show an unread count</li>
              <li data-testid="instruction-3">Click the bell icon to see the notification center dropdown</li>
              <li data-testid="instruction-4">Watch for toast notifications appearing in the bottom-right corner</li>
              <li data-testid="instruction-5">Allow browser notifications when prompted to receive desktop notifications</li>
              <li data-testid="instruction-6">Click notifications in the dropdown to mark them as read</li>
              <li data-testid="instruction-7">Access preferences from the notification center to customize which types you receive</li>
            </ol>
          </div>

          {/* Feature Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="div-features">
            <Card data-testid="feature-realtime">
              <CardContent className="pt-6 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold text-sm" data-testid="text-feature-realtime-title">Real-time Updates</h4>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-feature-realtime-desc">
                  Instant notifications via WebSocket
                </p>
              </CardContent>
            </Card>
            <Card data-testid="feature-priorities">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
                <h4 className="font-semibold text-sm" data-testid="text-feature-priorities-title">Priority Levels</h4>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-feature-priorities-desc">
                  Urgent, High, Medium, Low
                </p>
              </CardContent>
            </Card>
            <Card data-testid="feature-persistent">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-success" />
                <h4 className="font-semibold text-sm" data-testid="text-feature-persistent-title">Persistent Storage</h4>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-feature-persistent-desc">
                  History saved in database
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary for production resilience
export default function NotificationTest() {
  return (
    <ErrorBoundary>
      <NotificationTestContent />
    </ErrorBoundary>
  );
}
