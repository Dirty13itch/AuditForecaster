import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { csrfSynchronisedProtection } from "./csrf";
import { insertNotificationSchema, insertNotificationPreferenceSchema } from "@shared/schema";
import { serverLogger } from "./logger";
import { z } from "zod";
import {
  sendCalibrationAlert,
  sendAchievementUnlock,
  sendInspectionMilestone,
  sendJobAssignedNotification,
  sendReportReadyNotification,
} from "./websocket";

export function registerNotificationRoutes(app: Express) {
  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      serverLogger.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json({ count: notifications.length, notifications });
    } catch (error) {
      serverLogger.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify the notification belongs to the user
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updated = await storage.markNotificationAsRead(id);
      res.json(updated);
    } catch (error) {
      serverLogger.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      serverLogger.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify the notification belongs to the user
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const deleted = await storage.deleteNotification(id);
      res.json({ deleted });
    } catch (error) {
      serverLogger.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Get notification preferences
  app.get("/api/notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserNotificationPreferences(userId);
      
      // If user has no preferences, create default ones
      if (preferences.length === 0) {
        const notificationTypes = [
          "calibration_alert",
          "achievement_unlock",
          "inspection_milestone",
          "system",
          "job_assigned",
          "report_ready"
        ];

        const defaultPreferences = await Promise.all(
          notificationTypes.map(type =>
            storage.createNotificationPreference({
              userId,
              notificationType: type,
              enabled: true,
              emailEnabled: false,
              pushEnabled: true,
              inAppEnabled: true,
            })
          )
        );
        
        res.json(defaultPreferences);
      } else {
        res.json(preferences);
      }
    } catch (error) {
      serverLogger.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notifications/preferences", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;

      const updatePromises = Object.entries(updates).map(([notificationType, prefs]: [string, any]) =>
        storage.upsertNotificationPreference(userId, notificationType, prefs)
      );

      const updatedPreferences = await Promise.all(updatePromises);
      res.json(updatedPreferences);
    } catch (error) {
      serverLogger.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Send test notification (admin only)
  app.post("/api/notifications/test", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type, targetUserId } = req.body;
      const target = targetUserId || userId;

      switch (type) {
        case "calibration_alert":
          await sendCalibrationAlert(target, "test-equipment-id", "Test Equipment", 5);
          break;
        case "achievement_unlock":
          await sendAchievementUnlock(target, "test-achievement", "Test Achievement", 100);
          break;
        case "inspection_milestone":
          await sendInspectionMilestone(target, 100, 100);
          break;
        case "job_assigned":
          await sendJobAssignedNotification(target, "test-job", "Test Job", new Date());
          break;
        case "report_ready":
          await sendReportReadyNotification(target, "test-report", "Test Report");
          break;
        default:
          return res.status(400).json({ message: "Invalid notification type" });
      }

      res.json({ message: "Test notification sent successfully" });
    } catch (error) {
      serverLogger.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // Clean up expired notifications (admin only)
  app.post("/api/notifications/cleanup", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deletedCount = await storage.deleteExpiredNotifications();
      res.json({ message: `Deleted ${deletedCount} expired notifications` });
    } catch (error) {
      serverLogger.error("Error cleaning up notifications:", error);
      res.status(500).json({ message: "Failed to clean up notifications" });
    }
  });
}