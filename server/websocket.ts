import WebSocket, { WebSocketServer } from "ws";
import type { Server } from "http";
import { storage } from "./storage";
import { serverLogger } from "./logger";
import type { InsertNotification } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import * as cookie from "cookie";
import * as signature from "cookie-signature";

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

  wss.on("connection", async (ws, req) => {
    // Extract user ID from request with proper session validation
    const userId = await extractUserIdFromRequest(req);
    
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

// Helper function to extract user ID from request using session authentication
async function extractUserIdFromRequest(req: any): Promise<string | null> {
  // Extract session cookie and validate authentication
  // This uses the same session store as the Express app
  try {
    // Parse cookies from the request
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionCookie = cookies['connect.sid'];
    
    if (!sessionCookie) {
      serverLogger.debug('WebSocket connection attempt without session cookie');
      return null;
    }
    
    // The connect.sid cookie is signed with the SESSION_SECRET
    // Extract the actual session ID by removing the signature
    let sessionId = sessionCookie;
    
    // If the cookie starts with "s:", it's signed and we need to verify it
    if (sessionId.startsWith('s:')) {
      const unsigned = signature.unsign(sessionId.slice(2), process.env.SESSION_SECRET!);
      if (!unsigned) {
        serverLogger.warn('WebSocket connection attempt with invalid session signature');
        return null;
      }
      sessionId = unsigned;
    }
    
    // Query the sessions table to get the session data
    const sessionResult = await db.execute(
      sql`SELECT sess FROM sessions WHERE sid = ${sessionId} AND expire > NOW()`
    );
    
    if (!sessionResult.rows || sessionResult.rows.length === 0) {
      serverLogger.debug('WebSocket connection attempt with expired or invalid session');
      return null;
    }
    
    // Parse the session data (it's stored as JSON)
    const sessionData = sessionResult.rows[0].sess as any;
    
    // Extract the user ID from the passport session
    if (sessionData?.passport?.user?.claims?.sub) {
      const userId = sessionData.passport.user.claims.sub;
      serverLogger.debug(`WebSocket authentication successful for user: ${userId}`);
      return userId;
    }
    
    // Fallback for development mode testing with authorization header
    if (process.env.NODE_ENV === 'development' && req.headers.authorization) {
      const auth = req.headers.authorization.split(' ')[1];
      if (auth) {
        try {
          const decoded = Buffer.from(auth, 'base64').toString('utf-8');
          serverLogger.debug(`WebSocket auth via header (dev mode): ${decoded}`);
          return decoded;
        } catch {
          return null;
        }
      }
    }
    
    serverLogger.debug('WebSocket authentication failed: No user data in session');
    return null;
  } catch (error) {
    serverLogger.error('Error extracting user from WebSocket request:', error);
    return null;
  }
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