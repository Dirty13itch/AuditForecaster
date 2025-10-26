import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/queryClient";

export default function NotificationTest() {
  const { toast } = useToast();
  const { notifications } = useNotifications();

  const sendTestNotifications = async () => {
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
  };

  const sendCustomNotification = async () => {
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
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Notification System Test</CardTitle>
          <CardDescription>
            Test the real-time notification system with various notification types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Actions</h3>
            <div className="flex gap-4">
              <Button onClick={sendTestNotifications} data-testid="button-send-test">
                Send Test Notifications
              </Button>
              <Button onClick={sendCustomNotification} variant="secondary" data-testid="button-send-custom">
                Send Custom Notification
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Notifications ({notifications.length})</h3>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications yet. Click the buttons above to generate some!</p>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <Card key={notif.id} className={notif.read ? "opacity-60" : ""}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{notif.title}</CardTitle>
                          <CardDescription className="text-xs mt-1">{notif.message}</CardDescription>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          notif.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                          notif.priority === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" :
                          notif.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}>
                          {notif.priority}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">How to Test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Send Test Notifications" to generate various types of notifications</li>
              <li>Look for the bell icon in the header - it should show an unread count</li>
              <li>Click the bell icon to see the notification center dropdown</li>
              <li>Watch for toast notifications appearing in the bottom-right corner</li>
              <li>Allow browser notifications when prompted to receive desktop notifications</li>
              <li>Click notifications in the dropdown to mark them as read</li>
              <li>Access preferences from the notification center to customize which types you receive</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}