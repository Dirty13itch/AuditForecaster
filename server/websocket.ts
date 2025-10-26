import WebSocket, { WebSocketServer } from "ws";
import type { Server } from "http";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import type { InsertNotification } from "@shared/schema";

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

const clients = new Map<string, WebSocketClient>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws/notifications" 
  });

  // Heartbeat to keep connections alive
  const interval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client.userId);
        return;
      }
      
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000); // Ping every 30 seconds

  wss.on("connection", (ws, req) => {
    // Extract user ID from request (you might need to implement proper auth here)
    const userId = extractUserIdFromRequest(req);
    
    if (!userId) {
      ws.close(1008, "User not authenticated");
      return;
    }

    serverLogger.info(`WebSocket connection established for user: ${userId}`);

    const client: WebSocketClient = {
      ws,
      userId,
      isAlive: true,
    };

    // Store client connection
    clients.set(userId, client);

    // Set up event handlers
    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "pong") {
          client.isAlive = true;
        }
      } catch (error) {
        serverLogger.error("Error parsing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      serverLogger.info(`WebSocket connection closed for user: ${userId}`);
      clients.delete(userId);
    });

    ws.on("error", (error) => {
      serverLogger.error(`WebSocket error for user ${userId}:`, error);
    });

    // Send initial connection success message
    ws.send(JSON.stringify({
      type: "connected",
      message: "WebSocket connection established",
    }));
  });

  wss.on("close", () => {
    clearInterval(interval);
  });

  return wss;
}

// Helper function to extract user ID from request
// This should be replaced with proper authentication logic
function extractUserIdFromRequest(req: any): string | null {
  // Check for user ID in query params, headers, or session
  // This is a placeholder - implement proper auth
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const userId = url.searchParams.get("userId");
  
  // In production, you'd extract this from JWT token or session
  return userId;
}

// Function to send notification to a specific user
export async function sendNotificationToUser(
  userId: string,
  notification: InsertNotification
): Promise<void> {
  try {
    // Save notification to database
    const savedNotification = await storage.createNotification(notification);
    
    // Send to connected WebSocket client
    const client = clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "notification",
        notification: savedNotification,
      }));
      serverLogger.info(`Notification sent to user ${userId} via WebSocket`);
    } else {
      serverLogger.info(`User ${userId} not connected via WebSocket, notification saved to database`);
    }
  } catch (error) {
    serverLogger.error(`Error sending notification to user ${userId}:`, error);
    throw error;
  }
}

// Function to broadcast notification to multiple users
export async function broadcastNotification(
  userIds: string[],
  notificationTemplate: Omit<InsertNotification, "userId">
): Promise<void> {
  const promises = userIds.map(userId =>
    sendNotificationToUser(userId, { ...notificationTemplate, userId })
  );
  
  await Promise.allSettled(promises);
}

// Helper function to create and send calibration alert
export async function sendCalibrationAlert(
  userId: string,
  equipmentId: string,
  equipmentName: string,
  daysUntilDue: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "calibration_alert",
    title: `Calibration Due Soon`,
    message: `${equipmentName} requires calibration in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
    relatedEntityId: equipmentId,
    relatedEntityType: "equipment",
    priority: daysUntilDue <= 3 ? "urgent" : daysUntilDue <= 7 ? "high" : "medium",
    data: {
      equipmentId,
      equipmentName,
      daysUntilDue,
    },
  };

  await sendNotificationToUser(userId, notification);
}

// Helper function to send achievement unlock notification
export async function sendAchievementUnlock(
  userId: string,
  achievementId: string,
  achievementName: string,
  xpEarned: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "achievement_unlock",
    title: "Achievement Unlocked!",
    message: `You've unlocked "${achievementName}" and earned ${xpEarned} XP!`,
    relatedEntityId: achievementId,
    relatedEntityType: "achievement",
    priority: "low",
    data: {
      achievementId,
      achievementName,
      xpEarned,
    },
  };

  await sendNotificationToUser(userId, notification);
}

// Helper function to send inspection milestone notification
export async function sendInspectionMilestone(
  userId: string,
  milestone: number,
  totalInspections: number
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "inspection_milestone",
    title: `Milestone Reached: ${milestone} Inspections!`,
    message: `Congratulations! You've completed ${totalInspections} total inspections.`,
    relatedEntityType: "user",
    priority: "medium",
    data: {
      milestone,
      totalInspections,
    },
  };

  await sendNotificationToUser(userId, notification);
}

// Helper function to send job assigned notification
export async function sendJobAssignedNotification(
  userId: string,
  jobId: string,
  jobName: string,
  scheduledDate: Date
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "job_assigned",
    title: "New Job Assigned",
    message: `You've been assigned to "${jobName}" scheduled for ${scheduledDate.toLocaleDateString()}`,
    relatedEntityId: jobId,
    relatedEntityType: "job",
    priority: "high",
    data: {
      jobId,
      jobName,
      scheduledDate: scheduledDate.toISOString(),
    },
  };

  await sendNotificationToUser(userId, notification);
}

// Helper function to send report ready notification
export async function sendReportReadyNotification(
  userId: string,
  reportId: string,
  reportName: string
): Promise<void> {
  const notification: InsertNotification = {
    userId,
    type: "report_ready",
    title: "Report Ready",
    message: `The report "${reportName}" is now ready for review`,
    relatedEntityId: reportId,
    relatedEntityType: "report",
    priority: "medium",
    data: {
      reportId,
      reportName,
    },
  };

  await sendNotificationToUser(userId, notification);
}