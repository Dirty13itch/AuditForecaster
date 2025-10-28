import { Router } from "express";
import { isAuthenticated } from "./auth";
import { serverLogger } from "./logger";
import {
  sendCalibrationAlert,
  sendAchievementUnlocked,
  sendJobAssigned,
  sendJobCompleted,
  sendComplianceAlert,
  sendReportReady,
  sendQAReviewRequired,
  sendScheduleChanged,
} from "./notificationService";

const router = Router();

// Test route to send various notification types
router.post("/api/test-notifications", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Send different types of notifications for testing
    await Promise.all([
      // Equipment calibration alert
      sendCalibrationAlert(userId, "Blower Door System", 3),
      
      // Achievement unlocked
      sendAchievementUnlocked(
        userId,
        "First Inspection",
        "Completed your first inspection successfully!",
        100
      ),
      
      // Job assigned
      sendJobAssigned(
        userId,
        "Site Inspection - 123 Main St",
        "job-001",
        new Date(Date.now() + 86400000 * 2) // 2 days from now
      ),
      
      // Job completed
      sendJobCompleted(
        userId,
        "Site Inspection - 456 Oak Ave",
        "job-002",
        95
      ),
      
      // Compliance alert
      sendComplianceAlert(
        userId,
        "Missing documentation for recent inspection",
        "high"
      ),
      
      // Report ready
      sendReportReady(
        userId,
        "Monthly Inspection Summary",
        "report-001"
      ),
      
      // QA review required
      sendQAReviewRequired(
        userId,
        "Site Inspection - 789 Pine St",
        "job-003",
        "Supervisor Review"
      ),
      
      // Schedule changed
      sendScheduleChanged(
        userId,
        "Inspection rescheduled from 2 PM to 4 PM",
        new Date(Date.now() + 86400000) // Tomorrow
      ),
    ]);
    
    res.json({
      success: true,
      message: "Test notifications sent successfully",
    });
  } catch (error) {
    serverLogger.error("Error sending test notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test notifications",
    });
  }
});

// Test route to send a single custom notification
router.post("/api/test-notification-single", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { type, title, message, priority = "medium" } = req.body;
    
    // Import createNotification directly
    const { createNotification } = await import("./notificationService");
    
    await createNotification({
      userId,
      type: type || "job_assigned",
      title: title || "Test Notification",
      message: message || "This is a test notification",
      priority: priority as any,
    });
    
    res.json({
      success: true,
      message: "Test notification sent",
    });
  } catch (error) {
    serverLogger.error("Error sending test notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test notification",
    });
  }
});

export default router;