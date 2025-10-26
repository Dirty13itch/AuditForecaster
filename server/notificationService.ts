import { storage } from "./storage";
import { broadcastNotification } from "./websocket";
import type { InsertNotification } from "@shared/schema";

export async function createNotification(
  notification: InsertNotification
): Promise<void> {
  // Save to database
  const savedNotification = await storage.createNotification(notification);
  
  // Broadcast to connected WebSocket clients
  if (savedNotification) {
    broadcastNotification(notification.userId, savedNotification);
  }
}

export async function sendCalibrationAlert(
  userId: string,
  equipmentName: string,
  daysUntilDue: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "equipment_due",
    priority: daysUntilDue <= 7 ? "high" : "medium",
    title: `Calibration Due: ${equipmentName}`,
    message: daysUntilDue === 0
      ? `${equipmentName} calibration is due today!`
      : `${equipmentName} calibration due in ${daysUntilDue} days`,
    metadata: {
      equipmentName,
      daysUntilDue,
    },
  };
  
  await createNotification(notification);
}

export async function sendAchievementUnlocked(
  userId: string,
  achievementName: string,
  description: string,
  points: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "achievement_unlocked",
    priority: "low",
    title: `Achievement Unlocked: ${achievementName}`,
    message: description,
    metadata: {
      achievementName,
      points,
    },
  };
  
  await createNotification(notification);
}

export async function sendJobAssigned(
  userId: string,
  jobName: string,
  jobId: string,
  dueDate?: Date
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "job_assigned",
    priority: "medium",
    title: `New Job Assigned: ${jobName}`,
    message: dueDate
      ? `You've been assigned to ${jobName}. Due: ${dueDate.toLocaleDateString()}`
      : `You've been assigned to ${jobName}`,
    metadata: {
      jobId,
      jobName,
      dueDate: dueDate?.toISOString(),
    },
  };
  
  await createNotification(notification);
}

export async function sendJobCompleted(
  userId: string,
  jobName: string,
  jobId: string,
  qaScore?: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "job_completed",
    priority: "low",
    title: `Job Completed: ${jobName}`,
    message: qaScore
      ? `${jobName} has been completed with a QA score of ${qaScore}%`
      : `${jobName} has been completed successfully`,
    metadata: {
      jobId,
      jobName,
      qaScore,
    },
  };
  
  await createNotification(notification);
}

export async function sendComplianceAlert(
  userId: string,
  issue: string,
  severity: "low" | "medium" | "high" | "urgent"
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "compliance_alert",
    priority: severity,
    title: "Compliance Alert",
    message: issue,
    metadata: {
      severity,
    },
  };
  
  await createNotification(notification);
}

export async function sendReportReady(
  userId: string,
  reportName: string,
  reportId: string
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "report_ready",
    priority: "low",
    title: `Report Ready: ${reportName}`,
    message: `Your ${reportName} report is ready for review`,
    metadata: {
      reportId,
      reportName,
    },
  };
  
  await createNotification(notification);
}

export async function sendQAReviewRequired(
  userId: string,
  jobName: string,
  jobId: string,
  reviewType: string
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "qa_review_required",
    priority: "high",
    title: `QA Review Required: ${jobName}`,
    message: `${reviewType} review needed for ${jobName}`,
    metadata: {
      jobId,
      jobName,
      reviewType,
    },
  };
  
  await createNotification(notification);
}

export async function sendScheduleChanged(
  userId: string,
  change: string,
  affectedDate: Date
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "schedule_changed",
    priority: "medium",
    title: "Schedule Change",
    message: `${change} on ${affectedDate.toLocaleDateString()}`,
    metadata: {
      change,
      affectedDate: affectedDate.toISOString(),
    },
  };
  
  await createNotification(notification);
}