import { useState } from "react";
import { Bell, Settings, Trash2, Check, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";
import { AlertCircle, Trophy, Calendar, FileText } from "lucide-react";

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

const priorityColors = {
  low: "bg-muted",
  medium: "bg-background",
  high: "bg-warning/10",
  urgent: "bg-destructive/10",
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onRead, onDelete }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type];
  const createdAt = new Date(notification.createdAt!);

  return (
    <div
      className={`flex gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
        !notification.isRead ? "bg-accent/20" : ""
      } ${priorityColors[notification.priority || "medium"]}`}
      onClick={() => !notification.isRead && onRead(notification.id)}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex-shrink-0 mt-1">
        <Icon className={`h-5 w-5 ${notificationColors[notification.type]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{notification.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              data-testid={`delete-notification-${notification.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isConnected,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  // Sort notifications by created date (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aDate = new Date(a.createdAt!).getTime();
    const bDate = new Date(b.createdAt!).getTime();
    return bDate - aDate;
  });

  // Get recent notifications (last 20)
  const recentNotifications = sortedNotifications.slice(0, 20);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell-button"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-warning rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllAsRead()}
                data-testid="mark-all-read-button"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsOpen(false);
                // Navigate to settings page
                window.location.href = "/settings#notifications";
              }}
              data-testid="notification-settings-button"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {recentNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = "/settings#notifications";
                }}
                data-testid="view-all-notifications-button"
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}